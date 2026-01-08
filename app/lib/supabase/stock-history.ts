/**
 * Stock History Management
 * Functions for tracking stock additions and verification settings
 */

import { supabase } from './client';

// Types
export interface StockHistoryEntry {
  id: string;
  product_id: string;
  product_title: string;
  added_stock: Record<string, number>; // { "M": 10, "L": 15, ... }
  total_added: number;
  admin_user?: string;
  created_at: string;
}

export interface VerificationSettings {
  id: string;
  setting_key: string;
  setting_value: string;
  updated_at: string;
  updated_by?: string;
}

/**
 * Add a stock history entry
 */
export async function addStockHistory(entry: {
  product_id: string;
  product_title: string;
  added_stock: Record<string, number>;
  total_added: number;
  admin_user?: string;
}): Promise<{ data: StockHistoryEntry | null; error: any }> {
  const { data, error } = await supabase
    .from('zo-stock-history')
    .insert([entry])
    .select()
    .single();

  return { data, error };
}

/**
 * Get stock history for a specific product
 */
export async function getProductStockHistory(
  productId: string
): Promise<{ data: StockHistoryEntry[] | null; error: any }> {
  const { data, error } = await supabase
    .from('zo-stock-history')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });

  return { data, error };
}

/**
 * Get all stock history with optional date range filter
 */
export async function getAllStockHistory(
  startDate?: string,
  endDate?: string
): Promise<{ data: StockHistoryEntry[] | null; error: any }> {
  let query = supabase
    .from('zo-stock-history')
    .select('*')
    .order('created_at', { ascending: false });

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    query = query.lte('created_at', endDate);
  }

  const { data, error } = await query;
  return { data, error };
}

/**
 * Get the current reference date for verification
 */
export async function getVerificationReferenceDate(): Promise<{
  data: string | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from('zo-verification-settings')
    .select('setting_value')
    .eq('setting_key', 'reference_date')
    .single();

  return { data: data?.setting_value || null, error };
}

/**
 * Update the reference date for verification
 */
export async function updateVerificationReferenceDate(
  newDate: string,
  updatedBy?: string
): Promise<{ data: VerificationSettings | null; error: any }> {
  const { data, error } = await supabase
    .from('zo-verification-settings')
    .update({
      setting_value: newDate,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy || 'admin',
    })
    .eq('setting_key', 'reference_date')
    .select()
    .single();

  return { data, error };
}
