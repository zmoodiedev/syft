import { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { uploadImage } from '@/lib/cloudinary';
import Button from './Button';

export const RECIPE_CATEGORIES = [
  // Main Meal Types
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Appetizer', 'Side Dish',
  // Dietary Preferences
  'Vegetarian', 'Vegan',
  // Protein Types
  'Chicken', 'Beef', 'Fish', 'Seafood',
  // Cooking Methods
  'Air Fryer', 'Grilling', 'Baking',
  // Course Types
  'Main Course', 'Dessert', 'Salad', 'Soup', 'Sandwich', 'Pizza', 'Pasta', 'Rice',
];

interface Ingredient {
  amount: string;
  unit: string;
  item: string;
  id: string;
}

export interface Recipe {
  id?: string;
  name: string;
  servings?: string;
  prepTime: string;
  cookTime: string;
  ingredients: Ingredient[];
  instructions: string[];
  categories?: string[];
  imageUrl?: string | null;
  userId?: string;
}

interface RecipeFormProps {
  initialData?: Recipe;
  onSubmit?: (data: Recipe) => Promise<void>;
  submitButtonText?: string;
}

export default function RecipeForm({ initialData, onSubmit, submitButtonText = 'Save Recipe' }: RecipeFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialData?.categories || []);
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [isPreviewingImage, setIsPreviewingImage] = useState(!!initialData?.imageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients && initialData.ingredients.length > 0 
      ? initialData.ingredients.map(ing => ({ ...ing, id: ing.id || String(Date.now() + Math.random()) }))
      : [{ amount: '', unit: '', item: '', id: '1' }]
  );
  const [instructions, setInstructions] = useState<string[]>(
    initialData?.instructions && initialData.instructions.length > 0
      ? initialData.instructions
      : ['']
  );

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Recipe>({
    defaultValues: {
      name: initialData?.name || '',
      servings: initialData?.servings || '',
      prepTime: initialData?.prepTime || '',
      cookTime: initialData?.cookTime || '',
    }
  });

  // Set form values when initialData changes
  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('servings', initialData.servings || '');
      setValue('prepTime', initialData.prepTime);
      setValue('cookTime', initialData.cookTime);
      setSelectedCategories(initialData.categories || []);
      setImageUrl(initialData.imageUrl || '');
      setIsPreviewingImage(!!initialData.imageUrl);
    }
  }, [initialData, setValue]);

  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { amount: '', unit: '', item: '', id: Date.now().toString() }
    ]);
  };

  const removeIngredient = (indexToRemove: number) => {
    setIngredients(ingredients.filter((_, index) => index !== indexToRemove));
  };

  const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
    const updatedIngredients = [...ingredients];
    updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
    setIngredients(updatedIngredients);
  };

  const addInstruction = () => {
    setInstructions([...instructions, '']);
  };

  const removeInstruction = (indexToRemove: number) => {
    setInstructions(instructions.filter((_, index) => index !== indexToRemove));
  };

  const updateInstruction = (index: number, value: string) => {
    const updatedInstructions = [...instructions];
    updatedInstructions[index] = value;
    setInstructions(updatedInstructions);
  };

  // Handle image URL input and validation
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setIsPreviewingImage(false);
  };

  // Validate and preview the image
  const validateAndPreviewImage = () => {
    if (!imageUrl.trim()) {
      toast.error("Please enter an image URL");
      return;
    }
    
    // Simple URL validation
    if (!imageUrl.match(/^https?:\/\/.+\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) {
      toast.error("Please enter a valid image URL (ending with .jpg, .png, .gif, etc.)");
      return;
    }
    
    setIsPreviewingImage(true);
  };

  // Handle file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image file (JPEG, PNG, GIF, WEBP)');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Upload directly using optimized Cloudinary client utility
      const imageUrl = await uploadImage(file, {
        width: 1200,
        quality: 80
      });
      
      setImageUrl(imageUrl);
      setIsPreviewingImage(true);
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };
  
  // Trigger file input click
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
  };

  const handleFormSubmit: SubmitHandler<Recipe> = async (data) => {
    if (!user) {
      toast.error('Please sign in to submit a recipe');
      return;
    }

    // Validate required fields
    if (ingredients.some(ing => !ing.item)) {
      toast.error('Please enter all ingredient names');
      return;
    }

    if (instructions.some(instruction => !instruction)) {
      toast.error('Please fill out all instruction steps');
      return;
    }

    try {
      const recipeData = {
        ...data,
        ingredients,
        instructions,
        categories: selectedCategories,
        userId: user.uid,
        imageUrl: imageUrl || null,
        ...(initialData?.id ? { id: initialData.id } : {})
      };

      // If a custom onSubmit function is provided, use it
      if (onSubmit) {
        await onSubmit(recipeData);
        return;
      }

      // Otherwise, perform the default create operation
      await addDoc(collection(db, 'recipes'), {
        ...recipeData,
        createdAt: serverTimestamp(),
      });
      toast.success('Recipe submitted successfully!');
      router.push('/recipes');
    } catch (error) {
      console.error('Error submitting recipe:', error);
      toast.error('Failed to submit recipe');
    }
  };

  // Add this new function at the component level
  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  // Add this new useEffect
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((textarea) => {
      adjustTextareaHeight(textarea as HTMLTextAreaElement);
    });
  }, [instructions]); // Re-run when instructions change

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Basic Info Section */}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Recipe Name
          </label>
          <input
            id="name"
            type="text"
            {...register("name", { required: "Recipe name is required" })}
            className="mt-1 border border-steel rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="servings" className="block text-sm font-medium text-gray-700">
              Servings
            </label>
            <input
              id="servings"
              type="text"
              {...register("servings")}
              placeholder="e.g., 4"
              className="mt-1 border border-steel rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
            />
          </div>

          <div>
            <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700">
              Prep Time
            </label>
            <input
              id="prepTime"
              type="text"
              {...register("prepTime")}
              placeholder="e.g., 15 mins"
              className="mt-1 border border-steel rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
            />
          </div>

          <div>
            <label htmlFor="cookTime" className="block text-sm font-medium text-gray-700">
              Cook Time
            </label>
            <input
              id="cookTime"
              type="text"
              {...register("cookTime")}
              placeholder="e.g., 30 mins"
              className="mt-1 border border-steel rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
            />
          </div>
        </div>

        {/* Image Upload Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipe Image
          </label>
          
          <div className="flex flex-col space-y-3">
            {/* File Upload */}
            <div className="flex items-center gap-3 flex-col md:flex-row">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                onClick={handleUploadClick}
                disabled={isUploading}
                variant='outline'
              >
                {isUploading ? 'Uploading...' : 'Upload Image'}
              </Button>
              
              <span className="text-sm text-gray-500">or</span>
              
              {/* URL Input */}
              <div className="flex-1 flex">
                <input
                  id="imageUrl"
                  type="text"
                  value={imageUrl}
                  onChange={handleImageUrlChange}
                  placeholder="https://example.com/image.jpg"
                  className="border border-steel rounded-l w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
                />
                <Button
                  type="button"
                  onClick={validateAndPreviewImage}
                  className="rounded-r rounded-l-none"
                >
                  Preview
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-gray-500">
              Upload an image file or enter a URL. Maximum file size: 5MB.
            </p>
            
            {/* Image Preview */}
            {isPreviewingImage && imageUrl && (
              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Image Preview:</p>
                <div className="relative h-48 w-full rounded-lg overflow-hidden border border-gray-200">
                  <Image 
                    src={imageUrl} 
                    alt="Recipe preview" 
                    fill
                    className="object-cover"
                    onError={() => {
                      toast.error("Failed to load image");
                      setIsPreviewingImage(false);
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ingredients Section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Ingredients
        </label>
        <div className="gap-2 mb-2 hidden md:flex md:flex-row">
          <div className="w-1/4"><h5>Amount</h5></div>
          <div className="w-1/4"><h5>Unit</h5></div>
          <div className="w-full md:w-1/2"><h5>Ingredient</h5></div>
        </div>
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div key={ingredient.id} className="flex flex-col md:flex-row gap-2 mb-6">
              <div className="flex gap-2 w-full md:w-1/2">
                <input
                  value={ingredient.amount}
                  onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                  placeholder="Amount"
                  className="w-1/2 border border-steel rounded py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
                />
                <input
                  value={ingredient.unit}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  placeholder="Unit"
                  className="w-1/2 border border-steel rounded py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
                />
              </div>
              <div className="flex gap-2 w-full md:w-1/2">
                <input
                  value={ingredient.item}
                  onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                  placeholder="Ingredient"
                  required
                  className="flex-1 border border-steel rounded py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
                />
                {index >= 0 && (
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={addIngredient}
          variant='outline'
        >
          + Add Ingredient
        </Button>
      </div>

      {/* Instructions Section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Instructions
        </label>
        <div className="space-y-3 mb-6">
          {instructions.map((instruction, index) => (
            <div key={index} className="flex items-start space-x-2">
              <span className="text-sm font-medium w-8">{index + 1}.</span>
              <textarea
                value={instruction}
                onChange={(e) => updateInstruction(index, e.target.value)}
                placeholder="Instruction step"
                required
                rows={1}
                onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                className="border border-steel rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline resize-none overflow-hidden"
              />
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <Button
          type="button"
          onClick={addInstruction}
          variant='outline'
        >
          + Add Step
        </Button>
      </div>

      {/* Categories Section */}
      <div className="space-y-2 mb-6">
        <label className="block text-sm font-medium text-gray-700">
          Categories
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {RECIPE_CATEGORIES.map((category) => (
            <label key={category} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={selectedCategories.includes(category)}
                onChange={() => handleCategoryChange(category)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          className="mx-auto"
        >
          {submitButtonText}
        </Button>
      </div>
    </form>
  );
} 