import { getSupabaseClient } from './supabase.js';

export async function seedSupabase() {
  const supabase = getSupabaseClient();
  console.log('[Supabase] Seeding production database...');

  // 1. Clean existing records
  await supabase.from('scan_events').delete().neq('id', '___');
  await supabase.from('packages').delete().neq('id', '___');
  await supabase.from('batches').delete().neq('id', '___');
  await supabase.from('products').delete().neq('id', '___');
  await supabase.from('merchants').delete().neq('id', '___');
  await supabase.from('consumers').delete().neq('id', '___');

  // 2. Merchants
  const { error: merchErr } = await supabase.from('merchants').insert([
    {
      id: 'm_ecofashion',
      name: 'PT Eco Busana Indonesia',
      brand_name: 'EcoFashion ID',
      email: 'sustainability@ecofashion.id',
      logo_url: '/assets/icons/merchant-icon2.svg'
    },
    {
      id: 'm_bumiorganic',
      name: 'Bumi Organics Nusantara',
      brand_name: 'Bumi Organics',
      email: 'hello@bumiorganics.com',
      logo_url: '/assets/icons/green-leaf-icon.svg'
    },
    {
      id: 'm_nusantara',
      name: 'Nusantara Artisan Coffee',
      brand_name: 'Nusantara Coffee',
      email: 'csr@nusantaracoffee.co.id',
      logo_url: '/assets/icons/green-product-icon.svg'
    }
  ]);
  if (merchErr) throw merchErr;

  // 3. Products
  const { error: prodErr } = await supabase.from('products').insert([
    {
      id: 'prod_cassava_m',
      merchant_id: 'm_ecofashion',
      name: 'Q-Pack Cassava Mailer (Size M)',
      category: 'Apparel & Fashion',
      size: '25 x 35 cm',
      image_url: '/assets/images/contoh-gambar-produk.png',
      material_name: 'Pati Singkong Nabati (Cassava Starch & Bio-resin)',
      material_desc: 'Diproduksi dari limbah kulit singkong dan pati tapioka lokal. Fleksibel, tahan air hujan, dan memiliki ketahanan sobek tinggi.',
      material_image_url: '/assets/images/bahan-baku-kulit-singkong.png',
      sustainability_info: '100% Biodegradable dalam 180 hari di tanah alami. Mengurangi jejak emisi karbon hingga 65% dibandingkan kantong plastik PE.',
      co2_reduction: '-65% Emisi CO2',
      compostable_days: 180
    },
    {
      id: 'prod_chitosan_l',
      merchant_id: 'm_bumiorganic',
      name: 'Q-Pack Marine Chitosan Mailer (Size L)',
      category: 'Skincare & Personal Care',
      size: '30 x 40 cm',
      image_url: '/assets/images/Prototype Polymailer.png',
      material_name: 'Chitosan Sisik Ikan & Ekstrak Alga Cokelat',
      material_desc: 'Memanfaatkan sampingan sisik ikan dari industri perikanan pesisir Jawa. Memiliki sifat antibakteri alami dan larut air panas 80°C.',
      material_image_url: '/assets/images/sisik-ikan.png',
      sustainability_info: 'Terurai sempurna dalam 90 hari di tanah tanpa meninggalkan mikroplastik atau racun. Aman bagi organisme tanah dan laut.',
      co2_reduction: '-72% Emisi CO2',
      compostable_days: 90
    },
    {
      id: 'prod_cornbamboo_s',
      merchant_id: 'm_nusantara',
      name: 'Q-Pack Corn & Bamboo Courier Pouch (Size S)',
      category: 'Specialty Food & Beverages',
      size: '18 x 25 cm',
      image_url: '/assets/images/contoh-gambar-produk.png',
      material_name: 'Pati Jagung & Serat Bambu Mikro',
      material_desc: 'Kombinasi serat bambu yang cepat dipanen secara lestari dan pati jagung alami. Struktur kuat untuk menahan beban hingga 4 kg.',
      material_image_url: '/assets/images/bahan-baku-kulit-singkong.png',
      sustainability_info: 'Sertifikasi TUV Home Compostable. Menjadi kompos nutrisi bagi tanaman dalam 120 hari saat ditanam di pekarangan rumah.',
      co2_reduction: '-58% Emisi CO2',
      compostable_days: 120
    }
  ]);
  if (prodErr) throw prodErr;

  // 4. Batches
  const { error: batchErr } = await supabase.from('batches').insert([
    { id: 'batch_001', batch_number: 'BATCH-2026-03-A', product_id: 'prod_cassava_m', production_date: '2026-03-01', total_quantity: 1000 },
    { id: 'batch_002', batch_number: 'BATCH-2026-03-B', product_id: 'prod_chitosan_l', production_date: '2026-03-05', total_quantity: 1500 },
    { id: 'batch_003', batch_number: 'BATCH-2026-03-C', product_id: 'prod_cornbamboo_s', production_date: '2026-03-10', total_quantity: 800 }
  ]);
  if (batchErr) throw batchErr;

  // 5. Packages: Canonical and Aliases
  const { error: pkgErr } = await supabase.from('packages').insert([
    { id: 'pkg_qp_001', qr_code: 'QP-2027-000001', product_id: 'prod_cassava_m', merchant_id: 'm_ecofashion', batch_id: 'batch_001', status: 'active' },
    { id: 'pkg_qp_002', qr_code: 'QP-2027-000002', product_id: 'prod_chitosan_l', merchant_id: 'm_bumiorganic', batch_id: 'batch_002', status: 'active' },
    { id: 'pkg_qp_003', qr_code: 'QP-2027-000003', product_id: 'prod_cornbamboo_s', merchant_id: 'm_nusantara', batch_id: 'batch_003', status: 'active' },
    { id: 'pkg_demo_001', qr_code: 'QR-DEMO-001', product_id: 'prod_cassava_m', merchant_id: 'm_ecofashion', batch_id: 'batch_001', status: 'active' },
    { id: 'pkg_demo_002', qr_code: 'QR-DEMO-002', product_id: 'prod_chitosan_l', merchant_id: 'm_bumiorganic', batch_id: 'batch_002', status: 'active' },
    { id: 'pkg_demo_003', qr_code: 'QR-DEMO-003', product_id: 'prod_cornbamboo_s', merchant_id: 'm_nusantara', batch_id: 'batch_003', status: 'active' }
  ]);
  if (pkgErr) throw pkgErr;

  // 6. Consumer
  const { error: consErr } = await supabase.from('consumers').insert([
    { id: 'cons_demo_001', name: 'Budi Santoso', email: 'budi.santoso@qpack.id', points: 0 }
  ]);
  if (consErr) throw consErr;

  console.log('✅ Supabase production database seeded successfully!');
}

if (process.argv[1] && process.argv[1].endsWith('supabase-seed.js')) {
  seedSupabase().catch(err => {
    console.error('❌ Seeding Supabase failed:', err.message);
    process.exit(1);
  });
}
