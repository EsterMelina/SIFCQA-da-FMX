import { Outlet } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import styles from "./MainLayout.module.css";

export const MainLayout = () => {
  const { user } = useAuth();

  return (
    <div className={styles.layout}>
      <div className={styles.sidebarWrapper}>
        <Sidebar role={user?.role} />
      </div>

      <div className={styles.mainWrapper}>
        <div className={styles.headerWrapper}>
          <Header role={user?.role} />
        </div>
        <main className={styles.content}>
          <div className={styles.contentInner}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};