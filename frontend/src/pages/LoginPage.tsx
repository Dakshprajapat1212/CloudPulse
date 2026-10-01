import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Activity, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('sre.admin@cloudpulse.io');
  const [password, setPassword] = useState('Password123!');
  const [fullName, setFullName] = useState('Senior SRE Lead');
  const [tenantName, setTenantName] = useState('Acme Cloud Operations');
  const [role, setRole] = useState('ADMIN');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.post('/auth/register', {
          tenant_name: tenantName,
          email,
          password,
          full_name: fullName,
          role,
        });
        login(res.data.token, res.data.user);
      } else {
        const res = await api.post('/auth/login', { email, password });
        login(res.data.token, res.data.user);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="max-w-md w-full space-y-8 bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center p-3 bg-sky-500/10 rounded-full text-sky-400 mb-4">
            <Activity className="w-10 h-10 animate-pulse" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">CloudPulse</h2>
          <p className="mt-2 text-sm text-slate-400">
            Enterprise Cloud SRE Incident & Alert Routing Platform
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          {isRegister && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300">Organization / Tenant Name</label>
                <input
                  type="text"
                  required
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
                >
                  <option value="ADMIN">ADMIN (Full Access)</option>
                  <option value="SRE_MANAGER">SRE_MANAGER</option>
                  <option value="RESPONDER">RESPONDER</option>
                  <option value="OBSERVER">OBSERVER (Read-Only)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2.5 rounded-md transition duration-200 flex items-center justify-center space-x-2"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>{loading ? 'Processing...' : isRegister ? 'Create Organization Account' : 'Sign In'}</span>
          </button>
        </form>

        <div className="text-center">
          <button
            onClick={() => setIsRegister(!isRegister)}
            className="text-sm text-sky-400 hover:underline"
          >
            {isRegister ? 'Already have an account? Sign In' : 'Need a new tenant workspace? Register here'}
          </button>
        </div>
      </div>
    </div>
  );
};
