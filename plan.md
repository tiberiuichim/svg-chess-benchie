# SVG Prompt Generator — Plan

## Overview

A simple Vite + React web app where users type a text prompt into a textarea, hit a button, and receive a streamed LLM response that contains an SVG picture. The app renders the SVG inline.

## Architecture

```
┌─────────────────────┐     HTTP (POST /api/generate)     ┌─────────────────────┐
│  Vite + React SPA   │◄──────────────────────────────────►│  Node.js Backend    │
│  (port 5173)        │                                    │  (port 3000)         │
│  - Textarea prompt   │                                    │  Express server     │
│  - useChat hook     │                                    │                    │
│  - Streaming display │  ◄── SSE UI Message Stream ──────  │  streamText()      │
│  - SVG rendering    │                                    │  via @ai-sdk        │
│  - Tailwind styling │                                    │                    │
│                     │                                    │  createOpenAICompatible│
│                     │                                    │  → local LLM endpoint │
└─────────────────────┘                                    └─────────────────────┘
```

## Tech Stack

- **Build tool**: Vite 5+ (React + TypeScript template)
- **Framework**: React 18+
- **Styling**: Tailwind CSS v3+
- **LLM SDK**: `@ai-sdk/react` (useChat) + `ai` + `@ai-sdk/openai-compatible`
- **Backend**: Express.js
- **Local LLM**: OpenAI-compatible endpoint (e.g., Ollama, LM Studio, llama.cpp server)

## Package Study

Clone the Vercel AI SDK repo (`https://github.com/vercel/ai`) into a local `vercel-ai` directory for reference. Key packages studied:

- **`packages/ai`** — Core library. Key exports:
  - `streamText()` — streams text from a model, returns a `StreamTextResult` with `toUIMessageStreamResponse()` for HTTP streaming
  - `generateText()` — non-streaming one-shot generation
  - `DefaultChatTransport`, `Chat`, `UIMessage` — client-side chat primitives
  - `UIMessageStream` / SSE protocol for streaming responses

- **`packages/react`** — React hooks:
  - `useChat()` — the main hook. Takes an `api` URL (or `transport`). Provides `messages`, `sendMessage`, `status`, `error`.
  - The hook sends POST requests to the API endpoint with `{ messages }` body and parses SSE responses.

- **`packages/openai-compatible`** — Provider for any OpenAI-compatible API:
  - `createOpenAICompatible({ baseURL, name })` — creates a provider instance
  - Usage: `provider('any-model-id').languageModel(...)` or simply `provider('any-model-id')`

## Project Structure

```
benchies/
├── plan.md
├── vercel-ai/                    # cloned for reference (gitignored in final)
├── package.json                  # workspace root or just the app
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── server/
│   └── index.ts                  # Express server (port 3000)
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Main app component
│   ├── components/
│   │   ├── PromptForm.tsx        # Textarea + Send button
│   │   ├── MessageDisplay.tsx    # Renders LLM text + extracted SVG
│   │   └── SVGRenderer.tsx       # Parses & renders SVG from response
│   └── index.css                 # Tailwind directives
├── index.html
└── vite.config.ts                # dev proxy to backend
```

## Backend (`server/index.ts`)

1. Express app on port 3000
2. Single POST endpoint: `/api/generate`
3. Accepts `{ prompt: string }` in JSON body
4. Uses `createOpenAICompatible` to connect to local LLM (configurable via env vars: `LLM_BASE_URL`, `LLM_MODEL`)
5. Constructs a system prompt instructing the LLM to output an SVG image
6. Calls `streamText()` and pipes the result to the HTTP response via `toUIMessageStreamResponse()`
7. CORS enabled for the Vite dev server

System prompt template:
```
You are an SVG artist. Generate a beautiful SVG image based on the user's description.
Output ONLY valid SVG code, wrapped in ```xml and ``` markdown code fences.
The SVG should be self-contained, viewBox="0 0 800 600", and visually appealing.
```

## Frontend

### `App.tsx`
- Uses `useChat()` from `@ai-sdk/react` with `api: '/api/generate'`
- The textarea is controlled by local state (not part of messages)
- On submit, calls `sendMessage({ content: userPrompt })`
- Displays messages: user prompts and assistant responses
- Extracts SVG code blocks from assistant messages and renders them

### `PromptForm.tsx`
- A `<textarea>` with a placeholder like "Describe an image..."
- A "Generate" button that calls `sendMessage`
- Disabled while streaming (`status !== 'ready'`)
- Nice Tailwind styling: rounded corners, shadow, focus ring

### `MessageDisplay.tsx`
- Iterates over `messages` from `useChat`
- User messages: right-aligned bubble
- Assistant messages: left-aligned, shows text content + embedded SVG

### `SVGRenderer.tsx`
- Regex to extract SVG code from markdown code blocks (` ```xml ... ``` ` or ` ```svg ... ``` `)
- Uses `dangerouslySetInnerHTML` to render the SVG (safe since it's LLM-generated SVG)
- Wraps in a responsive container with max-width
- Shows loading skeleton while streaming

## Vite Configuration

- Dev server on port 5173
- Proxy `/api` to `http://localhost:3000` during development
- This way `useChat({ api: '/api/generate' })` works seamlessly in dev

## Environment Variables

```
LLM_BASE_URL=http://localhost:11434/v1   # or whatever local LLM endpoint
LLM_MODEL=llama3                         # model name
```

## Implementation Steps

1. **Study the AI SDK** — Clone and review `https://github.com/vercel/ai` (done ✓)
2. **Scaffold the project** — `npm create vite@latest . -- --template react-ts`, add Tailwind, Express
3. **Set up the backend** — Express server with `streamText` + `createOpenAICompatible`
4. **Set up the frontend** — `useChat` hook, `PromptForm`, `MessageDisplay`, `SVGRenderer`
5. **Wire it together** — Vite proxy, env vars, system prompt
6. **Style with Tailwind** — Clean, modern UI with animations
7. **Test end-to-end** — Verify streaming, SVG rendering, error handling

## Key Design Decisions

- **Backend streaming via SSE**: The AI SDK's `toUIMessageStreamResponse()` handles the SSE protocol automatically. The `useChat` hook on the client parses it.
- **System prompt approach**: Rather than trying to get structured output, we use a strong system prompt instructing the LLM to output SVG in markdown code fences, then parse client-side.
- **OpenAI-compatible provider**: This is the most flexible option — works with Ollama, LM Studio, llama.cpp, LiteLLM, etc. Just change the `baseURL`.
- **No Next.js**: Pure Vite + Express keeps it simple and avoids server-component complexities.
