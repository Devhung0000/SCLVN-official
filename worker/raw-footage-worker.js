/**
 * SCLVN Raw Footage Worker
 *
 * This version intentionally DOES NOT upload browser -> Google Drive directly,
 * because Google Drive's resumable upload URL does not provide the CORS headers
 * required by browsers for the final PUT.
 *
 * Flow:
 * Browser -> Worker /upload-session -> Google Drive creates resumable session
 * Browser -> Worker /upload-chunk   -> Worker forwards each small chunk to Drive
 *
 * Large files are split client-side into 8 MiB chunks, avoiding one huge
 * browser -> Worker request.
 *
 * Required Cloudflare Worker secrets/vars:
 *   GOOGLE_CLIENT_ID
 *   GOOGLE_CLIENT_SECRET
 *   GOOGLE_REFRESH_TOKEN
 *   FIREBASE_WEB_API_KEY
 *   DRIVE_FOLDER_ID
 *   ALLOWED_ORIGINS
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
            body: JSON.stringify({ idToken }),
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

function getBearerToken(request) {
    const authorization = request.headers.get('Authorization') || '';
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match ? match[1] : '';
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

function isAllowedDriveUploadUrl(value) {
    try {
        const url = new URL(value);

        return (
            url.protocol === 'https:' &&
            url.hostname === 'www.googleapis.com' &&
            url.pathname === '/upload/drive/v3/files' &&
            url.searchParams.get('uploadType') === 'resumable' &&
            Boolean(url.searchParams.get('upload_id'))
        );
    } catch (_) {
        return false;
    }
}

function parseContentRange(value) {
    const match = String(value || '').match(
        /^bytes\s+(\d+)-(\d+)\/(\d+)$/i
    );

    if (!match) return null;

    const start = Number(match[1]);
    const end = Number(match[2]);
    const total = Number(match[3]);

    if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        !Number.isSafeInteger(total) ||
        start < 0 ||
        end < start ||
        total <= 0 ||
        end >= total
    ) {
        return null;
    }

    return {
        start,
        end,
        total,
        length: end - start + 1,
    };
}

async function createDriveUploadSession(request, env, origin) {
    const idToken = getBearerToken(request);

    if (!idToken) {
        return json({ error: 'Missing Authorization token.' }, 401, origin);
    }

    const body = await request.json().catch(() => null);

    if (!body) {
        return json({ error: 'Invalid JSON body.' }, 400, origin);
    }

    const fileName = safeFileName(body.fileName);
    const mimeType = String(
        body.mimeType || 'application/octet-stream'
    );
    const size = Number(body.size);

    if (!fileName || !Number.isFinite(size) || size <= 0) {
        return json({ error: 'Invalid file metadata.' }, 400, origin);
    }

    const user = await verifyFirebaseUser(idToken, env);
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

    if (!uploadUrl || !isAllowedDriveUploadUrl(uploadUrl)) {
        return json(
            {
                error:
                    'Google Drive did not return a valid resumable upload URL.',
            },
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

async function uploadDriveChunk(request, env, origin) {
    const idToken = getBearerToken(request);

    if (!idToken) {
        return json({ error: 'Missing Authorization token.' }, 401, origin);
    }

    // Require a valid signed-in Firebase user for every chunk.
    await verifyFirebaseUser(idToken, env);

    const uploadUrl = request.headers.get('X-Upload-Url') || '';

    if (!isAllowedDriveUploadUrl(uploadUrl)) {
        return json({ error: 'Invalid Drive upload URL.' }, 400, origin);
    }

    const contentRange = request.headers.get('Content-Range') || '';
    const range = parseContentRange(contentRange);

    if (!range) {
        return json({ error: 'Invalid Content-Range.' }, 400, origin);
    }

    // Frontend currently uses 8 MiB chunks. Keep some headroom but reject
    // unexpectedly large requests so this endpoint cannot be abused.
    const MAX_CHUNK_BYTES = 12 * 1024 * 1024;

    if (range.length > MAX_CHUNK_BYTES) {
        return json({ error: 'Chunk is too large.' }, 413, origin);
    }

    const bytes = await request.arrayBuffer();

    if (bytes.byteLength !== range.length) {
        return json(
            {
                error:
                    `Chunk size mismatch: expected ${range.length}, received ${bytes.byteLength}.`,
            },
            400,
            origin
        );
    }

    const mimeType =
        request.headers.get('Content-Type') ||
        'application/octet-stream';

    const driveResponse = await fetch(uploadUrl, {
        method: 'PUT',
        redirect: 'manual',
        headers: {
            'Content-Type': mimeType,
            'Content-Length': String(bytes.byteLength),
            'Content-Range': contentRange,
        },
        body: bytes,
    });

    // 308 = chunk accepted, upload not finished yet.
    if (driveResponse.status === 308) {
        return json(
            {
                complete: false,
                receivedRange:
                    driveResponse.headers.get('Range') || '',
            },
            200,
            origin
        );
    }

    const driveData = await driveResponse
        .clone()
        .json()
        .catch(() => ({}));

    if (!driveResponse.ok) {
        return json(
            {
                error:
                    driveData?.error?.message ||
                    driveData?.error ||
                    `Google Drive chunk upload failed (${driveResponse.status}).`,
            },
            502,
            origin
        );
    }

    return json(
        {
            complete: true,
            file: {
                id: driveData.id || null,
                name: driveData.name || null,
                webViewLink: driveData.webViewLink || null,
            },
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
                    'Access-Control-Allow-Headers':
                        'Authorization, Content-Type, Content-Range, X-Upload-Url',
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
                return await createDriveUploadSession(
                    request,
                    env,
                    origin
                );
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

        if (request.method === 'POST' && url.pathname === '/upload-chunk') {
            try {
                return await uploadDriveChunk(
                    request,
                    env,
                    origin
                );
            } catch (error) {
                console.error(error);

                return json(
                    {
                        error:
                            error?.message ||
                            'Unexpected upload-chunk error.',
                    },
                    500,
                    origin
                );
            }
        }

        return json({ error: 'Not found.' }, 404, origin);
    },
};
