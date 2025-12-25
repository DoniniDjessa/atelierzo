import { supabase } from './client';

export interface SatisfiedClient {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all satisfied clients
 */
export async function getAllSatisfiedClients(): Promise<{ data: SatisfiedClient[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-clients-satisfaits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching satisfied clients:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching satisfied clients:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Add a new satisfied client
 */
export async function addSatisfiedClient(
  name: string,
  image_url: string
): Promise<{ data: SatisfiedClient | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-clients-satisfaits')
      .insert([{ name, image_url }])
      .select()
      .single();

    if (error) {
      console.error('Error adding satisfied client:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error adding satisfied client:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Update a satisfied client
 */
export async function updateSatisfiedClient(
  id: string,
  updates: { name?: string; image_url?: string }
): Promise<{ data: SatisfiedClient | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-clients-satisfaits')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating satisfied client:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error: any) {
    console.error('Unexpected error updating satisfied client:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Delete a satisfied client
 */
export async function deleteSatisfiedClient(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('zo-clients-satisfaits')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting satisfied client:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Unexpected error deleting satisfied client:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

