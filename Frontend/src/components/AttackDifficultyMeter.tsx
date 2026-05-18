import React, { useMemo } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Zap, Activity, Info } from 'lucide-react';
import { ExperimentConfig } from '../types';
import { evaluateDifficulty } from '../lib/difficulty';
import { cn } from '../lib/utils';

interface AttackDifficultyMeterProps {
  config: ExperimentConfig;
  achievedAccuracy?: number;
  className?: string;
}

export default function AttackDifficultyMeter({ config, achievedAccuracy, className }: AttackDifficultyMeterProps) {
  const evalData = useMemo(() => evaluateDifficulty(config, achievedAccuracy), [config, achievedAccuracy]);

  const { score, level, color, explanation, recommendations } = evalData;

  const getIcon = () => {
    if (score < 40) return <ShieldAlert className="w-5 h-5" />;
    if (score > 80) return <ShieldCheck className="w-5 h-5" />;
    return <Shield className="w-5 h-5" />;
  };

  return (
    <div className={cn("rounded-xl p-6 flex flex-col gap-5 relative overflow-hidden transition-all duration-500", className)}
         style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)', boxShadow: `0 4px 30px ${color}10` }}>
      
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-10 blur-[80px] rounded-full pointer-events-none transition-all duration-1000"
           style={{ backgroundColor: color, transform: 'translate(30%, -30%)' }} />

      <div className="flex flex-col md:flex-row gap-6 relative z-10">
        
        {/* Left Side: Score & Gauge */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-1/3 border-b md:border-b-0 md:border-r pb-6 md:pb-0 md:pr-6 border-[var(--border-medium)]">
          <div className="flex items-center gap-2 mb-4 w-full justify-center md:justify-start">
            <Activity className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Attack Difficulty</span>
          </div>

          <div className="relative flex items-center justify-center w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border-strong)" strokeWidth="8" />
              <circle 
                cx="50" cy="50" r="40" 
                fill="none" 
                stroke={color} 
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-mono font-black tabular-nums drop-shadow-md" style={{ color }}>{score}</span>
              <span className="text-[9px] opacity-60 font-mono">/ 100</span>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm transition-colors duration-500"
               style={{ color, backgroundColor: `${color}15`, borderColor: `${color}40` }}>
            {getIcon()}
            {level}
          </div>
        </div>

        {/* Right Side: Explanations & Recommendations */}
        <div className="flex-1 flex flex-col justify-center space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-headline)' }}>
              <Info className="w-4 h-4 text-cyan-400" />
              Security Evaluation
            </h4>
            <p className="text-xs leading-relaxed opacity-90 transition-all duration-300" style={{ color: 'var(--text-body)' }}>
              {explanation}
            </p>
          </div>

          {recommendations.length > 0 && (
            <div className="pt-2">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-headline)' }}>
                <Zap className="w-4 h-4 text-amber-400" />
                Recommendations
              </h4>
              <ul className="space-y-1.5">
                {recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs flex items-start gap-2 opacity-80" style={{ color: 'var(--text-muted)' }}>
                    <span className="text-amber-500 mt-0.5 opacity-80">▸</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
