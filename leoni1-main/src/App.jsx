import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { MissionsProvider } from "./context/MissionsContext.jsx";
import { NotificationsProvider } from "./context/NotificationsContext.jsx";
import { RecrutementsProvider } from "./context/RecrutementsContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import DormsPage from "./pages/DormsPage.jsx";
import DormResidentsPage from "./pages/DormResidentsPage.jsx";
import MissionsPage from "./pages/MissionsPage.jsx";
import ContractsPage from "./pages/ContractsPage.jsx";
import ContractReceptionPage from "./pages/ContractReceptionPage.jsx";
import ContractSessionsPage from "./pages/ContractSessionsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import SetupAccountPage from "./pages/SetupAccountPage.jsx";
import EmployeesPage from "./pages/EmployeesPage.jsx";
import CreateMissionPage from "./pages/CreateMissionPage.jsx";
import CandidatsPage from "./pages/CandidatsPage.jsx";
import CandidatDossierPage from "./pages/CandidatDossierPage.jsx";
import AdminPowerBIPage from "./pages/AdminPowerBIPage.jsx";
import {
  CONTRACT_ACCESS_ROLES,
  ROLE_ADMIN,
  ROLE_RECRUTEUR,
  ROLE_RESPONSABLE_CONTRAT,
  getHomeRouteForRole,
  hasFoyerAccess,
  hasRole,
} from "./utils/roles.js";
import "./App.css";

function ProtectedRoute({ children, allowedRoles, accessCheck }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !hasRole(user, allowedRoles)) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }
  if (accessCheck && !accessCheck(user)) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }
  return children;
}

function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-shell">
      <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} />
      <div className="app-layout">
        <Sidebar isOpen={sidebarOpen} />
        <div className="app-main">
          <div className="app-content">
            <Routes>
              <Route path="/" element={
                <ProtectedRoute allowedRoles={[ROLE_ADMIN]}><AdminPowerBIPage /></ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={[ROLE_ADMIN]}><AdminPowerBIPage /></ProtectedRoute>
              } />
              <Route path="/dorms" element={
                <ProtectedRoute accessCheck={hasFoyerAccess}><DormsPage /></ProtectedRoute>
              } />
              <Route path="/dorms/:dormId" element={
                <ProtectedRoute accessCheck={hasFoyerAccess}><DormResidentsPage /></ProtectedRoute>
              } />
              <Route path="/missions" element={
                <ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_RECRUTEUR]}>
                  <MissionsPage />
                </ProtectedRoute>
              } />
              <Route path="/missions/create" element={
                <ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_RECRUTEUR]}><CreateMissionPage /></ProtectedRoute>
              } />
              <Route path="/candidats" element={
                <ProtectedRoute allowedRoles={[ROLE_RECRUTEUR]}><Navigate to="/candidats/candidat" replace /></ProtectedRoute>
              } />
              <Route path="/candidats/:typePage" element={
                <ProtectedRoute allowedRoles={[ROLE_RECRUTEUR]}><CandidatsPage /></ProtectedRoute>
              } />
              <Route path="/candidats/:typePage/:candidatId/dossier" element={
                <ProtectedRoute allowedRoles={[ROLE_RECRUTEUR, ROLE_RESPONSABLE_CONTRAT]}><CandidatDossierPage /></ProtectedRoute>
              } />
              <Route path="/contracts" element={
                <ProtectedRoute allowedRoles={CONTRACT_ACCESS_ROLES}>
                  <ContractsPage />
                </ProtectedRoute>
              } />
              <Route path="/contracts/reception" element={
                <ProtectedRoute allowedRoles={CONTRACT_ACCESS_ROLES}><ContractReceptionPage /></ProtectedRoute>
              } />
              <Route path="/contracts/sessions" element={
                <ProtectedRoute allowedRoles={CONTRACT_ACCESS_ROLES}><ContractSessionsPage /></ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={[ROLE_ADMIN, ROLE_RECRUTEUR, ROLE_RESPONSABLE_CONTRAT]}><ProfilePage /></ProtectedRoute>
              } />
              <Route path="/change-password" element={
                <Navigate to="/profile" replace />
              } />
              <Route path="/employees" element={
                <ProtectedRoute allowedRoles={[ROLE_ADMIN]}><EmployeesPage /></ProtectedRoute>
              } />
              <Route path="/admin/dashboards" element={
                <ProtectedRoute allowedRoles={[ROLE_ADMIN]}><AdminPowerBIPage /></ProtectedRoute>
              } />
              <Route path="*" element={<Navigate to={getHomeRouteForRole(user.role)} replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginPageWrapper() {
  const { user } = useAuth();
  if (user) {
    return <Navigate to={getHomeRouteForRole(user.role)} replace />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationsProvider>
          <MissionsProvider>
            <RecrutementsProvider>
            <Routes>
              <Route path="/login" element={<LoginPageWrapper />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/setup-account" element={<SetupAccountPage />} />
              <Route path="/*"    element={<AppLayout />} />
            </Routes>
            </RecrutementsProvider>
          </MissionsProvider>
        </NotificationsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
