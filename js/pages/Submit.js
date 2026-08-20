import { store } from '../main.js';
import { fetchList } from '../content.js';
import { db, collection, addDoc, serverTimestamp } from '../firebase-init.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    data: () => ({
        loading: true,
        levels: [],
        levelId: '',
        playerName: '',
        percent: 100,
        hz: '',
        mobile: false,
        link: '',
        note: '',
        submitting: false,
        success: false,
        error: '',
        store,
    }),
    template: `
        <main v-if="loading"><Spinner></Spinner></main>
        <main v-else class="page-submit" style="display:flex; justify-content:center; padding: 2rem 1rem;">
            <div style="width:100%; max-width: 480px; display:flex; flex-direction:column; gap:1rem;">
                <h1>Nộp Record</h1>

                <template v-if="!store.user">
                    <p class="type-body-lg">Bạn cần đăng nhập để nộp record.</p>
                    <router-link class="btn" to="/login">Đăng nhập / Đăng ký</router-link>
                </template>

                <template v-else-if="success">
                    <p class="type-body-lg">✅ Đã gửi! Record của bạn đang chờ admin duyệt.</p>
                    <button class="btn" @click="resetForm">Nộp thêm record khác</button>
                </template>

                <template v-else>
                    <label class="type-label-md">Level</label>
                    <select v-model="levelId" class="btn">
                        <option value="" disabled>-- Chọn level --</option>
                        <option v-for="lvl in levels" :key="lvl.id" :value="lvl.id">{{ lvl.name }}</option>
                    </select>

                    <label class="type-label-md">Tên player của bạn</label>
                    <input v-model="playerName" class="btn" type="text" placeholder="Tên hiển thị trên leaderboard" />

                    <label class="type-label-md">Phần trăm hoàn thành (%)</label>
                    <input v-model.number="percent" class="btn" type="number" min="1" max="100" />

                    <label class="type-label-md">Hz / Thiết bị</label>
                    <input v-model="hz" class="btn" type="text" placeholder="Ví dụ: 240, COS, CBF..." />

                    <label class="type-label-md" style="display:flex; align-items:center; gap:0.5rem;">
                        <input v-model="mobile" type="checkbox" /> Record trên Mobile
                    </label>

                    <label class="type-label-md">Link video</label>
                    <input v-model="link" class="btn" type="text" placeholder="Link Youtube / Drive / Medal..." />

                    <label class="type-label-md">Ghi chú thêm (không bắt buộc)</label>
                    <textarea v-model="note" class="btn" rows="3" placeholder="Ghi chú cho admin, nếu có"></textarea>

                    <p v-if="error" class="error">{{ error }}</p>

                    <button class="btn" :disabled="submitting" @click="submitRecord">
                        {{ submitting ? 'Đang gửi...' : 'Gửi record' }}
                    </button>
                </template>
            </div>
        </main>
    `,
    async mounted() {
        const list = await fetchList();
        this.levels = (list || [])
            .filter(([lvl]) => lvl)
            .map(([lvl]) => ({ id: lvl.path, name: lvl.name }));
        if (store.user) {
            this.playerName = store.user.displayName || '';
        }
        this.loading = false;
    },
    methods: {
        resetForm() {
            this.success = false;
            this.levelId = '';
            this.percent = 100;
            this.hz = '';
            this.mobile = false;
            this.link = '';
            this.note = '';
        },
        async submitRecord() {
            this.error = '';
            if (!this.levelId) { this.error = 'Vui lòng chọn level.'; return; }
            if (!this.playerName.trim()) { this.error = 'Vui lòng nhập tên player.'; return; }
            if (!this.percent || this.percent < 1 || this.percent > 100) { this.error = 'Phần trăm không hợp lệ.'; return; }

            this.submitting = true;
            try {
                await addDoc(collection(db, 'submissions'), {
                    levelId: this.levelId,
                    levelName: this.levels.find(l => l.id === this.levelId)?.name || this.levelId,
                    playerName: this.playerName.trim(),
                    percent: this.percent,
                    hz: this.hz.trim(),
                    mobile: this.mobile,
                    link: this.link.trim(),
                    note: this.note.trim(),
                    status: 'pending',
                    submittedByUid: store.user.uid,
                    submittedByEmail: store.user.email,
                    submittedAt: serverTimestamp(),
                });
                this.success = true;
            } catch (e) {
                this.error = 'Gửi thất bại, thử lại sau. (' + (e.message || '') + ')';
            } finally {
                this.submitting = false;
            }
        },
    },
};
