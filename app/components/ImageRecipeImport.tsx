'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import { createWorker } from 'tesseract.js';

interface ImageRecipeImportProps {
  onRecipeExtracted: (recipe: {
    name: string;
    ingredients: string[];
    instructions: string[];
  }) => void;
}

interface ExtractedRecipe {
  name: string;
  ingredients: string[];
  instructions: string[];
}

interface TesseractWorker {
  loadLanguage: (lang: string) => Promise<void>;
  initialize: (lang: string) => Promise<void>;
  recognize: (image: string) => Promise<{ data: { text: string } }>;
  terminate: () => Promise<void>;
}

export default function ImageRecipeImport({ onRecipeExtracted }: ImageRecipeImportProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
      processImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (imageUrl) {
      processImage(imageUrl);
    }
  };

  const processImage = async (imageSource: string) => {
    setIsProcessing(true);
    try {
      const worker = await createWorker();
      const tesseractWorker = worker as unknown as TesseractWorker;
      await tesseractWorker.loadLanguage('eng');
      await tesseractWorker.initialize('eng');
      const { data: { text } } = await tesseractWorker.recognize(imageSource);
      await tesseractWorker.terminate();

      // Extract recipe information
      const lines = text.split('\n').filter(line => line.trim());
      const recipe: ExtractedRecipe = {
        name: lines[0] || '',
        ingredients: [],
        instructions: []
      };

      let section: 'ingredients' | 'instructions' | null = null;
      for (const line of lines.slice(1)) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('ingredient')) {
          section = 'ingredients';
          continue;
        } else if (lowerLine.includes('instruction') || lowerLine.includes('direction')) {
          section = 'instructions';
          continue;
        }

        if (section === 'ingredients' && line.trim()) {
          recipe.ingredients = [...recipe.ingredients, line.trim()];
        } else if (section === 'instructions' && line.trim()) {
          recipe.instructions = [...recipe.instructions, line.trim()];
        }
      }

      onRecipeExtracted(recipe);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        Import Recipe from Image
      </h2>
      <div className="space-y-6">
        {/* File Upload */}
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            className="hidden"
          />
          <Button
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : 'Upload Image'}
          </Button>
        </div>

        {/* URL Input */}
        <div>
          <p className="text-sm text-gray-600 mb-2">Or enter an image URL:</p>
          <form onSubmit={handleUrlSubmit} className="flex gap-4">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/recipe-image.jpg"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
            <Button
              variant="primary"
              type="submit"
              disabled={isProcessing || !imageUrl}
            >
              {isProcessing ? 'Processing...' : 'Import'}
            </Button>
          </form>
        </div>

        {/* Preview */}
        {imageUrl && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4"
          >
            <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
            <div className="relative h-48 rounded-lg overflow-hidden bg-gray-100">
              <img
                src={imageUrl}
                alt="Recipe preview"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
} 