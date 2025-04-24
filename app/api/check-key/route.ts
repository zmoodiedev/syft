import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  // Safety function to redact most of the key for logging
  const redactKey = (key: string): string => {
    if (!key) return "[empty key]";
    
    // If it's a multiline key, process each line
    if (key.includes('\n')) {
      const lines = key.split('\n');
      return [
        lines[0],
        `[${lines.length - 2} middle lines redacted]`,
        lines[lines.length - 1]
      ].join('\n');
    }
    
    // For a single line key or encoded key
    if (key.length > 20) {
      return key.substring(0, 10) + "..." + key.substring(key.length - 10);
    }
    
    return key;
  };

  const result = {
    hasKey: false,
    keyLength: 0,
    keyFirstChars: "",
    keyContainsBeginMarker: false,
    keyContainsEndMarker: false,
    keyContainsEscapedNewlines: false,
    keyContainsActualNewlines: false,
    rawKeyFirstChars: "",
    transformedKey: {
      escapedNewlines: false,
      escapedQuotes: false,
      doubleQuotes: false,
      wrappedQuotes: false
    },
    fixedKeyWorks: false,
    redactedOriginalKey: ""
  };
  
  try {
    const privateKey = process.env.GOOGLE_VISION_PRIVATE_KEY || '';
    
    // Basic checks
    result.hasKey = !!privateKey;
    result.keyLength = privateKey.length;
    result.keyFirstChars = privateKey.substring(0, 10) + "...";
    result.redactedOriginalKey = redactKey(privateKey);
    result.keyContainsBeginMarker = privateKey.includes('-----BEGIN PRIVATE KEY-----');
    result.keyContainsEndMarker = privateKey.includes('-----END PRIVATE KEY-----');
    result.keyContainsEscapedNewlines = privateKey.includes('\\n');
    result.keyContainsActualNewlines = privateKey.includes('\n');
    
    // More detailed analysis
    if (privateKey) {
      // Show raw character codes for first few chars to debug invisible characters
      const charCodes = [];
      for (let i = 0; i < Math.min(10, privateKey.length); i++) {
        charCodes.push(privateKey.charCodeAt(i));
      }
      result.rawKeyFirstChars = JSON.stringify(charCodes);
      
      // Test different transforms
      const transforms = {
        escapedNewlines: privateKey.replace(/\\n/g, '\n'),
        escapedQuotes: privateKey.replace(/\\"/g, '"').replace(/\\'/g, "'"),
        doubleQuotes: privateKey.replace(/""/g, '"'),
        wrappedQuotes: privateKey.replace(/^"|"$/g, '')
      };
      
      // Check if any transform fixed the key
      result.transformedKey.escapedNewlines = transforms.escapedNewlines.includes('-----BEGIN PRIVATE KEY-----');
      result.transformedKey.escapedQuotes = transforms.escapedQuotes.includes('-----BEGIN PRIVATE KEY-----');
      result.transformedKey.doubleQuotes = transforms.doubleQuotes.includes('-----BEGIN PRIVATE KEY-----');
      result.transformedKey.wrappedQuotes = transforms.wrappedQuotes.includes('-----BEGIN PRIVATE KEY-----');
      
      // Create a fixed version using our standard helper
      const fixedKey = formatPrivateKey(privateKey);
      result.fixedKeyWorks = fixedKey.includes('-----BEGIN PRIVATE KEY-----');
    }
    
    return NextResponse.json({
      success: true,
      result,
      message: "Key analysis complete"
    });
  } catch (error) {
    console.error('Error analyzing key:', error);
    return NextResponse.json({
      success: false,
      error: `Failed to analyze private key: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}

// Helper function used in the main API as well
function formatPrivateKey(privateKey: string): string {
  // Check if the key already contains the proper format
  if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
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
  
  return formattedKey;
} 