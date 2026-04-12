// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Login from "@/features/auth/pages/Login";
// import Register from "@/features/auth/pages/Register";
// import ForgotPassword from "@/features/auth/pages/ForgotPassword";
// import Dashboard from "@/features/dashboard/pages/Dashboard";
// import NotFound from "@/features/auth/pages/NotFound";
// import ResetPassword from "@/features/auth/pages/ResetPassword"

// export default function AppRoutes() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         {/* AUTH */}
//         <Route path="/login" element={<Login />} />
//         <Route path="/register" element={<Register />} />
//         <Route path="/forgot-password" element={<ForgotPassword />} />
//         <Route path="/reset-password" element={<ResetPassword />} />

//         {/* APP */}
//         <Route path="/" element={<Dashboard />} />

//         {/* FALLBACK */}
//         <Route path="*" element={<NotFound />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }