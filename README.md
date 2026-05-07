# SVG Chess Benchie

A web app that turns a natural-language prompt into an SVG chessboard image via a local LLM.

You write a system prompt (e.g. a PGN game with instructions to render it), the app sends it to your local LLM server, and the resulting SVG is rendered inline.

Inspired by this [reddit post](https://www.reddit.com/r/LocalLLaMA/comments/1t53dhp/quality_comparison_between_qwen_36_27b/)

## Requirements

- Node.js 18+
- A local LLM server with an OpenAI-compatible API (e.g. llama.cpp, Ollama, LM Studio)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` to point at your LLM server:

```env
LLM_BASE_URL=http://localhost:4000/v1
LLM_MODEL=
```

Leave `LLM_MODEL` empty to auto-select the loaded model, or set it to a specific model name.

## Running

```bash
npm run dev
```

This starts both the Express backend (port 3100) and the Vite frontend (port 5173) concurrently. Open http://localhost:5173.

## How It Works

1. The textarea is pre-filled with the default prompt from `prompts/default.txt` — edit it to your liking.
2. Click **Generate SVG** — the entire textarea content is sent as the **system prompt** to the LLM.
3. The backend uses the Vercel AI SDK (`generateText` via `@ai-sdk/openai-compatible`) to call your local LLM.
4. The response is parsed for SVG code (in ````xml` or ```svg```` code fences) and rendered inline.

## Project Structure

```
├── prompts/
│   └── default.txt        # Default system prompt (edit freely)
├── server/
│   └── index.ts           # Express backend (port 3100)
├── src/
│   ├── App.tsx            # Main app component
│   ├── components/
│   │   ├── PromptForm.tsx         # Textarea + send button
│   │   ├── MessageDisplay.tsx     # Chat-style message bubbles
│   │   ├── SVGRenderer.tsx        # Extracts & renders SVG from response
│   │   └── ModelSelector.tsx      # Model dropdown from /api/models
│   └── index.css          # Tailwind directives
├── .env                   # LLM server config (gitignored)
├── .env.example           # Template
├── vite.config.ts         # Vite + proxy to backend
└── plan.md                # Detailed design plan
```

## Configurable Ports

- Frontend: set via Vite's `server.port` in `vite.config.ts` (default 5173)
- Backend: set via `PORT` env var (default 3100)
- LLM server: set via `LLM_BASE_URL` in `.env`
