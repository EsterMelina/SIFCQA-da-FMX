import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import styles from "./css/NotFound.module.css";
import logo from "/assets/logo.png";

const NotFound: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return null;
  });

  useEffect(() => {
    const container = document.querySelector(`.${styles.container}`);
    if (!container) return;

    const isDark =
      theme === "dark" ||
      (theme === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      container.classList.add(styles.dark);
    } else {
      container.classList.remove(styles.dark);
    }
  }, [theme]);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <img src={logo} alt="FMX" className={styles.logo} />
        <div className={styles.errorCode}>404</div>
        <h1 className={styles.title}>Rei em fuga?</h1>
        <p className={styles.message}>
          A página que procura não existe ou foi movida. Que tal voltar ao tabuleiro e repensar a jogada?
        </p>
        <Link to="/" className={styles.button}>
          <span className={styles.materialSymbolsOutlined}>home</span>
          Página Inicial
        </Link>
      </div>
    </div>
  );
};

export default NotFound;