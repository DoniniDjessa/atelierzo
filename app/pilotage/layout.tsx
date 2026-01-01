import { Metadata } from 'next';
import { ReactNode } from 'react';
import AdminClientLayout from './AdminClientLayout';

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
  return <AdminClientLayout>{children}</AdminClientLayout>;
}
