import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon Panier',
  description: 'Consultez votre panier d\'achats et finalisez votre commande.',
  robots: {
    index: false, // Don't index cart pages
    follow: true,
  },
};
