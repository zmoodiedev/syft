import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import Image from 'next/image';

export const RECIPE_CATEGORIES = [
  // Main Meal Types
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Appetizer', 'Side Dish',
  // Dietary Preferences
  'Vegetarian', 'Vegan',
  // Protein Types
  'Chicken', 'Beef', 'Fish', 'Seafood', 'Turkey',
  // Cooking Methods
  'Baking',
  // Course Types
  'Dessert', 'Salad', 'Soup', 'Sandwich', 'Pizza', 'Pasta', 'Rice'
];

interface Ingredient {
  amount: string;
  unit: string;
  item: string;
  id: string;
}

interface RecipeFormData {
  name: string;
  servings: string;
  prepTime: string;
  cookTime: string;
  imageUrl?: string;
}

export default function RecipeForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [isPreviewingImage, setIsPreviewingImage] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { amount: '', unit: '', item: '', id: '1' }
  ]);
  const [instructions, setInstructions] = useState<string[]>(['']);

  const { register, handleSubmit, formState: { errors } } = useForm<RecipeFormData>();

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

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      return [...prev, category];
    });
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

  const onSubmit: SubmitHandler<RecipeFormData> = async (data) => {
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
        categories: selectedCategories || [],
        userId: user.uid,
        createdAt: serverTimestamp(),
        imageUrl: imageUrl || null,
      };

      await addDoc(collection(db, 'recipes'), recipeData);
      toast.success('Recipe submitted successfully!');
      router.push('/recipes');
    } catch (error) {
      console.error('Error submitting recipe:', error);
      toast.error('Failed to submit recipe');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
            className="mt-1 border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
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
              className="mt-1 border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
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
              className="mt-1 border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
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
              className="mt-1 border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
            />
          </div>
        </div>

        {/* Image URL Section */}
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700">
            Recipe Image URL (optional)
          </label>
          <div className="flex mt-1">
            <input
              id="imageUrl"
              type="text"
              value={imageUrl}
              onChange={handleImageUrlChange}
              placeholder="https://example.com/image.jpg"
              className="border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
            />
            <button
              type="button"
              onClick={validateAndPreviewImage}
              className="px-4 bg-primary-500 text-white rounded-r-md hover:bg-primary-600 transition-colors"
            >
              Preview
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Enter a URL pointing to an image (.jpg, .png, .gif, etc.)
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

      {/* Ingredients Section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Ingredients
        </label>
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div key={ingredient.id} className="flex items-center space-x-2">
              <input
                value={ingredient.amount}
                onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                placeholder="Amount"
                className="w-1/5 border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
              />
              <input
                value={ingredient.unit}
                onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                placeholder="Unit"
                className="w-1/5 border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
              />
              <input
                value={ingredient.item}
                onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                placeholder="Ingredient"
                required
                className="border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
              />
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addIngredient}
          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          + Add Ingredient
        </button>
      </div>

      {/* Instructions Section */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Instructions
        </label>
        <div className="space-y-3">
          {instructions.map((instruction, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-sm font-medium w-8">{index + 1}.</span>
              <input
                value={instruction}
                onChange={(e) => updateInstruction(index, e.target.value)}
                placeholder="Instruction step"
                required
                className="flex-1 border border-medium-grey rounded w-full py-2 px-3 text-gray-700 leading-tight focus:shadow-outline"
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
        <button
          type="button"
          onClick={addInstruction}
          className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          + Add Step
        </button>
      </div>

      {/* Categories Section */}
      <div className="space-y-2">
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
        <button
          type="submit"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          Save Recipe
        </button>
      </div>
    </form>
  );
} 