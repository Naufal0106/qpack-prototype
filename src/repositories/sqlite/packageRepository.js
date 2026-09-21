import { queryOne, queryAll } from '../../db/database.js';
import { QPACK_CANONICAL_MATERIALS, sanitizeMaterialName, sanitizeMaterialDesc } from '../../constants/materials.js';

export class SQLitePackageRepository {
  async findByQRCode(qrCode) {
    if (!qrCode) return null;
    const sql = `
      SELECT 
        p.id AS package_id,
        p.qr_code,
        p.status AS package_status,
        p.created_at AS package_created_at,
        prod.id AS product_id,
        prod.name AS product_name,
        prod.category AS product_category,
        prod.size AS product_size,
        prod.image_url AS product_image_url,
        prod.material_name,
        prod.material_desc,
        prod.material_image_url,
        prod.sustainability_info,
        prod.co2_reduction,
        prod.compostable_days,
        b.id AS batch_id,
        b.batch_number,
        b.production_date,
        b.total_quantity AS batch_quantity,
        m.id AS merchant_id,
        m.name AS merchant_name,
        m.brand_name AS merchant_brand_name,
        m.email AS merchant_email,
        m.logo_url AS merchant_logo_url
      FROM packages p
      JOIN products prod ON p.product_id = prod.id
      JOIN merchants m ON p.merchant_id = m.id
      JOIN batches b ON p.batch_id = b.id
      WHERE UPPER(p.qr_code) = UPPER(?)
    `;
    const row = queryOne(sql, qrCode.trim());
    if (!row) return null;

    return {
      ...row,
      material_name: sanitizeMaterialName(row.material_name),
      material_desc: sanitizeMaterialDesc(row.material_desc),
      materials: QPACK_CANONICAL_MATERIALS
    };
  }

  async count(merchantId = null) {
    if (merchantId) {
      const row = queryOne('SELECT COUNT(*) AS count FROM packages WHERE merchant_id = ?', merchantId);
      return row ? row.count : 0;
    }
    const row = queryOne('SELECT COUNT(*) AS count FROM packages');
    return row ? row.count : 0;
  }
}
