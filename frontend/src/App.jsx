import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ScanEngine from './pages/ScanEngine';
import HostsInventory from './pages/HostsInventory';
import Vulnerabilities from './pages/Vulnerabilities';
import ScanComparisons from './pages/ScanComparisons';
import AuditLogs from './pages/AuditLogs';

function AppContent() {
  const { token } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');

  if (!token) {
    return <Login />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard setCurrentTab={setCurrentTab} />;
      case 'scans':
        return <ScanEngine />;
      case 'hosts':
        return <HostsInventory />;
      case 'vulnerabilities':
        return <Vulnerabilities />;
      case 'history':
        return <ScanComparisons />;
      case 'audit':
        return <AuditLogs />;
      default:
        return <Dashboard setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <Layout currentTab={currentTab} setCurrentTab={setCurrentTab}>
      {renderContent()}
    </Layout>
  );
}

function App() {
  return (
    <AppContent />
  );
}

export default App;
