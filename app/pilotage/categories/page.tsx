'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, CornerDownRight, FolderPlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import AdminGate, { MigrationNotice } from '../components/AdminGate';
import { useCategories } from '@/app/lib/hooks/useCategories';
import { useProducts } from '@/app/contexts/ProductContext';
import {
  Category,
  createCategory,
  deleteCategory,
  slugify,
  updateCategory,
} from '@/app/lib/supabase/categories';

interface FormState {
  id: string | null; // null = creation
  name: string;
  slug: string;
  description: string;
  parent_id: string;
  is_active: boolean;
  show_on_home: boolean;
  home_limit: string;
}

const emptyForm = (parentId = ''): FormState => ({
  id: null,
  name: '',
  slug: '',
  description: '',
  parent_id: parentId,
  is_active: true,
  show_on_home: true,
  home_limit: '4',
});

function CategoriesManager() {
  const { roots, childrenOf, categories, fromDatabase, loading, reload } = useCategories({ includeInactive: true });
  const { products } = useProducts();
  const [form, setForm] = useState<FormState | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const readOnly = !fromDatabase;

  const productCount = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      if (p.category) counts[p.category] = (counts[p.category] || 0) + 1;
      if (p.subcategory) counts[p.subcategory] = (counts[p.subcategory] || 0) + 1;
    });
    return counts;
  }, [products]);

  const openCreate = (parentId = '') => {
    setForm(emptyForm(parentId));
    setSlugTouched(false);
  };

  const openEdit = (category: Category) => {
    setForm({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description ?? '',
      parent_id: category.parent_id ?? '',
      is_active: category.is_active,
      show_on_home: category.show_on_home,
      home_limit: String(category.home_limit),
    });
    setSlugTouched(true);
  };

  const siblingsOf = (category: Pick<Category, 'parent_id'>) =>
    category.parent_id ? categories.filter((c) => c.parent_id === category.parent_id).sort((a, b) => a.sort_order - b.sort_order) : roots;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const name = form.name.trim();
    const slug = slugify(form.slug || name);
    if (!name || !slug) {
      toast.error('Le nom est obligatoire');
      return;
    }

    setSaving(true);
    const common = {
      name,
      description: form.description.trim() || null,
      parent_id: form.parent_id || null,
      is_active: form.is_active,
      show_on_home: form.show_on_home,
      home_limit: Math.max(1, Number(form.home_limit) || 4),
    };
    const result = form.id
      ? await updateCategory(form.id, common)
      : await createCategory({
          ...common,
          slug,
          sort_order: Math.max(0, ...siblingsOf({ parent_id: common.parent_id }).map((c) => c.sort_order)) + 1,
        });
    setSaving(false);

    if (result.error) {
      toast.error(`Erreur : ${result.error}`);
      return;
    }
    toast.success(form.id ? 'Catégorie mise à jour' : form.parent_id ? 'Sous-catégorie créée' : 'Catégorie créée');
    setForm(null);
    reload();
  };

  const handleToggle = async (category: Category, field: 'is_active' | 'show_on_home') => {
    const { error } = await updateCategory(category.id, { [field]: !category[field] });
    if (error) toast.error(`Erreur : ${error}`);
    else reload();
  };

  const handleMove = async (category: Category, direction: -1 | 1) => {
    const siblings = [...siblingsOf(category)];
    const index = siblings.findIndex((c) => c.id === category.id);
    const other = siblings[index + direction];
    if (!other) return;
    [siblings[index], siblings[index + direction]] = [other, category];
    // Rewrite the whole order so equal sort_order values cannot block the swap
    const results = await Promise.all(siblings.map((c, i) => updateCategory(c.id, { sort_order: i + 1 })));
    const failed = results.find((r) => r.error);
    if (failed) toast.error(`Erreur : ${failed.error}`);
    reload();
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Supprimer « ${category.name} » ?`)) return;
    const { error } = await deleteCategory(category);
    if (error) toast.error(error);
    else {
      toast.success('Supprimée');
      reload();
    }
  };

  const renderRow = (category: Category, index: number, siblings: Category[]) => {
    const isSub = !!category.parent_id;
    const subs = isSub ? [] : childrenOf(category);
    return (
      <tr key={category.id} className={category.is_active ? '' : 'opacity-60'}>
        <td>
          <div className={`flex items-center gap-2 ${isSub ? 'pl-6' : ''}`}>
            {isSub && <CornerDownRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
            <div className="min-w-0">
              <p className={`text-black dark:text-white truncate ${isSub ? '' : 'font-extrabold'}`}>{category.name}</p>
              <p className="text-xs text-slate-500 font-mono truncate">{category.slug}</p>
            </div>
          </div>
        </td>
        <td className="text-right pz-num">{productCount[category.slug] || 0}</td>
        <td>
          {isSub ? (
            <span className="text-xs text-slate-400">—</span>
          ) : (
            <button disabled={readOnly} onClick={() => handleToggle(category, 'show_on_home')} className={`pz-badge cursor-pointer ${category.show_on_home ? '' : 'pz-badge-neutral'}`}>
              {category.show_on_home ? `Oui · ${category.home_limit}` : 'Non'}
            </button>
          )}
        </td>
        <td>
          <button disabled={readOnly} onClick={() => handleToggle(category, 'is_active')} className={`pz-badge cursor-pointer ${category.is_active ? 'pz-badge-up' : 'pz-badge-neutral'}`}>
            {category.is_active ? 'Visible' : 'Masquée'}
          </button>
        </td>
        <td>
          <div className="flex items-center justify-end gap-0.5">
            <button className="pz-btn pz-btn-ghost px-1.5!" title="Monter" disabled={readOnly || index === 0} onClick={() => handleMove(category, -1)}>
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button className="pz-btn pz-btn-ghost px-1.5!" title="Descendre" disabled={readOnly || index === siblings.length - 1} onClick={() => handleMove(category, 1)}>
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
            {!isSub && (
              <button className="pz-btn pz-btn-ghost px-1.5!" title="Ajouter une sous-catégorie" disabled={readOnly} onClick={() => openCreate(category.id)}>
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            )}
            <button className="pz-btn pz-btn-ghost px-1.5!" title="Modifier" disabled={readOnly} onClick={() => openEdit(category)}>
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              className="pz-btn pz-btn-ghost px-1.5! text-red-600!"
              title={subs.length ? "Supprimez d'abord ses sous-catégories" : 'Supprimer'}
              disabled={readOnly || subs.length > 0}
              onClick={() => handleDelete(category)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  const isEditingRoot = form && !form.parent_id;
  const editedHasChildren = !!form?.id && categories.some((c) => c.parent_id === form.id);
  const editedHasProducts = !!form?.id && (productCount[form.slug] || 0) > 0;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="pz-eyebrow mb-1">Catalogue</p>
          <h1 className="text-2xl">Catégories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Catégories et sous-catégories proposées sur le site et dans les fiches produit.</p>
        </div>
        <button className="pz-btn pz-btn-primary" disabled={readOnly} onClick={() => openCreate()}>
          <Plus className="h-3.5 w-3.5" /> Nouvelle catégorie
        </button>
      </div>

      {readOnly && !loading && <MigrationNotice />}

      <div className="pz-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">Nom</th>
              <th className="text-right">Produits</th>
              <th className="text-left">Accueil</th>
              <th className="text-left">Statut</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {roots.flatMap((root, i) => {
              const subs = childrenOf(root);
              return [renderRow(root, i, roots), ...subs.map((sub, j) => renderRow(sub, j, subs))];
            })}
          </tbody>
        </table>
        {!loading && roots.length === 0 && <div className="pz-empty">Aucune catégorie</div>}
      </div>
      <p className="mt-3 text-xs text-slate-500">
        « Accueil » : la catégorie a sa section sur la page d&apos;accueil (avec le nombre de produits affichés). Une catégorie masquée
        disparaît du site mais reste attribuable aux produits. Une catégorie utilisée par des produits ne peut pas être supprimée.
      </p>

      {/* Create / edit panel */}
      {form && (
        <div className="fixed inset-0 z-60 flex justify-end bg-black/40" onClick={() => !saving && setForm(null)}>
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="h-full w-full max-w-md bg-[var(--pz-card)] border-l border-[var(--pz-border)] flex flex-col shadow-2xl"
          >
            <div className="pz-card-header">
              <h2 className="pz-card-title">
                {form.id ? 'Modifier' : 'Créer'} {form.parent_id ? 'une sous-catégorie' : 'une catégorie'}
              </h2>
              <button type="button" className="pz-btn pz-btn-ghost px-2!" onClick={() => setForm(null)} aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block" htmlFor="cat-name">Nom *</label>
                <input
                  id="cat-name"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-transparent text-black dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block" htmlFor="cat-slug">Identifiant (URL)</label>
                <input
                  id="cat-slug"
                  value={form.slug}
                  disabled={!!form.id}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setForm({ ...form, slug: e.target.value });
                  }}
                  className="w-full px-3 py-2 font-mono border border-gray-300 dark:border-gray-600 bg-transparent text-black dark:text-white focus:outline-none disabled:opacity-60"
                />
                <p className="mt-1 text-xs text-slate-500">
                  {form.id ? 'Non modifiable : les produits y sont rattachés.' : `Lien : /products?category=${slugify(form.slug || form.name) || '…'}`}
                </p>
              </div>

              <div>
                <label className="block" htmlFor="cat-parent">Catégorie parente</label>
                <select
                  id="cat-parent"
                  value={form.parent_id}
                  disabled={editedHasChildren || editedHasProducts}
                  onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none disabled:opacity-60"
                >
                  <option value="">Aucune (catégorie principale)</option>
                  {roots
                    .filter((c) => c.id !== form.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
                {editedHasChildren && <p className="mt-1 text-xs text-slate-500">Elle a des sous-catégories : elle reste principale.</p>}
                {!editedHasChildren && editedHasProducts && (
                  <p className="mt-1 text-xs text-slate-500">Des produits y sont rattachés : déplacez-les avant de changer le parent.</p>
                )}
              </div>

              <div>
                <label className="block" htmlFor="cat-description">Description</label>
                <textarea
                  id="cat-description"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-transparent text-black dark:text-white focus:outline-none"
                />
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white cursor-pointer">
                  <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                  Visible sur le site
                </label>
                {isEditingRoot && (
                  <>
                    <label className="flex items-center gap-2 text-sm font-semibold text-black dark:text-white cursor-pointer">
                      <input type="checkbox" checked={form.show_on_home} onChange={(e) => setForm({ ...form, show_on_home: e.target.checked })} />
                      Section sur la page d&apos;accueil
                    </label>
                    {form.show_on_home && (
                      <div className="pl-6">
                        <label className="block" htmlFor="cat-limit">Produits affichés sur l&apos;accueil</label>
                        <input
                          id="cat-limit"
                          type="number"
                          min={1}
                          max={48}
                          value={form.home_limit}
                          onChange={(e) => setForm({ ...form, home_limit: e.target.value })}
                          className="w-28 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-transparent text-black dark:text-white focus:outline-none"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 border-t border-[var(--pz-border)]">
              <button type="button" className="pz-btn pz-btn-outline" onClick={() => setForm(null)} disabled={saving}>Annuler</button>
              <button type="submit" className="pz-btn pz-btn-primary" disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

export default function CategoriesPage() {
  return (
    <AdminGate>
      <CategoriesManager />
    </AdminGate>
  );
}
