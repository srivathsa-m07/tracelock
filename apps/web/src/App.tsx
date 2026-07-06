import { Routes, Route } from 'react-router-dom';
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
import LandingPage from './pages/LandingPage';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  return (
    <Routes>
      {/* ── Public pages (no shell) ────────────────────────── */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* ── App pages (inside shell) ───────────────────────── */}
      <Route path="/dashboard" element={<Shell><Dashboard /></Shell>} />
      <Route path="/scans" element={<Shell><Scans /></Shell>} />
      <Route path="/scans/:scanId" element={<Shell><ScanDetail /></Shell>} />
      <Route path="/scans/:scanId/risk-summary" element={<Shell><RiskSummary /></Shell>} />
      <Route path="/scans/:scanId/propagation" element={<Shell><PropagationAnalysis /></Shell>} />
      <Route path="/scans/:scanId/dependency-tree" element={<Shell><DependencyTree /></Shell>} />
      <Route path="/scans/:scanId/graph" element={<Shell><DependencyGraph /></Shell>} />
      <Route path="/executive" element={<Shell><ExecutiveOverview /></Shell>} />
      <Route path="/organization" element={<Shell><OrganizationOverview /></Shell>} />

      {/* ── 404 fallback ───────────────────────────────────── */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default App
