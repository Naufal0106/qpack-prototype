# Panduan Setup Supabase & Vercel — Q-Pack Production Database

Panduan langkah demi langkah untuk mengaktifkan database produksi persisten (**Supabase / PostgreSQL**) pada aplikasi Q-Pack yang telah di-deploy ke Vercel.

---

## 📋 Ikhtisar Arsitektur

| Lingkungan | Database Provider | Lokasi Data | URL Aplikasi |
|---|---|---|---|
| **Lokal (Development)** | `sqlite` | File lokal `./data/qpack.db` | `http://localhost:3000` |
| **Produksi (Production)** | `supabase` | Supabase Cloud (PostgreSQL Persisten) | `https://qpackprototype.vercel.app` |

> [!IMPORTANT]
> **Arsitektur Keamanan Kredensial**:
> - **Zero Client Exposure**: Browser / frontend **TIDAK PERNAH** terhubung langsung ke Supabase dan tidak memegang API key apa pun. Seluruh komunikasi melalui backend API Express Q-Pack di Vercel (`Browser -> Express API -> Supabase`).
> - **Anti-Tampering**: Logika bisnis (anti-duplikasi scan, kalkulasi poin, kuota progress) diproses dan divalidasi secara terpusat di `ScanService` backend.
> - **Rekomendasi Kunci**: Gunakan **`SUPABASE_SECRET_KEY`** (atau `service_role key`) di Environment Variables Vercel. Kunci ini hanya hidup di serverless backend Vercel yang terpercaya dan tidak akan pernah bocor ke publik atau Git.
> - **Dukungan Fallback**: Kode backend juga tetap mendukung `SUPABASE_ANON_KEY` / `SUPABASE_PUBLISHABLE_KEY` jika Anda memilih menggunakan anon key bersama RLS.
> - Jangan pernah melakukan commit file `.env` ke Git!

---

## A. Membuat Proyek Supabase Baru
1. Buka browser dan login ke [supabase.com](https://supabase.com).
2. Di dashboard organisasi Anda, klik tombol **New Project**.
3. Isi formulir pembuatan proyek:
   - **Name**: `qpack-production` (atau nama pilihan Anda).
   - **Database Password**: Buat password yang kuat dan simpan di password manager Anda.
   - **Region**: Pilih wilayah terdekat (misal: `Singapore (ap-southeast-1)`).
4. Klik **Create new project** dan tunggu 1–2 menit hingga database selesai disiapkan.

---

## B. Membuka SQL Editor di Supabase
1. Pada menu navigasi sebelah kiri dashboard Supabase, klik ikon **SQL Editor** (ikon terminal `>_`).
2. Klik tombol **+ New query** (atau **Create a new snippet**).

---

## C. Menjalankan SQL Pertama: Schema DDL & Keamanan RLS
1. Buka file [`src/db/supabase-schema.sql`](../src/db/supabase-schema.sql) di text editor / VS Code Anda.
   *(PENTING: Pastikan menyalin file `src/db/supabase-schema.sql`, yang dirancang khusus untuk dialek PostgreSQL/Supabase).*
2. Salin (**Copy**) seluruh isi file tersebut.
3. Tempel (**Paste**) ke dalam SQL Editor di Supabase.
4. Klik tombol **Run** (atau tekan `Ctrl + Enter`).
5. Pastikan muncul pesan sukses: `Success. No rows returned`.
   *(Tabel `merchants`, `products`, `batches`, `packages`, `consumers`, `scan_events`, `bank_sampah`, `returns`, `return_verifications`, serta kebijakan keamanan RLS telah aktif).*

---

## D. Menjalankan SQL Kedua: Seeding Data Demo Kanonikal
1. Buka tab query baru di SQL Editor Supabase (**+ New query**).
2. Buka file [`src/db/supabase-seed.sql`](../src/db/supabase-seed.sql).
3. Salin (**Copy**) seluruh isinya dan tempel (**Paste**) ke SQL Editor.
4. Klik tombol **Run**.
5. Pastikan muncul pesan sukses.
   *(Data paket kanonikal `QP-2027-000001`, `QP-2027-000002`, `QP-2027-000003`, dan konsumen demo `cons_demo_001` telah tersimpan di Supabase).*

---

## E. Mendapatkan Project URL Supabase
1. Di dashboard Supabase, klik ikon **Project Settings** (ikon roda gigi di kiri bawah).
2. Pilih submenu **API** (di bawah menu *Configuration*).
3. Cari bagian **Project URL**.
4. Salin nilainya (format: `https://<project-ref>.supabase.co`).

---

## F. Kunci API yang Dibutuhkan (API Key)
Di halaman **Project Settings** > **API** yang sama:
- Cari bagian **Project API keys**.
- **Opsi Utama (Sangat Disarankan)**: Cari kunci bertanda **`service_role` `secret`** (atau di dashboard Supabase baru berlabel *Secret key*).
  - Salin kunci rahasia ini.
  - Kunci ini digunakan di server backend Express Vercel sebagai **`SUPABASE_SECRET_KEY`**. Karena Express berjalan di lingkungan server yang aman (*server-side only*), kunci ini memiliki hak penuh untuk mengeksekusi operasi database sesuai logika bisnis aplikasi tanpa dibatasi atau dieksploitasi oleh akses luar.
- **Opsi Cadangan (Fallback)**: Jika Anda ingin menggunakan kunci publik/anon, salin kunci bertanda **`anon` `public`** (atau *Publishable key*).
  - Variabelnya adalah **`SUPABASE_ANON_KEY`**.
  - Kode backend Q-Pack secara otomatis mendukung fallback ini jika `SUPABASE_SECRET_KEY` tidak disetel.

---

## G. Konfigurasi Environment Variables di Vercel
Buka browser dan login ke dashboard Vercel Anda:
1. Buka project **`qpackprototype`** (atau `qpack_prototype`).
2. Masuk ke tab **Settings** di bagian atas.
3. Klik menu **Environment Variables** di bilah kiri.
4. Masukkan variabel-variabel berikut satu per satu:

| Key | Value Contoh | Keterangan & Prioritas |
|---|---|---|
| `DB_PROVIDER` | `supabase` | **Wajib** — Mengaktifkan adapter Supabase |
| `APP_BASE_URL` | `https://qpackprototype.vercel.app` | **Wajib** — Domain kanonikal HTTPS produksi |
| `SUPABASE_URL` | `https://xyzprojectref.supabase.co` | **Wajib** — Diambil dari Langkah E |
| `SUPABASE_SECRET_KEY` | `eyJhbGciOi...` *(service_role / secret key)* | **Rekomendasi Utama** — Server-side secure key (Langkah F) |
| `SUPABASE_ANON_KEY` | `eyJhbGciOi...` *(anon / public key)* | *Opsional Fallback* — Hanya jika tidak menggunakan secret key |

---

## H. Lingkungan Vercel yang Dipilih
Saat menambahkan masing-masing Environment Variable di atas:
- Pastikan centang pada opsi:
  - ☑ **Production**
  - ☑ **Preview** (opsional tapi disarankan)
  - ☑ **Development** (opsional)

---

## I. Menjalankan Redeploy di Vercel
Agar Environment Variables baru diterapkan ke serverless runtime Vercel:
1. Masuk ke tab **Deployments** pada project Vercel Anda.
2. Klik tombol titik tiga (**...**) pada deployment teratas (deployment aktif).
3. Pilih opsi **Redeploy**.
4. Pastikan centang opsi *"Use existing Build Cache"* atau biarkan default, lalu klik **Redeploy**.
5. Tunggu sekitar 10–20 detik hingga status deployment berubah menjadi **Ready** (ikon centang hijau).

---

## J. Memverifikasi Endpoint Health Produksi
Buka terminal PowerShell di komputer Anda dan jalankan:
```powershell
curl.exe -s https://qpackprototype.vercel.app/api/health
```
**Output yang diharapkan**:
```json
{
  "status": "ok",
  "database": "supabase",
  "environment": "production"
}
```

---

## K. Memverifikasi Endpoint Diagnostik Database Produksi
Jalankan perintah berikut:
```powershell
curl.exe -s https://qpackprototype.vercel.app/api/diagnostic
```
**Output yang diharapkan (Sukses)**:
```json
{
  "status": "ok",
  "database_provider": "supabase",
  "environment": "production",
  "lookup_source": "Supabase PostgreSQL (Production)",
  "sample_record_verified": true,
  "sample_package_id": "QP-2027-000001",
  "timestamp": "2026-09-16T..."
}
```
*(Ini membuktikan bahwa serverless function Vercel telah berhasil membaca paket demo dari Supabase).*

---

## L. Menjalankan Uji Otomatis End-to-End di Produksi
Setelah endpoint diagnostik di atas sukses, jalankan script pengujian live HTTP:
```powershell
npm run test:prod
```
Script `test-production.mjs` akan melakukan uji otomatis terhadap server produksi Vercel:
1. Verifikasi `/api/health`
2. Verifikasi `/api/diagnostic`
3. Lookup paket `QP-2027-000001`
4. First scan: menghasilkan **+50 poin** dan progress **1/10**
5. Scan ulang paket yang sama: mendeteksi duplikasi dan memberikan **0 poin tambahan**
6. Scan paket kedua `QP-2027-000002`: menghasilkan **+50 poin** dan progress **2/10**
7. Verifikasi analitik merchant membaca data agregasi Supabase

---

## M. Menguji QR Menggunakan Kamera Smartphone Nyata
1. Buka browser di laptop/PC ke halaman simulator:
   [`https://qpackprototype.vercel.app/consumer/scan.html`](https://qpackprototype.vercel.app/consumer/scan.html)
2. Arahkan kamera smartphone Anda ke gambar barcode QR fisik di layar laptop (misal untuk paket `QP-2027-000001`).
3. Smartphone akan mendeteksi tautan:
   `https://qpackprototype.vercel.app/p/QP-2027-000001`
4. Ketuk tautan tersebut di ponsel Anda:
   - Halaman **Q-Pack Digital Passport** akan terbuka di browser HP.
   - Poin **+50 Poin Q-Pack** akan bertambah secara real-time.
   - Spesifikasi bahan baku singkong dan nilai sirkularitas tampil rapi.
   - Pindai ulang barcode yang sama dengan HP Anda untuk melihat konfirmasi anti-duplikasi poin.
