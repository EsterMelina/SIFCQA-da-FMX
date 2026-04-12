// features/dashboard/pages/Dashboard.tsx
import { useAuth } from "@/app/providers/AuthProvider";
import   AdminDashboard   from "../../admin/pages/AdminDashboard";
import  PlayerDashboard  from "../components/PlayerDashboard";
import  AssociationDashboard  from "../components/AssociationDashboard";
import  FmxDashboard  from "../components/FmxDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  switch (user?.role) {
    case "admin":
      return <AdminDashboard />;
    case "player":
      return <PlayerDashboard />;
    case "association":
      return <AssociationDashboard />;
    case "fmx":
      return <FmxDashboard />;
    default:
      return <div>Acesso não autorizado</div>;
  }
}