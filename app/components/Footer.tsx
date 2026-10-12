'use client';

import Image from 'next/image';
import { useProducts } from '@/app/contexts/ProductContext';
import { useCategories } from '@/app/lib/hooks/useCategories';

export default function Footer() {
  const { products } = useProducts();
  const { roots } = useCategories();

  return (
    <footer className="bg-slate-800 dark:bg-slate-900 border-t border-slate-700 dark:border-slate-800 mt-12">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
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
              className="text-xs text-gray-300"
              style={{ fontFamily: 'var(--font-poppins)' }}
            >
              Votre boutique de mode en ligne
            </p>
          </div>

          {/* Contact */}
          <div>
            <address className="space-y-1 text-xs not-italic leading-relaxed text-gray-300" style={{ fontFamily: 'var(--font-poppins)' }}>
              <p>Riviera Ciad</p>
              <p>Rue F44, 1099</p>
              <p>Abidjan, Côte d'Ivoire</p>
              <div className="h-2" aria-hidden="true" />
              <a className="block transition-colors hover:text-white" href="mailto:lesateliers.zo@gmail.com">
                lesateliers.zo@gmail.com
              </a>
              <a className="block transition-colors hover:text-white" href="tel:+2250749235896">
                +225 07 49 235 896
              </a>
              <a className="block transition-colors hover:text-white" href="tel:+22505555486130">
                +225 05 55 486 130
              </a>
            </address>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="mb-3 text-xs font-semibold text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
              Liens rapides
            </h4>
            <ul className="space-y-1.5">
              <li>
                <a href="/" className="text-xs text-gray-300 transition-colors hover:text-white" style={{ fontFamily: 'var(--font-poppins)' }}>
                  Accueil
                </a>
              </li>
              {roots
                .filter((category) => products.some((p) => p.isVisible !== false && p.category === category.slug))
                .map((category) => (
                  <li key={category.id}>
                    <a
                      href={`/products?category=${encodeURIComponent(category.slug)}`}
                      className="text-xs text-gray-300 transition-colors hover:text-white"
                      style={{ fontFamily: 'var(--font-poppins)' }}
                    >
                      {category.name}
                    </a>
                  </li>
                ))}
            </ul>
          </div>

          {/* Social links */}
          <div className="flex flex-col items-start gap-3">
            <a
              href="https://www.instagram.com/lesatelierszo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Les Ateliers Zo"
              className="inline-flex items-center gap-2 text-[#00aeee] transition-colors hover:text-cyan-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm5.5-3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z" />
              </svg>
              <span className="text-xs font-medium">Instagram</span>
            </a>
            <a
              href="https://www.facebook.com/lesatelierszo"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook Les Ateliers Zo"
              className="inline-flex items-center gap-2 text-[#00aeee] transition-colors hover:text-cyan-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.02 4.388 11.02 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.03 1.792-4.704 4.533-4.704 1.312 0 2.686.236 2.686.236v2.97H15.83c-1.491 0-1.956.932-1.956 1.888v2.273h3.328l-.532 3.49h-2.796V24C19.612 23.093 24 18.093 24 12.073Z" />
              </svg>
              <span className="text-xs font-medium">Facebook</span>
            </a>
            <a
              href="https://wa.me/2250749235896"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contacter Les Ateliers Zo sur WhatsApp"
              className="inline-flex items-center gap-2 text-[#00aeee] transition-colors hover:text-cyan-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.52 3.48A11.82 11.82 0 0 0 12.08 0C5.52 0 .18 5.34.18 11.9c0 2.1.55 4.16 1.6 5.97L.08 24l6.28-1.65a11.9 11.9 0 0 0 5.72 1.46h.01C18.65 23.81 24 18.47 24 11.9c0-3.17-1.24-6.16-3.48-8.42ZM12.09 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.73.98 1-3.64-.24-.37a9.86 9.86 0 0 1-1.52-5.28c0-5.48 4.46-9.94 9.95-9.94a9.87 9.87 0 0 1 7.03 2.92 9.89 9.89 0 0 1 2.91 7.04c0 5.49-4.47 9.95-9.99 9.95Zm5.47-7.45c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.47-2.4-1.49-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.2 5.08 4.48.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
              </svg>
              <span className="text-xs font-medium">WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t border-slate-700 pt-6 text-center dark:border-slate-800">
          <p
            className="text-[11px] text-gray-400"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            © {new Date().getFullYear()} Les Ateliers Zo. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
