'use client';

import { ReactNode, useEffect, useState } from 'react';
import { AdminNotificationProvider } from '@/app/contexts/AdminNotificationContext';
import { useAdminNotifications } from '@/app/lib/hooks/useAdminNotifications';
import AdminInstallPrompt from '@/app/components/AdminInstallPrompt';
import { Bell, BellOff } from 'lucide-react';

function NotificationButton() {
  const { requestNotificationPermission, isPermissionGranted } = useAdminNotifications();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <button
      onClick={requestNotificationPermission}
      className={`fixed top-20 right-6 z-50 p-3 rounded-full shadow-lg transition-all ${
        isPermissionGranted
          ? 'bg-green-500 hover:bg-green-600'
          : 'bg-purple-500 hover:bg-purple-600 animate-pulse'
      } text-white`}
      title={isPermissionGranted ? 'Notifications activées' : 'Activer les notifications'}
    >
      {isPermissionGranted ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
    </button>
  );
}

export default function AdminClientLayout({ children }: { children: ReactNode }) {
  return (
    <AdminNotificationProvider>
      <NotificationButton />
      <AdminInstallPrompt />
      {children}
    </AdminNotificationProvider>
  );
}
