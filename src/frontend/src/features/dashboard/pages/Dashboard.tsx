import { useAuth } from "@/app/providers/AuthProvider";
import AdminDashboard from "../../admin/pages/AdminDashboard";
import PlayerDashboard from "../../players/pages/PlayerDashboard";
import AssociationDashboard from "../../associations/pages/AssociationDashboard";
import FmxDashboard from "../../fmx/pages/FmxDashboard";
import { Navigate } from "react-router-dom";

export default function Dashboard() {
  const { user, isLoading, initialized } = useAuth();

  if (!initialized || isLoading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  const roles = user.roles ?? [];

  if (roles.includes("admin")) return <AdminDashboard />;
  if (roles.includes("fmx")) return <FmxDashboard />;
  if (roles.includes("association")) return <AssociationDashboard />;
  if (roles.includes("player")) return <PlayerDashboard />;

  return <div>Acesso não autorizado</div>;
}