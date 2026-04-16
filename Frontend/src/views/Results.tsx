import { useState } from 'react';
import { formatAccuracy, getSecurityLabel } from '../lib/utils';
import { SimulationRun } from '../types';
import ReportModal from '../components/ReportModal';
import { FileText } from 'lucide-react';

interface ResultsProps {
  result: any; // single result
  history?: SimulationRun[];
}

export default function Results({ result, history = [] }: ResultsProps) {
  const [showReport, setShowReport] = useState(false);

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

  return (
    <div className="space-y-6 text-[var(--text-headline)] animate-in fade-in">
      
      <div className="flex justify-end">
        <button
          onClick={() => setShowReport(true)}
          disabled={!history || history.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-dark)] text-[var(--on-accent-primary)] text-sm font-semibold rounded-lg shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
        >
          <FileText size={16} />
          Create PDF Report
        </button>
      </div>

      {showReport && <ReportModal history={history} onClose={() => setShowReport(false)} />}

      {/* Main Result */}
      {result && (
        <div className="rounded-xl p-6 text-center"
          style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}
        >
          <h2 className="text-lg font-bold mb-4">Attack Results</h2>

          <div className="text-4xl font-mono mb-2" style={{ color }}>
            {formatAccuracy(accuracy)}
          </div>

          <div className="text-sm opacity-70">
            Accuracy
          </div>

          <div className="mt-4 text-sm font-mono px-3 py-1 inline-block rounded"
            style={{ color, background: `${color}20` }}
          >
            {label}
          </div>
        </div>
      )}

      {/* Details */}
      {result && (
        <div className="rounded-xl p-6"
          style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}
        >
          <h3 className="mb-4 font-semibold">Experiment Details</h3>

          <div className="grid grid-cols-2 gap-4 text-sm font-mono">
            <div>Stages: {result?.n_stages}</div>
            <div>XOR Level: {result?.xor_level}</div>
            <div>Noise: {result?.noise}</div>
            <div>CRPs: {result?.num_samples}</div>
            <div>Model: {result?.model_type}</div>
          </div>
        </div>
      )}

      {/* History Panel */}
      {history.length > 0 && (
        <div className="rounded-xl p-6"
          style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}
        >
          <h3 className="mb-4 font-semibold">Experiment History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <th className="py-2 opacity-70 font-normal">Time</th>
                  <th className="py-2 opacity-70 font-normal">Model</th>
                  <th className="py-2 opacity-70 font-normal">k-XOR</th>
                  <th className="py-2 opacity-70 font-normal">CRPs</th>
                  <th className="py-2 opacity-70 font-normal text-right">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {history.map((run, idx) => {
                  const { color } = getSecurityLabel(run.result.accuracy, run.config.xor_level);
                  return (
                    <tr key={run.id || idx} className="border-b last:border-0 hover:bg-white/5 transition-colors" style={{ borderColor: 'var(--border-color-light)' }}>
                      <td className="py-3 font-mono opacity-80 text-xs">
                        {new Date(run.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 font-mono text-xs">{run.config.model_type.toUpperCase()}</td>
                      <td className="py-3 font-mono text-xs">{run.config.xor_level}</td>
                      <td className="py-3 font-mono text-xs">{run.config.num_samples.toLocaleString()}</td>
                      <td className="py-3 font-mono text-right font-bold" style={{ color }}>
                        {formatAccuracy(run.result.accuracy)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}