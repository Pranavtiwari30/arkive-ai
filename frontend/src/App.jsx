import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell';
import ChatComponent from './components/Chat';
import Auth from './pages/Auth';
import RoleClassification from './pages/RoleClassification';
import { RiskTier, Documents, AuditLogs } from './pages/Placeholders';
import RedTeamComponent from './components/RedTeam';
import ComplianceCheck from './components/ComplianceCheck';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        
        {/* Protected routes wrapped in AppShell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<ChatComponent userId="john" />} />
          <Route path="/compliance" element={<ComplianceCheck />} />
          <Route path="/risk-tier" element={<RiskTier />} />
          <Route path="/role" element={<RoleClassification />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/red-team" element={<RedTeamComponent />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;