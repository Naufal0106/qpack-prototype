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

  async findByEmail(email) {
    if (!email) return null;
    const client = this.getClient();
    const { data, error } = await client
      .from('merchants')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async createMerchant({ id, name, brand_name, email, passwordHash = null, logo_url = '/assets/icons/merchant-icon2.svg' }) {
    const client = this.getClient();
    const payload = {
      id,
      name,
      brand_name,
      email: email.trim(),
      logo_url
    };
    if (passwordHash) {
      payload.password_hash = passwordHash;
    }

    let { data, error } = await client
      .from('merchants')
      .insert(payload)
      .select()
      .single();

    if (error && payload.password_hash && error.message?.includes('password_hash')) {
      delete payload.password_hash;
      const retry = await client
        .from('merchants')
        .insert(payload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(`Failed to create merchant: ${error.message}`);
    }

    return data || payload;
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
