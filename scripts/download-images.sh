#!/bin/bash

# Create the directory if it doesn't exist
mkdir -p public/images/food

# Download placeholder images
curl -o public/images/food/pasta.png "https://placehold.co/400x400/FF9B50/ffffff.png?text=Pasta"
curl -o public/images/food/salad.png "https://placehold.co/400x400/A8E890/ffffff.png?text=Salad"
curl -o public/images/food/dessert.png "https://placehold.co/400x400/FF78C4/ffffff.png?text=Dessert" 