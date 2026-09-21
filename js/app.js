/**
 * app.js — Client-side API & State Manager untuk Q-Pack
 */

const API_BASE = window.location.origin;

// Consumer Session Management
const DEFAULT_CONSUMER = {
  id: 'cons_demo_001',
  name: 'Budi Santoso',
  email: 'budi.santoso@qpack.id'
};

export function getActiveConsumer() {
  const saved = localStorage.getItem('qpack_consumer');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // fallback
    }
  }
  localStorage.setItem('qpack_consumer', JSON.stringify(DEFAULT_CONSUMER));
  return DEFAULT_CONSUMER;
}

export function setActiveConsumer(consumer) {
  localStorage.setItem('qpack_consumer', JSON.stringify(consumer));
}

// 1. Ambil detail kemasan berdasarkan QR Code (termasuk status klaim konsumen jika disediakan)
export async function getPackageByQR(qrCode, consumerId = null) {
  const activeId = consumerId || (getActiveConsumer() ? getActiveConsumer().id : null);
  const url = activeId
    ? `${API_BASE}/api/packages/${encodeURIComponent(qrCode)}?consumer_id=${encodeURIComponent(activeId)}`
    : `${API_BASE}/api/packages/${encodeURIComponent(qrCode)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Gagal mengambil data kemasan.');
  }
  return data.data;
}

// 2. Kirim scan event untuk mencatat pemindaian dan klaim poin
export async function submitScan(qrCode, consumerId = null) {
  const consumer = consumerId ? { id: consumerId } : getActiveConsumer();
  const res = await fetch(`${API_BASE}/api/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      qr_code: qrCode,
      consumer_id: consumer.id
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Gagal mencatat pemindaian.');
  }
  return data;
}

// 3. Ambil profil konsumen & progress koleksi
export async function getConsumerProfile(consumerId = null) {
  const consumer = consumerId ? { id: consumerId } : getActiveConsumer();
  const res = await fetch(`${API_BASE}/api/consumer/${encodeURIComponent(consumer.id)}/profile`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Gagal mengambil profil konsumen.');
  }
  return data;
}

// 4. Ambil analitik dashboard merchant
export async function getMerchantAnalytics(merchantId = null) {
  const url = merchantId 
    ? `${API_BASE}/api/merchant/analytics?merchant_id=${encodeURIComponent(merchantId)}`
    : `${API_BASE}/api/merchant/analytics`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Gagal mengambil analitik merchant.');
  }
  return data.analytics;
}

// 5. Ambil daftar kemasan & QR untuk manajemen merchant
export async function getMerchantPackages(merchantId = null) {
  const url = merchantId 
    ? `${API_BASE}/api/merchant/packages?merchant_id=${encodeURIComponent(merchantId)}`
    : `${API_BASE}/api/merchant/packages`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Gagal mengambil daftar kemasan.');
  }
  return data.packages;
}

// 6. Reset demo data
export async function resetDemo() {
  const res = await fetch(`${API_BASE}/api/demo/reset`, { method: 'POST' });
  return await res.json();
}

