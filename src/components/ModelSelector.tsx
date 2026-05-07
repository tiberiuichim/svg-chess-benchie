interface ModelSelectorProps {
  models: string[];
  selectedModel: string;
  onChange: (model: string) => void;
}

export function ModelSelector({ models, selectedModel, onChange }: ModelSelectorProps) {
  if (models.length === 0) return null;

  return (
    <select
      value={selectedModel}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 border border-gray-700 text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
    >
      {models.map((model) => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  );
}
