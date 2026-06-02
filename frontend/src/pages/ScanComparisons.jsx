import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  History, 
  ArrowRight, 
  Activity, 
  AlertCircle,
  FileText,
  FileSpreadsheet,
  Download,
  Info,
  CheckCircle,
  XCircle,
  Maximize2
} from 'lucide-react';

const ScanComparisons = () => {
  const { authenticatedFetch } = useAuth();
  
  const [scans, setScans] = useState([]);
  const [selectedScanA, setSelectedScanA] = useState('');
  const [selectedScanB, setSelectedScanB] = useState('');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchScans = async () => {
    try {
      const res = await authenticatedFetch('/api/scans/list');
      if (res.ok) {
        const data = await res.json();
        const completed = data.filter(s => s.status === 'completed');
        setScans(completed);
        if (completed.length >= 2) {
          setSelectedScanA(completed[1].id.toString());
          setSelectedScanB(completed[0].id.toString());
        }
      }
    } catch (e) {
      console.error('Error fetching scans', e);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleCompare = async () => {
    if (!selectedScanA || !selectedScanB) {
      setError('Please select two scans to run difference analysis.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await authenticatedFetch(`/api/scans/compare?scan_a_id=${selectedScanA}&scan_b_id=${selectedScanB}`);
      if (res.ok) {
        const data = await res.json();
        setComparison(data);
      } else {
        const errData = await res.json();
        setError(errData.detail || 'Failed to compare scans');
      }
    } catch (err) {
      setError('Connection failure communicating with comparison microservice.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Selector Panel */}
        <div className="lg:col-span-1 p-6 rounded-xl border border-slate-800 bg-[#0c1322]/85 backdrop-blur space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            Select Historical Targets
          </h3>

          {error && (
            <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Base Baseline Scan (Scan A)</label>
              <select
                value={selectedScanA}
                onChange={(e) => setSelectedScanA(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-800 bg-[#0f192b] text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Base Scan</option>
                {scans.map(s => (
                  <option key={s.id} value={s.id}>
                    Scan #{s.id} - {new Date(s.started_at).toLocaleDateString()} ({s.target_range})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-center py-1">
              <ArrowRight className="w-5 h-5 text-slate-600 rotate-90 lg:rotate-0" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Comparison Scan (Scan B)</label>
              <select
                value={selectedScanB}
                onChange={(e) => setSelectedScanB(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-lg border border-slate-800 bg-[#0f192b] text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Comparison Scan</option>
                {scans.map(s => (
                  <option key={s.id} value={s.id}>
                    Scan #{s.id} - {new Date(s.started_at).toLocaleDateString()} ({s.target_range})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCompare}
              disabled={loading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 mt-4 text-sm"
            >
              <Maximize2 className="w-4 h-4" />
              {loading ? 'Evaluating Diffs...' : 'Run Differential Compare'}
            </button>
          </div>

          {/* Quick PDF/CSV downloads for comparison target B */}
          {selectedScanB && (
            <div className="pt-6 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Export Report (Scan B)</h4>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={async () => {
                    try {
                      const res = await authenticatedFetch(`/api/reports/pdf/${selectedScanB}`);
                      if (res.ok) {
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `network_sentinel_report_${selectedScanB}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                      }
                    } catch (e) {
                      console.error("Error downloading PDF", e);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-500/35 rounded-lg text-xs font-semibold text-red-400 transition-colors text-center cursor-pointer w-full"
                >
                  <FileText className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={async () => {
                    try {
                      const res = await authenticatedFetch(`/api/reports/csv/${selectedScanB}`);
                      if (res.ok) {
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `network_sentinel_report_${selectedScanB}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                      }
                    } catch (e) {
                      console.error("Error downloading CSV", e);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/35 rounded-lg text-xs font-semibold text-emerald-400 transition-colors text-center cursor-pointer w-full"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 p-6 rounded-xl border border-slate-800 bg-[#0c1322]/85 backdrop-blur min-h-[400px]">
          {!comparison ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
              <History className="w-12 h-12 text-slate-700 mb-4 animate-pulse" />
              <p className="text-sm font-semibold">Select baseline configuration scans on the left side menu to map newly exposed ports and closed services.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-slate-850 pb-4">
                <Activity className="w-5 h-5 text-indigo-400" />
                Scan Differential Analysis Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Newly Exposed Ports */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-red-400 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    Newly Exposed Ports (In B, missing in A)
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {comparison.newly_exposed_services.length > 0 ? (
                      comparison.newly_exposed_services.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded bg-red-955/10 border border-red-500/20 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-sm font-bold text-white">{item.ip}</span>
                            <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded">
                              Exposed Port {item.port}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block font-semibold">Service detected: {item.service}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-slate-650 text-xs">No newly exposed ports discovered.</div>
                    )}
                  </div>
                </div>

                {/* Closed / Secured Services */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Closed Ports (In A, absent in B)
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {comparison.closed_services.length > 0 ? (
                      comparison.closed_services.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded bg-emerald-955/10 border border-emerald-500/20 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-sm font-bold text-white">{item.ip}</span>
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">
                              Port {item.port} Closed
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 block font-semibold">Service: {item.service}</span>
                        </div>
                      ))
                    ) : (
                      <div className="py-10 text-center text-slate-650 text-xs">No ports were closed/modified.</div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ScanComparisons;
