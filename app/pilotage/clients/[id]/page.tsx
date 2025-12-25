'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AdminNavbar from '@/app/components/AdminNavbar';
import { getUserById, User } from '@/app/lib/supabase/users';
import { getClientOrders, Order } from '@/app/lib/supabase/orders';

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

export default function ClientDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [client, setClient] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      fetchData();
    }
  }, [clientId]);

  const fetchData = async () => {
    setLoading(true);
    const [userResult, ordersResult] = await Promise.all([
      getUserById(clientId),
      getClientOrders(clientId),
    ]);

    if (userResult.error) {
      console.error('Error fetching client:', userResult.error);
      setClient(null);
    } else {
      setClient(userResult.data);
    }

    if (ordersResult.error) {
      console.error('Error fetching orders:', ordersResult.error);
      setOrders([]);
    } else {
      setOrders(ordersResult.data || []);
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
      fetchData();
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('atelierzo_admin_auth');
    router.push('/pilotage');
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
        {/* Back Button */}
        <button
          onClick={() => router.push('/pilotage/clients')}
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
          <span>Retour aux clients</span>
        </button>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Chargement...
            </p>
          </div>
        ) : client ? (
          <>
            {/* Client Info */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-300" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1
                    className="text-2xl font-bold text-black dark:text-white mb-1"
                    style={{ fontFamily: 'var(--font-fira-sans)' }}
                  >
                    {client.name}
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                    {client.phone}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Inscrit le:
                  </span>
                  <span className="ml-2 font-medium text-black dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                    {formatDate(client.created_at)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Dernière mise à jour:
                  </span>
                  <span className="ml-2 font-medium text-black dark:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                    {formatDate(client.updated_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* Orders */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2
                  className="text-xl font-bold text-black dark:text-white"
                  style={{ fontFamily: 'var(--font-fira-sans)' }}
                >
                  Commandes ({orders.length})
                </h2>
              </div>

              {orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider" style={{ fontFamily: 'var(--font-poppins)' }}>
                          ID
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
                      {orders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                              {order.id.substring(0, 8)}...
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                              {order.total_amount.toLocaleString('fr-FR')} FCFA
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_COLORS[order.status]}`}
                              style={{ fontFamily: 'var(--font-poppins)' }}
                            >
                              {STATUS_LABELS[order.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-600 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                              {formatDate(order.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => router.push(`/pilotage/orders/${order.id}`)}
                              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors text-xs"
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
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h5.25c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
                    />
                  </svg>
                  <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Aucune commande pour ce client.
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Client non trouvé.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

