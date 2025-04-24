#!/bin/bash

echo "Setting up Syft Recipe Scanning Feature"
echo "======================================"
echo ""

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install required dependencies
echo "Installing required dependencies..."
npm install @google-cloud/vision openai

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    cp .env .env.local 2>/dev/null || touch .env.local
fi

echo ""
echo "Now let's set up your API keys:"
echo ""

# Ask for OpenAI API key
read -p "Enter your OpenAI API key (press Enter to skip): " openai_key
if [ ! -z "$openai_key" ]; then
    # Check if the key already exists in .env.local
    if grep -q "OPENAI_API_KEY=" .env.local; then
        # Replace existing OpenAI key
        sed -i "" "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$openai_key/" .env.local 2>/dev/null || 
        sed -i "s/OPENAI_API_KEY=.*/OPENAI_API_KEY=$openai_key/" .env.local
    else
        # Add OpenAI key
        echo "OPENAI_API_KEY=$openai_key" >> .env.local
    fi
    echo "OpenAI API key has been set."
else
    echo "Skipped OpenAI API key setup."
fi

echo ""
echo "Google Cloud Vision API setup options:"
echo "1. Use a credentials file (recommended)"
echo "2. Set credentials directly in .env.local"
echo "3. Skip Google Cloud setup"
read -p "Choose an option (1-3): " google_option

case $google_option in
    1)
        read -p "Enter the path to your Google Cloud credentials JSON file: " credentials_path
        if [ -f "$credentials_path" ]; then
            if grep -q "GOOGLE_APPLICATION_CREDENTIALS=" .env.local; then
                sed -i "" "s|GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=$credentials_path|" .env.local 2>/dev/null || 
                sed -i "s|GOOGLE_APPLICATION_CREDENTIALS=.*|GOOGLE_APPLICATION_CREDENTIALS=$credentials_path|" .env.local
            else
                echo "GOOGLE_APPLICATION_CREDENTIALS=$credentials_path" >> .env.local
            fi
            echo "Google Cloud credentials path has been set."
        else
            echo "Error: The specified file does not exist."
        fi
        ;;
    2)
        read -p "Enter your Google Cloud client email: " client_email
        read -p "Enter your Google Cloud private key (paste the entire key): " private_key
        
        if [ ! -z "$client_email" ] && [ ! -z "$private_key" ]; then
            # Replace or add client email
            if grep -q "GOOGLE_VISION_CLIENT_EMAIL=" .env.local; then
                sed -i "" "s/GOOGLE_VISION_CLIENT_EMAIL=.*/GOOGLE_VISION_CLIENT_EMAIL=$client_email/" .env.local 2>/dev/null || 
                sed -i "s/GOOGLE_VISION_CLIENT_EMAIL=.*/GOOGLE_VISION_CLIENT_EMAIL=$client_email/" .env.local
            else
                echo "GOOGLE_VISION_CLIENT_EMAIL=$client_email" >> .env.local
            fi
            
            # Replace or add private key
            if grep -q "GOOGLE_VISION_PRIVATE_KEY=" .env.local; then
                sed -i "" "s/GOOGLE_VISION_PRIVATE_KEY=.*/GOOGLE_VISION_PRIVATE_KEY=\"$private_key\"/" .env.local 2>/dev/null || 
                sed -i "s/GOOGLE_VISION_PRIVATE_KEY=.*/GOOGLE_VISION_PRIVATE_KEY=\"$private_key\"/" .env.local
            else
                echo "GOOGLE_VISION_PRIVATE_KEY=\"$private_key\"" >> .env.local
            fi
            
            echo "Google Cloud credentials have been set."
        else
            echo "Error: Both client email and private key are required."
        fi
        ;;
    3)
        echo "Skipped Google Cloud setup."
        ;;
    *)
        echo "Invalid option. Skipping Google Cloud setup."
        ;;
esac

echo ""
echo "Setup completed!"
echo ""
echo "To use the recipe scanning feature:"
echo "1. Run 'npm run dev' to start the development server"
echo "2. Go to the Add Recipe page"
echo "3. Choose the 'Scan Recipe Card' option"
echo "4. Upload a photo of a recipe"
echo ""
echo "Happy cooking!" 