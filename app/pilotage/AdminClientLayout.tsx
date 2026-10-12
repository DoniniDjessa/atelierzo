'use client';

import { ReactNode } from 'react';
import { AdminNotificationProvider } from '@/app/contexts/AdminNotificationContext';
import AdminInstallPrompt from '@/app/components/AdminInstallPrompt';

// .pz scopes the pilotage design system (app/pilotage/pilotage.css); the notification toggle lives in AdminNavbar
export default function AdminClientLayout({ children, fontClassName = '' }: { children: ReactNode; fontClassName?: string }) {
  return (
    <AdminNotificationProvider>
      <div className={`pz ${fontClassName}`}>
        <AdminInstallPrompt />
        {children}
      </div>
    </AdminNotificationProvider>
  );
}
