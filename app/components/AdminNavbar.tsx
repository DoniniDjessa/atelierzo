'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, Bell, BellOff, ExternalLink, LogOut,
  LayoutDashboard, Package, Zap, Users, ShoppingCart, Smartphone, Star, FolderTree, Images,
  type LucideIcon,
} from 'lucide-react';
import { getOrdersCountByStatus } from '@/app/lib/supabase/orders';
import { useAdminNotificationContext } from '@/app/contexts/AdminNotificationContext';
import { useAdminNotifications } from '@/app/lib/hooks/useAdminNotifications';

interface AdminNavbarProps {
  onLogout: () => void;
}

interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

// Grouped like the imo-platform vertical navbar
const menuSections: { label: string; items: MenuItem[] }[] = [
  { label: 'Pilotage', items: [{ name: 'Tableau de bord', path: '/pilotage', icon: LayoutDashboard }] },
  {
    label: 'Ventes',
    items: [
      { name: 'Commandes', path: '/pilotage/orders', icon: ShoppingCart },
      { name: 'Paiements', path: '/pilotage/paiements', icon: Smartphone },
      { name: 'Vente Flash', path: '/pilotage/vente-flash', icon: Zap },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { name: 'Produits', path: '/pilotage/products', icon: Package },
      { name: 'Catégories', path: '/pilotage/categories', icon: FolderTree },
      { name: 'Carrousel accueil', path: '/pilotage/hero', icon: Images },
    ],
  },
  {
    label: 'Clientèle',
    items: [
      { name: 'Clients', path: '/pilotage/clients', icon: Users },
      { name: 'Clients satisfaits', path: '/pilotage/satisfied-clients', icon: Star },
    ],
  },
];

const allItems = menuSections.flatMap((s) => s.items);

const isItemActive = (pathname: string | null, path: string) =>
  pathname === path || (path !== '/pilotage' && !!pathname?.startsWith(path));

export default function AdminNavbar({ onLogout }: AdminNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingPreordersCount, setPendingPreordersCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifGranted, setNotifGranted] = useState<boolean | null>(null);
  const { hasNewNotification } = useAdminNotificationContext();
  const { requestNotificationPermission, isPermissionGranted } = useAdminNotifications();

  useEffect(() => {
    setNotifGranted(isPermissionGranted);
  }, [isPermissionGranted]);

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

  const handleNotifications = async () => {
    setNotifGranted(await requestNotificationPermission());
  };

  const current = allItems.find((item) => isItemActive(pathname, item.path));

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[var(--pz-border)] shrink-0">
        <img src="/logo.png" alt="" className="h-8 w-8 rounded-md object-contain" />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-[var(--pz-text)] leading-tight truncate" style={{ fontFamily: 'var(--font-ubuntu)' }}>
            Les Ateliers Zo
          </p>
          <p className="pz-eyebrow" style={{ fontSize: '0.5625rem' }}>Pilotage</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {menuSections.map((section) => (
          <div key={section.label}>
            <p className="pz-nav-label">{section.label}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(pathname, item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`pz-nav-item ${active ? 'is-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={active ? 2.4 : 2} />
                    <span className="flex-1 truncate">{item.name}</span>
                    {item.path === '/pilotage/orders' && (
                      <span className="flex items-center gap-1">
                        <span className={`pz-nav-count ${pendingOrdersCount > 0 ? 'is-hot' : ''}`} title="Commandes en attente">
                          {pendingOrdersCount}
                        </span>
                        <span className={`pz-nav-count ${pendingPreordersCount > 0 ? 'is-warn' : ''}`} title="Précommandes en attente">
                          {pendingPreordersCount}
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--pz-border)] shrink-0">
        <button onClick={onLogout} className="pz-nav-item">
          <LogOut className="h-4 w-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: persistent sidebar (.pz reserves its width) */}
      <aside className="pz-sidebar hidden lg:flex fixed inset-y-0 left-0 z-40">
        {sidebarContent}
      </aside>

      {/* Topbar */}
      <header className="pz-topbar">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="pz-btn pz-btn-ghost lg:hidden px-2!"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1.5 text-xs font-semibold min-w-0">
            <span className="text-[var(--pz-muted)] hidden sm:inline">Pilotage</span>
            {current && current.path !== '/pilotage' && (
              <>
                <span className="text-[var(--pz-muted)] hidden sm:inline">/</span>
                <span className="text-[var(--pz-text)] font-extrabold truncate">{current.name}</span>
              </>
            )}
            {(!current || current.path === '/pilotage') && (
              <span className="text-[var(--pz-text)] font-extrabold sm:hidden">Tableau de bord</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => router.push('/pilotage/orders')}
            className="pz-btn pz-btn-ghost relative px-2!"
            title="Nouvelles commandes"
          >
            <ShoppingCart className="h-4 w-4" />
            {hasNewNotification && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--pz-500)] rounded-full animate-pulse" />
            )}
          </button>
          {notifGranted !== null && (
            <button
              onClick={handleNotifications}
              className={`pz-btn pz-btn-ghost px-2! ${notifGranted ? '' : 'text-[var(--pz-accent-text)]!'}`}
              title={notifGranted ? 'Notifications activées' : 'Activer les notifications'}
            >
              {notifGranted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </button>
          )}
          <button onClick={() => router.push('/')} className="pz-btn pz-btn-outline" title="Retour au site">
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Voir le site</span>
          </button>
        </div>
      </header>

      {/* Mobile: sliding sidebar */}
      <AnimatePresence mode="wait">
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/50 z-60 lg:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35, mass: 0.8 }}
              className="pz-sidebar fixed inset-y-0 left-0 z-60 shadow-2xl lg:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="pz-btn pz-btn-ghost absolute top-3 right-2 px-2!"
                aria-label="Fermer le menu"
              >
                <X className="h-4 w-4" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
