import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Specify Node.js runtime for Google Cloud Vision compatibility
export const runtime = 'nodejs';

// Initialize Google Cloud Vision client
let visionClient: ImageAnnotatorClient;

try {
  if (process.env.GOOGLE_VISION_CLIENT_EMAIL && process.env.GOOGLE_VISION_PRIVATE_KEY) {
    // Use explicit credentials
    console.log('Initializing Vision API with explicit credentials');
    visionClient = new ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_VISION_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_VISION_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Fall back to GOOGLE_APPLICATION_CREDENTIALS environment variable
    console.log('Initializing Vision API with credentials file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
    visionClient = new ImageAnnotatorClient();
  } else {
    console.error('No Google Cloud Vision API credentials found. Please set either GOOGLE_VISION_CLIENT_EMAIL and GOOGLE_VISION_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS.');
    visionClient = new ImageAnnotatorClient(); // This will likely fail, but we'll handle the error when the API is called
  }
} catch (error) {
  console.error('Error initializing Google Cloud Vision client:', error);
  // Create a dummy client that will throw a more helpful error when used
  visionClient = {
    textDetection: async () => {
      throw new Error('Google Cloud Vision API client failed to initialize. Please check your credentials.');
    }
  } as unknown as ImageAnnotatorClient;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file received' },
        { status: 400 }
      );
    }

    // Get info about the file for debugging
    console.log('Received file:', {
      name: file.name,
      type: file.type,
      size: file.size,
    });

    // Convert file directly to base64 - skipping any Sharp processing
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    console.log(`Converted image to base64 (${base64Image.length} chars)`);

    // Perform OCR using Google Cloud Vision API with base64 content
    try {
      console.log('Sending image directly as base64 to Vision API');
      const [textDetectionResult] = await visionClient.textDetection({
        image: { content: base64Image }
      });
      
      if (!textDetectionResult) {
        console.error('Vision API returned no results');
        return NextResponse.json(
          { error: 'Vision API returned no text detection results' },
          { status: 500 }
        );
      }

      const detections = textDetectionResult.textAnnotations || [];
      
      if (!detections.length) {
        console.error('No text detected in the image');
        return NextResponse.json(
          { error: 'No text detected in the image. Please try a clearer photo with visible text.' },
          { status: 400 }
        );
      }

      // The first annotation contains the entire text from the image
      const extractedText = detections[0].description || '';

      if (!extractedText) {
        console.error('Empty text extracted from image');
        return NextResponse.json(
          { error: 'Failed to extract text from image. Please try a different image.' },
          { status: 400 }
        );
      }

      console.log('Successfully extracted text from image:', extractedText.substring(0, 100) + '...');

      // Return just the raw text for manual processing
      return NextResponse.json({ 
        rawText: extractedText,
        // Provide empty template for the client to populate manually
        recipe: {
          name: "",
          ingredients: [],
          directions: []
        }
      });
    } catch (error) {
      console.error('Error calling Google Cloud Vision API:', error);
      
      // Add more context to the error for debugging
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Special handling for common Vision API errors
      if (errorMessage.includes('DECODER') || errorMessage.includes('unsupported')) {
        errorMessage = 'The image format appears to be unsupported by Google Cloud Vision API. Please try converting the image to JPEG format before uploading.';
      }
      
      return NextResponse.json(
        { error: 'Failed to extract text from image: ' + errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image: ' + (error as Error).message },
      { status: 500 }
    );
  }
} 