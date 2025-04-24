import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Specify Node.js runtime for Cloudinary compatibility
export const runtime = 'nodejs';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'No image URL provided' },
        { status: 400 }
      );
    }

    // Extract the public ID from the Cloudinary URL
    // Example URL: https://res.cloudinary.com/my-cloud-name/image/upload/v1234567890/syft_recipes/abcdef123456.jpg
    const extractPublicId = (url: string) => {
      try {
        // Check if it's a Cloudinary URL
        if (!url.includes('cloudinary.com')) {
          console.log('Not a Cloudinary URL:', url);
          return null;
        }
        
        // Parse the URL to get the path
        const urlObj = new URL(url);
        const pathSegments = urlObj.pathname.split('/');
        
        // Log the path segments for debugging
        console.log('URL path segments:', pathSegments);
        
        // Remove the version segment if present (starts with 'v')
        const versionIndex = pathSegments.findIndex(segment => segment.startsWith('v') && /^v\d+$/.test(segment));
        if (versionIndex !== -1) {
          pathSegments.splice(versionIndex, 1);
        }
        
        // Find the upload type index (usually 'image/upload')
        const uploadIndex = pathSegments.findIndex(segment => segment === 'upload');
        
        // The public ID is everything after the upload segment
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
      // Instead of failing, return a success response since the image might not exist
      return NextResponse.json({ 
        success: true,
        message: 'No valid Cloudinary image to delete',
        imageUrl
      });
    }

    // Delete the image from Cloudinary
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

    if (result.result !== 'ok') {
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to delete image: ${errorMessage}` },
      { status: 500 }
    );
  }
} 