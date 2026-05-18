import React, { useState, useEffect, useMemo } from 'react';
import { Terminal, BrainCircuit, Target, Shield, Fingerprint, Activity, AlertTriangle, ShieldCheck } from 'lucide-react';
import { ExperimentConfig } from '../types';
import { generateSecurityAnalysis, SecurityAnalysis } from '../lib/analysis';
import { cn } from '../lib/utils';

// Helper for typewriter effect
const TypewriterText = ({ text, delay = 0, speed = 10, onComplete }: { text: string, delay?: number, speed?: number, onComplete?: () => void }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setIsStarted(false);
    
    const startTimeout = setTimeout(() => {
      setIsStarted(true);
    }, delay);

    return () => clearTimeout(startTimeout);
  }, [text, delay]);

  useEffect(() => {
    if (!isStarted) return;

    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(interval);
        if (onComplete) onComplete();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, isStarted, speed, onComplete]);

  return <span>{displayedText}{displayedText.length < text.length && isStarted ? <span className="animate-pulse">_</span> : ''}</span>;
};

interface SecurityAnalysisPanelProps {
  config: ExperimentConfig;
  accuracy: number;
  className?: string;
}

export default function SecurityAnalysisPanel({ config, accuracy, className }: SecurityAnalysisPanelProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const analysis = useMemo<SecurityAnalysis>(() => {
    return generateSecurityAnalysis(config, accuracy);
  }, [config, accuracy]);

  return (
    <div className={cn("rounded-xl p-6 relative overflow-hidden group transition-all duration-500", className)}
         style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-medium)' }}>
      
      {/* Background Grid & Glow */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(var(--accent-primary) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <div className="absolute -top-32 -right-32 w-64 h-64 bg-[var(--accent-primary)] opacity-5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <h3 className="font-bold text-lg flex items-center gap-2 mb-6 text-[var(--text-headline)] relative z-10">
        <BrainCircuit className="text-[var(--accent-primary)] animate-pulse" size={20} />
        AI Security Analysis
        <span className="ml-2 px-2 py-0.5 rounded text-[9px] font-mono border border-[var(--accent-primary)] text-[var(--accent-primary)] tracking-widest uppercase bg-[var(--accent-primary-alpha-8)]">
          Auto-Generated
        </span>
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        
        {/* Left Column: Generative Text */}
        <div className="lg:col-span-2 space-y-6">
          {/* Assessment */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
              <Terminal size={14} className="opacity-70" /> Security Assessment
            </h4>
            <div className="p-4 rounded-lg bg-black/20 border border-[var(--border-color-light)] font-mono text-[11px] leading-relaxed text-[var(--text-body)] min-h-[80px]">
              <span className="text-[var(--accent-primary)] opacity-70 mr-2">root@puf-analyzer:~#</span>
              <TypewriterText 
                text={analysis.assessment} 
                speed={8} 
                onComplete={() => setShowDetails(true)} 
              />
            </div>
          </div>

          {/* Model Behavior */}
          <div className={cn("space-y-2 transition-opacity duration-1000", showDetails ? "opacity-100" : "opacity-0")}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
              <Activity size={14} className="opacity-70" /> Algorithmic Behavior
            </h4>
            <p className="text-sm leading-relaxed text-[var(--text-body)] opacity-90 pl-4 border-l-2 border-[var(--border-color-strong)]">
              {analysis.modelBehavior}
            </p>
          </div>

          {/* Observations List */}
          <div className={cn("space-y-2 transition-opacity duration-1000 delay-300", showDetails ? "opacity-100" : "opacity-0")}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
              <Target size={14} className="opacity-70" /> Key Observations
            </h4>
            <ul className="space-y-2 pl-2">
              {analysis.observations.map((obs, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2 text-[var(--text-body)] opacity-90">
                  <span className="text-[var(--accent-secondary)] mt-0.5">▸</span>
                  <span>{obs}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Key Findings Grid */}
        <div className={cn("space-y-4 transition-all duration-1000 delay-500 transform", showDetails ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")}>
          <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2 mb-4">
            <Fingerprint size={14} className="opacity-70" /> Key Findings
          </h4>

          <div className="flex flex-col gap-3">
            <FindingCard 
              label="Attack Feasibility" 
              value={analysis.findings.feasibility} 
              icon={<Target size={16} />}
              accent="var(--accent-primary)"
            />
            <FindingCard 
              label="Modeling Resistance" 
              value={analysis.findings.modelingResistance} 
              icon={<Shield size={16} />}
              accent="#8b5cf6"
            />
            <FindingCard 
              label="Primary Vulnerability" 
              value={analysis.findings.strongestVulnerability} 
              icon={<AlertTriangle size={16} />}
              accent="#f87171"
            />
            <FindingCard 
              label="Strongest Defense" 
              value={analysis.findings.strongestDefense} 
              icon={<ShieldCheck size={16} />}
              accent="#10b981"
            />
          </div>
        </div>

      </div>
    </div>
  );
}

function FindingCard({ label, value, icon, accent }: { label: string, value: string, icon: React.ReactNode, accent: string }) {
  return (
    <div className="p-3 rounded-lg border border-[var(--border-color-light)] bg-black/10 flex items-start gap-3 hover:bg-black/20 transition-colors group">
      <div className="mt-0.5 p-1.5 rounded-md bg-white/5 group-hover:scale-110 transition-transform" style={{ color: accent }}>
        {icon}
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-wider font-bold opacity-50 mb-0.5">{label}</div>
        <div className="text-xs font-semibold" style={{ color: 'var(--text-headline)' }}>{value}</div>
      </div>
    </div>
  );
}
