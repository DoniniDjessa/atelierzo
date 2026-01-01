import type { Metadata } from "next";
import { Ubuntu, Poppins } from "next/font/google";
import "./globals.css";
import ConditionalNavbar from "./components/ConditionalNavbar";
import Loader from "./components/Loader";
import ScrollToTop from "./components/ScrollToTop";
import FloatingCartButton from "./components/FloatingCartButton";
import { UserProvider } from "./contexts/UserContext";
import { ProductProvider } from "./contexts/ProductContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { CartProvider } from "./contexts/CartContext";
import { Toaster } from "sonner";

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lesatelierszo.com'),
  title: {
    default: 'Les Ateliers Zo - Mode Ivoirienne Premium | Vêtements de Qualité',
    template: '%s | Les Ateliers Zo'
  },
  description: 'Découvrez Les Ateliers Zo, votre boutique de mode ivoirienne en ligne. Chemises Bermuda, Pantalons élégants et Tshirts Oversize CIV Champions d\'Afrique. Qualité premium, livraison rapide en Côte d\'Ivoire.',
  keywords: [
    'mode ivoirienne',
    'vêtements Côte d\'Ivoire',
    'chemise bermuda',
    'chemise pantalon',
    'tshirt CIV',
    'Champions d\'Afrique',
    'boutique en ligne Abidjan',
    'mode africaine',
    'vêtements homme femme',
    'Les Ateliers Zo'
  ],
  authors: [{ name: 'Les Ateliers Zo' }],
  creator: 'Les Ateliers Zo',
  publisher: 'Les Ateliers Zo',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'fr_CI',
    url: 'https://lesatelierszo.com',
    siteName: 'Les Ateliers Zo',
    title: 'Les Ateliers Zo - Mode Ivoirienne Premium',
    description: 'Découvrez notre collection de vêtements de qualité: Chemises Bermuda, Pantalons élégants et Tshirts CIV. Livraison en Côte d\'Ivoire.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Les Ateliers Zo - Mode Ivoirienne Premium',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Les Ateliers Zo - Mode Ivoirienne Premium',
    description: 'Découvrez notre collection de vêtements de qualité premium',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
  alternates: {
    canonical: 'https://lesatelierszo.com',
  },
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${ubuntu.variable} ${poppins.variable} antialiased`}
      >
        <UserProvider>
          <ProductProvider>
            <FavoritesProvider>
              <CartProvider>
                <Loader />
                <ConditionalNavbar />
                {children}
                <ScrollToTop />
                <FloatingCartButton />
                <Toaster position="top-center" richColors />
              </CartProvider>
            </FavoritesProvider>
          </ProductProvider>
        </UserProvider>
      </body>
    </html>
  );
}
