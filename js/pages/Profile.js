import { store } from '../main.js';
import {
    db,
    doc,
    updateDoc,
    setDoc,
    deleteDoc,
    collection,
    query,
    where,
    getDocs,
} from '../firebase-init.js';

export default {
    data() {
        return {
            store,
            previewAvatar: '',
            loading: false,
            message: '',
            error: '',

            form: {
                username: '',
                youtube: '',
                facebook: '',
                gdvn: '',
                discord: '',
            },
        };
    },

    template: `
        <main class="page-profile profile-page-v11">
            <section
                v-if="!store.user"
                class="profile-login-card"
            >
                <span class="profile-kicker">ACCOUNT</span>
                <h1>Profile</h1>
                <p>
                    Sign in to edit your SCLVN public profile and leaderboard socials.
                </p>

                <router-link to="/login">
                    Login / Register
                </router-link>
            </section>

            <section
                v-else
                class="profile-shell-v11"
            >
                <header class="profile-page-header">
                    <div>
                        <span class="profile-kicker">SCLVN ACCOUNT</span>
                        <h1>Profile</h1>
                        <p>
                            Manage the identity and social links shown around SCLVN.
                        </p>
                    </div>

                    <div class="profile-account-chip">
                        <img
                            :src="previewAvatar || store.user.avatar || '/assets/the sclvn logo.png'"
                            alt=""
                        >

                        <div>
                            <strong>
                                {{ form.username || store.user.username || 'Player' }}
                            </strong>

                            <span v-if="store.user.role === 'admin'">
                                ADMIN
                            </span>
                            <span v-else>
                                SCLVN MEMBER
                            </span>
                        </div>
                    </div>
                </header>

                <form
                    class="profile-editor-card"
                    @submit.prevent="saveProfile"
                >
                    <aside class="profile-avatar-panel">
                        <div class="profile-avatar-frame">
                            <img
                                :src="previewAvatar || store.user.avatar || '/assets/the sclvn logo.png'"
                                alt="Profile avatar"
                            >
                        </div>

                        <label class="profile-avatar-upload">
                            Change avatar
                            <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                @change="handleFileUpload"
                            >
                        </label>

                        <p>
                            PNG, JPG or WEBP. Maximum 2 MB.
                        </p>

                        <div class="profile-avatar-identity">
                            <span>Signed in as</span>
                            <strong>
                                {{ store.user.email || 'Firebase account' }}
                            </strong>
                        </div>
                    </aside>

                    <div class="profile-form-panel">
                        <section class="profile-form-section">
                            <div class="profile-form-title">
                                <span>#1</span>
                                <div>
                                    <h2>Player Identity</h2>
                                    <p>
                                        Use the same player name that appears on the leaderboard.
                                    </p>
                                </div>
                            </div>

                            <label class="profile-field">
                                <span>Player Name</span>
                                <input
                                    v-model.trim="form.username"
                                    required
                                    type="text"
                                    placeholder="e.g. finaliteration"
                                >
                            </label>
                        </section>

                        <section class="profile-form-section">
                            <div class="profile-form-title">
                                <span>#2</span>
                                <div>
                                    <h2>Social Accounts</h2>
                                    <p>
                                        These links are shown on leaderboard player information.
                                    </p>
                                </div>
                            </div>

                            <div class="profile-form-grid">
                                <label class="profile-field">
                                    <span>YouTube</span>
                                    <input
                                        v-model.trim="form.youtube"
                                        type="url"
                                        placeholder="https://youtube.com/@..."
                                    >
                                </label>

                                <label class="profile-field">
                                    <span>Facebook</span>
                                    <input
                                        v-model.trim="form.facebook"
                                        type="url"
                                        placeholder="https://facebook.com/..."
                                    >
                                </label>

                                <label class="profile-field">
                                    <span>GDVN</span>
                                    <input
                                        v-model.trim="form.gdvn"
                                        type="url"
                                        placeholder="https://www.gdlisthub.dev/..."
                                    >
                                </label>

                                <label class="profile-field">
                                    <span>Discord ID / Username</span>
                                    <input
                                        v-model.trim="form.discord"
                                        type="text"
                                        placeholder="Discord account"
                                    >
                                </label>
                            </div>
                        </section>

                        <div
                            v-if="error"
                            class="profile-message is-error"
                        >
                            {{ error }}
                        </div>

                        <div
                            v-if="message"
                            class="profile-message is-success"
                        >
                            {{ message }}
                        </div>

                        <footer class="profile-form-actions">
                            <p>
                                Profile changes are synchronized with the public leaderboard profile.
                            </p>

                            <button
                                type="submit"
                                :disabled="loading"
                            >
                                {{ loading ? 'Saving...' : 'Save Changes' }}
                            </button>
                        </footer>
                    </div>
                </form>
            </section>
        </main>
    `,

    async mounted() {
        if (this.store.user) {
            await this.loadInitialData();
        }
    },

    watch: {
        'store.user': {
            immediate: true,

            async handler(newVal) {
                if (newVal) {
                    await this.loadInitialData();
                }
            },
        },
    },

    methods: {
        async loadInitialData() {
            this.form.username =
                this.store.user.username ||
                '';

            this.previewAvatar =
                this.store.user.avatar ||
                '';

            try {
                const res = await fetch('/data/_players.json');
                const players = await res.json();

                const matchedPlayer = players.find(
                    player =>
                        String(player.name || '').toLowerCase() ===
                        this.form.username.toLowerCase()
                );

                if (matchedPlayer) {
                    this.form.youtube =
                        matchedPlayer.youtube ||
                        '';

                    this.form.facebook =
                        matchedPlayer.facebook ||
                        '';

                    this.form.gdvn =
                        matchedPlayer.gdvn ||
                        '';

                    this.form.discord =
                        matchedPlayer.discord ||
                        '';
                }
            } catch (error) {
                console.warn(
                    'Could not load _players.json',
                    error
                );
            }

            if (this.store.user.socials) {
                this.form.youtube =
                    this.store.user.socials.youtube ||
                    this.form.youtube;

                this.form.facebook =
                    this.store.user.socials.facebook ||
                    this.form.facebook;

                this.form.gdvn =
                    this.store.user.socials.gdvn ||
                    this.form.gdvn;

                this.form.discord =
                    this.store.user.socials.discord ||
                    this.form.discord;
            }
        },

        handleFileUpload(event) {
            const [file] = event.target.files || [];

            if (!file) {
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                this.error =
                    'Avatar must be smaller than 2 MB.';
                event.target.value = '';
                return;
            }

            if (!file.type.startsWith('image/')) {
                this.error =
                    'Please choose an image file.';
                event.target.value = '';
                return;
            }

            const reader = new FileReader();

            reader.onload = evt => {
                this.previewAvatar =
                    evt.target.result;

                this.error = '';
            };

            reader.readAsDataURL(file);
            event.target.value = '';
        },

        async saveProfile() {
            if (!this.store.user) {
                return;
            }

            this.loading = true;
            this.error = '';
            this.message = '';

            try {
                const newUsername =
                    this.form.username.trim();

                if (!newUsername) {
                    throw new Error(
                        'Player Name cannot be empty.'
                    );
                }

                const newLower =
                    newUsername.toLowerCase();

                const oldLower = (
                    this.store.user.username_lowercase ||
                    this.store.user.username ||
                    ''
                ).trim().toLowerCase();

                const isRenaming =
                    newLower !== oldLower;

                if (isRenaming) {
                    const usersRef =
                        collection(db, 'users');

                    const q = query(
                        usersRef,
                        where(
                            'username_lowercase',
                            '==',
                            newLower
                        )
                    );

                    const querySnap =
                        await getDocs(q);

                    const takenByOther =
                        querySnap.docs.some(
                            d =>
                                d.id !==
                                this.store.user.uid
                        );

                    if (takenByOther) {
                        throw new Error(
                            'That player name is already in use.'
                        );
                    }
                }

                const updatedData = {
                    username: newUsername,
                    username_lowercase:
                        newLower,

                    avatar:
                        this.previewAvatar,

                    socials: {
                        youtube:
                            this.form.youtube.trim(),

                        facebook:
                            this.form.facebook.trim(),

                        gdvn:
                            this.form.gdvn.trim(),

                        discord:
                            this.form.discord.trim(),
                    },
                };

                await updateDoc(
                    doc(
                        db,
                        'users',
                        this.store.user.uid
                    ),
                    updatedData
                );

                await setDoc(
                    doc(
                        db,
                        'players',
                        updatedData.username_lowercase
                    ),
                    {
                        name:
                            updatedData.username,

                        youtube:
                            updatedData.socials.youtube,

                        facebook:
                            updatedData.socials.facebook,

                        gdvn:
                            updatedData.socials.gdvn,

                        discord:
                            updatedData.socials.discord,

                        avatarUrl:
                            updatedData.avatar,

                        claimedBy:
                            this.store.user.uid,
                    },
                    {
                        merge: true,
                    }
                );

                if (isRenaming && oldLower) {
                    try {
                        const oldPlayerSnap =
                            await getDocs(
                                query(
                                    collection(
                                        db,
                                        'players'
                                    ),
                                    where(
                                        '__name__',
                                        '==',
                                        oldLower
                                    )
                                )
                            );

                        const oldDoc =
                            oldPlayerSnap.docs[0];

                        if (
                            oldDoc &&
                            oldDoc.data().claimedBy ===
                                this.store.user.uid
                        ) {
                            await deleteDoc(
                                doc(
                                    db,
                                    'players',
                                    oldLower
                                )
                            );
                        }
                    } catch (cleanupError) {
                        console.warn(
                            'Could not remove old player profile',
                            cleanupError
                        );
                    }
                }

                this.store.user.username =
                    updatedData.username;

                this.store.user.username_lowercase =
                    updatedData.username_lowercase;

                this.store.user.avatar =
                    updatedData.avatar;

                this.store.user.socials =
                    updatedData.socials;

                this.message =
                    'Profile updated successfully.';
            } catch (error) {
                console.error(error);

                this.error =
                    error?.message ||
                    'Could not update profile.';
            } finally {
                this.loading = false;
            }
        },
    },
};
