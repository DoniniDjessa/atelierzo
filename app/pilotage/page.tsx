'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, DollarSign, ShoppingCart, Users, Heart, Package, Calendar, Medal, Crown, Star } from 'lucide-react';
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

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

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

      // Calculate stats - use all orders for totals
      const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
      const totalOrders = orders.length;
      const totalClients = users.length;
      const totalSatisfiedClients = satisfiedClients.length;
      const totalProducts = products.length;

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

      const filteredOrders = orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= periodStart && orderDate <= periodEnd;
      });

      // Calculate revenue - either by time period or by product within category
      let chartData: { name: string; value: number }[] = [];
      
      if (revenueFilterCategory === 'all') {
        // Show revenue by time period (default behavior)
        const revenueByPeriod: { [key: string]: number } = {};
        filteredOrders.forEach((order) => {
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
        });

        chartData = Object.entries(revenueByPeriod)
          .map(([name, value]) => ({ name, value: Math.round(value) }))
          .sort((a, b) => a.name.localeCompare(b.name));
      } else {
        // Show revenue by product within selected category
        const revenueByProduct: { [productId: string]: { name: string; revenue: number } } = {};
        
        filteredOrders.forEach((order) => {
          if (order.items) {
            order.items.forEach((item) => {
              const product = products.find((p) => p.id === item.product_id);
              if (product && product.category === revenueFilterCategory) {
                if (!revenueByProduct[product.id]) {
                  revenueByProduct[product.id] = {
                    name: product.title,
                    revenue: 0,
                  };
                }
                revenueByProduct[product.id].revenue += item.price * item.quantity;
              }
            });
          }
        });

        chartData = Object.values(revenueByProduct)
          .map(({ name, revenue }) => ({ name, value: Math.round(revenue) }))
          .sort((a, b) => b.value - a.value); // Sort by revenue descending
      }

      setRevenueData(chartData);

      // Calculate category sales
      const categorySales: { [key: string]: number } = {};
      orders.forEach((order) => {
        if (order.items) {
          order.items.forEach((item) => {
            const product = products.find((p) => p.id === item.product_id);
            if (product) {
              const categoryMap: Record<string, string> = {
                'bermuda': 'Chemise Bermuda',
                'pantalon': 'Chemise Pantalon',
                'tshirt-oversize-civ': 'Tshirt Oversize CIV Champions d\'Afrique',
              };
              const category = categoryMap[product.category] || product.category;
              categorySales[category] = (categorySales[category] || 0) + item.quantity;
            }
          });
        }
      });

      const categoryChartData = Object.entries(categorySales).map(([name, value]) => ({
        name,
        value,
      }));

      setCategoryData(categoryChartData);

      // Calculate orders by status
      const statusCounts: Record<string, number> = {};
      orders.forEach((order) => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      setOrdersByStatus(statusCounts);

      // Calculate changes (comparing current period with previous period)
      const periodDuration = now.getTime() - periodStart.getTime();
      const previousPeriodStart = new Date(periodStart.getTime() - periodDuration);
      const previousPeriodEnd = periodStart;

      const currentPeriodOrders = filteredOrders;
      const previousOrders = orders.filter((order) => {
        const orderDate = new Date(order.created_at);
        return orderDate >= previousPeriodStart && orderDate < previousPeriodEnd;
      });

      const currentPeriodRevenue = currentPeriodOrders.reduce((sum, order) => sum + order.total_amount, 0);
      const previousRevenue = previousOrders.reduce((sum, order) => sum + order.total_amount, 0);
      const revenueChange = previousRevenue > 0 ? ((currentPeriodRevenue - previousRevenue) / previousRevenue) * 100 : (currentPeriodRevenue > 0 ? 100 : 0);
      const ordersChange = previousOrders.length > 0 ? ((currentPeriodOrders.length - previousOrders.length) / previousOrders.length) * 100 : (currentPeriodOrders.length > 0 ? 100 : 0);

      // For clients change, compare with last month
      const lastMonth = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const previousClients = users.filter((user) => new Date(user.created_at) < lastMonth).length;
      const clientsChange = previousClients > 0 ? ((totalClients - previousClients) / previousClients) * 100 : 0;

      // Calculate top clients
      const clientSpending: { [userId: string]: { totalSpent: number; orderCount: number; user: any } } = {};
      filteredOrders.forEach((order) => {
        if (!clientSpending[order.user_id]) {
          const user = users.find(u => u.id === order.user_id);
          clientSpending[order.user_id] = {
            totalSpent: 0,
            orderCount: 0,
            user,
          };
        }
        clientSpending[order.user_id].totalSpent += order.total_amount;
        clientSpending[order.user_id].orderCount += 1;
      });

      const topClientsList = Object.entries(clientSpending)
        .map(([userId, data]) => ({
          userId,
          email: data.user?.email || 'Client inconnu',
          phone: data.user?.phone,
          totalSpent: data.totalSpent,
          orderCount: data.orderCount,
        }))
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      setTopClients(topClientsList);

      setStats({
        totalRevenue,
        totalOrders,
        totalClients,
        totalSatisfiedClients,
        totalProducts,
        revenueChange,
        ordersChange,
        clientsChange,
        profitChange: revenueChange * 0.8, // Simplified profit (80% of revenue)
      });

      // Load most sold products from filtered orders
      const productSales: { [productId: string]: { sales: number; revenue: number } } = {};
      filteredOrders.forEach((order) => {
        if (order.items) {
          order.items.forEach((item) => {
            if (!productSales[item.product_id]) {
              productSales[item.product_id] = { sales: 0, revenue: 0 };
            }
            productSales[item.product_id].sales += item.quantity;
            productSales[item.product_id].revenue += item.price * item.quantity;
          });
        }
      });

      const topProducts = Object.entries(productSales)
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);

      setMostSoldProducts(topProducts);

      // Calculate Tshirt Oversize CIV products revenue
      const tshirtProducts = products.filter(p => p.category === 'tshirt-oversize-civ');
      const tshirtRevenue: { [productId: string]: { name: string; revenue: number; sales: number } } = {};
      
      filteredOrders.forEach((order) => {
        if (order.items) {
          order.items.forEach((item) => {
            const product = tshirtProducts.find((p) => p.id === item.product_id);
            if (product) {
              if (!tshirtRevenue[product.id]) {
                tshirtRevenue[product.id] = {
                  name: product.title,
                  revenue: 0,
                  sales: 0,
                };
              }
              tshirtRevenue[product.id].revenue += item.price * item.quantity;
              tshirtRevenue[product.id].sales += item.quantity;
            }
          });
        }
      });

      const tshirtData = Object.values(tshirtRevenue).sort((a, b) => b.revenue - a.revenue);
      setTshirtProductsData(tshirtData);
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

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
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
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black">
        <AdminNavbar onLogout={handleLogout} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      </div>
    );
  }

  const pendingOrders = ordersByStatus.pending || 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black">
      <AdminNavbar onLogout={handleLogout} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white mb-1" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              Hello, Admin! 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Bienvenue sur votre tableau de bord
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl px-3 py-2 shadow-sm border border-gray-200 dark:border-gray-700">
              <Calendar className="h-4 w-4 text-slate-400" />
              <select
                value={period}
                onChange={(e) => {
                  const newPeriod = e.target.value as typeof period;
                  setPeriod(newPeriod);
                  if (newPeriod !== 'custom') {
                    setStartDate('');
                    setEndDate('');
                  }
                }}
                className="text-sm border-none bg-transparent focus:outline-none focus:ring-0 dark:text-white cursor-pointer"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
                <option value="custom">Période personnalisée</option>
              </select>
            </div>
            {period === 'custom' && (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                />
                <span className="text-slate-400">→</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                />
              </>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue - Highlighted */}
          <div className="bg-linear-to-br from-indigo-600 to-purple-600 rounded-3xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/80" style={{ fontFamily: 'var(--font-poppins)' }}>
                Revenu Total
              </h3>
              <div className="p-2 bg-white/20 rounded-full">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <p className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              {formatCurrency(stats.totalRevenue)} FCFA
            </p>
            <div className="flex items-center gap-2">
              {stats.revenueChange >= 0 ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium text-green-200">+{stats.revenueChange.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-medium text-red-200">{stats.revenueChange.toFixed(1)}%</span>
                </>
              )}
            </div>
          </div>

          {/* Total Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                Commandes
              </h3>
              <div className="p-2 bg-slate-100 dark:bg-gray-700 rounded-full">
                <ShoppingCart className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              {stats.totalOrders}
            </p>
            <div className="flex items-center gap-2">
              {stats.ordersChange >= 0 ? (
                <>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                    +{stats.ordersChange.toFixed(1)}%
                  </span>
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                    {stats.ordersChange.toFixed(1)}%
                  </span>
                  <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                </>
              )}
            </div>
          </div>

          {/* Total Clients */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                Clients
              </h3>
              <div className="p-2 bg-slate-100 dark:bg-gray-700 rounded-full">
                <Users className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              {stats.totalClients}
            </p>
            <div className="flex items-center gap-2">
              {stats.clientsChange >= 0 ? (
                <>
                  <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                    +{stats.clientsChange.toFixed(1)}%
                  </span>
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                </>
              ) : (
                <>
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded-full">
                    {stats.clientsChange.toFixed(1)}%
                  </span>
                  <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                </>
              )}
            </div>
          </div>

          {/* Products */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                Produits
              </h3>
              <div className="p-2 bg-slate-100 dark:bg-gray-700 rounded-full">
                <Package className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              {stats.totalProducts}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                produits en ligne
              </span>
            </div>
          </div>
        </div>

        {/* Detail Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Bar Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                {revenueFilterCategory === 'all' ? 'Revenus' : 'Revenus par Produit'}
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                {period === 'today' ? "Aujourd'hui" : period === 'week' ? '7 derniers jours' : period === 'month' ? 'Ce mois' : period === 'year' ? 'Cette année' : 'Période personnalisée'}
              </span>
            </div>
            {/* Category Filter */}
            <div className="mb-4 flex gap-2 flex-wrap">
              <button
                onClick={() => setRevenueFilterCategory('all')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                  revenueFilterCategory === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Tous les produits
              </button>
              <button
                onClick={() => setRevenueFilterCategory('tshirt-oversize-civ')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                  revenueFilterCategory === 'tshirt-oversize-civ'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Tshirt Oversize CIV Champions d'Afrique
              </button>
              <button
                onClick={() => setRevenueFilterCategory('bermuda')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                  revenueFilterCategory === 'bermuda'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Chemise Bermuda
              </button>
              <button
                onClick={() => setRevenueFilterCategory('pantalon')}
                className={`px-3 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                  revenueFilterCategory === 'pantalon'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Chemise Pantalon
              </button>
            </div>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-gray-700" />
                  <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: any) => [`${formatCurrency(value)} FCFA`, 'Revenu']}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-75 flex items-center justify-center text-slate-400">
                <p className="text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>Aucune donnée pour cette période</p>
              </div>
            )}
          </div>

          {/* Category Sales Donut Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <h2 className="text-lg font-bold text-black dark:text-white mb-6" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              Ventes par Catégorie
            </h2>
            {categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {categoryData.map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-75 flex items-center justify-center text-slate-400">
                <p className="text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>Aucune donnée</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Orders Status */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                Statuts des Commandes
              </h2>
              <Package className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    {stats.totalOrders}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                    commandes au total
                  </p>
                </div>
              </div>
              {pendingOrders > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-red-600 dark:text-red-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                    {pendingOrders} commande{pendingOrders > 1 ? 's' : ''} en attente de confirmation
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                    En attente
                  </p>
                  <p className="text-lg font-bold text-yellow-600" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    {ordersByStatus.pending || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Livrées
                  </p>
                  <p className="text-lg font-bold text-green-600" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    {ordersByStatus.delivered || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Clients Status */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                Clients
              </h2>
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                    {stats.totalClients}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                    clients enregistrés
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-gray-700">
                <p className="text-sm text-slate-600 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                  {stats.totalSatisfiedClients} client{stats.totalSatisfiedClients > 1 ? 's' : ''} satisfait{stats.totalSatisfiedClients > 1 ? 's' : ''} affiché{stats.totalSatisfiedClients > 1 ? 's' : ''} sur le site
                </p>
              </div>
              <div className="pt-4 border-t border-slate-200 dark:border-gray-700">
                <p className="text-sm text-slate-600 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                  {stats.totalProducts} produit{stats.totalProducts > 1 ? 's' : ''} disponible{stats.totalProducts > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tshirt Oversize CIV Products Chart - Hidden for now */}
        {false && (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              📊 Produits Tshirt Oversize CIV Champions d'Afrique
            </h2>
            <Package className="h-5 w-5 text-purple-500" />
          </div>
          {(() => {
            const tshirtProducts = products.filter(p => p.category === 'tshirt-oversize-civ');
            const productRevenue: { [productId: string]: { name: string; revenue: number; sales: number } } = {};
            
            // Use the same period filtering as the main revenue chart
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
              periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
              periodStart.setHours(0, 0, 0, 0);
            } else {
              periodStart = new Date(now.getFullYear(), 0, 1);
              periodStart.setHours(0, 0, 0, 0);
            }

            if (tshirtProductsData.length === 0) {
              return (
                <div className="h-75 flex items-center justify-center text-slate-400">
                  <p className="text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Aucune donnée pour le moment
                  </p>
                </div>
              );
            }

            return (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tshirtProductsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px', fontFamily: 'var(--font-poppins)' }}
                    angle={-45}
                    textAnchor="end"
                    height={100}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    style={{ fontSize: '12px', fontFamily: 'var(--font-poppins)' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '12px',
                      fontFamily: 'var(--font-poppins)',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} FCFA`, 'Revenus']}
                  />
                  <Bar dataKey="revenue" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            );
          })()}
          
          {/* Summary stats for Tshirt products */}
          {tshirtProductsData.length > 0 && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Produits
                </p>
                <p className="text-2xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                  {tshirtProductsData.length}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Ventes totales
                </p>
                <p className="text-2xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                  {tshirtProductsData.reduce((sum, p) => sum + p.sales, 0)}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Revenus totaux
                </p>
                <p className="text-2xl font-bold text-emerald-600" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                  {tshirtProductsData.reduce((sum, p) => sum + p.revenue, 0).toLocaleString()} FCFA
                </p>
              </div>
            </div>
          )}
        </div>
        )}

        {/* Product Ranking and Best Clients */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Product Ranking */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                🏆 Top Produits
              </h2>
              <Medal className="h-5 w-5 text-amber-500" />
            </div>
            {mostSoldProducts.length > 0 ? (
              <div className="space-y-3">
                {mostSoldProducts.map((item, index) => {
                  const product = products.find((p) => p.id === item.productId);
                  if (!product) return null;
                  const medals = ['🥇', '🥈', '🥉'];
                  return (
                    <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-700 rounded-xl hover:scale-[1.02] transition-transform">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xl">
                        {medals[index] || `${index + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-black dark:text-white truncate" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                          {product.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {item.sales} commandes
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400 font-semibold" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {formatCurrency(item.revenue)} FCFA
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-50 flex items-center justify-center text-slate-400">
                <p className="text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>Aucune donnée pour cette période</p>
              </div>
            )}
          </div>

          {/* Best Clients Ranking */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                👑 Meilleurs Clients
              </h2>
              <Crown className="h-5 w-5 text-purple-500" />
            </div>
            {topClients.length > 0 ? (
              <div className="space-y-3">
                {topClients.map((client, index) => {
                  const medals = ['👑', '⭐', '💎'];
                  return (
                    <div key={client.userId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-700 rounded-xl hover:scale-[1.02] transition-transform">
                      <div className="shrink-0 w-10 h-10 rounded-full bg-linear-to-br from-purple-400 to-purple-600 flex items-center justify-center text-xl">
                        {medals[index] || `${index + 1}`}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-black dark:text-white truncate" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                          {client.phone || client.email}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {client.orderCount} commande{client.orderCount > 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400 font-semibold" style={{ fontFamily: 'var(--font-poppins)' }}>
                            {formatCurrency(client.totalSpent)} FCFA
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-50 flex items-center justify-center text-slate-400">
                <p className="text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>Aucune donnée pour cette période</p>
              </div>
            )}
          </div>
        </div>

        {/* Most Sold Products - Legacy Section (can be removed if not needed) */}
        {false && mostSoldProducts.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                Produits les plus vendus
              </h2>
              <Package className="h-5 w-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {mostSoldProducts.map((item, index) => {
                const product = products.find((p) => p.id === item.productId);
                if (!product) return null;
                return (
                  <div key={item.productId} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-gray-700 rounded-lg">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-black dark:text-white truncate" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                        {product.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-600 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {item.sales} commandes
                        </span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {item.revenue.toLocaleString('fr-FR')} XOF
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
