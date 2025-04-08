import { NextResponse } from 'next/server';
import { db } from '@/app/lib/firebase';
import { doc, getDoc, deleteDoc } from 'firebase/firestore';
import { deleteImage } from '@/lib/cloudinary';

export async function DELETE(request: Request) {
    try {
        const { recipeId, userId } = await request.json();

        if (!recipeId || !userId) {
            return NextResponse.json(
                { error: 'Recipe ID and user ID are required' },
                { status: 400 }
            );
        }

        // Get the recipe document to check ownership and get the image URL
        const recipeRef = doc(db, 'recipes', recipeId);
        const recipeSnap = await getDoc(recipeRef);

        if (!recipeSnap.exists()) {
            return NextResponse.json(
                { error: 'Recipe not found' },
                { status: 404 }
            );
        }

        const recipeData = recipeSnap.data();

        // Verify the user owns this recipe
        if (recipeData.userId !== userId) {
            return NextResponse.json(
                { error: 'Unauthorized to delete this recipe' },
                { status: 403 }
            );
        }

        // If there's an image URL, delete it from Cloudinary
        if (recipeData.imageUrl) {
            try {
                await deleteImage(recipeData.imageUrl);
            } catch (error) {
                console.error('Error deleting image:', error);
                // Continue with recipe deletion even if image deletion fails
            }
        }

        // Delete the recipe document
        await deleteDoc(recipeRef);

        return NextResponse.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
        console.error('Error deleting recipe:', error);
        return NextResponse.json(
            { error: 'Failed to delete recipe' },
            { status: 500 }
        );
    }
} 