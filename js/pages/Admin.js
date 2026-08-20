import { store } from '../main.js';
import {
    db,
    collection,
    getDocs,
    query,
    where,
    doc,
    updateDoc,
    arrayUnion,
    serverTimestamp,
} from '../firebase-init.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },

    data: () => ({
        loading: true,
        submissions: [],
        busyId: null,
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
                        <p>Review, edit and approve pending submissions.</p>
                    </div>

                    <div class="admin-header-actions">
                        <span class="admin-count">
                            {{ submissions.length }} pending
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

                <div v-if="submissions.length === 0" class="admin-empty">
                    <div class="admin-empty-icon">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M20 6 9 17l-5-5"></path>
                        </svg>
                    </div>
                    <h2>Queue cleared</h2>
                    <p>There are no records waiting for review.</p>
                </div>

                <div v-else class="admin-list">
                    <article
                        v-for="sub in submissions"
                        :key="sub.id"
                        class="admin-record-card"
                    >
                        <header class="admin-record-head">
                            <div>
                                <span class="admin-record-label">PENDING RECORD</span>
                                <h2>{{ sub.levelName }}</h2>
                            </div>

                            <span class="admin-pending-pill">Pending</span>
                        </header>

                        <div class="admin-form-grid">
                            <label class="admin-field">
                                <span>Player</span>
                                <input v-model="sub.playerName" type="text">
                            </label>

                            <label class="admin-field">
                                <span>Percent</span>
                                <div class="admin-percent-field">
                                    <input
                                        v-model.number="sub.percent"
                                        type="number"
                                        min="1"
                                        max="100"
                                    >
                                    <strong>%</strong>
                                </div>
                            </label>

                            <label class="admin-field">
                                <span>Hz / Device</span>
                                <input v-model="sub.hz" type="text">
                            </label>

                            <label class="admin-mobile-card">
                                <input v-model="sub.mobile" type="checkbox">
                                <span class="admin-check-ui"></span>
                                <span>Mobile</span>
                            </label>

                            <label class="admin-field admin-field-full">
                                <span>Video link</span>
                                <input v-model="sub.link" type="text">
                            </label>
                        </div>

                        <div class="admin-record-meta">
                            <p v-if="sub.note">
                                <strong>Note</strong>
                                <span>{{ sub.note }}</span>
                            </p>

                            <p>
                                <strong>Submitted by</strong>
                                <span>{{ sub.submittedByEmail || 'Unknown' }}</span>
                            </p>
                        </div>

                        <footer class="admin-record-actions">
                            <a
                                v-if="sub.link"
                                :href="sub.link"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="admin-video-btn"
                            >
                                View video
                            </a>

                            <div class="admin-decision-actions">
                                <button
                                    class="admin-reject-btn"
                                    type="button"
                                    :disabled="busyId === sub.id"
                                    @click="reject(sub)"
                                >
                                    Reject
                                </button>

                                <button
                                    class="admin-primary-btn"
                                    type="button"
                                    :disabled="busyId === sub.id"
                                    @click="approve(sub)"
                                >
                                    {{ busyId === sub.id ? 'Working...' : 'Approve' }}
                                </button>
                            </div>
                        </footer>
                    </article>
                </div>
            </section>
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

    methods: {
        async load() {
            if (!store.user || store.user.role !== 'admin') {
                this.loading = false;
                return;
            }

            this.loading = true;

            try {
                const q = query(
                    collection(db, 'submissions'),
                    where('status', '==', 'pending')
                );

                const snap = await getDocs(q);

                this.submissions = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                }));
            } catch (e) {
                console.error('Lỗi tải submissions:', e);
            }

            this.loading = false;
        },

        async approve(sub) {
            this.busyId = sub.id;

            try {
                const record = {
                    user: sub.playerName,
                    percent: Number(sub.percent),
                };

                if (sub.hz) record.hz = sub.hz;
                if (sub.link) record.link = sub.link;
                if (sub.mobile) record.mobile = true;

                await updateDoc(doc(db, 'levels', sub.levelId), {
                    records: arrayUnion(record),
                });

                await updateDoc(doc(db, 'submissions', sub.id), {
                    status: 'approved',
                    reviewedByUid: store.user.uid,
                    reviewedAt: serverTimestamp(),
                });

                this.submissions =
                    this.submissions.filter(s => s.id !== sub.id);
            } catch (e) {
                alert('Lỗi khi duyệt: ' + e.message);
            } finally {
                this.busyId = null;
            }
        },

        async reject(sub) {
            this.busyId = sub.id;

            try {
                await updateDoc(doc(db, 'submissions', sub.id), {
                    status: 'rejected',
                    reviewedByUid: store.user.uid,
                    reviewedAt: serverTimestamp(),
                });

                this.submissions =
                    this.submissions.filter(s => s.id !== sub.id);
            } catch (e) {
                alert('Lỗi khi từ chối: ' + e.message);
            } finally {
                this.busyId = null;
            }
        },
    },
};
