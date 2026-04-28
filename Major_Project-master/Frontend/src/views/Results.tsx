import { useState, useEffect } from 'react';
import { formatAccuracy, getSecurityLabel } from '../lib/utils';
import { SimulationRun } from '../types';
import ReportModal from '../components/ReportModal';
import CompareModal from '../components/CompareModal';
import { FileText, Layers, Activity, Database, Cpu, Zap, Search, Filter, Edit2, Check, X, CheckSquare, BarChart2, Trash2, Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { renameSession, deleteSession } from '../lib/api';

// A refined and professional SVG semi-circle solid gauge meter
const GaugeMeter = ({ accuracy }: { accuracy: number }) => {
  const [animatedAcc, setAnimatedAcc] = useState(0);

  useEffect(() => {
    // Trigger animation after mount
    const timeout = setTimeout(() => setAnimatedAcc(accuracy), 100);
    return () => clearTimeout(timeout);
  }, [accuracy]);

  const radius = 90;
  const cx = 150;
  const cy = 140;
  const circumference = Math.PI * radius;
  const normalizedAcc = Math.max(0, Math.min(1, animatedAcc));
  const strokeDashoffset = circumference - (normalizedAcc * circumference);

  const { color, label } = getSecurityLabel(accuracy, 0);

  const getShieldIcon = () => {
    if (label === 'COMPROMISED' || label === 'VULNERABLE') return <ShieldAlert size={14} />;
    if (label === 'RESISTANT') return <ShieldCheck size={14} />;
    return <Shield size={14} />;
  };

  return (
    <div className="relative flex flex-col items-center justify-center mt-4 mb-4">
      <svg width="300" height="160" viewBox="0 0 300 160" className="overflow-visible drop-shadow-[0_10px_15px_rgba(0,0,0,0.3)]">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>

        {/* Background Track - Solid */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="var(--bg-panel-light, #21262d)"
          strokeWidth="30"
          strokeLinecap="round"
        />

        {/* Colored Gradient Track */}
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="30"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />

        {/* Tick Separators and Labels */}
        {[0, 25, 50, 75, 100].map(tick => {
          const t = tick / 100;
          const angle = -Math.PI + t * Math.PI;
          
          // Tick separators
          const innerR = radius - 16;
          const outerR = radius + 16;
          const x1 = cx + innerR * Math.cos(angle);
          const y1 = cy + innerR * Math.sin(angle);
          const x2 = cx + outerR * Math.cos(angle);
          const y2 = cy + outerR * Math.sin(angle);
          
          // Outer text labels
          const textR = radius + 32;
          const textX = cx + textR * Math.cos(angle);
          const textY = cy + textR * Math.sin(angle) + (t === 0.5 ? -2 : 0);
          
          return (
            <g key={tick}>
              {tick > 0 && tick < 100 && (
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--bg-panel, #161b22)" strokeWidth="4" />
              )}
              <text x={textX} y={textY} fill="var(--text-muted)" fontSize="13" fontWeight="600" textAnchor="middle" dominantBaseline="middle">
                {tick}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <g 
          transform={`rotate(${-180 + (normalizedAcc * 180)} ${cx} ${cy})`} 
          className="transition-transform duration-1000 ease-out drop-shadow-xl"
        >
          {/* Base tail */}
          <path d={`M ${cx} ${cy - 4} L ${cx - 18} ${cy - 2} A 2 2 0 0 0 ${cx - 18} ${cy + 2} L ${cx} ${cy + 4} Z`} fill="#9ca3af" />
          
          {/* Needle body */}
          <path d={`M ${cx} ${cy - 4} L ${cx + radius - 5} ${cy - 1.5} A 1.5 1.5 0 0 1 ${cx + radius - 5} ${cy + 1.5} L ${cx} ${cy + 4} Z`} fill="#9ca3af" />
          
          {/* Pivot Base */}
          <circle cx={cx} cy={cy} r="8" fill="#9ca3af" />
          <circle cx={cx} cy={cy} r="3" fill="#1f2937" />
        </g>
      </svg>
      
      {/* Value and Badge moved below so they don't overlap the needle */}
      <div className="flex flex-col items-center mt-2 z-10">
        <span className="text-4xl font-mono font-extrabold tracking-tighter tabular-nums drop-shadow-lg" style={{ color, textShadow: `0 0 15px ${color}60` }}>
          {formatAccuracy(animatedAcc)}
        </span>
        
        <div className="mt-2 flex items-center gap-1.5 px-4 py-1.5 rounded-full shadow-inner font-bold tracking-widest text-[11px] uppercase border backdrop-blur-sm transition-all duration-500" 
              style={{ color, backgroundColor: `${color}15`, borderColor: `${color}40` }}>
          {getShieldIcon()}
          {label}
        </div>
      </div>
    </div>
  );
};

const MultiGaugeMeter = ({ results }: { results: any[] }) => {
  const [animatedAccs, setAnimatedAccs] = useState<number[]>(results.map(() => 0));

  useEffect(() => {
    const timeout = setTimeout(() => {
      setAnimatedAccs(results.map(r => r.accuracy));
    }, 100);
    return () => clearTimeout(timeout);
  }, [results]);

  const colors = ['#0ea5e9', '#10b981', '#eab308', '#ec4899']; // blue, green, yellow, pink
  const center = 150;
  const baseRadius = 110;
  const strokeWidth = 18;
  const gap = 24;

  return (
    <div className="flex flex-col items-center mt-4 mb-4">
      <div className="relative">
        <svg width="300" height="300" viewBox="0 0 300 300" className="overflow-visible drop-shadow-[0_10px_20px_rgba(0,0,0,0.4)]">
          {results.map((r, i) => {
            const radius = baseRadius - (i * gap);
            const circumference = 2 * Math.PI * radius;
            const pct = Math.max(0, Math.min(1, animatedAccs[i] || 0));
            const offset = circumference - (pct * circumference);
            const color = colors[i % colors.length];

            return (
              <g key={i}>
                <circle
                  cx={center} cy={center} r={radius}
                  fill="none" stroke={color} strokeWidth={strokeWidth}
                  className="opacity-15"
                />
                <circle
                  cx={center} cy={center} r={radius}
                  fill="none" stroke={color} strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${center} ${center})`}
                  className="transition-all duration-1000 ease-out"
                  style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
                />
              </g>
            );
          })}
        </svg>
      </div>
      
      <div className="flex flex-wrap justify-center gap-4 mt-6 text-[11px] font-bold tracking-wider uppercase font-mono">
        {results.map((r, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all hover:scale-105" style={{ backgroundColor: `${colors[i % colors.length]}15`, color: colors[i % colors.length], border: `1px solid ${colors[i % colors.length]}40` }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[i % colors.length], boxShadow: `0 0 8px ${colors[i % colors.length]}` }} />
            {r.model_type}: {formatAccuracy(animatedAccs[i] || 0)}
          </div>
        ))}
      </div>
    </div>
  );
};

const SpeedometerGauge = ({
  value, min, max, label, unit = '', ticks = []
}: {
  value: number; min: number; max: number; label: string; unit?: string; ticks?: number[]
}) => {
  const [animVal, setAnimVal] = useState(min);
  
  useEffect(() => {
    const t = setTimeout(() => setAnimVal(value), 100);
    return () => clearTimeout(t);
  }, [value]);

  const pct = Math.max(0, Math.min(1, (animVal - min) / (max - min)));
  const angle = -90 + (pct * 180);

  const cx = 100;
  const cy = 110;
  const r = 70;
  
  const gradId = `grad-${label.replace(/\s+/g, '')}`;

  return (
    <div className="flex flex-col items-center justify-start p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-medium)] shadow-sm w-full h-[180px] relative hover:border-[var(--border-strong)] transition-all">
      <div className="text-[11px] opacity-90 mb-0 uppercase tracking-widest font-bold text-[var(--text-headline)]">{label}</div>
      <svg width="100%" height="100%" viewBox="0 0 200 130" className="overflow-visible mt-2">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="60%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#f87171" />
          </linearGradient>
        </defs>
        
        {/* Track */}
        <path 
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`} 
          fill="none" 
          stroke={`url(#${gradId})`} 
          strokeWidth="12" 
          strokeLinecap="butt" 
        />
        
        {/* Ticks and Labels */}
        {ticks.map(tick => {
          const tPct = (tick - min) / (max - min);
          const tAngle = -Math.PI + (tPct * Math.PI);
          const tx1 = cx + (r - 6) * Math.cos(tAngle);
          const ty1 = cy + (r - 6) * Math.sin(tAngle);
          const tx2 = cx + (r + 6) * Math.cos(tAngle);
          const ty2 = cy + (r + 6) * Math.sin(tAngle);
          
          const lx = cx + (r + 18) * Math.cos(tAngle);
          const ly = cy + (r + 18) * Math.sin(tAngle) + (tAngle > -Math.PI/2 ? 3 : 0);
          
          return (
            <g key={tick}>
              <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="var(--bg-app)" strokeWidth="2" />
              <text x={lx} y={ly} fill="var(--text-muted)" fontSize="9" fontWeight="bold" textAnchor="middle" dominantBaseline="middle">
                {tick}
              </text>
            </g>
          );
        })}

        {/* Needle */}
        <g transform={`rotate(${angle} ${cx} ${cy})`} className="transition-all duration-1000 ease-out">
          <polygon points={`${cx - 3},${cy} ${cx + 3},${cy} ${cx},${cy - r + 8}`} fill="#94a3b8" />
          <circle cx={cx} cy={cy} r="5" fill="#475569" />
        </g>
      </svg>
      <div className="font-mono text-sm font-bold text-[var(--text-headline)] mt-auto pt-2 absolute bottom-4 left-1/2 transform -translate-x-1/2">
        {animVal} <span className="text-[10px] text-[var(--text-muted)] font-sans ml-0.5">{unit}</span>
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
  const [filterModel, setFilterModel] = useState<'ALL'|'lr'|'mlp'|'svm'|'rf'>('ALL');
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
               style={{ backgroundImage: `linear-gradient(to bottom, ${Array.isArray(result) ? '#0891b2' : color}, transparent)` }} />
               
          <h2 className="text-xl font-bold mb-2 flex items-center justify-center gap-2 relative z-10">
            {Array.isArray(result) ? 'Comparison Results' : 'Attack Results'}
          </h2>

          {Array.isArray(result) ? (
            <MultiGaugeMeter results={result} />
          ) : (
            <GaugeMeter accuracy={accuracy} />
          )}
          
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
            <SpeedometerGauge 
              label="Stages" 
              value={Array.isArray(result) ? result[0]?.n_stages : result?.n_stages} 
              min={0} max={128} 
              ticks={[0, 32, 64, 96, 128]} 
            />
            
            <SpeedometerGauge 
              label="XOR Level" 
              value={Array.isArray(result) ? result[0]?.xor_level : result?.xor_level} 
              min={0} max={10} 
              ticks={[0, 2, 4, 6, 8, 10]} 
            />

            <SpeedometerGauge 
              label="Noise" 
              value={Array.isArray(result) ? result[0]?.noise : result?.noise} 
              min={0} max={0.5} 
              ticks={[0, 0.1, 0.2, 0.3, 0.4, 0.5]} 
            />

            <SpeedometerGauge 
              label="CRPs" 
              value={Array.isArray(result) ? result[0]?.num_samples : result?.num_samples} 
              min={0} max={10000} 
              ticks={[0, 2500, 5000, 7500, 10000]} 
            />

            <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-medium)] hover:border-[var(--border-strong)] transition-all shadow-sm h-[180px]">
              <Cpu className="mb-4 text-[var(--text-muted)]" size={32} />
              <span className="text-[11px] opacity-80 mb-2 uppercase tracking-widest font-bold text-[var(--text-headline)]">Model</span>
              <span className="font-mono text-lg font-bold text-[var(--text-headline)] uppercase mt-2">{Array.isArray(result) ? '4 MODELS' : result?.model_type}</span>
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
                    <option value="svm">SVM</option>
                    <option value="rf">Random Forest</option>
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
                          <td className="py-3 w-48">
                            <div className="flex items-center justify-end gap-3">
                              <div className="flex-1 bg-[var(--bg-app)] h-3 rounded-full overflow-hidden border border-white/10 relative shadow-inner">
                                <div 
                                  className="h-full rounded-full transition-all duration-1000 ease-out" 
                                  style={{ 
                                    width: `${run.result.accuracy * 100}%`, 
                                    backgroundColor: labelColor, 
                                    boxShadow: `0 0 8px ${labelColor}80` 
                                  }} 
                                />
                              </div>
                              <span className="font-mono text-right font-bold w-14 text-xs" style={{ color: labelColor }}>
                                {formatAccuracy(run.result.accuracy)}
                              </span>
                            </div>
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