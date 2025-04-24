import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import sharp from 'sharp';

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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    let buffer = Buffer.from(bytes);

    // Convert image to a standard format (JPEG) using Sharp
    try {
      // Using sharp to convert to JPEG format that Vision API handles well
      const convertedBuffer = await sharp(buffer)
        .jpeg({ quality: 90 }) // Convert to JPEG with 90% quality
        .toBuffer();
      
      buffer = convertedBuffer as Buffer<ArrayBuffer>;
      console.log('Successfully converted image to JPEG format');
    } catch (conversionError) {
      console.error('Error converting image format:', conversionError);
      // Continue with original buffer if conversion fails
      console.log('Proceeding with original image format');
    }

    // Perform OCR using Google Cloud Vision API
    try {
      const [textDetectionResult] = await visionClient.textDetection(buffer);
      
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
      return NextResponse.json(
        { error: 'Failed to extract text from image: ' + (error as Error).message },
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