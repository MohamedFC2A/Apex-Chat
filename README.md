# ApexChat - Cerebras Cloud Integration

Ultimate AI Chat SaaS with tier-based subscription and advanced features powered by **Cerebras Cloud**.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Cerebras API Key from [cloud.cerebras.ai](https://cloud.cerebras.ai/)

### Installation

```bash
# Clone/navigate to project
cd Apex-Chat

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
# Edit .env.local and add your CEREBRAS_API_KEY
```

### Development

**For Windows:**
```bash
# Install cross-env first
npm install --save-dev cross-env

# Update package.json scripts to:
# "dev": "cross-env NODE_ENV=development tsx server/index.ts"

# Then run
npm run dev
```

**For Linux/Mac:**
```bash
npm run dev
```

Access at: `http://localhost:5000`

## 🎯 Features

### Subscription Tiers
- **Starter ($20/mo)**: Llama 3.1 8B, Qwen 3 32B
- **Pro ($50/mo)**: + Llama 3.3 70B, GPT OSS 120B, Deep Research
- **Apex Elite ($100/mo)**: + Qwen 3 235B, ZAI GLM 4.6, GOD MODE

### Demo Voucher Codes
- `STARTER_2025` - Unlock Starter tier
- `DEEP_PRO_X` - Unlock Pro tier  
- `CHAOS_THEORY_100` - Unlock Elite tier (God Mode)

### Advanced Features
- ✅ **Tier-Based Model Locking** - Server-side validation
- ✅ **Thinking Mode** - Step-by-step reasoning
- ✅ **Deep Research Mode** - Comprehensive analysis (Pro+)
- ✅ **GOD MODE** - Cyberpunk theme + unbound AI (Elite only)

## 📖 API Documentation

### Environment Variables
```env
CEREBRAS_API_KEY=your_api_key_here
VITE_API_BASE_URL=http://localhost:5000
```

### Endpoints
- `POST /api/chat` - Send messages (tier-validated)
- `POST /api/voucher/redeem` - Redeem voucher codes
- `POST /api/subscription/validate` - Validate model access
- `GET /api/health` - Check API status

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18, Tailwind CSS, Zustand, Wouter
- **Backend**: Express, TypeScript
- **AI**: Cerebras Cloud API (OpenAI SDK compatible)
- **UI**: Shadcn/UI, Radix UI, Framer Motion

### Key Files
- `server/ai-orchestrator.ts` - Cerebras integration
- `server/routes.ts` - API endpoints
- `shared/schema.ts` - Types & validation
- `client/src/lib/subscription-store.ts` - Tier management
- `client/src/lib/feature-toggle-store.ts` - Feature flags

## 🧪 Testing

### Test Subscription Tiers
1. Navigate to `/pricing`
2. Redeem voucher: `DEEP_PRO_X`
3. Check model selector - Pro models now unlocked

### Test God Mode
1. Redeem: `CHAOS_THEORY_100`
2. Toggle "GOD MODE" badge
3. UI switches to cyberpunk theme (green glow, matrix background)
4. Chat responses use unbound prompts

## 📚 Documentation

See [`walkthrough.md`](../8a4bebf4-720c-42f6-a424-ba777bbe7dec/walkthrough.md) for:
- Complete implementation details
- Component-by-component breakdown
- Testing instructions
- Feature matrix

## ⚠️ Known Issues

1. **Streaming**: Currently simulated on frontend. Real streaming requires WebSocket/SSE.
2. **Windows Dev**: Requires `cross-env` for NODE_ENV variable
3. **God Mode**: Effectiveness depends on Cerebras API filtering policies

## 🔒 Security Notes

> [!WARNING]
> The voucher system is client-side for demo only. Production requires:
> - Backend authentication & payment processing
> - Database for subscription management
> - Rate limiting per tier

## 📄 License

MIT

## 🙏 Acknowledgments

- **Cerebras** - Ultra-fast AI inference
- **Shadcn/UI** - Beautiful component library
- **Radix UI** - Accessible primitives
