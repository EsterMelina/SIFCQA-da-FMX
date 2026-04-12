import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

import  {MainLayout}  from "@/app/layouts/MainLayout/MainLayout";
import  AuthLayout  from "@/app/layouts/AuthLayout/AuthLayout";

// Páginas públicas
import Login from "@/features/auth/pages/Login";
import Register from "@/features/auth/pages/Register";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import ResetPassword from "@/features/auth/pages/ResetPassword";

// Dashboard e módulos
import Dashboard from "@/features/dashboard/pages/Dashboard";
import MyProfile from "@/features/players/pages/MyProfile";
import MyQuotas from "@/features/players/pages/MyQuotas";
// import UserManagement from "@/features/admin/pages/UserManagement";
import AssociationManagement from "@/features/associations/pages/AssociationManagement";

//Admin
// import AdminDashboard from "@/features/admin/pages/AdminDashboard";
// import AuditLogs from "@/features/admin/pages/AuditLogs";
// import Reports from "@/features/admin/pages/Reports";
// import Archive from "@/features/admin/pages/Archive";

export default function AppRoutes() {
  return (
    <BrowserRouter>
        <Routes>
          {/* Rotas públicas com layout limpo */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          </Route>


          <Route element={<ProtectedRoute allowedRoles={["admin", "association", "player"]} />}>
               <Route path="/" element={<Dashboard />} />
          </Route>

           {/* Rotas administrativas protegidas */}
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
               <Route element={<MainLayout />}>
               {/* <Route index element={<AdminDashboard />} />
               <Route path="users" element={<UserManagement />} />
               <Route path="audit" element={<AuditLogs />} />
               <Route path="reports" element={<Reports />} />
               <Route path="archive" element={<Archive />} /> */}
               </Route>
          </Route>

          {/* Rotas protegidas com layout principal */}
          <Route element={<MainLayout />}>
            {/* Dashboard acessível a todos, mas conteúdo adaptativo */}
           {/* <Route element={<ProtectedRoute allowedRoles={["admin", "association", "player"]} />}>
               <Route path="/" element={<Dashboard />} />
          </Route> */}

            {/* Rotas exclusivas para jogadores */}
            <Route element={<ProtectedRoute allowedRoles={["player"]} />}>
              <Route path="/profile" element={<MyProfile />} />
              <Route path="/my-quotas" element={<MyQuotas />} />
              {/* <Route path="/my-transfers" element={<MyTransfers />} /> */}
            </Route>

            {/* Rotas exclusivas para associações */}
            <Route element={<ProtectedRoute allowedRoles={["association"]} />}>
              <Route path="/association" element={<AssociationManagement />} />
            </Route>

            {/* Rotas exclusivas para admin */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              {/* <Route path="/admin/users" element={<UserManagement />} /> */}
              {/* <Route path="/admin/associations" element={<AllAssociations />} />
              <Route path="/admin/audit" element={<AuditLogs />} /> */}
            </Route>

            {/* Rotas partilhadas (admin + associação) */}
            <Route element={<ProtectedRoute allowedRoles={["admin", "association"]} />}>
              {/* <Route path="/players" element={<PlayersList />} />
              <Route path="/quotas" element={<QuotasManagement />} /> */}
            </Route>
          </Route>
        </Routes>
    </BrowserRouter>
  );
}