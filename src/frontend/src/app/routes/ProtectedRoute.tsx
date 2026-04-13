import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

export const ProtectedRoute = ({ allowedRoles }: { allowedRoles: string[] }) => {
  const { user, isLoading, initialized } = useAuth();

  if (!initialized || isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const roles = user.roles ?? [];

  if (!roles.some((r) => allowedRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};