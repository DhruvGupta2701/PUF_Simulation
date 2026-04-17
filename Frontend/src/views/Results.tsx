import { useState, useEffect } from 'react';
import { formatAccuracy, getSecurityLabel } from '../lib/utils';
import { SimulationRun } from '../types';
import ReportModal from '../components/ReportModal';
import CompareModal from '../components/CompareModal';
import { FileText, Layers, Activity, Database, Cpu, Zap, Search, Filter, Edit2, Check, X, CheckSquare, BarChart2, Trash2 } from 'lucide-react';
import { renameSession, deleteSession } from '../lib/api';

// A simple SVG semi-circle gauge meter
const GaugeMeter = ({ accuracy }: { accuracy: number }) => {
  const [animatedAcc, setAnimatedAcc] = useState(0);

  useEffect(() => {
    // Trigger animation after mount
    const timeout = setTimeout(() => setAnimatedAcc(accuracy), 100);
    return () => clearTimeout(timeout);
  }, [accuracy]);

  const radius = 80;
  const cx = 100;
  const cy = 100;
  const circumference = Math.PI * radius;
  const normalizedAcc = Math.max(0, Math.min(1, animatedAcc));
  const strokeDashoffset = circumference - (normalizedAcc * circumference);

  const { color, label } = getSecurityLabel(accuracy, 0);

  return (
    <div className="relative flex flex-col items-center justify-center mt-8 mb-4">
      <svg width="240" height="130" viewBox="0 0 200 120" className="overflow-visible drop-shadow-xl">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="var(--border-medium)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute top-[45px] flex flex-col items-center">
        <span className="text-4xl font-mono font-bold tracking-tighter" style={{ color }}>
          {formatAccuracy(animatedAcc)}
        </span>
        <span className="text-sm font-semibold tracking-wide uppercase mt-2 px-3 py-1 rounded-full" 
              style={{ color, backgroundColor: `${color}20`, border: `1px solid ${color}40` }}>
          {label}
        </span>
      </div>
    </div>
  );
};

interface ResultsProps {
  result: any; // single result
  history?: SimulationRun[];
  currentSessionName: string;
  onSelectSession: (session: string) => void;
  onHistoryChange?: () => void;
}

export default function Results({ result, history = [], currentSessionName, onSelectSession, onHistoryChange }: ResultsProps) {
  const [showReportForSession, setShowReportForSession] = useState<string | null>(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterModel, setFilterModel] = useState<'ALL'|'lr'|'mlp'>('ALL');
  const [filterDate, setFilterDate] = useState<'ALL' | 'TODAY'>('ALL');
  
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editSessionValue, setEditSessionValue] = useState('');
  
  const [selectedForCompare, setSelectedForCompare] = useState<Record<string, boolean>>({});

  const toggleCompare = (sName: string) => {
    setSelectedForCompare(prev => ({ ...prev, [sName]: !prev[sName] }));
  };

  const selectedCount = Object.values(selectedForCompare).filter(Boolean).length;

  const handleRename = async (oldName: string) => {
    if (!editSessionValue || editSessionValue === oldName) {
      setEditingSession(null);
      return;
    }
    const username = history[0]?.config?.username;
    if (username) {
      try {
        await renameSession(username, oldName, editSessionValue);
        if (onHistoryChange) onHistoryChange();
      } catch (err) {
        console.error(err);
      }
    }
    setEditingSession(null);
  };

  const handleDelete = async (sName: string) => {
    if (!window.confirm(`Are you sure you want to completely delete "${sName}" and all its experiment records? This cannot be undone.`)) {
      return;
    }
    const username = history[0]?.config?.username;
    if (username) {
      try {
        await deleteSession(username, sName);
        if (onHistoryChange) onHistoryChange();
        // Remove from compare selections if it was selected
        if (selectedForCompare[sName]) toggleCompare(sName);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // ✅ SAFETY CHECK
  if (!result && (!history || history.length === 0)) {
    return (
      <div className="flex items-center justify-center h-80 text-[var(--text-headline)]">
        No results or history available
      </div>
    );
  }

  const accuracy = result?.accuracy ?? 0;
  const { label, color } = getSecurityLabel(accuracy, result?.xor_level ?? 2);

  // Group history by session natively
  const sessionGroups = history.reduce((acc, run) => {
    const sName = run.config.session_name || 'Session 1';
    
    // Apply filters before classifying, but we should always classify sessions first, then filter their runs.
    if (!acc[sName]) acc[sName] = [];
    acc[sName].push(run);
    return acc;
  }, {} as Record<string, SimulationRun[]>);

  // Apply Search/Filter on Sessions
  const filteredSessions = Object.keys(sessionGroups).filter(sName => {
    // Session name search
    if (searchQuery && !sName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  }).sort();

  return (
    <div className="space-y-6 text-[var(--text-headline)] animate-in fade-in">
      
      {showReportForSession && sessionGroups[showReportForSession] && (
        <ReportModal 
          history={sessionGroups[showReportForSession]} 
          onClose={() => setShowReportForSession(null)} 
        />
      )}

      {showCompareModal && selectedCount >= 2 && (
        <CompareModal
          sessionGroups={Object.fromEntries(
            Object.entries(sessionGroups).filter(([sName]) => selectedForCompare[sName])
          )}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {/* Main Result */}
      {result && (
        <div className="rounded-xl p-6 text-center relative overflow-hidden"
          style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}
        >
          {/* Decorative background glow based on result color */}
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b opacity-5 pointer-events-none" 
               style={{ backgroundImage: `linear-gradient(to bottom, ${color}, transparent)` }} />
               
          <h2 className="text-xl font-bold mb-2 flex items-center justify-center gap-2 relative z-10">
            Attack Results
          </h2>

          <GaugeMeter accuracy={accuracy} />
          
        </div>
      )}

      {/* Details */}
      {result && (
        <div className="rounded-xl p-6 relative overflow-hidden group"
          style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}
        >
          {/* Subtle background glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"/>
          
          <h3 className="mb-6 font-bold text-lg flex items-center gap-2 relative z-10">
            <Activity className="text-cyan-400" size={20} />
            Experiment Details
          </h3>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 text-sm relative z-10">
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-medium)] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all shadow-sm hover:shadow-blue-500/10 hover:-translate-y-1">
              <Layers className="mb-3 text-blue-400" size={26} />
              <span className="text-[10px] opacity-60 mb-1 uppercase tracking-widest font-semibold">Stages</span>
              <span className="font-mono text-xl font-bold text-[var(--text-headline)]">{result?.n_stages}</span>
            </div>
            
            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-medium)] hover:border-purple-500/50 hover:bg-purple-500/5 transition-all shadow-sm hover:shadow-purple-500/10 hover:-translate-y-1">
              <Zap className="mb-3 text-purple-400" size={26} />
              <span className="text-[10px] opacity-60 mb-1 uppercase tracking-widest font-semibold">XOR Level</span>
              <span className="font-mono text-xl font-bold text-[var(--text-headline)]">{result?.xor_level}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-medium)] hover:border-orange-500/50 hover:bg-orange-500/5 transition-all shadow-sm hover:shadow-orange-500/10 hover:-translate-y-1">
              <Activity className="mb-3 text-orange-400" size={26} />
              <span className="text-[10px] opacity-60 mb-1 uppercase tracking-widest font-semibold">Noise</span>
              <span className="font-mono text-xl font-bold text-[var(--text-headline)]">{result?.noise}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-medium)] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all shadow-sm hover:shadow-emerald-500/10 hover:-translate-y-1">
              <Database className="mb-3 text-emerald-400" size={26} />
              <span className="text-[10px] opacity-60 mb-1 uppercase tracking-widest font-semibold">CRPs</span>
              <span className="font-mono text-xl font-bold text-[var(--text-headline)]">{result?.num_samples}</span>
            </div>

            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-medium)] hover:border-rose-500/50 hover:bg-rose-500/5 transition-all shadow-sm hover:shadow-rose-500/10 hover:-translate-y-1">
              <Cpu className="mb-3 text-rose-400" size={26} />
              <span className="text-[10px] opacity-60 mb-1 uppercase tracking-widest font-semibold">Model</span>
              <span className="font-mono text-xl font-bold text-[var(--text-headline)] uppercase">{result?.model_type}</span>
            </div>
          </div>
        </div>
      )}

      {/* History Panel by Session */}
      {(filteredSessions.length > 0 || searchQuery !== '') && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <h3 className="font-semibold text-xl">Experiment Sessions</h3>
            
            <div className="flex flex-wrap gap-3 items-center">
              {selectedCount > 0 && (
                <button
                  onClick={() => setShowCompareModal(true)}
                  disabled={selectedCount < 2}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg shadow-lg transition-all"
                  style={{
                    backgroundColor: selectedCount >= 2 ? 'var(--accent-secondary)' : 'var(--bg-panel-light)',
                    color: selectedCount >= 2 ? '#fff' : 'var(--text-muted)'
                  }}
                >
                  <BarChart2 size={16} />
                  {selectedCount < 2 ? 'Select 1 more to compare' : `Compare ${selectedCount} Sessions`}
                </button>
              )}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 opacity-50" />
                <input 
                  type="text" 
                  placeholder="Search sessions..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 rounded-lg bg-[var(--bg-app)] border border-[var(--border-medium)] outline-none text-sm focus:border-cyan-500"
                />
              </div>
              
              <div className="flex gap-2">
                <div className="relative flex items-center bg-[var(--bg-app)] border border-[var(--border-medium)] rounded-lg px-2">
                  <Filter size={14} className="opacity-50 mr-1" />
                  <select 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value as any)}
                    className="bg-transparent border-none outline-none text-[13px] appearance-none cursor-pointer py-1.5"
                  >
                    <option value="ALL">All Time</option>
                    <option value="TODAY">Today</option>
                  </select>
                </div>
                
                <div className="relative flex items-center bg-[var(--bg-app)] border border-[var(--border-medium)] rounded-lg px-2">
                  <Filter size={14} className="opacity-50 mr-1" />
                  <select 
                    value={filterModel}
                    onChange={(e) => setFilterModel(e.target.value as any)}
                    className="bg-transparent border-none outline-none text-[13px] appearance-none cursor-pointer py-1.5"
                  >
                    <option value="ALL">All Models</option>
                    <option value="lr">Log Reg</option>
                    <option value="mlp">MLP</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {filteredSessions.map((sName) => {
            const filteredRuns = sessionGroups[sName].filter(run => {
              // 1. Model Filter
              if (filterModel !== 'ALL' && run.config.model_type !== filterModel) return false;
              // 2. Date Filter
              if (filterDate === 'TODAY') {
                const runDate = new Date(run.timestamp).toDateString();
                const today = new Date().toDateString();
                if (runDate !== today) return false;
              }
              return true;
            });

            // Skip rendering if filter removes all runs and user isn't strictly searching for session name.
            if (filteredRuns.length === 0 && (filterModel !== 'ALL' || filterDate !== 'ALL')) return null;

            return (
              <div key={sName} className="rounded-xl p-6 relative overflow-hidden transition-all"
              style={{ 
                background: currentSessionName === sName ? 'var(--bg-panel-solid)' : 'var(--bg-panel)', 
                border: currentSessionName === sName ? '2px solid var(--accent-primary)' : '1px solid var(--border-medium)' 
              }}
            >
              <div className="flex justify-between items-center mb-6">
                <div>
                  {editingSession === sName ? (
                    <div className="flex items-center gap-2">
                       <input 
                         autoFocus
                         className="bg-[var(--bg-app)] border border-cyan-500 rounded px-2 py-1 outline-none text-cyan-400 font-bold"
                         value={editSessionValue}
                         onChange={(e) => setEditSessionValue(e.target.value)}
                         onKeyDown={(e) => {
                           if(e.key === 'Enter') handleRename(sName);
                           if(e.key === 'Escape') setEditingSession(null);
                         }}
                       />
                       <button onClick={() => handleRename(sName)} className="text-emerald-400 hover:scale-110"><Check size={18}/></button>
                       <button onClick={() => setEditingSession(null)} className="text-red-400 hover:scale-110"><X size={18}/></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group/title">
                      <h4 className="font-bold text-lg text-cyan-400">{sName}</h4>
                      <button 
                        className="opacity-0 group-hover/title:opacity-100 transition-opacity text-cyan-400/50 hover:text-cyan-400"
                        onClick={() => { setEditingSession(sName); setEditSessionValue(sName); }}
                        title="Rename Session"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        className="opacity-0 group-hover/title:opacity-100 transition-opacity text-red-500/50 hover:text-red-500 ml-1"
                        onClick={() => handleDelete(sName)}
                        title="Delete Session"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                  <p className="text-xs opacity-60 mt-1">{filteredRuns.length} Experiments</p>
                </div>
                <div className="flex flex-wrap gap-3 items-center">
                  <button
                    onClick={() => toggleCompare(sName)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg transition-all"
                    style={{
                      border: selectedForCompare[sName] ? '1px solid var(--accent-secondary)' : '1px solid var(--border-color)',
                      backgroundColor: selectedForCompare[sName] ? 'max(var(--accent-secondary-alpha-15), rgba(147, 51, 234, 0.15))' : 'transparent',
                      color: selectedForCompare[sName] ? 'var(--accent-secondary)' : 'var(--text-muted)'
                    }}
                  >
                    <CheckSquare size={16} />
                    {selectedForCompare[sName] ? 'Selected' : 'Compare'}
                  </button>
                  <button
                    onClick={() => onSelectSession(sName)}
                    className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors bg-white/5 hover:bg-white/10"
                    style={{ border: '1px solid var(--border-color)' }}
                  >
                    Add Run
                  </button>
                  <button
                    onClick={() => setShowReportForSession(sName)}
                    className="flex items-center gap-2 px-4 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-dark)] text-[var(--on-accent-primary)] text-sm font-semibold rounded-lg shadow-md shadow-cyan-500/20 transition-all"
                  >
                    <FileText size={16} />
                    PDF Report
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                      <th className="py-2 opacity-70 font-normal uppercase tracking-widest text-[10px]">Time</th>
                      <th className="py-2 opacity-70 font-normal uppercase tracking-widest text-[10px]">Model</th>
                      <th className="py-2 opacity-70 font-normal uppercase tracking-widest text-[10px]">k-XOR</th>
                      <th className="py-2 opacity-70 font-normal uppercase tracking-widest text-[10px]">CRPs</th>
                      <th className="py-2 opacity-70 font-normal uppercase tracking-widest text-[10px] text-right">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRuns.map((run, idx) => {
                      const { color: labelColor } = getSecurityLabel(run.result.accuracy, run.config.xor_level);
                      return (
                        <tr key={run.id || idx} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-color-light)' }}>
                          <td className="py-3 font-mono opacity-80 text-xs">
                            {new Date(run.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-3 font-mono text-xs">{run.config.model_type.toUpperCase()}</td>
                          <td className="py-3 font-mono text-xs">{run.config.xor_level}</td>
                          <td className="py-3 font-mono text-xs">{run.config.num_samples.toLocaleString()}</td>
                          <td className="py-3 font-mono text-right font-bold" style={{ color: labelColor }}>
                            {formatAccuracy(run.result.accuracy)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}
        </div>
      )}

    </div>
  );
}