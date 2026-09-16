import { queryOne, queryAll } from '../../db/database.js';

export class SQLiteMerchantRepository {
  async findById(id) {
    if (!id) return null;
    return queryOne('SELECT * FROM merchants WHERE id = ?', id) || null;
  }

  async findAll() {
    return queryAll('SELECT * FROM merchants ORDER BY created_at DESC');
  }
}
