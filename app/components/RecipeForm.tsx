import { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { uploadImage } from '@/lib/cloudinary';
import Button from './Button';

// Default categories for new users
export const DEFAULT_CATEGORIES = [
  // Main Meal Types
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Baking',
  
];

// Legacy variable maintained for backward compatibility
export const RECIPE_CATEGORIES = DEFAULT_CATEGORIES;

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
  sourceUrl?: string;
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
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Recipe>({
    defaultValues: {
      name: initialData?.name || '',
      servings: initialData?.servings || '',
      prepTime: initialData?.prepTime || '',
      cookTime: initialData?.cookTime || '',
      sourceUrl: initialData?.sourceUrl || '',
    }
  });

  // Fetch user's custom categories
  useEffect(() => {
    const fetchUserCategories = async () => {
      if (!user) return;
      
      try {
        setIsLoadingCategories(true);
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists() && userDoc.data().customCategories) {
          // Check for duplicate categories to avoid key errors
          const userCustomCategories = userDoc.data().customCategories;
          
          // Merge default categories with custom categories
          const allCategories = [...DEFAULT_CATEGORIES];
          
          // Add user custom categories that don't exist in default categories
          userCustomCategories.forEach((category: string) => {
            if (!allCategories.includes(category)) {
              allCategories.push(category);
            }
          });
          
          setUserCategories(allCategories);
        } else {
          // If user doesn't have custom categories yet, use defaults
          setUserCategories(DEFAULT_CATEGORIES);
        }
      } catch (error) {
        console.error('Error fetching user categories:', error);
        toast.error('Failed to load your categories');
        // Fallback to default categories
        setUserCategories(DEFAULT_CATEGORIES);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    
    fetchUserCategories();
  }, [user]);

  // Set form values when initialData changes
  useEffect(() => {
    if (initialData) {
      setValue('name', initialData.name);
      setValue('servings', initialData.servings || '');
      setValue('prepTime', initialData.prepTime);
      setValue('cookTime', initialData.cookTime);
      setValue('sourceUrl', initialData.sourceUrl || '');
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

  const handleAddNewCategory = async () => {
    if (!user) {
      toast.error('Please sign in to add custom categories');
      return;
    }
    
    if (!newCategory.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    
    if (userCategories.includes(newCategory.trim())) {
      toast.error('This category already exists');
      return;
    }
    
    try {
      const updatedCategories = [...userCategories, newCategory.trim()];
      setUserCategories(updatedCategories);
      setSelectedCategories(prev => [...prev, newCategory.trim()]);
      
      // Only store custom categories that aren't in the defaults
      const userRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userRef);
      const existingCustomCategories = userDocSnap.exists() && userDocSnap.data().customCategories 
        ? userDocSnap.data().customCategories 
        : [];
        
      if (!DEFAULT_CATEGORIES.includes(newCategory.trim())) {
        // Update in Firestore - only store truly custom categories
        const userCustomCategoriesUpdated = [...existingCustomCategories, newCategory.trim()];
        
        await updateDoc(userRef, {
          customCategories: userCustomCategoriesUpdated,
          updatedAt: serverTimestamp()
        });
      }
      
      setNewCategory('');
      toast.success('Category added successfully');
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-10 max-w-8xl mx-auto">
      {/* Basic Info Section */}
      <div className="space-y-6 md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100">
        <h2 className="text-2xl font-bold bg-basil bg-clip-text text-transparent">
          Recipe Details
        </h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Recipe Name
            </label>
            <input
              id="name"
              type="text"
              {...register("name", { required: "Recipe name is required" })}
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
              placeholder="Enter recipe name"
            />
            {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="servings" className="block text-sm font-medium text-gray-700 mb-2">
                Servings
              </label>
              <input
                id="servings"
                type="text"
                {...register("servings")}
                placeholder="e.g., 4"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
              />
            </div>

            <div>
              <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700 mb-2">
                Prep Time
              </label>
              <input
                id="prepTime"
                type="text"
                {...register("prepTime")}
                placeholder="e.g., 15 mins"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
              />
            </div>

            <div>
              <label htmlFor="cookTime" className="block text-sm font-medium text-gray-700 mb-2">
                Cook Time
              </label>
              <input
                id="cookTime"
                type="text"
                {...register("cookTime")}
                placeholder="e.g., 30 mins"
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
              />
            </div>
          </div>

          <div>
            <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Original Source
            </label>
            <input
              id="sourceUrl"
              type="url"
              {...register("sourceUrl")}
              placeholder="https://example.com/recipe"
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
            />
          </div>
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100">
        <h2 className="text-2xl font-bold text-basil mb-6">
          Recipe Image
        </h2>
        
        <div className="space-y-6">
          <div className="flex flex-col space-y-4">
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
              className="w-full md:w-auto py-3"
            >
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </Button>
            
            <div className="flex items-center justify-center my-4">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="px-4 text-sm text-gray-500">or</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4">
              <input
                id="imageUrl"
                type="text"
                value={imageUrl}
                onChange={handleImageUrlChange}
                placeholder="https://example.com/image.jpg"
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
              />
              <Button
                type="button"
                onClick={validateAndPreviewImage}
                variant='primary'
                className="w-full md:w-auto py-3"
                size="sm"
              >
                Preview
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Upload an image file or enter a URL. Maximum file size: 5MB.
          </p>
          
          {isPreviewingImage && (
            <div className="mt-6">
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

      {/* Ingredients Section */}
      <div className="md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100">
        <h2 className="text-2xl font-bold text-basil mb-6">
          Ingredients
        </h2>
        
        <div className="space-y-6">
          <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-medium text-gray-500 border-b pb-3">
            <div className="col-span-3">Amount</div>
            <div className="col-span-3">Unit</div>
            <div className="col-span-5">Ingredient</div>
            <div className="col-span-1"></div>
          </div>
          
          <div className="space-y-6">
            {ingredients.map((ingredient, index) => (
              <div key={ingredient.id} className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 md:col-span-6 grid grid-cols-2 gap-4">
                  <input
                    value={ingredient.amount}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                    placeholder="Amount"
                    className="rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
                  />
                  <input
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                    placeholder="Unit"
                    className="rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
                  />
                </div>
                <div className="col-span-11 md:col-span-5">
                  <input
                    value={ingredient.item}
                    onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                    placeholder="Ingredient"
                    required
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50"
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
            className="w-full md:w-auto py-3"
            size="sm"
          >
            + Add Ingredient
          </Button>
        </div>
      </div>

      {/* Instructions Section */}
      <div className="md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100">
        <h2 className="text-2xl font-bold text-basil mb-6">
          Instructions
        </h2>
        
        <div className="space-y-6">
          {instructions.map((instruction, index) => (
            <div key={index} className="flex items-start space-x-4 flex-col lg:flex-row">
              <div className="flex-shrink-0 w-20 h-10 flex items-center justify-center text-cast-iron font-medium">
                STEP {index + 1}
              </div>
              <div className="flex-1 w-full">
                <textarea
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  placeholder="Enter instruction step"
                  required
                  rows={1}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base resize-none overflow-hidden"
                />
              </div>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeInstruction(index)}
                  className="flex-shrink-0 text-tomato hover:opacity-90 rounded-full w-8 h-8"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          
          <Button
            type="button"
            onClick={addInstruction}
            variant='outline'
            className="w-full md:w-auto py-3"
            size="sm"
          >
            + Add Step
          </Button>
        </div>
      </div>

      {/* Categories Section */}
      <div className="md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-basil mb-6">
          Categories
        </h2>

        <p className="text-sm text-gray-600">Select categories that apply to your recipe</p>
        
        {isLoadingCategories ? (
          <div className="py-4 text-center">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-emerald-500"></div>
            <span className="ml-2">Loading categories...</span>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {userCategories.map(category => (
              <div key={category} className="relative group">
                <button
                  type="button"
                  onClick={() => handleCategoryChange(category)}
                  className={`
                    touch-action-manipulation
                    px-3 py-1 rounded-full text-sm font-medium 
                    transition-all duration-150 
                    focus:outline-none 
                    ${selectedCategories.includes(category)
                        ? 'bg-basil text-white hover:bg-basil hover:text-white' 
                        : 'bg-white text-steel hover:bg-gray-100'
                    }
                    active:shadow-inner active:scale-95
                `}
                aria-pressed={selectedCategories.includes(category)}
                >
                  {category}
                </button>
                
              </div>
            ))}
          </div>
        )}
        {/* Add new category input */}
        <div className="flex gap-2 mb-4 flex-col md:flex-row">
          <input 
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add a new category..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleAddNewCategory}
          >
            + Add Category
          </Button>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          type="submit"
          variant='primary'
          className="w-full md:w-auto py-3 px-8"
        >
          {submitButtonText}
        </Button>
      </div>
    </form>
  );
} 