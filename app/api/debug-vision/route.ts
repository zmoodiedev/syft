import { NextRequest, NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

// Specify Node.js runtime for Google Cloud Vision compatibility
export const runtime = 'nodejs';

// Create a simple testing function for diagnosis
export async function GET(request: NextRequest) {
  // Generate a trace ID for tracking
  const traceId = `debug-${Date.now()}`;
  console.log(`[${traceId}] Starting Vision API debug check`);
  
  // Return object to collect results
  const results: Record<string, any> = {
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
          const [location] = await visionClient.locationDetection({
            image: { content: getSampleImageBase64() }
          });
          
          results.visionApiStatus = 'connected';
          results.apiResponse = {
            status: 'success',
            locationsDetected: location?.locationsAnnotations?.length || 0
          };
          
          console.log(`[${traceId}] Successfully connected to Vision API`);
        } catch (apiError: any) {
          console.error(`[${traceId}] API call error`, apiError);
          results.visionApiStatus = 'initialization_succeeded_but_api_call_failed';
          results.error = {
            message: apiError.message,
            code: apiError.code,
            details: apiError.details
          };
        }
      } catch (initError: any) {
        console.error(`[${traceId}] Client initialization error`, initError);
        results.visionApiStatus = 'initialization_failed';
        results.error = {
          message: initError.message,
          code: initError.code,
          details: initError.details
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
        
        // Try a simple API call
        try {
          const [location] = await visionClient.locationDetection({
            image: { content: getSampleImageBase64() }
          });
          
          results.visionApiStatus = 'connected';
          results.apiResponse = {
            status: 'success',
            locationsDetected: location?.locationsAnnotations?.length || 0
          };
          
          console.log(`[${traceId}] Successfully connected to Vision API`);
        } catch (apiError: any) {
          console.error(`[${traceId}] API call error`, apiError);
          results.visionApiStatus = 'initialization_succeeded_but_api_call_failed';
          results.error = {
            message: apiError.message,
            code: apiError.code,
            details: apiError.details
          };
        }
      } catch (initError: any) {
        console.error(`[${traceId}] Client initialization error with file credentials`, initError);
        results.visionApiStatus = 'initialization_failed';
        results.error = {
          message: initError.message,
          code: initError.code,
          details: initError.details
        };
      }
    } else {
      results.hasCredentials = false;
      results.credentialDetails.type = 'none';
      results.visionApiStatus = 'no_credentials';
      console.log(`[${traceId}] No Google Cloud Vision credentials found`);
    }
  } catch (error: any) {
    console.error(`[${traceId}] Unexpected error in debug endpoint`, error);
    results.visionApiStatus = 'unexpected_error';
    results.error = {
      message: error.message,
      stack: error.stack
    };
  }
  
  // Return the diagnostic results
  return NextResponse.json(results);
}

// Helper function to generate a tiny sample image (1x1 pixel) as base64
function getSampleImageBase64(): string {
  // This is a 1x1 pixel black JPEG as base64
  return '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==';
}

// Also provide a POST endpoint for uploading an image to diagnose
export async function POST(request: NextRequest) {
  // Generate a trace ID for tracking
  const traceId = `debug-post-${Date.now()}`;
  console.log(`[${traceId}] Starting Vision API upload debug check`);
  
  const results: Record<string, any> = {
    traceId,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    method: 'POST',
    error: null
  };
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      results.error = 'No file received';
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
            results.textDetected = response?.textAnnotations && response.textAnnotations.length > 0;
            if (results.textDetected) {
              results.textSample = response.textAnnotations[0].description.substring(0, 100);
            }
          } catch (apiError: any) {
            results.apiCallSuccess = false;
            results.apiError = {
              message: apiError.message,
              code: apiError.code
            };
          }
        } catch (initError: any) {
          results.clientInitialized = false;
          results.initError = {
            message: initError.message
          };
        }
      } else {
        results.credentialType = 'none';
      }
    } catch (processError: any) {
      results.conversionSuccess = false;
      results.processError = {
        message: processError.message
      };
    }
    
    return NextResponse.json(results);
  } catch (error: any) {
    console.error(`[${traceId}] Error in POST debug endpoint`, error);
    results.unexpectedError = {
      message: error.message
    };
    return NextResponse.json(results, { status: 500 });
  }
} 