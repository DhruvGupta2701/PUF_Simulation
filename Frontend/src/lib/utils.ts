import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAccuracy(acc: number): string {
  return `${(acc * 100).toFixed(2)}%`;
}

export function getSecurityLabel(accuracy: number, xorLevel: number): { label: string; color: string } {
  if (accuracy >= 0.95) return { label: 'COMPROMISED', color: 'text-red-400' };
  if (accuracy >= 0.80) return { label: 'VULNERABLE', color: 'text-orange-400' };
  if (accuracy >= 0.65) return { label: 'MODERATE', color: 'text-yellow-400' };
  return { label: 'RESISTANT', color: 'text-emerald-400' };
}
