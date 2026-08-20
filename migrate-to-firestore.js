import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Lấy config từ firebase-init.js
import { firebaseConfig } from './js/firebase-init.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
    try {
        console.log('Đang đọc dữ liệu từ thư mục /data...');
        
        // 1. Migrate meta (_list.json)
        const listPath = path.join(process.cwd(), 'data', '_list.json');
        if (fs.existsSync(listPath)) {
            const listData = JSON.parse(fs.readFileSync(listPath, 'utf8'));
            await setDoc(doc(db, 'meta', 'list'), { data: listData });
            console.log('✓ Đã upload collection "meta" (document: "list")');
        }

        // 2. Migrate levels
        const dataDir = path.join(process.cwd(), 'data');
        const files = fs.readdirSync(dataDir);
        
        for (const file of files) {
            if (file.endsWith('.json') && file !== '_list.json') {
                const levelName = file.replace('.json', '');
                const levelData = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
                await setDoc(doc(db, 'levels', levelName), levelData);
                console.log(`✓ Đã upload level: ${levelName}`);
            }
        }

        console.log('\n SUCCESS! Đã chuyển đổi xong toàn bộ dữ liệu lên Firestore!');
    } catch (error) {
        console.error(' Lỗi trong quá trình migrate:', error);
    }
}

migrate();
