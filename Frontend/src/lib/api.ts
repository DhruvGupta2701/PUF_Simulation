import { ExperimentConfig, ExperimentResult } from './types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/health`);
    const data = await res.json();
    return data.status === 'ok';
  } catch {
    return false;
  }
}

export async function runExperiment(config: ExperimentConfig): Promise<ExperimentResult> {
  const res = await fetch(`${BASE_URL}/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || `Server error ${res.status}`);
  }

  const data = await res.json();
  return { ...data, timestamp: new Date().toISOString() };
}
