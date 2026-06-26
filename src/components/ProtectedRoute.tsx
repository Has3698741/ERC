import { useAuth } from "@/hooks/useAuth";
import { Navigate, useLocation } from "react-router-dom";
import type { AppRole } from "@/lib/constants";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: AppRole[] }) {
  const { user, loading, roles: userRoles = [], profile, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;

  // خط الدفاع الأول: لو الحساب واخد أدمن في المصفوفة يتخطى أي مراجعة فوراً
  const isAdmin = hasRole("admin") || userRoles.includes("admin" as AppRole);

  // شاشة المراجعة تظهر فقط لو المستخدم مش أدمن وحسابه مش مفعّل
  if (profile && !profile.approved && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-2xl font-bold">حسابك قيد المراجعة</h1>
          <p className="text-muted-foreground">سيقوم المدير بالموافقة على حسابك وتعيين الصلاحيات قريبًا.</p>
        </div>
      </div>
    );
  }

  if (roles && !roles.some((r) => userRoles.includes(r)) && !isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}