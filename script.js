// Firebase'i başlatma (FirebaseConfig'iniz doğru varsayılmıştır)
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

const auth = firebase.auth(); // Auth modülü henüz kullanılmıyor ama ileride gerekebilir.
const db = firebase.firestore();
const storage = firebase.storage();

// DOM Elementleri
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const toggleAuthText = document.getElementById('toggle-auth-text');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

const loginUsernameInput = document.getElementById('login-username');
const signupUsernameInput = document.getElementById('signup-username');
const signupBioInput = document.getElementById('signup-bio');
const signupProfilePicInput = document.getElementById('signup-profile-pic');

const currentUserProfilePic = document.getElementById('current-user-profile-pic');
const currentUserUsername = document.getElementById('current-user-username');
const currentUserBio = document.getElementById('current-user-bio');

// --- Fonksiyonlar ---

// Kullanıcı girişi/kaydı arasında geçiş yapma
function toggleAuthForms() {
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    signupForm.style.display = signupForm.style.display === 'none' ? 'block' : 'none';
    toggleAuthText.textContent = loginForm.style.display === 'none' ? 'Hesabın var mı? Giriş yap!' : 'Hesabın yok mu? Kayıt ol!';
}

// Profil fotoğrafını yükleme ve URL'sini alma
async function uploadProfilePicture(file) {
    if (!file) return null;
    // Dosya adını daha benzersiz hale getirelim
    const timestamp = Date.now();
    const fileName = `${timestamp}_${file.name}`;
    const storageRef = storage.ref(`profilePictures/${fileName}`);

    try {
        const snapshot = await storageRef.put(file);
        return await snapshot.ref.getDownloadURL();
    } catch (error) {
        console.error("Profil fotoğrafı yüklenirken hata oluştu: ", error);
        throw error; // Hata tekrar fırlatılırsa üstteki catch bloğu yakalar
    }
}

// Yeni kullanıcı kaydetme
async function signupUser() {
    const username = signupUsernameInput.value.trim();
    const bio = signupBioInput.value.trim();
    const profilePicFile = signupProfilePicInput.files[0];

    if (!username) {
        alert("Kullanıcı adı boş olamaz!");
        return;
    }

    try {
        // Kullanıcı adının benzersizliğini kontrol et
        const usersRef = db.collection('users');
        const usernameQuery = usersRef.where('username', '==', username).limit(1);
        const userDocSnapshot = await usernameQuery.get();

        if (!userDocSnapshot.empty) {
            alert("Bu kullanıcı adı zaten kullanılıyor!");
            return;
        }

        let profilePicUrl = null;
        if (profilePicFile) {
            profilePicUrl = await uploadProfilePicture(profilePicFile);
        }

        // Kullanıcıyı Firestore'a ekle
        await usersRef.add({
            username: username,
            bio: bio || '', // Biyografi boşsa boş string ata
            profilePictureUrl: profilePicUrl || 'https://via.placeholder.com/80', // Varsayılan avatar URL'si
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("Kayıt başarılı! Lütfen giriş yapın.");
        toggleAuthForms(); // Kayıt sonrası giriş formuna dön
        // Form alanlarını temizle
        signupUsernameInput.value = '';
        signupBioInput.value = '';
        signupProfilePicInput.value = ''; // Dosya input'unu sıfırlama

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
            const userDoc = querySnapshot.docs[0];
            const userData = userDoc.data();

            // Kullanıcı bilgilerini localStorage'a kaydet
            localStorage.setItem('currentUserUsername', username);
            localStorage.setItem('currentUserProfilePic', userData.profilePictureUrl);
            localStorage.setItem('currentUserBio', userData.bio);
            localStorage.setItem('currentUserId', userDoc.id); // ID'yi de saklayalım

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
    appContainer.style.display = 'flex'; // flex yaptım ki profile ve chat yan yana dursun
}

// Profil bilgilerini yükleme
function loadUserProfile() {
    const username = localStorage.getItem('currentUserUsername');
    const profilePicUrl = localStorage.getItem('currentUserProfilePic');
    const bio = localStorage.getItem('currentUserBio');

    if (username) {
        currentUserUsername.textContent = username;
        currentUserBio.textContent = bio || "Biyografim"; // Biyografi yoksa varsayılan
        currentUserProfilePic.src = profilePicUrl || 'https://via.placeholder.com/80'; // Varsayılan avatar
    }
}

// Uygulama yüklendiğinde kullanıcı oturumunu kontrol et
window.onload = () => {
    const username = localStorage.getItem('currentUserUsername');
    if (username) {
        showApp();
        loadUserProfile();
    }
};

// --- İleride Eklenecekler ---
// Yeni mesaj gönderme fonksiyonu
// Sohbet geçmişini yükleme
// Grup oluşturma/katılma
// Mesaj düzenleme/kopyalama
