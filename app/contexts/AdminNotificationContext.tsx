'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAdminNotifications } from '@/app/lib/hooks/useAdminNotifications';
import { getAllOrders, Order } from '@/app/lib/supabase/orders';

interface AdminNotificationContextType {
  requestPermission: () => Promise<boolean>;
  isPermissionGranted: boolean;
  lastOrderCount: number;
  hasNewNotification: boolean;
}

const AdminNotificationContext = createContext<AdminNotificationContextType | undefined>(undefined);

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/pilotage');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastOrderCount, setLastOrderCount] = useState(0);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const { requestNotificationPermission, notifyNewOrder, isPermissionGranted } = useAdminNotifications();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAdmin) return;

    // Check auth status
    const auth = localStorage.getItem('atelierzo_admin_auth');
    setIsAuthenticated(auth === 'true');
  }, [isAdmin, pathname]);

  useEffect(() => {
    if (!isAdmin || !isAuthenticated) {
      // Clear interval if not admin or not authenticated
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Initialize order count
    const initializeOrderCount = async () => {
      const result = await getAllOrders();
      if (result.data) {
        setLastOrderCount(result.data.length);
      }
    };

    initializeOrderCount();

    // Check for new orders every 30 seconds
    checkIntervalRef.current = setInterval(async () => {
      const result = await getAllOrders();
      if (result.data) {
        const currentCount = result.data.length;
        
        if (currentCount > lastOrderCount) {
          // New order(s) detected
          const newOrders = result.data.slice(0, currentCount - lastOrderCount);
          const latestOrder = newOrders[0];
          
          setHasNewNotification(true);
          
          notifyNewOrder({
            id: latestOrder.id,
            customerName: latestOrder.customer_name || 'Client',
            total: latestOrder.total_amount,
          });
        }
        
        setLastOrderCount(currentCount);
      }
    }, 30000); // Check every 30 seconds

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [isAdmin, isAuthenticated, lastOrderCount, notifyNewOrder]);

  const requestPermission = async (): Promise<boolean> => {
    if (!isAdmin) return false;
    return await requestNotificationPermission();
  };

  return (
    <AdminNotificationContext.Provider
      value={{
        requestPermission,
        isPermissionGranted,
        lastOrderCount,
        hasNewNotification,
      }}
    >
      {children}
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotificationContext() {
  const context = useContext(AdminNotificationContext);
  if (context === undefined) {
    throw new Error('useAdminNotificationContext must be used within AdminNotificationProvider');
  }
  return context;
}
