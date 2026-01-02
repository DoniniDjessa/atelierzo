'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/app/components/AdminNavbar';
import { getAllUsers, getPaginatedUsers, User } from '@/app/lib/supabase/users';
import { getClientOrders, Order } from '@/app/lib/supabase/orders';
import { motion, AnimatePresence } from 'framer-motion';

const ADMIN_PASSWORD = '0044';

export default function ClientsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [showClientSidebar, setShowClientSidebar] = useState(false);
  const [orderDateFilter, setOrderDateFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

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

  // Check if already authenticated
  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadUsers();
    }
  }, []);

  // Reload users when page changes
  useEffect(() => {
    if (isAuthenticated) {
      loadUsers();
    }
  }, [currentPage]);

  const loadUsers = async () => {
    setLoading(true);
    const { data, total, error } = await getPaginatedUsers(currentPage, ITEMS_PER_PAGE);
    if (error) {
      console.error('Error loading users:', error);
      setUsers([]);
      setTotalUsers(0);
    } else {
      setUsers(data || []);
      setTotalUsers(total);
    }
    setLoading(false);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('atelierzo_admin_auth', 'true');
      setError('');
      setPassword('');
      loadUsers();
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('atelierzo_admin_auth');
    router.push('/pilotage');
  };

  // Filter users based on search query
  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter orders based on date filter
  const getFilteredOrders = () => {
    if (orderDateFilter === 'all') return clientOrders;

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (orderDateFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'custom':
        if (!customStartDate || !customEndDate) return clientOrders;
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        return clientOrders;
    }

    return clientOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= startDate && orderDate <= endDate;
    });
  };

  // Calculate total amount from filtered orders
  const getTotalAmount = (orders: Order[]) => {
    return orders
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.total_amount, 0);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <h1 className="text-xl font-bold text-center mb-4 text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
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
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-fira-sans)' }}>
            Clients ({totalUsers})
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
            Page {currentPage} : {filteredUsers.length} client(s)
          </p>
        </div>

        {/* Search Form */}
        <div className="mb-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un client (nom ou téléphone)..."
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
        </div>

        {/* Clients List */}
        <div className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                Chargement des clients...
              </p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Nom
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Téléphone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Date d'inscription
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Dernière mise à jour
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                            <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-300" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                              {user.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                              {user.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {user.phone}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {formatDate(user.created_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {formatDate(user.updated_at)}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={async () => {
                            setSelectedClient(user);
                            setShowClientSidebar(true);
                            setOrderDateFilter('all');
                            setCustomStartDate('');
                            setCustomEndDate('');
                            setLoadingOrders(true);
                            const { data, error } = await getClientOrders(user.id);
                            if (error) {
                              console.error('Error fetching orders:', error);
                              setClientOrders([]);
                            } else {
                              setClientOrders(data || []);
                            }
                            setLoadingOrders(false);
                          }}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          Voir détails
                        </button>
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
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                {searchQuery ? 'Aucun client trouvé.' : 'Aucun client enregistré.'}
              </p>
            </div>
          )}
        </div>

        {/* Pagination for Clients */}
        {filteredUsers.length > 0 && Math.ceil(totalUsers / ITEMS_PER_PAGE) > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Page {currentPage} sur {Math.ceil(totalUsers / ITEMS_PER_PAGE)} — {totalUsers} clients au total
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
              {[...Array(Math.min(5, Math.ceil(totalUsers / ITEMS_PER_PAGE)))].map((_, i) => {
                const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
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
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalUsers / ITEMS_PER_PAGE), prev + 1))}
                disabled={currentPage === Math.ceil(totalUsers / ITEMS_PER_PAGE)}
                className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar for Client Details */}
      <AnimatePresence mode="wait">
        {showClientSidebar && selectedClient && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => {
                setShowClientSidebar(false);
                setSelectedClient(null);
              }}
              className="fixed inset-0 bg-black/50 z-[100]"
            />

            {/* Sidebar */}
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
              className="fixed top-0 right-0 h-full w-[500px] bg-white dark:bg-gray-800 z-[100] shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                    Détails du client
                  </h2>
                  <button
                    onClick={() => {
                      setShowClientSidebar(false);
                      setSelectedClient(null);
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
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Client Info */}
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                      <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-300" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                        {selectedClient.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                        {selectedClient.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {selectedClient.phone}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Inscrit le:
                      </span>
                      <span className="ml-2 font-medium text-black dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {formatDate(selectedClient.created_at)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Dernière mise à jour:
                      </span>
                      <span className="ml-2 font-medium text-black dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {formatDate(selectedClient.updated_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg p-4 mb-6">
                  <h3 className="text-sm font-bold text-black dark:text-white mb-3" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                    Statistiques
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Total commandes
                      </p>
                      <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                        {getFilteredOrders().length}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Montant total
                      </p>
                      <p className="text-lg font-bold text-green-600 dark:text-green-400" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                        {getTotalAmount(getFilteredOrders()).toLocaleString('fr-FR')} F
                      </p>
                    </div>
                  </div>
                </div>

                {/* Orders */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                      Commandes ({getFilteredOrders().length})
                    </h3>
                  </div>

                  {/* Date Filter */}
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      <button
                        onClick={() => setOrderDateFilter('all')}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          orderDateFilter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        Toutes
                      </button>
                      <button
                        onClick={() => setOrderDateFilter('today')}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          orderDateFilter === 'today'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        Aujourd'hui
                      </button>
                      <button
                        onClick={() => setOrderDateFilter('week')}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          orderDateFilter === 'week'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        7 jours
                      </button>
                      <button
                        onClick={() => setOrderDateFilter('month')}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          orderDateFilter === 'month'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        Ce mois
                      </button>
                      <button
                        onClick={() => setOrderDateFilter('custom')}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          orderDateFilter === 'custom'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                        style={{ fontFamily: 'var(--font-poppins)' }}
                      >
                        Période
                      </button>
                    </div>

                    {/* Custom Date Range */}
                    {orderDateFilter === 'custom' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                            Du
                          </label>
                          <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => setCustomStartDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                            Au
                          </label>
                          <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {loadingOrders ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                    </div>
                  ) : getFilteredOrders().length > 0 ? (
                    <div className="space-y-2">
                      {getFilteredOrders().map((order) => (
                        <div
                          key={order.id}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                          onClick={() => router.push(`/pilotage/orders/${order.id}`)}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-mono text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                              {order.id.substring(0, 8)}...
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[order.status]}`}
                              style={{ fontFamily: 'var(--font-poppins)' }}
                            >
                              {STATUS_LABELS[order.status]}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                              {order.total_amount.toLocaleString('fr-FR')} FCFA
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                              {formatDate(order.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Aucune commande pour ce client.
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
