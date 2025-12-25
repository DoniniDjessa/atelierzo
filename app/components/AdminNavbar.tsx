'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAllOrders } from '@/app/lib/supabase/orders';

interface AdminNavbarProps {
  onLogout: () => void;
}

const menuItems = [
  { name: 'Dashboard', path: '/pilotage', icon: '📊' },
  { name: 'Produits', path: '/pilotage/products', icon: '📦' },
  { name: 'Clients', path: '/pilotage/clients', icon: '👥' },
  { name: 'Commandes', path: '/pilotage/orders', icon: '🛒' },
  { name: 'Clients Satisfaits', path: '/pilotage/satisfied-clients', icon: '⭐' },
];

export default function AdminNavbar({ onLogout }: AdminNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const loadPendingCount = async () => {
      const { data: orders } = await getAllOrders();
      if (orders) {
        const pending = orders.filter(order => order.status === 'pending').length;
        setPendingCount(pending);
      }
    };
    loadPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <nav className="bg-slate-800/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 dark:border-slate-800 sticky top-0 z-[60] shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <h2 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-ubuntu)' }}>
              Panel Admin
            </h2>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/pilotage' && pathname?.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm relative ${
                    isActive
                      ? 'bg-slate-700 dark:bg-slate-600 text-white'
                      : 'text-slate-300 dark:text-slate-400 hover:bg-slate-700 dark:hover:bg-slate-800'
                  }`}
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  <span>{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                  {item.path === '/pilotage/orders' && pendingCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-3 py-2 text-sm border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Site
            </button>
            <button
              onClick={onLogout}
              className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

