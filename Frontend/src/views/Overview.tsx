import { ViewType, SimulationRun } from '../types';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

interface OverviewProps {
  onStartNewSession: () => void;
  history?: SimulationRun[];
}

const CARDS = [
  {
    icon: '⬡',
    title: 'Physical Unclonable Function',
    body: 'PUFs exploit manufacturing variations to create unique hardware fingerprints. The XOR Arbiter PUF uses k chained delay circuits whose XOR response resists simple cloning.',
    accent: 'var(--accent-primary)',
  },
  {
    icon: '⚙',
    title: 'Linear Additive Delay Model',
    body: 'Each challenge is transformed into a φ feature vector via cumulative-product parity mapping. This enables linear models to approximate the PUF delay differences directly.',
    accent: 'var(--accent-secondary)',
  },
  {
    icon: '⚡',
    title: 'ML Modelling Attack',
    body: 'Given enough Challenge-Response Pairs (CRPs), logistic regression or MLP classifiers can clone the PUF behaviour with high accuracy — posing a real security threat.',
    accent: '#45f4df',
  },
];

const METRICS = [
  { label: 'k=1 (Single Arbiter)', lr: '≥99%', mlp: '≥99%', risk: 'Critical' },
  { label: 'k=2 (2-XOR)', lr: '~95%', mlp: '~97%', risk: 'High' },
  { label: 'k=3 (3-XOR)', lr: '~52%', mlp: '~85%', risk: 'Moderate' },
  { label: 'k=4 (4-XOR)', lr: '~50%', mlp: '~65%', risk: 'Low' },
];

const PARAMETER_DATA = [
  { subject: 'Speed (Fast)', LR: 95, MLP: 40 },
  { subject: 'XOR Scalability', LR: 30, MLP: 90 },
  { subject: 'Data Efficiency', LR: 80, MLP: 30 },
  { subject: 'Interpretability', LR: 90, MLP: 20 },
  { subject: 'Non-Linearity', LR: 20, MLP: 95 },
];

export default function Overview({ onStartNewSession, history = [] }: OverviewProps) {
  // Aggregate user local history to find empirical best results by XOR level
  const userStats = [1, 2, 3, 4, 5, 6, 7, 8].map(k => {
    const runsK = history.filter(r => r.config.xor_level === k && r.status === 'COMPLETE' && r.result);
    if (runsK.length === 0) return null;
    
    const lrRuns = runsK.filter(r => r.config.model_type === 'lr');
    const mlpRuns = runsK.filter(r => r.config.model_type === 'mlp');
    
    const maxLr = lrRuns.length > 0 ? Math.max(...lrRuns.map(r => r.result.accuracy)) : null;
    const maxMlp = mlpRuns.length > 0 ? Math.max(...mlpRuns.map(r => r.result.accuracy)) : null;
    
    return {
      name: `k=${k}`,
      LR: maxLr !== null ? Number((maxLr * 100).toFixed(1)) : 0,
      MLP: maxMlp !== null ? Number((maxMlp * 100).toFixed(1)) : 0,
      runs: runsK.length
    };
  }).filter(d => d !== null && (d.LR > 0 || d.MLP > 0));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden p-10"
        style={{ background: 'linear-gradient(135deg, var(--accent-primary-alpha-8) 0%, var(--accent-secondary-alpha-6) 100%)', border: '1px solid var(--accent-primary-alpha-15)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-10"
          style={{ background: 'var(--accent-primary)', transform: 'translate(30%, -30%)' }} />
        <p className="text-xs font-mono tracking-[0.3em] mb-3" style={{ color: 'var(--accent-primary)' }}>SECURITY RESEARCH TOOL</p>
        <h2 className="font-headline text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--text-headline)' }}>
          XOR Arbiter PUF<br />
          <span style={{ color: 'var(--accent-primary)' }}>ML Attack Simulator</span>
        </h2>
        <p className="text-base max-w-xl leading-relaxed mb-8" style={{ color: 'var(--text-body)' }}>
          Simulate physical hardware security primitives, generate Challenge-Response Pair datasets, and evaluate how machine-learning attacks break them — all in your browser.
        </p>
        <button
          onClick={() => onStartNewSession()}
          className="px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-primary-dark))', color: 'var(--on-accent-primary)', boxShadow: '0 0 20px var(--accent-primary-alpha-30)' }}>
          Start New Session →
        </button>
      </div>

      {/* Concept cards */}
      <div className="grid grid-cols-3 gap-5">
        {CARDS.map(({ icon, title, body, accent }) => (
          <div key={title} className="rounded-xl p-6 transition-all duration-200 hover:translate-y-[-2px]"
            style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}>
            <div className="text-2xl mb-4" style={{ color: accent }}>{icon}</div>
            <h3 className="font-headline text-sm font-semibold mb-2" style={{ color: 'var(--text-headline)' }}>{title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{body}</p>
          </div>
        ))}
      </div>

      {/* Attack accuracy table */}
      <div className="rounded-xl overflow-hidden" style={{ border: 'var(--border-medium)' }}>
        <div className="px-6 py-4" style={{ background: 'var(--bg-panel-solid)', borderBottom: 'var(--border-medium)' }}>
          <h3 className="font-headline text-sm font-semibold" style={{ color: 'var(--text-headline)' }}>Expected Attack Accuracy by XOR Level</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>10k CRPs, 64-stage PUF, no noise</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--bg-header-light)' }}>
              {['Architecture', 'Logistic Regression', 'MLP', 'Risk Level'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-mono tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METRICS.map(({ label, lr, mlp, risk }, i) => (
              <tr key={label} style={{ background: i % 2 === 0 ? 'var(--bg-panel-light)' : 'transparent', borderTop: 'var(--border-light)' }}>
                <td className="px-6 py-3 font-mono text-xs" style={{ color: 'var(--text-headline)' }}>{label}</td>
                <td className="px-6 py-3 text-xs" style={{ color: 'var(--accent-primary)' }}>{lr}</td>
                <td className="px-6 py-3 text-xs" style={{ color: 'var(--accent-secondary)' }}>{mlp}</td>
                <td className="px-6 py-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{
                      background: risk === 'Critical' ? '#f8717120' : risk === 'High' ? '#fb923c20' : risk === 'Moderate' ? '#fbbf2420' : '#34d39920',
                      color: risk === 'Critical' ? '#f87171' : risk === 'High' ? '#fb923c' : risk === 'Moderate' ? '#fbbf24' : '#34d399',
                    }}>
                    {risk}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Dynamic Results Visualizations */}
      <div className="grid grid-cols-2 gap-5 mt-8">
        
        {/* Basic Parameters Radar Chart */}
        <div className="rounded-xl overflow-hidden self-start flex flex-col h-full" style={{ border: 'var(--border-medium)', background: 'var(--bg-panel-solid)' }}>
          <div className="px-6 py-4" style={{ borderBottom: 'var(--border-medium)' }}>
            <h3 className="font-headline text-sm font-semibold" style={{ color: 'var(--text-headline)' }}>Model Profiler Metrics</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Interactive radar comparison of ML architectures</p>
          </div>
          <div className="p-4" style={{ height: '320px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="65%" data={PARAMETER_DATA}>
                  <PolarGrid stroke="var(--border-thin)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-body)', fontSize: 11, fontWeight: 500 }} />
                  <Radar name="Logistic Regression" dataKey="LR" stroke="var(--accent-primary)" strokeWidth={2} fill="var(--accent-primary)" fillOpacity={0.25} />
                  <Radar name="MLP" dataKey="MLP" stroke="var(--accent-secondary)" strokeWidth={2} fill="var(--accent-secondary)" fillOpacity={0.25} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', border: 'var(--border-medium)', borderRadius: '8px', color: 'var(--text-headline)' }}
                    itemStyle={{ fontSize: '13px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
          </div>
        </div>

        {/* Empirical Local Results Bar Chart */}
        <div className="rounded-xl overflow-hidden self-start flex flex-col h-full" style={{ border: 'var(--border-medium)', background: 'var(--bg-panel-solid)' }}>
          <div className="px-6 py-4" style={{ borderBottom: 'var(--border-medium)' }}>
            <h3 className="font-headline text-sm font-semibold" style={{ color: 'var(--text-headline)' }}>Your Empirical Results</h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Highest accuracy achieved from your simulated experiments</p>
          </div>
          
          {userStats.length > 0 ? (
            <div className="p-4" style={{ height: '320px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userStats} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                  <Tooltip
                    cursor={{ fill: 'var(--bg-panel-light)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', border: 'var(--border-medium)', borderRadius: '8px', color: 'var(--text-headline)' }}
                    formatter={(val: number) => [`${val}%`, 'Max Accuracy']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar name="Logistic Regression" dataKey="LR" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar name="MLP" dataKey="MLP" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="p-8 flex-1 flex flex-col items-center justify-center text-center opacity-60 min-h-[320px]">
              <div className="text-3xl mb-3 text-[var(--accent-primary)]">⊘</div>
              <p className="text-sm font-headline font-semibold mb-1" style={{ color: 'var(--text-headline)' }}>No Data Yet</p>
              <p className="text-xs max-w-[200px]" style={{ color: 'var(--text-muted)' }}>Run some models using the Start New Session button to see your local meter metrics here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
