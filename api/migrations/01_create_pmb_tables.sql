-- Migrasi Skema Database PMB (Penerimaan Mahasiswa Baru) Multi-Tenant
-- Terintegrasi dengan siakad_db

-- 1. Jalur Pendaftaran
CREATE TABLE IF NOT EXISTS pmb_jalur (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
  nama_jalur VARCHAR(100) NOT NULL,
  gelombang INT NOT NULL DEFAULT 1,
  tgl_buka DATE,
  tgl_tutup DATE,
  biaya_pendaftaran NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Pendaftar Calon Mahasiswa Baru
CREATE TABLE IF NOT EXISTS pmb_pendaftar (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
  no_pendaftaran VARCHAR(50) NOT NULL,
  nama_lengkap VARCHAR(150) NOT NULL,
  nik VARCHAR(25) NOT NULL,
  email VARCHAR(100) NOT NULL,
  no_hp VARCHAR(25) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  tempat_lahir VARCHAR(100),
  tanggal_lahir DATE,
  jenis_kelamin VARCHAR(20),
  alamat TEXT,
  asal_sekolah VARCHAR(150),
  nama_ortu VARCHAR(150),
  no_hp_ortu VARCHAR(25),
  jalur_id INT REFERENCES pmb_jalur(id) ON DELETE SET NULL,
  prodi_pilihan_1 INT,
  prodi_pilihan_2 INT,
  status_pembayaran VARCHAR(20) DEFAULT 'unpaid', -- unpaid, pending, paid
  status_berkas VARCHAR(20) DEFAULT 'draft',      -- draft, submitted, verified, rejected
  status_kelulusan VARCHAR(20) DEFAULT 'pending', -- pending, passed, failed
  nim_generated VARCHAR(30),
  catatan_admin TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_pmb_no_pendaftaran_tenant UNIQUE(tenant_id, no_pendaftaran)
);

-- 3. Berkas Persyaratan Pendaftar
CREATE TABLE IF NOT EXISTS pmb_berkas (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
  pendaftar_id INT NOT NULL REFERENCES pmb_pendaftar(id) ON DELETE CASCADE,
  jenis_berkas VARCHAR(50) NOT NULL, -- ijazah, ktp, kk, pas_foto, rapor, sertifikat
  file_url TEXT NOT NULL,
  status_verifikasi VARCHAR(20) DEFAULT 'pending', -- pending, valid, invalid
  catatan TEXT,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Transaksi Pembayaran Formulir / Registrasi PMB
CREATE TABLE IF NOT EXISTS pmb_pembayaran (
  id SERIAL PRIMARY KEY,
  tenant_id INT NOT NULL DEFAULT 1 REFERENCES tenants(id) ON DELETE CASCADE,
  pendaftar_id INT NOT NULL REFERENCES pmb_pendaftar(id) ON DELETE CASCADE,
  metode_pembayaran VARCHAR(50) DEFAULT 'transfer_bank',
  bank_tujuan VARCHAR(50),
  nomor_rekening_tujuan VARCHAR(50),
  bukti_transfer_url TEXT,
  nominal NUMERIC(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, verified, rejected
  verified_at TIMESTAMP,
  verified_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indeks performa kueri multi-tenant
CREATE INDEX IF NOT EXISTS idx_pmb_jalur_tenant ON pmb_jalur(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pmb_pendaftar_tenant ON pmb_pendaftar(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pmb_pendaftar_email ON pmb_pendaftar(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_pmb_berkas_pendaftar ON pmb_berkas(pendaftar_id);
CREATE INDEX IF NOT EXISTS idx_pmb_pembayaran_pendaftar ON pmb_pembayaran(pendaftar_id);
