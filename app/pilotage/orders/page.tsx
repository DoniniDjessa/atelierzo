'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import AdminNavbar from '@/app/components/AdminNavbar';
import { getAllOrders, getPaginatedOrders, getOrdersCountByStatus, updateOrderStatus, getOrderById, deleteOrder, Order } from '@/app/lib/supabase/orders';
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
  const [allOrders, setAllOrders] = useState<Order[]>([]); // For detailed view
  const [totalOrders, setTotalOrders] = useState(0);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [preorders, setPreorders] = useState<Preorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'preorders' | 'detailed'>('orders');
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<string | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<Array<{id: string; title: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Order['status'] | 'all'>('all');
  const [preorderStatusFilter, setPreorderStatusFilter] = useState<Preorder['status'] | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // New date and amount filters
  const [dateFilterType, setDateFilterType] = useState<'all' | 'day' | 'range'>('all');
  const [selectedDate, setSelectedDate] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [amountSort, setAmountSort] = useState<'none' | 'high-to-low' | 'low-to-high'>('none');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPreorder, setSelectedPreorder] = useState<Preorder | null>(null);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showOrderSidebar, setShowOrderSidebar] = useState(false);
  const [showPreorderSidebar, setShowPreorderSidebar] = useState(false);
  const [showClientSidebar, setShowClientSidebar] = useState(false);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [loadingClientOrders, setLoadingClientOrders] = useState(false);
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [preorderCurrentPage, setPreorderCurrentPage] = useState(1);
  const [detailedCurrentPage, setDetailedCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 13;
  const DETAILED_ITEMS_PER_PAGE = 20;

  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchOrders();
      fetchPreorders();
    }
  }, []);

  // Refetch orders when page changes or filters change
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [currentPage, statusFilter, searchQuery, dateFilterType, selectedDate, dateRangeStart, dateRangeEnd, amountSort]);

  // Refetch status counts when any filter changes (but not for product searches)
  useEffect(() => {
    if (isAuthenticated) {
      // Check if search query might be a product name
      const isProductSearch = searchQuery && 
        searchQuery.trim() !== '' && 
        !searchQuery.match(/^[0-9+\-\s()]+$/) && // Not a phone number
        !searchQuery.match(/^[0-9a-f\-]+$/i); // Not an ID
      
      // Only fetch status counts from server if not doing a product search
      // (product search calculates counts client-side in fetchOrders)
      if (!isProductSearch) {
        fetchStatusCounts();
      }
    }
  }, [dateFilterType, selectedDate, dateRangeStart, dateRangeEnd, searchQuery, isAuthenticated]);

  // Fetch all orders when switching to detailed tab
  useEffect(() => {
    if (isAuthenticated && activeTab === 'detailed') {
      fetchAllOrdersForDetailed();
    }
  }, [activeTab, isAuthenticated]);

  // Reset detailed page when product filter changes
  useEffect(() => {
    setDetailedCurrentPage(1);
  }, [selectedProductForDetails]);

  const fetchOrders = async () => {
    setLoading(true);
    
    // Check if search query might be a product name (not a phone, ID, or pickup number)
    const isProductSearch = searchQuery && 
      searchQuery.trim() !== '' && 
      !searchQuery.match(/^[0-9+\-\s()]+$/) && // Not a phone number
      !searchQuery.match(/^[0-9a-f\-]+$/i); // Not an ID
    
    // If searching by product, fetch all orders and filter client-side
    if (isProductSearch) {
      const { data: allOrdersData, error } = await getAllOrders();
      if (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
        setTotalOrders(0);
      } else {
        // Filter by product name client-side
        const search = searchQuery.toLowerCase();
        let filtered = (allOrdersData || []).filter(order => {
          // Apply status filter
          if (statusFilter !== 'all' && order.status !== statusFilter) {
            return false;
          }
          
          // Apply date filters
          if (dateFilterType === 'day' && selectedDate) {
            const orderDate = new Date(order.created_at).toDateString();
            const filterDate = new Date(selectedDate).toDateString();
            if (orderDate !== filterDate) return false;
          } else if (dateFilterType === 'range' && dateRangeStart && dateRangeEnd) {
            const orderDate = new Date(order.created_at);
            const startDate = new Date(dateRangeStart);
            const endDate = new Date(dateRangeEnd);
            if (orderDate < startDate || orderDate > endDate) return false;
          }
          
          // Check if any item matches the search
          return order.items && order.items.some(item => 
            item.title.toLowerCase().includes(search)
          );
        });
        
        // Apply sorting
        if (amountSort === 'high-to-low') {
          filtered.sort((a, b) => b.total_amount - a.total_amount);
        } else if (amountSort === 'low-to-high') {
          filtered.sort((a, b) => a.total_amount - b.total_amount);
        } else {
          filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        }
        
        // Paginate
        const total = filtered.length;
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE;
        const paginated = filtered.slice(from, to);
        
        setOrders(paginated);
        setTotalOrders(total);
        
        // Calculate status counts from filtered results
        const counts: Record<string, number> = {
          pending: 0,
          confirmed: 0,
          processing: 0,
          shipped: 0,
          delivered: 0,
          cancelled: 0,
        };
        filtered.forEach(order => {
          counts[order.status] = (counts[order.status] || 0) + 1;
        });
        setStatusCounts(counts);
        
        // Fetch client names
        const names: Record<string, string> = {};
        for (const order of paginated) {
          if (order.user_id && !names[order.user_id]) {
            const { data: user } = await getUserById(order.user_id);
            if (user) {
              names[order.user_id] = user.name || user.phone;
            }
          }
        }
        setClientNames(names);
      }
    } else {
      // Use server-side pagination for non-product searches
      const { data, total, error } = await getPaginatedOrders(currentPage, ITEMS_PER_PAGE, {
        statusFilter,
        searchQuery,
        dateFilterType,
        selectedDate,
        dateRangeStart,
        dateRangeEnd,
        amountSort,
      });
      if (error) {
        console.error('Error fetching orders:', error);
        setOrders([]);
        setTotalOrders(0);
      } else {
        setOrders(data || []);
        setTotalOrders(total);
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
    }
    setLoading(false);
  };

  const fetchStatusCounts = async () => {
    const { data, error } = await getOrdersCountByStatus({
      dateFilterType,
      selectedDate,
      dateRangeStart,
      dateRangeEnd,
      searchQuery,
    });
    if (error) {
      console.error('Error fetching status counts:', error);
      setStatusCounts({});
    } else {
      setStatusCounts(data || {});
    }
  };

  const fetchAllOrdersForDetailed = async () => {
    const { data, error } = await getAllOrders();
    if (error) {
      console.error('Error fetching all orders:', error);
      setAllOrders([]);
    } else {
      setAllOrders(data || []);
      // Fetch client names for all orders
      if (data) {
        const names: Record<string, string> = {};
        for (const order of data) {
          if (order.user_id && !names[order.user_id] && !clientNames[order.user_id]) {
            const { data: user } = await getUserById(order.user_id);
            if (user) {
              names[order.user_id] = user.name || user.phone;
            }
          }
        }
        setClientNames((prev) => ({ ...prev, ...names }));
      }
    }
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
        // Remove order from local state immediately
        setOrders(prev => prev.filter(order => order.id !== orderId));
        setTotalOrders(prev => prev - 1);
        // Close sidebar if this order was selected
        if (selectedOrder?.id === orderId) {
          setShowOrderSidebar(false);
          setSelectedOrder(null);
        }
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

  // Filter orders by status, search query, and date (now filtering on current page only)
  // Since we moved filtering to server-side (or client-side for product searches), we can use orders directly
  const filteredOrders = orders;

  // No need to sort here since it's done server-side
  const sortedOrders = filteredOrders;

  // Get status count from fetched counts
  const getStatusCount = (status: Order['status']) => {
    return statusCounts[status] || 0;
  };

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

  // Pagination for orders (server-side pagination, so no slicing needed)
  const totalOrderPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);
  const paginatedOrders = sortedOrders; // Already paginated from server and sorted

  // Pagination for preorders
  const totalPreorderPages = Math.ceil(filteredPreorders.length / ITEMS_PER_PAGE);
  const paginatedPreorders = filteredPreorders.slice(
    (preorderCurrentPage - 1) * ITEMS_PER_PAGE,
    preorderCurrentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, dateFilterType, selectedDate, dateRangeStart, dateRangeEnd, amountSort]);

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

  const handleViewClientDetails = async (userId: string) => {
    const { data, error } = await getUserById(userId);
    if (error) {
      toast.error('Erreur lors du chargement des détails du client');
    } else if (data) {
      setSelectedClient(data);
      setShowClientSidebar(true);
      
      // Fetch client orders
      setLoadingClientOrders(true);
      const { data: ordersData } = await getAllOrders();
      if (ordersData) {
        const userOrders = ordersData.filter(order => order.user_id === userId);
        setClientOrders(userOrders);
      }
      setLoadingClientOrders(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (value.trim().length > 0 && activeTab === 'orders') {
      // Get unique products from all orders
      const productMap = new Map<string, string>();
      orders.forEach(order => {
        if (order.items) {
          order.items.forEach(item => {
            if (item.title.toLowerCase().includes(value.toLowerCase())) {
              productMap.set(item.product_id, item.title);
            }
          });
        }
      });
      
      const suggestions = Array.from(productMap.entries())
        .map(([id, title]) => ({ id, title }))
        .slice(0, 5);
      
      setSearchSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
    } else {
      setShowSuggestions(false);
      setSearchSuggestions([]);
    }
  };
  
  const handleSelectSuggestion = (productId: string, productTitle: string) => {
    setSearchQuery(productTitle);
    setShowSuggestions(false);
    // Stay on the main orders table, just filter by the product name
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
              Commandes ({totalOrders})
            </button>
            <button
              onClick={() => setActiveTab('detailed')}
              className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === 'detailed'
                  ? 'border-black dark:border-white text-black dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Commandes détaillées
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
                {activeTab === 'orders' ? 'Commandes' : activeTab === 'detailed' ? 'Commandes détaillées' : 'Précommandes'}
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                {activeTab === 'orders'
                  ? `${totalOrders} commande(s) ${statusFilter !== 'all' ? `(${STATUS_LABELS[statusFilter]})` : ''}`
                  : activeTab === 'detailed'
                  ? 'Cliquez sur un produit pour voir toutes ses commandes'
                  : `Page ${preorderCurrentPage} : ${filteredPreorders.length} précommande(s) ${preorderStatusFilter !== 'all' ? `(${PREORDER_STATUS_LABELS[preorderStatusFilter]})` : ''}`}
              </p>
            </div>
          </div>

          {/* Search and Filters */}
          {activeTab !== 'detailed' && (
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search Bar */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => searchQuery.trim().length > 0 && setShowSuggestions(searchSuggestions.length > 0)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder={activeTab === 'orders' ? 'Rechercher par ID, téléphone, produit...' : 'Rechercher par ID, produit, taille...'}
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
              
              {/* Search Suggestions Dropdown */}
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {searchSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      onClick={() => handleSelectSuggestion(suggestion.id, suggestion.title)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                        <span className="text-gray-900 dark:text-white">{suggestion.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                      statusFilter === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    En attente
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      statusFilter === 'pending'
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {getStatusCount('pending')}
                    </span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('confirmed')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                      statusFilter === 'confirmed'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Confirmés
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      statusFilter === 'confirmed'
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {getStatusCount('confirmed')}
                    </span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('processing')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                      statusFilter === 'processing'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    En traitement
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      statusFilter === 'processing'
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {getStatusCount('processing')}
                    </span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('delivered')}
                    className={`px-3 py-2 text-xs rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
                      statusFilter === 'delivered'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Terminées
                    <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                      statusFilter === 'delivered'
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {getStatusCount('delivered')}
                    </span>
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
          )}

          {/* Advanced Filters - Only for Orders */}
          {activeTab === 'orders' && (
            <>
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="mb-3 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center gap-2"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Filtres avancés
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showAdvancedFilters && (
                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Date Filter */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Filtrer par date
                      </label>
                      <div className="space-y-2">
                        <select
                          value={dateFilterType}
                          onChange={(e) => {
                            setDateFilterType(e.target.value as 'all' | 'day' | 'range');
                            // Reset date values when changing type
                            setSelectedDate('');
                            setDateRangeStart('');
                            setDateRangeEnd('');
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          <option value="all">Toutes les dates</option>
                          <option value="day">Jour spécifique</option>
                          <option value="range">Plage de dates</option>
                        </select>

                        {dateFilterType === 'day' && (
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          />
                        )}

                        {dateFilterType === 'range' && (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Du</label>
                              <input
                                type="date"
                                value={dateRangeStart}
                                onChange={(e) => setDateRangeStart(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                style={{ fontFamily: 'var(--font-poppins)' }}
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>Au</label>
                              <input
                                type="date"
                                value={dateRangeEnd}
                                onChange={(e) => setDateRangeEnd(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                                style={{ fontFamily: 'var(--font-poppins)' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Amount Sort */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                        Trier par montant
                      </label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAmountSort(amountSort === 'high-to-low' ? 'none' : 'high-to-low')}
                          className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                            amountSort === 'high-to-low'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                          </svg>
                          Plus cher → Moins cher
                        </button>
                        <button
                          onClick={() => setAmountSort(amountSort === 'low-to-high' ? 'none' : 'low-to-high')}
                          className={`flex-1 px-3 py-2 text-xs rounded-lg transition-colors font-medium flex items-center justify-center gap-2 ${
                            amountSort === 'low-to-high'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                          }`}
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                          </svg>
                          Moins cher → Plus cher
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  {(dateFilterType !== 'all' || amountSort !== 'none') && (
                    <button
                      onClick={() => {
                        setDateFilterType('all');
                        setSelectedDate('');
                        setDateRangeStart('');
                        setDateRangeEnd('');
                        setAmountSort('none');
                      }}
                      className="mt-3 px-4 py-2 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      Réinitialiser les filtres avancés
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="overflow-hidden">
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
                <table className="w-full min-w-max">
                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Client
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      N° récupération
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Adresse de livraison
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Articles commandés
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Statut
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Notes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Montant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      ID
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: 'var(--font-poppins)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() => order.user_id && handleViewClientDetails(order.user_id)}
                          className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-left"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          {clientNames[order.user_id] || order.shipping_phone || 'N/A'}
                        </button>
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
                        <div className="text-sm font-medium text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {order.pickup_number || 'non disponible'}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {order.shipping_address || 'N/A'}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <div className="text-xs text-gray-900 dark:text-white space-y-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, idx) => (
                              <div key={idx} className="mb-2 last:mb-0">
                                <button
                                  onClick={() => {
                                    setSelectedProductForDetails(item.product_id);
                                    setActiveTab('detailed');
                                  }}
                                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer text-left"
                                >
                                  {item.title}
                                </button>
                                <div className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">
                                  Taille: {item.size} | Qté: {item.quantity}
                                </div>
                              </div>
                            ))
                          ) : (
                            <span className="text-gray-500">Aucun article</span>
                          )}
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
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {order.notes || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                          {order.total_amount.toLocaleString('fr-FR')} FCFA
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-mono text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {order.id.substring(0, 8)}...
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
          ) : activeTab === 'detailed' ? (
            // Detailed orders by product
            <div className="space-y-4">
              {selectedProductForDetails && (
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Filtré par produit
                  </span>
                  <button
                    onClick={() => setSelectedProductForDetails(null)}
                    className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Voir tous les produits ✕
                  </button>
                </div>
              )}
              {(() => {
                // Group all orders by product
                const productOrders: { [productId: string]: { product: any; orders: { order: Order; item: any }[] } } = {};
                
                allOrders.forEach(order => {
                  if (order.status !== 'cancelled' && order.items) {
                    order.items.forEach(item => {
                      const product = getProductById(item.product_id);
                      if (product) {
                        if (!productOrders[item.product_id]) {
                          productOrders[item.product_id] = {
                            product,
                            orders: []
                          };
                        }
                        productOrders[item.product_id].orders.push({ order, item });
                      }
                    });
                  }
                });

                // Filter by selected product if one is selected
                const filteredProductOrders = selectedProductForDetails
                  ? Object.entries(productOrders).filter(([productId]) => productId === selectedProductForDetails)
                  : Object.entries(productOrders);
                
                // Flatten all order items for pagination
                const allOrderItems: Array<{ productId: string; product: any; order: Order; item: any }> = [];
                filteredProductOrders.forEach(([productId, data]) => {
                  data.orders.forEach(({ order, item }) => {
                    allOrderItems.push({ productId, product: data.product, order, item });
                  });
                });

                // Paginate the flattened list
                const totalDetailedItems = allOrderItems.length;
                const totalDetailedPages = Math.ceil(totalDetailedItems / DETAILED_ITEMS_PER_PAGE);
                const paginatedDetailedItems = allOrderItems.slice(
                  (detailedCurrentPage - 1) * DETAILED_ITEMS_PER_PAGE,
                  detailedCurrentPage * DETAILED_ITEMS_PER_PAGE
                );

                // Group paginated items back by product
                const paginatedProductOrders: { [productId: string]: { product: any; orders: { order: Order; item: any }[] } } = {};
                paginatedDetailedItems.forEach(({ productId, product, order, item }) => {
                  if (!paginatedProductOrders[productId]) {
                    paginatedProductOrders[productId] = { product, orders: [] };
                  }
                  paginatedProductOrders[productId].orders.push({ order, item });
                });
                
                return (
                  <>
                    {Object.entries(paginatedProductOrders).map(([productId, data]) => (
                  <div key={productId} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {data.product.title}
                      </h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                        {data.orders.length} commande(s) - Total: {data.orders.reduce((sum, o) => sum + o.item.quantity, 0)} article(s)
                      </p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100 dark:bg-gray-700/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>Client</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>Téléphone</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>N° récupération</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>Adresse de livraison</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>Taille</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>Quantité</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>Statut</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>Date</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {data.orders.map(({ order, item }, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-4 py-2 text-xs text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                                {clientNames[order.user_id] || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                                {order.shipping_phone || 'N/A'}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                                {order.pickup_number || 'non disponible'}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-xs" style={{ fontFamily: 'var(--font-poppins)' }}>
                                <div className="line-clamp-2">{order.shipping_address || 'N/A'}</div>
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                                {item.size}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-900 dark:text-white font-semibold" style={{ fontFamily: 'var(--font-poppins)' }}>
                                {item.quantity}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[order.status]}`} style={{ fontFamily: 'var(--font-poppins)' }}>
                                  {STATUS_LABELS[order.status]}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                                {formatDate(order.created_at)}
                              </td>
                              <td className="px-4 py-2 text-xs text-gray-600 dark:text-gray-400 max-w-xs" style={{ fontFamily: 'var(--font-poppins)' }}>
                                <div className="line-clamp-2">{order.notes || '-'}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                    ))}
                    
                    {/* Pagination for Detailed View */}
                    {totalDetailedPages > 1 && (
                      <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          Page {detailedCurrentPage} sur {totalDetailedPages} — {totalDetailedItems} commande(s) détaillée(s)
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setDetailedCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={detailedCurrentPage === 1}
                            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Précédent
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalDetailedPages) }, (_, i) => {
                              let pageNum;
                              if (totalDetailedPages <= 5) {
                                pageNum = i + 1;
                              } else if (detailedCurrentPage <= 3) {
                                pageNum = i + 1;
                              } else if (detailedCurrentPage >= totalDetailedPages - 2) {
                                pageNum = totalDetailedPages - 4 + i;
                              } else {
                                pageNum = detailedCurrentPage - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => setDetailedCurrentPage(pageNum)}
                                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                                    detailedCurrentPage === pageNum
                                      ? 'bg-black dark:bg-white text-white dark:text-black font-semibold'
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
                            onClick={() => setDetailedCurrentPage(prev => Math.min(totalDetailedPages, prev + 1))}
                            disabled={detailedCurrentPage === totalDetailedPages}
                            className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            style={{ fontFamily: 'var(--font-poppins)' }}
                          >
                            Suivant
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ) : null}

          {/* Pagination for Orders */}
          {activeTab === 'orders' && filteredOrders.length > 0 && totalOrderPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                Page {currentPage} sur {totalOrderPages} — {totalOrders} commandes au total
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

      {/* Client Details Sidebar */}
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
                  <h2 className="text-base font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
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
                      <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-300" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {selectedClient.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
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

                {/* Orders */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h3 className="text-sm font-bold text-black dark:text-white mb-4" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    Commandes ({clientOrders.length})
                  </h3>
                  {loadingClientOrders ? (
                    <div className="text-center py-4">
                      <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                    </div>
                  ) : clientOrders.length > 0 ? (
                    <div className="space-y-2">
                      {clientOrders.map((order) => (
                        <div
                          key={order.id}
                          className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                          onClick={() => {
                            setShowClientSidebar(false);
                            handleViewOrderDetails(order.id);
                          }}
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
                            <span className="text-sm font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
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
