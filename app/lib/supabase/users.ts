/**
 * Supabase users utilities
 */

import { supabase } from './client';

export interface User {
  id: string;
  phone: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get all users from zo-users table
 */
export async function getAllUsers(): Promise<{ data: User[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching users:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get paginated users from zo-users table
 */
export async function getPaginatedUsers(
  page: number = 1,
  itemsPerPage: number = 20
): Promise<{ data: User[] | null; total: number; error: string | null }> {
  try {
    const from = (page - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;

    // Get total count
    const { count } = await supabase
      .from('zo-users')
      .select('*', { count: 'exact', head: true });

    // Get paginated data
    const { data, error } = await supabase
      .from('zo-users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching paginated users:', error);
      return { data: null, total: 0, error: error.message };
    }

    return { data: data || [], total: count || 0, error: null };
  } catch (error) {
    console.error('Error fetching paginated users:', error);
    return {
      data: null,
      total: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get a user by ID
 */
export async function getUserById(id: string): Promise<{ data: User | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user:', error);
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update a user
 */
export async function updateUser(
  id: string,
  updates: { name?: string; phone?: string }
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('zo-users')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('Error updating user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase
      .from('zo-users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

