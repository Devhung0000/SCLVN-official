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
        <main class="page-auth" style="display:flex; justify-content:center; padding: 3rem 1rem;">
            <div style="width: 100%; max-width: 400px; display:flex; flex-direction:column; gap:1rem;">

                <template v-if="store.user">
                    <h1>Xin chào, {{ store.user.displayName || 'Player' }}!</h1>
                    <p class="type-body-lg">Bạn đã đăng nhập bằng {{ store.user.email }}.</p>
                    <router-link class="btn" to="/submit">Đi tới trang Nộp Record</router-link>
                    <router-link v-if="store.user.role === 'admin'" class="btn" to="/admin">Đi tới trang Duyệt Record</router-link>
                    <button class="btn" @click="logout">Đăng xuất</button>
                </template>

                <template v-else>
                    <h1>{{ mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản' }}</h1>

                    <!-- Form Đăng ký -->
                    <template v-if="mode === 'register'">
                        <input v-model="displayName" class="btn" type="text" placeholder="Tên Geometry Dash (Tên player của bạn)" />
                        <input v-model="email" class="btn" type="email" placeholder="Email" />
                    </template>

                    <!-- Form Đăng nhập -->
                    <template v-else>
                        <input v-model="usernameOrEmail" class="btn" type="text" placeholder="Tên Geometry Dash" />
                    </template>

                    <input v-model="password" class="btn" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" @keyup.enter="submit" />

                    <p v-if="error" class="error" style="color: #ff4d4d; margin: 0;">{{ error }}</p>

                    <button class="btn" :disabled="loading" @click="submit">
                        {{ loading ? 'Đang xử lý...' : (mode === 'login' ? 'Đăng nhập' : 'Đăng ký') }}
                    </button>

                    <button class="btn" :disabled="loading" @click="googleSignIn">
                        Đăng nhập bằng Google
                    </button>

                    <p class="type-label-md" style="cursor:pointer; text-decoration:underline;" @click="toggleMode">
                        {{ mode === 'login' ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập' }}
                    </p>
                </template>
            </div>
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
