import express from 'express';
import cors from 'cors';
import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import path from 'node:path';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

// Serve static prompt files
app.use('/prompts', express.static(path.resolve(import.meta.dirname, '..', 'prompts')));

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://localhost:4000/v1';
const LLM_MODEL = process.env.LLM_MODEL || '';

const provider = createOpenAICompatible({
  baseURL: LLM_BASE_URL,
  name: 'local-llm',
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

// ── POST /api/generate ──
app.post('/api/generate', async (req, res) => {
  const { prompt, model } = req.body as { prompt?: string; model?: string };

  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  const modelName = model || LLM_MODEL;

  try {
    const result = await generateText({
      model: provider.languageModel(modelName) as any,
      system: prompt,
      prompt:
        'Generate an SVG image based on the system instructions. Output only valid SVG code wrapped in ```xml and ``` code fences.',
    });

    res.json({ text: result.text });
  } catch (error: any) {
    console.error('LLM error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = parseInt(process.env.PORT || '3100');
app.listen(PORT, async () => {
  const models = await fetchModels();
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LLM endpoint: ${LLM_BASE_URL}`);
  console.log(`Default model: ${LLM_MODEL || '(auto-select from server)'}`);
  console.log(`Available models:`, models.join(', ') || '(none detected)');
});
