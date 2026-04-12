import { NavLink } from "react-router-dom";
import { useTheme } from "../../../shared/hooks/useTheme";
import styles from "./AdminHeader.module.css";

export const AdminHeader = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarLeft}>
        <span className={styles.systemName}>SIFCQA-FMX</span>
        <nav className={styles.topbarNav}>
          <NavLink to="/admin" end className={({ isActive }) =>
            `${styles.topbarNavLink} ${isActive ? styles.active : ""}`
          }>
            Visão Geral
          </NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) =>
            `${styles.topbarNavLink} ${isActive ? styles.active : ""}`
          }>
            Relatórios Finais
          </NavLink>
          <NavLink to="/admin/archive" className={({ isActive }) =>
            `${styles.topbarNavLink} ${isActive ? styles.active : ""}`
          }>
            Arquivo Histórico
          </NavLink>
        </nav>
      </div>

      <div className={styles.topbarRight}>
        <div className={styles.searchWrapper}>
          <span className="material-symbols-outlined">search</span>
          <input type="text" placeholder="Procurar..." />
        </div>
        <button className={styles.iconButton}>
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className={styles.iconButton} onClick={toggleTheme}>
          <span className="material-symbols-outlined">
            {theme === "light" ? "light_mode" : theme === "dark" ? "dark_mode" : "routine"}
          </span>
        </button>
        <div className={styles.avatar}>
          <img src="https://via.placeholder.com/40" alt="Perfil" />
        </div>
      </div>
    </header>
  );
};
export default AdminHeader;