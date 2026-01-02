'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import AdminNavbar from '@/app/components/AdminNavbar';
import { getAllOrders, updateOrderStatus, getOrderById, deleteOrder, Order } from '@/app/lib/supabase/orders';
import { getAllPreorders, updatePreorderStatus, Preorder } from '@/app/lib/supabase/preorders';
import { updateProduct } from '@/app/lib/supabase/products';
import { useProducts } from '@/app/contexts/ProductContext';
import { getUserById } from '@/app/lib/supabase/users';
import { getColorName } from '@/app/lib/utils/colors';

const ADMIN_PASSWORD = '0044';

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

export default function OrdersPage() {
  const router = useRouter();
  const { getProductById, updateProduct } = useProducts();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'preorders'>('orders');
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [preorderStatusFilter, setPreorderStatusFilter] = useState<Preorder['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPreorder, setSelectedPreorder] = useState<Preorder | null>(null);
  const [showOrderSidebar, setShowOrderSidebar] = useState(false);
  const [showPreorderSidebar, setShowPreorderSidebar] = useState(false);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [preorderCurrentPage, setPreorderCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 13;

  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchOrders();
      fetchPreorders();
    }
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await getAllOrders();
    if (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } else {
      setOrders(data || []);
      // Fetch client names
      if (data) {
        const names: Record<string, string> = {};
        for (const order of data) {
          if (order.user_id && !names[order.user_id]) {
            const { data: user } = await getUserById(order.user_id);
            if (user) {
              names[order.user_id] = user.name || user.phone;
            }
          }
        }
        setClientNames(names);
      }
    }
    setLoading(false);
  };

  const fetchPreorders = async () => {
    const { data, error } = await getAllPreorders();
    if (error) {
      console.error('Error fetching preorders:', error);
      setPreorders([]);
    } else {
      setPreorders(data || []);
      // Fetch client names for preorders
      if (data) {
        const names: Record<string, string> = {};
        for (const preorder of data) {
          if (preorder.user_id && !names[preorder.user_id]) {
            const { data: user } = await getUserById(preorder.user_id);
            if (user) {
              names[preorder.user_id] = user.name || user.phone;
            }
          }
        }
        setClientNames((prev) => ({ ...prev, ...names }));
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('atelierzo_admin_auth', 'true');
      setError('');
      setPassword('');
      fetchOrders();
      fetchPreorders();
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('atelierzo_admin_auth');
    router.push('/pilotage');
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    // Get the order to check previous status and restore quantities if cancelling
    const order = orders.find((o) => o.id === orderId);
    const previousStatus = order?.status;

    // If changing to cancelled, restore product quantities
    if (newStatus === 'cancelled' && previousStatus !== 'cancelled') {
      const { data: orderWithItems } = await getOrderById(orderId, true);
      if (orderWithItems?.items) {
        for (const item of orderWithItems.items) {
          try {
            const product = getProductById(item.product_id);
            if (product && product.sizeQuantities && item.size) {
              // Restore quantities for the size in the database
              const currentQty = product.sizeQuantities[item.size] || 0;
              const updatedSizeQuantities = {
                ...product.sizeQuantities,
                [item.size]: currentQty + item.quantity,
              };
              
              await updateProduct(item.product_id, {
                sizeQuantities: updatedSizeQuantities,
              });
            }
          } catch (error) {
            console.error(`Error restoring quantity for product ${item.product_id}:`, error);
          }
        }
      }
    }

    const { error } = await updateOrderStatus(orderId, newStatus);
    if (error) {
      toast.error(`Erreur lors de la mise à jour: ${error}`);
    } else {
      toast.success(`Statut de la commande mis à jour: ${STATUS_LABELS[newStatus]}`);
      fetchOrders(); // Refresh orders
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette commande ?')) return;

    try {
      const { error } = await deleteOrder(orderId);
      if (error) {
        toast.error(`Erreur: ${error}`);
      } else {
        toast.success('Commande supprimée avec succès');
        fetchOrders(); // Refresh orders
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter orders by status and search query
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch =
      searchQuery === '' ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.shipping_phone && order.shipping_phone.includes(searchQuery)) ||
      (order.shipping_address && order.shipping_address.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (clientNames[order.user_id] && clientNames[order.user_id].toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filter preorders by status and search query
  const filteredPreorders = preorders.filter((preorder) => {
    const matchesStatus = preorderStatusFilter === 'all' || preorder.status === preorderStatusFilter;
    const matchesSearch =
      searchQuery === '' ||
      preorder.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preorder.product_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      preorder.size.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (clientNames[preorder.user_id] && clientNames[preorder.user_id].toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Pagination for orders
  const totalOrderPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Pagination for preorders
  const totalPreorderPages = Math.ceil(filteredPreorders.length / ITEMS_PER_PAGE);
  const paginatedPreorders = filteredPreorders.slice(
    (preorderCurrentPage - 1) * ITEMS_PER_PAGE,
    preorderCurrentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    setPreorderCurrentPage(1);
  }, [preorderStatusFilter, searchQuery]);

  const PREORDER_STATUS_COLORS: Record<Preorder['status'], string> = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    fulfilled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  };

  const PREORDER_STATUS_LABELS: Record<Preorder['status'], string> = {
    pending: 'En attente',
    confirmed: 'Confirmée',
    cancelled: 'Annulée',
    fulfilled: 'Honorée',
  };

  const handlePreorderStatusChange = async (preorderId: string, newStatus: Preorder['status']) => {
    const { error } = await updatePreorderStatus(preorderId, newStatus);
    if (error) {
      toast.error(`Erreur lors de la mise à jour: ${error}`);
    } else {
      toast.success(`Statut de la précommande mis à jour: ${PREORDER_STATUS_LABELS[newStatus]}`);
      fetchPreorders(); // Refresh preorders
    }
  };

  const handleViewOrderDetails = async (orderId: string) => {
    const { data } = await getOrderById(orderId, true);
    if (data) {
      setSelectedOrder(data);
      setShowOrderSidebar(true);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h1 className="text-xl font-bold text-center mb-4 text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
            Accès Administrateur
          </h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                Mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                style={{ fontFamily: 'var(--font-poppins)' }}
                placeholder="Entrez le mot de passe"
                autoFocus
              />
              {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400" style={{ fontFamily: 'var(--font-poppins)' }}>{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-black dark:bg-white text-white dark:text-black py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Connexion
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <AdminNavbar onLogout={handleLogout} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-4 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === 'orders'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Commandes ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('preorders')}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === 'preorders'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Précommandes ({preorders.length})
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                {activeTab === 'orders' ? 'Commandes' : 'Précommandes'}
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                {activeTab === 'orders'
                  ? `${filteredOrders.length} commande(s) ${statusFilter !== 'all' ? `(${STATUS_LABELS[statusFilter]})` : 'au total'}`
                  : `${filteredPreorders.length} précommande(s) ${preorderStatusFilter !== 'all' ? `(${PREORDER_STATUS_LABELS[preorderStatusFilter]})` : 'au total'}`}
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'orders' ? 'Rechercher par ID, téléphone, adresse...' : 'Rechercher par ID, produit, taille...'}
                className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                style={{ fontFamily: 'var(--font-poppins)' }}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'orders' ? (
                <>
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium ${
                      statusFilter === 'all'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium ${
                      statusFilter === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    En attente
                  </button>
                  <button
                    onClick={() => setStatusFilter('processing')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium ${
                      statusFilter === 'processing'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    En traitement
                  </button>
                  <button
                    onClick={() => setStatusFilter('delivered')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium ${
                      statusFilter === 'delivered'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Terminées
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setPreorderStatusFilter('all')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium ${
                      preorderStatusFilter === 'all'
                        ? 'bg-black dark:bg-white text-white dark:text-black'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Tous
                  </button>
                  <button
                    onClick={() => setPreorderStatusFilter('pending')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium ${
                      preorderStatusFilter === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    En attente
                  </button>
                  <button
                    onClick={() => setPreorderStatusFilter('confirmed')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium ${
                      preorderStatusFilter === 'confirmed'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Confirmées
                  </button>
                  <button
                    onClick={() => setPreorderStatusFilter('fulfilled')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium ${
                      preorderStatusFilter === 'fulfilled'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Honorées
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                Chargement...
              </p>
            </div>
          ) : activeTab === 'orders' ? (
            filteredOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Montant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-mono text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {order.id.substring(0, 8)}...
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {clientNames[order.user_id] || order.shipping_phone || 'N/A'}
                        </div>
                        {order.shipping_phone && (
                          <a 
                            href={`tel:${order.shipping_phone}`}
                            className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5 hover:underline flex items-center gap-1" 
                            style={{ fontFamily: 'var(--font-poppins)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                            </svg>
                            {order.shipping_phone}
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                          {order.total_amount.toLocaleString('fr-FR')} FCFA
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer ${STATUS_COLORS[order.status]} hover:opacity-80 transition-opacity`}
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value} className="bg-white dark:bg-gray-800">
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {formatDate(order.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewOrderDetails(order.id)}
                            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Détails
                          </button>
                          {order.status === 'cancelled' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOrder(order.id);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Supprimer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h5.25c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                  />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                  {statusFilter !== 'all' ? `Aucune commande avec le statut "${STATUS_LABELS[statusFilter]}".` : 'Aucune commande enregistrée.'}
                </p>
              </div>
            )
          ) : null}

          {/* Pagination for Orders */}
          {activeTab === 'orders' && filteredOrders.length > 0 && totalOrderPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                Page {currentPage} sur {totalOrderPages} ({filteredOrders.length} commandes)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalOrderPages) }, (_, i) => {
                    let pageNum;
                    if (totalOrderPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalOrderPages - 2) {
                      pageNum = totalOrderPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalOrderPages, prev + 1))}
                  disabled={currentPage === totalOrderPages}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}

          {activeTab === 'preorders' ? (
            filteredPreorders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Produit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Taille
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Quantité
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedPreorders.map((preorder) => {
                    const product = getProductById(preorder.product_id);
                    return (
                      <tr key={preorder.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs font-mono text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {preorder.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {clientNames[preorder.user_id] || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {product?.title || preorder.product_id}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {preorder.size}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {preorder.quantity}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <select
                            value={preorder.status}
                            onChange={(e) => handlePreorderStatusChange(preorder.id, e.target.value as Preorder['status'])}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-full border-0 cursor-pointer ${PREORDER_STATUS_COLORS[preorder.status]} hover:opacity-80 transition-opacity`}
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            {Object.entries(PREORDER_STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value} className="bg-white dark:bg-gray-800">
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {formatDate(preorder.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => {
                              setSelectedPreorder(preorder);
                              setShowPreorderSidebar(true);
                            }}
                            className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Détails
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-600 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h5.25c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                {preorderStatusFilter !== 'all'
                  ? `Aucune précommande avec le statut "${PREORDER_STATUS_LABELS[preorderStatusFilter]}".`
                  : 'Aucune précommande enregistrée.'}
              </p>
            </div>
            )
          ) : null}

          {/* Pagination for Preorders */}
          {activeTab === 'preorders' && filteredPreorders.length > 0 && totalPreorderPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                Page {preorderCurrentPage} sur {totalPreorderPages} ({filteredPreorders.length} précommandes)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreorderCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={preorderCurrentPage === 1}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Précédent
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPreorderPages) }, (_, i) => {
                    let pageNum;
                    if (totalPreorderPages <= 5) {
                      pageNum = i + 1;
                    } else if (preorderCurrentPage <= 3) {
                      pageNum = i + 1;
                    } else if (preorderCurrentPage >= totalPreorderPages - 2) {
                      pageNum = totalPreorderPages - 4 + i;
                    } else {
                      pageNum = preorderCurrentPage - 2 + i;
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => setPreorderCurrentPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          preorderCurrentPage === pageNum
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPreorderCurrentPage(prev => Math.min(totalPreorderPages, prev + 1))}
                  disabled={preorderCurrentPage === totalPreorderPages}
                  className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preorder Details Sidebar */}
      <AnimatePresence mode="wait">
        {showPreorderSidebar && selectedPreorder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => {
                setShowPreorderSidebar(false);
                setSelectedPreorder(null);
              }}
              className="fixed inset-0 bg-black/50 z-100"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 35,
                mass: 0.8,
              }}
              className="fixed top-0 right-0 h-full w-[95%] max-w-2xl bg-white dark:bg-gray-800 shadow-xl z-100 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    Détails de la précommande
                  </h2>
                  <button
                    onClick={() => {
                      setShowPreorderSidebar(false);
                      setSelectedPreorder(null);
                    }}
                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Fermer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Preorder Info */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                          Précommande #{selectedPreorder.id.substring(0, 8)}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {formatDate(selectedPreorder.created_at)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${PREORDER_STATUS_COLORS[selectedPreorder.status]}`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {PREORDER_STATUS_LABELS[selectedPreorder.status]}
                      </span>
                    </div>

                    {/* Status Change */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Changer le statut
                      </label>
                      <select
                        value={selectedPreorder.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as Preorder['status'];
                          handlePreorderStatusChange(selectedPreorder.id, newStatus);
                          setSelectedPreorder({ ...selectedPreorder, status: newStatus });
                        }}
                        className={`w-full text-xs font-semibold px-3 py-2 rounded-lg border-0 cursor-pointer ${PREORDER_STATUS_COLORS[selectedPreorder.status]}`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {Object.entries(PREORDER_STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value} className="bg-white dark:bg-gray-800">
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-bold text-black dark:text-white mb-3" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                      Informations client
                    </h3>
                    <div className="space-y-2 text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Nom :</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{clientNames[selectedPreorder.user_id] || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-bold text-black dark:text-white mb-3" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                      Informations produit
                    </h3>
                    {(() => {
                      const product = getProductById(selectedPreorder.product_id);
                      return (
                        <div className="space-y-3">
                          {product && (
                            <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                              <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg">
                                <Image
                                  src={product.imageUrl}
                                  alt={product.title}
                                  fill
                                  className="object-cover"
                                  sizes="64px"
                                />
                              </div>
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                                  {product.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                                  <span>Taille: {selectedPreorder.size}</span>
                                  <span>•</span>
                                  <span>Quantité: {selectedPreorder.quantity}</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {!product && (
                            <div className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                              <p>Produit ID: {selectedPreorder.product_id}</p>
                              <p>Taille: {selectedPreorder.size}</p>
                              <p>Quantité: {selectedPreorder.quantity}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {selectedPreorder.notes && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h3 className="text-sm font-bold text-black dark:text-white mb-3" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        Notes
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {selectedPreorder.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Order Details Sidebar */}
      <AnimatePresence mode="wait">
        {showOrderSidebar && selectedOrder && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => {
                setShowOrderSidebar(false);
                setSelectedOrder(null);
              }}
              className="fixed inset-0 bg-black/50 z-100"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 35,
                mass: 0.8,
              }}
              className="fixed top-0 right-0 h-full w-[95%] max-w-2xl bg-white dark:bg-gray-800 shadow-xl z-100 overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    Détails de la commande
                  </h2>
                  <button
                    onClick={() => {
                      setShowOrderSidebar(false);
                      setSelectedOrder(null);
                    }}
                    className="p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label="Fermer"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Order Info */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-base font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                          Commande #{selectedOrder.id.substring(0, 8)}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {formatDate(selectedOrder.created_at)}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedOrder.status]}`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {STATUS_LABELS[selectedOrder.status]}
                      </span>
                    </div>

                    {/* Status Change */}
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Changer le statut
                      </label>
                      <select
                        value={selectedOrder.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as Order['status'];
                          handleStatusChange(selectedOrder.id, newStatus);
                          setSelectedOrder({ ...selectedOrder, status: newStatus });
                        }}
                        className={`w-full text-xs font-semibold px-3 py-2 rounded-lg border-0 cursor-pointer ${STATUS_COLORS[selectedOrder.status]}`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value} className="bg-white dark:bg-gray-800">
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Client Info */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h3 className="text-sm font-bold text-black dark:text-white mb-3" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                      Informations client
                    </h3>
                    <div className="space-y-2 text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400 font-medium">Nom :</span>
                        <span className="ml-2 text-gray-900 dark:text-white">{clientNames[selectedOrder.user_id] || 'N/A'}</span>
                      </div>
                      {selectedOrder.shipping_phone && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Téléphone :</span>
                          <a href={`tel:${selectedOrder.shipping_phone}`} className="ml-2 text-indigo-600 dark:text-indigo-400 hover:underline">
                            {selectedOrder.shipping_phone}
                          </a>
                        </div>
                      )}
                      {selectedOrder.shipping_address && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Adresse :</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{selectedOrder.shipping_address}</span>
                        </div>
                      )}
                      {selectedOrder.notes && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400 font-medium">Notes :</span>
                          <span className="ml-2 text-gray-900 dark:text-white">{selectedOrder.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h3 className="text-sm font-bold text-black dark:text-white mb-3" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        Articles ({selectedOrder.items.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedOrder.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-lg">
                              <Image
                                src={item.image_url}
                                alt={item.title}
                                fill
                                className="object-cover"
                                sizes="64px"
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                                {item.title}
                              </h4>
                              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
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
                                <span>Qty: {item.quantity}</span>
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

                  {/* Total */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        Total
                      </span>
                      <span className="text-xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {selectedOrder.total_amount.toLocaleString('fr-FR')} FCFA
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
