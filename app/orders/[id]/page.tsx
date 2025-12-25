'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUser } from '@/app/contexts/UserContext';
import { getOrderById, Order } from '@/app/lib/supabase/orders';
import { getColorName } from '@/app/lib/utils/colors';

const STATUS_COLORS: Record<Order['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  processing: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABELS: Record<Order['status'], string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  processing: 'En traitement',
  shipped: 'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const orderId = params.id as string;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    loadOrder();
  }, [user, orderId, router]);

  const loadOrder = async () => {
    setLoading(true);
    const { data, error } = await getOrderById(orderId, true);
    if (error) {
      console.error('Error loading order:', error);
      setOrder(null);
    } else {
      setOrder(data);
    }
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Commande introuvable
            </p>
            <button
              onClick={() => router.push('/profile/history')}
              className="mt-4 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Retour à l'historique
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
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
          Retour
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                Commande #{order.id.substring(0, 8)}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                {formatDate(order.created_at)}
              </p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              {STATUS_LABELS[order.status]}
            </span>
          </div>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div className="mb-6">
              <h2 className="text-base font-bold text-black dark:text-white mb-4" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                Articles
              </h2>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={item.image_url}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                        <span>taille {item.size}</span>
                        {item.color && (
                          <>
                            <span>•</span>
                            <div className="flex items-center gap-1.5">
                              <div
                                className="w-3 h-3 rounded-full border border-gray-300 dark:border-gray-600"
                                style={{ backgroundColor: item.color }}
                              />
                              <span>{getColorName(item.color) || item.color}</span>
                            </div>
                          </>
                        )}
                        <span>•</span>
                        <span>Quantité: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {item.price.toLocaleString('fr-FR')} FCFA / unité
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Information */}
          {(order.shipping_address || order.shipping_phone || order.notes) && (
            <div className="mb-6 border-t border-gray-200 dark:border-gray-700 pt-6">
              <h2 className="text-base font-bold text-black dark:text-white mb-4" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                Informations de livraison
              </h2>
              <div className="space-y-2 text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>
                {order.shipping_address && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Adresse :</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{order.shipping_address}</span>
                  </div>
                )}
                {order.shipping_phone && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Téléphone :</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{order.shipping_phone}</span>
                  </div>
                )}
                {order.notes && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400 font-medium">Notes :</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{order.notes}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                Total
              </span>
              <span className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                {order.total_amount.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

