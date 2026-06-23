#!/bin/bash

# 🚀 ApexChat Firebase Deployment Script
# Automates the build and deploy process

set -e  # Exit on error

echo "========================================="
echo "  🚀 APEXCHAT FIREBASE DEPLOYMENT"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check environment
echo -e "${BLUE}[1/5] Checking environment...${NC}"

if [ ! -f ".env.production" ]; then
    echo -e "${RED}ERROR: .env.production not found!${NC}"
    echo "Create .env.production with VITE_GROQ_API_KEY"
    exit 1
fi

if ! command -v firebase &> /dev/null; then
    echo -e "${RED}ERROR: Firebase CLI not installed!${NC}"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

echo -e "${GREEN}✓ Environment OK${NC}"
echo ""

# Step 2: Clean old build
echo -e "${BLUE}[2/5] Cleaning old build...${NC}"
rm -rf dist/
echo -e "${GREEN}✓ Cleaned${NC}"
echo ""

# Step 3: Build
echo -e "${BLUE}[3/5] Building production bundle...${NC}"
npm run build

if [ ! -d "dist/public" ]; then
    echo -e "${RED}ERROR: Build failed! dist/public not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# Step 4: Preview build (optional)
echo -e "${BLUE}[4/5] Checking build output...${NC}"
ls -lh dist/public/index.html
echo ""
echo "Build contains:"
ls dist/public/
echo ""

# Step 5: Deploy
echo -e "${BLUE}[5/5] Deploying to Firebase...${NC}"
firebase deploy --only hosting

echo ""
echo "========================================="
echo -e "${GREEN}  ✅ DEPLOYMENT COMPLETE!${NC}"
echo "========================================="
echo ""
echo "Your app is live at:"
echo "https://gen-lang-client-0258578294.web.app"
echo ""
echo "Next steps:"
echo "1. Open the URL in your browser"
echo "2. Test AI chat (should use Groq API)"
echo "3. Test Firebase Auth login"
echo "4. Check browser console for errors"
echo ""
