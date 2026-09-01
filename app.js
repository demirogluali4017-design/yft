let myChartInstance = null;

function saveExamSession(sessionData) {
  const currentUser = localStorage.getItem("yds_current_user") || "Misafir";
  const key = `yds_history_${currentUser}`;
  
  let history = JSON.parse(localStorage.getItem(key)) || [];
  history.push(sessionData);
  localStorage.setItem(key, JSON.stringify(history));
}

function renderHistory() {
  const currentUser = localStorage.getItem("yds_current_user") || "Misafir";
  const key = `yds_history_${currentUser}`;
  const history = JSON.parse(localStorage.getItem(key)) || [];
  const container = document.getElementById("history-list");

  if (history.length === 0) {
    container.innerHTML = "<p style='color:#94a3b8; text-align:center; padding:20px;'>Henüz tamamlanmış bir sınav oturumun bulunmuyor.</p>";
    return;
  }

  container.innerHTML = history.reverse().map(item => `
    <div class="history-card">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <strong style="color:#38bdf8;">📌 ${item.topic}</strong>
        <span style="font-size:12px; color:#94a3b8;">${item.date}</span>
      </div>
      <div style="display:flex; gap:15px; font-size:13px;">
        <span style="color:#10b981;">Doğru: ${item.correct}</span>
        <span style="color:#ef4444;">Yanlış: ${item.wrong}</span>
        <span style="color:#f59e0b;">Boş: ${item.empty}</span>
        <span style="color:#94a3b8;">Süre: ${item.timeSpent}</span>
      </div>
    </div>
  `).join('');
}

function renderAnalytics(mode) {
  const currentUser = localStorage.getItem("yds_current_user") || "Misafir";
  const key = `yds_history_${currentUser}`;
  const history = JSON.parse(localStorage.getItem(key)) || [];

  const ctx = document.getElementById('ydsChart').getContext('2d');

  if (myChartInstance) {
    myChartInstance.destroy();
  }

  if (history.length === 0) {
    // Veri yoksa boş grafik şablonu
    myChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Veri Yok'],
        datasets: [{ label: 'Çözülen Soru Yok', data: [0], backgroundColor: '#334155' }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return;
  }

  if (mode === 'weekly') {
    // Son 7 sınavın doğru ve yanlış sayıları grafiği
    const recent = history.slice(-7);
    const labels = recent.map((h, i) => `Sınav ${i + 1} (${h.topic.substring(0, 10)}...)`);
    const corrects = recent.map(h => h.correct);
    const wrongs = recent.map(h => h.wrong);

    myChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Doğru',
            data: corrects,
            backgroundColor: '#10b981',
            borderRadius: 6
          },
          {
            label: 'Yanlış',
            data: wrongs,
            backgroundColor: '#ef4444',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#f8fafc' } }
        },
        scales: {
          x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
        }
      }
    });
  } else {
    // Genel Başarı Oranı (Pasta Grafik)
    let totalCorrect = history.reduce((acc, curr) => acc + curr.correct, 0);
    let totalWrong = history.reduce((acc, curr) => acc + curr.wrong, 0);
    let totalEmpty = history.reduce((acc, curr) => acc + curr.empty, 0);

    myChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Doğru', 'Yanlış', 'Boş'],
        datasets: [{
          data: [totalCorrect, totalWrong, totalEmpty],
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: '#f8fafc' } }
        }
      }
    });
  }
}