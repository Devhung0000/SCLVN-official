import { fetchList } from '../content.js';
import {
    getThumbnailFromId,
    getYoutubeIdFromUrl,
    shuffle,
    getLevelThumbnailR,
} from '../util.js';

import Spinner from '../components/Spinner.js';
import Btn from '../components/Btn.js';

export default {
    components: { Spinner, Btn },

    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>

        <main v-else class="page-roulette">
            <div class="roulette-layout">
                <aside class="roulette-panel">
                    <div class="roulette-heading">
                        <span class="roulette-kicker">SCLVN</span>
                        <h1>Roulette</h1>
                        <p>
                            Roll through random list levels and push your percentage
                            higher each round.
                        </p>
                    </div>

                    <section class="roulette-section">
                        <div class="roulette-section-title">
                            <span>Level pool</span>
                            <small>Choose what can appear</small>
                        </div>

                        <label class="roulette-toggle">
                            <input type="checkbox" id="main" value="Main List" v-model="useMainList">
                            <span class="roulette-toggle-ui"></span>
                            <span>
                                <strong>Main List</strong>
                                <small>#1 — #75</small>
                            </span>
                        </label>

                        <label class="roulette-toggle">
                            <input type="checkbox" id="extended" value="Extended List" v-model="useExtendedList">
                            <span class="roulette-toggle-ui"></span>
                            <span>
                                <strong>Extended List</strong>
                                <small>#76 — #150</small>
                            </span>
                        </label>

                        <Btn class="roulette-primary" @click.native.prevent="onStart">
                            {{ levels.length === 0 ? 'Start Roulette' : 'Restart Roulette' }}
                        </Btn>
                    </section>

                    <section class="roulette-section roulette-save">
                        <div class="roulette-section-title">
                            <span>Progress</span>
                            <small>Saved automatically</small>
                        </div>

                        <div class="roulette-mini-stats">
                            <div>
                                <strong>{{ progression.length }}</strong>
                                <span>Rounds</span>
                            </div>
                            <div>
                                <strong>{{ currentPercentage }}%</strong>
                                <span>Best</span>
                            </div>
                        </div>

                        <div class="roulette-save-actions">
                            <Btn @click.native.prevent="onImport">Import</Btn>
                            <Btn :disabled="!isActive" @click.native.prevent="onExport">Export</Btn>
                        </div>
                    </section>

                    <p class="roulette-credit">
                        Based on the Extreme Demon Roulette by
                        <a href="https://matcool.github.io/extreme-demon-roulette/" target="_blank">
                            matcool
                        </a>.
                    </p>
                </aside>

                <section class="roulette-content">
                    <div v-if="levels.length === 0" class="roulette-empty">
                        <div class="roulette-empty-icon">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M4 7h16v12H4z"></path>
                                <path d="M7 10h10v5H7z"></path>
                                <path d="M8 12h.01M12 12h.01M16 12h.01"></path>
                                <path d="M18 7V4h2"></path>
                            </svg>
                        </div>
                        <h2>Ready to roll?</h2>
                        <p>Pick your level pool on the left, then start a roulette.</p>
                    </div>

                    <template v-else>
                        <div class="roulette-progress-head">
                            <div>
                                <span class="roulette-kicker">Current run</span>
                                <h2>{{ hasCompleted ? 'Roulette complete' : 'Keep climbing' }}</h2>
                            </div>

                            <div class="roulette-progress-badge">
                                {{ currentPercentage }}%
                            </div>
                        </div>

                        <div class="roulette-level-list">
                            <article
                                v-for="(level, i) in levels.slice(0, progression.length)"
                                :key="'completed-' + level.rank + '-' + i"
                                class="roulette-level-card is-completed"
                            >
                                <a :href="level.video" target="_blank" class="roulette-thumb">
                                    <img
                                        :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))"
                                        :alt="level.name"
                                    >
                                </a>

                                <div
                                    class="roulette-level-meta"
                                    :style="getLevelThumbnailR(i, levels)"
                                >
                                    <span class="roulette-level-shade"></span>

                                    <div class="roulette-level-copy">
                                        <span class="roulette-rank">#{{ level.rank }}</span>
                                        <h3>{{ level.name }}</h3>
                                        <span class="roulette-percent is-done">
                                            {{ progression[i] }}%
                                        </span>
                                    </div>
                                </div>
                            </article>

                            <article v-if="!hasCompleted && currentLevel" class="roulette-level-card is-current">
                                <a :href="currentLevel.video" target="_blank" class="roulette-thumb">
                                    <img
                                        :src="getThumbnailFromId(getYoutubeIdFromUrl(currentLevel.video))"
                                        :alt="currentLevel.name"
                                    >
                                    <span class="roulette-play">
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="m9 7 8 5-8 5V7Z"></path>
                                        </svg>
                                    </span>
                                </a>

                                <div
                                    class="roulette-level-meta"
                                    :style="getLevelThumbnailR(progression.length, levels)"
                                >
                                    <span class="roulette-level-shade"></span>

                                    <div class="roulette-current-copy">
                                        <div>
                                            <span class="roulette-rank">#{{ currentLevel.rank }}</span>
                                            <h2>{{ currentLevel.name }}</h2>
                                            <p>
                                                Reach at least
                                                <strong>{{ currentPercentage + 1 }}%</strong>
                                                to continue.
                                            </p>
                                        </div>

                                        <div class="roulette-link-row">
                                            <a v-if="currentLevel.scratchLink != null" :href="currentLevel.scratchLink" target="_blank" class="roulette-link-chip">Scratch</a>
                                            <a v-if="currentLevel.turbowarpLink != null" :href="currentLevel.turbowarpLink" target="_blank" class="roulette-link-chip">TurboWarp</a>
                                            <a v-if="currentLevel.itchLink != null" :href="currentLevel.itchLink" target="_blank" class="roulette-link-chip">itch.io</a>
                                            <a v-if="currentLevel.itchLink2 != null" :href="currentLevel.itchLink2" target="_blank" class="roulette-link-chip">LDM</a>
                                        </div>
                                    </div>
                                </div>

                                <form v-if="!givenUp" class="roulette-actions">
                                    <div class="roulette-percent-input">
                                        <span>%</span>
                                        <input
                                            type="number"
                                            v-model="percentage"
                                            :placeholder="placeholder"
                                            :min="currentPercentage + 1"
                                            max="100"
                                        >
                                    </div>

                                    <Btn @click.native.prevent="onDone">Done</Btn>
                                    <Btn class="roulette-give-up" @click.native.prevent="onGiveUp">Give Up</Btn>
                                </form>
                            </article>
                        </div>

                        <section v-if="givenUp || hasCompleted" class="roulette-results">
                            <div>
                                <span class="roulette-kicker">Results</span>
                                <h2>{{ hasCompleted ? 'Completed!' : 'Run ended' }}</h2>
                            </div>

                            <div class="roulette-result-grid">
                                <div>
                                    <strong>{{ progression.length }}</strong>
                                    <span>Levels cleared</span>
                                </div>
                                <div>
                                    <strong>{{ currentPercentage }}%</strong>
                                    <span>Highest percent</span>
                                </div>
                            </div>

                            <Btn
                                v-if="currentPercentage < 99 && !hasCompleted"
                                @click.native.prevent="showRemaining = true"
                            >
                                Show remaining levels
                            </Btn>
                        </section>

                        <section v-if="givenUp && showRemaining" class="roulette-remaining">
                            <div class="roulette-section-title">
                                <span>Remaining levels</span>
                                <small>What would have come next</small>
                            </div>

                            <article
                                v-for="(level, i) in levels.slice(
                                    progression.length + 1,
                                    levels.length - currentPercentage + progression.length
                                )"
                                :key="'remaining-' + level.rank + '-' + i"
                                class="roulette-level-card is-remaining"
                            >
                                <a :href="level.video" target="_blank" class="roulette-thumb">
                                    <img
                                        :src="getThumbnailFromId(getYoutubeIdFromUrl(level.video))"
                                        :alt="level.name"
                                    >
                                </a>

                                <div
                                    class="roulette-level-meta"
                                    :style="getLevelThumbnailR(currentPercentage + 1 + i, levels)"
                                >
                                    <span class="roulette-level-shade"></span>

                                    <div class="roulette-level-copy">
                                        <span class="roulette-rank">#{{ level.rank }}</span>
                                        <h3>{{ level.name }}</h3>
                                        <span class="roulette-percent is-missed">
                                            {{ currentPercentage + 2 + i }}%
                                        </span>
                                    </div>
                                </div>
                            </article>
                        </section>
                    </template>
                </section>

                <div class="roulette-toasts">
                    <div
                        v-for="(toast, i) in toasts"
                        :key="toast + '-' + i"
                        class="roulette-toast"
                    >
                        {{ toast }}
                    </div>
                </div>
            </div>
        </main>
    `,

    data: () => ({
        loading: false,
        levels: [],
        progression: [],
        percentage: undefined,
        givenUp: false,
        showRemaining: false,
        useMainList: true,
        useExtendedList: true,
        toasts: [],
        fileInput: undefined,
    }),

    mounted() {
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.multiple = false;
        this.fileInput.accept = '.json';
        this.fileInput.addEventListener('change', this.onImportUpload);

        const roulette = JSON.parse(localStorage.getItem('roulette'));

        if (!roulette) return;

        this.levels = roulette.levels || [];
        this.progression = roulette.progression || [];
    },

    computed: {
        currentLevel() {
            return this.levels[this.progression.length] || null;
        },

        currentPercentage() {
            return this.progression[this.progression.length - 1] || 0;
        },

        placeholder() {
            return `At least ${this.currentPercentage + 1}%`;
        },

        hasCompleted() {
            return (
                this.progression[this.progression.length - 1] >= 100 ||
                (
                    this.levels.length > 0 &&
                    this.progression.length === this.levels.length
                )
            );
        },

        isActive() {
            return (
                this.progression.length > 0 &&
                !this.givenUp &&
                !this.hasCompleted
            );
        },
    },

    methods: {
        getLevelThumbnailR,
        shuffle,
        getThumbnailFromId,
        getYoutubeIdFromUrl,

        async onStart() {
            if (this.isActive) {
                this.showToast('Give up before starting a new roulette.');
                return;
            }

            if (!this.useMainList && !this.useExtendedList) {
                this.showToast('Choose at least one level pool.');
                return;
            }

            this.loading = true;

            const fullList = await fetchList();

            if (!fullList) {
                this.loading = false;
                this.showToast('Could not load the list.');
                return;
            }

            if (fullList.filter(([_, err]) => err).length > 0) {
                this.loading = false;
                this.showToast(
                    'List is currently broken. Wait until it is fixed to start a roulette.',
                );
                return;
            }

            const fullListMapped = fullList.map(([lvl, _], i) => ({
                rank: i + 1,
                id: lvl.id,
                name: lvl.name,
                video: lvl.verification,
                scratchLink: lvl.scratchLink,
                turbowarpLink: lvl.turbowarpLink,
                itchLink: lvl.itchLink,
                itchLink2: lvl.itchLink2,
            }));

            const list = [];

            if (this.useMainList) list.push(...fullListMapped.slice(0, 75));
            if (this.useExtendedList) list.push(...fullListMapped.slice(75, 150));

            this.levels = shuffle(list).slice(0, 100);
            this.showRemaining = false;
            this.givenUp = false;
            this.progression = [];
            this.percentage = undefined;

            this.save();
            this.loading = false;
        },

        save() {
            localStorage.setItem(
                'roulette',
                JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                }),
            );
        },

        onDone() {
            const value = Number(this.percentage);

            if (!Number.isFinite(value)) return;

            if (value <= this.currentPercentage || value > 100) {
                this.showToast('Invalid percentage.');
                return;
            }

            this.progression.push(value);
            this.percentage = undefined;
            this.save();
        },

        onGiveUp() {
            this.givenUp = true;
            localStorage.removeItem('roulette');
        },

        onImport() {
            if (
                this.isActive &&
                !window.confirm('This will overwrite the currently running roulette. Continue?')
            ) {
                return;
            }

            this.fileInput.showPicker();
        },

        async onImportUpload() {
            if (this.fileInput.files.length === 0) return;

            const file = this.fileInput.files[0];

            try {
                const roulette = JSON.parse(await file.text());

                if (!roulette.levels || !roulette.progression) {
                    this.showToast('Invalid file.');
                    return;
                }

                this.levels = roulette.levels;
                this.progression = roulette.progression;
                this.save();
                this.givenUp = false;
                this.showRemaining = false;
                this.percentage = undefined;
            } catch {
                this.showToast('Invalid file.');
            }
        },

        onExport() {
            const file = new Blob(
                [JSON.stringify({
                    levels: this.levels,
                    progression: this.progression,
                })],
                { type: 'application/json' },
            );

            const a = document.createElement('a');
            a.href = URL.createObjectURL(file);
            a.download = 'sgdl_roulette';
            a.click();
            URL.revokeObjectURL(a.href);
        },

        showToast(msg) {
            this.toasts.push(msg);

            setTimeout(() => {
                this.toasts.shift();
            }, 3000);
        },
    },
};
