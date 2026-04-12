import { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { uploadImage } from '@/lib/cloudinary';
import UpgradeModal from './UpgradeModal';
import Button from './Button';
import { FiLock, FiUsers, FiPlus, FiX } from 'react-icons/fi';

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
  groupName?: string; // Optional group name for organizing ingredients
}

interface Instruction {
  text: string;
  id: string;
  groupName?: string; // Optional group name for organizing instructions
}

export interface Recipe {
  id?: string;
  name: string;
  servings?: string;
  prepTime: string;
  cookTime: string;
  ingredients: Ingredient[];
  instructions: Instruction[] | string[]; // Support both old string[] and new Instruction[] formats
  categories?: string[];
  imageUrl?: string | null;
  userId?: string;
  sourceUrl?: string;
  visibility?: string;
  locked?: boolean;
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
  const [isMobile, setIsMobile] = useState(false);
  const [visibility, setVisibility] = useState(initialData?.visibility || 'friends');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recipeImageInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureRef = useRef<HTMLInputElement>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    initialData?.ingredients && initialData.ingredients.length > 0 
      ? initialData.ingredients.map(ing => ({ ...ing, id: ing.id || String(Date.now() + Math.random()) }))
      : [{ amount: '', unit: '', item: '', id: '1' }]
  );
  const [instructions, setInstructions] = useState<Instruction[]>(() => {
    if (initialData?.instructions && initialData.instructions.length > 0) {
      // Handle both old string[] format and new Instruction[] format
      if (typeof initialData.instructions[0] === 'string') {
        return (initialData.instructions as string[]).map((text, index) => ({
          text,
          id: `instruction-${index}-${Date.now()}`,
          groupName: ''
        }));
      } else {
        return (initialData.instructions as Instruction[]).map(instr => ({
          ...instr,
          id: instr.id || `instruction-${Date.now()}-${Math.random()}`
        }));
      }
    }
    return [{ text: '', id: 'instruction-1', groupName: '' }];
  });
  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [extractedRecipeText, setExtractedRecipeText] = useState<string>('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  // New state for ingredient groups
  const [ingredientGroups, setIngredientGroups] = useState<string[]>(['']);
  const [newGroupName, setNewGroupName] = useState<string>('');
  // New state for instruction groups
  const [instructionGroups, setInstructionGroups] = useState<string[]>(['']);
  const [newInstructionGroupName, setNewInstructionGroupName] = useState<string>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Recipe>({
    defaultValues: {
      name: initialData?.name || '',
      servings: initialData?.servings || '',
      prepTime: initialData?.prepTime || '',
      cookTime: initialData?.cookTime || '',
      sourceUrl: initialData?.sourceUrl || '',
    }
  });

  // Check if the device is mobile
  useEffect(() => {
    const checkIfMobile = () => {
      const userAgent = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      setIsMobile(mobileRegex.test(userAgent));
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);
    
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

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
      
      // Initialize ingredient groups from existing ingredients
      if (initialData.ingredients && initialData.ingredients.length > 0) {
        const existingGroups = [...new Set(
          initialData.ingredients
            .map(ing => ing.groupName)
            .filter(group => group && group.trim() !== '')
        )] as string[];
        
        setIngredientGroups(['', ...existingGroups]);
      }
      
      // Check if the recipe has categories that aren't in userCategories
      if (initialData.categories && initialData.categories.length > 0) {
        const newCategories = initialData.categories.filter(
          category => !userCategories.includes(category)
        );
        
        // If there are new categories, add them to userCategories
        if (newCategories.length > 0) {
          setUserCategories(prev => [...prev, ...newCategories]);
        }
      }
      
      setSelectedCategories(initialData.categories || []);
      setImageUrl(initialData.imageUrl || '');
      setIsPreviewingImage(!!initialData.imageUrl);
      
      // Wait for next render cycle for DOM elements to be available
      setTimeout(() => {
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
          adjustTextareaHeight(textarea);
        });
      }, 100);

      // Initialize instruction groups from existing instructions
      if (initialData.instructions && initialData.instructions.length > 0) {
        // Handle both old string[] format and new Instruction[] format
        let instructionData: Instruction[] = [];
        if (typeof initialData.instructions[0] === 'string') {
          instructionData = (initialData.instructions as string[]).map((text, index) => ({
            text,
            id: `instruction-${index}-${Date.now()}`,
            groupName: ''
          }));
        } else {
          instructionData = initialData.instructions as Instruction[];
        }
        
        const existingInstructionGroups = [...new Set(
          instructionData
            .map(instr => instr.groupName)
            .filter(group => group && group.trim() !== '')
        )] as string[];
        
        setInstructionGroups(['', ...existingInstructionGroups]);
      }
    }
  }, [initialData, setValue, userCategories]);

  // Add useEffect hook to adjust textarea heights whenever instructions change
  useEffect(() => {
    setTimeout(() => {
      const textareas = document.querySelectorAll('textarea');
      textareas.forEach(textarea => {
        adjustTextareaHeight(textarea);
      });
    }, 0);
  }, [instructions]);

  const addIngredient = (groupName?: string) => {
    setIngredients([
      ...ingredients,
      { amount: '', unit: '', item: '', id: Date.now().toString(), groupName: groupName || '' }
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

  const addInstruction = (groupName?: string) => {
    setInstructions([
      ...instructions, 
      { 
        text: '', 
        id: `instruction-${Date.now()}-${Math.random()}`, 
        groupName: groupName || '' 
      }
    ]);
  };

  const removeInstruction = (indexToRemove: number) => {
    setInstructions(instructions.filter((_, index) => index !== indexToRemove));
  };

  const updateInstruction = (index: number, field: keyof Instruction, value: string) => {
    const updatedInstructions = [...instructions];
    updatedInstructions[index] = { ...updatedInstructions[index], [field]: value };
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
      
      // For problematic images, try a more aggressive conversion approach
      if (!conversionSuccess && file.type !== 'image/jpeg') {
        try {
          console.log('Attempting a more aggressive image conversion...');
          
          // Create a new Image element
          const img = new Image();
          
          // Set up a promise to wait for the image to load
          const loadPromise = new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image in fallback conversion'));
          });
          
          // Set image source to a blob URL
          img.src = URL.createObjectURL(file);
          
          // Wait for the image to load
          await loadPromise;
          
          // Create a canvas with the image dimensions
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          // Get the 2D context and draw the image
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            throw new Error('Failed to get canvas context');
          }
          
          // Draw white background to handle transparency
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the image
          ctx.drawImage(img, 0, 0);
          
          // Get the data URL (base64)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          
          // Convert base64 to Blob
          const byteString = atob(dataUrl.split(',')[1]);
          const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          
          const blob = new Blob([ab], { type: mimeString });
          processedFile = new File([blob], 'converted-image.jpg', { type: 'image/jpeg' });
          
          // Clean up
          URL.revokeObjectURL(img.src);
          
          console.log('Successfully performed fallback image conversion:', {
            originalSize: Math.round(file.size / 1024) + 'KB',
            newSize: Math.round(processedFile.size / 1024) + 'KB'
          });
          
          toast.success('Image converted successfully for processing', { duration: 2000 });
          conversionSuccess = true;
        } catch (fallbackError) {
          console.error('Fallback conversion also failed:', fallbackError);
        }
      }
      
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
          const parsedInstructions = instructions.map((text, index) => ({
            text,
            id: `extracted-instruction-${index}-${Date.now()}`,
            groupName: ''
          }));
          setInstructions(parsedInstructions);
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
  
  const handleCameraCaptureClick = () => {
    cameraCaptureRef.current?.click();
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
    if (instructions.length === 0 || (instructions.length === 1 && !instructions[0].text.trim())) {
      toast.error('Please add at least one instruction step');
      return;
    }
    
    // Clean up empty ingredients
    const filteredIngredients = ingredients.filter(ing => ing.item.trim());
    
    // Clean up empty instructions
    const filteredInstructions = instructions.filter(instr => instr.text.trim());
    
    try {
      const recipeData: Recipe = {
        ...data,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        categories: selectedCategories,
        imageUrl: imageUrl || null,
        userId: user.uid,
        visibility: visibility // Use the visibility state 
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
          const token = await user.getIdToken();
          const res = await fetch('/api/recipes/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(recipeData),
          });

          if (res.status === 403) {
            setShowUpgradeModal(true);
            return;
          }

          if (!res.ok) {
            throw new Error('Failed to save recipe');
          }

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
    // Reset height to auto to get the correct scrollHeight
    element.style.height = 'auto';
    // Set the height to match the content
    element.style.height = `${element.scrollHeight}px`;
  };

  // Ingredient group management functions
  const addIngredientGroup = () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    if (ingredientGroups.includes(newGroupName.trim())) {
      toast.error('Group name already exists');
      return;
    }
    
    setIngredientGroups([...ingredientGroups, newGroupName.trim()]);
    setNewGroupName('');
  };

  const removeIngredientGroup = (groupName: string) => {
    // Remove the group
    setIngredientGroups(ingredientGroups.filter(group => group !== groupName));
    
    // Update ingredients to remove the group assignment
    const updatedIngredients = ingredients.map(ingredient => 
      ingredient.groupName === groupName 
        ? { ...ingredient, groupName: '' }
        : ingredient
    );
    setIngredients(updatedIngredients);
  };

  const getIngredientsByGroup = () => {
    const grouped: { [key: string]: Ingredient[] } = {};
    
    // Initialize groups
    ingredientGroups.forEach(group => {
      grouped[group] = [];
    });
    
    // Group ingredients
    ingredients.forEach(ingredient => {
      const group = ingredient.groupName || '';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(ingredient);
    });
    
    return grouped;
  };

  // Instruction group management functions
  const addInstructionGroup = () => {
    if (!newInstructionGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    
    if (instructionGroups.includes(newInstructionGroupName.trim())) {
      toast.error('Group name already exists');
      return;
    }
    
    setInstructionGroups([...instructionGroups, newInstructionGroupName.trim()]);
    setNewInstructionGroupName('');
  };

  const removeInstructionGroup = (groupName: string) => {
    // Remove the group
    setInstructionGroups(instructionGroups.filter(group => group !== groupName));
    
    // Update instructions to remove the group assignment
    const updatedInstructions = instructions.map(instruction => 
      instruction.groupName === groupName 
        ? { ...instruction, groupName: '' }
        : instruction
    );
    setInstructions(updatedInstructions);
  };

  const getInstructionsByGroup = () => {
    const grouped: { [key: string]: Instruction[] } = {};
    
    // Initialize groups
    instructionGroups.forEach(group => {
      grouped[group] = [];
    });
    
    // Group instructions
    instructions.forEach(instruction => {
      const group = instruction.groupName || '';
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(instruction);
    });
    
    return grouped;
  };

  return (
    <>
    <UpgradeModal
      isOpen={showUpgradeModal}
      onClose={() => setShowUpgradeModal(false)}
      reason="recipe_limit"
    />
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">

      {/* Scan banner */}
      {showScanFeature && (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-cast-iron">
                {scanMode ? 'Scan your recipe' : 'Recipe scanner'}
              </h3>
              <p className="text-sm text-steel mt-1">
                Upload a photo of a recipe card or cookbook page to extract the details automatically.
              </p>
              <p className="text-xs text-steel/50 mt-1 italic">Review the results before saving.</p>
            </div>
            <div className="flex-shrink-0">
              {isMobile ? (
                <>
                  <input type="file" accept="image/*" capture="environment" ref={recipeImageInputRef} onChange={handleRecipeImageUpload} className="hidden" />
                  <Button onClick={handleRecipeImageClick} variant={scanMode ? 'primary' : 'outline'} disabled={isProcessingRecipe} className="flex items-center gap-2">
                    <i className="fa-solid fa-camera"></i>
                    {isProcessingRecipe ? 'Processing...' : 'Take photo'}
                  </Button>
                </>
              ) : (
                <>
                  <input type="file" accept="image/*" ref={recipeImageInputRef} onChange={handleRecipeImageUpload} className="hidden" />
                  <Button onClick={handleRecipeImageClick} variant={scanMode ? 'primary' : 'outline'} disabled={isProcessingRecipe} className="flex items-center gap-2">
                    <i className="fa-solid fa-upload"></i>
                    {isProcessingRecipe ? 'Processing...' : 'Upload image'}
                  </Button>
                </>
              )}
            </div>
          </div>
          {!scanMode && !isProcessingRecipe && !extractedRecipeText && (
            <button type="button" onClick={() => setShowScanFeature(false)} className="mt-3 text-xs text-steel/50 hover:text-steel transition-colors flex items-center gap-1">
              <FiX className="w-3 h-3" /> Hide scanner
            </button>
          )}
          {extractedRecipeText && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium text-light-green hover:text-green transition-colors list-none flex items-center gap-1">
                View extracted text <span className="text-xs text-steel/50 font-normal">(reference only)</span>
              </summary>
              <div className="mt-2 bg-eggshell rounded-xl border border-stone-100 p-3 overflow-auto max-h-60 whitespace-pre-wrap text-xs text-steel">
                {extractedRecipeText}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Basics */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-cast-iron">Basics</h2>
          <div className="flex items-center bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setVisibility('friends')}
              title="Only your friends can view"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                visibility === 'friends' ? 'bg-white text-light-green shadow-sm' : 'text-steel hover:text-cast-iron'
              }`}
            >
              <FiUsers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Friends</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              title="Only you can view"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                visibility === 'private' ? 'bg-white text-light-green shadow-sm' : 'text-steel hover:text-cast-iron'
              }`}
            >
              <FiLock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Private</span>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-cast-iron mb-1.5">Recipe name</label>
          <input
            id="name"
            type="text"
            placeholder="e.g. Grandma's Lasagna"
            className="block w-full border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-3 px-4 text-base"
            {...register('name', { required: true })}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">Recipe name is required</p>}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label htmlFor="servings" className="block text-sm font-medium text-cast-iron mb-1.5">Servings</label>
            <input id="servings" type="text" placeholder="e.g. 4" className="block w-full border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2.5 px-3 text-sm" {...register('servings')} />
          </div>
          <div>
            <label htmlFor="prepTime" className="block text-sm font-medium text-cast-iron mb-1.5">Prep time</label>
            <input id="prepTime" type="text" placeholder="e.g. 15 mins" className="block w-full border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2.5 px-3 text-sm" {...register('prepTime')} />
          </div>
          <div>
            <label htmlFor="cookTime" className="block text-sm font-medium text-cast-iron mb-1.5">Cook time</label>
            <input id="cookTime" type="text" placeholder="e.g. 30 mins" className="block w-full border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2.5 px-3 text-sm" {...register('cookTime')} />
          </div>
        </div>
      </div>

      {/* Ingredients + Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* Ingredients */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-cast-iron mb-4">Ingredients</h2>

          <div className="space-y-1">
            {(() => {
              const groupedIngredients = getIngredientsByGroup();
              const groups = ['', ...ingredientGroups.filter(g => g !== '')];
              return groups.map((groupName) => {
                const groupIngredients = groupedIngredients[groupName] || [];
                return (
                  <div key={groupName || 'ungrouped'}>
                    {groupName && (
                      <div className="flex items-center justify-between pt-4 pb-1.5">
                        <span className="text-xs font-semibold text-steel/50 uppercase tracking-widest">{groupName}</span>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => addIngredient(groupName)} className="text-xs text-light-green hover:text-green transition-colors font-medium">
                            + Add
                          </button>
                          <button type="button" onClick={() => removeIngredientGroup(groupName)} className="text-xs text-steel/40 hover:text-red-400 transition-colors">
                            Remove section
                          </button>
                        </div>
                      </div>
                    )}
                    {groupIngredients.length === 0 && groupName ? (
                      <p className="text-xs text-steel/40 italic py-1.5 pl-1">No ingredients yet.</p>
                    ) : (
                      groupIngredients.map((ingredient) => {
                        const globalIndex = ingredients.findIndex(ing => ing.id === ingredient.id);
                        return (
                          <div key={ingredient.id} className="flex items-center gap-2 py-1">
                            <input
                              placeholder="Amt"
                              className="w-14 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2 px-2 text-sm text-center"
                              value={ingredient.amount}
                              onChange={(e) => updateIngredient(globalIndex, 'amount', e.target.value)}
                            />
                            <input
                              placeholder="Unit"
                              className="w-[4.5rem] border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2 px-2 text-sm"
                              value={ingredient.unit}
                              onChange={(e) => updateIngredient(globalIndex, 'unit', e.target.value)}
                            />
                            <input
                              placeholder="Ingredient"
                              required
                              className="flex-1 min-w-0 border border-stone-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2 px-3 text-sm"
                              value={ingredient.item}
                              onChange={(e) => updateIngredient(globalIndex, 'item', e.target.value)}
                            />
                            {ingredients.length > 1 && (
                              <button type="button" onClick={() => removeIngredient(globalIndex)} className="text-steel/30 hover:text-red-400 transition-colors flex-shrink-0 p-1">
                                <FiX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              });
            })()}
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
            <button type="button" onClick={() => addIngredient()} className="flex items-center gap-1.5 text-sm font-medium text-light-green hover:text-green transition-colors">
              <FiPlus className="w-4 h-4" /> Add ingredient
            </button>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New section (e.g. For the sauce)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className="flex-1 text-sm border border-stone-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addIngredientGroup(); }
                }}
              />
              <button type="button" onClick={addIngredientGroup} className="text-sm font-medium text-light-green hover:text-green transition-colors px-2 py-1.5 whitespace-nowrap">
                + Add section
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-cast-iron mb-4">Instructions</h2>

          <div className="space-y-1">
            {(() => {
              const groupedInstructions = getInstructionsByGroup();
              const groups = ['', ...instructionGroups.filter(g => g !== '')];
              return groups.map((groupName) => {
                const groupInstructions = groupedInstructions[groupName] || [];
                return (
                  <div key={groupName || 'ungrouped'}>
                    {groupName && (
                      <div className="flex items-center justify-between pt-4 pb-1.5">
                        <span className="text-xs font-semibold text-steel/50 uppercase tracking-widest">{groupName}</span>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => addInstruction(groupName)} className="text-xs text-light-green hover:text-green transition-colors font-medium">
                            + Add
                          </button>
                          <button type="button" onClick={() => removeInstructionGroup(groupName)} className="text-xs text-steel/40 hover:text-red-400 transition-colors">
                            Remove section
                          </button>
                        </div>
                      </div>
                    )}
                    {groupInstructions.length === 0 && groupName ? (
                      <p className="text-xs text-steel/40 italic py-1.5 pl-1">No steps yet.</p>
                    ) : (
                      groupInstructions.map((instruction, groupIndex) => {
                        const globalIndex = instructions.findIndex(instr => instr.id === instruction.id);
                        const stepNumber = groupIndex + 1;
                        return (
                          <div key={instruction.id} className="flex items-start gap-3 py-1.5">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-light-green/10 text-light-green text-xs font-bold flex items-center justify-center mt-2">
                              {stepNumber}
                            </div>
                            <textarea
                              placeholder="Describe this step"
                              required
                              rows={1}
                              className="flex-1 min-w-0 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2 px-3 text-sm resize-none overflow-hidden"
                              value={instruction.text}
                              onChange={(e) => {
                                updateInstruction(globalIndex, 'text', e.target.value);
                                adjustTextareaHeight(e.target as HTMLTextAreaElement);
                              }}
                              onFocus={(e) => adjustTextareaHeight(e.target as HTMLTextAreaElement)}
                            />
                            {instructions.length > 1 && (
                              <button type="button" onClick={() => removeInstruction(globalIndex)} className="text-steel/30 hover:text-red-400 transition-colors flex-shrink-0 mt-2 p-1">
                                <FiX className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              });
            })()}
          </div>

          <div className="mt-4 pt-4 border-t border-stone-100 space-y-3">
            <button type="button" onClick={() => addInstruction()} className="flex items-center gap-1.5 text-sm font-medium text-light-green hover:text-green transition-colors">
              <FiPlus className="w-4 h-4" /> Add step
            </button>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="New section (e.g. For the sauce)"
                value={newInstructionGroupName}
                onChange={(e) => setNewInstructionGroupName(e.target.value)}
                className="flex-1 text-sm border border-stone-200 rounded-lg py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addInstructionGroup(); }
                }}
              />
              <button type="button" onClick={addInstructionGroup} className="text-sm font-medium text-light-green hover:text-green transition-colors px-2 py-1.5 whitespace-nowrap">
                + Add section
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* More options */}
      <details className="group bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
        <summary className="flex items-center justify-between px-6 py-4 cursor-pointer select-none list-none">
          <span className="text-sm font-medium text-cast-iron">More options</span>
          <span className="text-steel/40 text-xs">▼</span>
        </summary>
        <div className="px-6 pb-6 pt-5 border-t border-stone-100 space-y-6">

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-cast-iron mb-3">Recipe image</label>
            <input accept="image/*" className="hidden" type="file" ref={fileInputRef} onChange={handleFileChange} />
            <div className="flex flex-wrap gap-2 mb-3">
              <button type="button" onClick={handleUploadClick} disabled={isUploading} className="inline-flex items-center gap-2 border border-light-green text-light-green hover:bg-light-green hover:text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
                {isUploading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Uploading...</>
                ) : (
                  <><i className="fa-solid fa-upload" /> Upload</>
                )}
              </button>
              {isMobile && (
                <>
                  <input accept="image/*" capture="environment" className="hidden" type="file" ref={cameraCaptureRef} onChange={handleFileChange} />
                  <button type="button" onClick={handleCameraCaptureClick} disabled={isUploading} className="inline-flex items-center gap-2 border border-light-green text-light-green hover:bg-light-green hover:text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
                    {isUploading ? (
                      <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Uploading...</>
                    ) : (
                      <><i className="fa-solid fa-camera" /> Take photo</>
                    )}
                  </button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <input
                id="imageUrl"
                placeholder="Or paste an image URL"
                className="flex-1 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2.5 px-4 text-sm"
                type="text"
                value={imageUrl}
                onChange={handleImageUrlChange}
              />
              <button type="button" onClick={validateAndPreviewImage} className="border border-stone-200 text-steel hover:border-light-green hover:text-light-green rounded-xl px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap">
                Preview
              </button>
            </div>
            {isPreviewingImage && imageUrl && (
              <div className="mt-3 w-full h-40 rounded-xl overflow-hidden border border-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Recipe preview" className="w-full h-full object-cover" />
              </div>
            )}
            <p className="text-xs text-steel/50 mt-2">Max file size: 5MB.</p>
          </div>

          {/* Source URL */}
          <div>
            <label htmlFor="sourceUrl" className="block text-sm font-medium text-cast-iron mb-1.5">Original source</label>
            <input
              id="sourceUrl"
              placeholder="https://example.com/recipe"
              className="block w-full border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2.5 px-4 text-sm"
              type="url"
              {...register('sourceUrl')}
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-sm font-medium text-cast-iron mb-3">Categories</label>
            {isLoadingCategories ? (
              <div className="py-4 flex justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-stone-200 border-t-light-green" />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 mb-3">
                {userCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleCategoryChange(category)}
                    aria-pressed={selectedCategories.includes(category)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 focus:outline-none active:scale-95 ${
                      selectedCategories.includes(category)
                        ? 'bg-light-green text-white'
                        : 'bg-eggshell text-steel hover:bg-stone-100 border border-stone-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New category..."
                className="flex-1 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2 px-3 text-sm"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              />
              <button type="button" onClick={handleAddNewCategory} className="inline-flex items-center gap-1.5 border border-light-green text-light-green hover:bg-light-green hover:text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap">
                <FiPlus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          </div>

        </div>
      </details>

      {/* Submit */}
      <button
        type="submit"
        className="w-full bg-light-green text-white hover:bg-green rounded-xl py-3.5 text-base font-semibold transition-colors disabled:opacity-50"
      >
        {submitButtonText || (isEditMode ? 'Update recipe' : 'Save recipe')}
      </button>

    </form>
    </>
  );
} 