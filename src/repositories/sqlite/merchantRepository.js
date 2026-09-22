import { queryOne, queryAll, execute } from '../../db/database.js';

export class SQLiteMerchantRepository {
  async findById(id) {
    if (!id) return null;
    return queryOne('SELECT * FROM merchants WHERE id = ?', id) || null;
  }

  async findByEmail(email) {
    if (!email) return null;
    return queryOne('SELECT * FROM merchants WHERE LOWER(email) = LOWER(?)', email.trim()) || null;
  }

  async createMerchant({ id, name, brand_name, email, passwordHash = null, logo_url = '/assets/icons/merchant-icon2.svg' }) {
    execute(
      'INSERT INTO merchants (id, name, brand_name, email, logo_url, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      id, name, brand_name, email.trim(), logo_url, passwordHash
    );
    return await this.findById(id);
  }

  async findAll() {
    return queryAll('SELECT * FROM merchants ORDER BY created_at DESC');
  }
}
