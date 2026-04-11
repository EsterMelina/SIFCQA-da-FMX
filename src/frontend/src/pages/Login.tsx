import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http } from "@/services/http"; // ajuste o caminho
import { endpoints } from "@/services/endpoints"; // ajuste o caminho
import styles from "./css/Login.module.css";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await http.post(endpoints.auth.login, {
        email: formData.email,
        password: formData.password,
      });

      const { token } = response.data;
      if (token) {
        localStorage.setItem("token", token);
        navigate("/");
      } else {
        throw new Error("Token não recebido.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      const message =
        err.response?.data?.message ||
        "Credenciais inválidas. Tente novamente.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          {/* Header com logo */}
          <div className={styles.loginHeader}>
            <div className={styles.logo}>
              <span className={styles.materialSymbolsOutlined}>chess</span>
            </div>
            <h1 className={styles.appTitle}>SIFCQA-FMX</h1>
            <p className={styles.appSubtitle}>
              Federação Moçambicana de Xadrez
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className={styles.loginForm}>
            <h2 className={styles.formTitle}>Iniciar Sessão</h2>

            {/* Campo Email */}
            <div className={styles.inputGroup}>
              <label htmlFor="email">Email Institucional</label>
              <div className={styles.inputWrapper}>
                <span className={`${styles.inputIcon} ${styles.materialSymbolsOutlined}`}>
                  mail
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={styles.inputField}
                  placeholder="exemplo@fmx.org.mz"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className={styles.inputGroup}>
              <label htmlFor="password">Palavra-passe</label>
              <div className={styles.inputWrapper}>
                <span className={`${styles.inputIcon} ${styles.materialSymbolsOutlined}`}>
                  lock
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={styles.inputField}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Mensagem de erro */}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {/* Botão de login */}
            <button
              type="submit"
              disabled={loading}
              className={styles.loginButton}
            >
              {loading ? (
                <div className={styles.buttonContent}>
                  <span>Autenticando...</span>
                  <span className={`${styles.materialSymbolsOutlined} ${styles.spinner}`}>
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

          {/* Footer do card */}
          <div className={styles.loginFooter}>
            <Link to="/forgot-password" className={styles.forgotLink}>
              Esqueceu a senha?
            </Link>
            <div className={styles.divider}></div>
            <p className={styles.signupText}>
              Não tem uma conta?{" "}
              <Link to="/register" className={styles.signupLink}>
                Criar Conta
              </Link>
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className={styles.copyright}>
          © {new Date().getFullYear()} FMX. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default Login;