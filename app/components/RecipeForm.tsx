import { useState, useEffect, useRef } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import UpgradeModal from './UpgradeModal';
import Button from './Button';
import { FiLock, FiUsers, FiPlus, FiX, FiTrash2, FiTag } from 'react-icons/fi';

export const DEFAULT_CATEGORIES = [
  'Breakfast', 'Lunch', 'Dinner', 'Snack', 'Baking',
];

export const RECIPE_CATEGORIES = DEFAULT_CATEGORIES;

// Block types for the unified block-list pattern

export interface SectionBlock {
  type: 'section';
  id: string;
  label: string;
}

export type IngredientBlock =
  | { type: 'item'; id: string; amount: string; unit: string; item: string }
  | SectionBlock;

export type InstructionBlock =
  | { type: 'item'; id: string; text: string }
  | SectionBlock;

// Legacy types kept for backward-compat (old Firestore data uses groupName)
export interface Ingredient {
  amount: string;
  unit: string;
  item: string;
  id: string;
  groupName?: string;
}

export interface Instruction {
  text: string;
  id: string;
  groupName?: string;
}

export interface Recipe {
  id?: string;
  name: string;
  servings?: string;
  prepTime: string;
  cookTime: string;
  ingredients: IngredientBlock[];
  instructions: InstructionBlock[] | string[];
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

// ─── Utilities ───────────────────────────────────────────────────────────────

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function migrateIngredients(
  raw: Array<IngredientBlock | Ingredient | { type?: string; [key: string]: unknown }>
): IngredientBlock[] {
  if (!raw || raw.length === 0) {
    return [{ type: 'item', id: genId(), amount: '', unit: '', item: '' }];
  }
  // Already in new block format
  if (raw.some(e => (e as IngredientBlock).type === 'section')) {
    return raw as IngredientBlock[];
  }
  if (raw.some(e => (e as IngredientBlock).type === 'item')) {
    return raw as IngredientBlock[];
  }
  // Old Ingredient[] with optional groupName
  const blocks: IngredientBlock[] = [];
  let lastGroup = '';
  for (const ing of raw as Ingredient[]) {
    const group = ing.groupName?.trim() || '';
    if (group && group !== lastGroup) {
      blocks.push({ type: 'section', id: genId(), label: group });
    }
    lastGroup = group;
    blocks.push({
      type: 'item',
      id: ing.id || genId(),
      amount: ing.amount || '',
      unit: ing.unit || '',
      item: ing.item || '',
    });
  }
  return blocks;
}

function migrateInstructions(
  raw: Array<InstructionBlock | Instruction | string | { type?: string; [key: string]: unknown }>
): InstructionBlock[] {
  if (!raw || raw.length === 0) {
    return [{ type: 'item', id: genId(), text: '' }];
  }
  if (typeof raw[0] === 'string') {
    return (raw as string[]).map((text, i) => ({
      type: 'item' as const,
      id: `instr-${i}-${genId()}`,
      text,
    }));
  }
  if (raw.some(e => (e as InstructionBlock).type === 'section')) {
    return raw as InstructionBlock[];
  }
  if (raw.some(e => (e as InstructionBlock).type === 'item')) {
    return raw as InstructionBlock[];
  }
  const blocks: InstructionBlock[] = [];
  let lastGroup = '';
  for (const instr of raw as Instruction[]) {
    const group = instr.groupName?.trim() || '';
    if (group && group !== lastGroup) {
      blocks.push({ type: 'section', id: genId(), label: group });
    }
    lastGroup = group;
    blocks.push({ type: 'item', id: instr.id || genId(), text: instr.text || '' });
  }
  return blocks;
}

function getStepNumber(blocks: InstructionBlock[], upToIndex: number): number {
  let n = 0;
  for (let i = 0; i <= upToIndex; i++) {
    if (blocks[i].type === 'item') n++;
  }
  return n;
}

// ─── Main component ───────────────────────────────────────────────────────────

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

  // Block list state
  const [ingredientBlocks, setIngredientBlocks] = useState<IngredientBlock[]>(() =>
    migrateIngredients(initialData?.ingredients || [])
  );
  const [instructionBlocks, setInstructionBlocks] = useState<InstructionBlock[]>(() =>
    migrateInstructions((initialData?.instructions || []) as Parameters<typeof migrateInstructions>[0])
  );
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');

  // Drag state
  const dragInfo = useRef<{
    listType: 'ingredients' | 'instructions';
    sourceIdx: number;
    rowEls: HTMLElement[];
    currentTargetIdx: number;
  } | null>(null);
  const [dragging, setDragging] = useState<{
    listType: 'ingredients' | 'instructions';
    sourceIdx: number;
    targetIdx: number;
  } | null>(null);

  // Insert affordance popover state
  const [insertMenu, setInsertMenu] = useState<{
    listType: 'ingredients' | 'instructions';
    afterIndex: number;
    x: number;
    y: number;
  } | null>(null);

  const [userCategories, setUserCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<Recipe>({
    defaultValues: {
      name: initialData?.name || '',
      servings: initialData?.servings || '',
      prepTime: initialData?.prepTime || '',
      cookTime: initialData?.cookTime || '',
      sourceUrl: initialData?.sourceUrl || '',
    }
  });

  // Mobile detection
  useEffect(() => {
    const check = () => {
      const ua = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
      setIsMobile(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua));
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Scan mode auto-trigger
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (scanMode && !isProcessingRecipe && !fileDialogRequested) {
      setFileDialogRequested(true);
      timeout = setTimeout(() => { recipeImageInputRef.current?.click(); }, 100);
    }
    return () => clearTimeout(timeout);
  }, [scanMode, isProcessingRecipe, fileDialogRequested]);

  // Fetch user categories
  useEffect(() => {
    const fetchUserCategories = async () => {
      if (!user) return;
      try {
        setIsLoadingCategories(true);
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists() && userDoc.data().customCategories) {
          const custom = userDoc.data().customCategories;
          const all = [...DEFAULT_CATEGORIES];
          custom.forEach((c: string) => { if (!all.includes(c)) all.push(c); });
          setUserCategories(all);
        } else {
          setUserCategories(DEFAULT_CATEGORIES);
        }
      } catch {
        toast.error('Failed to load your categories');
        setUserCategories(DEFAULT_CATEGORIES);
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchUserCategories();
  }, [user]);

  // Sync form values when initialData changes (async edit page load)
  useEffect(() => {
    if (!initialData) return;
    setValue('name', initialData.name);
    setValue('servings', initialData.servings || '');
    setValue('prepTime', initialData.prepTime);
    setValue('cookTime', initialData.cookTime);
    setValue('sourceUrl', initialData.sourceUrl || '');

    if (initialData.ingredients?.length) {
      setIngredientBlocks(migrateIngredients(initialData.ingredients));
    }
    if (initialData.instructions?.length) {
      setInstructionBlocks(migrateInstructions(initialData.instructions as Parameters<typeof migrateInstructions>[0]));
    }
    if (initialData.categories?.length) {
      const extra = initialData.categories.filter(c => !userCategories.includes(c));
      if (extra.length) setUserCategories(prev => [...prev, ...extra]);
    }
    setSelectedCategories(initialData.categories || []);
    setImageUrl(initialData.imageUrl || '');
    setIsPreviewingImage(!!initialData.imageUrl);

    setTimeout(() => {
      document.querySelectorAll('textarea').forEach(el => adjustTextareaHeight(el));
    }, 100);
  }, [initialData, setValue, userCategories]);

  // Resize textareas when instruction blocks change
  useEffect(() => {
    setTimeout(() => {
      document.querySelectorAll('textarea').forEach(el => adjustTextareaHeight(el));
    }, 0);
  }, [instructionBlocks]);

  // Close insert menu on outside pointer
  useEffect(() => {
    if (!insertMenu) return;
    const handler = (e: PointerEvent) => {
      const menu = document.getElementById('block-insert-menu');
      if (menu && !menu.contains(e.target as Node)) setInsertMenu(null);
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, [insertMenu]);

  // ─── Block management ─────────────────────────────────────────────────────

  const addBlockAt = (
    listType: 'ingredients' | 'instructions',
    blockType: 'item' | 'section',
    atIndex?: number
  ) => {
    if (listType === 'ingredients') {
      const newBlock: IngredientBlock =
        blockType === 'section'
          ? { type: 'section', id: genId(), label: '' }
          : { type: 'item', id: genId(), amount: '', unit: '', item: '' };
      setIngredientBlocks(prev => {
        const arr = [...prev];
        arr.splice(atIndex !== undefined ? atIndex : arr.length, 0, newBlock);
        return arr;
      });
    } else {
      const newBlock: InstructionBlock =
        blockType === 'section'
          ? { type: 'section', id: genId(), label: '' }
          : { type: 'item', id: genId(), text: '' };
      setInstructionBlocks(prev => {
        const arr = [...prev];
        arr.splice(atIndex !== undefined ? atIndex : arr.length, 0, newBlock);
        return arr;
      });
    }
  };

  const removeBlock = (listType: 'ingredients' | 'instructions', idx: number) => {
    if (listType === 'ingredients') {
      setIngredientBlocks(prev => {
        if (prev.length <= 1 && prev[0]?.type === 'item') return prev;
        return prev.filter((_, i) => i !== idx);
      });
    } else {
      setInstructionBlocks(prev => {
        if (prev.length <= 1 && prev[0]?.type === 'item') return prev;
        return prev.filter((_, i) => i !== idx);
      });
    }
  };

  const updateIngredientBlock = (idx: number, field: 'amount' | 'unit' | 'item', value: string) => {
    setIngredientBlocks(prev => {
      const arr = [...prev];
      const block = arr[idx];
      if (block.type === 'item') arr[idx] = { ...block, [field]: value };
      return arr;
    });
  };

  const updateInstructionText = (idx: number, value: string) => {
    setInstructionBlocks(prev => {
      const arr = [...prev];
      const block = arr[idx];
      if (block.type === 'item') arr[idx] = { ...block, text: value };
      return arr;
    });
  };

  const updateSectionLabel = (listType: 'ingredients' | 'instructions', idx: number, value: string) => {
    if (listType === 'ingredients') {
      setIngredientBlocks(prev => {
        const arr = [...prev];
        const block = arr[idx];
        if (block.type === 'section') arr[idx] = { ...block, label: value };
        return arr;
      });
    } else {
      setInstructionBlocks(prev => {
        const arr = [...prev];
        const block = arr[idx];
        if (block.type === 'section') arr[idx] = { ...block, label: value };
        return arr;
      });
    }
  };

  const moveBlock = (listType: 'ingredients' | 'instructions', fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx + 1 === toIdx) return;
    if (listType === 'ingredients') {
      setIngredientBlocks(prev => {
        const arr = [...prev];
        const [removed] = arr.splice(fromIdx, 1);
        arr.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, removed);
        return arr;
      });
    } else {
      setInstructionBlocks(prev => {
        const arr = [...prev];
        const [removed] = arr.splice(fromIdx, 1);
        arr.splice(fromIdx < toIdx ? toIdx - 1 : toIdx, 0, removed);
        return arr;
      });
    }
  };

  // ─── Drag handlers ────────────────────────────────────────────────────────

  const handleDragPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    listType: 'ingredients' | 'instructions',
    idx: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);

    const container = e.currentTarget.closest('[data-block-list]') as HTMLElement | null;
    if (!container) return;
    const rowEls = Array.from(container.querySelectorAll('[data-block-row]')) as HTMLElement[];

    dragInfo.current = { listType, sourceIdx: idx, rowEls, currentTargetIdx: idx };
    setDragging({ listType, sourceIdx: idx, targetIdx: idx });
  };

  const handleDragPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const info = dragInfo.current;
    if (!info) return;

    let targetIdx = info.rowEls.length; // default: after last
    for (let i = 0; i < info.rowEls.length; i++) {
      const rect = info.rowEls[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) {
        targetIdx = i;
        break;
      }
    }
    info.currentTargetIdx = targetIdx;
    setDragging(prev => prev ? { ...prev, targetIdx } : null);
  };

  const handleDragPointerUp = () => {
    const info = dragInfo.current;
    if (!info) return;
    const { listType, sourceIdx, currentTargetIdx } = info;
    dragInfo.current = null;
    setDragging(null);
    moveBlock(listType, sourceIdx, currentTargetIdx);
  };

  // ─── Swipe-to-delete (mobile/touch only) ─────────────────────────────────

  const swipeState = useRef<Map<string, { startX: number; startY: number; committed: boolean }>>(new Map());

  const handleSwipePointerDown = (e: React.PointerEvent<HTMLDivElement>, id: string) => {
    if (e.pointerType !== 'touch') return;
    swipeState.current.set(id, { startX: e.clientX, startY: e.clientY, committed: false });
    // Don't capture yet — wait until horizontal intent is confirmed in pointermove
  };

  const handleSwipePointerMove = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    innerRef: React.RefObject<HTMLDivElement>
  ) => {
    const s = swipeState.current.get(id);
    if (!s || !innerRef.current) return;
    const dx = e.clientX - s.startX;
    const dy = Math.abs(e.clientY - s.startY);
    if (!s.committed) {
      // Abort if mostly vertical
      if (dy > Math.abs(dx)) { swipeState.current.delete(id); return; }
      // Confirm horizontal intent before capturing
      if (Math.abs(dx) > 8 && Math.abs(dx) > dy) {
        s.committed = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      } else {
        return;
      }
    }
    if (dx >= 0) return;
    innerRef.current.style.transform = `translateX(${Math.max(dx, -88)}px)`;
  };

  const handleSwipePointerUp = (
    e: React.PointerEvent<HTMLDivElement>,
    id: string,
    innerRef: React.RefObject<HTMLDivElement>,
    onDelete: () => void
  ) => {
    const s = swipeState.current.get(id);
    swipeState.current.delete(id);
    if (!innerRef.current) return;
    if (s?.committed) {
      const dx = e.clientX - s.startX;
      if (dx < -52) {
        onDelete();
        return;
      }
      innerRef.current.style.transition = 'transform 0.2s ease';
      innerRef.current.style.transform = 'translateX(0)';
      setTimeout(() => { if (innerRef.current) innerRef.current.style.transition = ''; }, 220);
    }
  };

  const handleSwipePointerCancel = (
    id: string,
    innerRef: React.RefObject<HTMLDivElement>
  ) => {
    swipeState.current.delete(id);
    if (!innerRef.current) return;
    innerRef.current.style.transition = 'transform 0.2s ease';
    innerRef.current.style.transform = 'translateX(0)';
    setTimeout(() => { if (innerRef.current) innerRef.current.style.transition = ''; }, 220);
  };

  // ─── Image handling ───────────────────────────────────────────────────────

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageUrl(e.target.value);
    setIsPreviewingImage(false);
  };

  const validateAndPreviewImage = () => {
    if (!imageUrl.trim()) { toast.error('Please enter an image URL'); return; }
    if (!imageUrl.match(/^https?:\/\/.+\.(jpeg|jpg|png|gif|webp)(\?.*)?$/i)) {
      toast.error('Please enter a valid image URL (ending with .jpg, .png, .gif, etc.)');
      return;
    }
    setIsPreviewingImage(true);
  };

  const handleRecipeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileDialogRequested(false);
    const file = e.target.files?.[0];
    if (!file || isProcessingRecipe) return;
    e.target.value = '';
    setIsProcessingRecipe(true);

    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/i)) {
      toast.error('Please select a valid image file. We support JPG, PNG, GIF, WEBP, and HEIC formats.', { duration: 6000 });
      setIsProcessingRecipe(false);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      setIsProcessingRecipe(false);
      return;
    }

    try {
      toast.loading('Processing your recipe image...', { id: 'processing-recipe' });

      let processedFile = file;
      let conversionSuccess = false;

      try {
        const img = document.createElement('img');
        const imgLoaded = new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
        });
        img.src = URL.createObjectURL(file);
        await imgLoaded;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Failed to get canvas context');

        const MAX_SIZE = 2048;
        let { width, height } = img;
        if (width > height && width > MAX_SIZE) { height = (height * MAX_SIZE) / width; width = MAX_SIZE; }
        else if (height > MAX_SIZE) { width = (width * MAX_SIZE) / height; height = MAX_SIZE; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Failed to create blob')), 'image/jpeg', 0.92);
        });

        processedFile = new File([blob], 'processed-image.jpg', { type: 'image/jpeg', lastModified: Date.now() });
        URL.revokeObjectURL(img.src);
        conversionSuccess = true;
      } catch {
        // fall through with original file
      }

      if (!conversionSuccess && file.type !== 'image/jpeg') {
        toast.error('Your image format might not be fully supported.', { duration: 5000, icon: '⚠️' });
      }

      const formData = new FormData();
      formData.append('file', processedFile);

      if (!user) throw new Error('You must be logged in to scan a recipe');
      const token = await user.getIdToken();
      const response = await fetch('/api/vision-to-recipe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process recipe image');

      if (data.recipe) {
        const r = data.recipe;
        if (r.name)     setValue('name', r.name);
        if (r.servings) setValue('servings', r.servings);
        if (r.prepTime) setValue('prepTime', r.prepTime);
        if (r.cookTime) setValue('cookTime', r.cookTime);

        if (r.ingredients?.length > 0) {
          setIngredientBlocks(
            r.ingredients.map((ing: { amount: string; unit: string; item: string }, i: number) => ({
              type: 'item' as const,
              id: `extracted-${i}-${Date.now()}`,
              amount: ing.amount || '',
              unit: ing.unit || '',
              item: ing.item || '',
            }))
          );
        }
        if (r.instructions?.length > 0) {
          setInstructionBlocks(
            r.instructions.map((text: string, i: number) => ({
              type: 'item' as const,
              id: `extracted-instr-${i}-${Date.now()}`,
              text,
            }))
          );
        }
        toast.success('Recipe extracted. Review and edit as needed.', { id: 'processing-recipe', duration: 5000 });
      } else {
        throw new Error('No recipe data found in the response');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.toLowerCase().includes('unsupported') && msg.toLowerCase().includes('image format')) {
        toast.error('The image format is not supported. Try a JPEG photo.', { id: 'processing-recipe', duration: 8000 });
      } else {
        toast.error(`Failed to extract recipe text: ${msg}`, { id: 'processing-recipe' });
      }
      if (scanMode) setTimeout(() => toast.error('Please try entering the recipe details manually instead', { duration: 6000 }), 1000);
    } finally {
      setIsProcessingRecipe(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) { toast.error('Please select a valid image file (JPEG, PNG, GIF, WEBP)'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image size must be less than 5MB'); return; }
    try {
      setIsUploading(true);
      const token = user ? await user.getIdToken() : '';
      if (imageUrl && imageUrl.includes('cloudinary.com')) {
        try { await deleteImage(imageUrl, token); } catch {}
      }
      const newImageUrl = await uploadImage(file, token, { width: 1200, quality: 80 });
      setImageUrl(newImageUrl);
      setIsPreviewingImage(true);
      toast.success('Image uploaded successfully');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadClick = () => fileInputRef.current?.click();
  const handleCameraCaptureClick = () => cameraCaptureRef.current?.click();
  const handleRecipeImageClick = () => {
    if (isProcessingRecipe) return;
    if (!showScanFeature) setShowScanFeature(true);
    setFileDialogRequested(true);
    recipeImageInputRef.current?.click();
  };

  // ─── Category handling ────────────────────────────────────────────────────

  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const handleAddNewCategory = async () => {
    if (!user) { toast.error('Please sign in to add custom categories'); return; }
    if (!newCategory.trim()) { toast.error('Please enter a category name'); return; }
    if (userCategories.includes(newCategory.trim())) { toast.error('This category already exists'); return; }
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const custom = userDoc.data().customCategories || [];
        if (!custom.includes(newCategory)) {
          await updateDoc(userRef, { customCategories: [...custom, newCategory] });
          setUserCategories(prev => [...prev, newCategory]);
          setSelectedCategories(prev => [...prev, newCategory]);
          setNewCategory('');
          toast.success('Category added successfully');
        } else {
          toast.error('This category already exists');
        }
      }
    } catch {
      toast.error('Failed to add category');
    }
  };

  // ─── Form submission ──────────────────────────────────────────────────────

  const handleFormSubmit: SubmitHandler<Recipe> = async (data) => {
    if (!user) { toast.error('You must be logged in to save recipes'); return; }

    const ingredientItems = ingredientBlocks.filter(
      b => b.type === 'item' && (b as { type: 'item'; item: string }).item.trim()
    );
    if (ingredientItems.length === 0) { toast.error('Please add at least one ingredient'); return; }

    const instructionItems = instructionBlocks.filter(
      b => b.type === 'item' && (b as { type: 'item'; text: string }).text.trim()
    );
    if (instructionItems.length === 0) { toast.error('Please add at least one instruction step'); return; }

    // Remove trailing empty sections and empty items, keep non-empty items and all sections
    const filteredIngredients = ingredientBlocks.filter(
      b => b.type === 'section' || (b.type === 'item' && (b as { type: 'item'; item: string }).item.trim())
    );
    const filteredInstructions = instructionBlocks.filter(
      b => b.type === 'section' || (b.type === 'item' && (b as { type: 'item'; text: string }).text.trim())
    );

    try {
      const recipeData: Recipe = {
        ...data,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        categories: selectedCategories,
        imageUrl: imageUrl || null,
        userId: user.uid,
        visibility,
      };

      if (onSubmit) {
        await onSubmit(recipeData);
      } else {
        if (initialData?.id) {
          const recipeRef = doc(db, 'recipes', initialData.id);
          await updateDoc(recipeRef, { ...recipeData, updatedAt: serverTimestamp() });
          toast.success('Recipe updated successfully');
        } else {
          const token = await user.getIdToken();
          const res = await fetch('/api/recipes/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(recipeData),
          });
          if (res.status === 403) { setShowUpgradeModal(true); return; }
          if (!res.ok) throw new Error('Failed to save recipe');
          const { id: newId } = await res.json();
          toast.success('Recipe added successfully');
          router.push(`/recipes/${newId}`);
          return;
        }
        router.push('/recipes');
      }
    } catch {
      toast.error('Failed to save recipe');
    }
  };

  const adjustTextareaHeight = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  // ─── Block list renderer ──────────────────────────────────────────────────

  const renderIngredientRow = (block: IngredientBlock, idx: number, isMobileList: boolean) => {
    const listType = 'ingredients';

    if (block.type === 'section') {
      return (
        <SectionRow
          key={block.id}
          block={block}
          idx={idx}
          listType={listType}
          isMobile={isMobileList}
          dragging={dragging}
          onUpdateLabel={(v) => updateSectionLabel(listType, idx, v)}
          onRemove={() => removeBlock(listType, idx)}
          onDragPointerDown={(e) => handleDragPointerDown(e, listType, idx)}
          onDragPointerMove={handleDragPointerMove}
          onDragPointerUp={handleDragPointerUp}
          onSwipePointerDown={handleSwipePointerDown}
          onSwipePointerMove={handleSwipePointerMove}
          onSwipePointerUp={handleSwipePointerUp}
          onSwipePointerCancel={handleSwipePointerCancel}
        />
      );
    }

    const b = block as { type: 'item'; id: string; amount: string; unit: string; item: string };
    const isDragSource = dragging?.listType === listType && dragging.sourceIdx === idx;

    return (
      <IngredientItemRowWrapper
        key={b.id}
        block={b}
        idx={idx}
        isDragSource={isDragSource}
        isMobile={isMobileList}
        canRemove={ingredientBlocks.filter(x => x.type === 'item').length > 1}
        onUpdate={(field, val) => updateIngredientBlock(idx, field, val)}
        onRemove={() => removeBlock(listType, idx)}
        onDragPointerDown={(e) => handleDragPointerDown(e, listType, idx)}
        onDragPointerMove={handleDragPointerMove}
        onDragPointerUp={handleDragPointerUp}
        onSwipePointerDown={handleSwipePointerDown}
        onSwipePointerMove={handleSwipePointerMove}
        onSwipePointerUp={handleSwipePointerUp}
        onSwipePointerCancel={handleSwipePointerCancel}
      />
    );
  };

  const renderInstructionRow = (block: InstructionBlock, idx: number, isMobileList: boolean) => {
    const listType = 'instructions';

    if (block.type === 'section') {
      return (
        <SectionRow
          key={block.id}
          block={block}
          idx={idx}
          listType={listType}
          isMobile={isMobileList}
          dragging={dragging}
          onUpdateLabel={(v) => updateSectionLabel(listType, idx, v)}
          onRemove={() => removeBlock(listType, idx)}
          onDragPointerDown={(e) => handleDragPointerDown(e, listType, idx)}
          onDragPointerMove={handleDragPointerMove}
          onDragPointerUp={handleDragPointerUp}
          onSwipePointerDown={handleSwipePointerDown}
          onSwipePointerMove={handleSwipePointerMove}
          onSwipePointerUp={handleSwipePointerUp}
          onSwipePointerCancel={handleSwipePointerCancel}
        />
      );
    }

    const b = block as { type: 'item'; id: string; text: string };
    const stepNum = getStepNumber(instructionBlocks, idx);
    const isDragSource = dragging?.listType === listType && dragging.sourceIdx === idx;

    return (
      <InstructionItemRowWrapper
        key={b.id}
        block={b}
        idx={idx}
        stepNum={stepNum}
        isDragSource={isDragSource}
        isMobile={isMobileList}
        canRemove={instructionBlocks.filter(x => x.type === 'item').length > 1}
        onUpdate={(val) => updateInstructionText(idx, val)}
        onRemove={() => removeBlock(listType, idx)}
        onDragPointerDown={(e) => handleDragPointerDown(e, listType, idx)}
        onDragPointerMove={handleDragPointerMove}
        onDragPointerUp={handleDragPointerUp}
        onSwipePointerDown={handleSwipePointerDown}
        onSwipePointerMove={handleSwipePointerMove}
        onSwipePointerUp={handleSwipePointerUp}
        onSwipePointerCancel={handleSwipePointerCancel}
        adjustHeight={adjustTextareaHeight}
      />
    );
  };

  const renderGap = (
    listType: 'ingredients' | 'instructions',
    afterIndex: number,
    showDragTarget: boolean
  ) => (
    <div
      key={`gap-${afterIndex}`}
      className="relative h-3 group/gap hidden lg:flex items-center justify-center"
    >
      {showDragTarget && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-light-green rounded-full pointer-events-none" />
      )}
      {!dragging && (
        <button
          type="button"
          aria-label="Insert block"
          className="absolute w-5 h-5 rounded-full bg-light-green text-white text-xs font-bold opacity-0 group-hover/gap:opacity-100 transition-opacity flex items-center justify-center z-10 shadow-sm"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setInsertMenu(prev =>
              prev?.listType === listType && prev.afterIndex === afterIndex
                ? null
                : { listType, afterIndex, x: rect.left + rect.width / 2, y: rect.bottom + 4 }
            );
          }}
        >
          +
        </button>
      )}
    </div>
  );

  const renderBlockList = (
    listType: 'ingredients' | 'instructions',
    blocks: IngredientBlock[] | InstructionBlock[],
    isMobileList: boolean
  ) => {
    const rows: React.ReactNode[] = [];

    // A drop is a no-op if the item ends up in the same position it started
    const isEffectiveDrop = (targetIdx: number) => {
      if (!dragging || dragging.listType !== listType) return false;
      const { sourceIdx } = dragging;
      return targetIdx !== sourceIdx && targetIdx !== sourceIdx + 1;
    };

    const mobileDropLine = (key: string) => (
      <div key={key} className="relative h-1 pointer-events-none">
        <div className="absolute inset-x-1 top-1/2 -translate-y-1/2 h-0.5 bg-light-green rounded-full" />
      </div>
    );

    // Indicator before the first row (both layouts)
    if (dragging?.listType === listType && dragging.targetIdx === 0 && isEffectiveDrop(0)) {
      if (isMobileList) {
        rows.push(mobileDropLine('drop-0'));
      } else {
        rows.push(
          <div key="drop-0" className="h-2 relative pointer-events-none">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-light-green rounded-full" />
          </div>
        );
      }
    }

    blocks.forEach((block, idx) => {
      if (!isMobileList && idx > 0) {
        // Desktop: gap with + button and optional drop indicator
        rows.push(renderGap(listType, idx - 1, isEffectiveDrop(idx) && dragging?.targetIdx === idx));
      } else if (isMobileList && idx > 0 && dragging?.listType === listType && dragging.targetIdx === idx && isEffectiveDrop(idx)) {
        // Mobile: drop indicator between rows
        rows.push(mobileDropLine(`drop-${idx}`));
      }

      const rowNode =
        listType === 'ingredients'
          ? renderIngredientRow(block as IngredientBlock, idx, isMobileList)
          : renderInstructionRow(block as InstructionBlock, idx, isMobileList);
      rows.push(rowNode);
    });

    // Indicator after the last row (both layouts)
    if (dragging?.listType === listType && dragging.targetIdx === blocks.length && isEffectiveDrop(blocks.length)) {
      if (isMobileList) {
        rows.push(mobileDropLine('drop-last'));
      } else {
        rows.push(
          <div key="gap-last" className="h-2 relative pointer-events-none">
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-light-green rounded-full" />
          </div>
        );
      }
    }

    return <div data-block-list className="py-1">{rows}</div>;
  };

  // Counts for mobile tab labels
  const ingredientCount = ingredientBlocks.filter(b => b.type === 'item').length;
  const instructionCount = instructionBlocks.filter(b => b.type === 'item').length;

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <>
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason="recipe_limit" />

      {/* Insert menu portal */}
      {insertMenu && (
        <>
          <div className="fixed inset-0 z-40" onPointerDown={() => setInsertMenu(null)} />
          <div
            id="block-insert-menu"
            className="fixed z-50 bg-white rounded-xl shadow-lg border border-stone-100 py-1 min-w-44"
            style={{ left: insertMenu.x, top: insertMenu.y, transform: 'translateX(-50%)' }}
          >
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-cast-iron hover:bg-stone-50 transition-colors flex items-center gap-2"
              onClick={() => { addBlockAt(insertMenu.listType, 'item', insertMenu.afterIndex + 1); setInsertMenu(null); }}
            >
              <FiPlus className="w-3.5 h-3.5 text-light-green flex-shrink-0" />
              Add {insertMenu.listType === 'ingredients' ? 'ingredient' : 'step'}
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-cast-iron hover:bg-stone-50 transition-colors flex items-center gap-2"
              onClick={() => { addBlockAt(insertMenu.listType, 'section', insertMenu.afterIndex + 1); setInsertMenu(null); }}
            >
              <FiTag className="w-3.5 h-3.5 text-light-green flex-shrink-0" />
              Section break
            </button>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 overflow-x-hidden w-full">

        {/* Scan banner */}
        {showScanFeature && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 sm:p-6">
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
                <input type="file" accept="image/*" ref={recipeImageInputRef} onChange={handleRecipeImageUpload} className="hidden" />
                <Button onClick={handleRecipeImageClick} variant={scanMode ? 'primary' : 'outline'} disabled={isProcessingRecipe} className="flex items-center gap-2">
                  <i className="fa-solid fa-upload" />
                  {isProcessingRecipe ? 'Processing...' : 'Upload image'}
                </Button>
              </div>
            </div>
            {!scanMode && !isProcessingRecipe && (
              <button type="button" onClick={() => setShowScanFeature(false)} className="mt-3 text-xs text-steel/50 hover:text-steel transition-colors flex items-center gap-1">
                <FiX className="w-3 h-3" /> Hide scanner
              </button>
            )}
          </div>
        )}

        {/* Basics */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-cast-iron">Basics</h2>
            <div className="flex items-center bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setVisibility('friends')}
                title="Only your friends can view"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${visibility === 'friends' ? 'bg-white text-light-green shadow-sm' : 'text-steel hover:text-cast-iron'}`}
              >
                <FiUsers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Friends</span>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('private')}
                title="Only you can view"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${visibility === 'private' ? 'bg-white text-light-green shadow-sm' : 'text-steel hover:text-cast-iron'}`}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
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

        {/* ── Mobile: single tabbed card (lg:hidden) ── */}
        <div className="lg:hidden w-full bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {/* Segmented tab control */}
          <div className="p-4 pb-3">
            <div className="flex bg-stone-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('ingredients')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'ingredients' ? 'bg-white text-cast-iron shadow-sm' : 'text-steel'}`}
              >
                Ingredients
                <span className={`ml-1.5 text-xs ${activeTab === 'ingredients' ? 'text-light-green' : 'text-steel/50'}`}>
                  {ingredientCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('instructions')}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'instructions' ? 'bg-white text-cast-iron shadow-sm' : 'text-steel'}`}
              >
                Instructions
                <span className={`ml-1.5 text-xs ${activeTab === 'instructions' ? 'text-light-green' : 'text-steel/50'}`}>
                  {instructionCount}
                </span>
              </button>
            </div>
            <p className="text-[11px] text-stone-400 mt-2 select-none">
              ← Swipe to delete &nbsp;·&nbsp; ↕ Drag the handle to reorder
            </p>
          </div>

          {/* Active list */}
          <div className="px-3">
            {activeTab === 'ingredients'
              ? renderBlockList('ingredients', ingredientBlocks, true)
              : renderBlockList('instructions', instructionBlocks, true)
            }
          </div>

          {/* Bottom action bar */}
          <div className="px-4 pt-3 pb-4 border-t border-stone-100 flex gap-3 mt-1">
            <button
              type="button"
              onClick={() => addBlockAt(activeTab, 'item')}
              className="flex items-center gap-1.5 text-sm font-medium text-light-green hover:text-green transition-colors"
            >
              <FiPlus className="w-4 h-4" />
              Add {activeTab === 'ingredients' ? 'ingredient' : 'step'}
            </button>
            <span className="text-stone-200">|</span>
            <button
              type="button"
              onClick={() => addBlockAt(activeTab, 'section')}
              className="flex items-center gap-1.5 text-sm font-medium text-steel/60 hover:text-cast-iron transition-colors"
            >
              <FiTag className="w-3.5 h-3.5" />
              Section
            </button>
          </div>
        </div>

        {/* ── Desktop: two-column grid (hidden lg:grid) ── */}
        <div className="hidden lg:grid grid-cols-2 gap-5 items-start">

          {/* Ingredients */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-bold text-cast-iron mb-3">Ingredients</h2>
            <div className="px-1">
              {renderBlockList('ingredients', ingredientBlocks, false)}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-4">
              <button
                type="button"
                onClick={() => addBlockAt('ingredients', 'item')}
                className="flex items-center gap-1.5 text-sm font-medium text-light-green hover:text-green transition-colors"
              >
                <FiPlus className="w-4 h-4" /> Add ingredient
              </button>
              <button
                type="button"
                onClick={() => addBlockAt('ingredients', 'section')}
                className="flex items-center gap-1.5 text-sm font-medium text-steel/50 hover:text-cast-iron transition-colors"
              >
                <FiTag className="w-3.5 h-3.5" /> Section break
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 sm:p-6">
            <h2 className="text-lg font-bold text-cast-iron mb-3">Instructions</h2>
            <div className="px-1">
              {renderBlockList('instructions', instructionBlocks, false)}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-4">
              <button
                type="button"
                onClick={() => addBlockAt('instructions', 'item')}
                className="flex items-center gap-1.5 text-sm font-medium text-light-green hover:text-green transition-colors"
              >
                <FiPlus className="w-4 h-4" /> Add step
              </button>
              <button
                type="button"
                onClick={() => addBlockAt('instructions', 'section')}
                className="flex items-center gap-1.5 text-sm font-medium text-steel/50 hover:text-cast-iron transition-colors"
              >
                <FiTag className="w-3.5 h-3.5" /> Section break
              </button>
            </div>
          </div>
        </div>

        {/* More options */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowMoreOptions(v => !v)}
            className="w-full flex items-center justify-between px-4 sm:px-6 py-4 cursor-pointer select-none"
          >
            <span className="text-sm font-medium text-cast-iron">More options</span>
            <span className={`text-steel/40 text-xs transition-transform duration-200 ${showMoreOptions ? 'rotate-180' : ''}`}>▼</span>
          </button>
          {showMoreOptions && (
            <div className="px-4 sm:px-6 pb-6 pt-5 border-t border-stone-100 space-y-6">

              {/* Image */}
              <div>
                <label className="block text-sm font-medium text-cast-iron mb-3">Recipe image</label>
                <input accept="image/*" className="hidden" type="file" ref={fileInputRef} onChange={handleFileChange} />
                <div className="flex flex-wrap gap-2 mb-3">
                  <button type="button" onClick={handleUploadClick} disabled={isUploading} className="inline-flex items-center gap-2 border border-light-green text-light-green hover:bg-light-green hover:text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
                    {isUploading ? <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Uploading...</> : <><i className="fa-solid fa-upload" /> Upload</>}
                  </button>
                  {isMobile && (
                    <>
                      <input accept="image/*" capture="environment" className="hidden" type="file" ref={cameraCaptureRef} onChange={handleFileChange} />
                      <button type="button" onClick={handleCameraCaptureClick} disabled={isUploading} className="inline-flex items-center gap-2 border border-light-green text-light-green hover:bg-light-green hover:text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50">
                        {isUploading ? <><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> Uploading...</> : <><i className="fa-solid fa-camera" /> Take photo</>}
                      </button>
                    </>
                  )}
                </div>
                <div className="flex gap-2 min-w-0">
                  <input
                    id="imageUrl"
                    placeholder="Or paste an image URL"
                    className="flex-1 min-w-0 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2.5 px-3 text-sm"
                    type="text"
                    value={imageUrl}
                    onChange={handleImageUrlChange}
                  />
                  <button type="button" onClick={validateAndPreviewImage} className="flex-shrink-0 border border-stone-200 text-steel hover:border-light-green hover:text-light-green rounded-xl px-3 py-2.5 text-sm font-medium transition-colors">
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
                  className="block w-full min-w-0 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2.5 px-4 text-sm"
                  type="text"
                  inputMode="url"
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
                    {userCategories.map(category => (
                      <button
                        key={category}
                        type="button"
                        onClick={() => handleCategoryChange(category)}
                        aria-pressed={selectedCategories.includes(category)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-150 focus:outline-none active:scale-95 ${selectedCategories.includes(category) ? 'bg-light-green text-white' : 'bg-eggshell text-steel hover:bg-stone-100 border border-stone-100'}`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 min-w-0">
                  <input
                    type="text"
                    placeholder="New category..."
                    className="flex-1 min-w-0 border border-stone-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-light-green/25 focus:border-light-green transition-colors py-2 px-3 text-sm"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <button type="button" onClick={handleAddNewCategory} className="flex-shrink-0 inline-flex items-center gap-1.5 border border-light-green text-light-green hover:bg-light-green hover:text-white rounded-xl px-3 py-2 text-sm font-medium transition-colors">
                    <FiPlus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

            </div>
          )}
        </div>

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

// ─── Row sub-components ───────────────────────────────────────────────────────

interface DragProps {
  onDragPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onDragPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onDragPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
}

interface SwipeProps {
  onSwipePointerDown: (e: React.PointerEvent<HTMLDivElement>, id: string) => void;
  onSwipePointerMove: (e: React.PointerEvent<HTMLDivElement>, id: string, innerRef: React.RefObject<HTMLDivElement>) => void;
  onSwipePointerUp: (e: React.PointerEvent<HTMLDivElement>, id: string, innerRef: React.RefObject<HTMLDivElement>, onDelete: () => void) => void;
  onSwipePointerCancel: (id: string, innerRef: React.RefObject<HTMLDivElement>) => void;
}

// Ghost input class shared by ingredient fields
const ghostInput = (extra = '') =>
  `bg-transparent border border-transparent hover:border-stone-200 focus:border-light-green focus:ring-2 focus:ring-light-green/20 rounded-[10px] outline-none transition-colors py-1.5 text-sm ${extra}`;

// Drag handle button (shared)
function DragHandle({ onPointerDown, onPointerMove, onPointerUp, alwaysVisible }: {
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => void;
  alwaysVisible?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder"
      className={`flex-shrink-0 text-stone-300 hover:text-stone-500 cursor-grab active:cursor-grabbing p-1 touch-none transition-opacity ${alwaysVisible ? 'opacity-60' : 'opacity-0 group-hover/row:opacity-100'}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
        <circle cx="2.5" cy="2.5" r="1.5" />
        <circle cx="7.5" cy="2.5" r="1.5" />
        <circle cx="2.5" cy="8" r="1.5" />
        <circle cx="7.5" cy="8" r="1.5" />
        <circle cx="2.5" cy="13.5" r="1.5" />
        <circle cx="7.5" cy="13.5" r="1.5" />
      </svg>
    </button>
  );
}

// Mobile swipe wrapper
function SwipeToDelete({ id, onDelete, children, swipeProps }: {
  id: string;
  onDelete: () => void;
  children: React.ReactNode;
  swipeProps: SwipeProps;
}) {
  const innerRef = useRef<HTMLDivElement>(null);
  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-red-500 flex items-center justify-center px-4">
        <span className="text-white text-xs font-semibold">Delete</span>
      </div>
      <div
        ref={innerRef}
        className="relative w-full bg-white touch-pan-y"
        onPointerDown={(e) => swipeProps.onSwipePointerDown(e, id)}
        onPointerMove={(e) => swipeProps.onSwipePointerMove(e, id, innerRef as React.RefObject<HTMLDivElement>)}
        onPointerUp={(e) => swipeProps.onSwipePointerUp(e, id, innerRef as React.RefObject<HTMLDivElement>, onDelete)}
        onPointerCancel={() => swipeProps.onSwipePointerCancel(id, innerRef as React.RefObject<HTMLDivElement>)}
      >
        {children}
      </div>
    </div>
  );
}

// Section row (used for both ingredients and instructions, both mobile and desktop)
function SectionRow({ block, idx, listType, isMobile, dragging, onUpdateLabel, onRemove, onDragPointerDown, onDragPointerMove, onDragPointerUp, onSwipePointerDown, onSwipePointerMove, onSwipePointerUp, onSwipePointerCancel }: {
  block: SectionBlock;
  idx: number;
  listType: 'ingredients' | 'instructions';
  isMobile: boolean;
  dragging: { listType: string; sourceIdx: number; targetIdx: number } | null;
  onUpdateLabel: (v: string) => void;
  onRemove: () => void;
} & DragProps & SwipeProps) {
  const isDragSource = dragging?.listType === listType && dragging.sourceIdx === idx;

  const content = (
    <div
      data-block-row
      className={`group/row flex items-center gap-1.5 py-1.5 rounded-xl transition-colors hover:bg-amber-50/40 ${isDragSource ? 'opacity-35' : ''}`}
    >
      <DragHandle
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        alwaysVisible={isMobile}
      />
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="flex-1 h-px bg-stone-200" />
        {isMobile ? (
          // Mobile: accent pill — mirror span sizes the pill to text content
          <div className="flex items-center gap-1 bg-light-green/10 border border-light-green/20 rounded-full px-2.5 py-1 flex-shrink-0 max-w-[60%]">
            <FiTag className="w-3 h-3 text-light-green flex-shrink-0" />
            <span className="relative min-w-10">
              <span
                aria-hidden="true"
                className="invisible whitespace-pre text-xs italic block"
                style={{ fontFamily: 'var(--font-baloo_2)' }}
              >
                {block.label || 'Section'}
              </span>
              <input
                className="absolute inset-0 w-full text-center italic text-light-green text-xs bg-transparent border-none outline-none"
                style={{ fontFamily: 'var(--font-baloo_2)' }}
                value={block.label}
                onChange={(e) => onUpdateLabel(e.target.value)}
                placeholder="Section"
              />
            </span>
          </div>
        ) : (
          // Desktop: centered italic serif between lines — mirror span sizes to content
          <span className="relative min-w-14 max-w-[40%]">
            <span
              aria-hidden="true"
              className="invisible whitespace-pre text-sm italic block px-2 py-0.5"
              style={{ fontFamily: 'var(--font-baloo_2)' }}
            >
              {block.label || 'Section name'}
            </span>
            <input
              className="absolute inset-0 w-full text-center italic text-steel/60 text-sm bg-transparent border border-transparent hover:border-stone-200 focus:border-light-green focus:ring-2 focus:ring-light-green/20 rounded-lg outline-none px-2 py-0.5 transition-colors"
              style={{ fontFamily: 'var(--font-baloo_2)' }}
              value={block.label}
              onChange={(e) => onUpdateLabel(e.target.value)}
              placeholder="Section name"
            />
          </span>
        )}
        <div className="flex-1 h-px bg-stone-200" />
      </div>
      {/* Delete (desktop only; mobile uses swipe) */}
      <button
        type="button"
        onClick={onRemove}
        className="hidden lg:flex flex-shrink-0 p-1 text-stone-300/50 opacity-0 group-hover/row:opacity-100 hover:text-red-500 transition-all"
      >
        <FiTrash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  if (isMobile) {
    return (
      <SwipeToDelete id={block.id} onDelete={onRemove} swipeProps={{ onSwipePointerDown, onSwipePointerMove, onSwipePointerUp, onSwipePointerCancel }}>
        {content}
      </SwipeToDelete>
    );
  }
  return <div className="relative">{content}</div>;
}

// Ingredient item row
function IngredientItemRowWrapper({ block, isDragSource, isMobile, canRemove, onUpdate, onRemove, onDragPointerDown, onDragPointerMove, onDragPointerUp, onSwipePointerDown, onSwipePointerMove, onSwipePointerUp, onSwipePointerCancel }: {
  block: { type: 'item'; id: string; amount: string; unit: string; item: string };
  idx?: number;
  isDragSource: boolean;
  isMobile: boolean;
  canRemove: boolean;
  onUpdate: (field: 'amount' | 'unit' | 'item', value: string) => void;
  onRemove: () => void;
} & DragProps & SwipeProps) {
  const content = (
    <div
      data-block-row
      className={`group/row relative flex items-center gap-1.5 py-1 rounded-xl transition-colors hover:bg-amber-50/40 ${isDragSource ? 'opacity-35' : ''}`}
    >
      <DragHandle
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        alwaysVisible={isMobile}
      />
      <input
        placeholder="Amt"
        className={ghostInput('w-12 text-center px-1 flex-shrink-0')}
        value={block.amount}
        onChange={(e) => onUpdate('amount', e.target.value)}
      />
      <input
        placeholder="Unit"
        className={ghostInput('w-16 px-1.5 flex-shrink-0')}
        value={block.unit}
        onChange={(e) => onUpdate('unit', e.target.value)}
      />
      <input
        placeholder="Ingredient"
        className={ghostInput('flex-1 min-w-0 px-2')}
        value={block.item}
        onChange={(e) => onUpdate('item', e.target.value)}
      />
      {/* Delete (desktop only) */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hidden lg:flex flex-shrink-0 p-1 text-stone-300/50 opacity-0 group-hover/row:opacity-100 hover:text-red-500 transition-all"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <SwipeToDelete id={block.id} onDelete={onRemove} swipeProps={{ onSwipePointerDown, onSwipePointerMove, onSwipePointerUp, onSwipePointerCancel }}>
        {content}
      </SwipeToDelete>
    );
  }
  return <div className="relative">{content}</div>;
}

// Instruction item row
function InstructionItemRowWrapper({ block, stepNum, isDragSource, isMobile, canRemove, onUpdate, onRemove, onDragPointerDown, onDragPointerMove, onDragPointerUp, onSwipePointerDown, onSwipePointerMove, onSwipePointerUp, onSwipePointerCancel, adjustHeight }: {
  block: { type: 'item'; id: string; text: string };
  idx?: number;
  stepNum: number;
  isDragSource: boolean;
  isMobile: boolean;
  canRemove: boolean;
  onUpdate: (value: string) => void;
  onRemove: () => void;
  adjustHeight: (el: HTMLTextAreaElement) => void;
} & DragProps & SwipeProps) {
  const content = (
    <div
      data-block-row
      className={`group/row relative flex items-start gap-1.5 py-1 rounded-xl transition-colors hover:bg-amber-50/40 ${isDragSource ? 'opacity-35' : ''}`}
    >
      <DragHandle
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        alwaysVisible={isMobile}
      />
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-light-green/10 text-light-green text-xs font-bold flex items-center justify-center mt-2 select-none">
        {stepNum}
      </div>
      <textarea
        placeholder="Describe this step"
        rows={1}
        className={`flex-1 min-w-0 resize-none overflow-hidden px-2 pt-1.5 pb-1 ${ghostInput('')}`}
        value={block.text}
        onChange={(e) => {
          onUpdate(e.target.value);
          adjustHeight(e.target as HTMLTextAreaElement);
        }}
        onFocus={(e) => adjustHeight(e.target as HTMLTextAreaElement)}
      />
      {/* Delete (desktop only) */}
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hidden lg:flex flex-shrink-0 p-1 text-stone-300/50 opacity-0 group-hover/row:opacity-100 hover:text-red-500 transition-all mt-1.5"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <SwipeToDelete id={block.id} onDelete={onRemove} swipeProps={{ onSwipePointerDown, onSwipePointerMove, onSwipePointerUp, onSwipePointerCancel }}>
        {content}
      </SwipeToDelete>
    );
  }
  return <div className="relative">{content}</div>;
}
