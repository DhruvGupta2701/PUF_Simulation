import { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SimulationRun } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, LabelList
} from 'recharts';
import { formatAccuracy } from '../lib/utils';
import { X, Download, FileText } from 'lucide-react';

interface ReportModalProps {
  history: SimulationRun[];
  onClose: () => void;
}

export default function ReportModal({ history, onClose }: ReportModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('PUF_Security_Report.pdf');
    } catch (err: any) {
      console.error(err);
      alert('Error generating PDF: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  // Prepare data for comparisons
  const lrData = history.filter(h => h.config.model_type === 'lr').reverse();
  const mlpData = history.filter(h => h.config.model_type === 'mlp').reverse();
  const svmData = history.filter(h => h.config.model_type === 'svm').reverse();
  const rfData = history.filter(h => h.config.model_type === 'rf').reverse();

  // Unified comparison chart across time/run index
  const chartData = history.slice().reverse().map((r, i) => ({
    name: `Run ${i + 1} (${r.config.model_type.toUpperCase()})`,
    accuracy: Number((r.result.accuracy * 100).toFixed(2)),
    kXOR: r.config.xor_level,
    model: r.config.model_type
  }));

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-[5vh] bg-[rgba(0,0,0,0.5)] backdrop-blur-sm overflow-y-auto pb-[5vh]">
      <div className="w-full max-w-4xl rounded-2xl shadow-2xl relative" style={{ background: 'var(--bg-main)' }}>
        {/* Header toolbar */}
        <div className="sticky top-0 sticky-header flex items-center justify-between px-6 py-4 border-b rounded-t-2xl z-10 backdrop-blur-md"
             style={{ borderColor: 'var(--border-color)', background: 'var(--bg-panel)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-primary-alpha-15)', color: 'var(--accent-primary)' }}>
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-headline font-bold" style={{ color: 'var(--text-headline)' }}>PDF Report Preview</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>A4 Aspect Ratio scaling</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 text-[#ffffff] text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
              style={{ background: 'var(--accent-primary)' }}
            >
              <Download size={16} />
              {downloading ? 'Generating PDF...' : 'Download PDF'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg transition-colors cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scaled A4 Report Container */}
        {/* We use strict hex codes below because html2canvas DOES NOT SUPPORT Tailwind's oklch() color functions! */}
        <div className="p-8 flex justify-center overflow-x-auto" style={{ background: 'rgba(0,0,0,0.05)' }}>
          <div
            ref={reportRef}
            className="p-12 relative"
            style={{ width: '800px', minHeight: '1131px', background: '#ffffff', color: '#1e293b' }}
          >
            {/* Header */}
            <div className="border-b-2 pb-6 mb-8 flex justify-between items-end" style={{ borderColor: '#e2e8f0' }}>
              <div>
                <h1 className="text-3xl font-bold mb-2 font-headline" style={{ color: '#0f172a' }}>PUF Security Assessment Report</h1>
                <p className="font-mono text-sm" style={{ color: '#64748b' }}>Generated: {new Date().toLocaleString()}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold" style={{ color: '#0891b2' }}>Ψ ML SECURITY LAB</div>
                <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#64748b' }}>Classified Analysis</div>
              </div>
            </div>

            {/* Project Overview */}
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-3 border-l-4 pl-3" style={{ color: '#1e293b', borderColor: '#06b6d4' }}>Project Scope</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#475569' }}>
                This document outlines the simulation outcomes for machine learning modeling attacks targeting XOR Arbiter Physical Unclonable Functions (PUFs). 
                The analysis encompasses historical attempts, model accuracies (Logistic Regression, Multi-Layer Perceptron, Support Vector Machine, & Random Forest), and structural parameter evaluations.
              </p>
            </div>

            {/* Performance Graphs */}
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-6 border-l-4 pl-3" style={{ color: '#1e293b', borderColor: '#06b6d4' }}>Accuracy Progression Analysis</h2>
              
              <div className="h-64 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} domain={[40, 100]} label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="accuracy" name="Predictability (%)" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4, fill: '#0ea5e9' }} activeDot={{ r: 6 }}>
                      <LabelList 
                        dataKey="accuracy" 
                        position="top" 
                        formatter={(val: number) => `${val}%`} 
                        style={{ fill: '#0f172a', fontSize: '10px', fontWeight: 'bold' }} 
                        offset={10} 
                      />
                      <LabelList 
                        dataKey="kXOR" 
                        position="bottom" 
                        formatter={(val: number) => `k=${val}`} 
                        style={{ fill: '#64748b', fontSize: '9px' }} 
                        offset={10} 
                      />
                    </Line>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-center italic mt-2" style={{ color: '#64748b' }}>Figure 1: Evolution of prediction accuracy across all historical simulation attacks.</p>
            </div>

            {/* Model Comparison */}
            <div className="mb-10 grid grid-cols-4 gap-4">
              <div>
                <h3 className="text-md font-semibold mb-3 border-b pb-2" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>Logistic Regression</h3>
                <p className="text-[10px] mb-2" style={{ color: '#475569' }}>Linear boundary attacks utilizing evolutionary algorithms.</p>
                <div className="p-3 rounded border" style={{ background: '#f8fafc', borderColor: '#f1f5f9' }}>
                  <span className="block text-xl font-mono font-bold" style={{ color: '#0891b2' }}>
                    {lrData.length > 0 ? formatAccuracy(lrData[lrData.length - 1].result.accuracy) : 'N/A'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: '#64748b' }}>Latest Top</span>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-3 border-b pb-2" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>MLP</h3>
                <p className="text-[10px] mb-2" style={{ color: '#475569' }}>Deep learning approaches targeting XOR non-linearities.</p>
                <div className="p-3 rounded border" style={{ background: '#f8fafc', borderColor: '#f1f5f9' }}>
                  <span className="block text-xl font-mono font-bold" style={{ color: '#9333ea' }}>
                    {mlpData.length > 0 ? formatAccuracy(mlpData[mlpData.length - 1].result.accuracy) : 'N/A'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: '#64748b' }}>Latest Top</span>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-3 border-b pb-2" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>SVM</h3>
                <p className="text-[10px] mb-2" style={{ color: '#475569' }}>Kernel-based boundary definitions for non-linear structures.</p>
                <div className="p-3 rounded border" style={{ background: '#f8fafc', borderColor: '#f1f5f9' }}>
                  <span className="block text-xl font-mono font-bold" style={{ color: '#ec4899' }}>
                    {svmData.length > 0 ? formatAccuracy(svmData[svmData.length - 1].result.accuracy) : 'N/A'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: '#64748b' }}>Latest Top</span>
                </div>
              </div>
              <div>
                <h3 className="text-md font-semibold mb-3 border-b pb-2" style={{ color: '#1e293b', borderColor: '#e2e8f0' }}>Random Forest</h3>
                <p className="text-[10px] mb-2" style={{ color: '#475569' }}>Ensemble decision boundaries for complex representations.</p>
                <div className="p-3 rounded border" style={{ background: '#f8fafc', borderColor: '#f1f5f9' }}>
                  <span className="block text-xl font-mono font-bold" style={{ color: '#f59e0b' }}>
                    {rfData.length > 0 ? formatAccuracy(rfData[rfData.length - 1].result.accuracy) : 'N/A'}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide" style={{ color: '#64748b' }}>Latest Top</span>
                </div>
              </div>
            </div>

            {/* History Table */}
            <div>
              <h2 className="text-xl font-semibold mb-4 border-l-4 pl-3" style={{ color: '#1e293b', borderColor: '#06b6d4' }}>Tabular Execution Log</h2>
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr style={{ background: '#f1f5f9', color: '#334155' }}>
                    <th className="py-2 px-3 border font-semibold" style={{ borderColor: '#e2e8f0' }}>T-Stamp</th>
                    <th className="py-2 px-3 border font-semibold" style={{ borderColor: '#e2e8f0' }}>Model</th>
                    <th className="py-2 px-3 border font-semibold" style={{ borderColor: '#e2e8f0' }}>k-XOR</th>
                    <th className="py-2 px-3 border font-semibold" style={{ borderColor: '#e2e8f0' }}>CRPs</th>
                    <th className="py-2 px-3 border font-semibold text-right" style={{ borderColor: '#e2e8f0' }}>Accuracy</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice(0, 15).map((run, idx) => (
                     <tr key={idx} style={{ background: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                       <td className="py-2 px-3 border font-mono text-[10px]" style={{ borderColor: '#e2e8f0', color: '#64748b' }}>{new Date(run.timestamp).toLocaleString()}</td>
                       <td className="py-2 px-3 border font-mono text-xs uppercase" style={{ borderColor: '#e2e8f0', color: '#334155' }}>{run.config.model_type}</td>
                       <td className="py-2 px-3 border font-mono text-xs" style={{ borderColor: '#e2e8f0', color: '#334155' }}>{run.config.xor_level}</td>
                       <td className="py-2 px-3 border font-mono text-xs" style={{ borderColor: '#e2e8f0', color: '#334155' }}>{run.config.num_samples.toLocaleString()}</td>
                       <td className="py-2 px-3 border font-mono text-xs font-bold text-right" style={{ borderColor: '#e2e8f0', color: '#1e293b' }}>{formatAccuracy(run.result.accuracy)}</td>
                     </tr>
                  ))}
                </tbody>
              </table>
              {history.length > 15 && <p className="text-xs mt-2 italic" style={{ color: '#94a3b8' }}>* Table truncated to latest 15 runs for reporting brevity.</p>}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
