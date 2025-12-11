# ApexChat - Advanced Multi-Model AI Platform

## Overview
ApexChat is a ChatGPT-inspired multi-model AI chat platform that allows users to switch between GPT-4o, Claude 3.5 Sonnet, and Gemini Pro 1.5. Features advanced reasoning controls (Thinking/Over-Thinking modes), service mode switching (Standard/Dev/Education), and a polished dark-mode interface.

## Project Structure
```
├── client/                 # React frontend
│   └── src/
│       ├── components/     # UI components
│       │   ├── chat-input.tsx        # Message input with thinking controls
│       │   ├── chat-messages.tsx     # Message display with streaming
│       │   ├── chat-sidebar.tsx      # Conversation history sidebar
│       │   ├── model-selector.tsx    # AI model dropdown
│       │   ├── service-mode-switcher.tsx  # Mode toggle (Chat/Code/Learn)
│       │   ├── theme-provider.tsx    # Dark/light theme context
│       │   ├── theme-toggle.tsx      # Theme switch button
│       │   └── thinking-controls.tsx # Reasoning depth toggles
│       ├── lib/
│       │   ├── store.ts              # Zustand state management
│       │   └── queryClient.ts        # React Query setup
│       ├── pages/
│       │   └── chat.tsx              # Main chat page
│       └── App.tsx                   # Root component with layout
├── server/                 # Express backend
│   ├── ai-orchestrator.ts  # AI model routing service
│   ├── routes.ts           # API endpoints
│   └── index.ts            # Server entry
└── shared/
    └── schema.ts           # TypeScript types and Zod schemas
```

## Key Features
1. **Multi-Model Support**: GPT-4o, Claude 3.5 Sonnet, Gemini Pro 1.5
2. **Service Modes**: Standard Chat, Dev/Coder, Education/Tutor
3. **Reasoning Controls**: Thinking (standard) and Over-Thinking (deep analysis)
4. **Conversation Management**: Create, switch, delete conversations
5. **Theme Support**: Dark and light modes with persistence

## Environment Variables
- `OPENAI_API_KEY` - For GPT-4o access
- `ANTHROPIC_API_KEY` - For Claude 3.5 Sonnet access
- `GEMINI_API_KEY` - For Gemini Pro 1.5 access

**Note**: Without API keys, the app uses intelligent mock responses.

## Development
```bash
npm run dev  # Start development server
```

The app runs on port 5000 with hot reload.

## API Endpoints
- `POST /api/chat` - Send message to AI (requires model, mode, reasoningLevel)
- `GET /api/health` - Check server status and API key availability

## State Management
Using Zustand with persistence to localStorage:
- Selected model, service mode, reasoning level
- Conversation history
- UI state (sidebar open/closed)

## Recent Changes
- Initial MVP implementation with full UI and mock AI responses
- Dark theme as default with theme toggle
- Streaming text simulation for responses
- Code block formatting with copy functionality
