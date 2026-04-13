import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./AdminDashboard.module.css";
import { useAuth } from "@/app/providers/AuthProvider"; // ajuste o caminho conforme sua estrutura
// Tipos
type TabType = "dashboard" | "users" | "audit" | "reports" | "archive";

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  status: "success" | "error" | "blocked";
}

interface Metrics {
  serverLoad: number;
  responseTime: number;
  activeUsers: number;
  securityScore: number;
}

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    return saved ?? "light";
  });
  const [metrics, setMetrics] = useState<Metrics>({
    serverLoad: 14.2,
    responseTime: 124,
    activeUsers: 1842,
    securityScore: 96,
  });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para controlar a abertura dos modais
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Aplica tema
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Buscar dados do dashboard
  useEffect(() => {
    if (activeTab !== "dashboard") return;
    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [metricsRes, logsRes] = await Promise.all([
          http.get(endpoints.reports.dashboard),
          http.get(endpoints.audit.logs, { params: { limit: 5 } })
        ]);
        if (metricsRes.data) {
          setMetrics(prev => ({ ...prev, ...metricsRes.data }));
        }
        setAuditLogs(logsRes.data.data || logsRes.data || []);
      } catch (err: any) {
        console.error("Erro ao carregar dados do dashboard:", err);
        setError("Não foi possível carregar os dados do dashboard.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [activeTab]);

  // const handleLogout = () => {
    
  //   localStorage.removeItem("token");
  //   navigate("/login");
  // };
  const handleLogout = async () => {
    await logout();
    // O redirecionamento e limpeza de tokens já são feitos dentro do logout()
  };

  // Handlers para ações
  const handleExportLogs = () => console.log("Exportar Logs CSV");
  const handleEditUser = (id?: string) => console.log("Editar utilizador", id);
  const handleDeactivateUser = (id?: string) => console.log("Desativar utilizador", id);
  const handleSearch = (query: string) => console.log("Pesquisar:", query);
  const handleSettings = () => console.log("Definições");

  // Dados mockados para auditoria
  const displayLogs = auditLogs.length > 0 ? auditLogs : [
    { id: 1, timestamp: "2023-10-24 14:22:01", user: "admin.silva", action: "Acesso ao Módulo Financeiro", status: "success" as const },
    { id: 2, timestamp: "2023-10-24 14:15:45", user: "gestor.marquez", action: "Alteração de Permissões #U902", status: "success" as const },
    { id: 3, timestamp: "2023-10-24 14:02:11", user: "guest_4522", action: "Falha de Autenticação (IP 192.168.1.1)", status: "blocked" as const },
    { id: 4, timestamp: "2023-10-24 13:55:30", user: "admin.silva", action: "Cópia de Segurança de Base de Dados", status: "success" as const },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent metrics={metrics} logs={displayLogs} loading={loading} error={error} onExportLogs={handleExportLogs} />;
      case "users":
        return <UserManagementContent onEdit={handleEditUser} onDeactivate={handleDeactivateUser} onNewUser={() => setShowNewUserModal(true)} />;
      case "audit":
        return <AuditLogsContent />;
      case "reports":
        return <ReportsContent />;
      case "archive":
        return <ArchiveContent />;
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.layout}>
        {/* Overlay para mobile */}
        <div
          className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`}
          onClick={closeSidebar}
        />

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brandWrapper}>
              <div className={styles.logoIcon}>
                <span className="material-symbols-outlined">shield_person</span>
              </div>
              <div className={styles.brandText}>
                <h1>FMX Direction</h1>
                <p>Institutional Management</p>
              </div>
            </div>
          </div>

          <nav className={styles.nav}>
            <button
              onClick={() => { setActiveTab("dashboard"); closeSidebar(); }}
              className={`${styles.navLink} ${activeTab === "dashboard" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => { setActiveTab("users"); closeSidebar(); }}
              className={`${styles.navLink} ${activeTab === "users" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">group</span>
              <span>Gestão de Utilizadores</span>
            </button>
            <button
              onClick={() => { setActiveTab("audit"); closeSidebar(); }}
              className={`${styles.navLink} ${activeTab === "audit" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">receipt_long</span>
              <span>Auditoria de Sistema</span>
            </button>
          </nav>

          <div className={styles.sidebarFooter}>
            <button className={styles.reportButton} onClick={() => { setShowNewReportModal(true); closeSidebar(); }}>
              <span className="material-symbols-outlined">add</span>
              Novo Relatório
            </button>
            <div className={styles.footerLinks}>
              <button className={styles.footerLink} onClick={() => { handleSettings(); setActiveTab("archive"); closeSidebar(); }}>
                <span className="material-symbols-outlined">settings</span>
                <span>Definições</span>
              </button>
              <button className={styles.footerLink} onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                <span>Sair</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={styles.main}>
          {/* Header */}
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.menuButton} onClick={toggleSidebar} aria-label="Menu">
                <span className="material-symbols-outlined">menu</span>
              </button>
              <span className={styles.systemName}>SIFCQA-FMX</span>
              <nav className={styles.topbarNav}>
                <button
                  onClick={() => setActiveTab("dashboard")}
                  className={`${styles.topbarNavLink} ${activeTab === "dashboard" ? styles.active : ""}`}
                >
                  Visão Geral
                </button>
                <button
                  onClick={() => setActiveTab("reports")}
                  className={`${styles.topbarNavLink} ${activeTab === "reports" ? styles.active : ""}`}
                >
                  Relatórios Finais
                </button>
                <button
                  onClick={() => setActiveTab("archive")}
                  className={`${styles.topbarNavLink} ${activeTab === "archive" ? styles.active : ""}`}
                >
                  Arquivo Histórico
                </button>
              </nav>
            </div>
            <div className={styles.topbarRight}>
              <div className={styles.searchWrapper}>
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  placeholder="Procurar..."
                  className={styles.searchInput}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <button className={styles.iconButton} onClick={() => setShowNotificationsModal(true)}>
                <span className="material-symbols-outlined">notifications</span>
              </button>
              <button className={styles.themeToggle} onClick={toggleTheme}>
                <span className="material-symbols-outlined">
                  {theme === "light" ? "dark_mode" : "light_mode"}
                </span>
              </button>
              <div className={styles.avatar} onClick={() => setShowProfileModal(true)}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8Uom-iyjf-VYwGKXhogZ-JpLC9CRO9cBKCgMLVEF6yg5Eyqpict5Nhs4k95tWHCywAfZ5WasGzieXliYCtmaUj3xvfOQP5k83kwAeZsJQ3PrdZvx3SrN1x4l30syg5ltOAmsxDeWmmuGBgeM9a8lisVmSqzNwgwKU79a0AwXSKLlMhoKoZzAu18mvF60aHHbLSpBsqklK1ZxCugGZo_yWN7ab3664FYCM__nz5iGsoJZRXBr4jtizibaLpotEuQ5xoCOUlvBXENI"
                  alt="Perfil"
                />
              </div>
            </div>
          </header>

          {/* Conteúdo dinâmico */}
          <div className={styles.content}>
            {renderContent()}
          </div>

          {/* Footer compacto */}
          <footer className={styles.footer}>
            <p>© {new Date().getFullYear()} FMX - SIFCQA</p>
            <div className={styles.footerLinks}>
              <a href="#" onClick={(e) => { e.preventDefault(); console.log("Termos"); }}>Termos</a>
              <a href="#" onClick={(e) => { e.preventDefault(); console.log("Privacidade"); }}>Privacidade</a>
              <a href="#" onClick={(e) => { e.preventDefault(); console.log("Suporte"); }}>Suporte</a>
            </div>
          </footer>
        </main>
      </div>

      {/* Modais Flutuantes */}
      <NewReportModal isOpen={showNewReportModal} onClose={() => setShowNewReportModal(false)} />
      <NewUserModal isOpen={showNewUserModal} onClose={() => setShowNewUserModal(false)} />
      <NotificationsModal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} onLogout={handleLogout} />
    </div>
  );
};

// ===== COMPONENTES DE CONTEÚDO =====

const DashboardContent: React.FC<{
  metrics: Metrics;
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  onExportLogs: () => void;
}> = ({ metrics, logs, loading, error, onExportLogs }) => (
  <>
    <div className={styles.dashboardHeader}>
      <div className={styles.headerTitle}>
        <p>Painel de Controlo Principal</p>
        <h2>Estado do Sistema <span className={styles.accent}>.</span></h2>
      </div>
      <div className={styles.statusBadge}>
        <span className={styles.statusDot}></span>
        <span>Todos os sistemas operacionais</span>
      </div>
    </div>

    {loading && <div className={styles.loading}>Carregando dados...</div>}
    {error && <div className={styles.error}>{error}</div>}

    {!loading && !error && (
      <>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}><span className="material-symbols-outlined">dns</span></div>
            <p className={styles.metricLabel}>Carga do Servidor</p>
            <h3 className={styles.metricValue}>{metrics.serverLoad}%</h3>
            <div className={styles.progressBar}><div className={styles.progressFill} style={{ width: `${metrics.serverLoad}%` }} /></div>
            <p className={styles.metricTrend}>ÓTIMO ESTADO</p>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}><span className="material-symbols-outlined">speed</span></div>
            <p className={styles.metricLabel}>Tempo de Resposta</p>
            <h3 className={styles.metricValue}>{metrics.responseTime}ms</h3>
            <p className={styles.metricTrend}><span className="material-symbols-outlined">trending_down</span> 12% vs última hora</p>
          </div>
          <div className={`${styles.metricCard} ${styles.darkCard} ${styles.metricCardLarge}`}>
            <p className={styles.metricLabel}>Utilizadores Ativos</p>
            <h3 className={styles.metricValue}>{metrics.activeUsers.toLocaleString()} <span>sessões agora</span></h3>
            <div className={styles.chartBars}>
              {[0.5, 0.66, 0.83, 1, 0.75, 0.33].map((h, i) => (
                <div key={i} className={styles.chartBar}><div className={styles.barFill} style={{ height: `${h * 100}%` }} /></div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <div>
            <div className={styles.sectionHeader}>
              <h4>Registos de Auditoria Recentes</h4>
              <button className={styles.exportButton} onClick={onExportLogs}>Exportar Logs CSV</button>
            </div>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead><tr><th>Timestamp</th><th>Utilizador</th><th>Acção</th><th>Status</th></tr></thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td>{log.timestamp}</td>
                      <td>{log.user}</td>
                      <td>{log.action}</td>
                      <td>
                        <span className={log.status === "success" ? styles.statusSuccess : styles.statusError}>
                          <span className={styles.statusDot}></span>
                          {log.status === "success" ? "Sucesso" : log.status === "blocked" ? "Bloqueado" : "Falha"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 className={styles.sectionHeader}>Infraestrutura Local</h4>
            <div className={styles.infraList}>
              <div className={styles.infraItem}>
                <div className={styles.infraLeft}><span className="material-symbols-outlined">storage</span><div><p>Core Database (Maputo)</p><p>MySQL 8.0 Cluster</p></div></div>
                <div className={styles.infraStatus}><p className={styles.online}>ONLINE</p><p>Uptime: 99.9%</p></div>
              </div>
              <div className={styles.infraItem}>
                <div className={styles.infraLeft}><span className="material-symbols-outlined">cloud_done</span><div><p>API Gateway Service</p><p>Proxy reverso Nginx</p></div></div>
                <div className={styles.infraStatus}><p className={styles.online}>ONLINE</p><p>Uptime: 100%</p></div>
              </div>
              <div className={`${styles.infraItem} ${styles.warning}`}>
                <div className={styles.infraLeft}><span className="material-symbols-outlined">sd_card_alert</span><div><p>Storage de Relatórios</p><p>Capacidade 92% ocupada</p></div></div>
                <div className={styles.infraStatus}><p className={styles.alert}>ALERTA</p><p>Expansão necessária</p></div>
              </div>
            </div>
            <div className={styles.securityScore}>
              <h5>Integridade Global</h5>
              <div className={styles.scoreCard}>
                <div className={styles.scoreCircle}>
                  <svg viewBox="0 0 36 36">
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-surface-container)" strokeWidth="3" />
                    <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-tertiary)" strokeWidth="3" strokeDasharray={`${metrics.securityScore}, 100`} />
                  </svg>
                  <div className={styles.scoreValue}>{metrics.securityScore}%</div>
                </div>
                <div><p>Score de Segurança</p><p>Protocolo SIFCQA v2.4</p></div>
              </div>
            </div>
          </div>
        </div>
      </>
    )}
  </>
);

const UserManagementContent: React.FC<{
  onEdit: (id?: string) => void;
  onDeactivate: (id?: string) => void;
  onNewUser: () => void;
}> = ({ onEdit, onDeactivate, onNewUser }) => (
  <div className={styles.pageContainer}>
    <div className={styles.pageHeader}>
      <h2>Gestão de Utilizadores</h2>
      <button className={styles.addButton} onClick={onNewUser}>
        <span className="material-symbols-outlined">person_add</span>Novo Utilizador
      </button>
    </div>
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Estado</th><th>Ações</th></tr></thead>
        <tbody>
          <tr><td>Admin Silva</td><td>admin@fmx.org.mz</td><td>Administrador</td><td><span className={styles.statusActive}>Ativo</span></td><td><button className={styles.actionBtn} onClick={() => onEdit("1")}>Editar</button><button className={styles.actionBtn} onClick={() => onDeactivate("1")}>Desativar</button></td></tr>
          <tr><td>Assoc. Maputo</td><td>maputo@fmx.org.mz</td><td>Associação</td><td><span className={styles.statusActive}>Ativo</span></td><td><button className={styles.actionBtn} onClick={() => onEdit("2")}>Editar</button></td></tr>
        </tbody>
      </table>
    </div>
  </div>
);

const AuditLogsContent: React.FC = () => (
  <div className={styles.pageContainer}>
    <h2>Registos de Auditoria</h2>
    <div className={styles.filters}>
      <input type="text" placeholder="Filtrar por utilizador ou ação..." onChange={(e) => console.log("Filtrar:", e.target.value)} />
      <select onChange={(e) => console.log("Status:", e.target.value)}>
        <option>Todos os status</option>
        <option>Sucesso</option>
        <option>Falha</option>
      </select>
    </div>
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead><tr><th>Data/Hora</th><th>Utilizador</th><th>Ação</th><th>IP</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>2024-01-15 09:34:22</td><td>admin.silva</td><td>Alteração de permissões</td><td>192.168.1.45</td><td><span className={styles.statusSuccess}>Sucesso</span></td></tr>
          <tr><td>2024-01-15 08:12:05</td><td>guest_4522</td><td>Tentativa de acesso negada</td><td>10.0.0.22</td><td><span className={styles.statusError}>Falha</span></td></tr>
        </tbody>
      </table>
    </div>
    <div className={styles.pagination}>
      <button disabled onClick={() => console.log("Anterior")}>Anterior</button>
      <span>Página 1 de 5</span>
      <button onClick={() => console.log("Próxima")}>Próxima</button>
    </div>
  </div>
);

const ReportsContent: React.FC = () => (
  <div className={styles.pageContainer}>
    <h2>Relatórios Finais</h2>
    <div className={styles.placeholder}><span className="material-symbols-outlined">description</span><p>Em desenvolvimento – aqui serão exibidos relatórios gerenciais.</p></div>
  </div>
);

const ArchiveContent: React.FC = () => (
  <div className={styles.pageContainer}>
    <h2>Arquivo Histórico</h2>
    <div className={styles.placeholder}><span className="material-symbols-outlined">archive</span><p>Documentos e registos antigos do sistema.</p></div>
  </div>
);

// ===== MODAIS FLUTUANTES =====

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewReportModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Novo Relatório</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Título do Relatório</label>
            <input type="text" placeholder="Ex: Relatório Financeiro Q2" />
          </div>
          <div className={styles.formGroup}>
            <label>Tipo</label>
            <select>
              <option>Financeiro</option>
              <option>Atletas</option>
              <option>Associações</option>
              <option>Auditoria</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Período</label>
            <select>
              <option>Último mês</option>
              <option>Último trimestre</option>
              <option>Último ano</option>
              <option>Personalizado</option>
            </select>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.cancelButton} onClick={onClose}>Cancelar</button>
            <button className={styles.submitButton} onClick={() => { console.log("Gerar relatório"); onClose(); }}>Gerar Relatório</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewUserModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Novo Utilizador</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Nome Completo</label>
            <input type="text" placeholder="Ex: João Silva" />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" placeholder="joao@fmx.org.mz" />
          </div>
          <div className={styles.formGroup}>
            <label>Perfil</label>
            <select>
              <option>Administrador</option>
              <option>Associação</option>
              <option>Jogador</option>
              <option>FMX</option>
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Associação (se aplicável)</label>
            <select>
              <option>Nenhuma</option>
              <option>Maputo Cidade</option>
              <option>Beira</option>
              <option>Nampula</option>
            </select>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.cancelButton} onClick={onClose}>Cancelar</button>
            <button className={styles.submitButton} onClick={() => { console.log("Criar utilizador"); onClose(); }}>Criar Utilizador</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationsModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.notificationsModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Notificações</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.notificationList}>
            <div className={styles.notificationItem}>
              <span className="material-symbols-outlined">info</span>
              <div>
                <p>Novo relatório disponível</p>
                <span>Há 5 minutos</span>
              </div>
            </div>
            <div className={styles.notificationItem}>
              <span className="material-symbols-outlined">warning</span>
              <div>
                <p>Storage de relatórios a 92%</p>
                <span>Há 1 hora</span>
              </div>
            </div>
            <div className={styles.notificationItem}>
              <span className="material-symbols-outlined">check_circle</span>
              <div>
                <p>Backup concluído com sucesso</p>
                <span>Há 3 horas</span>
              </div>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.textButton}>Marcar todas como lidas</button>
            <button className={styles.textButton}>Ver todas</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileModal: React.FC<ModalProps & { onLogout: () => void }> = ({ isOpen, onClose, onLogout }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.profileModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.profileHeader}>
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8Uom-iyjf-VYwGKXhogZ-JpLC9CRO9cBKCgMLVEF6yg5Eyqpict5Nhs4k95tWHCywAfZ5WasGzieXliYCtmaUj3xvfOQP5k83kwAeZsJQ3PrdZvx3SrN1x4l30syg5ltOAmsxDeWmmuGBgeM9a8lisVmSqzNwgwKU79a0AwXSKLlMhoKoZzAu18mvF60aHHbLSpBsqklK1ZxCugGZo_yWN7ab3664FYCM__nz5iGsoJZRXBr4jtizibaLpotEuQ5xoCOUlvBXENI" alt="Avatar" />
          <h4>Administrador</h4>
          <p>admin@fmx.org.mz</p>
        </div>
        <div className={styles.profileMenu}>
          <button><span className="material-symbols-outlined">person</span> Meu Perfil</button>
          <button><span className="material-symbols-outlined">settings</span> Definições</button>
          <button><span className="material-symbols-outlined">help</span> Ajuda</button>
          <button onClick={() => { onLogout(); onClose(); }}><span className="material-symbols-outlined">logout</span> Sair</button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;