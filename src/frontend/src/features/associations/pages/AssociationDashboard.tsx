import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./AssociationDashboard.module.css";
import { useAuth } from "@/app/providers/AuthProvider";
import toast, { Toaster } from "react-hot-toast";

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

interface Player {
  id: number;
  name: string;
  email?: string;
  birth_date?: string;
  team?: string;
  active: boolean;
  created_at?: string;
}

const AssociationDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    return saved ?? null;
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

  // Tema global
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return null;
      return "light";
    });
  };
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

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

  const handleLogout = async () => {
    await logout();
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
    <div className={styles.container}>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <div className={styles.layout}>
        <div className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`} onClick={closeSidebar} />

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
                <span className="material-symbols-outlined">
                  {theme === "light" ? "light_mode" : theme === "dark" ? "dark_mode" : "routine"}
                </span>
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

      <NewReportModal isOpen={showNewReportModal} onClose={() => setShowNewReportModal(false)} />
      <NotificationsModal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} onLogout={handleLogout} />
    </div>
  );
};

// ===== DASHBOARD =====
const DashboardContent: React.FC<{ stats: any; transfers: TransferRequest[]; tournaments: RegionalTournament[]; loading: boolean; error: string | null; onStartCollection: () => void; onGenerateReport: () => void }> = ({ stats, transfers, tournaments, loading, error, onStartCollection, onGenerateReport }) => {
  if (loading) return <div className={styles.loading}>Carregando dados...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.dashboardContent}>
      <div className={styles.statsSection}>
        <h3>Visão Geral</h3>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">groups</span>
            <div>
              <p>Total de Atletas</p>
              <strong>{stats.totalAthletes}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">man</span>
            <div>
              <p>Atletas Masculinos</p>
              <strong>{stats.maleAthletes}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">woman</span>
            <div>
              <p>Atletas Femininos</p>
              <strong>{stats.femaleAthletes}</strong>
            </div>
          </div>
          <div className={styles.statCard}>
            <span className="material-symbols-outlined">business</span>
            <div>
              <p>Clubes Pendentes</p>
              <strong>{stats.pendingClubs}</strong>
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          <button className={styles.primaryButton} onClick={onStartCollection}>
            <span className="material-symbols-outlined">payment</span>
            Iniciar Cobrança
          </button>
          <button className={styles.secondaryButton} onClick={onGenerateReport}>
            <span className="material-symbols-outlined">description</span>
            Gerar Relatório de Dívida
          </button>
        </div>
      </div>

      <div className={styles.transfersSection}>
        <h3>Transferências Pendentes</h3>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id}>
                  <td>{t.playerName}</td>
                  <td>{t.fromClub}</td>
                  <td>{t.toClub}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${t.status === "pending" ? styles.pending : styles.validated}`}>
                      {t.status === "pending" ? "Pendente" : "Validado"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.tournamentsSection}>
        <h3>Torneios Regionais</h3>
        <div className={styles.tournamentGrid}>
          {tournaments.map((t, i) => (
            <div key={i} className={styles.tournamentCard}>
              <div className={styles.tournamentDate}>
                <span>{t.month}</span>
                <span>{t.day}</span>
              </div>
              <h4>{t.name}</h4>
              <p>{t.location}</p>
              <span className={`${styles.tournamentStatus} ${styles[t.status]}`}>
                {t.status === "open" ? "Aberto" : t.status === "waiting" ? "Aguardando" : "Planejamento"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

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

// ===== GESTÃO DE JOGADORES =====
const PlayersContent: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEligibilityModal, setShowEligibilityModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [eligibilityData, setEligibilityData] = useState<any>(null);

  const fetchPlayers = async () => {
    setLoading(true);
    try {
      const response = await http.get(endpoints.players.base);
      setPlayers(response.data.data || response.data);
    } catch (err: any) {
      toast.error("Erro ao carregar jogadores.");
      setError("Não foi possível carregar os jogadores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const filteredPlayers = players.filter(p => {
    const nameMatch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const emailMatch = p.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const teamMatch = p.team?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    return nameMatch || emailMatch || teamMatch;
  });

  const totalPages = Math.ceil(filteredPlayers.length / itemsPerPage);
  const paginatedPlayers = filteredPlayers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleCreate = async (formData: Partial<Player>) => {
    try {
      await http.post(endpoints.players.base, formData);
      toast.success("Jogador criado com sucesso!");
      fetchPlayers();
      setShowCreateModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao criar jogador.");
    }
  };

  const handleUpdate = async (id: number, formData: Partial<Player>) => {
    try {
      await http.put(endpoints.players.detail(id), formData);
      toast.success("Jogador atualizado!");
      fetchPlayers();
      setShowEditModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Erro ao atualizar jogador.");
    }
  };

  const handleToggleStatus = async (player: Player) => {
    const action = player.active ? "desativar" : "ativar";
    if (!window.confirm(`Tem certeza que deseja ${action} este jogador?`)) return;
    try {
      await http.patch(`${endpoints.players.detail(player.id)}/status`);
      toast.success(`Jogador ${action} com sucesso.`);
      fetchPlayers();
    } catch (err: any) {
      toast.error(err.response?.data?.message || `Erro ao ${action} jogador.`);
    }
  };

  const handleViewEligibility = async (player: Player) => {
    try {
      const response = await http.get(endpoints.players.eligibility(player.id));
      setEligibilityData(response.data);
      setSelectedPlayer(player);
      setShowEligibilityModal(true);
    } catch (err: any) {
      toast.error("Erro ao carregar elegibilidade.");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Gestão de Jogadores</h2>
        <button className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
          <span className="material-symbols-outlined">add</span> Novo Jogador
        </button>
      </div>

      <div className={styles.searchBar}>
        <span className="material-symbols-outlined">search</span>
        <input
          type="text"
          placeholder="Pesquisar por nome, email ou equipa..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando jogadores...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Equipa</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlayers.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center" }}>Nenhum jogador encontrado.</td></tr>
                ) : (
                  paginatedPlayers.map(player => (
                    <tr key={player.id}>
                      <td>{player.name}</td>
                      <td>{player.email || "-"}</td>
                      <td>{player.team || "-"}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${player.active ? styles.active : styles.inactive}`}>
                          {player.active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <button className={styles.iconButtonSmall} onClick={() => { setSelectedPlayer(player); setShowDetailsModal(true); }} title="Detalhes">
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button className={styles.iconButtonSmall} onClick={() => { setSelectedPlayer(player); setShowEditModal(true); }} title="Editar">
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button className={styles.iconButtonSmall} onClick={() => handleToggleStatus(player)} title={player.active ? "Desativar" : "Ativar"}>
                          <span className="material-symbols-outlined">{player.active ? "block" : "check_circle"}</span>
                        </button>
                        <button className={styles.iconButtonSmall} onClick={() => handleViewEligibility(player)} title="Elegibilidade">
                          <span className="material-symbols-outlined">verified</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</button>
              <span>Página {currentPage} de {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Próxima</button>
            </div>
          )}
        </>
      )}

      <PlayerFormModal
        key="create-player"
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        title="Novo Jogador"
      />

      {selectedPlayer && (
        <PlayerFormModal
          key={selectedPlayer.id}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSubmit={(data) => handleUpdate(selectedPlayer.id, data)}
          initialData={selectedPlayer}
          title="Editar Jogador"
        />
      )}

      {selectedPlayer && (
        <PlayerDetailsModal isOpen={showDetailsModal} onClose={() => setShowDetailsModal(false)} player={selectedPlayer} />
      )}
      {selectedPlayer && (
        <EligibilityModal isOpen={showEligibilityModal} onClose={() => setShowEligibilityModal(false)} player={selectedPlayer} data={eligibilityData} />
      )}
    </div>
  );
};

// Componentes de Modal
interface PlayerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Player>) => Promise<void>;
  initialData?: Partial<Player>;
  title: string;
}

const PlayerFormModal: React.FC<PlayerFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  title,
}) => {
  const [formData, setFormData] = useState<Partial<Player>>(() => ({
    name: "",
    email: "",
    birth_date: "",
    team: "",
    active: true,
    ...initialData,
  }));
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(formData);
    setSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button onClick={onClose} className={styles.modalClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Nome completo *</label>
            <input name="name" value={formData.name || ""} onChange={handleChange} required />
          </div>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" name="email" value={formData.email || ""} onChange={handleChange} />
          </div>
          <div className={styles.formGroup}>
            <label>Data de nascimento</label>
            <input type="date" name="birth_date" value={formData.birth_date || ""} onChange={handleChange} />
          </div>
          <div className={styles.formGroup}>
            <label>Equipa</label>
            <input name="team" value={formData.team || ""} onChange={handleChange} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="active" checked={formData.active || false} onChange={handleChange} />
              <span>Jogador Ativo</span>
            </label>
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PlayerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({ isOpen, onClose, player }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Detalhes do Jogador</h3>
          <button onClick={onClose} className={styles.modalClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className={styles.modalBody}>
          <p><strong>Nome:</strong> {player.name}</p>
          <p><strong>Email:</strong> {player.email || "-"}</p>
          <p><strong>Data Nasc.:</strong> {player.birth_date || "-"}</p>
          <p><strong>Equipa:</strong> {player.team || "-"}</p>
          <p><strong>Status:</strong> {player.active ? "Ativo" : "Inativo"}</p>
          <p><strong>Registado em:</strong> {player.created_at ? new Date(player.created_at).toLocaleDateString() : "-"}</p>
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

interface EligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
  data: any;
}

const EligibilityModal: React.FC<EligibilityModalProps> = ({ isOpen, onClose, player, data }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Elegibilidade de {player.name}</h3>
          <button onClick={onClose} className={styles.modalClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className={styles.modalBody}>
          {data ? <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{JSON.stringify(data, null, 2)}</pre> : <p>Carregando...</p>}
        </div>
        <div className={styles.modalActions}>
          <button className={styles.cancelButton} onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
};

// ===== MODAIS GERAIS =====
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