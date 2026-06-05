import { Routes, Route, Navigate } from 'react-router-dom';
import Shell from './components/Shell';
import Dashboard from './pages/Dashboard';
import Scans from './pages/Scans';
import ScanDetail from './pages/ScanDetail';
import RiskSummary from './pages/RiskSummary';
import PropagationAnalysis from './pages/PropagationAnalysis';
import DependencyTree from './pages/DependencyTree';
import ExecutiveOverview from './pages/ExecutiveOverview';
import OrganizationOverview from './pages/OrganizationOverview';
import DependencyGraph from './pages/DependencyGraph';
import './App.css';

function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scans" element={<Scans />} />
        <Route path="/scans/:scanId" element={<ScanDetail />} />
        <Route path="/scans/:scanId/risk-summary" element={<RiskSummary />} />
        <Route path="/scans/:scanId/propagation" element={<PropagationAnalysis />} />
        <Route path="/scans/:scanId/dependency-tree" element={<DependencyTree />} />
        <Route path="/scans/:scanId/graph" element={<DependencyGraph />} />
        <Route path="/executive" element={<ExecutiveOverview />} />
        <Route path="/organization" element={<OrganizationOverview />} />
      </Routes>
    </Shell>
  );
}

export default App
