interface SVGRendererProps {
  text: string;
}

/**
 * Extracts SVG code from markdown code blocks (```xml or ```svg) and renders it.
 */
export function SVGRenderer({ text }: SVGRendererProps) {
  // Try to extract SVG from markdown code fences
  const codeBlockMatch = text.match(/```(?:xml|svg)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    const svgCode = codeBlockMatch[1].trim();
    if (svgCode.includes('<svg')) {
      return (
        <div className="mt-4 rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
          <div
            className="w-full flex items-center justify-center p-4"
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />
        </div>
      );
    }
  }

  // If no code fences, check if the whole text is an SVG
  if (text.trim().startsWith('<svg')) {
    return (
      <div className="mt-4 rounded-xl overflow-hidden border border-gray-700 bg-gray-900">
        <div
          className="w-full flex items-center justify-center p-4"
          dangerouslySetInnerHTML={{ __html: text.trim() }}
        />
      </div>
    );
  }

  // No SVG found — return null
  return null;
}
