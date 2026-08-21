/**
 * SCLVN Raw Footage Upload Session Worker
 *
 * Purpose:
 * 1) Verify the Firebase user ID token.
 * 2) Use the SCLVN Google account OAuth refresh token server-side.
 * 3) Create a resumable Google Drive upload session inside the Raw Footage folder.
 * 4) Return only the one-time resumable upload URL to the browser.
 *
 * The large video bytes then go browser -> Google Drive directly.
 *
 * Required Cloudflare Worker secrets/vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 *   FIREBASE_WEB_API_KEY
 *   DRIVE_FOLDER_ID
 *   ALLOWED_ORIGINS
 *
 * Example:
 *   DRIVE_FOLDER_ID=1IY0r3Cak5WApJA2v4aoFeHx10VgS-FjPb1mmQ5l5XLsWqtopm6IyPXZh40TObiMJch7T1rtd
 *   ALLOWED_ORIGINS=https://your-domain.example,https://your-workers-domain.workers.dev
 */

function json(data, status = 200, origin = '') {
    const headers = {
        'Content-Type': 'application/json; charset=UTF-8',
        'Cache-Control': 'no-store',
    };

    if (origin) {
        headers['Access-Control-Allow-Origin'] = origin;
        headers['Vary'] = 'Origin';
    }

    return new Response(JSON.stringify(data), {
        status,
        headers,
    });
}

function allowedOrigin(request, env) {
    const origin = request.headers.get('Origin') || '';

    const allowed = String(env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);

    return allowed.includes(origin) ? origin : '';
}

async function verifyFirebaseUser(idToken, env) {
    if (!idToken) {
        throw new Error('Missing Firebase ID token.');
    }

    const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(env.FIREBASE_WEB_API_KEY)}`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                idToken,
            }),
        }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.users?.length) {
        throw new Error('Invalid or expired Firebase session.');
    }

    const user = data.users[0];

    return {
        uid: user.localId,
        email: user.email || '',
        displayName: user.displayName || '',
    };
}

async function getGoogleAccessToken(env) {
    const body = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        refresh_token: env.GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.access_token) {
        throw new Error(
            data.error_description ||
            data.error ||
            'Could not refresh Google Drive access token.'
        );
    }

    return data.access_token;
}

function safeFileName(name) {
    return String(name || 'raw-footage')
        .replace(/[\u0000-\u001F]/g, '')
        .slice(0, 220);
}

async function createDriveUploadSession(request, env, origin) {
    const authorization = request.headers.get('Authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
        return json({ error: 'Missing Authorization token.' }, 401, origin);
    }

    const body = await request.json().catch(() => null);

    if (!body) {
        return json({ error: 'Invalid JSON body.' }, 400, origin);
    }

    const fileName = safeFileName(body.fileName);
    const mimeType = String(body.mimeType || 'application/octet-stream');
    const size = Number(body.size);

    if (!fileName || !Number.isFinite(size) || size <= 0) {
        return json({ error: 'Invalid file metadata.' }, 400, origin);
    }

    const user = await verifyFirebaseUser(match[1], env);
    const accessToken = await getGoogleAccessToken(env);

    const metadata = {
        name: fileName,
        parents: [env.DRIVE_FOLDER_ID],
        appProperties: {
            sclvnSubmittedByUid: user.uid,
        },
        description:
            `SCLVN Raw Footage\nSubmitted by UID: ${user.uid}` +
            (user.email ? `\nEmail: ${user.email}` : ''),
    };

    const driveResponse = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,webViewLink',
        {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
                'X-Upload-Content-Type': mimeType,
                'X-Upload-Content-Length': String(size),
            },
            body: JSON.stringify(metadata),
        }
    );

    const driveError = await driveResponse
        .clone()
        .json()
        .catch(() => null);

    if (!driveResponse.ok) {
        return json(
            {
                error:
                    driveError?.error?.message ||
                    `Google Drive refused upload session (${driveResponse.status}).`,
            },
            502,
            origin
        );
    }

    const uploadUrl = driveResponse.headers.get('Location');

    if (!uploadUrl) {
        return json(
            { error: 'Google Drive did not return a resumable upload URL.' },
            502,
            origin
        );
    }

    return json(
        {
            uploadUrl,
            fileName,
        },
        200,
        origin
    );
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = allowedOrigin(request, env);

        if (request.method === 'OPTIONS') {
            if (!origin) {
                return new Response(null, { status: 403 });
            }

            return new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Origin': origin,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
                    'Access-Control-Max-Age': '86400',
                    'Vary': 'Origin',
                },
            });
        }

        if (!origin) {
            return json({ error: 'Origin not allowed.' }, 403);
        }

        if (request.method === 'GET' && url.pathname === '/health') {
            return json({ ok: true }, 200, origin);
        }

        if (request.method === 'POST' && url.pathname === '/upload-session') {
            try {
                return await createDriveUploadSession(request, env, origin);
            } catch (error) {
                console.error(error);

                return json(
                    {
                        error:
                            error?.message ||
                            'Unexpected upload-session error.',
                    },
                    500,
                    origin
                );
            }
        }

        return json({ error: 'Not found.' }, 404, origin);
    },
};
