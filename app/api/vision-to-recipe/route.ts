import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Specify Node.js runtime for Google Cloud Vision compatibility
export const runtime = 'nodejs';

// Create a simple logging wrapper that's more visible in Vercel logs
const logVercel = (type: 'info' | 'error' | 'warn', message: string, data?: unknown) => {
  const prefix = `[VERCEL ${type.toUpperCase()}]`;
  if (data) {
    console[type](`${prefix} ${message}`, data);
  } else {
    console[type](`${prefix} ${message}`);
  }
};

// Initialize Google Cloud Vision client with better Vercel compatibility
let visionClient: ImageAnnotatorClient;

// Helper function to properly format Google Cloud private key for Vercel
function formatPrivateKey(privateKey: string): string {
  // Check if the key already contains the proper format
  if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.log('Private key appears to be properly formatted already');
    return privateKey;
  }
  
  // Apply all possible transformations that might be needed for Vercel
  let formattedKey = privateKey
    .replace(/\\n/g, '\n')             // Replace escaped newlines
    .replace(/\\"/g, '"')              // Replace escaped double quotes
    .replace(/\\'/g, "'")              // Replace escaped single quotes
    .replace(/\\&/g, '&')              // Replace escaped ampersands
    .replace(/\\r/g, '\r')             // Replace escaped carriage returns
    .replace(/""/g, '"')               // Fix double quotes that might have been doubled
    .replace(/^"|"$/g, '');            // Remove wrapping quotes if present
  
  // Vercel sometimes adds actual newlines before and after the key
  formattedKey = formattedKey.trim();
  
  // If after all transformations, the key still doesn't have the proper format,
  // it might have been completely escaped or mangled
  if (!formattedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.log('Warning: Private key still does not contain expected format after transformations');
  }
  
  return formattedKey;
}

try {
  logVercel('info', 'Initializing Vision API client in Vercel environment');
  
  // Create a credentials object directly using environment variables
  // This is more reliable in Vercel's serverless environment
  if (process.env.GOOGLE_VISION_CLIENT_EMAIL && process.env.GOOGLE_VISION_PRIVATE_KEY) {
    logVercel('info', 'Using explicit Google credentials in Vercel');
    
    // Check for proper formatting of the private key using our specialized helper
    const privateKey = formatPrivateKey(process.env.GOOGLE_VISION_PRIVATE_KEY);
    
    // Log the first few characters of credentials for debugging (NOT the full key)
    logVercel('info', 'Credential info', {
      client_email_prefix: process.env.GOOGLE_VISION_CLIENT_EMAIL.substring(0, 5) + '...',
      private_key_valid: privateKey.includes('-----BEGIN PRIVATE KEY-----'),
      private_key_length: privateKey.length,
      private_key_first_line: privateKey.split('\n')[0] || 'empty'
    });
    
    try {
      // Create explicit credentials object
      visionClient = new ImageAnnotatorClient({
        credentials: {
          client_email: process.env.GOOGLE_VISION_CLIENT_EMAIL,
          private_key: privateKey
        }
      });
      logVercel('info', 'Vision API client created with explicit credentials');
      
      // Test the credentials immediately with a very small request
      try {
        const testResult = await visionClient.textDetection({
          image: { content: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDK2cGEAAAAAElFTkSuQmCC', 'base64') }
        });
        logVercel('info', 'Credentials test successful', { 
          hasResult: !!testResult 
        });
      } catch (testError) {
        logVercel('error', 'Credentials appear valid but API test failed', testError);
      }
    } catch (credError) {
      logVercel('error', 'Failed to create Vision client with explicit credentials', credError);
      throw credError;
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    logVercel('info', 'Using credentials file path in Vercel', {
      path: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    
    try {
      visionClient = new ImageAnnotatorClient();
      logVercel('info', 'Vision API client created with credentials file');
    } catch (fileError) {
      logVercel('error', 'Failed to create Vision client with credentials file', fileError);
      throw fileError;
    }
  } else {
    // Last resort: try with default config for project-level authentication
    logVercel('warn', 'No explicit credentials found, trying default Google auth');
    
    try {
      visionClient = new ImageAnnotatorClient();
      logVercel('info', 'Vision API client created with default credentials');
    } catch (defaultError) {
      logVercel('error', 'Failed to create Vision client with default credentials', defaultError);
      throw new Error('No valid Google Cloud Vision credentials found. Please configure GOOGLE_VISION_CLIENT_EMAIL and GOOGLE_VISION_PRIVATE_KEY environment variables.');
    }
  }
} catch (initError) {
  logVercel('error', 'Error initializing Google Cloud Vision client', initError);
  
  // Create a client that immediately throws a helpful error when used
  visionClient = {
    textDetection: async () => {
      throw new Error('Google Cloud Vision API client failed to initialize. Please check your credentials and Vercel environment variables.');
    }
  } as unknown as ImageAnnotatorClient;
}

export async function POST(request: NextRequest) {
  try {
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


    const traceId = `vision-req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    logVercel('info', `Starting Vision API call [${traceId}]`);


    try {
      logVercel('info', `Sending image to Vision API [${traceId}]`);
      
      let detectionResult;
      try {

        [ detectionResult ] = await visionClient.textDetection({
          image: { content: Buffer.from(base64Image, 'base64') }
        });
        
        logVercel('info', `Successfully received Vision API response [${traceId}]`);
      } catch (visionError: unknown) {
        const errorDetails = visionError instanceof Error ? {
          message: visionError.message,
          code: (visionError as { code?: string }).code,
          details: (visionError as { details?: unknown }).details,
          status: (visionError as { status?: unknown }).status
        } : { message: String(visionError) };
        
        logVercel('error', `Vision API error [${traceId}]`, errorDetails);
        
        throw new Error(`Vision API error: ${errorDetails.message || 'Unknown error'}`);
      }
      
      if (!detectionResult) {
        logVercel('error', `Vision API returned no results [${traceId}]`);
        return NextResponse.json(
          { error: 'Vision API returned no text detection results' },
          { status: 500 }
        );
      }

      const detections = detectionResult.textAnnotations || [];
      
      if (!detections.length) {
        logVercel('error', `No text detected in the image [${traceId}]`);
        return NextResponse.json(
          { error: 'No text detected in the image. Please try a clearer photo with visible text.' },
          { status: 400 }
        );
      }

      // The first annotation contains the entire text from the image
      const extractedText = detections[0].description || '';

      if (!extractedText) {
        logVercel('error', `Empty text extracted from image [${traceId}]`);
        return NextResponse.json(
          { error: 'Failed to extract text from image. Please try a different image.' },
          { status: 400 }
        );
      }

      logVercel('info', `Successfully extracted text from image [${traceId}]`, {
        textLength: extractedText.length,
        textPreview: extractedText.substring(0, 100) + '...'
      });

      // Return just the raw text for manual processing
      return NextResponse.json({ 
        rawText: extractedText,
        traceId, // Include the trace ID in the response for debugging
        // Provide empty template for the client to populate manually
        recipe: {
          name: "",
          ingredients: [],
          directions: []
        }
      });
    } catch (error) {
      logVercel('error', `Error calling Google Cloud Vision API [${traceId}]`, error);
      
      // Add more context to the error for debugging
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Special handling for common Vision API errors
      if (errorMessage.includes('DECODER') || errorMessage.includes('unsupported')) {
        errorMessage = 'The image format appears to be unsupported by Google Cloud Vision API. Please try converting the image to JPEG format before uploading.';
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to extract text from image: ' + errorMessage,
          traceId // Include trace ID in error responses too
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorTraceId = `error-${Date.now()}`;
    logVercel('error', `Unexpected error in vision-to-recipe API [${errorTraceId}]`, error);
    return NextResponse.json(
      { 
        error: 'Failed to process image: ' + (error instanceof Error ? error.message : String(error)),
        traceId: errorTraceId
      },
      { status: 500 }
    );
  }
} 