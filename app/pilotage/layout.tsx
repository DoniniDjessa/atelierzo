import { Metadata } from 'next';
import { Fira_Sans_Condensed, Nunito_Sans } from 'next/font/google';
import { ReactNode } from 'react';
import AdminClientLayout from './AdminClientLayout';

// Same pairing as imo-platform: Fira Sans Condensed for headings and figures, Nunito Sans for the rest
const firaCondensed = Fira_Sans_Condensed({
  weight: ['600', '700', '800'],
  subsets: ['latin', 'latin-ext'],
  variable: '--font-fira-condensed',
  display: 'swap',
});

const nunito = Nunito_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-nunito',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Admin Dashboard - Les Ateliers Zo',
  description: 'Admin dashboard for managing Les Ateliers Zo',
  robots: {
    index: false,
    follow: false,
  },
  manifest: '/admin-manifest.json',
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <AdminClientLayout fontClassName={`${firaCondensed.variable} ${nunito.variable}`}>
      {children}
    </AdminClientLayout>
  );
}
