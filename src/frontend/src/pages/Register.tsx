import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { http } from "@/services/http";
import styles from "./css/Register.module.css";

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    profile: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Tema: null = sistema, 'light' = claro, 'dark' = escuro
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

    // Validações
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
      // Endpoint de registro (assumindo que existe)
      const response = await http.post("/auth/register", {
        name: formData.name,
        email: formData.email,
        profile: formData.profile,
        password: formData.password,
        password_confirmation: formData.confirmPassword,
      });

      // Após registro bem-sucedido, redireciona para login
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
        {/* Coluna Visual (Imagem) */}
        <section className={styles.visualColumn}>
          <div className={styles.imageWrapper}>
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuA45ckori24ySBwewUjIJ3Ggy35RxZPptqyV-yqXb-ofqaloY7YbesCp1HokiN25CxqIUcvHCl2OVNe-tMieoWQgOBnF385v3AVxg-Cq-U1l2BhO0a7IHVnn6G3LZErgmolzizjXdcKvu8zPfU4NNUdLJnqInHVlekC-aHLgr9Rgd0vUxD2vVqqKoGJUc_SDxxIUAT6BSS6-4rVB8qSEYOgtZbgBsU5zDZP5DbJ5I6fwCW5YKDzmyATyDBw899Tql6J5_ULqUPRIeU"
              alt="Chess grandmaster thinking deeply"
            />
            <div className={styles.overlay}></div>
          </div>
          <div className={styles.visualContent}>
            <div className={styles.badge}>
              <span className={styles.materialSymbolsOutlined}>
                military_tech
              </span>
              <span>Excelência Táctica</span>
            </div>
            <h1 className={styles.visualTitle}>
              O PRÓXIMO <br />
              MOVIMENTO É SEU.
            </h1>
            <p className={styles.visualText}>
              Junte-se à Federação Moçambicana de Xadrez e lidere a evolução do
              jogo no país.
            </p>
          </div>
        </section>

        {/* Coluna do Formulário */}
        <section className={styles.formColumn}>
          <div className={styles.formWrapper}>
            {/* Header & Branding */}
            <div className={styles.header}>
              <div className={styles.brand}>
                <div className={styles.logoIcon}>
                  <span className={styles.materialSymbolsOutlined}>chess</span>
                </div>
                <span className={styles.brandName}>SIFCQA-FMX</span>
              </div>
              <h2 className={styles.title}>Crie sua conta</h2>
              <p className={styles.subtitle}>
                Sistema Integrado de Filiação e Controlo de Quotas das
                Associações da Federação Moçambicana de Xadrez. <br />
                <span>Inicie a sua jornada no Grandmaster's Ledger.</span>
              </p>
            </div>

            {/* Formulário de Registro */}
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formGrid}>
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

                {/* Perfil de Utilizador */}
                <div className={styles.fieldGroup}>
                  <label htmlFor="profile" className={styles.label}>
                    Perfil de Utilizador
                  </label>
                  <div className={styles.inputWrapper}>
                    <span
                      className={`${styles.inputIcon} ${styles.materialSymbolsOutlined}`}
                    >
                      badge
                    </span>
                    <select
                      id="profile"
                      name="profile"
                      required
                      value={formData.profile}
                      onChange={handleChange}
                      className={styles.select}
                    >
                      <option disabled value="">
                        Seleccione o perfil
                      </option>
                      <option value="jogador">Jogador</option>
                      <option value="associacao">Associação</option>
                      <option value="outro">Outro</option>
                    </select>
                    <span
                      className={`${styles.selectArrow} ${styles.materialSymbolsOutlined}`}
                    >
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Senha e Confirmar Senha */}
                <div className={styles.passwordGrid}>
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
                        type="password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <div className={styles.fieldGroup}>
                    <label htmlFor="confirmPassword" className={styles.label}>
                      Confirmar Senha
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
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={styles.input}
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Checkbox dos Termos */}
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

              {/* Mensagem de erro */}
              {error && <div className={styles.errorMessage}>{error}</div>}

              {/* Botão de submit */}
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

            {/* Link para login */}
            <p className={styles.loginLink}>
              Já tem uma conta? <Link to="/login">Iniciar Sessão</Link>
            </p>

            {/* Rodapé com bandeira */}
            <div className={styles.footer}>
              <div className={styles.footerContent}>
                <img
                  className={styles.flag}
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCSbnSjJZXjUDf5pa7naluP-dhdW0nT88exgHslokluKC5wmPX0d8Rpe3PJ1IGrRqiRcL7fNolZbJFjS3q287suUEJ-qtq0so4_PBjYzhfhPeHDSisOmNc4mMFl3szx1evlwASGSIMOjrhi43B75DOBruzSyx63LQrghFOYzpvufEDg5pH1ldLV1QAiBvZNnYHB1H6JdbuqFdjYY2pRDMSDhLhO6h8CkQoisz4iD5Vz4LRgltb8CNzAWa2jEvAtscmeZHEIJrPgOlc"
                  alt="Mozambique Flag"
                />
                <span className={styles.footerText}>
                  Federação Moçambicana de Xadrez
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Register;