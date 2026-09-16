import { getSupabaseClient } from '../../db/supabase.js';

export class SupabaseMerchantRepository {
  getClient() {
    return getSupabaseClient();
  }

  async findById(id) {
    if (!id) return null;
    const client = this.getClient();
    const { data, error } = await client
      .from('merchants')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async findAll() {
    const client = this.getClient();
    const { data, error } = await client
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data;
  }
}
