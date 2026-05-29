"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { createPayment, PaymentMethod } from "@/app/lib/supabase/payments";
import { getColorName } from "@/app/lib/utils/colors";

interface CartItem {
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  size: string;
  color?: string;
  quantity: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  total: number;
  items: CartItem[];
  userId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  notes?: string;
}

const METHODS: { id: PaymentMethod; label: string; logo: string; ext: string; enabled: boolean }[] = [
  { id: 'wave', label: 'Wave', logo: '/money/wave', ext: 'png', enabled: true },
  { id: 'orange', label: 'Orange Money', logo: '/money/orange', ext: 'png', enabled: false },
  { id: 'mtn', label: 'MTN Money', logo: '/money/MTN', ext: 'jpg', enabled: false },
  { id: 'moov', label: 'Moov Money', logo: '/money/moov', ext: 'png', enabled: false },
];

export default function PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  total,
  items,
  userId,
  customerName,
  customerPhone,
  shippingAddress,
  notes,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('wave');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handlePay = async () => {
    if (!paymentPhone.trim()) {
      toast.error('Veuillez entrer votre numéro Wave');
      return;
    }

    setIsProcessing(true);

    const paymentItems = items.map((item) => ({
      product_id: item.productId,
      title: item.title,
      size: item.size,
      color: getColorName(item.color) || item.color || 'N/A',
      quantity: item.quantity,
      price: item.price,
      image_url: item.imageUrl,
    }));

    const { data, error } = await createPayment({
      user_id: userId,
      customer_name: customerName,
      customer_phone: customerPhone,
      payment_phone: paymentPhone,
      payment_method: selectedMethod,
      amount: total,
      items: paymentItems,
      shipping_address: shippingAddress,
      notes,
    });

    if (error || !data) {
      toast.error(`Erreur: ${error || 'Impossible de créer le paiement'}`);
      setIsProcessing(false);
      return;
    }

    const waveUrl = `https://pay.wave.com/m/M_ci_Jq12xik9J4KD/c/ci/?amount=${total}`;
    window.open(waveUrl, '_blank');

    setIsProcessing(false);
    onSuccess(data.id);
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2
            className="text-lg font-bold text-black dark:text-white"
            style={{ fontFamily: 'var(--font-fira-sans)' }}
          >
            Choisir un mode de paiement
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Total */}
          <div className="text-center py-2">
            <p className="text-sm text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
              Montant à payer
            </p>
            <p className="text-2xl font-bold text-black dark:text-white" style={{ fontFamily: 'var(--font-fira-sans)' }}>
              {total.toLocaleString('fr-FR')} FCFA
            </p>
          </div>

          {/* Payment methods */}
          <div className="grid grid-cols-2 gap-3">
            {METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => method.enabled && setSelectedMethod(method.id)}
                disabled={!method.enabled}
                className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all
                  ${method.enabled
                    ? selectedMethod === method.id
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-cyan-300'
                    : 'border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed'
                  }`}
              >
                <div className="relative w-12 h-12">
                  <Image
                    src={`${method.logo}.${method.ext}`}
                    alt={method.label}
                    fill
                    className="object-contain rounded"
                  />
                </div>
                <span
                  className="text-xs font-medium text-gray-700 dark:text-gray-300 text-center"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {method.label}
                </span>
                {!method.enabled && (
                  <span className="absolute top-1 right-1 text-[9px] bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1 rounded">
                    Bientôt
                  </span>
                )}
                {method.enabled && selectedMethod === method.id && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-cyan-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Phone input */}
          <div>
            <label
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Numéro Wave *
            </label>
            <input
              type="tel"
              value={paymentPhone}
              onChange={(e) => setPaymentPhone(e.target.value)}
              placeholder="Ex: 0707000000"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-gray-800 dark:text-white"
              style={{ fontFamily: 'var(--font-poppins)' }}
            />
          </div>

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={isProcessing}
            className="w-full px-6 py-3 bg-gradient-to-r from-cyan-400 to-cyan-700 hover:from-cyan-500 hover:to-cyan-800 text-white rounded-lg transition-all transform hover:scale-105 active:scale-95 font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            {isProcessing ? 'Traitement...' : 'Payer'}
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400" style={{ fontFamily: 'var(--font-poppins)' }}>
            Vous serez redirigé vers Wave pour finaliser le paiement
          </p>
        </div>
      </div>
    </div>
  );
}
