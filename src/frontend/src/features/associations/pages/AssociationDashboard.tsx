import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./AssociationDashboard.module.css";
import { useAuth } from "@/app/providers/AuthProvider"; // ajuste o caminho conforme sua estrutura
// Tipos
type TabType = "dashboard" | "players" | "quotas" | "transfers" | "tournaments" | "reports";

interface TransferRequest {
  id: number;
  playerName: string;
  fromClub: string;
  toClub: string;
  status: "pending" | "validated";
}

interface RegionalTournament {
  month: string;
  day: string;
  name: string;
  location: string;
  status: "open" | "waiting" | "planning";
}

const AssociationDashboard: React.FC = () => {
    const { logout } = useAuth(); // 🆕 usa o contexto
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    return saved ?? "light";
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados mockados (substituir por chamadas API)
  const [stats, setStats] = useState({
    totalAthletes: 1482,
    maleAthletes: 940,
    femaleAthletes: 542,
    pendingClubs: 24,
  });
  const [transferRequests, setTransferRequests] = useState<TransferRequest[]>([
    { id: 1, playerName: "Ricardo Mavila", fromClub: "Costa do Sol", toClub: "Maxaquene", status: "pending" },
    { id: 2, playerName: "Telma Langa", fromClub: "Matchedje", toClub: "Black Bulls", status: "validated" },
    { id: 3, playerName: "Armando Munguambe", fromClub: "Ferroviário", toClub: "Académica", status: "pending" },
  ]);
  const [tournaments, setTournaments] = useState<RegionalTournament[]>([
    { month: "JUN", day: "12", name: "Taça de Honra - Sub-20", location: "Estádio da Machava, Maputo", status: "open" },
    { month: "JUL", day: "05", name: "Torneio Regional Feminino", location: "Campo do Ferroviário", status: "waiting" },
    { month: "AGO", day: "20", name: "Campeonato Inter-Escolar", location: "Vários Pavilhões", status: "planning" },
  ]);

  // UI states
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Tema
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === "light" ? "dark" : "light");
  const toggleSidebar = () => setIsSidebarOpen(prev => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Buscar dados (placeholder)
  useEffect(() => {
    if (activeTab !== "dashboard") return;
    const fetchData = async () => {
      setLoading(true);
      try {
        // const statsRes = await http.get(endpoints.reports.dashboard);
        // setStats(statsRes.data);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Não foi possível carregar os dados.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  // const handleLogout = () => {
  //   localStorage.removeItem("token");
  //   navigate("/login");
  // };

  const handleLogout = async () => {
    await logout(); // chama a função do contexto
  };

  const handleSearch = (query: string) => console.log("Pesquisar:", query);
  const handleStartCollection = () => console.log("Iniciar Cobrança");
  const handleGenerateDebtReport = () => console.log("Gerar Relatório de Dívida");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent stats={stats} transfers={transferRequests} tournaments={tournaments} loading={loading} error={error} onStartCollection={handleStartCollection} onGenerateReport={handleGenerateDebtReport} />;
      case "players":
        return <PlayersContent />;
      case "quotas":
        return <QuotasContent />;
      case "transfers":
        return <TransfersContent transfers={transferRequests} />;
      case "tournaments":
        return <TournamentsContent tournaments={tournaments} />;
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.layout}>
        <div className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`} onClick={closeSidebar} />

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brandWrapper}>
              <img className={styles.brandLogo} src="https://lh3.googleusercontent.com/aida-public/AB6AXuAkSog5NhffTrte2UwliB5ITxqmXqWu1glOE0zkyfuOFRFGgrBKuP0VwNYmF0GkC0eo6-se78CR7w12kLQg0pEYintJlQaSgeDhSzVE9mRbU0V-TaZdASZ0ZRobgj1nxV4TH4mKfCbVA-ClGrOnpFgquRMnqDOpYsAHOTtKDhObgtkN45K9dh8V_5XmXGb2Kc6HEvz4snr4m1sRGuAoQV8F0agGHAamxXvSSMCjcrOFPDKFxJr7DSdSvW-7SMVXY7mIkFmTVE0wP14" alt="FMX Logo" />
              <div className={styles.brandText}>
                <h1>FMX Direction</h1>
                <p>Institutional Management</p>
              </div>
            </div>
            <button className={styles.newReportButton} onClick={() => { setShowNewReportModal(true); closeSidebar(); }}>
              <span className="material-symbols-outlined">add</span>
              Novo Relatório
            </button>
          </div>

          <nav className={styles.nav}>
            <button onClick={() => { setActiveTab("dashboard"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "dashboard" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">dashboard</span>
              <span>Painel Regional</span>
            </button>
            <button onClick={() => { setActiveTab("players"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "players" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">groups</span>
              <span>Meus Jogadores</span>
            </button>
            <button onClick={() => { setActiveTab("quotas"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "quotas" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">payments</span>
              <span>Lançamento de Quotas</span>
            </button>
            <button onClick={() => { setActiveTab("transfers"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "transfers" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">swap_horiz</span>
              <span>Transferências</span>
            </button>
            <button onClick={() => { setActiveTab("tournaments"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "tournaments" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">emoji_events</span>
              <span>Inscrição em Torneios</span>
            </button>
          </nav>

          <div className={styles.sidebarFooter}>
            <button className={styles.footerLink}><span className="material-symbols-outlined">settings</span><span>Definições</span></button>
            <button className={styles.footerLink} onClick={handleLogout}><span className="material-symbols-outlined">logout</span><span>Sair</span></button>
          </div>
        </aside>

        {/* Main */}
        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.menuButton} onClick={toggleSidebar}><span className="material-symbols-outlined">menu</span></button>
              <span className={styles.systemName}>SIFCQA-FMX</span>
              <nav className={styles.topbarNav}>
                <button className={`${styles.topbarNavLink} ${activeTab === "dashboard" ? styles.active : ""}`} onClick={() => setActiveTab("dashboard")}>Overview</button>
                <button className={styles.topbarNavLink} onClick={() => setActiveTab("reports")}>Relatórios</button>
                <button className={styles.topbarNavLink}>Documentação</button>
              </nav>
            </div>
            <div className={styles.topbarRight}>
              <div className={styles.searchWrapper}>
                <span className="material-symbols-outlined">search</span>
                <input type="text" placeholder="Procurar dados..." className={styles.searchInput} onChange={(e) => handleSearch(e.target.value)} />
              </div>
              <button className={styles.iconButton} onClick={() => setShowNotificationsModal(true)}>
                <span className="material-symbols-outlined">notifications</span>
                <span className={styles.notificationBadge}></span>
              </button>
              <button className={styles.themeToggle} onClick={toggleTheme}>
                <span className="material-symbols-outlined">{theme === "light" ? "dark_mode" : "light_mode"}</span>
              </button>
              <div className={styles.avatar} onClick={() => setShowProfileModal(true)}>
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ6ip9nkTO3YHrAbEgHkmotfn84V_6r_iJBBzh3Tp69Wu8WVpDTzH9OlKOk4LPqoL7ggZ7bNoinAgcLbGsSRS8Ko3hOGvUpUm72c_6lyzFwX-tWJbz2_KUnp-vAtU6KhRT-FIsbencgktO70zodqCdeb4LvlG6CifKP3z_0cOgAeGVd8pcHwmev0YkAZ07qgl5l972qisdlBEPgFSO7l82_v-nli0FWjrtlnUCnhugi0BfZE6d6c9M9iwbclPEgCfL5qrT28tuVDE" alt="Perfil" />
              </div>
            </div>
          </header>

          <div className={styles.content}>{renderContent()}</div>

          <footer className={styles.footer}>
            <div className={styles.footerStats}>
              <div><span className={styles.dot}></span><span>Sincronizado com Central</span></div>
              <div><span className="material-symbols-outlined">history</span><span>Há 14 horas</span></div>
              <div><span>Admin-Regional-MAP</span></div>
            </div>
            <div className={styles.footerMeta}>
              <span>v2.4.1</span>
              <span>TLS-SECURED</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Modais */}
      <NewReportModal isOpen={showNewReportModal} onClose={() => setShowNewReportModal(false)} />
      <NotificationsModal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} onLogout={handleLogout} />
    </div>
  );
};

// ===== CONTEÚDOS =====

const DashboardContent: React.FC<{ stats: any; transfers: TransferRequest[]; tournaments: RegionalTournament[]; loading: boolean; error: string | null; onStartCollection: () => void; onGenerateReport: () => void }> = ({ stats, transfers, tournaments, loading, error, onStartCollection, onGenerateReport }) => (
  <>
    <div className={styles.dashboardHeader}>
      <div>
        <p className={styles.headerLabel}>Associação Provincial</p>
        <h2>Gestão Regional</h2>
      </div>
      <div className={styles.headerDate}>
        <p>Data do Sistema</p>
        <p>24 de Maio, 2024</p>
      </div>
    </div>

    {loading && <div className={styles.loading}>Carregando...</div>}
    {error && <div className={styles.error}>{error}</div>}

    {!loading && !error && (
      <>
        <div className={styles.mainGrid}>
          <div className={styles.statsCard}>
            <div className={styles.cardHeader}>
              <span className="material-symbols-outlined">group_add</span>
              <span className={styles.growthBadge}>Crescimento +12%</span>
            </div>
            <h3>Total de Atletas Registados</h3>
            <div className={styles.statValue}>{stats.totalAthletes.toLocaleString()}</div>
            <p className={styles.statDesc}>Ativos na Província de Maputo. Inclui escalões de formação e profissional.</p>
            <div className={styles.genderStats}>
              <div><span>Masculino</span><span>{stats.maleAthletes}</span></div>
              <div><span>Feminino</span><span>{stats.femaleAthletes}</span></div>
            </div>
          </div>

          <div className={styles.alertCard}>
            <div className={styles.alertWatermark}><span className="material-symbols-outlined">priority_high</span></div>
            <div className={styles.alertContent}>
              <h3>Alerta de Pagamentos Pendentes</h3>
              <div className={styles.alertValue}><span>{stats.pendingClubs}</span><span>Clubes em atraso</span></div>
              <p>Existem quotas federativas vencidas no ciclo atual. A regularização é necessária para manter a elegibilidade em torneios nacionais.</p>
              <div className={styles.alertActions}>
                <button className={styles.primaryButton} onClick={onStartCollection}>Iniciar Cobrança</button>
                <button className={styles.secondaryButton} onClick={onGenerateReport}>Gerar Relatório de Dívida</button>
              </div>
            </div>
          </div>

          <div className={styles.transfersCard}>
            <div className={styles.sectionHeader}>
              <h3>Pedidos de Transferência</h3>
              <button>Ver Todos</button>
            </div>
            <div className={styles.transferList}>
              {transfers.map(t => (
                <div key={t.id} className={styles.transferItem}>
                  <div className={styles.transferAvatar}><span className="material-symbols-outlined">person</span></div>
                  <div className={styles.transferInfo}>
                    <p>{t.playerName}</p>
                    <p>{t.fromClub} → {t.toClub}</p>
                  </div>
                  <div className={styles.transferStatus}>
                    <p>Status</p>
                    <p className={t.status === "pending" ? styles.pending : styles.validated}>{t.status === "pending" ? "Pendente" : "Validado"}</p>
                  </div>
                  <button className={styles.transferAction}><span className="material-symbols-outlined">chevron_right</span></button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.tournamentsCard}>
            <h3>Próximos Torneios Regionais</h3>
            <div className={styles.tournamentList}>
              {tournaments.map((t, i) => (
                <div key={i} className={styles.tournamentItem}>
                  <div className={styles.tournamentDate}><span>{t.month}</span><span>{t.day}</span></div>
                  <div className={styles.tournamentInfo}>
                    <h4>{t.name}</h4>
                    <p>{t.location}</p>
                    <div className={`${styles.tournamentStatus} ${styles[t.status]}`}><span className={styles.statusDot}></span>{t.status === "open" ? "Inscrições Abertas" : t.status === "waiting" ? "Aguardando Sorteio" : "Planeamento"}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className={styles.outlineButton}>Gerir Calendário</button>
          </div>
        </div>
      </>
    )}
  </>
);

const PlayersContent: React.FC = () => <div className={styles.placeholderPage}><span className="material-symbols-outlined">groups</span><h2>Meus Jogadores</h2><p>Gestão da lista de atletas da associação.</p></div>;
const QuotasContent: React.FC = () => <div className={styles.placeholderPage}><span className="material-symbols-outlined">payments</span><h2>Lançamento de Quotas</h2><p>Registo e controlo de quotas dos clubes.</p></div>;
const TransfersContent: React.FC<{ transfers: TransferRequest[] }> = ({ transfers }) => (
  <div className={styles.pageContainer}>
    <h2>Transferências</h2>
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead><tr><th>Jogador</th><th>Origem</th><th>Destino</th><th>Status</th></tr></thead>
        <tbody>{transfers.map(t => <tr key={t.id}><td>{t.playerName}</td><td>{t.fromClub}</td><td>{t.toClub}</td><td>{t.status}</td></tr>)}</tbody>
      </table>
    </div>
  </div>
);
const TournamentsContent: React.FC<{ tournaments: RegionalTournament[] }> = ({ tournaments }) => (
  <div className={styles.pageContainer}>
    <h2>Inscrição em Torneios</h2>
    <div className={styles.tournamentGrid}>
      {tournaments.map((t, i) => (
        <div key={i} className={styles.tournamentCard}>
          <div className={styles.tournamentDate}><span>{t.month}</span><span>{t.day}</span></div>
          <h4>{t.name}</h4>
          <p>{t.location}</p>
          <span className={`${styles.tournamentStatus} ${styles[t.status]}`}>{t.status}</span>
        </div>
      ))}
    </div>
  </div>
);

// ===== MODAIS =====

const NewReportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}><h3>Novo Relatório</h3><button onClick={onClose}><span className="material-symbols-outlined">close</span></button></div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}><label>Título</label><input placeholder="Ex: Relatório Mensal" /></div>
          <div className={styles.formGroup}><label>Tipo</label><select><option>Financeiro</option><option>Atletas</option><option>Transferências</option></select></div>
          <div className={styles.modalActions}><button className={styles.cancelButton} onClick={onClose}>Cancelar</button><button className={styles.submitButton} onClick={() => { console.log("Gerar"); onClose(); }}>Gerar</button></div>
        </div>
      </div>
    </div>
  );
};

const NotificationsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.notificationsModal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}><h3>Notificações</h3><button onClick={onClose}><span className="material-symbols-outlined">close</span></button></div>
        <div className={styles.modalBody}>
          <div className={styles.notificationList}>
            <div className={styles.notificationItem}><span className="material-symbols-outlined">warning</span><div><p>24 clubes com quotas em atraso</p><span>Urgente</span></div></div>
            <div className={styles.notificationItem}><span className="material-symbols-outlined">info</span><div><p>3 pedidos de transferência pendentes</p><span>Há 2 horas</span></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; onLogout: () => void }> = ({ isOpen, onClose, onLogout }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.profileModal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.profileHeader}><img src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ6ip9nkTO3YHrAbEgHkmotfn84V_6r_iJBBzh3Tp69Wu8WVpDTzH9OlKOk4LPqoL7ggZ7bNoinAgcLbGsSRS8Ko3hOGvUpUm72c_6lyzFwX-tWJbz2_KUnp-vAtU6KhRT-FIsbencgktO70zodqCdeb4LvlG6CifKP3z_0cOgAeGVd8pcHwmev0YkAZ07qgl5l972qisdlBEPgFSO7l82_v-nli0FWjrtlnUCnhugi0BfZE6d6c9M9iwbclPEgCfL5qrT28tuVDE" alt="Avatar" /><h4>Admin Regional</h4><p>admin.maputo@fmx.org.mz</p></div>
        <div className={styles.profileMenu}>
          <button><span className="material-symbols-outlined">person</span>Perfil</button>
          <button><span className="material-symbols-outlined">settings</span>Definições</button>
          <button onClick={() => { onLogout(); onClose(); }}><span className="material-symbols-outlined">logout</span>Sair</button>
        </div>
      </div>
    </div>
  );
};

export default AssociationDashboard;