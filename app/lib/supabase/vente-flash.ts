/**
 * Supabase utilities for vente flash
 */

import { supabase } from './client';

export interface VenteFlashProduct {
  id: string;
  vente_flash_id: string;
  product_id: string;
  discount_percentage: number;
  created_at: string;
}

export interface VenteFlash {
  id: string;
  title: string;
  description?: string;
  global_discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  products?: VenteFlashProduct[];
}

export interface CreateVenteFlashInput {
  title: string;
  description?: string;
  global_discount_percentage: number;
  start_date: string;
  end_date: string;
  is_active?: boolean;
  product_ids?: string[];
  product_discounts?: Record<string, number>; // product_id -> discount_percentage
}

/**
 * Get all active flash sales
 */
export async function getActiveVenteFlash(): Promise<{ data: VenteFlash[] | null; error: string | null }> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('zo-vente-flash')
      .select('*, products:zo-vente-flash-products(*)')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching active flash sales:', error);
      return { data: null, error: error.message };
    }

    return { data: data as unknown as VenteFlash[], error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching active flash sales:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get all flash sales (admin)
 */
export async function getAllVenteFlash(): Promise<{ data: VenteFlash[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-vente-flash')
      .select('*, products:zo-vente-flash-products(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching flash sales:', error);
      return { data: null, error: error.message };
    }

    return { data: data as unknown as VenteFlash[], error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching flash sales:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get a single flash sale by ID
 */
export async function getVenteFlashById(id: string): Promise<{ data: VenteFlash | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-vente-flash')
      .select('*, products:zo-vente-flash-products(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching flash sale:', error);
      return { data: null, error: error.message };
    }

    return { data: data as unknown as VenteFlash, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching flash sale:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Create a new flash sale
 */
export async function createVenteFlash(input: CreateVenteFlashInput): Promise<{ data: VenteFlash | null; error: string | null }> {
  try {
    // Create flash sale
    const { data: venteFlash, error: venteFlashError } = await supabase
      .from('zo-vente-flash')
      .insert({
        title: input.title,
        description: input.description,
        global_discount_percentage: input.global_discount_percentage,
        start_date: input.start_date,
        end_date: input.end_date,
        is_active: input.is_active ?? true,
      })
      .select()
      .single();

    if (venteFlashError || !venteFlash) {
      console.error('Error creating flash sale:', venteFlashError);
      return { data: null, error: venteFlashError?.message || 'Failed to create flash sale' };
    }

    // Add products if provided
    if (input.product_ids && input.product_ids.length > 0) {
      const productsToInsert = input.product_ids.map((productId) => ({
        vente_flash_id: venteFlash.id,
        product_id: productId,
        discount_percentage: input.product_discounts?.[productId] || input.global_discount_percentage,
      }));

      const { error: productsError } = await supabase.from('zo-vente-flash-products').insert(productsToInsert);

      if (productsError) {
        console.error('Error adding products to flash sale:', productsError);
        // Rollback flash sale creation
        await supabase.from('zo-vente-flash').delete().eq('id', venteFlash.id);
        return { data: null, error: productsError.message };
      }
    }

    // Fetch flash sale with products
    const result = await getVenteFlashById(venteFlash.id);
    return result;
  } catch (error: any) {
    console.error('Unexpected error creating flash sale:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Update a flash sale
 */
export async function updateVenteFlash(
  id: string,
  updates: Partial<CreateVenteFlashInput>
): Promise<{ data: VenteFlash | null; error: string | null }> {
  try {
    // Update flash sale
    const { error: updateError } = await supabase
      .from('zo-vente-flash')
      .update({
        title: updates.title,
        description: updates.description,
        global_discount_percentage: updates.global_discount_percentage,
        start_date: updates.start_date,
        end_date: updates.end_date,
        is_active: updates.is_active,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating flash sale:', updateError);
      return { data: null, error: updateError.message };
    }

    // Update products if provided
    if (updates.product_ids !== undefined) {
      // Delete existing products
      await supabase.from('zo-vente-flash-products').delete().eq('vente_flash_id', id);

      // Insert new products
      if (updates.product_ids.length > 0) {
        const productsToInsert = updates.product_ids.map((productId) => ({
          vente_flash_id: id,
          product_id: productId,
          discount_percentage: updates.product_discounts?.[productId] || updates.global_discount_percentage || 0,
        }));

        const { error: productsError } = await supabase.from('zo-vente-flash-products').insert(productsToInsert);

        if (productsError) {
          console.error('Error updating products:', productsError);
          return { data: null, error: productsError.message };
        }
      }
    }

    // Fetch updated flash sale
    return await getVenteFlashById(id);
  } catch (error: any) {
    console.error('Unexpected error updating flash sale:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Delete a flash sale
 */
export async function deleteVenteFlash(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('zo-vente-flash').delete().eq('id', id);

    if (error) {
      console.error('Error deleting flash sale:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Unexpected error deleting flash sale:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Add a product to a flash sale
 */
export async function addProductToVenteFlash(
  venteFlashId: string,
  productId: string,
  discountPercentage: number
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.from('zo-vente-flash-products').upsert(
      {
        vente_flash_id: venteFlashId,
        product_id: productId,
        discount_percentage: discountPercentage,
      },
      {
        onConflict: 'vente_flash_id,product_id',
      }
    );

    if (error) {
      console.error('Error adding product to flash sale:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Unexpected error adding product to flash sale:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Remove a product from a flash sale
 */
export async function removeProductFromVenteFlash(
  venteFlashId: string,
  productId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('zo-vente-flash-products')
      .delete()
      .eq('vente_flash_id', venteFlashId)
      .eq('product_id', productId);

    if (error) {
      console.error('Error removing product from flash sale:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Unexpected error removing product from flash sale:', error);
    return { success: false, error: error.message || 'Unknown error' };
  }
}

/**
 * Calculate discounted price for a product in a flash sale
 */
export function calculateFlashSalePrice(originalPrice: number, discountPercentage: number): number {
  return Math.round(originalPrice * (1 - discountPercentage / 100));
}

