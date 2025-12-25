/**
 * Image compression and WebP conversion utilities
 */

/**
 * Compress and convert an image file to WebP format
 * @param file - The image file to compress
 * @param maxWidth - Maximum width (default: 1200)
 * @param maxHeight - Maximum height (default: 1200)
 * @param quality - Compression quality 0-1 (default: 0.7 for high compression)
 * @returns Promise<Blob> - Compressed WebP image blob
 */
export async function compressImageToWebP(
  file: File,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.7
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to convert image to WebP'));
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Get file extension from filename or URL
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * Generate a unique filename for upload
 */
export function generateImageFilename(productId: string, originalFilename?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const extension = originalFilename ? getFileExtension(originalFilename) : 'webp';
  return `${productId}_${timestamp}_${random}.${extension === 'webp' ? 'webp' : 'webp'}`;
}

/**
 * Extract file path from Supabase Storage URL
 */
export function extractFilePathFromUrl(url: string, bucket: string): string | null {
  try {
    // Extract path from URL like: https://[project].supabase.co/storage/v1/object/public/zo-bucket/path/to/file.webp
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split(`/${bucket}/`);
    if (pathParts.length > 1) {
      return pathParts[1];
    }
    return null;
  } catch {
    return null;
  }
}

