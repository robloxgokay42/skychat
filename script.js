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

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const profilePictureUrls = [
    "https://i.imgur.com/BDFeiYS.png",
    "https://i.imgur.com/NClcnsn.png",
    "https://i.imgur.com/CCy3TAj.png",
    "https://i.imgur.com/BEOiE4Q.png",
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

const createChatButton = document.getElementById('create-chat-button');
const createGroupButton = document.getElementById('create-group-button');
const createChatModal = document.getElementById('create-chat-modal');
const closeButton = document.querySelector('.close-button');
const modalTitle = document.getElementById('modal-title');
const modalInfo = document.getElementById('modal-info');
const targetIdsInput = document.getElementById('target-ids-input');
const groupNameInput = document.getElementById('group-name-input');
const findUsersButton = document.getElementById('find-users-button');
const startChatButton = document.getElementById('start-chat-button');
const userSearchStatus = document.getElementById('user-search-status');

const chatHeader = document.getElementById('chat-header');
const chatPartnerProfilePic = document.getElementById('chat-partner-profile-pic');
const chatPartnerUsername = document.getElementById('chat-partner-username');
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendMessageButton = document.getElementById('send-message-button');
const chatListUl = document.getElementById('chat-list-ul');

const groupMenuDropdown = document.getElementById('group-menu-dropdown');
const groupMenu = groupMenuDropdown.querySelector('.dropdown-content');

const addUserModal = document.getElementById('add-user-modal');
const addUserCloseButton = document.getElementById('add-user-close');
const addUserIdInput = document.getElementById('add-user-id');
const addUserToGroupButton = document.getElementById('add-user-to-group-button');

const closeChatButton = document.getElementById('close-chat-button');
const logoutButton = document.getElementById('logout-button'); // Yeni logout butonu
const deleteAccountButton = document.getElementById('delete-account-button'); // Yeni hesap sil butonu

let currentChatId = null;
let chatType = null;
let foundUsers = [];
let currentChatData = null;

function toggleAuthForms() {
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    signupForm.style.display = signupForm.style.display === 'none' ? 'block' : 'none';
    toggleAuthText.textContent = loginForm.style.display === 'none' ? 'Hesabın var mı? Giriş yap!' : 'Hesabın yok mu? Kayıt ol!';
}

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

        await db.collection('users').add({
            userId: userId,
            username: username,
            bio: bio,
            profilePictureUrl: profilePictureUrls[Math.floor(Math.random() * profilePictureUrls.length)],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        localStorage.setItem('currentUserUsername', username);
        localStorage.setItem('currentUserBio', bio);
        localStorage.setItem('currentUserProfilePic', (await db.collection('users').where('userId', '==', userId).get()).docs[0].data().profilePictureUrl);
        localStorage.setItem('currentUserId', userId);

        showApp();
        loadUserProfile();
        listenForChats();
        alert("Kayıt başarılı! Hoş geldin, ID numaran: " + userId);
    } catch (error) {
        console.error("Kayıt sırasında hata oluştu: ", error);
        alert("Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    }
}

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
            listenForChats();
            alert("Giriş başarılı!");
        }
    } catch (error) {
        console.error("Giriş sırasında hata oluştu: ", error);
        alert("Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.");
    }
}

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
}

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

async function deleteAccount() {
    const userId = localStorage.getItem('currentUserId');
    if (!userId) {
        alert("Kullanıcı bulunamadı.");
        return;
    }

    if (confirm("Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
        try {
            const usersRef = db.collection('users');
            const querySnapshot = await usersRef.where('userId', '==', parseInt(userId)).get();

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

window.onload = async () => {
    const username = localStorage.getItem('currentUserUsername');
    const userId = localStorage.getItem('currentUserId');
    
    if (username && userId) {
        try {
            const usersRef = db.collection('users');
            const querySnapshot = await usersRef.where('userId', '==', parseInt(userId)).limit(1).get();

            if (!querySnapshot.empty) {
                const userData = querySnapshot.docs[0].data();
                
                showApp();
                loadUserProfile();
                listenForChats();
            } else {
                localStorage.clear();
                location.reload();
            }
        } catch (error) {
            console.error("Kullanıcı verisi yüklenirken hata oluştu: ", error);
            localStorage.clear();
            location.reload();
        }
    }
};

// Event Listeners
toggleAuthText.onclick = toggleAuthForms;
loginForm.onsubmit = (e) => { e.preventDefault(); loginUser(); };
signupForm.onsubmit = (e) => { e.preventDefault(); signupUser(); };
logoutButton.onclick = () => { localStorage.clear(); location.reload(); };
deleteAccountButton.onclick = deleteAccount;


createChatButton.onclick = () => {
    modalTitle.textContent = 'Yeni Sohbet Oluştur';
    modalInfo.textContent = 'Mesajlaşmak istediğiniz kişinin ID\'sini girin:';
    targetIdsInput.placeholder = 'Kullanıcı ID\'si';
    groupNameInput.style.display = 'none';
    chatType = 'private';
    createChatModal.style.display = 'block';
    targetIdsInput.value = '';
    userSearchStatus.textContent = '';
    startChatButton.disabled = true;
};

createGroupButton.onclick = () => {
    modalTitle.textContent = 'Grup Sohbeti Oluştur';
    modalInfo.textContent = 'Gruba eklemek istediğiniz kullanıcıların ID\'lerini girin (virgülle ayırın):';
    targetIdsInput.placeholder = 'ID\'ler (örn: 1234, 5678, 9101)';
    groupNameInput.style.display = 'block';
    chatType = 'group';
    createChatModal.style.display = 'block';
    targetIdsInput.value = '';
    groupNameInput.value = '';
    userSearchStatus.textContent = '';
    startChatButton.disabled = true;
};

closeButton.onclick = () => {
    createChatModal.style.display = 'none';
};

window.onclick = (event) => {
    if (event.target == createChatModal) {
        createChatModal.style.display = 'none';
    }
    if (event.target == addUserModal) {
        addUserModal.style.display = 'none';
    }
};

addUserCloseButton.onclick = () => {
    addUserModal.style.display = 'none';
};

findUsersButton.onclick = async () => {
    const currentUserId = parseInt(localStorage.getItem('currentUserId'));
    const targetIds = targetIdsInput.value.trim().split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

    if (targetIds.length === 0) {
        userSearchStatus.textContent = 'Lütfen geçerli ID\'ler girin.';
        startChatButton.disabled = true;
        return;
    }

    const allIds = [...new Set([...targetIds, currentUserId])];
    
    if (allIds.length === 1) {
        userSearchStatus.textContent = 'Kendi kendine sohbet başlatamazsın.';
        startChatButton.disabled = true;
        return;
    }

    userSearchStatus.textContent = 'Kullanıcılar aranıyor...';
    startChatButton.disabled = true;

    try {
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('userId', 'in', allIds).get();

        if (querySnapshot.docs.length === allIds.length) {
            foundUsers = querySnapshot.docs.map(doc => doc.data());
            userSearchStatus.textContent = 'Tüm kullanıcılar bulundu!';
            startChatButton.disabled = false;
        } else {
            userSearchStatus.textContent = 'Bazı kullanıcılar bulunamadı.';
            startChatButton.disabled = true;
        }
    } catch (error) {
        console.error("Kullanıcı arama hatası: ", error);
        userSearchStatus.textContent = 'Bir hata oluştu.';
        startChatButton.disabled = true;
    }
};

startChatButton.onclick = async () => {
    if (foundUsers.length === 0) {
        return;
    }

    let chatDocId;
    let chatName;
    let chatPicUrl;
    const currentUserId = parseInt(localStorage.getItem('currentUserId'));

    if (chatType === 'private') {
        const partner = foundUsers.find(user => user.userId !== currentUserId);
        if (partner) {
            chatDocId = [currentUserId, partner.userId].sort().join('_');
            chatName = partner.username;
            chatPicUrl = partner.profilePictureUrl;
        }
    } else if (chatType === 'group') {
        const groupName = groupNameInput.value.trim();
        if (!groupName) {
            alert("Grup adı boş olamaz!");
            return;
        }
        chatDocId = `group_${Date.now()}`;
        chatName = groupName;
        chatPicUrl = 'https://via.placeholder.com/40'; // Grup sohbetleri için varsayılan resim
    }
    
    const participants = foundUsers.map(user => user.userId);
    const chatRef = await createOrGetChat(chatDocId, chatType, participants, chatName);
    const chatData = (await chatRef.get()).data();
    startChat(chatDocId, chatName, chatPicUrl, chatData);

    createChatModal.style.display = 'none';
};

async function createOrGetChat(chatId, type, participants, chatName = null) {
    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
        await chatRef.set({
            type: type,
            participants: participants,
            name: chatName,
            ownerId: type === 'group' ? parseInt(localStorage.getItem('currentUserId')) : null,
            admins: type === 'group' ? [parseInt(localStorage.getItem('currentUserId'))] : null,
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    return chatRef;
}

function startChat(chatDocId, chatName, picUrl, chatData = null) {
    currentChatId = chatDocId;
    currentChatData = chatData;
    chatPartnerUsername.textContent = chatName;
    chatPartnerProfilePic.src = picUrl || 'https://via.placeholder.com/40';
    chatMessages.innerHTML = '';
    messageInput.value = '';
    sendMessageButton.disabled = false;
    
    const currentUserId = parseInt(localStorage.getItem('currentUserId'));

    if (chatData && chatData.type === 'group' && chatData.ownerId === currentUserId) {
        groupMenuDropdown.style.display = 'inline-block';
    } else {
        groupMenuDropdown.style.display = 'none';
    }

    document.getElementById('main-content').style.display = 'flex';
    listenForMessages(chatDocId);
}

sendMessageButton.onclick = async () => {
    const messageText = messageInput.value.trim();
    if (messageText === '' || !currentChatId) {
        return;
    }

    const currentUserId = parseInt(localStorage.getItem('currentUserId'));
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const chatRef = db.collection('chats').doc(currentChatId);

    const messageData = {
        senderId: currentUserId,
        text: messageText,
        createdAt: timestamp,
    };

    try {
        await chatRef.collection('messages').add(messageData);
        await chatRef.update({
            lastMessageText: messageText, // Son mesajı da güncelliyoruz
            lastMessageSender: currentUserId,
            lastMessageAt: timestamp,
        });
        messageInput.value = '';
    } catch (error) {
        console.error("Mesaj gönderme hatası: ", error);
    }
};

let unsubscribeMessages = null;
function listenForMessages(chatId) {
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    const messagesRef = db.collection('chats').doc(chatId).collection('messages').orderBy('createdAt');
    unsubscribeMessages = messagesRef.onSnapshot((snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const message = doc.data();
            displayMessage(message);
        });
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

let unsubscribeChats = null;
async function listenForChats() {
    if (unsubscribeChats) {
        unsubscribeChats();
    }

    const currentUserId = parseInt(localStorage.getItem('currentUserId'));
    const chatsRef = db.collection('chats');

    unsubscribeChats = chatsRef.where('participants', 'array-contains', currentUserId)
        .orderBy('lastMessageAt', 'desc')
        .onSnapshot(async (snapshot) => {
            chatListUl.innerHTML = '';
            for (const doc of snapshot.docs) {
                const chatData = doc.data();
                
                let chatName = '';
                let chatPicUrl = 'https://via.placeholder.com/40';
                let lastMessageText = chatData.lastMessageText || "Henüz mesaj yok.";
                let lastMessageTime = '';

                if (chatData.lastMessageAt && chatData.lastMessageAt.toDate) {
                    lastMessageTime = formatTimestamp(chatData.lastMessageAt.toDate());
                }
                
                if (chatData.type === 'private') {
                    const partnerId = chatData.participants.find(id => id !== currentUserId);
                    if (partnerId) {
                        const partnerDoc = await db.collection('users').where('userId', '==', partnerId).get();
                        if (!partnerDoc.empty) {
                            const partnerData = partnerDoc.docs[0].data();
                            chatName = partnerData.username;
                            chatPicUrl = partnerData.profilePictureUrl;
                        } else {
                             chatName = 'Kullanıcı Bulunamadı';
                        }
                    }
                } else if (chatData.type === 'group') {
                    chatName = chatData.name || 'Grup Sohbeti';
                    chatPicUrl = 'https://via.placeholder.com/40';
                    if (chatData.lastMessageSender) {
                        const senderDoc = await db.collection('users').where('userId', '==', chatData.lastMessageSender).get();
                        if (!senderDoc.empty) {
                            lastMessageText = `${senderDoc.docs[0].data().username}: ${lastMessageText}`;
                        }
                    }
                }

                displayChatItem(doc.id, chatName, chatPicUrl, lastMessageText, lastMessageTime, chatData);
            }
        });
}

function displayChatItem(chatId, chatName, picUrl, lastMessageText, lastMessageTime, chatData) {
    const listItem = document.createElement('li');
    listItem.onclick = () => {
        const mainContent = document.getElementById('main-content');
        if (window.innerWidth <= 768) {
             mainContent.style.display = 'flex';
        }
        startChat(chatId, chatName, picUrl, chatData);
    };

    const img = document.createElement('img');
    img.src = picUrl || 'https://via.placeholder.com/40';
    img.classList.add('chat-item-pic');

    const infoDiv = document.createElement('div');
    infoDiv.classList.add('chat-item-info');
    infoDiv.innerHTML = `
        <strong>${chatName}</strong>
        <p>${lastMessageText}</p>
    `;

    const timeSpan = document.createElement('span');
    timeSpan.classList.add('chat-item-time');
    timeSpan.textContent = lastMessageTime;

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '&#x1F5D1;';
    deleteBtn.classList.add('chat-item-delete');
    deleteBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`"${chatName}" ile olan sohbeti silmek istediğinizden emin misiniz?`)) {
            await deleteChat(chatId);
        }
    };

    listItem.appendChild(img);
    listItem.appendChild(infoDiv);
    listItem.appendChild(timeSpan);
    listItem.appendChild(deleteBtn);
    chatListUl.appendChild(listItem);
}

async function deleteChat(chatId) {
    try {
        const chatRef = db.collection('chats').doc(chatId);
        const messagesSnapshot = await chatRef.collection('messages').get();
        const batch = db.batch();

        messagesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        await chatRef.delete();
        // Sohbet silindikten sonra açık olan sohbeti kapat
        closeChat();
        alert("Sohbet başarıyla silindi.");
    } catch (error) {
        console.error("Sohbet silme hatası: ", error);
        alert("Sohbet silinirken bir hata oluştu.");
    }
}

function displayMessage(message) {
    const currentUserId = parseInt(localStorage.getItem('currentUserId'));
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble');
    messageBubble.classList.add(message.senderId == currentUserId ? 'sent' : 'received');

    messageBubble.textContent = message.text;
    chatMessages.appendChild(messageBubble);
}

groupMenuDropdown.querySelector('.dropbtn').onclick = () => {
    groupMenu.style.display = groupMenu.style.display === 'block' ? 'none' : 'block';
};

window.onclick = (event) => {
    if (!event.target.matches('.dropbtn')) {
        const dropdowns = document.getElementsByClassName("dropdown-content");
        for (let i = 0; i < dropdowns.length; i++) {
            const openDropdown = dropdowns[i];
            if (openDropdown.style.display === 'block') {
                openDropdown.style.display = 'none';
            }
        }
    }
};

document.getElementById('add-user-to-group').onclick = () => {
    if (currentChatId && currentChatData.type === 'group') {
        addUserModal.style.display = 'block';
    } else {
        alert("Bu işlem sadece grup sohbetlerinde kullanılabilir.");
    }
    groupMenu.style.display = 'none';
};

addUserToGroupButton.onclick = async () => {
    const userIdToAdd = parseInt(addUserIdInput.value.trim());
    if (isNaN(userIdToAdd)) {
        alert("Lütfen geçerli bir kullanıcı ID'si girin.");
        return;
    }
    
    try {
        const userDoc = await db.collection('users').where('userId', '==', userIdToAdd).get();
        if (userDoc.empty) {
            alert("Kullanıcı bulunamadı.");
            return;
        }

        const chatRef = db.collection('chats').doc(currentChatId);
        await chatRef.update({
            participants: firebase.firestore.FieldValue.arrayUnion(userIdToAdd)
        });
        
        alert("Kullanıcı gruba başarıyla eklendi!");
        addUserModal.style.display = 'none';
        addUserIdInput.value = '';
    } catch (error) {
        console.error("Kullanıcı ekleme hatası: ", error);
        alert("Kullanıcı eklenirken bir hata oluştu.");
    }
};

document.getElementById('remove-user-from-group').onclick = () => {
    alert("Kullanıcı Atma özelliği yakında eklenecek.");
    groupMenu.style.display = 'none';
};

document.getElementById('manage-permissions').onclick = () => {
    alert("Üye İzinleri ayarlama özelliği yakında eklenecek.");
    groupMenu.style.display = 'none';
};

document.getElementById('make-admin').onclick = () => {
    alert("Yönetici Yapma özelliği yakında eklenecek.");
    groupMenu.style.display = 'none';
};

document.getElementById('transfer-ownership').onclick = () => {
    alert("Grup sahipliğini devretme özelliği yakında eklenecek.");
    groupMenu.style.display = 'none';
};

function closeChat() {
    document.getElementById('main-content').style.display = 'none';
    currentChatId = null;
    currentChatData = null;
    // Sohbet listesinin tekrar yüklenmesi için gerek yok çünkü onSnapshot zaten dinliyor.
    // Ancak mobil görünümde tekrar sidebar'a dönmek için bunu kullanabiliriz:
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').style.display = 'flex'; // sidebar'ı tekrar göster
    }
}

closeChatButton.onclick = closeChat;


// Zaman damgalarını daha okunaklı hale getiren yardımcı fonksiyon
function formatTimestamp(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const oneDay = 1000 * 60 * 60 * 24;

    if (diff < oneDay && date.getDate() === now.getDate()) {
        // Bugün
        return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    } else if (diff < oneDay * 2 && date.getDate() === now.getDate() - 1) {
        // Dün
        return "Dün";
    } else if (diff < oneDay * 7) {
        // Bu hafta (gün adı)
        const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
        return days[date.getDay()];
    } else {
        // Daha eski (tarih)
        return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}
