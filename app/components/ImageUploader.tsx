import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { uploadImage } from '@/lib/cloudinary';

interface ImageUploaderProps {
  initialImageUrl?: string | null;
  onImageUpload: (imageUrl: string) => void;
  className?: string;
}

export default function ImageUploader({
  initialImageUrl,
  onImageUpload,
  className = ''
}: ImageUploaderProps) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl || '');
  const [isPreviewingImage, setIsPreviewingImage] = useState(!!initialImageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUrlInput(e.target.value);
  };

  const validateAndPreviewImage = () => {
    if (!urlInput) return;
    
    try {
      // Simple URL validation
      new URL(urlInput);
      setImageUrl(urlInput);
      setIsPreviewingImage(true);
      onImageUpload(urlInput);
    } catch {
      alert('Please enter a valid URL');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }
      
      // Upload image to Cloudinary
      const uploadedImageUrl = await uploadImage(file, {
        width: 1200,
        quality: 80
      });
      
      setImageUrl(uploadedImageUrl);
      setIsPreviewingImage(true);
      onImageUpload(uploadedImageUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const resetImage = () => {
    setImageUrl('');
    setIsPreviewingImage(false);
    setUrlInput('');
    onImageUpload('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <h3 className="font-medium text-gray-900 mb-2">Recipe Image</h3>
      
      {isPreviewingImage ? (
        <div className="relative">
          <div className="relative w-full h-48 mb-2 rounded-md overflow-hidden">
            <Image 
              src={imageUrl} 
              alt="Recipe preview" 
              fill
              className="object-cover"
            />
          </div>
          <button
            type="button"
            onClick={resetImage}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="hidden"
            />
            <button
              type="button"
              onClick={handleUploadClick}
              disabled={isUploading}
              className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              {isUploading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Uploading...
                </span>
              ) : 'Upload Image'}
            </button>
          </div>
          
          <div className="flex items-center">
            <span className="flex-grow border-t border-gray-200"></span>
            <span className="mx-2 text-gray-500 text-sm">or</span>
            <span className="flex-grow border-t border-gray-200"></span>
          </div>
          
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter image URL"
              value={urlInput}
              onChange={handleImageUrlChange}
              className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-light-blue focus:border-light-blue sm:text-sm"
            />
            <button
              type="button"
              onClick={validateAndPreviewImage}
              className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
            >
              Use URL
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 