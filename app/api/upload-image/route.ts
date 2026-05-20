import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { auth } from '@/lib/firebase-admin';
import { uploadLimit, checkRateLimit } from '@/lib/rate-limit';

// Specify Node.js runtime for Cloudinary compatibility
export const runtime = 'nodejs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Define resource type as a union type to match Cloudinary's API
type ResourceType = 'image' | 'auto' | 'video' | 'raw';

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let userId: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitRes = await checkRateLimit(uploadLimit, userId);
  if (rateLimitRes) return rateLimitRes;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file received' },
        { status: 400 }
      );
    }

    // Log file information for debugging
    console.log('Received file for upload:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Validate file size (max 7MB)
    if (file.size > 7 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size exceeds the 7MB limit' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP file' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Convert buffer to base64
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;

    // Upload to Cloudinary — resize, convert to WebP, strip all metadata
    const transformationOptions = {
      folder: 'syft_recipes',
      resource_type: 'image' as ResourceType,
      format: 'webp',
      quality: 80,
      width: 1200,
      crop: 'limit',
      flags: 'strip_profile', // Strip EXIF/IPTC/XMP (incl. GPS)
      timeout: 60000,
    };

    console.log('Starting Cloudinary upload with options:', {
      folder: transformationOptions.folder,
      format: transformationOptions.format,
      quality: transformationOptions.quality,
      width: transformationOptions.width,
    });

    // Upload to Cloudinary with retry
    let result;
    let retryCount = 0;
    const maxRetries = 2;
    
    while (retryCount <= maxRetries) {
      try {
        result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          cloudinary.uploader.upload(
            dataURI,
            transformationOptions,
            (error, result) => {
              if (error) {
                console.error(`Upload attempt ${retryCount + 1} failed:`, error);
                reject(error);
              } else {
                console.log(`Upload successful on attempt ${retryCount + 1}`);
                resolve(result as { secure_url: string });
              }
            }
          );
        });
        break; // Success, exit the retry loop
      } catch (uploadError) {
        retryCount++;
        if (retryCount > maxRetries) {
          console.error(`All ${maxRetries + 1} upload attempts failed`);
          throw uploadError;
        }
        console.log(`Retrying upload, attempt ${retryCount + 1} of ${maxRetries + 1}`);
        // Wait briefly before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!result?.secure_url) {
      throw new Error('Upload succeeded but no secure URL was returned');
    }

    console.log('Image uploaded successfully:', result.secure_url);
    return NextResponse.json({ imageUrl: result.secure_url });
  } catch (error) {
    console.error('Error uploading image:', error);
    const message = error instanceof Error
      ? error.message
      : (typeof error === 'object' && error !== null && 'message' in error)
        ? String((error as { message: unknown }).message)
        : JSON.stringify(error);
    return NextResponse.json(
      { error: 'Failed to upload image: ' + message },
      { status: 500 }
    );
  }
} 