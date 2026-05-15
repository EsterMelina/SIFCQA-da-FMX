// FmxDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import { useAuth } from "@/app/providers/AuthProvider";
import styles from "./FmxDashboard.module.css";

/* ==================== TIPOS ==================== */
type TabType = "dashboard" | "associations" | "database" | "reports" | "tournaments";

interface Association {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: boolean;
  president?: { id: number; name: string; email: string } | null;
}

interface Tournament {
  id: number;
  name: string;
  subtitle?: string;
  location: string;
  startDate: string;
  status: "open" | "ongoing" | "scheduled";
}

interface PlayerData {
  player_id: number;
  name: string;
  email: string;
  association_name: string;
  position: string;
  active: boolean;
  joined_at: string;
  years_in_association: number;
  months_in_association: number;
  days_in_association: number;
  fide_id?: string | null;
  rating?: number | null;
}

interface UserCandidate {
  id: number;
  name: string;
  email: string;
  roles?: { name: string }[];
}

/* ==================== COMPONENTE PRINCIPAL ==================== */
const FmxDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("theme") === "dark" ? "dark" : "light"
  );

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tournaments] = useState<Tournament[]>([
    { id: 1, name: "Open Internacional de Maputo", subtitle: "FIDE Rated", location: "Maputo", startDate: "12 Ago 2024", status: "open" },
    { id: 2, name: "Provincial de Sub-18 (Gaza)", subtitle: "Juvenil", location: "Xai-Xai", startDate: "18 Jul 2024", status: "ongoing" },
    { id: 3, name: "Taça Moçambique 2024", subtitle: "Nacional", location: "Beira", startDate: "05 Set 2024", status: "scheduled" },
  ]);

  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [editingAssoc, setEditingAssoc] = useState<Association | null>(null);
  const [showPresidentModal, setShowPresidentModal] = useState(false);
  const [selectedAssocForPresident, setSelectedAssocForPresident] = useState<Association | null>(null);
  const [candidates, setCandidates] = useState<UserCandidate[]>([]);
  const [presidentSubmitting, setPresidentSubmitting] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ============================
      // ASSOCIAÇÕES
      // ============================
      if (activeTab === "dashboard" || activeTab === "associations") {
        const res = await http.get("/fmx/associations");
        const data = res.data?.data || res.data || [];
        setAssociations(Array.isArray(data) ? data : []);
      }
      // ============================
      // JOGADORES (BASE DE DADOS)
      // ============================
      else if (activeTab === "database") {
        const res = await http.get("/fmx/players");
        // O backend devolve { total_players: N, players: [...] }
        const playersData =
          res.data?.players ||          // caso directo: { players: [...] }
          res.data?.data?.players ||    // caso encapsulado: { data: { players: [...] } }
          [];
        setPlayers(Array.isArray(playersData) ? playersData : []);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const provinceStats = useMemo(() => {
    const map: Record<string, { count: number; active: number }> = {};
    associations.forEach((a) => {
      const match = a.name.match(/de\s+([^\(]+)/i) || a.name.match(/(\w+)$/);
      let province = match ? match[1].trim() : "Outras";
      const normalized = province.toLowerCase();
      if (!map[normalized]) map[normalized] = { count: 0, active: 0 };
      map[normalized].count++;
      if (a.status) map[normalized].active++;
    });
    return Object.entries(map).map(([name, stats]) => ({
      name,
      associations: stats.count,
      active: stats.active > 0,
    }));
  }, [associations]);

  const nationalStats = {
    totalAthletes: 2482,
    activeProvinces: `${provinceStats.filter((p) => p.active).length}/${provinceStats.length}`,
    officialClubs: associations.length,
  };

  const handleLogout = async () => await logout();

  const openPresidentModal = async (assoc: Association) => {
    setSelectedAssocForPresident(assoc);
    try {
      const res = await http.get("/fmx/users");
      setCandidates(res.data.data || res.data);
    } catch (err: any) {
      alert("Erro ao carregar utilizadores");
    }
    setShowPresidentModal(true);
  };

  const assignPresident = async (userId: number) => {
    if (!selectedAssocForPresident) return;
    setPresidentSubmitting(true);
    try {
      await http.post(`/fmx/associations/${selectedAssocForPresident.id}/president`, {
        user_id: userId,
      });
      setShowPresidentModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao atribuir presidente");
    } finally {
      setPresidentSubmitting(false);
    }
  };

  const handleEditAssociation = (assoc: Association) => {
    setEditingAssoc(assoc);
    setShowAssociationModal(true);
  };

  const handleCreateAssociation = () => {
    setEditingAssoc(null);
    setShowAssociationModal(true);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardContent
            stats={nationalStats}
            provinces={provinceStats}
            tournaments={tournaments}
            loading={loading}
            error={error}
            onViewAssociations={() => setActiveTab("associations")}
          />
        );
      case "associations":
        return (
          <AssociationsContent
            associations={associations}
            onEdit={handleEditAssociation}
            onCreate={handleCreateAssociation}
            onAssignPresident={openPresidentModal}
            loading={loading}
            error={error}
            onRefresh={fetchData}
          />
        );
      case "database":
        return <DatabaseContent players={players} loading={loading} error={error} />;
      case "reports":
        return (
          <PlaceholderPage
            icon="assessment"
            title="Relatórios"
            description="Geração de relatórios institucionais."
          />
        );
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
          onClick={() => setIsSidebarOpen(false)}
        />
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <span className="material-symbols-outlined">chess</span>
              </div>
              <div>
                <h1>FMX Direction</h1>
                <p>Institutional Management</p>
              </div>
            </div>
          </div>
          <nav className={styles.nav}>
            {[
              { key: "dashboard", label: "Dashboard", icon: "dashboard" },
              { key: "associations", label: "Associações", icon: "account_balance" },
              { key: "database", label: "Base de Dados", icon: "database" },
              { key: "reports", label: "Relatórios", icon: "assessment" },
              { key: "tournaments", label: "Torneios", icon: "emoji_events" },
            ].map((item) => (
              <button
                key={item.key}
                className={`${styles.navLink} ${activeTab === item.key ? styles.active : ""}`}
                onClick={() => {
                  setActiveTab(item.key as TabType);
                  setIsSidebarOpen(false);
                }}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <button className={styles.footerLink} onClick={handleLogout}>
              <span className="material-symbols-outlined">logout</span> Sair
            </button>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.menuButton} onClick={() => setIsSidebarOpen((v) => !v)}>
                <span className="material-symbols-outlined">menu</span>
              </button>
              <span className={styles.systemName}>SIFCQA-FMX</span>
            </div>
            <div className={styles.topbarRight}>
              <button className={styles.themeToggle} onClick={toggleTheme}>
                <span className="material-symbols-outlined">
                  {theme === "light" ? "dark_mode" : "light_mode"}
                </span>
              </button>
              <div className={styles.avatar}>
                <img src="https://via.placeholder.com/40" alt="User" />
              </div>
            </div>
          </header>
          <div className={styles.content}>{renderContent()}</div>
          <footer className={styles.footer}>
            <p>© {new Date().getFullYear()} FMX · SIFCQA</p>
          </footer>
        </main>
      </div>

      {showAssociationModal && (
        <AssociationModal
          isOpen={showAssociationModal}
          association={editingAssoc}
          onClose={() => setShowAssociationModal(false)}
          onSuccess={() => {
            setShowAssociationModal(false);
            fetchData();
          }}
        />
      )}

      {showPresidentModal && selectedAssocForPresident && (
        <PresidentModal
          association={selectedAssocForPresident}
          candidates={candidates}
          onSubmit={assignPresident}
          onClose={() => setShowPresidentModal(false)}
          submitting={presidentSubmitting}
        />
      )}
    </div>
  );
};

/* ==================== DASHBOARD CONTENT ==================== */
const DashboardContent: React.FC<{
  stats: any;
  provinces: { name: string; associations: number; active: boolean }[];
  tournaments: Tournament[];
  loading: boolean;
  error: string | null;
  onViewAssociations: () => void;
}> = ({ stats, provinces, tournaments, loading, error, onViewAssociations }) => {
  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <>
      <div className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div>
            <p className={styles.heroLabel}>Panorama Nacional</p>
            <h2 className={styles.heroTitle}>Federação Moçambicana de Xadrez</h2>
            <p className={styles.heroDesc}>
              Crescimento institucional de 12.4% no último trimestre. Consolidação das associações
              provinciais em curso.
            </p>
          </div>
          <div className={styles.heroStats}>
            <div>
              <span>{stats.totalAthletes.toLocaleString()}</span>
              <p>Atletas</p>
            </div>
            <div>
              <span>{stats.activeProvinces}</span>
              <p>Províncias Ativas</p>
            </div>
            <div>
              <span>{stats.officialClubs}</span>
              <p>Associações</p>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.mapCard}>
          <div className={styles.sectionHeader}>
            <h3>Distribuição de Associações</h3>
            <button onClick={onViewAssociations}>Ver todas</button>
          </div>
          <div className={styles.mapContent}>
            <div className={styles.mapPlaceholder}>
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzTk8RFgVmNl63ng06_TE5bfqFdzoUOd8riLX3m0PMNtzg1xYqWMIyeusytbKj-6sMcEDI8cagrNFbpq3ycedb6BpiRFyGMGbFxRLQnFFvsnVTCFr9cSuix8Biw6s0W1nsa_l9BTArqPU_r_84qWnE6hxSRnGtFGBrTOFox6-_ZUTpPp-4Y9HUAlbkkyjL1DjN0EYPclLUWM94jeAQcshvqMJ3hArSs7i4NEB4WAfdnAVJuy4VgJlYvfu6jMaW8Hwx8CI1MnATnzw"
                alt="Mapa de Moçambique"
              />
            </div>
          </div>
          <div className={styles.provinceList}>
            {provinces.length === 0 ? (
              <div className={styles.empty}>Nenhuma associação registada.</div>
            ) : (
              provinces.map((p) => (
                <div
                  key={p.name}
                  className={`${styles.provinceItem} ${!p.active ? styles.inactive : ""}`}
                >
                  <span className={styles.dot} />
                  <span>{p.name}</span>
                  <span>{p.associations}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className={styles.tournamentCard}>
          <div className={styles.sectionHeader}>
            <h3>Próximos Torneios</h3>
          </div>
          <ul className={styles.tournamentList}>
            {tournaments.map((t) => (
              <li key={t.id}>
                <div>
                  <p>{t.name}</p>
                  <span>{t.subtitle}</span>
                </div>
                <div className={styles.tournamentMeta}>
                  <span className="material-symbols-outlined">location_on</span> {t.location}
                  <span className="material-symbols-outlined">calendar_today</span> {t.startDate}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
};

/* ==================== ASSOCIAÇÕES (GESTÃO) ==================== */
const AssociationsContent: React.FC<{
  associations: Association[];
  onEdit: (assoc: Association) => void;
  onCreate: () => void;
  onAssignPresident: (assoc: Association) => void;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}> = ({ associations, onEdit, onCreate, onAssignPresident, loading, error, onRefresh }) => {
  const handleToggleStatus = async (assoc: Association) => {
    if (!confirm(`Deseja ${assoc.status ? "suspender" : "reativar"} ${assoc.name}?`)) return;
    try {
      await http.patch(`/fmx/associations/${assoc.id}/status`, {});
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Gestão de Associações Provinciais</h2>
        <button className={styles.primaryButton} onClick={onCreate}>
          <span className="material-symbols-outlined">add</span> Nova Associação
        </button>
      </div>
      {loading && <div className={styles.loading}>Carregando...</div>}
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Telefone</th>
              <th>Endereço</th>
              <th>Presidente</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {associations.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>{a.email || "—"}</td>
                <td>{a.phone || "—"}</td>
                <td>{a.address || "—"}</td>
                <td>{a.president?.name || "—"}</td>
                <td>
                  <span className={`${styles.status} ${a.status ? styles.active : styles.inactive}`}>
                    {a.status ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <div className={styles.actionButtons}>
                    <button onClick={() => onEdit(a)} title="Editar">
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                    <button onClick={() => onAssignPresident(a)} title="Atribuir Presidente">
                      <span className="material-symbols-outlined">person_add</span>
                    </button>
                    <button
                      onClick={() => handleToggleStatus(a)}
                      title={a.status ? "Suspender" : "Reativar"}
                    >
                      <span className="material-symbols-outlined">
                        {a.status ? "block" : "check_circle"}
                      </span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {associations.length === 0 && !loading && (
          <div className={styles.empty}>Nenhuma associação cadastrada.</div>
        )}
      </div>
    </div>
  );
};

/* ==================== BASE DE DADOS (JOGADORES) – CORRIGIDA + SAFE ==================== */
const DatabaseContent: React.FC<{
  players: PlayerData[];
  loading: boolean;
  error: string | null;
}> = ({ players, loading, error }) => {
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Garante que é sempre um array
  const safePlayers = Array.isArray(players) ? players : [];

  const filtered = safePlayers.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch =
      term === "" ||
      (p.name || "").toLowerCase().includes(term) ||
      (p.email || "").toLowerCase().includes(term) ||
      (p.association_name || "").toLowerCase().includes(term);
    const matchesActive = filterActive === null || p.active === filterActive;
    return matchesSearch && matchesActive;
  });

  // Função auxiliar para evitar "null" ou "undefined" na UI
  const safe = (value: any, fallback = "—") => value ?? fallback;

  // const handleDownload = async () => {
  //   try {
  //     const res = await http.get("/reports/players/national/pdf", {
  //       responseType: "blob",
  //     });
  //     const url = window.URL.createObjectURL(new Blob([res.data]));
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = "base_dados_nacional_jogadores.pdf";
  //     document.body.appendChild(a);
  //     a.click();
  //     a.remove();
  //     window.URL.revokeObjectURL(url);
  //   } catch (err) {
  //     console.error("Erro ao descarregar o relatório", err);
  //     alert("Não foi possível gerar o PDF. Tente novamente.");
  //   }
  // };

  const handleDownload = async () => {

  console.log("=== INÍCIO DOWNLOAD PDF ===");

  try {

    console.log("A enviar request para /fmx/reports/players/national/pdf");

    const res = await http.get(
      "/fmx/reports/players/national/pdf",
      {
        responseType: "blob",
      }
    );

    // =========================================
    // RESPONSE COMPLETA
    // =========================================
    console.log("RESPONSE COMPLETA:", res);

    // =========================================
    // STATUS
    // =========================================
    console.log("STATUS:", res.status);

    // =========================================
    // HEADERS
    // =========================================
    console.log("HEADERS:", res.headers);

    // =========================================
    // DATA / BLOB
    // =========================================
    console.log("DATA:", res.data);

    console.log("TIPO DA DATA:", typeof res.data);

    console.log("É BLOB?", res.data instanceof Blob);

    console.log("TAMANHO BLOB:", res.data.size);

    console.log("TIPO MIME:", res.data.type);

    // =========================================
    // URL GERADA
    // =========================================
    const url = window.URL.createObjectURL(
      new Blob([res.data])
    );

    console.log("URL GERADA:", url);

    // =========================================
    // DOWNLOAD
    // =========================================
    const a = document.createElement("a");

    a.href = url;

    a.download = "base_dados_nacional_jogadores.pdf";

    console.log("NOME DOWNLOAD:", a.download);

    document.body.appendChild(a);

    console.log("A iniciar clique automático...");

    a.click();

    a.remove();

    window.URL.revokeObjectURL(url);

    console.log("DOWNLOAD FINALIZADO");

  } catch (err: any) {

    console.log("=== ERRO DOWNLOAD PDF ===");

    console.error(err);

    console.log("ERR RESPONSE:", err.response);

    console.log("ERR DATA:", err.response?.data);

    console.log("ERR STATUS:", err.response?.status);

    console.log("ERR HEADERS:", err.response?.headers);

    alert("Não foi possível gerar o PDF. Tente novamente.");
  }
};

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Base de Dados Nacional – Jogadores</h2>
        <button className={styles.pdfButton} onClick={handleDownload}>
          <span className="material-symbols-outlined">picture_as_pdf</span> Download Relatório
        </button>
      </div>

      <div className={styles.filters}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Pesquisar nome, email ou associação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={filterActive === null ? "all" : filterActive ? "active" : "inactive"}
          onChange={(e) => {
            const val = e.target.value;
            setFilterActive(val === "all" ? null : val === "active");
          }}
        >
          <option value="all">Todos os estados</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </select>
      </div>

      {loading && <div className={styles.loading}>Carregando...</div>}
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nome</th>
              <th>Email</th>
              <th>Associação</th>
              <th>Posição</th>
              <th>FIDE ID</th>
              <th>Rating</th>
              <th>Ativo</th>
              <th>Ingresso</th>
              <th>Anos</th>
              <th>Meses</th>
              <th>Dias</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.player_id}>
                <td>{safe(p.player_id)}</td>
                <td>{safe(p.name)}</td>
                <td>{safe(p.email)}</td>
                <td>{safe(p.association_name)}</td>
                <td>{safe(p.position)}</td>
                <td>{safe(p.fide_id)}</td>
                <td>{safe(p.rating)}</td>
                <td>{p.active ? "Sim" : "Não"}</td>
                <td>{safe(p.joined_at)}</td>
                <td>{safe(p.years_in_association)}</td>
                <td>{safe(p.months_in_association)}</td>
                <td>{safe(p.days_in_association)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && (
          <div className={styles.empty}>Nenhum jogador encontrado.</div>
        )}
      </div>
    </div>
  );
};

/* ==================== TORNEIOS ==================== */
const TournamentsContent: React.FC<{ tournaments: Tournament[] }> = ({ tournaments }) => (
  <div className={styles.pageContainer}>
    <div className={styles.pageHeader}>
      <h2>Torneios Nacionais</h2>
      <button className={styles.primaryButton}>
        <span className="material-symbols-outlined">add</span> Novo Torneio
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
              <td>
                <span className={`${styles.status} ${styles[t.status]}`}>{t.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ==================== PLACEHOLDER ==================== */
const PlaceholderPage: React.FC<{
  icon: string;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className={styles.placeholderPage}>
    <span className="material-symbols-outlined">{icon}</span>
    <h2>{title}</h2>
    <p>{description}</p>
  </div>
);

/* ==================== MODAL: ASSOCIAÇÃO ==================== */
const AssociationModal: React.FC<{
  isOpen: boolean;
  association: Association | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, association, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    status: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (association) {
      setForm({
        name: association.name,
        email: association.email || "",
        phone: association.phone || "",
        address: association.address || "",
        status: association.status,
      });
    } else {
      setForm({ name: "", email: "", phone: "", address: "", status: true });
    }
  }, [association]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (association) {
        await http.put(`/fmx/associations/${association.id}`, form);
      } else {
        await http.post("/fmx/associations", form);
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{association ? "Editar Associação" : "Nova Associação"}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Nome *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Telefone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Endereço</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.checked })}
                />
                Ativo
              </label>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Salvando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== MODAL: ATRIBUIR PRESIDENTE ==================== */
const PresidentModal: React.FC<{
  association: Association;
  candidates: UserCandidate[];
  onSubmit: (userId: number) => void;
  onClose: () => void;
  submitting: boolean;
}> = ({ association, candidates, onSubmit, onClose, submitting }) => {
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");

  const handleSubmit = () => {
    if (selectedUserId) onSubmit(selectedUserId as number);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Atribuir Presidente a {association.name}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Selecionar Presidente</label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
            >
              <option value="">-- Escolha um utilizador --</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className={styles.submitButton}
              disabled={!selectedUserId || submitting}
            >
              {submitting ? "Salvando..." : "Atribuir"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FmxDashboard;