import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  Laptop, 
  ShieldAlert, 
  ChevronRight, 
  Plug,
  ExternalLink,
  Info,
  RefreshCw
} from 'lucide-react';

const HostsInventory = () => {
  const { authenticatedFetch } = useAuth();
  
  const [hosts, setHosts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedHostId, setSelectedHostId] = useState(null);
  const [hostDetails, setHostDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchHosts = async (search = '') => {
    setLoading(true);
    try {
      const url = search 
        ? `/api/hosts/list?search=${encodeURIComponent(search)}`
        : '/api/hosts/list';
      const res = await authenticatedFetch(url);
      if (res.ok) {
        const data = await res.json();
        setHosts(data);
      }
    } catch (e) {
      console.error('Error fetching hosts list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHosts(searchTerm);
  }, [searchTerm]);

  const handleSelectHost = async (hostId) => {
    setSelectedHostId(hostId);
    setDetailsLoading(true);
    try {
      const res = await authenticatedFetch(`/api/hosts/${hostId}/details`);
      if (res.ok) {
        const data = await res.json();
        setHostDetails(data);
      }
    } catch (e) {
      console.error('Error fetching host details', e);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-center p-4 rounded-xl border border-slate-800 bg-[#0c1322]/80">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Search by IP address or hostname..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-800 bg-[#0f192b] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-semibold uppercase">Total Results:</span>
          <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs font-bold font-mono">{hosts.length} Hosts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Hosts List */}
        <div className="lg:col-span-1 p-6 rounded-xl border border-slate-800 bg-[#0c1322]/85 backdrop-blur max-h-[600px] overflow-y-auto">
          <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
            <Laptop className="w-5 h-5 text-indigo-400" />
            Active Host Inventory
          </h3>

          {loading ? (
            <div className="py-20 text-center text-slate-500 text-sm">Searching records...</div>
          ) : hosts.length > 0 ? (
            <div className="space-y-3">
              {hosts.map((host) => (
                <button
                  key={host.id}
                  onClick={() => handleSelectHost(host.id)}
                  className={`w-full text-left p-3.5 rounded-lg border transition-all flex justify-between items-center ${
                    selectedHostId === host.id
                      ? 'border-blue-500/40 bg-blue-500/5'
                      : 'border-slate-850 bg-[#0f192b]/40 hover:bg-slate-800/20'
                  }`}
                >
                  <div>
                    <span className="block text-sm font-bold text-white font-mono">{host.ip_address}</span>
                    <span className="block text-xs text-slate-400 mt-0.5 truncate max-w-[150px]">{host.hostname || 'No hostname resolved'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-bold font-mono">
                      {host.open_ports_count} Open
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-slate-500 text-sm">No hosts discovered matching search terms.</div>
          )}
        </div>

        {/* Right Side: Host Drill-down details */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-slate-800 bg-[#0c1322]/85 backdrop-blur min-h-[400px]">
          {selectedHostId === null ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
              <Laptop className="w-12 h-12 text-slate-700 mb-4 animate-pulse" />
              <p className="text-sm font-semibold">Select an active host from inventory list to view exposed services, banners, and security findings.</p>
            </div>
          ) : detailsLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
              <p className="text-xs">Querying database configurations...</p>
            </div>
          ) : hostDetails ? (
            <div className="space-y-6">
              
              {/* Host Metadata Card */}
              <div className="p-4 rounded-lg bg-[#0f192b]/50 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="text-xl font-extrabold text-white font-mono">{hostDetails.ip_address}</h4>
                  <p className="text-sm text-slate-400 mt-1">{hostDetails.hostname || 'None (No PTR record resolved)'}</p>
                </div>
                <div className="text-left sm:text-right font-mono text-xs text-slate-500">
                  <span>Last Seen Detection:</span>
                  <span className="block text-white font-semibold mt-1">{new Date(hostDetails.last_seen).toLocaleString()}</span>
                </div>
              </div>

              {/* Grid: Open Ports & Findings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Port States */}
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <Plug className="w-4 h-4 text-emerald-400" />
                    Exposed Ports & Banners
                  </h5>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {hostDetails.ports.length > 0 ? (
                      hostDetails.ports.map((port) => (
                        <div key={port.id} className="p-3 rounded bg-slate-900/50 border border-slate-800 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-white font-mono">Port {port.port}</span>
                            <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold rounded">
                              {port.state}
                            </span>
                          </div>
                          <div className="text-xs font-mono text-slate-400 flex justify-between">
                            <span>Service: <b>{port.service || 'Unknown'}</b></span>
                            {port.banner && <span className="text-slate-500 max-w-[130px] truncate" title={port.banner}>{port.banner}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-slate-600 text-xs">No open ports detected.</div>
                    )}
                  </div>
                </div>

                {/* Security Findings */}
                <div className="space-y-3">
                  <h5 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                    Security Risk Analysis
                  </h5>

                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {hostDetails.findings.length > 0 ? (
                      hostDetails.findings.map((f) => (
                        <div 
                          key={f.id} 
                          className={`p-3 rounded border space-y-2 ${
                            f.severity === 'CRITICAL' ? 'bg-red-500/5 border-red-500/25' :
                            f.severity === 'HIGH' ? 'bg-orange-500/5 border-orange-500/25' :
                            f.severity === 'MEDIUM' ? 'bg-yellow-500/5 border-yellow-500/25' :
                            'bg-blue-500/5 border-blue-500/25'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="text-xs font-bold text-white leading-snug">{f.title}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold border ${
                              f.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                              f.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                              f.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                              'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                              {f.severity}
                            </span>
                          </div>
                          
                          <div className="text-[11px] text-slate-300 leading-normal">
                            <p className="font-semibold text-slate-400">Description:</p>
                            <p className="mt-0.5 text-slate-300">{f.description}</p>
                            <p className="font-semibold text-slate-400 mt-2">Remediation:</p>
                            <p className="mt-0.5 text-emerald-300">{f.recommendation}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-slate-600 text-xs">No risk findings on this host!</div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          ) : null}
        </div>

      </div>
    </div>
  );
};

export default HostsInventory;
