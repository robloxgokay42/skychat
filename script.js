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

// Firebase Uygulamasını Başlat
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
let isChatInitialized = false; // Sohbetin başlayıp başlamadığını kontrol etmek için

// =================================================================
// 2. Kimlik Doğrulama İşlemleri
// =================================================================

// Firebase Oturum Durumu Takibi
auth.onAuthStateChanged((user) => {
    if (user) {
        // Kullanıcı Giriş Yapmış
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

        // İlk kez giriş yapılıyorsa sohbet kutusunu sıfırla
        if (!isChatInitialized) {
            startNewChat();
            isChatInitialized = true;
        }

    } else {
        // Kullanıcı Çıkış Yapmış
        authScreen.classList.remove('hidden');
        chatScreen.classList.add('hidden');
        isChatInitialized = false;
    }
});

function displayAuthMessage(message) {
    authMessage.textContent = message;
    setTimeout(() => {
        authMessage.textContent = '';
    }, 5000);
}

// E-posta/Şifre ile Kayıt
function signUpWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || password.length < 6) {
        displayAuthMessage("Lütfen geçerli bir e-posta ve en az 6 karakterli bir şifre girin.");
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            displayAuthMessage("Kayıt başarılı! Giriş yapılıyor...");
        })
        .catch((error) => {
            displayAuthMessage(`Kayıt Hatası: ${error.message}`);
        });
}

// E-posta/Şifre ile Giriş
function signInWithEmail() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    if (!email || !password) {
        displayAuthMessage("Lütfen e-posta ve şifrenizi girin.");
        return;
    }

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            // Başarılı giriş
        })
        .catch((error) => {
            displayAuthMessage(`Giriş Hatası: ${error.message}`);
        });
}

// Anonim Giriş
function signInAnonymously() {
    auth.signInAnonymously()
        .then(() => {
            // Başarılı anonim giriş
        })
        .catch((error) => {
            displayAuthMessage(`Anonim Giriş Hatası: ${error.message}`);
        });
}

// Çıkış Yap
function signOut() {
    auth.signOut().then(() => {
        // Çıkış başarılı. onAuthStateChanged otomatik olarak auth ekranına geçecek.
        startNewChat(); 
    }).catch((error) => {
        console.error("Çıkış Hatası:", error);
    });
}


// =================================================================
// 3. Sohbet İşlemleri
// =================================================================

function startNewChat() {
    // Sohbet kutusunu ilk baştaki "Nasıl yardımcı olabilirim?" ekranına geri döndür
    chatBox.innerHTML = `
        <div class="initial-message">
            <h2>Nasıl yardımcı olabilirim?</h2>
        </div>
    `;
    userInput.value = '';
    scrollToBottom();
}

/**
 * ChatGPT stilinde bir mesaj satırı oluşturur
 * @param {string} content - Mesaj içeriği (HTML destekli)
 * @param {string} type - 'user' veya 'ai'
 * @param {string} iconText - İkon içinde gösterilecek metin (örn. 'U' veya 'A')
 */
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
    // İçeriği HTML olarak ekle (Güvenlik için genellikle sanitize edilmelidir, burada basit tutulmuştur)
    text.innerHTML = content; 

    messageContent.appendChild(icon);
    messageContent.appendChild(text);
    messageRow.appendChild(messageContent);
    return messageRow;
}

function scrollToBottom() {
    // Sohbet kutusunun kendisi değil, ana sohbet alanı (main-chat) scroll ediyor
    const mainChat = document.querySelector('.main-chat'); 
    mainChat.scrollTop = mainChat.scrollHeight;
}

function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === "") return;
    
    // İlk mesajı gönderdikten sonra başlangıç ekranını temizle
    if (chatBox.querySelector('.initial-message')) {
        chatBox.innerHTML = '';
    }

    // 1. Kullanıcı Mesajını Ekle
    const user = auth.currentUser;
    const userIcon = user.isAnonymous ? '?' : (user.email ? user.email[0].toUpperCase() : 'U');

    chatBox.appendChild(createMessageElement(messageText, 'user', userIcon));
    userInput.value = '';
    userInput.style.height = 'auto'; // Gönderme sonrası boyutu sıfırla
    scrollToBottom();

    // 2. AI Cevabı Bekleniyor Mesajı (Yer Tutucu)
    const aiResponsePlaceholder = createMessageElement("SkyAI yazıyor...", 'ai', 'S');
    chatBox.appendChild(aiResponsePlaceholder);
    scrollToBottom();

    // 3. AI Cevabını Al (Arka Uç Gereklidir!)
    sendButton.disabled = true; // Gönder butonunu devre dışı bırak

    getAiResponse(messageText)
        .then(aiResponse => {
            // Yer tutucuyu gerçek cevapla değiştir
            aiResponsePlaceholder.querySelector('.message-text').innerHTML = aiResponse;
        })
        .catch(error => {
            aiResponsePlaceholder.querySelector('.message-text').textContent = "Hata: AI servisine ulaşılamıyor. Lütfen konsolu kontrol edin.";
            console.error("AI Çağrı Hatası:", error);
        })
        .finally(() => {
            sendButton.disabled = false;
            scrollToBottom();
        });
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
// 4. Google AI Çağrısı (YER TUTUCU - ARKA UÇ GEREKLİ!)
// =================================================================

/**
 * ⚠️ GÜVENLİK UYARISI: GERÇEK AI ANAHTARI BURADA KULLANILMAMALIDIR.
 * Bu bir simülasyondur. Gerçek entegrasyon için bir sunucu kullanın.
 */
async function getAiResponse(prompt) {
    console.log("AI Anahtarı ön yüzde kullanılmamalıdır. Bu bir yer tutucu yanıttır.");

    // Gerçek AI yanıtını simüle etmek için
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(`Bu, **SkyAI**'dan gelen simüle edilmiş bir yanıttır. Sorunuz: <em>"${prompt}"</em>. Gerçek Google AI entegrasyonu için güvenli bir arka uç (server) gereklidir.<br><br>Giriş yapma sistemi (Firebase) başarılı bir şekilde çalışıyor!`);
        }, 1500); // 1.5 saniye gecikme
    });
}

// Uygulama Başladığında
document.addEventListener('DOMContentLoaded', () => {
    // Input'un ilk otomatik boyutlandırmasını yap
    userInput.dispatchEvent(new Event('input'));
});
