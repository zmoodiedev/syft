import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@/lib/firebase-admin';

// Specify Node.js runtime for Cloudinary compatibility
export const runtime = 'nodejs';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    await auth.verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      );
    }

    const extractPublicId = (url: string) => {
      try {
        if (!url.includes('cloudinary.com')) {
          console.log('Not a Cloudinary URL:', url);
          return null;
        }
        
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/');
        console.log('URL path segments:', pathSegments);
        const versionIndex = pathSegments.findIndex(segment => segment.startsWith('v') && /^v\d+$/.test(segment));
        if (versionIndex !== -1) {
          pathSegments.splice(versionIndex, 1);
        }
        
        const uploadIndex = pathSegments.findIndex(segment => segment === 'upload');
        if (uploadIndex !== -1 && pathSegments.length > uploadIndex + 1) {
          const extractedId = pathSegments.slice(uploadIndex + 1).join('/');
          console.log('Extracted public ID:', extractedId);
          return extractedId;
        }
        
        console.log('Could not extract public ID from path segments:', pathSegments);
        return null;
      } catch (error) {
        console.error('Error extracting public ID:', error, 'URL:', url);
        return null;
      }
    };

    const publicId = extractPublicId(imageUrl);

    if (!publicId) {
      console.log('Could not extract public ID from URL:', imageUrl);
      return NextResponse.json({
        success: true,
        message: 'No valid Cloudinary image to delete',
        imageUrl
      });
    }

    const result = await new Promise<{ result: string }>((resolve, reject) => {
      cloudinary.uploader.destroy(
        publicId,
        { resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as { result: string });
        }
      );
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      return NextResponse.json(
        { error: `Cloudinary deletion failed: ${result.result}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Image deleted successfully',
      publicId
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    const errorMessage = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : JSON.stringify(error);
    return NextResponse.json(
      { error: `Failed to delete image: ${errorMessage}` },
      { status: 500 }
    );
  }
} 