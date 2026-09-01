// --- GRAFİK ANALİZ MANTIĞI (Chart.js) ---

let ydsChartInstance = null;

function renderAnalytics(mode) {
  const currentUser = localStorage.getItem("yds_current_user") || "";
  const historyKey = `yds_history_${currentUser}`;
  const historyList = JSON.parse(localStorage.getItem(historyKey)) || [];

  const ctx = document.getElementById('ydsChart').getContext('2d');

  if (ydsChartInstance) {
    ydsChartInstance.destroy();
  }

  if (historyList.length === 0) {
    ydsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Veri Yok'],
        datasets: [{ label: 'Çözülen Soru Bulunmuyor', data: [0], backgroundColor: '#334155' }]
      },
      options: { responsive: true, maintainAspectRatio: false }
    });
    return;
  }

  if (mode === 'weekly') {
    const recent = historyList.slice(-7);
    const labels = recent.map((item, index) => item.topic || `Oturum ${index + 1}`);
    const correctData = recent.map(item => item.correct);
    const wrongData = recent.map(item => item.wrong);

    ydsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Doğru', data: correctData, backgroundColor: '#10b981' },
          { label: 'Yanlış', data: wrongData, backgroundColor: '#ef4444' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } },
          y: { ticks: { color: '#cbd5e1' }, grid: { color: '#334155' } }
        },
        plugins: { legend: { labels: { color: '#f8fafc' } } }
      }
    });
  } else {
    let totalCorrect = 0, totalWrong = 0, totalEmpty = 0;
    historyList.forEach(item => {
      totalCorrect += item.correct;
      totalWrong += item.wrong;
      totalEmpty += item.empty;
    });

    ydsChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Doğru', 'Yanlış', 'Boş'],
        datasets: [{
          data: [totalCorrect, totalWrong, totalEmpty],
          backgroundColor: ['#10b981', '#ef4444', '#f59e0b']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#f8fafc' } } }
      }
    });
  }
}

function renderHistory() {
  const currentUser = localStorage.getItem("yds_current_user") || "";
  const historyKey = `yds_history_${currentUser}`;
  const historyList = JSON.parse(localStorage.getItem(historyKey)) || [];
  const container = document.getElementById("history-list");

  if (historyList.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:#94a3b8; font-size:13px; padding:20px;'>Henüz çözülmüş bir sınav geçmişi bulunmuyor.</p>";
    return;
  }

  let html = "";
  historyList.slice().reverse().forEach((item) => {
    html += `
      <div class="history-card">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
          <strong style="color:#38bdf8;">${item.topic || 'Deneme'}</strong>
          <span style="font-size:12px; color:#94a3b8;">${item.date || ''}</span>
        </div>
        <div style="display:flex; gap:15px; font-size:13px; color:#cbd5e1;">
          <span style="color:#10b981;">Doğru: ${item.correct}</span>
          <span style="color:#ef4444;">Yanlış: ${item.wrong}</span>
          <span style="color:#f59e0b;">Boş: ${item.empty}</span>
          <span style="color:#38bdf8;">Süre: ${item.timeFormatted}</span>
        </div>
      </div>
    `;
  });
  container.innerHTML = html;
}