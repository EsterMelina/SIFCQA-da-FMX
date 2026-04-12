import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import styles from "./AdminSidebar.module.css";

export const AdminSidebar = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarHeader}>
        <div className={styles.brandWrapper}>
          <div className={styles.logoIcon}>
            <span className="material-symbols-outlined">shield_person</span>
          </div>
          <div>
            <h1>FMX Direction</h1>
            <p>Institutional Management</p>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/admin" end className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.active : ""}`
        }>
          <span className="material-symbols-outlined">dashboard</span>
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/admin/users" className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.active : ""}`
        }>
          <span className="material-symbols-outlined">group</span>
          <span>Gestão de Utilizadores</span>
        </NavLink>
        <NavLink to="/admin/audit" className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.active : ""}`
        }>
          <span className="material-symbols-outlined">receipt_long</span>
          <span>Auditoria de Sistema</span>
        </NavLink>
      </nav>

      <div className={styles.sidebarFooter}>
        <button className={styles.reportButton}>
          <span className="material-symbols-outlined">add</span>
          Novo Relatório
        </button>
        <div className={styles.footerLinks}>
          <NavLink to="/settings" className={styles.footerLink}>
            <span className="material-symbols-outlined">settings</span>
            <span>Definições</span>
          </NavLink>
          <button onClick={handleLogout} className={styles.footerLink}>
            <span className="material-symbols-outlined">logout</span>
            <span>Sair</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
export default AdminSidebar;