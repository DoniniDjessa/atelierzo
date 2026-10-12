'use client';

import Image from 'next/image';
import { useProducts } from '@/app/contexts/ProductContext';
import { useCategories } from '@/app/lib/hooks/useCategories';

export default function Footer() {
  const { products } = useProducts();
  const { roots } = useCategories();

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
              {roots
                .filter((category) => products.some((p) => p.category === category.slug))
                .map((category) => (
                  <li key={category.id}>
                    <a
                      href={`/products?category=${encodeURIComponent(category.slug)}`}
                      className="text-sm text-gray-300 hover:text-white transition-colors"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {category.name}
                    </a>
                  </li>
                ))}
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
                +225 07 49 235 896
              </li>
              {/* <li
                className="text-sm text-gray-300"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                +225 05 55 486 130
              </li> */}
              <li
                className="text-sm text-gray-300"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                Cocody Riviera CIAD rue F44, 1099
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

