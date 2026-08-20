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
                <div class="level" v-if="level">
					<div style="display: flex; flex-direction: column; gap: 1rem; width: 100%; justify-self: center;">
                    <div class="button-holder" style="gap: 1em; ">
                        <h1
                            :class="{
                                'level-title-top-1': selected === 0,
                                'level-title-top-2': selected === 1,
                                'level-title-top-3': selected === 2
                            }"
                        >
                            {{ level.name }}
                        </h1>
                    </div>
                    <h1 style="border-bottom: 1px solid #808080;padding-bottom: 8px;"></h1>
					<p class="desc" v-if="level.description" v-html="level.description"></p>
					</div>
                    <LevelAuthors :author="level.author" :creators="level.creators" :verifier="level.verifier" :engine="level.engine"></LevelAuthors>
                    <iframe class="video" id="videoframe" :src="video" frameborder="0" allowfullscreen scrolling="no" allow="encrypted-media *; fullscreen *;" style="border-radius: 1rem;"></iframe>
                    <ul class="stats">
                        <li>
                            <div class="type-title-sm">Points when completed</div>
                            <p>{{ score(selected + 1, 100, level.percentToQualify) }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">ID</div>
                            <p>{{ level.id }}</p>
                        </li>
                        <li>
                            <div class="type-title-sm">FPS</div>
                            <p>{{ level.fps || 'n/a' }}</p>
                        </li>
                        <li v-if="level.method">
                            <div class="type-title-sm">Method</div>
                            <p>{{ level.method }}</p>
                        </li>
                    </ul>
                    <h2>Records ({{ level.records.length }})</h2>
                    <p v-if="selected + 1 <= 75"><strong>{{ level.percentToQualify }}%</strong> or better to qualify</p>
                    <p v-else-if="selected +1 <= 150"><strong>100%</strong> or better to qualify</p>
                    <p v-else>This level does not accept new records.</p>
                    <p v-if="level.handcam"><strong>Handcam is {{ level.handcam }} for this level.</strong></p>
                    <p v-if="level.device"><strong>Device: {{ level.device }}</strong></p>
                    <p v-else>This level does not accept new records.</p>
                    <table class="records">
                        <tr v-for="record in level.records" class="record">
                            <td class="percent">
                                <p>{{ record.percent }}%</p>
                            </td>
                            <td class="user">
                                <a :href="record.link" target="_blank" class="type-label-lg">{{ record.user }}</a>
                            </td>
                            <td class="mobile">
                                <img v-if="record.mobile" src="/assets/phone-landscape-dark.svg" alt="Mobile">
                            </td>
                            <td class="hz">
                                <p>{{ record.hz }}</p>
                            </td>
                        </tr>
                    </table>
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
