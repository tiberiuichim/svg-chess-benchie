# Multiple Benchmarks — Spec

## Motivation

The app currently supports a single benchmark (SVG chess board) with a hardcoded prompt in `prompts/default.txt` and a fixed reference image (`/original.webp`). We want to support **multiple benchmarks**, each with its own prompt, expected answer format, and optional reference material.

Examples of benchmark types:
- **SVG generation** (current): prompt → SVG rendered inline, reference image on the right
- **Text-only QA**: prompt → text answer, expected answer shown on the right for comparison
- **Code generation**: prompt → code output, reference solution on the right
- **Image comparison**: prompt → generated image, reference image on the right

## Core Idea: Markdown Benchmark Files with Frontmatter

Each benchmark is stored as a `.md` file inside `benchmarks/`. The file contains:

1. **YAML frontmatter** — metadata describing the benchmark (title, type, expected answer)
2. **Markdown body** — the actual prompt sent to the LLM

### Directory Structure

```
benchmarks/
├── svg-chess-board.md
├── math-word-problem.md
├── code-challenge.md
└── ...
```

### Frontmatter Schema

```yaml
---
title: "SVG Chess Board"
type: "svg"                          # "svg" | "text" | "code" | "image"
description: "Render a chess position from PGN notation as SVG"
expected: |
  The LLM should output valid SVG code showing a chess board with
  the correct piece positions. The last move should be highlighted.
reference: "/benchmarks/svg-chess-board/original.webp"
---
```

**Fields:**

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `title` | Yes | `string` | Display name shown in the benchmark selector |
| `type` | Yes | `string` | One of `svg`, `text`, `code`, `image`. Controls how the response is rendered and what parser is used |
| `description` | No | `string` | Short description shown as a subtitle |
| `expected` | No | `string` | The expected answer or evaluation criteria. Rendered in the right panel |
| `reference` | No | `string` | Path to a reference asset (image, file) relative to `public/`. Shown alongside `expected` |
| `system_hint` | No | `string` | Extra instruction appended to the user message (e.g. "Output only valid SVG code..."). If omitted, defaults based on `type` |

### Benchmark File Example

**`benchmarks/math-word-problem.md`**:

```markdown
---
title: "Apple Sales Math Problem"
type: "text"
description: "Multi-step arithmetic word problem"
expected: "100"
---

Mike grew up as one of 6 siblings and has 3 sisters. He has $25 and bought 5 boxes of apples for his organic apples business. To support him, his siblings also gifted some apples, with each of his brothers giving him 4 boxes and his sisters 2 boxes each. One of the brothers bought the cheap apples for Mike which were not organic, so Mike can't sell them and returned them. In his first week, Mike sold all boxes of apples and using all the money he earned from that bought twice the amount of apples for the second week. How much money would Mike earn in the second week if he was able to sell all of them?
```

**`benchmarks/svg-chess-board.md`** (migrated from current `prompts/default.txt`):

```markdown
---
title: "SVG Chess Board"
type: "svg"
description: "Render a chess position from PGN as SVG"
expected: |
  Valid SVG showing the chess board after move 7.h4.
  The last move (h4) should be highlighted.
reference: "/original.webp"
---

Given this PGN string of a chess game:

1. b3 e5 2. Nf3 h5 3. d4 exd4 4. Nxd4 Nf6 5. f4 Ke7 6. Qd3 d5 7. h4 *

Figure out the current state of the chessboard, create an image in SVG code, also highlight the last move.
```

## Changes Required

### 1. Backend — `server/index.ts`

#### New endpoint: `GET /api/benchmarks`

- Scans the `benchmarks/` directory for `.md` files
- Parses frontmatter from each file (use a lightweight YAML parser — `yaml` package, or a simple regex-based extractor if we want to avoid dependencies)
- Returns a JSON array of benchmark summaries:

```json
[
  {
    "id": "svg-chess-board",
    "title": "SVG Chess Board",
    "type": "svg",
    "description": "Render a chess position from PGN as SVG"
  },
  {
    "id": "math-word-problem",
    "title": "Apple Sales Math Problem",
    "type": "text",
    "description": "Multi-step arithmetic word problem"
  }
]
```

The `id` is derived from the filename (without `.md` extension).

#### New endpoint: `GET /api/benchmarks/:id`

- Returns the full benchmark data:

```json
{
  "id": "math-word-problem",
  "title": "Apple Sales Math Problem",
  "type": "text",
  "description": "Multi-step arithmetic word problem",
  "expected": "100",
  "reference": null,
  "system_hint": null,
  "prompt": "Mike grew up as one of 6 siblings..."
}
```

The `prompt` field is the markdown body with frontmatter stripped.

#### Update `POST /api/generate`

- The endpoint already accepts `{ prompt, model }`. No structural change needed here.
- The frontend will send the prompt extracted from the selected benchmark file.

### 2. Frontend — Benchmark Selector

Add a benchmark selector dropdown (or tab bar) near the model selector in the header. On selection change:

1. Fetch the benchmark data via `GET /api/benchmarks/:id`
2. Populate the textarea with the benchmark's prompt
3. Update the right panel to show the expected answer / reference
4. Adjust the response rendering based on `type`

### 3. Frontend — `App.tsx`

#### New state

```ts
const [benchmarks, setBenchmarks] = useState<BenchmarkSummary[]>([]);
const [selectedBenchmark, setSelectedBenchmark] = useState<BenchmarkDetail | null>(null);
```

#### On mount

- Fetch `/api/benchmarks` to populate the list
- Auto-select the first benchmark (or a default one)
- Fetch the selected benchmark's full data

#### On benchmark change

- Fetch full data for the new benchmark
- Update the textarea prompt
- Clear previous response

#### Right panel

Replace the hardcoded `<img src="/original.webp">` with a dynamic panel that renders based on `selectedBenchmark`:

- **`type: "svg"`**: Show the `expected` text + optional reference image
- **`type: "text"`**: Show the `expected` answer clearly (e.g., highlighted text block)
- **`type: "code"`**: Show the `expected` code in a syntax-highlighted block
- **`type: "image"`**: Show the `expected` description + reference image

### 4. Frontend — Response Rendering

The current `App.tsx` extracts SVG from the response with a regex. This logic should be driven by the benchmark `type`:

| Type | Parser | Rendering |
|------|--------|-----------|
| `svg` | Extract from ````xml`/```svg` fences | `dangerouslySetInnerHTML` (current behavior) |
| `text` | Raw text | `<pre>` or `<p>` with whitespace preserved |
| `code` | Extract from code fences | `<pre><code>` block |
| `image` | Extract image URL or base64 | `<img>` tag |

The existing SVG extraction logic in `App.tsx` becomes one branch of a type-driven renderer.

### 5. Frontend — New Component: `BenchmarkSelector.tsx`

A dropdown or horizontal tab bar showing available benchmarks:

```tsx
interface BenchmarkSelectorProps {
  benchmarks: BenchmarkSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}
```

Place it in the header next to the model selector.

### 6. Frontend — New Component: `ExpectedAnswerPanel.tsx`

Replaces the hardcoded "Original" panel. Renders the right side based on benchmark metadata:

```tsx
interface ExpectedAnswerPanelProps {
  benchmark: BenchmarkDetail | null;
}
```

- Shows `expected` content (text, code, image)
- Shows `reference` asset if present
- Shows a label like "Expected Answer" or "Reference" based on context

### 7. Frontend — `PromptForm.tsx`

- When a benchmark is selected, the textarea is pre-filled and can still be edited
- Add a "Reload benchmark" button (replaces "Reset to default") that re-loads the prompt from the selected benchmark
- The label could change contextually: "System Prompt" → "Benchmark Prompt"

### 8. Migration — `prompts/default.txt` → `benchmarks/svg-chess-board.md`

1. Move the existing chess prompt into `benchmarks/svg-chess-board.md` with proper frontmatter
2. Keep `prompts/default.txt` as a symlink or remove it (backend no longer needs it)
3. The `/prompts/` static route can be removed from the backend

### 9. Dependencies

- Add `yaml` package (or `js-yaml`) for parsing frontmatter on the backend. This is a well-maintained, lightweight dependency.
- Alternative: write a simple frontmatter parser with regex (split on `---` markers, parse minimal YAML manually). This avoids the dependency but is more fragile.

**Recommendation**: Use the `yaml` npm package. It's the same one used by many markdown tools and handles edge cases properly.

## File Structure After Changes

```
├── benchmarks/
│   ├── svg-chess-board.md
│   └── math-word-problem.md
├── server/
│   ├── index.ts
│   └── benchmarks.ts          # New: benchmark loading/parsing logic
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── PromptForm.tsx
│   │   ├── MessageDisplay.tsx
│   │   ├── SVGRenderer.tsx
│   │   ├── ModelSelector.tsx
│   │   ├── BenchmarkSelector.tsx    # New
│   │   └── ExpectedAnswerPanel.tsx  # New
│   └── types.ts               # New: shared TypeScript interfaces
└── specs/
    └── multiple-benchies.md   # This file
```

## Implementation Order

1. **Backend — benchmark loading**: Create `server/benchmarks.ts` with frontmatter parsing and directory scanning. Add `GET /api/benchmarks` and `GET /api/benchmarks/:id` endpoints.
2. **Types**: Define `BenchmarkSummary` and `BenchmarkDetail` interfaces in `src/types.ts`.
3. **BenchmarkSelector component**: Dropdown to switch between benchmarks.
4. **ExpectedAnswerPanel component**: Dynamic right panel.
5. **App.tsx integration**: Wire benchmark selection to prompt loading, response rendering, and right panel.
6. **PromptForm update**: Rename "Reset to default" → "Reload benchmark".
7. **Migrate existing benchmark**: Move `prompts/default.txt` content to `benchmarks/svg-chess-board.md`.
8. **Cleanup**: Remove `prompts/` directory and static route if no longer needed.

## Edge Cases & Considerations

- **No benchmarks found**: Show a friendly message in the selector, disable generate button
- **Invalid frontmatter**: Log a warning on the server, skip the file, don't crash
- **Concurrent benchmark switches during generation**: Abort the in-flight request (already handled by `AbortController`)
- **Large expected answers**: The right panel should be scrollable
- **Reference assets**: Store alongside benchmark files in subdirectories (e.g., `benchmarks/svg-chess-board/original.webp`) and serve via a static route, or reference them as paths under `public/`
