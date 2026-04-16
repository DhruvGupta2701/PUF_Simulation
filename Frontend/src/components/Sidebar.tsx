import { cn } from '../lib/utils';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (v: ViewType) => void;
  backendOnline: boolean;
}

const NAV_ITEMS: { view: ViewType; label: string; icon: string; desc: string }[] = [
  { view: 'OVERVIEW',      label: 'Overview',      icon: '◈', desc: 'Project summary' },
  { view: 'CONFIGURATION', label: 'Configure',     icon: '⊞', desc: 'Attack parameters' },
  { view: 'SIMULATION',    label: 'Simulate',      icon: '⟳', desc: 'Run ML attack' },
  { view: 'RESULTS',       label: 'Results',       icon: '◉', desc: 'Analysis & history' },
];

export default function Sidebar({ currentView, onViewChange, backendOnline }: SidebarProps) {
  return (
    <aside className="fixed top-0 left-0 h-full w-64 flex flex-col z-30"
      style={{ background: 'var(--bg-sidebar)', borderRight: 'var(--border-thin)' }}>

      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #4cd6ff22, #dab9ff22)', border: '1px solid #4cd6ff33', color: 'var(--accent-primary)' }}>
            Ψ
          </div>
          <span className="font-headline font-semibold tracking-tight" style={{ color: 'var(--text-headline)' }}>PUF Attack</span>
        </div>
        <p className="text-[10px] font-mono tracking-widest mt-1" style={{ color: 'var(--text-muted)' }}>ML SECURITY LAB</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3">
        {NAV_ITEMS.map(({ view, label, icon, desc }) => {
          const active = currentView === view;
          return (
            <button
              key={view}
              onClick={() => onViewChange(view)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 text-left transition-all duration-200 group',
                active
                  ? 'text-[var(--accent-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--bg-panel)]'
              )}
              style={active ? { background: 'var(--accent-primary-alpha-15)' } : {}}
            >
              <span className={cn('text-base w-5 text-center transition-all', active && 'drop-shadow-[0_0_8px_rgba(76,214,255,0.8)]')}>
                {icon}
              </span>
              <div>
                <div className={cn('text-sm font-medium', active && 'font-semibold')}>{label}</div>
                <div className="text-[10px] opacity-60">{desc}</div>
              </div>
              {active && (
                <div className="ml-auto w-1 h-6 rounded-full" style={{ background: 'var(--accent-primary)', boxShadow: '0 0 8px #4cd6ff' }} />
              )}
            </button>
          );
        })}
      </nav>

      {/* Backend status */}
      <div className="px-6 py-5 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2">
          <div className={cn('w-2 h-2 rounded-full', backendOnline ? 'bg-emerald-400' : 'bg-red-400')}
            style={{ boxShadow: backendOnline ? '0 0 6px #34d399' : '0 0 6px #f87171' }} />
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {backendOnline ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
          </span>
        </div>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>localhost:8000</p>
      </div>
    </aside>
  );
}
