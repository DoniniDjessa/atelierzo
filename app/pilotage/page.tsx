'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Heart, Package, Calendar, Medal, Crown } from 'lucide-react';
import AdminNavbar from '@/app/components/AdminNavbar';
import { getAllOrders, Order } from '@/app/lib/supabase/orders';
import { getAllUsers } from '@/app/lib/supabase/users';
import { getAllSatisfiedClients } from '@/app/lib/supabase/satisfied-clients';
import { useProducts } from '@/app/contexts/ProductContext';
import { getMostSoldProducts } from '@/app/lib/utils/product-stats';

const ADMIN_PASSWORD = '0044';

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalClients: number;
  totalSatisfiedClients: number;
  totalProducts: number;
  totalProductsOrdered: number;
  totalProductsPurchased?: number;
  revenueChange: number;
  ordersChange: number;
  clientsChange: number;
  profitChange: number;
}

interface TopClient {
  userId: string;
  email: string;
  phone?: string;
  totalSpent: number;
  orderCount: number;
}

// Brand blue step that keeps >= 3:1 on both the light and dark card (home blue #00aeee is too light for marks)
const CHART_BAR = '#0094cf';

export default function PilotageDashboard() {
  const router = useRouter();
  const { products } = useProducts();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalClients: 0,
    totalSatisfiedClients: 0,
    totalProducts: 0,
    totalProductsOrdered: 0,
    totalProductsPurchased: 0,
    revenueChange: 0,
    ordersChange: 0,
    clientsChange: 0,
    profitChange: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<Record<string, number>>({});
  const [period, setPeriod] = useState<'custom' | 'today' | 'week' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [revenueFilterCategory, setRevenueFilterCategory] = useState<string>('all');
  const [mostSoldProducts, setMostSoldProducts] = useState<Array<{ productId: string; sales: number; revenue: number }>>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [tshirtProductsData, setTshirtProductsData] = useState<Array<{ name: string; revenue: number; sales: number }>>([]);

  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadDashboardData();
    }
  }, []);

  // Reload data when period or revenue filter changes
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [period, startDate, endDate, revenueFilterCategory]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data
      const [ordersResult, usersResult, satisfiedClientsResult] = await Promise.all([
        getAllOrders(),
        getAllUsers(),
        getAllSatisfiedClients(),
      ]);

      const orders = ordersResult.data || [];
      const users = usersResult.data || [];
      const satisfiedClients = satisfiedClientsResult.data || [];

      // Calculate revenue by period for chart
      const now = new Date();
      now.setHours(23, 59, 59, 999);
      
      let periodStart: Date;
      let periodEnd: Date = now;
      
      if (period === 'custom' && startDate && endDate) {
        periodStart = new Date(startDate);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(endDate);
        periodEnd.setHours(23, 59, 59, 999);
      } else if (period === 'today') {
        periodStart = new Date();
        periodStart.setHours(0, 0, 0, 0);
      } else if (period === 'week') {
        periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === 'month') {
        // Current month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodStart.setHours(0, 0, 0, 0);
      } else { // year
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodStart.setHours(0, 0, 0, 0);
      }

      // ---------------------------------------------------------
      // CALCULATE STATS REFLECTING FILTERS
      // ---------------------------------------------------------
      
      const PREORDER_PRODUCT_ID = '4fd85b73-8983-426d-8340-6f390f7ce4d5';

      // 1. Filter orders by date and exclude pure preorders
      const filteredOrders = orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        if (orderDate < periodStart || orderDate > periodEnd) return false;
        
        // Exclude pure preorders from all computations
        if (order.items && order.items.length > 0) {
          if (order.items.every(item => item.product_id === PREORDER_PRODUCT_ID)) return false;
        }
        return true;
      });

      // 2. Further filter for non-cancelled orders for revenue/sales stats
      const currentPeriodOrders = filteredOrders.filter(order => order.status !== 'cancelled');

      // 3. Helper to filter order items by selected category
      const getCategoryItems = (items: any[]) => {
        if (!items) return [];
        if (revenueFilterCategory === 'all') {
          return items.filter(item => item.product_id !== PREORDER_PRODUCT_ID);
        }
        return items.filter(item => {
          const product = products.find(p => p.id === item.product_id);
          return product?.category === revenueFilterCategory;
        });
      };

      // 4. Calculate Revenue for current period (filtered by category)
      const totalRevenue = currentPeriodOrders.reduce((sum, order) => {
        const categoryItems = getCategoryItems(order.items || []);
        const orderCategoryRevenue = categoryItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
        return sum + orderCategoryRevenue;
      }, 0);

      // 5. Calculate Order Count (orders containing at least one product from category)
      const totalOrders = currentPeriodOrders.filter(order => 
        getCategoryItems(order.items || []).length > 0
      ).length;

      // 6. Calculate Clients (clients who bought at least one product from category)
      const filteredUsers = users.filter(user => {
        const userOrders = currentPeriodOrders.filter(o => o.user_id === user.id);
        return userOrders.some(o => getCategoryItems(o.items || []).length > 0);
      });
      const totalClients = filteredUsers.length;

      // 7. Calculate Products Sold (non-cancelled) vs Ordered (all)
      const totalProductsPurchased = currentPeriodOrders.reduce((sum, order) => {
        const categoryItems = getCategoryItems(order.items || []);
        return sum + categoryItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
      }, 0);

      const totalProductsOrdered = filteredOrders.reduce((sum, order) => {
        const categoryItems = getCategoryItems(order.items || []);
        return sum + categoryItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
      }, 0);

      const totalSatisfiedClients = satisfiedClients.length;
      const totalProducts = revenueFilterCategory === 'all' 
        ? products.length 
        : products.filter(p => p.category === revenueFilterCategory).length;

      // ---------------------------------------------------------
      // CALCULATE CHANGES (Comparing with previous period)
      // ---------------------------------------------------------
      
      const periodDuration = now.getTime() - periodStart.getTime();
      const previousPeriodStart = new Date(periodStart.getTime() - periodDuration);
      const previousPeriodEnd = periodStart;

      const previousOrdersRaw = orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= previousPeriodStart && orderDate < previousPeriodEnd;
      });

      const previousPeriodOrders = previousOrdersRaw.filter(order => {
        if (order.status === 'cancelled') return false;
        if (order.items && order.items.length > 0) {
          if (order.items.every(item => item.product_id === PREORDER_PRODUCT_ID)) return false;
        }
        return true;
      });

      const previousRevenue = previousPeriodOrders.reduce((sum, order) => {
        const categoryItems = getCategoryItems(order.items || []);
        const orderCategoryRevenue = categoryItems.reduce((itemSum, item) => itemSum + (item.price * item.quantity), 0);
        return sum + orderCategoryRevenue;
      }, 0);

      const previousOrdersCount = previousPeriodOrders.filter(order => 
        getCategoryItems(order.items || []).length > 0
      ).length;

      const revenueChange = previousRevenue > 0 
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 
        : (totalRevenue > 0 ? 100 : 0);
      
      const ordersChange = previousOrdersCount > 0 
        ? ((totalOrders - previousOrdersCount) / previousOrdersCount) * 100 
        : (totalOrders > 0 ? 100 : 0);

      // Clients change
      const previousPeriodClients = users.filter(user => {
        const userDate = new Date(user.created_at);
        if (userDate < previousPeriodStart || userDate >= previousPeriodEnd) return false;
        
        const userPrevOrders = previousPeriodOrders.filter(o => o.user_id === user.id);
        return userPrevOrders.some(o => getCategoryItems(o.items || []).length > 0);
      }).length;
      
      const clientsChange = previousPeriodClients > 0 
        ? ((totalClients - previousPeriodClients) / previousPeriodClients) * 100 
        : (totalClients > 0 ? 100 : 0);

      // ---------------------------------------------------------
      // CHARTS DATA
      // ---------------------------------------------------------

      let chartData: { name: string; value: number }[] = [];
      
      if (revenueFilterCategory === 'all') {
        const revenueByPeriod: { [key: string]: number } = {};
        const firstSeen: { [key: string]: number } = {}; // chronological order of the labels
        currentPeriodOrders.forEach((order) => {
          const date = new Date(order.created_at);
          let key: string;
          if (period === 'today' || period === 'week') {
            key = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
          } else if (period === 'month' || period === 'custom') {
            key = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
          } else {
            key = date.toLocaleDateString('fr-FR', { month: 'short' });
          }
          revenueByPeriod[key] = (revenueByPeriod[key] || 0) + order.total_amount;
          firstSeen[key] = Math.min(firstSeen[key] ?? Infinity, date.getTime());
        });

        chartData = Object.entries(revenueByPeriod)
          .map(([name, value]) => ({ name, value: Math.round(value) }))
          .sort((a, b) => firstSeen[a.name] - firstSeen[b.name]);
      } else {
        const revenueByProduct: { [productId: string]: { name: string; revenue: number } } = {};
        currentPeriodOrders.forEach((order) => {
          const categoryItems = getCategoryItems(order.items || []);
          categoryItems.forEach((item) => {
            if (!revenueByProduct[item.product_id]) {
              revenueByProduct[item.product_id] = {
                name: item.title,
                revenue: 0,
              };
            }
            revenueByProduct[item.product_id].revenue += item.price * item.quantity;
          });
        });

        chartData = Object.values(revenueByProduct)
          .map(({ name, revenue }) => ({ name, value: Math.round(revenue) }))
          .sort((a, b) => b.value - a.value);
      }

      setRevenueData(chartData);

      // Category sales donut
      const categorySales: { [key: string]: number } = {};
      currentPeriodOrders.forEach((order) => {
        if (order.items) {
          order.items.forEach((item) => {
            const product = products.find((p) => p.id === item.product_id);
            if (product) {
              const categoryMap: Record<string, string> = {
                'bermuda': 'T-SHIRTS OVERSIZES IMPRIMES',
                'pantalon': 'Chemise Pantalon',
                'tshirt-oversize-civ': 'Tshirt Oversize CIV Champions d\'Afrique',
              };
              const category = categoryMap[product.category] || product.category;
              categorySales[category] = (categorySales[category] || 0) + item.quantity;
            }
          });
        }
      });

      setCategoryData(Object.entries(categorySales).map(([name, value]) => ({ name, value })));

      // Status counts
      const statusCounts: Record<string, number> = {};
      filteredOrders.forEach((order) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      setOrdersByStatus(statusCounts);

      // Top clients
      const clientSpending: { [userId: string]: { totalSpent: number; orderCount: number; user: any } } = {};
      currentPeriodOrders.forEach((order) => {
        const categoryItems = getCategoryItems(order.items || []);
        if (categoryItems.length > 0) {
          const orderRevenue = categoryItems.reduce((s, i) => s + (i.price * i.quantity), 0);
          if (!clientSpending[order.user_id]) {
            const user = users.find(u => u.id === order.user_id);
            clientSpending[order.user_id] = { totalSpent: 0, orderCount: 0, user };
          }
          clientSpending[order.user_id].totalSpent += orderRevenue;
          clientSpending[order.user_id].orderCount += 1;
        }
      });

      setTopClients(Object.entries(clientSpending)
        .map(([userId, data]) => ({
          userId,
          email: data.user?.email || 'Client inconnu',
          phone: data.user?.phone,
          totalSpent: data.totalSpent,
          orderCount: data.orderCount,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5));

      setStats({
        totalRevenue,
        totalOrders,
        totalClients,
        totalSatisfiedClients,
        totalProducts,
        totalProductsOrdered,
        totalProductsPurchased,
        revenueChange,
        ordersChange,
        clientsChange,
        profitChange: revenueChange * 0.8,
      });

      // Top sold products
      const productSalesMap: { [productId: string]: { sales: number; revenue: number } } = {};
      currentPeriodOrders.forEach((order) => {
        const categoryItems = getCategoryItems(order.items || []);
        categoryItems.forEach((item) => {
          if (!productSalesMap[item.product_id]) {
            productSalesMap[item.product_id] = { sales: 0, revenue: 0 };
          }
          productSalesMap[item.product_id].sales += item.quantity;
          productSalesMap[item.product_id].revenue += item.price * item.quantity;
        });
      });

      setMostSoldProducts(Object.entries(productSalesMap)
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5));

      // Tshirt products specifically
      const tshirtProducts = products.filter(p => p.category === 'tshirt-oversize-civ');
      const tshirtRevenue: { [productId: string]: { name: string; revenue: number; sales: number } } = {};
      currentPeriodOrders.forEach((order) => {
        if (order.items) {
          order.items.forEach((item) => {
            const product = tshirtProducts.find((p) => p.id === item.product_id);
            if (product) {
              if (!tshirtRevenue[product.id]) {
                tshirtRevenue[product.id] = { name: product.title, revenue: 0, sales: 0 };
              }
              tshirtRevenue[product.id].revenue += item.price * item.quantity;
              tshirtRevenue[product.id].sales += item.quantity;
            }
          });
        }
      });
      setTshirtProductsData(Object.values(tshirtRevenue).sort((a, b) => b.revenue - a.revenue));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [period, startDate, endDate, isAuthenticated, products.length]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('atelierzo_admin_auth', 'true');
      setError('');
      setPassword('');
      loadDashboardData();
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('atelierzo_admin_auth');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);
  };


  const periodLabel =
    period === 'today' ? "Aujourd'hui" : period === 'week' ? '7 derniers jours' : period === 'month' ? 'Ce mois' : period === 'year' ? 'Cette année' : 'Période personnalisée';

  const Delta = ({ value }: { value: number }) => (
    <span className={`pz-badge ${value >= 0 ? 'pz-badge-up' : 'pz-badge-down'}`} title="Par rapport à la période précédente">
      {value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value >= 0 ? '+' : ''}{value.toFixed(1)}%
    </span>
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="pz-card w-full max-w-sm p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-md object-contain" />
            <div>
              <p className="pz-eyebrow">Les Ateliers Zo</p>
              <h1 className="text-lg">Accès pilotage</h1>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block">
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
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-black dark:text-white"
                placeholder="Entrez le mot de passe"
                autoFocus
              />
              {error && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <button type="submit" className="pz-btn pz-btn-primary w-full py-2.5!">
              Connexion
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <AdminNavbar onLogout={handleLogout} />
        <div className="flex items-center justify-center py-24">
          <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-indigo-100 border-t-indigo-500"></div>
        </div>
      </div>
    );
  }

  const pendingOrders = ordersByStatus.pending || 0;
  const statusRows: { key: Order['status']; label: string }[] = [
    { key: 'pending', label: 'En attente' },
    { key: 'confirmed', label: 'Confirmées' },
    { key: 'processing', label: 'En préparation' },
    { key: 'shipped', label: 'Expédiées' },
    { key: 'delivered', label: 'Livrées' },
    { key: 'cancelled', label: 'Annulées' },
  ];
  const statusTotal = Object.values(ordersByStatus).reduce((s, n) => s + n, 0);
  const categoryTotal = categoryData.reduce((s, c) => s + c.value, 0);
  const sortedCategories = [...categoryData].sort((a, b) => b.value - a.value);
  const topProductRevenue = Math.max(1, ...mostSoldProducts.map((p) => p.revenue));
  const topClientSpent = Math.max(1, ...topClients.map((c) => c.totalSpent));

  const categoryFilters = [
    { value: 'all', label: 'Tous' },
    { value: 'tshirt-oversize-civ', label: 'Tshirt CIV' },
    { value: 'bermuda', label: 'T-shirts imprimés' },
    { value: 'pantalon', label: 'Chemise Pantalon' },
  ];

  return (
    <div className="min-h-screen">
      <AdminNavbar onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="pz-eyebrow mb-1">Tableau de bord</p>
            <h1 className="text-2xl">Vue d&apos;ensemble</h1>
            <p className="text-sm text-slate-500 mt-0.5">Activité de la boutique · {periodLabel.toLowerCase()}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="pz-seg" role="group" aria-label="Période">
              {([
                ['today', "Aujourd'hui"],
                ['week', '7 jours'],
                ['month', 'Mois'],
                ['year', 'Année'],
                ['custom', 'Personnalisée'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={period === value}
                  onClick={() => {
                    setPeriod(value);
                    if (value !== 'custom') {
                      setStartDate('');
                      setEndDate('');
                    }
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  aria-label="Date de début"
                  className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none"
                />
                <span className="text-slate-400">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  aria-label="Date de fin"
                  className="px-2.5 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white focus:outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Revenue: the one tile in solid brand blue */}
          <div className="rounded-[0.625rem] p-5 text-white bg-linear-to-br from-[#00aeee] to-[#0078a9]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[0.6875rem] font-extrabold uppercase tracking-wider text-white/80">Revenu total</p>
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-white/15 border border-white/25">
                <DollarSign className="h-4 w-4" />
              </span>
            </div>
            <p className="pz-num text-3xl text-white!">
              {formatCurrency(stats.totalRevenue)} <span className="text-sm font-semibold text-white/80">FCFA</span>
            </p>
            <p className="mt-2 inline-flex items-center gap-1 rounded bg-white/15 px-1.5 py-0.5 text-[0.6875rem] font-extrabold">
              {stats.revenueChange >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {stats.revenueChange >= 0 ? '+' : ''}{stats.revenueChange.toFixed(1)}%
              <span className="font-semibold text-white/75 normal-case">vs période préc.</span>
            </p>
          </div>

          <div className="pz-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="pz-eyebrow">Commandes</p>
              <span className="pz-stat-icon"><ShoppingCart className="h-4 w-4" /></span>
            </div>
            <p className="pz-num text-3xl">{stats.totalOrders}</p>
            <div className="mt-2 flex items-center gap-2">
              <Delta value={stats.ordersChange} />
              <span className="text-xs text-slate-500">{ordersByStatus.confirmed || 0} confirmées</span>
            </div>
          </div>

          <div className="pz-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="pz-eyebrow">Clients</p>
              <span className="pz-stat-icon"><Users className="h-4 w-4" /></span>
            </div>
            <p className="pz-num text-3xl">{stats.totalClients}</p>
            <div className="mt-2 flex items-center gap-2">
              <Delta value={stats.clientsChange} />
              <span className="text-xs text-slate-500">acheteurs</span>
            </div>
          </div>

          <div className="pz-card p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="pz-eyebrow">Articles</p>
              <span className="pz-stat-icon"><Package className="h-4 w-4" /></span>
            </div>
            <p className="pz-num text-3xl">{stats.totalProductsPurchased?.toLocaleString('fr-FR') || 0}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="pz-badge pz-badge-neutral">{stats.totalProductsOrdered.toLocaleString('fr-FR')} commandés</span>
              <span className="text-xs text-slate-500">vendus</span>
            </div>
          </div>
        </div>

        {/* Revenue + category split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="pz-card lg:col-span-2">
            <div className="pz-card-header flex-wrap">
              <div>
                <h2 className="pz-card-title">{revenueFilterCategory === 'all' ? 'Revenus' : 'Revenus par produit'}</h2>
                <p className="text-xs text-slate-500">{periodLabel} · FCFA</p>
              </div>
              <div className="pz-seg" role="group" aria-label="Catégorie">
                {categoryFilters.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={revenueFilterCategory === c.value}
                    onClick={() => setRevenueFilterCategory(c.value)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 pt-5">
              {revenueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--pz-border)" />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--pz-muted)', fontSize: 11 }} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={48}
                      tick={{ fill: 'var(--pz-muted)', fontSize: 11 }}
                      tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--pz-hover)' }}
                      contentStyle={{
                        backgroundColor: 'var(--pz-card)',
                        border: '1px solid var(--pz-border)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--pz-text)',
                      }}
                      labelStyle={{ color: 'var(--pz-muted)', fontWeight: 800 }}
                      formatter={(value: any) => [`${formatCurrency(value)} FCFA`, 'Revenu']}
                    />
                    <Bar dataKey="value" fill={CHART_BAR} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="pz-empty h-70">Aucune donnée pour cette période</div>
              )}
            </div>
          </div>

          {/* Category split: one hue + direct labels (no rainbow donut) */}
          <div className="pz-card">
            <div className="pz-card-header">
              <h2 className="pz-card-title">Ventes par catégorie</h2>
              <span className="text-xs text-slate-500">{categoryTotal} articles</span>
            </div>
            {sortedCategories.length > 0 ? (
              <ul className="p-5 space-y-4">
                {sortedCategories.map((item) => {
                  const share = categoryTotal > 0 ? (item.value / categoryTotal) * 100 : 0;
                  return (
                    <li key={item.name}>
                      <div className="flex items-baseline justify-between gap-3 mb-1.5">
                        <span className="text-sm font-semibold text-black dark:text-white truncate" title={item.name}>{item.name}</span>
                        <span className="text-xs text-slate-500 whitespace-nowrap">
                          <span className="pz-num text-sm">{item.value}</span> · {share.toFixed(0)}%
                        </span>
                      </div>
                      <div className="pz-bar"><span style={{ width: `${share}%`, background: CHART_BAR }} /></div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="pz-empty">Aucune donnée</div>
            )}
          </div>
        </div>

        {/* Order statuses + store summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="pz-card lg:col-span-2">
            <div className="pz-card-header">
              <div>
                <h2 className="pz-card-title">Statuts des commandes</h2>
                <p className="text-xs text-slate-500">{statusTotal} commande{statusTotal > 1 ? 's' : ''} sur la période, annulées comprises</p>
              </div>
              {pendingOrders > 0 && (
                <button onClick={() => router.push('/pilotage/orders')} className="pz-badge pz-badge-warn cursor-pointer">
                  {pendingOrders} à confirmer
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left">Statut</th>
                    <th className="text-right">Commandes</th>
                    <th className="text-left w-1/2">Part</th>
                  </tr>
                </thead>
                <tbody>
                  {statusRows.map((row) => {
                    const count = ordersByStatus[row.key] || 0;
                    const share = statusTotal > 0 ? (count / statusTotal) * 100 : 0;
                    return (
                      <tr key={row.key}>
                        <td className="text-black dark:text-white">{row.label}</td>
                        <td className="text-right pz-num">{count}</td>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="pz-bar flex-1"><span style={{ width: `${share}%`, background: CHART_BAR }} /></div>
                            <span className="text-xs text-slate-500 w-9 text-right">{share.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pz-card">
            <div className="pz-card-header">
              <h2 className="pz-card-title">Boutique</h2>
            </div>
            <dl className="divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { icon: Users, label: 'Clients acheteurs', value: stats.totalClients },
                { icon: Heart, label: 'Clients satisfaits affichés', value: stats.totalSatisfiedClients },
                { icon: Package, label: 'Produits disponibles', value: stats.totalProducts },
                { icon: ShoppingCart, label: 'Commandes en attente', value: pendingOrders },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3 px-5 py-3.5">
                  <Icon className="h-4 w-4 text-indigo-500" />
                  <dt className="flex-1 text-sm text-slate-600 dark:text-slate-300">{label}</dt>
                  <dd className="pz-num text-lg">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Rankings as structured tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="pz-card">
            <div className="pz-card-header">
              <h2 className="pz-card-title">Top produits</h2>
              <Medal className="h-4 w-4 text-indigo-500" />
            </div>
            {mostSoldProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left w-10">#</th>
                      <th className="text-left">Produit</th>
                      <th className="text-right">Ventes</th>
                      <th className="text-right">CA (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostSoldProducts.map((item, index) => {
                      const product = products.find((p) => p.id === item.productId);
                      if (!product) return null;
                      return (
                        <tr key={item.productId}>
                          <td><span className={`pz-rank ${index === 0 ? 'is-top' : ''}`}>{index + 1}</span></td>
                          <td className="max-w-0 w-full">
                            <p className="text-black dark:text-white truncate" title={product.title}>{product.title}</p>
                            <div className="pz-bar mt-1.5 max-w-40"><span style={{ width: `${(item.revenue / topProductRevenue) * 100}%`, background: CHART_BAR }} /></div>
                          </td>
                          <td className="text-right pz-num">{item.sales}</td>
                          <td className="text-right pz-num whitespace-nowrap">{formatCurrency(item.revenue)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pz-empty">Aucune donnée pour cette période</div>
            )}
          </div>

          <div className="pz-card">
            <div className="pz-card-header">
              <h2 className="pz-card-title">Meilleurs clients</h2>
              <Crown className="h-4 w-4 text-indigo-500" />
            </div>
            {topClients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left w-10">#</th>
                      <th className="text-left">Client</th>
                      <th className="text-right">Cmd.</th>
                      <th className="text-right">Dépensé (FCFA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map((client, index) => (
                      <tr key={client.userId}>
                        <td><span className={`pz-rank ${index === 0 ? 'is-top' : ''}`}>{index + 1}</span></td>
                        <td className="max-w-0 w-full">
                          <p className="text-black dark:text-white truncate">{client.phone || client.email}</p>
                          <div className="pz-bar mt-1.5 max-w-40"><span style={{ width: `${(client.totalSpent / topClientSpent) * 100}%`, background: CHART_BAR }} /></div>
                        </td>
                        <td className="text-right pz-num">{client.orderCount}</td>
                        <td className="text-right pz-num whitespace-nowrap">{formatCurrency(client.totalSpent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pz-empty">Aucune donnée pour cette période</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
