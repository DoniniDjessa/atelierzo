'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'sonner';
import { useCart } from '@/app/contexts/CartContext';
import { useUser } from '@/app/contexts/UserContext';
import { useProducts } from '@/app/contexts/ProductContext';
import { createOrder } from '@/app/lib/supabase/orders';
import { getColorName } from '@/app/lib/utils/colors';
import Footer from '@/app/components/Footer';
import PageTitle from '@/app/components/PageTitle';

export default function CartPage() {
  const router = useRouter();
  const { user } = useUser();
  const { items, removeFromCart, updateQuantity, clearCart, getTotal } = useCart();
  const { getProductById, updateProduct } = useProducts();
  const [isProcessing, setIsProcessing] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingPhone, setShippingPhone] = useState(user?.phone || '');
  const [notes, setNotes] = useState('');

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Veuillez vous connecter pour passer une commande');
      router.push('/');
      return;
    }

    if (items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    if (!shippingAddress.trim()) {
      toast.error('Veuillez entrer une adresse de livraison');
      return;
    }

    if (!shippingPhone.trim()) {
      toast.error('Veuillez entrer un numéro de téléphone');
      return;
    }

    setIsProcessing(true);

    try {
      const { data: order, error } = await createOrder({
        user_id: user.id,
        items: items.map((item) => ({
          product_id: item.productId,
          title: item.title,
          price: item.price,
          image_url: item.imageUrl,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
        })),
        shipping_address: shippingAddress,
        shipping_phone: shippingPhone,
        notes: notes || undefined,
      });

      if (error) {
        toast.error(`Erreur lors de la création de la commande: ${error}`);
        setIsProcessing(false);
        return;
      }

      // Decrease product quantities for each item in the order
      items.forEach((item) => {
        const product = getProductById(item.productId);
        if (product && product.sizeQuantities) {
          const currentQty = product.sizeQuantities[item.size] || 0;
          const newQty = Math.max(0, currentQty - item.quantity);
          updateProduct(item.productId, {
            sizeQuantities: {
              ...product.sizeQuantities,
              [item.size]: newQty,
            },
          });
        }
      });

      // Clear cart and redirect
      clearCart();
      toast.success(`Commande créée avec succès ! Numéro: ${order?.id}`);
      router.push(`/orders/${order?.id}`);
    } catch (error: any) {
      console.error('Error during checkout:', error);
      toast.error('Erreur lors du traitement de la commande');
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4">
        <div className="text-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-24 w-24 mx-auto text-gray-400 dark:text-gray-600 mb-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
            />
          </svg>
          <h1
            className="text-2xl font-bold text-black dark:text-white mb-4"
            style={{ fontFamily: 'var(--font-fira-sans)' }}
          >
            Votre panier est vide
          </h1>
          <p
            className="text-gray-600 dark:text-gray-400 mb-6"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Ajoutez des produits à votre panier pour commencer vos achats
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            Découvrir les produits
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PageTitle title="Mon panier" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => (
              <div
                key={`${item.productId}-${item.size}-${item.color || 'no-color'}-${index}`}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm transition-shadow p-3 sm:p-4"
              >
                {/* Mobile Layout: Stacked */}
                <div className="flex flex-col sm:hidden gap-3">
                  {/* Top Row: Image + Info */}
                  <div className="flex items-start gap-3">
                    {/* Image */}
                    <div className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={item.imageUrl}
                        alt={item.title}
                        fill
                        className="object-contain"
                        sizes="80px"
                      />
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h3
                        className="text-sm font-bold text-black dark:text-white mb-1 truncate"
                        style={{ fontFamily: 'var(--font-fira-sans)' }}
                      >
                        {item.title}
                      </h3>
                      
                      {/* Variant - Size Display */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-[10px] text-gray-500 dark:text-gray-400"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          taille {item.size}
                        </span>
                        {item.color && (
                          <>
                            <span className="text-[10px] text-gray-400">•</span>
                            <div className="flex items-center gap-1">
                              <div
                                className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: item.color }}
                              />
                              <span
                                className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[60px]"
                                style={{ fontFamily: 'var(--font-poppins)' }}
                              >
                                {getColorName(item.color) || item.color}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Remove Button - Top right */}
                    <button
                      onClick={() => removeFromCart(item.productId, item.size, item.color)}
                      className="text-orange-400 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors p-1 flex-shrink-0"
                      aria-label="Supprimer"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Bottom Row: Quantity + Price */}
                  <div className="flex items-center justify-between">
                    {/* Quantity Selector */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1, item.color)}
                        className="text-orange-400 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                        aria-label="Diminuer la quantité"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                        </svg>
                      </button>
                      <span
                        className="text-sm font-medium text-black dark:text-white w-6 text-center"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1, item.color)}
                        className="text-orange-400 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                        aria-label="Augmenter la quantité"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>

                    {/* Price */}
                    <span
                      className="text-sm font-bold text-black dark:text-white"
                      style={{ fontFamily: 'var(--font-fira-sans)' }}
                    >
                      {(item.price * item.quantity).toLocaleString('fr-FR')} XOF
                    </span>
                  </div>
                </div>

                {/* Desktop Layout: Horizontal */}
                <div className="hidden sm:flex items-center justify-between gap-x-6">
                  {/* Image - Left side */}
                  <div className="relative w-24 h-24 flex-shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-contain"
                      sizes="96px"
                    />
                  </div>

                  {/* Product Info - Flex-1 to push other elements */}
                  <div className="flex-1 flex flex-col gap-1 min-w-0">
                    {/* Brand/Model Name - Bold */}
                    <h3
                      className="text-base font-bold text-black dark:text-white truncate"
                      style={{ fontFamily: 'var(--font-fira-sans)' }}
                    >
                      {item.title}
                    </h3>
                    
                    {/* Short Description - Light Gray */}
                    {(() => {
                      const product = getProductById(item.productId);
                      return product?.description ? (
                        <p
                          className="text-sm text-gray-400 dark:text-gray-500 line-clamp-1"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          {product.description}
                        </p>
                      ) : null;
                    })()}

                    {/* Variant - Size Display */}
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs text-gray-500 dark:text-gray-400"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        taille {item.size}
                      </span>
                      {item.color && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600"
                              style={{ backgroundColor: item.color }}
                            />
                            <span
                              className="text-xs text-gray-500 dark:text-gray-400"
                              style={{ fontFamily: 'var(--font-poppins)' }}
                            >
                              {getColorName(item.color) || item.color}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Quantity Selector - Center-right */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1, item.color)}
                      className="text-orange-400 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                      aria-label="Diminuer la quantité"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                      </svg>
                    </button>
                    <span
                      className="text-sm font-medium text-black dark:text-white w-6 text-center"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1, item.color)}
                      className="text-orange-400 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
                      aria-label="Augmenter la quantité"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  </div>

                  {/* Price - Before X icon */}
                  <span
                    className="text-base font-bold text-black dark:text-white"
                    style={{ fontFamily: 'var(--font-fira-sans)' }}
                  >
                    {(item.price * item.quantity).toLocaleString('fr-FR')} XOF
                  </span>

                  {/* Remove Button - Orange X - Extreme right */}
                  <button
                    onClick={() => removeFromCart(item.productId, item.size, item.color)}
                    className="text-orange-400 hover:text-orange-500 dark:text-orange-400 dark:hover:text-orange-300 transition-colors p-1 flex-shrink-0"
                    aria-label="Supprimer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Checkout Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 sticky top-4">
              <h2
                className="text-xl font-bold text-black dark:text-white mb-4"
                style={{ fontFamily: 'var(--font-fira-sans)' }}
              >
                Résumé de la commande
              </h2>

              {/* Shipping Information */}
              <div className="space-y-4 mb-6">
                <div>
                  <label
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Adresse de livraison *
                  </label>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                    placeholder="Entrez votre adresse complète"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    value={shippingPhone}
                    onChange={(e) => setShippingPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                    placeholder="Votre numéro de téléphone"
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Notes (optionnel)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                    placeholder="Instructions spéciales..."
                  />
                </div>
              </div>

              {/* Total */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm text-gray-600 dark:text-gray-400"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Sous-total
                  </span>
                  <span
                    className="text-sm font-medium text-black dark:text-white"
                    style={{ fontFamily: 'var(--font-fira-sans)' }}
                  >
                    {getTotal().toLocaleString('fr-FR')} XOF
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-lg font-bold text-black dark:text-white"
                    style={{ fontFamily: 'var(--font-fira-sans)' }}
                  >
                    Total
                  </span>
                  <span
                    className="text-lg font-bold text-black dark:text-white"
                    style={{ fontFamily: 'var(--font-fira-sans)' }}
                  >
                    {getTotal().toLocaleString('fr-FR')} XOF
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={isProcessing || !user}
                className="w-full px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {isProcessing ? 'Traitement...' : !user ? 'Connectez-vous pour commander' : 'Passer la commande'}
              </button>

              {!user && (
                <p
                  className="mt-3 text-xs text-center text-gray-600 dark:text-gray-400"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  <button
                    onClick={() => router.push('/')}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Se connecter
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

