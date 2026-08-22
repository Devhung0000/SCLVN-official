import { store } from "../main.js";
import { embed, getEngineSelect, getSelectSelect, doStuff, getThumbnailImage, incVisits, getYoutubeIdFromUrl, getLevelThumbnail, getVideoThumbnailStyle, listLevelNameFilter, getFpsSelect } from "../util.js";
import { score } from "../score.js";
import { fetchEditors, fetchList, fetchPacks } from "../content.js";

import Spinner from "../components/Spinner.js";
import LevelAuthors from "../components/List/LevelAuthors.js";

const roleIconMap = {
    owner: "crown",
    admin: "user-gear",
    helper: "user-shield",
    dev: "code",
    trial: "user-lock",
};

export default {
    components: { Spinner, LevelAuthors },

    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>

        <main v-else class="page-list">
            <div class="list-container accordion-list-container">
                <article
                    v-for="item in filteredListDisplay"
                    :key="item.originalIndex"
                    class="level-accordion-card"
                    :class="{
                        'is-expanded': selected === item.originalIndex,
                        'has-error': !item.level
                    }"
                >
                    <button
                        class="level-accordion-summary"
                        type="button"
                        :disabled="!item.level"
                        @click="selected = selected === item.originalIndex ? null : item.originalIndex"
                    >
                        <!-- Thumbnail block on the left -->
                        <div
                            class="level-card-thumb"
                            :style="getVideoThumbnailStyle(item.level)"
                        >
                            <span class="level-card-thumb-shade"></span>
                        </div>

                        <!-- Main background/info area -->
                        <div
                            class="level-card-main"
                            :style="getLevelThumbnail(item.originalIndex, list)"
                        >
                            <span class="level-card-main-shade"></span>

                            <div class="level-card-content">
                                <div class="level-card-center">
                                    <div class="level-card-title-row">
                                        <span
                                            class="level-card-rank"
                                            :class="{
                                                'rank-top-1': item.originalIndex === 0,
                                                'rank-top-2': item.originalIndex === 1,
                                                'rank-top-3': item.originalIndex === 2
                                            }"
                                        >
                                            #{{ item.originalIndex + 1 }}
                                        </span>

                                        <h2 class="level-card-title">
                                            {{ item.level?.name || ('Error (' + item.err + '.json)') }}
                                        </h2>
                                    </div>

                                    <p class="level-card-verifier">
                                        Verified by {{ item.level?.verifier || 'Unknown' }}
                                    </p>

                                    <div
                                        v-if="item.level.tags && item.level.tags.length"
                                        class="level-card-tags"
                                    >
                                        <span
                                            v-for="(tag, tagIndex) in item.level.tags"
                                            :key="'tag-' + tagIndex + '-' + tag"
                                            class="level-tag"
                                            :class="tagClass(tag)"
                                        >
                                            {{ tag }}
                                        </span>
                                    </div>
                                </div>

                                <div v-if="item.level" class="level-card-right">
                                    <strong class="level-card-fps">
                                        {{ formatFps(item.level.fps) }}
                                    </strong>

                                    <span class="level-card-method">
                                        {{ item.level.method || 'N/A' }}
                                    </span>

                                    <strong class="level-card-points">
                                        {{ score(item.originalIndex + 1, 100, item.level.percentToQualify) }} pts
                                    </strong>

                                    <span class="level-card-toggle">
                                        {{ selected === item.originalIndex ? 'Show less' : 'Show details' }}
                                        <span :class="{ 'level-card-chevron-open': selected === item.originalIndex }">⌄</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </button>

                    <!-- Expanded content stays under the SAME card -->
                    <div
                        v-if="item.level && selected === item.originalIndex"
                        class="level-accordion-detail"
                    >
                        <div class="level-detail-top">
                            <section class="level-video-card">
                                <iframe
                                    class="level-detail-video"
                                    :src="video"
                                    frameborder="0"
                                    allowfullscreen
                                    scrolling="no"
                                    allow="encrypted-media *; fullscreen *;"
                                ></iframe>

                                <p
                                    v-if="item.level.description"
                                    class="level-detail-description"
                                    v-html="item.level.description"
                                ></p>
                            </section>

                            <aside class="level-info-card">
                                <h3>Level Information</h3>

                                <div class="level-info-row">
                                    <span class="level-info-label">Level ID</span>
                                    <div class="level-id-wrapper">
                                        <strong>{{ item.level.id || 'N/A' }}</strong>
                                        <button
                                            v-if="item.level.id"
                                            class="copy-level-id"
                                            type="button"
                                            @click.stop="copyLevelId(item.level.id)"
                                            title="Copy Level ID"
                                            aria-label="Copy Level ID"
                                        >
                                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                                <rect x="9" y="9" width="11" height="11" rx="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">Creators</span>
                                    <strong>
                                        {{ Array.isArray(item.level.creators)
                                            ? (item.level.creators.join(', ') || item.level.author || 'N/A')
                                            : (item.level.creators || item.level.author || 'N/A') }}
                                    </strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">Verifier</span>
                                    <strong>{{ item.level.verifier || 'N/A' }}</strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">Uploader</span>
                                    <strong>{{ item.level.author || 'N/A' }}</strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">FPS</span>
                                    <strong>{{ item.level.fps || 'N/A' }}</strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">Method</span>
                                    <strong>{{ item.level.method || 'N/A' }}</strong>
                                </div>

                                <div
                                    v-if="item.level.tags && item.level.tags.length"
                                    class="level-info-row"
                                >
                                    <span class="level-info-label">Tags</span>
                                    <strong>{{ item.level.tags.join(', ') }}</strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">Device</span>
                                    <strong>{{ item.level.device || 'N/A' }}</strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">Handcam</span>
                                    <strong>{{ item.level.handcam || 'N/A' }}</strong>
                                </div>
                            </aside>
                        </div>

                        <section class="level-records-card">
                            <div class="records-card-header">
                                <div>
                                    <h3>Records</h3>
                                    <p>
                                        {{ item.level.records?.length || 0 }}
                                        record{{ (item.level.records?.length || 0) === 1 ? '' : 's' }}
                                    </p>
                                </div>

                                <span
                                    v-if="item.originalIndex + 1 <= 75"
                                    class="qualification-badge"
                                >
                                    {{ item.level.percentToQualify }}%+ to qualify
                                </span>

                                <span
                                    v-else-if="item.originalIndex + 1 <= 150"
                                    class="qualification-badge"
                                >
                                    100% to qualify
                                </span>

                                <span v-else class="qualification-badge closed">
                                    Closed
                                </span>
                            </div>

                            <div
                                v-if="item.level.records && item.level.records.length"
                                class="records-list"
                            >
                                <a
                                    v-for="(record, recordIndex) in item.level.records"
                                    :key="record.user + '-' + record.percent + '-' + recordIndex"
                                    :href="record.link || null"
                                    :target="record.link ? '_blank' : null"
                                    :class="['record-row-new', { 'record-row-no-link': !record.link }]"
                                    @click="!record.link && $event.preventDefault()"
                                >
                                    <div class="record-player">
                                        <span class="record-avatar-placeholder">
                                            {{ record.user?.charAt(0)?.toUpperCase() || '?' }}
                                        </span>
                                        <strong>{{ record.user || 'Unknown' }}</strong>
                                    </div>

                                    <div class="record-extra">
                                        <span v-if="record.mobile">Mobile</span>
                                        <span v-if="record.hz">{{ record.hz }}</span>
                                        <strong class="record-percent">{{ record.percent }}%</strong>
                                    </div>
                                </a>
                            </div>

                            <div v-else class="records-empty">
                                No records yet.
                            </div>
                        </section>
                    </div>
                </article>

                <p
                    v-if="list && list.length > 0 && filteredListDisplay.length === 0"
                    class="type-body-lg accordion-empty"
                >
                    No levels found matching your search.
                </p>
            </div>

            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error in errors" :key="error">
                            {{ error }}
                        </p>
                    </div>

                    <div class="og">
                        <p class="type-label-md">
                            The Official Spam Challenge List in Vietnam!
                        </p>
                    </div>

                    <template v-if="editors">
                        <h2>List Moderators</h2>

                        <ol class="editors">
                            <li
                                v-for="editor in editors"
                                :key="editor.name + '-' + editor.role"
                            >
                                <img
                                    :src="'/assets/' + roleIconMap[editor.role] + '-dark.svg'"
                                    :alt="editor.role"
                                >

                                <a
                                    v-if="editor.link"
                                    class="type-label-lg link"
                                    :class="{
                                        'owner-name': editor.role === 'owner',
                                        'dev-name': editor.role === 'dev',
                                        'helper-name': editor.role === 'helper',
                                        'admin-name': editor.role === 'admin'
                                    }"
                                    target="_blank"
                                    :href="editor.link"
                                >
                                    {{ editor.name }}
                                </a>

                                <p v-else>{{ editor.name }}</p>
                            </li>
                        </ol>
                    </template>
                </div>
            </div>

            <transition name="copy-toast-fade">
                <div
                    v-if="copyToast"
                    class="level-copy-toast"
                >
                    {{ copyToast }}
                </div>
            </transition>
        </main>
    `,

    data: () => ({
        list: [],
        editors: [],
        packs: [],
        loading: true,
        selected: null,

        engineAsked: getEngineSelect(),
        fpsAsked: getFpsSelect(),
        engineSelected: "All",
        fpsSelected: "",

        fileFormat: "h",
        searchQuery: "",
        errors: [],

        roleIconMap,
        store,
    }),

    computed: {
        level() {
            if (this.selected == null) return null;
            return this.list?.[this.selected]?.[0] || null;
        },

        originalListWithIndex() {
            return (this.list || []).map(([level, err], index) => ({
                level,
                err,
                originalIndex: index,
            }));
        },

        filteredListDisplay() {
            let filtered = this.originalListWithIndex;

            if (this.searchQuery.trim()) {
                const searchTerm = this.searchQuery.trim().toLowerCase();

                filtered = filtered.filter(item =>
                    item.level?.name?.toLowerCase().includes(searchTerm)
                );
            }

            if (this.engineAsked && this.engineAsked !== "All") {
                const engineFilter = Array.isArray(this.engineAsked)
                    ? this.engineAsked
                    : [this.engineAsked];

                filtered = filtered.filter(item =>
                    (item.level?.password || "")
                        .split("/")
                        .map(s => s.trim())
                        .some(pwd => engineFilter.includes(pwd))
                );
            }

            if (this.fpsAsked && String(this.fpsAsked).trim() !== "") {
                const fpsLower = String(this.fpsAsked).toLowerCase();

                filtered = filtered.filter(item =>
                    (item.level?.password || "")
                        .split("/")
                        .map(s => s.trim().replace(/fps/i, "").toLowerCase())
                        .some(pwd => pwd === fpsLower)
                );
            }

            return filtered;
        },

        video() {
            if (!this.level) return "";

            const source = this.level.showcase || this.level.verification;

            return source ? embed(source) : "";
        },
    },

    watch: {
        "$route.query.q": {
            immediate: true,

            handler(q) {
                this.searchQuery = typeof q === "string" ? q : "";
            },
        },
    },

    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();
        this.packs = await fetchPacks();

        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => `Failed to load level. (${err}.json)`)
            );
        }

        if (!this.editors) {
            this.editors = [];
            this.errors.push("Failed to load list editors.");
        }

        this.loading = false;
    },

    methods: {
        async copyLevelId(id) {
            if (id == null) return;

            try {
                await navigator.clipboard.writeText(String(id));

                this.copyToast = 'ID Copied!';

                if (this.copyToastTimer) {
                    clearTimeout(this.copyToastTimer);
                }

                this.copyToastTimer = setTimeout(() => {
                    this.copyToast = '';
                    this.copyToastTimer = null;
                }, 1600);
            } catch (err) {
                console.error("Failed to copy Level ID:", err);
                this.copyToast = 'Copy failed';
            }
        },

        tagClass(tag) {
            const value = String(tag || "").trim().toLowerCase();

            if (value === "frame perfect") return "level-tag-frame-perfect";
            if (value === "control") return "level-tag-control";
            if (value === "high cps") return "level-tag-high-cps";
            if (value === "capped") return "level-tag-capped";
            if (value === "uncapped") return "level-tag-uncapped";

            return "level-tag-default";
        },

        formatFps(fps) {
            const value = String(fps || "N/A").trim();

            if (value.toUpperCase() === "CBF") {
                return "CBF";
            }

            return `${value} FPS`;
        },

        applyFilters() {
            this.engineAsked = this.engineSelected;
            this.fpsAsked = this.fpsSelected.trim() || null;

            try {
                const parsed = JSON.parse(this.engineAsked);

                if (Array.isArray(parsed)) {
                    this.engineAsked = parsed;
                }
            } catch (_) {
                // Keep original filter value.
            }
        },

        embed,
        score,
        getLevelThumbnail,
        getVideoThumbnailStyle,
        getThumbnailImage,
        listLevelNameFilter,
    },
};
