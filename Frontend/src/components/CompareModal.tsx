import { useRef, useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { SimulationRun } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { formatAccuracy } from '../lib/utils';
import { X, Download, BarChart2 } from 'lucide-react';

interface CompareModalProps {
  sessionGroups: Record<string, SimulationRun[]>;
  onClose: () => void;
}

export default function CompareModal({ sessionGroups, onClose }: CompareModalProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const sessionNames = Object.keys(sessionGroups);
  const colors = ['#0ea5e9', '#9333ea', '#f59e0b', '#10b981', '#f43f5e', '#6366f1'];

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
      pdf.save('Session_Comparison_Report.pdf');
    } catch (err: any) {
      console.error(err);
      alert('Error generating PDF: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  // 1. Max Accuracy by Session & Model (Bar Chart Data)
  const barData = useMemo(() => {
    return sessionNames.map((sName) => {
      const runs = sessionGroups[sName];
      const lrRuns = runs.filter(r => r.config.model_type === 'lr');
      const mlpRuns = runs.filter(r => r.config.model_type === 'mlp');
      const svmRuns = runs.filter(r => r.config.model_type === 'svm');
      const rfRuns = runs.filter(r => r.config.model_type === 'rf');
      
      const maxLr = lrRuns.length > 0 ? Math.max(...lrRuns.map(r => r.result.accuracy)) : 0;
      const maxMlp = mlpRuns.length > 0 ? Math.max(...mlpRuns.map(r => r.result.accuracy)) : 0;
      const maxSvm = svmRuns.length > 0 ? Math.max(...svmRuns.map(r => r.result.accuracy)) : 0;
      const maxRf = rfRuns.length > 0 ? Math.max(...rfRuns.map(r => r.result.accuracy)) : 0;

      return {
        name: sName,
        LR: Number((maxLr * 100).toFixed(1)),
        MLP: Number((maxMlp * 100).toFixed(1)),
        SVM: Number((maxSvm * 100).toFixed(1)),
        RF: Number((maxRf * 100).toFixed(1))
      };
    });
  }, [sessionGroups, sessionNames]);

  // 2. Radar Chart: Compare Robustness (Max Accuracy grouped by k-XOR across sessions)
  const radarData = useMemo(() => {
    // Collect all unique k-XOR levels tested across all selected sessions
    const allXorLevels = Array.from(new Set(
      Object.values(sessionGroups).flat().map(r => r.config.xor_level)
    )).sort();

    return allXorLevels.map(k => {
      const dataPoint: any = { subject: `k=${k}` };
      for (const sName of sessionNames) {
        const runsForK = sessionGroups[sName].filter(r => r.config.xor_level === k);
        const maxAcc = runsForK.length > 0 ? Math.max(...runsForK.map(r => r.result.accuracy)) : 0;
        dataPoint[sName] = Number((maxAcc * 100).toFixed(1));
      }
      return dataPoint;
    });
  }, [sessionGroups, sessionNames]);

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-start pt-[5vh] bg-[rgba(0,0,0,0.5)] backdrop-blur-sm overflow-y-auto pb-[5vh]">
      <div className="w-full max-w-4xl rounded-2xl shadow-2xl relative" style={{ background: 'var(--bg-main)' }}>
        {/* Header toolbar */}
        <div className="sticky top-0 sticky-header flex items-center justify-between px-6 py-4 border-b rounded-t-2xl z-10 backdrop-blur-md"
             style={{ borderColor: 'var(--border-color)', background: 'var(--bg-panel)' }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-secondary-alpha-15)', color: 'var(--accent-secondary)' }}>
              <BarChart2 size={20} />
            </div>
            <div>
              <h2 className="text-lg font-headline font-bold" style={{ color: 'var(--text-headline)' }}>Comparative PDF Report</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Cross-session analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 text-[#ffffff] text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
              style={{ background: 'linear-gradient(135deg, var(--accent-secondary), #6366f1)' }}
            >
              <Download size={16} />
              {downloading ? 'Processing...' : 'Download PDF'}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg transition-colors cursor-pointer hover:bg-white/5" style={{ color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scaled A4 Report Container for html2canvas */}
        <div className="p-8 flex justify-center overflow-x-auto" style={{ background: 'rgba(0,0,0,0.05)' }}>
          <div
            ref={reportRef}
            className="p-12 relative flex flex-col"
            style={{ width: '800px', minHeight: '1131px', background: '#ffffff', color: '#1e293b' }}
          >
            {/* Header */}
            <div className="border-b-2 pb-6 mb-8 flex justify-between items-end" style={{ borderColor: '#e2e8f0' }}>
              <div>
                <h1 className="text-3xl font-bold mb-2 font-headline" style={{ color: '#0f172a' }}>Cross-Session Comparison</h1>
                <p className="font-mono text-sm" style={{ color: '#64748b' }}>Comparing: {sessionNames.join(', ')}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold" style={{ color: '#9333ea' }}>COMP-ANALYSIS MATRIX</div>
                <div className="text-xs uppercase tracking-widest mt-1" style={{ color: '#64748b' }}>Generated: {new Date().toLocaleString()}</div>
              </div>
            </div>

            {/* General Overview Stats */}
            <div className="mb-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
               {sessionNames.slice(0, 4).map((sName, idx) => (
                 <div key={sName} className="p-4 rounded-xl border relative overflow-hidden transition-all shadow-sm" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
                   <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: colors[idx % colors.length] }} />
                   <h3 className="font-bold text-sm truncate" style={{ color: '#1e293b' }}>{sName}</h3>
                   <p className="text-xs mt-1" style={{ color: '#64748b' }}>{sessionGroups[sName].length} Simulation Runs</p>
                   {/* Avg accuracy calculation */}
                   <p className="font-mono text-lg font-bold mt-2" style={{ color: colors[idx % colors.length] }}>
                     {formatAccuracy(
                       sessionGroups[sName].reduce((sum, r) => sum + r.result.accuracy, 0) / (sessionGroups[sName].length || 1)
                     )}
                   </p>
                   <p className="text-[10px] uppercase tracking-wide" style={{ color: '#94a3b8' }}>Mean Accuracy</p>
                 </div>
               ))}
            </div>

            {/* Radar Chart over k-XOR */}
            {radarData.length > 0 && (
              <div className="mb-10">
                <h2 className="text-xl font-semibold mb-6 border-l-4 pl-3" style={{ color: '#1e293b', borderColor: '#9333ea' }}>Robustness Map by Structure (k-XOR Peak Acc)</h2>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                      <PolarGrid stroke="#cbd5e1" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 13, fontWeight: 'bold' }} />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      {sessionNames.map((sName, idx) => (
                        <Radar 
                          key={sName} 
                          name={sName} 
                          dataKey={sName} 
                          stroke={colors[idx % colors.length]} 
                          fill={colors[idx % colors.length]} 
                          fillOpacity={0.3} 
                        />
                      ))}
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Bar Chart comparing LR/MLP highest accuracy per session */}
            <div className="mb-10">
              <h2 className="text-xl font-semibold mb-6 border-l-4 pl-3" style={{ color: '#1e293b', borderColor: '#9333ea' }}>Algorithm Efficacy Mapping</h2>
              <p className="text-xs mb-4 italic" style={{ color: '#64748b' }}>Displaying the absolute peak vulnerability (accuracy %) achieved by respective models.</p>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 12 }} tickFormatter={(val) => `${val}%`} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar name="Logistic Regression" dataKey="LR" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar name="Multilayer Perceptron (MLP)" dataKey="MLP" fill="#9333ea" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar name="Support Vector Machine (SVM)" dataKey="SVM" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar name="Random Forest (RF)" dataKey="RF" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
