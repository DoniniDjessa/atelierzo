'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Category, DEFAULT_CATEGORIES, getAllCategories } from '@/app/lib/supabase/categories';

// One fetch shared by every component on the page (navbar, sidebar, sections, footer...)
let cache: { data: Category[]; fromDatabase: boolean } | null = null;
let pending: Promise<{ data: Category[]; fromDatabase: boolean }> | null = null;
const listeners = new Set<() => void>();

function load(force = false) {
  if (force) {
    cache = null;
    pending = null;
  }
  if (!pending) {
    pending = getAllCategories().then(({ data, fromDatabase }) => {
      cache = { data, fromDatabase };
      listeners.forEach((notify) => notify());
      return cache;
    });
  }
  return pending;
}

const bySortOrder = (a: Category, b: Category) => a.sort_order - b.sort_order || a.name.localeCompare(b.name);

/**
 * Categories from zo-categories (falls back to the built-in list until the table exists).
 * `includeInactive` is for the back-office; the storefront only sees active ones.
 */
export function useCategories({ includeInactive = false }: { includeInactive?: boolean } = {}) {
  const [state, setState] = useState(cache);

  useEffect(() => {
    const notify = () => setState(cache);
    listeners.add(notify);
    if (!cache) load();
    else setState(cache);
    return () => {
      listeners.delete(notify);
    };
  }, []);

  const reload = useCallback(() => load(true), []);

  return useMemo(() => {
    const all = (state?.data ?? DEFAULT_CATEGORIES).filter((c) => includeInactive || c.is_active);
    const roots = all.filter((c) => !c.parent_id).sort(bySortOrder);
    const childrenOf = (parent: Category | string) => {
      const parentId = typeof parent === 'string' ? all.find((c) => c.slug === parent && !c.parent_id)?.id : parent.id;
      return all.filter((c) => c.parent_id && c.parent_id === parentId).sort(bySortOrder);
    };
    const bySlug = (slug?: string | null) => (slug ? all.find((c) => c.slug === slug) : undefined);
    const labelOf = (slug?: string | null) => bySlug(slug)?.name ?? slug ?? '';

    return {
      categories: all,
      roots,
      childrenOf,
      bySlug,
      labelOf,
      loading: !state,
      fromDatabase: state?.fromDatabase ?? false,
      reload,
    };
  }, [state, includeInactive, reload]);
}
