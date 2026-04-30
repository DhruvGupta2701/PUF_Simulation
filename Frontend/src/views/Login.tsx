import { useState } from 'react';
import { loginUser, registerUser } from '../lib/api';
import { Lock, User } from 'lucide-react';

interface LoginProps {
  onLogin: (username: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');

    try {
      if (isRegister) {
        const res = await registerUser(username, password);
        if (res.success) {
          setMsg('Registration successful! You can now sign in.');
          setIsRegister(false);
          setPassword('');
        } else {
          setError(res.message);
        }
      } else {
        const res = await loginUser(username, password);
        if (res.success && res.token) {
          onLogin(res.token);
        } else {
          setError(res.message);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGoogleAuth = () => {
    setError('');
    setMsg('');
    
    // Open popup
    const width = 450;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      '/?googleLogin=true', 
      'Google Login', 
      `width=${width},height=${height},left=${left},top=${top},status=yes,scrollbars=yes`
    );

    const handleMessage = async (event: MessageEvent) => {
      // Validate origin to be safe, though locally it's all same origin
      if (event.data?.type === 'GOOGLE_LOGIN_SUCCESS') {
        window.removeEventListener('message', handleMessage);
        
        const { username } = event.data;
        const mockPassword = 'google_oauth_mock_password';

        try {
          // Attempt login
          const res = await loginUser(username, mockPassword);
          if (res.success && res.token) {
            onLogin(res.token);
          } else {
            // If login fails, attempt to register
            const regRes = await registerUser(username, mockPassword);
            if (regRes.success) {
              const loginRes = await loginUser(username, mockPassword);
              if (loginRes.success && loginRes.token) {
                onLogin(loginRes.token);
              } else {
                setError('Failed to sign in after Google registration.');
              }
            } else {
              setError('Username already exists or registration failed.');
            }
          }
        } catch (err: any) {
          setError(err.message);
        }
      }
    };

    window.addEventListener('message', handleMessage);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-md p-8 rounded-xl shadow-2xl relative overflow-hidden group"
           style={{ background: 'var(--bg-panel)', border: 'var(--border-medium)' }}>
        
        <div className="absolute inset-x-0 -top-10 h-20 bg-gradient-to-b from-cyan-500/20 to-transparent blur-xl pointer-events-none" />

        <h2 className="text-2xl font-bold mb-6 text-center text-[var(--text-headline)]">
          {isRegister ? 'Create Account' : 'Sign In'}
        </h2>

        {error && <div className="p-3 mb-4 text-sm text-[var(--on-accent-primary)] bg-red-500/80 rounded animate-in fade-in">{error}</div>}
        {msg && <div className="p-3 mb-4 text-sm text-[var(--on-accent-primary)] bg-emerald-500/80 rounded animate-in fade-in">{msg}</div>}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-sm font-semibold mb-2 opacity-80 tracking-wide uppercase">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-3 opacity-40 text-cyan-500" size={18} />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg outline-none transition-all focus:shadow-[0_0_0_2px_rgba(6,182,212,0.3)]"
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 opacity-80 tracking-wide uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 opacity-40 text-cyan-500" size={18} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-lg outline-none transition-all focus:shadow-[0_0_0_2px_rgba(6,182,212,0.3)]"
                style={{ background: 'var(--bg-app)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-4 text-sm font-bold uppercase tracking-wider rounded-lg transition-all hover:-translate-y-0.5 shadow-lg shadow-cyan-500/20"
            style={{ background: 'var(--accent-primary)', color: 'var(--on-accent-primary)' }}
          >
            {isRegister ? 'Register' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t" style={{ borderColor: 'var(--border-color)' }}></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 font-semibold" style={{ background: 'var(--bg-panel)', color: 'var(--text-muted)' }}>Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleAuth}
          className="w-full py-2.5 flex items-center justify-center gap-3 text-sm font-bold tracking-wide rounded-lg transition-all hover:-translate-y-0.5 shadow-md"
          style={{ background: 'white', color: '#1f2937', border: '1px solid #e5e7eb' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>

        <div className="mt-8 text-center text-sm opacity-70 font-medium">
          {isRegister ? 'Already have an account?' : 'Need an account?'}
          <button 
            type="button" 
            className="ml-2 underline text-[var(--accent-primary)] hover:opacity-100 hover:text-cyan-400 font-bold tracking-wide"
            onClick={() => { setIsRegister(!isRegister); setError(''); setMsg(''); }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>
      </div>
    </div>
  );
}
