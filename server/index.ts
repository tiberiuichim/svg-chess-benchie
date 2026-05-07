import express from 'express';
import cors from 'cors';
import { streamText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

const app = express();
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const LLM_BASE_URL = process.env.LLM_BASE_URL || 'http://localhost:11434/v1';
const LLM_MODEL = process.env.LLM_MODEL || 'llama3';

const provider = createOpenAICompatible({
  baseURL: LLM_BASE_URL,
  name: 'local-llm',
});

app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body as { prompt: string };

  if (!prompt || !prompt.trim()) {
    res.status(400).json({ error: 'Prompt is required' });
    return;
  }

  const result = streamText({
    model: provider.languageModel(LLM_MODEL) as any,
    system: prompt,
    prompt: 'Generate an SVG image based on the system instructions. Output only valid SVG code wrapped in ```xml and ``` code fences.',
  });

  return result.toUIMessageStreamResponse();
});

const PORT = parseInt(process.env.PORT || '3000');
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`LLM endpoint: ${LLM_BASE_URL}`);
  console.log(`LLM model: ${LLM_MODEL}`);
});
