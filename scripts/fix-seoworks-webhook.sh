#!/bin/bash

echo "Fixing SEOWorks webhook setup..."

# Generate Prisma client
echo "Generating Prisma client..."
cd /Users/copp1723/Desktop/final_seo_hub
npx prisma generate

echo "Setup complete! The webhook is now ready to receive data from SEOWorks."
echo ""
echo "Webhook URL: https://rylie-seo-hub.onrender.com/api/seoworks/webhook"
echo "API Key: 7f3e9b5d2a8c4f6e1b9d3c7a5e8f2b4d6c9a1e3f7b5d9c2a6e4f8b1d3c7a9e5f"
