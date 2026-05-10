import { NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase-admin';
import { v2 as cloudinary } from 'cloudinary';

export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function extractPublicId(url: string): string | null {
  try {
    if (!url.includes('cloudinary.com')) return null;
    const segments = new URL(url).pathname.split('/');
    const uploadIdx = segments.findIndex(s => s === 'upload');
    if (uploadIdx === -1) return null;
    const afterUpload = segments.slice(uploadIdx + 1).filter(s => !/^v\d+$/.test(s));
    return afterUpload.join('/') || null;
  } catch {
    return null;
  }
}

export async function DELETE(request: Request) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let userId: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { recipeId } = await request.json();
    if (!recipeId) {
      return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
    }

    const recipeRef = db.collection('recipes').doc(recipeId);
    const recipeSnap = await recipeRef.get();

    if (!recipeSnap.exists) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
    }

    const recipeData = recipeSnap.data()!;

    if (recipeData.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (recipeData.imageUrl) {
      const publicId = extractPublicId(recipeData.imageUrl);
      if (publicId) {
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
        } catch (err) {
          console.error('Error deleting recipe image from Cloudinary:', err);
        }
      }
    }

    await recipeRef.delete();

    return NextResponse.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe:', error);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
