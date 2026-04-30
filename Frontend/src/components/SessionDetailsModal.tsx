import { useMemo } from 'react';
import { SimulationRun } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, LabelList, PieChart, Pie, Cell
} from 'recharts';
import { X, Activity } from 'lucide-react';

interface SessionDetailsModalProps {
  sessionName: string;
  history: SimulationRun[];
  onClose: () => void;
}

export default function SessionDetailsModal({ sessionName, history, onClose }: SessionDetailsModalProps) {
  // Accuracy over time
  const accuracyData = useMemo(() => {
    return history.slice().reverse().map((r, i) => ({
      name: `Run ${i + 1}`,
      accuracy: Number((r.result.accuracy * 100).toFixed(1)),
      model: r.config.model_type.toUpperCase(),
      kXOR: r.config.xor_level
    }));
  }, [history]);

  // XOR Level Distribution
  const xorData = useMemo(() => {
    const counts: Record<number, number> = {};
    history.forEach(r => {
      counts[r.config.xor_level] = (counts[r.config.xor_level] || 0) + 1;
    });
    return Object.entries(counts).map(([k, count]) => ({
      kXOR: `k=${k}`,
      count
    }));
  }, [history]);

  // Model Distribution
  const modelData = useMemo(() => {
    const counts: Record<string, number> = { lr: 0, mlp: 0, svm: 0, rf: 0 };
    history.forEach(r => {
      if (counts[r.config.model_type] !== undefined) {
        counts[r.config.model_type]++;
      }
    });
    return [
      { name: 'LR', value: counts.lr, color: '#0ea5e9' },
      { name: 'MLP', value: counts.mlp, color: '#9333ea' },
      { name: 'SVM', value: counts.svm, color: '#ec4899' },
      { name: 'RF', value: counts.rf, color: '#f59e0b' }
    ].filter(d => d.value > 0);
  }, [history]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-[rgba(0,0,0,0.6)] backdrop-blur-md overflow-y-auto p-6">
      <div className="w-full max-w-5xl rounded-2xl shadow-2xl flex flex-col" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-medium)' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b rounded-t-2xl" style={{ borderColor: 'var(--border-medium)', background: 'var(--bg-panel)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-primary-alpha-15)', color: 'var(--accent-primary)' }}>
              <Activity size={24} />
            </div>
            <div>
              <h2 className="text-xl font-headline font-bold" style={{ color: 'var(--text-headline)' }}>Session Details: {sessionName}</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Visual breakdown of {history.length} experiments</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[75vh]">
          
          {/* Accuracy Trend */}
          <div className="col-span-1 md:col-span-2 p-6 rounded-xl border shadow-sm" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-medium)' }}>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--text-headline)' }}>Accuracy Progression</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accuracyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', borderRadius: '8px', border: '1px solid var(--border-medium)', color: 'var(--text-headline)' }} 
                    itemStyle={{ color: 'var(--accent-primary)' }}
                  />
                  <Line type="monotone" dataKey="accuracy" name="Accuracy" stroke="var(--accent-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--accent-primary)' }} activeDot={{ r: 6 }}>
                     <LabelList dataKey="model" position="top" style={{ fill: 'var(--text-muted)', fontSize: '10px' }} offset={10} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* XOR Levels */}
          <div className="p-6 rounded-xl border shadow-sm" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-medium)' }}>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--text-headline)' }}>k-XOR Level Distribution</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={xorData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis dataKey="kXOR" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--bg-panel-solid)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', borderRadius: '8px', border: '1px solid var(--border-medium)', color: 'var(--text-headline)' }} 
                  />
                  <Bar name="Runs" dataKey="count" fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Models */}
          <div className="p-6 rounded-xl border shadow-sm" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-medium)' }}>
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--text-headline)' }}>Model Usage</h3>
            <div className="h-56 flex justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={modelData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {modelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', borderRadius: '8px', border: '1px solid var(--border-medium)', color: 'var(--text-headline)' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
