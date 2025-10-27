// =================================================================
// 1. Firebase ve Google AI Konfigürasyonu
// =================================================================

const firebaseConfig = {
    apiKey: "AIzaSyDUBM-H0JzPC6CC9EKGzkqZDr2ovG51iqU",
    authDomain: "sky-ai-8e2af.firebaseapp.com",
    projectId: "sky-ai-8e2af",
    storageBucket: "sky-ai-8e2af.firebasestorage.app",
    messagingSenderId: "892134977367",
    appId: "1:892134977367:web:8acc1b5006fa324905d812",
    measurementId: "G-5KCYENP0V2"
};

// ⚠️ GÜVENLİK UYARISI: BU ANAHTAR ÖN YÜZDE OLMAMALIDIR!
const GOOGLE_AI_API_KEY = "AIzaSyCzTJkIkQagLLGWzlCRhzFv-1oC9C_GDHw"; 

// Firebase ve Google AI Başlatma
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();

// Google AI SDK Yüklemesi Zaten HTML'de yapıldı, şimdi istemciyi başlatıyoruz.
// global 'GoogleGenAI' nesnesi üzerinden erişim sağlanır.
const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY }); 

// DOM Elementleri
const authScreen = document.getElementById('auth-screen');
const chatScreen = document.getElementById('chat-screen');
const chatBox = document.getElementById('chat-box');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const authMessage = document.getElementById('auth-message');
const userDisplay = document.getElementById('user-display');
const chatHistoryList = document.getElementById('chat-history-list');

// Sohbet Yönetimi Değişkenleri
let chats = {}; // {chatId: {title: '...', messages: [...]}}
let currentChatId = null; 


// =================================================================
// 2. Kimlik Doğrulama İşlemleri (Aynı)
// =================================================================

auth.onAuthStateChanged((user) => {
    if (user) {
        authScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');

        let displayName = user.isAnonymous ? "Anonim Kullanıcı" : (user.email ? user.email.split('@')[0] : "Kullanıcı");
        userDisplay.textContent = displayName;

        if (!currentChatId || !chats[currentChatId]) {
            // Eğer giriş yapıldıysa ve aktif sohbet yoksa, yeni bir tane başlat
            startNewChat(false); // Yeni sohbet başlat ama hemen DOM'a yükleme
        } else {
            loadChat(currentChatId);
        }

    } else {
        authScreen.classList.remove('hidden');
        chatScreen.classList.add('hidden');
        currentChatId = null;
        chats = {};
        renderChatHistory();
    }
});

// Auth fonksiyonları (signIn, signUp, signOut) önceki kod ile aynıdır.
function displayAuthMessage(message) { /* ... */ }
function signUpWithEmail() { /* ... */ }
function signInWithEmail() { /* ... */ }
function signInAnonymously() { /* ... */ }
function signOut() { /* ... */ }


// =================================================================
// 3. Sohbet Yönetimi ve DOM İşlemleri
// =================================================================

function renderChatHistory() {
    chatHistoryList.innerHTML = '';
    const chatIds = Object.keys(chats).reverse(); 

    chatIds.forEach(id => {
        const chat = chats[id];
        if (!chat || chat.messages.length === 0) return;

        const container = document.createElement('div');
        container.classList.add('chat-link-container');
        if (id === currentChatId) {
            container.classList.add('active');
        }
        
        const link = document.createElement('a');
        link.href = '#';
        link.classList.add('chat-link');
        link.textContent = chat.title;
        link.onclick = (e) => {
            e.preventDefault();
            loadChat(id);
        };
        
        // Düzenleme/Silme Aksiyonları
        const actions = document.createElement('div');
        actions.classList.add('chat-actions');
        
        const editButton = document.createElement('button');
        editButton.innerHTML = '&#x270E;'; // Kalem ikonu
        editButton.title = 'İsim Değiştir';
        editButton.onclick = (e) => {
            e.stopPropagation(); // Linke tıklamayı engelle
            renameChat(id);
        };
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '&times;'; // Çarpı ikonu
        deleteButton.title = 'Sohbeti Sil';
        deleteButton.classList.add('delete-button');
        deleteButton.onclick = (e) => {
            e.stopPropagation(); 
            deleteChat(id);
        };
        
        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        
        container.appendChild(link);
        container.appendChild(actions);
        chatHistoryList.appendChild(container);
    });
}

function loadChat(id) {
    if (currentChatId) {
        // Eski aktif sınıfı kaldır
        const oldActive = document.querySelector('.chat-link-container.active');
        if (oldActive) {
            oldActive.classList.remove('active');
        }
    }

    currentChatId = id;
    const chat = chats[id] || { messages: [] };

    // Yeni aktif sınıfı ekle
    const newActive = document.querySelector(`.chat-link-container:has(.chat-link[onclick*="${id}"])`);
    if (newActive) {
        newActive.classList.add('active');
    }

    chatBox.innerHTML = ''; 

    // Mesajları render et
    chat.messages.forEach(msg => {
        const user = auth.currentUser;
        const userIcon = msg.sender === 'user' ? (user.email ? user.email[0].toUpperCase() : 'U') : 'S';
        chatBox.appendChild(createMessageElement(msg.content, msg.sender, userIcon));
    });
    
    // Eğer hiç mesaj yoksa başlangıç mesajını göster
    if (chat.messages.length === 0) {
        displayInitialMessage();
    }

    scrollToBottom();
}

/**
 * Yeni bir sohbet başlatır.
 * @param {boolean} shouldLoad - Başlatıldıktan sonra hemen yüklenmeli mi? (Yan menüden tıklanınca hayır)
 */
function startNewChat(shouldLoad = true) {
    const newId = Date.now().toString();
    chats[newId] = { title: 'Yeni Sohbet', messages: [] }; 
    
    if (shouldLoad) {
        loadChat(newId);
    } else {
        // İlk yüklemede sadece DOM'u hazırla
        currentChatId = newId;
        displayInitialMessage();
    }
    renderChatHistory();
}

function displayInitialMessage() {
    chatBox.innerHTML = `
        <div class="initial-message">
            <h2>Nasıl yardımcı olabilirim?</h2>
        </div>
    `;
    userInput.value = '';
}

function renameChat(id) {
    const newTitle = prompt("Sohbetin yeni adını girin:", chats[id].title);
    if (newTitle && newTitle.trim()) {
        chats[id].title = newTitle.trim().substring(0, 50); // Maksimum 50 karakter
        renderChatHistory();
    }
}

function deleteChat(id) {
    if (confirm(`"${chats[id].title}" sohbetini silmek istediğinizden emin misiniz?`)) {
        delete chats[id];
        
        // Eğer silinen aktif sohbetse
        if (id === currentChatId) {
            startNewChat(true); // Yeni bir sohbet başlat ve yükle
        } else {
            renderChatHistory();
        }
    }
}

function createMessageElement(content, type, iconText) {
    // ... (Aynı HTML oluşturma kodu)
    const messageRow = document.createElement('div');
    messageRow.classList.add('message-row', `${type}-message`);

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');

    const icon = document.createElement('div');
    icon.classList.add('message-icon');
    icon.textContent = iconText;

    const text = document.createElement('div');
    text.classList.add('message-text');
    text.innerHTML = content; 

    messageContent.appendChild(icon);
    messageContent.appendChild(text);
    messageRow.appendChild(messageContent);
    return messageRow;
}

function scrollToBottom() {
    const mainChat = document.querySelector('.main-chat'); 
    mainChat.scrollTop = mainChat.scrollHeight;
}

async function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === "") return;

    // Eğer başlangıç ekranındaysak, temizle
    if (chatBox.querySelector('.initial-message')) {
        chatBox.innerHTML = '';
    }
    
    // 1. Kullanıcı Mesajını Kaydet ve Ekle
    const user = auth.currentUser;
    const userIcon = user.isAnonymous ? '?' : (user.email ? user.email[0].toUpperCase() : 'U');
    
    const userMessage = { sender: 'user', content: messageText };
    chats[currentChatId].messages.push(userMessage);

    chatBox.appendChild(createMessageElement(messageText, 'user', userIcon));
    userInput.value = '';
    userInput.style.height = 'auto';
    scrollToBottom();
    
    // İlk mesaj ise başlığı otomatik belirle
    if (chats[currentChatId].messages.length === 1) {
        // İlk 5 kelimeyi başlık yap
        const autoTitle = messageText.split(/\s+/).slice(0, 5).join(' ');
        chats[currentChatId].title = autoTitle + (messageText.split(/\s+/).length > 5 ? '...' : '');
        renderChatHistory();
    }

    // 2. AI Cevabı Bekleniyor Mesajı
    const aiResponsePlaceholder = createMessageElement("SkyAI yazıyor...", 'ai', 'S');
    chatBox.appendChild(aiResponsePlaceholder);
    scrollToBottom();

    sendButton.disabled = true;

    // 3. AI Cevabını Al (Gerçek AI Çağrısı)
    try {
        const aiResponse = await getAiResponse(chats[currentChatId].messages);
        
        // Cevabı kaydet
        const aiMessage = { sender: 'ai', content: aiResponse };
        chats[currentChatId].messages.push(aiMessage);
        
        // Yer tutucuyu gerçek cevapla değiştir
        aiResponsePlaceholder.querySelector('.message-text').innerHTML = aiResponse;

    } catch (error) {
        aiResponsePlaceholder.querySelector('.message-text').textContent = "Hata: AI servisine ulaşılamıyor. Konsolu kontrol edin.";
        console.error("AI Çağrı Hatası:", error);
    } finally {
        sendButton.disabled = false;
        scrollToBottom();
    }
}

// Enter tuşu ve Otomatik Boyutlandırma (Aynı)
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); 
        sendMessage();
    }
});

userInput.addEventListener('input', function() {
    this.style.height = 'auto'; 
    this.style.height = (this.scrollHeight) + 'px'; 
});


// =================================================================
// 4. Google AI Studio Çağrısı (GERÇEK ENTEGRASYON)
// =================================================================

/**
 * Google AI Studio'dan cevap alır ve geçmişi korur.
 * @param {Array} history - Sohbet geçmişi (messages array)
 */
async function getAiResponse(history) {
    // History'i Google'ın beklediği format olan 'Content' nesnelerine dönüştür
    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));
    
    // 'gemini-pro' modelini kullanarak sohbet oturumu oluştur
    const chat = ai.chats.create({
        model: "gemini-2.5-flash", // Hızlı model seçildi
        history: contents.slice(0, -1), // Son mesaj hariç tüm geçmiş
    });

    const lastMessage = history[history.length - 1].content;
    
    const result = await chat.sendMessage({ message: lastMessage });
    
    // Cevabın text kısmını döndür
    return result.text; 
}


document.addEventListener('DOMContentLoaded', () => {
    userInput.dispatchEvent(new Event('input'));
});
