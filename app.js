/**
 * L'Académie - Çekirdek Uygulama Motoru (app.js)
 * Modüller: Auth, Quiz Engine, Admin & EmailJS
 */

// SUPABASE INITIALIZATION
const SUPABASE_URL = "https://fcqppdjmvvkqrnwmrlhr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vXsVr3iPRsm8-u-L0HpPwA_GRwXVFpX";

if (typeof supabase !== 'undefined') {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  console.warn("Supabase CDN yüklenemedi. Yerel veri modunda çalışılacak.");
}

// --- GLOBAL DEĞİŞKENLER VE DURUM YÖNETİMİ ---
let currentUser = null;
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let examTimer = null;
let secondsPassed = 0;
let isTimerPaused = false;

document.addEventListener('DOMContentLoaded', () => {
  checkSavedUser();
});

// EKRAN DEĞİŞTİRME YARDIMCISI
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
  }
}

// --- OTURUM YÖNETİMİ (AUTH) ---
function checkSavedUser() {
  const savedUser = localStorage.getItem('yds_user');
  if (savedUser) {
    currentUser = savedUser;
    document.getElementById('welcome-username').innerText = currentUser;
    showScreen('main-menu');
  } else {
    showScreen('login-screen');
  }
}

function handleLogin() {
  const input = document.getElementById('username-input').value.trim();
  if (!input) {
    alert("Lütfen geçerli bir isim girin.");
    return;
  }
  currentUser = input;
  localStorage.setItem('yds_user', currentUser);
  document.getElementById('welcome-username').innerText = currentUser;
  showScreen('main-menu');
}

function handleLogout() {
  localStorage.removeItem('yds_user');
  currentUser = null;
  showScreen('login-screen');
}

function confirmResetUserData() {
  if (confirm("Tüm yerel ilerlemeniz ve verileriniz silinecektir. Emin misiniz?")) {
    localStorage.clear();
    alert("Veriler sıfırlandı.");
    location.reload();
  }
}

// --- SORU SETİ VE SINAV MOTORU ---
async function openSetSelection() {
  showScreen('set-select-screen');
  const container = document.getElementById('set-list-container');
  container.innerHTML = "<p>Setler yükleniyor...</p>";

  let sets = [];

  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.from('question_sets').select('*');
      if (!error && data && data.length > 0) sets = data;
    } catch (e) {
      console.log("Bulut verisi çekilemedi, yerel veriye geçiliyor.");
    }
  }

  if (sets.length === 0) {
    const localData = localStorage.getItem('yds_question_sets');
    sets = localData ? JSON.parse(localData) : [
      {
        id: "default_1",
        topic: "Örnek YDS Paragraf Seti 1",
        date: "2026-01-01",
        questions: [
          {
            article_title: "La Protection de l'Environnement",
            article_text: "La protection de l'environnement est essentielle pour assurer un avenir durable. Il faut réduire les émissions de carbone.",
            question: "Selon le texte, pourquoi faut-il protéger l'environnement?",
            options: [
              "Pour assurer un avenir durable",
              "Pour augmenter les coûts",
              "Pour détruire la nature",
              "Pour arrêter le commerce"
            ],
            correct: 0,
            explanation: "Metinde açıkça 'assurer un avenir durable' ifadesi geçmektedir."
          }
        ]
      }
    ];
  }

  container.innerHTML = "";
  sets.forEach((setItem, index) => {
    const card = document.createElement('div');
    card.className = "set-item-card";
    card.innerHTML = `
      <div>
        <strong style="color:var(--primary);">${setItem.topic || 'Soru Seti ' + (index + 1)}</strong>
        <p style="margin:0; font-size:12px; color:var(--text-muted);">${setItem.date || ''}</p>
      </div>
      <span>Başla ➔</span>
    `;
    card.onclick = () => startExam(setItem.questions);
    container.appendChild(card);
  });
}

function startExam(questions) {
  if (!questions || questions.length === 0) {
    alert("Bu sette soru bulunamadı.");
    return;
  }

  currentQuestions = questions;
  currentQuestionIndex = 0;
  userAnswers = {};
  secondsPassed = 0;
  isTimerPaused = false;

  startTimer();
  showScreen('quiz-screen');
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuestions[currentQuestionIndex];
  if (!q) return;

  document.getElementById('article-number').innerText = `Paragraf ${currentQuestionIndex + 1} / ${currentQuestions.length}`;
  document.getElementById('article-title').innerText = q.article_title || "Paragraf Metni";
  document.getElementById('article-text').innerText = q.article_text || "";
  
  document.getElementById('question-number').innerText = `Soru ${currentQuestionIndex + 1}`;
  document.getElementById('question-title').innerText = q.question;

  const optionsContainer = document.getElementById('options-group');
  optionsContainer.innerHTML = "";

  q.options.forEach((optText, optIdx) => {
    const btn = document.createElement('button');
    btn.className = `option-btn ${userAnswers[currentQuestionIndex] === optIdx ? 'selected' : ''}`;
    btn.innerText = `${String.fromCharCode(65 + optIdx)}) ${optText}`;
    btn.onclick = () => selectOption(optIdx);
    optionsContainer.appendChild(btn);
  });

  const expBox = document.getElementById('explanation-box');
  expBox.style.display = "none";
  expBox.innerText = q.explanation || "Açıklama bulunmuyor.";
}

function selectOption(index) {
  userAnswers[currentQuestionIndex] = index;
  renderQuestion();
}

function nextQuestion() {
  if (currentQuestionIndex < currentQuestions.length - 1) {
    currentQuestionIndex++;
    renderQuestion();
  } else {
    if (confirm("Son soruya geldiniz. Sınavı bitirmek istiyor musunuz?")) {
      finishExam();
    }
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion();
  }
}

function toggleAnswerVisibility() {
  const expBox = document.getElementById('explanation-box');
  expBox.style.display = expBox.style.display === "none" ? "block" : "none";
}

// ZAMANLAYICI MOTORU
function startTimer() {
  clearInterval(examTimer);
  examTimer = setInterval(() => {
    if (!isTimerPaused) {
      secondsPassed++;
      const mins = String(Math.floor(secondsPassed / 60)).padStart(2, '0');
      const secs = String(secondsPassed % 60).padStart(2, '0');
      document.getElementById('timer').innerText = `⏱️ ${mins}:${secs}`;
    }
  }, 1000);
}

function toggleTimer() {
  isTimerPaused = !isTimerPaused;
  document.getElementById('timer-toggle-btn').innerText = isTimerPaused ? "▶️" : "⏸️";
}

function finishExam() {
  clearInterval(examTimer);

  let correctCount = 0;
  let wrongCount = 0;
  let emptyCount = 0;
  const wrongListContainer = document.getElementById('wrong-answers-list');
  wrongListContainer.innerHTML = "";

  currentQuestions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    if (userAns === undefined) {
      emptyCount++;
    } else if (userAns === q.correct) {
      correctCount++;
    } else {
      wrongCount++;
      const div = document.createElement('div');
      div.style.cssText = "background:#fef2f2; border:1px solid #fee2e2; padding:10px; border-radius:8px; margin-bottom:8px; font-size:13px;";
      div.innerHTML = `
        <strong>Soru ${idx + 1}:</strong> ${q.question}<br>
        <span style="color:var(--danger);">Cevabınız: ${String.fromCharCode(65 + userAns)}) ${q.options[userAns]}</span><br>
        <span style="color:var(--success);">Doğru Cevap: ${String.fromCharCode(65 + q.correct)}) ${q.options[q.correct]}</span>
      `;
      wrongListContainer.appendChild(div);
    }
  });

  const mins = String(Math.floor(secondsPassed / 60)).padStart(2, '0');
  const secs = String(secondsPassed % 60).padStart(2, '0');

  document.getElementById('rep-correct').innerText = correctCount;
  document.getElementById('rep-wrong').innerText = wrongCount;
  document.getElementById('rep-empty').innerText = emptyCount;
  document.getElementById('rep-time').innerText = `${mins}:${secs}`;

  showScreen('report-screen');
}

// --- ADMIN PANELI VE YÖNETIM ---
function checkAdminAccess() {
  showScreen('upload-screen');
}

async function handleSaveCloudSet() {
  const topic = document.getElementById('admin-set-topic').value.trim();
  const date = document.getElementById('admin-set-date').value;
  const jsonStr = document.getElementById('admin-questions-json').value.trim();

  if (!topic || !jsonStr) {
    alert("Başlık ve JSON alanları zorunludur.");
    return;
  }

  try {
    const parsedQuestions = JSON.parse(jsonStr);
    const newSet = {
      id: "set_" + Date.now(),
      topic: topic,
      date: date || new Date().toISOString().split('T')[0],
      questions: parsedQuestions
    };

    if (window.supabaseClient) {
      await window.supabaseClient.from('question_sets').insert(newSet);
    }

    const localData = localStorage.getItem('yds_question_sets');
    const sets = localData ? JSON.parse(localData) : [];
    sets.push(newSet);
    localStorage.setItem('yds_question_sets', JSON.stringify(sets));

    alert("Soru seti başarıyla kaydedildi!");
    document.getElementById('admin-set-topic').value = "";
    document.getElementById('admin-questions-json').value = "";
  } catch (err) {
    alert("Geçersiz JSON formatı! Lütfen kontrol edin.");
  }
}

function openAdminManager(type) {
  showScreen('admin-manage-screen');
  const container = document.getElementById('admin-manager-list');
  const title = document.getElementById('admin-manager-title');

  container.innerHTML = "";

  if (type === 'sets') {
    title.innerText = "Yönet: Soru Setleri";
    const localData = localStorage.getItem('yds_question_sets');
    const sets = localData ? JSON.parse(localData) : [];

    sets.forEach((set, idx) => {
      const div = document.createElement('div');
      div.className = "set-item-card";
      div.innerHTML = `
        <div><strong>${set.topic}</strong> (${set.questions ? set.questions.length : 0} Soru)</div>
        <button class="btn btn-danger" style="width:auto; padding:6px 12px; margin:0; font-size:12px;" onclick="deleteSetItem(${idx})">Sil</button>
      `;
      container.appendChild(div);
    });
  } else {
    title.innerText = "Yönet: Kelimeler";
    if (typeof renderVocabList === "function") renderVocabList();
  }
}

function deleteSetItem(index) {
  const localData = localStorage.getItem('yds_question_sets');
  if (!localData) return;
  const sets = JSON.parse(localData);
  sets.splice(index, 1);
  localStorage.setItem('yds_question_sets', JSON.stringify(sets));
  openAdminManager('sets');
}

// --- REMINDER & EMAILJS INTEGRATION ---
function openReminderScreen() {
  showScreen('reminder-screen');
  const saved = localStorage.getItem('yds_reminder_config');
  if (saved) {
    const config = JSON.parse(saved);
    document.getElementById('reminder-email').value = config.email || '';
    document.getElementById('reminder-active').checked = !!config.active;
  }
}

function saveReminderSettings() {
  const email = document.getElementById('reminder-email').value.trim();
  const isActive = document.getElementById('reminder-active').checked;

  if (!email) {
    alert("Lütfen geçerli bir e-posta adresi girin.");
    return;
  }

  const reminderConfig = {
    email: email,
    active: isActive,
    username: currentUser || "Öğrenci"
  };

  localStorage.setItem('yds_reminder_config', JSON.stringify(reminderConfig));
  alert("Hatırlatıcı ayarlarınız kaydedildi!");
}

function sendTestReminderEmail() {
  const email = document.getElementById('reminder-email').value.trim();
  const username = currentUser || "Öğrenci";

  if (!email) {
    alert("Lütfen önce e-posta adresinizi girin.");
    return;
  }

  const serviceID = "YOUR_SERVICE_ID";
  const templateID = "YOUR_TEMPLATE_ID";

  const templateParams = {
    to_email: email,
    to_name: username,
    message: "Bonjour! L'Académie YDS Fransızca Asistanı günlük çalışma hatırlatıcınız. Bugün yeni kelimeler öğrenmeye hazır mısınız?"
  };

  alert("E-posta gönderiliyor...");

  if (window.emailjs) {
    emailjs.send(serviceID, templateID, templateParams)
      .then(() => alert("Test e-postası başarıyla gönderildi!"))
      .catch(() => alert("E-posta gönderimi başarısız. EmailJS Key'lerinizi kontrol edin."));
  } else {
    alert("EmailJS servisi henüz başlatılmamış.");
  }
}
