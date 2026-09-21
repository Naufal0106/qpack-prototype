-- ==========================================
-- Q-PACK MIGRATION: 01_update_materials.sql
-- Description: Standardize Q-Pack product materials to the two natural waste-based sources:
-- 1. Kulit Singkong (Cassava peel waste) -> cellulose/nanocellulose reinforcement
-- 2. Sisik Ikan (Fish scale waste) -> chitosan component
-- Removes all unsupported algae / seaweed references.
-- Idempotent: safe to run multiple times without data loss.
-- ==========================================

UPDATE products
SET material_name = 'Pati Singkong Nabati & Kitosan Sisik Ikan',
    material_desc = 'Kombinasi limbah kulit singkong sebagai penguat selulosa dan sisik ikan sebagai komponen kitosan biopolimer. Fleksibel, tahan air hujan, dan memiliki ketahanan sobek tinggi.',
    material_image_url = '/assets/images/bahan-baku-kulit-singkong.png'
WHERE id = 'prod_cassava_m';

UPDATE products
SET material_name = 'Chitosan Sisik Ikan & Selulosa Kulit Singkong',
    material_desc = 'Memanfaatkan sampingan sisik ikan dari industri perikanan pesisir dan selulosa limbah kulit singkong. Memiliki sifat antibakteri alami dan terurai ramah lingkungan.',
    material_image_url = '/assets/images/sisik-ikan.png'
WHERE id = 'prod_chitosan_l';

UPDATE products
SET name = 'Q-Pack Circular Courier Pouch (Size S)',
    material_name = 'Selulosa Kulit Singkong & Kitosan Sisik Ikan',
    material_desc = 'Kombinasi limbah kulit singkong dan sisik ikan lokal. Struktur kuat dan fleksibel untuk menahan beban hingga 4 kg.',
    material_image_url = '/assets/images/contoh-gambar-produk.png'
WHERE id = 'prod_cornbamboo_s';
