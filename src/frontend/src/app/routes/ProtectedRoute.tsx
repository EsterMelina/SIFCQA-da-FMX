import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

export const ProtectedRoute = ({
  allowedRoles,
}: {
  allowedRoles: string[];
}) => {
  const { user, isLoading, initialized } = useAuth();

  console.log("🛡️ PROTECTED CHECK");
  console.log("USER:", user);
  console.log("ROLES:", user?.roles);

  if (!initialized || isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasRole = user.roles.some((role) =>
    allowedRoles.includes(role)
  );

  if (!hasRole) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};