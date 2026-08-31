// Oturum Sonucunu Hafızaya Kaydet
function saveExamSession(sessionData) {
  const history = JSON.parse(localStorage.getItem("yds_exam_history") || "[]");
  history.unshift(sessionData);
  localStorage.setItem("yds_exam_history", JSON.stringify(history));
}

// Geçmiş Oturumları Ekrana Yazdır
function renderHistory() {
  const historyList = document.getElementById("history-list");
  const history = JSON.parse(localStorage.getItem("yds_exam_history") || "[]");

  if (history.length === 0) {
    historyList.innerHTML = "<p>Henüz tamamlanmış bir sınav oturumu yok.</p>";
    return;
  }

  historyList.innerHTML = history.map(item => `
    <div class="history-card">
      <strong>📌 ${item.topic}</strong> (${item.date})<br>
      ⏱️ Süre: ${item.timeSpent} | ✅ Doğru: ${item.correct} | ❌ Yanlış: ${item.wrong} | ⚪ Boş: ${item.empty}
    </div>
  `).join('');
}

// Haftalık / Aylık İlerleme Analizini Göster
function renderAnalytics(type) {
  const history = JSON.parse(localStorage.getItem("yds_exam_history") || "[]");
  const container = document.getElementById("analytics-content");
  
  const now = new Date();
  const daysLimit = type === 'weekly' ? 7 : 30;

  const filteredHistory = history.filter(item => {
    const itemDate = new Date(item.timestamp);
    const diffDays = (now - itemDate) / (1000 * 3600 * 24);
    return diffDays <= daysLimit;
  });

  if (filteredHistory.length === 0) {
    container.innerHTML = `<p>Son ${daysLimit} gün içinde çözülmüş sınav bulunamadı.</p>`;
    return;
  }

  let totalQuestions = 0, totalCorrect = 0, totalWrong = 0, totalSeconds = 0;

  filteredHistory.forEach(h => {
    totalCorrect += h.correct;
    totalWrong += h.wrong;
    totalQuestions += (h.correct + h.wrong + h.empty);
    totalSeconds += h.seconds;
  });

  const accuracy = totalQuestions > 0 ? ((totalCorrect / totalQuestions) * 100).toFixed(1) : 0;
  const avgTimeMinutes = (totalSeconds / 60).toFixed(1);

  container.innerHTML = `
    <h3>${type === 'weekly' ? '📅 Son 7 Günlük' : '🗓️ Son 30 Günlük'} Özet</h3><br>
    <p>📝 Toplam Çözülen Soru: <strong>${totalQuestions}</strong></p>
    <p>✅ Toplam Doğru: <strong>${totalCorrect}</strong> | ❌ Toplam Yanlış: <strong>${totalWrong}</strong></p>
    <p>🎯 Başarı Oranı: <strong>%${accuracy}</strong></p>
    <p>⏱️ Toplam Harcanan Süre: <strong>${avgTimeMinutes} Dakika</strong></p>
  `;
}