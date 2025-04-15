export interface Ingredient {
  amount: string;
  unit: string;
  item: string;
  id: string;
}

export interface Recipe {
  id: string;
  name: string;
  servings?: string;
  prepTime: string;
  cookTime: string;
  ingredients: Ingredient[];
  instructions: string[];
  categories?: string[];
  imageUrl?: string;
  userId: string;
  sourceUrl?: string;
  sourceName?: string;
  lastScraped?: Date;
} 