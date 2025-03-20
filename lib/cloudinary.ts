'use client';

// Define Cloudinary upload result type
export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  format: string;
  width: number;
  height: number;
  resource_type: string;
  url: string;
  // Additional properties with unknown type
  [key: string]: string | number | boolean | unknown;
}

// Function to upload image via the API route instead of direct Cloudinary access
export const uploadImage = async (file: File, options?: { width?: number; height?: number; quality?: number }): Promise<string> => {
  if (!file) {
    throw new Error('No file provided');
  }

  // Create form data for the file
  const formData = new FormData();
  formData.append('file', file);
  
  // Add options if provided
  if (options) {
    if (options.width) formData.append('width', options.width.toString());
    if (options.height) formData.append('height', options.height.toString());
    if (options.quality) formData.append('quality', options.quality.toString());
  }
  
  try {
    // Use the API route instead of direct Cloudinary integration
    const response = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to upload image');
    }
    
    const data = await response.json();
    return data.imageUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }
}; 