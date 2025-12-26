'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';
import Sidebar from './Sidebar';
import { useUser } from '@/app/contexts/UserContext';
import { useFavorites } from '@/app/contexts/FavoritesContext';
import { useCart } from '@/app/contexts/CartContext';

export default function Navbar() {
  const { user, logout } = useUser();
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileSubmenuOpen, setIsProfileSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { favorites } = useFavorites();
  const { getItemCount } = useCart();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
        setIsProfileSubmenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const handleLogout = () => {
    logout();
    setIsUserMenuOpen(false);
    router.push('/');
  };

  const handleNavigate = (path: string) => {
    setIsUserMenuOpen(false);
    setIsProfileSubmenuOpen(false);
    router.push(path);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-800 dark:bg-black/95 transition-all">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Menu icon on left */}
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex items-center justify-center p-2 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>

          {/* Logo in middle */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <Link 
              href="/" 
              className="flex items-center justify-center transition-transform hover:scale-105"
            >
              <Image
                src="/logo.png"
                alt="Les Ateliers Zo"
                width={120}
                height={40}
                className="h-8 w-auto object-contain"
                priority
              />
            </Link>
          </div>

          {/* Shop and Login icons on right */}
          <div className="flex items-center gap-3">
                {/* Shopping Bag Icon */}
                <button
                  onClick={() => router.push('/cart')}
                  className="flex items-center justify-center p-2 text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 relative group"
                  aria-label="Shop"
                >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 transition-transform group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  {getItemCount() > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {getItemCount()}
                    </span>
                  )}
                </button>
            
            {/* User/Login Icon */}
            <div className="flex items-center gap-2 relative" ref={menuRef}>
              {user && (
                <span 
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline-block"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {user.name}
                </span>
              )}
              <button
                onClick={() => user ? setIsUserMenuOpen(!isUserMenuOpen) : setIsModalOpen(true)}
                className="flex items-center justify-center p-2 text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 group"
                aria-label={user ? "User menu" : "Login"}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 transition-transform group-hover:scale-110"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>

              {/* User Menu Dropdown */}
              {user && isUserMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                  {/* Mon profil with submenu */}
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileSubmenuOpen(!isProfileSubmenuOpen)}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between transition-colors"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      <span>Mon profil</span>
                      <svg
                        className={`w-4 h-4 transition-transform ${isProfileSubmenuOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    
                    {/* Submenu */}
                    {isProfileSubmenuOpen && (
                      <div className="pl-6 py-1 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                        <button
                          onClick={() => handleNavigate('/profile/history')}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          Mon historique
                        </button>
                        <button
                          onClick={() => handleNavigate('/profile/details')}
                          className="block w-full px-4 py-2 text-left text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          style={{ fontFamily: 'var(--font-poppins)' }}
                        >
                          Détails du profil
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mes favoris */}
                  <button
                    onClick={() => handleNavigate('/favorites')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    <span>Mes favoris</span>
                    {favorites.length > 0 && (
                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                        {favorites.length}
                      </span>
                    )}
                  </button>

                  {/* Divider */}
                  <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>

                  {/* Mon panier */}
                  <button
                    onClick={() => handleNavigate('/cart')}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Mon panier
                  </button>

                  {/* Divider */}
                  <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>

                  {/* Déconnexion */}
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    style={{ fontFamily: 'var(--font-poppins)' }}
                  >
                    Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}

