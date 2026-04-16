import { cn } from '../lib/utils';
import { ExperimentConfig, ViewType } from '../types';

interface ConfigurationProps {
  config: ExperimentConfig;
  setConfig: (c: ExperimentConfig) => void;
  onViewChange: (v: ViewType) => void;
}

interface SliderProps {
  label: string;
  description: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  accent?: string;
}

function Slider({ label, description, value, min, max, step, format, onChange, accent = 'var(--accent-primary)' }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-baseline">
        <div>
          <span className="text-sm font-medium" style={{ color: 'var(--text-headline)' }}>{label}</span>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        </div>
        <span className="font-mono text-sm font-semibold" style={{ color: accent }}>
          {format ? format(value) : value}
        </span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: 'var(--border-color-strong)' }}>
        <div className="absolute left-0 top-0 h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}88, ${accent})` }} />
        <input
          type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 shadow-lg transition-all"
          style={{ left: `calc(${pct}% - 8px)`, background: 'var(--bg-main)', borderColor: accent, boxShadow: `0 0 8px ${accent}66` }} />
      </div>
      <div className="flex justify-between text-[10px] font-mono" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
        <span>{format ? format(min) : min}</span>
        <span>{format ? format(max) : max}</span>
      </div>
    </div>
  );
}

const PRESETS = [
  { label: 'Simple (1-XOR)', desc: 'Trivially broken', config: { n_stages: 32, xor_level: 1, noise: 0.0, num_samples: 5000, seed: 42, model_type: 'lr' as const } },
  { label: 'Standard (2-XOR)', desc: 'LR attack feasible', config: { n_stages: 64, xor_level: 2, noise: 0.0, num_samples: 10000, seed: 42, model_type: 'lr' as const } },
  { label: 'Noisy (3-XOR)', desc: 'Needs MLP', config: { n_stages: 64, xor_level: 3, noise: 0.1, num_samples: 50000, seed: 42, model_type: 'mlp' as const } },
  { label: 'Hardened (4-XOR)', desc: 'Highly resistant', config: { n_stages: 128, xor_level: 4, noise: 0.2, num_samples: 100000, seed: 42, model_type: 'mlp' as const } },
];

export default function Configuration({ config, setConfig, onViewChange }: ConfigurationProps) {
  const set = (key: keyof ExperimentConfig) => (v: any) => setConfig({ ...config, [key]: v });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Presets */}
      <div className="rounded-xl p-6" style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}>
        <h3 className="font-headline text-sm font-semibold mb-4" style={{ color: 'var(--text-headline)' }}>Quick Presets</h3>
        <div className="grid grid-cols-4 gap-3">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setConfig(p.config)}
              className={cn('px-4 py-3 rounded-lg text-left transition-all duration-200 hover:scale-[1.02]',
                JSON.stringify(config) === JSON.stringify(p.config)
                  ? 'border-[#4cd6ff]' : 'border-white/10 hover:border-white/20')}
              style={{ background: 'var(--bg-header-light)', border: `1px solid ${JSON.stringify(config) === JSON.stringify(p.config) ? '#4cd6ff40' : 'var(--border-color-strong)'}` }}>
              <div className="text-xs font-semibold" style={{ color: 'var(--text-headline)' }}>{p.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">

        {/* PUF Architecture */}
        <div className="rounded-xl p-6 space-y-6" style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}>
          <div>
            <h3 className="font-headline text-sm font-semibold" style={{ color: 'var(--text-headline)' }}>PUF Architecture</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Physical device parameters</p>
          </div>
          <Slider label="Delay Stages" description="Challenge bit-length (n)" value={config.n_stages} min={8} max={256} step={8} onChange={set('n_stages')} accent="#4cd6ff" />
          <Slider label="XOR Level (k)" description="Number of chained arbiters" value={config.xor_level} min={1} max={8} step={1} onChange={set('xor_level')} accent="#dab9ff" />
          <Slider label="Noise σ" description="Gaussian noise per arbiter query" value={config.noise} min={0} max={1} step={0.01} format={v => v.toFixed(2)} onChange={set('noise')} accent="#45f4df" />
        </div>

        {/* Experiment Settings */}
        <div className="rounded-xl p-6 space-y-6" style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}>
          <div>
            <h3 className="font-headline text-sm font-semibold" style={{ color: 'var(--text-headline)' }}>Experiment Settings</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Dataset and ML parameters</p>
          </div>
          <Slider label="CRP Count" description="Challenge-Response Pairs to generate" value={config.num_samples} min={100} max={200000} step={100} format={v => v.toLocaleString()} onChange={set('num_samples')} accent="#4cd6ff" />
          <Slider label="Random Seed" description="Master RNG seed for reproducibility" value={config.seed} min={0} max={9999} step={1} onChange={set('seed')} accent="#dab9ff" />

          {/* Model type */}
          <div>
            <span className="text-sm font-medium" style={{ color: 'var(--text-headline)' }}>Attack Model</span>
            <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--text-muted)' }}>ML classifier for CRP prediction</p>
            <div className="grid grid-cols-2 gap-2">
              {([['lr', 'Logistic Regression', 'Fast, linear model. Effective up to k=2.'], ['mlp', 'Neural Network (MLP)', 'Non-linear, handles k≥3 well.']] as const).map(([val, name, desc]) => (
                <button key={val} onClick={() => set('model_type')(val)}
                  className="p-3 rounded-lg text-left transition-all duration-200"
                  style={{
                    background: config.model_type === val ? 'var(--accent-primary-alpha-8)' : 'var(--bg-header-light)',
                    border: `1px solid ${config.model_type === val ? 'rgba(76,214,255,0.4)' : 'var(--border-color-strong)'}`,
                  }}>
                  <div className="text-xs font-semibold" style={{ color: config.model_type === val ? 'var(--accent-primary)' : 'var(--text-headline)' }}>{name}</div>
                  <div className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary + proceed */}
      <div className="rounded-xl p-6 flex items-center justify-between"
        style={{ background: 'rgba(76,214,255,0.05)', border: '1px solid rgba(76,214,255,0.15)' }}>
        <div className="flex gap-8">
          {[
            ['Stages', config.n_stages],
            ['XOR k', config.xor_level],
            ['Noise', config.noise.toFixed(2)],
            ['CRPs', config.num_samples.toLocaleString()],
            ['Model', config.model_type.toUpperCase()],
            ['Seed', config.seed],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <div className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{k}</div>
              <div className="text-sm font-semibold font-mono" style={{ color: 'var(--accent-primary)' }}>{v}</div>
            </div>
          ))}
        </div>
        <button onClick={() => onViewChange('SIMULATION')}
          className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #4cd6ff, #00a8cc)', color: 'var(--on-accent-primary)', boxShadow: '0 0 16px rgba(76,214,255,0.25)' }}>
          Run Attack →
        </button>
      </div>
    </div>
  );
}
