import { store } from '../main.js';
import {
    auth,
    db,
    collection,
    addDoc,
    serverTimestamp,
    getIdToken,
} from '../firebase-init.js';

function formatBytes(bytes) {
    const value = Number(bytes || 0);

    if (!value) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(
        Math.floor(Math.log(value) / Math.log(1024)),
        units.length - 1
    );

    const amount = value / Math.pow(1024, index);

    return `${amount >= 10 || index === 0
        ? amount.toFixed(0)
        : amount.toFixed(1)} ${units[index]}`;
}

function safeUploadName(name) {
    return String(name || 'attachment')
        .replace(/[\u0000-\u001F]/g, '')
        .replace(/[\\/:*?"<>|]/g, '_')
        .slice(0, 180);
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

export default {
    template: `
        <main class="page-bug-report">
            <div class="bug-report-shell">
                <header class="bug-report-header">
                    <div>
                        <span class="bug-report-kicker">SCLVN SUPPORT</span>
                        <h1>Bug Report</h1>
                        <p>
                            Found something that is not working correctly?
                            Send us the details below so the team can reproduce and fix it.
                        </p>
                    </div>

                    <div
                        v-if="store.user"
                        class="bug-report-account"
                        title="Currently signed-in account"
                    >
                        <img
                            :src="store.user.avatar || '/assets/the sclvn logo.png'"
                            alt="Account avatar"
                        >
                        <div>
                            <span>Signed in as</span>
                            <strong>
                                {{
                                    store.user.username ||
                                    store.user.displayName ||
                                    'Player'
                                }}
                            </strong>
                        </div>
                    </div>

                    <router-link
                        v-else
                        to="/login"
                        class="bug-report-login"
                    >
                        Sign in
                    </router-link>
                </header>

                <div
                    v-if="!store.authLoading && !store.user"
                    class="bug-report-auth-notice"
                >
                    You can view this form while signed out, but you must sign in
                    before sending a bug report or uploading attachments.
                </div>

                <form
                    class="bug-report-card"
                    @submit.prevent="submitBugReport"
                >
                    <section class="bug-report-section">
                        <div class="bug-report-section-heading">
                            <span>01</span>
                            <div>
                                <h2>Reporter Information</h2>
                                <p>How the SCLVN team can identify and contact you.</p>
                            </div>
                        </div>

                        <div class="bug-report-grid">
                            <label class="bug-field">
                                <span>Email</span>
                                <input
                                    v-model.trim="email"
                                    type="email"
                                    autocomplete="email"
                                    placeholder="you@example.com"
                                    required
                                >
                            </label>

                            <label class="bug-field">
                                <span>Name</span>
                                <input
                                    v-model.trim="name"
                                    type="text"
                                    autocomplete="name"
                                    placeholder="Your name / SCLVN username"
                                    required
                                >
                            </label>

                            <label class="bug-field bug-field-full">
                                <span>Contact Information</span>
                                <input
                                    v-model.trim="contact"
                                    type="text"
                                    placeholder="Discord account link, Facebook account, etc."
                                    required
                                >
                            </label>
                        </div>
                    </section>

                    <section class="bug-report-section">
                        <div class="bug-report-section-heading">
                            <span>02</span>
                            <div>
                                <h2>Issue Details</h2>
                                <p>Give us enough information to reproduce the bug.</p>
                            </div>
                        </div>

                        <div class="bug-report-grid">
                            <label class="bug-field bug-field-full">
                                <span>Bug Description</span>
                                <textarea
                                    v-model.trim="description"
                                    rows="7"
                                    placeholder="Describe the issue you encountered in as much detail as possible..."
                                    required
                                ></textarea>
                            </label>

                            <label class="bug-field">
                                <span>
                                    Frequency
                                    <small>optional</small>
                                </span>

                                <select v-model="frequency">
                                    <option value="">Select frequency</option>
                                    <option value="always">Always (100%)</option>
                                    <option value="sometimes">Sometimes (50%)</option>
                                    <option value="rarely">Rarely (below 25%)</option>
                                </select>
                            </label>

                            <label class="bug-field">
                                <span>Browser</span>
                                <input
                                    v-model.trim="browser"
                                    type="text"
                                    placeholder="e.g. Firefox 154, Chrome 140, Brave..."
                                    required
                                >
                            </label>
                        </div>
                    </section>

                    <section class="bug-report-section">
                        <div class="bug-report-section-heading">
                            <span>03</span>
                            <div>
                                <h2>Environment</h2>
                                <p>Tell us which device and operating system are affected.</p>
                            </div>
                        </div>

                        <div class="bug-report-grid">
                            <label class="bug-field">
                                <span>Device Type</span>

                                <select v-model="deviceType" required>
                                    <option value="" disabled>Select a device</option>
                                    <option value="desktop-laptop">Desktop / Laptop</option>
                                    <option value="mobile-phone">Mobile Phone</option>
                                    <option value="tablet">Tablet</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>

                            <label
                                v-if="deviceType === 'other'"
                                class="bug-field"
                            >
                                <span>Other Device</span>
                                <input
                                    v-model.trim="deviceOther"
                                    type="text"
                                    placeholder="Enter your device type"
                                    required
                                >
                            </label>

                            <label class="bug-field">
                                <span>Operating System</span>

                                <select v-model="operatingSystem" required>
                                    <option value="" disabled>Select an operating system</option>
                                    <option value="windows">Windows</option>
                                    <option value="linux">Linux</option>
                                    <option value="macos">macOS</option>
                                    <option value="ios-ipados">iOS / iPadOS</option>
                                    <option value="android">Android</option>
                                    <option value="other">Other</option>
                                </select>
                            </label>

                            <label
                                v-if="operatingSystem === 'other'"
                                class="bug-field"
                            >
                                <span>Other Operating System</span>
                                <input
                                    v-model.trim="osOther"
                                    type="text"
                                    placeholder="Enter your operating system"
                                    required
                                >
                            </label>
                        </div>
                    </section>

                    <section class="bug-report-section">
                        <div class="bug-report-section-heading">
                            <span>04</span>
                            <div>
                                <h2>Evidence</h2>
                                <p>Screenshots or videos make bugs much easier to reproduce.</p>
                            </div>
                        </div>

                        <div class="bug-upload-box">
                            <input
                                ref="attachmentInput"
                                class="bug-upload-input"
                                type="file"
                                accept="image/*,video/*"
                                multiple
                                @change="handleFiles"
                            >

                            <button
                                class="bug-upload-button"
                                type="button"
                                @click="$refs.attachmentInput?.click()"
                                :disabled="uploading || submitting"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M12 16V4"></path>
                                    <path d="m7 9 5-5 5 5"></path>
                                    <path d="M5 14v5h14v-5"></path>
                                </svg>

                                <span>
                                    <strong>Screenshots / Videos</strong>
                                    <small>Choose files from your device</small>
                                </span>
                            </button>

                            <div
                                v-if="attachments.length"
                                class="bug-upload-list"
                            >
                                <div
                                    v-for="(file, index) in attachments"
                                    :key="file.name + '-' + file.size + '-' + index"
                                    class="bug-upload-file"
                                >
                                    <div>
                                        <strong>{{ file.name }}</strong>
                                        <span>{{ formatBytes(file.size) }}</span>
                                    </div>

                                    <button
                                        type="button"
                                        @click="removeFile(index)"
                                        :disabled="uploading || submitting"
                                        title="Remove attachment"
                                        aria-label="Remove attachment"
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            <p
                                v-if="uploadProgress"
                                class="bug-upload-progress"
                            >
                                {{ uploadProgress }}
                            </p>
                        </div>

                        <label class="bug-field bug-field-full bug-notes-field">
                            <span>
                                Notes
                                <small>optional</small>
                            </span>
                            <textarea
                                v-model.trim="notes"
                                rows="4"
                                placeholder="Add anything else that may help us investigate the issue..."
                            ></textarea>
                        </label>
                    </section>

                    <div
                        v-if="error"
                        class="bug-report-message is-error"
                    >
                        {{ error }}
                    </div>

                    <div
                        v-if="success"
                        class="bug-report-message is-success"
                    >
                        Bug report submitted successfully. Thank you for helping us improve SCLVN.
                    </div>

                    <footer class="bug-report-footer">
                        <p>
                            Please avoid submitting the same issue multiple times.
                            Add as much detail as possible in one report.
                        </p>

                        <button
                            class="bug-report-submit"
                            type="submit"
                            :disabled="submitting || uploading"
                        >
                            {{
                                submitting
                                    ? 'Sending Report...'
                                    : 'Submit Bug Report'
                            }}
                        </button>
                    </footer>
                </form>
            </div>
        </main>
    `,

    data: () => ({
        email: '',
        name: '',
        contact: '',

        description: '',
        frequency: '',
        browser: '',

        deviceType: '',
        deviceOther: '',

        operatingSystem: '',
        osOther: '',

        attachments: [],
        notes: '',

        uploading: false,
        uploadProgress: '',
        submitting: false,

        success: false,
        error: '',

        store,
    }),

    watch: {
        'store.user': {
            immediate: true,

            handler(user) {
                if (!user) {
                    return;
                }

                if (!this.email) {
                    this.email = user.email || '';
                }

                if (!this.name) {
                    this.name =
                        user.username ||
                        user.displayName ||
                        '';
                }

                if (!this.contact) {
                    this.contact =
                        user.socials?.discord ||
                        user.socialLink ||
                        '';
                }
            },
        },

        deviceType(value) {
            if (value !== 'other') {
                this.deviceOther = '';
            }
        },

        operatingSystem(value) {
            if (value !== 'other') {
                this.osOther = '';
            }
        },
    },

    methods: {
        formatBytes,

        getUploadEndpoint() {
            return (
                window.SCLVN_RAW_UPLOAD_ENDPOINT ||
                window.SCLVN_CONFIG?.rawUploadEndpoint ||
                ''
            ).trim();
        },

        handleFiles(event) {
            const files = Array.from(event.target.files || [])
                .filter(file =>
                    file.type.startsWith('image/') ||
                    file.type.startsWith('video/')
                );

            const existingKeys = new Set(
                this.attachments.map(
                    file => `${file.name}:${file.size}:${file.lastModified}`
                )
            );

            for (const file of files) {
                const key =
                    `${file.name}:${file.size}:${file.lastModified}`;

                if (!existingKeys.has(key)) {
                    this.attachments.push(file);
                    existingKeys.add(key);
                }
            }

            event.target.value = '';
        },

        removeFile(index) {
            this.attachments.splice(index, 1);
        },

        async uploadAttachment(file, index, total) {
            const endpoint = this.getUploadEndpoint();

            if (!endpoint) {
                throw new Error(
                    'Attachment upload backend is not configured.'
                );
            }

            if (!auth.currentUser) {
                throw new Error(
                    'Your session has expired. Please sign in again.'
                );
            }

            const chunkEndpoint = endpoint.replace(
                /\/upload-session\/?$/,
                '/upload-chunk'
            );

            const CHUNK_SIZE = 8 * 1024 * 1024;

            const idToken = await getIdToken(
                auth.currentUser,
                true
            );

            const stampedName =
                `BUG_${Date.now()}_${safeUploadName(file.name)}`;

            this.uploadProgress =
                `Preparing attachment ${index + 1} of ${total}: ${file.name}`;

            const sessionResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    fileName: stampedName,
                    mimeType:
                        file.type ||
                        'application/octet-stream',
                    size: file.size,
                    purpose: 'bug-report',
                }),
            });

            const sessionData = await sessionResponse
                .json()
                .catch(() => ({}));

            if (
                !sessionResponse.ok ||
                !sessionData.uploadUrl
            ) {
                throw new Error(
                    sessionData.error ||
                    `Could not create attachment upload session (${sessionResponse.status}).`
                );
            }

            let uploadedFile = null;

            for (
                let start = 0;
                start < file.size;
                start += CHUNK_SIZE
            ) {
                const end = Math.min(
                    start + CHUNK_SIZE,
                    file.size
                );

                const chunk = file.slice(start, end);

                const filePercent = Math.floor(
                    (end / file.size) * 100
                );

                this.uploadProgress =
                    `Uploading attachment ${index + 1} of ${total}: ` +
                    `${file.name} — ${filePercent}%`;

                const chunkIdToken = await getIdToken(
                    auth.currentUser
                );

                const chunkResponse = await fetch(
                    chunkEndpoint,
                    {
                        method: 'POST',
                        headers: {
                            Authorization:
                                `Bearer ${chunkIdToken}`,
                            'Content-Type':
                                file.type ||
                                'application/octet-stream',
                            'Content-Range':
                                `bytes ${start}-${end - 1}/${file.size}`,
                            'X-Upload-Url':
                                sessionData.uploadUrl,
                        },
                        body: chunk,
                    }
                );

                const chunkData = await chunkResponse
                    .json()
                    .catch(() => ({}));

                if (!chunkResponse.ok) {
                    throw new Error(
                        chunkData.error ||
                        `Attachment upload failed (${chunkResponse.status}).`
                    );
                }

                if (chunkData.complete) {
                    uploadedFile =
                        chunkData.file ||
                        null;
                }
            }

            if (!uploadedFile?.id) {
                throw new Error(
                    'Google Drive did not confirm the completed attachment upload.'
                );
            }

            return {
                driveFileId: uploadedFile.id,
                link:
                    uploadedFile.webViewLink ||
                    `https://drive.google.com/file/d/${uploadedFile.id}/view`,
                name:
                    uploadedFile.name ||
                    stampedName,
                originalName: file.name,
                size: file.size,
                mimeType:
                    file.type ||
                    'application/octet-stream',
            };
        },

        async uploadAttachments() {
            if (!this.attachments.length) {
                return [];
            }

            this.uploading = true;

            try {
                const uploaded = [];

                for (
                    let index = 0;
                    index < this.attachments.length;
                    index++
                ) {
                    uploaded.push(
                        await this.uploadAttachment(
                            this.attachments[index],
                            index,
                            this.attachments.length
                        )
                    );
                }

                this.uploadProgress =
                    'All attachments uploaded successfully.';

                return uploaded;
            } finally {
                this.uploading = false;
            }
        },

        validateForm() {
            if (!store.user || !auth.currentUser) {
                throw new Error(
                    'Please sign in before submitting a bug report.'
                );
            }

            if (!isValidEmail(this.email)) {
                throw new Error(
                    'Please enter a valid email address.'
                );
            }

            if (!this.name.trim()) {
                throw new Error('Please enter your name.');
            }

            if (!this.contact.trim()) {
                throw new Error(
                    'Please enter at least one contact method.'
                );
            }

            if (!this.description.trim()) {
                throw new Error(
                    'Please describe the bug you encountered.'
                );
            }

            if (!this.deviceType) {
                throw new Error(
                    'Please select your device type.'
                );
            }

            if (
                this.deviceType === 'other' &&
                !this.deviceOther.trim()
            ) {
                throw new Error(
                    'Please enter your device type.'
                );
            }

            if (!this.operatingSystem) {
                throw new Error(
                    'Please select your operating system.'
                );
            }

            if (
                this.operatingSystem === 'other' &&
                !this.osOther.trim()
            ) {
                throw new Error(
                    'Please enter your operating system.'
                );
            }

            if (!this.browser.trim()) {
                throw new Error(
                    'Please enter the browser you are using.'
                );
            }
        },

        resetForm() {
            this.description = '';
            this.frequency = '';
            this.browser = '';

            this.deviceType = '';
            this.deviceOther = '';

            this.operatingSystem = '';
            this.osOther = '';

            this.attachments = [];
            this.notes = '';
            this.uploadProgress = '';
        },

        async submitBugReport() {
            this.error = '';
            this.success = false;

            try {
                this.validateForm();

                this.submitting = true;

                const uploadedAttachments =
                    await this.uploadAttachments();

                await addDoc(
                    collection(db, 'bug_reports'),
                    {
                        email: this.email.trim(),
                        name: this.name.trim(),
                        contact:
                            this.contact.trim(),

                        description:
                            this.description.trim(),
                        frequency:
                            this.frequency ||
                            '',

                        deviceType:
                            this.deviceType,
                        deviceOther:
                            this.deviceType === 'other'
                                ? this.deviceOther.trim()
                                : '',

                        operatingSystem:
                            this.operatingSystem,
                        osOther:
                            this.operatingSystem === 'other'
                                ? this.osOther.trim()
                                : '',

                        browser:
                            this.browser.trim(),

                        attachments:
                            uploadedAttachments,

                        notes:
                            this.notes.trim(),

                        pageUrl:
                            window.location.href,
                        userAgent:
                            navigator.userAgent,

                        status: 'open',

                        submittedByUid:
                            store.user.uid,
                        submittedByEmail:
                            store.user.email ||
                            this.email.trim(),
                        submittedByName:
                            store.user.username ||
                            store.user.displayName ||
                            this.name.trim(),

                        submittedAt:
                            serverTimestamp(),
                    }
                );

                this.success = true;
                this.resetForm();
            } catch (error) {
                console.error(error);

                this.error =
                    error?.message ||
                    'Could not submit the bug report. Please try again.';
            } finally {
                this.submitting = false;
                this.uploading = false;
            }
        },
    },
};
