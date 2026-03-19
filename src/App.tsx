import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import DashboardHome from "./pages/dashboard/DashboardHome";
import UsersPage from "./pages/dashboard/UsersPage";
import CohortsPage from "./pages/dashboard/CohortsPage";
import IdeasPage from "./pages/dashboard/IdeasPage";
import AnnouncementsManagePage from "./pages/dashboard/AnnouncementsManagePage";
import AuditLogsPage from "./pages/dashboard/AuditLogsPage";
import StartupsPage from "./pages/dashboard/StartupsPage";
import ProfilePage from "./pages/dashboard/ProfilePage";

const queryClient = new QueryClient();

const DashboardPage = ({ children, permission }: {
  children: React.ReactNode;
  permission?: string;
}) => (
  <ProtectedRoute requiredPermission={permission}>
    <DashboardLayout>{children}</DashboardLayout>
  </ProtectedRoute>
);

import { useEffect } from "react";

const App = () => {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/change-password" element={<ChangePassword />} />

              <Route path="/dashboard" element={<DashboardPage><DashboardHome /></DashboardPage>} />
              <Route path="/dashboard/users" element={<DashboardPage permission="users.view"><UsersPage /></DashboardPage>} />
              <Route path="/dashboard/cohorts" element={<DashboardPage permission="cohorts.view"><CohortsPage /></DashboardPage>} />
              <Route path="/dashboard/ideas" element={<DashboardPage><IdeasPage /></DashboardPage>} />
              <Route path="/dashboard/startups" element={<DashboardPage><StartupsPage /></DashboardPage>} />
              <Route path="/dashboard/profile" element={<DashboardPage><ProfilePage /></DashboardPage>} />
              <Route path="/dashboard/announcements" element={<DashboardPage permission="announcements.view"><AnnouncementsManagePage /></DashboardPage>} />
              <Route path="/dashboard/audit-logs" element={<DashboardPage permission="audit.view"><AuditLogsPage /></DashboardPage>} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
