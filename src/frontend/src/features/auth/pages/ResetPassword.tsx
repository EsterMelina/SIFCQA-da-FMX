import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./css/ResetPassword.module.css";

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const type = searchParams.get("type"); // 👈 NOVO: captura o modo (invite/reset)

  const isInvite = type === "invite";     // 👈 NOVO: booleano para facilitar

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

  // 👇 NOVO: email é obrigatório apenas no modo reset
  const isValid = isInvite
    ? hasMinLength && hasNumber && hasSymbol && passwordsMatch
    : isValidEmail && hasMinLength && hasNumber && hasSymbol && passwordsMatch;

  // Tema
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
      // 👇 NOVO: endpoint varia conforme o modo
      //colocar no endpoints
      const endpoint = isInvite
        ? "/auth/set-password"                // rota de primeiro acesso (convite)()
        : endpoints.auth.resetPassword;   // rota de redefinição existente

      const payload: any = {
        token,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      };

      // 👇 NOVO: email só é enviado se o modo for reset
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
            {/* 👇 Título dinâmico */}
            <h1 className={styles.title}>
              {isInvite ? "Definir Palavra-passe" : "Redefinir Palavra-passe"}
            </h1>
            {/* 👇 Subtítulo dinâmico */}
            <p className={styles.subtitle}>
              {isInvite
                ? "Bem‑vindo! Crie uma senha segura para aceder à plataforma."
                : "Informe seu e‑mail e escolha uma nova senha forte."}
            </p>
          </div>

          <section className={styles.formCard}>
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* 👇 Campo de e‑mail exibido apenas no modo reset */}
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

              {/* Nova Senha */}
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

              {/* Confirmar Senha */}
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

              {/* Indicadores de validação */}
              <div className={styles.validationPanel}>
                {/* 👇 Requisito de e‑mail só aparece no modo reset */}
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
                    {/* 👇 Texto do botão dinâmico */}
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
            <div className={styles.seals}>
              <img
                className={styles.sealImage}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBOgsrvW1jqpAPP3x8ZmUsS9kdbdcvD27iovbYLkh1M2zLVBWcvjMO840aFpZ-yIv60lYkp79JIyOVKom61Ne7VV941P3GzDl0XehHYLwluQ-VdJJljKeezK1OifVaBi4urmXP_X8iCXh0MopBnY_pdpPVCxs5zNq_XfUvarPwc1ufXetye--5UsxgV9SF1hO9ytChIZiP9zzlHm2KVSAZYCltfXuOOjzHH6ZJ55ct0goIzapskbjWiE7g1NbyTnVcy-mZ3ChC5RDU"
                alt="FMX Seal"
              />
              <div className={styles.sealDivider}></div>
              <img
                className={styles.sealImage}
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzg8ZgZS3ORt1fxXcSH6BMMTrGyM6OtW9MibhDNQ69grY0tmOnyIiRkfQ8tvCh4nKnJP6sM6Dpni8O6KKtNsCWKJ2IjUi8RPhFo5a331ww-82jCoyLvAslDC1BJKSFHeKxOttt6k3hMooWraEeaC5a0oCybIKCeNU6LpVjJZF5BqDJEA6Rdf3MS-Ymat0uWwcO8_8ktofIp8OeICN7kSN3LzSLh5TEx8Wkel6VtM8ox27FZ7t72u9keFRrI_5urXEbWv1nbCk7258"
                alt="Government Seal"
              />
            </div>
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