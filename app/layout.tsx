import type { Metadata } from "next";
import { Ubuntu, Poppins } from "next/font/google";
import "./globals.css";
import ConditionalNavbar from "./components/ConditionalNavbar";
import Loader from "./components/Loader";
import ScrollToTop from "./components/ScrollToTop";
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
  title: "Les Ateliers Zo",
  description: "Votre boutique de mode en ligne",
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
    <html lang="en">
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
                <Toaster position="top-center" richColors />
              </CartProvider>
            </FavoritesProvider>
          </ProductProvider>
        </UserProvider>
      </body>
    </html>
  );
}
