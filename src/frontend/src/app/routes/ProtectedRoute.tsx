import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";

interface Props {
  allowedRoles?: string[];
}

// Componente Spinner interno
const Spinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid #f3f3f3',
      borderTop: '4px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export const ProtectedRoute = ({ allowedRoles }: Props) => {
  const { user, initialized } = useAuth();
  const location = useLocation();

  console.log("🛡️ PROTECTED CHECK");
  console.log("USER:", user);
  console.log("ALLOWED:", allowedRoles);

  if (!initialized) {
    return <Spinner />;   // <--- AQUI ESTÁ O SPINNER
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return <Outlet />;
  }

  if (!user.type || !allowedRoles.includes(user.type)) {
    console.log("⛔ Acesso negado");
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};