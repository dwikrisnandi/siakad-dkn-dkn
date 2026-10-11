-- Migrasi Penambahan Kolom Custom Domain pada tabel tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS custom_domain_siakad VARCHAR(150) UNIQUE,
ADD COLUMN IF NOT EXISTS custom_domain_spmb VARCHAR(150) UNIQUE;

CREATE INDEX IF NOT EXISTS idx_tenants_custom_siakad ON tenants(custom_domain_siakad);
CREATE INDEX IF NOT EXISTS idx_tenants_custom_spmb ON tenants(custom_domain_spmb);
