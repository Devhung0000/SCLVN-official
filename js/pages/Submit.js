import { store } from '../main.js';
import { fetchList } from '../content.js';
import {
    auth,
    db,
    doc,
    getDoc,
    collection,
    addDoc,
    serverTimestamp,
    getIdToken,
} from '../firebase-init.js';
import Spinner from '../components/Spinner.js';
import SclvnSelect from '../components/SclvnSelect.js';

const METHOD_OPTIONS = [
    'Alternate',
    'Alt-Jitter',
    'Jitter',
    'Button Mashing',
    'Rake',
    'Lip Spam',
];

const RAW_FOOTAGE_DRIVE_FOLDER =
    'https://drive.google.com/drive/folders/1IY0r3Cak5WApJA2v4aoFeHx10VgS-FjPb1mmQ5l5XLsWqtopm6IyPXZh40TObiMJch7T1rtd?usp=drive_link';

function normalizePlayerName(value) {
    return String(value || '').trim().toLowerCase();
}

function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(
        Math.floor(Math.log(value) / Math.log(1024)),
        units.length - 1
    );

    const amount = value / Math.pow(1024, index);
    return `${amount >= 10 || index === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[index]}`;
}

export default {
    components: { Spinner, SclvnSelect },

    data: () => ({
        loading: true,
        levels: [],

        recordType: 'completion',

        levelId: '',
        levelSearch: '',
        levelDropdownOpen: false,

        verificationLevelId: '',
        verificationLevelName: '',

        playerName: '',
        percent: 100,
        hz: '',
        methodChoice: '',
        methodCustom: '',
        mobile: false,

        link: '',
        note: '',

        rawFootageFile: null,
        rawFootageUploading: false,
        rawFootageProgressText: '',

        submitting: false,
        success: false,
        error: '',

        store,
        rawFootageDriveFolder: RAW_FOOTAGE_DRIVE_FOLDER,

        methodOptions: [
            ...METHOD_OPTIONS.map(value => ({ value, label: value })),
            { value: 'Custom', label: 'Custom...' },
        ],
    }),

    computed: {
        selectedLevel() {
            return this.levels.find(level => level.id === this.levelId) || null;
        },

        eligibleLevels() {
            const playerKey =
                normalizePlayerName(this.playerName);

            if (!playerKey) {
                return this.levels;
            }

            return this.levels.filter(level => {
                if (
                    normalizePlayerName(level.verifier) ===
                    playerKey
                ) {
                    return false;
                }

                const isVictor = level.records.some(
                    record =>
                        normalizePlayerName(record.user) ===
                            playerKey &&
                        Number(record.percent) === 100
                );

                return !isVictor;
            });
        },

        filteredLevels() {
            const query =
                this.levelSearch.trim().toLowerCase();

            if (!query) {
                return this.eligibleLevels;
            }

            return this.eligibleLevels.filter(level =>
                level.name.toLowerCase().includes(query) ||
                level.id.toLowerCase().includes(query)
            );
        },

        submissionMethod() {
            return this.methodChoice === 'Custom'
                ? this.methodCustom.trim()
                : this.methodChoice;
        },

        rawFootageName() {
            return this.rawFootageFile?.name || '';
        },

        rawFootageSize() {
            return this.rawFootageFile
                ? formatBytes(this.rawFootageFile.size)
                : '';
        },
    },

    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>

        <main v-else class="page-submit">
            <section class="submit-shell">
                <header class="submit-header">
                    <div>
                        <span class="submit-kicker">SCLVN RECORDS</span>
                        <h1>Submit Record</h1>
                        <p>Send your run for moderator review.</p>
                    </div>

                    <div class="submit-header-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                            <path d="M12 16V4"></path>
                            <path d="m7 9 5-5 5 5"></path>
                            <path d="M5 14v5h14v-5"></path>
                        </svg>
                    </div>
                </header>

                <div v-if="!store.user" class="submit-state-card">
                    <div class="submit-state-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="8" r="4"></circle>
                            <path d="M5 21a7 7 0 0 1 14 0"></path>
                        </svg>
                    </div>

                    <h2>Login required</h2>
                    <p>You need to be signed in before submitting a record.</p>

                    <router-link class="submit-primary-btn" to="/login">
                        Login / Register
                    </router-link>
                </div>

                <div v-else-if="success" class="submit-state-card submit-success-card">
                    <div class="submit-state-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                    </div>

                    <h2>Submission sent</h2>
                    <p>
                        Your {{ recordType === 'verification' ? 'verification' : 'record' }}
                        is waiting for another moderator to review it.
                    </p>

                    <button class="submit-primary-btn" type="button" @click="resetForm">
                        Submit another record
                    </button>
                </div>

                <div v-else class="submit-card">
                    <div class="submit-section-head">
                        <div>
                            <h2>Run information</h2>
                            <p>Fill in the details exactly as they should appear on the list.</p>
                        </div>

                        <div class="submit-user-chip">
                            <img :src="store.user.avatar || '/assets/the sclvn logo.png'" alt="">
                            <span>{{ store.user.username || store.user.displayName || 'Player' }}</span>
                        </div>
                    </div>

                    <div class="submit-form-grid">
                        <div class="submit-field submit-field-full">
                            <span>Type of Record</span>

                            <div class="submit-record-type">
                                <button
                                    type="button"
                                    :class="{ active: recordType === 'completion' }"
                                    @click="setRecordType('completion')"
                                >
                                    Completion
                                </button>

                                <button
                                    type="button"
                                    :class="{ active: recordType === 'verification' }"
                                    @click="setRecordType('verification')"
                                >
                                    Verification
                                </button>
                            </div>
                        </div>

                        <div
                            v-if="recordType === 'completion'"
                            class="submit-field submit-field-full submit-level-field"
                            @click.stop
                        >
                            <span>Level <small>victor levels are hidden automatically</small></span>

                            <button
                                class="submit-level-trigger"
                                type="button"
                                :class="{ 'is-open': levelDropdownOpen }"
                                @click="toggleLevelDropdown"
                            >
                                <span
                                    :class="[
                                        'submit-level-trigger-text',
                                        { 'is-placeholder': !selectedLevel }
                                    ]"
                                >
                                    {{ selectedLevel ? selectedLevel.name : 'Select a level' }}
                                </span>

                                <svg
                                    class="submit-level-chevron"
                                    :class="{ 'is-open': levelDropdownOpen }"
                                    viewBox="0 0 24 24"
                                    aria-hidden="true"
                                >
                                    <path d="m7 10 5 5 5-5"></path>
                                </svg>
                            </button>

                            <div
                                v-if="levelDropdownOpen"
                                class="submit-level-dropdown"
                            >
                                <div class="submit-level-search">
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <circle cx="11" cy="11" r="6"></circle>
                                        <path d="m16 16 4 4"></path>
                                    </svg>

                                    <input
                                        v-model="levelSearch"
                                        type="search"
                                        autocomplete="off"
                                        placeholder="Search levels..."
                                        @keydown.esc="closeLevelDropdown"
                                    >
                                </div>

                                <div class="submit-level-options">
                                    <button
                                        v-for="lvl in filteredLevels"
                                        :key="lvl.id"
                                        class="submit-level-option"
                                        :class="{ 'is-selected': lvl.id === levelId }"
                                        type="button"
                                        @click="selectLevel(lvl)"
                                    >
                                        <span class="submit-level-option-rank">
                                            #{{ lvl.rank }}
                                        </span>

                                        <span class="submit-level-option-name">
                                            {{ lvl.name }}
                                        </span>

                                        <svg
                                            v-if="lvl.id === levelId"
                                            class="submit-level-option-check"
                                            viewBox="0 0 24 24"
                                            aria-hidden="true"
                                        >
                                            <path d="m5 12 4 4L19 6"></path>
                                        </svg>
                                    </button>

                                    <div
                                        v-if="filteredLevels.length === 0"
                                        class="submit-level-empty"
                                    >
                                        No levels found.
                                    </div>
                                </div>
                            </div>
                        </div>

                        <template v-else>
                            <label class="submit-field">
                                <span>Level ID</span>
                                <input
                                    v-model.trim="verificationLevelId"
                                    type="text"
                                    placeholder="Example: my_new_level"
                                >
                                <small>This becomes the Firestore level ID if approved.</small>
                            </label>

                            <label class="submit-field">
                                <span>Level name</span>
                                <input
                                    v-model.trim="verificationLevelName"
                                    type="text"
                                    placeholder="Level name shown on the list"
                                >
                            </label>
                        </template>

                        <label class="submit-field">
                            <span>{{ recordType === 'verification' ? 'Verifier name' : 'Player name' }}</span>
                            <input
                                v-model="playerName"
                                type="text"
                                placeholder="Name shown on the list"
                            >
                        </label>

                        <label v-if="recordType === 'completion'" class="submit-field">
                            <span>Percentage</span>

                            <div class="submit-percent-field">
                                <input
                                    v-model.number="percent"
                                    type="number"
                                    min="1"
                                    max="100"
                                >
                                <strong>%</strong>
                            </div>
                        </label>

                        <div v-else class="submit-field">
                            <span>Percentage</span>

                            <div class="submit-fixed-percent">
                                <strong>100%</strong>
                                <small>Verification submissions are always full completions.</small>
                            </div>
                        </div>

                        <label class="submit-field">
                            <span>FPS <small class="submit-required-text">required</small></span>
                            <input
                                v-model.trim="hz"
                                type="text"
                                placeholder="60 / 240 / CBF..."
                            >
                        </label>

                        <div class="submit-field">
                            <span>Method <small class="submit-required-text">required</small></span>

                            <SclvnSelect
                                v-model="methodChoice"
                                :options="methodOptions"
                                placeholder="Select a method"
                                searchable
                                search-placeholder="Search methods..."
                            ></SclvnSelect>
                        </div>

                        <label
                            v-if="methodChoice === 'Custom'"
                            class="submit-field"
                        >
                            <span>Custom Method <small class="submit-required-text">required</small></span>
                            <input
                                v-model.trim="methodCustom"
                                type="text"
                                placeholder="Enter another method"
                            >
                        </label>

                        <label class="submit-mobile-card">
                            <input v-model="mobile" type="checkbox">
                            <span class="submit-check-ui"></span>

                            <span>
                                <strong>Mobile record</strong>
                                <small>Enable if the run was completed on mobile.</small>
                            </span>
                        </label>

                        <label class="submit-field submit-field-full">
                            <span>Video Link <small>optional</small></span>
                            <input
                                v-model="link"
                                type="text"
                                placeholder="YouTube / Drive / Medal..."
                            >
                        </label>

                        <div class="submit-field submit-field-full">
                            <span>Raw Footage <small class="submit-required-text">required</small></span>

                            <label class="submit-file-drop">
                                <input
                                    type="file"
                                    accept="video/*,.mkv,.webm,.mov,.mp4,.avi"
                                    @change="handleRawFootage"
                                >

                                <span class="submit-file-icon">
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M12 16V5"></path>
                                        <path d="m8 9 4-4 4 4"></path>
                                        <path d="M5 15v4h14v-4"></path>
                                    </svg>
                                </span>

                                <span v-if="rawFootageFile" class="submit-file-info">
                                    <strong>{{ rawFootageName }}</strong>
                                    <small>{{ rawFootageSize }}</small>
                                </span>

                                <span v-else class="submit-file-info">
                                    <strong>Choose raw footage from your device</strong>
                                    <small>Original, unedited footage.</small>
                                </span>

                                <span class="submit-file-button">
                                    {{ rawFootageFile ? 'Change file' : 'Choose file' }}
                                </span>
                            </label>

                            <div class="submit-raw-helper">
                                <span v-if="rawFootageProgressText">{{ rawFootageProgressText }}</span>
                                <span v-else>Raw footage will be uploaded to the SCLVN Drive folder.</span>

                                <a
                                    :href="rawFootageDriveFolder"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Open Drive folder
                                </a>
                            </div>
                        </div>

                        <label class="submit-field submit-field-full">
                            <span>Note <small>optional</small></span>
                            <textarea
                                v-model="note"
                                rows="4"
                                placeholder="Anything moderators should know..."
                            ></textarea>
                        </label>
                    </div>

                    <div v-if="error" class="submit-error">
                        {{ error }}
                    </div>

                    <footer class="submit-actions">
                        <p>
                            Submissions are reviewed manually.
                            A moderator cannot approve or reject their own submission.
                        </p>

                        <button
                            class="submit-primary-btn"
                            type="button"
                            :disabled="submitting || rawFootageUploading"
                            @click="submitRecord"
                        >
                            {{
                                rawFootageUploading
                                    ? 'Uploading raw footage...'
                                    : submitting
                                        ? 'Submitting...'
                                        : 'Submit Record'
                            }}
                        </button>
                    </footer>
                </div>
            </section>
        </main>
    `,

    async mounted() {
        const list = await fetchList();

        this.levels = (list || [])
            .map(([lvl], index) => ({ lvl, index }))
            .filter(item => item.lvl)
            .map(({ lvl, index }) => ({
                id: lvl.path,
                name: lvl.name,
                rank: index + 1,
                verifier: lvl.verifier || '',
                records: Array.isArray(lvl.records) ? lvl.records : [],
            }));

        if (store.user) {
            this.playerName =
                store.user.displayName ||
                store.user.username ||
                '';
        }

        document.addEventListener('click', this.handleOutsideClick);
        this.loading = false;
    },

    beforeUnmount() {
        document.removeEventListener('click', this.handleOutsideClick);
    },

    methods: {
        setRecordType(type) {
            if (this.recordType === type) return;

            this.recordType = type;
            this.error = '';
            this.closeLevelDropdown();

            if (type === 'verification') {
                this.percent = 100;
                this.levelId = '';
            } else {
                this.verificationLevelId = '';
                this.verificationLevelName = '';
            }
        },

        toggleLevelDropdown() {
            this.levelDropdownOpen = !this.levelDropdownOpen;

            if (!this.levelDropdownOpen) {
                this.levelSearch = '';
            }
        },

        closeLevelDropdown() {
            this.levelDropdownOpen = false;
            this.levelSearch = '';
        },

        selectLevel(level) {
            this.levelId = level.id;
            this.closeLevelDropdown();
        },

        handleOutsideClick(event) {
            const dropdown = this.$el?.querySelector('.submit-level-field');

            if (dropdown && !dropdown.contains(event.target)) {
                this.closeLevelDropdown();
            }
        },

        handleRawFootage(event) {
            const [file] = event.target.files || [];
            this.rawFootageFile = file || null;
            this.rawFootageProgressText = '';
        },

        resetForm() {
            this.success = false;
            this.error = '';

            this.levelId = '';
            this.levelSearch = '';
            this.levelDropdownOpen = false;

            this.verificationLevelId = '';
            this.verificationLevelName = '';

            this.percent = 100;
            this.hz = '';
            this.methodChoice = '';
            this.methodCustom = '';
            this.mobile = false;
            this.link = '';
            this.note = '';

            this.rawFootageFile = null;
            this.rawFootageProgressText = '';
        },

        async checkCompletionDuplicate() {
            const levelRef = doc(db, 'levels', this.levelId);
            const levelSnap = await getDoc(levelRef);

            if (!levelSnap.exists()) {
                throw new Error('Level không còn tồn tại trên list.');
            }

            const level = levelSnap.data();
            const playerKey = normalizePlayerName(this.playerName);

            if (normalizePlayerName(level.verifier) === playerKey) {
                throw new Error(
                    'Player này là verifier của level nên đã được tính là victor và không thể submit thêm record.'
                );
            }

            const alreadyVictor = (level.records || []).some(record =>
                normalizePlayerName(record.user) === playerKey &&
                Number(record.percent) === 100
            );

            if (alreadyVictor) {
                throw new Error(
                    'Player này đã là victor của level (100%), không thể submit thêm record.'
                );
            }
        },

        async checkVerificationLevelId() {
            const levelId = this.verificationLevelId.trim();

            if (!levelId || levelId.includes('/')) {
                throw new Error('Level ID không hợp lệ. Level ID không được chứa dấu "/".');
            }

            const levelSnap = await getDoc(doc(db, 'levels', levelId));

            if (levelSnap.exists()) {
                throw new Error('Level ID này đã tồn tại trên list.');
            }
        },

        getRawUploadEndpoint() {
            return (
                window.SCLVN_RAW_UPLOAD_ENDPOINT ||
                window.SCLVN_CONFIG?.rawUploadEndpoint ||
                ''
            ).trim();
        },

        async uploadRawFootage(file) {
            if (!file) {
                throw new Error('Vui lòng chọn Raw Footage.');
            }

            const endpoint = this.getRawUploadEndpoint();

            if (!endpoint) {
                throw new Error(
                    'Raw Footage backend chưa được cấu hình. Hãy deploy worker trong thư mục worker/ của gói update rồi đặt SCLVN_RAW_UPLOAD_ENDPOINT.'
                );
            }

            if (!auth.currentUser) {
                throw new Error('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.');
            }

            const chunkEndpoint = endpoint.replace(
                /\/upload-session\/?$/,
                '/upload-chunk'
            );

            // Google Drive requires resumable chunks to be multiples of 256 KiB
            // (except the last chunk). 8 MiB = 32 * 256 KiB.
            const CHUNK_SIZE = 8 * 1024 * 1024;

            this.rawFootageUploading = true;
            this.rawFootageProgressText =
                'Creating secure Google Drive upload session...';

            try {
                const idToken = await getIdToken(auth.currentUser, true);

                const sessionResponse = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        fileName: file.name,
                        mimeType: file.type || 'application/octet-stream',
                        size: file.size,
                    }),
                });

                const sessionData = await sessionResponse
                    .json()
                    .catch(() => ({}));

                if (!sessionResponse.ok || !sessionData.uploadUrl) {
                    throw new Error(
                        sessionData.error ||
                        `Không tạo được Drive upload session (${sessionResponse.status}).`
                    );
                }

                let uploadedFile = null;

                for (let start = 0; start < file.size; start += CHUNK_SIZE) {
                    const end = Math.min(start + CHUNK_SIZE, file.size);
                    const chunk = file.slice(start, end);
                    const percentBefore = Math.floor((start / file.size) * 100);

                    this.rawFootageProgressText =
                        `Uploading ${formatBytes(file.size)} to Google Drive... ` +
                        `${percentBefore}%`;

                    // Get a current Firebase token for every chunk so very large
                    // uploads keep working even if the original token ages.
                    const chunkIdToken = await getIdToken(auth.currentUser);

                    const chunkResponse = await fetch(chunkEndpoint, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${chunkIdToken}`,
                            'Content-Type':
                                file.type || 'application/octet-stream',
                            'Content-Range':
                                `bytes ${start}-${end - 1}/${file.size}`,
                            'X-Upload-Url': sessionData.uploadUrl,
                        },
                        body: chunk,
                    });

                    const chunkData = await chunkResponse
                        .json()
                        .catch(() => ({}));

                    if (!chunkResponse.ok) {
                        throw new Error(
                            chunkData.error ||
                            `Raw Footage chunk upload failed (${chunkResponse.status}).`
                        );
                    }

                    const percentAfter = Math.floor((end / file.size) * 100);

                    this.rawFootageProgressText =
                        `Uploading ${formatBytes(file.size)} to Google Drive... ` +
                        `${percentAfter}%`;

                    if (chunkData.complete) {
                        uploadedFile = chunkData.file || null;
                    }
                }

                if (!uploadedFile?.id) {
                    throw new Error(
                        'Google Drive did not confirm the completed upload.'
                    );
                }

                this.rawFootageProgressText =
                    'Raw footage uploaded successfully.';

                return {
                    driveFileId: uploadedFile.id,
                    link:
                        uploadedFile.webViewLink ||
                        `https://drive.google.com/file/d/${uploadedFile.id}/view`,
                    name: uploadedFile.name || file.name,
                    size: file.size,
                    mimeType: file.type || 'application/octet-stream',
                };
            } finally {
                this.rawFootageUploading = false;
            }
        },

        async submitRecord() {
            this.error = '';

            if (!store.user) {
                this.error = 'Vui lòng đăng nhập.';
                return;
            }

            if (!this.playerName.trim()) {
                this.error = 'Vui lòng nhập tên player.';
                return;
            }

            if (!this.hz.trim()) {
                this.error = 'FPS là bắt buộc.';
                return;
            }

            if (!this.methodChoice) {
                this.error = 'Vui lòng chọn Method.';
                return;
            }

            if (
                this.methodChoice === 'Custom' &&
                !this.methodCustom.trim()
            ) {
                this.error = 'Vui lòng nhập Custom Method.';
                return;
            }

            if (!this.rawFootageFile) {
                this.error = 'Raw Footage là bắt buộc.';
                return;
            }

            if (this.recordType === 'completion') {
                if (!this.levelId) {
                    this.error = 'Vui lòng chọn level.';
                    return;
                }

                if (!this.percent || this.percent < 1 || this.percent > 100) {
                    this.error = 'Percentage không hợp lệ.';
                    return;
                }
            } else {
                if (!this.verificationLevelId.trim()) {
                    this.error = 'Vui lòng nhập Level ID.';
                    return;
                }

                if (!this.verificationLevelName.trim()) {
                    this.error = 'Vui lòng nhập Level name.';
                    return;
                }

                this.percent = 100;
            }

            this.submitting = true;

            try {
                if (this.recordType === 'completion') {
                    await this.checkCompletionDuplicate();
                } else {
                    await this.checkVerificationLevelId();
                }

                const rawFootage =
                    await this.uploadRawFootage(this.rawFootageFile);

                const targetLevelId =
                    this.recordType === 'verification'
                        ? this.verificationLevelId.trim()
                        : this.levelId;

                const targetLevelName =
                    this.recordType === 'verification'
                        ? this.verificationLevelName.trim()
                        : this.selectedLevel?.name || this.levelId;

                await addDoc(collection(db, 'submissions'), {
                    type: this.recordType,

                    levelId: targetLevelId,
                    levelName: targetLevelName,

                    playerName: this.playerName.trim(),
                    playerNameLower: normalizePlayerName(this.playerName),

                    percent:
                        this.recordType === 'verification'
                            ? 100
                            : Number(this.percent),

                    hz: this.hz.trim(),
                    method: this.submissionMethod,
                    mobile: this.mobile,

                    link: this.link.trim(),
                    rawFootage,
                    note: this.note.trim(),

                    status: 'pending',

                    submittedByUid: store.user.uid,
                    submittedByEmail: store.user.email || '',
                    submittedByName:
                        store.user.username ||
                        store.user.displayName ||
                        this.playerName.trim(),

                    submittedAt: serverTimestamp(),
                });

                this.success = true;
            } catch (e) {
                console.error(e);

                this.error =
                    e?.message ||
                    'Gửi thất bại, thử lại sau.';
            } finally {
                this.submitting = false;
            }
        },
    },
};
