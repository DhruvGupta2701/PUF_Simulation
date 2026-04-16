import { useEffect, useState, useRef } from 'react';
import { runExperiment, checkHealth } from "../lib/api";
import { cn, formatAccuracy, getSecurityLabel } from '../lib/utils';
import { ExperimentConfig, ExperimentResult, SimulationRun, ViewType } from '../types';

interface SimulationProps {
  config: ExperimentConfig;
  onRunComplete: (run: SimulationRun) => void;
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

export default function Simulation({
  config,
  onRunComplete,
  onViewChange
}: SimulationProps) {

  const [phase, setPhase] = useState<Phase>('IDLE');
  const [result, setResult] = useState<ExperimentResult | null>(null);
  const [error, setError] = useState<string>('');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) =>
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

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

      const res = await runExperiment(config);
      console.log("API RESPONSE:", res);
      const safeRes = {
        accuracy: res?.accuracy ?? 0,
        timestamp: res?.timestamp ?? new Date().toISOString(),
        ...res
      };

      setResult(safeRes);

      setPhase('EVALUATING');
      await new Promise(r => setTimeout(r, 300));

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

      onRunComplete(run);

    } catch (e: any) {
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
    <div className="space-y-6 text-white">

      <div className="text-center text-sm opacity-70">
        {PHASE_LABELS[phase]}
      </div>

      {result && phase === 'DONE' ? (
        <div className="flex flex-col items-center gap-4">
          <AccuracyGauge accuracy={result.accuracy} />

          <div className={cn("text-lg font-bold", secColor)}>
            {secLabel}
          </div>

          <button
            onClick={() => onViewChange('RESULTS')}
            className="px-4 py-2 bg-blue-500 rounded"
          >
            View Results →
          </button>
        </div>
      ) : (
        <div className="text-center">
          {phase === 'ERROR' && (
            <div className="text-red-400">{error}</div>
          )}
        </div>
      )}

      <div className="bg-black p-4 text-xs font-mono h-40 overflow-y-auto">
        {log.length === 0
          ? "Awaiting experiment..."
          : log.map((l, i) => <div key={i}>{l}</div>)
        }
      </div>

    </div>
  );
}