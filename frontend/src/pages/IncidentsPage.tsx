import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Incident, Service } from '../types';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Plus, CheckCircle, Clock, MessageSquare } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  // New Incident Modal State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [severity, setSeverity] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('CRITICAL');

  // Timeline Modal State
  const [timelineIncident, setTimelineIncident] = useState<Incident | null>(null);
  const [timelineEvents, setTimelineEvents] = useState<any[]>([]);

  const fetchIncidents = () => {
    api.get('/incidents')
      .then((res) => setIncidents(res.data.incidents))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchIncidents();
    api.get('/services').then((res) => {
      setServices(res.data.services);
      if (res.data.services.length > 0) setServiceId(res.data.services[0].id);
    });
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/incidents', { service_id: serviceId, title, severity, source: 'MANUAL_DASHBOARD' });
      setShowModal(false);
      setTitle('');
      fetchIncidents();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to trigger incident');
    }
  };

  const handleAcknowledge = async (id: string) => {
    try {
      await api.put(`/incidents/${id}/acknowledge`);
      fetchIncidents();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to acknowledge');
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await api.put(`/incidents/${id}/resolve`);
      fetchIncidents();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resolve');
    }
  };

  const handleViewTimeline = async (inc: Incident) => {
    setTimelineIncident(inc);
    try {
      const res = await api.get(`/incidents/${inc.id}/timeline`);
      setTimelineEvents(res.data.timeline);
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Active Incident Console</h1>
          <p className="text-slate-400 text-sm">Real-time alert operations & responder state transitions.</p>
        </div>
        {user?.role !== 'OBSERVER' && (
          <button
            onClick={() => setShowModal(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white font-medium px-4 py-2 rounded-md flex items-center space-x-2 text-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Trigger P1 Incident</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-slate-400">Loading Incidents...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3">Severity / Status</th>
                <th className="px-6 py-3">Incident Title</th>
                <th className="px-6 py-3">Affected Service</th>
                <th className="px-6 py-3">Assignee</th>
                <th className="px-6 py-3">Triggered At</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        inc.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        inc.severity === 'HIGH' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {inc.severity}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        inc.status === 'TRIGGERED' ? 'bg-rose-600 text-white animate-pulse' :
                        inc.status === 'ACKNOWLEDGED' ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                      }`}>
                        {inc.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-white">{inc.title}</td>
                  <td className="px-6 py-4">{inc.service_name || 'System Service'}</td>
                  <td className="px-6 py-4 text-slate-400">{inc.assignee_name || 'Unassigned'}</td>
                  <td className="px-6 py-4 text-slate-400">{new Date(inc.triggered_at).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleViewTimeline(inc)}
                      className="p-1.5 text-slate-400 hover:text-sky-400 transition"
                      title="View Timeline Audit"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                    {inc.status === 'TRIGGERED' && user?.role !== 'OBSERVER' && (
                      <button
                        onClick={() => handleAcknowledge(inc.id)}
                        className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded transition"
                      >
                        Acknowledge
                      </button>
                    )}
                    {inc.status === 'ACKNOWLEDGED' && user?.role !== 'OBSERVER' && (
                      <button
                        onClick={() => handleResolve(inc.id)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-3 py-1.5 rounded transition"
                      >
                        Resolve
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trigger Incident Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold text-white">Trigger Production Incident</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300">Affected Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300">Incident Summary</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 504 Gateway Timeout spike in payment endpoint"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300">Severity Level</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as any)}
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-2 text-white text-sm"
                >
                  <option value="CRITICAL">P1 - CRITICAL (System Outage)</option>
                  <option value="HIGH">P2 - HIGH (Degraded Performance)</option>
                  <option value="MEDIUM">P3 - MEDIUM (Minor Bug)</option>
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
                  className="px-4 py-2 text-sm bg-rose-600 hover:bg-rose-500 text-white font-medium rounded"
                >
                  Trigger Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Audit Drawer */}
      {timelineIncident && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 max-w-lg w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center justify-between">
              <span>Incident Timeline Audit</span>
              <button onClick={() => setTimelineIncident(null)} className="text-slate-400 hover:text-white">✕</button>
            </h3>
            <p className="text-xs text-sky-400 font-semibold">{timelineIncident.title}</p>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {timelineEvents.map((evt) => (
                <div key={evt.id} className="bg-slate-950 p-3 rounded text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span className="font-bold text-slate-200">{evt.event_type}</span>
                    <span>{new Date(evt.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-300">{evt.message}</div>
                  <div className="text-slate-500">Actor: {evt.actor_name || evt.actor_type}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
