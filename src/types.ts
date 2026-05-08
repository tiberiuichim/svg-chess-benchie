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
