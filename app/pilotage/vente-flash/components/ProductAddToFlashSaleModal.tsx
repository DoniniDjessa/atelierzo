'use client';

import { useState } from 'react';
import { addProductToVenteFlash } from '@/app/lib/supabase/vente-flash';
import { useProducts } from '@/app/contexts/ProductContext';
import { toast } from 'sonner';

interface ProductAddToFlashSaleModalProps {
  venteFlashId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ProductAddToFlashSaleModal({
  venteFlashId,
  onSuccess,
  onClose,
}: ProductAddToFlashSaleModalProps) {
  const { products } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      toast.error('Veuillez sélectionner un produit');
      return;
    }

    setLoading(true);
    try {
      const { error } = await addProductToVenteFlash(venteFlashId, selectedProductId, discountPercentage);
      if (error) {
        toast.error(`Erreur: ${error}`);
      } else {
        toast.success('Produit ajouté à la vente flash');
        onSuccess();
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
          Produit *
        </label>
        <select
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Sélectionner un produit</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.title}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
          Remise (%)
        </label>
        <input
          type="number"
          min="0"
          max="100"
          value={discountPercentage}
          onChange={(e) => setDiscountPercentage(parseInt(e.target.value) || 0)}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          required
        />
      </div>
      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-semibold text-sm"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold text-sm disabled:opacity-50"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          {loading ? 'Ajout...' : 'Ajouter'}
        </button>
      </div>
    </form>
  );
}

