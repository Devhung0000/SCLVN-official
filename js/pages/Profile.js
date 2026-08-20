import { store } from '../main.js';
import { db, doc, updateDoc, setDoc, deleteDoc, collection, query, where, getDocs } from '../firebase-init.js';

export default {
    template: `
        <main class="page-profile">
            <div v-if="!store.user" style="text-align: center; color: #a1a1aa; padding: 60px 20px; background: #18181b; border-radius: 12px; border: 1px solid #27272a;">
                <h2 style="font-size: 20px; margin-bottom: 15px; color: #fff;">Vui lòng đăng nhập để xem và chỉnh sửa Profile!</h2>
                <router-link to="/login" class="nav__cta type-label-lg ripple" style="background: #a855f7; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">Đi tới trang Đăng nhập</router-link>
            </div>

            <div v-else style="background: #18181b; border: 1px solid #27272a; border-radius: 12px; padding: 30px; color: white; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <h2 style="margin-top: 0; font-size: 24px; border-bottom: 1px solid #27272a; padding-bottom: 15px; color: #c084fc;">My Account Profile</h2>
                
                <div style="display: flex; gap: 30px; margin-top: 25px; flex-wrap: wrap;">
                    <!-- Avatar Upload Area -->
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 15px;">
                        <div style="width: 140px; height: 140px; border-radius: 16px; overflow: hidden; border: 2px solid #a855f7; background: #000;">
                            <img :src="previewAvatar || store.user.avatar || '/assets/the sclvn logo.png'" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>
                        <label style="background: #27272a; border: 1px solid #3f3f46; color: white; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; text-align: center;">
                            Upload Ảnh PNG
                            <input type="file" accept="image/png, image/jpeg" @change="handleFileUpload" style="display: none;">
                        </label>
                        <span style="font-size: 11px; color: #71717a;">Chấp nhận file .PNG / .JPG (< 2MB)</span>
                    </div>

                    <!-- Input Fields -->
                    <form @submit.prevent="saveProfile" style="flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 16px;">
                        <div>
                            <label style="font-size: 13px; color: #a1a1aa; display: block; margin-bottom: 6px;">Player Name (Khớp tên trên Leaderboard):</label>
                            <input type="text" v-model="form.username" required placeholder="e.g. giangdelt" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #3f3f46; background: #27272a; color: white; box-sizing: border-box;">
                        </div>

                        <div>
                            <label style="font-size: 13px; color: #a1a1aa; display: block; margin-bottom: 6px;">YouTube Channel / Video Link:</label>
                            <input type="url" v-model="form.youtube" placeholder="https://www.youtube.com/@giangdeltpro" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #3f3f46; background: #27272a; color: white; box-sizing: border-box;">
                        </div>

                        <div>
                            <label style="font-size: 13px; color: #a1a1aa; display: block; margin-bottom: 6px;">Facebook Link:</label>
                            <input type="url" v-model="form.facebook" placeholder="https://www.facebook.com/giangdelt" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #3f3f46; background: #27272a; color: white; box-sizing: border-box;">
                        </div>

                        <div>
                            <label style="font-size: 13px; color: #a1a1aa; display: block; margin-bottom: 6px;">GDVN Link:</label>
                            <input type="url" v-model="form.gdvn" placeholder="https://www.gdlisthub.dev/vi/@giangdelt" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #3f3f46; background: #27272a; color: white; box-sizing: border-box;">
                        </div>

                        <div>
                            <label style="font-size: 13px; color: #a1a1aa; display: block; margin-bottom: 6px;">Discord ID / Tag:</label>
                            <input type="text" v-model="form.discord" placeholder="1338170769708159032" style="width: 100%; padding: 10px; border-radius: 6px; border: 1px solid #3f3f46; background: #27272a; color: white; box-sizing: border-box;">
                        </div>

                        <button type="submit" :disabled="loading" style="margin-top: 10px; padding: 12px; background: #22c55e; border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 15px;">
                            {{ loading ? 'Saving...' : 'Save Profile Changes' }}
                        </button>
                    </form>
                </div>
            </div>
        </main>
    `,
    data() {
        return {
            store,
            previewAvatar: '',
            loading: false,
            form: {
                username: '',
                youtube: '',
                facebook: '',
                gdvn: '',
                discord: ''
            }
        };
    },
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
            }
        }
    },
    methods: {
        async loadInitialData() {
            this.form.username = this.store.user.username || '';
            this.previewAvatar = this.store.user.avatar || '';

            // Tự đọc dữ liệu từ _players.json nếu user chưa có dữ liệu socials trên DB
            try {
                const res = await fetch('/data/_players.json');
                const players = await res.json();
                const matchedPlayer = players.find(p => p.name.toLowerCase() === this.form.username.toLowerCase());

                if (matchedPlayer) {
                    this.form.youtube = matchedPlayer.youtube || '';
                    this.form.facebook = matchedPlayer.facebook || '';
                    this.form.gdvn = matchedPlayer.gdvn || '';
                    this.form.discord = matchedPlayer.discord || '';
                }
            } catch (err) {
                console.error("Không tải được file _players.json", err);
            }

            // Ưu tiên dữ liệu mới nhất đã lưu trên Firestore
            if (this.store.user.socials) {
                this.form.youtube = this.store.user.socials.youtube || this.form.youtube;
                this.form.facebook = this.store.user.socials.facebook || this.form.facebook;
                this.form.gdvn = this.store.user.socials.gdvn || this.form.gdvn;
                this.form.discord = this.store.user.socials.discord || this.form.discord;
            }
        },

        handleFileUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 2 * 1024 * 1024) {
                alert("File quá lớn! Vui lòng chọn ảnh dưới 2MB.");
                return;
            }

            const reader = new FileReader();
            reader.onload = (evt) => {
                this.previewAvatar = evt.target.result;
            };
            reader.readAsDataURL(file);
        },

        async saveProfile() {
            if (!this.store.user) return;
            this.loading = true;

            try {
                const newUsername = this.form.username.trim();
                const newLower = newUsername.toLowerCase();
                const oldLower = (this.store.user.username_lowercase || this.store.user.username || '').trim().toLowerCase();
                const isRenaming = newLower !== oldLower;

                // Nếu đổi tên khác tên hiện tại, kiểm tra xem đã có ai dùng tên đó chưa
                if (isRenaming) {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('username_lowercase', '==', newLower));
                    const querySnap = await getDocs(q);
                    const takenByOther = querySnap.docs.some(d => d.id !== this.store.user.uid);
                    if (takenByOther) {
                        alert('Tên Geometry Dash này đã được người khác sử dụng!');
                        this.loading = false;
                        return;
                    }
                }

                const updatedData = {
                    username: newUsername,
                    username_lowercase: newLower,
                    avatar: this.previewAvatar,
                    socials: {
                        youtube: this.form.youtube.trim(),
                        facebook: this.form.facebook.trim(),
                        gdvn: this.form.gdvn.trim(),
                        discord: this.form.discord.trim()
                    }
                };

                await updateDoc(doc(db, 'users', this.store.user.uid), updatedData);

                // Đồng bộ ngược lại collection "players" (public) - đây là nơi
                // Leaderboard.js thực sự đọc avatar + social để hiển thị.
                // Dùng username_lowercase làm doc id để khớp với logic claim lúc đăng ký.
                await setDoc(doc(db, 'players', updatedData.username_lowercase), {
                    name: updatedData.username,
                    youtube: updatedData.socials.youtube,
                    facebook: updatedData.socials.facebook,
                    gdvn: updatedData.socials.gdvn,
                    discord: updatedData.socials.discord,
                    avatarUrl: updatedData.avatar,
                    claimedBy: this.store.user.uid,
                }, { merge: true });

                // Nếu vừa đổi tên, dọn doc "players" cũ (chỉ xoá nếu đúng là do
                // chính mình claim trước đó, tránh xoá nhầm data người khác)
                if (isRenaming && oldLower) {
                    try {
                        const oldPlayerSnap = await getDocs(query(collection(db, 'players'), where('__name__', '==', oldLower)));
                        const oldDoc = oldPlayerSnap.docs[0];
                        if (oldDoc && oldDoc.data().claimedBy === this.store.user.uid) {
                            await deleteDoc(doc(db, 'players', oldLower));
                        }
                    } catch (cleanupErr) {
                        console.warn('Không dọn được doc players cũ:', cleanupErr);
                    }
                }

                // Cập nhật lại State Store ngay lập tức
                this.store.user.username = updatedData.username;
                this.store.user.username_lowercase = updatedData.username_lowercase;
                this.store.user.avatar = updatedData.avatar;
                this.store.user.socials = updatedData.socials;

                alert('Cập nhật Profile thành công!');
            } catch (err) {
                alert('Lỗi cập nhật profile: ' + err.message);
            } finally {
                this.loading = false;
            }
        }
    }
};
