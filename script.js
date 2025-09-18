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
];

// HTML elementleri için değişkenler
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

const createChatButton = document.getElementById('create-chat-button');
const createChatModal = document.getElementById('create-chat-modal');
const closeButton = document.querySelector('.close-button');
const targetIdInput = document.getElementById('target-id-input');
const findUserButton = document.getElementById('find-user-button');
const startChatButton = document.getElementById('start-chat-button');
const userSearchStatus = document.getElementById('user-search-status');

const chatHeader = document.getElementById('chat-header');
const chatPartnerProfilePic = document.getElementById('chat-partner-profile-pic');
const chatPartnerUsername = document.getElementById('chat-partner-username');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendMessageButton = document.getElementById('send-message-button');

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
        const userDoc = await db.collection('users').where('username', '==', username).get();
        if (!userDoc.empty) {
            alert("Bu kullanıcı adı zaten kullanılıyor!");
            return;
        }

        let userId;
        let isIdUsed = true;
        while (isIdUsed) {
            userId = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000;
            const idDoc = await db.collection('users').where('userId', '==', userId).get();
            if (idDoc.empty) {
                isIdUsed = false;
            }
        }

        const randomPicUrl = profilePictureUrls[Math.floor(Math.random() * profilePictureUrls.length)];

        await db.collection('users').add({
            userId: userId,
            username: username,
            bio: bio,
            profilePictureUrl: randomPicUrl,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

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
                location.reload();
                alert("Hesabınız başarıyla silindi.");
            }
        } catch (error) {
            console.error("Hesap silinirken hata oluştu: ", error);
            alert("Hesap silinirken bir hata oluştu.");
        }
    }
}

// Uygulama başladığında ve sayfa yenilendiğinde
window.onload = async () => {
    const username = localStorage.getItem('currentUserUsername');
    
    if (username) {
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('username', '==', username).limit(1).get();

        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            
            if (!userData.userId) {
                let newUserId;
                let isIdUsed = true;
                while (isIdUsed) {
                    newUserId = Math.floor(Math.random() * (5000 - 1000 + 1)) + 1000;
                    const idDoc = await db.collection('users').where('userId', '==', newUserId).get();
                    if (idDoc.empty) {
                        isIdUsed = false;
                    }
                }
                const newPicUrl = profilePictureUrls[Math.floor(Math.random() * profilePictureUrls.length)];

                await querySnapshot.docs[0].ref.update({
                    userId: newUserId,
                    profilePictureUrl: newPicUrl
                });

                localStorage.setItem('currentUserId', newUserId);
                localStorage.setItem('currentUserProfilePic', newPicUrl);
            } else {
                localStorage.setItem('currentUserId', userData.userId);
                localStorage.setItem('currentUserProfilePic', userData.profilePictureUrl);
            }
            
            showApp();
            loadUserProfile();
        } else {
            localStorage.clear();
            location.reload();
        }
    }
};

// Sohbet oluşturma modalını açma
createChatButton.onclick = () => {
    createChatModal.style.display = 'block';
    targetIdInput.value = '';
    userSearchStatus.textContent = '';
    startChatButton.disabled = true;
};

// Modal kapatma
closeButton.onclick = () => {
    createChatModal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target == createChatModal) {
        createChatModal.style.display = 'none';
    }
};

// Kullanıcıyı ID'ye göre bulma
let foundUser = null;
findUserButton.onclick = async () => {
    const targetId = parseInt(targetIdInput.value.trim());
    if (isNaN(targetId)) {
        userSearchStatus.textContent = 'Lütfen geçerli bir ID girin.';
        startChatButton.disabled = true;
        return;
    }

    if (targetId === parseInt(localStorage.getItem('currentUserId'))) {
        userSearchStatus.textContent = 'Kendi kendine mesaj atamazsın.';
        startChatButton.disabled = true;
        return;
    }

    userSearchStatus.textContent = 'Kullanıcı aranıyor...';
    startChatButton.disabled = true;

    try {
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('userId', '==', targetId).limit(1).get();

        if (!querySnapshot.empty) {
            foundUser = querySnapshot.docs[0].data();
            userSearchStatus.textContent = `${foundUser.username} bulundu!`;
            startChatButton.disabled = false;
        } else {
            userSearchStatus.textContent = 'Kullanıcı bulunamadı.';
            startChatButton.disabled = true;
        }
    } catch (error) {
        console.error("Kullanıcı arama hatası: ", error);
        userSearchStatus.textContent = 'Bir hata oluştu.';
        startChatButton.disabled = true;
    }
};

// Sohbet başlatma
startChatButton.onclick = () => {
    if (foundUser) {
        const currentUser = {
            id: localStorage.getItem('currentUserId'),
            username: localStorage.getItem('currentUserUsername'),
            profilePic: localStorage.getItem('currentUserProfilePic')
        };
        startChat(currentUser, foundUser);
        createChatModal.style.display = 'none';
    }
};

// Yeni sohbet başlatma ve mesajları dinleme fonksiyonu
let currentChatPartnerId = null;
function startChat(currentUser, partner) {
    currentChatPartnerId = partner.userId;

    chatPartnerUsername.textContent = partner.username;
    chatPartnerProfilePic.src = partner.profilePictureUrl || 'https://via.placeholder.com/40';
    chatMessages.innerHTML = '';
    messageInput.value = '';
    sendMessageButton.disabled = false;

    listenForMessages(currentUser.id, partner.userId);
}

// Mesaj gönderme
sendMessageButton.onclick = async () => {
    const messageText = messageInput.value.trim();
    if (messageText === '' || !currentChatPartnerId) {
        return;
    }

    const currentUserId = localStorage.getItem('currentUserId');
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const chatDocId = [currentUserId, currentChatPartnerId].sort().join('_');
    const chatRef = db.collection('chats').doc(chatDocId);

    const messageData = {
        senderId: currentUserId,
        text: messageText,
        createdAt: timestamp,
        readBy: [currentUserId]
    };

    try {
        await chatRef.collection('messages').add(messageData);
        messageInput.value = '';
    } catch (error) {
        console.error("Mesaj gönderme hatası: ", error);
    }
};

// Mesajları dinleme ve ekrana basma
function listenForMessages(currentUserId, partnerId) {
    const chatDocId = [currentUserId, partnerId].sort().join('_');
    const messagesRef = db.collection('chats').doc(chatDocId).collection('messages').orderBy('createdAt');

    messagesRef.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
                const message = change.doc.data();
                displayMessage(message);
            }
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// Mesaj baloncuklarını ekrana basma
function displayMessage(message) {
    const currentUserId = localStorage.getItem('currentUserId');
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    messageBubble.classList.add(message.senderId == currentUserId ? 'sent' : 'received');

    messageBubble.textContent = message.text;
    chatMessages.appendChild(messageBubble);
}
