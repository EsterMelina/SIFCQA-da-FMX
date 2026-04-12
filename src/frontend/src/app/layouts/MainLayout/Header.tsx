import  AdminHeader  from "@/features/admin/components/AdminHeader";
import  PlayerHeader  from "@/features/players/components/PlayerHeader";
import  AssociationHeader  from "@/features/associations/components/AssociationHeader";
import FmxHeader  from "@/features/fmx/components/FmxHeader";
// ... outros headers específicos

export const Header = ({ role }: { role?: string }) => {
  switch (role) {
    case "admin":
      return <AdminHeader />;
    case "player":
      return <PlayerHeader />;
     case "association":
      return <AssociationHeader />;
    case "fmx":
      return <FmxHeader />;
    default:
      return null;
  }
};