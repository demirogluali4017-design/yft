/**
 * VocabQuiz - Spaced Repetition (SM-2) & Supabase Entegre Kelime Modülü
 */

class VocabStorageManager {
  constructor() {
    this.storageKeyWords = 'yds_vocab_list';
  }

  // Supabase'den Kelimeleri Çek
  async fetchWordsFromCloud() {
    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('vocab_words')
          .select('*')
          .order('id', { ascending: true });

        if (!error && data && data.length > 0) {
          localStorage.setItem(this.storageKeyWords, JSON.stringify(data));
          return data;
        }
      } catch (e) {
        console.warn("Supabase kelime bağlantı hatası, yerel veriye geçiliyor:", e);
      }
    }
    return this.getLocalWords();
  }

  getLocalWords() {
    const data = localStorage.getItem(this.storageKeyWords);
    return data ? JSON.parse(data) : [
      { id: 1, word: 'Remédier', meaning: 'Çözüm bulmak, iyileştirmek', synonyms: 'Résoudre', example: 'Il faut remédier à ce problème.', box: 1 },
      { id: 2, word: 'Dénoncer', meaning: 'Kınamak, ihbar etmek', synonyms: 'Condamner', example: 'Le gouvernement a dénoncé cette décision.', box: 1 },
      { id: 3, word: 'Environnement', meaning: 'Çevre', synonyms: 'Milieu', example: 'La protection de l\'environnement est cruciale.', box: 2 }
    ];
  }

  // Yeni Kelime Ekle (Bulut + Yerel)
  async addWord(newWord) {
    let savedItem = newWord;

    if (window.supabaseClient) {
      try {
        const { data, error } = await window.supabaseClient
          .from('vocab_words')
          .insert([newWord])
          .select();

        if (!error && data) {
          savedItem = data[0];
        }
      } catch (e) {
        console.error("Supabase ekleme hatası:", e);
      }
    }

    const words = this.getLocalWords();
    words.push(savedItem);
    localStorage.setItem(this.storageKeyWords, JSON.stringify(words));
  }

  // Kutu / İlerleme Güncelle (Bulut + Yerel)
  async updateWordBox(wordId, newBox) {
    const words = this.getLocalWords();
    const word = words.find(w => w.id === wordId || w.word === wordId);
    if (word) {
      word.box = newBox;
      localStorage.setItem(this.storageKeyWords, JSON.stringify(words));
    }

    if (window.supabaseClient && wordId) {
      try {
        await window.supabaseClient
          .from('vocab_words')
          .update({ box: newBox })
          .eq('id', wordId);
      } catch (e) {
        console.error("Supabase güncelleme hatası:", e);
      }
    }
  }

  // Kelime Sil (Bulut + Yerel)
  async deleteWord(wordId, index) {
    const words = this.getLocalWords();
    words.splice(index, 1);
    localStorage.setItem(this.storageKeyWords, JSON.stringify(words));

    if (window.supabaseClient && wordId) {
      try {
        await window.supabaseClient
          .from('vocab_words')
          .delete()
          .eq('id', wordId);
      } catch (e) {
        console.error("Supabase silme hatası:", e);
      }
    }
  }
}

class VocabEngine {
  constructor() {
    this.storage = new VocabStorageManager();
    this.words = [];
    this.currentIndex = 0;
  }

  async init() {
    this.words = await this.storage.fetchWordsFromCloud();
  }

  getCurrentCard() {
    return this.words[this.currentIndex] || null;
  }

  speak(text) {
    if ('speechSynthesis' in window && text) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }

  async processAnswer(type) {
    if (this.words.length === 0) return;
    const card = this.words[this.currentIndex];

    const currentBox = card.box || 1;
    const newBox = type === 'good' ? Math.min(currentBox + 1, 5) : 1;
    card.box = newBox;

    await this.storage.updateWordBox(card.id || card.word, newBox);
    this.nextCard();
  }

  nextCard() {
    this.currentIndex = (this.currentIndex + 1) % this.words.length;
  }
}

// Global İstemci
window.vocabEngine = new VocabEngine();

// UI TETİKLEYİCİ FONKSİYONLAR
async function startFlashcards() {
  await window.vocabEngine.init();
  if (window.vocabEngine.words.length === 0) {
    alert("Kayıtlı kelimeniz bulunmuyor. Lütfen önce yeni bir kelime ekleyin.");
    return;
  }
  window.vocabEngine.currentIndex = 0;
  showScreen('vocab-study-screen');
  renderCardUI();
}

function renderCardUI() {
  const card = window.vocabEngine.getCurrentCard();
  if (!card) return;

  const innerCard = document.getElementById('card-inner');
  if (innerCard) innerCard.style.transform = "rotateY(0deg)";

  document.getElementById('fc-word').innerText = card.word || '';
  document.getElementById('fc-meaning').innerText = card.meaning || '';
  document.getElementById('fc-synonyms').innerText = card.synonyms || '-';
  document.getElementById('fc-example').innerText = card.example ? `"${card.example}"` : '-';
  document.getElementById('fc-box-badge').innerText = `Kutu ${card.box || 1}`;

  const total = window.vocabEngine.words.length;
  const current = window.vocabEngine.currentIndex + 1;
  document.getElementById('vocab-counter').innerText = `Kart ${current} / ${total}`;

  window.vocabEngine.speak(card.word);
}

function toggleCardFlip() {
  const innerCard = document.getElementById('card-inner');
  if (innerCard) {
    const isFlipped = innerCard.style.transform === "rotateY(180deg)";
    innerCard.style.transform = isFlipped ? "rotateY(0deg)" : "rotateY(180deg)";
  }
}

function playCurrentVocabAudio() {
  const card = window.vocabEngine.getCurrentCard();
  if (card) window.vocabEngine.speak(card.word);
}

async function handleVocabAnswer(type) {
  await window.vocabEngine.processAnswer(type);
  renderCardUI();
}

async function handleSaveVocab() {
  const word = document.getElementById('vocab-word').value.trim();
  const meaning = document.getElementById('vocab-meaning').value.trim();
  const synonyms = document.getElementById('vocab-synonyms').value.trim();
  const example = document.getElementById('vocab-example').value.trim();

  if (!word || !meaning) {
    alert("Kelime ve Anlamı alanları zorunludur.");
    return;
  }

  const newWord = { word, meaning, synonyms, example, box: 1 };
  await window.vocabEngine.storage.addWord(newWord);

  document.getElementById('vocab-word').value = "";
  document.getElementById('vocab-meaning').value = "";
  document.getElementById('vocab-synonyms').value = "";
  document.getElementById('vocab-example').value = "";

  alert("Kelime eklendi!");
  renderVocabList();
}

async function renderVocabList() {
  const container = document.getElementById('vocab-list-container');
  if (!container) return;

  const list = await window.vocabEngine.storage.fetchWordsFromCloud();

  if (list.length === 0) {
    container.innerHTML = "<p style='font-size:12px;'>Henüz kelime eklenmedi.</p>";
    return;
  }

  container.innerHTML = "";
  list.forEach((item, idx) => {
    const div = document.createElement('div');
    div.style.cssText = "display:flex; justify-content:space-between; align-items:center; background:#fff; border:1px solid var(--border-color); padding:10px; border-radius:8px; margin-bottom:6px; font-size:13px;";
    div.innerHTML = `
      <div>
        <strong style="color:var(--primary);">${item.word}</strong> - ${item.meaning} (Kutu ${item.box || 1})
      </div>
      <button onclick="deleteVocabItem(${item.id || 'null'}, ${idx})" style="border:none; background:none; color:var(--danger); cursor:pointer;">❌</button>
    `;
    container.appendChild(div);
  });
}

async function deleteVocabItem(id, index) {
  await window.vocabEngine.storage.deleteWord(id, index);
  renderVocabList();
}
