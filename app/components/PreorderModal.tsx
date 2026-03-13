'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { createPreorder } from '@/app/lib/supabase/preorders';
import { useUser } from '@/app/contexts/UserContext';

// The specific product ID that supports preorders
export const PREORDER_PRODUCT_ID = '4fd85b73-8983-426d-8340-6f390f7ce4d5';

interface PreorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productTitle: string;
  productImage: string;
  productPrice: number;
  availableSizes: string[];
}

export default function PreorderModal({
  isOpen,
  onClose,
  productId,
  productTitle,
  productImage,
  productPrice,
  availableSizes,
}: PreorderModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useUser();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSize) {
      toast.error('Veuillez sélectionner une taille');
      return;
    }
    if (!name.trim() || !phone.trim()) {
      toast.error('Veuillez renseigner votre nom et numéro de téléphone');
      return;
    }

    setLoading(true);
    try {
      const { error } = await createPreorder({
        user_id: user?.id || phone.trim(), // use user ID if logged in, otherwise phone for anonymous
        product_id: productId,
        size: selectedSize,
        quantity,
        delivery_address: address.trim(),
        notes: `NOM: ${name.trim()} | TEL: ${phone.trim()}${notes ? ' | NOTE: ' + notes : ''}`,
      });

      if (error) {
        toast.error('Une erreur est survenue. Veuillez réessayer.');
        return;
      }

      toast.success('Précommande enregistrée ! Nous vous contacterons bientôt. 🎉');
      onClose();
      setName('');
      setPhone('');
      setSelectedSize('');
      setQuantity(1);
      setAddress('');
      setNotes('');
    } catch {
      toast.error('Une erreur inattendue est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full sm:w-auto sm:min-w-[420px] sm:max-w-md bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/20 flex-shrink-0">
            <img
              src={productImage}
              alt={productTitle}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/80 text-xs" style={{ fontFamily: 'var(--font-poppins)' }}>
              Précommande
            </p>
            <h3
              className="text-white font-bold text-sm truncate"
              style={{ fontFamily: 'var(--font-ubuntu)' }}
            >
              {productTitle}
            </h3>
            <p className="text-white/90 text-xs font-semibold" style={{ fontFamily: 'var(--font-poppins)' }}>
              {productPrice.toLocaleString('fr-FR')} XOF
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-800 px-4 py-2">
          <p className="text-xs text-orange-700 dark:text-orange-300" style={{ fontFamily: 'var(--font-poppins)' }}>
            📦 Ce produit est temporairement en rupture. Remplissez ce formulaire et nous vous contacterons dès la disponibilité.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Size Selection */}
          <div>
            <label className="block text-xs font-semibold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
              Taille souhaitée *
            </label>
            <div className="flex flex-wrap gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`px-4 py-2 text-xs border-2 rounded-lg font-medium transition-all ${
                    selectedSize === size
                      ? 'border-orange-500 bg-orange-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-black dark:text-white hover:border-orange-300'
                  }`}
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-semibold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
              Quantité
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                −
              </button>
              <span className="text-sm font-semibold text-black dark:text-white w-6 text-center" style={{ fontFamily: 'var(--font-poppins)' }}>
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                className="w-8 h-8 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
              Votre nom *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Jean Kouassi"
              required
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-gray-400"
              style={{ fontFamily: 'var(--font-poppins)' }}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
              Numéro de téléphone *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 07 00 00 00 00"
              required
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-gray-400"
              style={{ fontFamily: 'var(--font-poppins)' }}
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
              Adresse de livraison *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ex: Cocody, Riviera 3"
              required
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-gray-400"
              style={{ fontFamily: 'var(--font-poppins)' }}
            />
          </div>

          {/* Optional note */}
          <div>
            <label className="block text-xs font-semibold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
              Message (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Je souhaite être contacté le matin..."
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-black dark:text-white bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-orange-400 placeholder-gray-400 resize-none"
              style={{ fontFamily: 'var(--font-poppins)' }}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {loading ? 'Envoi en cours…' : '📋 Confirmer ma précommande'}
          </button>
        </form>
      </div>
    </div>
  );
}
