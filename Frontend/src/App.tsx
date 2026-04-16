import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { ViewType, SimulationRun } from './types';
import { useTheme } from './lib/useTheme';

import Configuration from './views/Configuration';
import Overview from './views/Overview';
import Results from './views/Results';
import Simulation from './views/Simulation';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [currentView, setCurrentView] = useState<ViewType>('OVERVIEW');

  const [config, setConfig] = useState({
    num_samples: 1000,
    n_stages: 64,
    xor_level: 2,
    noise: 0.1,
    model_type: "lr",
    seed: 42
  });

  const [result, setResult] = useState<any>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  const [history, setHistory] = useState<SimulationRun[]>(() => {
    try {
      const saved = localStorage.getItem('puf_experiment_history');
      if (saved) return JSON.parse(saved);
    } catch {
      console.error("Failed to parse history.");
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('puf_experiment_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('http://localhost:8000/health');
        if (res.ok) {
          setBackendOnline(true);
        } else {
          setBackendOnline(false);
        }
      } catch (err) {
        setBackendOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 3000);
    return () => clearInterval(interval);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'OVERVIEW':
        return <Overview onViewChange={setCurrentView} history={history} />;

      case 'CONFIGURATION':
        return (
          <Configuration
            config={config}
            setConfig={setConfig}
            onViewChange={setCurrentView}
          />
        );

      case 'SIMULATION':
        return (
          <Simulation
            config={config}
            onRunComplete={(run) => {
              console.log("Run completed:", run);

              if (run?.result) {
                setResult(run.result);
                setHistory(prev => [run, ...prev]);
                setCurrentView('RESULTS');
              } else {
                console.error("No result received");
              }
          }}
          />
        );

      case 'RESULTS':
        return <Results result={result} history={history} />;

      default:
        return <Overview onViewChange={setCurrentView} history={history} />;
    }
  };

  return (
    <div className="min-h-screen kinetic-void-bg selection:bg-primary/30">
      
      <Sidebar
        currentView={currentView}
        onViewChange={setCurrentView}
        backendOnline={backendOnline}
      />

      {/* ✅ FIXED HERE */}
      <TopBar currentView={currentView} theme={theme} setTheme={setTheme} />

      <main className="ml-64 pt-24 pb-12 px-12 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>

      {/* Background - purely white in light mode */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10 hidden dark:block">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-secondary-container opacity-[0.03] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[10%] -left-[5%] w-[40%] h-[40%] bg-primary-container opacity-[0.02] blur-[100px] rounded-full"></div>
      </div>

      <footer className="ml-64 py-8 opacity-20 text-center pointer-events-none">
        <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-slate-600">
          Secure Environment Encrypted via KINETIC_VOID_ENGINE // v1.0.42-STABLE
        </p>
      </footer>

    </div>
  );
}