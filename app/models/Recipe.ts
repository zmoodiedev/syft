export interface Ingredient {
  amount: string;
  unit: string;
  item: string;
  id: string;
  groupName?: string; // Optional group name for organizing ingredients
}

export interface IngredientGroup {
  name: string;
  ingredients: Ingredient[];
}

export interface Instruction {
  text: string;
  id: string;
  groupName?: string; // Optional group name for organizing instructions
}

export interface InstructionGroup {
  name: string;
  instructions: Instruction[];
}

export interface Recipe {
  id: string;
  name: string;
  servings?: string;
  prepTime: string;
  cookTime: string;
  ingredients: Ingredient[];
  instructions: Instruction[] | string[]; // Support both old string[] and new Instruction[] formats
  categories?: string[];
  imageUrl?: string;
  userId: string;
  sourceUrl?: string;
  sourceName?: string;
  lastScraped?: Date;
  visibility?: string;  // Recipe visibility (public, private, friends)
} 