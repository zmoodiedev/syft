import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Specify Node.js runtime for Google Cloud Vision compatibility
export const runtime = 'nodejs';

// Define interfaces for error handling
interface ApiError {
  message: string;
  code?: string | number;
  details?: unknown;
  stack?: string;
}

// Define interface for results
interface DebugResults {
  traceId: string;
  timestamp: string;
  environment?: string;
  nodeVersion?: string;
  method?: string;
  visionApiStatus: string;
  hasCredentials: boolean;
  credentialDetails: {
    type?: string;
    email?: string;
    privateKeyValid?: boolean;
    privateKeyLength?: number;
    path?: string;
  };
  apiResponse?: {
    status: string;
    locationsDetected?: number;
  };
  error: ApiError | null;
  fileInfo?: {
    name: string;
    type: string;
    size: number;
  };
  conversionSuccess?: boolean;
  base64Length?: number;
  credentialType?: string;
  clientInitialized?: boolean;
  apiCallSuccess?: boolean;
  textDetected?: boolean;
  textSample?: string;
  apiError?: ApiError;
  initError?: ApiError;
  processError?: ApiError;
  unexpectedError?: ApiError;
}


export async function GET() {
  // Generate a trace ID for tracking
  const traceId = `debug-${Date.now()}`;
  console.log(`[${traceId}] Starting Vision API debug check`);
  
  // Return object to collect results
  const results: DebugResults = {
    traceId,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    nodeVersion: process.version,
    visionApiStatus: 'unknown',
    hasCredentials: false,
    credentialDetails: {},
    error: null
  };
  
  try {
    // Check for credentials
    if (process.env.GOOGLE_VISION_CLIENT_EMAIL && process.env.GOOGLE_VISION_PRIVATE_KEY) {
      results.hasCredentials = true;
      results.credentialDetails.type = 'explicit';
      results.credentialDetails.email = process.env.GOOGLE_VISION_CLIENT_EMAIL.substring(0, 5) + '...';
      
      const privateKey = process.env.GOOGLE_VISION_PRIVATE_KEY;
      results.credentialDetails.privateKeyValid = privateKey.includes('-----BEGIN PRIVATE KEY-----');
      results.credentialDetails.privateKeyLength = privateKey.length;
      
      // Try to init the client with credentials
      try {
        // Format private key
        const formattedKey = privateKey
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\&/g, '&')
          .replace(/\\r/g, '\r')
          .replace(/""/g, '"');
        
        // Create explicit credentials object
        const visionClient = new ImageAnnotatorClient({
          credentials: {
            client_email: process.env.GOOGLE_VISION_CLIENT_EMAIL,
            private_key: formattedKey
          }
        });
        
        console.log(`[${traceId}] Vision API client created with explicit credentials`);
        results.visionApiStatus = 'initialized';
      
        // Try a simple API call to check connectivity
        try {
          // Use text detection instead of locationDetection which doesn't exist
          const [response] = await visionClient.textDetection({
            image: { content: getSampleImageBase64() }
          });
          
          results.visionApiStatus = 'connected';
          results.apiResponse = {
            status: 'success',
            locationsDetected: response?.textAnnotations?.length || 0
          };
          
          console.log(`[${traceId}] Successfully connected to Vision API`);
        } catch (apiError) {
          const typedError = apiError as ApiError;
          console.error(`[${traceId}] API call error`, typedError);
          results.visionApiStatus = 'initialization_succeeded_but_api_call_failed';
          results.error = {
            message: typedError.message,
            code: typedError.code,
            details: typedError.details
          };
        }
      } catch (initError) {
        const typedError = initError as ApiError;
        console.error(`[${traceId}] Client initialization error`, typedError);
        results.visionApiStatus = 'initialization_failed';
        results.error = {
          message: typedError.message,
          code: typedError.code,
          details: typedError.details
        };
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      results.hasCredentials = true;
      results.credentialDetails.type = 'file';
      results.credentialDetails.path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      
      try {
        const visionClient = new ImageAnnotatorClient();
        console.log(`[${traceId}] Vision API client created with credentials file`);
        results.visionApiStatus = 'initialized';
        

        try {
          // Use text detection instead of locationDetection which doesn't exist
          const [response] = await visionClient.textDetection({
            image: { content: getSampleImageBase64() }
          });
          
          results.visionApiStatus = 'connected';
          results.apiResponse = {
            status: 'success',
            locationsDetected: response?.textAnnotations?.length || 0
          };
          
          console.log(`[${traceId}] Successfully connected to Vision API`);
        } catch (apiError) {
          const typedError = apiError as ApiError;
          console.error(`[${traceId}] API call error`, typedError);
          results.visionApiStatus = 'initialization_succeeded_but_api_call_failed';
          results.error = {
            message: typedError.message,
            code: typedError.code,
            details: typedError.details
          };
        }
      } catch (initError) {
        const typedError = initError as ApiError;
        console.error(`[${traceId}] Client initialization error with file credentials`, typedError);
        results.visionApiStatus = 'initialization_failed';
        results.error = {
          message: typedError.message,
          code: typedError.code,
          details: typedError.details
        };
      }
    } else {
      results.hasCredentials = false;
      results.credentialDetails.type = 'none';
      results.visionApiStatus = 'no_credentials';
      console.log(`[${traceId}] No Google Cloud Vision credentials found`);
    }
  } catch (error) {
    const typedError = error as ApiError;
    console.error(`[${traceId}] Unexpected error in debug endpoint`, typedError);
    results.visionApiStatus = 'unexpected_error';
    results.error = {
      message: typedError.message,
      stack: typedError.stack
    };
  }
  
  // Return the diagnostic results
  return NextResponse.json(results);
}

// Helper function to generate a tiny sample image (1x1 pixel) as base64
function getSampleImageBase64(): string {
  // This is a simple 1x1 pixel PNG as base64 - minimal valid image for testing
  return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mP4z8AAAAMBAQDK2cGEAAAAAElFTkSuQmCC';
}

// Also provide a POST endpoint for uploading an image to diagnose
export async function POST(request: NextRequest) {
  // Generate a trace ID for tracking
  const traceId = `debug-post-${Date.now()}`;
  console.log(`[${traceId}] Starting Vision API upload debug check`);
  
  const results: DebugResults = {
    traceId,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    method: 'POST',
    visionApiStatus: 'unknown',
    hasCredentials: false,
    credentialDetails: {},
    error: null
  };
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      results.error = { message: 'No file received' };
      return NextResponse.json(results, { status: 400 });
    }
    
    // Log file info
    results.fileInfo = {
      name: file.name,
      type: file.type,
      size: file.size
    };
    
    try {
      // Get buffer from file
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Convert buffer to base64
      const base64 = buffer.toString('base64');
      results.conversionSuccess = true;
      results.base64Length = base64.length;
      
      // Check credentials
      if (process.env.GOOGLE_VISION_CLIENT_EMAIL && process.env.GOOGLE_VISION_PRIVATE_KEY) {
        results.credentialType = 'explicit';
        
        // Format private key
        const privateKey = process.env.GOOGLE_VISION_PRIVATE_KEY
          .replace(/\\n/g, '\n')
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\&/g, '&')
          .replace(/\\r/g, '\r')
          .replace(/""/g, '"');
        
        try {
          // Create API client
          const visionClient = new ImageAnnotatorClient({
            credentials: {
              client_email: process.env.GOOGLE_VISION_CLIENT_EMAIL,
              private_key: privateKey
            }
          });
          
          results.clientInitialized = true;
          
          // Try the API call
          try {
            const [response] = await visionClient.textDetection({
              image: { content: base64 }
            });
            
            results.apiCallSuccess = true;
            results.textDetected = response?.textAnnotations ? response.textAnnotations.length > 0 : false;
            if (results.textDetected && response?.textAnnotations) {
              results.textSample = response.textAnnotations[0].description?.substring(0, 100) || '';
            }
          } catch (apiError) {
            const typedError = apiError as ApiError;
            results.apiCallSuccess = false;
            results.apiError = {
              message: typedError.message,
              code: typedError.code
            };
          }
        } catch (initError) {
          const typedError = initError as ApiError;
          results.clientInitialized = false;
          results.initError = {
            message: typedError.message
          };
        }
      } else {
        results.credentialType = 'none';
      }
    } catch (processError) {
      const typedError = processError as ApiError;
      results.conversionSuccess = false;
      results.processError = {
        message: typedError.message
      };
    }
    
    return NextResponse.json(results);
  } catch (error) {
    const typedError = error as ApiError;
    console.error(`[${traceId}] Error in POST debug endpoint`, typedError);
    results.unexpectedError = {
      message: typedError.message
    };
    return NextResponse.json(results, { status: 500 });
  }
} 