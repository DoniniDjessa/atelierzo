import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon Profil',
  description: 'Gérez votre compte Les Ateliers Zo.',
  robots: {
    index: false, // Don't index profile pages
    follow: true,
  },
};
