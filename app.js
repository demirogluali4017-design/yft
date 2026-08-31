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
  
  const savedUser = localStorage.getItem("yds_current_user");
  if (savedUser) {
    document.getElementById("welcome-username").innerText = savedUser;
    showScreen('main-menu');
  } else {
    showScreen('login-screen');
  }
  
  initData();
});

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
  pauseTimer();
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');

  if (screenId === 'set-select-screen') {
    renderSetSelectionList();
  }
  if (screenId === 'history-screen') renderHistory();
  if (screenId === 'analytics-screen') renderAnalytics('weekly');
}

// "Soru Çöz"e basıldığında doğrudan testi başlatmak yerine önce konu seçim ekranını açar
function openSetSelection() {
  showScreen('set-select-screen');
}

// Konu/Set seçim listesini kartlar halinde ekrana basar
function renderSetSelectionList() {
  const container = document.getElementById("set-list-container");
  if (allSets.length === 0) {
    container.innerHTML = "<p>Sistemde henüz kayıtlı soru seti yok. Lütfen 'Soru Yükle' bölümünden set ekleyin.</p>";
    return;
  }

  container.innerHTML = allSets.map((set, index) => `
    <div class="set-item-card" onclick="startQuizSet(${index})">
      <div>
        <strong>📌 ${set.topic}</strong><br>
        <small style="color:#666;">Tarih: ${set.date}</small>
      </div>
      <div>
        ${set.completed ? '<span style="color:green; font-weight:bold; font-size:13px;">✔ Çözüldü</span>' : '<span style="color:#007bff; font-weight:bold; font-size:13px;">Başla ➔</span>'}
      </div>
    </div>
  `).join('');
}

function startQuizSet(index) {
  currentSetIndex = index;
  currentArticleIndex = 0;
  currentQuestionIndex = 0;
  userAnswers = {};
  secondsPassed = 0;
  
  showScreen('quiz-screen');
  loadState();
  startTimer();
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

function loadState() {
  const activeSet = allSets[currentSetIndex];
  if (!activeSet || !activeSet.articles) return;

  const currentArticle = activeSet.articles[currentArticleIndex];
  const currentQuestion = currentArticle.questions[currentQuestionIndex];
  const currentQId = currentQuestion.id || `q_${currentQuestionIndex}`;

  document.getElementById("article-number").innerText = `Metin ${currentArticleIndex + 1} / ${activeSet.articles.length} | ${activeSet.topic}`;
  document.getElementById("article-title").innerText = currentArticle.title;
  document.getElementById("article-text").innerText = currentArticle.text;

  document.getElementById("question-number").innerText = `Soru ${currentQuestionIndex + 1} / ${currentArticle.questions.length}`;
  document.getElementById("question-title").innerText = currentQuestion.question;

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

function startTimer() {
  if (!isTimerRunning) {
    isTimerRunning = true;
    clearInterval(timerInterval);
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
    btn.innerText = "▶️";
    btn.className = "btn btn-success";
  } else {
    startTimer();
    btn.innerText = "⏸️";
    btn.className = "btn btn-warning";
  }
}

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
          <div style="border-bottom: 1px solid #ddd; padding: 8px 0;">
            <strong>Soru:</strong> ${q.question}<br>
            <span style="color:red;">Senin: ${ans}</span> | <span style="color:green;">Doğru: ${q.answer}</span><br>
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

  secondsPassed = 0;
  userAnswers = {};
  
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

    alert("✅ Set başarıyla kaydedildi!");
    document.getElementById("upload-topic").value = "";
    document.getElementById("upload-json").value = "";
    showScreen('set-select-screen');
  } catch (err) {
    alert("❌ HATA: Geçersiz JSON verisi.");
  }
}