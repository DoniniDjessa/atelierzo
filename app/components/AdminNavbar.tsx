'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Bell } from 'lucide-react';
import { getOrdersCountByStatus } from '@/app/lib/supabase/orders';
import { useAdminNotificationContext } from '@/app/contexts/AdminNotificationContext';

interface AdminNavbarProps {
  onLogout: () => void;
}

const menuItems = [
  { name: 'Dashboard', path: '/pilotage', icon: '📊' },
  { name: 'Produits', path: '/pilotage/products', icon: '📦' },
  { name: 'Vente Flash', path: '/pilotage/vente-flash', icon: '⚡' },
  { name: 'Clients', path: '/pilotage/clients', icon: '👥' },
  { name: 'Commandes', path: '/pilotage/orders', icon: '🛒' },
  { name: 'Clients Satisfaits', path: '/pilotage/satisfied-clients', icon: '⭐' },
];

export default function AdminNavbar({ onLogout }: AdminNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingPreordersCount, setPendingPreordersCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { hasNewNotification } = useAdminNotificationContext();

  useEffect(() => {
    const loadPendingCount = async () => {
      let oCount = 0;
      let pCount = 0;
      const [ordersCountResult, preordersResult] = await Promise.all([
        getOrdersCountByStatus(),
        import('@/app/lib/supabase/preorders').then(m => m.getAllPreorders())
      ]);

      if (ordersCountResult.data) {
        oCount = ordersCountResult.data.pending || 0;
      }
      if (preordersResult.data) {
        pCount = preordersResult.data.filter(preorder => preorder.status === 'pending').length;
      }
      setPendingOrdersCount(oCount);
      setPendingPreordersCount(pCount);
    };
    loadPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (path: string) => {
    router.push(path);
    setSidebarOpen(false); // Close sidebar when navigating
  };

  return (
    <>
      <nav className="bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 dark:border-slate-800 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Logo/Title and Menu Button */}
            <div className="flex items-center gap-3">
              {/* Menu Button - Visible on all screen sizes */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h2 className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                Panel Admin
              </h2>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <button
                onClick={() => router.push('/pilotage/orders')}
                className="relative p-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="h-5 w-5" />
                {hasNewNotification && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                )}
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
                style={{ fontFamily: 'var(--font-poppins)' }}
                title="Retour au site"
              >
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Site</span>
              </button>
              <button
                onClick={onLogout}
                className="px-2.5 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Sidebar - Visible on all screen sizes */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-60"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ 
                type: 'spring', 
                stiffness: 400, 
                damping: 35,
                mass: 0.8,
              }}
              className="fixed top-0 left-0 h-full w-64 bg-slate-800 dark:bg-slate-900 z-60 shadow-2xl"
            >
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
                  Menu
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-4 space-y-1">
                {menuItems.map((item) => {
                  const isActive = pathname === item.path || (item.path !== '/pilotage' && pathname?.startsWith(item.path));
                  return (
                    <button
                      key={item.path}
                      onClick={() => handleNavigate(item.path)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                        isActive
                          ? 'bg-slate-700 dark:bg-slate-600 text-white'
                          : 'text-slate-300 dark:text-slate-400 hover:bg-slate-700 dark:hover:bg-slate-800'
                      }`}
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="font-medium flex-1 text-left">{item.name}</span>
                      {item.path === '/pilotage/orders' && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span 
                            className={`px-1.5 py-0.5 ${pendingOrdersCount > 0 ? 'bg-yellow-500' : 'bg-slate-500'} text-white text-xs font-bold rounded-full min-w-[1.25rem] text-center`}
                            title="Commandes en attente"
                          >
                            {pendingOrdersCount}
                          </span>
                          <span 
                            className={`px-1.5 py-0.5 ${pendingPreordersCount > 0 ? 'bg-blue-900' : 'bg-slate-500'} text-white text-xs font-bold rounded-full min-w-[1.25rem] text-center`}
                            title="Précommandes en attente"
                          >
                            {pendingPreordersCount}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
