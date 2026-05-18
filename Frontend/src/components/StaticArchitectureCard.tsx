import React from 'react';
import { Cpu, ArrowRight } from 'lucide-react';
import { ExperimentConfig } from '../types';
import { cn } from '../lib/utils';

interface StaticArchitectureCardProps {
  config: ExperimentConfig;
  className?: string;
}

export default function StaticArchitectureCard({ config, className }: StaticArchitectureCardProps) {
  return (
    <div className={cn("p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4", className)}
         style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-medium)' }}>
      
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary-alpha-15)] border border-[var(--accent-primary)] flex items-center justify-center">
          <Cpu className="text-[var(--accent-primary)] w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Target Architecture</h4>
          <p className="text-sm font-semibold text-[var(--text-headline)]">
            {config.xor_level}-XOR Arbiter PUF
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="px-3 py-1.5 rounded-md bg-black/20 border border-[var(--border-color-light)] flex items-center gap-2">
          <span className="text-[var(--text-muted)]">Input:</span>
          <span className="text-cyan-400 font-bold">{config.n_stages}-bit</span>
        </div>
        <ArrowRight size={14} className="text-[var(--text-muted)] opacity-50" />
        <div className="px-3 py-1.5 rounded-md bg-black/20 border border-[var(--border-color-light)] flex items-center gap-2">
          <span className="text-[var(--text-muted)]">Noise:</span>
          <span className="text-amber-400 font-bold">σ = {config.noise.toFixed(2)}</span>
        </div>
        <ArrowRight size={14} className="text-[var(--text-muted)] opacity-50" />
        <div className="px-3 py-1.5 rounded-md bg-black/20 border border-[var(--border-color-light)] flex items-center gap-2">
          <span className="text-[var(--text-muted)]">Output:</span>
          <span className="text-[#8b5cf6] font-bold">1-bit</span>
        </div>
      </div>

    </div>
  );
}
