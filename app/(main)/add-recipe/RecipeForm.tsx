'use client';

import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { db } from '@/app/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface Ingredient {
    item: string;
    amount: string;
    unit: string;
}

interface RecipeData {
    name: string;
    servings: string;
    prepTime: string;
    cookTime: string;
    ingredients: Ingredient[];
    instructions: string[];
}

interface RecipeFormProps {
    initialData?: RecipeData;
}

export default function RecipeForm({ initialData }: RecipeFormProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [recipeData, setRecipeData] = useState<RecipeData>(initialData || {
        name: '',
        servings: '',
        prepTime: '',
        cookTime: '',
        ingredients: [{ item: '', amount: '', unit: '' }],
        instructions: [''],
    });

    const addIngredient = () => {
        setRecipeData(prev => ({
            ...prev,
            ingredients: [...prev.ingredients, { item: '', amount: '', unit: '' }],
        }));
    };

    const addInstruction = () => {
        setRecipeData(prev => ({
            ...prev,
            instructions: [...prev.instructions, ''],
        }));
    };

    const updateIngredient = (index: number, field: keyof Ingredient, value: string) => {
        setRecipeData(prev => ({
            ...prev,
            ingredients: prev.ingredients.map((ing, i) => 
                i === index ? { ...ing, [field]: value } : ing
            ),
        }));
    };

    const updateInstruction = (index: number, value: string) => {
        setRecipeData(prev => ({
            ...prev,
            instructions: prev.instructions.map((inst, i) => 
                i === index ? value : inst
            ),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            // Filter out empty ingredients and instructions
            const cleanedData = {
                ...recipeData,
                ingredients: recipeData.ingredients.filter(ing => ing.item.trim() !== ''),
                instructions: recipeData.instructions.filter(inst => inst.trim() !== ''),
                userId: user.uid,
                createdAt: new Date(),
            };

            await addDoc(collection(db, 'recipes'), cleanedData);
            // Redirect to recipes page or show success message
        } catch (error) {
            console.error('Error saving recipe:', error);
            // Show error message to user
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
                <input
                    type="text"
                    placeholder="Recipe Name"
                    value={recipeData.name}
                    onChange={e => setRecipeData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border rounded"
                    required
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                        type="text"
                        placeholder="Servings"
                        value={recipeData.servings}
                        onChange={e => setRecipeData(prev => ({ ...prev, servings: e.target.value }))}
                        className="p-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Prep Time"
                        value={recipeData.prepTime}
                        onChange={e => setRecipeData(prev => ({ ...prev, prepTime: e.target.value }))}
                        className="p-2 border rounded"
                    />
                    <input
                        type="text"
                        placeholder="Cook Time"
                        value={recipeData.cookTime}
                        onChange={e => setRecipeData(prev => ({ ...prev, cookTime: e.target.value }))}
                        className="p-2 border rounded"
                    />
                </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Ingredients</h3>
                {recipeData.ingredients.map((ing, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Amount"
                            value={ing.amount}
                            onChange={e => updateIngredient(index, 'amount', e.target.value)}
                            className="p-2 border rounded"
                        />
                        <input
                            type="text"
                            placeholder="Unit"
                            value={ing.unit}
                            onChange={e => updateIngredient(index, 'unit', e.target.value)}
                            className="p-2 border rounded"
                        />
                        <input
                            type="text"
                            placeholder="Ingredient"
                            value={ing.item}
                            onChange={e => updateIngredient(index, 'item', e.target.value)}
                            className="p-2 border rounded"
                        />
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addIngredient}
                    className="text-light-blue hover:text-blue-600"
                >
                    + Add Ingredient
                </button>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Instructions</h3>
                {recipeData.instructions.map((instruction, index) => (
                    <div key={index} className="flex gap-2">
                        <span className="text-gray-500">{index + 1}.</span>
                        <input
                            type="text"
                            placeholder="Instruction step"
                            value={instruction}
                            onChange={e => updateInstruction(index, e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                ))}
                <button
                    type="button"
                    onClick={addInstruction}
                    className="text-light-blue hover:text-blue-600"
                >
                    + Add Step
                </button>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full bg-light-blue text-white py-2 px-4 rounded hover:bg-blue-600 disabled:opacity-50"
            >
                {loading ? 'Saving...' : 'Save Recipe'}
            </button>
        </form>
    );
} 