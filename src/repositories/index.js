import { SupabasePackageRepository } from './supabase/packageRepository.js';
import { SupabaseConsumerRepository } from './supabase/consumerRepository.js';
import { SupabaseScanRepository } from './supabase/scanRepository.js';
import { SupabaseMerchantRepository } from './supabase/merchantRepository.js';

import { SQLitePackageRepository } from './sqlite/packageRepository.js';
import { SQLiteConsumerRepository } from './sqlite/consumerRepository.js';
import { SQLiteScanRepository } from './sqlite/scanRepository.js';
import { SQLiteMerchantRepository } from './sqlite/merchantRepository.js';

const isVercel = process.env.VERCEL === '1';
const defaultProvider = isVercel ? 'supabase' : 'sqlite';
const DB_PROVIDER = (process.env.DB_PROVIDER || defaultProvider).toLowerCase();

let packageRepo;
let consumerRepo;
let scanRepo;
let merchantRepo;

if (DB_PROVIDER === 'supabase') {
  packageRepo = new SupabasePackageRepository();
  consumerRepo = new SupabaseConsumerRepository();
  scanRepo = new SupabaseScanRepository();
  merchantRepo = new SupabaseMerchantRepository();
} else if (DB_PROVIDER === 'sqlite') {
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
