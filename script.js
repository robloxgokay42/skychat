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

// Firebase Başlatma
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();

// Google AI Başlatma (Hata devam ederse Firebase'i durdurmaması için try/catch)
let ai;
try {
    // GoogleGenAI, <script> etiketi ile global olarak yüklenir
    ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY }); 
    console.log("Google AI SDK Başlatıldı.");
} catch (e) {
    console.error("Google AI SDK başlatılamadı. Bu, 'GoogleGenAI is not defined' hatasını gösterir. Lütfen index.html dosyasındaki SDK yükleme sırasını kontrol edin.", e);
    // AI fonksiyonları bu durumda simüle edilmiş yanıt verecektir.
}


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
let chats = {}; 
let currentChatId = null; 


// =================================================================
// 2. Kimlik Doğrulama İşlemleri
// =================================================================

auth.onAuthStateChanged((user) => {
    if (user) {
        authScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');

        let displayName = user.isAnonymous ? "Anonim Kullanıcı" : (user.email ? user.email.split('@')[0] : "Kullanıcı");
        userDisplay.textContent = displayName;

        if (!currentChatId || !chats[currentChatId]) {
            startNewChat(false); // Sadece DOM'u hazırla
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

function displayAuthMessage(message) {
    authMessage.textContent = message;
    setTimeout(() => {
        authMessage.textContent = '';
    }, 5000);
}

function signUpWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || password.length < 6) {
        displayAuthMessage("Lütfen geçerli bir e-posta ve en az 6 karakterli bir şifre girin.");
        return;
    }
    // Firebase createUserWithEmailAndPassword fonksiyonu çalışır
    auth.createUserWithEmailAndPassword(email, password)
        .then(() => displayAuthMessage("Kayıt başarılı! Giriş yapılıyor..."))
        .catch((error) => displayAuthMessage(`Kayıt Hatası: ${error.message}`));
}

function signInWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || !password) {
        displayAuthMessage("Lütfen e-posta ve şifrenizi girin.");
        return;
    }
    // Firebase signInWithEmailAndPassword fonksiyonu çalışır
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => displayAuthMessage(`Giriş Hatası: ${error.message}`));
}

function signInAnonymously() {
    // Firebase signInAnonymously fonksiyonu çalışır
    auth.signInAnonymously()
        .catch((error) => displayAuthMessage(`Anonim Giriş Hatası: ${error.message}`));
}

function signOut() {
    auth.signOut().catch((error) => console.error("Çıkış Hatası:", error));
}


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
        editButton.innerHTML = '&#x270E;'; 
        editButton.title = 'İsim Değiştir';
        editButton.onclick = (e) => {
            e.stopPropagation(); 
            renameChat(id);
        };
        
        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '&times;'; 
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
        const oldActive = document.querySelector('.chat-link-container.active');
        if (oldActive) {
            oldActive.classList.remove('active');
        }
    }

    currentChatId = id;
    const chat = chats[id] || { messages: [] };

    const newActive = document.querySelector(`.chat-link-container:has(.chat-link[onclick*="${id}"])`);
    if (newActive) {
        newActive.classList.add('active');
    }

    chatBox.innerHTML = ''; 

    chat.messages.forEach(msg => {
        const user = auth.currentUser;
        const userIcon = msg.sender === 'user' ? (user.email ? user.email[0].toUpperCase() : 'U') : 'S';
        chatBox.appendChild(createMessageElement(msg.content, msg.sender, userIcon));
    });
    
    if (chat.messages.length === 0) {
        displayInitialMessage();
    }

    scrollToBottom();
}

function startNewChat(shouldLoad = true) {
    const newId = Date.now().toString();
    chats[newId] = { title: 'Yeni Sohbet', messages: [] }; 
    
    if (shouldLoad) {
        loadChat(newId);
    } else {
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
        chats[id].title = newTitle.trim().substring(0, 50); 
        renderChatHistory();
    }
}

function deleteChat(id) {
    if (confirm(`"${chats[id].title}" sohbetini silmek istediğinizden emin misiniz?`)) {
        delete chats[id];
        
        if (id === currentChatId) {
            startNewChat(true); 
        } else {
            renderChatHistory();
        }
    }
}

function createMessageElement(content, type, iconText) {
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

    if (chatBox.querySelector('.initial-message')) {
        chatBox.innerHTML = '';
    }
    
    const user = auth.currentUser;
    const userIcon = user.isAnonymous ? '?' : (user.email ? user.email[0].toUpperCase() : 'U');
    
    const userMessage = { sender: 'user', content: messageText };
    chats[currentChatId].messages.push(userMessage);

    chatBox.appendChild(createMessageElement(messageText, 'user', userIcon));
    userInput.value = '';
    userInput.style.height = 'auto';
    scrollToBottom();
    
    if (chats[currentChatId].messages.length === 1) {
        const autoTitle = messageText.split(/\s+/).slice(0, 5).join(' ');
        chats[currentChatId].title = autoTitle + (messageText.split(/\s+/).length > 5 ? '...' : '');
        renderChatHistory();
    }

    const aiResponsePlaceholder = createMessageElement("SkyAI yazıyor...", 'ai', 'S');
    chatBox.appendChild(aiResponsePlaceholder);
    scrollToBottom();

    sendButton.disabled = true;

    try {
        const aiResponse = await getAiResponse(chats[currentChatId].messages);
        
        const aiMessage = { sender: 'ai', content: aiResponse };
        chats[currentChatId].messages.push(aiMessage);
        
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
// 4. Google AI Studio Çağrısı
// =================================================================

async function getAiResponse(history) {
    if (!ai) {
        return "Simüle edilmiş yanıt: Google AI SDK yüklenmediği için yapay zeka servisine ulaşılamıyor.";
    }

    const contents = history.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));
    
    try {
        // 'gemini-pro' modelini kullanarak sohbet oturumu oluştur
        const chat = ai.chats.create({
            model: "gemini-2.5-flash",
            history: contents.slice(0, -1),
        });

        const lastMessage = history[history.length - 1].content;
        
        const result = await chat.sendMessage({ message: lastMessage });
        
        return result.text; 
    } catch (e) {
        console.error("Gemini API çağrısında hata:", e);
        return "Üzgünüm, Gemini API'den yanıt alınamadı. Lütfen API anahtarınızı ve konsoldaki detayları kontrol edin.";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    userInput.dispatchEvent(new Event('input'));
});
