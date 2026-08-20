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
            <div class="list-container">
                <table class="list" v-if="list && list.length">
                    <tr v-for="(item, i) in filteredListDisplay" :key="item.originalIndex">
                                <td class="rank">
                                    <p
                                        v-if="item.originalIndex + 1 <= 900"
                                        class="type-label-lg"
                                        :class="{
                                            'rank-top-1': item.originalIndex === 0,
                                            'rank-top-2': item.originalIndex === 1,
                                            'rank-top-3': item.originalIndex === 2
                                        }"
                                    >
                                        #{{ item.originalIndex + 1 }}
                                    </p>

                                    <p v-else class="type-label-lg">Legacy</p>
                                </td>
                                <td class="level" :class="{ 'active': selected === item.originalIndex, 'error': !item.level }">
                                    <button id="levelThumbnailReal" @click="selected = item.originalIndex" style="background-color: rgb(255 0 0 / 0); width: 90%; margin: 0.5em;" :style="getLevelThumbnail(item.originalIndex, list)" :class="{ 'active': selected === item.originalIndex, 'error': !item.level }">
                                        <span class="type-label-lg
                                        ">{{ item.level?.name || \`Error (\${item.err}.json)\` }}</span>
                                        <span class="type-label-sm">Verified by {{ item.level.verifier }}</span>
                                    </button>
                                </td>
                    </tr>
                </table>
                <p v-if="list && list.length > 0 && filteredListDisplay && filteredListDisplay.length === 0" class="type-body-lg">
					<br>
                    No levels found matching your search.
                </p>
            </div>
            <div class="level-container">
                <div class="level level-detail" v-if="level">
                    <section class="level-detail-hero" :style="getLevelThumbnail(selected, list)">
                        <div class="level-detail-hero-overlay"></div>

                        <div class="level-detail-hero-content">
                            <div class="level-detail-hero-left">
                                <div class="level-detail-title-row">
                                    <span class="level-detail-rank">#{{ selected + 1 }}</span>
                                    <h1
                                        class="level-detail-title"
                                        :class="{
                                            'level-title-top-1': selected === 0,
                                            'level-title-top-2': selected === 1,
                                            'level-title-top-3': selected === 2
                                        }"
                                    >
                                        {{ level.name }}
                                    </h1>
                                </div>

                                <p class="level-detail-verifier">
                                    Verified by <strong>{{ level.verifier || 'Unknown' }}</strong>
                                </p>

                                <div class="level-detail-tags">
                                    <span v-if="level.handcam" class="level-tag">
                                        Handcam: {{ level.handcam }}
                                    </span>
                                    <span v-if="level.device" class="level-tag">
                                        {{ level.device }}
                                    </span>
                                </div>
                            </div>

                            <div class="level-detail-hero-right">
                                <div class="hero-stat">
                                    <span>FPS</span>
                                    <strong>{{ level.fps || 'N/A' }}</strong>
                                </div>

                                <div class="hero-stat">
                                    <span>Method</span>
                                    <strong>{{ level.method || 'N/A' }}</strong>
                                </div>

                                <div class="hero-points">
                                    {{ score(selected + 1, 100, level.percentToQualify) }} pts
                                </div>

                                <button class="level-collapse-btn" @click="detailsOpen = !detailsOpen">
                                    {{ detailsOpen ? 'Show less' : 'Show more' }}
                                    <span :class="{ 'rotate-chevron': !detailsOpen }">⌄</span>
                                </button>
                            </div>
                        </div>
                    </section>

                    <div v-show="detailsOpen" class="level-detail-content">
                        <div class="level-main-row">
                            <section class="level-video-card">
                                <iframe
                                    class="level-detail-video"
                                    id="videoframe"
                                    :src="video"
                                    frameborder="0"
                                    allowfullscreen
                                    scrolling="no"
                                    allow="encrypted-media *; fullscreen *;"
                                ></iframe>

                                <p
                                    v-if="level.description"
                                    class="level-detail-description"
                                    v-html="level.description"
                                ></p>
                            </section>

                            <aside class="level-info-card">
                                <h2>Level Information</h2>

                                <div class="level-info-row">
                                    <span class="level-info-label">Level ID</span>
                                    <div class="level-id-wrapper">
                                        <strong>{{ level.id || 'N/A' }}</strong>
                                        <button
                                            v-if="level.id"
                                            class="copy-level-id"
                                            @click="copyLevelId(level.id)"
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
                                        {{ Array.isArray(level.creators) ? (level.creators.join(', ') || level.author || 'N/A') : (level.creators || level.author || 'N/A') }}
                                    </strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">Verifier</span>
                                    <strong>{{ level.verifier || 'N/A' }}</strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">Uploader</span>
                                    <strong>{{ level.author || 'N/A' }}</strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">FPS</span>
                                    <strong>{{ level.fps || 'N/A' }}</strong>
                                </div>

                                <div class="level-info-row">
                                    <span class="level-info-label">Method</span>
                                    <strong>{{ level.method || 'N/A' }}</strong>
                                </div>
                            </aside>
                        </div>

                        <section class="level-records-card">
                            <div class="records-card-header">
                                <div>
                                    <h2>Records</h2>
                                    <p>
                                        {{ level.records?.length || 0 }}
                                        record{{ (level.records?.length || 0) === 1 ? '' : 's' }}
                                    </p>
                                </div>

                                <span v-if="selected + 1 <= 75" class="qualification-badge">
                                    {{ level.percentToQualify }}%+ to qualify
                                </span>
                                <span v-else-if="selected + 1 <= 150" class="qualification-badge">
                                    100% to qualify
                                </span>
                                <span v-else class="qualification-badge closed">
                                    Closed
                                </span>
                            </div>

                            <div v-if="level.records && level.records.length" class="records-list">
                                <a
                                    v-for="(record, recordIndex) in level.records"
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
            </div>
            <div class="meta-container">
                <div class="meta">
                    <div class="errors" v-show="errors.length > 0">
                        <p class="error" v-for="error of errors">{{ error }}</p>
                    </div>
                    <div class="og">
                        <p class="type-label-md">Website layout and UI made by <a href="https://therakelist.pages.dev/" style="text-decoration: underline;" target="_blank">SCL[gwa]</a>. <br> The Official Spam Challenge List in Vietnam!</p>
                    </div>
                    <template v-if="editors">
                        <h2>List Moderators</h2>
                        <ol class="editors">
                            <li v-for="editor in editors">
                                <img :src="\`/assets/\${roleIconMap[editor.role]}-dark.svg\`" :alt="editor.role">
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
        loading: true,
        selected: null,
        detailsOpen: true,
        engineAsked: getEngineSelect(),
        fpsAsked: getFpsSelect(),
        engineSelected: "All",
        fpsSelected: "",
        grat: "../assets/levels/",
        fileFormat: "h",
        sdhfkjsdbhfkjs: "assets/levels/B R A I N S P A C E.png",
        levelSearch: null,
        searchQuery: '',
        ii: 0,
        blt: 0,
        errors: [],
        roleIconMap,
        store,
    }),
    computed: {
        getDemonDifficulty() {
            if (this.selected == null) {
                return 0;
            } else {
                if (this.list[this.selected][0].demonDifficulty == "Iraq Demon") {
                    this.fileFormat = '.svg';
                } else {
                    this.fileFormat = '.png';
                }
                if (this.list[this.selected][0].demonDifficulty == "PETA Demon") {
                    return "https://www.peta.org/wp-content/themes/peta/src/assets/images/svgs/peta-logo.svg";
                } else if (this.list[this.selected][0].demonDifficulty == "Poopy Demon") {
                    return "https://raw.githubusercontent.com/twitter/twemoji/a6f943b958d94b2b82f886aa540b915d9a694a75/assets/svg/1f4a9.svg";
                } else if (this.list[this.selected][0].demonDifficulty == "love Demon") {
                    return "https://upload.wikimedia.org/wikipedia/commons/c/c8/Twemoji15.0.2_1fa77.svg";
                } else if (this.list[this.selected][0].demonDifficulty == "Top 14 Very Hard Timing Map Very Demon") {
                    return "https://media.tenor.com/ejuK2N9toPMAAAAe/gd-geometry-dash.png";
                } else if (this.list[this.selected][0].name == "Lucid Dreaming") {
                    return "https://upload.wikimedia.org/wikipedia/commons/7/72/Twemoji_1f634.svg";
                }
                return encodeURI(`assets/difficulties/${this.list[this.selected][0].demonDifficulty}${this.fileFormat}`);
            }
        },
        level() {
            if (this.selected == null) {
                return 0;
            } else {
                return this.list[this.selected][0];
            }
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
                const searchTerm = this.searchQuery.toLowerCase();
                filtered = filtered.filter(item => 
                    item.level?.name?.toLowerCase().includes(searchTerm)
                );
            }
            if (this.engineAsked && this.engineAsked !== "All") {
                const engineFilter = Array.isArray(this.engineAsked) ? this.engineAsked : [this.engineAsked];
                filtered = filtered.filter(item =>
                    (item.level?.password || '')
                        .split('/')
                        .map(s => s.trim())
                        .some(pwd => engineFilter.includes(pwd))
                );
            }
            if (this.fpsAsked && this.fpsAsked.trim() !== "") {
                const fpsLower = this.fpsAsked.toLowerCase();
                filtered = filtered.filter(item =>
                    (item.level?.password || '')
                        .split('/')
                        .map(s => s.trim().replace(/fps/i, '').toLowerCase())
                        .some(pwd => pwd === fpsLower)
                );
            }

            return filtered;
        },
        originalPacksWithIndex() {
            console.error(this.packs);
            return this.packs;
        },
        video() {
            if (!this.level.showcase) {
                return embed(this.level.verification);
            }

            return embed(
                this.toggledShowcase
                    ? this.level.showcase
                    : this.level.verification
            );
        },
    },
    watch: {
        selected() {
            this.detailsOpen = true;
        },
        '$route.query.q': {
            immediate: true,
            handler(q) {
                this.searchQuery = typeof q === 'string' ? q : '';
            },
        },
        filteredListDisplay: {
            handler(newList) {
                if (newList.length > 0) {
                    const currentSelectionInNewList = newList.find(item => item.originalIndex === this.selected);
                    if (!currentSelectionInNewList) {
                        this.selected = newList[0].originalIndex;
                    }
                } else {
                    this.selected = null;
                }
            },
        },
    },
    async mounted() {
        this.list = await fetchList();
        this.editors = await fetchEditors();
        this.packs = await fetchPacks();
        this.selected = await getSelectSelect(this.list);

        if (!this.list) {
            this.errors = [
                "Failed to load list. Retry in a few minutes or notify list staff.",
            ];
        } else {
            this.errors.push(
                ...this.list
                    .filter(([_, err]) => err)
                    .map(([_, err]) => {
                        return `Failed to load level. (${err}.json)`;
                    })
            );
            if (!this.editors) {
                this.errors.push("Failed to load list editors.");
            }
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
                if (Array.isArray(parsed)) this.engineAsked = parsed;
            } catch (e) {
            }
        },
        embed,
        score,
        getLevelThumbnail,
        getThumbnailImage,
        listLevelNameFilter,
    },
};
