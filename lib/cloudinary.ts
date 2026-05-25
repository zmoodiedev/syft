'use client';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
  url: string;
  [key: string]: string | number | boolean | unknown;
}

const MAX_DIMENSION = 1200;
const CLIENT_QUALITY = 0.85; // JPEG quality before server re-encodes to WebP

/**
 * Resize to MAX_DIMENSION, re-encode as JPEG via canvas.
 * Canvas draw strips all EXIF/IPTC/GPS metadata automatically.
 */
async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let w = img.naturalWidth;
      let h = img.naturalHeight;

      if (w > MAX_DIMENSION || h > MAX_DIMENSION) {
        if (w >= h) {
          h = Math.round((h * MAX_DIMENSION) / w);
          w = MAX_DIMENSION;
        } else {
          w = Math.round((w * MAX_DIMENSION) / h);
          h = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas serialisation failed'));
            return;
          }
          resolve(
            new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
          );
        },
        'image/jpeg',
        CLIENT_QUALITY
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image failed to load for compression'));
    };

    img.src = objectUrl;
  });
}

export const uploadImage = async (
  file: File,
  token: string,
  options?: { width?: number; height?: number; quality?: number }
): Promise<string> => {
  if (!file) throw new Error('No file provided');

  // Compress + strip EXIF client-side before the file leaves the device
  const processed = await compressImage(file);

  const formData = new FormData();
  formData.append('file', processed);

  if (options) {
    if (options.width) formData.append('width', options.width.toString());
    if (options.height) formData.append('height', options.height.toString());
    if (options.quality) formData.append('quality', options.quality.toString());
  }

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to upload image');
  }

  const data = await response.json();
  return data.imageUrl;
};

export async function deleteImage(imageUrl: string, token: string) {
  const response = await fetch('/api/delete-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Failed to delete image: ${errorData.error || response.statusText || response.status}`);
  }

  return await response.json();
}
