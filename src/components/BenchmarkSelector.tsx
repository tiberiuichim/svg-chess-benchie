import { BenchmarkSummary } from '../types';

interface BenchmarkSelectorProps {
  benchmarks: BenchmarkSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const typeLabels: Record<string, string> = {
  svg: 'SVG',
  text: 'Text',
  code: 'Code',
  image: 'Image',
};

export function BenchmarkSelector({ benchmarks, selectedId, onSelect }: BenchmarkSelectorProps) {
  if (benchmarks.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 uppercase tracking-wider">Benchmark</span>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
        className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 border border-gray-700 text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
      >
        {benchmarks.map((b) => (
          <option key={b.id} value={b.id}>
            {b.title}
          </option>
        ))}
      </select>
      {selectedId && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 uppercase">
          {typeLabels[benchmarks.find((b) => b.id === selectedId)?.type ?? ''] ?? 'Unknown'}
        </span>
      )}
    </div>
  );
}
