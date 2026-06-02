import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, ShieldAlert, User, Activity, AlertCircle } from 'lucide-react';

const AuditLogs = () => {
  const { authenticatedFetch } = useAuth();
  
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await authenticatedFetch('/api/audit/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Error fetching audit logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/85 backdrop-blur">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            Compliance & Security Audit Trail
          </h3>
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Real-time Streamed logs</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm">Loading security events...</div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0f192b]/70 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Event Date</th>
                  <th className="py-3.5 px-4">Operator</th>
                  <th className="py-3.5 px-4">Executed Action</th>
                  <th className="py-3.5 px-4 text-right">Internal Node ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/10 transition-colors">
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-blue-400 font-semibold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      {log.username}
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-sans font-semibold">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      event_{log.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-slate-500">
            No compliance logs found.
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
