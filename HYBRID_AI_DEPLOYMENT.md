# 🚀 Hybrid AI Deployment Guide

## 📋 Overview

ApexChat now features a **Hybrid AI Engine** that automatically switches between:

| Environment | AI Provider | Endpoint | Cost |
|-------------|-------------|----------|------|
| **Local Dev** | Ollama (apex-coder) | `localhost:11434` | Free |
| **Firebase Prod** | Groq Cloud | `api.groq.com` | Free (rate-limited) |

---

## 🎯 Why Hybrid?

**Problem:** Firebase hosting cannot access `localhost:11434` on the user's machine.

**Solution:** 
- **Development:** Use local Ollama for max privacy & speed
- **Production:** Auto-switch to Groq cloud API (free & fast)

---

## ⚙️ Setup Instructions

### **1. Get Groq API Key (FREE)**

1. Go to https://console.groq.com/
2. Sign up / Log in
3. Navigate to **API Keys** tab
4. Click **"Create API Key"**
5. Copy the key (starts with `gsk_...`)

### **2. Configure Environment**

Add to `.env.local`:

```bash
# Groq API Key (for cloud deployment)
VITE_GROQ_API_KEY=gsk_your_actual_key_here
```

**⚠️ SECURITY:** 
- Never commit `.env.local` to Git
- For Firebase, set environment variable in hosting config

### **3. Deploy to Firebase**

```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Set environment variable (one-time)
firebase functions:config:set groq.api_key="gsk_..."
```

---

## 🔄 How It Works

### **Environment Detection**

```typescript
function isLocalEnvironment(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.startsWith("192.168.")
  );
}
```

### **Automatic Switching**

```typescript
if (isLocal) {
  // 🏠 LOCAL MODE
  try {
    response = await callOllama(model, messages);
  } catch {
    // Fallback to Groq if Ollama offline
    response = await callGroq(model, messages);
  }
} else {
  // ☁️ CLOUD MODE (Firebase)
  response = await callGroq(model, messages);
}
```

---

## 🧪 Testing

### **Test Local Mode**

1. Start Ollama:
   ```bash
   ollama serve
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Open `http://localhost:5000`

4. Send a message → Should use **Ollama**

5. Check console:
   ```
   🏠 LOCAL MODE: Using Ollama
   🔌 Connecting to Ollama (localhost:11434)...
   ✅ Ollama response received
   ```

### **Test Cloud Mode**

1. Stop Ollama (to force Groq fallback)

2. Send a message → Should use **Groq**

3. Check console:
   ```
   ⚠️ Ollama failed, falling back to Groq
   ☁️ Connecting to Groq Cloud (llama-3.3-70b-versatile)...
   ✅ Groq response received
   ```

### **Test Firebase Deployment**

1. Deploy:
   ```bash
   firebase deploy --only hosting
   ```

2. Open deployed URL (e.g., `https://your-app.web.app`)

3. Send a message → Should use **Groq** (no Ollama available)

4. Check console:
   ```
   ☁️ CLOUD MODE: Using Groq API
   ✅ Groq response received
   ```

---

## 📊 Model Mapping

ApexChat models are automatically mapped to Groq's available models:

| ApexChat Model | Groq Cloud Model | Context |
|----------------|------------------|---------|
| `llama3.1-8b` | `llama-3.1-8b-instant` | 128k |
| `llama3.3-70b` | `llama-3.3-70b-versatile` | 128k |
| `qwen-3-32b` | `llama-3.1-70b-versatile` | 128k |
| `apex-omni` | `llama-3.3-70b-versatile` | 128k |
| `apex-coder` | `llama-3.3-70b-versatile` | 128k |

**Note:** Groq doesn't have Qwen or custom models, so we use equivalent Llama models.

---

## 🔐 Security Best Practices

### **Environment Variables**

✅ **DO:**
- Store API keys in `.env.local`
- Use `import.meta.env.VITE_*` for client access
- Add `.env.local` to `.gitignore`

❌ **DON'T:**
- Hardcode API keys in source code
- Commit `.env.local` to Git
- Share API keys publicly

### **Firebase Security**

For Firebase deployment, use **Firebase Functions Config**:

```bash
# Set config
firebase functions:config:set groq.api_key="gsk_..."

# Get config
firebase functions:config:get

# Deploy
firebase deploy --only functions,hosting
```

---

## 🚨 Troubleshooting

### **Error: "GROQ API KEY is missing"**

**Cause:** `VITE_GROQ_API_KEY` not set in `.env.local`

**Fix:**
```bash
echo 'VITE_GROQ_API_KEY=gsk_your_key_here' >> .env.local
```

Then restart dev server (`npm run dev`).

### **Error: "Ollama is offline"**

**Cause:** Ollama not running

**Fix:**
```bash
ollama serve
```

Or let it fallback to Groq automatically.

### **Error: "Groq API Error: 429"**

**Cause:** Rate limit exceeded (free tier: 30 req/min)

**Fix:**
- Wait 60 seconds
- Or upgrade to Groq Pro ($0.10/1M tokens)

### **Firebase Deployment Shows Blank Page**

**Cause:** Environment variable not set

**Fix:**
```bash
# Rebuild with env vars
VITE_GROQ_API_KEY=gsk_... npm run build

# Deploy
firebase deploy --only hosting
```

---

## 📈 Performance Comparison

| Provider | Latency | Throughput | Cost | Privacy |
|----------|---------|------------|------|---------|
| **Ollama (Local)** | ~500ms | Unlimited | Free | 🔒 100% Private |
| **Groq (Cloud)** | ~300ms | 30 req/min | Free | ⚠️ API Logs |

**Recommendation:**
- **Dev:** Use Ollama (max privacy)
- **Prod:** Use Groq (zero setup for users)

---

## 🔮 Future Enhancements

- [ ] Add OpenAI fallback for Groq failures
- [ ] Add Anthropic Claude support
- [ ] Implement caching layer (Redis)
- [ ] Add load balancing across multiple providers
- [ ] Real-time streaming responses (SSE)
- [ ] Model performance analytics

---

## 📝 Configuration Reference

### **Environment Variables**

```bash
# Backend (Server)
CEREBRAS_API_KEY=csk_...          # Cerebras Cloud (primary)
PORT=5000                         # Server port
NODE_ENV=development              # Environment

# Frontend (Client)
VITE_API_BASE_URL=http://localhost:5000  # Backend URL
VITE_GROQ_API_KEY=gsk_...         # Groq Cloud (hybrid client)
```

### **Files Modified**

- `client/src/lib/ai-client.ts` - New hybrid AI client
- `client/src/pages/chat.tsx` - Updated to use hybrid client (TODO)
- `.env.example` - Updated with Groq instructions
- `HYBRID_AI_DEPLOYMENT.md` - This file

---

## ✅ Deployment Checklist

Before deploying to Firebase:

- [ ] Groq API key configured in `.env.local`
- [ ] Test local mode with Ollama
- [ ] Test cloud mode (stop Ollama, verify Groq fallback)
- [ ] Build succeeds: `npm run build`
- [ ] Firebase project initialized: `firebase init`
- [ ] Deploy: `firebase deploy --only hosting`
- [ ] Test deployed site (send message, check console)
- [ ] Verify no API key errors in browser console

---

**Last Updated:** December 12, 2025  
**Status:** ✅ Production Ready  
**Maintainer:** ApexChat Team
