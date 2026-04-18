import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./FmxDashboard.module.css";
import { useAuth } from "@/app/providers/AuthProvider";

// Tipos
type TabType = "dashboard" | "associations" | "database" | "reports" | "tournaments";

interface ProvinceStat {
  name: string;
  associations: number;
  active: boolean;
}

interface Tournament {
  id: number;
  name: string;
  subtitle?: string;
  location: string;
  startDate: string;
  status: "open" | "ongoing" | "scheduled";
}

interface RecentReport {
  id: number;
  date: string;
  title: string;
  description: string;
  highlight?: boolean;
}

interface Association {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: boolean;
  created_at?: string;
  updated_at?: string;
}

const FmxDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    return saved ?? "light";
  });

  // Estados do Dashboard
  const [associations, setAssociations] = useState<Association[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  // Estados mockados para torneios e relatórios (ainda não integrados)
  const [tournaments] = useState<Tournament[]>([
    {
      id: 1,
      name: "Open Internacional de Maputo",
      subtitle: "FIDE Rated",
      location: "Centro Cultural Franco-Moçambicano",
      startDate: "12 Ago 2024",
      status: "open",
    },
    {
      id: 2,
      name: "Provincial de Sub-18 (Gaza)",
      subtitle: "Juvenil",
      location: "Xai-Xai",
      startDate: "18 Jul 2024",
      status: "ongoing",
    },
    {
      id: 3,
      name: "Taça Moçambique 2024",
      subtitle: "Nacional",
      location: "Multifuncional - Beira",
      startDate: "05 Set 2024",
      status: "scheduled",
    },
  ]);
  const [recentReports] = useState<RecentReport[]>([
    {
      id: 1,
      date: "Hoje, 09:45",
      title: "Validação de Elo Regional",
      description: "Associação da Zambézia submeteu 14 novos registos.",
      highlight: true,
    },
    {
      id: 2,
      date: "Ontem",
      title: "Fecho de Contas Trimestral",
      description: "Relatório financeiro Q2 consolidado pela direção.",
    },
    {
      id: 3,
      date: "03 Jul 2024",
      title: "Inspecção Técnica Tete",
      description: "Auditores concluíram visita às instalações locais.",
    },
  ]);

  // Estados de UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewReportModal, setShowNewReportModal] = useState(false);
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Aplica tema
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  // Buscar associações para o dashboard quando a aba estiver ativa
  useEffect(() => {
    if (activeTab !== "dashboard") return;

    const fetchDashboardData = async () => {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const assocResponse = await http.get(endpoints.associations.base);
        setAssociations(assocResponse.data);
      } catch (err: any) {
        console.error("Erro ao carregar dados do dashboard:", err);
        setDashboardError("Não foi possível carregar os dados do dashboard.");
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, [activeTab]);

  // Normaliza nomes de províncias extraídos do nome da associação
  const normalizeProvinceName = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes("maputo cidade")) return "Maputo Cidade";
    if (lower.includes("maputo")) return "Maputo";
    if (lower.includes("gaza")) return "Gaza";
    if (lower.includes("inhambane")) return "Inhambane";
    if (lower.includes("sofala")) return "Sofala";
    if (lower.includes("manica")) return "Manica";
    if (lower.includes("tete")) return "Tete";
    if (lower.includes("zambézia")) return "Zambézia";
    if (lower.includes("nampula")) return "Nampula";
    if (lower.includes("cabo delgado")) return "Cabo Delgado";
    if (lower.includes("niassa")) return "Niassa";
    return name;
  };

  // Processa associações para gerar estatísticas por província
  const getProvinceStats = (): ProvinceStat[] => {
    const provinceMap: Record<string, { count: number; active: number }> = {};

    associations.forEach((assoc) => {
      // Tenta extrair o nome da província a partir do nome da associação
      const match = assoc.name.match(/de\s+([^\(]+)/i) || assoc.name.match(/(\w+)$/);
      let province = match ? match[1].trim() : "Outras";
      const normalized = normalizeProvinceName(province);

      if (!provinceMap[normalized]) {
        provinceMap[normalized] = { count: 0, active: 0 };
      }
      provinceMap[normalized].count++;
      if (assoc.status) {
        provinceMap[normalized].active++;
      }
    });

    return Object.entries(provinceMap)
      .map(([name, stats]) => ({
        name,
        associations: stats.count,
        active: stats.active > 0,
      }))
      .sort((a, b) => b.associations - a.associations);
  };

  const provinceStats = getProvinceStats();

  // Estatísticas nacionais (atletas ainda mockado)
  const nationalStats = {
    totalAthletes: 2482,
    activeProvinces: `${provinceStats.filter((p) => p.active).length}/${provinceStats.length}`,
    officialClubs: associations.length,
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleSearch = (query: string) => console.log("Pesquisar:", query);
  const handleManageRegistrations = () => console.log("Gerir Inscrições");

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardContent
            stats={nationalStats}
            provinces={provinceStats}
            tournaments={tournaments}
            reports={recentReports}
            loading={dashboardLoading}
            error={dashboardError}
            onManageRegistrations={handleManageRegistrations}
            onViewAllAssociations={() => setActiveTab("associations")}
          />
        );
      case "associations":
        return <AssociationsContent />;
      case "database":
        return <DatabaseContent />;
      case "reports":
        return <ReportsContent />;
      case "tournaments":
        return <TournamentsContent tournaments={tournaments} />;
      default:
        return null;
    }
  };

  return (
    <div className={`${styles.container} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.layout}>
        <div
          className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`}
          onClick={closeSidebar}
        />

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brandWrapper}>
              <div className={styles.logoIcon}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  chess
                </span>
              </div>
              <div className={styles.brandText}>
                <h1>FMX Direction</h1>
                <p>Institutional Management</p>
              </div>
            </div>
          </div>

          <nav className={styles.nav}>
            <button
              onClick={() => {
                setActiveTab("dashboard");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "dashboard" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">dashboard</span>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("associations");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "associations" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">account_balance</span>
              <span>Associações Provinciais</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("database");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "database" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">database</span>
              <span>Base de Dados Nacional</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("reports");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "reports" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">assessment</span>
              <span>Relatórios</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("tournaments");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "tournaments" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">emoji_events</span>
              <span>Torneios Nacionais</span>
            </button>
          </nav>

          <div className={styles.sidebarFooter}>
            <button
              className={styles.reportButton}
              onClick={() => {
                setShowNewReportModal(true);
                closeSidebar();
              }}
            >
              <span className="material-symbols-outlined">add</span>
              Novo Relatório
            </button>
            <div className={styles.footerLinks}>
              <button className={styles.footerLink}>
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

        {/* Main */}
        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.menuButton} onClick={toggleSidebar}>
                <span className="material-symbols-outlined">menu</span>
              </button>
              <h2 className={styles.systemName}>SIFCQA-FMX</h2>
            </div>
            <div className={styles.topbarRight}>
              <div className={styles.searchWrapper}>
                <span className="material-symbols-outlined">search</span>
                <input
                  type="text"
                  placeholder="Procurar dados..."
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
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkTkCKhu0mW5Yv6FdEU15UFREJY3lzLtRCK39pldrV7slCgyAgF7DxtR2gXJ0wgcZ1_iIhevi9or4X8WFlt-P6h_70OWU822hz9XEvjKU6Y8tg1Y88-aMHlPpBlcj5BJm6PRv9d-IszCNcXXVWXtgZNrfCydN3Xk60XOB1EbZotOlZzV0Ba6G7vbh-ZnjQhW_AMHsmmiuqxmrWRaEnWsEn8gJFIpfueFUSgoCJ7uuCBVk5iYGfwUDnfPfzWldNEUlYfBZY24c33B8"
                  alt="Perfil"
                />
              </div>
            </div>
          </header>

          <div className={styles.content}>{renderContent()}</div>

          <footer className={styles.footer}>
            <div>
              <span className="material-symbols-outlined">verified</span> SIFCQA-FMX | Sistema
              Integrado de Gestão Chess
            </div>
            <div className={styles.footerMeta}>
              <span>v2.4.0-stable</span>
              <span>Suporte Técnico</span>
            </div>
          </footer>
        </main>
      </div>

      {/* Modais */}
      <NewReportModal isOpen={showNewReportModal} onClose={() => setShowNewReportModal(false)} />
      <NewTournamentModal
        isOpen={showNewTournamentModal}
        onClose={() => setShowNewTournamentModal(false)}
      />
      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onLogout={handleLogout}
      />
    </div>
  );
};

// ===== CONTEÚDO DO DASHBOARD =====

const DashboardContent: React.FC<{
  stats: any;
  provinces: ProvinceStat[];
  tournaments: Tournament[];
  reports: RecentReport[];
  loading: boolean;
  error: string | null;
  onManageRegistrations: () => void;
  onViewAllAssociations: () => void;
}> = ({ stats, provinces, tournaments, reports, loading, error, onManageRegistrations, onViewAllAssociations }) => (
  <>
    {loading && <div className={styles.loading}>Carregando dashboard...</div>}
    {error && <div className={styles.error}>{error}</div>}
    {!loading && !error && (
      <>
        <div className={styles.heroGrid}>
          <div className={styles.heroCard}>
            <p className={styles.heroLabel}>Estado Federativo</p>
            <h3 className={styles.heroTitle}>Panorama Nacional de Xadrez</h3>
            <p className={styles.heroDesc}>
              Crescimento institucional registado de 12.4% no último trimestre. Consolidação das
              associações provinciais em curso com foco na zona norte.
            </p>
            <div className={styles.heroStats}>
              <div>
                <span>{stats.totalAthletes.toLocaleString()}</span>
                <p>Atletas Federados</p>
              </div>
              <div>
                <span>{stats.activeProvinces}</span>
                <p>Províncias Ativas</p>
              </div>
              <div>
                <span>{stats.officialClubs}</span>
                <p>Clubes Oficiais</p>
              </div>
            </div>
            <div className={styles.heroWatermark}>
              <span className="material-symbols-outlined">chess</span>
            </div>
          </div>
          <div className={styles.tournamentHighlight}>
            <span className="material-symbols-outlined">emoji_events</span>
            <p>Próximo Torneio Elite</p>
            <h4>Campeonato Nacional Absoluto 2024</h4>
            <div>
              <span className="material-symbols-outlined">calendar_today</span>15 - 22 Outubro
            </div>
            <div>
              <span className="material-symbols-outlined">location_on</span>Maputo, Moçambique
            </div>
            <button onClick={onManageRegistrations}>Gerir Inscrições</button>
          </div>
        </div>

        <div className={styles.mainGrid}>
          <div className={styles.mapSection}>
            <div className={styles.sectionHeader}>
              <div>
                <h3>Distribuição de Associações</h3>
                <p>Cobertura Territorial</p>
              </div>
              <button onClick={onViewAllAssociations}>
                VER MAPA COMPLETO <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
            <div className={styles.mapContent}>
              <div className={styles.mapPlaceholder}>
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzTk8RFgVmNl63ng06_TE5bfqFdzoUOd8riLX3m0PMNtzg1xYqWMIyeusytbKj-6sMcEDI8cagrNFbpq3ycedb6BpiRFyGMGbFxRLQnFFvsnVTCFr9cSuix8Biw6s0W1nsa_l9BTArqPU_r_84qWnE6hxSRnGtFGBrTOFox6-_ZUTpPp-4Y9HUAlbkkyjL1DjN0EYPclLUWM94jeAQcshvqMJ3hArSs7i4NEB4WAfdnAVJuy4VgJlYvfu6jMaW8Hwx8CI1MnATnzw"
                  alt="Mapa de Moçambique"
                />
              </div>
              <div className={styles.provinceList}>
                {provinces.length === 0 ? (
                  <div className={styles.noData}>Nenhuma associação cadastrada.</div>
                ) : (
                  provinces.map((p) => (
                    <div key={p.name} className={!p.active ? styles.inactive : ""}>
                      <span className={styles.dot}></span>
                      <span>{p.name}</span>
                      <span>{p.associations} Associações</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className={styles.reportsSection}>
            <h3>Relatórios Recentes</h3>
            <p>Audit Log</p>
            <div className={styles.reportList}>
              {reports.map((r) => (
                <div
                  key={r.id}
                  className={`${styles.reportItem} ${r.highlight ? styles.highlight : ""}`}
                >
                  <span className={styles.reportDot}></span>
                  <p className={styles.reportDate}>{r.date}</p>
                  <p className={styles.reportTitle}>{r.title}</p>
                  <p className={styles.reportDesc}>{r.description}</p>
                </div>
              ))}
            </div>
            <button className={styles.textButton}>Ver histórico completo</button>
          </div>
        </div>

        <div className={styles.tournamentsTable}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Torneios Ativos & Próximos</h3>
              <p>Calendário Federativo</p>
            </div>
            <div>
              <button>
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button className={styles.primaryButton} onClick={() => console.log("Novo Evento")}>
                Novo Evento
              </button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Designação do Torneio</th>
                <th>Localização</th>
                <th>Data Início</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tournaments.map((t) => (
                <tr key={t.id}>
                  <td>
                    <p>{t.name}</p>
                    <span>{t.subtitle}</span>
                  </td>
                  <td>{t.location}</td>
                  <td>{t.startDate}</td>
                  <td>
                    <span className={`${styles.status} ${styles[t.status]}`}>
                      <span className={styles.statusDot}></span>
                      {t.status === "open"
                        ? "Inscrições Abertas"
                        : t.status === "ongoing"
                        ? "Em Curso"
                        : "Agendado"}
                    </span>
                  </td>
                  <td>
                    <button>
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}
  </>
);

// ===== ABA ASSOCIAÇÕES (GESTÃO COMPLETA) =====

const AssociationsContent: React.FC = () => {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAssociation, setEditingAssociation] = useState<Association | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAssociations = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await http.get(endpoints.associations.base);
      setAssociations(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao carregar associações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssociations();
  }, []);

  const openCreateModal = () => {
    setEditingAssociation(null);
    setFormData({ name: "", email: "", phone: "", address: "", status: true });
    setIsModalOpen(true);
  };

  const openEditModal = (association: Association) => {
    setEditingAssociation(association);
    setFormData({
      name: association.name,
      email: association.email || "",
      phone: association.phone || "",
      address: association.address || "",
      status: association.status,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAssociation(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingAssociation) {
        await http.put(endpoints.associations.update(editingAssociation.id), formData);
      } else {
        await http.post(endpoints.associations.store, formData);
      }
      await fetchAssociations();
      closeModal();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao salvar associação.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (association: Association) => {
    if (
      !window.confirm(
        `Deseja ${association.status ? "desativar" : "ativar"} a associação ${association.name}?`
      )
    ) {
      return;
    }
    try {
      await http.patch(endpoints.associations.toggleStatus(association.id));
      await fetchAssociations();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao alterar status.");
    }
  };

  const handleViewDetails = (association: Association) => {
    alert(`
      Nome: ${association.name}
      Email: ${association.email || "—"}
      Telefone: ${association.phone || "—"}
      Endereço: ${association.address || "—"}
      Status: ${association.status ? "Ativo" : "Inativo"}
    `);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Gestão de Associações Provinciais</h2>
        <button className={styles.primaryButton} onClick={openCreateModal}>
          <span className="material-symbols-outlined">add</span>
          Nova Associação
        </button>
      </div>

      {loading && <div className={styles.loading}>Carregando associações...</div>}
      {error && <div className={styles.error}>{error}</div>}

      {!loading && !error && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Telefone</th>
                <th>Endereço</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {associations.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                    Nenhuma associação cadastrada.
                  </td>
                </tr>
              ) : (
                associations.map((assoc) => (
                  <tr key={assoc.id}>
                    <td>{assoc.name}</td>
                    <td>{assoc.email || "—"}</td>
                    <td>{assoc.phone || "—"}</td>
                    <td>{assoc.address || "—"}</td>
                    <td>
                      <span
                        className={`${styles.status} ${
                          assoc.status ? styles.activeStatus : styles.inactiveStatus
                        }`}
                      >
                        <span className={styles.statusDot} />
                        {assoc.status ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleViewDetails(assoc)}
                          title="Ver detalhes"
                        >
                          <span className="material-symbols-outlined">visibility</span>
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => openEditModal(assoc)}
                          title="Editar"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          className={styles.iconButton}
                          onClick={() => handleToggleStatus(assoc)}
                          title={assoc.status ? "Desativar" : "Ativar"}
                        >
                          <span className="material-symbols-outlined">
                            {assoc.status ? "block" : "check_circle"}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <AssociationFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        formData={formData}
        onChange={handleInputChange}
        isEditing={!!editingAssociation}
        submitting={submitting}
      />
    </div>
  );
};

// Modal de formulário para associação
interface AssociationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    status: boolean;
  };
  onChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  isEditing: boolean;
  submitting: boolean;
}

const AssociationFormModal: React.FC<AssociationFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onChange,
  isEditing,
  submitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEditing ? "Editar Associação" : "Nova Associação"}</h3>
          <button className={styles.modalClose} onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label htmlFor="name">Nome *</label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={onChange}
                required
                placeholder="Ex: Associação Provincial de Maputo"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={onChange}
                placeholder="contato@associacao.org.mz"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Telefone</label>
              <input
                id="phone"
                name="phone"
                type="text"
                value={formData.phone}
                onChange={onChange}
                placeholder="+258 84 123 4567"
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="address">Endereço</label>
              <textarea
                id="address"
                name="address"
                value={formData.address}
                onChange={onChange}
                rows={2}
                placeholder="Av. Principal, Cidade, Província"
              />
            </div>
            <div className={styles.formGroup}>
              <label>
                <input
                  type="checkbox"
                  name="status"
                  checked={formData.status}
                  onChange={onChange}
                />
                Associação Ativa
              </label>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose} disabled={submitting}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? "Salvando..." : isEditing ? "Atualizar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===== DEMAIS ABAS (PLACEHOLDERS) =====

const DatabaseContent: React.FC = () => (
  <div className={styles.placeholderPage}>
    <span className="material-symbols-outlined">database</span>
    <h2>Base de Dados Nacional</h2>
    <p>Consulta e manutenção da base de dados central.</p>
  </div>
);

const ReportsContent: React.FC = () => (
  <div className={styles.placeholderPage}>
    <span className="material-symbols-outlined">assessment</span>
    <h2>Relatórios</h2>
    <p>Geração de relatórios institucionais.</p>
  </div>
);

const TournamentsContent: React.FC<{ tournaments: Tournament[] }> = ({ tournaments }) => (
  <div className={styles.pageContainer}>
    <div className={styles.pageHeader}>
      <h2>Torneios Nacionais</h2>
      <button className={styles.primaryButton} onClick={() => console.log("Novo Torneio")}>
        Novo Torneio
      </button>
    </div>
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Local</th>
            <th>Data</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{t.location}</td>
              <td>{t.startDate}</td>
              <td>{t.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ===== MODAIS GENÉRICOS =====

const NewReportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Novo Relatório</h3>
          <button onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Título</label>
            <input placeholder="Ex: Relatório Anual" />
          </div>
          <div className={styles.formGroup}>
            <label>Tipo</label>
            <select>
              <option>Financeiro</option>
              <option>Atletas</option>
              <option>Associações</option>
            </select>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancelar
            </button>
            <button
              className={styles.submitButton}
              onClick={() => {
                console.log("Gerar");
                onClose();
              }}
            >
              Gerar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NewTournamentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Novo Torneio</h3>
          <button onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Nome</label>
            <input placeholder="Ex: Campeonato Nacional" />
          </div>
          <div className={styles.formGroup}>
            <label>Local</label>
            <input placeholder="Cidade, Província" />
          </div>
          <div className={styles.formGroup}>
            <label>Data</label>
            <input type="date" />
          </div>
          <div className={styles.modalActions}>
            <button className={styles.cancelButton} onClick={onClose}>
              Cancelar
            </button>
            <button
              className={styles.submitButton}
              onClick={() => {
                console.log("Criar");
                onClose();
              }}
            >
              Criar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.notificationsModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Notificações</h3>
          <button onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.notificationList}>
            <div className={styles.notificationItem}>
              <span className="material-symbols-outlined">info</span>
              <div>
                <p>Novo relatório disponível</p>
                <span>Há 5 min</span>
              </div>
            </div>
            <div className={styles.notificationItem}>
              <span className="material-symbols-outlined">warning</span>
              <div>
                <p>Atualização de cadastro pendente</p>
                <span>Há 1 h</span>
              </div>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.textButton}>Marcar lidas</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}> = ({ isOpen, onClose, onLogout }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.profileModal}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.profileHeader}>
          <img
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkTkCKhu0mW5Yv6FdEU15UFREJY3lzLtRCK39pldrV7slCgyAgF7DxtR2gXJ0wgcZ1_iIhevi9or4X8WFlt-P6h_70OWU822hz9XEvjKU6Y8tg1Y88-aMHlPpBlcj5BJm6PRv9d-IszCNcXXVWXtgZNrfCydN3Xk60XOB1EbZotOlZzV0Ba6G7vbh-ZnjQhW_AMHsmmiuqxmrWRaEnWsEn8gJFIpfueFUSgoCJ7uuCBVk5iYGfwUDnfPfzWldNEUlYfBZY24c33B8"
            alt="Avatar"
          />
          <h4>Diretor FMX</h4>
          <p>diretor@fmx.org.mz</p>
        </div>
        <div className={styles.profileMenu}>
          <button>
            <span className="material-symbols-outlined">person</span>Perfil
          </button>
          <button>
            <span className="material-symbols-outlined">settings</span>Definições
          </button>
          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
          >
            <span className="material-symbols-outlined">logout</span>Sair
          </button>
        </div>
      </div>
    </div>
  );
};

export default FmxDashboard;