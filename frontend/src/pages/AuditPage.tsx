import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/audit-logs')
      .then((res) => setLogs(res.data.audit_logs))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Security Audit Log Vault</h1>
        <p className="text-slate-400 text-sm">Immutable audit trial of system actions, user state changes, and incident operations.</p>
      </div>

      {loading ? (
        <div className="text-slate-400">Loading Audit Logs...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase text-xs font-semibold">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Target Resource</th>
                <th className="px-6 py-3">User / Actor</th>
                <th className="px-6 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono text-xs">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/50">
                  <td className="px-6 py-3 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-6 py-3 text-sky-400 font-bold">{log.action}</td>
                  <td className="px-6 py-3 text-slate-300">{log.resource_type} ({log.resource_id?.slice(0, 8) || 'SYSTEM'})</td>
                  <td className="px-6 py-3 text-slate-300">{log.user_name || 'System Worker'}</td>
                  <td className="px-6 py-3 text-slate-500">{log.ip_address || 'Internal Network'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
