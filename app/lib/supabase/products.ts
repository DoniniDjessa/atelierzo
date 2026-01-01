/**
 * Supabase utility functions for managing products
 */

import { supabase } from './client';

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  old_price?: number;
  image_url: string;
  colors?: string[];
  sizes?: string[]; // Array of sizes for backward compatibility
  sizeAvailability?: Record<string, boolean>; // Object with size as key and availability (boolean) as value
  in_stock?: boolean;
  category?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProductPayload {
  title: string;
  description: string;
  price: number;
  old_price?: number;
  image_url: string;
  colors?: string[];
  sizes?: string[];
  sizeAvailability?: Record<string, boolean>;
  in_stock?: boolean;
  category?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {}

/**
 * Get all products
 */
export async function getAllProducts(): Promise<{ data: Product[] | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return { data: null, error: error.message };
    }

    // Transform database structure to match Product interface
    const transformedData = (data || []).map((item: any) => {
      // Handle sizes - can be JSONB object (availability tracking)
      let sizes: string[] = [];
      let sizeAvailability: Record<string, boolean> = {};
      
      if (item.sizes) {
        if (typeof item.sizes === 'string') {
          try {
            const parsed = JSON.parse(item.sizes);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              sizeAvailability = parsed;
              sizes = Object.keys(parsed);
            } else if (Array.isArray(parsed)) {
              sizes = parsed;
              // Convert to availability object (all true by default)
              sizes.forEach(size => {
                sizeAvailability[size] = true;
              });
            }
          } catch {
            sizes = [];
          }
        } else if (typeof item.sizes === 'object') {
          if (Array.isArray(item.sizes)) {
            sizes = item.sizes;
            // Convert to availability object (all true by default)
            sizes.forEach(size => {
              sizeAvailability[size] = true;
            });
          } else {
            sizeAvailability = item.sizes;
            sizes = Object.keys(item.sizes);
          }
        }
      }

      // Check if product is in stock based on availability
      // Product is in stock if at least one size is available
      let inStock = item.in_stock !== false; // Default to true
      if (Object.keys(sizeAvailability).length > 0) {
        inStock = Object.values(sizeAvailability).some(available => available === true);
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        price: Number(item.price),
        oldPrice: item.old_price ? Number(item.old_price) : undefined,
        imageUrl: item.image_url,
        colors: item.colors || [],
        sizes: sizes,
        sizeAvailability: Object.keys(sizeAvailability).length > 0 ? sizeAvailability : undefined,
        inStock: inStock,
        category: item.category,
      };
    });

    return { data: transformedData, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching products:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Get a single product by ID
 */
export async function getProductById(productId: string): Promise<{ data: Product | null; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('zo-products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) {
      console.error('Error fetching product by ID:', error);
      return { data: null, error: error.message };
    }

    if (!data) {
      return { data: null, error: 'Product not found' };
    }

    // Transform database structure - handle sizes
    let sizes: string[] = [];
    let sizeAvailability: Record<string, boolean> = {};
    
    if (data.sizes) {
      if (typeof data.sizes === 'string') {
        try {
          const parsed = JSON.parse(data.sizes);
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            sizeAvailability = parsed;
            sizes = Object.keys(parsed);
          } else if (Array.isArray(parsed)) {
            sizes = parsed;
            // Convert to availability object (all true by default)
            sizes.forEach(size => {
              sizeAvailability[size] = true;
            });
          }
        } catch {
          sizes = [];
        }
      } else if (typeof data.sizes === 'object') {
        if (Array.isArray(data.sizes)) {
          sizes = data.sizes;
          // Convert to availability object (all true by default)
          sizes.forEach(size => {
            sizeAvailability[size] = true;
          });
        } else {
          sizeAvailability = data.sizes;
          sizes = Object.keys(data.sizes);
        }
      }
    }

    // Check if product is in stock based on availability
    // Product is in stock if at least one size is available
    let inStock = data.in_stock !== false; // Default to true
    if (Object.keys(sizeAvailability).length > 0) {
      inStock = Object.values(sizeAvailability).some(available => available === true);
    }

    const transformedData = {
      id: data.id,
      title: data.title,
      description: data.description,
      price: Number(data.price),
      oldPrice: data.old_price ? Number(data.old_price) : undefined,
      imageUrl: data.image_url,
      colors: data.colors || [],
      sizes: sizes,
      sizeAvailability: Object.keys(sizeAvailability).length > 0 ? sizeAvailability : undefined,
      inStock: inStock,
      category: data.category,
    };

    return { data: transformedData, error: null };
  } catch (error: any) {
    console.error('Unexpected error fetching product by ID:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Create a new product
 */
export async function createProduct(product: CreateProductPayload): Promise<{ data: Product | null; error: string | null }> {
  try {
    // Convert to database structure
    const dbProduct: any = {
      title: product.title,
      description: product.description,
      price: product.price,
      image_url: product.image_url,
      category: product.category || 'bermuda',
      in_stock: product.in_stock !== false,
    };

    if (product.old_price !== undefined) {
      dbProduct.old_price = product.old_price;
    }

    if (product.colors && product.colors.length > 0) {
      dbProduct.colors = product.colors;
    }

    // Store sizes as JSONB - prefer sizeAvailability if available, otherwise use sizes array
    if (product.sizeAvailability && Object.keys(product.sizeAvailability).length > 0) {
      dbProduct.sizes = product.sizeAvailability;
      // Auto-set in_stock based on availability: if all sizes are unavailable, mark as out of stock
      const hasAvailableSize = Object.values(product.sizeAvailability).some(available => available === true);
      dbProduct.in_stock = hasAvailableSize;
    } else if (product.sizes && product.sizes.length > 0) {
      // Convert sizes array to object with all sizes available by default
      const sizesObj: Record<string, boolean> = {};
      product.sizes.forEach(size => {
        sizesObj[size] = true; // All sizes available by default
      });
      dbProduct.sizes = sizesObj;
      dbProduct.in_stock = true; // At least one size is available
    } else {
      // No sizes specified, use default sizes (all available)
      dbProduct.sizes = { M: true, L: true, XL: true, '2XL': true, '3XL': true, '4XL': true, '5XL': true };
      dbProduct.in_stock = true;
    }

    const { data, error } = await supabase
      .from('zo-products')
      .insert([dbProduct])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return { data: null, error: error.message };
    }

    // Transform response - handle sizes
    let sizes: string[] = [];
    let sizeAvailability: Record<string, boolean> = {};
    
    if (data.sizes) {
      if (typeof data.sizes === 'object' && !Array.isArray(data.sizes)) {
        sizeAvailability = data.sizes;
        sizes = Object.keys(data.sizes);
      } else if (Array.isArray(data.sizes)) {
        sizes = data.sizes;
        // Convert to availability object (all true by default)
        sizes.forEach(size => {
          sizeAvailability[size] = true;
        });
      }
    }

    const transformedData = {
      id: data.id,
      title: data.title,
      description: data.description,
      price: Number(data.price),
      oldPrice: data.old_price ? Number(data.old_price) : undefined,
      imageUrl: data.image_url,
      colors: data.colors || [],
      sizes: sizes,
      sizeAvailability: Object.keys(sizeAvailability).length > 0 ? sizeAvailability : undefined,
      inStock: data.in_stock !== false,
      category: data.category,
    };

    return { data: transformedData, error: null };
  } catch (error: any) {
    console.error('Unexpected error creating product:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Update a product
 */
export async function updateProduct(
  productId: string,
  updates: UpdateProductPayload
): Promise<{ data: Product | null; error: string | null }> {
  try {
    const dbUpdates: any = {};

    if (updates.title !== undefined) dbUpdates.title = updates.title;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.old_price !== undefined) dbUpdates.old_price = updates.old_price;
    if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.in_stock !== undefined) dbUpdates.in_stock = updates.in_stock;

    if (updates.colors !== undefined) {
      dbUpdates.colors = updates.colors;
    }

    // Handle sizes updates
    if (updates.sizeAvailability !== undefined) {
      dbUpdates.sizes = updates.sizeAvailability;
      // Auto-set in_stock based on availability: if all sizes are unavailable, mark as out of stock
      const hasAvailableSize = Object.values(updates.sizeAvailability).some(available => available === true);
      dbUpdates.in_stock = hasAvailableSize;
    } else if (updates.sizes !== undefined) {
      // If sizes array is provided, convert to object (all available by default)
      const sizesObj: Record<string, boolean> = {};
      updates.sizes.forEach(size => {
        sizesObj[size] = true;
      });
      dbUpdates.sizes = sizesObj;
      dbUpdates.in_stock = true; // At least one size is available
    }

    const { data, error } = await supabase
      .from('zo-products')
      .update(dbUpdates)
      .eq('id', productId)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return { data: null, error: error.message };
    }

    // Transform response - handle sizes
    let sizes: string[] = [];
    let sizeAvailability: Record<string, boolean> = {};
    
    if (data.sizes) {
      if (typeof data.sizes === 'object' && !Array.isArray(data.sizes)) {
        sizeAvailability = data.sizes;
        sizes = Object.keys(data.sizes);
      } else if (Array.isArray(data.sizes)) {
        sizes = data.sizes;
        // Convert to availability object (all true by default)
        sizes.forEach(size => {
          sizeAvailability[size] = true;
        });
      }
    }

    const transformedData = {
      id: data.id,
      title: data.title,
      description: data.description,
      price: Number(data.price),
      oldPrice: data.old_price ? Number(data.old_price) : undefined,
      imageUrl: data.image_url,
      colors: data.colors || [],
      sizes: sizes,
      sizeAvailability: Object.keys(sizeAvailability).length > 0 ? sizeAvailability : undefined,
      inStock: data.in_stock !== false,
      category: data.category,
    };

    return { data: transformedData, error: null };
  } catch (error: any) {
    console.error('Unexpected error updating product:', error);
    return { data: null, error: error.message || 'Unknown error' };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase
      .from('zo-products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error deleting product:', error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error: any) {
    console.error('Unexpected error deleting product:', error);
    return { error: error.message || 'Unknown error' };
  }
}

