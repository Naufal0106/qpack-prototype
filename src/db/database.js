import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance = null;

export function getDb() {
  if (dbInstance) return dbInstance;

  const isVercel = process.env.VERCEL === '1';
  const defaultPath = isVercel 
    ? '/tmp/qpack.db' 
    : path.resolve(__dirname, '../../data/qpack.db');

  const dbPath = process.env.DB_PATH 
    ? path.resolve(process.cwd(), process.env.DB_PATH) 
    : defaultPath;

  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  try {
    const { DatabaseSync } = require('node:sqlite');
    dbInstance = new DatabaseSync(dbPath);

    const schemaPath = path.resolve(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      dbInstance.exec(schemaSql);
    }

    return dbInstance;
  } catch (err) {
    throw new Error(
      `Failed to initialize local SQLite database: ${err.message}. ` +
      'In production environments like Vercel, configure DB_PROVIDER=supabase, SUPABASE_URL, and SUPABASE_ANON_KEY.'
    );
  }
}

export const db = {
  prepare: (sql) => getDb().prepare(sql),
  exec: (sql) => getDb().exec(sql)
};

export function initDatabase() {
  getDb();
}

export function queryOne(sql, ...params) {
  const instance = getDb();
  const stmt = instance.prepare(sql);
  return stmt.get(...params);
}

export function queryAll(sql, ...params) {
  const instance = getDb();
  const stmt = instance.prepare(sql);
  return stmt.all(...params);
}

export function execute(sql, ...params) {
  const instance = getDb();
  const stmt = instance.prepare(sql);
  return stmt.run(...params);
}
