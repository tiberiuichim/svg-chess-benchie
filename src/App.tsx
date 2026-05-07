import { useState, useEffect, useRef } from 'react';
import { PromptForm } from './components/PromptForm';
import { MessageDisplay } from './components/MessageDisplay';
import { ModelSelector } from './components/ModelSelector';

export default function App() {
  const [userPrompt, setUserPrompt] = useState<string | null>(null);
  const [assistantText, setAssistantText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Fetch available models and default prompt on mount
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
    setIsLoading(true);

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
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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

      {/* Main */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        <PromptForm
          onSend={handleSend}
          isLoading={isLoading}
          defaultPrompt={defaultPrompt}
        />
        <MessageDisplay
          userPrompt={userPrompt}
          assistantText={assistantText}
          isStreaming={isLoading}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-3 text-center text-xs text-gray-600">
        Powered by Vercel AI SDK + your local LLM
      </footer>
    </div>
  );
}
