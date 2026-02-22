import { useState } from 'react';
import { Shield, LogIn, Eye, EyeOff } from 'lucide-react';
import { useMonitoringStore } from '../../store/useMonitoringStore';

const demoCredentials = [
  { username: 'admin', password: 'admin123', label: 'Full Access', role: 'admin' },
  { username: 'operator', password: 'operator123', label: 'Operations', role: 'operator' },
  { username: 'viewer', password: 'viewer123', label: 'Read Only', role: 'viewer' },
];

export function LoginPage() {
  const setAuth = useMonitoringStore((s) => s.setAuth);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Login failed');
        return;
      }

      setAuth(result.user, result.token);
    } catch {
      setError('Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">AI Agent Monitor</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-1">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 w-full text-slate-100 focus:border-blue-500 focus:outline-none"
              placeholder="Enter username"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 w-full text-slate-100 focus:border-blue-500 focus:outline-none pr-12"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-medium disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <span>Signing in...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="bg-slate-800/50 rounded-lg p-4 mt-6">
          <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wider">Demo Credentials</p>
          <div className="space-y-2">
            {demoCredentials.map((cred) => (
              <div key={cred.username} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase ${
                      cred.role === 'admin'
                        ? 'bg-purple-500/20 text-purple-400'
                        : cred.role === 'operator'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-slate-700 text-slate-400'
                    }`}
                  >
                    {cred.role}
                  </span>
                  <span className="text-slate-300 font-mono text-xs">
                    {cred.username} / {cred.password}
                  </span>
                </div>
                <span className="text-slate-500 text-xs">{cred.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
