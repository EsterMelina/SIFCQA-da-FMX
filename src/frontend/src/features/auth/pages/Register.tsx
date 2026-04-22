import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http } from "@/services/http";
import styles from "./css/Register.module.css";
import logo from "../../../assets/logo.png";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controle de visibilidade das senhas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Tema: null = automático, 'light' ou 'dark'
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (formData.password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }
    if (!formData.acceptTerms) {
      setError("Você deve aceitar os Termos e Condições.");
      return;
    }

    setLoading(true);

    try {
      await http.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      });

      navigate("/login", {
        state: { message: "Conta criada com sucesso! Faça login." },
      });
    } catch (err: any) {
      console.error("Register error:", err);
      const message =
        err.response?.data?.message ||
        "Erro ao criar conta. Verifique os dados e tente novamente.";
      setError(message);
    } finally {
      setLoading(false);
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
        {/* ===== LADO ESQUERDO (VISUAL / BRANDING) ===== */}
        <section className={styles.leftSection}>
          <div className={styles.backgroundImage}>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA45ckori24ySBwewUjIJ3Ggy35RxZPptqyV-yqXb-ofqaloY7YbesCp1HokiN25CxqIUcvHCl2OVNe-tMieoWQgOBnF385v3AVxg-Cq-U1l2BhO0a7IHVnn6G3LZErgmolzizjXdcKvu8zPfU4NNUdLJnqInHVlekC-aHLgr9Rgd0vUxD2vVqqKoGJUc_SDxxIUAT6BSS6-4rVB8qSEYOgtZbgBsU5zDZP5DbJ5I6fwCW5YKDzmyATyDBw899Tql6J5_ULqUPRIeU"
              alt="Chess grandmaster thinking deeply"
            />
            <div className={styles.gradientOverlay}></div>
          </div>

          <div className={styles.brandHeader}>
            <div className={styles.brandRow}>
              <img
                className={styles.logoImage}
                src={logo}
                alt="FMX Logo"
              />
              <div className={styles.brandText}>
                <p>Federação Moçambicana de Xadrez</p>
              </div>
            </div>
          </div>

          <div className={styles.quoteFooter}>
            <div className={styles.quoteContent}>
              <div className={styles.quoteIcon}>“</div>
              <p className={styles.quoteText}>
                O xadrez é a ginástica da mente.
              </p>
              <div className={styles.quoteDivider}></div>
              <p className={styles.quoteSource}>Blaise Pascal</p>
            </div>
          </div>

          <div className={styles.decorBlur}></div>
        </section>

        {/* ===== LADO DIREITO (FORMULÁRIO) ===== */}
        <section className={styles.rightSection}>
          <div className={styles.formContainer}>
            {/* Logo mobile */}
            <div className={styles.mobileBrand}>
              <img
                className={styles.mobileLogo}
                src="https://via.placeholder.com/40x40?text=FMX"
                alt="FMX"
              />
              <h1>FMX</h1>
            </div>

            <div className={styles.formHeader}>
              <div className={styles.welcomeTag}>Excelência Táctica</div>
              <h2 className={styles.formTitle}>Crie sua conta</h2>
              <p className={styles.welcomeSubtitle}>
                Sistema Integrado de Filiação e Controlo de Quotas das
                Associações da Federação Moçambicana de Xadrez.
              </p>
            </div>

            <div className={styles.separator}>
              <div className={styles.separatorLine}>
                <div className={styles.separatorLineInner}></div>
              </div>
              <span className={styles.separatorText}>Preencha os dados</span>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Nome Completo */}
              <div className={styles.fieldGroup}>
                <label htmlFor="name" className={styles.label}>
                  Nome Completo
                </label>
                <div className={styles.inputWrapper}>
                  <span
                    className={`${styles.inputIcon} ${styles.materialSymbolsOutlined}`}
                  >
                    person
                  </span>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="Ex: Artur Vilanculos"
                  />
                </div>
              </div>

              {/* Email */}
              <div className={styles.fieldGroup}>
                <label htmlFor="email" className={styles.label}>
                  Email
                </label>
                <div className={styles.inputWrapper}>
                  <span
                    className={`${styles.inputIcon} ${styles.materialSymbolsOutlined}`}
                  >
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
                    placeholder="nome@fmx.org.mz"
                  />
                </div>
              </div>

              {/* Senha e Confirmar Senha com botão de olhinho */}
              <div className={styles.passwordGrid}>
                {/* Campo Senha */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="password" className={styles.label}>
                    Senha
                  </label>
                  <div className={styles.inputWrapper}>
                    <span
                      className={`${styles.inputIcon} ${styles.materialSymbolsOutlined}`}
                    >
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
                      style={{ paddingRight: "3rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-on-surface-variant)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.25rem",
                      }}
                      aria-label={
                        showPassword ? "Ocultar senha" : "Mostrar senha"
                      }
                    >
                      <span className={styles.materialSymbolsOutlined}>
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Campo Confirmar Senha */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="confirmPassword" className={styles.label}>
                    Confirmar
                  </label>
                  <div className={styles.inputWrapper}>
                    <span
                      className={`${styles.inputIcon} ${styles.materialSymbolsOutlined}`}
                    >
                      lock_reset
                    </span>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="••••••••"
                      style={{ paddingRight: "3rem" }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      style={{
                        position: "absolute",
                        right: "0.75rem",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--color-on-surface-variant)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.25rem",
                      }}
                      aria-label={
                        showConfirmPassword
                          ? "Ocultar senha"
                          : "Mostrar senha"
                      }
                    >
                      <span className={styles.materialSymbolsOutlined}>
                        {showConfirmPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Checkbox de aceitação dos termos */}
              <div className={styles.termsGroup}>
                <div className={styles.checkboxWrapper}>
                  <input
                    id="terms"
                    name="acceptTerms"
                    type="checkbox"
                    checked={formData.acceptTerms}
                    onChange={handleChange}
                    className={styles.checkbox}
                  />
                </div>
                <label htmlFor="terms" className={styles.termsLabel}>
                  Eu aceito os{" "}
                  <a href="#" className={styles.termsLink}>
                    Termos e Condições
                  </a>{" "}
                  e a Política de Privacidade da FMX.
                </label>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className={styles.submitButton}
              >
                {loading ? (
                  <div className={styles.buttonContent}>
                    <span>Criando conta...</span>
                    <span
                      className={`${styles.materialSymbolsOutlined} ${styles.spinner}`}
                    >
                      progress_activity
                    </span>
                  </div>
                ) : (
                  <div className={styles.buttonContent}>
                    <span>Criar Conta</span>
                    <span className={styles.materialSymbolsOutlined}>
                      arrow_forward
                    </span>
                  </div>
                )}
              </button>
            </form>

            <div className={styles.formFooter}>
              <p className={styles.signupText}>
                Já tem uma conta?{" "}
                <Link to="/login" className={styles.signupLink}>
                  Iniciar Sessão
                </Link>
              </p>
              <div className={styles.footerLinks}>
                <a href="#" className={styles.footerLink}>
                  Suporte
                </a>
                <a href="#" className={styles.footerLink}>
                  Privacidade
                </a>
                <a href="#" className={styles.footerLink}>
                  Termos
                </a>
              </div>
              
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Register;