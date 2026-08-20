import { store } from '../main.js';
import {
    db, collection, getDocs, query, where,
    doc, updateDoc, arrayUnion, serverTimestamp,
} from '../firebase-init.js';
import Spinner from '../components/Spinner.js';

export default {
    components: { Spinner },
    data: () => ({
        loading: true,
        submissions: [],
        busyId: null,
        store,
    }),
    template: `
        <main v-if="store.authLoading"><Spinner></Spinner></main>
        <main v-else-if="!store.user" style="padding:2rem;">
            <p class="type-body-lg">Bạn cần đăng nhập.</p>
            <router-link class="btn" to="/login">Đăng nhập</router-link>
        </main>
        <main v-else-if="store.user.role !== 'admin'" style="padding:2rem;">
            <p class="type-body-lg">Bạn không có quyền truy cập trang này.</p>
        </main>
        <main v-else-if="loading"><Spinner></Spinner></main>
        <main v-else class="page-admin" style="padding: 2rem 1rem; display:flex; flex-direction:column; gap:1rem; max-width: 700px; margin: 0 auto;">
            <h1>Duyệt Record ({{ submissions.length }} đang chờ)</h1>
            <button class="btn" @click="load" style="align-self:flex-start;">↻ Tải lại danh sách</button>

            <p v-if="submissions.length === 0" class="type-body-lg">Không có record nào đang chờ duyệt 🎉</p>

            <div v-for="sub in submissions" :key="sub.id"
                 style="border:1px solid var(--color-primary); border-radius: 8px; padding: 1rem; display:flex; flex-direction:column; gap:0.5rem;">
                <p class="type-title-sm">{{ sub.levelName }}</p>

                <label class="type-label-md">Player
                    <input v-model="sub.playerName" class="btn" type="text" />
                </label>

                <label class="type-label-md">Percent
                    <input v-model.number="sub.percent" class="btn" type="number" style="width:100px;" />%
                </label>

                <label class="type-label-md">Hz
                    <input v-model="sub.hz" class="btn" type="text" style="width:150px;" />
                </label>

                <label class="type-label-md" style="display:flex; align-items:center; gap:0.5rem;">
                    <input v-model="sub.mobile" type="checkbox" /> Mobile
                </label>

                <label class="type-label-md">Link
                    <input v-model="sub.link" class="btn" type="text" style="width:100%;" />
                </label>

                <p v-if="sub.note"><strong>Ghi chú:</strong> {{ sub.note }}</p>
                <p class="type-label-md">Gửi bởi: {{ sub.submittedByEmail }}</p>

                <div style="display:flex; gap:0.5rem;">
                    <button class="btn" :disabled="busyId === sub.id" @click="approve(sub)">✅ Duyệt</button>
                    <button class="btn" :disabled="busyId === sub.id" @click="reject(sub)">❌ Từ chối</button>
                </div>
            </div>
        </main>
    `,
    async mounted() {
        await this.load();
    },
    watch: {
        'store.user'() {
            this.load();
        },
    },
    methods: {
        async load() {
            if (!store.user || store.user.role !== 'admin') {
                this.loading = false;
                return;
            }
            this.loading = true;
            try {
                const q = query(collection(db, 'submissions'), where('status', '==', 'pending'));
                const snap = await getDocs(q);
                this.submissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) {
                console.error('Lỗi tải submissions:', e);
            }
            this.loading = false;
        },
        async approve(sub) {
            this.busyId = sub.id;
            try {
                const record = {
                    user: sub.playerName,
                    percent: Number(sub.percent),
                };
                if (sub.hz) record.hz = sub.hz;
                if (sub.link) record.link = sub.link;
                if (sub.mobile) record.mobile = true;

                await updateDoc(doc(db, 'levels', sub.levelId), {
                    records: arrayUnion(record),
                });
                await updateDoc(doc(db, 'submissions', sub.id), {
                    status: 'approved',
                    reviewedByUid: store.user.uid,
                    reviewedAt: serverTimestamp(),
                });
                this.submissions = this.submissions.filter(s => s.id !== sub.id);
            } catch (e) {
                alert('Lỗi khi duyệt: ' + e.message);
            } finally {
                this.busyId = null;
            }
        },
        async reject(sub) {
            this.busyId = sub.id;
            try {
                await updateDoc(doc(db, 'submissions', sub.id), {
                    status: 'rejected',
                    reviewedByUid: store.user.uid,
                    reviewedAt: serverTimestamp(),
                });
                this.submissions = this.submissions.filter(s => s.id !== sub.id);
            } catch (e) {
                alert('Lỗi khi từ chối: ' + e.message);
            } finally {
                this.busyId = null;
            }
        },
    },
};
