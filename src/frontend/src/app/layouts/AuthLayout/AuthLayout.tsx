import { Outlet } from "react-router-dom";

function AuthLayout() {
  return (
    <div className="auth-layout">
      
      {/* Aqui podes pôr logo / branding */}

      {/* Aqui entram as páginas de auth */}
      <main>
        <Outlet />
      </main>

    </div>
  );
}

export default AuthLayout;