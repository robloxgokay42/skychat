// HTML elementleri için yeni değişkenler
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

    // Kendi ID'sine mesaj atmasını engelle
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

    // Arayüzü güncelle
    chatPartnerUsername.textContent = partner.username;
    chatPartnerProfilePic.src = partner.profilePictureUrl || 'https://via.placeholder.com/40';
    chatMessages.innerHTML = '';
    messageInput.value = '';
    sendMessageButton.disabled = false;

    // Mesajları dinlemeye başla
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

    // Mesaj verisi
    const messageData = {
        senderId: currentUserId,
        text: messageText,
        createdAt: timestamp,
        readBy: [currentUserId] // Gönderen okundu olarak işaretler
    };

    try {
        await chatRef.collection('messages').add(messageData);
        messageInput.value = '';

        // İki tik (okundu) sistemi için karşı tarafı güncelleyebiliriz (İleri seviye)
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
