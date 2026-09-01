/**
 * VocabQuiz - Spaced Repetition (SM-2) & Bulut Senkronizasyon Modülü
 */

class VocabStorageManager {
  constructor() {
    this.storageKeyWords = 'yds_vocab_list';
    this.storageKeyProfile = 'yds_vocab_profile';
  }

  getDefaultWords() {
    return [
      { id: 'w1', word: 'remédier', meaning: 'çözüm bulmak, iyileştirmek', type: 'verbe', example: 'Il faut remédier à ce problème.', synonyms: 'résoudre', box: 1 },
      { id: 'w2', word: 'dénoncer', meaning: 'kınamak, ihbar etmek', type: 'verbe', example: 'Le gouvernement a dénoncé cette décision.', synonyms: 'condamner', box: 1 },
      { id: 'w3', word: 'environnement', meaning: 'çevre', type: 'nom', example: 'La protection de l\'environnement est cruciale.', synonyms: 'milieu', box: 2 }
    ];
  }

  getWords() {
    const data = localStorage.getItem(this.storageKeyWords);
    return data ? JSON.parse(data) : this.getDefaultWords();
  }

  saveWords(words) {
    localStorage.setItem(this.storageKeyWords, JSON.stringify(words));
  }

  getProfile() {
    const data = localStorage.getItem(this.storageKeyProfile);
    return data ? JSON.parse(data) : { xp: 0, streak: 1 };
  }

  saveProfile(profile) {
    localStorage.setItem(this.storageKeyProfile, JSON.stringify(profile));
  }
}

class VocabEngine {
  constructor() {
    this.storage = new VocabStorageManager();
    this.words = [];
    this.profile = {};
    this.currentIndex = 0;
  }

  init() {
    this.words = this.storage.getWords();
    this.profile = this.storage.getProfile();
  }

  getCurrentCard() {
    return this.words[this.currentIndex] || null;
  }

  speak(text) {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }
  }

  processAnswer(type) {
    if (this.words.length === 0) return;
    const card = this.words[this.currentIndex];

    if (type === 'good') {
      card.box = Math.min((card.box || 1) + 1, 5);
      this.profile.xp = (this.profile.xp || 0) + 10;
    } else {
      card.box = 1; // Unutulduğunda 1. kutuya döner
    }

    this.storage.saveWords(this.words);
    this.storage.saveProfile(this.profile);

    // Supabase entegrasyonu varsa buluta sync et
    if (window.supabaseClient && window.currentUserId) {
      window.supabaseClient.from('vocab_words').upsert({ ...card, user_id: window.currentUserId });
    }

    this.nextCard();
  }

  nextCard() {
    this.currentIndex = (this.currentIndex + 1) % this.words.length;
  }
}

window.vocabEngine = new VocabEngine();
window.vocabEngine.init();
