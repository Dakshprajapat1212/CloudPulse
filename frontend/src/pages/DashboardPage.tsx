import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AnalyticsData } from '../types';
import { ShieldAlert, CheckCircle, Clock, Server, TrendingUp, AlertTriangle } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/dashboard')
      .then((res) => setData(res.data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading SRE Dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">SRE Command Dashboard</h1>
        <p className="text-slate-400 text-sm">Real-time incident metrics, MTTR SLA compliance, and system health status.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Triggered Incidents</span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-3xl font-extrabold text-rose-400 mt-2">{data?.summary.triggered || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Requires immediate response</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Acknowledged</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 mt-2">{data?.summary.acknowledged || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Responder investigating</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Resolved</span>
            <CheckCircle className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{data?.summary.resolved || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Successfully mitigated</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">SLA MTTR</span>
            <TrendingUp className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold text-sky-400 mt-2">{data?.sla_metrics.mttr_minutes || 0}m</div>
          <div className="text-xs text-emerald-400 mt-1">{data?.sla_metrics.sla_compliance_percent}% SLA Compliance</div>
        </div>
      </div>

      {/* SLA & Health Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-sky-400" />
            <span>Mean Time Performance Metrics</span>
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-sm">Mean Time to Acknowledge (MTTA)</span>
              <span className="text-amber-400 font-bold">{data?.sla_metrics.mtta_minutes} minutes</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-sm">Mean Time to Resolve (MTTR)</span>
              <span className="text-sky-400 font-bold">{data?.sla_metrics.mttr_minutes} minutes</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Target SLA Goal</span>
              <span className="text-emerald-400 font-bold">&lt; 15.0 minutes</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
            <Server className="w-5 h-5 text-emerald-400" />
            <span>Infrastructure Health Status</span>
          </h2>
          <div className="space-y-3">
            {data?.services_health.map((sh) => (
              <div key={sh.status} className="flex justify-between items-center bg-slate-950 p-3 rounded-md">
                <span className="text-sm font-medium text-slate-300">{sh.status} Services</span>
                <span className={`px-2.5 py-1 rounded text-xs font-bold ${
                  sh.status === 'OPERATIONAL' ? 'bg-emerald-500/20 text-emerald-400' :
                  sh.status === 'DEGRADED' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {sh.count} Active
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
