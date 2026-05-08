import type { BenchmarkDetail } from '../types';

interface ExpectedAnswerPanelProps {
  benchmark: BenchmarkDetail | null;
}

export function ExpectedAnswerPanel({ benchmark }: ExpectedAnswerPanelProps) {
  if (!benchmark) {
    return (
      <div className="flex-1 rounded-xl bg-gray-900 border border-gray-800 flex flex-col">
        <div className="px-4 py-2 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
          Reference
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-600 text-sm">
          Select a benchmark to see the expected answer
        </div>
      </div>
    );
  }

  const label = benchmark.type === 'svg' || benchmark.type === 'image' ? 'Reference' : 'Expected Answer';

  return (
    <div className="flex-1 rounded-xl bg-gray-900 border border-gray-800 flex flex-col">
      <div className="px-4 py-2 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
        {label}
      </div>
      <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
        {/* Expected answer text */}
        {benchmark.expected && (
          <div>
            <p className="text-xs text-gray-500 mb-1">Expected</p>
            {benchmark.type === 'code' ? (
              <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono bg-gray-800 rounded-lg p-3 border border-gray-700">
                {benchmark.expected}
              </pre>
            ) : (
              <div className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {benchmark.expected}
              </div>
            )}
          </div>
        )}

        {/* Reference asset */}
        {benchmark.reference && (benchmark.type === 'svg' || benchmark.type === 'image') && (
          <div className="flex flex-col items-center">
            <p className="text-xs text-gray-500 mb-2 self-start">Reference Image</p>
            <img
              src={benchmark.reference}
              alt="Reference"
              className="max-w-full max-h-[400px] rounded-lg object-contain"
            />
          </div>
        )}

        {benchmark.reference && benchmark.type === 'text' && (
          <div className="flex flex-col items-center">
            <p className="text-xs text-gray-500 mb-2 self-start">Reference</p>
            <a
              href={benchmark.reference}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-violet-400 hover:text-violet-300 underline"
            >
              {benchmark.reference}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
