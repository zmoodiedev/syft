import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { FiGlobe, FiLock, FiUsers } from 'react-icons/fi';

interface Ingredient {
  amount: string;
  unit: string;
  item: string;
  id: string;
  groupName?: string;
}

interface Instruction {
  text: string;
  id: string;
  groupName?: string;
}

interface Recipe {
  name: string;
  servings?: string;
  prepTime: string;
  cookTime: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  categories?: string[];
  imageUrl?: string | null;
  userId?: string;
  sourceUrl?: string;
  visibility?: string;
}

export default function BulkEntryForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [visibility, setVisibility] = useState('public');
  const [imageUrl, setImageUrl] = useState('');
  const [isPreviewingImage, setIsPreviewingImage] = useState(false);
  
  // Bulk import state
  const [bulkIngredients, setBulkIngredients] = useState<string>('');
  const [bulkInstructions, setBulkInstructions] = useState<string>('');
  
  // Parsed recipe state
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<Recipe>({
    defaultValues: {
      name: '',
      servings: '',
      prepTime: '',
      cookTime: '',
      sourceUrl: '',
    }
  });

  // Parse ingredient text into structured format
  const parseIngredient = (text: string): { amount: string; unit: string; item: string } => {
    const commonUnits = [
      'cup', 'cups', 'c.',
      'tablespoon', 'tablespoons', 'tbsp', 'tbs', 'tbsp.', 'T',
      'teaspoon', 'teaspoons', 'tsp', 'tsp.', 't',
      'ounce', 'ounces', 'oz', 'oz.',
      'pound', 'pounds', 'lb', 'lbs', 'lb.',
      'gram', 'grams', 'g', 'g.',
      'kilogram', 'kilograms', 'kg', 'kg.',
      'milliliter', 'milliliters', 'ml', 'ml.',
      'liter', 'liters', 'l',
      'pinch', 'pinches',
      'dash', 'dashes',
      'handful', 'handfuls',
      'clove', 'cloves',
      'slice', 'slices',
      'piece', 'pieces'
    ];
    
    const fraction = text.match(/(\d+)\s*\/\s*(\d+)/);
    let processedText = text;
    
    if (fraction) {
      const [wholeMatch, numerator, denominator] = fraction;
      const decimal = parseInt(numerator) / parseInt(denominator);
      processedText = text.replace(wholeMatch, decimal.toString());
    }
    
    const amountMatch = processedText.match(/^[\s\d.\/+\-–—]+/);
    let amount = '';
    let remainingText = processedText;
    
    if (amountMatch) {
      amount = amountMatch[0].trim();
      remainingText = processedText.substring(amountMatch[0].length).trim();
    }
    
    let unit = '';
    let item = remainingText;
    
    for (const unitName of commonUnits) {
      const regex = new RegExp(`^\\s*(${unitName})(\\s|$)`, 'i');
      const match = remainingText.match(regex);
      
      if (match) {
        unit = match[1];
        item = remainingText.substring(match[0].length).trim();
        break;
      }
    }
    
    const prefixesToRemove = ['of ', '- ', '* ', '• '];
    prefixesToRemove.forEach(prefix => {
      if (item.startsWith(prefix)) {
        item = item.substring(prefix.length);
      }
    });
    
    return { amount, unit, item };
  };

  // Parse bulk ingredients
  const parseBulkIngredients = (text: string): Ingredient[] => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    return lines.map((line, index) => {
      const { amount, unit, item } = parseIngredient(line);
      return {
        amount,
        unit,
        item: item || line,
        id: `bulk-ingredient-${index}-${Date.now()}`,
        groupName: ''
      };
    });
  };

  // Parse bulk instructions
  const parseBulkInstructions = (text: string): Instruction[] => {
    if (!text.trim()) return [];
    
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    return lines.map((line, index) => {
      let cleanText = line;
      cleanText = cleanText.replace(/^\s*(?:\d+[\.\)]\s*|step\s+\d+\s*:?\s*)/i, '');
      cleanText = cleanText.replace(/^\s*[-•*]\s*/, '');
      
      return {
        text: cleanText || line,
        id: `bulk-instruction-${index}-${Date.now()}`,
        groupName: ''
      };
    });
  };

  // Handle bulk import
  const handleBulkImport = () => {
    let hasChanges = false;
    
    if (bulkIngredients.trim()) {
      const newIngredients = parseBulkIngredients(bulkIngredients);
      if (newIngredients.length > 0) {
        setIngredients(prev => [...prev, ...newIngredients]);
        hasChanges = true;
      }
    }
    
    if (bulkInstructions.trim()) {
      const newInstructions = parseBulkInstructions(bulkInstructions);
      if (newInstructions.length > 0) {
        setInstructions(prev => [...prev, ...newInstructions]);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      toast.success('Ingredients and instructions imported successfully!');
      setBulkIngredients('');
      setBulkInstructions('');
    } else {
      toast.error('Please enter some ingredients or instructions to import');
    }
  };

  // Handle image URL validation
  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setIsPreviewingImage(false);
  };

  const validateAndPreviewImage = () => {
    if (!imageUrl.trim()) {
      toast.error("Please enter an image URL");
      return;
    }
    
    if (!imageUrl.match(/^https?:\/\/.+\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) {
      toast.error("Please enter a valid image URL (ending with .jpg, .png, .gif, etc.)");
      return;
    }
    
    setIsPreviewingImage(true);
  };

  // Handle form submission
  const handleFormSubmit: SubmitHandler<Recipe> = async (data) => {
    if (!user) {
      toast.error('You must be logged in to save recipes');
      return;
    }
    
    if (ingredients.length === 0) {
      toast.error('Please add at least one ingredient');
      return;
    }

    if (instructions.length === 0) {
      toast.error('Please add at least one instruction step');
      return;
    }
    
    try {
      const recipeData: Recipe = {
        ...data,
        ingredients,
        instructions,
        categories: [],
        imageUrl: imageUrl || null,
        userId: user.uid,
        visibility
      };
      
      await addDoc(collection(db, 'recipes'), {
        ...recipeData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      toast.success('Recipe added successfully');
      router.push('/recipes');
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast.error('Failed to save recipe');
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-basil mb-2">Bulk Entry</h1>
        <p className="text-gray-600">Import ingredients and instructions from text sources</p>
      </div>

      {/* Bulk Text Import Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-bold text-basil mb-4">Bulk Text Import</h2>
        <p className="text-sm text-gray-600 mb-4">
          Copy and paste ingredients and instructions from any text source. Each line will be treated as a separate item.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredients (one per line)
            </label>
            <textarea
              value={bulkIngredients}
              onChange={(e) => setBulkIngredients(e.target.value)}
              placeholder={`Example:
2 cups all-purpose flour
1 tsp salt
3 tbsp olive oil
1/2 cup warm water`}
              rows={8}
              className="w-full border-gray-300 rounded-md shadow-sm bg-white focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instructions (one per line)
            </label>
            <textarea
              value={bulkInstructions}
              onChange={(e) => setBulkInstructions(e.target.value)}
              placeholder={`Example:
1. Mix flour and salt in a bowl
2. Add olive oil and water
3. Knead dough for 5 minutes
4. Let rest for 30 minutes`}
              rows={8}
              className="w-full border-gray-300 rounded-md shadow-sm bg-white focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base resize-none"
            />
          </div>
        </div>
        
        <div className="flex gap-2 justify-center">
          <button
            type="button"
            onClick={handleBulkImport}
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 bg-basil text-white hover:bg-basil-600 active:bg-basil-700 px-6 py-3 text-base rounded-md"
          >
            Import to Recipe
          </button>
          <button
            type="button"
            onClick={() => {
              setBulkIngredients('');
              setBulkInstructions('');
            }}
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 px-6 py-3 text-base rounded-md"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Recipe Details */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-basil">Recipe Details</h2>
          
          <div className="flex items-center bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                visibility === 'public' 
                  ? 'bg-white text-basil shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiGlobe className="h-4 w-4" />
              <span className="hidden sm:inline">Public</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('friends')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                visibility === 'friends' 
                  ? 'bg-white text-basil shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiUsers className="h-4 w-4" />
              <span className="hidden sm:inline">Friends</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                visibility === 'private' 
                  ? 'bg-white text-basil shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <FiLock className="h-4 w-4" />
              <span className="hidden sm:inline">Private</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Recipe Name</label>
            <input 
              id="name" 
              className="mt-1 block w-full border-gray-300 rounded-md bg-white focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
              placeholder="Enter recipe name" 
              type="text" 
              {...register('name', { required: true })}
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">Recipe name is required</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="servings" className="block text-sm font-medium text-gray-700 mb-2">Servings</label>
              <input 
                id="servings" 
                placeholder="e.g., 4" 
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-white focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
                type="text" 
                {...register('servings')}
              />
            </div>
            <div>
              <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700 mb-2">Prep Time</label>
              <input 
                id="prepTime" 
                placeholder="e.g., 15 mins" 
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-white focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
                type="text" 
                {...register('prepTime', { required: true })}
              />
              {errors.prepTime && <p className="mt-1 text-sm text-red-500">Prep time is required</p>}
            </div>
            <div>
              <label htmlFor="cookTime" className="block text-sm font-medium text-gray-700 mb-2">Cook Time</label>
              <input 
                id="cookTime" 
                placeholder="e.g., 30 mins" 
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-white focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
                type="text" 
                {...register('cookTime', { required: true })}
              />
              {errors.cookTime && <p className="mt-1 text-sm text-red-500">Cook time is required</p>}
            </div>
          </div>

          <div>
            <label htmlFor="sourceUrl" className="block text-sm font-medium text-gray-700 mb-2">Original Source</label>
            <input 
              id="sourceUrl" 
              placeholder="https://example.com/recipe" 
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm bg-white focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
              type="url" 
              {...register('sourceUrl')}
            />
          </div>

          {/* Image URL */}
          <div>
            <label htmlFor="imageUrl" className="block text-sm font-medium text-gray-700 mb-2">Recipe Image URL (Optional)</label>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                id="imageUrl" 
                placeholder="https://example.com/image.jpg" 
                className="flex-1 border-gray-300 rounded-md shadow-sm bg-white focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
                type="text" 
                value={imageUrl}
                onChange={handleImageUrlChange}
              />
              <button 
                type="button"
                onClick={validateAndPreviewImage}
                className="px-4 py-3 bg-basil text-white rounded-md hover:bg-basil-600 transition-colors"
              >
                Preview
              </button>
            </div>
            
            {isPreviewingImage && imageUrl && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Image Preview</h3>
                <div className="w-full h-48 overflow-hidden relative border border-gray-200 rounded-md">
                  <img src={imageUrl} alt="Recipe preview" className="w-full h-full object-cover" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Imported Items Preview */}
      {(ingredients.length > 0 || instructions.length > 0) && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-basil mb-4">Imported Recipe Content</h2>
          
          {ingredients.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Ingredients ({ingredients.length})</h3>
              <div className="bg-gray-50 p-4 rounded-md max-h-40 overflow-y-auto">
                <ul className="space-y-1">
                  {ingredients.map((ingredient) => (
                    <li key={ingredient.id} className="text-sm text-gray-700">
                      {ingredient.amount} {ingredient.unit} {ingredient.item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {instructions.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Instructions ({instructions.length})</h3>
              <div className="bg-gray-50 p-4 rounded-md max-h-40 overflow-y-auto">
                <ol className="space-y-1">
                  {instructions.map((instruction, index) => (
                    <li key={instruction.id} className="text-sm text-gray-700">
                      <span className="font-medium">{index + 1}.</span> {instruction.text}
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-center">
        <button 
          type="submit"
          className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 bg-basil text-white hover:bg-basil-600 active:bg-basil-700 px-8 py-3 text-base rounded-md"
        >
          Save Recipe
        </button>
      </div>
    </form>
  );
} 