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
  sizeQuantities?: Record<string, number>; // Object with size as key and quantity as value
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
  sizeQuantities?: Record<string, number>;
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
      // Handle sizes - can be JSONB object (quantity tracking)
      let sizes: string[] = [];
      let sizeQuantities: Record<string, number> = {};
      
      if (item.sizes) {
        if (typeof item.sizes === 'string') {
          try {
            const parsed = JSON.parse(item.sizes);
            if (typeof parsed === 'object' && !Array.isArray(parsed)) {
              sizeQuantities = parsed;
              sizes = Object.keys(parsed);
            } else if (Array.isArray(parsed)) {
              sizes = parsed;
              // Convert to quantities object (default 10 for each)
              sizes.forEach(size => {
                sizeQuantities[size] = 10;
              });
            }
          } catch {
            sizes = [];
          }
        } else if (typeof item.sizes === 'object') {
          if (Array.isArray(item.sizes)) {
            sizes = item.sizes;
            // Convert to quantities object (default 0 for each)
            sizes.forEach(size => {
              sizeQuantities[size] = 0;
            });
          } else {
            sizeQuantities = item.sizes;
            sizes = Object.keys(item.sizes);
          }
        }
      }

      // Check if product is in stock based on quantities
      // Product is in stock if at least one size has quantity > 0
      let inStock = item.in_stock !== false; // Default to true
      if (Object.keys(sizeQuantities).length > 0) {
        inStock = Object.values(sizeQuantities).some(qty => qty > 0);
      }

      return {
        id: item.id,
        title: item.title,
        description: item.description,
        price: Number(item.price),
        old_price: item.old_price ? Number(item.old_price) : undefined,
        oldPrice: item.old_price ? Number(item.old_price) : undefined,
        image_url: item.image_url,
        imageUrl: item.image_url,
        colors: item.colors || [],
        sizes: sizes,
        sizeQuantities: Object.keys(sizeQuantities).length > 0 ? sizeQuantities : undefined,
        in_stock: inStock,
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
    let sizeQuantities: Record<string, number> = {};
    
    if (data.sizes) {
      if (typeof data.sizes === 'string') {
        try {
          const parsed = JSON.parse(data.sizes);
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            sizeQuantities = parsed;
            sizes = Object.keys(parsed);
          } else if (Array.isArray(parsed)) {
            sizes = parsed;
            // Convert to quantities object (default 0 for each)
            sizes.forEach(size => {
              sizeQuantities[size] = 0;
            });
          }
        } catch {
          sizes = [];
        }
      } else if (typeof data.sizes === 'object') {
        if (Array.isArray(data.sizes)) {
          sizes = data.sizes;
          // Convert to quantities object (default 0 for each)
          sizes.forEach(size => {
            sizeQuantities[size] = 0;
          });
        } else {
          sizeQuantities = data.sizes;
          sizes = Object.keys(data.sizes);
        }
      }
    }

    // Check if product is in stock based on quantities
    // Product is in stock if at least one size has quantity > 0
    let inStock = data.in_stock !== false; // Default to true
    if (Object.keys(sizeQuantities).length > 0) {
      inStock = Object.values(sizeQuantities).some(qty => qty > 0);
    }

    const transformedData = {
      id: data.id,
      title: data.title,
      description: data.description,
      price: Number(data.price),
      old_price: data.old_price ? Number(data.old_price) : undefined,
      oldPrice: data.old_price ? Number(data.old_price) : undefined,
      image_url: data.image_url,
      imageUrl: data.image_url,
      colors: data.colors || [],
      sizes: sizes,
      sizeQuantities: Object.keys(sizeQuantities).length > 0 ? sizeQuantities : undefined,
      in_stock: inStock,
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

    // Store sizes as JSONB - prefer sizeQuantities if available, otherwise use sizes array
    if (product.sizeQuantities && Object.keys(product.sizeQuantities).length > 0) {
      dbProduct.sizes = product.sizeQuantities;
      // Auto-set in_stock based on quantities: if all sizes have qty = 0, mark as out of stock
      const hasSizeInStock = Object.values(product.sizeQuantities).some(qty => qty > 0);
      dbProduct.in_stock = hasSizeInStock;
    } else if (product.sizes && product.sizes.length > 0) {
      // Convert sizes array to object with default quantity of 0
      const sizesObj: Record<string, number> = {};
      product.sizes.forEach(size => {
        sizesObj[size] = 0; // Default quantity 0, admin will set stock
      });
      dbProduct.sizes = sizesObj;
      dbProduct.in_stock = false; // No stock until admin sets quantities
    } else {
      // No sizes specified, use default sizes (all with qty 0)
      dbProduct.sizes = { M: 0, L: 0, XL: 0, '2XL': 0, '3XL': 0, '4XL': 0, '5XL': 0 };
      dbProduct.in_stock = false;
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
    let sizeQuantities: Record<string, number> = {};
    
    if (data.sizes) {
      if (typeof data.sizes === 'object' && !Array.isArray(data.sizes)) {
        sizeQuantities = data.sizes;
        sizes = Object.keys(data.sizes);
      } else if (Array.isArray(data.sizes)) {
        sizes = data.sizes;
        // Convert to quantities object (default 0 for each)
        sizes.forEach(size => {
          sizeQuantities[size] = 0;
        });
      }
    }

    const transformedData = {
      id: data.id,
      title: data.title,
      description: data.description,
      price: Number(data.price),
      old_price: data.old_price ? Number(data.old_price) : undefined,
      oldPrice: data.old_price ? Number(data.old_price) : undefined,
      image_url: data.image_url,
      imageUrl: data.image_url,
      colors: data.colors || [],
      sizes: sizes,
      sizeQuantities: Object.keys(sizeQuantities).length > 0 ? sizeQuantities : undefined,
      in_stock: data.in_stock !== false,
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
    if (updates.sizeQuantities !== undefined) {
      dbUpdates.sizes = updates.sizeQuantities;
      // Auto-set in_stock based on quantities: if all sizes have qty = 0, mark as out of stock
      const hasSizeInStock = Object.values(updates.sizeQuantities).some(qty => qty > 0);
      dbUpdates.in_stock = hasSizeInStock;
    } else if (updates.sizes !== undefined) {
      // If sizes array is provided, convert to object (default qty 0)
      const sizesObj: Record<string, number> = {};
      updates.sizes.forEach(size => {
        sizesObj[size] = 0;
      });
      dbUpdates.sizes = sizesObj;
      dbUpdates.in_stock = false; // No stock until quantities set
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
    let sizeQuantities: Record<string, number> = {};
    
    if (data.sizes) {
      if (typeof data.sizes === 'object' && !Array.isArray(data.sizes)) {
        sizeQuantities = data.sizes;
        sizes = Object.keys(data.sizes);
      } else if (Array.isArray(data.sizes)) {
        sizes = data.sizes;
        // Convert to quantities object (default 0 for each)
        sizes.forEach(size => {
          sizeQuantities[size] = 0;
        });
      }
    }

    const transformedData = {
      id: data.id,
      title: data.title,
      description: data.description,
      price: Number(data.price),
      old_price: data.old_price ? Number(data.old_price) : undefined,
      oldPrice: data.old_price ? Number(data.old_price) : undefined,
      image_url: data.image_url,
      imageUrl: data.image_url,
      colors: data.colors || [],
      sizes: sizes,
      sizeQuantities: Object.keys(sizeQuantities).length > 0 ? sizeQuantities : undefined,
      in_stock: data.in_stock !== false,
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

