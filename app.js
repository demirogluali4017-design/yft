pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let questions = [];
let currentIndex = 0;
let userAnswers = {};

const pdfInput = document.getElementById('pdf-input');
pdfInput.addEventListener('change', handleFileSelect);

async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file || file.type !== 'application/pdf') {
    alert('Lütfen geçerli bir PDF dosyası seçin.');
    return;
  }

  const statusText = document.getElementById('loading-status');
  statusText.textContent = '📄 PDF okunuyor...';

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      fullText += textContent.items.map(item => item.str).join(' ') + '\n';
    }

    questions = [];

    // Taranmış PDF Kontrolü (Metin uzunluğu yetersizse görsele dönüştür)
    if (fullText.trim().length < 50) {
      statusText.textContent = '📸 Taranmış PDF tespit edildi, Gemini Vision ile işleniyor...';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        // Vercel 4.5MB limitini aşmamak için JPEG %70 kalite
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.7);

        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64 })
        });

        if (response.ok) {
          const batch = await response.json();
          if (Array.isArray(batch)) questions.push(...batch);
        }
      }
    } else {
      // Metin Tabanlı PDF İşleme
      const CHUNK_SIZE = 4000;
      for (let i = 0; i < fullText.length; i += CHUNK_SIZE) {
        statusText.textContent = `🤖 Metin analiz ediliyor... (${i}/${fullText.length})`;
        const textChunk = fullText.substring(i, i + CHUNK_SIZE);

        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ textChunk })
        });

        if (response.ok) {
          const batch = await response.json();
          if (Array.isArray(batch)) questions.push(...batch);
        }
      }
    }

    if (questions.length === 0) throw new Error("Soru verisi çıkarılamadı. Lütfen dosyayı kontrol edin.");

    // ID ve Cevap Harflerini Normalize Et
    questions.forEach((q, i) => {
      q.id = i + 1;
      q.correctAnswer = (q.correctAnswer || '').trim().charAt(0).toUpperCase();
    });

    renderEditScreen();

  } catch (error) {
    console.error(error);
    statusText.textContent = 'Hata: ' + error.message;
  }
}

function renderEditScreen() {
  document.getElementById('upload-screen').classList.add('hidden');
  document.getElementById('edit-screen').classList.remove('hidden');

  const editList = document.getElementById('edit-list');
  editList.innerHTML = '';

  questions.forEach((q, index) => {
    const item = document.createElement('div');
    item.className = 'edit-item';
    item.innerHTML = `
      <strong>Soru ${index + 1}</strong>
      <textarea onchange="updateQuestion(${index}, 'question', this.value)">${q.question}</textarea>
      
      <label>Şıklar (Her satıra bir şık gelecek şekilde düzenleyin):</label>
      <textarea onchange="updateQuestion(${index}, 'options', this.value)">${q.options.join('\n')}</textarea>
      
      <label>Doğru Cevap (A, B, C, D veya E):</label>
      <input type="text" style="width: 60px;" value="${q.correctAnswer}" onchange="updateQuestion(${index}, 'correctAnswer', this.value)">
    `;
    editList.appendChild(item);
  });
}

function updateQuestion(index, field, value) {
  if (field === 'options') {
    questions[index].options = value.split('\n').map(opt => opt.trim()).filter(opt => opt.length > 0);
  } else if (field === 'correctAnswer') {
    questions[index].correctAnswer = value.trim().charAt(0).toUpperCase();
  } else {
    questions[index][field] = value;
  }
}

function confirmQuestions() {
  document.getElementById('edit-screen').classList.add('hidden');
  document.getElementById('quiz-screen').classList.remove('hidden');
  loadQuestion();
}

function loadQuestion() {
  const currentQ = questions[currentIndex];
  
  document.getElementById("category").textContent = "PDF Sınavı";
  document.getElementById("progress").textContent = `Soru ${currentIndex + 1} / ${questions.length}`;
  document.getElementById("question-text").textContent = `${currentQ.id}. ${currentQ.question}`;
  
  const optionsContainer = document.getElementById("options-container");
  optionsContainer.innerHTML = "";

  currentQ.options.forEach((opt) => {
    const optionLetter = opt.trim().charAt(0).toUpperCase();
    const userLetter = (userAnswers[currentIndex] || "").toUpperCase();

    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.textContent = opt;
    
    if (userLetter === optionLetter) btn.classList.add("selected");

    btn.onclick = () => selectOption(optionLetter);
    optionsContainer.appendChild(btn);
  });

  document.getElementById("prev-btn").disabled = currentIndex === 0;
  document.getElementById("next-btn").textContent = currentIndex === questions.length - 1 ? "Analizi Gör" : "Sonraki ▶";
}

function selectOption(letter) {
  userAnswers[currentIndex] = letter;
  loadQuestion();
}

function changeQuestion(direction) {
  if (direction === 1 && currentIndex === questions.length - 1) {
    showAnalysis();
    return;
  }
  currentIndex += direction;
  loadQuestion();
}

function showAnalysis() {
  document.getElementById("quiz-screen").classList.add("hidden");
  document.getElementById("result-screen").classList.remove("hidden");

  let correctCount = 0, wrongCount = 0, emptyCount = 0;
  const analysisList = document.getElementById("analysis-list");
  analysisList.innerHTML = "";

  questions.forEach((q, index) => {
    const userAns = (userAnswers[index] || "").toUpperCase();
    const isCorrect = userAns === q.correctAnswer;
    const isEmpty = !userAns;

    let statusClass = isEmpty ? "is-empty" : (isCorrect ? "is-correct" : "is-wrong");
    if (isCorrect) correctCount++;
    else if (!isEmpty) wrongCount++;
    else emptyCount++;

    const item = document.createElement("div");
    item.className = `analysis-item ${statusClass}`;
    item.innerHTML = `
      <div class="analysis-q-text">${q.id}. ${q.question}</div>
      <div class="analysis-ans">
        <b>Sizin Cevabınız:</b> ${userAns || "Boş"}<br>
        <b>Doğru Cevap:</b> ${q.correctAnswer}
      </div>
      <div id="exp-box-${index}">
        <button class="explain-btn" onclick="fetchExplanation(${index})">💡 Çözüm Açıklaması Üret</button>
      </div>
    `;
    analysisList.appendChild(item);
  });

  document.getElementById("correct-count").textContent = correctCount;
  document.getElementById("wrong-count").textContent = wrongCount;
  document.getElementById("empty-count").textContent = emptyCount;
  document.getElementById("score-text").textContent = `%${Math.round((correctCount / questions.length) * 100)} Başarı`;
}

async function fetchExplanation(index) {
  const box = document.getElementById(`exp-box-${index}`);
  box.innerHTML = "⏳ Açıklama hazırlanıyor...";

  try {
    const response = await fetch('/api/parse-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'explain', questionData: questions[index] })
    });

    const data = await response.json();
    box.innerHTML = `<div class="explanation-box">💡 <b>Açıklama:</b> ${data.explanation}</div>`;
  } catch (error) {
    box.innerHTML = "Açıklama alınamadı.";
  }
}

function restartQuiz() {
  currentIndex = 0;
  userAnswers = {};
  questions = [];
  document.getElementById("result-screen").classList.add("hidden");
  document.getElementById("upload-screen").classList.remove("hidden");
  document.getElementById("loading-status").textContent = "";
  document.getElementById("pdf-input").value = "";
}
