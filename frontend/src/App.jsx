import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import ChatComponent from './components/Chat';
import Auth from './pages/Auth';
import RoleClassification from './pages/RoleClassification';
import { RiskTier } from './pages/Placeholders';
import Documents from './components/Documents';
import AuditLogs from './components/AuditLogs';
import RedTeamComponent from './components/RedTeam';
import ComplianceCheck from './components/ComplianceCheck';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }
  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/" element={<ChatComponent userId={user?.user_id || ''} />} />
        <Route path="/compliance" element={<ComplianceCheck />} />
        <Route path="/risk-tier" element={<RiskTier />} />
        <Route path="/role" element={<RoleClassification />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/red-team" element={<RedTeamComponent />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;