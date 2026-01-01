'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { useProducts } from '@/app/contexts/ProductContext';
import { useUser } from '@/app/contexts/UserContext';
import { createPreorder } from '@/app/lib/supabase/preorders';

// Standard sizes from S to XXXXL
const STANDARD_SIZES = ['S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];

export default function PreorderPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  const { getProductById } = useProducts();
  const { user } = useUser();
  const product = getProductById(productId);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get available sizes from product or use standard sizes
  const availableSizes = product?.sizes && Array.isArray(product.sizes) && product.sizes.length > 0
    ? product.sizes
    : STANDARD_SIZES;

  useEffect(() => {
    if (!user) {
      toast.error('Veuillez vous connecter pour précommander');
      router.push('/');
      return;
    }

    if (!product) {
      toast.error('Produit non trouvé');
      router.push('/');
      return;
    }
  }, [user, product, router]);

  if (!product || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <h1
            className="text-2xl font-bold text-black dark:text-white mb-4"
            style={{ fontFamily: 'var(--font-ubuntu)' }}
          >
            Chargement...
          </h1>
        </div>
      </div>
    );
  }

  const handlePreorder = async () => {
    if (!selectedSize) {
      toast.error('Veuillez sélectionner une taille');
      return;
    }

    if (quantity < 1) {
      toast.error('La quantité doit être au moins 1');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await createPreorder({
        user_id: user.id,
        product_id: product.id,
        size: selectedSize,
        quantity,
      });

      if (error) {
        toast.error(`Erreur: ${error}`);
        setIsSubmitting(false);
        return;
      }

      toast.success('Précommande effectuée avec succès !');
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (error: any) {
      console.error('Error creating preorder:', error);
      toast.error('Une erreur est survenue lors de la précommande');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          style={{ fontFamily: 'var(--font-poppins)' }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Retour</span>
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8">
            {/* Product Image */}
            <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
                unoptimized={product.imageUrl.includes('unsplash.com')}
              />
            </div>

            {/* Preorder Form */}
            <div className="flex flex-col justify-center">
              <h1
                className="text-2xl md:text-3xl font-bold text-black dark:text-white mb-2"
                style={{ fontFamily: 'var(--font-ubuntu)' }}
              >
                {product.title}
              </h1>

              <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm md:text-base">
                {product.description}
              </p>

              <div className="mb-6">
                <p className="text-3xl font-bold text-black dark:text-white mb-1">
                  {product.price.toLocaleString('fr-FR')} FCFA
                </p>
                {product.oldPrice && (
                  <p className="text-lg text-gray-500 dark:text-gray-400 line-through">
                    {product.oldPrice.toLocaleString('fr-FR')} FCFA
                  </p>
                )}
              </div>

              {/* Size Selection */}
              <div className="mb-6">
                <label
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Sélectionnez la taille
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {availableSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all transform ${
                        selectedSize === size
                          ? 'bg-gradient-to-r from-cyan-400 to-cyan-700 text-white scale-105 shadow-lg'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selection */}
              <div className="mb-6">
                <label
                  className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Quantité
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center font-semibold transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-center text-lg font-semibold text-black dark:text-white bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 border-0 focus:ring-2 focus:ring-cyan-500"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  />
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center justify-center font-semibold transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Preorder Button */}
              <button
                onClick={handlePreorder}
                disabled={!selectedSize || isSubmitting}
                className={`w-full py-4 px-6 rounded-xl text-white font-semibold transition-all transform ${
                  !selectedSize || isSubmitting
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-cyan-400 to-cyan-700 hover:from-cyan-500 hover:to-cyan-800 hover:scale-105 active:scale-95'
                }`}
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {isSubmitting ? 'Traitement...' : 'Précommander'}
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                Cette précommande n'affectera pas le stock disponible du produit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

