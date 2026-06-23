# 🧪 Hybrid AI Client - Testing Guide

## ✅ IMPLEMENTATION COMPLETE

The chat interface now uses **direct client-side AI routing** instead of backend API calls.

---

## 🎯 What Changed

### **Before (Backend-Dependent)**
```typescript
// Old: Required Node.js server running
response = await apiRequest("POST", "/api/chat", { ... });
```

### **After (Serverless-Ready)**
```typescript
// New: Direct client-side routing
response = await sendAIMessage(
  content,
  selectedModel,
  conversationHistory,
  serviceMode,
  isGodMode
);
```

---

## 🧪 Test Scenarios

### **1. Test Local Mode (Ollama)**

**Setup:**
```bash
# Start Ollama
ollama serve

# Pull model if needed
ollama pull llama3.1:8b

# Start dev server
npm run dev
```

**Test:**
1. Open `http://localhost:5000`
2. Send a message
3. Check browser console for:
   ```
   🤖 AI Client Status: {environment: 'LOCAL', groqConfigured: true, expectedProvider: 'Ollama (with Groq fallback)'}
   🚀 Sending via Hybrid AI Client (llama3.1-8b)...
   🔌 Connecting to Ollama (localhost:11434)...
   ✅ Ollama response received
   ```

**Expected:** Message sent to Ollama, response appears

---

### **2. Test Groq Fallback (Ollama Offline)**

**Setup:**
```bash
# Stop Ollama (simulate server being down)
# Just close the ollama serve terminal

# Dev server still running
```

**Test:**
1. Send a message
2. Check console for:
   ```
   🚀 Sending via Hybrid AI Client (llama3.1-8b)...
   🔌 Connecting to Ollama (localhost:11434)...
   ⚠️ Ollama failed, falling back to Groq: fetch failed
   ☁️ Connecting to Groq Cloud (llama-3.1-8b-instant)...
   ✅ Groq response received
   ```

**Expected:** Automatic fallback to Groq, message still works

---

### **3. Test Cloud Mode (Firebase Deployment)**

**Setup:**
```bash
# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

**Test:**
1. Open deployed URL (e.g., `https://your-app.web.app`)
2. Send a message
3. Check console for:
   ```
   🤖 AI Client Status: {environment: 'CLOUD', groqConfigured: true, expectedProvider: 'Groq Cloud'}
   🚀 Sending via Hybrid AI Client (llama3.1-8b)...
   ☁️ CLOUD MODE: Using Groq API
   ☁️ Connecting to Groq Cloud (llama-3.1-8b-instant)...
   ✅ Groq response received
   ```

**Expected:** Direct to Groq (no Ollama attempt)

---

### **4. Test God Mode (apex-unbound)**

**Local Setup:**
```bash
# Ensure apex-unbound model exists
ollama list | grep apex-unbound

# Start Ollama
ollama serve
```

**Test:**
1. Select **"APEX UNBOUND"** model from dropdown
2. Send Arabic message: "ازاي تعمل bubble sort؟"
3. Check console:
   ```
   🚀 Sending via Hybrid AI Client (apex-unbound)...
   🔌 Connecting to Ollama (localhost:11434)...
   ✅ Ollama response received
   ```

**Expected:** 
- Local: Uses Ollama with God Mode system prompt
- Cloud: Falls back to Groq with simulated God Mode

---

### **5. Test Error Handling**

**Scenario A: No Ollama, No Groq Key**
```bash
# Stop Ollama
# Remove VITE_GROQ_API_KEY from .env.local
```

**Expected Error:**
```
⚠️ Local AI Offline
Ollama is not running. Start it with: ollama serve
```

**Scenario B: Invalid Groq API Key**
```bash
# Set wrong key in .env.local
VITE_GROQ_API_KEY=invalid_key_123
```

**Expected Error:**
```
☁️ Cloud AI Error
Groq API request failed. Check your API key in .env.local
```

---

## 📊 Performance Comparison

| Mode | Provider | Latency | Reliability |
|------|----------|---------|-------------|
| **Local (Ollama)** | localhost:11434 | ~500ms | High (if running) |
| **Cloud (Groq)** | api.groq.com | ~300ms | Very High |
| **Fallback** | Ollama → Groq | ~800ms | Maximum |

---

## 🔍 Debugging Checklist

### **Message Not Sending**

- [ ] Check browser console for errors
- [ ] Verify Groq API key in `.env.local`
- [ ] Restart dev server after changing `.env.local`
- [ ] Check network tab for failed requests

### **Ollama Not Working**

- [ ] Verify Ollama is running: `curl http://localhost:11434/api/version`
- [ ] Check model exists: `ollama list`
- [ ] Review Ollama logs for errors

### **Groq Errors**

- [ ] Verify API key is correct (starts with `gsk_`)
- [ ] Check rate limits (30 requests/min free tier)
- [ ] Test API key: `curl -H "Authorization: Bearer YOUR_KEY" https://api.groq.com/openai/v1/models`

---

## 🚀 Quick Fixes

### **"GROQ API KEY is missing"**
```bash
echo 'VITE_GROQ_API_KEY=gsk_your_actual_key_here' >> .env.local
npm run dev
```

### **"Ollama fetch failed"**
```bash
ollama serve
# In new terminal:
ollama pull llama3.1:8b
```

### **Firebase deployment shows errors**
```bash
# Ensure environment variable is set during build
VITE_GROQ_API_KEY=gsk_... npm run build
firebase deploy --only hosting
```

---

## ✅ Success Indicators

**Local Development:**
- ✅ Ollama responses appear in < 1 second
- ✅ God Mode works with Arabic responses
- ✅ Groq fallback activates when Ollama stops

**Firebase Production:**
- ✅ Messages work without Node.js backend
- ✅ Groq API responses appear
- ✅ No "fetch to /api/chat failed" errors
- ✅ Console shows "CLOUD MODE: Using Groq API"

---

## 📝 Environment Variables

**Required for Local Dev:**
```bash
# .env.local
VITE_GROQ_API_KEY=gsk_...  # Get from https://console.groq.com/
```

**Required for Firebase:**
```bash
# Set during build
VITE_GROQ_API_KEY=gsk_...

# Or in Firebase hosting config
firebase functions:config:set groq.api_key="gsk_..."
```

---

## 🎯 Next Steps

1. **Test locally** with Ollama running
2. **Test fallback** by stopping Ollama
3. **Deploy to Firebase** to verify cloud mode
4. **Monitor errors** in browser console
5. **Share feedback** if any issues arise

---

**Status:** ✅ Ready for testing  
**Last Updated:** December 12, 2025  
**Implementation:** Option 2 (Client-Side Hybrid)
