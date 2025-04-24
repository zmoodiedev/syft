import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Specify Node.js runtime for Google Cloud Vision compatibility
export const runtime = 'nodejs';

// Initialize Google Cloud Vision client with more verbose error handling
let visionClient: ImageAnnotatorClient;

// Create a simple logging wrapper that's more visible in Vercel logs
const logVercel = (type: 'info' | 'error' | 'warn', message: string, data?: unknown) => {
  const prefix = `[VERCEL ${type.toUpperCase()}]`;
  if (data) {
    console[type](`${prefix} ${message}`, data);
  } else {
    console[type](`${prefix} ${message}`);
  }
};

try {
  logVercel('info', 'Initializing Vision API client');
  
  if (process.env.GOOGLE_VISION_CLIENT_EMAIL && process.env.GOOGLE_VISION_PRIVATE_KEY) {
    // Use explicit credentials
    logVercel('info', 'Using explicit credentials via env vars', { 
      email: process.env.GOOGLE_VISION_CLIENT_EMAIL.substring(0, 5) + '...' 
    });
    
    // Format the private key correctly - Vercel sometimes has issues with newlines
    const privateKey = process.env.GOOGLE_VISION_PRIVATE_KEY
      .replace(/\\n/g, '\n')
      .replace(/""/g, '"'); // Fix potential double quotes issue
    
    visionClient = new ImageAnnotatorClient({
      credentials: {
        client_email: process.env.GOOGLE_VISION_CLIENT_EMAIL,
        private_key: privateKey,
      },
    });
    
    logVercel('info', 'Vision client initialized successfully with credentials');
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Fall back to GOOGLE_APPLICATION_CREDENTIALS environment variable
    logVercel('info', 'Using credentials file path', { 
      path: process.env.GOOGLE_APPLICATION_CREDENTIALS 
    });
    visionClient = new ImageAnnotatorClient();
    logVercel('info', 'Vision client initialized successfully with credentials file');
  } else {
    logVercel('error', 'No Google Cloud Vision API credentials found');
    visionClient = new ImageAnnotatorClient(); // This will likely fail, but we'll handle the error when the API is called
  }
} catch (error) {
  logVercel('error', 'Error initializing Google Cloud Vision client', error);
  // Create a dummy client that will throw a more helpful error when used
  visionClient = {
    textDetection: async () => {
      throw new Error('Google Cloud Vision API client failed to initialize. Please check your credentials.');
    }
  } as unknown as ImageAnnotatorClient;
}

export async function POST(request: NextRequest) {
  try {
    // Log the request is being processed
    logVercel('info', 'Received vision-to-recipe request');
    
    const formData = await request.formData();
    logVercel('info', 'Parsed form data successfully');
    
    const file = formData.get('file') as File | null;

    if (!file) {
      logVercel('error', 'No file received in request');
      return NextResponse.json(
        { error: 'No image file received' },
        { status: 400 }
      );
    }

    // Log file information
    logVercel('info', 'Received file', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    // Convert file to base64 with extensive error handling
    let base64Image: string;
    try {
      const bytes = await file.arrayBuffer();
      logVercel('info', 'Successfully read file as array buffer', { 
        byteLength: bytes.byteLength 
      });
      
      const buffer = Buffer.from(bytes);
      logVercel('info', 'Successfully created buffer from array buffer');
      
      base64Image = buffer.toString('base64');
      logVercel('info', 'Successfully converted buffer to base64', { 
        base64Length: base64Image.length 
      });
    } catch (bufferError) {
      logVercel('error', 'Error processing file buffer', bufferError);
      return NextResponse.json(
        { error: 'Failed to process image file: Buffer conversion error' },
        { status: 500 }
      );
    }

    // Perform OCR using Google Cloud Vision API with detailed error tracking
    try {
      logVercel('info', 'Sending image to Vision API');
      
      let detectionResult;
      try {
        // Use the simplified base64 content approach which is more reliable
        [detectionResult] = await visionClient.textDetection({
          image: { content: base64Image }
        });
        
        logVercel('info', 'Successfully received Vision API response');
      } catch (visionError: unknown) {
        // Log the specific error and return a detailed error response
        const errorDetails = visionError instanceof Error ? {
          message: visionError.message,
          code: (visionError as any).code,
          details: (visionError as any).details,
          status: (visionError as any).status
        } : { message: String(visionError) };
        
        logVercel('error', 'Vision API error', errorDetails);
        
        throw new Error(`Vision API error: ${errorDetails.message || 'Unknown error'}`);
      }
      
      if (!detectionResult) {
        logVercel('error', 'Vision API returned no results');
        return NextResponse.json(
          { error: 'Vision API returned no text detection results' },
          { status: 500 }
        );
      }

      const detections = detectionResult.textAnnotations || [];
      
      if (!detections.length) {
        logVercel('error', 'No text detected in the image');
        return NextResponse.json(
          { error: 'No text detected in the image. Please try a clearer photo with visible text.' },
          { status: 400 }
        );
      }

      // The first annotation contains the entire text from the image
      const extractedText = detections[0].description || '';

      if (!extractedText) {
        logVercel('error', 'Empty text extracted from image');
        return NextResponse.json(
          { error: 'Failed to extract text from image. Please try a different image.' },
          { status: 400 }
        );
      }

      logVercel('info', 'Successfully extracted text from image', {
        textLength: extractedText.length,
        textPreview: extractedText.substring(0, 100) + '...'
      });

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
      logVercel('error', 'Error calling Google Cloud Vision API', error);
      
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
    logVercel('error', 'Unexpected error in vision-to-recipe API', error);
    return NextResponse.json(
      { error: 'Failed to process image: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
} 