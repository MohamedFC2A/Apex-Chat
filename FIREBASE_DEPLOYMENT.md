# 🚀 Firebase Deployment Guide

## ✅ CONFIGURATION COMPLETE

Firebase hosting is now properly configured to deploy your ApexChat application.

---

## 📋 Deployment Checklist

### **Pre-Deployment**

- [x] Firebase project initialized (`gen-lang-client-0258578294`)
- [x] `firebase.json` configured with hosting settings
- [x] `.firebaserc` created with project ID
- [x] Firestore rules deployed
- [x] Firestore indexes configured
- [x] Groq API key set in `.env.local`

---

## 🔧 Configuration Details

### **`firebase.json`**

```json
{
  "hosting": {
    "public": "dist/public",           // Build output directory
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"   // SPA fallback
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"  // 1 year cache for assets
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

**Key Settings:**
- ✅ **Public Directory:** `dist/public` (matches Vite build output)
- ✅ **SPA Routing:** All routes fallback to `index.html`
- ✅ **Asset Caching:** JS/CSS files cached for 1 year
- ✅ **Font CORS:** Cross-origin access enabled

---

## 🚀 Deployment Steps

### **Step 1: Build the App**

```bash
# Install dependencies (if not already done)
npm install

# Build for production
npm run build
```

**Expected Output:**
```
vite v5.4.x building for production...
✓ 1234 modules transformed.
dist/public/index.html                   x.xx kB
dist/public/assets/index-xxxxx.js      xxx.xx kB │ gzip: xx.xx kB
dist/public/assets/index-xxxxx.css      xx.xx kB │ gzip: x.xx kB
✓ built in x.xxs
```

**Verify Build:**
```bash
# Check if dist/public exists
ls dist/public

# Expected files:
# index.html
# assets/
# vite.svg (or favicon)
```

---

### **Step 2: Deploy to Firebase**

```bash
# Login to Firebase (if not already logged in)
firebase login

# Deploy hosting only
firebase deploy --only hosting

# Or deploy everything (hosting + firestore rules)
firebase deploy
```

**Expected Output:**
```
=== Deploying to 'gen-lang-client-0258578294'...

i  deploying hosting
i  hosting[gen-lang-client-0258578294]: beginning deploy...
i  hosting[gen-lang-client-0258578294]: found XX files in dist/public
✔  hosting[gen-lang-client-0258578294]: file upload complete
i  hosting[gen-lang-client-0258578294]: finalizing version...
✔  hosting[gen-lang-client-0258578294]: version finalized
i  hosting[gen-lang-client-0258578294]: releasing new version...
✔  hosting[gen-lang-client-0258578294]: release complete

✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/gen-lang-client-0258578294/overview
Hosting URL: https://gen-lang-client-0258578294.web.app
```

---

### **Step 3: Verify Deployment**

1. **Open Hosted URL:**
   ```
   https://gen-lang-client-0258578294.web.app
   ```

2. **Check Console:**
   - Open browser DevTools (F12)
   - Look for:
     ```
     🤖 AI Client Status: {environment: 'CLOUD', ...}
     ```

3. **Test AI Chat:**
   - Send a message
   - Should see:
     ```
     ☁️ CLOUD MODE: Using Groq API
     ✅ Groq response received
     ```

4. **Test Firebase Auth:**
   - Sign in with Google
   - Check Firestore sync status in Settings

---

## 🔍 Troubleshooting

### **Error: "Cannot find dist/public directory"**

**Cause:** Build failed or didn't complete

**Fix:**
```bash
# Clean build artifacts
rm -rf dist/

# Rebuild
npm run build

# Verify output
ls dist/public/index.html
```

---

### **Error: "No Firebase project found"**

**Cause:** `.firebaserc` missing or wrong project ID

**Fix:**
```bash
# Check current project
firebase use

# Set correct project
firebase use gen-lang-client-0258578294

# Or re-initialize
firebase init hosting
```

---

### **Error: "Blank page after deployment"**

**Cause:** Environment variables not bundled

**Fix:**
```bash
# Build with environment variables
VITE_GROQ_API_KEY=gsk_... npm run build

# Deploy
firebase deploy --only hosting
```

**Or** add to `.env.production`:
```bash
VITE_GROQ_API_KEY=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
```

---

### **Error: "GROQ API KEY is missing" in production**

**Cause:** Vite environment variables not loaded

**Fix:**

Create `.env.production`:
```bash
VITE_GROQ_API_KEY=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
```

Then rebuild:
```bash
npm run build
firebase deploy --only hosting
```

---

### **Error: "404 on refresh"**

**Cause:** SPA rewrite rule not working

**Fix:** Already configured in `firebase.json`:
```json
{
  "rewrites": [
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

If issue persists, redeploy:
```bash
firebase deploy --only hosting
```

---

## 📊 Performance Optimization

### **Current Build Size**

Check your build output:
```bash
npm run build
```

**Target Metrics:**
- ✅ **Main Bundle:** < 500 KB (gzipped < 150 KB)
- ✅ **CSS:** < 50 KB (gzipped < 10 KB)
- ✅ **Total Size:** < 1 MB

### **Lazy Loading**

Already implemented:
```typescript
// Settings and Pricing pages lazy loaded
const Settings = lazy(() => import("@/pages/settings"));
const PricingPage = lazy(() => import("@/pages/pricing-page"));
```

### **Cache Headers**

Static assets cached for **1 year**:
```json
{
  "source": "**/*.@(js|css)",
  "headers": [
    {
      "key": "Cache-Control",
      "value": "max-age=31536000"
    }
  ]
}
```

---

## 🔐 Security Headers

### **CORS for Fonts**

```json
{
  "source": "**/*.@(eot|otf|ttf|ttc|woff|font.css)",
  "headers": [
    {
      "key": "Access-Control-Allow-Origin",
      "value": "*"
    }
  ]
}
```

### **Recommended Additional Headers**

Add to `firebase.json` for enhanced security:

```json
{
  "source": "**",
  "headers": [
    {
      "key": "X-Content-Type-Options",
      "value": "nosniff"
    },
    {
      "key": "X-Frame-Options",
      "value": "DENY"
    },
    {
      "key": "X-XSS-Protection",
      "value": "1; mode=block"
    }
  ]
}
```

---

## 🌐 Custom Domain Setup

### **Add Custom Domain:**

1. Go to Firebase Console:
   ```
   https://console.firebase.google.com/project/gen-lang-client-0258578294/hosting
   ```

2. Click **"Add custom domain"**

3. Enter your domain (e.g., `apexchat.ai`)

4. Follow DNS verification steps

5. Wait for SSL certificate provisioning (24-48 hours)

---

## 📈 Monitoring & Analytics

### **Firebase Hosting Metrics**

View deployment stats:
```
https://console.firebase.google.com/project/gen-lang-client-0258578294/hosting
```

**Key Metrics:**
- Requests per day
- Bandwidth usage
- Error rates
- Response times

### **Add Google Analytics (Optional)**

Add to `index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

---

## 🔄 CI/CD Automation

### **GitHub Actions Workflow**

Create `.github/workflows/firebase-deploy.yml`:

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main

jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        env:
          VITE_GROQ_API_KEY: ${{ secrets.VITE_GROQ_API_KEY }}
        run: npm run build
      
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: gen-lang-client-0258578294
```

**Setup Secrets:**
1. Go to GitHub repo → Settings → Secrets
2. Add `VITE_GROQ_API_KEY`
3. Add `FIREBASE_SERVICE_ACCOUNT` (from Firebase Console)

---

## 🧪 Testing Production Build Locally

Before deploying, test the build locally:

```bash
# Install Firebase CLI tools
npm install -g firebase-tools

# Build the app
npm run build

# Serve locally
firebase serve --only hosting

# Open http://localhost:5000
```

**Test Checklist:**
- [ ] Home page loads
- [ ] Login works (Google Auth)
- [ ] Chat sends messages (Groq API)
- [ ] Settings page accessible
- [ ] Firestore sync working
- [ ] No console errors

---

## 📝 Deployment Logs

### **Save Deployment Info**

```bash
# Deploy and save output
firebase deploy --only hosting > deploy.log 2>&1

# View hosting URL
grep "Hosting URL" deploy.log
```

### **Rollback to Previous Version**

```bash
# List versions
firebase hosting:versions

# Rollback to specific version
firebase hosting:clone SOURCE_SITE:SOURCE_VERSION TARGET_SITE:live
```

---

## ✅ Post-Deployment Checklist

After successful deployment:

- [ ] Verify site is live at hosting URL
- [ ] Test AI chat functionality (Groq API working)
- [ ] Test Firebase Auth (Google login)
- [ ] Test Firestore sync (Settings → Cloud Sync)
- [ ] Test voucher redemption
- [ ] Check browser console for errors
- [ ] Test on mobile devices
- [ ] Verify SSL certificate active (https://)
- [ ] Test all routes (/, /chat, /settings, /billing, /pricing)
- [ ] Monitor Firebase usage (first 24 hours)

---

## 🎯 Quick Deploy Command

```bash
# One-command deploy (from project root)
npm run build && firebase deploy --only hosting
```

---

## 📚 Resources

- **Firebase Console:** https://console.firebase.google.com/project/gen-lang-client-0258578294
- **Hosting Docs:** https://firebase.google.com/docs/hosting
- **Groq Dashboard:** https://console.groq.com/
- **Vite Docs:** https://vitejs.dev/guide/build.html

---

**Deployment Status:** ✅ Ready to Deploy  
**Estimated Build Time:** ~30 seconds  
**Estimated Deploy Time:** ~1 minute  
**Total Time:** < 2 minutes

---

**Run this to deploy now:**

```bash
npm run build && firebase deploy --only hosting
```

🚀 **Your app will be live at:** `https://gen-lang-client-0258578294.web.app`
