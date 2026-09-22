-- ==========================================
-- Q-PACK SUPABASE PRODUCTION SEED DATA
-- ==========================================

-- Clean tables before seeding (in correct reverse foreign key dependency order)
DELETE FROM return_verifications;
DELETE FROM returns;
DELETE FROM bank_sampah;
DELETE FROM scan_events;
DELETE FROM packages;
DELETE FROM batches;
DELETE FROM products;
DELETE FROM merchants;
DELETE FROM consumers;

-- 1. Merchants
INSERT INTO merchants (id, name, brand_name, email, logo_url) VALUES
('m_ecofashion', 'PT Eco Busana Indonesia', 'EcoFashion ID', 'sustainability@ecofashion.id', '/assets/icons/merchant-icon2.svg'),
('m_bumiorganic', 'Bumi Organics Nusantara', 'Bumi Organics', 'hello@bumiorganics.com', '/assets/icons/green-leaf-icon.svg'),
('m_nusantara', 'Nusantara Artisan Coffee', 'Nusantara Coffee', 'csr@nusantaracoffee.co.id', '/assets/icons/green-product-icon.svg');

-- 2. Products
INSERT INTO products (
  id, merchant_id, name, category, size, image_url,
  material_name, material_desc, material_image_url,
  sustainability_info, co2_reduction, compostable_days
) VALUES
(
  'prod_cassava_m',
  'm_ecofashion',
  'Q-Pack Cassava Mailer (Size M)',
  'Apparel & Fashion',
  '25 x 35 cm',
  '/assets/images/contoh-gambar-produk.png',
  'Pati Singkong Nabati (Cassava Starch & Bio-resin)',
  'Diproduksi dari limbah kulit singkong dan pati tapioka lokal. Fleksibel, tahan air hujan, dan memiliki ketahanan sobek tinggi.',
  '/assets/images/bahan-baku-kulit-singkong.png',
  '100% Biodegradable dalam 180 hari di tanah alami. Diproduksi dari pemanfaatan limbah kulit singkong dan sisik ikan secara sirkular.',
  null,
  180
),
(
  'prod_chitosan_l',
  'm_bumiorganic',
  'Q-Pack Marine Chitosan Mailer (Size L)',
  'Skincare & Personal Care',
  '30 x 40 cm',
  '/assets/images/Prototype Polymailer.png',
  'Chitosan Sisik Ikan & Selulosa Kulit Singkong',
  'Memanfaatkan sampingan sisik ikan dari industri perikanan pesisir dan selulosa limbah kulit singkong. Memiliki sifat antibakteri alami dan terurai ramah lingkungan.',
  '/assets/images/sisik-ikan.png',
  'Terurai sempurna dalam 90 hari di tanah tanpa meninggalkan mikroplastik atau racun. Aman bagi organisme tanah dan laut.',
  null,
  90
),
(
  'prod_cornbamboo_s',
  'm_nusantara',
  'Q-Pack Circular Courier Pouch (Size S)',
  'Specialty Food & Beverages',
  '18 x 25 cm',
  '/assets/images/contoh-gambar-produk.png',
  'Selulosa Kulit Singkong & Kitosan Sisik Ikan',
  'Kombinasi limbah kulit singkong dan sisik ikan lokal. Struktur kuat dan fleksibel untuk menahan beban hingga 4 kg.',
  '/assets/images/bahan-baku-kulit-singkong.png',
  'Sertifikasi TUV Home Compostable. Menjadi kompos nutrisi bagi tanaman dalam 120 hari saat ditanam di pekarangan rumah.',
  null,
  120
);

-- 3. Batches
INSERT INTO batches (id, batch_number, product_id, production_date, total_quantity) VALUES
('batch_001', 'BATCH-2026-03-A', 'prod_cassava_m', '2026-03-01', 1000),
('batch_002', 'BATCH-2026-03-B', 'prod_chitosan_l', '2026-03-05', 1500),
('batch_003', 'BATCH-2026-03-C', 'prod_cornbamboo_s', '2026-03-10', 800);

-- 4. Packages: Canonical QP-2027 Identifiers & Legacy Aliases
INSERT INTO packages (id, qr_code, product_id, merchant_id, batch_id, status) VALUES
-- Canonical
('pkg_qp_001', 'QP-2027-000001', 'prod_cassava_m', 'm_ecofashion', 'batch_001', 'active'),
('pkg_qp_002', 'QP-2027-000002', 'prod_chitosan_l', 'm_bumiorganic', 'batch_002', 'active'),
('pkg_qp_003', 'QP-2027-000003', 'prod_cornbamboo_s', 'm_nusantara', 'batch_003', 'active'),
-- Aliases
('pkg_demo_001', 'QR-DEMO-001', 'prod_cassava_m', 'm_ecofashion', 'batch_001', 'active'),
('pkg_demo_002', 'QR-DEMO-002', 'prod_chitosan_l', 'm_bumiorganic', 'batch_002', 'active'),
('pkg_demo_003', 'QR-DEMO-003', 'prod_cornbamboo_s', 'm_nusantara', 'batch_003', 'active');

-- 5. Demo Consumer
INSERT INTO consumers (id, name, email, points) VALUES
('cons_demo_001', 'Budi Santoso', 'budi.santoso@qpack.id', 0);
