// ✅ Import từ firebase-init.js (cần đảm bảo firebase-init đã export getDoc)
import { 
    auth, 
    db, 
    createUserWithEmailAndPassword, 
    doc, 
    setDoc,
    getDoc 
} from '../firebase-init.js';

export function RegisterPage() {
  return `
    <div class="auth-container">
      <h2>Tạo tài khoản</h2>
      <form id="register-form">
        <div class="input-group">
          <input type="text" id="reg-username" placeholder="Tên Geometry Dash (Player Name)" required />
        </div>
        <div class="input-group">
          <input type="email" id="reg-email" placeholder="Email của bạn" required />
        </div>
        <div class="input-group">
          <input type="password" id="reg-password" placeholder="Mật khẩu" required />
        </div>
        
        <p id="error-message" class="error-text" style="color: #ff4d4d; display: none;"></p>

        <button type="submit" class="btn-submit">Đăng ký</button>
      </form>
      
      <p class="auth-switch">
        Đã có tài khoản? <a href="#/login">Đăng nhập</a>
      </p>
    </div>
  `;
}

// Hàm gắn sự kiện Submit Form
export function initRegisterEvents() {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('error-message');

    errorEl.style.display = 'none';

    try {
      const lowerUsername = username.toLowerCase();

      // 1. KIỂM TRA TÊN GEOMETRY DASH ĐÃ TỒN TẠI CHƯA
      const usernameRef = doc(db, "usernames", lowerUsername);
      const usernameSnap = await getDoc(usernameRef);

      if (usernameSnap.exists()) {
        errorEl.style.display = 'block';
        errorEl.textContent = 'Tên Geometry Dash này đã có người sử dụng!';
        return;
      }

      // 2. TÌM DATA CŨ CỦA TÊN NÀY TRÊN LEADERBOARD (collection "players")
      //    Nếu trùng tên -> tự động claim avatar + social link cũ về tài khoản mới
      let claimedSocials = { youtube: '', facebook: '', gdvn: '', discord: '' };
      let claimedAvatar = '';
      try {
        const playerRef = doc(db, "players", lowerUsername);
        const playerSnap = await getDoc(playerRef);
        if (playerSnap.exists()) {
          const p = playerSnap.data();
          claimedSocials = {
            youtube: p.youtube || '',
            facebook: p.facebook || '',
            gdvn: p.gdvn || '',
            discord: p.discord || '',
          };
          claimedAvatar = p.avatarUrl || '';
        }
      } catch (e) {
        console.warn('Không kiểm tra được dữ liệu leaderboard cũ:', e);
      }

      // 3. Tạo tài khoản trong Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 4. Tạo Mapping "usernames/username_lowercase" -> chứa Email (dùng để tra cứu lúc Login)
      await setDoc(usernameRef, {
        uid: user.uid,
        email: email,
        originalUsername: username
      });

      // 5. Lưu thông tin Profile chính trong "users/uid"
      await setDoc(doc(db, "users", user.uid), {
        username: username,
        username_lowercase: lowerUsername,
        email: email,
        avatar: claimedAvatar,
        socials: claimedSocials,
        role: "player",
        createdAt: new Date().toISOString()
      });

      // 6. Đồng bộ / claim lại doc "players" (public, Leaderboard.js đọc từ đây)
      await setDoc(doc(db, "players", lowerUsername), {
        name: username,
        youtube: claimedSocials.youtube,
        facebook: claimedSocials.facebook,
        gdvn: claimedSocials.gdvn,
        discord: claimedSocials.discord,
        avatarUrl: claimedAvatar,
        claimedBy: user.uid,
      }, { merge: true });

      alert("Đăng ký thành công!");
      window.location.hash = "#/"; // Chuyển về trang chủ

    } catch (error) {
      console.error(error);
      errorEl.style.display = 'block';
      if (error.code === 'auth/email-already-in-use') {
        errorEl.textContent = 'Email này đã được đăng ký rồi.';
      } else if (error.code === 'auth/weak-password') {
        errorEl.textContent = 'Mật khẩu phải có ít nhất 6 ký tự.';
      } else {
        errorEl.textContent = 'Đăng ký thất bại: ' + error.message;
      }
    }
  });
}
