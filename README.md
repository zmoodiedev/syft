# 📖 Syft

An online recipe app where you can store and organize your favorite recipes — all in one place, without the clutter of blog posts or ads.

## 🚀 Features
- **Personal Recipe Uploads** – Add and store your own recipes.
- **Recipe Card Scanning** - Use AI to extract recipes from photos of recipe cards or cookbook pages.  
- **Save Web Recipes** – Add recipes directly from a URL, automatically storing them in your account.  
- **Clean Interface** – No extra stories or ads — just the recipe.  
- **Organized Viewing** – Sort and search through your saved recipes with ease.  
- **Image Support** - Upload images for your recipes, stored in Cloudinary.
- **Categorization** - Organize recipes with customizable categories.

## 🛠️ Tech Stack
- **Frontend:** [React](https://reactjs.org/) + [Next.js](https://nextjs.org/) + [Tailwind CSS](https://tailwindcss.com/)
- **Backend:** Next.js API Routes (Serverless)
- **Database:** [Firebase Firestore](https://firebase.google.com/docs/firestore)
- **Authentication:** [Firebase Auth](https://firebase.google.com/docs/auth)
- **Image Storage:** [Cloudinary](https://cloudinary.com/)
- **AI & ML:** [Google Cloud Vision API](https://cloud.google.com/vision) + [OpenAI](https://openai.com/)

## 📸 Screenshots

# Syft Recipe App

A modern recipe management app that helps you organize, share, and discover recipes.

## New Feature: Recipe Image Scanning

We've added a powerful feature that allows users to upload images of recipe cards or cookbook pages and automatically extract recipe information using AI!

### How It Works

1. On the Add Recipe page, select the "Scan Recipe Card" option
2. Upload a photo of a recipe card or cookbook page
3. Google Cloud Vision API performs OCR to extract text from the image
4. The text is processed by OpenAI to identify recipe name, ingredients, and directions
5. The recipe form is automatically populated with the extracted information

### Setup Instructions

To set up the recipe image scanning feature, you'll need API keys for Google Cloud Vision and OpenAI.

#### Quick Setup with Script

We've included a setup script to make the process easier:

```bash
# Run the setup script
bash setup-recipe-scanning.sh
```

The script will:
1. Install the required dependencies
2. Guide you through setting up your API keys
3. Configure the environment variables

#### Manual Setup

If you prefer to set things up manually, follow these steps:

1. **Install Dependencies**:
```bash
npm install @google-cloud/vision openai
```

2. **Google Cloud Vision API Setup**:
   - Create a Google Cloud project at https://console.cloud.google.com/
   - Enable the Cloud Vision API
   - Create a service account with "Cloud Vision API User" role
   - Download the JSON credentials file
   - Either set the path to this file in `GOOGLE_APPLICATION_CREDENTIALS` environment variable
   - Or extract the `client_email` and `private_key` values and set them as environment variables

3. **OpenAI API Setup**:
   - Sign up for an OpenAI API key at https://platform.openai.com/
   - Set the `OPENAI_API_KEY` environment variable

4. **Environment Variables**:
   - Create or edit your `.env.local` file with the following:

```
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Google Cloud Vision API - Option 1 (recommended)
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/credentials.json

# OR Google Cloud Vision API - Option 2
GOOGLE_VISION_CLIENT_EMAIL=your_service_account_email
GOOGLE_VISION_PRIVATE_KEY=your_private_key
```

### Using the Feature

1. Start your development server: `npm run dev`
2. Navigate to the Add Recipe page
3. Select the "Scan Recipe Card" option
4. Upload a clear photo of a recipe card or cookbook page
5. Wait for the image to be processed (usually takes a few seconds)
6. Review the extracted information and make any necessary adjustments
7. Complete any missing fields and save your recipe

### Tips for Best Results

- Use clear, well-lit photos
- Make sure the text is legible and not blurry
- Position the camera directly above the recipe card/page
- Include only the recipe in the photo, cropping out unnecessary elements
- For recipes split across multiple pages, take multiple photos and create separate recipes

## Other Features

- User accounts and profiles
- Recipe management
- Recipe sharing
- Custom categories
- Friend requests and notifications
- Mobile-friendly responsive design

## Technologies Used

- Next.js for the frontend and API routes
- Firebase Authentication and Firestore
- Google Cloud Vision API for OCR
- OpenAI API for natural language processing
- Cloudinary for image storage
- TailwindCSS for styling
