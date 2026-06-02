import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Search, 
  AlertTriangle,
  Info,
  Shield,
  Filter,
  CheckCircle
} from 'lucide-react';

const Vulnerabilities = () => {
  const { authenticatedFetch } = useAuth();
  
  const [findings, setFindings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchFindings = async () => {
    setLoading(true);
    try {
      const url = severityFilter 
        ? `/api/hosts/findings/all?severity=${severityFilter}`
        : '/api/hosts/findings/all';
      const res = await authenticatedFetch(url);
      if (res.ok) {
        const data = await res.json();
        setFindings(data);
      }
    } catch (e) {
      console.error('Error fetching findings', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFindings();
  }, [severityFilter]);

  const filteredFindings = findings.filter(f => 
    f.ip_address.includes(searchTerm) || 
    f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Filtering Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 rounded-xl border border-slate-800 bg-[#0c1322]/80">
        <div className="relative w-full sm:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-500" />
          </span>
          <input
            type="text"
            placeholder="Search vulnerabilities by title, desc, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-800 bg-[#0f192b] text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex gap-3 w-full sm:w-auto items-center">
          <span className="text-xs text-slate-400 font-semibold uppercase hidden sm:inline">Severity:</span>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 text-xs rounded-lg border border-slate-800 bg-[#0f192b] text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="HIGH">High Only</option>
            <option value="MEDIUM">Medium Only</option>
            <option value="LOW">Low Only</option>
          </select>
        </div>
      </div>

      {/* Main Vulnerabilities list */}
      <div className="p-6 rounded-xl border border-slate-800 bg-[#0c1322]/85 backdrop-blur">
        <h3 className="text-base font-bold text-white mb-6 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          Vulnerability & Intelligence Module
        </h3>

        {loading ? (
          <div className="py-24 text-center text-slate-500 text-sm">Parsing security definitions...</div>
        ) : filteredFindings.length > 0 ? (
          <div className="space-y-4">
            {filteredFindings.map((f) => (
              <div 
                key={f.id}
                className={`p-5 rounded-lg border flex flex-col md:flex-row justify-between gap-6 transition-all ${
                  f.severity === 'CRITICAL' ? 'bg-red-500/5 border-red-500/25 hover:border-red-500/40 glow-red' :
                  f.severity === 'HIGH' ? 'bg-orange-500/5 border-orange-500/25 hover:border-orange-500/40' :
                  f.severity === 'MEDIUM' ? 'bg-yellow-500/5 border-yellow-500/25 hover:border-yellow-500/40' :
                  'bg-blue-500/5 border-blue-500/25 hover:border-blue-500/40'
                }`}
              >
                {/* Left: Detail information */}
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-bold text-white text-base leading-snug">{f.title}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                      f.severity === 'CRITICAL' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      f.severity === 'HIGH' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                      f.severity === 'MEDIUM' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {f.severity}
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">{f.description}</p>
                  
                  <div className="pt-2 border-t border-slate-900 flex flex-col gap-1.5 text-xs">
                    <span className="font-semibold text-slate-400 uppercase tracking-wide">Remediation Action Required</span>
                    <span className="text-emerald-400 font-medium leading-relaxed">{f.recommendation}</span>
                  </div>
                </div>

                {/* Right: Targeting details */}
                <div className="shrink-0 flex flex-col md:items-end justify-between border-t md:border-t-0 pt-4 md:pt-0 border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Exposed Host IP</span>
                    <span className="font-mono text-sm font-bold text-white block">{f.ip_address}</span>
                    {f.port && (
                      <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono inline-block mt-1 font-semibold">
                        Port {f.port}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-600 font-mono mt-4 block">
                    Detected: {new Date(f.detected_at).toLocaleString()}
                  </span>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center text-slate-500">
            <CheckCircle className="w-12 h-12 text-slate-700 mx-auto mb-4 animate-bounce" />
            <p className="text-sm font-semibold">No active risks or exposed ports found in inventory database!</p>
          </div>
        )}
      </div>

    </div>
  );
};

export default Vulnerabilities;
