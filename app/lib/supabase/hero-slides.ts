/**
 * Home page hero carousel pictures (table zo-hero-slides, see categories-hero-migration.sql).
 * One set of portrait pictures (3:4): the carousel shows 1 at a time on phones, up to 4 on large screens.
 */

import { supabase } from './client';

export interface HeroSlide {
  id: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

// Used until the migration has been run (same pictures as the migration seeds)
export const DEFAULT_HERO_SLIDES: HeroSlide[] = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
  id: `default-${n}`,
  image_url: `/carousel/${n}.jpeg`,
  link_url: null,
  sort_order: n,
  is_active: true,
}));

const TABLE = 'zo-hero-slides';

export async function getAllHeroSlides(): Promise<{ data: HeroSlide[]; fromDatabase: boolean; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      // PGRST205 = table not created yet (migration not run): the built-in pictures are used
      (error.code === 'PGRST205' ? console.warn : console.error)('Error fetching hero slides:', error);
      return { data: DEFAULT_HERO_SLIDES, fromDatabase: false, error: error.message };
    }
    return { data: data || [], fromDatabase: true, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching hero slides:', error);
    return { data: DEFAULT_HERO_SLIDES, fromDatabase: false, error: error.message || 'Unknown error' };
  }
}

export async function createHeroSlide(slide: Pick<HeroSlide, 'image_url'> & Partial<Pick<HeroSlide, 'link_url' | 'sort_order' | 'is_active'>>): Promise<{ data: HeroSlide | null; error: string | null }> {
  const { data, error } = await supabase.from(TABLE).insert([slide]).select().single();
  if (error) {
    console.error('Error creating hero slide:', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function updateHeroSlide(id: string, updates: Partial<Omit<HeroSlide, 'id' | 'created_at'>>): Promise<{ data: HeroSlide | null; error: string | null }> {
  const { data, error } = await supabase.from(TABLE).update(updates).eq('id', id).select().single();
  if (error) {
    console.error('Error updating hero slide:', error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function deleteHeroSlide(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) {
    console.error('Error deleting hero slide:', error);
    return { error: error.message };
  }
  return { error: null };
}
