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

// Rastgele profil fotoğrafları için Imgur link listesi
const profilePictureUrls = [
    "https://i.imgur.com/BDFeiYS.png",
    "https://i.imgur.com/NClcnsn.png",
    "https://i.imgur.com/CCy3TAj.png",
    "https://i.imgur.com/BEOiE4Q.png",
    // Buraya istediğiniz kadar fotoğraf URL'si ekleyebilirsiniz
];

const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const toggleAuthText = document.getElementById('toggle-auth-text');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

const loginUsernameInput = document.getElementById('login-username');
const signupUsernameInput = document.getElementById('signup-username');
const signupBioInput = document.getElementById('signup-bio');

const currentUserProfilePic = document.getElementById('current-user-profile-pic');
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

        // Benzersiz ID oluşturma (1000-5000 arası)
        let userId;
        let isIdUsed = true;
        while (isIdUsed) {
            userId = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000;
            const idDoc = await db.collection('users').where('userId', '==', userId).get();
            if (idDoc.empty) {
                isIdUsed = false;
            }
        }

        // Rastgele profil fotoğrafı seçimi
        const randomPicUrl = profilePictureUrls[Math.floor(Math.random() * profilePictureUrls.length)];

        // Firestore'a kullanıcı bilgilerini kaydetme
        await db.collection('users').add({
            userId: userId,
            username: username,
            bio: bio,
            profilePictureUrl: randomPicUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Kayıt başarılı, kullanıcıyı otomatik olarak giriş yaptır
        localStorage.setItem('currentUserUsername', username);
        localStorage.setItem('currentUserBio', bio);
        localStorage.setItem('currentUserProfilePic', randomPicUrl);
        localStorage.setItem('currentUserId', userId);

        showApp();
        loadUserProfile();
        alert("Kayıt başarılı! Hoş geldin, ID numaran: " + userId);

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
            const userId = userData.userId;

            // Başarılı giriş
            localStorage.setItem('currentUserUsername', username);
            localStorage.setItem('currentUserBio', userData.bio);
            localStorage.setItem('currentUserProfilePic', userData.profilePictureUrl);
            localStorage.setItem('currentUserId', userId);

            showApp();
            loadUserProfile();
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
    const profilePicUrl = localStorage.getItem('currentUserProfilePic');
    const userId = localStorage.getItem('currentUserId');

    if (username) {
        currentUserUsername.textContent = username + (userId ? ' (ID: ' + userId + ')' : '');
        currentUserBio.textContent = bio || "Biyografim";
        currentUserProfilePic.src = profilePicUrl || 'https://via.placeholder.com/80';
    }
}

// Hesabı silme işlemi
async function deleteAccount() {
    const username = localStorage.getItem('currentUserUsername');
    if (!username) {
        alert("Kullanıcı bulunamadı.");
        return;
    }

    if (confirm("Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
        try {
            const usersRef = db.collection('users');
            const querySnapshot = await usersRef.where('username', '==', username).get();

            if (!querySnapshot.empty) {
                const userDocId = querySnapshot.docs[0].id;
                await db.collection('users').doc(userDocId).delete();
                localStorage.clear();
                location.reload(); // Sayfayı yenile ve giriş ekranına dön
                alert("Hesabınız başarıyla silindi.");
            }
        } catch (error) {
            console.error("Hesap silinirken hata oluştu: ", error);
            alert("Hesap silinirken bir hata oluştu.");
        }
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
