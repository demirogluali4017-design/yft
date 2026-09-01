// --- UYGULAMA ANA MANTIĞI & JSON KAYIT ---

let currentScreen = 'login-screen';
let currentUser = localStorage.getItem("yds_current_user") || "";
let timerInterval = null;
let secondsElapsed = 0;
let isTimerPaused = false;

// Sınav Durum Değişkenleri
let activeQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {};
let currentExamTopic = "";
let currentExamDate = "";

window.onload = function() {
  if (currentUser) {
    document.getElementById("welcome-username").innerText = currentUser;
    showScreen('main-menu');
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
}

function handleLogout() {
  localStorage.removeItem("yds_current_user");
  currentUser = "";
  document.getElementById("username-input").value = "";
  showScreen('login-screen');
}

function confirmResetUserData() {
  if (confirm("Tüm kişisel sınav geçmişiniz ve kayıtlarınız silinecek. Emin misiniz?")) {
    localStorage.removeItem(`yds_history_${currentUser}`);
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

// Çoklu Veya Tekli JSON Kodunu Okuyup Kaydeden Fonksiyon
function handleSaveJSONSet() {
  const password = document.getElementById("admin-password").value.trim();
  if (password !== "258025") {
    alert("❌ Hatalı yönetici şifresi!");
    return;
  }

  const jsonRaw = document.getElementById("admin-json-input").value.trim();
  if (!jsonRaw) {
    alert("⚠️ Lütfen JSON kodunu yapıştırın!");
    return;
  }

  let parsedData;
  try {
    parsedData = JSON.parse(jsonRaw);
  } catch (error) {
    alert("❌ Geçersiz JSON formatı! Parantez veya tırnak işaretlerini kontrol et.\nHata: " + error.message);
    return;
  }

  let setsArray = [];
  if (Array.isArray(parsedData)) {
    setsArray = parsedData;
  } else if (typeof parsedData === 'object' && parsedData !== null) {
    setsArray = [parsedData];
  } else {
    alert("❌ Geçersiz JSON yapısı!");
    return;
  }

  let customSets = JSON.parse(localStorage.getItem("yds_custom_sets")) || [];
  let addedCount = 0;

  setsArray.forEach((item, index) => {
    if (!item.articleText || !item.questions || !Array.isArray(item.questions)) {
      console.warn(`Set ${index + 1} atlandı çünkü 'articleText' veya 'questions' eksik.`);
      return;
    }

    const newArticleSet = {
      id: "set_" + Date.now() + "_" + index,
      topic: item.topic || item.articleTitle || `YDS Fransızca Set ${customSets.length + addedCount + 1}`,
      date: item.date || new Date().toISOString().split('T')[0],
      articleTitle: item.articleTitle || "YDS Paragraf Soruları",
      articleText: item.articleText,
      questions: item.questions
    };

    customSets.push(newArticleSet);
    addedCount++;
  });

  if (addedCount === 0) {
    alert("⚠️ Hiçbir geçerli soru seti eklenemedi! JSON yapısını kontrol edin.");
    return;
  }

  localStorage.setItem("yds_custom_sets", JSON.stringify(customSets));

  alert(`✅ Başarıyla ${addedCount} adet yeni makale/soru seti sisteme eklendi!`);
  
  document.getElementById("admin-json-input").value = "";
  document.getElementById("admin-password").value = "";
  
  showScreen('main-menu');
}

function openSetSelection() {
  const container = document.getElementById("set-list-container");
  let allSets = [];
  
  // 1. questionsData.js dosyasındaki tüm setleri güvenli şekilde topla (İster değişken ister dizi olsun)
  if (typeof defaultQuestionSets !== 'undefined' && Array.isArray(defaultQuestionSets)) {
    allSets = allSets.concat(defaultQuestionSets);
  } else {
    // Eğer questionsData içinde başka bir değişken adı veya doğrudan setler tanımlandıysa onları da yakala
    for (let key in window) {
      if (key.includes("Set") || key.includes("Question") || key.includes("yds")) {
        if (Array.isArray(window[key]) && window[key] !== allSets && window[key].length > 0 && window[key][0].articleText) {
          allSets = allSets.concat(window[key]);
        }
      }
    }
  }
  
  // 2. LocalStorage'dan özel yüklenen setleri ekle
  const customSets = JSON.parse(localStorage.getItem("yds_custom_sets")) || [];
  allSets = allSets.concat(customSets);
  
  if (allSets.length === 0) {
    container.innerHTML = "<div style='text-align:center; padding:20px; color:#94a3b8;'>Henüz sisteme yüklenmiş bir soru seti bulunmuyor. Yönetici panelinden JSON ile ekleyebilirsiniz.</div>";
    showScreen('set-select-screen');
    return;
  }
  
  // 🔄 Tarihe göre sıralama (En yeni tarih en üstte görünür)
  allSets.sort((a, b) => {
    const dateA = new Date(a.date || '2026-01-01');
    const dateB = new Date(b.date || '2026-01-01');
    return dateB - dateA;
  });
  
  let html = "";
  allSets.forEach((set) => {
    html += `
      <div class="set-item-card" onclick="startExamSet('${set.id}')">
        <div>
          <h3 style="color:#38bdf8; font-size:15px; margin-bottom:4px;">${set.topic || set.articleTitle || 'İsimsiz Set'}</h3>
          <p style="font-size:12px; color:#94a3b8;">${set.articleTitle || 'Paragraf Soruları'} (${set.questions.length} Soru) • <span style="color:#10b981;">${set.date || ''}</span></p>
        </div>
        <button class="btn btn-primary" style="font-size:12px; padding:6px 12px;">Çöz ➔</button>
      </div>
    `;
  });
  
  container.innerHTML = html;
  showScreen('set-select-screen');
}

function startExamSet(setId) {
  let allSets = [];
  if (typeof defaultQuestionSets !== 'undefined' && Array.isArray(defaultQuestionSets)) {
    allSets = allSets.concat(defaultQuestionSets);
  }
  const customSets = JSON.parse(localStorage.getItem("yds_custom_sets")) || [];
  allSets = allSets.concat(customSets);
  
  const selectedSet = allSets.find(s => s.id === setId);
  if (!selectedSet) {
    alert("Soru seti bulunamadı!");
    return;
  }
  
  currentExamTopic = selectedSet.topic || selectedSet.articleTitle || "Deneme";
  currentExamDate = selectedSet.date || new Date().toISOString().split('T')[0];
  activeQuestions = selectedSet.questions;
  currentQuestionIndex = 0;
  userAnswers = {};
  
  document.getElementById("article-title").innerText = selectedSet.articleTitle || "Metin";
  document.getElementById("article-text").innerText = selectedSet.articleText || "";
  document.getElementById("article-number").innerText = currentExamTopic;
  
  secondsElapsed = 0;
  isTimerPaused = false;
  
  showScreen('quiz-screen');
  loadQuestion();
}

function loadQuestion() {
  if (activeQuestions.length === 0) return;
  const q = activeQuestions[currentQuestionIndex];
  
  document.getElementById("question-number").innerText = `Soru ${currentQuestionIndex + 1} / ${activeQuestions.length}`;
  document.getElementById("question-title").innerText = q.question;
  
  let optHtml = "";
  const optionsMap = q.options;
  for (const [key, val] of Object.entries(optionsMap)) {
    const upperKey = key.toUpperCase();
    const isSelected = userAnswers[currentQuestionIndex] === upperKey ? "selected" : "";
    optHtml += `<button class="option-btn ${isSelected}" onclick="selectOption('${upperKey}')"><strong>${upperKey})</strong> ${val}</button>`;
  }
  
  document.getElementById("options-group").innerHTML = optHtml;
  
  const expBox = document.getElementById("explanation-box");
  expBox.style.display = "none";
  expBox.innerText = q.explanation || "Açıklama bulunmuyor.";
}

function selectOption(optKey) {
  userAnswers[currentQuestionIndex] = optKey;
  loadQuestion();
}

function toggleAnswerVisibility() {
  const expBox = document.getElementById("explanation-box");
  if (expBox.style.display === "none") {
    expBox.style.display = "block";
    expBox.innerText = "💡 Açıklama: " + activeQuestions[currentQuestionIndex].explanation;
  } else {
    expBox.style.display = "none";
  }
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
      updateTimerDisplay();
    }
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
}

function toggleTimer() {
  isTimerPaused = !isTimerPaused;
  const btn = document.getElementById("timer-toggle-btn");
  btn.innerText = isTimerPaused ? "▶️" : "⏸️";
}

function updateTimerDisplay() {
  const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
  const secs = (secondsElapsed % 60).toString().padStart(2, '0');
  document.getElementById("timer").innerText = `⏱️ ${mins}:${secs}`;
}

function finishExam() {
  if (!confirm("Sınavı bitirmek istediğinize emin misiniz?")) return;
  stopTimer();
  
  let correct = 0;
  let wrong = 0;
  let empty = 0;
  let wrongDetailsHtml = "";
  
  activeQuestions.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    if (!userAns) {
      empty++;
    } else if (userAns === q.correct.toUpperCase()) {
      correct++;
    } else {
      wrong++;
      wrongDetailsHtml += `
        <div style="background:#0f172a; padding:10px; border-radius:6px; margin-bottom:8px; border-left:3px solid #ef4444;">
          <strong>Soru ${idx + 1}:</strong> ${q.question}<br>
          <span style="color:#ef4444;">Senin Cevabın: ${userAns}</span> | <span style="color:#10b981;">Doğru Cevap: ${q.correct.toUpperCase()}</span><br>
          <small style="color:#94a3b8;">${q.explanation || ''}</small>
        </div>
      `;
    }
  });
  
  const mins = Math.floor(secondsElapsed / 60).toString().padStart(2, '0');
  const secs = (secondsElapsed % 60).toString().padStart(2, '0');
  const timeFormatted = `${mins}:${secs}`;
  
  const historyKey = `yds_history_${currentUser}`;
  let historyList = JSON.parse(localStorage.getItem(historyKey)) || [];
  
  const examResult = {
    topic: currentExamTopic,
    date: currentExamDate,
    correct: correct,
    wrong: wrong,
    empty: empty,
    totalQuestions: activeQuestions.length,
    totalSeconds: secondsElapsed,
    timeFormatted: timeFormatted
  };
  
  historyList.push(examResult);
  localStorage.setItem(historyKey, JSON.stringify(historyList));
  
  document.getElementById("rep-correct").innerText = correct;
  document.getElementById("rep-wrong").innerText = wrong;
  document.getElementById("rep-empty").innerText = empty;
  document.getElementById("rep-time").innerText = timeFormatted;
  document.getElementById("wrong-answers-list").innerHTML = wrongDetailsHtml || "<p style='color:#10b981;'>Tebrikler, hiç yanlışınız yok! 🎉</p>";
  
  showScreen('report-screen');
}