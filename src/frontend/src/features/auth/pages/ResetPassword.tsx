import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./css/ResetPassword.module.css";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const type = searchParams.get("type"); // "invite" ou "reset"

  const isInvite = type === "invite";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validações
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const hasMinLength = formData.password.length >= 8;
  const hasNumber = /\d/.test(formData.password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword;

  const isValid = isInvite
    ? hasMinLength && hasNumber && hasSymbol && passwordsMatch
    : isValidEmail && hasMinLength && hasNumber && hasSymbol && passwordsMatch;

  // Tema
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return null;
  });

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Token inválido ou ausente.");
      return;
    }
    if (!isValid) {
      setError("Por favor, verifique os requisitos da senha.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isInvite
        ? "/auth/set-password"
        : endpoints.auth.resetPassword;

      const payload: any = {
        token,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      };

      if (!isInvite) {
        payload.email = formData.email;
      }

      await http.post(endpoint, payload);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        "Não foi possível processar o pedido. O token pode ter expirado.";
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
        <main className={styles.main}>
          <div className={styles.header}>
            <div className={styles.logoWrapper}>
              <div className={styles.logoIcon}>
                <span className={styles.materialSymbolsOutlined}>strategy</span>
              </div>
            </div>
            <p className={styles.sifcqa}>SIFCQA-FMX</p>
            <h1 className={styles.title}>
              {isInvite ? "Definir Palavra-passe" : "Redefinir Palavra-passe"}
            </h1>
            <p className={styles.subtitle}>
              {isInvite
                ? "Bem‑vindo! Crie uma senha segura para aceder à plataforma."
                : "Informe seu e‑mail e escolha uma nova senha forte."}
            </p>
          </div>

          <section className={styles.formCard}>
            <form onSubmit={handleSubmit} className={styles.form}>
              {!isInvite && (
                <div className={styles.fieldGroup}>
                  <label htmlFor="email" className={styles.label}>
                    E‑mail
                  </label>
                  <div className={styles.inputWrapper}>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required={!isInvite}
                      value={formData.email}
                      onChange={handleChange}
                      className={styles.input}
                      placeholder="seu@email.com"
                    />
                  </div>
                  {formData.email && !isValidEmail && (
                    <div className={styles.validationHint}>
                      <span className={styles.materialSymbolsOutlined}>error</span>
                      <span>Informe um e‑mail válido</span>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label htmlFor="password" className={styles.label}>
                  Nova Senha
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="••••••••••••"
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

              <div className={styles.fieldGroup}>
                <label htmlFor="confirmPassword" className={styles.label}>
                  Confirmar Senha
                </label>
                <div className={styles.inputWrapper}>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={styles.input}
                    placeholder="••••••••••••"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    <span className={styles.materialSymbolsOutlined}>
                      {showConfirm ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <div className={styles.validationPanel}>
                {!isInvite && (
                  <div
                    className={`${styles.validationItem} ${
                      isValidEmail ? styles.valid : styles.invalid
                    }`}
                  >
                    <span className={styles.materialSymbolsOutlined}>
                      {isValidEmail ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    <span>E‑mail válido</span>
                  </div>
                )}
                <div
                  className={`${styles.validationItem} ${
                    hasMinLength ? styles.valid : styles.invalid
                  }`}
                >
                  <span className={styles.materialSymbolsOutlined}>
                    {hasMinLength ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span>Pelo menos 8 caracteres</span>
                </div>
                <div
                  className={`${styles.validationItem} ${
                    hasNumber ? styles.valid : styles.invalid
                  }`}
                >
                  <span className={styles.materialSymbolsOutlined}>
                    {hasNumber ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span>Um número</span>
                </div>
                <div
                  className={`${styles.validationItem} ${
                    hasSymbol ? styles.valid : styles.invalid
                  }`}
                >
                  <span className={styles.materialSymbolsOutlined}>
                    {hasSymbol ? "check_circle" : "radio_button_unchecked"}
                  </span>
                  <span>Um símbolo</span>
                </div>
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}
              {success && (
                <div className={styles.successMessage}>
                  {isInvite
                    ? "Senha definida com sucesso! Redirecionando para o login..."
                    : "Senha redefinida com sucesso! Redirecionando para o login..."}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isValid || !token}
                className={styles.submitButton}
              >
                {loading ? (
                  <div className={styles.buttonContent}>
                    <span>Processando...</span>
                    <span
                      className={`${styles.materialSymbolsOutlined} ${styles.spinner}`}
                    >
                      progress_activity
                    </span>
                  </div>
                ) : (
                  <div className={styles.buttonContent}>
                    <span>
                      {isInvite ? "Criar senha" : "Guardar Alterações"}
                    </span>
                    <span className={styles.materialSymbolsOutlined}>
                      arrow_forward
                    </span>
                  </div>
                )}
              </button>
            </form>
          </section>

          <div className={styles.footer}>
            <p className={styles.supportLink}>
              Precisa de ajuda?{" "}
              <a href="#">Contactar Suporte</a>
            </p>
        
          </div>
        </main>

        <div className={styles.queenWatermark}>
          <span className={styles.materialSymbolsOutlined}>chess</span>
        </div>

        <div className={styles.backgroundDecoration}>
          <div className={styles.blurTop}></div>
          <div className={styles.blurBottom}></div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;