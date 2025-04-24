import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import sharp from 'sharp';

// Specify Node.js runtime for Sharp and Google Cloud Vision compatibility
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    let processedBuffer: Buffer = buffer;
    let skippedImageProcessing = false;

    // Convert image to a standard format (JPEG) using Sharp
    try {
      // Using sharp with more explicit format handling
      const image = sharp(buffer);
      
      // Get image metadata to detect format issues
      const metadata = await image.metadata();
      console.log('Image metadata:', JSON.stringify({
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        space: metadata.space,
        channels: metadata.channels
      }));
      
      // Force conversion to JPEG with explicit settings
      const convertedBuffer = await image
        .jpeg({
          quality: 90,
          progressive: true,
          force: true,
          chromaSubsampling: '4:4:4'
        })
        .toBuffer();
      
      processedBuffer = convertedBuffer;
      console.log('Successfully converted image to JPEG format');
    } catch (conversionError) {
      console.error('Error converting image format:', conversionError);
      // Continue with original buffer if conversion fails
      console.log('Proceeding with original image format');
      
      // Try a simpler conversion as fallback
      try {
        const simpleConversion = await sharp(buffer, { failOn: 'none' })
          .toFormat('jpeg')
          .toBuffer();
        processedBuffer = simpleConversion;
        console.log('Fallback conversion successful');
      } catch (fallbackError) {
        console.error('Fallback conversion also failed:', fallbackError);
        skippedImageProcessing = true;
      }
    }

    // Perform OCR using Google Cloud Vision API
    try {
      // If all Sharp conversions failed, log this info
      if (skippedImageProcessing) {
        console.log('Using original buffer: Sharp image processing was skipped');
      }
      
      // Try direct text detection
      let textDetectionResult;
      try {
        [textDetectionResult] = await visionClient.textDetection(processedBuffer);
      } catch (visionError) {
        console.error('Error with standard buffer detection:', visionError);
        
        // Last resort: Try sending as base64 content
        console.log('Attempting base64 encoded image detection as last resort');
        try {
          const base64Image = buffer.toString('base64');
          [textDetectionResult] = await visionClient.textDetection({
            image: { content: base64Image }
          });
        } catch (base64Error) {
          console.error('Base64 detection also failed:', base64Error);
          throw new Error(`All image detection methods failed: ${(visionError as Error).message}`);
        }
      }
      
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