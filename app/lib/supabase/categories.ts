/**
 * Product categories and sub-categories (table zo-categories, see categories-hero-migration.sql).
 * Products reference them by slug: "zo-products".category (category) and .subcategory (sub-category).
 */

import { supabase } from './client';

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  show_on_home: boolean;
  home_limit: number;
  created_at?: string;
  updated_at?: string;
}

export type CategoryPayload = Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>;

// Used until the migration has been run (same values as the migration seeds)
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'default-bermuda', slug: 'bermuda', name: 'T-SHIRTS OVERSIZES IMPRIMES', description: 'Découvrez nos ensembles élégants pour un style décontracté et moderne', parent_id: null, sort_order: 1, is_active: true, show_on_home: true, home_limit: 4 },
  { id: 'default-tshirt-oversize-civ', slug: 'tshirt-oversize-civ', name: "Tshirt Oversize CIV Champions d'Afrique", description: 'Célébrez la victoire avec style', parent_id: null, sort_order: 2, is_active: true, show_on_home: true, home_limit: 12 },
  { id: 'default-pantalon', slug: 'pantalon', name: 'Chemise Pantalon', description: null, parent_id: null, sort_order: 3, is_active: true, show_on_home: true, home_limit: 4 },
];

const TABLE = 'zo-categories';

/** All categories and sub-categories, ordered. `fromDatabase` is false when the table is missing. */
export async function getAllCategories(): Promise<{ data: Category[]; fromDatabase: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      // PGRST205 = table not created yet (migration not run): the built-in list is used
      (error.code === 'PGRST205' ? console.warn : console.error)('Error fetching categories:', error);
      return { data: DEFAULT_CATEGORIES, fromDatabase: false, error: error.message };
    }
    return { data: data || [], fromDatabase: true, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching categories:', error);
    return { data: DEFAULT_CATEGORIES, fromDatabase: false, error: error.message || 'Unknown error' };
  }
}

/** URL-safe slug from a name: "Chemise Été 2026" → "chemise-ete-2026" */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createCategory(payload: CategoryPayload & { name: string; slug: string }): Promise<{ data: Category | null; error: string | null }> {
  const { data, error } = await supabase.from(TABLE).insert([payload]).select().single();
  if (error) {
    console.error('Error creating category:', error);
    return { data: null, error: error.code === '23505' ? 'Ce identifiant (slug) existe déjà' : error.message };
  }
  return { data, error: null };
}

/** The slug is not updatable: products reference it */
export async function updateCategory(id: string, updates: Omit<CategoryPayload, 'slug'>): Promise<{ data: Category | null; error: string | null }> {
  const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
  if (error) {
    console.error('Error updating category:', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

/** Refuses when products or sub-categories still use the category */
export async function deleteCategory(category: Category): Promise<{ error: string | null }> {
  const column = category.parent_id ? 'subcategory' : 'category';
  const { count, error: countError } = await supabase
    .from('zo-products')
    .select('id', { count: 'exact', head: true })
    .eq(column, category.slug);
  if (countError) return { error: countError.message };
  if (count && count > 0) {
    return { error: `${count} produit${count > 1 ? 's utilisent' : ' utilise'} encore cette ${category.parent_id ? 'sous-catégorie' : 'catégorie'}. Déplacez-les d'abord.` };
  }

  const { error } = await supabase.from(TABLE).delete().eq('id', category.id);
  if (error) {
    console.error('Error deleting category:', error);
    return { error: error.code === '23503' ? "Supprimez d'abord ses sous-catégories." : error.message };
  }
  return { error: null };
}
