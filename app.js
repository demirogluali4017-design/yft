// --- SUPABASE & UYGULAMA MANTIĞI ---

const SUPABASE_URL = "https://fcqppdjmvvkqrnwmrlhr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_vXsVr3iPRsm8-u-L0HpPwA_GRwXVFpX";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentScreen = 'login-screen';
let currentUser = localStorage.getItem("yds_current_user") || "";
let timerInterval = null;
let secondsElapsed = 0;
let isTimerPaused = false;

// Çoklu paragraf ve soru yönetimi değişkenleri
let activeParagraphs = []; 
let currentParagraphIndex = 0; 
let currentQuestionIndex = 0; 
let userAnswers = {}; 
let currentExamTopic = "";
let currentExamDate = "";

// Kelime ve Quizlet modülü değişkenleri
let studyVocabList = [];
let currentVocabIndex = 0;
let isCardFlipped = false;
let quizVocabList = [];
let currentQuizIndex = 0;
let quizScore = 0;

// Eşleştirme oyunu değişkenleri
let matchVocabList = [];
let selectedWordCard = null;
let selectedMeaningCard = null;
let matchedPairsCount = 0;
let matchStartTime = 0;

// Kelime Türü İsimlendirme Sözlüğü
const typeLabels = {
  noun: { text: "İsim", class: "badge-noun" },
  verb: { text: "Fiil", class: "badge-verb" },
  adjective: { text: "Sıfat", class: "badge-adjective" },
  adverb: { text: "Zarf", class: "badge-adverb" },
  conjunction: { text: "Bağlaç", class: "badge-conjunction" }
};

window.onload = function() {
  const todayDateStr = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById("admin-set-date");
  if (dateInput) dateInput.value = todayDateStr;

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

  if (screenId === 'vocab-menu-screen') {
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
  if (confirm("Tüm kişisel sınav geçmişiniz ve kayıtlı ayarlarınız sıfırlanacak. Emin misiniz?")) {
    localStorage.removeItem(`yds_history_${currentUser}`);
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

// --- GEMINI AI İLE CÜMLE VE EŞ ANLAMLI ÜRETİMİ ---

async function generateAiSentence() {
  const word = document.getElementById("vocab-word").value.trim();
  const type = document.getElementById("vocab-type").value;
  const meaning = document.getElementById("vocab-meaning").value.trim();
  
  // BURAYA YENİ ALACAĞINIZ GOOGLE AI STUDIO API KEY'İNİZİ GİRİN
  const GEMINI_API_KEY = "YENI_ALACAGINIZ_API_KEY"; 

  if (!word) {
    alert("⚠️ Lütfen önce bir Fransızca kelime yazın!");
    return;
  }

  if (GEMINI_API_KEY === "YENI_ALACAGINIZ_API_KEY" || !GEMINI_API_KEY) {
    alert("⚠️ Lütfen app.js içinde GEMINI_API_KEY değişkenine yeni aldığınız API anahtarınızı yapıştırın!");
    return;
  }

  const exampleArea = document.getElementById("vocab-example");
  const synonymsInput = document.getElementById("vocab-synonyms");

  exampleArea.value = "";
  exampleArea.placeholder = "🤖 Gemini AI YDS seviyesinde özgün cümle üretiyor...";

  const promptText = `Sen bir Fransızca YDS/Akademik sınav eğitmenisin.
  Kelime: "${word}"
  Kelime Türü: "${type}"
  ${meaning ? `Anlamı: "${meaning}"` : ""}
  
  Görevler:
  1. Bu Fransızca kelimeyi doğru dilbilgisiyle içeren, YDS seviyesinde, akademik ve doğal bir Fransızca örnek cümle yaz. Yanına parantez içinde Türkçe çevirisini ekle.
  2. Bu kelimenin Fransızca 2-3 adet akademik eş anlamlısını (synonym) virgülle ayırarak yaz.

  Yanıtı YALNIZCA şu JSON formatında ver, başka hiçbir metin veya markdown ekleme:
  {
    "sentence": "Fransızca cümle (Türkçe çevirisi)",
    "synonyms": "eş1, eş2, eş3"
  }`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0].content.parts[0].text) {
      let rawText = data.candidates[0].content.parts[0].text.trim();
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      const parsedResult = JSON.parse(rawText);

      exampleArea.value = parsedResult.sentence || "";
      if (synonymsInput && parsedResult.synonyms) {
        synonymsInput.value = parsedResult.synonyms;
      }
    } else {
      throw new Error("Geçerli yanıt alınamadı.");
    }

  } catch (err) {
    console.error("Gemini API Hatası:", err);
    exampleArea.placeholder = "Örnek Cümle";
    alert("❌ AI yanıt verirken bir sorun oluştu. API anahtarınızı kontrol edin.");
  }
}

// --- KELİME DIŞA AKTAR (EXPORT) ARAÇLARI ---

async function exportVocabulary(format = 'json') {
  try {
    const { data: vocabList, error } = await supabaseClient
      .from('user_vocab')
      .select('*')
      .eq('username', currentUser);

    if (error) throw error;

    if (!vocabList || vocabList.length === 0) {
      alert("⚠️ İndirilecek kayıtlı kelimeniz bulunmuyor.");
      return;
    }

    let fileData, fileName, mimeType;

    if (format === 'csv') {
      const headers = ["ID", "Kelime (FR)", "Anlamı (TR)", "Eş Anlamlılar", "Örnek Cümle", "Tür"];
      const csvRows = [
        headers.join(','),
        ...vocabList.map(item => 
          `"${item.id}","${item.word || ''}","${item.meaning || ''}","${item.synonyms || ''}","${(item.example || '').replace(/"/g, '""')}","${item.type || ''}"`
        )
      ];
      fileData = "\uFEFF" + csvRows.join('\n'); // Türkçe karakter desteği
      fileName = `kelimelerim_${currentUser}_${new Date().toISOString().slice(0,10)}.csv`;
      mimeType = 'text/csv;charset=utf-8;';
    } else {
      fileData = JSON.stringify(vocabList, null, 2);
      fileName = `kelimelerim_${currentUser}_${new Date().toISOString().slice(0,10)}.json`;
      mimeType = 'application/json';
    }

    const blob = new Blob([fileData], { type: mimeType });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (err) {
    console.error("Export hatası:", err);
    alert("❌ Kelimeler indirilirken bir hata oluştu: " + err.message);
  }
}

// --- BULUT (SUPABASE) ÇOKLU PARAGRAF & SORU YÖNETİMİ ---

async function handleSaveCloudSet() {
  const topic = document.getElementById("admin-set-topic").value.trim();
  const dateVal = document.getElementById("admin-set-date").value.trim() || new Date().toISOString().split('T')[0];
  const questionsJsonStr = document.getElementById("admin-questions-json").value.trim();

  if (!topic || !questionsJsonStr) {
    alert("⚠️ Lütfen konu başlığını ve JSON kodunu girin!");
    return;
  }

  let paragraphsParsed;
  try {
    paragraphsParsed = JSON.parse(questionsJsonStr);
  } catch (e) {
    alert("❌ JSON formatı hatalı! Lütfen geçerli bir JSON yapısı girdiğinizden emin olun.");
    return;
  }

  if (Array.isArray(paragraphsParsed) && paragraphsParsed.length > 0 && paragraphsParsed[0].question) {
    paragraphsParsed = [{
      paragraph_title: topic,
      paragraph_text: "YDS Fransızca Soru Paketi",
      questions: paragraphsParsed
    }];
  }

  const newSetData = {
    id: "set_" + Date.now(),
    topic: topic,
    date: dateVal,
    article_title: topic, 
    article_text: "Çoklu Paragraf Soru Paketi", 
    questions_json: paragraphsParsed 
  };

  const { error } = await supabaseClient
    .from('questions')
    .insert([newSetData]);

  if (error) {
    alert("❌ Buluta kaydedilemedi: " + error.message);
  } else {
    alert("✅ Çoklu paragraf soru seti başarıyla buluta kaydedildi!");
    document.getElementById("admin-set-topic").value = "";
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
    let totalQCount = 0;
    if (Array.isArray(set.questions_json)) {
      set.questions_json.forEach(item => {
        if (item.questions && Array.isArray(item.questions)) {
          totalQCount += item.questions.length;
        } else {
          totalQCount += 1;
        }
      });
    }

    html += `
      <div class="set-item-card" onclick="startExamSet('${set.id}')">
        <div>
          <h3 style="color:#00b4d8; font-size:15px; margin-bottom:4px;">${displayName}</h3>
          <p style="font-size:12px; color:#64748b; margin:0;">${totalQCount} Soru • ${set.date || ''}</p>
        </div>
        <button class="btn btn-primary" style="font-size:12px; padding:6px 12px; width:auto; margin:0;">Çöz ➔</button>
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
  
  let parsedData = selectedSet.questions_json || [];
  
  if (Array.isArray(parsedData) && parsedData.length > 0 && parsedData[0].question) {
    activeParagraphs = [{
      paragraph_title: selectedSet.article_title || currentExamTopic,
      paragraph_text: selectedSet.article_text || "",
      questions: parsedData
    }];
  } else {
    activeParagraphs = parsedData;
  }

  currentParagraphIndex = 0;
  currentQuestionIndex = 0;
  userAnswers = {};

  secondsElapsed = 0;
  isTimerPaused = false;
  showScreen('quiz-screen');
  loadParagraphAndQuestion();
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
      alert("❌ E-posta gönderilemedi. Hata: " + JSON.stringify(error));
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

// --- KELİME DEFTERİ & BULUT KELİME YÖNETİMİ ---

async function handleSaveVocab() {
  const word = document.getElementById("vocab-word").value.trim();
  const meaning = document.getElementById("vocab-meaning").value.trim();
  const synonyms = document.getElementById("vocab-synonyms").value.trim();
  const example = document.getElementById("vocab-example").value.trim();
  const type = document.getElementById("vocab-type").value;

  if (!word || !meaning) {
    alert("⚠️ Lütfen Fransızca kelimeyi ve Türkçe anlamını gir!");
    return;
  }

  const newVocab = {
    id: "vocab_" + Date.now(),
    username: currentUser,
    word: word,
    meaning: meaning,
    synonyms: synonyms || "-",
    example: example || "-",
    type: type || "noun"
  };

  const { error } = await supabaseClient
    .from('user_vocab')
    .insert([newVocab]);

  if (error) {
    alert("❌ Kelime buluta kaydedilemedi: " + error.message);
  } else {
    alert("✅ Kelime başarıyla buluta kaydedildi!");
    document.getElementById("vocab-word").value = "";
    document.getElementById("vocab-meaning").value = "";
    document.getElementById("vocab-synonyms").value = "";
    document.getElementById("vocab-example").value = "";
    showScreen('vocab-menu-screen');
  }
}

async function renderVocabList() {
  const container = document.getElementById("vocab-list-container");
  const filterType = document.getElementById("vocab-filter") ? document.getElementById("vocab-filter").value : "all";
  container.innerHTML = "<p style='text-align:center; color:#00b4d8; padding:15px;'>Kelimeler buluttan yükleniyor...</p>";

  const { data: vocabList, error } = await supabaseClient
    .from('user_vocab')
    .select('*')
    .eq('username', currentUser);

  if (error) {
    container.innerHTML = "<p style='text-align:center; color:#ef4444; font-size:13px; padding:15px;'>Kelimeler yüklenirken hata oluştu.</p>";
    return;
  }

  if (!vocabList || vocabList.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#94a3b8; font-size:13px; padding:15px;'>Bulutta kayıtlı kelimen bulunmuyor.</p>";
    return;
  }

  let filteredList = vocabList;
  if (filterType !== 'all') {
    filteredList = vocabList.filter(v => (v.type || 'noun') === filterType);
  }

  if (filteredList.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#94a3b8; font-size:13px; padding:15px;'>Bu kategoride henüz kelime bulunmuyor.</p>";
    return;
  }

  let html = "";
  filteredList.forEach((v) => {
    const wordType = v.type || 'noun';
    const badgeInfo = typeLabels[wordType] || typeLabels['noun'];

    html += `
      <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px 14px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <strong style="color:#00b4d8; font-size:14px;">${v.word}</strong>
          <span class="badge ${badgeInfo.class}">${badgeInfo.text}</span>
          <br>
          <span style="color:#475569; font-size:13px;">${v.meaning}</span>
        </div>
        <button class="btn btn-danger" style="padding:4px 8px; font-size:11px; width:auto; margin:0;" onclick="deleteVocab('${v.id}')">Sil</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

async function deleteVocab(vocabId) {
  if (!confirm("Bu kelimeyi silmek istediğine emin misin?")) return;
  
  const { error } = await supabaseClient
    .from('user_vocab')
    .delete()
    .eq('id', vocabId);

  if (error) {
    alert("❌ Kelime silinemedi: " + error.message);
  } else {
    renderVocabList();
  }
}

// --- ÇALIŞMA VE OYUN MODLARI (FLASHCARD, QUIZ, MATCH, TÜR TESTİ) ---

async function startFlashcards() {
  const { data: vocabList, error } = await supabaseClient
    .from('user_vocab')
    .select('*')
    .eq('username', currentUser);

  if (error || !vocabList || vocabList.length === 0) {
    alert("⚠️ Çalışabilmek için bulutta kayıtlı kelimelerin olmalı!");
    return;
  }

  studyVocabList = vocabList.sort(() => Math.random() - 0.5);
  currentVocabIndex = 0;
  showScreen('vocab-study-screen');
  loadFlashcard();
}

function loadFlashcard() {
  if (studyVocabList.length === 0) return;
  const item = studyVocabList[currentVocabIndex];
  const badgeInfo = typeLabels[item.type || 'noun'] || typeLabels['noun'];

  document.getElementById("vocab-counter").innerText = `Kart ${currentVocabIndex + 1} / ${studyVocabList.length}`;
  document.getElementById("fc-word").innerHTML = `${item.word} <br><span class="badge ${badgeInfo.class}" style="font-size:12px;">${badgeInfo.text}</span>`;
  document.getElementById("fc-meaning").innerText = item.meaning;
  document.getElementById("fc-synonyms").innerText = item.synonyms;
  document.getElementById("fc-example").innerText = `"${item.example}"`;
  isCardFlipped = false;
  document.getElementById("flashcard-front").style.display = "flex";
  document.getElementById("flashcard-back").style.display = "none";
}

function flipFlashcard() {
  isCardFlipped = !isCardFlipped;
  document.getElementById("flashcard-front").style.display = isCardFlipped ? "none" : "flex";
  document.getElementById("flashcard-back").style.display = isCardFlipped ? "block" : "none";
}

function nextFlashcard(status) {
  if (status === 'again') studyVocabList.push(studyVocabList[currentVocabIndex]);
  currentVocabIndex++;
  if (currentVocabIndex < studyVocabList.length) {
    loadFlashcard();
  } else {
    alert("🎉 Harika! Tüm kelime kartlarını tamamladın.");
    showScreen('vocab-menu-screen');
  }
}

// Anlam Testi
async function startVocabQuiz() {
  const { data: vocabList, error } = await supabaseClient
    .from('user_vocab')
    .select('*')
    .eq('username', currentUser);

  if (error || !vocabList || vocabList.length < 4) {
    alert("⚠️ Quiz çözebilmek için bulutta en az 4 kelimen olmalıdır!");
    return;
  }

  quizVocabList = vocabList.sort(() => Math.random() - 0.5);
  currentQuizIndex = 0;
  quizScore = 0;
  renderCurrentQuizQuestion();
}

function renderCurrentQuizQuestion() {
  if (currentQuizIndex >= quizVocabList.length) {
    alert(`🎯 Quiz Tamamlandı! Skorun: ${quizScore} / ${quizVocabList.length}`);
    showScreen('vocab-menu-screen');
    return;
  }

  const currentItem = quizVocabList[currentQuizIndex];
  
  let options = [currentItem.meaning];
  let otherWords = quizVocabList.filter(v => v.id !== currentItem.id);
  otherWords.sort(() => Math.random() - 0.5);
  
  for (let i = 0; i < Math.min(3, otherWords.length); i++) {
    options.push(otherWords[i].meaning);
  }
  options.sort(() => Math.random() - 0.5);

  showScreen('vocab-study-screen');
  document.getElementById("vocab-counter").innerText = `Anlam Quizi (${currentQuizIndex + 1}/${quizVocabList.length})`;
  document.getElementById("fc-word").innerHTML = `<span style="font-size:20px; color:#00b4d8;">${currentItem.word}</span>`;
  
  let optButtonsHtml = "<div style='margin-top:10px; text-align:left;'>";
  options.forEach(opt => {
    optButtonsHtml += `<button class='btn btn-secondary' style='width:100%; margin-bottom:6px; padding:10px; font-size:13px;' onclick="evaluateQuizAnswer('${opt.replace(/'/g, "\\'")}', '${currentItem.meaning.replace(/'/g, "\\'")}')">${opt}</button>`;
  });
  optButtonsHtml += "</div>";
  
  document.getElementById("fc-meaning").innerHTML = optButtonsHtml;
  document.getElementById("fc-synonyms").innerText = "";
  document.getElementById("fc-example").innerText = "";
  document.getElementById("flashcard-front").style.display = "flex";
  document.getElementById("flashcard-back").style.display = "none";
}

function evaluateQuizAnswer(selected, correct) {
  if (selected === correct) {
    quizScore++;
    alert("✅ Doğru!");
  } else {
    alert(`❌ Yanlış! Doğru cevap: ${correct}`);
  }
  currentQuizIndex++;
  renderCurrentQuizQuestion();
}

// 🏷️ KELİME TÜRÜ YOKLAMASI (TÜR QUIZI)
async function startTypeQuiz() {
  const { data: vocabList, error } = await supabaseClient
    .from('user_vocab')
    .select('*')
    .eq('username', currentUser);

  if (error || !vocabList || vocabList.length < 2) {
    alert("⚠️ Tür yoklaması için bulutta en az 2 kelimeniz olmalıdır!");
    return;
  }

  quizVocabList = vocabList.sort(() => Math.random() - 0.5);
  currentQuizIndex = 0;
  quizScore = 0;
  renderTypeQuizQuestion();
}

function renderTypeQuizQuestion() {
  if (currentQuizIndex >= quizVocabList.length) {
    alert(`🎯 Tür Yoklaması Bitti! Skorun: ${quizScore} / ${quizVocabList.length}`);
    showScreen('vocab-menu-screen');
    return;
  }

  const currentItem = quizVocabList[currentQuizIndex];
  const correctType = currentItem.type || 'noun';

  showScreen('vocab-study-screen');
  document.getElementById("vocab-counter").innerText = `Tür Yoklaması (${currentQuizIndex + 1}/${quizVocabList.length})`;
  document.getElementById("fc-word").innerHTML = `<span style="font-size:22px; color:#8b5cf6;">"${currentItem.word}"</span><br><small style="font-size:12px; color:#64748b;">Kelimesinin türü nedir?</small>`;
  
  let optButtonsHtml = "<div style='margin-top:10px; text-align:left;'>";
  Object.keys(typeLabels).forEach(typeKey => {
    const label = typeLabels[typeKey].text;
    optButtonsHtml += `<button class='btn btn-secondary' style='width:100%; margin-bottom:6px; padding:10px; font-size:13px;' onclick="evaluateTypeAnswer('${typeKey}', '${correctType}')">${label}</button>`;
  });
  optButtonsHtml += "</div>";

  document.getElementById("fc-meaning").innerHTML = optButtonsHtml;
  document.getElementById("fc-synonyms").innerText = "";
  document.getElementById("fc-example").innerText = "";
  document.getElementById("flashcard-front").style.display = "flex";
  document.getElementById("flashcard-back").style.display = "none";
}

function evaluateTypeAnswer(selected, correct) {
  if (selected === correct) {
    quizScore++;
    alert("✅ Tebrikler, doğru tür!");
  } else {
    alert(`❌ Yanlış! Doğru tür: ${typeLabels[correct].text}`);
  }
  currentQuizIndex++;
  renderTypeQuizQuestion();
}

// Kelime Eşleştirme Oyunu (Match Modu)
async function startVocabMatchingGame() {
  const { data: vocabList, error } = await supabaseClient
    .from('user_vocab')
    .select('*')
    .eq('username', currentUser);

  if (error || !vocabList || vocabList.length < 4) {
    alert("⚠️ Eşleştirme oyunu oynayabilmek için bulutta en az 4 kelimen olmalıdır!");
    return;
  }

  matchVocabList = vocabList.sort(() => Math.random() - 0.5).slice(0, 6);
  matchedPairsCount = 0;
  selectedWordCard = null;
  selectedMeaningCard = null;
  matchStartTime = Date.now();

  renderMatchingScreen();
}

function renderMatchingScreen() {
  showScreen('vocab-study-screen');
  document.getElementById("vocab-counter").innerText = `Kelime Eşleştirme (Bulunan: ${matchedPairsCount}/${matchVocabList.length})`;
  document.getElementById("fc-word").innerHTML = "<p style='font-size:13px; color:#64748b; margin:0;'>Fransızca kelime ile doğru Türkçe anlamını eşleştirin:</p>";

  let words = matchVocabList.map(v => ({ id: v.id, text: v.word, type: 'word' })).sort(() => Math.random() - 0.5);
  let meanings = matchVocabList.map(v => ({ id: v.id, text: v.meaning, type: 'meaning' })).sort(() => Math.random() - 0.5);

  let html = `
    <div style="display: flex; gap: 10px; margin-top: 10px; justify-content: space-between;">
      <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;" id="match-words-col">
        <h4 style="color:#00b4d8; font-size:12px; margin-bottom:2px;">Fransızca</h4>
  `;
  words.forEach(w => {
    html += `<button class="btn match-card" id="card_${w.id}_word" style="background:#f8fafc; color:#0f172a; border:1px solid #cbd5e1; padding:8px; font-size:12px; margin:0;" onclick="selectMatchCard('${w.id}', 'word', this)">${w.text}</button>`;
  });
  html += `</div>`;

  html += `
      <div style="flex: 1; display: flex; flex-direction: column; gap: 6px;" id="match-meanings-col">
        <h4 style="color:#00b4d8; font-size:12px; margin-bottom:2px;">Türkçe</h4>
  `;
  meanings.forEach(m => {
    html += `<button class="btn match-card" id="card_${m.id}_meaning" style="background:#f8fafc; color:#0f172a; border:1px solid #cbd5e1; padding:8px; font-size:12px; margin:0;" onclick="selectMatchCard('${m.id}', 'meaning', this)">${m.text}</button>`;
  });
  html += `</div></div>`;

  document.getElementById("fc-meaning").innerHTML = html;
  document.getElementById("fc-synonyms").innerText = "";
  document.getElementById("fc-example").innerText = "";
  document.getElementById("flashcard-front").style.display = "flex";
  document.getElementById("flashcard-back").style.display = "none";
}

function selectMatchCard(id, type, element) {
  if (element.style.opacity === "0.3") return;

  document.querySelectorAll('.match-card').forEach(btn => {
    if (btn.style.opacity !== "0.3") btn.style.background = "#f8fafc";
  });

  if (type === 'word') {
    selectedWordCard = id;
    element.style.background = "#e0f2fe";
  } else {
    selectedMeaningCard = id;
    element.style.background = "#e0f2fe";
  }

  element.style.borderColor = "#00b4d8";

  if (selectedWordCard && selectedMeaningCard) {
    const wordEl = document.getElementById(`card_${selectedWordCard}_word`);
    const meaningEl = document.getElementById(`card_${selectedMeaningCard}_meaning`);

    if (selectedWordCard === selectedMeaningCard) {
      wordEl.style.background = "#dcfce7";
      meaningEl.style.background = "#dcfce7";
      wordEl.style.opacity = "0.3";
      meaningEl.style.opacity = "0.3";
      
      matchedPairsCount++;
      document.getElementById("vocab-counter").innerText = `Kelime Eşleştirme (Bulunan: ${matchedPairsCount}/${matchVocabList.length})`;

      if (matchedPairsCount === matchVocabList.length) {
        const totalSeconds = Math.floor((Date.now() - matchStartTime) / 1000);
        setTimeout(() => {
          alert(`🎉 Tebrikler! Tüm kelimeleri ${totalSeconds} saniyede başarıyla eşleştirdin.`);
          showScreen('vocab-menu-screen');
        }, 300);
      }
    } else {
      wordEl.style.background = "#fee2e2";
      meaningEl.style.background = "#fee2e2";
      setTimeout(() => {
        wordEl.style.background = "#f8fafc";
        meaningEl.style.background = "#f8fafc";
        wordEl.style.borderColor = "#cbd5e1";
        meaningEl.style.borderColor = "#cbd5e1";
      }, 500);
    }

    selectedWordCard = null;
    selectedMeaningCard = null;
  }
}

// --- YÖNETİCİ MODÜLLERİ ---

async function openAdminManager(type) {
  const listContainer = document.getElementById("admin-manager-list");
  const titleEl = document.getElementById("admin-manager-title");
  showScreen('admin-manage-screen');

  if (type === 'sets') {
    titleEl.innerText = "📝 Buluttaki Soru Setlerini Yönet / Sil";
    listContainer.innerHTML = "<p style='text-align:center; color:#00b4d8; padding:15px;'>Yükleniyor...</p>";

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
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div><strong style="color:#00b4d8; font-size:14px;">${set.topic}</strong> <span style="font-size:11px; color:#64748b;">(${set.date})</span></div>
          <button class="btn btn-danger" style="padding:6px 12px; font-size:12px; width:auto; margin:0;" onclick="deleteCloudSet('${set.id}')">Sil</button>
        </div>
      `;
    });
    listContainer.innerHTML = html;

  } else if (type === 'vocab') {
    titleEl.innerText = "📚 Buluttaki Kayıtlı Kelimeleri Yönet / Sil";
    listContainer.innerHTML = "<p style='text-align:center; color:#00b4d8; padding:15px;'>Yükleniyor...</p>";

    const { data: vocabList, error } = await supabaseClient
      .from('user_vocab')
      .select('*')
      .eq('username', currentUser);

    if (error || !vocabList || vocabList.length === 0) {
      listContainer.innerHTML = "<p style='text-align:center; color:#94a3b8; font-size:13px; padding:15px;'>Kayıtlı kelime bulunmuyor.</p>";
      return;
    }

    let html = "";
    vocabList.forEach((v) => {
      html += `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
          <div><strong style="color:#00b4d8; font-size:14px;">${v.word}</strong> - <span style="font-size:12px; color:#64748b;">${v.meaning}</span></div>
          <button class="btn btn-danger" style="padding:6px 12px; font-size:12px; width:auto; margin:0;" onclick="deleteAdminVocab('${v.id}')">Sil</button>
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

async function deleteAdminVocab(vocabId) {
  if (!confirm("Bu kelimeyi buluttan silmek istediğine emin misin?")) return;
  const { error } = await supabaseClient
    .from('user_vocab')
    .delete()
    .eq('id', vocabId);

  if (error) {
    alert("❌ Silinemedi: " + error.message);
  } else {
    openAdminManager('vocab');
  }
}

// --- ÇOKLU PARAGRAF EKRAN MANTIĞI ---

function loadParagraphAndQuestion() {
  if (activeParagraphs.length === 0) return;
  
  const currentParagraph = activeParagraphs[currentParagraphIndex];
  const questionsList = currentParagraph.questions || [];
  const currentQ = questionsList[currentQuestionIndex];

  document.getElementById("article-number").innerText = `Paragraf ${currentParagraphIndex + 1} / ${activeParagraphs.length}`;
  document.getElementById("article-title").innerText = currentParagraph.paragraph_title || "Paragraf / Soru Grubu";
  document.getElementById("article-text").innerText = currentParagraph.paragraph_text || "";

  document.getElementById("question-number").innerText = `Soru ${currentQuestionIndex + 1} / ${questionsList.length} (Paragraf İçi)`;
  document.getElementById("question-title").innerText = currentQ.question;
  
  const answerKey = `${currentParagraphIndex}_${currentQuestionIndex}`;
  let optHtml = "";
  for (const [key, val] of Object.entries(currentQ.options)) {
    const upperKey = key.toUpperCase();
    const isSelected = userAnswers[answerKey] === upperKey ? "selected" : "";
    optHtml += `<button class="option-btn ${isSelected}" onclick="selectOption('${upperKey}')"><strong>${upperKey})</strong> ${val}</button>`;
  }
  document.getElementById("options-group").innerHTML = optHtml;
  document.getElementById("explanation-box").style.display = "none";
}

function selectOption(optKey) {
  const answerKey = `${currentParagraphIndex}_${currentQuestionIndex}`;
  userAnswers[answerKey] = optKey;
  loadParagraphAndQuestion();
}

function toggleAnswerVisibility() {
  const currentParagraph = activeParagraphs[currentParagraphIndex];
  const currentQ = currentParagraph.questions[currentQuestionIndex];
  const expBox = document.getElementById("explanation-box");
  expBox.style.display = expBox.style.display === "none" ? "block" : "none";
  expBox.innerText = "💡 Açıklama: " + currentQ.explanation;
}

function nextQuestion() {
  const currentParagraph = activeParagraphs[currentParagraphIndex];
  const questionsList = currentParagraph.questions || [];

  if (currentQuestionIndex < questionsList.length - 1) {
    currentQuestionIndex++;
    loadParagraphAndQuestion();
  } else if (currentParagraphIndex < activeParagraphs.length - 1) {
    currentParagraphIndex++;
    currentQuestionIndex = 0;
    loadParagraphAndQuestion();
  } else {
    alert("ℹ️ Bu setin son sorusundasınız. Sınavı bitirmek için sağ üstteki 'Bitir' butonunu kullanabilirsiniz.");
  }
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    loadParagraphAndQuestion();
  } else if (currentParagraphIndex > 0) {
    currentParagraphIndex--;
    const prevParagraph = activeParagraphs[currentParagraphIndex];
    currentQuestionIndex = (prevParagraph.questions || []).length - 1;
    loadParagraphAndQuestion();
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
  if (!confirm("Sınavı bitirmek istediğinize emin misiniz?")) return;
  stopTimer();
  
  let correct = 0, wrong = 0, empty = 0;
  let totalQuestionsCount = 0;
  let wrongDetailsHtml = "";

  activeParagraphs.forEach((paragraph, pIdx) => {
    const questionsList = paragraph.questions || [];
    questionsList.forEach((q, qIdx) => {
      totalQuestionsCount++;
      const answerKey = `${pIdx}_${qIdx}`;
      const userAns = userAnswers[answerKey];

      if (!userAns) {
        empty++;
      } else if (userAns === q.correct.toUpperCase()) {
        correct++;
      } else {
        wrong++;
        wrongDetailsHtml += `<div style="background:#fee2e2; padding:8px; border-radius:6px; margin-bottom:6px; border-left:3px solid #ef4444; color:#991b1b; font-size:12px;">Paragraf ${pIdx + 1}, Soru ${qIdx + 1} yanlış. Doğru: ${q.correct.toUpperCase()}</div>`;
      }
    });
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
    totalQuestions: totalQuestionsCount,
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
