#!/bin/bash

# Generate new 64-character ENCRYPTION_KEY
echo "Generating new 64-character ENCRYPTION_KEY..."
NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)
echo "New ENCRYPTION_KEY: $NEW_ENCRYPTION_KEY"

echo ""
echo "Please update these environment variables in Render:"
echo ""
echo "1. ENCRYPTION_KEY=$NEW_ENCRYPTION_KEY"
echo ""
echo "2. The MAILGUN_API_KEY validation error can be ignored - it's an outdated check."
echo "   Your current key is correct: 6db360201cda5ca09f2773d06ddd7c0c-45de04af-8d6a9157"
echo ""
echo "After updating ENCRYPTION_KEY, redeploy your application."
