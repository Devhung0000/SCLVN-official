import { store } from '../main.js';
import { db, doc, setDoc } from '../firebase-init.js';

// ⚠️ TRANG TẠM THỜI: dùng để import _players.json vào Firestore collection "players"
// 1 lần duy nhất. Sau khi chạy xong và kiểm tra Leaderboard hiện đúng avatar/social,
// hãy XOÁ file này + dòng route "/admin-seed-players" trong routes.js.

export default {
    data: () => ({
        store,
        loading: false,
        log: [],
        done: false,
    }),
    template: `
        <main style="max-width: 700px; margin: 40px auto; padding: 20px; color: white; font-family: 'Poppins', sans-serif;">
            <div v-if="!store.user || store.user.role !== 'admin'" style="text-align:center; color:#a1a1aa;">
                <h2>Bạn không có quyền truy cập trang này.</h2>
            </div>
            <div v-else style="background:#18181b; border:1px solid #27272a; border-radius:12px; padding:24px;">
                <h2 style="color:#c084fc; margin-top:0;">Import _players.json vào Firestore ("players")</h2>
                <p style="color:#a1a1aa; font-size:14px;">
                    Đọc file <code>/data/_players.json</code> và ghi từng player vào collection
                    <code>players</code> (doc id = tên viết thường), giữ nguyên field
                    <code>claimedBy</code> nếu đã có người claim trước đó.
                </p>

                <button :disabled="loading || done" @click="runImport"
                    style="padding:12px 20px; background:#22c55e; border:none; color:white; border-radius:6px; cursor:pointer; font-weight:700;">
                    {{ loading ? 'Đang import...' : (done ? 'Đã xong' : 'Bắt đầu Import') }}
                </button>

                <div style="margin-top:20px; max-height:400px; overflow-y:auto; font-size:13px; font-family:monospace; display:flex; flex-direction:column; gap:4px;">
                    <p v-for="(line, i) in log" :key="i" :style="{ color: line.startsWith('✅') ? '#4ade80' : (line.startsWith('⚠️') ? '#facc15' : '#e4e4e7') }">{{ line }}</p>
                </div>
            </div>
        </main>
    `,
    methods: {
        async runImport() {
            this.loading = true;
            this.log = [];
            try {
                const res = await fetch('/data/_players.json');
                const players = await res.json();

                const seenNames = new Set();
                let imported = 0;
                let skipped = 0;

                for (const p of players) {
                    if (!p.name) {
                        this.log.push(`⚠️ Bỏ qua 1 entry không có "name": ${JSON.stringify(p)}`);
                        skipped++;
                        continue;
                    }
                    const lowerName = p.name.trim().toLowerCase();

                    if (seenNames.has(lowerName)) {
                        this.log.push(`⚠️ Bỏ qua bản trùng lặp trong file JSON: "${p.name}"`);
                        skipped++;
                        continue;
                    }
                    seenNames.add(lowerName);

                    await setDoc(doc(db, 'players', lowerName), {
                        name: p.name,
                        youtube: p.youtube || '',
                        facebook: p.facebook || '',
                        gdvn: p.gdvn || '',
                        discord: p.discord || '',
                        avatarUrl: '', // để trống -> Leaderboard.js tự dùng assets/avatars/{name}.png
                    }, { merge: true });

                    this.log.push(`✅ Đã import: ${p.name}`);
                    imported++;
                }

                this.log.push(`--- Hoàn tất: ${imported} player đã import, ${skipped} bị bỏ qua. ---`);
                this.done = true;
            } catch (err) {
                this.log.push(`⚠️ Lỗi: ${err.message}`);
                console.error(err);
            } finally {
                this.loading = false;
            }
        },
    },
};
