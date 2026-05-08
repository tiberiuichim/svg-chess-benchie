import express from 'express';
import cors from 'cors';
import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { getBenchmarkSummaries, getBenchmarkById } from './benchmarks';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://localhost:4000/v1';
const LLM_MODEL = process.env.LLM_MODEL || '';

// 10-minute timeout for LLM calls — local models can be slow
const LONG_TIMEOUT_MS = 10 * 60 * 1000;

// Wrap global fetch with a generous timeout so long LLM generations don't abort
const longFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LONG_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const provider = createOpenAICompatible({
  baseURL: LLM_BASE_URL,
  name: 'local-llm',
  fetch: longFetch as any,
});

// ── Fetch available models from the provider ──
async function fetchModels(): Promise<string[]> {
  try {
    const res = await fetch(`${LLM_BASE_URL}/models`);
    const data = (await res.json()) as any;
    return data.data?.map((m: any) => m.id) ?? [];
  } catch {
    return [];
  }
}

// ── GET /api/models ──
app.get('/api/models', async (_req, res) => {
  const models = await fetchModels();
  res.json({ models });
});

// ── GET /api/benchmarks ──
app.get('/api/benchmarks', (_req, res) => {
  const summaries = getBenchmarkSummaries();
  res.json({ benchmarks: summaries });
});

// ── GET /api/benchmarks/:id ──
app.get('/api/benchmarks/:id', (req, res) => {
  const benchmark = getBenchmarkById(req.params.id);
  if (!benchmark) {
    res.status(404).json({ error: `Benchmark "${req.params.id}" not found` });
    return;
  }
  res.json(benchmark);
});

// ── POST /api/generate ──
app.post('/api/generate', async (req, res) => {
  const { prompt, model } = req.body as { prompt?: string; model?: string };

  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  const modelName = model || LLM_MODEL;

  const { system_hint } = req.body as { prompt?: string; model?: string; type?: string; system_hint?: string };

  try {
    const result = await generateText({
      model: provider.languageModel(modelName) as any,
      system: prompt,
      ...(system_hint ? { prompt: system_hint } : {}),
    });

    res.json({ text: result.text });
  } catch (error: any) {
    console.error('LLM error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = parseInt(process.env.PORT || '3100');

const server = app.listen(PORT, async () => {
  // Set very long timeouts on the HTTP server itself
  server.setTimeout(LONG_TIMEOUT_MS);
  (server as any).headersTimeout = LONG_TIMEOUT_MS;
  (server as any).requestTimeout = LONG_TIMEOUT_MS;

  const models = await fetchModels();
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LLM endpoint: ${LLM_BASE_URL}`);
  console.log(`Default model: ${LLM_MODEL || '(auto-select from server)'}`);
  console.log(`Available models:`, models.join(', ') || '(none detected)');
  console.log(`Request timeout: ${LONG_TIMEOUT_MS / 1000}s`);
});
