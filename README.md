# Q-Pack: Smart Biodegradable Packaging Ecosystem

Prototype & MVP ekosistem kemasan pintar *biodegradable* ramah lingkungan berbasis limbah kulit singkong dan kitosan sisik ikan yang terintegrasi dengan **Q-Pack Digital Passport**, pelacakan *traceability* nomor batch, pencegahan klaim poin ganda, serta analitik interaksi QR kemasan.

---

## 🏗️ Arsitektur Sistem

Sistem dirancang dengan pola **Repository Abstraction** untuk memisahkan logika bisnis dari penyedia database:

| Komponen | Lingkungan Lokal (`development`) | Lingkungan Produksi (`production`) |
|---|---|---|
| **Database Engine** | SQLite (`node:sqlite` bawaan Node 22) | Supabase / PostgreSQL |
| **Penyedia Repository** | `src/repositories/sqlite/` | `src/repositories/supabase/` |
| **Hosting Platform** | Localhost (`http://localhost:3000`) | Vercel (`https://qpackprototype.vercel.app`) |
| **Kredensial Database** | Tersimpan di server-side (`./data/qpack.db`) | Variabel lingkungan Vercel (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) |

---

## ⚡ Panduan Menjalankan Secara Lokal

1. **Instal Dependensi**:
   ```bash
   npm install
   ```

2. **Inisialisasi & Seeding Database SQLite Lokal**:
   ```bash
   npm run seed
   ```

3. **Jalankan Server Lokal**:
   ```bash
   npm start
   ```
   Akses aplikasi di: `http://localhost:3000`

4. **Jalankan Uji Otomatis Lokal**:
   ```bash
   npm test
   ```

---

## 🚀 Panduan Setup Database Produksi (Supabase)

1. Buka dashboard proyek **Supabase** Anda.
2. Masuk ke menu **SQL Editor**.
3. Buka dan jalankan seluruh isi file `src/db/supabase-schema.sql` untuk membuat tabel dan kebijakan keamanan (RLS).
4. Buka dan jalankan seluruh isi file `src/db/supabase-seed.sql` untuk mengisi data demo kanonikal (`QP-2027-000001`, `QP-2027-000002`, `QP-2027-000003`).

---

## 🌐 Konfigurasi Variabel Lingkungan Produksi di Vercel

Pada dashboard **Vercel** > **Project Settings** > **Environment Variables**, tambahkan:

```env
DB_PROVIDER=supabase
APP_BASE_URL=https://qpackprototype.vercel.app
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
```

---

## 🔍 Endpoint Produksi
- **Health Check**: `GET /api/health`
- **Diagnostik Database**: `GET /api/diagnostic`
- **Lookup Kemasan**: `GET /api/packages/:qr_code`
- **Pencatatan Scan**: `POST /api/scan`
- **Analitik Merchant**: `GET /api/merchant/analytics`
