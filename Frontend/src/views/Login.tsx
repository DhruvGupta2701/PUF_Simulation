import { useState } from 'react';
import { loginUser, registerUser, googleLoginUser } from '../lib/api';
import { Lock, User } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';

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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setError('');
    setMsg('');
    console.log("Google Auth Success Response:", credentialResponse);
    
    try {
      if (credentialResponse.credential) {
        console.log("Sending token to backend for verification...");
        const res = await googleLoginUser(credentialResponse.credential);
        
        console.log("Backend verification response:", res);
        
        if (res.success && res.token) {
          console.log("Login successful, passing token to parent component.");
          onLogin(res.token);
        } else {
          console.error("Backend validation failed:", res.message);
          setError(res.message || 'Google Login failed on server validation.');
        }
      } else {
        console.error("No credential found in Google response.");
        setError('Google authentication failed: No token received.');
      }
    } catch (err: any) {
      console.error("API error during Google Login:", err);
      setError(err.message || "An unexpected error occurred during Google authentication.");
    }
  };

  const handleGoogleError = () => {
    setError('Google Sign-In was unsuccessful. Please try again.');
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

        <div className="flex justify-center mt-2">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
          />
        </div>

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
