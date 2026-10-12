'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ImagePlus, Images, Link2, RefreshCw, Trash2 } from 'lucide-react';
import AdminGate, { MigrationNotice } from '../components/AdminGate';
import {
  createHeroSlide,
  deleteHeroSlide,
  getAllHeroSlides,
  HeroSlide,
  updateHeroSlide,
} from '@/app/lib/supabase/hero-slides';
import { compressImageToWebP, generateImageFilename } from '@/app/lib/utils/image';
import { deleteImageFromUrl, isSupabaseImageUrl, uploadImage } from '@/app/lib/supabase/storage';

async function uploadHeroImage(file: File): Promise<string> {
  const compressed = await compressImageToWebP(file, 2400, 2400, 0.8);
  const result = await uploadImage(compressed, `hero/${generateImageFilename('hero-' + Date.now(), file.name)}`);
  if (result.error || !result.url) throw new Error(result.error || 'URL non disponible');
  return result.url;
}

function HeroManager() {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [fromDatabase, setFromDatabase] = useState(true);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null); // id of the slide being saved, 'add' while uploading new ones
  const addInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const result = await getAllHeroSlides();
    setSlides(result.data);
    setFromDatabase(result.fromDatabase);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const readOnly = !fromDatabase;

  const handleAdd = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy('add');
    try {
      let order = Math.max(0, ...slides.map((s) => s.sort_order));
      for (const file of Array.from(files)) {
        const url = await uploadHeroImage(file);
        const { error } = await createHeroSlide({ image_url: url, sort_order: ++order });
        if (error) throw new Error(error);
      }
      toast.success(files.length > 1 ? `${files.length} images ajoutées` : 'Image ajoutée');
      await load();
    } catch (error: any) {
      toast.error(`Erreur lors de l'ajout : ${error.message}`);
    } finally {
      setBusy(null);
      if (addInputRef.current) addInputRef.current.value = '';
    }
  };

  const handleReplace = async (slide: HeroSlide, file?: File) => {
    if (!file) return;
    setBusy(slide.id);
    try {
      const url = await uploadHeroImage(file);
      const { error } = await updateHeroSlide(slide.id, { image_url: url });
      if (error) throw new Error(error);
      if (isSupabaseImageUrl(slide.image_url)) await deleteImageFromUrl(slide.image_url);
      toast.success('Image remplacée');
      await load();
    } catch (error: any) {
      toast.error(`Erreur : ${error.message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleUpdate = async (slide: HeroSlide, updates: Partial<HeroSlide>, message?: string) => {
    setBusy(slide.id);
    const { error } = await updateHeroSlide(slide.id, updates);
    if (error) toast.error(`Erreur : ${error}`);
    else {
      if (message) toast.success(message);
      await load();
    }
    setBusy(null);
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const a = slides[index];
    const b = slides[index + direction];
    if (!a || !b) return;
    setBusy(a.id);
    // Rewrite the whole order so equal sort_order values cannot block the swap
    const reordered = [...slides];
    [reordered[index], reordered[index + direction]] = [b, a];
    const results = await Promise.all(reordered.map((s, i) => updateHeroSlide(s.id, { sort_order: i + 1 })));
    const failed = results.find((r) => r.error);
    if (failed) toast.error(`Erreur : ${failed.error}`);
    await load();
    setBusy(null);
  };

  const handleDelete = async (slide: HeroSlide) => {
    if (!confirm('Supprimer cette image du carrousel ?')) return;
    setBusy(slide.id);
    const { error } = await deleteHeroSlide(slide.id);
    if (error) toast.error(`Erreur : ${error}`);
    else {
      if (isSupabaseImageUrl(slide.image_url)) await deleteImageFromUrl(slide.image_url);
      toast.success('Image supprimée');
      await load();
    }
    setBusy(null);
  };

  const visibleCount = slides.filter((s) => s.is_active).length;

  return (
    <>
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="pz-eyebrow mb-1">Boutique</p>
          <h1 className="text-2xl">Carrousel d&apos;accueil</h1>
          <p className="text-sm text-slate-500 mt-0.5">Images affichées en haut de la page d&apos;accueil, dans l&apos;ordre ci-dessous.</p>
        </div>
      </div>

      {readOnly && !loading && <MigrationNotice />}

      <div className="pz-card">
        <div className="pz-card-header flex-wrap">
          <div className="flex items-center gap-3">
            <span className="pz-stat-icon"><Images className="h-4 w-4" /></span>
            <div>
              <h2 className="pz-card-title">{visibleCount} image{visibleCount > 1 ? 's' : ''} visible{visibleCount > 1 ? 's' : ''}</h2>
              <p className="text-xs text-slate-500">
                Format portrait 3:4 conseillé (ex. 1080 × 1440) · affichées 1 à la fois sur mobile, 2 sur tablette, 3 à 4 sur grand écran, défilement toutes les 5 s
              </p>
            </div>
          </div>
          <label className={`pz-btn pz-btn-primary ${readOnly || busy ? 'opacity-55 pointer-events-none' : 'cursor-pointer'}`}>
            {busy === 'add' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
            Ajouter des images
            <input
              ref={addInputRef}
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={readOnly || !!busy}
              onChange={(e) => handleAdd(e.target.files)}
            />
          </label>
        </div>

        {loading ? (
          <div className="pz-empty">Chargement…</div>
        ) : slides.length === 0 ? (
          <div className="pz-empty">Aucune image : le carrousel est masqué sur le site.</div>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {slides.map((slide, index) => (
              <li key={slide.id} className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 ${slide.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <span className={`pz-rank ${index === 0 ? 'is-top' : ''}`}>{index + 1}</span>
                  <img
                    src={slide.image_url}
                    alt={`Image ${index + 1}`}
                    className="h-28 w-21 rounded-md object-cover object-top border border-gray-200 dark:border-gray-700"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`pz-badge ${slide.is_active ? 'pz-badge-up' : 'pz-badge-neutral'}`}>
                      {slide.is_active ? 'Visible' : 'Masquée'}
                    </span>
                    {slide.link_url && <span className="text-xs text-slate-500 truncate">→ {slide.link_url}</span>}
                  </div>
                  <div className="relative max-w-md">
                    <Link2 className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      defaultValue={slide.link_url ?? ''}
                      placeholder="Lien au clic (optionnel), ex. /products?category=bermuda"
                      disabled={readOnly}
                      onBlur={(e) => {
                        const value = e.target.value.trim() || null;
                        if (value !== slide.link_url) handleUpdate(slide, { link_url: value }, 'Lien enregistré');
                      }}
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-transparent text-black dark:text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  <button className="pz-btn pz-btn-ghost px-2!" title="Monter" disabled={readOnly || index === 0 || !!busy} onClick={() => handleMove(index, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button className="pz-btn pz-btn-ghost px-2!" title="Descendre" disabled={readOnly || index === slides.length - 1 || !!busy} onClick={() => handleMove(index, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    className="pz-btn pz-btn-outline"
                    disabled={readOnly || !!busy}
                    onClick={() => handleUpdate(slide, { is_active: !slide.is_active }, slide.is_active ? 'Image masquée' : 'Image visible')}
                  >
                    {slide.is_active ? 'Masquer' : 'Afficher'}
                  </button>
                  <label className={`pz-btn pz-btn-outline ${readOnly || busy ? 'opacity-55 pointer-events-none' : 'cursor-pointer'}`}>
                    {busy === slide.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Remplacer'}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={readOnly || !!busy}
                      onChange={(e) => handleReplace(slide, e.target.files?.[0])}
                    />
                  </label>
                  <button className="pz-btn pz-btn-ghost px-2! text-red-600!" title="Supprimer" disabled={readOnly || !!busy} onClick={() => handleDelete(slide)}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

export default function HeroPage() {
  return (
    <AdminGate>
      <HeroManager />
    </AdminGate>
  );
}
