import  AdminSidebar  from "@/features/admin/components/AdminSidebar";
import  PlayerSidebar  from "@/features/players/components/PlayerSidebar";
import  AssociationSidebar  from "@/features/associations/components/AssociationSidebar";
import  FmxSidebar  from "@/features/fmx/components/FmxSidebar";

interface SidebarProps {
  role?: string;
}

export const Sidebar = ({ role }: SidebarProps) => {
  switch (role) {
    case "admin":
      return <AdminSidebar />;
    case "player":
      return <PlayerSidebar />;
    case "association":
      return <AssociationSidebar />;
    case "fmx":
      return <FmxSidebar />;
    default:
      return null;
  }
};