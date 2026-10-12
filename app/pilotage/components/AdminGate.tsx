'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNavbar from '@/app/components/AdminNavbar';

const ADMIN_PASSWORD = '0044';

/**
 * Same password gate as the other pilotage pages (localStorage flag), plus the navbar.
 * Renders children only once logged in.
 */
export default function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setIsAuthenticated(localStorage.getItem('atelierzo_admin_auth') === 'true');
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem('atelierzo_admin_auth', 'true');
      setIsAuthenticated(true);
      setPassword('');
      setError('');
    } else {
      setError('Mot de passe incorrect');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('atelierzo_admin_auth');
    setIsAuthenticated(false);
    router.push('/pilotage');
  };

  if (isAuthenticated === null) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="pz-card w-full max-w-sm p-7">
          <div className="flex items-center gap-2.5 mb-6">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-md object-contain" />
            <div>
              <p className="pz-eyebrow">Les Ateliers Zo</p>
              <h1 className="text-lg">Accès pilotage</h1>
            </div>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="password" className="block">Mot de passe</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 bg-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-black dark:text-white"
                placeholder="Entrez le mot de passe"
                autoFocus
              />
              {error && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>}
            </div>
            <button type="submit" className="pz-btn pz-btn-primary w-full py-2.5!">Connexion</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AdminNavbar onLogout={handleLogout} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
    </div>
  );
}

/** Shown on admin pages whose table does not exist yet */
export function MigrationNotice() {
  return (
    <div className="pz-card p-4 mb-6 border-amber-300! bg-amber-50 dark:bg-amber-900/20 text-sm text-amber-900 dark:text-amber-200">
      <p className="font-extrabold mb-1">Base de données à mettre à jour</p>
      <p>
        Exécutez le fichier <code className="font-mono text-xs">app/lib/supabase/categories-hero-migration.sql</code> dans
        l&apos;éditeur SQL de Supabase pour activer les modifications. En attendant, le site affiche les valeurs actuelles.
      </p>
    </div>
  );
}
