'use client';

import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-slate-800 dark:bg-slate-900 border-t border-slate-700 dark:border-slate-800 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-3">
              <Image
                src="/icon.png"
                alt="Les Ateliers Zo"
                width={150}
                height={50}
                className="h-20 w-auto object-contain"
                priority
                unoptimized
              />
            </div>
            <p
              className="text-sm text-gray-300"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Votre boutique de mode en ligne
            </p>
          </div>

          {/* Links */}
          <div>
            <h4
              className="text-sm font-semibold text-white mb-3"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Liens rapides
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Accueil
                </a>
              </li>
              <li>
                <a
                  href="/products?category=bermuda"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Chemise Bermuda
                </a>
              </li>
              <li>
                <a
                  href="/products?category=pantalon"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Chemise Pantalon
                </a>
              </li>
              <li>
                <a
                  href="/products?category=tshirt-oversize-civ"
                  className="text-sm text-gray-300 hover:text-white transition-colors"
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  Tshirt Oversize CIV Champions d'Afrique
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              className="text-sm font-semibold text-white mb-3"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Contact
            </h4>
            <ul className="space-y-2">
              <li
                className="text-sm text-gray-300"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                0707070707
              </li>
              <li
                className="text-sm text-gray-300"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                contact@contact@atelierzo.com
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center">
          <p
            className="text-sm text-gray-600 dark:text-gray-400"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            © {new Date().getFullYear()} Les Ateliers Zo. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}

