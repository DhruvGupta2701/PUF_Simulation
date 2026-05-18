import React, { useState, useEffect } from 'react';
import { Cpu, Zap } from 'lucide-react';
import { ExperimentConfig } from '../types';
import { cn } from '../lib/utils';

interface CompactPUFVisualizationProps {
  config: ExperimentConfig;
  className?: string;
  isTraining?: boolean;
}

export default function CompactPUFVisualization({ config, className, isTraining = false }: CompactPUFVisualizationProps) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!isTraining) return;
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 400); // Fast pulse during training
    return () => clearInterval(interval);
  }, [isTraining]);

  return (
    <div className={cn("rounded-xl p-4 flex flex-col relative overflow-hidden", className)}
         style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-medium)' }}>
      
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-xs flex items-center gap-2 text-[var(--text-headline)]">
          <Zap className="text-cyan-400" size={14} />
          Live Data Flow
        </h3>
        <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">
          {config.n_stages}-bit / {config.xor_level}-XOR
        </span>
      </div>

      <div className="flex items-center justify-between w-full h-16 bg-black/20 rounded-lg border border-[var(--border-color-light)] px-2 sm:px-4 relative overflow-hidden">
        
        {/* Challenge Input Stream */}
        <div className="flex flex-col items-center justify-center relative overflow-hidden w-12 sm:w-16 h-full shrink-0">
          <div className={cn("text-xs font-mono font-bold text-[var(--accent-primary)] opacity-70", isTraining ? "animate-[slideRight_1s_linear_infinite]" : "")}>
            [C] ➔
          </div>
        </div>

        {/* The PUF Black Box */}
        <div className={cn(
          "w-24 sm:w-32 h-10 rounded-md border-2 flex items-center justify-center gap-1 sm:gap-2 transition-all duration-300 z-10 shrink-0",
          isTraining ? (pulse ? "border-[var(--accent-primary)] shadow-[0_0_15px_var(--accent-primary)]" : "border-[#8b5cf6] shadow-[0_0_15px_#8b5cf6]") : "border-[var(--border-medium)]"
        )} style={{ background: 'var(--bg-app)' }}>
          <Cpu size={16} className={cn("text-[var(--text-headline)]", isTraining && pulse ? "text-[var(--accent-primary)]" : "")} />
          <span className="text-xs font-bold font-mono">PUF CORE</span>
        </div>

        {/* Response Output Stream */}
        <div className="flex flex-col items-center justify-center relative overflow-hidden w-12 sm:w-16 h-full shrink-0">
          <div className={cn("text-xs font-mono font-bold text-[#8b5cf6] opacity-70", isTraining ? "animate-[slideRight_1s_linear_infinite]" : "")}>
            ➔ [R]
          </div>
        </div>

        {/* Inline keyframes */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideRight {
            0% { transform: translateX(-10px); opacity: 0; }
            50% { opacity: 1; }
            100% { transform: translateX(10px); opacity: 0; }
          }
        `}} />
      </div>
    </div>
  );
}
