// Firebase yapılandırması
const firebaseConfig = {
  apiKey: "AIzaSyD4e2l_0Xs5Ie5brTW79aARxXWg_AJYof4",
  authDomain: "skychat-5decd.firebaseapp.com",
  projectId: "skychat-5decd",
  storageBucket: "skychat-5decd.firebasestorage.app",
  messagingSenderId: "410944380555",
  appId: "1:410944380555:web:1eb77e04265fab183fbe8e",
  measurementId: "G-7YSVH37SGM"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const database = firebase.database();

// DOM Elementleri
const profilePic = document.getElementById('profile-pic');
const userName = document.getElementById('user-name');
const userBio = document.getElementById('user-bio');
const editProfileBtn = document.getElementById('edit-profile-btn');
const contactList = document.getElementById('contact-list');
const groupList = document.getElementById('group-list');
const currentChatName = document.getElementById('current-chat-name');
const messageBox = document.getElementById('message-box');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');

// Kullanıcı Verileri
let currentUser = null;
let currentChatId = null; // Sohbet edilen kişinin veya grubun ID'si
let currentChatType = null; // 'user' veya 'group'

// --- Kullanıcı İşlemleri ---

// Rastgele bir ID oluşturucu (1000-5000 arası)
function generateUserId() {
    return Math.floor(Math.random() * 4001) + 1000;
}

// Kullanıcı profili oluşturma ve güncelleme
async function updateProfile() {
    if (!currentUser) return;

    const name = prompt("Adınızı girin:", userName.textContent);
    if (!name) return;

    const bio = prompt("Biyografinizi girin:", userBio.textContent);

    // Profil resmi yükleme (opsiyonel, şimdilik varsayılan kullanıyoruz)
    // const fileInput = document.createElement('input');
    // fileInput.type = 'file';
    // fileInput.accept = 'image/*';
    // fileInput.click();
    // fileInput.onchange = async (e) => {
    //     const file = e.target.files[0];
    //     if (file) {
    //         const storageRef = firebase.storage().ref('profile-pics/' + currentUser.uid);
    //         await storageRef.put(file);
    //         const downloadURL = await storageRef.getDownloadURL();
    //         profilePic.src = downloadURL;
    //         await database.ref('users/' + currentUser.uid).update({ photoURL: downloadURL });
    //     }
    // };

    userName.textContent = name;
    userBio.textContent = bio || ""; // Biyografi boş olabilir

    await database.ref('users/' + currentUser.uid).update({
        displayName: name,
        bio: bio || ""
    });
}

// Kullanıcı bilgilerini yükleme
function loadUserProfile(userId, displayName, bio, photoURL) {
    userName.textContent = displayName || `Kullanıcı ${userId}`;
    userBio.textContent = bio || "Merhaba!";
    profilePic.src = photoURL || 'default-avatar.png'; // Varsayılan avatar
}

// --- Sohbet Listesi ve Gruplar ---

// Kişi ekleme (ID ile)
async function addContact() {
    const contactId = prompt("Mesajlaşmak istediğiniz kişinin ID'sini girin:");
    if (!contactId || !currentUser || contactId === String(currentUser.uid)) return;

    // Kontrol edelim, böyle bir kullanıcı var mı?
    const userSnapshot = await database.ref('users/' + contactId).once('value');
    if (userSnapshot.exists()) {
        // Kullanıcıyı mevcut kişilere ekle (kendi listenize)
        const userRef = database.ref('users/' + currentUser.uid + '/contacts/' + contactId);
        userRef.set(true); // Sadece varlığını belirtmek için
        loadContacts(); // Listeyi güncelle
        alert("Kişi başarıyla eklendi!");
    } else {
        alert("Bu ID'ye sahip bir kullanıcı bulunamadı.");
    }
}

// Grup oluşturma
async function createGroup() {
    const groupName = prompt("Grup adı girin:");
    if (!groupName || !currentUser) return;

    const membersString = prompt("Grup üyelerinin ID'lerini virgülle ayırarak girin (örn: 1234,5678):");
    if (!membersString) return;

    const memberIds = membersString.split(',').map(id => id.trim()).filter(id => id);
    if (memberIds.length === 0) {
        alert("Lütfen en az bir üye ekleyin.");
        return;
    }

    const groupId = `group_${Date.now()}`; // Benzersiz grup ID'si
    const newGroup = {
        name: groupName,
        createdBy: currentUser.uid,
        createdAt: Date.now(),
        members: {
            [currentUser.uid]: true, // Oluşturan kişi de üye
            ...memberIds.reduce((acc, id) => {
                acc[id] = true;
                return acc;
            }, {})
        },
        admins: {
            [currentUser.uid]: true // Oluşturan kişi yönetici
        }
    };

    await database.ref('groups/' + groupId).set(newGroup);
    await database.ref('users/' + currentUser.uid + '/groups/' + groupId).set(true); // Kullanıcının gruplar listesine ekle
    memberIds.forEach(async id => {
        // Diğer üyelerin de gruplar listesine ekleyelim
        await database.ref('users/' + id + '/groups/' + groupId).set(true);
    });

    loadGroups(); // Grup listesini güncelle
    alert("Grup başarıyla oluşturuldu!");
}

// Birini gruba ekleme
async function addUserToGroup(groupId) {
    if (!groupId || !currentUser) return;

    const userIdToAdd = prompt("Eklemek istediğiniz kullanıcının ID'sini girin:");
    if (!userIdToAdd) return;

    // Grupta yönetici mi kontrolü (şimdilik atlıyoruz, sonradan eklenebilir)

    const groupRef = database.ref('groups/' + groupId);
    const groupSnapshot = await groupRef.once('value');

    if (groupSnapshot.exists()) {
        const groupData = groupSnapshot.val();
        // Üye zaten var mı kontrolü
        if (groupData.members && groupData.members[userIdToAdd]) {
            alert("Bu kullanıcı zaten grupta.");
            return;
        }

        // Kullanıcının varlığını kontrol et
        const userSnapshot = await database.ref('users/' + userIdToAdd).once('value');
        if (userSnapshot.exists()) {
            // Gruba üyeyi ekle
            await groupRef.update({
                [`members/${userIdToAdd}`]: true
            });
            // Kullanıcının kendi gruplar listesine de ekle
            await database.ref('users/' + userIdToAdd + '/groups/' + groupId).set(true);
            alert("Kullanıcı başarıyla gruba eklendi!");
            // Gerekirse sohbet arayüzünü güncelle
            if (currentChatId === groupId && currentChatType === 'group') {
                loadChat(groupId, 'group');
            }
        } else {
            alert("Bu ID'ye sahip bir kullanıcı bulunamadı.");
        }
    } else {
        alert("Grup bulunamadı.");
    }
}

// Grup yöneticilerini yönetme (Basitleştirilmiş versiyon)
async function manageGroupAdmins(groupId) {
    if (!groupId || !currentUser) return;

    const groupRef = database.ref('groups/' + groupId);
    const groupSnapshot = await groupRef.once('value');
    const groupData = groupSnapshot.val();

    if (!groupData || !groupData.admins || !groupData.admins[currentUser.uid]) {
        alert("Bu grubu yönetme izniniz yok.");
        return;
    }

    const choice = prompt("Yönetici eklemek (add) veya kaldırmak (remove) için yazın. Üye ID'sini girin.");
    if (!choice || !userIdToAdd) return;

    const [action, userId] = choice.split(' '); // Örn: "add 1234" veya "remove 5678"

    if (action === 'add') {
        if (groupData.members && groupData.members[userId]) {
            await groupRef.update({
                [`admins/${userId}`]: true
            });
            alert("Yönetici başarıyla eklendi.");
        } else {
            alert("Kullanıcı grupta değil.");
        }
    } else if (action === 'remove') {
        if (groupData.admins && groupData.admins[userId] && userId !== groupData.createdBy) { // Oluşturan kişi silinemez
            await groupRef.update({
                [`admins/${userId}`]: null
            });
            alert("Yönetici başarıyla kaldırıldı.");
        } else {
            alert("Bu kullanıcı yönetici değil veya kaldırılamaz.");
        }
    } else {
        alert("Geçersiz komut. 'add [ID]' veya 'remove [ID]' şeklinde girin.");
    }
}

// Kişi ve grup listelerini yükleme
async function loadContacts() {
    if (!currentUser) return;
    contactList.innerHTML = ''; // Önce temizle
    const contactsSnapshot = await database.ref('users/' + currentUser.uid + '/contacts').once('value');
    if (contactsSnapshot.exists()) {
        contactsSnapshot.forEach(async contact => {
            const userId = contact.key;
            const contactDataSnapshot = await database.ref('users/' + userId).once('value');
            if (contactDataSnapshot.exists()) {
                const userData = contactDataSnapshot.val();
                const li = document.createElement('li');
                li.textContent = userData.displayName || `Kullanıcı ${userId}`;
                li.dataset.userId = userId;
                li.dataset.chatType = 'user';
                li.addEventListener('click', () => startChat(userId, 'user', userData.displayName || `Kullanıcı ${userId}`));
                contactList.appendChild(li);
            }
        });
    }
}

async function loadGroups() {
    if (!currentUser) return;
    groupList.innerHTML = ''; // Önce temizle
    const groupsSnapshot = await database.ref('users/' + currentUser.uid + '/groups').once('value');
    if (groupsSnapshot.exists()) {
        groupsSnapshot.forEach(async group => {
            const groupId = group.key;
            const groupDataSnapshot = await database.ref('groups/' + groupId).once('value');
            if (groupDataSnapshot.exists()) {
                const groupData = groupDataSnapshot.val();
                const li = document.createElement('li');
                li.textContent = groupData.name;
                li.dataset.groupId = groupId;
                li.dataset.chatType = 'group';
                li.addEventListener('click', () => startChat(groupId, 'group', groupData.name));
                groupList.appendChild(li);
            }
        });
    }
}

// --- Mesajlaşma Sistemi ---

// Mesaj gönderme
async function sendMessage() {
    if (!messageInput.value.trim() || !currentUser || !currentChatId) return;

    const messageText = messageInput.value.trim();
    const timestamp = Date.now();

    const messageData = {
        senderId: currentUser.uid,
        text: messageText,
        timestamp: timestamp,
        isEdited: false
    };

    // Mesajı veritabanına kaydet
    const newMessageRef = database.ref(`${currentChatType}s/${currentChatId}/messages`).push();
    await newMessageRef.set(messageData);

    messageInput.value = ''; // Girişi temizle

    // Sohbeti güncelle (mesajın görünmesi için)
    loadChat(currentChatId, currentChatType);
}

// Sohbeti yükleme
function loadChat(chatId, chatType) {
    currentChatId = chatId;
    currentChatType = chatType;
    messageBox.innerHTML = ''; // Önce mesaj kutusunu temizle

    let chatHeaderName = '';
    let chatInfo = '';

    if (chatType === 'user') {
        const contactElement = document.querySelector(`.contacts ul li[data-user-id="${chatId}"]`);
        chatHeaderName = contactElement ? contactElement.textContent : `Kullanıcı ${chatId}`;
        chatInfo = `ID: ${chatId}`;
    } else if (chatType === 'group') {
        const groupElement = document.querySelector(`.groups ul li[data-group-id="${chatId}"]`);
        chatHeaderName = groupElement ? groupElement.textContent : "Grup";
        chatInfo = `Grup ID: ${chatId}`;
    }

    currentChatName.textContent = chatHeaderName;
    document.getElementById('chat-info').textContent = chatInfo;

    // Aktif sohbeti vurgula
    document.querySelectorAll('.sidebar ul li').forEach(item => item.classList.remove('active'));
    const activeElement = document.querySelector(`[data-${chatType}-id="${chatId}"]`);
    if (activeElement) activeElement.classList.add('active');

    // Mesajları çek ve göster
    const messagesRef = database.ref(`${chatType}s/${chatId}/messages`).orderByChild('timestamp');
    messagesRef.on('value', snapshot => {
        messageBox.innerHTML = ''; // Her güncellemede temizle
        snapshot.forEach(messageSnapshot => {
            const message = messageSnapshot.val();
            const messageId = messageSnapshot.key;
            displayMessage(message, messageId, currentChatType === 'group' ? message.senderId : null);
        });
        // Mesaj kutusunu aşağı kaydır
        messageBox.scrollTop = messageBox.scrollHeight;
    });
}

// Mesajları ekrana yazdır
function displayMessage(message, messageId, senderId = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.dataset.messageId = messageId;

    const isSentByCurrentUser = message.senderId === (currentUser ? currentUser.uid : null);

    if (isSentByCurrentUser) {
        messageDiv.classList.add('sent');
    } else {
        messageDiv.classList.add('received');
        if (senderId) { // Grup mesajlarında gönderen ID'sini göster
            const senderNameSnapshot = await database.ref('users/' + senderId).once('value');
            const senderName = senderNameSnapshot.exists() ? senderNameSnapshot.val().displayName : `Kullanıcı ${senderId}`;
            const senderMeta = document.createElement('div');
            senderMeta.classList.add('sender-meta');
            senderMeta.textContent = senderName;
            messageDiv.appendChild(senderMeta);
        }
    }

    const messageTextSpan = document.createElement('span');
    messageTextSpan.textContent = message.text;
    messageDiv.appendChild(messageTextSpan);

    const timestampSpan = document.createElement('span');
    timestampSpan.classList.add('message-meta');
    timestampSpan.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.appendChild(timestampSpan);

    // Mesaj düzenleme seçenekleri (sadece gönderen kişi için)
    if (isSentByCurrentUser) {
        const actionsDiv = document.createElement('div');
        actionsDiv.classList.add('message-actions');

        const editSpan = document.createElement('span');
        editSpan.textContent = 'Düzenle';
        editSpan.style.cursor = 'pointer';
        editSpan.onclick = () => editMessage(messageId, message.text);

        const copySpan = document.createElement('span');
        copySpan.textContent = 'Kopyala';
        copySpan.style.cursor = 'pointer';
        copySpan.onclick = () => copyMessage(message.text);

        actionsDiv.appendChild(editSpan);
        actionsDiv.appendChild(copySpan);
        messageDiv.appendChild(actionsDiv);
    } else {
        const copySpan = document.createElement('span');
        copySpan.textContent = 'Kopyala';
        copySpan.style.cursor = 'pointer';
        copySpan.style.position = 'absolute'; // Diğer mesajlarda kopyalama seçeneği
        copySpan.style.right = '10px';
        copySpan.style.top = '50%';
        copySpan.style.transform = 'translateY(-50%)';
        copySpan.onclick = () => copyMessage(message.text);
        messageDiv.appendChild(copySpan);
    }


    messageBox.appendChild(messageDiv);
}

// Mesaj düzenleme
async function editMessage(messageId, currentText) {
    const newText = prompt("Mesajı düzenleyin:", currentText);
    if (newText !== null && newText.trim() !== "" && newText !== currentText) {
        const messageRef = database.ref(`${currentChatType}s/${currentChatId}/messages/${messageId}`);
        await messageRef.update({
            text: newText,
            isEdited: true,
            editedAt: Date.now()
        });
        loadChat(currentChatId, currentChatType); // Sohbeti yeniden yükle
    }
}

// Mesaj kopyalama
function copyMessage(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("Mesaj kopyalandı!");
    }).catch(err => {
        console.error('Mesaj kopyalanamadı: ', err);
    });
}

// Sohbeti başlatma fonksiyonu
function startChat(chatId, chatType, chatName) {
    loadChat(chatId, chatType);
}

// --- Etkinlik Dinleyicileri ---

editProfileBtn.addEventListener('click', updateProfile);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// --- Uygulama Başlangıcı ---

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Kullanıcı giriş yapmış
        currentUser = user;
        // Kullanıcının kendi benzersiz ID'sini (rastgele oluşturulmuş) veritabanına kaydet veya al
        const userRef = database.ref('users/' + user.uid);
        const snapshot = await userRef.once('value');

        if (!snapshot.exists()) {
            // Yeni kullanıcı, ID oluştur ve kaydet
            const generatedId = generateUserId();
            await userRef.set({
                uid: user.uid,
                generatedId: generatedId,
                displayName: `Kullanıcı ${generatedId}`,
                bio: "Merhaba!",
                photoURL: 'default-avatar.png', // Varsayılan avatar
                contacts: {},
                groups: {}
            });
            loadUserProfile(generatedId, `Kullanıcı ${generatedId}`, "Merhaba!", 'default-avatar.png');
            alert(`Uygulamamıza hoş geldiniz! Size özel ID'niz: ${generatedId}`);
        } else {
            // Mevcut kullanıcı, bilgilerini yükle
            const userData = snapshot.val();
            loadUserProfile(userData.generatedId, userData.displayName, userData.bio, userData.photoURL);
            // Kullanıcının kişiler ve gruplar listesini yükle
            loadContacts();
            loadGroups();
        }
    } else {
        // Kullanıcı giriş yapmamış, anonim giriş yap
        try {
            await auth.signInAnonymously();
        } catch (error) {
            console.error("Anonim giriş hatası:", error);
            alert("Uygulamaya bağlanırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
        }
    }
});

// --- Ek Özellikler İçin Fonksiyonlar (Gelecekte Eklenebilir) ---

// Kullanıcı arama (ID ile)
function searchUserById() {
    const userId = prompt("Aranacak kullanıcının ID'sini girin:");
    if (userId) {
        // Kullanıcıyı bulup kişi listesine ekleme veya sohbet başlatma
        addContact(); // Şimdilik kişi ekleme fonksiyonunu kullanıyoruz
    }
}

// Grup oluşturma/düzenleme
function manageGroup() {
    // Grup oluşturma veya mevcut grubu düzenleme arayüzü
    createGroup(); // Şimdilik sadece grup oluşturma
}

// --- UI Elementleri İçin Event Listenerlar (Örnek) ---
// Profil düzenleme butonu zaten ekli.
// Kişi ekle ve grup oluştur gibi butonlar için prompt veya modal pencereler ekleyebilirsiniz.
// Örnek:
// document.getElementById('add-contact-btn').addEventListener('click', addContact);
// document.getElementById('create-group-btn').addEventListener('click', createGroup);

// Başlangıçta varsayılan olarak hiçbir sohbet seçili değil
currentChatName.textContent = "Sohbet Seçin";
document.getElementById('chat-info').textContent = "";

// TODO: Kullanıcı profili düzenleme arayüzünü geliştirebiliriz.
// TODO: Grup izinleri daha detaylı yönetilebilir.
// TODO: Kullanıcıları arama özelliği eklenebilir.
// TODO: Profil resmi yükleme ve gösterme daha gelişmiş hale getirilebilir.
