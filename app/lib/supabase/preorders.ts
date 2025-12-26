import { supabase } from './client';

export interface Preorder {
  id: string;
  user_id: string;
  product_id: string;
  size: string;
  quantity: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'fulfilled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePreorderInput {
  user_id: string;
  product_id: string;
  size: string;
  quantity: number;
  notes?: string;
}

/**
 * Create a new preorder
 * NOTE: Preorders do NOT affect product quantities in the database
 */
export async function createPreorder(input: CreatePreorderInput): Promise<{ data: Preorder | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-preorders')
      .insert({
        user_id: input.user_id,
        product_id: input.product_id,
        size: input.size,
        quantity: input.quantity,
        notes: input.notes || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating preorder:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Preorder, error: null };
  } catch (error: any) {
    console.error('Unexpected error creating preorder:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get all preorders for a user
 */
export async function getUserPreorders(userId: string): Promise<{ data: Preorder[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-preorders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user preorders:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Preorder[], error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching user preorders:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get all preorders (admin)
 */
export async function getAllPreorders(): Promise<{ data: Preorder[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-preorders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all preorders:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Preorder[], error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching all preorders:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get a single preorder by ID
 */
export async function getPreorderById(preorderId: string): Promise<{ data: Preorder | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-preorders')
      .select('*')
      .eq('id', preorderId)
      .single();

    if (error) {
      console.error('Error fetching preorder by ID:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Preorder, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching preorder by ID:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Update preorder status
 */
export async function updatePreorderStatus(
  preorderId: string,
  status: Preorder['status']
): Promise<{ data: Preorder | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-preorders')
      .update({ status })
      .eq('id', preorderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating preorder status:', error);
      return { data: null, error: error.message };
    }

    return { data: data as Preorder, error: null };
  } catch (error: any) {
    console.error('Unexpected error updating preorder status:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Delete a preorder
 */
export async function deletePreorder(preorderId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('zo-preorders')
      .delete()
      .eq('id', preorderId);

    if (error) {
      console.error('Error deleting preorder:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Unexpected error deleting preorder:', error);
    return { error: error.message || 'Unknown error' };
  }
}

