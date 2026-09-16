import { getSupabaseClient } from '../../db/supabase.js';

export class SupabasePackageRepository {
  getClient() {
    return getSupabaseClient();
  }

  async findByQRCode(qrCode) {
    if (!qrCode) return null;
    const client = this.getClient();

    const { data, error } = await client
      .from('packages')
      .select(`
        id,
        qr_code,
        status,
        created_at,
        products (
          id,
          name,
          category,
          size,
          image_url,
          material_name,
          material_desc,
          material_image_url,
          sustainability_info,
          co2_reduction,
          compostable_days
        ),
        batches (
          id,
          batch_number,
          production_date,
          total_quantity
        ),
        merchants (
          id,
          name,
          brand_name,
          email,
          logo_url
        )
      `)
      .ilike('qr_code', qrCode.trim())
      .maybeSingle();

    if (error || !data) return null;

    const prod = data.products || {};
    const batch = data.batches || {};
    const merchant = data.merchants || {};

    return {
      package_id: data.id,
      qr_code: data.qr_code,
      package_status: data.status,
      package_created_at: data.created_at,
      product_id: prod.id,
      product_name: prod.name,
      product_category: prod.category,
      product_size: prod.size,
      product_image_url: prod.image_url,
      material_name: prod.material_name,
      material_desc: prod.material_desc,
      material_image_url: prod.material_image_url,
      sustainability_info: prod.sustainability_info,
      co2_reduction: prod.co2_reduction,
      compostable_days: prod.compostable_days,
      batch_id: batch.id,
      batch_number: batch.batch_number,
      production_date: batch.production_date,
      batch_quantity: batch.total_quantity,
      merchant_id: merchant.id,
      merchant_name: merchant.name,
      merchant_brand_name: merchant.brand_name,
      merchant_email: merchant.email,
      merchant_logo_url: merchant.logo_url
    };
  }

  async count(merchantId = null) {
    const client = this.getClient();
    let query = client.from('packages').select('*', { count: 'exact', head: true });
    if (merchantId) query = query.eq('merchant_id', merchantId);
    const { count, error } = await query;
    return error ? 0 : (count || 0);
  }
}
