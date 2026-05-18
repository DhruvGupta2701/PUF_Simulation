import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Eye, EyeOff, Info } from 'lucide-react';
import { ExperimentConfig } from '../types';
import { cn } from '../lib/utils';

interface PUFVisualizationProps {
  config: ExperimentConfig;
  className?: string;
}

export default function PUFVisualization({ config, className }: PUFVisualizationProps) {
  const [phase, setPhase] = useState<0|1|2|3|4>(0);
  const [guidedMode, setGuidedMode] = useState(false);

  // Animation Loop
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (phase === 0) timeout = setTimeout(() => setPhase(1), 500);
    else if (phase === 1) timeout = setTimeout(() => setPhase(2), 1000); // Challenge loads
    else if (phase === 2) timeout = setTimeout(() => setPhase(3), 2000); // Signal races
    else if (phase === 3) timeout = setTimeout(() => setPhase(4), 1000); // Arbiter latches
    else if (phase === 4) timeout = setTimeout(() => setPhase(0), 3000); // XOR output, then reset

    return () => clearTimeout(timeout);
  }, [phase]);

  // Determine visual rows
  const maxVisualK = 4;
  const actualK = config.xor_level;
  const numRows = Math.min(actualK, maxVisualK);
  const hasGap = actualK > maxVisualK;

  // Render parameters
  const svgWidth = 800;
  const svgHeight = Math.max(300, numRows * 80 + 40);
  const rowHeight = 70;
  const startY = 60;
  
  const explanations = {
    challenge: "Challenge vector (C) is applied to all multiplexer stages. These bits determine if the signal crosses over or goes straight.",
    race: `The electrical pulse races through ${config.n_stages} physical stages. Minute manufacturing variations cause delays. ${config.noise > 0 ? `Thermal/voltage noise (σ=${config.noise.toFixed(2)}) makes this race unstable.` : ''}`,
    arbiter: "The D-FlipFlop (Arbiter) acts as a judge. It outputs '1' if the top signal arrives first, and '0' if the bottom signal arrives first.",
    xor: config.xor_level > 1 
        ? `The outputs of the ${actualK} arbiters are XORed together. This non-linear combination obscures the individual arbiter delays, making ML modeling exponentially harder.` 
        : "The final response bit is generated based on the arbiter's evaluation of the physical race."
  };

  return (
    <div className={cn("rounded-xl p-6 relative overflow-hidden flex flex-col", className)}
         style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-medium)' }}>
      
      {/* Header */}
      <div className="flex justify-between items-center mb-4 relative z-10">
        <h3 className="font-bold text-sm flex items-center gap-2 text-[var(--text-headline)]">
          <Cpu className="text-cyan-400" size={18} />
          Architecture Visualization
        </h3>
        <button 
          onClick={() => setGuidedMode(!guidedMode)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border"
          style={{ 
            background: guidedMode ? 'var(--accent-primary-alpha-15)' : 'transparent',
            borderColor: guidedMode ? 'var(--accent-primary)' : 'var(--border-color-strong)',
            color: guidedMode ? 'var(--accent-primary)' : 'var(--text-muted)'
          }}
        >
          {guidedMode ? <Eye size={14} /> : <EyeOff size={14} />}
          Guided Mode
        </button>
      </div>

      {/* Visualization Canvas */}
      <div className="flex-1 w-full bg-black/20 rounded-lg border border-[var(--border-color-light)] relative overflow-hidden flex items-center justify-center p-4">
        
        {/* Contextual Guided Mode Tooltips */}
        {guidedMode && (
          <>
            <Tooltip point={{ top: '20%', left: '15%' }} text={explanations.challenge} />
            <Tooltip point={{ top: '50%', left: '40%' }} text={explanations.race} />
            <Tooltip point={{ top: '20%', right: '40%' }} text={explanations.arbiter} />
            <Tooltip point={{ top: '50%', right: '15%' }} text={explanations.xor} />
          </>
        )}
        
        {/* Background Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(var(--accent-primary) 1px, transparent 1px), linear-gradient(90deg, var(--accent-primary) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full max-h-[400px] overflow-visible">
          <defs>
            <linearGradient id="signalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="1" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="1" />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            
            {/* Animated noise filter if noise > 0 */}
            <filter id="noiseFilter">
               <feTurbulence type="fractalNoise" baseFrequency={config.noise > 0 ? (phase === 2 ? 0.8 : 0.1) : 0} numOctaves="1" result="noise" />
               <feDisplacementMap in="SourceGraphic" in2="noise" scale={config.noise > 0 && phase === 2 ? 10 * config.noise : 0} xChannelSelector="R" yChannelSelector="G" />
            </filter>
          </defs>

          {/* Rows representing Arbiter chains */}
          {Array.from({ length: numRows }).map((_, i) => {
            const y = startY + i * rowHeight;
            const isLastRenderedRow = i === numRows - 1;
            const displayIndex = isLastRenderedRow && hasGap ? actualK : i + 1;
            
            return (
              <g key={i}>
                {/* Arbiter Label */}
                <text x="10" y={y + 5} fill="var(--text-muted)" fontSize="10" fontWeight="bold" opacity="0.6">
                  CHAIN {displayIndex}
                </text>

                {/* Challenge Bits (Phase 1+) */}
                <g className="transition-opacity duration-500" style={{ opacity: phase >= 1 ? 1 : 0 }}>
                  <rect x="60" y={y - 15} width="20" height="30" rx="4" fill="var(--bg-header-light)" stroke="var(--border-strong)" />
                  <text x="70" y={y + 3} fill="var(--accent-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">C</text>
                </g>

                {/* MUX Stages (Abstracted) */}
                <rect x="100" y={y - 15} width="40" height="30" rx="4" fill="var(--bg-app)" stroke="#4cd6ff40" strokeWidth="2" />
                <rect x="160" y={y - 15} width="40" height="30" rx="4" fill="var(--bg-app)" stroke="#4cd6ff40" strokeWidth="2" />
                
                <text x="235" y={y + 4} fill="var(--text-muted)" fontSize="14" letterSpacing="4" textAnchor="middle">...</text>
                
                <rect x="270" y={y - 15} width="40" height="30" rx="4" fill="var(--bg-app)" stroke="#4cd6ff40" strokeWidth="2" />

                {/* Delay Paths (Phase 2+) */}
                {/* Top Path */}
                <path d={`M 140 ${y - 8} L 160 ${y - 8} M 200 ${y - 8} L 220 ${y - 8} M 250 ${y - 8} L 270 ${y - 8} M 310 ${y - 8} L 360 ${y - 8}`} 
                      stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 4" />
                
                {/* Bottom Path */}
                <path d={`M 140 ${y + 8} L 160 ${y + 8} M 200 ${y + 8} L 220 ${y + 8} M 250 ${y + 8} L 270 ${y + 8} M 310 ${y + 8} L 360 ${y + 8}`} 
                      stroke="var(--border-strong)" strokeWidth="2" strokeDasharray="4 4" />

                {/* Animated Signal Race (Phase 2) */}
                <g className="transition-opacity duration-300" style={{ opacity: phase === 2 ? 1 : 0 }} filter="url(#noiseFilter)">
                  <path d={`M 80 ${y - 8} L 360 ${y - 8}`} stroke="url(#signalGrad)" strokeWidth="3" filter="url(#glow)" strokeDasharray="280" strokeDashoffset={phase === 2 ? "0" : "280"} className={phase === 2 ? "animate-[flow_2s_linear_forwards]" : ""} />
                  <path d={`M 80 ${y + 8} L 360 ${y + 8}`} stroke="url(#signalGrad)" strokeWidth="3" filter="url(#glow)" strokeDasharray="280" strokeDashoffset={phase === 2 ? "0" : "280"} className={phase === 2 ? "animate-[flow_2s_linear_forwards]" : ""} />
                </g>

                {/* D-FlipFlop (Arbiter) */}
                <rect x="360" y={y - 20} width="40" height="40" rx="4" fill="var(--bg-panel-light)" stroke={phase >= 3 ? "var(--accent-primary)" : "var(--border-strong)"} strokeWidth="2" className="transition-colors duration-500" />
                <text x="380" y={y + 4} fill={phase >= 3 ? "var(--accent-primary)" : "var(--text-muted)"} fontSize="12" fontWeight="bold" textAnchor="middle" className="transition-colors duration-500">D-FF</text>

                {/* Arbiter Output (Phase 3+) */}
                <g className="transition-opacity duration-500" style={{ opacity: phase >= 3 ? 1 : 0 }}>
                  <line x1="400" y1={y} x2="480" y2={y} stroke="var(--accent-primary)" strokeWidth="2" />
                  <circle cx="440" cy={y} r="8" fill="var(--bg-app)" stroke="var(--accent-primary)" strokeWidth="2" />
                  {/* Randomly display 0 or 1 for visual flair */}
                  <text x="440" y={y + 3} fill="var(--accent-primary)" fontSize="10" fontWeight="bold" textAnchor="middle">
                    {(i + phase) % 2}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Vertical gap if needed */}
          {hasGap && (
            <text x="380" y={startY + (maxVisualK - 1) * rowHeight - 20} fill="var(--text-muted)" fontSize="20" letterSpacing="4" textAnchor="middle" opacity="0.5">
              ...
            </text>
          )}

          {/* XOR Logic Box (Phase 4) */}
          {actualK > 1 ? (
            <g>
              <rect x="480" y={startY - 30} width="60" height={(numRows - 1) * rowHeight + 60} rx="8" fill="var(--bg-panel)" stroke={phase >= 4 ? "#a855f7" : "var(--border-medium)"} strokeWidth="2" className="transition-colors duration-500" />
              <text x="510" y={startY + ((numRows - 1) * rowHeight) / 2 + 5} fill={phase >= 4 ? "#a855f7" : "var(--text-muted)"} fontSize="16" fontWeight="bold" textAnchor="middle" transform={`rotate(-90 510 ${startY + ((numRows - 1) * rowHeight) / 2 + 5})`} className="transition-colors duration-500 tracking-widest">
                XOR GATE
              </text>
              
              {/* Final Output Line */}
              <g className="transition-opacity duration-500" style={{ opacity: phase >= 4 ? 1 : 0 }}>
                <line x1="540" y1={startY + ((numRows - 1) * rowHeight) / 2} x2="620" y2={startY + ((numRows - 1) * rowHeight) / 2} stroke="#a855f7" strokeWidth="3" filter="url(#glow)" />
                <polygon points={`610,${startY + ((numRows - 1) * rowHeight) / 2 - 5} 620,${startY + ((numRows - 1) * rowHeight) / 2} 610,${startY + ((numRows - 1) * rowHeight) / 2 + 5}`} fill="#a855f7" />
                
                {/* Final Bit */}
                <rect x="630" y={startY + ((numRows - 1) * rowHeight) / 2 - 15} width="30" height="30" rx="4" fill="#a855f720" stroke="#a855f7" strokeWidth="2" />
                <text x="645" y={startY + ((numRows - 1) * rowHeight) / 2 + 5} fill="#a855f7" fontSize="14" fontWeight="bold" textAnchor="middle">
                  R
                </text>
              </g>
            </g>
          ) : (
            // If 1-XOR, just show final response box
            <g className="transition-opacity duration-500" style={{ opacity: phase >= 4 ? 1 : 0 }}>
              <polygon points={`470,${startY - 5} 480,${startY} 470,${startY + 5}`} fill="var(--accent-primary)" />
              <rect x="490" y={startY - 15} width="30" height="30" rx="4" fill="var(--accent-primary-alpha-15)" stroke="var(--accent-primary)" strokeWidth="2" />
              <text x="505" y={startY + 5} fill="var(--accent-primary)" fontSize="14" fontWeight="bold" textAnchor="middle">
                R
              </text>
            </g>
          )}

        </svg>

        {/* Global Keyframes injected inline for self-containment */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes flow {
            from { stroke-dashoffset: 280; }
            to { stroke-dashoffset: 0; }
          }
        `}} />
      </div>
    </div>
  );
}

function Tooltip({ point, text }: { point: { top?: string, left?: string, right?: string, bottom?: string }, text: string }) {
  return (
    <div className="absolute z-20 group" style={point}>
      <div className="w-6 h-6 rounded-full bg-[var(--accent-primary)]/20 border border-[var(--accent-primary)] flex items-center justify-center cursor-help animate-pulse">
        <Info size={14} className="text-[var(--accent-primary)]" />
      </div>
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-48 p-3 rounded-lg bg-black/90 border border-cyan-500/30 text-xs text-cyan-100 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300 shadow-xl shadow-cyan-500/10 backdrop-blur-md">
        {text}
      </div>
    </div>
  );
}
