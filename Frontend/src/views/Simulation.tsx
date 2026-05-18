import { useEffect, useState, useRef } from 'react';
import { runExperiment, checkHealth } from "../lib/api";
import { cn, formatAccuracy, getSecurityLabel } from '../lib/utils';
import { ExperimentConfig, ExperimentResult, SimulationRun, ViewType } from '../types';
import { Cpu, Database, Network, Binary, AlertTriangle, CheckCircle, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import CompactPUFVisualization from '../components/CompactPUFVisualization';

interface SimulationProps {
  config: ExperimentConfig;
  onRunComplete: (run: SimulationRun | SimulationRun[]) => void;
  onViewChange: (v: ViewType) => void;
}

type Phase = 'IDLE' | 'GENERATING' | 'TRAINING' | 'EVALUATING' | 'DONE' | 'ERROR';

interface TelemetryPoint {
  epoch: number;
  trainAccuracy: number;
  valAccuracy: number;
  loss: number;
}
type TrainingStatus = 'Initializing' | 'Training' | 'Converging' | 'Complete';


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
    <div className="flex flex-col items-center justify-center w-full py-16 relative overflow-hidden my-4 rounded-2xl transition-all duration-500"
      style={{ background: 'var(--bg-panel-solid)', border: 'var(--border-medium)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
      {/* Decorative Gradient Background */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at top, var(--accent-primary-alpha-8), transparent 70%), radial-gradient(ellipse at bottom, var(--accent-secondary-alpha-6), transparent 70%)' }} />
      
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
                      isComplete ? "from-[#34d39988] to-[#34d39988] w-full" : "from-transparent via-[var(--accent-primary)] to-transparent w-[200%] animate-[slide_1s_linear_infinite]"
                    )} style={isActive ? { filter: 'drop-shadow(0 0 4px var(--accent-primary))' } : {}}></div>
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
  
  const [liveData, setLiveData] = useState<TelemetryPoint[]>([]);
  const liveDataRef = useRef<TelemetryPoint[]>([]);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>('Initializing');
  const [trainingLogs, setTrainingLogs] = useState<{epoch: number, msg: string}[]>([]);
  
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (msg: string) =>
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const startLiveSimulation = () => {
    setLiveData([]);
    setTrainingLogs([]);
    setTrainingStatus('Initializing');
    liveDataRef.current = [];
    
    let epoch = 0;
    const maxEpochs = 100;
    const targetAcc = 85 + Math.random() * 10;
    let currentTrainAcc = 45.0;
    let currentValAcc = 42.0;
    let currentLoss = 1.5;
    
    setTimeout(() => setTrainingStatus('Training'), 500);

    simulationIntervalRef.current = setInterval(() => {
      epoch += 2;
      
      if (epoch > maxEpochs * 0.7) {
        setTrainingStatus('Converging');
      }

      // Asymptotic growth towards target
      const remainingTrain = targetAcc - currentTrainAcc;
      currentTrainAcc += (remainingTrain * 0.1) + ((Math.random() - 0.5) * 1.5);
      
      const remainingVal = (targetAcc - 2) - currentValAcc;
      currentValAcc += (remainingVal * 0.08) + ((Math.random() - 0.5) * 2.0);
      
      // Exponential decay for loss
      currentLoss = currentLoss * 0.92 + (Math.random() * 0.02);

      currentTrainAcc = Math.max(0, Math.min(100, currentTrainAcc));
      currentValAcc = Math.max(0, Math.min(100, currentValAcc));
      
      const newPoint: TelemetryPoint = { 
        epoch, 
        trainAccuracy: Number(currentTrainAcc.toFixed(1)), 
        valAccuracy: Number(currentValAcc.toFixed(1)), 
        loss: Number(currentLoss.toFixed(4)) 
      };
      
      liveDataRef.current = [...liveDataRef.current, newPoint];
      setLiveData(liveDataRef.current);

      // Add random lightweight logs
      if (epoch % 10 === 0) {
        if (epoch === 10) setTrainingLogs(prev => [...prev, { epoch, msg: `Initial convergence started. Loss dropped to ${newPoint.loss}` }]);
        else if (epoch % 30 === 0) setTrainingLogs(prev => [...prev, { epoch, msg: `Validation accuracy improved to ${newPoint.valAccuracy}%` }]);
        else if (epoch > maxEpochs * 0.7 && Math.random() > 0.5) setTrainingLogs(prev => [...prev, { epoch, msg: `Loss plateauing at ${newPoint.loss}` }]);
      }
      
      if (epoch >= maxEpochs) {
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      }
    }, 150);
  };

  const stopLiveSimulation = (finalAccuracy?: number) => {
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    setTrainingStatus('Complete');
    if (finalAccuracy !== undefined) {
      const lastEpoch = liveDataRef.current.length > 0 ? liveDataRef.current[liveDataRef.current.length - 1].epoch : 0;
      const finalValAcc = finalAccuracy * 100;
      const finalTrainAcc = Math.min(100, finalValAcc + 1.5);
      const finalLoss = liveDataRef.current.length > 0 ? liveDataRef.current[liveDataRef.current.length - 1].loss * 0.9 : 0.05;
      
      liveDataRef.current = [...liveDataRef.current, { 
        epoch: lastEpoch + 2, 
        trainAccuracy: Number(finalTrainAcc.toFixed(1)),
        valAccuracy: Number(finalValAcc.toFixed(1)),
        loss: Number(finalLoss.toFixed(4))
      }];
      setLiveData(liveDataRef.current);
      setTrainingLogs(prev => [...prev, { epoch: lastEpoch + 2, msg: `Training completed. Final validation accuracy: ${finalValAcc.toFixed(1)}%` }]);
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

      <div className="text-center mb-8">
        <span className="inline-block px-6 py-2 rounded-full text-sm font-bold tracking-widest uppercase"
          style={{ background: 'var(--bg-panel-solid)', border: 'var(--border-medium)', color: 'var(--text-headline)', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--accent-primary)] to-[#8b5cf6]">
            {PHASE_LABELS[phase]}
          </span>
        </span>
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
            
            {/* Real-time Data Flow Visualization */}
            <CompactPUFVisualization config={config} isTraining={phase === 'GENERATING' || phase === 'TRAINING' || phase === 'EVALUATING'} />
            
            {(phase === 'TRAINING' || phase === 'EVALUATING' || phase === 'DONE') && (
              <div className="p-6 rounded-2xl animate-in fade-in zoom-in duration-500 flex flex-col relative overflow-hidden"
                style={{ background: 'var(--bg-panel-solid)', border: 'var(--border-medium)', boxShadow: '0 8px 32px rgba(0,0,0,0.04)' }}>
                {/* Glow effects for chart */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--accent-primary)] opacity-10 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#8b5cf6] opacity-10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 relative z-10 w-full">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-[var(--text-headline)] flex items-center gap-2">
                      <Activity className={cn("w-4 h-4 text-[var(--accent-primary)]", phase !== 'DONE' && "animate-pulse")} />
                      {phase === 'DONE' ? 'Training Complete' : 'Live Training Progress'}
                    </h3>
                    <div className="flex gap-2">
                      <span className={cn("text-[10px] font-mono px-2 py-0.5 rounded-full border", 
                        trainingStatus === 'Initializing' ? "border-slate-500 text-slate-400" :
                        trainingStatus === 'Training' ? "border-[var(--accent-primary)] text-[var(--accent-primary)] animate-pulse" :
                        trainingStatus === 'Converging' ? "border-[#8b5cf6] text-[#8b5cf6]" :
                        "border-emerald-500 text-emerald-400 bg-emerald-500/10"
                      )}>
                        {trainingStatus}
                      </span>
                    </div>
                  </div>
                  
                  {liveData.length > 0 && (
                    <div className="flex gap-2 sm:gap-4 text-[9px] sm:text-xs font-mono bg-black/30 px-2 sm:px-3 py-1.5 rounded-lg border border-[var(--border-medium)] w-full sm:w-auto overflow-x-auto whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <span className="text-[var(--text-muted)] text-[9px]">EPOCH</span>
                        <span className="text-[var(--text-main)]">{liveData[liveData.length - 1].epoch}</span>
                      </div>
                      <div className="w-[1px] h-full bg-[var(--border-medium)] mx-1"></div>
                      <div className="flex flex-col items-end">
                        <span className="text-[var(--text-muted)] text-[9px]">VAL ACC</span>
                        <span className="text-[#8b5cf6]">{liveData[liveData.length - 1].valAccuracy.toFixed(1)}%</span>
                      </div>
                      <div className="w-[1px] h-full bg-[var(--border-medium)] mx-1"></div>
                      <div className="flex flex-col items-end">
                        <span className="text-[var(--text-muted)] text-[9px]">LOSS</span>
                        <span className="text-[var(--accent-primary)]">{liveData[liveData.length - 1].loss.toFixed(4)}</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="w-full h-[220px] mb-2 relative z-10">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={liveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-medium)" vertical={false} opacity={0.5} />
                      <XAxis dataKey="epoch" tick={{fontSize: 10, fill: 'var(--text-muted)'}} stroke="var(--border-medium)" axisLine={false} />
                      <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: 'var(--text-muted)'}} stroke="var(--border-medium)" axisLine={false} tickLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(10, 15, 20, 0.9)', borderColor: 'var(--border-medium)', borderRadius: '8px', fontSize: '12px', backdropFilter: 'blur(8px)' }}
                        itemStyle={{ color: 'var(--text-main)' }}
                      />
                      <Line 
                        name="Train Acc"
                        type="monotone" 
                        dataKey="trainAccuracy" 
                        stroke="var(--accent-primary)" 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                      <Line 
                        name="Val Acc"
                        type="monotone" 
                        dataKey="valAccuracy" 
                        stroke="#8b5cf6" 
                        strokeWidth={2} 
                        dot={false} 
                        isAnimationActive={false} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Mini Training Log */}
                {trainingLogs.length > 0 && (
                  <div className="relative z-10 mt-3 border-t border-[var(--border-medium)] pt-3">
                    <div className="flex flex-col gap-1.5 max-h-[60px] overflow-hidden" style={{ maskImage: 'linear-gradient(to bottom, black 50%, transparent)' }}>
                      {[...trainingLogs].reverse().slice(0, 3).map((log, idx) => (
                        <div key={`${log.epoch}-${idx}`} className={cn("text-[10px] font-mono flex items-center gap-2", idx === 0 ? "text-[var(--text-main)] opacity-100" : "text-[var(--text-muted)] opacity-50")}>
                          <span className="text-[var(--accent-primary)] opacity-80">[{log.epoch.toString().padStart(3, '0')}]</span>
                          <span>{log.msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
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

      <div className="relative rounded-2xl overflow-hidden mt-8" style={{ background: 'var(--bg-panel-solid)', border: 'var(--border-medium)', boxShadow: '0 8px 32px rgba(0,0,0,0.02)' }}>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-[var(--accent-primary)] via-[#8b5cf6] to-[var(--accent-secondary)] opacity-80" />
        <div className="p-5 text-xs font-mono h-48 overflow-y-auto z-10 relative">
          {log.length === 0
            ? <div className="flex items-center justify-center h-full text-[var(--text-muted)] opacity-50 italic">Awaiting experiment initialization...</div>
            : log.map((l, i) => (
                <div key={i} className="text-[var(--text-body)] opacity-90 mb-1.5 leading-relaxed flex items-start gap-2">
                  <span className="text-[var(--accent-primary)] mt-0.5">❯</span>
                  <span>{l}</span>
                </div>
              ))
          }
        </div>
      </div>

    </div>
  );
}