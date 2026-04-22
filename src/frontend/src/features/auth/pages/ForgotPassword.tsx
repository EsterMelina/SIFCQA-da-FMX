import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./css/ForgotPassword.module.css";

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark" | null>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return null;
  });

  // useEffect(() => {
  //   const container = document.querySelector(`.${styles.container}`);
  //   if (!container) return;
  //   const isDark =
  //     theme === "dark" ||
  //     (theme === null &&
  //       window.matchMedia("(prefers-color-scheme: dark)").matches);
  //   if (isDark) {
  //     container.classList.add(styles.dark);
  //   } else {
  //     container.classList.remove(styles.dark);
  //   }
  // }, [theme]);

    // Aplica a classe 'dark' no elemento raiz (html)
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);


  const handleThemeToggle = () => {
    setTheme((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return null;
      return "light";
    });
  };

  useEffect(() => {
    if (theme) {
      localStorage.setItem("theme", theme);
    } else {
      localStorage.removeItem("theme");
    }
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await http.post(endpoints.auth.forgotPassword, { email });
      setSuccess(true);
      setEmail("");
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Não foi possível processar sua solicitação. Verifique o e-mail e tente novamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        className={styles.themeToggle}
        onClick={handleThemeToggle}
        aria-label="Alternar tema"
      >
        <span className={styles.materialSymbolsOutlined}>
          {theme === "light"
            ? "light_mode"
            : theme === "dark"
            ? "dark_mode"
            : "routine"}
        </span>
      </button>

      <div className={styles.body}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <div className={styles.logoIcon}>
              <span className={styles.materialSymbolsOutlined}>grid_view</span>
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandName}>FMX</span>
              <span className={styles.brandTagline}>Tactical Precision</span>
            </div>
          </div>
        </header>

        <main className={styles.main}>
          <div className={styles.contentWrapper}>
            <div className={styles.titleSection}>
              <h1 className={styles.title}>Recuperar Senha</h1>
              <p className={styles.description}>
                Introduza o seu e-mail para receber instruções de recuperação
              </p>
            </div>

            <div className={styles.formCard}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.fieldGroup}>
                  <label htmlFor="email" className={styles.label}>
                    E-mail
                  </label>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputIcon}>
                      <span className={styles.materialSymbolsOutlined}>
                        mail
                      </span>
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={styles.input}
                      placeholder="exemplo@fmx.org.mz"
                    />
                  </div>
                </div>

                {success && (
                  <div className={styles.successMessage}>
                    Instruções enviadas! Verifique sua caixa de entrada.
                  </div>
                )}
                {error && <div className={styles.errorMessage}>{error}</div>}

                <button
                  type="submit"
                  disabled={loading}
                  className={styles.submitButton}
                >
                  {loading ? (
                    <div className={styles.buttonContent}>
                      <span>Enviando...</span>
                      <span
                        className={`${styles.materialSymbolsOutlined} ${styles.spinner}`}
                      >
                        progress_activity
                      </span>
                    </div>
                  ) : (
                    <div className={styles.buttonContent}>
                      <span>Enviar Instruções</span>
                      <span className={styles.materialSymbolsOutlined}>
                        arrow_forward
                      </span>
                    </div>
                  )}
                </button>
              </form>

              <div className={styles.backSection}>
                <Link to="/login" className={styles.backLink}>
                  <span className={styles.materialSymbolsOutlined}>
                    arrow_back
                  </span>
                  <span>Voltar ao Login</span>
                </Link>
              </div>
            </div>

            <div className={styles.decoration}>
              <span className={styles.materialSymbolsOutlined}>chess</span>
              <span className={styles.materialSymbolsOutlined}>strategy</span>
              <span className={styles.materialSymbolsOutlined}>
                military_tech
              </span>
            </div>
          </div>
        </main>

        <footer className={styles.footer}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Federação Moçambicana de Xadrez •
            SIFCQA-FMX
          </p>
        </footer>

        <div className={styles.backgroundDecoration}>
          <div className={styles.blurTop}></div>
          <div className={styles.blurBottom}></div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;