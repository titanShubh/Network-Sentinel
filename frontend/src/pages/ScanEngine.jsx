import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  Play, 
  RefreshCw, 
  Activity, 
  AlertCircle, 
  Clock, 
  User, 
  Compass, 
  Network,
  Cpu
} from 'lucide-react';

const ScanEngine = () => {
  const { authenticatedFetch } = useAuth();
  const { scanProgress } = useWebSocket();
  
  const [targetRange, setTargetRange] = useState('127.0.0.1');
  const [portsScanned, setPortsScanned] = useState('21,22,23,80,443,3306,6379');
  const [threadCount, setThreadCount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [scans, setScans] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchScans = async () => {
    try {
      const res = await authenticatedFetch('/api/scans/list');
      if (res.ok) {
        const data = await res.json();
        setScans(data);
      }
    } catch (e) {
      console.error('Error fetching scans', e);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleStartScan = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/scans/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_range: targetRange,
          ports_scanned: portsScanned,
          thread_count: threadCount
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Scan started successfully with ID: ${data.scan_id}`);
        fetchScans();
      } else {
        setError(data.detail || 'Failed to start scan');
      }
    } catch (err) {
      setError(err.message || 'Server error, could not start scan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form setup for scan job */}
        <div className="lg:col-span-1 p-6 rounded-xl border border-slate-800 bg-[#0c1322]/85 backdrop-blur flex flex-col">
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            Configure Scanner Task
          </h3>

          {error && (
            <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <Activity className="w-4 h-4 shrink-0" />
              {success}
            </div>
          )}

          <form onSubmit={handleStartScan} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Target Range / IPs</label>
              <input
                type="text"
                required
                value={targetRange}
                onChange={(e) => setTargetRange(e.target.value)}
                placeholder="192.168.1.1-50 or 10.0.0.0/24"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-800 bg-[#0f192b] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Supports single IP, comma separated lists, hyphen ranges, or CIDR blocks.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Port Range</label>
              <input
                type="text"
                value={portsScanned}
                onChange={(e) => setPortsScanned(e.target.value)}
                placeholder="22-80, 443, 3306"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-800 bg-[#0f192b] text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Enter single ports, ranges or leave blank for default top scan services.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Concurrent Scan Threads</label>
              <input
                type="number"
                min="1"
                max="200"
                value={threadCount}
                onChange={(e) => setThreadCount(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-800 bg-[#0f192b] text-white text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/35"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Scan thread pool speed (Default 50, Max 200).</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              {loading ? 'Initializing Execution...' : 'Launch Network Scan'}
            </button>
          </form>
        </div>

        {/* Real-time status display and historical jobs log */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Realtime progress tracker */}
          <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/85 backdrop-blur">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                Real-Time Scan Progress
              </h3>
              <button 
                onClick={fetchScans}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {Object.keys(scanProgress).length > 0 ? (
              <div className="space-y-6">
                {Object.entries(scanProgress).map(([id, data]) => (
                  <div key={id} className="p-4 rounded-lg bg-[#0f192b]/60 border border-slate-800/80 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-blue-400">Scan Execution #{id}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-400 font-semibold uppercase">Phase: {data.status}</span>
                          <span className="text-slate-600">•</span>
                          <span className="text-xs text-slate-500">{data.current_port_range || 'Initializing'}</span>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-white">{data.progress}%</span>
                    </div>

                    {/* Styled progress bar */}
                    <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 rounded-full ${
                          data.status === 'failed' ? 'bg-red-500' :
                          data.status === 'completed' ? 'bg-emerald-500' :
                          'bg-gradient-to-r from-blue-500 to-indigo-500'
                        }`}
                        style={{ width: `${data.progress}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-850 text-[11px] text-slate-400 font-mono">
                      <div>
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-sans font-bold">Target IP</span>
                        <span className="truncate block font-semibold text-white">{data.current_host || 'N/A'}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-sans font-bold">Hosts Up</span>
                        <span className="font-semibold text-emerald-400">{data.hosts_found ?? 0}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[9px] uppercase tracking-wider font-sans font-bold">Time Left</span>
                        <span className="font-semibold text-white">{data.estimated_completion}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-slate-500 text-sm">
                No scans executing. Configure a target range and start a scan task.
              </div>
            )}
          </div>

          {/* Historical Scans list */}
          <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/85 backdrop-blur">
            <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              Scanner History Log
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0f192b]/70 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Targets</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Hosts Found</th>
                    <th className="py-3 px-4 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {scans.length > 0 ? (
                    scans.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-800/10">
                        <td className="py-3 px-4 font-bold text-white font-mono">#{s.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-300 font-mono truncate max-w-[150px]" title={s.target_range}>{s.target_range}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            s.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            s.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-white font-mono">{s.total_hosts_found}</td>
                        <td className="py-3 px-4 text-right text-slate-500 font-mono">
                          {new Date(s.started_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-600">No scans found in database.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ScanEngine;
