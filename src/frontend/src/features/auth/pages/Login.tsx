import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./css/Login.module.css";
import { useAuth } from "@/app/providers/AuthProvider";


const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  // const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  
  // Estado do tema: null = sistema, 'light' = claro, 'dark' = escuro
  const [theme, setTheme] = useState<'light' | 'dark' | null>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return null;
  });

  // Aplica a classe 'dark' no container de acordo com o tema
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

  // Salva a preferência no localStorage
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };


  //Login
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  console.log("🟡 FORM SUBMIT");

  try {
    await login(formData.email, formData.password);
  } catch (err: any) {
    console.error("💥 LOGIN ERROR:", err);

    const message =
      err.response?.data?.message ||
      "Credenciais inválidas. Tente novamente.";

    setError(message);
  }
};

  return (
    <div className={styles.container}>
      {/* Botão de alternância de tema */}
      <button
        className={styles.themeToggle}
        onClick={handleThemeToggle}
        aria-label="Alternar tema"
        title={
          theme === "light"
            ? "Tema claro (clique para escuro)"
            : theme === "dark"
            ? "Tema escuro (clique para automático)"
            : "Tema automático (clique para claro)"
        }
      >
        <span className={styles.materialSymbolsOutlined}>
          {theme === "light"
            ? "light_mode"
            : theme === "dark"
            ? "dark_mode"
            : "routine"}
        </span>
      </button>

      <main className={styles.main}>
        {/* Fundos decorativos */}
        <div className={styles.chessPattern}></div>
        <div className={styles.blurCircleTop}></div>
        <div className={styles.blurCircleBottom}></div>

        {/* Conteúdo centralizado */}
        <div className={styles.contentWrapper}>
          {/* Logo */}
          <div className={styles.logoSection}>
            <div className={styles.logoIconWrapper}>
              <div className={styles.logoIcon}>
                <span className={styles.materialSymbolsOutlined}>chess</span>
              </div>
            </div>
            <div className={styles.titleSection}>
              <h1 className={styles.mainTitle}>SIFCQA-FMX</h1>
              <p className={styles.subtitle}>
                Federação Moçambicana de Xadrez
              </p>
            </div>
          </div>

          {/* Card de Login */}
          <div className={styles.loginCard}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Iniciar Sessão</h2>
              <p className={styles.cardDescription}>
                Sistema Integrado de Filiação e Controlo de Quotas das Associações
                da Federação Moçambicana de Xadrez
              </p>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Email */}
              <div className={styles.fieldGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email Institucional
                </label>
                <div className={styles.inputWrapper}>
                  <div className={styles.inputIcon}>
                    <span className={styles.materialSymbolsOutlined}>mail</span>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="exemplo@fmx.org.mz"
                  />
                </div>
              </div>

              {/* Senha */}
              <div className={styles.fieldGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor="password" className={styles.label}>
                    Palavra-passe
                  </label>
                  <Link to="/forgot-password" className={styles.forgotLink}>
                    Esqueceu a senha?
                  </Link>
                </div>
                <div className={styles.inputWrapper}>
                  <div className={styles.inputIcon}>
                    <span className={styles.materialSymbolsOutlined}>lock</span>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Erro */}
              {error && <div className={styles.errorMessage}>{error}</div>}

              {/* Botão */}
              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitButton}
              >
                {isLoading ? (
                  <div className={styles.buttonContent}>
                    <span>Autenticando...</span>
                    <span
                      className={`${styles.materialSymbolsOutlined} ${styles.spinner}`}
                    >
                      progress_activity
                    </span>
                  </div>
                ) : (
                  <div className={styles.buttonContent}>
                    <span>Entrar</span>
                    <span className={styles.materialSymbolsOutlined}>login</span>
                  </div>
                )}
              </button>
            </form>

            {/* Criar conta */}
            <div className={styles.signupSection}>
              <p className={styles.signupText}>
                Não tem uma conta?{" "}
                <Link to="/register" className={styles.signupLink}>
                  Criar Conta
                </Link>
              </p>
            </div>
          </div>

          {/* Rodapé */}
          <footer className={styles.footer}>
            <div className={styles.footerLinks}>
              <a href="#" className={styles.footerLink}>
                <span className={styles.materialSymbolsOutlined}>help</span> Support
              </a>
              <a href="#" className={styles.footerLink}>
                <span className={styles.materialSymbolsOutlined}>gavel</span> Termos
              </a>
            </div>
            <div className={styles.version}>
              <span>Versão 2.4.0</span>
            </div>
          </footer>
        </div>

        {/* Marca d'água */}
        <div className={styles.watermark}>
          <span className={styles.materialSymbolsOutlined}>chess_king</span>
        </div>
      </main>
    </div>
  );
};

export default Login;