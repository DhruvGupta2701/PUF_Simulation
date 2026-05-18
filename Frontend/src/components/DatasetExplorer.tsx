import React, { useMemo, useState } from 'react';
import { Database, Search, Activity, Hash, AlertCircle, CheckCircle2, ChevronDown, ChevronRight, Download, Info } from 'lucide-react';
import { ExperimentConfig } from '../types';
import { cn } from '../lib/utils';
import { generateSimulatedDataset, exportDatasetCSV, exportDatasetJSON } from '../lib/dataset';

interface DatasetExplorerProps {
  config: ExperimentConfig;
  className?: string;
}

export default function DatasetExplorer({ config, className }: DatasetExplorerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const analysis = useMemo(() => {
    return generateSimulatedDataset(config, 100);
  }, [config]);

  const filteredSamples = useMemo(() => {
    if (!searchTerm) return analysis.samples;
    return analysis.samples.filter(s => 
      s.index.toString().includes(searchTerm) || 
      s.response.toString() === searchTerm
    );
  }, [analysis.samples, searchTerm]);

  const p0 = (analysis.zeroCount / analysis.totalSamples) * 100;
  const p1 = (analysis.oneCount / analysis.totalSamples) * 100;

  const handleExport = (format: 'csv' | 'json') => {
    const data = format === 'csv' ? exportDatasetCSV(config, analysis) : exportDatasetJSON(config, analysis);
    const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `puf_dataset_${config.n_stages}b_${config.xor_level}x_${config.seed}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isExpanded) {
    return (
      <div 
        onClick={() => setIsExpanded(true)}
        className={cn("p-4 rounded-xl cursor-pointer transition-all duration-300 group hover:shadow-lg hover:shadow-cyan-500/10", className)}
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-medium)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/50 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Database className="text-[#38bdf8] w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--text-headline)]">Dataset Explorer</h3>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Inspect CRP previews & randomness metrics
              </p>
            </div>
          </div>
          <ChevronRight className="text-[var(--text-muted)] group-hover:text-[#38bdf8] transition-colors" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl overflow-hidden flex flex-col transition-all duration-500", className)}
         style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-medium)' }}>
      
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-medium)] flex items-center justify-between bg-black/20">
        <div className="flex items-center gap-3">
          <Database className="text-[#38bdf8] w-5 h-5" />
          <h3 className="font-bold text-[var(--text-headline)]">Dataset Explorer</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('csv')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-[var(--text-muted)] hover:text-white">
            <Download size={14} /> CSV
          </button>
          <button onClick={() => handleExport('json')} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all flex items-center gap-1.5 text-[var(--text-muted)] hover:text-white">
            <Download size={14} /> JSON
          </button>
          <div className="w-[1px] h-4 bg-[var(--border-strong)] mx-1" />
          <button 
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-white/10 rounded transition-colors text-[var(--text-muted)]"
          >
            <ChevronDown size={20} />
          </button>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Metrics & Observations */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Entropy Gauge */}
          <div className="p-4 rounded-lg bg-black/20 border border-[var(--border-color-light)]">
            <div className="flex justify-between items-center mb-3 group relative cursor-help">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5 border-b border-dashed border-[var(--text-muted)]/50 pb-0.5">
                Shannon Entropy <Info size={12} />
              </span>
              <Activity className="w-4 h-4 text-cyan-400" />
              {/* Tooltip */}
              <div className="absolute top-6 left-0 w-48 p-2 rounded bg-black/90 border border-cyan-500/30 text-[10px] text-cyan-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 shadow-xl backdrop-blur-md">
                High entropy (~1.0) indicates strong unpredictability and resistance against statistical modeling attacks.
              </div>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-mono font-bold text-[var(--text-main)]">{analysis.entropy.toFixed(3)}</span>
              <span className="text-xs text-[var(--text-muted)] mb-1">/ 1.0</span>
            </div>
            <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000"
                style={{ 
                  width: `${analysis.entropy * 100}%`,
                  background: analysis.entropy > 0.95 ? '#34d399' : analysis.entropy > 0.85 ? '#fbbf24' : '#ef4444'
                }}
              />
            </div>
          </div>

          {/* Distribution Bar */}
          <div className="p-4 rounded-lg bg-black/20 border border-[var(--border-color-light)]">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Response Distribution</span>
            </div>
            <div className="flex w-full h-3 rounded-full overflow-hidden mb-2">
              <div style={{ width: `${p0}%`, background: '#3b82f6' }} />
              <div style={{ width: `${p1}%`, background: '#8b5cf6' }} />
            </div>
            <div className="flex justify-between text-xs font-mono">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-blue-400">{p0.toFixed(1)}% '0'</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-purple-400">{p1.toFixed(1)}% '1'</span>
              </div>
            </div>
          </div>

          {/* Advanced Metrics */}
          <div className="p-4 rounded-lg bg-black/20 border border-[var(--border-color-light)] flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Diversity Score</span>
              <span className="text-xs font-mono font-bold text-emerald-400">{(analysis.diversityScore * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Avg Hamming Wt.</span>
              <span className="text-xs font-mono font-bold text-amber-400">{analysis.avgHammingWeight.toFixed(1)} bits</span>
            </div>
          </div>

          {/* Observations */}
          <div className="p-4 rounded-lg bg-black/20 border border-[var(--border-color-light)]">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">Analysis Observations</h4>
            <ul className="space-y-3">
              {analysis.observations.map((obs, i) => (
                <li key={i} className="text-xs leading-relaxed flex items-start gap-2">
                  {obs.includes('WARNING') || obs.includes('skewed') ? (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  )}
                  <span className={obs.includes('WARNING') ? 'text-amber-200/80' : 'text-[var(--text-body)]'}>
                    {obs.replace('WARNING: ', '')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: CRP Table Preview */}
        <div className="lg:col-span-2 flex flex-col h-[500px] border border-[var(--border-medium)] rounded-xl overflow-hidden bg-black/30">
          
          <div className="p-3 border-b border-[var(--border-medium)] flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <Hash className="w-4 h-4" />
              Dataset Preview (N=100)
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input 
                type="text" 
                placeholder="Search index or response..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-black/40 border border-[var(--border-medium)] rounded-md pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500 w-48 transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#0d1117] border-b border-[var(--border-medium)] z-10 shadow-md">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider w-16 text-center">Idx</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Challenge Vector ({config.n_stages}-bit)</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider w-20 text-center">Resp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color-light)]">
                {filteredSamples.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">No samples matched.</td>
                  </tr>
                ) : (
                  filteredSamples.map((sample) => (
                    <tr key={sample.index} className="hover:bg-white/5 transition-colors group relative">
                      <td className="px-4 py-2.5 text-xs font-mono text-[var(--text-muted)] text-center group-hover:text-white">
                        {sample.index.toString().padStart(3, '0')}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-[1px]">
                          {sample.challenge.map((bit, idx) => (
                            <div 
                              key={idx}
                              className={cn("w-1.5 h-3 rounded-[1px] transition-colors", bit === 1 ? "bg-cyan-500/80" : "bg-gray-800")}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded font-mono text-xs font-bold",
                          sample.response === 1 ? "bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        )}>
                          {sample.response}
                        </span>
                      </td>

                      {/* Row Tooltip */}
                      <td className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 bg-[#0d1117]/95 border border-[var(--border-strong)] rounded-lg p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-20 shadow-2xl backdrop-blur-md">
                        <div className="flex flex-col gap-1.5 text-[10px] font-mono">
                          <div className="flex justify-between border-b border-white/10 pb-1 mb-0.5 text-white">
                            <span className="font-bold">Index #{sample.index}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Hamming Wt:</span>
                            <span className="text-cyan-400">{sample.hammingWeight}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Response:</span>
                            <span className={sample.response === 1 ? "text-[#8b5cf6]" : "text-blue-400"}>{sample.response}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[var(--text-muted)]">Est. Entropy:</span>
                            <span className="text-emerald-400">+{(1/analysis.totalSamples).toFixed(4)}</span>
                          </div>
                        </div>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-2 border-t border-[var(--border-medium)] bg-black/40 text-[10px] text-center text-[var(--text-muted)]">
            * Simulated dataset deterministically generated using PRNG Seed: {config.seed}
          </div>

        </div>

      </div>
    </div>
  );
}
