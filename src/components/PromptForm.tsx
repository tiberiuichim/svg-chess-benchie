import { useState, type FormEvent } from 'react';

interface PromptFormProps {
  onSend: (prompt: string) => void;
  isLoading: boolean;
}

export function PromptForm({ onSend, isLoading }: PromptFormProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    onSend(prompt.trim());
    setPrompt('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your system prompt for the LLM...&#10;&#10;Example: You are a chess engine. Render the starting position as an SVG. Output only valid SVG code wrapped in xml code fences."
        className="w-full h-40 px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition"
        disabled={isLoading}
      />
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium transition-all duration-200 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </>
          ) : (
            'Generate SVG'
          )}
        </button>
      </div>
    </form>
  );
}
