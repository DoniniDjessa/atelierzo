'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, DollarSign, ShoppingCart, Users, Heart, Package } from 'lucide-react';
import AdminNavbar from '@/app/components/AdminNavbar';
import { getAllOrders, Order } from '@/app/lib/supabase/orders';
import { getAllUsers } from '@/app/lib/supabase/users';
import { getAllSatisfiedClients } from '@/app/lib/supabase/satisfied-clients';
import { useProducts } from '@/app/contexts/ProductContext';

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
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      loadDashboardData();
    }
  }, []);

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
      const periods: { [key: string]: { start: Date; label: string } } = {
        week: {
          start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          label: '7 derniers jours',
        },
        month: {
          start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          label: '30 derniers jours',
        },
        year: {
          start: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          label: '12 derniers mois',
        },
      };

      const periodStart = periods[period].start;
      const filteredOrders = orders.filter((order) => new Date(order.created_at) >= periodStart);

      // Calculate revenue by day/month for bar chart
      const revenueByPeriod: { [key: string]: number } = {};
      filteredOrders.forEach((order) => {
        const date = new Date(order.created_at);
        let key: string;
        if (period === 'week') {
          key = date.toLocaleDateString('fr-FR', { weekday: 'short' });
        } else if (period === 'month') {
          key = date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        } else {
          key = date.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
        }
        revenueByPeriod[key] = (revenueByPeriod[key] || 0) + order.total_amount;
      });

      const chartData = Object.entries(revenueByPeriod)
        .map(([name, value]) => ({ name, value: Math.round(value) }))
        .sort((a, b) => {
          // Sort by date (simplified, you might want better date parsing)
          return a.name.localeCompare(b.name);
        });

      setRevenueData(chartData);

      // Calculate category sales
      const categorySales: { [key: string]: number } = {};
      orders.forEach((order) => {
        if (order.items) {
          order.items.forEach((item) => {
            const product = products.find((p) => p.id === item.product_id);
            if (product) {
              const category = product.category === 'bermuda' ? 'Chemise Bermuda' : 'Chemise Pantalon';
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
  }, [period, isAuthenticated, products.length]);

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
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
            </select>
            <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-white dark:hover:bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Revenue - Highlighted */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl shadow-lg p-6 text-white">
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

          {/* Profit / Clients Satisfaits */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-medium text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                Clients Satisfaits
              </h3>
              <div className="p-2 bg-slate-100 dark:bg-gray-700 rounded-full">
                <Heart className="h-4 w-4 text-slate-600 dark:text-slate-300" />
              </div>
            </div>
            <p className="text-2xl font-bold text-black dark:text-white mb-2" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              {stats.totalSatisfiedClients}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                sur {stats.totalClients} clients
              </span>
            </div>
          </div>
        </div>

        {/* Detail Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Bar Chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                Revenus
              </h2>
              <span className="text-sm text-slate-500 dark:text-slate-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                {period === 'week' ? '7 derniers jours' : period === 'month' ? '30 derniers jours' : '12 derniers mois'}
              </span>
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
              <div className="h-[300px] flex items-center justify-center text-slate-400">
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
              <div className="h-[300px] flex items-center justify-center text-slate-400">
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
      </div>
    </div>
  );
}
