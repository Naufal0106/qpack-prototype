/**
 * charts.js — Modul Visualisasi Grafik menggunakan Chart.js
 * Diaktifkan pada halaman data monografi kependudukan / mata pencaharian
 * Sinkron secara dinamis dengan data di localStorage (admin dashboard)
 */

export async function initCharts() {
  const $ = (selector) => document.querySelector(selector);

  // Deteksi otomatis URL base API
  const API_BASE = window.location.origin.startsWith('http') 
    ? `${window.location.origin}/api` 
    : 'http://localhost:5000/api';

  // Ambil data demografi dinamis dari API backend
  const defaultDemografi = {
    total_penduduk: 1818,
    total_kk: 501,
    jumlah_rt: 14,
    laki_laki: 942,
    perempuan: 876,
    islam: 1123,
    kristen: 351,
    katolik: 276,
    hindu: 57
  };

  let demografi = defaultDemografi;
  try {
    const res = await fetch(`${API_BASE}/demografi`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.laki_laki !== undefined) {
        demografi = {
          total_penduduk: data.total_penduduk,
          total_kk: data.total_kk,
          jumlah_rt: data.jumlah_rt,
          laki_laki: data.laki_laki,
          perempuan: data.perempuan,
          islam: data.agama_islam !== undefined ? data.agama_islam : (data.islam || 0),
          kristen: data.agama_kristen !== undefined ? data.agama_kristen : (data.kristen || 0),
          katolik: data.agama_katolik !== undefined ? data.agama_katolik : (data.katolik || 0),
          hindu: data.agama_hindu !== undefined ? data.agama_hindu : (data.hindu || 0)
        };
      }
    }
  } catch (err) {
    console.error("Gagal mengambil demografi dari API, menggunakan fallback:", err);
  }

  // --- Grafik Demografi Gender ---
  const genderCtx = $('#genderChart');
  if (genderCtx) {
    new Chart(genderCtx, {
      type: 'doughnut',
      data: {
        labels: ['Laki-laki', 'Perempuan'],
        datasets: [{
          data: [demografi.laki_laki, demografi.perempuan],
          backgroundColor: ['#2A8725', '#EAA41A'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Inter', size: 13 }
            }
          }
        }
      }
    });
  }

  // --- Grafik Klasifikasi Agama ---
  const religionCtx = $('#religionChart');
  if (religionCtx) {
    new Chart(religionCtx, {
      type: 'bar',
      data: {
        labels: ['Islam', 'Kristen', 'Katolik', 'Hindu'],
        datasets: [{
          label: 'Jumlah Penduduk (Jiwa)',
          data: [demografi.islam, demografi.kristen, demografi.katolik, demografi.hindu],
          backgroundColor: ['#1D5D18', '#2A8725', '#EAA41A', '#915F38'],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              font: { family: 'Inter' }
            }
          },
          x: {
            ticks: {
              font: { family: 'Inter' }
            }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // --- Grafik Mata Pencaharian ---
  const jobCtx = $('#jobChart');
  if (jobCtx) {
    new Chart(jobCtx, {
      type: 'pie',
      data: {
        labels: ['Pertanian & Perkebunan', 'Buruh Tani', 'Swasta & Dagang', 'PNS / TNI / POLRI'],
        datasets: [{
          data: [65, 15, 12, 8],
          backgroundColor: ['#1D5D18', '#2A8725', '#EAA41A', '#915F38'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              font: { family: 'Inter', size: 13 }
            }
          }
        }
      }
    });
  }
}
