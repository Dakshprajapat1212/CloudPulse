import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Service } from '../types';
import { useAuth } from '../context/AuthContext';
import { Server, Plus } from 'lucide-react';

export const ServicesPage: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [tier, setTier] = useState<'CRITICAL' | 'STANDARD' | 'LOW'>('CRITICAL');
  const [showModal, setShowModal] = useState(false);

  const fetchServices = () => {
    api.get('/services')
      .then((res) => setServices(res.data.services))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/services', { name, tier });
      setShowModal(false);
      setName('');
      fetchServices();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to register service');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Microservices Directory</h1>
          <p className="text-slate-400 text-sm">Monitored cloud services, criticality tiers, and operational status.</p>
        </div>
        {(user?.role === 'ADMIN' || user?.role === 'SRE_MANAGER') && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-sky-600 hover:bg-sky-500 text-white font-medium px-4 py-2 rounded-md flex items-center space-x-2 text-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register Service</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-400">Loading Services...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {services.map((s) => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 p-6 rounded-lg space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                    <Server className="w-5 h-5 text-sky-400" />
                    <span>{s.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">{s.slug}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  s.status === 'OPERATIONAL' ? 'bg-emerald-500/20 text-emerald-400' :
                  s.status === 'DEGRADED' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400 animate-pulse'
                }`}>
                  {s.status}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                <span>Tier: <strong className="text-slate-200">{s.tier}</strong></span>
                <span>Open Incidents: <strong className="text-amber-400">{s.open_incidents || 0}</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Register New Microservice</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300">Service Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Authentication Service"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Criticality Tier</label>
                <select
                  value={tier}
                  onChange={(e) => setTier(e.target.value as any)}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                >
                  <option value="CRITICAL">Tier 1 - CRITICAL</option>
                  <option value="STANDARD">Tier 2 - STANDARD</option>
                  <option value="LOW">Tier 3 - LOW</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-sky-600 hover:bg-sky-500 text-white font-medium rounded"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
