import { queryOne, execute } from '../../db/database.js';

export class SQLiteConsumerRepository {
  async findById(id) {
    if (!id) return null;
    return queryOne('SELECT * FROM consumers WHERE id = ?', id) || null;
  }

  async findOrCreate(id, defaultData = {}) {
    let consumer = await this.findById(id);
    if (!consumer) {
      const name = defaultData.name || 'Budi Santoso';
      const email = defaultData.email || `${id}@qpack.id`;
      const points = defaultData.points || 0;

      execute(
        'INSERT OR IGNORE INTO consumers (id, name, email, points) VALUES (?, ?, ?, ?)',
        id, name, email, points
      );
      consumer = await this.findById(id);
    }
    return consumer;
  }

  async addPoints(id, pointsToAdd) {
    execute('UPDATE consumers SET points = points + ? WHERE id = ?', pointsToAdd, id);
    return await this.findById(id);
  }

  async resetAllPoints() {
    execute('UPDATE consumers SET points = 0');
  }
}
