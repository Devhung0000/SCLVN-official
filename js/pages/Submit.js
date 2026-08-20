import { store } from '../main.js';
import { fetchList } from '../content.js';
import { db, collection, addDoc, serverTimestamp } from '../firebase-init.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },

    data: () => ({
        loading: true,
        levels: [],
        levelId: '',
        playerName: '',
        percent: 100,
        hz: '',
        mobile: false,
        link: '',
        note: '',
        submitting: false,
        success: false,
        error: '',
        store,
    }),

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
                    <h2>Record submitted</h2>
                    <p>Your record is now waiting for moderator review.</p>
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
                        <label class="submit-field submit-field-full">
                            <span>Level</span>
                            <select v-model="levelId">
                                <option value="" disabled>Select a level</option>
                                <option
                                    v-for="lvl in levels"
                                    :key="lvl.id"
                                    :value="lvl.id"
                                >
                                    {{ lvl.name }}
                                </option>
                            </select>
                        </label>

                        <label class="submit-field">
                            <span>Player name</span>
                            <input
                                v-model="playerName"
                                type="text"
                                placeholder="Name shown on the list"
                            >
                        </label>

                        <label class="submit-field">
                            <span>Completion</span>
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

                        <label class="submit-field">
                            <span>Hz / Device</span>
                            <input
                                v-model="hz"
                                type="text"
                                placeholder="240, COS, CBF..."
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
                            <span>Video link</span>
                            <input
                                v-model="link"
                                type="text"
                                placeholder="YouTube / Drive / Medal..."
                            >
                        </label>

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
                        <p>Submissions are reviewed manually before appearing on the list.</p>

                        <button
                            class="submit-primary-btn"
                            type="button"
                            :disabled="submitting"
                            @click="submitRecord"
                        >
                            {{ submitting ? 'Submitting...' : 'Submit Record' }}
                        </button>
                    </footer>
                </div>
            </section>
        </main>
    `,

    async mounted() {
        const list = await fetchList();

        this.levels = (list || [])
            .filter(([lvl]) => lvl)
            .map(([lvl]) => ({
                id: lvl.path,
                name: lvl.name,
            }));

        if (store.user) {
            this.playerName =
                store.user.displayName ||
                store.user.username ||
                '';
        }

        this.loading = false;
    },

    methods: {
        resetForm() {
            this.success = false;
            this.levelId = '';
            this.percent = 100;
            this.hz = '';
            this.mobile = false;
            this.link = '';
            this.note = '';
        },

        async submitRecord() {
            this.error = '';

            if (!this.levelId) {
                this.error = 'Vui lòng chọn level.';
                return;
            }

            if (!this.playerName.trim()) {
                this.error = 'Vui lòng nhập tên player.';
                return;
            }

            if (!this.percent || this.percent < 1 || this.percent > 100) {
                this.error = 'Phần trăm không hợp lệ.';
                return;
            }

            this.submitting = true;

            try {
                await addDoc(collection(db, 'submissions'), {
                    levelId: this.levelId,
                    levelName:
                        this.levels.find(l => l.id === this.levelId)?.name ||
                        this.levelId,
                    playerName: this.playerName.trim(),
                    percent: this.percent,
                    hz: this.hz.trim(),
                    mobile: this.mobile,
                    link: this.link.trim(),
                    note: this.note.trim(),
                    status: 'pending',
                    submittedByUid: store.user.uid,
                    submittedByEmail: store.user.email,
                    submittedAt: serverTimestamp(),
                });

                this.success = true;
            } catch (e) {
                this.error =
                    'Gửi thất bại, thử lại sau. (' +
                    (e.message || '') +
                    ')';
            } finally {
                this.submitting = false;
            }
        },
    },
};
