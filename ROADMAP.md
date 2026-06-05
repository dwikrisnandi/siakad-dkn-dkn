# Roadmap & Alur Pengembangan SIAKAD Terpadu

## Pendahuluan
Dokumen ini menguraikan peta jalan (roadmap) dan alur (workflow) pengembangan sistem untuk mentransformasi aplikasi *Learning Management System* (LMS) saat ini menjadi Sistem Informasi Akademik (SIAKAD) yang utuh sesuai standar perguruan tinggi di Indonesia.

---

## 🎯 Fase 1: Fondasi Master Data & Status Keuangan
*Target: Membangun hierarki institusi dan memastikan integrasi pembayaran sebelum proses akademik dimulai.*

### [ ] 1. Master Data Prodi & Kurikulum
- **Tujuan:** Memisahkan data mahasiswa, dosen, dan matakuliah berdasarkan jurusan/program studi.
- **Perubahan Database:**
  - [ ] Tabel `programs` (id, nama_prodi, fakultas, kode_prodi)
  - [ ] Tabel `curriculums` (id, program_id, tahun_berlaku, status_aktif)
  - [ ] *Penyesuaian:* Tambah kolom `program_id` di tabel `users` (untuk mahasiswa/dosen), dan `curriculum_id` di tabel `courses`.
- **Alur Kerja:** 
  1. Admin menginput data Program Studi.
  2. Admin membuat Kurikulum untuk prodi tersebut.
  3. Admin mengaitkan Matakuliah dengan Kurikulum tertentu beserta plotting semesternya (misal: Matakuliah Algoritma untuk Semester 1).

### [ ] 2. Modul Keuangan Dasar
- **Tujuan:** Mengelola status lunas pembayaran biaya kuliah (SPP/UKT) sebagai syarat utama pengisian KRS dan mengikuti Ujian.
- **Perubahan Database:**
  - [ ] Tabel `invoices` (id, mahasiswa_id, academic_year_id, nominal, status_lunas, tanggal_bayar).
- **Alur Kerja:** 
  1. Awal semester, Admin Keuangan me-generate tagihan untuk semua mahasiswa aktif.
  2. Mahasiswa membayar tagihan (bisa melalui validasi manual dengan upload bukti transfer, atau otomatis via Payment Gateway).
  3. Status di sistem berubah menjadi "Lunas". 
  4. *Sistem Keamanan:* Mahasiswa yang berstatus "Belum Lunas" tidak akan dapat mengakses menu "Pengisian KRS" maupun "Ujian".

---

## 🎯 Fase 2: Sistem Rencana Studi (KRS) & Bimbingan Akademik
*Target: Mengotomatisasi pendaftaran kelas dari yang sebelumnya serba manual oleh Admin menjadi mandiri oleh Mahasiswa.*

### [ ] 1. Dosen Pembimbing Akademik (DPA)
- **Perubahan Database:** 
  - [ ] Tambah kolom `dpa_id` (mengarah ke id dosen) di tabel `users` khusus untuk role mahasiswa.
- **Alur Kerja:** Admin (atau Kaprodi) menetapkan 1 Dosen DPA untuk setiap mahasiswa. Dosen kelak dapat melihat daftar anak walinya di menu khusus pada *Dashboard Dosen*.

### [ ] 2. Alur Pengisian KRS Mandiri
- **Perubahan Database:**
  - [ ] Tabel `krs` (id, mahasiswa_id, academic_year_id, status_approval).
  - [ ] Tabel `krs_items` (id, krs_id, schedule_id).
- **Alur Kerja (Workflow):**
  1. **Cek Syarat Keuangan:** Mahasiswa login. Sistem mengecek status tagihan `invoices`. Jika belum lunas, menu KRS terkunci dengan notifikasi peringatan.
  2. **Pilih Kelas/Jadwal:** Mahasiswa masuk ke menu "Pengisian KRS". Sistem menampilkan daftar jadwal kelas (`schedules`) yang dibuka untuk Prodinya pada semester tersebut. Mahasiswa men-ceklis matakuliah yang ingin diambil (dengan validasi batas maksimal, misal 24 SKS).
  3. **Pengajuan:** Mahasiswa mengklik "Ajukan KRS ke Dosen Wali". Status KRS berubah menjadi *Pending*.
  4. **Approval DPA:** Dosen DPA login, membuka menu "Bimbingan Akademik". DPA melihat rincian KRS yang diajukan oleh anak walinya, menilainya, lalu mengklik "Setujui" (Approve) atau "Tolak" (jika ada kesalahan ambil MK).
  5. **Finalisasi:** Setelah di-*approve*, data jadwal dari `krs_items` secara otomatis di-*copy* ke dalam tabel `class_enrollments`. Sejak detik itu, mahasiswa resmi terdaftar di kelas dan kelas akan muncul di menu LMS mereka (Materi, Tugas, Ujian).

---

## 🎯 Fase 3: Evaluasi Akademik & Transkrip
*Target: Memastikan akuntabilitas dosen secara dua arah dan perekapan hasil belajar mahasiswa secara kumulatif.*

### [ ] 1. EDOM (Evaluasi Dosen Oleh Mahasiswa)
- **Perubahan Database:**
  - [ ] Tabel `edom_questions` (pertanyaan standar kuisioner).
  - [ ] Tabel `edom_answers` (nilai rating dari mahasiswa untuk jadwal/dosen tertentu).
- **Alur Kerja:**
  1. Di akhir semester (menjelang UAS atau saat pembagian KHS), sistem akan memblokir/mengunci menu "Lihat KHS".
  2. Mahasiswa diwajibkan masuk ke menu "EDOM" dan mengisi kuisioner penilaian untuk setiap dosen yang mengajarnya semester itu.
  3. Setelah semua kuisioner berstatus *Completed*, KHS mahasiswa otomatis terbuka. 
  4. Dosen dapat melihat rekap skor/rating performanya secara anonim.

### [ ] 2. Transkrip Nilai Kumulatif & SKL
- **Perubahan Database:**
  - [ ] Tidak membutuhkan tabel besar baru. Transkrip adalah *Query Complex* yang merekap nilai final dari tabel `course_grades` milik seorang mahasiswa melintasi semua Tahun Akademik.
- **Alur Kerja:**
  1. Dibuat menu baru "Transkrip" di dashboard Mahasiswa dan Admin.
  2. *Logika Filter:* Jika mahasiswa pernah mengulang matakuliah (misal di sem 1 dapat C, di sem 3 dapat A), sistem otomatis hanya mengambil nilai tertinggi (A) untuk masuk ke transkrip.
  3. Menghitung Total SKS Kumulatif dan IPK Kumulatif.
  4. Tersedia tombol cetak PDF dengan *layout* kop surat resmi universitas sebagai draf SKL (Surat Keterangan Lulus) atau dokumen pelengkap kelulusan.

---

## 🎯 Fase 4: Penyelesaian Studi & Pelaporan Nasional
*Target: Manajemen ujung siklus mahasiswa hingga terintegrasi dengan kementerian.*

### [ ] 1. Modul Skripsi / Tugas Akhir
- **Alur Kerja:**
  1. **Pengajuan Judul:** Mahasiswa mengajukan 2-3 usulan judul. Kaprodi menyeleksi, menyetujui 1 judul, dan menunjuk 1-2 Dosen Pembimbing.
  2. **Bimbingan & Logbook:** Mahasiswa wajib mengisi *logbook* catatan harian bimbingan secara rutin, dan dosen memvalidasinya.
  3. **Pendaftaran Sidang:** Mahasiswa mendaftar sidang dengan syarat (IPK memenuhi, lulus semua SKS, bebas tanggungan perpustakaan/keuangan).
  4. **Input Nilai Sidang:** Dosen penguji menginput nilai sidang, yang kemudian menghasilkan Nilai Akhir (Yudisium).

### [ ] 2. Export / Integrasi PDDikti (Feeder)
- **Alur Kerja:** Admin menggunakan menu "Export Feeder" untuk mendownload sekumpulan file `.csv` atau `.xls`. File ini (*Data Mahasiswa Baru, Kelas Kuliah, KRS, Aktivitas Mengajar Dosen, dan Nilai*) datanya disusun tepat persis dengan kolom/format yang dibaca oleh aplikasi Feeder PDDikti Kemenristekdikti, sehingga tim IT kampus hanya perlu 1 klik untuk import data negara.

---

## 🎯 Fase 5: Modul Beban Kerja Dosen (BKD) & Repository SISTER
*Target: Sentralisasi arsip dokumen Tri Dharma Perguruan Tinggi agar Dosen tidak perlu lagi menggunakan Google Drive pribadi, dan memudahkan pantauan institusi.*

### [ ] 1. Manajemen Tugas Tambahan (Jabatan Struktural)
- **Tujuan:** Mengelola daftar dosen yang menjabat posisi manajerial (Rektor, Dekan, Kaprodi, Kepala UPT, dll) karena posisi ini sangat berpengaruh pada perhitungan SKS BKD mereka.
- **Perubahan Database:**
  - [ ] Tabel `structural_roles` (id, nama_jabatan, sks_ekuivalen).
  - [ ] Tabel `dosen_tugas_tambahan` (id, dosen_id, structural_role_id, nomor_sk, tgl_mulai, tgl_selesai, file_sk).
- **Alur Kerja:**
  1. Admin menginput master Jabatan Struktural di kampus.
  2. Admin memetakan Dosen A sebagai Kaprodi, Dosen B sebagai Kepala Lab, beserta masa jabatannya (SK).
  3. Sistem memberikan **hak akses khusus** bagi dosen tersebut (misalnya: Dosen A yang menjadi Kaprodi otomatis mendapatkan menu "Monitoring BKD Dosen" untuk jurusannya).
  4. Di BKD, sistem otomatis menghitung SKS Tugas Tambahan dosen tersebut agar target mengajarnya disesuaikan (dikurangi).

### [ ] 2. Repository Dokumen BKD Terpusat
- **Tujuan:** Menyediakan penyimpanan file langsung di dalam SIAKAD untuk laporan Pendidikan, Penelitian, Pengabdian, dan Penunjang.
- **Perubahan Database:**
  - [ ] Tabel `bkd_documents` (id, dosen_id, category, title, file_url, uploaded_at, academic_year_id).
- **Alur Kerja Dosen:**
  1. Dosen login dan masuk ke menu "Repository BKD".
  2. Dosen mengunggah bukti kinerja (misal: SK Mengajar, Sertifikat Webinar, Jurnal Publikasi).
  3. Sistem mengunggah file ke server SIAKAD dan men-*generate* **Direct Link (URL Unik)** khusus yang terekspos ke publik (tanpa password).
  4. Saat pelaporan BKD di web **SISTER Kemdikbud**, Dosen cukup melakukan *Copy-Paste* link tersebut dari SIAKAD ke SISTER. Tidak perlu lagi dipusingkan dengan isu "Akses Ditolak" gara-gara salah setting izin akses *Google Drive*.

### [ ] 3. Monitoring BKD oleh Pimpinan/Admin
- **Alur Kerja Pimpinan:**
  1. Kaprodi atau Admin Akademik memiliki menu khusus "Monitoring BKD".
  2. Pimpinan bisa melihat *dashboard* indikator/progress bar dari persentase kelengkapan pengumpulan dokumen BKD untuk setiap dosen di jurusannya.
  3. Pimpinan bisa langsung mengklik dan melihat pratinjau (*preview*) dokumen PDF/gambar bukti fisik untuk melakukan pengecekan atau teguran internal sebelum masa pelaporan SISTER Ditjen Dikti ditutup.
