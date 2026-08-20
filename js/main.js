import routes from './routes.js';
import "./ripple.js";
import {
    auth,
    db,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from './firebase-init.js';

export const store = Vue.reactive({
    user: null,
    authLoading: true,

    // Modal state
    showAuthModal: false,
    showProfileModal: false,
    isLoginMode: true,

    // Form inputs
    authEmail: '',
    authPassword: '',
    authUsername: '',
    editUsername: '',
    editAvatar: '',
    editSocial: '',

    toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;
    },

    openProfileModal() {
        if (this.user) {
            this.editUsername = this.user.username || '';
            this.editAvatar = this.user.avatar || '';
            this.editSocial = this.user.socialLink || '';
            this.showProfileModal = true;
        }
    },

    async handleAuth() {
        try {
            if (this.isLoginMode) {
                await signInWithEmailAndPassword(auth, this.authEmail, this.authPassword);
                alert('Đăng nhập thành công!');
            } else {
                if (!this.authUsername.trim()) {
                    alert('Vui lòng nhập tên Player!');
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, this.authEmail, this.authPassword);
                const uid = userCredential.user.uid;

                await setDoc(doc(db, 'users', uid), {
                    username: this.authUsername.trim(),
                    username_lowercase: this.authUsername.trim().toLowerCase(),
                    email: this.authEmail,
                    avatar: '',
                    socialLink: '',
                    role: 'player',
                    createdAt: new Date().toISOString()
                });
                alert('Đăng ký tài khoản thành công!');
            }
            this.showAuthModal = false;
            this.authEmail = '';
            this.authPassword = '';
            this.authUsername = '';
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    },

    async handleUpdateProfile() {
        if (!this.user) return;
        try {
            const username = this.editUsername.trim();
            const avatar = this.editAvatar.trim();
            const socialLink = this.editSocial.trim();

            await updateDoc(doc(db, 'users', this.user.uid), {
                username,
                username_lowercase: username.toLowerCase(),
                avatar,
                socialLink
            });

            this.user.username = username;
            this.user.avatar = avatar;
            this.user.socialLink = socialLink;

            alert('Cập nhật Profile thành công!');
            this.showProfileModal = false;
        } catch (err) {
            alert('Lỗi khi cập nhật profile: ' + err.message);
        }
    },

    async handleLogout() {
        if (confirm("Are you sure you want to log out?")) {
            await signOut(auth);
            alert("Đã đăng xuất!");
        }
    }
});

// Lắng nghe trạng thái đăng nhập Firebase
onAuthStateChanged(auth, async (fbUser) => {
    if (fbUser) {
        try {
            const snap = await getDoc(doc(db, 'users', fbUser.uid));
            const userData = snap.exists() ? snap.data() : {};

            store.user = {
                uid: fbUser.uid,
                email: fbUser.email,
                username: userData.username || fbUser.displayName || fbUser.email.split('@')[0],
                username_lowercase: userData.username_lowercase || '',
                avatar: userData.avatar || '',
                socialLink: userData.socialLink || '',
                // Object social đầy đủ (youtube/facebook/gdvn/discord), dùng bởi Profile.js
                socials: userData.socials || { youtube: '', facebook: '', gdvn: '', discord: '' },
                role: userData.role || 'player',
            };
        } catch (e) {
            console.error('Lỗi tải hồ sơ user:', e);
            store.user = {
                uid: fbUser.uid,
                email: fbUser.email,
                username: fbUser.email.split('@')[0],
                avatar: '',
                socialLink: '',
                socials: { youtube: '', facebook: '', gdvn: '', discord: '' },
                role: 'player',
            };
        }
    } else {
        store.user = null;
    }
    store.authLoading = false;
});

const app = Vue.createApp({
    data: () => ({
        store,
        globalSearchQuery: '',
    }),
    mounted() {
        window.addEventListener('keydown', this.handleGlobalSearchShortcut);
    },
    beforeUnmount() {
        window.removeEventListener('keydown', this.handleGlobalSearchShortcut);
    },
    methods: {
        handleGlobalSearch() {
            const q = this.globalSearchQuery.trim();
            router.push({ path: '/', query: q ? { q } : {} });
        },
        handleGlobalSearchShortcut(event) {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                document.querySelector('#global-search')?.focus();
            }
        },
    },
});

const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes,
});

app.use(router);
app.mount("#app");

