import { ViewType } from '../types';

interface TopBarProps {
  currentView: ViewType;
  theme: 'dark' | 'light' | 'system';
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
}

const VIEW_TITLES: Record<ViewType, { title: string; subtitle: string }> = {
  OVERVIEW:      { title: 'Overview',              subtitle: 'Understanding PUF security & ML attacks' },
  CONFIGURATION: { title: 'Attack Configuration',  subtitle: 'Set PUF parameters and choose attack model' },
  SIMULATION:    { title: 'Run Simulation',         subtitle: 'Execute ML modelling attack' },
  RESULTS:       { title: 'Results & Analysis',     subtitle: 'Attack accuracy, history & security assessment' },
};

export default function TopBar({ currentView, theme, setTheme }: TopBarProps) {
  const { title, subtitle } = VIEW_TITLES[currentView];
  return (
    <header className="fixed top-0 left-64 right-0 h-20 flex items-center px-12 z-20"
      style={{ background: 'var(--bg-header)', backdropFilter: 'blur(20px)', borderBottom: 'var(--border-thin)' }}>
      <div>
        <h1 className="font-headline text-xl font-semibold tracking-tight" style={{ color: 'var(--text-headline)' }}>{title}</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
          className="text-xs font-mono px-3 py-1.5 rounded-lg outline-none cursor-pointer appearance-none text-center"
          style={{ background: 'var(--bg-panel)', color: 'var(--text-headline)', border: 'var(--border-medium)' }}
        >
          <option value="system">System Theme</option>
          <option value="dark">Dark Theme</option>
          <option value="light">Light Theme</option>
        </select>
        
        <span className="text-[10px] font-mono px-3 py-1 rounded-full"
          style={{ background: 'var(--accent-primary-alpha-8)', border: '1px solid var(--accent-primary-alpha-20)', color: 'var(--accent-primary)' }}>
          XOR ARBITER PUF
        </span>
      </div>
    </header>
  );
}
