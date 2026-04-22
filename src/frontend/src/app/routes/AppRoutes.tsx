import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";

import AuthLayout from "@/app/layouts/AuthLayout/AuthLayout";
//import { MainLayout }  from "@/app/layouts/MainLayout/MainLayout"; // ADMIN ONLY
//import DashboardLayout from "@/app/layouts/DashboardLayout/DashboardLayout"; // USERS

// AUTH
import Login from "@/features/auth/pages/Login";
import Register from "@/features/auth/pages/Register";
import ForgotPassword from "@/features/auth/pages/ForgotPassword";
import ResetPassword from "@/features/auth/pages/ResetPassword";

// DASHBOARD (base logada)
import Dashboard from "@/features/dashboard/pages/Dashboard";

// PLAYER
import PlayerDashboard from "@/features/players/pages/PlayerDashboard";
import MyProfile from "@/features/players/pages/MyProfile";
import MyQuotas from "@/features/players/pages/MyQuotas";

// ASSOCIATION
import AssociationDashboard from "@/features/associations/pages/AssociationDashboard";

// ADMIN
import AdminDashboard from "@/features/admin/pages/AdminDashboard";
// import UserManagement from "@/features/admin/pages/UserManagement";
// import AuditLogs from "@/features/admin/pages/AuditLogs/AuditLogs";
// import Reports from "@/features/admin/pages/Reports/Reports";
// import Archive from "@/features/admin/pages/Archive/Archive";

//FMX
import FmxDashboard from "@/features/fmx/pages/FmxDashboard";
import NotFound from "@/features/auth/pages/NotFound";

export default function AppRoutes() {
  return (

      <Routes>

        {/* ================= PUBLIC ================= */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/set-password" element={<ResetPassword />} />
          <Route path="/not-found" element={<NotFound />} />
        </Route>

        {/* ================= LOGGED USERS ================= */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin", "fmx","association", "player"]} />
          }
        >
          
          <Route path="/" element={<Dashboard />} /> 
              {/* <Route path="/fmx" element={<FmxDashboard />} />
              <Route path="/association" element={<AssociationDashboard />} />
              <Route path="/player" element={<PlayerDashboard />} />
              */}
             {/* FMX*/}
            <Route
              element={<ProtectedRoute allowedRoles={["fmx"]} />}
            >
              <Route path="/fmx" element={<FmxDashboard />} />      
            </Route>


            {/* PLAYER */}
            <Route
              element={<ProtectedRoute allowedRoles={["player"]} />}
            >
              <Route path="/player" element={<PlayerDashboard />} />
              <Route path="/profile" element={<MyProfile />} />
              <Route path="/my-quotas" element={<MyQuotas />} />

            </Route>

            {/* ASSOCIATION */}
            <Route
              element={<ProtectedRoute allowedRoles={["association"]} />}
            >
              <Route path="/association" element={<AssociationDashboard />} />
            </Route>

         
        </Route>

        {/* ================= ADMIN AREA (MAIN LAYOUT) ================= */}
        <Route
          element={<ProtectedRoute allowedRoles={["admin"]} />}
        >
          <Route>
            {/* Dashboard base (dinâmico por role) */}
            
            <Route path="/admin" element={<AdminDashboard />} />
            {/* <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/audit" element={<AuditLogs />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/archive" element={<Archive />} /> */}

          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    
  );
}