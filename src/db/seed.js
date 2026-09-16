import { db, initDatabase } from './database.js';

export function seedDatabase() {
  initDatabase();

  // Clear existing data for a clean slate
  db.exec(`
    DELETE FROM scan_events;
    DELETE FROM packages;
    DELETE FROM batches;
    DELETE FROM products;
    DELETE FROM merchants;
    DELETE FROM consumers;
  `);

  console.log('Clearing old records...');

  // 1. Seed Merchants
  const insertMerchant = db.prepare(`
    INSERT INTO merchants (id, name, brand_name, email, logo_url)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertMerchant.run(
    'm_ecofashion',
    'PT Eco Busana Indonesia',
    'EcoFashion ID',
    'sustainability@ecofashion.id',
    '/assets/icons/merchant-icon2.svg'
  );

  insertMerchant.run(
    'm_bumiorganic',
    'Bumi Organics Nusantara',
    'Bumi Organics',
    'hello@bumiorganics.com',
    '/assets/icons/green-leaf-icon.svg'
  );

  insertMerchant.run(
    'm_nusantara',
    'Nusantara Artisan Coffee',
    'Nusantara Coffee',
    'csr@nusantaracoffee.co.id',
    '/assets/icons/green-product-icon.svg'
  );

  // 2. Seed Products
  const insertProduct = db.prepare(`
    INSERT INTO products (
      id, merchant_id, name, category, size, image_url,
      material_name, material_desc, material_image_url,
      sustainability_info, co2_reduction, compostable_days
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProduct.run(
    'prod_cassava_m',
    'm_ecofashion',
    'Q-Pack Cassava Mailer (Size M)',
    'Apparel & Fashion',
    '25 x 35 cm',
    '/assets/images/contoh-gambar-produk.png',
    'Pati Singkong Nabati (Cassava Starch & Bio-resin)',
    'Diproduksi dari limbah kulit singkong dan pati tapioka lokal. Fleksibel, tahan air hujan, dan memiliki ketahanan sobek tinggi.',
    '/assets/images/bahan-baku-kulit-singkong.png',
    '100% Biodegradable dalam 180 hari di tanah alami. Mengurangi jejak emisi karbon hingga 65% dibandingkan kantong plastik PE.',
    '-65% Emisi CO2',
    180
  );

  insertProduct.run(
    'prod_chitosan_l',
    'm_bumiorganic',
    'Q-Pack Marine Chitosan Mailer (Size L)',
    'Skincare & Personal Care',
    '30 x 40 cm',
    '/assets/images/Prototype Polymailer.png',
    'Chitosan Sisik Ikan & Ekstrak Alga Cokelat',
    'Memanfaatkan sampingan sisik ikan dari industri perikanan pesisir Jawa. Memiliki sifat antibakteri alami dan larut air panas 80°C.',
    '/assets/images/sisik-ikan.png',
    'Terurai sempurna dalam 90 hari di tanah tanpa meninggalkan mikroplastik atau racun. Aman bagi organisme tanah dan laut.',
    '-72% Emisi CO2',
    90
  );

  insertProduct.run(
    'prod_cornbamboo_s',
    'm_nusantara',
    'Q-Pack Corn & Bamboo Courier Pouch (Size S)',
    'Specialty Food & Beverages',
    '18 x 25 cm',
    '/assets/images/contoh-gambar-produk.png',
    'Pati Jagung & Serat Bambu Mikro',
    'Kombinasi serat bambu yang cepat dipanen secara lestari dan pati jagung alami. Struktur kuat untuk menahan beban hingga 4 kg.',
    '/assets/images/bahan-baku-kulit-singkong.png',
    'Sertifikasi TUV Home Compostable. Menjadi kompos nutrisi bagi tanaman dalam 120 hari saat ditanam di pekarangan rumah.',
    '-58% Emisi CO2',
    120
  );

  // 3. Seed Batches
  const insertBatch = db.prepare(`
    INSERT INTO batches (id, batch_number, product_id, production_date, total_quantity)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertBatch.run('batch_001', 'BATCH-2026-03-A', 'prod_cassava_m', '2026-03-01', 1000);
  insertBatch.run('batch_002', 'BATCH-2026-03-B', 'prod_chitosan_l', '2026-03-05', 1500);
  insertBatch.run('batch_003', 'BATCH-2026-03-C', 'prod_cornbamboo_s', '2026-03-10', 800);

  // 4. Seed Packages: Canonical format QP-2027-xxxxxx & Aliases QR-DEMO-xxx
  const insertPackage = db.prepare(`
    INSERT INTO packages (id, qr_code, product_id, merchant_id, batch_id, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // Canonical QP-2027 identifiers
  insertPackage.run('pkg_qp_001', 'QP-2027-000001', 'prod_cassava_m', 'm_ecofashion', 'batch_001', 'active');
  insertPackage.run('pkg_qp_002', 'QP-2027-000002', 'prod_chitosan_l', 'm_bumiorganic', 'batch_002', 'active');
  insertPackage.run('pkg_qp_003', 'QP-2027-000003', 'prod_cornbamboo_s', 'm_nusantara', 'batch_003', 'active');

  // Backward-compatible QR-DEMO aliases
  insertPackage.run('pkg_demo_001', 'QR-DEMO-001', 'prod_cassava_m', 'm_ecofashion', 'batch_001', 'active');
  insertPackage.run('pkg_demo_002', 'QR-DEMO-002', 'prod_chitosan_l', 'm_bumiorganic', 'batch_002', 'active');
  insertPackage.run('pkg_demo_003', 'QR-DEMO-003', 'prod_cornbamboo_s', 'm_nusantara', 'batch_003', 'active');

  // 5. Seed Default Consumer
  const insertConsumer = db.prepare(`
    INSERT INTO consumers (id, name, email, points)
    VALUES (?, ?, ?, ?)
  `);

  insertConsumer.run(
    'cons_demo_001',
    'Budi Santoso',
    'budi.santoso@qpack.id',
    0
  );

  console.log('Seeding completed successfully:');
  console.log('- 3 Merchants seeded');
  console.log('- 3 Products seeded');
  console.log('- 3 Batches seeded');
  console.log('- Canonical Packages: QP-2027-000001, QP-2027-000002, QP-2027-000003');
  console.log('- Legacy Aliases: QR-DEMO-001, QR-DEMO-002, QR-DEMO-003');
  console.log('- 1 Demo Consumer seeded (cons_demo_001)');
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}
