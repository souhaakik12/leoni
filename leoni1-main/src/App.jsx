import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { MissionsProvider } from "./context/MissionsContext.jsx";
import { RecrutementsProvider } from "./context/RecrutementsContext.jsx";
import Sidebar from "./components/Sidebar.jsx";
import Navbar from "./components/Navbar.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import DormsPage from "./pages/DormsPage.jsx";
import DormResidentsPage from "./pages/DormResidentsPage.jsx";
import MissionsPage from "./pages/MissionsPage.jsx";
import ContractsPage from "./pages/ContractsPage.jsx";
import RecruteurDashboard from "./pages/RecruteurDashboard.jsx";
import ContractReceptionPage from "./pages/ContractReceptionPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import CreateMissionPage from "./pages/CreateMissionPage.jsx";
import CandidatsPage from "./pages/CandidatsPage.jsx";
import CandidatDossierPage from "./pages/CandidatDossierPage.jsx";
import "./App.css";

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  if (!user) return <Navigate to="/login" replace />;
  const homeRoute = { admin: "/", recruteur: "/missions", contrats: "/contracts/reception" };

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} />
      <div className="app-main">
        <Navbar onToggleSidebar={() => setSidebarOpen(v => !v)} />
        <div className="app-content">
          <Routes>
            <Route path="/" element={
              <ProtectedRoute allowedRoles={["admin"]}><HomePage /></ProtectedRoute>
            } />
            <Route path="/dorms" element={
              <ProtectedRoute allowedRoles={["admin","recruteur"]}><DormsPage /></ProtectedRoute>
            } />
            <Route path="/dorms/:dormId" element={
              <ProtectedRoute allowedRoles={["admin","recruteur"]}><DormResidentsPage /></ProtectedRoute>
            } />
            <Route path="/missions" element={
              <ProtectedRoute allowedRoles={["admin","recruteur"]}>
                {user.role === "recruteur" ? <RecruteurDashboard /> : <MissionsPage />}
              </ProtectedRoute>
            } />
            <Route path="/missions/create" element={
              <ProtectedRoute allowedRoles={["admin","recruteur"]}><CreateMissionPage /></ProtectedRoute>
            } />
            <Route path="/candidats" element={
              <ProtectedRoute allowedRoles={["admin","recruteur"]}><Navigate to="/candidats/candidat" replace /></ProtectedRoute>
            } />
            <Route path="/candidats/:typePage" element={
              <ProtectedRoute allowedRoles={["admin","recruteur"]}><CandidatsPage /></ProtectedRoute>
            } />
            <Route path="/candidats/:typePage/:candidatId/dossier" element={
              <ProtectedRoute allowedRoles={["admin","recruteur","contrats"]}><CandidatDossierPage /></ProtectedRoute>
            } />
            <Route path="/contracts" element={
              <ProtectedRoute allowedRoles={["admin","contrats"]}>
                {user.role === "contrats" ? <Navigate to="/contracts/reception" replace /> : <ContractsPage />}
              </ProtectedRoute>
            } />
            <Route path="/contracts/reception" element={
              <ProtectedRoute allowedRoles={["admin","contrats"]}><ContractReceptionPage /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute allowedRoles={["recruteur","contrats"]}><ProfilePage /></ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to={homeRoute[user.role] || "/"} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function LoginPageWrapper() {
  const { user } = useAuth();
  if (user) {
    const routes = { admin: "/", recruteur: "/missions", contrats: "/contracts/reception" };
    return <Navigate to={routes[user.role] || "/"} replace />;
  }
  return <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MissionsProvider>
          <RecrutementsProvider>
          <Routes>
            <Route path="/login" element={<LoginPageWrapper />} />
            <Route path="/*"    element={<AppLayout />} />
          </Routes>
          </RecrutementsProvider>
        </MissionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
