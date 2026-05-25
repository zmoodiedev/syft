import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { auth } from '@/lib/firebase-admin';
import { visionLimit, checkRateLimit } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACT_TOOL: Anthropic.Tool = {
  name: 'extract_recipe',
  description: 'Extract structured recipe data from an image of a recipe.',
  input_schema: {
    type: 'object' as const,
    properties: {
      name:      { type: 'string', description: 'Recipe name' },
      servings:  { type: 'string', description: 'Serving size, e.g. "4" or "8 cookies"' },
      prepTime:  { type: 'string', description: 'Prep time, e.g. "15 mins"' },
      cookTime:  { type: 'string', description: 'Cook time, e.g. "30 mins"' },
      ingredients: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            amount: { type: 'string', description: 'Quantity, e.g. "2" or "1/2"' },
            unit:   { type: 'string', description: 'Unit of measure, e.g. "cups" or "tbsp"' },
            item:   { type: 'string', description: 'The ingredient name, e.g. "all-purpose flour"' },
          },
          required: ['amount', 'unit', 'item'],
        },
      },
      instructions: {
        type: 'array',
        items: { type: 'string' },
        description: 'Steps in order, one string per step, with the step number removed.',
      },
    },
    required: ['name', 'ingredients', 'instructions'],
  },
};

export async function POST(request: NextRequest) {
  const token = request.headers.get('Authorization')?.split('Bearer ')[1];
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let userId: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimitRes = await checkRateLimit(visionLimit, userId);
  if (rateLimitRes) return rateLimitRes;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file received' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be under 10 MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString('base64');

    // Claude vision only supports these four media types
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
    type SupportedMediaType = typeof supportedTypes[number];
    const mediaType: SupportedMediaType = supportedTypes.includes(file.type as SupportedMediaType)
      ? (file.type as SupportedMediaType)
      : 'image/jpeg';

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_recipe' },
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64Image },
          },
          {
            type: 'text',
            text: 'Extract the recipe from this image using the extract_recipe tool. If a field is not visible in the image, use an empty string or empty array.',
          },
        ],
      }],
    });

    const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');

    if (!toolUse) {
      return NextResponse.json(
        { error: 'Could not extract recipe from image. Make sure the image contains readable recipe text.' },
        { status: 422 }
      );
    }

    return NextResponse.json({ recipe: toolUse.input });
  } catch (error) {
    console.error('Error in vision-to-recipe:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to process image: ${message}` }, { status: 500 });
  }
}
