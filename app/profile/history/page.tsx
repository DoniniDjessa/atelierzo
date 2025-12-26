'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import { getUserOrders, Order } from '@/app/lib/supabase/orders';
import PageTitle from '@/app/components/PageTitle';

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

const ITEMS_PER_PAGE = 10;

export default function ProfileHistoryPage() {
  const router = useRouter();
  const { user } = useUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    loadOrders();
  }, [user, router]);

  const loadOrders = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await getUserOrders(user.id);
    if (error) {
      console.error('Error loading orders:', error);
      setOrders([]);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Pagination calculations
  const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentOrders = orders.slice(startIndex, endIndex);

  // Reset to page 1 when orders change
  useEffect(() => {
    setCurrentPage(1);
  }, [orders.length]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <PageTitle title="Mon historique" />

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Chargement...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
            <p
              className="text-sm text-gray-500 dark:text-gray-400"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Aucune commande pour le moment
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {currentOrders.map((order) => {
              const itemsCount = order.items?.length || 0;
              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3
                          className="text-sm font-semibold text-black dark:text-white"
                          style={{ fontFamily: 'var(--font-ubuntu)' }}
                        >
                          Commande #{order.id.substring(0, 8)}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[order.status]}`}
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>
                      <p
                        className="text-xs text-gray-500 dark:text-gray-400 mb-1"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {formatDate(order.created_at)}
                      </p>
                      <p
                        className="text-xs text-gray-600 dark:text-gray-300"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {itemsCount} {itemsCount === 1 ? 'article' : 'articles'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p
                          className="text-base font-bold text-black dark:text-white"
                          style={{ fontFamily: 'var(--font-ubuntu)' }}
                        >
                          {order.total_amount.toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-medium"
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        Détails
                      </button>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Précédent
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === page
                              ? 'bg-indigo-600 text-white'
                              : 'border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                          }`}
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span
                          key={page}
                          className="px-2 text-gray-500 dark:text-gray-400"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Suivant
                </button>
              </div>
            )}

            {/* Page info */}
            {totalPages > 1 && (
              <div className="mt-4 text-center">
                <p
                  className="text-sm text-gray-600 dark:text-gray-400"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Page {currentPage} sur {totalPages} ({orders.length} {orders.length === 1 ? 'commande' : 'commandes'})
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

