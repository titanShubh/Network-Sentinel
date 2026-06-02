import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { 
  BarChart, Bar, Cell,
  PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  ShieldAlert, 
  Laptop, 
  Plug, 
  PlayCircle, 
  Activity, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

const Dashboard = ({ setCurrentTab }) => {
  const { authenticatedFetch } = useAuth();
  const { scanProgress } = useWebSocket();
  
  const [metrics, setMetrics] = useState({
    totalHosts: 0,
    totalOpenPorts: 0,
    highRisk: 0,
    criticalRisk: 0,
    mediumRisk: 0,
    lowRisk: 0
  });
  const [recentHosts, setRecentHosts] = useState([]);
  const [activeScans, setActiveScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [hostsRes, findingsRes, scansRes] = await Promise.all([
          authenticatedFetch('/api/hosts/list'),
          authenticatedFetch('/api/hosts/findings/all'),
          authenticatedFetch('/api/scans/list')
        ]);

        const hostsData = await hostsRes.json();
        const findingsData = await findingsRes.json();
        const scansData = await scansRes.json();

        // Calculate severity metrics
        const severities = findingsData.reduce((acc, f) => {
          acc[f.severity.toLowerCase()] = (acc[f.severity.toLowerCase()] || 0) + 1;
          return acc;
        }, { critical: 0, high: 0, medium: 0, low: 0 });

        // Calculate total open ports
        const totalOpenPorts = hostsData.reduce((sum, h) => sum + h.open_ports_count, 0);

        setMetrics({
          totalHosts: hostsData.length,
          totalOpenPorts,
          criticalRisk: severities.critical,
          highRisk: severities.high,
          mediumRisk: severities.medium,
          lowRisk: severities.low
        });

        setRecentHosts(hostsData.slice(0, 5));
        setActiveScans(scansData.filter(s => s.status === 'running'));
      } catch (err) {
        console.error('Error fetching dashboard statistics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const riskPieData = [
    { name: 'Critical', value: metrics.criticalRisk, color: '#ef4444' },
    { name: 'High', value: metrics.highRisk, color: '#f97316' },
    { name: 'Medium', value: metrics.mediumRisk, color: '#eab308' },
    { name: 'Low', value: metrics.lowRisk, color: '#3b82f6' }
  ].filter(d => d.value > 0);

  const riskBarData = [
    { name: 'Critical', count: metrics.criticalRisk, color: '#ef4444' },
    { name: 'High', count: metrics.highRisk, color: '#f97316' },
    { name: 'Medium', count: metrics.mediumRisk, color: '#eab308' },
    { name: 'Low', count: metrics.lowRisk, color: '#3b82f6' }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <Activity className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <span className="text-slate-400 text-sm font-semibold">Loading platform metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Active Scan progress notifications banner */}
      {Object.keys(scanProgress).length > 0 && Object.values(scanProgress).some(s => s.status !== 'completed' && s.status !== 'failed') && (
        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-ping"></div>
              <div className="absolute inset-0 w-3 h-3 bg-blue-500 rounded-full"></div>
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Active Scanning Jobs running</p>
              <p className="text-xs text-slate-400">Scan progresses are streamed in real time to the Scan Engine tab.</p>
            </div>
          </div>
          <button 
            onClick={() => setCurrentTab('scans')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-semibold transition-colors"
          >
            Track Status
          </button>
        </div>
      )}

      {/* KPI Card grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/80 backdrop-blur hover-scale">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Active Hosts</p>
              <h3 className="text-3xl font-extrabold text-white mt-2">{metrics.totalHosts}</h3>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-indigo-400">
              <Laptop className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/80 backdrop-blur hover-scale">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Discovered Open Ports</p>
              <h3 className="text-3xl font-extrabold text-white mt-2">{metrics.totalOpenPorts}</h3>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
              <Plug className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/80 backdrop-blur hover-scale">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Critical Risk Findings</p>
              <h3 className="text-3xl font-extrabold text-red-500 mt-2">{metrics.criticalRisk}</h3>
            </div>
            <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-red-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/80 backdrop-blur hover-scale">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">High Risk Findings</p>
              <h3 className="text-3xl font-extrabold text-orange-500 mt-2">{metrics.highRisk}</h3>
            </div>
            <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20 text-orange-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/80 backdrop-blur flex flex-col">
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" />
            Vulnerability Risk Profiles
          </h3>
          <div className="flex-1 min-h-[300px]">
            {riskPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={riskPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {riskPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-slate-500 text-sm">
                No security alerts registered.
              </div>
            )}
          </div>
        </div>

        <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/80 backdrop-blur flex flex-col">
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            Severity Matrix Breakdown
          </h3>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {riskBarData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent hosts discovered */}
      <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/80 backdrop-blur">
        <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
          <Laptop className="w-4 h-4 text-emerald-400" />
          Recently Scanned Hosts
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-[#0f192b]/70 text-slate-400 uppercase text-xs font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Host IP Address</th>
                <th className="py-3 px-4">Resolved Hostname</th>
                <th className="py-3 px-4 text-center">Open Ports</th>
                <th className="py-3 px-4 text-center">Active Findings</th>
                <th className="py-3 px-4 text-right">Last Audit Detection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recentHosts.length > 0 ? (
                recentHosts.map((host) => (
                  <tr key={host.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-white font-semibold">{host.ip_address}</td>
                    <td className="py-3 px-4 text-slate-400">{host.hostname || 'None (No DNS resolved)'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/20">
                        {host.open_ports_count} Open
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {host.findings_count > 0 ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs border ${
                          host.highest_severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          host.highest_severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          host.highest_severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {host.findings_count} Findings ({host.highest_severity})
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right text-xs text-slate-500 font-mono">
                      {new Date(host.last_seen).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500">
                    No active hosts discovered yet. Launch a new scan from the Scan Engine tab!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
