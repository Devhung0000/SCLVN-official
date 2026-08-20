import { store } from "../main.js";
import { embed, getEngineSelect, getSelectSelect, doStuff, getThumbnailImage, incVisits, getYoutubeIdFromUrl, getLevelThumbnail, listLevelNameFilter, getFpsSelect } from "../util.js";
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
            <!-- LEFT/CENTER: inline accordion list -->
            <div class="list-container accordion-list-container">
                <div
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
                        :style="getLevelThumbnail(item.originalIndex, list)"
                        @click="selected = selected === item.originalIndex ? null : item.originalIndex"
                    >
                        <span class="level-accordion-overlay"></span>

                        <div class="level-accordion-summary-left">
                            <div class="level-accordion-title-row">
                                <span
                                    class="level-accordion-rank"
                                    :class="{
                                        'rank-top-1': item.originalIndex === 0,
                                        'rank-top-2': item.originalIndex === 1,
                                        'rank-top-3': item.originalIndex === 2
                                    }"
                                >
                                    #{{ item.originalIndex + 1 }}
                                </span>

                                <h2 class="level-accordion-title">
                                    {{ item.level?.name || ('Error (' + item.err + '.json)') }}
                                </h2>
                            </div>

                            <p class="level-accordion-verifier">
                                Verified by {{ item.level?.verifier || 'Unknown' }}
                            </p>

                            <div v-if="item.level" class="level-accordion-tags">
                                <span v-if="item.level.handcam" class="level-tag">
                                    Handcam: {{ item.level.handcam }}
                                </span>

                                <span v-if="item.level.device" class="level-tag">
                                    {{ item.level.device }}
                                </span>
                            </div>
                        </div>

                        <div v-if="item.level" class="level-accordion-summary-right">
                            <div class="accordion-stat">
                                <strong>{{ item.level.fps || 'N/A' }}</strong>
                                <span>FPS</span>
                            </div>

                            <div class="accordion-stat">
                                <strong>{{ item.level.method || 'N/A' }}</strong>
                                <span>Method</span>
                            </div>

                            <div class="accordion-points">
                                {{ score(item.originalIndex + 1, 100, item.level.percentToQualify) }} pts
                            </div>

                            <div class="accordion-toggle-label">
                                {{ selected === item.originalIndex ? 'Show less' : 'Show details' }}
                                <span :class="{ 'accordion-chevron-open': selected === item.originalIndex }">⌄</span>
                            </div>
                        </div>
                    </button>

                    <div
                        v-if="item.level && selected === item.originalIndex"
                        class="level-accordion-detail"
                    >
                        <div class="level-main-row">
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

                                <span
                                    v-else
                                    class="qualification-badge closed"
                                >
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
                </div>

                <p
                    v-if="list && list.length > 0 && filteredListDisplay.length === 0"
                    class="type-body-lg accordion-empty"
                >
                    No levels found matching your search.
                </p>
            </div>

            <!-- RIGHT: fixed moderators -->
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error in errors" :key="error">
                            {{ error }}
                        </p>
                    </div>

                    <div class="og">
                        <p class="type-label-md">
                            Website layout and UI made by
                            <a
                                href="https://therakelist.pages.dev/"
                                style="text-decoration: underline;"
                                target="_blank"
                            >
                                SCL[gwa]
                            </a>.
                            <br>
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
            } catch (err) {
                console.error("Failed to copy Level ID:", err);
            }
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
        getThumbnailImage,
        listLevelNameFilter,
    },
};
