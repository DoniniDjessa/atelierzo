/**
 * Supabase Storage utilities for image management
 */

import { supabase } from './client';

const BUCKET_NAME = 'zo-bucket';

/**
 * Upload an image file to Supabase Storage
 * @param file - The image file (will be compressed to WebP)
 * @param path - The path where to store the image (e.g., 'products/product-id-image.webp')
 * @returns Promise with public URL of uploaded image
 */
export async function uploadImage(
  file: File | Blob,
  path: string
): Promise<{ url: string; error: null } | { url: null; error: string }> {
  try {
    // Upload file to Supabase Storage
    const fileType = file instanceof File ? file.type : 'image/webp';
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
        contentType: fileType,
      });

    if (error) {
      console.error('Error uploading image:', error);
      return { url: null, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Error uploading image:', error);
    return { url: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete an image from Supabase Storage
 * @param path - The path of the image to delete (e.g., 'products/product-id-image.webp')
 * @returns Promise with success status
 */
export async function deleteImage(
  path: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Error deleting image:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Error deleting image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete image from URL (extracts path and deletes)
 * @param url - The public URL of the image
 * @returns Promise with success status
 */
export async function deleteImageFromUrl(
  url: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Extract path from URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${BUCKET_NAME}/`);
    
    if (pathParts.length < 2) {
      return { success: false, error: 'Invalid image URL' };
    }

    const path = pathParts[1];
    return deleteImage(path);
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid URL format',
    };
  }
}

/**
 * Check if an image URL belongs to our Supabase bucket
 */
export function isSupabaseImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.includes(`/${BUCKET_NAME}/`);
  } catch {
    return false;
  }
}

