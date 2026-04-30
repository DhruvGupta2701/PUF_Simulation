import { cn } from '../lib/utils';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (v: ViewType | 'LOGIN') => void;
  backendOnline: boolean;
  username: string;
  onLogout: () => void;
  isOpen?: boolean;
  setIsOpen?: (val: boolean) => void;
}

const NAV_ITEMS: { view: ViewType; label: string; icon: string; desc: string }[] = [
  { view: 'OVERVIEW',      label: 'Overview',      icon: '◈', desc: 'Project summary' },
  { view: 'CONFIGURATION', label: 'Configure',     icon: '⊞', desc: 'Attack parameters' },
  { view: 'SIMULATION',    label: 'Simulate',      icon: '⟳', desc: 'Run ML attack' },
  { view: 'RESULTS',       label: 'Results',       icon: '◉', desc: 'Analysis & history' },
];

import { LogOut } from 'lucide-react';

export default function Sidebar({ currentView, onViewChange, backendOnline, username, onLogout, isOpen, setIsOpen }: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}
      
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 flex flex-col z-40 transition-transform duration-300 md:translate-x-0 shadow-2xl md:shadow-none",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
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
          const isSimulate = view === 'SIMULATION';
          return (
            <button
              key={view}
              onClick={() => {
                if (isSimulate) return;
                onViewChange(view);
                if (setIsOpen) setIsOpen(false);
              }}
              disabled={isSimulate}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-3 rounded-lg mb-1 text-left transition-all duration-200 group',
                active
                  ? 'text-[var(--accent-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-body)] hover:bg-[var(--bg-panel)]',
                isSimulate && 'cursor-not-allowed opacity-50 hover:bg-transparent hover:text-[var(--text-muted)] pointer-events-none'
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

      {/* Backend status and User Profile */}
      <div className="px-6 py-5 border-t flex flex-col gap-3" style={{ borderColor: 'var(--border-color)' }}>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-cyan-500/20 text-cyan-500 flex items-center justify-center font-bold text-xs uppercase border border-cyan-500/30">
              {username[0]}
            </div>
            <span className="text-xs font-semibold text-[var(--text-main)] truncate max-w-[100px]" title={username}>
              {username}
            </span>
          </div>
          <button onClick={onLogout} className="text-[var(--text-muted)] hover:text-red-400 transition-colors p-1" title="Sign Out">
            <LogOut size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 mt-2">
          <div className={cn('w-2 h-2 rounded-full', backendOnline ? 'bg-emerald-400' : 'bg-red-400')}
            style={{ boxShadow: backendOnline ? '0 0 6px #34d399' : '0 0 6px #f87171' }} />
          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {backendOnline ? 'BACKEND ONLINE' : 'BACKEND OFFLINE'}
          </span>
        </div>
      </div>
    </aside>
    </>
  );
}
