import { NextResponse } from 'next/server';

export async function GET() {
  const setupStatus = {
    googleVision: {
      configured: false,
      method: null as string | null,
      status: 'Not configured'
    }
  };

  // Check Google Cloud Vision API credentials
  if (process.env.GOOGLE_VISION_CLIENT_EMAIL && process.env.GOOGLE_VISION_PRIVATE_KEY) {
    setupStatus.googleVision.configured = true;
    setupStatus.googleVision.method = 'explicit';
    setupStatus.googleVision.status = 'Using explicit credentials';
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    setupStatus.googleVision.configured = true;
    setupStatus.googleVision.method = 'file';
    setupStatus.googleVision.status = 'Using credentials file';
  }

  return NextResponse.json({
    ready: setupStatus.googleVision.configured,
    setupStatus,
    environmentVariables: {
      GOOGLE_VISION_CLIENT_EMAIL: process.env.GOOGLE_VISION_CLIENT_EMAIL ? 'Present' : 'Missing',
      GOOGLE_VISION_PRIVATE_KEY: process.env.GOOGLE_VISION_PRIVATE_KEY ? 'Present' : 'Missing',
      GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Present' : 'Missing',
    }
  });
} 