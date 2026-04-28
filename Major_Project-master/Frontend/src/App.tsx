import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { ViewType, SimulationRun } from './types';
import { useTheme } from './lib/useTheme';

import Configuration from './views/Configuration';
import Overview from './views/Overview';
import Results from './views/Results';
import Simulation from './views/Simulation';
import Login from './views/Login';
import { getUserHistory } from './lib/api';

export default function App() {
  const { theme, setTheme } = useTheme();
  const [username, setUsername] = useState<string | null>(localStorage.getItem('puf_username') || null);
  const [currentView, setCurrentView] = useState<ViewType | 'LOGIN'>(username ? 'OVERVIEW' : 'LOGIN');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [config, setConfig] = useState({
    num_samples: 1000,
    n_stages: 64,
    xor_level: 2,
    noise: 0.1,
    model_type: "lr" as "lr"|"mlp"|"svm"|"rf",
    seed: 42
  });

  const [currentSessionName, setCurrentSessionName] = useState<string>("Session 1");

  const [result, setResult] = useState<any>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  const [history, setHistory] = useState<SimulationRun[]>([]);

  useEffect(() => {
    if (username) {
      localStorage.setItem('puf_username', username);
      refreshHistory(username);
    } else {
      localStorage.removeItem('puf_username');
      setHistory([]);
    }
  }, [username]);

  const refreshHistory = (uName: string) => {
    getUserHistory(uName).then(dbHistory => {
      const formattedHistory: SimulationRun[] = dbHistory.map((row: any) => ({
        id: row.id.toString(),
        timestamp: row.timestamp,
        config: {
          n_stages: row.n_stages,
          xor_level: row.xor_level,
          noise: row.noise,
          num_samples: row.num_samples,
          seed: 42,
          model_type: row.model_type as "lr" | "mlp" | "svm" | "rf",
          username: row.username,
          session_name: row.session_name || "Session 1"
        },
        result: {
          accuracy: row.accuracy,
          model_type: row.model_type,
          n_stages: row.n_stages,
          xor_level: row.xor_level,
          noise: row.noise,
          num_samples: row.num_samples,
          seed: 42,
          timestamp: row.timestamp
        },
        status: 'COMPLETE'
      }));
      setHistory(formattedHistory);
    }).catch(err => console.error("Could not fetch history", err));
  };

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
    if (currentView === 'LOGIN') {
      return (
        <Login onLogin={(user) => {
          setUsername(user);
          setCurrentView('OVERVIEW');
        }} />
      );
    }

    switch (currentView) {
      case 'OVERVIEW':
        return <Overview onStartNewSession={handleStartNewSession} history={history} />;

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
            config={{ ...config, session_name: currentSessionName }}
            onViewChange={setCurrentView}
            onRunComplete={(runOrRuns) => {
              console.log("Run completed:", runOrRuns);

              if (Array.isArray(runOrRuns)) {
                const results = runOrRuns.map(r => r.result);
                setResult(results);
                setHistory(prev => [...runOrRuns, ...prev]);
                setCurrentView('RESULTS');
              } else if (runOrRuns?.result) {
                setResult(runOrRuns.result);
                setHistory(prev => [runOrRuns, ...prev]);
                setCurrentView('RESULTS');
              } else {
                console.error("No result received");
              }
          }}
          />
        );

      case 'RESULTS':
        return <Results result={result} history={history} currentSessionName={currentSessionName} onSelectSession={(s) => {
          setCurrentSessionName(s);
          setCurrentView('CONFIGURATION');
        }} onHistoryChange={() => {
          if (username) refreshHistory(username);
        }} />;

      default:
        return <Overview onStartNewSession={handleStartNewSession} history={history} />;
    }
  };

  const handleStartNewSession = () => {
    // Generate new session name
    const existingSessions = Array.from(new Set(history.map(r => r.config.session_name || "Session 1")));
    let num = 1;
    while(existingSessions.includes(`Session ${num}`)) {
      num++;
    }
    setCurrentSessionName(`Session ${num}`);
    setCurrentView('CONFIGURATION');
  };

  const handleLogout = () => {
    setUsername(null);
    setCurrentView('LOGIN');
  };

  return (
    <div className="min-h-screen kinetic-void-bg selection:bg-primary/30 overflow-x-hidden">
      
      {username && (
        <Sidebar
          currentView={currentView as ViewType}
          onViewChange={setCurrentView}
          backendOnline={backendOnline}
          username={username}
          onLogout={handleLogout}
          isOpen={isMobileMenuOpen}
          setIsOpen={setIsMobileMenuOpen}
        />
      )}

      {username && (
        <TopBar 
          currentView={currentView as ViewType} 
          theme={theme} 
          setTheme={setTheme}
          onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
        />
      )}

      <main className={username ? "md:ml-64 pt-24 pb-12 px-4 sm:px-6 md:px-12 min-h-screen transition-all" : "pt-24 pb-12 px-4 sm:px-6 md:px-12 min-h-screen transition-all"}>
        <div className="max-w-7xl mx-auto">
          {renderView()}
        </div>
      </main>

      {/* Background - purely white in light mode */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10 hidden dark:block">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] bg-secondary-container opacity-[0.03] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[10%] -left-[5%] w-[40%] h-[40%] bg-primary-container opacity-[0.02] blur-[100px] rounded-full"></div>
      </div>

      <footer className={username ? "md:ml-64 py-8 opacity-20 text-center pointer-events-none transition-all" : "py-8 opacity-20 text-center pointer-events-none transition-all"}>
        <p className="text-[10px] font-mono uppercase tracking-[0.5em] text-slate-600">
          Secure Environment Encrypted via KINETIC_VOID_ENGINE // v1.0.42-STABLE
        </p>
      </footer>

    </div>
  );
}