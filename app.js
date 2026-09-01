// --- SUPABASE & UYGULAMA MANTIĞI ---

// Supabase Bağlantı Bilgileri (Kendi Supabase panelinden aldığın bilgileri buraya yazmalısın)
const SUPABASE_URL = "https://fcqppdjmvvkqrnwmrlhr.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "sb_publishable_vXsVr3iPRsm8-u-L0HpPwA_GRwXVFpX";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentScreen = 'login-screen';
let currentUser = localStorage.getItem("yds_current_user") || "";
let timerInterval = null;
let secondsElapsed = 0;
let isTimerPaused = false;

let activeQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let currentExamTopic = "";
let currentExamDate = "";

let studyVocabList = [];
let currentVocabIndex = 0;
let isCardFlipped = false;

window.onload = function() {
  if (currentUser) {
    document.getElementById("welcome-username").innerText = currentUser;
    showScreen('main-menu');
    checkDailyReminderTrigger();
  } else {
    showScreen('login-screen');
  }
};

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
  currentScreen = screenId;

  if (screenId === 'history-screen') {
    renderHistory();
  } else if (screenId === 'analytics-screen') {
    renderAnalytics('weekly');
  } else if (screenId === 'vocab-menu-screen') {
    renderVocabList();
  } else if (screenId === 'reminder-screen') {
    loadReminderSettings();
  } else if (screenId === 'quiz-screen') {
    startTimer();
  } else {
    stopTimer();
  }
}

function handleLogin() {
  const input = document.getElementById("username-input").value.trim();
  if (!input) {
    alert("⚠️ Lütfen adınızı girin!");
    return;
  }
  currentUser = input;
  localStorage.setItem("yds_current_user", currentUser);
  document.getElementById("welcome-username").innerText = currentUser;
  showScreen('main-menu');
  checkDailyReminderTrigger();
}

function handleLogout() {
  localStorage.removeItem("yds_current_user");
  currentUser = "";
  document.getElementById("username-input").value = "";
  showScreen('login-screen');
}

function confirmResetUserData() {
  if (confirm("Tüm kişisel sınav geçmişiniz ve kayıtlı kelimeleriniz silinecek. Emin misiniz?")) {
    localStorage.removeItem(`yds_history_${currentUser}`);
    localStorage.removeItem(`yds_vocab_${currentUser}`);
    localStorage.removeItem(`yds_reminder_${currentUser}`);
    alert("✅ Verileriniz sıfırlandı.");
    showScreen('main-menu');
  }
}

function checkAdminAccess() {
  const pass = prompt("Yönetici şifresini girin:");
  if (pass === "258025") {
    showScreen('upload-screen');
  } else if (pass !== null) {
    alert("❌ Hatalı şifre!");
  }
}

// --- BULUT (SUPABASE) SORU YÖNETİMİ ---

async function handleSaveCloudSet() {
  const topic = document.getElementById("admin-set-topic").value.trim();
  const articleTitle = document.getElementById("admin-article-title").value.trim();
  const articleText = document.getElementById("admin-article-text").value.trim();
  const questionsJsonStr = document.getElementById("admin-questions-json").value.trim();

  if (!topic || !articleTitle || !articleText || !questionsJsonStr) {
    alert("⚠️ Lütfen tüm alanları doldurun!");
    return;
  }

  let questionsParsed;
  try {
    questionsParsed = JSON.parse(questionsJsonStr);
  } catch (e) {
    alert("❌ Sorular JSON formatında hatalı! Lütfen geçerli bir JSON yapısı girin.");
    return;
  }

  const newSetData = {
    id: "set_" + Date.now(),
    topic: topic,
    date: new Date().toISOString().split('T')[0],
    article_title: articleTitle,
    article_text: articleText,
    questions_json: questionsParsed
  };

  const { data, error } = await supabaseClient
    .from('questions')
    .insert([newSetData]);

  if (error) {
    alert("❌ Buluta kaydedilemedi: " + error.message);
  } else {
    alert("✅ Soru seti başarıyla buluta kaydedildi ve tüm cihazlar için aktifleşti!");
    document.getElementById("admin-set-topic").value = "";
    document.getElementById("admin-article-title").value = "";
    document.getElementById("admin-article-text").value = "";
    document.getElementById("admin-questions-json").value = "";
    showScreen('upload-screen');
  }
}

async function openSetSelection() {
  const container = document.getElementById("set-list-container");
  container.innerHTML = "<div style='text-align:center; padding:20px; color:#38bdf8;'>Buluttan soru setleri yükleniyor...</div>";
  showScreen('set-select-screen');

  const { data: rawSets, error } = await supabaseClient
    .from('questions')
    .select('*');

  if (error) {
    container.innerHTML = "<div style='text-align:center; padding:20px; color:#ef4444;'>Soru setleri yüklenirken hata oluştu: " + error.message + "</div>";
    return;
  }

  if (!rawSets || rawSets.length === 0) {
    container.innerHTML = "<div style='text-align:center; padding:20px; color:#94a3b8;'>Bulutta soru seti bulunmuyor.</div>";
    return;
  }

  let html = "";
  rawSets.forEach((set) => {
    const displayName = set.topic || set.article_title;
    const qCount = set.questions_json ? set.questions_json.length : 0;
    html += `
      <div class="set-item-card" onclick="startExamSet('${set.id}')">
        <div>
          <h3 style="color:#38bdf8; font-size:15px; margin-bottom:4px;">${displayName}</h3>
          <p style="font-size:12px; color:#94a3b8;">${qCount} Soru</p>
        </div>
        <button class="btn btn-primary" style="font-size:12px; padding:6px 12px;">Çöz ➔</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function startExamSet(setId) {
  const { data: rawSets, error } = await supabaseClient
    .from('questions')
    .select('*');

  if (error || !rawSets) {
    alert("⚠️ Soru seti verileri alınamadı!");
    return;
  }

  const selectedSet = rawSets.find(s => s.id === setId);
  if (!selectedSet) {
    alert("⚠️ Seçilen soru seti bulunamadı!");
    return;
  }

  currentExamTopic = selectedSet.topic || "Deneme";
  currentExamDate = selectedSet.date || new Date().toISOString().split('T')[0];
  activeQuestions = selectedSet.questions_json || [];
  currentQuestionIndex = 0;
  userAnswers = {};

  document.getElementById("article-title").innerText = selectedSet.article_title || "Metin";
  document.getElementById("article-text").innerText = selectedSet.article_text || "";
  document.getElementById("article-number").innerText = currentExamTopic;

  secondsElapsed = 0;
  isTimerPaused = false;
  showScreen('quiz-screen');
  loadQuestion();
}

// --- E-POSTA HATIRLATICI FONKSİYONLARI ---

function openReminderScreen() {
  showScreen('reminder-screen');
}

function loadReminderSettings() {
  const data = JSON.parse(localStorage.getItem(`yds_reminder_${currentUser}`)) || { email: "", active: false };
  document.getElementById("reminder-email").value = data.email || "";
  document.getElementById("reminder-active").checked = data.active || false;
}

function saveReminderSettings() {
  const email = document.getElementById("reminder-email").value.trim();
  const active = document.getElementById("reminder-active").checked;

  if (active && !email) {
    alert("⚠️ Hatırlatıcı aktif edebilmek için geçerli bir e-posta adresi girmelisin!");
    return;
  }

  const reminderData = { email, active, lastSent: "" };
  localStorage.setItem(`yds_reminder_${currentUser}`, JSON.stringify(reminderData));
  alert("✅ Hatırlatıcı ayarların kaydedildi!");
  showScreen('main-menu');
}

function sendTestReminderEmail() {
  const email = document.getElementById("reminder-email").value.trim();
  if (!email) {
    alert("⚠️ Lütfen önce e-posta adresini gir!");
    return;
  }

  const templateParams = {
    to_email: email,
    to_name: currentUser,
    from_name: "YDS Fransızca Asistanı",
    message: "Bonjour " + currentUser + "! Paris'in en güzel kafesinde kahveni yudumluyormuş gibi hayal et, ama önce o YDS Fransızca netlerini yukarı çekmemiz lazım. Bugün küçük bir adım, yarın büyük bir zafer demektir. Masaya oturma vakti!"
  };

  emailjs.send("service_snh9thi", "template_2n21pgo", templateParams)
    .then(function(response) {
      alert("✅ Hatırlatıcı e-postası başarıyla gönderildi!");
    }, function(error) {
      alert("❌ E-posta gönderilemedi. Lütfen index.html içindeki EmailJS Public Key'ini kontrol et.\nHata: " + JSON.stringify(error));
    });
}

function checkDailyReminderTrigger() {
  const reminderData = JSON.parse(localStorage.getItem(`yds_reminder_${currentUser}`));
  if (!reminderData || !reminderData.active || !reminderData.email) return;

  const todayStr = new Date().toISOString().split('T')[0];
  if (reminderData.lastSent !== todayStr) {
    const templateParams = {
      to_email: reminderData.email,
      to_name: currentUser,
      from_name: "YDS Fransızca Asistanı",
      message: "Günlük YDS Fransızca çalışma vaktin geldi! Bugün portala girip pratik yapmayı ihmal etme."
    };

    emailjs.send("service_snh9thi", "template_2n21pgo", templateParams)
      .then(function(response) {
        reminderData.lastSent = todayStr;
        localStorage.setItem(`yds_reminder_${currentUser}`, JSON.stringify(reminderData));
      }, function(error) {
        console.warn("Otomatik günlük hatırlatıcı gönderilemedi:", error);
      });
  }
}

// --- KELİME DEFTERİ & YÖNETİCİ MODÜLLERİ ---

function handleSaveVocab() {
  const word = document.getElementById("vocab-word").value.trim();
  const meaning = document.getElementById("vocab-meaning").value.trim();
  const synonyms = document.getElementById("vocab-synonyms").value.trim();
  const example = document.getElementById("vocab-example").value.trim();

  if (!word || !meaning) {
    alert("⚠️ Lütfen Fransızca kelimeyi ve Türkçe anlamını gir!");
    return;
  }

  const vocabKey = `yds_vocab_${currentUser}`;
  let vocabList = JSON.parse(localStorage.getItem(vocabKey)) || [];

  const newVocab = {
    id: "vocab_" + Date.now(),
    word: word,
    meaning: meaning,
    synonyms: synonyms || "-",
    example: example || "-"
  };

  vocabList.push(newVocab);
  localStorage.setItem(vocabKey, JSON.stringify(vocabList));

  alert("✅ Kelime defterine başarıyla eklendi!");
  document.getElementById("vocab-word").value = "";
  document.getElementById("vocab-meaning").value = "";
  document.getElementById("vocab-synonyms").value = "";
  document.getElementById("vocab-example").value = "";
  showScreen('vocab-menu-screen');
}

function renderVocabList() {
  const vocabKey = `yds_vocab_${currentUser}`;
  let vocabList = JSON.parse(localStorage.getItem(vocabKey)) || [];
  const container = document.getElementById("vocab-list-container");

  if (vocabList.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#94a3b8; font-size:13px; padding:15px;'>Henüz kelime eklemedin.</p>";
    return;
  }

  let html = "";
  vocabList.forEach((v) => {
    html += `
      <div style="background:#1e293b; border:1px solid #334155; padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#38bdf8; font-size:14px;">${v.word}</strong> - <span style="color:#e2e8f0; font-size:13px;">${v.meaning}</span>
        </div>
        <button class="btn btn-danger" style="padding:4px 8px; font-size:11px;" onclick="deleteVocab('${v.id}')">Sil</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

function deleteVocab(vocabId) {
  if (!confirm("Bu kelimeyi silmek istediğine emin misin?")) return;
  const vocabKey = `yds_vocab_${currentUser}`;
  let vocabList = JSON.parse(localStorage.getItem(vocabKey)) || [];
  vocabList = vocabList.filter(v => v.id !== vocabId);
  localStorage.setItem(vocabKey, JSON.stringify(vocabList));
  renderVocabList();
}

function startFlashcards() {
  const vocabKey = `yds_vocab_${currentUser}`;
  studyVocabList = JSON.parse(localStorage.getItem(vocabKey)) || [];
  if (studyVocabList.length === 0) {
    alert("⚠️ Tekrar yapabilmek için önce kelime eklemelisin!");
    return;
  }
  studyVocabList.sort(() => Math.random() - 0.5);
  currentVocabIndex = 0;
  showScreen('vocab-study-screen');
  loadFlashcard();
}

function loadFlashcard() {
  if (studyVocabList.length === 0) return;
  const item = studyVocabList[currentVocabIndex];
  document.getElementById("vocab-counter").innerText = `Kart ${currentVocabIndex + 1} / ${studyVocabList.length}`;
  document.getElementById("fc-word").innerText = item.word;
  document.getElementById("fc-meaning").innerText = item.meaning;
  document.getElementById("fc-synonyms").innerText = item.synonyms;
  document.getElementById("fc-example").innerText = `"${item.example}"`;
  isCardFlipped = false;
  document.getElementById("flashcard-front").style.display = "block";
  document.getElementById("flashcard-back").style.display = "none";
}

function flipFlashcard() {
  isCardFlipped = !isCardFlipped;
  document.getElementById("flashcard-front").style.display = isCardFlipped ? "none" : "block";
  document.getElementById("flashcard-back").style.display = isCardFlipped ? "block" : "none";
}

function nextFlashcard(status) {
  if (status === 'again') studyVocabList.push(studyVocabList[currentVocabIndex]);
  currentVocabIndex++;
  if (currentVocabIndex < studyVocabList.length) {
    loadFlashcard();
  } else {
    alert("🎉 Tebrikler! Tüm kelime kartlarını tamamladın.");
    showScreen('vocab-menu-screen');
  }
}

async function openAdminManager(type) {
  const listContainer = document.getElementById("admin-manager-list");
  const titleEl = document.getElementById("admin-manager-title");
  showScreen('admin-manage-screen');

  if (type === 'sets') {
    titleEl.innerText = "📝 Buluttaki Soru Setlerini Yönet / Sil";
    listContainer.innerHTML = "<p style='text-align:center; color:#38bdf8; padding:15px;'>Yükleniyor...</p>";

    const { data: rawSets, error } = await supabaseClient
      .from('questions')
      .select('*');

    if (error || !rawSets || rawSets.length === 0) {
      listContainer.innerHTML = "<p style='text-align:center; color:#94a3b8; font-size:13px; padding:15px;'>Bulutta soru seti bulunmuyor.</p>";
      return;
    }

    let html = "";
    rawSets.forEach((set) => {
      html += `
        <div style="background:#1e293b; border:1px solid #334155; padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div><strong style="color:#38bdf8; font-size:14px;">${set.topic || set.article_title}</strong></div>
          <button class="btn btn-danger" style="padding:6px 12px; font-size:12px;" onclick="deleteCloudSet('${set.id}')">Sil</button>
        </div>
      `;
    });
    listContainer.innerHTML = html;

  } else if (type === 'vocab') {
    titleEl.innerText = "📚 Kayıtlı Kelimeleri Yönet / Sil";
    const vocabKey = `yds_vocab_${currentUser}`;
    let vocabList = JSON.parse(localStorage.getItem(vocabKey)) || [];
    if (vocabList.length === 0) {
      listContainer.innerHTML = "<p style='text-align:center; color:#94a3b8; font-size:13px; padding:15px;'>Kayıtlı kelime bulunmuyor.</p>";
      return;
    }
    let html = "";
    vocabList.forEach((v) => {
      html += `
        <div style="background:#1e293b; border:1px solid #334155; padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div><strong style="color:#38bdf8; font-size:14px;">${v.word}</strong></div>
          <button class="btn btn-danger" style="padding:6px 12px; font-size:12px;" onclick="deleteAdminVocab('${v.id}')">Sil</button>
        </div>
      `;
    });
    listContainer.innerHTML = html;
  }
}

async function deleteCloudSet(setId) {
  if (!confirm("Bu soru setini buluttan kalıcı olarak silmek istediğine emin misin?")) return;
  const { error } = await supabaseClient
    .from('questions')
    .delete()
    .eq('id', setId);

  if (error) {
    alert("❌ Silinemedi: " + error.message);
  } else {
    alert("✅ Soru seti buluttan silindi.");
    openAdminManager('sets');
  }
}

function deleteAdminVocab(vocabId) {
  if (!confirm("Bu kelimeyi silmek istediğine emin misin?")) return;
  const vocabKey = `yds_vocab_${currentUser}`;
  let vocabList = JSON.parse(localStorage.getItem(vocabKey)) || [];
  vocabList = vocabList.filter(v => v.id !== vocabId);
  localStorage.setItem(vocabKey, JSON.stringify(vocabList));
  openAdminManager('vocab');
}

function loadQuestion() {
  if (activeQuestions.length === 0) return;
  const q = activeQuestions[currentQuestionIndex];
  document.getElementById("question-number").innerText = `Soru ${currentQuestionIndex + 1} / ${activeQuestions.length}`;
  document.getElementById("question-title").innerText = q.question;
  
  let optHtml = "";
  for (const [key, val] of Object.entries(q.options)) {
    const upperKey = key.toUpperCase();
    const isSelected = userAnswers[currentQuestionIndex] === upperKey ? "selected" : "";
    optHtml += `<button class="option-btn ${isSelected}" onclick="selectOption('${upperKey}')"><strong>${upperKey})</strong> ${val}</button>`;
  }
  document.getElementById("options-group").innerHTML = optHtml;
  document.getElementById("explanation-box").style.display = "none";
}

function selectOption(optKey) {
  userAnswers[currentQuestionIndex] = optKey;
  loadQuestion();
}

function toggleAnswerVisibility() {
  const expBox = document.getElementById("explanation-box");
  expBox.style.display = expBox.style.display === "none" ? "block" : "none";
  expBox.innerText = "💡 Açıklama: " + activeQuestions[currentQuestionIndex].explanation;
}

function nextQuestion() {
  if (currentQuestionIndex < activeQuestions.length - 1) {
    currentQuestionIndex++;
    loadQuestion();
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadQuestion();
  }
}

function startTimer() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (!isTimerPaused) {
      secondsElapsed++;
      const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
      const secs = (secondsElapsed % 60).toString().padStart(2, '0');
      document.getElementById("timer").innerText = `⏱️ ${mins}:${secs}`;
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

function toggleTimer() {
  isTimerPaused = !isTimerPaused;
  document.getElementById("timer-toggle-btn").innerText = isTimerPaused ? "▶️" : "⏸️";
}

function finishExam() {
  if (!confirm("Sınavı bitirmek istediğine emin misin?")) return;
  stopTimer();
  
  let correct = 0, wrong = 0, empty = 0;
  let wrongDetailsHtml = "";

  activeQuestions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    if (!userAns) empty++;
    else if (userAns === q.correct.toUpperCase()) correct++;
    else {
      wrong++;
      wrongDetailsHtml += `<div style="background:#0f172a; padding:8px; border-radius:6px; margin-bottom:6px; border-left:3px solid #ef4444;">Soru ${idx + 1} yanlış. Doğru: ${q.correct.toUpperCase()}</div>`;
    }
  });

  const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
  const secs = (secondsElapsed % 60).toString().padStart(2, '0');
  const timeFormatted = `${mins}:${secs}`;

  const historyKey = `yds_history_${currentUser}`;
  let historyList = JSON.parse(localStorage.getItem(historyKey)) || [];
  historyList.push({
    topic: currentExamTopic,
    date: currentExamDate,
    correct, wrong, empty,
    totalQuestions: activeQuestions.length,
    totalSeconds: secondsElapsed,
    timeFormatted
  });
  localStorage.setItem(historyKey, JSON.stringify(historyList));

  document.getElementById("rep-correct").innerText = correct;
  document.getElementById("rep-wrong").innerText = wrong;
  document.getElementById("rep-empty").innerText = empty;
  document.getElementById("rep-time").innerText = timeFormatted;
  document.getElementById("wrong-answers-list").innerHTML = wrongDetailsHtml || "<p style='color:#10b981;'>Tebrikler, hiç yanlışın yok! 🎉</p>";
  
  showScreen('report-screen');
}