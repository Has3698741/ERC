import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import type { AppRole } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: AppRole[] }) {
  const { user, loading, roles: userRoles = [], hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  const isAdmin = hasRole("admin") || userRoles.includes("admin" as AppRole);

  // 👇 لغينا شرط الـ approved تماماً عشان يفتح معاك فوراً غصب عن قاعدة البيانات
  if (roles && !roles.some((r) => userRoles.includes(r)) && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}