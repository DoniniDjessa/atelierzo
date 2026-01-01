import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mes Favoris',
  description: 'Retrouvez tous vos produits favoris en un seul endroit.',
  robots: {
    index: false, // Don't index favorites pages
    follow: true,
  },
};
