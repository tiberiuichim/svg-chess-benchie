import { useState, useEffect, useRef } from 'react';
import { PromptForm } from './components/PromptForm';
import { MessageDisplay } from './components/MessageDisplay';
import { ModelSelector } from './components/ModelSelector';
import { SVGRenderer } from './components/SVGRenderer';

export default function App() {
  const [userPrompt, setUserPrompt] = useState<string | null>(null);
  const [assistantText, setAssistantText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetch('/api/models')
      .then((r) => r.json())
      .then((data: { models: string[] }) => {
        if (data.models.length > 0) {
          setModels(data.models);
          setSelectedModel(data.models[0]);
        }
      })
      .catch(() => console.warn('Could not fetch models list'));

    fetch('/prompts/default.txt')
      .then((r) => r.text())
      .then((text) => setDefaultPrompt(text))
      .catch(() => {});
  }, []);

  const handleSend = async (prompt: string) => {
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setUserPrompt(prompt);
    setAssistantText('');
    setElapsedMs(null);
    setIsLoading(true);

    const startTime = performance.now();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model: selectedModel }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.status.toString() }));
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const data = await response.json() as { text: string };
      setAssistantText(data.text);
      setElapsedMs(Math.round(performance.now() - startTime));
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error:', err);
      setAssistantText((prev) => prev + `\n\n[Error: ${err.message}]`);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const handleReset = () => {
    if (abortRef.current) abortRef.current.abort();
    setUserPrompt(null);
    setAssistantText('');
    setElapsedMs(null);
  };

  // Extract SVG from the assistant text
  const svgCode = (() => {
    if (!assistantText) return null;
    const match = assistantText.match(/```(?:xml|svg)?\s*([\s\S]*?)```/);
    if (match && match[1] && match[1].trim().includes('<svg')) return match[1].trim();
    if (assistantText.trim().startsWith('<svg')) return assistantText.trim();
    return null;
  })();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm">
              SVG
            </div>
            <h1 className="text-lg font-semibold text-gray-100">SVG Chess Benchie</h1>
          </div>

          <div className="flex items-center gap-3">
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onChange={setSelectedModel}
            />
            {(userPrompt || assistantText) && (
              <button
                onClick={handleReset}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition disabled:opacity-40"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main — two columns */}
      <main className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">

          {/* LEFT: Prompt + Response text */}
          <div className="flex flex-col gap-4 min-h-[500px]">
            <PromptForm
              onSend={handleSend}
              isLoading={isLoading}
              defaultPrompt={defaultPrompt}
            />

            {/* Response area */}
            <div className="flex-1 min-h-[300px] rounded-xl bg-gray-900 border border-gray-800 flex flex-col">
              <div className="px-4 py-2 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
                LLM Response
              </div>
              <div className="flex-1 overflow-auto p-4">
                <MessageDisplay
                  userPrompt={userPrompt}
                  assistantText={assistantText}
                  isStreaming={isLoading}
                  elapsedMs={elapsedMs}
                  compact
                />
              </div>
            </div>
          </div>

          {/* RIGHT: SVG rendering */}
          <div className="flex flex-col gap-4 min-h-[500px]">
            <div className="flex-1 rounded-xl bg-gray-900 border border-gray-800 flex flex-col">
              <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SVG Output
                </span>
                {elapsedMs !== null && (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span>{elapsedMs < 1000 ? `${elapsedMs}ms` : `${(elapsedMs / 1000).toFixed(1)}s`}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                {isLoading && !svgCode && (
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <svg className="animate-spin h-8 w-8 text-violet-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm">Generating…</span>
                  </div>
                )}

                {!isLoading && svgCode && (
                  <div className="w-full flex items-center justify-center">
                    <div
                      className="max-w-full"
                      dangerouslySetInnerHTML={{ __html: svgCode }}
                    />
                  </div>
                )}

                {!isLoading && !svgCode && assistantText && (
                  <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono max-h-full overflow-auto">
                    {assistantText}
                  </pre>
                )}

                {!isLoading && !assistantText && (
                  <div className="flex flex-col items-center gap-3 text-gray-600">
                    <img src="/original.webp" alt="Reference chess board" className="max-h-64 rounded-lg border border-gray-800 opacity-60" />
                    <span className="text-xs mt-2">Generated SVG will appear here</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-3 text-center text-xs text-gray-600">
        Powered by Vercel AI SDK + your local LLM
      </footer>
    </div>
  );
}
