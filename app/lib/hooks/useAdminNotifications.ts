'use client';

import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  url?: string;
}

export function useAdminNotifications() {
  const router = useRouter();
  const pathname = usePathname();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isAdmin = pathname?.startsWith('/pilotage');

  useEffect(() => {
    // Only initialize for admin routes
    if (!isAdmin) return;

    // Initialize audio
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('/notification-sound.mp3');
      audioRef.current.volume = 0.7;
    }

    // Register service worker for admin only
    if ('serviceWorker' in navigator && isAdmin) {
      navigator.serviceWorker
        .register('/sw-admin.js', { scope: '/pilotage' })
        .then((registration) => {
          console.log('Admin Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Admin Service Worker registration failed:', error);
        });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [isAdmin]);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (!isAdmin || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const playNotificationSound = () => {
    if (!isAdmin || !audioRef.current) return;

    try {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((error) => {
        console.error('Error playing notification sound:', error);
      });
    } catch (error) {
      console.error('Error with notification sound:', error);
    }
  };

  const showNotification = async (options: NotificationOptions) => {
    if (!isAdmin) return;

    // Play sound first (works even if notifications are denied)
    playNotificationSound();

    // Check if notifications are supported
    if (!('Notification' in window)) {
      return;
    }

    // Request permission if not already granted
    if (Notification.permission === 'default') {
      await requestNotificationPermission();
    }

    // Show notification if permission granted
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/icon.png',
          badge: '/icon.png',
          tag: 'admin-order-notification',
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          if (options.url) {
            router.push(options.url);
          }
          notification.close();
        };

        // Auto-close after 10 seconds
        setTimeout(() => {
          notification.close();
        }, 10000);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  const notifyNewOrder = (orderData: { id: string; customerName: string; total: number }) => {
    if (!isAdmin) return;

    showNotification({
      title: '🛍️ Nouvelle commande!',
      body: `${orderData.customerName} - ${orderData.total.toLocaleString('fr-FR')} FCFA`,
      icon: '/icon.png',
      url: `/pilotage/orders`,
    });
  };

  return {
    requestNotificationPermission,
    showNotification,
    notifyNewOrder,
    playNotificationSound,
    isPermissionGranted: typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted',
  };
}
