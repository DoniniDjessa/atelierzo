'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AdminNavbar from '@/app/components/AdminNavbar';
import { getAllPayments, updatePaymentStatus, Payment, PaymentStatus } from '@/app/lib/supabase/payments';

const ADMIN_PASSWORD = '0044';

const STATUS_COLORS: Record<PaymentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  validated: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'En attente',
  validated: 'Validé',
  cancelled: 'Annulé',
};

const METHOD_LABELS: Record<string, string> = {
  wave: 'Wave',
  orange: 'Orange Money',
  mtn: 'MTN Money',
  moov: 'Moov Money',
};

export default function PilotPaiementsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem('atelierzo_admin_auth');
    if (auth === 'true') setIsAuthenticated(true);
    else setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) loadPayments();
  }, [isAuthenticated]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('atelierzo_admin_auth', 'true');
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('atelierzo_admin_auth');
    router.push('/pilotage');
  };

  const loadPayments = async () => {
    setLoading(true);
    const { data, error } = await getAllPayments();
    if (error) {
      toast.error('Erreur lors du chargement des paiements');
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (paymentId: string, status: PaymentStatus) => {
    const { error } = await updatePaymentStatus(paymentId, status);
    if (error) {
      toast.error(`Erreur: ${error}`);
    } else {
      toast.success(`Paiement ${STATUS_LABELS[status].toLowerCase()}`);
      setPayments((prev) => prev.map((p) => p.id === paymentId ? { ...p, status } : p));
      if (selectedPayment?.id === paymentId) {
        setSelectedPayment((prev) => prev ? { ...prev, status } : null);
      }
    }
  };

  // Derived stats (on all payments, not filtered)
  const totalPending = payments.filter((p) => p.status === 'pending').length;
  const totalValidated = payments.filter((p) => p.status === 'validated').length;
  const totalCancelled = payments.filter((p) => p.status === 'cancelled').length;
  const totalAmount = payments.filter((p) => p.status === 'validated').reduce((s, p) => s + p.amount, 0);
  const pendingAmount = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  // Filtered list
  const filtered = payments.filter((p) => {
    const matchSearch = !searchQuery ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.customer_phone?.includes(searchQuery) ||
      p.payment_phone?.includes(searchQuery) ||
      p.items.some((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchMethod = methodFilter === 'all' || p.payment_method === methodFilter;

    const pDate = new Date(p.created_at);
    const matchFrom = !dateFrom || pDate >= new Date(dateFrom);
    const matchTo = !dateTo || pDate <= new Date(new Date(dateTo).setHours(23, 59, 59, 999));

    const matchMin = !amountMin || p.amount >= Number(amountMin);
    const matchMax = !amountMax || p.amount <= Number(amountMax);

    return matchSearch && matchStatus && matchMethod && matchFrom && matchTo && matchMin && matchMax;
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8 max-w-sm w-full">
          <h1 className="text-2xl font-bold text-black dark:text-white mb-6 text-center" style={{ fontFamily: 'var(--font-fira-sans)' }}>
            Pilotage — Paiements
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Mot de passe"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
          {authError && <p className="text-red-500 text-sm mb-3">{authError}</p>}
          <button
            onClick={handleLogin}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
          >
            Accéder
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <AdminNavbar onLogout={handleLogout} />
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
            Paiements mobiles
          </h1>
          <button
            onClick={loadPayments}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Actualiser
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
            <p className="text-xl font-bold text-black dark:text-white">{payments.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <p className="text-xs text-yellow-600 mb-1">En attente</p>
            <p className="text-xl font-bold text-black dark:text-white">{totalPending}</p>
            <p className="text-xs text-gray-400 mt-1">{pendingAmount.toLocaleString('fr-FR')} FCFA</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <p className="text-xs text-green-600 mb-1">Validés</p>
            <p className="text-xl font-bold text-black dark:text-white">{totalValidated}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
            <p className="text-xs text-red-600 mb-1">Annulés</p>
            <p className="text-xl font-bold text-black dark:text-white">{totalCancelled}</p>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-700 rounded-xl shadow-sm p-4 text-white col-span-2 sm:col-span-1">
            <p className="text-xs opacity-80 mb-1">Revenu validé</p>
            <p className="text-xl font-bold">{totalAmount.toLocaleString('fr-FR')} FCFA</p>
          </div>
        </div>

        {/* Search & filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID, client, téléphone, produit..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | 'all')}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="pending">En attente</option>
              <option value="validated">Validés</option>
              <option value="cancelled">Annulés</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">Tous les modes</option>
              <option value="wave">Wave</option>
              <option value="orange">Orange Money</option>
              <option value="mtn">MTN Money</option>
              <option value="moov">Moov Money</option>
            </select>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white transition-colors"
            >
              {showFilters ? '− Moins' : '+ Filtres'}
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date début</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Date fin</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Montant min (FCFA)</label>
                <input type="number" value={amountMin} onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Montant max (FCFA)</label>
                <input type="number" value={amountMax} onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="999999"
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none" />
              </div>
              <button
                onClick={() => { setSearchQuery(''); setStatusFilter('all'); setMethodFilter('all'); setDateFrom(''); setDateTo(''); setAmountMin(''); setAmountMax(''); }}
                className="text-xs text-red-500 hover:text-red-700 font-medium col-span-2 sm:col-span-4 text-left"
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filtered.length} paiement{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
            </p>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              Aucun paiement trouvé
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Client</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Mode</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tél. paiement</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filtered.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        <button onClick={() => setSelectedPayment(payment)} className="hover:text-indigo-600 dark:hover:text-indigo-400">
                          #{payment.id.substring(0, 8).toUpperCase()}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {new Date(payment.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{payment.customer_name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{payment.customer_phone}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 capitalize">
                        {METHOD_LABELS[payment.payment_method] || payment.payment_method}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{payment.payment_phone}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                        {payment.amount.toLocaleString('fr-FR')} FCFA
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[payment.status]}`}>
                          {STATUS_LABELS[payment.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {payment.status !== 'validated' && (
                            <button
                              onClick={() => handleUpdateStatus(payment.id, 'validated')}
                              className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                            >
                              Valider
                            </button>
                          )}
                          {payment.status !== 'cancelled' && (
                            <button
                              onClick={() => handleUpdateStatus(payment.id, 'cancelled')}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700 transition-colors"
                            >
                              Annuler
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPayment(payment)}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            Détails
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail modal */}
      {selectedPayment && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-black dark:text-white text-lg">
                  Paiement #{selectedPayment.id.substring(0, 8).toUpperCase()}
                </h3>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[selectedPayment.status]}`}>
                  {STATUS_LABELS[selectedPayment.status]}
                </span>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Date</p>
                  <p className="font-medium text-black dark:text-white">
                    {new Date(selectedPayment.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Client</p>
                  <p className="font-medium text-black dark:text-white">{selectedPayment.customer_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{selectedPayment.customer_phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Mode paiement</p>
                  <p className="font-medium text-black dark:text-white capitalize">{METHOD_LABELS[selectedPayment.payment_method]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Numéro Wave</p>
                  <p className="font-medium text-black dark:text-white">{selectedPayment.payment_phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Montant</p>
                  <p className="text-xl font-bold text-black dark:text-white">{selectedPayment.amount.toLocaleString('fr-FR')} FCFA</p>
                </div>
                {selectedPayment.shipping_address && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Adresse livraison</p>
                    <p className="font-medium text-black dark:text-white text-xs">{selectedPayment.shipping_address}</p>
                  </div>
                )}
              </div>

              {selectedPayment.notes && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Notes</p>
                  <p className="text-sm text-black dark:text-white">{selectedPayment.notes}</p>
                </div>
              )}

              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Articles commandés</p>
                <div className="space-y-2">
                  {selectedPayment.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-black dark:text-white">{item.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Taille: {item.size} · Couleur: {item.color} · Qté: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-black dark:text-white whitespace-nowrap ml-3">
                        {(item.price * item.quantity).toLocaleString('fr-FR')} FCFA
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                {selectedPayment.status !== 'validated' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedPayment.id, 'validated')}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors text-sm"
                  >
                    Valider le paiement
                  </button>
                )}
                {selectedPayment.status !== 'cancelled' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedPayment.id, 'cancelled')}
                    className="flex-1 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors text-sm"
                  >
                    Annuler
                  </button>
                )}
                {selectedPayment.status === 'validated' && (
                  <button
                    onClick={() => handleUpdateStatus(selectedPayment.id, 'pending')}
                    className="flex-1 py-2.5 bg-yellow-500 text-white rounded-lg font-semibold hover:bg-yellow-600 transition-colors text-sm"
                  >
                    Remettre en attente
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
