import { useEffect, useState, useRef } from 'react';
import { runExperiment, checkHealth } from "../lib/api";
import { cn, formatAccuracy, getSecurityLabel } from '../lib/utils';
import { ExperimentConfig, ExperimentResult, SimulationRun, ViewType } from '../types';
import { Cpu, Database, Network, Binary, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

interface SimulationProps {
  config: ExperimentConfig;
  onRunComplete: (run: SimulationRun | SimulationRun[]) => void;
  onViewChange: (v: ViewType) => void;
}

type Phase = 'IDLE' | 'GENERATING' | 'TRAINING' | 'EVALUATING' | 'DONE' | 'ERROR';

const PHASE_LABELS: Record<Phase, string> = {
  IDLE:       'Ready to run',
  GENERATING: 'Generating CRPs…',
  TRAINING:   'Training attack model…',
  EVALUATING: 'Evaluating accuracy…',
  DONE:       'Attack complete',
  ERROR:      'Experiment failed',
};

function AccuracyGauge({ accuracy }: { accuracy: number }) {
  const pct = accuracy * 100;
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - accuracy);
  const color =
    accuracy >= 0.95 ? '#f87171' :
    accuracy >= 0.8 ? '#fb923c' :
    accuracy >= 0.65 ? '#fbbf24' :
    '#34d399';

  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
        <text x="70" y="65" textAnchor="middle" fill={color} fontSize="22" fontWeight="700">
          {pct.toFixed(1)}%
        </text>
        <text x="70" y="84" textAnchor="middle" fill="#859399" fontSize="10">
          ACCURACY
        </text>
      </svg>
    </div>
  );
}

function AnimatedPipeline({ phase, config }: { phase: Phase, config: ExperimentConfig }) {
  const steps = [
    { id: 'GENERATING', label: 'PUF Hardware', icon: Cpu, desc: `${config.n_stages}-bit, ${config.xor_level}-XOR` },
    { id: 'TRAINING', label: 'CRP Dataset', icon: Database, desc: `${config.num_samples} Samples` },
    { id: 'EVALUATING', label: 'ML Model', icon: Network, desc: config.model_type.toUpperCase() }
  ];

  const phaseIndex = phase === 'IDLE' ? -1 : 
                     phase === 'GENERATING' ? 0 :
                     phase === 'TRAINING' ? 1 :
                     phase === 'EVALUATING' ? 2 : 3;

  return (
    <div className="flex flex-col items-center justify-center w-full py-12 relative overflow-hidden my-4 glass-panel rounded-xl">
      <div className="flex items-center justify-center w-full max-w-3xl relative z-10 px-4">
        {steps.map((step, idx) => {
          const isActive = phaseIndex === idx;
          const isComplete = phaseIndex > idx;
          
          const Icon = step.icon;
          
          return (
            <div key={step.id} className="flex items-center">
              {/* Node */}
              <div className={cn(
                "relative flex flex-col items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 transition-all duration-500 z-10",
                isActive ? "border-[var(--accent-primary)] bg-[var(--accent-primary-alpha-20)] shadow-[0_0_30px_rgba(76,214,255,0.3)] scale-110" :
                isComplete ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400" :
                "border-[var(--border-color-strong)] bg-black/20 text-[var(--text-muted)]"
              )}>
                <Icon className={cn("w-8 h-8 transition-all duration-500", isActive && "animate-pulse text-[var(--accent-primary)]", isComplete && "text-emerald-400")} />
                
                {/* Particles when active */}
                {isActive && (
                  <div className="absolute inset-0 rounded-2xl border border-[var(--accent-primary)] animate-ping opacity-20"></div>
                )}
              </div>
              
              {/* Connection Line */}
              {idx < steps.length - 1 && (
                <div className="w-10 sm:w-20 h-1 mx-2 sm:mx-4 rounded-full bg-[var(--border-color-strong)] relative overflow-hidden">
                  {(isActive || isComplete) && (
                    <div className={cn(
                      "absolute inset-y-0 left-0 bg-gradient-to-r",
                      isComplete ? "from-emerald-500/50 to-emerald-500/50 w-full" : "from-transparent via-[var(--accent-primary)] to-transparent w-[200%] animate-[slide_1s_linear_infinite]"
                    )}></div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      
      {/* Step details */}
      <div className="flex items-start justify-between w-full max-w-3xl mt-8 px-4 sm:px-8">
        {steps.map((step, idx) => {
          const isActive = phaseIndex === idx;
          const isComplete = phaseIndex > idx;
          return (
            <div key={`desc-${step.id}`} className="text-center w-20 sm:w-28 flex flex-col items-center">
              <div className={cn("text-xs sm:text-sm font-bold transition-colors duration-300", 
                isActive ? "text-[var(--accent-primary)] glow-text-primary" : isComplete ? "text-emerald-400" : "text-[var(--text-muted)]"
              )}>
                {step.label}
              </div>
              <div className={cn("text-[10px] sm:text-xs mt-1 transition-colors duration-300 font-mono",
                isActive ? "text-[var(--accent-primary)] opacity-80" : isComplete ? "text-emerald-400 opacity-60" : "text-[var(--text-muted)] opacity-50"
              )}>
                {step.desc}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Simulation({
  config,
  onRunComplete,
  onViewChange
}: SimulationProps) {

  const [phase, setPhase] = useState<Phase>('IDLE');
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [multiResults, setMultiResults] = useState<ExperimentResult[]>([]);
  const [finalRun, setFinalRun] = useState<SimulationRun | SimulationRun[] | null>(null);
  const [error, setError] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);
  
  const [liveData, setLiveData] = useState<{ epoch: number, accuracy: number }[]>([]);
  const liveDataRef = useRef<{ epoch: number, accuracy: number }[]>([]);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string) =>
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const startLiveSimulation = () => {
    setLiveData([]);
    liveDataRef.current = [];
    let epoch = 0;
    let currentAcc = 45 + Math.random() * 10;
    
    simulationIntervalRef.current = setInterval(() => {
      epoch += 10;
      currentAcc += (Math.random() - 0.4) * 2;
      currentAcc = Math.max(0, Math.min(100, currentAcc));
      
      liveDataRef.current = [...liveDataRef.current, { epoch, accuracy: currentAcc }];
      setLiveData(liveDataRef.current);
    }, 150);
  };

  const stopLiveSimulation = (finalAccuracy?: number) => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (finalAccuracy !== undefined) {
      const lastEpoch = liveDataRef.current.length > 0 ? liveDataRef.current[liveDataRef.current.length - 1].epoch : 0;
      liveDataRef.current = [...liveDataRef.current, { epoch: lastEpoch + 10, accuracy: finalAccuracy * 100 }];
      setLiveData(liveDataRef.current);
    }
  };

  const runAttack = async () => {
    setLog([]);
    setResult(null);
    setError('');

    try {
      addLog(`Initialising XOR Arbiter PUF (n=${config.n_stages}, k=${config.xor_level})`);
      setPhase('GENERATING');

      await new Promise(r => setTimeout(r, 500));

      addLog(`Generating ${config.num_samples} CRPs`);
      setPhase('TRAINING');
      startLiveSimulation();

      const uname = localStorage.getItem('puf_username') || undefined;

      if (config.model_type === 'all') {
        const models = ['lr', 'mlp', 'svm', 'rf'];
        const currentResults: ExperimentResult[] = [];
        const currentRuns: SimulationRun[] = [];
        for (const m of models) {
          addLog(`Training ${m.toUpperCase()}...`);
          const res = await runExperiment({ ...config, model_type: m as any, username: uname });
          const safeRes = {
            accuracy: res?.accuracy ?? 0,
            timestamp: res?.timestamp ?? new Date().toISOString(),
            ...res
          };
          currentResults.push(safeRes);
          setMultiResults([...currentResults]);
          
          const run: SimulationRun = {
            id: Date.now().toString() + Math.random(),
            timestamp: safeRes.timestamp,
            config: { ...config, model_type: m as any },
            result: safeRes,
            status: 'COMPLETE',
          };
          currentRuns.push(run);
        }
        stopLiveSimulation();
        setPhase('DONE');
        setFinalRun(currentRuns);
      } else {
        const res = await runExperiment({ ...config, username: uname });
        console.log("API RESPONSE:", res);
        const safeRes = {
          accuracy: res?.accuracy ?? 0,
          timestamp: res?.timestamp ?? new Date().toISOString(),
          ...res
        };

        setResult(safeRes);

        stopLiveSimulation(safeRes.accuracy);
        setPhase('EVALUATING');
        await new Promise(r => setTimeout(r, 2500));

        setResult(res);
        setPhase('DONE');

        addLog(`Accuracy: ${formatAccuracy(res.accuracy)}`);

        const run: SimulationRun = {
          id: Date.now().toString(),
          timestamp: res.timestamp,
          config,
          result: res,
          status: 'COMPLETE',
        };

        setFinalRun(run);
      }

    } catch (e: any) {
      stopLiveSimulation();
      setPhase('ERROR');
      setError(e.message);
      addLog(`ERROR: ${e.message}`);
    }
  };

  const hasRun = useRef(false);

  // ✅ AUTO RUN WHEN PAGE LOADS
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    
    checkHealth().then(isOnline => {
      if (isOnline) {
        runAttack();
      } else {
        addLog("⚠ Backend offline. Start backend first.");
      }
    });
  }, []);

  const { label: secLabel, color: secColor } =
    result
      ? getSecurityLabel(result.accuracy, config.xor_level)
      : { label: '', color: '' };

  return (
    <div className="space-y-6 text-[var(--text-body)]">

      <div className="text-center text-sm font-semibold opacity-70 tracking-widest uppercase">
        {PHASE_LABELS[phase]}
      </div>

      <div className="text-center">
        {phase === 'ERROR' ? (
          <div className="text-[var(--color-error)] font-semibold flex items-center justify-center gap-2 glass-panel p-6 rounded-xl">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <AnimatedPipeline phase={phase} config={config} />
            
            {(phase === 'TRAINING' || phase === 'EVALUATING' || phase === 'DONE') && (
              <div className="glass-panel p-6 rounded-xl animate-in fade-in zoom-in duration-500 flex flex-col relative">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-[var(--text-headline)] flex items-center gap-2">
                    <Activity className={cn("w-4 h-4 text-[var(--accent-primary)]", phase !== 'DONE' && "animate-pulse")} />
                    {phase === 'DONE' ? 'Training Complete' : 'Live Training Progress'}
                  </h3>
                  <span className="font-mono text-xs opacity-70 bg-black/20 px-2 py-1 rounded">
                    {phase === 'EVALUATING' ? 'Converging...' : phase === 'DONE' ? 'Done' : `Epoch ${liveData.length * 10}`}
                  </span>
                </div>
                
                <div className="w-full h-[220px] mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-medium)" vertical={false} />
                      <XAxis dataKey="epoch" tick={{fontSize: 10, fill: 'var(--text-muted)'}} stroke="var(--border-medium)" axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: 'var(--text-muted)'}} stroke="var(--border-medium)" axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', borderColor: 'var(--border-color)', borderRadius: '8px', fontSize: '12px' }}
                        itemStyle={{ color: 'var(--accent-primary)' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="accuracy" 
                        stroke="var(--accent-primary)" 
                        strokeWidth={3} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {phase === 'DONE' && finalRun && (
                  <div className="mt-4 flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <button
                      onClick={() => onRunComplete(finalRun)}
                      className="px-8 py-3 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-dark)] text-[var(--on-accent-primary)] font-bold rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2"
                    >
                      View Results →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="glass-panel p-4 text-xs font-mono h-40 overflow-y-auto rounded-xl border border-[var(--border-color)]">
        {log.length === 0
          ? <span className="text-[var(--text-muted)]">Awaiting experiment...</span>
          : log.map((l, i) => <div key={i} className="text-[var(--text-body)] opacity-80 mb-1">{l}</div>)
        }
      </div>

    </div>
  );
}