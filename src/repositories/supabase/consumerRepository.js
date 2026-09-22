import { getSupabaseClient } from '../../db/supabase.js';

export class SupabaseConsumerRepository {
  getClient() {
    return getSupabaseClient();
  }

  async findById(id) {
    if (!id) return null;
    const client = this.getClient();
    const { data, error } = await client
      .from('consumers')
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
      .from('consumers')
      .select('*')
      .ilike('email', email.trim())
      .maybeSingle();

    if (error || !data) return null;
    return data;
  }

  async createConsumer({ id, name, email, passwordHash = null, points = 0 }) {
    const client = this.getClient();
    const payload = {
      id,
      name,
      email: email.trim(),
      points
    };
    if (passwordHash) {
      payload.password_hash = passwordHash;
    }

    let { data, error } = await client
      .from('consumers')
      .insert(payload)
      .select()
      .single();

    if (error && payload.password_hash && error.message?.includes('password_hash')) {
      delete payload.password_hash;
      const retry = await client
        .from('consumers')
        .insert(payload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      throw new Error(`Failed to create consumer: ${error.message}`);
    }

    return data || payload;
  }

  async findOrCreate(id, defaultData = {}) {
    let consumer = await this.findById(id);
    if (!consumer) {
      const client = this.getClient();
      const newConsumer = {
        id,
        name: defaultData.name || 'Budi Santoso',
        email: defaultData.email || `${id}@qpack.id`,
        points: defaultData.points || 0
      };

      const { data, error } = await client
        .from('consumers')
        .insert(newConsumer)
        .select()
        .single();

      if (!error && data) {
        consumer = data;
      } else {
        consumer = newConsumer;
      }
    }
    return consumer;
  }

  async addPoints(id, pointsToAdd) {
    const client = this.getClient();
    const consumer = await this.findById(id);
    const newPoints = (consumer?.points || 0) + pointsToAdd;

    const { data } = await client
      .from('consumers')
      .update({ points: newPoints })
      .eq('id', id)
      .select()
      .single();

    return data || { ...consumer, points: newPoints };
  }

  async resetAllPoints() {
    const client = this.getClient();
    await client
      .from('consumers')
      .update({ points: 0 })
      .neq('id', '___'); // update all
  }
}
