import { store } from '../main.js';
import {
    auth,
    db,
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    updateProfile,
} from '../firebase-init.js';

export default {
    data: () => ({
        mode: 'login',
        usernameOrEmail: '',
        email: '',
        password: '',
        displayName: '',
        error: '',
        loading: false,
        store,
    }),
    template: `
        <main class="page-auth">
            <section class="auth-shell">

                <!-- LEFT BRAND PANEL -->
                <div class="auth-brand-panel">
                    <div class="auth-brand-mark">
                        <img src="/assets/the sclvn logo.png" alt="SCLVN">
                    </div>

                    <div class="auth-brand-copy">
                        <span class="auth-kicker">SCLVN ACCOUNT</span>
                        <h1>Welcome back.</h1>
                        <p>
                            Sign in to submit records, manage your profile
                            and access SCLVN account features.
                        </p>
                    </div>

                    <div class="auth-brand-footer">
                        <span class="auth-dot"></span>
                        <span>Spam Challenge List Vietnam</span>
                    </div>
                </div>

                <!-- RIGHT AUTH PANEL -->
                <div class="auth-card">

                    <!-- Already logged in -->
                    <template v-if="store.user">
                        <div class="auth-logged-user">
                            <img
                                :src="store.user.avatar || '/assets/the sclvn logo.png'"
                                alt="Avatar"
                            >

                            <div>
                                <span class="auth-kicker">SIGNED IN</span>
                                <h2>
                                    {{ store.user.displayName || store.user.username || 'Player' }}
                                </h2>
                                <p>{{ store.user.email }}</p>
                            </div>
                        </div>

                        <div class="auth-account-actions">
                            <router-link class="auth-primary-btn" to="/submit">
                                Submit Record
                            </router-link>

                            <router-link
                                v-if="store.user.role === 'admin'"
                                class="auth-secondary-btn"
                                to="/admin"
                            >
                                Review Records
                            </router-link>

                            <router-link class="auth-secondary-btn" to="/profile">
                                Profile
                            </router-link>

                            <button
                                class="auth-danger-btn"
                                type="button"
                                @click="logout"
                            >
                                Logout
                            </button>
                        </div>
                    </template>

                    <!-- Login / Register -->
                    <template v-else>
                        <header class="auth-card-header">
                            <div>
                                <span class="auth-kicker">
                                    {{ mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT' }}
                                </span>

                                <h2>
                                    {{ mode === 'login' ? 'Login to SCLVN' : 'Join SCLVN' }}
                                </h2>

                                <p>
                                    {{
                                        mode === 'login'
                                            ? 'Use your Geometry Dash name or account email.'
                                            : 'Create an account linked to your Geometry Dash name.'
                                    }}
                                </p>
                            </div>
                        </header>

                        <div class="auth-form">

                            <!-- Register fields -->
                            <template v-if="mode === 'register'">
                                <label class="auth-field">
                                    <span>Geometry Dash name</span>

                                    <div class="auth-input-wrap">
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <circle cx="12" cy="8" r="4"></circle>
                                            <path d="M5 21a7 7 0 0 1 14 0"></path>
                                        </svg>

                                        <input
                                            v-model="displayName"
                                            type="text"
                                            autocomplete="username"
                                            placeholder="Your player name"
                                        >
                                    </div>
                                </label>

                                <label class="auth-field">
                                    <span>Email</span>

                                    <div class="auth-input-wrap">
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <rect x="3" y="5" width="18" height="14" rx="2"></rect>
                                            <path d="m4 7 8 6 8-6"></path>
                                        </svg>

                                        <input
                                            v-model="email"
                                            type="email"
                                            autocomplete="email"
                                            placeholder="name@example.com"
                                        >
                                    </div>
                                </label>
                            </template>

                            <!-- Login field -->
                            <template v-else>
                                <label class="auth-field">
                                    <span>Geometry Dash name or email</span>

                                    <div class="auth-input-wrap">
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <circle cx="12" cy="8" r="4"></circle>
                                            <path d="M5 21a7 7 0 0 1 14 0"></path>
                                        </svg>

                                        <input
                                            v-model="usernameOrEmail"
                                            type="text"
                                            autocomplete="username"
                                            placeholder="Player name or email"
                                        >
                                    </div>
                                </label>
                            </template>

                            <label class="auth-field">
                                <span>Password</span>

                                <div class="auth-input-wrap">
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <rect x="5" y="10" width="14" height="10" rx="2"></rect>
                                        <path d="M8 10V7a4 4 0 0 1 8 0v3"></path>
                                    </svg>

                                    <input
                                        v-model="password"
                                        type="password"
                                        autocomplete="current-password"
                                        placeholder="At least 6 characters"
                                        @keyup.enter="submit"
                                    >
                                </div>
                            </label>

                            <div v-if="error" class="auth-error">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <circle cx="12" cy="12" r="9"></circle>
                                    <path d="M12 7v6M12 17h.01"></path>
                                </svg>

                                <span>{{ error }}</span>
                            </div>

                            <button
                                class="auth-primary-btn auth-full-btn"
                                type="button"
                                :disabled="loading"
                                @click="submit"
                            >
                                {{
                                    loading
                                        ? 'Processing...'
                                        : (mode === 'login' ? 'Login' : 'Create account')
                                }}
                            </button>

                            <div class="auth-divider">
                                <span>or continue with</span>
                            </div>

                            <button
                                class="auth-google-btn"
                                type="button"
                                :disabled="loading"
                                @click="googleSignIn"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M21 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.1a4.4 4.4 0 0 1-1.9 2.8v2.3h3.1c1.8-1.7 2.7-4.1 2.7-6.9Z"></path>
                                    <path d="M12 21c2.6 0 4.8-.9 6.4-2.3l-3.1-2.3c-.9.6-2 1-3.3 1-2.5 0-4.6-1.7-5.4-4H3.4v2.4A9.7 9.7 0 0 0 12 21Z"></path>
                                    <path d="M6.6 13.4a5.8 5.8 0 0 1 0-3.7V7.3H3.4A9 9 0 0 0 3.4 16l3.2-2.6Z"></path>
                                    <path d="M12 5.6c1.4 0 2.7.5 3.7 1.4l2.8-2.8A9.4 9.4 0 0 0 3.4 7.3l3.2 2.4c.8-2.4 2.9-4.1 5.4-4.1Z"></path>
                                </svg>

                                <span>Google</span>
                            </button>
                        </div>

                        <footer class="auth-card-footer">
                            <span>
                                {{
                                    mode === 'login'
                                        ? 'New to SCLVN?'
                                        : 'Already have an account?'
                                }}
                            </span>

                            <button type="button" @click="toggleMode">
                                {{
                                    mode === 'login'
                                        ? 'Create account'
                                        : 'Login instead'
                                }}
                            </button>
                        </footer>
                    </template>
                </div>

            </section>
        </main>
    `,
    methods: {
        toggleMode() {
            this.mode = this.mode === 'login' ? 'register' : 'login';
            this.error = '';
        },

        // Tìm data cũ của player (avatar/social) trong collection "players"
        // (được seed từ _players.json / được các user khác cập nhật qua trang Profile)
        async findClaimablePlayer(lowerUsername) {
            try {
                const playerSnap = await getDoc(doc(db, 'players', lowerUsername));
                if (playerSnap.exists()) {
                    return playerSnap.data();
                }
            } catch (e) {
                console.warn('Không kiểm tra được dữ liệu leaderboard cũ:', e);
            }
            return null;
        },

        async saveUserToFirestore(uid, email, username, photoURL = '') {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            const cleanUsername = username.trim();
            const lowerUsername = cleanUsername.toLowerCase();

            if (!userSnap.exists()) {
                // 1. Tìm xem tên này đã từng xuất hiện trên leaderboard/players chưa
                const existingPlayer = await this.findClaimablePlayer(lowerUsername);

                const socials = {
                    youtube: existingPlayer?.youtube || '',
                    facebook: existingPlayer?.facebook || '',
                    gdvn: existingPlayer?.gdvn || '',
                    discord: existingPlayer?.discord || '',
                };
                const avatar = photoURL || existingPlayer?.avatarUrl || '';

                // 2. Tạo hồ sơ user (private, gắn với tài khoản đăng nhập)
                await setDoc(userRef, {
                    uid,
                    email,
                    username: cleanUsername,
                    username_lowercase: lowerUsername,
                    displayName: cleanUsername,
                    avatar,
                    socials,
                    role: 'player',
                    createdAt: new Date().toISOString(),
                });

                // 3. Đồng bộ / claim lại doc "players" (public, Leaderboard.js đọc từ đây)
                //    merge:true để không mất dữ liệu cũ nếu tên đã có sẵn từ trước
                await setDoc(doc(db, 'players', lowerUsername), {
                    name: cleanUsername,
                    youtube: socials.youtube,
                    facebook: socials.facebook,
                    gdvn: socials.gdvn,
                    discord: socials.discord,
                    avatarUrl: avatar,
                    claimedBy: uid,
                }, { merge: true });

            } else {
                const existingData = userSnap.data();
                if (!existingData.username) {
                    await setDoc(userRef, {
                        username: cleanUsername,
                        username_lowercase: lowerUsername,
                        displayName: cleanUsername,
                    }, { merge: true });
                }
            }
        },
        async submit() {
            this.error = '';
            this.loading = true;

            try {
                if (this.mode === 'register') {
                    const gdName = this.displayName.trim();
                    const inputEmail = this.email.trim();

                    if (!gdName) throw new Error('Vui lòng nhập Tên Geometry Dash.');
                    if (!inputEmail || !this.password) throw new Error('Vui lòng nhập Email và Mật khẩu.');

                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('username_lowercase', '==', gdName.toLowerCase()));
                    const querySnap = await getDocs(q);

                    if (!querySnap.empty) {
                        throw new Error('Tên Geometry Dash này đã được sử dụng!');
                    }

                    const cred = await createUserWithEmailAndPassword(auth, inputEmail, this.password);
                    await updateProfile(cred.user, { displayName: gdName });
                    await this.saveUserToFirestore(cred.user.uid, inputEmail, gdName);

                } else {
                    const input = this.usernameOrEmail.trim();
                    if (!input || !this.password) throw new Error('Vui lòng điền đầy đủ thông tin.');

                    let targetEmail = input;

                    if (!input.includes('@')) {
                        const usersRef = collection(db, 'users');
                        const q = query(usersRef, where('username_lowercase', '==', input.toLowerCase()));
                        const querySnap = await getDocs(q);

                        if (querySnap.empty) {
                            throw new Error('Tên Geometry Dash không tồn tại.');
                        }

                        const userData = querySnap.docs[0].data();
                        targetEmail = userData.email;
                    }

                    await signInWithEmailAndPassword(auth, targetEmail, this.password);
                }
            } catch (e) {
                console.error(e);
                this.error = this.translateError(e);
            } finally {
                this.loading = false;
            }
        },
        async googleSignIn() {
            this.error = '';
            this.loading = true;
            try {
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                // Nếu tài khoản này đã có hồ sơ users/{uid} rồi -> đây là lần đăng
                // nhập lại, KHÔNG được đổi username đã có. Đăng nhập xong, thoát luôn.
                const userRef = doc(db, 'users', user.uid);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    return;
                }

                // Tài khoản Google lần đầu -> bắt buộc phải có Tên Geometry Dash rõ
                // ràng do người dùng gõ (không được tự suy ra từ email/tên Google,
                // vì dễ ra tên sai như "thedeltreal" thay vì "giangdelt").
                // Lấy từ ô đang hiển thị, dù đang ở chế độ Đăng ký (displayName)
                // hay Đăng nhập (usernameOrEmail).
                const inputName = (this.displayName || this.usernameOrEmail || '').trim();
                if (!inputName) {
                    await signOut(auth);
                    throw new Error('Vui lòng nhập Tên Geometry Dash trước khi đăng nhập bằng Google.');
                }

                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('username_lowercase', '==', inputName.toLowerCase()));
                const querySnap = await getDocs(q);
                if (!querySnap.empty) {
                    await signOut(auth);
                    throw new Error('Tên Geometry Dash này đã được sử dụng!');
                }

                await updateProfile(user, { displayName: inputName });
                await this.saveUserToFirestore(user.uid, user.email, inputName, user.photoURL);
            } catch (e) {
                console.error(e);
                this.error = this.translateError(e);
            } finally {
                this.loading = false;
            }
        },
        async logout() {
            await signOut(auth);
        },
        translateError(e) {
            const code = e?.code || '';
            if (e.message && !code) return e.message;
            if (code.includes('email-already-in-use')) return 'Email này đã được đăng ký rồi.';
            if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Sai tên đăng nhập/email hoặc mật khẩu.';
            if (code.includes('weak-password')) return 'Mật khẩu phải từ 6 ký tự trở lên.';
            if (code.includes('invalid-email')) return 'Định dạng Email không hợp lệ.';
            return e.message || 'Có lỗi xảy ra, xin thử lại.';
        },
    },
};
