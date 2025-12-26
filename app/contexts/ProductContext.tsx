'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { deleteImageFromUrl, isSupabaseImageUrl } from '@/app/lib/supabase/storage';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  oldPrice?: number;
  imageUrl: string;
  colors?: string[];
  sizes?: string[]; // For backward compatibility, kept as array
  sizeQuantities?: Record<string, number>; // New: object with size as key and quantity as value
  inStock?: boolean;
  category?: string;
}

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);

  // Load products from localStorage on mount
  useEffect(() => {
    const storedProducts = localStorage.getItem('atelierzo_products');
    if (storedProducts) {
      try {
        setProducts(JSON.parse(storedProducts));
      } catch (e) {
        console.error('Error parsing stored products:', e);
        // If error, initialize with empty array
        setProducts([]);
        localStorage.setItem('atelierzo_products', JSON.stringify([]));
      }
    } else {
      // First time, initialize with empty array
      setProducts([]);
      localStorage.setItem('atelierzo_products', JSON.stringify([]));
    }
  }, []);

  const saveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem('atelierzo_products', JSON.stringify(newProducts));
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    const updatedProducts = [...products, newProduct];
    saveProducts(updatedProducts);
  };

  const updateProduct = (id: string, product: Partial<Product>) => {
    const updatedProducts = products.map((p) => (p.id === id ? { ...p, ...product } : p));
    saveProducts(updatedProducts);
  };

  const deleteProduct = async (id: string) => {
    const product = products.find((p) => p.id === id);
    
    // Delete image from Supabase Storage if it's from our bucket
    if (product?.imageUrl && isSupabaseImageUrl(product.imageUrl)) {
      try {
        await deleteImageFromUrl(product.imageUrl);
      } catch (error) {
        console.error('Error deleting image:', error);
        // Continue with product deletion even if image deletion fails
      }
    }
    
    const updatedProducts = products.filter((p) => p.id !== id);
    saveProducts(updatedProducts);
  };

  const getProductById = (id: string) => {
    return products.find((p) => p.id === id);
  };

  return (
    <ProductContext.Provider value={{ products, addProduct, updateProduct, deleteProduct, getProductById }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}

