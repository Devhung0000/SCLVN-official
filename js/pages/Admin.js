import { store } from '../main.js';
import {
    auth,
    db,
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    runTransaction,
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

const DEVICE_OPTIONS = [
    'All',
    'Uncapped',
    'K55',
    'K70',
    'Logitech G512',
];

function normalizePlayerName(value) {
    return String(value || '').trim().toLowerCase();
}

function timestampToMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

export default {
    components: { Spinner, SclvnSelect },

    data: () => ({
        loading: true,
        submissions: [],
        history: [],
        activeTab: 'pending',
        busyId: null,
        listLength: 0,

        confirmDialog: {
            open: false,
            action: '',
            sub: null,
            reason: '',
        },

        pageError: '',
        store,
    }),

    template: `
        <main v-if="store.authLoading">
            <Spinner></Spinner>
        </main>

        <main v-else-if="!store.user" class="page-admin">
            <section class="admin-access-card">
                <h1>Admin Review</h1>
                <p>You need to be logged in to access this page.</p>

                <router-link class="admin-primary-btn" to="/login">
                    Login
                </router-link>
            </section>
        </main>

        <main v-else-if="store.user.role !== 'admin'" class="page-admin">
            <section class="admin-access-card">
                <h1>Access denied</h1>
                <p>This page is only available to SCLVN administrators.</p>
            </section>
        </main>

        <main v-else-if="loading">
            <Spinner></Spinner>
        </main>

        <main v-else class="page-admin">
            <section class="admin-shell">
                <header class="admin-header">
                    <div>
                        <span class="admin-kicker">MODERATION</span>
                        <h1>Record Review</h1>
                        <p>
                            Review completions, verification requests and moderation history.
                        </p>
                    </div>

                    <div class="admin-header-actions">
                        <router-link
                            class="admin-refresh-btn admin-nav-btn"
                            to="/admin/bug-reports"
                        >
                            Bug Reports
                        </router-link>

                        <span class="admin-count">
                            {{ pendingCount }} pending
                        </span>

                        <button
                            class="admin-refresh-btn"
                            type="button"
                            @click="load"
                        >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M20 6v5h-5"></path>
                                <path d="M4 18v-5h5"></path>
                                <path d="M18.5 9A7 7 0 0 0 6 6.5L4 9"></path>
                                <path d="M5.5 15A7 7 0 0 0 18 17.5l2-2.5"></path>
                            </svg>

                            Refresh
                        </button>
                    </div>
                </header>

                <div class="admin-tabs">
                    <button
                        type="button"
                        :class="{ active: activeTab === 'pending' }"
                        @click="activeTab = 'pending'"
                    >
                        Pending
                        <span>{{ pendingCount }}</span>
                    </button>

                    <button
                        type="button"
                        :class="{ active: activeTab === 'history' }"
                        @click="activeTab = 'history'"
                    >
                        History
                        <span>{{ history.length }}</span>
                    </button>
                </div>

                <div v-if="pageError" class="admin-page-error">
                    {{ pageError }}
                </div>

                <template v-if="activeTab === 'pending'">
                    <div v-if="submissions.length === 0" class="admin-empty">
                        <div class="admin-empty-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M20 6 9 17l-5-5"></path>
                            </svg>
                        </div>

                        <h2>Queue cleared</h2>
                        <p>There are no submissions waiting for review.</p>
                    </div>

                    <div v-else class="admin-list">
                        <article
                            v-for="sub in submissions"
                            :key="sub.id"
                            class="admin-record-card"
                            :class="{
                                'admin-record-self': isOwnSubmission(sub),
                                'admin-record-verification': submissionType(sub) === 'verification'
                            }"
                        >
                            <header class="admin-record-head">
                                <div>
                                    <span class="admin-record-label">
                                        {{
                                            submissionType(sub) === 'verification'
                                                ? 'PENDING VERIFICATION'
                                                : 'PENDING COMPLETION'
                                        }}
                                    </span>

                                    <h2>{{ sub.levelName }}</h2>

                                    <p class="admin-record-id">
                                        ID: {{ sub.levelId }}
                                    </p>
                                </div>

                                <div class="admin-record-head-pills">
                                    <span
                                        v-if="submissionType(sub) === 'verification'"
                                        class="admin-verification-pill"
                                    >
                                        Verification
                                    </span>

                                    <span class="admin-pending-pill">
                                        Pending
                                    </span>
                                </div>
                            </header>

                            <div
                                v-if="isOwnSubmission(sub)"
                                class="admin-self-review-warning"
                            >
                                <strong>Another admin required</strong>
                                <span>
                                    You submitted this entry, so you cannot approve or reject it.
                                </span>
                            </div>

                            <div class="admin-form-grid">
                                <label class="admin-field">
                                    <span>
                                        {{
                                            submissionType(sub) === 'verification'
                                                ? 'Verifier'
                                                : 'Player'
                                        }}
                                    </span>

                                    <input v-model="sub.playerName" type="text">
                                </label>

                                <label class="admin-field">
                                    <span>Percentage</span>

                                    <div class="admin-percent-field">
                                        <input
                                            v-model.number="sub.percent"
                                            type="number"
                                            min="1"
                                            max="100"
                                            :disabled="submissionType(sub) === 'verification'"
                                        >

                                        <strong>%</strong>
                                    </div>
                                </label>

                                <label class="admin-field">
                                    <span>Hz / Device submitted</span>
                                    <input v-model="sub.hz" type="text">
                                </label>

                                <label class="admin-mobile-card">
                                    <input v-model="sub.mobile" type="checkbox">
                                    <span class="admin-check-ui"></span>
                                    <span>Mobile</span>
                                </label>

                                <label class="admin-field admin-field-full">
                                    <span>Video Link <small>optional</small></span>
                                    <input v-model="sub.link" type="text">
                                </label>
                            </div>

                            <section
                                v-if="submissionType(sub) === 'verification'"
                                class="admin-add-level"
                            >
                                <div class="admin-add-level-head">
                                    <div>
                                        <span class="admin-record-label">ADD LEVEL</span>
                                        <h3>Level configuration</h3>
                                    </div>

                                    <span class="admin-add-level-id">
                                        /levels/{{ sub._level.id }}
                                    </span>
                                </div>

                                <div class="admin-form-grid">
                                    <label class="admin-field">
                                        <span>Level ID</span>
                                        <input v-model.trim="sub._level.id" type="text">
                                    </label>

                                    <label class="admin-field">
                                        <span>Level name</span>
                                        <input v-model.trim="sub._level.name" type="text">
                                    </label>


                                    <label class="admin-field admin-field-full">
                                        <span>Thumbnail</span>

                                        <div class="admin-thumbnail-upload">
                                            <div class="admin-thumbnail-preview">
                                                <img
                                                    v-if="sub._level.thumbnailPreview || sub._level.thumbnailUrl"
                                                    :src="sub._level.thumbnailPreview || sub._level.thumbnailUrl"
                                                    alt="Level thumbnail preview"
                                                >

                                                <div v-else>
                                                    No thumbnail selected
                                                </div>
                                            </div>

                                            <label class="admin-thumbnail-button">
                                                Upload thumbnail
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp"
                                                    @change="handleLevelThumbnail(sub, $event)"
                                                >
                                            </label>

                                            <small v-if="sub._level.thumbnailFile">
                                                {{ sub._level.thumbnailFile.name }}
                                            </small>
                                        </div>
                                    </label>

                                    <label class="admin-field">
                                        <span>FPS</span>
                                        <input
                                            v-model.trim="sub._level.fps"
                                            type="text"
                                            placeholder="60 / 240 / CBF..."
                                        >
                                    </label>

                                    <label class="admin-field">
                                        <span>Handcam</span>

                                        <SclvnSelect
                                            v-model="sub._level.handcam"
                                            :options="handcamPickerOptions"
                                            placeholder="Select handcam"
                                        ></SclvnSelect>
                                    </label>

                                    <label class="admin-field">
                                        <span>Method</span>

                                        <SclvnSelect
                                            v-model="sub._level.methodChoice"
                                            :options="methodPickerOptions"
                                            placeholder="Select a method"
                                            searchable
                                            search-placeholder="Search methods..."
                                        ></SclvnSelect>
                                    </label>

                                    <label
                                        v-if="sub._level.methodChoice === 'Custom'"
                                        class="admin-field"
                                    >
                                        <span>Custom method</span>

                                        <input
                                            v-model.trim="sub._level.methodCustom"
                                            type="text"
                                            placeholder="Type another method"
                                        >
                                    </label>

                                    <label class="admin-field">
                                        <span>Device</span>

                                        <SclvnSelect
                                            v-model="sub._level.deviceChoice"
                                            :options="devicePickerOptions"
                                            placeholder="Select a device"
                                            searchable
                                            search-placeholder="Search devices..."
                                        ></SclvnSelect>
                                    </label>

                                    <label
                                        v-if="sub._level.deviceChoice === 'CPS Cap'"
                                        class="admin-field"
                                    >
                                        <span>Minimum CPS cap</span>

                                        <div class="admin-cps-field">
                                            <input
                                                v-model.number="sub._level.cpsCap"
                                                type="number"
                                                min="1"
                                                step="1"
                                                placeholder="12"
                                            >

                                            <strong>cps</strong>
                                        </div>
                                    </label>

                                    <label class="admin-field">
                                        <span>Uploader</span>

                                        <input
                                            v-model.trim="sub._level.author"
                                            type="text"
                                            placeholder="Level uploader"
                                        >
                                    </label>

                                    <label class="admin-field">
                                        <span>Creators</span>

                                        <input
                                            v-model="sub._level.creators"
                                            type="text"
                                            placeholder="Creator 1, Creator 2"
                                        >
                                    </label>

                                    <label class="admin-field">
                                        <span>Percent to qualify</span>

                                        <div class="admin-percent-field">
                                            <input
                                                v-model.number="sub._level.percentToQualify"
                                                type="number"
                                                min="1"
                                                max="100"
                                            >

                                            <strong>%</strong>
                                        </div>
                                    </label>

                                    <label class="admin-field">
                                        <span>Rank</span>

                                        <input
                                            v-model.number="sub._level.listPosition"
                                            type="number"
                                            min="1"
                                            :max="listLength + 1"
                                        >
                                    </label>
                                </div>

                                <p
                                    v-if="sub._level.deviceChoice === 'CPS Cap' && sub._level.cpsCap"
                                    class="admin-device-preview"
                                >
                                    Device:
                                    <strong>
                                        All, devices with a {{ sub._level.cpsCap }}cps cap or higher.
                                    </strong>
                                </p>
                            </section>

                            <div class="admin-record-meta admin-record-meta-inline">
                                <p v-if="sub.note" class="admin-meta-note">
                                    <strong>Note</strong>
                                    <span>{{ sub.note }}</span>
                                </p>

                                <p>
                                    <strong>Submitted by</strong>
                                    <span>
                                        {{
                                            sub.submittedByName ||
                                            sub.submittedByEmail ||
                                            'Unknown'
                                        }}
                                    </span>
                                </p>

                                <p>
                                    <strong>Submitted at</strong>
                                    <span>{{ formatDate(sub.submittedAt) }}</span>
                                </p>
                            </div>

                            <footer class="admin-record-actions">
                                <div class="admin-proof-links">
                                    <a
                                        v-if="sub.link"
                                        :href="sub.link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="admin-video-btn"
                                    >
                                        View video
                                    </a>

                                    <a
                                        v-if="sub.rawFootage && sub.rawFootage.link"
                                        :href="sub.rawFootage.link"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="admin-video-btn"
                                    >
                                        Raw Footage
                                    </a>
                                </div>

                                <div class="admin-decision-actions">
                                    <button
                                        class="admin-reject-btn"
                                        type="button"
                                        :disabled="busyId === sub.id || isOwnSubmission(sub)"
                                        @click="requestDecision('reject', sub)"
                                    >
                                        Reject
                                    </button>

                                    <button
                                        class="admin-primary-btn"
                                        type="button"
                                        :disabled="busyId === sub.id || isOwnSubmission(sub)"
                                        @click="requestDecision('approve', sub)"
                                    >
                                        {{
                                            busyId === sub.id
                                                ? 'Working...'
                                                : submissionType(sub) === 'verification'
                                                    ? 'Approve & Add Level'
                                                    : 'Approve'
                                        }}
                                    </button>
                                </div>
                            </footer>
                        </article>
                    </div>
                </template>

                <template v-else>
                    <div v-if="history.length === 0" class="admin-empty">
                        <h2>No history yet</h2>
                        <p>Approved and rejected submissions will appear here.</p>
                    </div>

                    <div v-else class="admin-history-list">
                        <article
                            v-for="item in history"
                            :key="item.id"
                            class="admin-history-card"
                        >
                            <header>
                                <div>
                                    <span class="admin-record-label">
                                        {{ submissionType(item).toUpperCase() }}
                                    </span>

                                    <h3>{{ item.levelName }}</h3>
                                </div>

                                <span
                                    class="admin-history-status"
                                    :class="'is-' + item.status"
                                >
                                    {{ item.status }}
                                </span>
                            </header>

                            <div class="admin-history-grid">
                                <p>
                                    <strong>Player</strong>
                                    <span>
                                        {{
                                            item.finalRecord?.user ||
                                            item.playerName ||
                                            'Unknown'
                                        }}
                                    </span>
                                </p>

                                <p>
                                    <strong>Reviewed by</strong>
                                    <span>
                                        {{
                                            item.reviewedByName ||
                                            item.reviewedByEmail ||
                                            item.reviewedByUid ||
                                            'Unknown'
                                        }}
                                    </span>
                                </p>

                                <p>
                                    <strong>Reviewed at</strong>
                                    <span>{{ formatDate(item.reviewedAt) }}</span>
                                </p>

                                <p>
                                    <strong>Submitted by</strong>
                                    <span>
                                        {{
                                            item.submittedByName ||
                                            item.submittedByEmail ||
                                            'Unknown'
                                        }}
                                    </span>
                                </p>

                                <p v-if="item.createdLevelId">
                                    <strong>Created Level ID</strong>
                                    <span>{{ item.createdLevelId }}</span>
                                </p>

                                <p v-if="item.rejectionReason">
                                    <strong>Reject reason</strong>
                                    <span>{{ item.rejectionReason }}</span>
                                </p>
                            </div>

                            <footer class="admin-history-links">
                                <a
                                    v-if="item.link"
                                    :href="item.link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Video
                                </a>

                                <a
                                    v-if="item.rawFootage && item.rawFootage.link"
                                    :href="item.rawFootage.link"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Raw Footage
                                </a>
                            </footer>
                        </article>
                    </div>
                </template>
            </section>

            <div
                v-if="confirmDialog.open"
                class="admin-confirm-backdrop"
                @click.self="closeConfirm"
            >
                <section class="admin-confirm-modal">
                    <span class="admin-record-label">
                        CONFIRM ACTION
                    </span>

                    <h2>
                        {{
                            confirmDialog.action === 'approve'
                                ? submissionType(confirmDialog.sub) === 'verification'
                                    ? 'Approve and add this level?'
                                    : 'Approve this record?'
                                : 'Reject this submission?'
                        }}
                    </h2>

                    <div class="admin-confirm-summary">
                        <strong>{{ confirmDialog.sub?.levelName }}</strong>
                        <span>
                            {{ confirmDialog.sub?.playerName }}
                            ·
                            {{ confirmDialog.sub?.percent || 100 }}%
                        </span>
                    </div>

                    <label
                        v-if="confirmDialog.action === 'reject'"
                        class="admin-field"
                    >
                        <span>Reason <small>optional</small></span>

                        <textarea
                            v-model="confirmDialog.reason"
                            rows="3"
                            placeholder="Why is this submission being rejected?"
                        ></textarea>
                    </label>

                    <p class="admin-confirm-warning">
                        This action is recorded in moderation history.
                    </p>

                    <div class="admin-confirm-actions">
                        <button
                            type="button"
                            class="admin-confirm-cancel"
                            @click="closeConfirm"
                        >
                            Cancel
                        </button>

                        <button
                            v-if="confirmDialog.action === 'reject'"
                            type="button"
                            class="admin-reject-btn"
                            @click="confirmDecision"
                        >
                            Yes, Reject
                        </button>

                        <button
                            v-else
                            type="button"
                            class="admin-primary-btn"
                            @click="confirmDecision"
                        >
                            Yes, Approve
                        </button>
                    </div>
                </section>
            </div>
        </main>
    `,

    async mounted() {
        await this.load();
    },

    watch: {
        'store.user'() {
            this.load();
        },
    },

    computed: {
        pendingCount() {
            return this.submissions.length;
        },

        methodOptions() {
            return METHOD_OPTIONS;
        },

        deviceOptions() {
            return DEVICE_OPTIONS;
        },

        handcamPickerOptions() {
            return [
                { value: 'Recommended', label: 'Recommended' },
                { value: 'Necessary', label: 'Necessary' },
            ];
        },

        methodPickerOptions() {
            return [
                ...METHOD_OPTIONS.map(value => ({
                    value,
                    label: value,
                })),
                { value: 'Custom', label: 'Custom...' },
            ];
        },

        devicePickerOptions() {
            return [
                ...DEVICE_OPTIONS.map(value => ({
                    value,
                    label: value,
                })),
                { value: 'CPS Cap', label: 'CPS Cap...' },
            ];
        },
    },

    methods: {
        submissionType(sub) {
            return sub?.type === 'verification'
                ? 'verification'
                : 'completion';
        },

        isOwnSubmission(sub) {
            return Boolean(
                sub?.submittedByUid &&
                store.user?.uid &&
                sub.submittedByUid === store.user.uid
            );
        },

        formatDate(value) {
            const millis = timestampToMillis(value);

            if (!millis) return 'Pending server timestamp';

            return new Intl.DateTimeFormat('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(new Date(millis));
        },

        getReviewerName() {
            return (
                store.user?.username ||
                store.user?.displayName ||
                store.user?.email ||
                'Admin'
            );
        },

        prepareSubmission(data) {
            const sub = {
                ...data,
                type: data.type || 'completion',
            };

            if (sub.type === 'verification') {
                const submittedMethod = String(sub.method || '').trim();
                const standardMethod = METHOD_OPTIONS.includes(submittedMethod);

                const submittedDevice = String(sub.device || '').trim();
                const standardDevice = DEVICE_OPTIONS.includes(submittedDevice);

                const cpsMatch = submittedDevice.match(
                    /devices with a\s+(\d+)\s*cps cap or higher/i
                );

                sub.percent = 100;

                sub._level = {
                    id: sub.levelId || '',
                    name: sub.levelName || '',
                    fps: sub.fps || sub.hz || '',

                    methodChoice:
                        standardMethod
                            ? submittedMethod
                            : submittedMethod
                                ? 'Custom'
                                : 'Alternate',

                    methodCustom:
                        standardMethod
                            ? ''
                            : submittedMethod,

                    handcam:
                        sub.handcam === 'Necessary'
                            ? 'Necessary'
                            : 'Recommended',

                    deviceChoice:
                        standardDevice
                            ? submittedDevice
                            : cpsMatch
                                ? 'CPS Cap'
                                : 'All',

                    cpsCap:
                        cpsMatch
                            ? Number(cpsMatch[1])
                            : '',

                    author: sub.author || sub.playerName || '',
                    creators:
                        Array.isArray(sub.creators)
                            ? sub.creators.join(', ')
                            : sub.creators || '',

                    percentToQualify:
                        Number(sub.percentToQualify || 100),

                    listPosition:
                        Number(
                            sub.rank ||
                            sub.listPosition ||
                            this.listLength + 1
                        ),

                    thumbnailFile: null,
                    thumbnailPreview:
                        sub.thumbnail ||
                        sub.thumbnailUrl ||
                        '',
                    thumbnailUrl:
                        sub.thumbnail ||
                        sub.thumbnailUrl ||
                        '',
                    thumbnailFileId:
                        sub.thumbnailFileId ||
                        '',
                };
            }

            return sub;
        },

        async load() {
            if (!store.user || store.user.role !== 'admin') {
                this.loading = false;
                return;
            }

            this.loading = true;
            this.pageError = '';

            try {
                const [pendingSnap, historySnap, metaSnap] = await Promise.all([
                    getDocs(
                        query(
                            collection(db, 'submissions'),
                            where('status', '==', 'pending')
                        )
                    ),

                    getDocs(
                        query(
                            collection(db, 'submissions'),
                            where('status', 'in', ['approved', 'rejected'])
                        )
                    ),

                    getDoc(doc(db, 'meta', 'list')),
                ]);

                const metaData = metaSnap.exists() ? metaSnap.data() : {};

                const order =
                    metaData.order ||
                    metaData.data ||
                    metaData.list ||
                    [];

                this.listLength = Array.isArray(order) ? order.length : 0;

                this.submissions = pendingSnap.docs
                    .map(d => ({
                        id: d.id,
                        ...d.data(),
                    }))
                    .map(item => this.prepareSubmission(item))
                    .sort(
                        (a, b) =>
                            timestampToMillis(a.submittedAt) -
                            timestampToMillis(b.submittedAt)
                    );

                this.history = historySnap.docs
                    .map(d => ({
                        id: d.id,
                        ...d.data(),
                    }))
                    .sort(
                        (a, b) =>
                            timestampToMillis(b.reviewedAt) -
                            timestampToMillis(a.reviewedAt)
                    );
            } catch (e) {
                console.error('Lỗi tải submissions:', e);
                this.pageError = 'Không tải được moderation queue: ' + (e.message || '');
            } finally {
                this.loading = false;
            }
        },

        requestDecision(action, sub) {
            this.pageError = '';

            if (this.isOwnSubmission(sub)) {
                this.pageError =
                    'Admin không thể duyệt submission do chính mình gửi. Cần một admin khác.';
                return;
            }

            this.confirmDialog = {
                open: true,
                action,
                sub,
                reason: '',
            };
        },

        closeConfirm() {
            if (this.busyId) return;

            this.confirmDialog = {
                open: false,
                action: '',
                sub: null,
                reason: '',
            };
        },

        async confirmDecision() {
            const { action, sub } = this.confirmDialog;

            if (!sub || !action) return;

            if (action === 'approve') {
                await this.approve(sub);
            } else {
                await this.reject(sub, this.confirmDialog.reason);
            }

            if (!this.busyId) {
                this.closeConfirm();
            }
        },

        handleLevelThumbnail(sub, event) {
            const [file] = event.target.files || [];

            if (!file) {
                return;
            }

            if (!file.type.startsWith('image/')) {
                this.pageError = 'Thumbnail phải là file ảnh.';
                event.target.value = '';
                return;
            }

            if (file.size > 8 * 1024 * 1024) {
                this.pageError = 'Thumbnail phải nhỏ hơn 8 MB.';
                event.target.value = '';
                return;
            }

            if (sub._level.thumbnailPreview?.startsWith?.('blob:')) {
                URL.revokeObjectURL(sub._level.thumbnailPreview);
            }

            sub._level.thumbnailFile = file;
            sub._level.thumbnailPreview = URL.createObjectURL(file);
            event.target.value = '';
        },

        getRawUploadEndpoint() {
            return (
                window.SCLVN_RAW_UPLOAD_ENDPOINT ||
                window.SCLVN_CONFIG?.rawUploadEndpoint ||
                ''
            ).trim();
        },

        async uploadFileThroughWorker(file, prefix = 'LEVEL_THUMBNAIL') {
            const endpoint = this.getRawUploadEndpoint();

            if (!endpoint) {
                throw new Error('Upload Worker chưa được cấu hình.');
            }

            if (!auth.currentUser) {
                throw new Error('Phiên đăng nhập đã hết.');
            }

            const chunkEndpoint = endpoint.replace(
                /\/upload-session\/?$/,
                '/upload-chunk'
            );

            const CHUNK_SIZE = 8 * 1024 * 1024;
            const idToken = await getIdToken(auth.currentUser, true);

            const safeName = String(file.name || 'thumbnail')
                .replace(/[\u0000-\u001F]/g, '')
                .replace(/[\\/:*?"<>|]/g, '_')
                .slice(0, 180);

            const uploadName =
                `${prefix}_${Date.now()}_${safeName}`;

            const sessionResponse = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    fileName: uploadName,
                    mimeType:
                        file.type ||
                        'application/octet-stream',
                    size: file.size,
                    purpose: 'level-thumbnail',
                }),
            });

            const sessionData = await sessionResponse
                .json()
                .catch(() => ({}));

            if (!sessionResponse.ok || !sessionData.uploadUrl) {
                throw new Error(
                    sessionData.error ||
                    `Không tạo được upload session (${sessionResponse.status}).`
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
                const chunkToken =
                    await getIdToken(auth.currentUser);

                const chunkResponse = await fetch(
                    chunkEndpoint,
                    {
                        method: 'POST',
                        headers: {
                            Authorization:
                                `Bearer ${chunkToken}`,
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
                        `Thumbnail upload failed (${chunkResponse.status}).`
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
                    'Google Drive không xác nhận thumbnail upload.'
                );
            }

            return {
                id: uploadedFile.id,
                name:
                    uploadedFile.name ||
                    uploadName,

                // Works when the Drive file/folder is viewable by the site.
                displayUrl:
                    `https://drive.google.com/thumbnail?id=${encodeURIComponent(uploadedFile.id)}&sz=w1200`,

                viewUrl:
                    uploadedFile.webViewLink ||
                    `https://drive.google.com/file/d/${uploadedFile.id}/view`,
            };
        },

        async uploadVerificationThumbnail(sub) {
            const file = sub?._level?.thumbnailFile;

            if (!file) {
                return;
            }

            const result = await this.uploadFileThroughWorker(
                file,
                'LEVEL_THUMBNAIL'
            );

            sub._level.thumbnailFileId = result.id;
            sub._level.thumbnailUrl = result.displayUrl;
        },

        validateVerificationConfig(sub) {
            const config = sub._level;

            if (!config?.id?.trim()) {
                throw new Error('Level ID không được để trống.');
            }

            if (config.id.includes('/')) {
                throw new Error('Level ID không được chứa dấu "/".');
            }

            if (!config.name?.trim()) {
                throw new Error('Level name không được để trống.');
            }

            if (!config.fps?.trim()) {
                throw new Error('FPS không được để trống.');
            }

            if (
                config.methodChoice === 'Custom' &&
                !config.methodCustom?.trim()
            ) {
                throw new Error('Vui lòng nhập custom method.');
            }

            if (
                config.deviceChoice === 'CPS Cap' &&
                (!Number.isFinite(Number(config.cpsCap)) ||
                    Number(config.cpsCap) < 1)
            ) {
                throw new Error('CPS cap không hợp lệ.');
            }

            const percentToQualify = Number(config.percentToQualify);

            if (
                !Number.isFinite(percentToQualify) ||
                percentToQualify < 1 ||
                percentToQualify > 100
            ) {
                throw new Error('Percent to qualify phải từ 1 đến 100.');
            }
        },

        buildLevelData(sub) {
            this.validateVerificationConfig(sub);

            const config = sub._level;

            const method =
                config.methodChoice === 'Custom'
                    ? config.methodCustom.trim()
                    : config.methodChoice;

            const device =
                config.deviceChoice === 'CPS Cap'
                    ? `All, devices with a ${Number(config.cpsCap)}cps cap or higher.`
                    : config.deviceChoice;

            const creators = String(config.creators || '')
                .split(',')
                .map(value => value.trim())
                .filter(Boolean);

            const levelId = config.id.trim();
            const verification =
                String(sub.link || sub.verification || '').trim();

            const rank = Math.max(
                1,
                Math.floor(
                    Number(config.listPosition) ||
                    this.listLength + 1
                )
            );

            const levelData = {
                id: levelId,
                name: config.name.trim(),

                author:
                    String(config.author || '').trim() ||
                    String(sub.playerName || '').trim(),

                creators,

                verifier:
                    String(sub.playerName || '').trim(),

                verification,
                showcase: verification,

                fps:
                    String(config.fps || sub.fps || sub.hz || '').trim(),

                method,
                handcam: config.handcam,
                device,

                rank,
                percentToQualify:
                    Number(config.percentToQualify),

                records: [],
                tags: [],
            };

            if (config.thumbnailUrl) {
                levelData.thumbnail = config.thumbnailUrl;
            }

            if (config.thumbnailFileId) {
                levelData.thumbnailFileId =
                    config.thumbnailFileId;
            }

            return levelData;
        },

        async approve(sub) {
            if (this.isOwnSubmission(sub)) {
                this.pageError =
                    'Admin không thể duyệt submission do chính mình gửi.';
                return;
            }

            this.busyId = sub.id;
            this.pageError = '';

            try {
                if (this.submissionType(sub) === 'verification') {
                    await this.approveVerification(sub);
                } else {
                    await this.approveCompletion(sub);
                }

                await this.load();
            } catch (e) {
                console.error(e);
                this.pageError = 'Lỗi khi duyệt: ' + (e.message || '');
            } finally {
                this.busyId = null;
            }
        },

        async approveCompletion(sub) {
            const submissionRef = doc(db, 'submissions', sub.id);
            const levelRef = doc(db, 'levels', sub.levelId);

            const playerName = String(sub.playerName || '').trim();
            const playerKey = normalizePlayerName(playerName);
            const percent = Number(sub.percent);

            if (!playerName) {
                throw new Error('Player name không được để trống.');
            }

            if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
                throw new Error('Percentage không hợp lệ.');
            }

            await runTransaction(db, async transaction => {
                const submissionSnap = await transaction.get(submissionRef);
                const levelSnap = await transaction.get(levelRef);

                if (!submissionSnap.exists()) {
                    throw new Error('Submission không còn tồn tại.');
                }

                const freshSubmission = submissionSnap.data();

                if (freshSubmission.status !== 'pending') {
                    throw new Error('Submission này đã được xử lý bởi admin khác.');
                }

                if (freshSubmission.submittedByUid === store.user.uid) {
                    throw new Error(
                        'Không thể tự duyệt submission của chính admin đang đăng nhập.'
                    );
                }

                if (!levelSnap.exists()) {
                    throw new Error('Level không tồn tại.');
                }

                const level = levelSnap.data();

                if (normalizePlayerName(level.verifier) === playerKey) {
                    throw new Error(
                        'Player này là verifier nên đã là victor của level.'
                    );
                }

                const records = Array.isArray(level.records)
                    ? level.records.slice()
                    : [];

                const existingForPlayer = records.filter(
                    record =>
                        normalizePlayerName(record.user) === playerKey
                );

                if (
                    existingForPlayer.some(
                        record => Number(record.percent) === 100
                    )
                ) {
                    throw new Error(
                        'Player này đã là victor 100% của level. Không thể thêm record thứ hai.'
                    );
                }

                const currentBest = existingForPlayer.reduce(
                    (best, record) =>
                        Math.max(best, Number(record.percent) || 0),
                    0
                );

                if (currentBest >= percent) {
                    throw new Error(
                        `Player đã có record ${currentBest}% trên level này. Record mới phải cao hơn để thay thế.`
                    );
                }

                const nextRecords = records.filter(
                    record =>
                        normalizePlayerName(record.user) !== playerKey
                );

                const record = {
                    user: playerName,
                    percent,
                };

                if (sub.hz) record.hz = String(sub.hz).trim();
                if (sub.link) record.link = String(sub.link).trim();
                if (sub.mobile) record.mobile = true;

                nextRecords.push(record);

                transaction.update(levelRef, {
                    records: nextRecords,
                });

                transaction.update(submissionRef, {
                    status: 'approved',

                    reviewedByUid: store.user.uid,
                    reviewedByName: this.getReviewerName(),
                    reviewedByEmail: store.user.email || '',
                    reviewedAt: serverTimestamp(),
                    reviewDecision: 'approved',

                    finalRecord: record,
                });
            });
        },

        async approveVerification(sub) {
            this.validateVerificationConfig(sub);

            await this.uploadVerificationThumbnail(sub);

            const levelData = this.buildLevelData(sub);
            const levelId = sub._level.id.trim();

            const submissionRef = doc(db, 'submissions', sub.id);
            const levelRef = doc(db, 'levels', levelId);
            const listRef = doc(db, 'meta', 'list');

            await runTransaction(db, async transaction => {
                const submissionSnap = await transaction.get(submissionRef);
                const levelSnap = await transaction.get(levelRef);
                const listSnap = await transaction.get(listRef);

                if (!submissionSnap.exists()) {
                    throw new Error('Submission không còn tồn tại.');
                }

                const freshSubmission = submissionSnap.data();

                if (freshSubmission.status !== 'pending') {
                    throw new Error('Submission này đã được xử lý bởi admin khác.');
                }

                if (freshSubmission.submittedByUid === store.user.uid) {
                    throw new Error(
                        'Không thể tự duyệt verification của chính admin đang đăng nhập.'
                    );
                }

                if (levelSnap.exists()) {
                    throw new Error(
                        `Level ID "${levelId}" đã tồn tại.`
                    );
                }

                if (!listSnap.exists()) {
                    throw new Error('Không tìm thấy meta/list.');
                }

                const metaData = listSnap.data();

                let orderField = 'order';
                let order = [];

                if (Array.isArray(metaData.order)) {
                    orderField = 'order';
                    order = metaData.order.slice();
                } else if (Array.isArray(metaData.data)) {
                    orderField = 'data';
                    order = metaData.data.slice();
                } else if (Array.isArray(metaData.list)) {
                    orderField = 'list';
                    order = metaData.list.slice();
                }

                if (order.includes(levelId)) {
                    throw new Error(
                        `Level ID "${levelId}" đã có trong list order.`
                    );
                }

                const wantedPosition = Number(sub._level.listPosition);

                const position = Math.max(
                    1,
                    Math.min(
                        Number.isFinite(wantedPosition)
                            ? Math.floor(wantedPosition)
                            : order.length + 1,
                        order.length + 1
                    )
                );

                order.splice(position - 1, 0, levelId);

                transaction.set(levelRef, levelData);

                transaction.update(listRef, {
                    [orderField]: order,
                });

                transaction.update(submissionRef, {
                    status: 'approved',

                    reviewedByUid: store.user.uid,
                    reviewedByName: this.getReviewerName(),
                    reviewedByEmail: store.user.email || '',
                    reviewedAt: serverTimestamp(),
                    reviewDecision: 'approved',

                    createdLevelId: levelId,
                    createdListPosition: position,
                    approvedLevelSnapshot: levelData,
                });
            });
        },

        async reject(sub, reason = '') {
            if (this.isOwnSubmission(sub)) {
                this.pageError =
                    'Admin không thể reject submission do chính mình gửi.';
                return;
            }

            this.busyId = sub.id;
            this.pageError = '';

            try {
                const submissionRef = doc(db, 'submissions', sub.id);

                await runTransaction(db, async transaction => {
                    const submissionSnap = await transaction.get(submissionRef);

                    if (!submissionSnap.exists()) {
                        throw new Error('Submission không còn tồn tại.');
                    }

                    const freshSubmission = submissionSnap.data();

                    if (freshSubmission.status !== 'pending') {
                        throw new Error(
                            'Submission này đã được xử lý bởi admin khác.'
                        );
                    }

                    if (freshSubmission.submittedByUid === store.user.uid) {
                        throw new Error(
                            'Không thể tự reject submission của chính admin đang đăng nhập.'
                        );
                    }

                    transaction.update(submissionRef, {
                        status: 'rejected',

                        reviewedByUid: store.user.uid,
                        reviewedByName: this.getReviewerName(),
                        reviewedByEmail: store.user.email || '',
                        reviewedAt: serverTimestamp(),
                        reviewDecision: 'rejected',

                        rejectionReason: String(reason || '').trim(),
                    });
                });

                await this.load();
            } catch (e) {
                console.error(e);
                this.pageError = 'Lỗi khi từ chối: ' + (e.message || '');
            } finally {
                this.busyId = null;
            }
        },
    },
};
