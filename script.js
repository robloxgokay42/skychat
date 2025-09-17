// Firebase'i başlatma
const firebaseConfig = {
  apiKey: "AIzaSyD4e2l_0Xs5Ie5brTW79aARxXWg_AJYof4",
  authDomain: "skychat-5decd.firebaseapp.com",
  projectId: "skychat-5decd",
  storageBucket: "skychat-5decd.firebasestorage.app",
  messagingSenderId: "410944380555",
  appId: "1:410944380555:web:1eb77e04265fab183fbe8e",
  measurementId: "G-7YSVH37SGM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const toggleAuthText = document.getElementById('toggle-auth-text');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

const loginUsernameInput = document.getElementById('login-username');
const signupUsernameInput = document.getElementById('signup-username');
const signupBioInput = document.getElementById('signup-bio');

const currentUserUsername = document.getElementById('current-user-username');
const currentUserBio = document.getElementById('current-user-bio');

// Kullanıcı girişi/kaydı arasında geçiş yapma
function toggleAuthForms() {
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    signupForm.style.display = signupForm.style.display === 'none' ? 'block' : 'none';
    toggleAuthText.textContent = loginForm.style.display === 'none' ? 'Hesabın var mı? Giriş yap!' : 'Hesabın yok mu? Kayıt ol!';
}

// Yeni kullanıcı kaydetme
async function signupUser() {
    const username = signupUsernameInput.value.trim();
    const bio = signupBioInput.value.trim();

    if (!username) {
        alert("Kullanıcı adı boş olamaz!");
        return;
    }

    try {
        // Kullanıcı adı zaten kullanılıyor mu kontrol et
        const userDoc = await db.collection('users').where('username', '==', username).get();
        if (!userDoc.empty) {
            alert("Bu kullanıcı adı zaten kullanılıyor!");
            return;
        }

        // Firestore'a kullanıcı bilgilerini kaydetme
        await db.collection('users').add({
            username: username,
            bio: bio,
            profilePictureUrl: 'default_avatar.png', // Profil fotoğrafı devredışı olduğu için sabit bir değer verdik
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Kayıt başarılı! Lütfen giriş yapın.");
        toggleAuthForms(); // Kayıt sonrası giriş formuna dön
        signupUsernameInput.value = '';
        signupBioInput.value = '';

    } catch (error) {
        console.error("Kayıt sırasında hata oluştu: ", error);
        alert("Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    }
}

// Kullanıcı girişi yapma
async function loginUser() {
    const username = loginUsernameInput.value.trim();

    if (!username) {
        alert("Kullanıcı adı boş olamaz!");
        return;
    }

    try {
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('username', '==', username).limit(1).get();

        if (querySnapshot.empty) {
            alert("Kullanıcı bulunamadı. Lütfen kayıt olun.");
        } else {
            const userData = querySnapshot.docs[0].data();
            // Başarılı giriş
            localStorage.setItem('currentUserUsername', username); // Kullanıcıyı lokalde sakla
            localStorage.setItem('currentUserBio', userData.bio);

            showApp(); // Uygulama arayüzünü göster
            loadUserProfile(); // Profil bilgilerini yükle
            alert("Giriş başarılı!");
        }
    } catch (error) {
        console.error("Giriş sırasında hata oluştu: ", error);
        alert("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    }
}

// Uygulama arayüzünü gösterme
function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
}

// Profil bilgilerini yükleme
function loadUserProfile() {
    const username = localStorage.getItem('currentUserUsername');
    const bio = localStorage.getItem('currentUserBio');

    if (username) {
        currentUserUsername.textContent = username;
        currentUserBio.textContent = bio || "Biyografim";
    }
}

// Uygulama başladığında kontrol et
window.onload = () => {
    const username = localStorage.getItem('currentUserUsername');
    if (username) {
        showApp();
        loadUserProfile();
    }
};
