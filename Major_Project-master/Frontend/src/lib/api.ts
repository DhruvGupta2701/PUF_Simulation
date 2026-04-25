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

export async function loginUser(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Failed to login');
  return await res.json();
}

export async function registerUser(username: string, password: string) {
  const res = await fetch(`${BASE_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error('Failed to register');
  return await res.json();
}

export async function getUserHistory(username: string): Promise<any[]> {
  const res = await fetch(`${BASE_URL}/history/${encodeURIComponent(username)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.history || [];
}

export async function renameSession(username: string, oldName: string, newName: string) {
  const res = await fetch(`${BASE_URL}/rename-session`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, old_name: oldName, new_name: newName })
  });
  if (!res.ok) throw new Error('Failed to rename session');
  return await res.json();
}

export async function deleteSession(username: string, sessionName: string) {
  const res = await fetch(`${BASE_URL}/delete-session`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, session_name: sessionName })
  });
  if (!res.ok) throw new Error('Failed to delete session');
  return await res.json();
}
