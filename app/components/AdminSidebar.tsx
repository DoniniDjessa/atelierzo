'use client';

import { usePathname, useRouter } from 'next/navigation';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  { name: 'Dashboard', path: '/pilotage', icon: '📊' },
  { name: 'Produits', path: '/pilotage/products', icon: '📦' },
  { name: 'Clients', path: '/pilotage/clients', icon: '👥' },
  { name: 'Commandes', path: '/pilotage/orders', icon: '🛒' },
];

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:static lg:z-auto lg:block">
      {/* Overlay for mobile */}
      <div className="fixed inset-0 bg-black/50 lg:hidden" onClick={onClose} />

      {/* Sidebar */}
      <div className="fixed top-0 left-0 h-full w-64 bg-slate-800 dark:bg-slate-900 border-r border-slate-700 dark:border-slate-800 z-50 lg:static lg:z-auto overflow-y-auto">
        <div className="p-4">
          <div className="mb-8">
            <h2
              className="text-xl font-bold text-white"
              style={{ fontFamily: 'var(--font-fira-sans)' }}
            >
              Panel Admin
            </h2>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const isActive = pathname === item.path || (item.path !== '/pilotage' && pathname?.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-slate-700 dark:bg-slate-600 text-white'
                      : 'text-slate-300 dark:text-slate-400 hover:bg-slate-700 dark:hover:bg-slate-800'
                  }`}
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

