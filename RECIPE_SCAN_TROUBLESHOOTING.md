# Recipe Scanning Troubleshooting Guide

If you're experiencing issues with the recipe scanning feature, this guide will help you diagnose and fix the problems.

## Common Errors

### "Failed to process image: API configuration issue - please check server setup"

This error indicates that the required API keys are not properly configured.

**Solution:**

1. Check if you have set up both API keys:
   - OpenAI API key
   - Google Cloud Vision API credentials

2. Verify your `.env.local` file:
   - Make sure the file exists in the root directory of your project
   - Ensure the API keys are correctly formatted
   - No extra spaces or quotes around the values

3. Run the setup script again:
   ```bash
   bash setup-recipe-scanning.sh
   ```

4. Restart your development server after making changes to environment variables.

### "Failed to extract text from image"

This error occurs when the Google Cloud Vision API cannot detect text in the uploaded image.

**Solution:**

1. Check the image quality:
   - Make sure the image is clear and well-lit
   - Text should be legible and not blurry
   - Try taking a new photo with better lighting

2. Verify your Google Cloud Vision API setup:
   - Ensure your API key or service account has the Vision API enabled
   - Check if you've exceeded your quota or if your billing is active

### "Failed to parse recipe data"

This error happens when the OpenAI API fails to extract structured recipe data from the text.

**Solution:**

1. Check your OpenAI API key:
   - Verify the key is valid and active
   - Ensure you have sufficient credits/quota

2. Try with a simpler recipe:
   - Some complex recipes with unusual formatting might be difficult to parse
   - Start with a simple recipe card with clearly defined sections

## API Setup Guide

### OpenAI API Setup

1. Create an account at [OpenAI](https://platform.openai.com/)
2. Navigate to the API section
3. Create an API key
4. Add the key to your `.env.local` file:
   ```
   OPENAI_API_KEY=sk-your-openai-api-key
   ```

### Google Cloud Vision API Setup

**Option 1: Using a credentials file (recommended)**

1. Create a Google Cloud account
2. Create a new project
3. Enable the Vision API for your project
4. Create a service account with the "Cloud Vision API User" role
5. Download the JSON credentials file
6. Add the path to your `.env.local` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-credentials.json
   ```

**Option 2: Using explicit credentials**

1. Follow steps 1-4 from Option 1
2. From the service account JSON file, extract the `client_email` and `private_key` values
3. Add them to your `.env.local` file:
   ```
   GOOGLE_VISION_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_VISION_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   ```

## Tips for Best Results

- Use clear, well-lit photos
- Take the photo directly above the recipe card/page
- Make sure all text is visible and in focus
- Avoid glare or shadows on the text
- Crop out any unnecessary parts of the image
- For recipes spanning multiple pages, take multiple photos and create separate recipes

## Still Having Issues?

If you continue to encounter problems after following these steps, check the browser console for more detailed error messages, which can provide additional clues about what's going wrong. 