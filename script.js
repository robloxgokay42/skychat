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
        if (user.isAnonymous) {
            userDisplay.textContent = "Anonim Kullanıcı";
        } else {
            userDisplay.textContent = user.email || "Kullanıcı";
        }
    } else {
        // Kullanıcı Çıkış Yapmış
        authScreen.classList.remove('hidden');
        chatScreen.classList.add('hidden');
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
            // onAuthStateChanged otomatik olarak sohbet ekranına geçecektir.
        })
        .catch((error) => {
            // Firebase hata kodlarını kontrol et ve kullanıcıya göster
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
        startNewChat(); // Sohbet kutusunu temizle
    }).catch((error) => {
        console.error("Çıkış Hatası:", error);
    });
}


// =================================================================
// 3. Sohbet İşlemleri
// =================================================================

function startNewChat() {
    chatBox.innerHTML = `
        <div class="message system-message">
            Merhaba! Ben SkyAI. Yeni bir sohbete başladık. Size nasıl yardımcı olabilirim?
        </div>
    `;
    userInput.value = '';
    scrollToBottom();
}

function createMessageElement(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', `${type}-message`);
    messageDiv.textContent = content;
    return messageDiv;
}

function scrollToBottom() {
    chatBox.scrollTop = chatBox.scrollHeight;
}

function sendMessage() {
    const messageText = userInput.value.trim();
    if (messageText === "") return;

    // 1. Kullanıcı Mesajını Ekle
    chatBox.appendChild(createMessageElement(messageText, 'user'));
    userInput.value = '';
    scrollToBottom();

    // 2. AI Cevabı Bekleniyor Mesajı
    const aiResponsePlaceholder = createMessageElement("SkyAI yazıyor...", 'ai');
    chatBox.appendChild(aiResponsePlaceholder);
    scrollToBottom();

    // 3. AI Cevabını Al (Arka Uç Gereklidir!)
    getAiResponse(messageText)
        .then(aiResponse => {
            // Yer tutucuyu gerçek cevapla değiştir
            aiResponsePlaceholder.textContent = aiResponse;
        })
        .catch(error => {
            aiResponsePlaceholder.textContent = "Hata: AI servisine ulaşılamıyor. Lütfen konsolu kontrol edin.";
            console.error("AI Çağrı Hatası:", error);
        })
        .finally(() => {
            scrollToBottom();
            sendButton.disabled = false;
        });

    sendButton.disabled = true; // Gönder butonunu devre dışı bırak
}

// Enter tuşu ile gönderme ve Shift + Enter ile yeni satır
userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault(); // Varsayılan Enter hareketini (yeni satır) engelle
        sendMessage();
    }
});

// Otomatik Boyutlandırma
userInput.addEventListener('input', function() {
    this.style.height = 'auto'; // Önce yüksekliği sıfırla
    this.style.height = (this.scrollHeight) + 'px'; // Sonra içeriğe göre ayarla
});


// =================================================================
// 4. Google AI Çağrısı (YER TUTUCU - ARKA UÇ GEREKLİ!)
// =================================================================

/**
 * Bu fonksiyon bir arka uç sunucusu olmadan doğrudan AI anahtarı kullandığı için
 * GÜVENLİ DEĞİLDİR ve SADECE bir yer tutucudur.
 * Gerçekte, bu isteği sunucuna (örn. Cloud Function) göndermelisin.
 */
async function getAiResponse(prompt) {
    // ⚠️ GÜVENLİK UYARISI: GERÇEK AI ANAHTARI BURADA KULLANILMAYACAKTIR.
    console.log("AI Anahtarı ön yüzde kullanılmamalıdır. Bu bir yer tutucu yanıttır.");

    // Geliştirme sürecinde gerçek AI yanıtını simüle etmek için
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(`Bu, **SkyAI**'dan gelen simüle edilmiş bir yanıttır. Sorunuz: _"${prompt}"_. Gerçek Google AI entegrasyonu için güvenli bir arka uç (server) gereklidir.`);
        }, 1500); // 1.5 saniye gecikme
    });
}


// Uygulama Başladığında
document.addEventListener('DOMContentLoaded', () => {
    // Input'un ilk otomatik boyutlandırmasını yap
    userInput.dispatchEvent(new Event('input'));
});
