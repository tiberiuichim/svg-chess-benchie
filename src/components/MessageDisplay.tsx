import { SVGRenderer } from './SVGRenderer';

interface MessageDisplayProps {
  userPrompt: string | null;
  assistantText: string;
  isStreaming: boolean;
}

export function MessageDisplay({ userPrompt, assistantText, isStreaming }: MessageDisplayProps) {
  if (!userPrompt && !assistantText) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-500">
        <svg className="w-16 h-16 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.75L12.25 5.75M12.25 5.75C11.096 4.596 9.246 4.596 8.092 5.75L7.25 6.592M12.25 5.75L13.108 4.892C14.262 3.738 16.112 3.738 17.266 4.892L18.108 5.734C19.262 6.888 19.262 8.738 18.108 9.892L17.25 10.75M12.25 5.75V12.25M8.092 5.75L7.25 6.592C6.096 7.746 6.096 9.596 7.25 10.75L8.092 11.592M7.25 10.75V17.25C7.25 18.947 8.564 20.25 10.25 20.25H13.75C15.436 20.25 16.75 18.947 16.75 17.25V10.75M7.25 10.75L6.5 11.5C5.47 12.53 4.5 13.77 4.5 15.25V15.5C4.5 16.052 4.948 16.5 5.5 16.5H8V14C8 13.448 8.448 13 9 13H11.5" />
        </svg>
        <p className="text-lg font-medium">No output yet</p>
        <p className="text-sm mt-1">Enter a prompt above to generate an SVG</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {userPrompt && (
        <div className="flex justify-end">
          <div className="max-w-2xl px-4 py-3 rounded-2xl rounded-br-sm bg-violet-600 text-white">
            <p className="text-sm whitespace-pre-wrap">{userPrompt}</p>
          </div>
        </div>
      )}

      {assistantText && (
        <div className="flex justify-start">
          <div className="max-w-3xl w-full space-y-2">
            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-gray-800 border border-gray-700">
              {/* Show raw text only if no SVG is embedded */}
              {!assistantText.includes('<svg') && !assistantText.match(/```(?:xml|svg)/) && (
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
                  {assistantText}
                </pre>
              )}
              {/* Show text + SVG if SVG is present */}
              {assistantText.includes('<svg') && (
                <>
                  <pre className="text-sm text-gray-400 whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {assistantText}
                  </pre>
                  <SVGRenderer text={assistantText} />
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isStreaming && !assistantText && (
        <div className="flex justify-start">
          <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-gray-800 border border-gray-700">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
