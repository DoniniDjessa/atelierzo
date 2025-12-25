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

// Default sample products
const defaultProducts: Product[] = [
  {
    id: '1',
    title: 'Ensemble Premium',
    description: 'Chemise élégante assortie avec bermuda moderne',
    price: 45000,
    oldPrice: 55000,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#1f2937', '#ffffff', '#374151'],
    inStock: true,
    category: 'bermuda',
  },
  {
    id: '2',
    title: 'Collection Été',
    description: 'Style décontracté pour vos journées ensoleillées',
    price: 35000,
    oldPrice: 42000,
    imageUrl: 'https://images.unsplash.com/photo-1503341504253-dff4815485f1?w=800&h=1000&fit=crop',
    sizes: ['M', 'L', 'XL'],
    colors: ['#3b82f6', '#10b981', '#f59e0b'],
    inStock: true,
    category: 'bermuda',
  },
  {
    id: '3',
    title: 'Ensemble Classique',
    description: 'Élégance intemporelle pour toutes occasions',
    price: 48000,
    oldPrice: 60000,
    imageUrl: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L'],
    colors: ['#1f2937', '#4b5563'],
    inStock: false,
    category: 'bermuda',
  },
  {
    id: '4',
    title: 'Style Moderne',
    description: 'Design contemporain avec coupe ajustée',
    price: 40000,
    oldPrice: 50000,
    imageUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#1f2937', '#6b7280', '#111827'],
    inStock: true,
    category: 'bermuda',
  },
  {
    id: '5',
    title: 'Collection Premium',
    description: 'Qualité supérieure et confort optimal',
    price: 55000,
    oldPrice: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&h=1000&fit=crop',
    sizes: ['M', 'L', 'XL'],
    colors: ['#1f2937', '#ffffff'],
    inStock: true,
    category: 'pantalon',
  },
  {
    id: '6',
    title: 'Ensemble Sport',
    description: 'Confort et style pour vos activités',
    price: 32000,
    imageUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L'],
    colors: ['#059669', '#0d9488'],
    inStock: true,
    category: 'pantalon',
  },
  {
    id: '7',
    title: 'Style Business',
    description: 'Élégance professionnelle pour le bureau',
    price: 50000,
    oldPrice: 60000,
    imageUrl: 'https://images.unsplash.com/photo-1594938291221-94ad1c9e0c95?w=800&h=1000&fit=crop',
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['#1f2937', '#4b5563', '#6b7280'],
    inStock: true,
    category: 'pantalon',
  },
  {
    id: '8',
    title: 'Collection Détente',
    description: 'Confort et élégance pour votre quotidien',
    price: 38000,
    oldPrice: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&h=1000&fit=crop',
    sizes: ['M', 'L', 'XL'],
    colors: ['#1f2937', '#6366f1'],
    inStock: true,
    category: 'pantalon',
  },
];

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
        // If error, use default products
        setProducts(defaultProducts);
        localStorage.setItem('atelierzo_products', JSON.stringify(defaultProducts));
      }
    } else {
      // First time, use default products
      setProducts(defaultProducts);
      localStorage.setItem('atelierzo_products', JSON.stringify(defaultProducts));
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

