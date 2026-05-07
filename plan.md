# SVG Chess Benchie — Plan & Status

## Overview

A simple Vite + React web app where users edit a system prompt in a textarea, hit a button, and receive an LLM response that contains an SVG picture. The app renders the SVG inline. The user's full textarea content is sent as the **system prompt** to the LLM — no hardcoded system prompt.

## Architecture

```
┌─────────────────────┐     POST /api/generate (JSON)     ┌─────────────────────┐
│  Vite + React SPA   │◄──────────────────────────────────►│  Express Server      │
│  (port 5173)        │         JSON response              │  (port 3100)         │
│  - Textarea prompt   │                                    │                    │
│  - Direct fetch       │                                    │  generateText()      │
│  - SVG rendering    │                                    │  via @ai-sdk         │
│  - Tailwind styling │                                    │                    │
│  - Model selector    │                                    │  createOpenAICompatible│
│                     │                                    │  → local LLM (4000)   │
└─────────────────────┘                                    └─────────────────────┘
```

## Tech Stack (Implemented ✓)

- **Build tool**: Vite 8 + React 19 + TypeScript
- **Styling**: Tailwind CSS v3
- **LLM SDK**: `ai` v5 (`generateText`) + `@ai-sdk/openai-compatible` v1
- **Backend**: Express 5
- **Local LLM**: llama.cpp server on `http://localhost:4000/v1` (OpenAI-compatible)
- **Process runner**: `tsx` for TypeScript server, `concurrently` to run both

## What Was Implemented

### Backend (`server/index.ts`)
- Express server on port 3100 (configurable via `PORT` env var)
- `POST /api/generate` — accepts `{ prompt, model }`, calls `generateText()` via `@ai-sdk/openai-compatible`, returns `{ text }` JSON
- `GET /api/models` — fetches available models from the LLM server's `/v1/models` endpoint
- Serves static prompt files from `prompts/` directory at `/prompts/*`
- CORS enabled for `localhost:5173`

### Frontend (`src/`)
- **`App.tsx`** — Orchestrates everything. Fetches models list and default prompt on mount. Sends POST to `/api/generate` with direct fetch (no `useChat` hook needed since we don't do multi-turn chat).
- **`components/PromptForm.tsx`** — Textarea pre-filled with default prompt. "Reset to default" button. "Generate SVG" button with loading spinner.
- **`components/MessageDisplay.tsx`** — Shows user prompt (right-aligned purple bubble) and assistant response (left-aligned dark bubble). Loading spinner while generating. Renders extracted SVG inline.
- **`components/SVGRenderer.tsx`** — Extracts SVG from markdown code fences (````xml` or ```svg```) or bare SVG. Renders via `dangerouslySetInnerHTML` in a responsive container.
- **`components/ModelSelector.tsx`** — Dropdown populated from `/api/models`. Lets user pick which model to use.

### Configuration
- **`.env`** — `LLM_BASE_URL=http://localhost:4000/v1`, `LLM_MODEL=` (empty = auto-select loaded model)
- **`prompts/default.txt`** — Default chess board prompt. Loaded into textarea on page load.
- **`vite.config.ts`** — Proxies `/api` and `/prompts` to Express on port 3100
- **`npm run dev`** — Runs both Vite (5173) and Express (3100) via `concurrently`

## Key Design Decisions

- **`generateText` (non-streaming) instead of `streamText`**: The `pipeUIMessageStreamToResponse` / `toUIMessageStreamResponse` from AI SDK v5 had compatibility issues with Express 5 (model version negotiation: v3 vs v2). Using `generateText` with JSON response avoids this entirely. For a single-prompt → SVG flow, non-streaming is fine.
- **Direct fetch instead of `@ai-sdk/react`**: Since we only have a single prompt/response (no chat history), the full `useChat` hook is overkill. A simple `fetch` + JSON parse is cleaner.
- **User-defined system prompt**: The entire textarea content is the system prompt. The user controls everything. The default prompt in `prompts/default.txt` is just a convenient starting point.
- **Model selector**: Models are fetched live from the LLM server at startup. If only one model is loaded (like `Qwen3.6-27B-MTP-IQ4_XS.gguf`), the dropdown still works.
- **Port 3100**: Port 3000 is occupied by another service. Configurable via `PORT` env var.

## Package Study

The Vercel AI SDK repo was cloned and studied:
- `packages/ai` — `streamText()`, `generateText()`, SSE streaming, `UIMessageStream`
- `packages/react` — `useChat()` hook, `Chat` transport
- `packages/openai-compatible` — `createOpenAICompatible()` for any OpenAI-compatible API

The v1 `@ai-sdk/openai-compatible` was chosen because it produces v2 models compatible with AI SDK v5 (v2 of the package produces v3 models which are incompatible).

## Future / Not Implemented

- Nothing major — the core flow is complete and tested against the real LLM server.
