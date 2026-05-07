interface MessageDisplayProps {
  userPrompt: string | null;
  assistantText: string;
  isStreaming: boolean;
  elapsedMs: number | null;
  compact?: boolean;
}

export function MessageDisplay({ userPrompt, assistantText, isStreaming, compact }: MessageDisplayProps) {
  if (!userPrompt && !assistantText && !isStreaming) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p className="text-sm">Waiting for input…</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {userPrompt && (
        <div className="flex justify-end">
          <div className="max-w-full px-3 py-2 rounded-xl rounded-br-sm bg-violet-600/90 text-white text-sm">
            <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed">{userPrompt}</p>
          </div>
        </div>
      )}

      {assistantText && (
        <div className="flex justify-start">
          <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-w-full overflow-x-auto">
            {assistantText}
          </pre>
        </div>
      )}

      {compact && assistantText && (
        <div className="text-[10px] text-gray-600">
          {assistantText.length} chars · {assistantText.split('\n').length} lines
        </div>
      )}

      {isStreaming && !assistantText && (
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Generating…
        </div>
      )}
    </div>
  );
}
