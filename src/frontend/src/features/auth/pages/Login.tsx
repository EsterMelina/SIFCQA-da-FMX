import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/app/providers/AuthProvider";
import styles from "./css/Login.module.css";
import logo from "../../../assets/logo.png"; // ajuste o caminho conforme necessário

const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Estado do tema
  const [theme, setTheme] = useState<'light' | 'dark' | null>(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await login(formData.email, formData.password);
    } catch (err: any) {
      console.error("Login error:", err);
      const message =
        err.response?.data?.message ||
        "Credenciais inválidas. Tente novamente.";
      setError(message);
    }
  };

  return (
    <div className={styles.container}>
      {/* Botão de tema */}
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
        {/* SEÇÃO ESQUERDA (VISUAL) */}
        <section className={styles.leftSection}>
          <div className={styles.backgroundImage}>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBzNpYP3YcwrIGm3yPqtF39nbHkWkvzNC_dOiUEkcSZLB8VkbErJ9y60fC7yuP_2kwWNSa1I7PPgRmNjFaStnuqaFOJNAPLh4LU1KlWmkENx1Fq8md0oT5MWTvo7HfvIR3Ip6xMSnxkqaExWHlWyU6Owpzci8v-GYHw1L5VShoKD8wx07X7y6Sw-5up4zNt6nFnQTFBI81m5ePpRXDVWD2xyYu2mEXsA2aFM7bfAK02GIaXNkGbG0fZYfSS_dKaMhBVKz9ZOTzm0IM"
              alt="Peças de xadrez profissionais"
            />
            <div className={styles.gradientOverlay}></div>
          </div>

          <div className={styles.brandHeader}>
            <div className={styles.brandRow}>
              {/* <img src={logo} alt="FMX Logo" className={styles.logoImage} /> */}
              <div className={styles.brandText}>
                <img src={logo} alt="FMX Logo" className={styles.logoImage} /> 
                {/* <h1>FMX</h1> */}
                <p>Federação Moçambicana de Xadrez</p>
              </div>
            </div>
          </div>

          <div className={styles.quoteFooter}>
            <div className={styles.quoteContent}>
              <span className={`${styles.materialSymbolsOutlined} ${styles.quoteIcon}`}>
                format_quote
              </span>
              <h2 className={styles.quoteText}>
                No xadrez, como na vida, o plano é o mais importante.
              </h2>
              <div className={styles.quoteDivider}></div>
              <p className={styles.quoteSource}>SIFCQA - Sistema Integrado de Gestão</p>
            </div>
          </div>

          <div className={styles.decorBlur}></div>
        </section>

        {/* SEÇÃO DIREITA (FORMULÁRIO) */}
        <section className={styles.rightSection}>
          <div className={styles.formContainer}>
            {/* Logo mobile */}
            <div className={styles.mobileBrand}>
              <img src={logo} alt="FMX Logo" className={styles.mobileLogo} />
              <h1>FMX</h1>
            </div>

            <header className={styles.formHeader}>
              <p className={styles.welcomeTag}>Bem-vindo ao</p>
              <p className={styles.welcomeSubtitle}>
                Sistema Integrado de Filiação e Controlo de Quotas das Associações
                da Federação Moçambicana de Xadrez
              </p>
              <h2 className={styles.formTitle}>Aceder à Conta</h2>
            </header>

            {/* Separador */}
            <div className={styles.separator}>
              <div className={styles.separatorLine}>
                <div className={styles.separatorLineInner}></div>
              </div>
              <span className={styles.separatorText}>use as credenciais</span>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.fieldGroup}>
                <label htmlFor="email" className={styles.label}>
                  E-mail de Utilizador
                </label>
                <div className={styles.inputWrapper}>
                  <span className={`${styles.materialSymbolsOutlined} ${styles.inputIcon}`}>
                    alternate_email
                  </span>
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

              <div className={styles.fieldGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor="password" className={styles.label}>
                    Palavra-passe
                  </label>
                  <Link to="/forgot-password" className={styles.forgotLink}>
                    Esqueceu-se?
                  </Link>
                </div>
                <div className={styles.inputWrapper}>
                  <span className={`${styles.materialSymbolsOutlined} ${styles.inputIcon}`}>
                    lock
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <span className={styles.materialSymbolsOutlined}>
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Checkbox removido conforme solicitado */}

              {error && <div className={styles.errorMessage}>{error}</div>}

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
                    <span>Aceder à Conta</span>
                    <span className={styles.materialSymbolsOutlined}>login</span>
                  </div>
                )}
              </button>
            </form>

            <footer className={styles.formFooter}>
              <p className={styles.signupText}>
                Não tem uma conta?{" "}
                <Link to="/register" className={styles.signupLink}>
                  Solicitar Acesso
                </Link>
              </p>
              <div className={styles.footerLinks}>
                <a href="#" className={styles.footerLink}>Privacidade</a>
                <a href="#" className={styles.footerLink}>Termos</a>
                <a href="#" className={styles.footerLink}>Suporte FMX</a>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Login;