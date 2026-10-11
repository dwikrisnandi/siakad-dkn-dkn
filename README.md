# SIAKAD DKN: Multi-Tenant Academic Information, CBT & SaaS Platform 🎓⚡

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Multi--Tenant SaaS](https://img.shields.io/badge/Architecture-Multi--Tenant%20SaaS-00C49F?style=for-the-badge)

Sistem Informasi Akademik (SIAKAD) modern, berkinerja tinggi, dan berbasis arsitektur **Multi-Tenant SaaS (Software-as-a-Service)** dengan integrasi **Computer-Based Test (CBT)**, **Kecerdasan Buatan (Google Gemini AI)**, dan **Super Administrator Cloud Management Suite**.

> **Status Sistem:** Aktif di lingkungan produksi (`Versi 11 Oktober 2026 jam 09.10`). Melayani institusi akademik multi-kampus secara terisolasi, aman, dan real-time.

---

## 🌟 Fitur Unggulan Terbaru

### 1. 🏢 Multi-Tenant Architecture & Data Isolation
Dirancang untuk melayani banyak kampus/institusi dalam satu deployment server & basis data terpadu:
- **Tenant Context Injection (AsyncLocalStorage)**: Backend Node.js secara otomatis menginjeksi `tenant_id` dari token otentikasi ke seluruh operasi database tanpa perlu hardcoding di setiap controller.
- **Tenant Scoping & Data Isolation**: Seluruh 15+ tabel operasional (mahasiswa, dosen, kelas, jadwal, KRS, presensi, ujian, nilai, materi) terisolasi penuh per tenant.
- **Auto-Tenant Default Fallback**: Default tenant fallback pada level DDL PostgreSQL menjamin integritas data bila parameter hilang.

### 2. 👑 Super Administrator SaaS Suite
Panel kontrol pusat tingkat platform untuk mengelola ekosistem institusi:
- **Tenant & Multi-Admin Management (`/superadmin/tenants`)**: Registrasi kampus baru, konfigurasi subdomain/slug, kuota mahasiswa/dosen, serta manajemen multi-admin kampus (tambah admin, reset sandi, hapus admin).
- **Subscription & Billing Engine (`/superadmin/subscriptions`)**: Manajemen langganan institusi dengan status siklus hidup (*Trial*, *Active*, *Expired*, *Suspended*), periode penagihan bulanan/tahunan, dan auto-status checker.
- **Pricing Plans Tiering (`/superadmin/plans`)**: Pengaturan paket langganan dinamis (*Starter*, *Pro*, *Enterprise*) dengan batas kuota pengguna, penyimpanan, dan toggle fitur.
- **Real-Time Windows Server Telemetry (`/superadmin/monitoring`)**: Monitor utilisasi CPU real-time (algoritma selisih tick multi-core Windows), penggunaan RAM, platform uptime, dan metrik sistem VPS.
- **Built-in Database Explorer & SQL Console (`/superadmin/database`)**: Pengganti phpMyAdmin/pgAdmin internal yang aman. Memungkinkan inspeksi skema tabel, pagination data, dan eksekusi kueri terisolasi langsung dari dashboard.

### 3. 🎯 Computer-Based Test (CBT) & Integritas Ujian
- **Client-Side Request Jittering**: Mencegah lonjakan trafik konkuren saat ratusan mahasiswa memulai ujian secara bersamaan.
- **Payload Key Sanitization**: Kunci jawaban disaring ketat di backend sebelum dikirim ke frontend, mencegah kecurangan melalui inspect element / devtools.
- **Visibility-Based Anti-Cheat**: Deteksi perpindahan tab browser via Page Visibility API dengan auto-submit saat melampaui batas pelanggaran.
- **Offline-First Resilience**: Dukungan penyimpanan progres ujian lokal (IndexedDB & LocalStorage) saat koneksi terputus.

### 4. 🤖 Integrasi AI Akademik (Google Gemini)
- **Koreksi Esai Otomatis**: Analisis jawaban esai mahasiswa berbasis kunci jawaban dosen dengan output skor dan umpan balik kontekstual.
- **Generator Soal & Materi RPS**: Generator bank soal pilihan ganda dan materi pembelajaran otomatis dari silabus mata kuliah.
- **Asisten AI Dosen & Mahasiswa**: Chatbot interaktif ("Pak Dwi") yang diprogram khusus untuk bimbingan akademik tanpa memberikan jalan pintas tugas.

### 5. ⚡ Arsitektur Performa Tinggi (Native SQL Driver)
- **Zero ORM Overhead**: Menggunakan driver native `pg` dengan kueri SQL terparameterisasi penuh (`$1, $2, ...`) untuk performa maksimal dan proteksi 100% terhadap SQL Injection.
- **Indexed Execution**: Kueri dirancang dengan indeks komposit pada `(tenant_id, ...)` menjamin respons kueri sub-milidetik.

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | React 18, Vite, Bootstrap 5, Custom Glassmorphism UI, Lucide Icons |
| **Backend** | Node.js, Express.js, AsyncLocalStorage, JWT, bcryptjs |
| **Database** | PostgreSQL (Native `pg` driver, Connection Pooler) |
| **AI / LLM** | Google Gemini API (`@google/generative-ai`) dengan Auto-Key Rotation |
| **Export Engine** | `docx` & PDF report generators |
| **Monitoring** | Native OS CPU tick delta monitor & Memory metric analyzer |

---

## 🚀 Panduan Menjalankan Sistem

### Kebutuhan Sistem
- **Node.js**: v18.x atau lebih baru
- **PostgreSQL**: v14.x atau lebih baru
- **NPM** atau **Yarn**

### 1. Kloning Repositori
```bash
git clone https://github.com/dwikrisnandi/siakad-dkn-dkn.git
cd siakad-dkn-dkn
```

### 2. Setup Backend (API)
```bash
cd api
npm install
```

Buat file konfigurasi `.env` pada direktori `api/`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=siakad_db
JWT_SECRET=your_jwt_secret_key
GEMINI_API_KEY_1=your_gemini_api_key
```

Jalankan server API:
```bash
npm start
```
*API berjalan pada: `http://localhost:3000`*

### 3. Setup Frontend (Client)
Buka terminal baru:
```bash
cd client
npm install
npm run dev
```
*Client React Vite berjalan pada: `http://localhost:5173`*

---

## 🔒 Keamanan & Praktik Terbaik

- **Zero Hardcoded Secrets**: Seluruh kredensial database, API key, dan JWT secret dikelola murni via environment variable (`.env`) dan dikecualikan via `.gitignore`.
- **Role-Based Access Control (RBAC)**: Pemisahan otoritas ketat antara `superadmin`, `admin`, `dosen`, dan `mahasiswa`.
- **Integrity Verifier**: Dilengkapi Core Integrity Verifier (CIV) untuk perlindungan hak cipta dan lisensi perangkat lunak.

---

## 📜 Lisensi & Pengembang

Dikembangkan dan diarsiteki oleh **Dwi Krisnandi**.  
Untuk konsultasi implementasi, kebutuhan white-label institusi, atau deployment kampus, silakan hubungi pengembang melalui GitHub Issues atau kontak resmi.
