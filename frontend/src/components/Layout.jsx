import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Shield, 
  LayoutDashboard, 
  ScanLine, 
  Laptop, 
  ShieldAlert, 
  History, 
  FileSpreadsheet, 
  FileText,
  LogOut, 
  Sun, 
  Moon,
  Clock
} from 'lucide-react';

const Layout = ({ currentTab, setCurrentTab, children }) => {
  const { user, logout, theme, toggleTheme } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'scans', label: 'Scan Engine', icon: ScanLine },
    { id: 'hosts', label: 'Host Inventory', icon: Laptop },
    { id: 'vulnerabilities', label: 'Vulnerabilities', icon: ShieldAlert },
    { id: 'history', label: 'Scan Comparisons', icon: History },
    { id: 'audit', label: 'Audit Logs', icon: Clock },
  ];

  return (
    <div className="min-h-screen flex bg-slate-900 text-slate-100 dark:bg-[#0b0f19] dark:text-slate-100 light:bg-slate-50 light:text-slate-900 transition-colors duration-300">
      {/* Sidebar navigation */}
      <aside className="w-64 border-r border-slate-800 bg-[#0f172a] dark:bg-[#0c1322] flex flex-col z-20">
        {/* Brand logo */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <h2 className="font-bold text-lg tracking-tight text-white">SENTINEL</h2>
            <p className="text-xs text-slate-400">Network Security</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-4 space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* User context footer */}
        <div className="p-4 border-t border-slate-800 space-y-2 bg-[#0c1322]/80">
          <div className="flex items-center justify-between px-2">
            <div className="flex flex-col">
              <span className="text-xs text-slate-500">Log in as</span>
              <span className="text-sm font-semibold text-white">{user}</span>
            </div>
            <button 
              onClick={toggleTheme}
              className="p-1.5 rounded-lg border border-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out Session
          </button>
        </div>
      </aside>

      {/* Main workspace container */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 border-b border-slate-800/80 px-8 bg-[#0f172a]/20 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-slate-500">Security Control</span>
            <span className="text-slate-600">/</span>
            <span className="text-sm font-semibold text-white capitalize">{currentTab.replace('-', ' ')}</span>
          </div>
        </header>
        <div className="p-8 max-w-7xl w-full mx-auto flex-1">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
