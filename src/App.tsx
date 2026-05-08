import { useState, useEffect, useRef, useCallback } from 'react';
import { PromptForm } from './components/PromptForm';
import { MessageDisplay } from './components/MessageDisplay';
import { ModelSelector } from './components/ModelSelector';
import { BenchmarkSelector } from './components/BenchmarkSelector';
import { ExpectedAnswerPanel } from './components/ExpectedAnswerPanel';
import { BenchmarkSummary, BenchmarkDetail } from './types';

export default function App() {
  const [userPrompt, setUserPrompt] = useState<string | null>(null);
  const [assistantText, setAssistantText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [elapsedMs, setElapsedMs] = useState<number | null>(null);
  const [responseBytes, setResponseBytes] = useState<number | null>(null);
  const [benchmarks, setBenchmarks] = useState<BenchmarkSummary[]>([]);
  const [selectedBenchmarkId, setSelectedBenchmarkId] = useState<string | null>(null);
  const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkDetail | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Fetch models on mount
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
  }, []);

  // Fetch benchmarks on mount
  useEffect(() => {
    fetch('/api/benchmarks')
      .then((r) => r.json())
      .then((data: { benchmarks: BenchmarkSummary[] }) => {
        setBenchmarks(data.benchmarks);
        if (data.benchmarks.length > 0) {
          setSelectedBenchmarkId(data.benchmarks[0].id);
        }
      })
      .catch(() => console.warn('Could not fetch benchmarks list'));
  }, []);

  // Fetch selected benchmark detail when id changes
  useEffect(() => {
    if (!selectedBenchmarkId) return;
    fetch(`/api/benchmarks/${selectedBenchmarkId}`)
      .then((r) => {
        if (!r.ok) return null;
        return r.json() as Promise<BenchmarkDetail>;
      })
      .then((data) => {
        if (data) setSelectedBenchmark(data);
      })
      .catch(() => console.warn(`Could not fetch benchmark ${selectedBenchmarkId}`));
  }, [selectedBenchmarkId]);

  const handleBenchmarkSelect = useCallback((id: string) => {
    setSelectedBenchmarkId(id);
    // Clear previous response when switching benchmarks
    setAssistantText('');
    setUserPrompt(null);
    setElapsedMs(null);
    setResponseBytes(null);
  }, []);

  const handleReloadBenchmark = useCallback(() => {
    if (selectedBenchmarkId) {
      fetch(`/api/benchmarks/${selectedBenchmarkId}`)
        .then((r) => r.json() as Promise<BenchmarkDetail>)
        .then((data) => setSelectedBenchmark(data))
        .catch(() => console.warn(`Could not reload benchmark ${selectedBenchmarkId}`));
    }
  }, [selectedBenchmarkId]);

  const handleSend = async (prompt: string) => {
    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setUserPrompt(prompt);
    setAssistantText('');
    setElapsedMs(null);
    setResponseBytes(null);
    setIsLoading(true);

    const startTime = performance.now();

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          type: selectedBenchmark?.type,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.status.toString() }));
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const data = await response.json() as { text: string };
      setAssistantText(data.text);
      setElapsedMs(Math.round(performance.now() - startTime));
      setResponseBytes(new TextEncoder().encode(data.text).length);
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
    setResponseBytes(null);
  };

  // ── Type-driven response extraction ──
  const type = selectedBenchmark?.type ?? 'svg';

  const extractedSvg = (() => {
    if (type !== 'svg' || !assistantText) return null;
    const match = assistantText.match(/```(?:xml|svg)?\s*([\s\S]*?)```/);
    if (match && match[1] && match[1].trim().includes('<svg')) return match[1].trim();
    if (assistantText.trim().startsWith('<svg')) return assistantText.trim();
    return null;
  })();

  const extractedCode = (() => {
    if (type !== 'code' || !assistantText) return null;
    const match = assistantText.match(/```(?:\w*)?\s*([\s\S]*?)```/);
    return match?.[1]?.trim() ?? null;
  })();

  const extractedImage = (() => {
    if (type !== 'image' || !assistantText) return null;
    // Try base64 data URL
    const dataUriMatch = assistantText.match(/(data:image\/\w+;base64,[^\s]+)/);
    if (dataUriMatch) return dataUriMatch[1];
    // Try URL
    const urlMatch = assistantText.match(/(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg))/i);
    if (urlMatch) return urlMatch[1];
    return null;
  })();

  const extractedText = (() => {
    if (type !== 'text') return null;
    if (!assistantText) return null;
    // If wrapped in code fences, extract
    const match = assistantText.match(/```\s*([\s\S]*?)```/);
    if (match && match[1]) return match[1].trim();
    return assistantText.trim();
  })();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <h1 className="text-lg font-semibold text-gray-100">
              {selectedBenchmark?.title ?? 'SVG Chess Benchie'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <BenchmarkSelector
              benchmarks={benchmarks}
              selectedId={selectedBenchmarkId}
              onSelect={handleBenchmarkSelect}
            />
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

          {/* LEFT: Prompt + Generated output */}
          <div className="flex flex-col gap-4 min-h-[500px]">
            <PromptForm
              onSend={handleSend}
              isLoading={isLoading}
              benchmark={selectedBenchmark}
              onReload={handleReloadBenchmark}
            />

            {/* Response area */}
            <div className="flex-1 min-h-[300px] rounded-xl bg-gray-900 border border-gray-800 flex flex-col">
              <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Generated
                </span>
                {elapsedMs !== null && (
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                      <span>{elapsedMs < 1000 ? `${elapsedMs}ms` : `${(elapsedMs / 1000).toFixed(1)}s`}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                        <polyline points="13 2 13 9 20 9" />
                      </svg>
                      <span>{responseBytes !== null ? (responseBytes < 1024 ? `${responseBytes}B` : `${(responseBytes / 1024).toFixed(1)}KB`) : '—'}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
                {isLoading && !assistantText && (
                  <div className="flex flex-col items-center gap-3 text-gray-500">
                    <svg className="animate-spin h-8 w-8 text-violet-500" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-sm">Generating…</span>
                  </div>
                )}

                {/* SVG rendering */}
                {!isLoading && extractedSvg && (
                  <div className="w-full flex flex-col items-center gap-3">
                    <div
                      className="max-w-full"
                      dangerouslySetInnerHTML={{ __html: extractedSvg }}
                    />
                    <button
                      onClick={() => {
                        const blob = new Blob([extractedSvg], { type: 'image/svg+xml' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        const safeModel = selectedModel.replace(/[^\w.-]/g, '_');
                        const ts = new Date().toISOString().replace(/[\-:T.Z]/g, '').slice(0, 14);
                        a.href = url;
                        a.download = `svg-${safeModel}-${ts}.svg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 transition"
                    >
                      Save SVG
                    </button>
                  </div>
                )}

                {/* Code rendering */}
                {!isLoading && extractedCode && (
                  <pre className="w-full text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-800 rounded-lg p-4 border border-gray-700 overflow-x-auto">
                    {extractedCode}
                  </pre>
                )}

                {/* Image rendering */}
                {!isLoading && extractedImage && (
                  <img
                    src={extractedImage}
                    alt="Generated image"
                    className="max-w-full max-h-full rounded-lg object-contain"
                  />
                )}

                {/* Text rendering */}
                {!isLoading && extractedText && (
                  <div className="w-full text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {extractedText}
                  </div>
                )}

                {/* Fallback: raw text for any type */}
                {!isLoading && !extractedSvg && !extractedCode && !extractedImage && !extractedText && assistantText && (
                  <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono max-h-full overflow-auto">
                    {assistantText}
                  </pre>
                )}

                {!isLoading && !assistantText && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-600 text-sm">
                    Generated output will appear here
                  </div>
                )}
              </div>
            </div>

            {/* Raw text below */}
            {assistantText && (
              <div className="rounded-xl bg-gray-900 border border-gray-800">
                <MessageDisplay
                  userPrompt={userPrompt}
                  assistantText={assistantText}
                  isStreaming={false}
                  elapsedMs={null}
                  compact
                />
              </div>
            )}
          </div>

          {/* RIGHT: Dynamic expected answer / reference panel */}
          <div className="flex flex-col gap-4 min-h-[500px]">
            <ExpectedAnswerPanel benchmark={selectedBenchmark} />
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
