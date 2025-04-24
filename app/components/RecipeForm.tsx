import { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
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
  visibility?: string;
}

export interface RecipeFormProps {
  initialData?: Recipe;
  onSubmit?: (data: Recipe) => Promise<void>;
  scanMode?: boolean;
  submitButtonText?: string;
}

export default function RecipeForm({ initialData, onSubmit, scanMode = false, submitButtonText }: RecipeFormProps) {
  const { user } = useAuth();
  const router = useRouter();
  const isEditMode = !!initialData?.id;
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialData?.categories || []);
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');
  const [isPreviewingImage, setIsPreviewingImage] = useState(!!initialData?.imageUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingRecipe, setIsProcessingRecipe] = useState(false);
  const [fileDialogRequested, setFileDialogRequested] = useState(false);
  const [showScanFeature, setShowScanFeature] = useState(scanMode);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recipeImageInputRef = useRef<HTMLInputElement>(null);
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
  const [extractedRecipeText, setExtractedRecipeText] = useState<string>('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Recipe>({
    defaultValues: {
      name: initialData?.name || '',
      servings: initialData?.servings || '',
      prepTime: initialData?.prepTime || '',
      cookTime: initialData?.cookTime || '',
      sourceUrl: initialData?.sourceUrl || '',
    }
  });

  // Automatically trigger file input when in scan mode only on initial mount
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Only execute this on first render in scan mode
    if (scanMode && !isProcessingRecipe && !fileDialogRequested) {
      setFileDialogRequested(true);
      
      // Small delay to ensure component is fully mounted
      timeout = setTimeout(() => {
        if (recipeImageInputRef.current) {
          recipeImageInputRef.current.click();
        }
      }, 100);
    }
    
    return () => clearTimeout(timeout);
    // Add fileDialogRequested to deps list to prevent firing after state changes
  }, [scanMode, isProcessingRecipe, fileDialogRequested]);

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

  // Adding a function to check API configuration
  const checkAPIConfiguration = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/check-recipe-scan-setup');
      const data = await response.json();
      
      if (!data.ready) {
        console.error('Recipe scanning setup not complete:', data);
        
        let errorMessage = 'Recipe scanning setup not complete. ';
        if (!data.setupStatus.googleVision.configured) {
          errorMessage += 'Google Cloud Vision API credentials are missing. ';
        }
        
        toast.error(errorMessage + 'Please check server configuration.', {
          duration: 6000
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking API configuration:', error);
      toast.error('Could not verify API configuration. Please try again later.');
      return false;
    }
  };

  // Handle file selection for recipe image
  const handleRecipeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Reset the file dialog requested flag since the dialog has been handled
    setFileDialogRequested(false);
    
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Prevent processing if we're already handling an image
    if (isProcessingRecipe) return;
    
    // Clear the file input value to allow selecting the same file again
    e.target.value = '';
    
    // Set processing state immediately to prevent double calls
    setIsProcessingRecipe(true);
    
    // Validate file type - expanded to accept more file types for conversion
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) {
      toast.error('Please select a valid image file. We support JPG, PNG, GIF, WEBP, and HEIC formats.', { duration: 6000 });
      setIsProcessingRecipe(false);
      return;
    }
    
    // Validate file size (max 10MB for recipe cards which may contain more text)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      setIsProcessingRecipe(false);
      return;
    }
    
    try {
      toast.loading('Processing your recipe image...', { id: 'processing-recipe' });
      
      // Check if APIs are configured
      const apisConfigured = await checkAPIConfiguration();
      if (!apisConfigured) {
        throw new Error('API configuration issue - please check server setup');
      }
      
      // Pre-process the image on the client side to ensure compatibility
      // This converts any image to a normalized JPEG format before sending to the API
      let processedFile = file;
      let conversionSuccess = false;
      
      try {
        // Log file info for debugging
        console.log('Processing file:', {
          name: file.name,
          type: file.type,
          size: Math.round(file.size / 1024) + 'KB'
        });
      
        // Create an image element
        const img = document.createElement('img');
        const imgLoaded = new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = (e) => {
            console.error('Image loading error:', e);
            reject(new Error('Failed to load image - format may be unsupported'));
          }
        });
        
        // Create an object URL from the file
        img.src = URL.createObjectURL(file);
        
        // Wait for the image to load
        await imgLoaded;
        
        console.log('Image loaded successfully with dimensions:', {
          width: img.width,
          height: img.height
        });
        
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }
        
        // Set canvas dimensions to match image (with a reasonable max size)
        const MAX_SIZE = 2048;
        let width = img.width;
        let height = img.height;
        
        if (width > height && width > MAX_SIZE) {
          height = (height * MAX_SIZE) / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width = (width * MAX_SIZE) / height;
          height = MAX_SIZE;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw the image onto the canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try multiple quality settings if needed
        const qualityOptions = [0.92, 0.85, 0.75];
        let blob: Blob | null = null;
        
        for (const quality of qualityOptions) {
          try {
            blob = await new Promise<Blob>((resolve, reject) => {
              canvas.toBlob(
                (b) => {
                  if (b) resolve(b);
                  else reject(new Error('Failed to create blob'));
                },
                'image/jpeg',
                quality
              );
            });
            
            // If we got a blob, break the loop
            if (blob) {
              console.log(`Successfully created JPEG blob with quality ${quality}, size: ${Math.round(blob.size / 1024)}KB`);
              break;
            }
          } catch (blobError) {
            console.error(`Error creating blob with quality ${quality}:`, blobError);
          }
        }
        
        if (!blob) {
          throw new Error('Failed to create image blob after multiple attempts');
        }
        
        // Create a new file from the blob
        processedFile = new File([blob], 'processed-image.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        
        // Clean up the object URL
        URL.revokeObjectURL(img.src);
        
        console.log('Successfully pre-processed image on client side:', {
          originalSize: Math.round(file.size / 1024) + 'KB',
          processedSize: Math.round(processedFile.size / 1024) + 'KB'
        });
        
        conversionSuccess = true;
      } catch (processingError) {
        // If client-side processing fails, continue with the original file
        console.error('Client-side image processing failed:', processingError);
        console.log('Proceeding with original image file');
      }

      // If conversion failed but the original isn't a JPEG, warn the user
      if (!conversionSuccess && file.type !== 'image/jpeg') {
        console.warn('Using original non-JPEG image without successful conversion');
        toast.error('Your image format might not be fully supported. If extraction fails, please try with a JPEG image.', { 
          duration: 5000,
          icon: '⚠️',
        });
      }
      
      // Create form data for the file (using the processed file if available)
      const formData = new FormData();
      formData.append('file', processedFile);
      
      // Send to our API endpoint
      const response = await fetch('/api/vision-to-recipe', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('API error response:', data);
        throw new Error(data.error || 'Failed to process recipe image');
      }
      
      // Process the raw text with basic heuristics
      if (data.rawText) {
        // Save raw text for reference
        setExtractedRecipeText(data.rawText);
        
        // Parse the text into different recipe components
        const { name, ingredients, instructions } = parseRecipeText(data.rawText);
        
        // Set recipe name
        setValue('name', name);
        
        // Set ingredients
        if (ingredients.length > 0) {
          const parsedIngredients = ingredients.map((ing, index) => {
            // Try to parse each ingredient into amount, unit, and item
            const { amount, unit, item } = parseIngredient(ing);
            return {
              amount,
              unit,
              item: item || ing, // Use the original text if parsing fails
              id: `extracted-${index}-${Date.now()}`
            };
          });
          
          setIngredients(parsedIngredients);
        }
        
        // Set instructions
        if (instructions.length > 0) {
          setInstructions(instructions);
        }
        
        toast.success('Recipe extracted and parsed into form fields!', { 
          id: 'processing-recipe',
          duration: 5000
        });
        
        toast.success('Please review and edit the auto-populated fields as needed.', {
          duration: 5000
        });
      } else {
        throw new Error('No text data found in the response');
      }
    } catch (error) {
      console.error('Error processing recipe image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Create a more helpful error message for the user
      let userFriendlyMessage = `Failed to extract recipe text: ${errorMessage}`;
      
      // Check for the specific image format error message
      if (errorMessage.toLowerCase().includes('unsupported') &&
          errorMessage.toLowerCase().includes('image format')) {
        userFriendlyMessage = 
          'The image format is not supported. Please try these solutions:' +
          '\n1. Use your phone to take a normal JPEG photo of your recipe' +
          '\n2. If using a screenshot, try saving it as JPEG first' +
          '\n3. Try a different image with clearer text';
          
        toast.error(userFriendlyMessage, { 
          id: 'processing-recipe',
          duration: 8000
        });
      } else {
        toast.error(`Failed to extract recipe text: ${errorMessage}`, { 
          id: 'processing-recipe'
        });
      }
      
      // If scanning was initiated in scan mode, provide a prompt to try manual entry
      if (scanMode) {
        setTimeout(() => {
          toast.error('Please try entering the recipe details manually instead', { 
            id: 'manual-entry-suggestion',
            duration: 6000
          });
        }, 1000);
      }
    } finally {
      setIsProcessingRecipe(false);
    }
  };

  // Parse raw recipe text into components using basic heuristics
  const parseRecipeText = (text: string): { 
    name: string; 
    ingredients: string[]; 
    instructions: string[] 
  } => {
    // Split text into lines and remove empty ones
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    // Assume the first line with reasonable length is the recipe name
    let name = '';
    let nameLineIndex = -1;
    
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].length > 3 && lines[i].length < 60) {
        name = lines[i];
        nameLineIndex = i;
        break;
      }
    }
    
    // If no name found, use a default
    if (!name && lines.length > 0) {
      name = lines[0]; 
      nameLineIndex = 0;
    }
    
    // Skip the name line and start looking for ingredients and instructions
    const remainingLines = lines.slice(nameLineIndex + 1);
    
    // Try to identify ingredients and instructions sections
    const ingredientLines: string[] = [];
    const instructionLines: string[] = [];
    
    let currentSection: 'none' | 'ingredients' | 'instructions' = 'none';
    
    // Keywords that might indicate the start of ingredients or instructions sections
    const ingredientKeywords = ['ingredients', 'materials', 'you will need', 'what you need'];
    const instructionKeywords = ['instructions', 'directions', 'method', 'preparation', 'steps', 'how to', 'procedure'];
    
    for (const line of remainingLines) {
      // Skip very short lines that might be section separators
      if (line.length < 3) continue;
      
      const lowerLine = line.toLowerCase();
      
      // Check if this line is a section header
      const isIngredientHeader = ingredientKeywords.some(keyword => lowerLine.includes(keyword));
      const isInstructionHeader = instructionKeywords.some(keyword => lowerLine.includes(keyword));
      
      // Determine the section based on headers or patterns
      if (isIngredientHeader) {
        currentSection = 'ingredients';
        continue; // Skip the header line
      } else if (isInstructionHeader) {
        currentSection = 'instructions';
        continue; // Skip the header line
      }
      
      // If no explicit section is found, try to guess based on content patterns
      if (currentSection === 'none') {
        // Lines with measurements, fractions, or quantities often indicate ingredients
        if (/\d+\s*(?:\d\/\d|\/)?\s*(?:cup|tbsp|tsp|oz|g|lb|ml|l|teaspoon|tablespoon|pound|ounce)/i.test(line) || 
            /\d+\s*(?:\/)\s*\d+/.test(line)) { // Fractions
          ingredientLines.push(line);
          continue;
        }
        
        // Lines starting with numbers followed by period or parenthesis often indicate instructions
        if (/^\s*\d+[\.\)]/.test(line) || /^step\s+\d+:/i.test(line)) {
          instructionLines.push(line);
          currentSection = 'instructions'; // Assume remaining lines are also instructions
          continue;
        }
        
        // If we can't determine, default to ingredients first
        ingredientLines.push(line);
      } else if (currentSection === 'ingredients') {
        // Check if we might have switched to instructions
        if (/^\s*\d+[\.\)]/.test(line) || /^step\s+\d+:/i.test(line)) {
          instructionLines.push(line);
          currentSection = 'instructions';
        } else {
          ingredientLines.push(line);
        }
      } else if (currentSection === 'instructions') {
        instructionLines.push(line);
      }
    }
    
    // If we have too few instructions but many ingredients, some ingredients might actually be instructions
    if (instructionLines.length <= 1 && ingredientLines.length > 5) {
      // Look for sentences in the ingredients that might be instructions
      const possibleInstructions = ingredientLines.filter(ing => 
        ing.length > 40 || // Long lines
        /\.\s*$/.test(ing) || // Ends with period
        /^[A-Z]/.test(ing.trim()) // Starts with capital letter
      );
      
      if (possibleInstructions.length > 0) {
        // Remove these from ingredients and add to instructions
        possibleInstructions.forEach(instr => {
          const index = ingredientLines.indexOf(instr);
          if (index !== -1) {
            ingredientLines.splice(index, 1);
          }
          instructionLines.push(instr);
        });
      }
    }
    
    // Now process the instruction lines into actual instruction steps
    // We'll try to identify numbered steps and merge continuation lines
    const instructions: string[] = [];
    let currentInstruction = '';
    
    for (let i = 0; i < instructionLines.length; i++) {
      const line = instructionLines[i];
      
      // Check if this line starts a new numbered step
      const numberMatch = line.match(/^\s*(\d+)[\.\)]\s*/);
      
      if (numberMatch) {
        // Save the previous instruction if it exists
        if (currentInstruction) {
          instructions.push(currentInstruction.trim());
          currentInstruction = '';
        }
        
        // Remove the step number from the line
        currentInstruction = line.replace(/^\s*\d+[\.\)]\s*/, '');
      } else if (line.toLowerCase().startsWith('step') && /\d+/.test(line)) {
        // Handle "Step X: ..." format
        if (currentInstruction) {
          instructions.push(currentInstruction.trim());
          currentInstruction = '';
        }
        
        // Remove the "Step X:" prefix
        currentInstruction = line.replace(/^step\s+\d+\s*:?\s*/i, '');
      } else {
        // This is either a continuation of the current instruction or a non-numbered instruction
        
        // Check if this might be a new instruction without a number
        const startsNewSentence = /^[A-Z]/.test(line) && 
                                  (currentInstruction.endsWith('.') || 
                                   currentInstruction.endsWith('!') || 
                                   currentInstruction.endsWith('?'));
        
        // If this line starts with a capital letter and the previous line ends with punctuation,
        // it might be a new instruction
        if (startsNewSentence && currentInstruction) {
          instructions.push(currentInstruction.trim());
          currentInstruction = line;
        } else if (!currentInstruction) {
          // Start a new instruction if we don't have one
          currentInstruction = line;
        } else {
          // Append to the current instruction with a space
          currentInstruction += ' ' + line;
        }
      }
    }
    
    // Add the last instruction if there is one
    if (currentInstruction) {
      instructions.push(currentInstruction.trim());
    }
    
    // If we ended up with no instructions, but have instructionLines,
    // fall back to using the raw lines
    if (instructions.length === 0 && instructionLines.length > 0) {
      return { 
        name, 
        ingredients: ingredientLines, 
        instructions: instructionLines 
      };
    }
    
    // Clean up any very short instructions (likely parsing errors)
    const finalInstructions = instructions.filter(instr => instr.length > 5);
    
    return { 
      name, 
      ingredients: ingredientLines, 
      instructions: finalInstructions 
    };
  };
  
  // Parse an ingredient line to extract amount, unit, and item
  const parseIngredient = (text: string): { amount: string; unit: string; item: string } => {
    // Common cooking units
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
    
    // Replace common fractions with decimal values for better parsing
    const fraction = text.match(/(\d+)\s*\/\s*(\d+)/);
    let processedText = text;
    
    if (fraction) {
      const [wholeMatch, numerator, denominator] = fraction;
      const decimal = parseInt(numerator) / parseInt(denominator);
      processedText = text.replace(wholeMatch, decimal.toString());
    }
    
    // Try to identify number at the start (the amount)
    const amountMatch = processedText.match(/^[\s\d.\/+\-–—]+/);
    let amount = '';
    let remainingText = processedText;
    
    if (amountMatch) {
      amount = amountMatch[0].trim();
      remainingText = processedText.substring(amountMatch[0].length).trim();
    }
    
    // Try to identify unit after the amount
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
    
    // Clean up: remove common prefixes that might be in the ingredient
    const prefixesToRemove = [
      'of ', '- ', '* ', '• '
    ];
    
    prefixesToRemove.forEach(prefix => {
      if (item.startsWith(prefix)) {
        item = item.substring(prefix.length);
      }
    });
    
    return { amount, unit, item };
  };

  // Handle file selection for recipe photo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Clear the file input value to allow selecting the same file again
    e.target.value = '';
    
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
  
  // Trigger file input click for recipe photo
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  // Trigger file input click for recipe card scan
  const handleRecipeImageClick = () => {
    // Don't do anything if we're already processing
    if (isProcessingRecipe) return;
    
    // Show the scan feature if not already visible
    if (!showScanFeature) {
      setShowScanFeature(true);
    }
    
    // Set the file dialog requested flag
    setFileDialogRequested(true);
    
    if (recipeImageInputRef.current) {
      recipeImageInputRef.current.click();
    }
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
    
    // Check if category already exists
    if (userCategories.includes(newCategory.trim())) {
      toast.error('This category already exists');
      return;
    }
    
    try {
      // Add category to user's custom categories in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const customCategories = userData.customCategories || [];
        
        // Check again for duplicates
        if (!customCategories.includes(newCategory)) {
          await updateDoc(userRef, {
            customCategories: [...customCategories, newCategory]
          });
          
          // Update local state
          setUserCategories(prev => [...prev, newCategory]);
          setSelectedCategories(prev => [...prev, newCategory]);
          setNewCategory('');
          
          toast.success('Category added successfully');
        } else {
          toast.error('This category already exists');
        }
      } else {
        // Create user document with first custom category
        await updateDoc(userRef, {
          customCategories: [newCategory]
        });
        
        // Update local state
        setUserCategories(prev => [...prev, newCategory]);
        setSelectedCategories(prev => [...prev, newCategory]);
        setNewCategory('');
        
        toast.success('Category added successfully');
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast.error('Failed to add category');
    }
  };
  
  const handleFormSubmit: SubmitHandler<Recipe> = async (data) => {
    if (!user) {
      toast.error('You must be logged in to save recipes');
      return;
    }
    
    // Validate ingredients
    if (ingredients.length === 0 || (ingredients.length === 1 && !ingredients[0].item)) {
      toast.error('Please add at least one ingredient');
      return;
    }
    
    // Validate instructions
    if (instructions.length === 0 || (instructions.length === 1 && !instructions[0])) {
      toast.error('Please add at least one instruction step');
      return;
    }
    
    // Clean up empty ingredients
    const filteredIngredients = ingredients.filter(ing => ing.item.trim());
    
    // Clean up empty instructions
    const filteredInstructions = instructions.filter(instr => instr.trim());
    
    try {
      // Get user's recipe visibility setting
      let visibility = 'public'; // Default to public
      try {
        const userProfileRef = doc(db, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        if (userProfileSnap.exists()) {
          const userData = userProfileSnap.data();
          visibility = userData.recipeVisibility || 'public';
        }
      } catch (error) {
        console.error('Error fetching user visibility settings:', error);
      }
      
      const recipeData: Recipe = {
        ...data,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        categories: selectedCategories,
        imageUrl: imageUrl || null,
        userId: user.uid,
        visibility: visibility // Add visibility field directly to recipe
      };
      
      // If onSubmit is provided, use it
      if (onSubmit) {
        await onSubmit(recipeData);
      } else {
        // Otherwise, save to Firestore directly
        if (initialData?.id) {
          const recipeRef = doc(db, 'recipes', initialData.id);
          await updateDoc(recipeRef, {
            ...recipeData,
            updatedAt: serverTimestamp()
          });
          toast.success('Recipe updated successfully');
        } else {
          await addDoc(collection(db, 'recipes'), {
            ...recipeData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          toast.success('Recipe added successfully');
        }
        
        router.push('/recipes');
      }
    } catch (error) {
      console.error('Error saving recipe:', error);
      toast.error('Failed to save recipe');
    }
  };
  
  const adjustTextareaHeight = (element: HTMLTextAreaElement) => {
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Recipe Image Scan Feature */}
      {showScanFeature && (
      <div className={`rounded-lg p-6 mb-6 border ${scanMode ? 'bg-basil-50 border-basil shadow-md' : 'bg-amber-50 border-amber-200'} transition-colors`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h3 className={`text-xl font-semibold mb-2 ${scanMode ? 'text-basil' : 'text-amber-800'}`}>
              {scanMode ? 'Scan Your Recipe' : 'Recipe Scanner'}
            </h3>
            <p className="text-cast-iron text-sm mb-4">
              Upload a photo of a recipe card or a page from a cookbook to automatically extract the recipe details.
            </p>
          </div>
          <div className="flex items-center">
            <input
              type="file"
              accept="image/*"
              ref={recipeImageInputRef}
              onChange={handleRecipeImageUpload}
              className="hidden"
            />
            <Button 
              onClick={handleRecipeImageClick}
              variant={scanMode ? "primary" : "outline"}
              disabled={isProcessingRecipe}
              className="flex items-center gap-2"
            >
              <i className="fa-solid fa-camera"></i>
              {isProcessingRecipe ? 'Processing...' : 'Upload Recipe Image'}
            </Button>
          </div>
        </div>
        
        {!scanMode && !isProcessingRecipe && !extractedRecipeText && (
          <button 
            onClick={() => setShowScanFeature(false)}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <i className="fa-solid fa-times"></i> Hide Scanner
          </button>
        )}
        
        {extractedRecipeText && (
          <div id="extracted-text-panel" className="mt-4 bg-white border border-light-grey rounded-lg p-3">
            <details>
              <summary className="cursor-pointer text-basil font-medium hover:text-basil-dark transition flex items-center">
                <span>View extracted text</span>
                <span className="text-xs text-gray-500 ml-2">(Reference only)</span>
              </summary>
              <div className="mt-2 bg-gray-50 p-3 rounded-md overflow-auto max-h-60 whitespace-pre-wrap text-xs">
                {extractedRecipeText}
              </div>
            </details>
          </div>
        )}
      </div>
      )}

      {/* Regular Form Fields */}
      <div className="space-y-6 md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100">
        <h2 className="text-2xl font-bold bg-basil bg-clip-text text-transparent">Recipe Details</h2>
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Recipe Name</label>
            <input 
              id="name" 
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
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
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
                type="text" 
                {...register('servings')}
              />
            </div>
            <div>
              <label htmlFor="prepTime" className="block text-sm font-medium text-gray-700 mb-2">Prep Time</label>
              <input 
                id="prepTime" 
                placeholder="e.g., 15 mins" 
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
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
                className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
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
              className="mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
              type="url" 
              {...register('sourceUrl')}
            />
          </div>
        </div>
      </div>
      <div className="md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100">
        <h2 className="text-2xl font-bold text-basil mb-6">Recipe Image</h2>
        <div className="space-y-6">
          <div className="flex flex-col space-y-4">
            <input accept="image/*" className="hidden" type="file" ref={fileInputRef} onChange={handleFileChange} />
            <button 
              className="
                inline-flex items-center justify-center gap-2
                rounded-lg font-medium
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                border-2 border-basil text-basil hover:bg-basil hover:text-white active:bg-basil active:text-white
                px-4 py-2 text-base
                w-full md:w-auto py-3
              " 
              type="button" 
              onClick={handleUploadClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Uploading...
                </>
              ) : 'Upload Image'}
            </button>
            <div className="flex items-center justify-center my-4">
              <div className="h-px bg-gray-200 flex-1"></div>
              <span className="px-4 text-sm text-gray-500">or</span>
              <div className="h-px bg-gray-200 flex-1"></div>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                id="imageUrl" 
                placeholder="https://example.com/image.jpg" 
                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base" 
                type="text" 
                value={imageUrl}
                onChange={handleImageUrlChange}
              />
              <button 
                className="
                  inline-flex items-center justify-center gap-2
                  rounded-lg font-medium
                  transition-colors duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  bg-basil text-white hover:bg-basil-600 active:bg-basil-700
                  px-3 py-1.5 text-sm
                  w-full md:w-auto py-3
                " 
                type="button"
                onClick={validateAndPreviewImage}
              >Preview</button>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center">Upload an image file or enter a URL. Maximum file size: 5MB.</p>
          
          {isPreviewingImage && imageUrl && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Image Preview</h3>
              <div className="w-full h-48 rounded-lg overflow-hidden relative border border-gray-200">
                <img src={imageUrl} alt="Recipe preview" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100">
        <h2 className="text-2xl font-bold text-basil mb-6">Ingredients</h2>
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
                    placeholder="Amount" 
                    className="rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
                    value={ingredient.amount}
                    onChange={(e) => updateIngredient(index, 'amount', e.target.value)}
                  />
                  <input 
                    placeholder="Unit" 
                    className="rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
                    value={ingredient.unit}
                    onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                  />
                </div>
                <div className="col-span-11 md:col-span-5">
                  <input 
                    placeholder="Ingredient" 
                    required 
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base"
                    value={ingredient.item}
                    onChange={(e) => updateIngredient(index, 'item', e.target.value)}
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  {ingredients.length > 1 && (
                    <button 
                      type="button"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeIngredient(index)}
                    >
                      <i className="fa-solid fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button 
            className="
              inline-flex items-center justify-center gap-2
              rounded-lg font-medium
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              border-2 border-basil text-basil hover:bg-basil hover:text-white active:bg-basil active:text-white
              px-3 py-1.5 text-sm
              w-full md:w-auto py-3
            " 
            type="button"
            onClick={addIngredient}
          >+ Add Ingredient</button>
        </div>
      </div>
      <div className="md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100">
        <h2 className="text-2xl font-bold text-basil mb-6">Instructions</h2>
        <div className="space-y-6">
          {instructions.map((instruction, index) => (
            <div key={index} className="flex items-start space-x-4 flex-col lg:flex-row">
              <div className="flex-shrink-0 w-20 h-10 flex items-center justify-center text-cast-iron font-medium">STEP {index + 1}</div>
              <div className="flex-1 w-full">
                <textarea 
                  placeholder="Enter instruction step" 
                  required 
                  rows={1} 
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 py-3 px-4 text-base resize-none overflow-hidden" 
                  style={{ height: '48px' }}
                  value={instruction}
                  onChange={(e) => updateInstruction(index, e.target.value)}
                  onInput={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                ></textarea>
              </div>
              {instructions.length > 1 && (
                <button 
                  type="button"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => removeInstruction(index)}
                >
                  <i className="fa-solid fa-times"></i>
                </button>
              )}
            </div>
          ))}
          <button 
            className="
              inline-flex items-center justify-center gap-2
              rounded-lg font-medium
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              border-2 border-basil text-basil hover:bg-basil hover:text-white active:bg-basil active:text-white
              px-3 py-1.5 text-sm
              w-full md:w-auto py-3
            " 
            type="button"
            onClick={addInstruction}
          >+ Add Step</button>
        </div>
      </div>
      <div className="md:bg-white md:rounded-xl md:p-8 md:shadow-sm md:border md:border-gray-100 space-y-6">
        <h2 className="text-2xl font-bold text-basil mb-6">Categories</h2>
        <p className="text-sm text-gray-600">Select categories that apply to your recipe</p>
        
        {isLoadingCategories ? (
          <div className="py-4 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-basil"></div>
          </div>
        ) : (
        <div className="flex flex-wrap gap-3">
          {userCategories.map((category) => (
            <div key={category} className="relative group">
              <button 
                type="button" 
                className={`
                  touch-action-manipulation
                  px-3 py-1 rounded-full text-sm font-medium 
                  transition-all duration-150 
                  focus:outline-none 
                  ${selectedCategories.includes(category) 
                    ? 'bg-basil text-white' 
                    : 'bg-white text-steel hover:bg-gray-100'}
                  active:shadow-inner active:scale-95
                `} 
                aria-pressed={selectedCategories.includes(category)}
                onClick={() => handleCategoryChange(category)}
              >{category}</button>
            </div>
          ))}
        </div>
        )}
        <div className="flex gap-2 mb-4 flex-col md:flex-row">
          <input 
            placeholder="Add a new category..." 
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" 
            type="text" 
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button 
            className="
              inline-flex items-center justify-center gap-2
              rounded-lg font-medium
              transition-colors duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              border-2 border-basil text-basil hover:bg-basil hover:text-white active:bg-basil active:text-white
              px-4 py-2 text-base
            " 
            type="button"
            onClick={handleAddNewCategory}
          >+ Add Category</button>
        </div>
      </div>
      <div className="flex justify-center">
        <button 
          className="
            inline-flex items-center justify-center gap-2
            rounded-lg font-medium
            transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            bg-basil text-white hover:bg-basil-600 active:bg-basil-700
            px-4 py-2 text-base
            w-full md:w-auto py-3 px-8
          " 
          type="submit"
        >
          {submitButtonText || (isEditMode ? 'Update Recipe' : 'Save Recipe')}
        </button>
      </div>
    </form>
  );
} 