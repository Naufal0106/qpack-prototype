-- ==========================================
-- Q-PACK SUPABASE / POSTGRESQL PRODUCTION SCHEMA
-- ==========================================

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  size TEXT,
  image_url TEXT,
  material_name TEXT NOT NULL,
  material_desc TEXT,
  material_image_url TEXT,
  sustainability_info TEXT,
  co2_reduction TEXT,
  compostable_days INTEGER DEFAULT 180,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Batches Table
CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  production_date DATE NOT NULL,
  total_quantity INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Packages Table
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  qr_code TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  merchant_id TEXT NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  batch_id TEXT NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for instant lookup on qr_code
CREATE INDEX IF NOT EXISTS idx_packages_qr_code ON packages (UPPER(qr_code));

-- 5. Consumers Table
CREATE TABLE IF NOT EXISTS consumers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Scan Events Table
CREATE TABLE IF NOT EXISTS scan_events (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  consumer_id TEXT NOT NULL REFERENCES consumers(id) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  points_awarded INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT
);

-- Index for anti-duplication queries (package_id + consumer_id)
CREATE INDEX IF NOT EXISTS idx_scan_events_pkg_cons ON scan_events (package_id, consumer_id);

-- 7. Future Schema (Bank Sampah & Returns) - Prepared for Phase 2
CREATE TABLE IF NOT EXISTS bank_sampah (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id),
  consumer_id TEXT NOT NULL REFERENCES consumers(id),
  bank_sampah_id TEXT REFERENCES bank_sampah(id),
  return_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS return_verifications (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES returns(id),
  verified_by TEXT NOT NULL,
  verification_notes TEXT,
  reward_awarded INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;

-- Allow public read access to packages, products, merchants, batches
CREATE POLICY "Public read merchants" ON merchants FOR SELECT USING (true);
CREATE POLICY "Public read products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read batches" ON batches FOR SELECT USING (true);
CREATE POLICY "Public read packages" ON packages FOR SELECT USING (true);

-- Allow public read and insert/update for consumers demo flow
CREATE POLICY "Public read consumers" ON consumers FOR SELECT USING (true);
CREATE POLICY "Public insert consumers" ON consumers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update consumers" ON consumers FOR UPDATE USING (true);

-- Allow public read and insert for scan_events
CREATE POLICY "Public read scan_events" ON scan_events FOR SELECT USING (true);
CREATE POLICY "Public insert scan_events" ON scan_events FOR INSERT WITH CHECK (true);
