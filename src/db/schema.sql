-- Q-Pack Schema (SQLite & PostgreSQL Compatible)

CREATE TABLE IF NOT EXISTS merchants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  email TEXT,
  logo_url TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL,
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
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (merchant_id) REFERENCES merchants(id)
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  batch_number TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  production_date DATE NOT NULL,
  total_quantity INTEGER DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  qr_code TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  batch_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active, scanned, collected, returned
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (merchant_id) REFERENCES merchants(id),
  FOREIGN KEY (batch_id) REFERENCES batches(id)
);

CREATE TABLE IF NOT EXISTS consumers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  points INTEGER NOT NULL DEFAULT 0,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS scan_events (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  consumer_id TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (consumer_id) REFERENCES consumers(id)
);

-- Future Phase Preparation: Bank Sampah & Circular Returns
CREATE TABLE IF NOT EXISTS bank_sampah (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  contact TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS returns (
  id TEXT PRIMARY KEY,
  package_id TEXT NOT NULL,
  consumer_id TEXT NOT NULL,
  bank_sampah_id TEXT,
  return_type TEXT NOT NULL, -- 'compost' or 'bank_sampah'
  status TEXT NOT NULL DEFAULT 'pending', -- pending, verified, rejected
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES packages(id),
  FOREIGN KEY (consumer_id) REFERENCES consumers(id),
  FOREIGN KEY (bank_sampah_id) REFERENCES bank_sampah(id)
);

CREATE TABLE IF NOT EXISTS return_verifications (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL,
  verified_by TEXT NOT NULL,
  verification_notes TEXT,
  reward_awarded INTEGER DEFAULT 0,
  verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (return_id) REFERENCES returns(id)
);
