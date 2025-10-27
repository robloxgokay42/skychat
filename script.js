// =================================================================
// 1. Firebase Konfigürasyonu ve Başlatma
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

const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();

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
let chats = {}; // Tüm sohbetleri saklar: {chatId: [{sender: 'user', content: '...'}, ...]}
let currentChatId = null; 

// =================================================================
// 2. Kimlik Doğrulama İşlemleri
// =================================================================

auth.onAuthStateChanged((user) => {
    if (user) {
        authScreen.classList.add('hidden');
        chatScreen.classList.remove('hidden');

        // Kullanıcı Adını Görüntüle
        let displayName;
        if (user.isAnonymous) {
            displayName = "Anonim Kullanıcı";
        } else {
            displayName = user.email ? user.email.split('@')[0] : "Kullanıcı";
        }
        userDisplay.textContent = displayName;

        // Sayfa yüklendiğinde sohbetleri yükle veya yeni sohbet başlat
        if (!currentChatId) {
            startNewChat();
        } else {
            loadChat(currentChatId); // Eğer ID varsa o sohbeti yükle
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

// Kimlik doğrulama fonksiyonları (signUpWithEmail, signInWithEmail, signInAnonymously, signOut) 
// önceki kod ile aynıdır, burada yer kazanmak için tekrar yazılmamıştır. 

function signUpWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    if (!email || password.length < 6) {
        displayAuthMessage("Lütfen geçerli bir e-posta ve en az 6 karakterli bir şifre girin.");
        return;
    }
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
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => displayAuthMessage(`Giriş Hatası: ${error.message}`));
}

function signInAnonymously() {
    auth.signInAnonymously()
        .catch((error) => displayAuthMessage(`Anonim Giriş Hatası: ${error.message}`));
}

function signOut() {
    auth.signOut().catch((error) => console.error("Çıkış Hatası:", error));
}


// =================================================================
// 3. Sohbet İşlemleri (Kalıcılık Simülasyonu Eklendi)
// =================================================================

function renderChatHistory() {
    chatHistoryList.innerHTML = '';
    const chatIds = Object.keys(chats).reverse(); // Yeni sohbetler üste gelsin

    chatIds.forEach(id => {
        const chat = chats[id];
        if (chat.length === 0) return;

        // Sohbet başlığını ilk kullanıcı mesajının ilk 30 karakteri yap
        const title = chat[0].content.substring(0, 30) + (chat[0].content.length > 30 ? '...' : '');

        const link = document.createElement('a');
        link.href = '#';
        link.classList.add('chat-link');
        if (id === currentChatId) {
            link.classList.add('active');
        }
        link.textContent = title;
        link.onclick = (e) => {
            e.preventDefault();
            loadChat(id);
        };
        chatHistoryList.appendChild(link);
    });
}

function loadChat(id) {
    currentChatId = id;
    const chat = chats[id] || [];

    // Sohbet kutusunu temizle
    chatBox.innerHTML = ''; 

    // Mesajları tekrar render et
    chat.forEach(msg => {
        const user = auth.currentUser;
        const userIcon = user.isAnonymous ? '?' : (user.email ? user.email[0].toUpperCase() : 'U');
        const icon = msg.sender === 'user' ? userIcon : 'S';
        chatBox.appendChild(createMessageElement(msg.content, msg.sender, icon));
    });
    
    renderChatHistory(); // Aktif sohbeti işaretle
    scrollToBottom();
}

function startNewChat() {
    // Yeni bir benzersiz ID oluştur (Basitlik için timestamp)
    currentChatId = Date.now().toString();
    chats[currentChatId] = []; // Boş bir sohbet geçmişi başlat

    // Sohbet kutusunu başlangıç ekranına getir
    chatBox.innerHTML = `
        <div class="initial-message">
            <h2>Nasıl yardımcı olabilirim?</h2>
        </div>
    `;

    userInput.value = '';
    renderChatHistory();
    scrollToBottom();
}

/**
 * Mesaj satırı oluşturur.
 */
function createMessageElement(content, type, iconText) {
    const messageRow = document.createElement('div');
    messageRow.classList.add('message-row', `${type}-message`);

    // ... (HTML yapısı önceki ile aynı)
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

    // Eğer yeni bir sohbetteyse, başlangıç ekranını temizle
    if (chatBox.querySelector('.initial-message')) {
        chatBox.innerHTML = '';
    }
    
    // 1. Kullanıcı Mesajını Kaydet ve Ekle
    const user = auth.currentUser;
    const userIcon = user.isAnonymous ? '?' : (user.email ? user.email[0].toUpperCase() : 'U');
    
    const userMessage = { sender: 'user', content: messageText };
    chats[currentChatId].push(userMessage);

    chatBox.appendChild(createMessageElement(messageText, 'user', userIcon));
    userInput.value = '';
    userInput.style.height = 'auto';
    scrollToBottom();
    
    // Sohbet geçmişini güncelle (Başlık için)
    renderChatHistory();

    // 2. AI Cevabı Bekleniyor Mesajı
    const aiResponsePlaceholder = createMessageElement("SkyAI yazıyor...", 'ai', 'S');
    chatBox.appendChild(aiResponsePlaceholder);
    scrollToBottom();

    sendButton.disabled = true;

    // 3. AI Cevabını Al
    try {
        const aiResponse = await getAiResponse(messageText);
        
        // Cevabı kaydet
        const aiMessage = { sender: 'ai', content: aiResponse };
        chats[currentChatId].push(aiMessage);
        
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

// Enter tuşu ile gönderme ve Shift + Enter ile yeni satır
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); 
        sendMessage();
    }
});

// Otomatik Boyutlandırma
userInput.addEventListener('input', function() {
    this.style.height = 'auto'; 
    this.style.height = (this.scrollHeight) + 'px'; 
});


// =================================================================
// 4. Google AI Çağrısı (YER TUTUCU)
// =================================================================

async function getAiResponse(prompt) {
    // ⚠️ GÜVENLİK UYARISI HÂLÂ GEÇERLİDİR.
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(`Bu, **SkyAI**'dan gelen simüle edilmiş bir yanıttır. Sorunuz: <em>"${prompt}"</em>. **Sohbet kalıcılık simülasyonu başarılı!** (Sayfayı yenilemeden bu sohbete geri dönebilirsiniz). Gerçek Google AI entegrasyonu için güvenli bir arka uç (server) gereklidir.`);
        }, 1500);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    userInput.dispatchEvent(new Event('input'));
    // Firebase onAuthStateChanged tetikleneceği için başlangıç burada gerekmez.
});
