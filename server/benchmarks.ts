import fs from 'node:fs';
import path from 'node:path';

const BENCHMARKS_DIR = path.resolve(import.meta.dirname, '..', 'benchmarks');

export interface BenchmarkSummary {
  id: string;
  title: string;
  type: string;
  description: string | null;
}

export interface BenchmarkDetail {
  id: string;
  title: string;
  type: string;
  description: string | null;
  expected: string | null;
  reference: string | null;
  system_hint: string | null;
  prompt: string;
}

/**
 * Extract YAML frontmatter and body from a markdown file.
 * Uses a simple regex-based parser to avoid adding a dependency.
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlStr = match[1];
  const body = match[2];

  // Minimal YAML parser for flat key-value pairs (supports | block scalars)
  const result: Record<string, any> = {};
  const lines = yamlStr.split('\n');
  let currentKey: string | null = null;
  let currentLines: string[] = [];

  function flushKey() {
    if (currentKey) {
      const value = currentLines.join('\n').trimEnd();
      result[currentKey] = value === '' ? null : value;
      currentKey = null;
      currentLines = [];
    }
  }

  for (const line of lines) {
    // Skip empty lines between top-level keys
    if (line.trim() === '' && currentKey && currentLines.length > 0) {
      flushKey();
      continue;
    }

    const kvMatch = line.match(/^(\w[\w_]*):\s*(.*)/);
    if (kvMatch) {
      flushKey();
      const key = kvMatch[1];
      const rawValue = kvMatch[2].trim();

      if (rawValue === '|' || rawValue === '|>') {
        // Block scalar — collect following indented lines
        currentKey = key;
        currentLines = [];
      } else {
        // Simple scalar
        result[key] = rawValue;
      }
    } else if (currentKey) {
      // Continuation line for block scalar
      currentLines.push(line);
    }
  }
  flushKey();

  return { frontmatter: result, body };
}

/**
 * Scan the benchmarks directory and return a list of summaries.
 */
export function getBenchmarkSummaries(): BenchmarkSummary[] {
  if (!fs.existsSync(BENCHMARKS_DIR)) return [];

  const files = fs.readdirSync(BENCHMARKS_DIR).filter((f) => f.endsWith('.md'));
  const summaries: BenchmarkSummary[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(BENCHMARKS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const { frontmatter } = parseFrontmatter(content);

      if (!frontmatter.title || !frontmatter.type) {
        console.warn(`Benchmark ${file}: missing title or type in frontmatter, skipping`);
        continue;
      }

      summaries.push({
        id: file.replace(/\.md$/, ''),
        title: frontmatter.title,
        type: frontmatter.type,
        description: frontmatter.description ?? null,
      });
    } catch (err: any) {
      console.warn(`Failed to read benchmark ${file}:`, err.message);
    }
  }

  return summaries;
}

/**
 * Get full detail for a single benchmark by id.
 */
export function getBenchmarkById(id: string): BenchmarkDetail | null {
  const filePath = path.join(BENCHMARKS_DIR, `${id}.md`);
  if (!fs.existsSync(filePath)) return null;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { frontmatter, body } = parseFrontmatter(content);

    return {
      id,
      title: frontmatter.title ?? id,
      type: frontmatter.type ?? 'text',
      description: frontmatter.description ?? null,
      expected: frontmatter.expected ?? null,
      reference: frontmatter.reference ?? null,
      system_hint: frontmatter.system_hint ?? null,
      prompt: body.trim(),
    };
  } catch (err: any) {
    console.warn(`Failed to read benchmark ${id}:`, err.message);
    return null;
  }
}
