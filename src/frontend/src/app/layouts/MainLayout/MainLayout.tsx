import { Outlet } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import styles from "./MainLayout.module.css";

export const MainLayout = () => {
  const { user } = useAuth();

  return (
    <div className={styles.layout}>
      <Sidebar role={user?.role} />
      <div className={styles.mainWrapper}>
        <Header role={user?.role} />
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};