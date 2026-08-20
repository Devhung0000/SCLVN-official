import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc,
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let auth, db;
try {
    const app = getApps().length > 0 ? getApps()[0] : null;
    if (app) {
        auth = getAuth(app);
        db = getFirestore(app);
    }
} catch (e) {
    console.error("Lỗi khi kết nối Firebase:", e);
}

let isLoginMode = true;
export let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
    // DOM Auth
    const authModal = document.getElementById('auth-modal');
    const authOpenBtn = document.getElementById('auth-open-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const toggleAuthBtn = document.getElementById('toggle-auth-btn');
    const authForm = document.getElementById('auth-form');
    const usernameBox = document.getElementById('username-box');
    const modalTitle = document.getElementById('modal-title');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('toggle-text');

    const userProfile = document.getElementById('user-profile');
    const userNameDisplay = document.getElementById('user-name-display');
    const userAvatarDisplay = document.getElementById('user-avatar-display');
    const adminBadge = document.getElementById('admin-badge');
    const logoutBtn = document.getElementById('logout-btn');

    // DOM Profile
    const profileModal = document.getElementById('profile-modal');
    const openProfileBtn = document.getElementById('open-profile-btn');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const profileForm = document.getElementById('profile-form');

    if (!authOpenBtn) return;

    // 1. Mở/Đóng Auth Modal
    authOpenBtn.onclick = () => { authModal.style.display = 'flex'; };
    closeModalBtn.onclick = () => { authModal.style.display = 'none'; };

    // 2. Mở/Đóng Profile Modal
    openProfileBtn.onclick = () => {
        if (currentUser) {
            document.getElementById('edit-username').value = currentUser.username || '';
            document.getElementById('edit-avatar').value = currentUser.avatar || '';
            document.getElementById('edit-social').value = currentUser.socialLink || '';
            profileModal.style.display = 'flex';
        }
    };
    closeProfileBtn.onclick = () => { profileModal.style.display = 'none'; };

    // 3. Toggle Đăng ký <-> Đăng nhập
    toggleAuthBtn.onclick = () => {
        isLoginMode = !isLoginMode;
        modalTitle.innerText = isLoginMode ? 'Login' : 'Register Player Account';
        authSubmitBtn.innerText = isLoginMode ? 'Login' : 'Create Account';
        usernameBox.style.display = isLoginMode ? 'none' : 'block';
        toggleText.innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
        toggleAuthBtn.innerText = isLoginMode ? "Register now" : "Login";
    };

    // 4. Xử lý Form Auth
    authForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const username = document.getElementById('auth-username').value.trim();

        try {
            if (isLoginMode) {
                await signInWithEmailAndPassword(auth, email, password);
                alert('Đăng nhập thành công!');
            } else {
                if (!username) {
                    alert('Vui lòng nhập tên Player!');
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const uid = userCredential.user.uid;

                await setDoc(doc(db, 'users', uid), {
                    username: username,
                    username_lowercase: username.toLowerCase(),
                    email: email,
                    avatar: '',
                    socialLink: '',
                    role: 'player',
                    createdAt: new Date().toISOString()
                });
                alert('Đăng ký tài khoản thành công!');
            }
            authModal.style.display = 'none';
        } catch (err) {
            alert('Lỗi: ' + err.message);
        }
    };

    // 5. Lưu thông tin Profile mới
    profileForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return;

        const newUsername = document.getElementById('edit-username').value.trim();
        const newAvatar = document.getElementById('edit-avatar').value.trim();
        const newSocial = document.getElementById('edit-social').value.trim();

        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                username: newUsername,
                username_lowercase: newUsername.toLowerCase(),
                avatar: newAvatar,
                socialLink: newSocial
            });

            currentUser.username = newUsername;
            currentUser.avatar = newAvatar;
            currentUser.socialLink = newSocial;

            userNameDisplay.innerText = newUsername;
            if (newAvatar) userAvatarDisplay.src = newAvatar;

            alert('Cập nhật Profile thành công!');
            profileModal.style.display = 'none';
        } catch (err) {
            alert('Lỗi khi cập nhật profile: ' + err.message);
        }
    };

    // 6. Xử lý Đăng xuất có xác nhận
    logoutBtn.onclick = async () => {
        const confirmLogout = confirm("Are you sure you want to log out?");
        if (confirmLogout && auth) {
            await signOut(auth);
            alert("Đã đăng xuất!");
        }
    };

    // 7. Lắng nghe trạng thái User
    if (auth) {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const userSnap = await getDoc(doc(db, 'users', user.uid));
                    if (userSnap.exists()) {
                        currentUser = { uid: user.uid, ...userSnap.data() };
                        userNameDisplay.innerText = currentUser.username;
                        if (currentUser.avatar) userAvatarDisplay.src = currentUser.avatar;
                        adminBadge.style.display = currentUser.role === 'admin' ? 'inline-block' : 'none';
                    } else {
                        userNameDisplay.innerText = user.email.split('@')[0];
                    }
                } catch (err) {
                    console.error("Lỗi lấy user:", err);
                }
                authOpenBtn.style.display = 'none';
                userProfile.style.display = 'flex';
            } else {
                currentUser = null;
                authOpenBtn.style.display = 'inline-block';
                userProfile.style.display = 'none';
            }
        });
    }
});
