/**
 * Utility functions for image cropping
 */

import { getAuthClient } from './firebase-client';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Extract a cropped blob from an image using canvas
 */
export async function getCroppedBlob(
  imageSrc: string,
  crop: CropArea
): Promise<Blob> {
  return new Promise<Blob>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.floor(crop.width));
      canvas.height = Math.max(1, Math.floor(crop.height));
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas ei ole tuettu'));
      }
      
      ctx.drawImage(
        image,
        Math.floor(crop.x),
        Math.floor(crop.y),
        Math.floor(crop.width),
        Math.floor(crop.height),
        0,
        0,
        Math.floor(crop.width),
        Math.floor(crop.height)
      );
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Kuvan luonti epäonnistui'));
          }
        },
        'image/jpeg',
        0.95
      );
    };
    
    image.onerror = (e) => reject(e);
    image.src = imageSrc;
  });
}

/**
 * Upload image with multiple aspect ratio crops
 */
export async function uploadImageWithCrops(
  file: File,
  crops: Record<string, CropArea>,
  path: string,
  docId: string
): Promise<{
  original: string;
  crops: Record<string, string>;
}> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('crops', JSON.stringify(crops));
  formData.append('path', path);
  formData.append('docId', docId);

  const auth = await getAuthClient();
  const token = await auth?.currentUser?.getIdToken();

  const response = await fetch('/api/upload-image-crops', {
    method: 'POST',
    headers: token ? { 'x-firebase-auth': token } : undefined,
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    original: data.original,
    crops: data.crops,
  };
}
