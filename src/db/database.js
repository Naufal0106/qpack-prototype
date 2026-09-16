import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_PATH 
  ? path.resolve(process.cwd(), process.env.DB_PATH) 
  : path.resolve(__dirname, '../../data/qpack.db');

// Ensure parent dir exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);

// Initialize schema
export function initDatabase() {
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

export function queryOne(sql, ...params) {
  const stmt = db.prepare(sql);
  return stmt.get(...params);
}

export function queryAll(sql, ...params) {
  const stmt = db.prepare(sql);
  return stmt.all(...params);
}

export function execute(sql, ...params) {
  const stmt = db.prepare(sql);
  return stmt.run(...params);
}

// Auto-run schema init on load
initDatabase();
