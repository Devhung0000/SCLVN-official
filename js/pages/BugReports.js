import { store } from '../main.js';
import {
    db,
    collection,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
} from '../firebase-init.js';
import Spinner from '../components/Spinner.js';

function timestampToMillis(value) {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.seconds === 'number') return value.seconds * 1000;

    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
}

export default {
    components: { Spinner },

    data: () => ({
        loading: true,
        busyId: '',
        reports: [],
        activeTab: 'open',
        pageError: '',
        store,
    }),

    computed: {
        openReports() {
            return this.reports.filter(report =>
                ['open', 'investigating'].includes(report.status || 'open')
            );
        },

        historyReports() {
            return this.reports.filter(report =>
                ['fixed', 'wont_fix'].includes(report.status)
            );
        },

        visibleReports() {
            return this.activeTab === 'open'
                ? this.openReports
                : this.historyReports;
        },
    },

    template: `
        <main v-if="store.authLoading">
            <Spinner></Spinner>
        </main>

        <main
            v-else-if="!store.user || store.user.role !== 'admin'"
            class="page-admin page-bug-admin"
        >
            <section class="admin-access-card">
                <h1>Access denied</h1>
                <p>This page is only available to SCLVN administrators.</p>
            </section>
        </main>

        <main v-else-if="loading">
            <Spinner></Spinner>
        </main>

        <main v-else class="page-admin page-bug-admin">
            <section class="admin-shell">
                <header class="admin-header">
                    <div>
                        <span class="admin-kicker">MODERATION</span>
                        <h1>Bug Reports</h1>
                        <p>
                            Review technical reports, evidence and resolution history.
                        </p>
                    </div>

                    <div class="admin-header-actions">
                        <router-link
                            class="admin-refresh-btn admin-nav-btn"
                            to="/admin"
                        >
                            Record Review
                        </router-link>

                        <button
                            class="admin-refresh-btn"
                            type="button"
                            @click="load"
                        >
                            Refresh
                        </button>
                    </div>
                </header>

                <div class="admin-tabs">
                    <button
                        type="button"
                        :class="{ active: activeTab === 'open' }"
                        @click="activeTab = 'open'"
                    >
                        Open
                        <span>{{ openReports.length }}</span>
                    </button>

                    <button
                        type="button"
                        :class="{ active: activeTab === 'history' }"
                        @click="activeTab = 'history'"
                    >
                        History
                        <span>{{ historyReports.length }}</span>
                    </button>
                </div>

                <div
                    v-if="pageError"
                    class="admin-page-error"
                >
                    {{ pageError }}
                </div>

                <div
                    v-if="visibleReports.length === 0"
                    class="admin-empty"
                >
                    <h2>No bug reports here</h2>
                    <p>
                        {{
                            activeTab === 'open'
                                ? 'There are no reports waiting for investigation.'
                                : 'Resolved reports will appear here.'
                        }}
                    </p>
                </div>

                <div
                    v-else
                    class="admin-list bug-admin-list"
                >
                    <article
                        v-for="report in visibleReports"
                        :key="report.id"
                        class="admin-record-card bug-admin-card"
                    >
                        <header class="admin-record-head">
                            <div>
                                <span class="admin-record-label">
                                    BUG REPORT
                                </span>

                                <h2>
                                    {{ report.name || report.submittedByName || 'Unknown user' }}
                                </h2>

                                <p class="admin-record-id">
                                    {{ report.email || 'No email' }}
                                </p>
                            </div>

                            <div class="admin-record-head-pills">
                                <span
                                    class="bug-status-pill"
                                    :class="'is-' + (report.status || 'open')"
                                >
                                    {{ statusLabel(report.status) }}
                                </span>
                            </div>
                        </header>

                        <div class="bug-admin-summary-grid">
                            <div>
                                <span>Contact</span>
                                <strong>{{ report.contact || '—' }}</strong>
                            </div>

                            <div>
                                <span>Frequency</span>
                                <strong>{{ frequencyLabel(report.frequency) }}</strong>
                            </div>

                            <div>
                                <span>Device</span>
                                <strong>{{ deviceLabel(report) }}</strong>
                            </div>

                            <div>
                                <span>Operating System</span>
                                <strong>{{ osLabel(report) }}</strong>
                            </div>

                            <div>
                                <span>Browser</span>
                                <strong>{{ report.browser || '—' }}</strong>
                            </div>

                            <div>
                                <span>Submitted at</span>
                                <strong>{{ formatDate(report.submittedAt) }}</strong>
                            </div>
                        </div>

                        <section class="bug-admin-description">
                            <span>Description</span>
                            <p>{{ report.description || 'No description.' }}</p>
                        </section>

                        <section
                            v-if="report.notes"
                            class="bug-admin-description"
                        >
                            <span>Notes</span>
                            <p>{{ report.notes }}</p>
                        </section>

                        <div
                            v-if="report.attachments?.length"
                            class="bug-admin-attachments"
                        >
                            <a
                                v-for="attachment in report.attachments"
                                :key="attachment.driveFileId || attachment.link"
                                :href="attachment.link"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="bug-report-attachment"
                            >
                                <strong>
                                    {{ attachment.originalName || attachment.name || 'Attachment' }}
                                </strong>
                                <span>Open evidence</span>
                            </a>
                        </div>

                        <footer class="admin-record-actions bug-admin-actions">
                            <a
                                v-if="report.pageUrl"
                                :href="report.pageUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="admin-proof-btn"
                            >
                                Reported page
                            </a>

                            <div class="admin-decision-buttons">
                                <button
                                    v-if="report.status !== 'investigating'"
                                    type="button"
                                    class="bug-action-btn is-investigating"
                                    :disabled="busyId === report.id"
                                    @click="setStatus(report, 'investigating')"
                                >
                                    Investigating
                                </button>

                                <button
                                    type="button"
                                    class="bug-action-btn is-wont-fix"
                                    :disabled="busyId === report.id"
                                    @click="setStatus(report, 'wont_fix')"
                                >
                                    Won't Fix
                                </button>

                                <button
                                    type="button"
                                    class="bug-action-btn is-fixed"
                                    :disabled="busyId === report.id"
                                    @click="setStatus(report, 'fixed')"
                                >
                                    Fixed
                                </button>
                            </div>
                        </footer>

                        <div
                            v-if="report.resolvedByName || report.updatedAt"
                            class="admin-record-meta admin-record-meta-inline"
                        >
                            <p v-if="report.resolvedByName">
                                <strong>Reviewed by</strong>
                                <span>{{ report.resolvedByName }}</span>
                            </p>

                            <p v-if="report.updatedAt">
                                <strong>Updated at</strong>
                                <span>{{ formatDate(report.updatedAt) }}</span>
                            </p>
                        </div>
                    </article>
                </div>
            </section>
        </main>
    `,

    async mounted() {
        await this.load();
    },

    methods: {
        statusLabel(status) {
            return {
                open: 'Open',
                investigating: 'Investigating',
                fixed: 'Fixed',
                wont_fix: "Won't Fix",
            }[status || 'open'] || status;
        },

        frequencyLabel(value) {
            return {
                always: 'Always (100%)',
                sometimes: 'Sometimes (50%)',
                rarely: 'Rarely (below 25%)',
            }[value] || 'Not specified';
        },

        deviceLabel(report) {
            if (report.deviceType === 'other') {
                return report.deviceOther || 'Other';
            }

            return {
                'desktop-laptop': 'Desktop / Laptop',
                'mobile-phone': 'Mobile Phone',
                tablet: 'Tablet',
            }[report.deviceType] || report.deviceType || '—';
        },

        osLabel(report) {
            if (report.operatingSystem === 'other') {
                return report.osOther || 'Other';
            }

            return {
                windows: 'Windows',
                linux: 'Linux',
                macos: 'macOS',
                'ios-ipados': 'iOS / iPadOS',
                android: 'Android',
            }[report.operatingSystem] || report.operatingSystem || '—';
        },

        formatDate(value) {
            const millis = timestampToMillis(value);

            if (!millis) {
                return 'Pending server timestamp';
            }

            return new Intl.DateTimeFormat('en-GB', {
                dateStyle: 'medium',
                timeStyle: 'short',
            }).format(new Date(millis));
        },

        reviewerName() {
            return (
                store.user?.username ||
                store.user?.displayName ||
                store.user?.email ||
                'Admin'
            );
        },

        async load() {
            if (!store.user || store.user.role !== 'admin') {
                this.loading = false;
                return;
            }

            this.loading = true;
            this.pageError = '';

            try {
                const snap = await getDocs(collection(db, 'bug_reports'));

                this.reports = snap.docs
                    .map(d => ({
                        id: d.id,
                        ...d.data(),
                    }))
                    .sort(
                        (a, b) =>
                            timestampToMillis(b.submittedAt) -
                            timestampToMillis(a.submittedAt)
                    );
            } catch (error) {
                console.error(error);
                this.pageError =
                    'Could not load bug reports: ' +
                    (error?.message || '');
            } finally {
                this.loading = false;
            }
        },

        async setStatus(report, status) {
            this.busyId = report.id;
            this.pageError = '';

            try {
                await updateDoc(
                    doc(db, 'bug_reports', report.id),
                    {
                        status,
                        updatedAt: serverTimestamp(),
                        resolvedByUid: store.user.uid,
                        resolvedByName: this.reviewerName(),
                        resolvedByEmail: store.user.email || '',
                    }
                );

                await this.load();

                if (['fixed', 'wont_fix'].includes(status)) {
                    this.activeTab = 'history';
                }
            } catch (error) {
                console.error(error);
                this.pageError =
                    'Could not update report: ' +
                    (error?.message || '');
            } finally {
                this.busyId = '';
            }
        },
    },
};
