# SIAKAD DKN 🎓

Sistem Informasi Akademik (SIAKAD) modern dan cerdas yang dikembangkan oleh **Dwi Krisnandi**. Aplikasi ini dilengkapi dengan integrasi Artificial Intelligence (AI) untuk membantu operasional dosen, memandu mahasiswa, dan mempercepat proses akademik.

## ✨ Fitur Utama

### 🧑‍🏫 Modul Dosen
- **Manajemen Kelas & Jadwal**: Mengelola pertemuan kuliah dan absensi mahasiswa (Hadir, Sakit, Izin, Alpa).
- **Materi & Tugas**: Modul distribusi materi (RPS) dan pemberian tugas dengan deadline yang terintegrasi.
- **Computer-Based Testing (CBT) & Sistem Anti-Mencontek**: Membuat bank soal dan mengadakan ujian online. Mendukung soal Pilihan Ganda, Benar/Salah, dan Essay. Dilengkapi pengamanan super ketat untuk mencegah mahasiswa mencontek (mendeteksi jika mahasiswa berpindah aplikasi/tab untuk mencari jawaban, memblokir total akses *Copy-Paste*, dan dosen dapat memblokir mahasiswa curang secara *real-time* dari dashboard).
- **Export DOCX**: Fitur export soal menjadi dokumen Microsoft Word siap cetak dengan format header institusi yang dapat disesuaikan.
- **AI Auto-Grading**: Bantuan AI (Google Gemini) untuk memberikan skor dan feedback instan pada jawaban essay mahasiswa. AI juga dilatih khusus untuk secara otomatis **memberikan nilai 0** jika mendeteksi jawaban mahasiswa adalah hasil salin-tempel (copy-paste) buatan AI.
- **AI Exam & Material Generator**: Asisten AI untuk merangkum RPS menjadi buku teks HTML, menghasilkan soal-soal ujian (hingga 50 soal sekaligus), dan menyusun kisi-kisi ujian.

### 👨‍🎓 Modul Mahasiswa
- **Dashboard Akademik**: Melihat jadwal, presensi, materi perkuliahan, dan kalender tugas.
- **Ujian Online Anti-Curang (Zero-Cheating System)**: Mengikuti ujian dengan antarmuka modern yang secara otomatis memblokir segala bentuk upaya mencontek. Mahasiswa tidak bisa mem-*paste* jawaban dari luar, dan sistem akan **menghentikan ujian secara paksa (Auto-Submit)** apabila mahasiswa terdeteksi keluar dari layar ujian lebih dari 3 kali (misal: untuk mengambil *screenshot*, membuka WhatsApp, atau melihat Google/AI).
- **Chatbot Asisten Akademik "Pak Dwi"**: Fitur pendampingan AI yang dirancang bertindak sebagai dosen pembimbing. Bot ini diprogram secara khusus untuk membantu pemahaman materi, dan memiliki filter ketat untuk menolak permintaan penyelesaian tugas/pekerjaan rumah dari mahasiswa secara langsung.

### 🛡️ Modul Admin
- **Role Management**: Mengelola data pengguna (Dosen, Mahasiswa).
- **Manajemen Kurikulum**: Mengatur data Fakultas, Program Studi, Mata Kuliah, dan Kelas.
- **KHS & Transkrip**: Pembuatan dan validasi dokumen kelulusan berbasis sistem.

## 🛠️ Tech Stack

**Frontend (Client)**
* **Framework**: React.js (Vite)
* **UI/UX**: CSS 3 (Glassmorphism design language), Bootstrap/Tailwind, Lucide Icons.
* **Fitur Tambahan**: Progressive Web App (PWA) ready, Firebase Cloud Messaging (FCM).

**Backend (API)**
* **Framework**: Node.js dengan Express.js
* **Database**: PostgreSQL
* **Autentikasi**: JSON Web Token (JWT) + bcryptjs
* **AI Integration**: Google Generative AI SDK (`@google/generative-ai`) dengan sistem *Key Rotation* & *Retry Mechanism* untuk performa tinggi.
* **Document Generator**: `docx` library.

## 🚀 Instalasi & Menjalankan Aplikasi Lokal

Pastikan Anda telah menginstal **Node.js** dan **PostgreSQL**.

### 1. Kloning Repositori
```bash
git clone https://github.com/dwikrisnandi/saiakd-dkn.git
cd saiakd-dkn
```

### 2. Setup Backend (API)
```bash
cd api
npm install
```
Konfigurasi environment variables. Buat file `.env` di dalam folder `api`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password_db_anda
DB_NAME=siakad
JWT_SECRET=super_secret_key_anda
GEMINI_API_KEY_1=api_key_google_gemini
```
Jalankan server:
```bash
npm start
```

### 3. Setup Frontend (Client)
Buka terminal baru:
```bash
cd client
npm install
npm run dev
```
Aplikasi frontend akan berjalan di `http://localhost:5173`.

## 📜 Lisensi & Hak Cipta
Dikembangkan oleh **Dwi Krisnandi**. Segala hak cipta terkait arsitektur dan source code dilindungi.
