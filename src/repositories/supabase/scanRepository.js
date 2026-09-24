import { getSupabaseClient } from '../../db/supabase.js';

export class SupabaseScanRepository {
  getClient() {
    return getSupabaseClient();
  }

  async hasConsumerScannedPackage(packageId, consumerId) {
    const client = this.getClient();
    const { count, error } = await client
      .from('scan_events')
      .select('*', { count: 'exact', head: true })
      .eq('package_id', packageId)
      .eq('consumer_id', consumerId);

    return error ? false : (count || 0) > 0;
  }

  async createScanEvent({ id, packageId, consumerId, pointsAwarded, ipAddress, userAgent }) {
    const client = this.getClient();
    const { data, error } = await client
      .from('scan_events')
      .insert({
        id,
        package_id: packageId,
        consumer_id: consumerId,
        points_awarded: pointsAwarded,
        ip_address: ipAddress || '127.0.0.1',
        user_agent: userAgent || 'Client'
      })
      .select()
      .single();

    if (error) {
      console.error('[SupabaseScanRepository] insert error:', error);
    }
    return data;
  }

  async getConsumerScanStats(consumerId) {
    const client = this.getClient();
    const { data, error } = await client
      .from('scan_events')
      .select('package_id')
      .eq('consumer_id', consumerId);

    if (error || !data) {
      return { uniquePackagesScanned: 0, totalScans: 0 };
    }

    const uniqueSet = new Set(data.map(d => d.package_id));
    return {
      uniquePackagesScanned: uniqueSet.size,
      totalScans: data.length
    };
  }

  async getRecentScansByConsumer(consumerId, limit = 10) {
    const client = this.getClient();
    const { data, error } = await client
      .from('scan_events')
      .select(`
        id,
        scanned_at,
        points_awarded,
        packages (
          qr_code,
          products (
            name,
            image_url
          ),
          merchants (
            brand_name
          )
        )
      `)
      .eq('consumer_id', consumerId)
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(item => {
      const pkg = item.packages || {};
      const prod = pkg.products || {};
      const merch = pkg.merchants || {};
      return {
        scan_id: item.id,
        scanned_at: item.scanned_at,
        points_awarded: item.points_awarded,
        qr_code: pkg.qr_code || '',
        product_name: prod.name || '',
        image_url: prod.image_url || '',
        merchant_brand_name: merch.brand_name || ''
      };
    });
  }

  async countTotalScans(merchantId = null) {
    const client = this.getClient();
    if (merchantId) {
      const { data } = await client
        .from('scan_events')
        .select('id, packages!inner(merchant_id)')
        .eq('packages.merchant_id', merchantId);
      return data ? data.length : 0;
    }
    const { count, error } = await client
      .from('scan_events')
      .select('*', { count: 'exact', head: true });
    return error ? 0 : (count || 0);
  }

  async countUniquePackagesScanned(merchantId = null) {
    const client = this.getClient();
    let query = client.from('scan_events').select('package_id, packages!inner(merchant_id)');
    if (merchantId) {
      query = query.eq('packages.merchant_id', merchantId);
    }
    const { data } = await query;
    if (!data) return 0;
    const uniquePkgs = new Set(data.map(d => d.package_id));
    return uniquePkgs.size;
  }

  async countUniqueConsumers(merchantId = null) {
    const client = this.getClient();
    let query = client.from('scan_events').select('consumer_id, packages!inner(merchant_id)');
    if (merchantId) {
      query = query.eq('packages.merchant_id', merchantId);
    }
    const { data } = await query;
    if (!data) return 0;
    const uniqueCons = new Set(data.map(d => d.consumer_id));
    return uniqueCons.size;
  }

  async getRecentScans(limit = 5, merchantId = null) {
    const client = this.getClient();
    let query = client
      .from('scan_events')
      .select(`
        id,
        scanned_at,
        packages!inner (
          qr_code,
          merchant_id,
          products ( name ),
          merchants ( brand_name )
        ),
        consumers ( name )
      `)
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (merchantId) {
      query = query.eq('packages.merchant_id', merchantId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(item => {
      const pkg = item.packages || {};
      const prod = pkg.products || {};
      const merch = pkg.merchants || {};
      const cons = item.consumers || {};
      return {
        id: item.id,
        scanned_at: item.scanned_at,
        qr_code: pkg.qr_code || '',
        product_name: prod.name || '',
        merchant_name: merch.brand_name || '',
        consumer_name: cons.name || 'Konsumen'
      };
    });
  }

  async getClaimedPackageIds() {
    const client = this.getClient();
    const { data, error } = await client.from('scan_events').select('package_id');
    if (error || !data) return new Set();
    return new Set(data.map(r => r.package_id));
  }

  async clearAll() {
    const client = this.getClient();
    await client.from('scan_events').delete().neq('id', '___');
  }
}
