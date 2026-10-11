# Catatan Pembaruan SIAKAD DKN (11 Oktober 2026)

**Versi:** 11 Oktober 2026 jam 09.10  
**Pengembang:** Dwi Krisnandi  
**Server Target:** Windows VPS (Tailscale: `100.91.77.123`)  

---

## 1. Modul Super Administrator (SaaS Management)
Seluruh menu operasional Superadmin telah dikonversi dari halaman placeholder menjadi fitur interaktif lengkap:

### A. Manajemen Kampus (Tenants) (`/superadmin/tenants`)
- **Pencegahan Nilai Nol:** Perhitungan metrik kampus & admin kini diambil langsung dari data aktif di browser (mencegah *race condition* dan terjemahan otomatis browser membekukan angka 0).
- **Kelola Multi-Admin:** Superadmin dapat melihat daftar seluruh admin dalam 1 kampus, menambah admin baru, mengubah nama/username, serta me-reset password admin.
- **Pendaftaran Kampus Baru:** Modal `+ Tambah Kampus` untuk mendaftarkan nama kampus, subdomain (slug), batas kuota mahasiswa, poin AI, dan pembuatan akun admin pertama secara otomatis.
- **Top Up AI:** Tombol isi ulang poin AI per tenant.

### B. Monitoring Server & Performa (`/superadmin/monitoring`)
- **Beban CPU Windows:** Menghitung persentase penggunaan CPU secara dinamis berbasis kalkulasi *tick time* processor (mengatasi isu bawaan Node.js `os.loadavg()` yang selalu bernilai `0.00` pada Windows Server).
- **Indikator Visual:** Dilengkapi progress bar untuk Beban CPU (%) dan Penggunaan RAM (%).
- **Informasi Uptime & Spesifikasi:** Menampilkan waktu aktif server, model prosesor, jumlah core, serta platform OS.

### C. Manajemen Paket & Harga (`/superadmin/plans`)
- Menyediakan katalog paket sewa (Starter, Pro, Enterprise).
- Fitur CRUD lengkap (Tambah paket, edit nama/harga/kuota mahasiswa, dan hapus paket).

### D. Status Sewa & Penagihan (`/superadmin/subscriptions`)
- Tabel status sewa setiap kampus (Trial, Active, Expired, Suspended).
- Modal kelola sewa untuk mengubah status paket, tanggal jatuh tempo, dan perpanjangan langganan.

### E. Database Manager (`/superadmin/database`)
- Alternatif phpMyAdmin internal khusus Super Administrator.
- Panel kiri menampilkan seluruh tabel publik database PostgreSQL.
- SQL Console untuk mengeksekusi query langsung (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`).
- Tampilan tabel interaktif dengan format data rapi.

---

## 2. Perbaikan & Standardisasi Multi-Tenancy Basis Data

### A. Pembersihan Data NULL
- Ditemukan 15 tabel dengan `tenant_id` kosong akibat migrasi lama.
- Sebanyak **~469 baris data** telah dimapping dan diperbaiki menjadi `tenant_id = 1` (PT. Artha Virddhi Sampada / Kampus Pamitran):
  - `attendance`: 176 baris
  - `exam_questions`: 200 baris
  - `question_bank`: 200 baris
  - `materials`: 44 baris
  - `course_grades`: 37 baris
  - `exams`: 5 baris
  - `schedules`: 5 baris
  - `classes`: 4 baris
  - `rps`: 1 baris
  - `academic_years`: 1 baris
  - `curriculums`: 1 baris
- Akun `superadmin` tetap dibiarkan `NULL` karena merupakan pengelola sistem global lintas-tenant.

### B. Proteksi Database Level (DEFAULT Constraint)
- Seluruh 15 tabel operasional telah disetel `DEFAULT 1` di skema PostgreSQL.
- Query `INSERT` apa pun yang masuk tanpa `tenant_id` tidak akan pernah lagi bernilai `NULL`.

### C. Tenant Auto-Injection (Middleware & AsyncLocalStorage)
- Dibuat context interceptor menggunakan `AsyncLocalStorage` di `api/tenantContext.js` dan `api/middlewares/tenant.js`.
- `api/db.js` secara otomatis menyisipkan `tenant_id` kampus yang sedang aktif ke dalam setiap query `INSERT` tanpa perlu memodifikasi ratusan file controller manual.

---

## 3. UI/UX & Proteksi Sistem
- **Footer Integrity:** Format footer diperbarui menjadi `Versi 11 Oktober 2026 jam 09.10` dengan tetap mempertahankan struktur validasi Core Integrity Verifier (CIV) agar sistem anti-tamper tidak terkunci.
- **Pencegahan Error Google Translate:** Nilai angka metrik dibungkus atribut `<span className="notranslate">` untuk mencegah mutasi DOM liar dari ekstensi auto-translate browser.
- **Pembersihan Cache Client:** Endpoint data tenants dilengkapi parameter *cache busting* (`?t=...`).

---

*Dokumen ini dibuat otomatis dan tersimpan di repositori proyek serta VPS server.*
