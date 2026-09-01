// --- ANALYTICS & HISTORY MANAGER ---

// Soru başına harcanan saniye oranını hesaplayan metrik fonksiyonu
function calculateAverageTimePerQuestion(totalTimeSeconds, totalQuestions) {
  if (!totalQuestions || totalQuestions === 0) return 0;
  return (totalTimeSeconds / totalQuestions).toFixed(1);
}

// Geçmiş sınavları ve analiz verilerini tamamen ve hatasız sıfırlayan fonksiyon
function clearExamHistory() {
  const currentUser = localStorage.getItem("yds_current_user") || "Misafir";
  const historyKey = `yds_history_${currentUser}`;
  
  if (confirm("Geçmiş sınav kayıtlarınız ve analiz verileriniz kalıcı olarak silinecek. Emin misiniz?")) {
    // 1. LocalStorage verisini tamamen temizle
    localStorage.removeItem(historyKey);
    
    // 2. Geçmiş ekranındaki listeyi hemen boşalt/güncelle
    const historyContainer = document.getElementById("history-list");
    if (historyContainer) {
      historyContainer.innerHTML = "<div style='text-align:center; padding:20px; color:#94a3b8;'>Henüz kayıtlı sınav geçmişiniz bulunmuyor.</div>";
    }
    
    // 3. Aktif grafik varsa sıfırla veya yeniden oluştur
    if (window.ydsChartInstance) {
      window.ydsChartInstance.destroy();
      window.ydsChartInstance = null;
    }
    
    // 4. Grafikleri varsayılan boş duruma getir
    renderAnalytics('weekly');
    
    alert("✅ Geçmiş sınavlar ve analiz verileriniz başarıyla sıfırlandı!");
  }
}

// Geçmiş sınavları ekrana listeleyen fonksiyon
function renderHistory() {
  const currentUser = localStorage.getItem("yds_current_user") || "Misafir";
  const historyKey = `yds_history_${currentUser}`;
  const historyList = JSON.parse(localStorage.getItem(historyKey)) || [];
  
  const container = document.getElementById("history-list");
  if (!container) return;
  
  if (historyList.length === 0) {
    container.innerHTML = "<div style='text-align:center; padding:20px; color:#94a3b8;'>Henüz tamamlanmış bir sınav geçmişiniz yok.</div>";
    return;
  }
  
  let html = `
    <div style="display: flex; justify-content: flex-end; margin-bottom: 10px;">
      <button class="btn btn-danger" style="font-size: 12px; padding: 6px 12px;" onclick="clearExamHistory()">🗑️ Tüm Geçmişi Temizle</button>
    </div>
  `;
  
  historyList.reverse().forEach((item, index) => {
    const avgSec = calculateAverageTimePerQuestion(item.totalSeconds || 0, item.totalQuestions || 1);
    html += `
      <div class="history-card">
        <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-weight:bold; color:#38bdf8;">
          <span>${item.topic || 'YDS Deneme'}</span>
          <span style="font-size:12px; color:#94a3b8;">${item.date || ''}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:13px; color:#cbd5e1;">
          <span>✅ Doğru: <strong style="color:#10b981;">${item.correct}</strong></span>
          <span>❌ Yanlış: <strong style="color:#ef4444;">${item.wrong}</strong></span>
          <span>⏳ Süre: <strong>${item.timeFormatted || '00:00'}</strong></span>
          <span>⚡ Ort: <strong>${avgSec} sn/soru</strong></span>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

// Grafik Analiz Ekranı (Chart.js Entegrasyonu)
function renderAnalytics(type = 'weekly') {
  const currentUser = localStorage.getItem("yds_current_user") || "Misafir";
  const historyKey = `yds_history_${currentUser}`;
  const historyList = JSON.parse(localStorage.getItem(historyKey)) || [];
  
  const ctx = document.getElementById('ydsChart');
  if (!ctx) return;
  
  // Önceki grafik nesnesini yok et (çakışmaları önlemek için)
  if (window.ydsChartInstance) {
    window.ydsChartInstance.destroy();
  }
  
  if (historyList.length === 0) {
    // Veri yoksa boş grafik durumu göster
    window.ydsChartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Veri Yok'],
        datasets: [{
          label: 'Çözülen Soru',
          data: [0],
          backgroundColor: '#475569'
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
    return;
  }
  
  let labels = [];
  let dataCorrect = [];
  let dataWrong = [];
  
  // Son çözülen sınavları rapora yansıt
  const recentItems = historyList.slice(-7); // Son 7 sınav
  
  recentItems.forEach((item, idx) => {
    labels.push(`Deneme ${idx + 1}`);
    dataCorrect.push(item.correct || 0);
    dataWrong.push(item.wrong || 0);
  });
  
  window.ydsChartInstance = new Chart(ctx, {
    type: type === 'weekly' ? 'bar' : 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Doğru Sayısı',
          data: dataCorrect,
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          borderWidth: 1,
          tension: 0.3
        },
        {
          label: 'Yanlış Sayısı',
          data: dataWrong,
          backgroundColor: '#ef4444',
          borderColor: '#ef4444',
          borderWidth: 1,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#f8fafc', font: { size: 12 } } }
      },
      scales: {
        x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
      }
    }
  });
}