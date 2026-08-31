let allSets = [];
let currentSetIndex = 0;
let currentArticleIndex = 0;
let currentQuestionIndex = 0;
let userAnswers = {};

let secondsPassed = 0;
let timerInterval = null;
let isTimerRunning = false;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("upload-date").valueAsDate = new Date();
  
  // Kullanıcı oturumu açık mı kontrol et
  const savedUser = localStorage.getItem("yds_current_user");
  if (savedUser) {
    document.getElementById("welcome-username").innerText = savedUser;
    showScreen('main-menu');
  } else {
    showScreen('login-screen');
  }
  
  initData();
});

// Giriş Yapma İşlemi
function handleLogin() {
  const username = document.getElementById("username-input").value.trim();
  if (!username) {
    alert("Lütfen geçerli bir isim giriniz!");
    return;
  }
  localStorage.setItem("yds_current_user", username);
  document.getElementById("welcome-username").innerText = username;
  showScreen('main-menu');
}

function handleLogout() {
  localStorage.removeItem("yds_current_user");
  document.getElementById("username-input").value = "";
  showScreen('login-screen');
}

function showScreen(screenId) {
  // Kronometreyi her ekran değişiminde güvenli durdur
  pauseTimer();

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  if (screenId === 'quiz-screen') {
    populateDropdown();
    if (allSets.length > 0) {
      loadState();
      startTimer();
    }
  }

  if (screenId === 'history-screen') renderHistory();
  if (screenId === 'analytics-screen') renderAnalytics('weekly');
}

function initData() {
  const localData = localStorage.getItem("yds_question_sets");
  if (localData) {
    allSets = JSON.parse(localData);
  } else if (window.ydsFransizcaDeneme) {
    allSets = [{
      id: "set_default",
      date: new Date().toISOString().split('T')[0],
      topic: "Genel Fransızca",
      completed: false,
      articles: window.ydsFransizcaDeneme
    }];
    localStorage.setItem("yds_question_sets", JSON.stringify(allSets));
  }
}

function populateDropdown() {
  const dropdown = document.getElementById("set-select");
  dropdown.innerHTML = "";

  allSets.forEach((set, index) => {
    const opt = document.createElement("option");
    opt.value = index;
    const isDone = set.completed ? "✔ [Çözüldü] " : "";
    opt.innerText = `${isDone}[${set.date}] - ${set.topic}`;
    if (index === currentSetIndex) opt.selected = true;
    dropdown.appendChild(opt);
  });
}

function loadState() {
  const activeSet = allSets[currentSetIndex];
  if (!activeSet || !activeSet.articles) return;

  const currentArticle = activeSet.articles[currentArticleIndex];
  const currentQuestion = currentArticle.questions[currentQuestionIndex];
  const currentQId = currentQuestion.id || `q_${currentQuestionIndex}`;

  document.getElementById("article-number").innerText = `Metin ${currentArticleIndex + 1} / ${activeSet.articles.length}`;
  document.getElementById("article-title").innerText = currentArticle.title;
  document.getElementById("article-text").innerText = currentArticle.text;

  document.getElementById("question-number").innerText = `Soru ${currentQuestionIndex + 1} / ${currentArticle.questions.length}`;
  document.getElementById("question-title").innerText = `Soru ${currentQuestionIndex + 1}: ${currentQuestion.question}`;

  const optionsGroup = document.getElementById("options-group");
  optionsGroup.innerHTML = "";
  const savedAnswer = userAnswers[currentQId];

  currentQuestion.options.forEach((opt) => {
    const letter = opt.charAt(0);
    const btn = document.createElement("button");
    btn.className = "option-btn";
    if (savedAnswer === letter) btn.classList.add("selected");
    btn.innerText = opt;
    btn.onclick = () => selectOption(currentQId, letter);
    optionsGroup.appendChild(btn);
  });

  document.getElementById("explanation-box").style.display = "none";
  document.getElementById("explanation-box").innerHTML = `💡 <strong>Doğru Cevap: ${currentQuestion.answer}</strong><br>${currentQuestion.explanation}`;
  document.getElementById("show-answer-btn").innerText = "💡 Cevabı Göster";
}

function selectOption(qId, letter) {
  userAnswers[qId] = letter;
  loadState();
}

function toggleAnswerVisibility() {
  const expBox = document.getElementById("explanation-box");
  const btn = document.getElementById("show-answer-btn");
  
  if (expBox.style.display === "none") {
    expBox.style.display = "block";
    btn.innerText = "🙈 Cevabı Gizle";
  } else {
    expBox.style.display = "none";
    btn.innerText = "💡 Cevabı Göster";
  }
}

// Güvenli ve Donma Yapmayan Kronometre Yönetimi
function startTimer() {
  if (!isTimerRunning) {
    isTimerRunning = true;
    clearInterval(timerInterval); // Çift interval oluşmasını önler
    timerInterval = setInterval(() => {
      secondsPassed++;
      const m = Math.floor(secondsPassed / 60);
      const s = secondsPassed % 60;
      const timerEl = document.getElementById("timer");
      if (timerEl) {
        timerEl.innerText = `⏱️ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
      }
    }, 1000);
  }
}

function pauseTimer() {
  isTimerRunning = false;
  clearInterval(timerInterval);
}

function toggleTimer() {
  const btn = document.getElementById("timer-toggle-btn");
  if (isTimerRunning) {
    pauseTimer();
    btn.innerText = "▶️ Devam Et";
    btn.className = "btn btn-primary";
  } else {
    startTimer();
    btn.innerText = "⏸️ Durdur";
    btn.className = "btn btn-warning";
  }
}

// Sınavı Bitir ve Rapor Ekranına Geçiş
function finishExam() {
  pauseTimer();
  const activeSet = allSets[currentSetIndex];
  
  let correct = 0, wrong = 0, empty = 0;
  const wrongListHTML = [];

  activeSet.articles.forEach(article => {
    article.questions.forEach((q, qIndex) => {
      const qId = q.id || `q_${qIndex}`;
      const ans = userAnswers[qId];

      if (!ans) {
        empty++;
      } else if (ans === q.answer) {
        correct++;
      } else {
        wrong++;
        wrongListHTML.push(`
          <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
            <strong>Soru:</strong> ${q.question}<br>
            <span style="color:red;">Senin Cevabın: ${ans}</span> | <span style="color:green;">Doğru Cevap: ${q.answer}</span><br>
            <small>💡 ${q.explanation}</small>
          </div>
        `);
      }
    });
  });

  activeSet.completed = true;
  localStorage.setItem("yds_question_sets", JSON.stringify(allSets));

  const m = Math.floor(secondsPassed / 60);
  const s = secondsPassed % 60;
  const timeFormatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

  saveExamSession({
    timestamp: new Date().getTime(),
    date: activeSet.date,
    topic: activeSet.topic,
    correct, wrong, empty,
    seconds: secondsPassed,
    timeSpent: timeFormatted
  });

  document.getElementById("rep-correct").innerText = correct;
  document.getElementById("rep-wrong").innerText = wrong;
  document.getElementById("rep-empty").innerText = empty;
  document.getElementById("rep-time").innerText = timeFormatted;
  document.getElementById("wrong-answers-list").innerHTML = wrongListHTML.length > 0 ? wrongListHTML.join('') : "<p>Harika! Hiç yanlışınız yok.</p>";

  // Sıfırlamalar ve Kesin Rapor Ekranı Geçişi
  secondsPassed = 0;
  userAnswers = {};
  
  // Ekran geçişini doğrudan tetikle
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('report-screen').classList.add('active');
}

function nextQuestion() {
  const activeSet = allSets[currentSetIndex];
  const currentArticle = activeSet.articles[currentArticleIndex];

  if (currentQuestionIndex < currentArticle.questions.length - 1) {
    currentQuestionIndex++;
  } else if (currentArticleIndex < activeSet.articles.length - 1) {
    currentArticleIndex++;
    currentQuestionIndex = 0;
  } else {
    finishExam();
    return;
  }
  loadState();
}

function prevQuestion() {
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
  } else if (currentArticleIndex > 0) {
    currentArticleIndex--;
    const prevArticle = allSets[currentSetIndex].articles[currentArticleIndex];
    currentQuestionIndex = prevArticle.questions.length - 1;
  }
  loadState();
}

function changeSet(index) {
  currentSetIndex = parseInt(index);
  currentArticleIndex = 0;
  currentQuestionIndex = 0;
  loadState();
}

function handleSaveSet() {
  const topic = document.getElementById("upload-topic").value.trim();
  const date = document.getElementById("upload-date").value;
  const jsonText = document.getElementById("upload-json").value.trim();

  if (!topic || !jsonText) {
    alert("Lütfen Konu Başlığı ve JSON verisini girin!");
    return;
  }

  try {
    const parsedArticles = JSON.parse(jsonText);
    const newSet = {
      id: "set_" + Date.now(),
      date: date || new Date().toISOString().split('T')[0],
      topic: topic,
      completed: false,
      articles: Array.isArray(parsedArticles) ? parsedArticles : [parsedArticles]
    };

    allSets.unshift(newSet);
    localStorage.setItem("yds_question_sets", JSON.stringify(allSets));

    alert("✅ Set başarıyla entegre edildi!");
    document.getElementById("upload-topic").value = "";
    document.getElementById("upload-json").value = "";
    showScreen('quiz-screen');
  } catch (err) {
    alert("❌ HATA: Geçersiz JSON verisi.");
  }
}