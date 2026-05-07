import { useState, useRef } from 'react';
import { PromptForm } from './components/PromptForm';
import { MessageDisplay } from './components/MessageDisplay';

export default function App() {
  const [userPrompt, setUserPrompt] = useState<string | null>(null);
  const [assistantText, setAssistantText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const handleSend = async (prompt: string) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setUserPrompt(prompt);
    setAssistantText('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events — extract text-delta parts
        // The AI SDK sends events like: event: 0\ndata: {"type":"text-delta","text":"..."}
        // We look for text-delta events and extract the text field
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // keep incomplete last line

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            const data = trimmed.slice(5).trim();
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'text-delta' && parsed.text) {
                setAssistantText((prev) => prev + parsed.text);
              }
            } catch {
              // ignore non-JSON data lines
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Error:', err);
      setAssistantText(prev => prev + `\n\n[Error: ${err.message}]`);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-sm">
            SVG
          </div>
          <h1 className="text-lg font-semibold text-gray-100">SVG Chess Benchie</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 space-y-6">
        <PromptForm onSend={handleSend} isLoading={isLoading} />
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
