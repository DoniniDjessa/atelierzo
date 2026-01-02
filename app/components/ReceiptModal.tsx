'use client';

import { useRef } from 'react';
import html2canvas from 'html2canvas';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    id: string;
    items: Array<{
      title: string;
      size: string;
      color: string;
      quantity: number;
      price: number;
    }>;
    total: number;
    shipping_address: string;
    shipping_phone: string;
    created_at: string;
    customerName: string;
    notes?: string;
  };
}

export default function ReceiptModal({ isOpen, onClose, orderData }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!receiptRef.current) return;

    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        allowTaint: true,
        ignoreElements: (element) => {
          // Ignore elements that might cause color parsing issues
          return false;
        },
      });

      const link = document.createElement('a');
      link.download = `recu-${orderData.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (error) {
      console.error('Error generating receipt:', error);
    }
  };

  if (!isOpen) return null;

  const date = new Date(orderData.created_at);
  const formattedDate = date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const formattedTime = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Receipt */}
        <div ref={receiptRef} className="bg-white p-8" style={{ fontFamily: 'monospace', color: '#000000' }}>
          {/* Header */}
          <div className="text-center pb-4 mb-4" style={{ borderBottom: '2px dashed #9ca3af' }}>
            <h1 className="text-2xl font-bold mb-2" style={{ color: '#000000' }}>LES ATELIERS ZO</h1>
            <p className="text-xs" style={{ color: '#4b5563' }}>+225 07 49 235 896 | +225 05 55 486 130</p>
            <p className="text-xs mt-1" style={{ color: '#6b7280' }}>www.atelierszo.com</p>
          </div>

          {/* Order Info */}
          <div className="mb-4 text-sm pb-4" style={{ borderBottom: '1px dashed #d1d5db' }}>
            <div className="flex justify-between mb-1">
              <span className="font-semibold">N° Commande:</span>
              <span>#{orderData.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="font-semibold">Date:</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold">Heure:</span>
              <span>{formattedTime}</span>
            </div>
          </div>

          {/* Customer Info */}
          <div className="mb-4 text-sm pb-4" style={{ borderBottom: '1px dashed #d1d5db' }}>
            <h3 className="font-bold mb-2">INFORMATIONS CLIENT</h3>
            <p className="mb-1">
              <span className="font-semibold">Nom:</span> {orderData.customerName}
            </p>
            <p className="mb-1">
              <span className="font-semibold">Téléphone:</span> {orderData.shipping_phone}
            </p>
            <p>
              <span className="font-semibold">Adresse:</span> {orderData.shipping_address}
            </p>
          </div>

          {/* Items */}
          <div className="mb-4 pb-4" style={{ borderBottom: '1px dashed #d1d5db' }}>
            <h3 className="font-bold mb-3 text-sm">ARTICLES</h3>
            {orderData.items.map((item, index) => (
              <div key={index} className="mb-3 text-xs">
                <div className="flex justify-between font-semibold mb-1">
                  <span className="flex-1">{item.title}</span>
                  <span>{item.price.toLocaleString()} FCFA</span>
                </div>
                <div className="ml-2" style={{ color: '#4b5563' }}>
                  <div>Taille: {item.size} | Couleur: {item.color}</div>
                  <div className="flex justify-between">
                    <span>Qté: {item.quantity}</span>
                    <span className="font-semibold">
                      {(item.price * item.quantity).toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          {orderData.notes && (
            <div className="mb-4 text-xs pb-4" style={{ borderBottom: '1px dashed #d1d5db' }}>
              <h3 className="font-bold mb-1">NOTES</h3>
              <p style={{ color: '#4b5563' }}>{orderData.notes}</p>
            </div>
          )}

          {/* Total */}
          <div className="mb-4 pb-4" style={{ borderBottom: '2px solid #1f2937' }}>
            <div className="flex justify-between text-lg font-bold">
              <span>TOTAL</span>
              <span>{orderData.total.toLocaleString()} FCFA</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs mt-4" style={{ color: '#6b7280' }}>
            <p className="mb-1">Merci pour votre commande !</p>
            <p>Elle est en cours de traitement.</p>
            <div className="mt-3 pt-3" style={{ borderTop: '1px dashed #d1d5db' }}>
              <p className="text-xs" style={{ lineHeight: '1.4' }}>📍 Riviera CIAD après la Pharmacie des jardins d&apos;Eden, immeuble de la Société générale, Cocody Rue F44</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 p-4" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button
            onClick={handleDownload}
            className="flex-1 text-white py-3 rounded-lg font-semibold transition-transform active:scale-95"
            style={{ backgroundColor: '#2563eb' }}
          >
            Télécharger
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-lg font-semibold transition-transform active:scale-95"
            style={{ backgroundColor: '#e5e7eb', color: '#1f2937' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
