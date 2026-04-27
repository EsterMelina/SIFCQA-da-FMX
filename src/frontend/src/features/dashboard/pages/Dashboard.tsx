import { Navigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import AdminDashboard from "../../admin/pages/AdminDashboard";
import PlayerDashboard from "../../players/pages/PlayerDashboard";
import AssociationDashboard from "../../associations/pages/AssociationDashboard";
import FmxDashboard from "../../fmx/pages/FmxDashboard";

export default function Dashboard() {
  const { user, isLoading, initialized } = useAuth();

  if (!initialized || isLoading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const validTypes = ["admin", "fmx", "association", "player"];
  if (!validTypes.includes(user.type ?? "")) {
    return <Navigate to="/login" replace />;
  }

  if (user.type === "admin") return <AdminDashboard />;
  if (user.type === "fmx") return <FmxDashboard />;
  if (user.type === "association") return <AssociationDashboard />;
  if (user.type === "player") return <PlayerDashboard />;

  return <Navigate to="/login" replace />;
}