import { SQLitePackageRepository } from './sqlite/packageRepository.js';
import { SQLiteConsumerRepository } from './sqlite/consumerRepository.js';
import { SQLiteScanRepository } from './sqlite/scanRepository.js';
import { SQLiteMerchantRepository } from './sqlite/merchantRepository.js';

import { SupabasePackageRepository } from './supabase/packageRepository.js';
import { SupabaseConsumerRepository } from './supabase/consumerRepository.js';
import { SupabaseScanRepository } from './supabase/scanRepository.js';
import { SupabaseMerchantRepository } from './supabase/merchantRepository.js';

const DB_PROVIDER = (process.env.DB_PROVIDER || 'sqlite').toLowerCase();

let packageRepo;
let consumerRepo;
let scanRepo;
let merchantRepo;

if (DB_PROVIDER === 'supabase') {
  console.log('[Repositories] Provider: SUPABASE (Production Persistent Database)');
  // Explicitly instantiate Supabase adapters.
  // Note: If credentials are missing, Supabase client will throw an explicit fatal error immediately,
  // preventing any silent fallback to local SQLite.
  packageRepo = new SupabasePackageRepository();
  consumerRepo = new SupabaseConsumerRepository();
  scanRepo = new SupabaseScanRepository();
  merchantRepo = new SupabaseMerchantRepository();
} else if (DB_PROVIDER === 'sqlite') {
  console.log('[Repositories] Provider: SQLITE (Local Development)');
  packageRepo = new SQLitePackageRepository();
  consumerRepo = new SQLiteConsumerRepository();
  scanRepo = new SQLiteScanRepository();
  merchantRepo = new SQLiteMerchantRepository();
} else {
  throw new Error(
    `[Fatal] Invalid DB_PROVIDER="${DB_PROVIDER}". Allowed values are "sqlite" (local development) or "supabase" (production).`
  );
}

export const repositories = {
  packages: packageRepo,
  consumers: consumerRepo,
  scans: scanRepo,
  merchants: merchantRepo,
  provider: DB_PROVIDER
};

export {
  packageRepo as packageRepository,
  consumerRepo as consumerRepository,
  scanRepo as scanRepository,
  merchantRepo as merchantRepository,
  DB_PROVIDER
};
