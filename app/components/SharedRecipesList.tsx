'use client';

import { useFriends } from '../context/FriendsContext';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import Button from './Button';

export default function SharedRecipesList() {
    const {
        sharedRecipes,
        acceptSharedRecipe,
        rejectSharedRecipe,
        loading
    } = useFriends();

    const handleAcceptRecipe = async (sharedRecipeId: string) => {
        try {
            await acceptSharedRecipe(sharedRecipeId);
            toast.success('Recipe added to your recipe book!');
        } catch (error: unknown) {
            console.error('Error accepting shared recipe:', error);
            toast.error('Failed to accept shared recipe');
        }
    };

    const handleRejectRecipe = async (sharedRecipeId: string) => {
        try {
            await rejectSharedRecipe(sharedRecipeId);
            toast.success('Recipe rejected');
        } catch (error: unknown) {
            console.error('Error rejecting shared recipe:', error);
            toast.error('Failed to reject shared recipe');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-6">Recipes Shared With You</h2>
            
            <div className="space-y-4">
                {sharedRecipes.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                        No recipes have been shared with you.
                    </p>
                ) : (
                    sharedRecipes.map((sharedRecipe) => (
                        <div
                            key={sharedRecipe.id}
                            className="p-4 bg-gray-50 rounded-lg"
                        >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                {/* Recipe Image */}
                                <div className="relative w-full sm:w-20 h-20 flex-shrink-0">
                                    {sharedRecipe.recipeImageUrl ? (
                                        <Image
                                            src={sharedRecipe.recipeImageUrl}
                                            alt={sharedRecipe.recipeName}
                                            fill
                                            sizes="(max-width: 640px) 100vw, 80px"
                                            className="object-cover rounded-md"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                                            <span className="text-gray-400 text-xs">No image</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Recipe Info */}
                                <div className="flex-grow">
                                    <h3 className="font-medium text-lg">{sharedRecipe.recipeName}</h3>
                                    <p className="text-sm text-gray-600 mb-2">
                                        Shared by: {sharedRecipe.senderName || 'A friend'}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleAcceptRecipe(sharedRecipe.id)}
                                        >
                                            Accept Recipe
                                        </Button>
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={() => handleRejectRecipe(sharedRecipe.id)}
                                        >
                                            Decline
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
} 