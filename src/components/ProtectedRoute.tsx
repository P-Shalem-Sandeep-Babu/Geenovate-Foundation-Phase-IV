import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: "super_admin" | "category_admin" | "member" | "viewer";
  /** Allow alumni read-only access */
  allowAlumni?: boolean;
}

export default function ProtectedRoute({ children, requiredPermission, requiredRole, allowAlumni }: Props) {
  const { user, profile, loading, hasPermission, hasRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Suspended users are blocked
  if (profile?.status === "suspended") return <Navigate to="/login" replace />;

  // Alumni get read-only access only if allowed
  if (profile?.status === "alumni" && !allowAlumni) return <Navigate to="/dashboard" replace />;

  // Forced password change
  if (profile?.must_change_password) return <Navigate to="/change-password" replace />;

  // Permission check
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Role check
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
