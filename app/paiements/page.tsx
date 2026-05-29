'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/app/contexts/UserContext';
import { getUserPayments, Payment } from '@/app/lib/supabase/payments';
import PageTitle from '@/app/components/PageTitle';
import Footer from '@/app/components/Footer';

const STATUS_COLORS: Record<Payment['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  validated: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const STATUS_LABELS: Record<Payment['status'], string> = {
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

export default function PaiementsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/');
      return;
    }
    loadPayments();
  }, [user, router]);

  const loadPayments = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data, error } = await getUserPayments(user.id);
    if (error) {
      console.error('Error loading payments:', error);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  if (!user) return null;

  const totalPending = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalValidated = payments.filter((p) => p.status === 'validated').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <PageTitle title="Mes paiements" />

        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white" />
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Total paiements
                </p>
                <p className="text-2xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                  {payments.length}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                  En attente
                </p>
                <p className="text-2xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                  {totalPending.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4">
                <p className="text-xs text-green-600 dark:text-green-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Validés
                </p>
                <p className="text-2xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                  {totalValidated.toLocaleString('fr-FR')} FCFA
                </p>
              </div>
            </div>

            {payments.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 dark:text-gray-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Aucun paiement pour le moment
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setSelectedPayment(payment)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <svg className="h-4 w-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <h3 className="text-sm font-semibold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                              #{payment.id.substring(0, 8).toUpperCase()}
                            </h3>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[payment.status]}`} style={{ fontFamily: 'var(--font-poppins)' }}>
                            {STATUS_LABELS[payment.status]}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {new Date(payment.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {METHOD_LABELS[payment.payment_method] || payment.payment_method} · {payment.payment_phone}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                          {payment.amount.toLocaleString('fr-FR')} FCFA
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500" style={{ fontFamily: 'var(--font-poppins)' }}>
                          {payment.items.length} article{payment.items.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <Footer />

      {/* Detail modal */}
      {selectedPayment && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
                  Paiement #{selectedPayment.id.substring(0, 8).toUpperCase()}
                </h3>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLORS[selectedPayment.status]}`}>
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
                    {new Date(selectedPayment.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Mode</p>
                  <p className="font-medium text-black dark:text-white capitalize">{METHOD_LABELS[selectedPayment.payment_method]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Numéro</p>
                  <p className="font-medium text-black dark:text-white">{selectedPayment.payment_phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Montant</p>
                  <p className="font-bold text-black dark:text-white">{selectedPayment.amount.toLocaleString('fr-FR')} FCFA</p>
                </div>
              </div>
              {selectedPayment.shipping_address && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Adresse</p>
                  <p className="text-sm text-black dark:text-white">{selectedPayment.shipping_address}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Articles</p>
                <div className="space-y-2">
                  {selectedPayment.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                      <div>
                        <p className="font-medium text-black dark:text-white">{item.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Taille: {item.size} · Qté: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-black dark:text-white">{(item.price * item.quantity).toLocaleString('fr-FR')} FCFA</p>
                    </div>
                  ))}
                </div>
              </div>
              {selectedPayment.status === 'pending' && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 text-center" style={{ fontFamily: 'var(--font-poppins)' }}>
                    Votre paiement est en cours de validation par notre équipe.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
