import { queryOne, queryAll, execute } from '../../db/database.js';

export class SQLiteScanRepository {
  async hasConsumerScannedPackage(packageId, consumerId) {
    const row = queryOne(
      'SELECT COUNT(*) AS scan_count FROM scan_events WHERE package_id = ? AND consumer_id = ?',
      packageId, consumerId
    );
    return row ? row.scan_count > 0 : false;
  }

  async createScanEvent({ id, packageId, consumerId, pointsAwarded, ipAddress, userAgent }) {
    execute(
      `INSERT INTO scan_events (id, package_id, consumer_id, points_awarded, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      id, packageId, consumerId, pointsAwarded, ipAddress || '127.0.0.1', userAgent || 'Client'
    );
    return queryOne('SELECT * FROM scan_events WHERE id = ?', id);
  }

  async getConsumerScanStats(consumerId) {
    const row = queryOne(
      `SELECT COUNT(DISTINCT package_id) AS unique_count, COUNT(*) AS total_scans
       FROM scan_events
       WHERE consumer_id = ?`,
      consumerId
    );
    return {
      uniquePackagesScanned: row ? row.unique_count : 0,
      totalScans: row ? row.total_scans : 0
    };
  }

  async getRecentScansByConsumer(consumerId, limit = 10) {
    return queryAll(
      `SELECT 
        se.id AS scan_id,
        se.scanned_at,
        se.points_awarded,
        p.qr_code,
        prod.name AS product_name,
        prod.image_url,
        m.brand_name AS merchant_brand_name
      FROM scan_events se
      JOIN packages p ON se.package_id = p.id
      JOIN products prod ON p.product_id = prod.id
      JOIN merchants m ON p.merchant_id = m.id
      WHERE se.consumer_id = ?
      ORDER BY se.scanned_at DESC
      LIMIT ?`,
      consumerId, limit
    );
  }

  async countTotalScans(merchantId = null) {
    if (merchantId) {
      const row = queryOne(
        `SELECT COUNT(*) AS total 
         FROM scan_events se 
         JOIN packages p ON se.package_id = p.id 
         WHERE p.merchant_id = ?`,
        merchantId
      );
      return row ? row.total : 0;
    }
    const row = queryOne('SELECT COUNT(*) AS total FROM scan_events');
    return row ? row.total : 0;
  }

  async countUniquePackagesScanned(merchantId = null) {
    if (merchantId) {
      const row = queryOne(
        `SELECT COUNT(DISTINCT p.id) AS total 
         FROM scan_events se 
         JOIN packages p ON se.package_id = p.id 
         WHERE p.merchant_id = ?`,
        merchantId
      );
      return row ? row.total : 0;
    }
    const row = queryOne('SELECT COUNT(DISTINCT package_id) AS total FROM scan_events');
    return row ? row.total : 0;
  }

  async countUniqueConsumers(merchantId = null) {
    if (merchantId) {
      const row = queryOne(
        `SELECT COUNT(DISTINCT se.consumer_id) AS total 
         FROM scan_events se 
         JOIN packages p ON se.package_id = p.id 
         WHERE p.merchant_id = ?`,
        merchantId
      );
      return row ? row.total : 0;
    }
    const row = queryOne('SELECT COUNT(DISTINCT consumer_id) AS total FROM scan_events');
    return row ? row.total : 0;
  }

  async getRecentScans(limit = 5, merchantId = null) {
    if (merchantId) {
      return queryAll(
        `SELECT 
          se.id,
          se.scanned_at,
          p.qr_code,
          prod.name AS product_name,
          m.brand_name AS merchant_name,
          c.name AS consumer_name
        FROM scan_events se
        JOIN packages p ON se.package_id = p.id
        JOIN products prod ON p.product_id = prod.id
        JOIN merchants m ON p.merchant_id = m.id
        JOIN consumers c ON se.consumer_id = c.id
        WHERE p.merchant_id = ?
        ORDER BY se.scanned_at DESC
        LIMIT ?`,
        merchantId, limit
      );
    }
    return queryAll(
      `SELECT 
        se.id,
        se.scanned_at,
        p.qr_code,
        prod.name AS product_name,
        m.brand_name AS merchant_name,
        c.name AS consumer_name
      FROM scan_events se
      JOIN packages p ON se.package_id = p.id
      JOIN products prod ON p.product_id = prod.id
      JOIN merchants m ON p.merchant_id = m.id
      JOIN consumers c ON se.consumer_id = c.id
      ORDER BY se.scanned_at DESC
      LIMIT ?`,
      limit
    );
  }

  async getClaimedPackageIds() {
    const rows = queryAll('SELECT DISTINCT package_id FROM scan_events');
    return new Set(rows.map(r => r.package_id));
  }

  async clearAll() {
    execute('DELETE FROM scan_events');
  }
}
