'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { deleteImageFromUrl, isSupabaseImageUrl } from '@/app/lib/supabase/storage';
import { 
  getAllProducts, 
  createProduct as createProductSupabase, 
  updateProduct as updateProductSupabase, 
  deleteProduct as deleteProductSupabase 
} from '@/app/lib/supabase/products';

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
  loading: boolean;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  refreshProducts: () => Promise<void>;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Load products from Supabase on mount
  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await getAllProducts();
      if (error) {
        console.error('Error loading products:', error);
        setProducts([]);
      } else {
        // Data is already transformed by getAllProducts
        setProducts((data || []) as Product[]);
      }
    } catch (error) {
      console.error('Unexpected error loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const addProduct = async (product: Omit<Product, 'id'>) => {
    try {
      // Delete image from Supabase Storage if it's from our bucket
      let imageUrl = product.imageUrl;
      if (isSupabaseImageUrl(product.imageUrl)) {
        // Image is already in Supabase, use it directly
        imageUrl = product.imageUrl;
      }

      // Convert to Supabase format
      const supabaseProduct = {
        title: product.title,
        description: product.description,
        price: product.price,
        old_price: product.oldPrice,
        image_url: imageUrl,
        colors: product.colors || [],
        sizes: product.sizes || [],
        size_quantities: product.sizeQuantities || {},
        in_stock: product.inStock !== false,
        category: product.category || 'bermuda',
      };

      const { data, error } = await createProductSupabase(supabaseProduct);
      
      if (error) {
        console.error('Error adding product:', error);
        throw new Error(error);
      }

      // Reload products from Supabase
      await loadProducts();
    } catch (error) {
      console.error('Error in addProduct:', error);
      throw error;
    }
  };

  const updateProduct = async (id: string, product: Partial<Product>) => {
    try {
      const existingProduct = products.find((p) => p.id === id);
      if (!existingProduct) {
        throw new Error('Product not found');
      }

      // Convert to Supabase format
      const supabaseUpdates: any = {};
      
      if (product.title !== undefined) supabaseUpdates.title = product.title;
      if (product.description !== undefined) supabaseUpdates.description = product.description;
      if (product.price !== undefined) supabaseUpdates.price = product.price;
      if (product.oldPrice !== undefined) supabaseUpdates.old_price = product.oldPrice;
      if (product.imageUrl !== undefined) supabaseUpdates.image_url = product.imageUrl;
      if (product.colors !== undefined) supabaseUpdates.colors = product.colors;
      if (product.sizes !== undefined) supabaseUpdates.sizes = product.sizes;
      if (product.sizeQuantities !== undefined) supabaseUpdates.size_quantities = product.sizeQuantities;
      if (product.inStock !== undefined) supabaseUpdates.in_stock = product.inStock;
      if (product.category !== undefined) supabaseUpdates.category = product.category;

      const { error } = await updateProductSupabase(id, supabaseUpdates);
      
      if (error) {
        console.error('Error updating product:', error);
        throw new Error(error);
      }

      // Reload products from Supabase
      await loadProducts();
    } catch (error) {
      console.error('Error in updateProduct:', error);
      throw error;
    }
  };

  const deleteProduct = async (id: string) => {
    try {
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
      
      // Delete product from Supabase
      const { error } = await deleteProductSupabase(id);
      
      if (error) {
        console.error('Error deleting product:', error);
        throw new Error(error);
      }

      // Reload products from Supabase
      await loadProducts();
    } catch (error) {
      console.error('Error in deleteProduct:', error);
      throw error;
    }
  };

  const getProductById = (id: string) => {
    return products.find((p) => p.id === id);
  };

  return (
    <ProductContext.Provider value={{ 
      products, 
      loading, 
      addProduct, 
      updateProduct, 
      deleteProduct, 
      getProductById,
      refreshProducts: loadProducts 
    }}>
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

