// FmxDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import { useAuth } from "@/app/providers/AuthProvider";
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import styles from "./FmxDashboard.module.css";
import logo from "/assets/logo.png";

/* ==================== TIPOS ==================== */
type TabType =
  | "dashboard"
  | "associations"
  | "database"
  | "reports"
  | "tournaments";

interface Association {
  id: number;
  name: string;
  contact_email: string | null;
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
  user_id: number;
  name: string;
  email: string;
  genero?: string;
  data_nascimento?: string;
  association_name: string;
  position: string;
  active: boolean;
  fide_id?: string | null;
  rating?: number | null;
  membership?: string;
  is_student?: boolean;
  joined_at: string;
  years_in_association: number;
  months_in_association: number;
  days_in_association: number;
}

interface UserCandidate {
  id: number;
  name: string;
  email: string;
  roles?: { name: string }[];
}

interface ReportStats {
  total_players: number;
  active_players: number;
  gender_distribution: Record<string, number>;
  membership_distribution: Record<string, number>;
  association_distribution: Record<string, number>;
  age_distribution: Record<string, number>;
  province_distribution: Record<string, number>;
  student_count: number;
  rating_distribution: Record<string, number>;
}

/* ==================== COMPONENTE PRINCIPAL ==================== */
const FmxDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("theme") === "dark" ? "dark" : "light",
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

  const [showAvatarPopup, setShowAvatarPopup] = useState(false);
  const avatarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setShowAvatarPopup(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDark = theme === "dark";
  const avatarBg = isDark ? "#e60023" : "#1e3a5f";
  const avatarBorder = isDark ? "#1e3a5f" : "#e60023";

  useEffect(() => { document.documentElement.classList.toggle("dark", isDark); localStorage.setItem("theme", theme); }, [theme]);
  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "dashboard" || activeTab === "associations") {
        const res = await http.get("/fmx/associations");
        const data = res.data?.data || res.data || [];
        setAssociations(Array.isArray(data) ? data : []);
      } else if (activeTab === "database") {
        const res = await http.get("/fmx/players");
        const data = res.data;
        const playersData = data?.players || data?.data?.players || [];
        setPlayers(Array.isArray(playersData) ? playersData : []);
      }
    } catch (err: any) { console.error(err); setError(err.response?.data?.message || "Erro ao carregar dados"); }
    finally { setLoading(false); }
  }, [activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    return Object.entries(map).map(([name, stats]) => ({ name, associations: stats.count, active: stats.active > 0 }));
  }, [associations]);

  const nationalStats = {
    totalAthletes: 2482,
    activeProvinces: `${provinceStats.filter((p) => p.active).length}/${provinceStats.length}`,
    officialClubs: associations.length,
  };

  const handleLogout = async () => await logout();

  const openPresidentModal = async (assoc: Association) => {
    setSelectedAssocForPresident(assoc);
    try { const res = await http.get("/fmx/users"); setCandidates(res.data.data || res.data); }
    catch (err: any) { alert("Erro ao carregar utilizadores"); }
    setShowPresidentModal(true);
  };

  const assignPresident = async (userId: number) => {
    if (!selectedAssocForPresident) return;
    setPresidentSubmitting(true);
    try { await http.post(`/fmx/associations/${selectedAssocForPresident.id}/president`, { user_id: userId }); setShowPresidentModal(false); fetchData(); }
    catch (err: any) { alert(err.response?.data?.message || "Erro ao atribuir presidente"); }
    finally { setPresidentSubmitting(false); }
  };

  const handleEditAssociation = (assoc: Association) => { setEditingAssoc(assoc); setShowAssociationModal(true); };
  const handleCreateAssociation = () => { setEditingAssoc(null); setShowAssociationModal(true); };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard": return <DashboardContent stats={nationalStats} provinces={provinceStats} tournaments={tournaments} loading={loading} error={error} onViewAssociations={() => setActiveTab("associations")} />;
      case "associations": return <AssociationsContent associations={associations} onEdit={handleEditAssociation} onCreate={handleCreateAssociation} onAssignPresident={openPresidentModal} loading={loading} error={error} onRefresh={fetchData} />;
      case "database": return <DatabaseContent players={players} loading={loading} error={error} />;
      case "reports": return <ReportsSection />;
      case "tournaments": return <TournamentsContent tournaments={tournaments} />;
      default: return null;
    }
  };

  return (
    <div className={`${styles.container} ${isDark ? styles.dark : ""}`}>
      <div className={styles.layout}>
        <div className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`} onClick={() => setIsSidebarOpen(false)} />
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <div style={{ backgroundColor: isDark ? '#000000' : '#ffffff', borderRadius: '8px', padding: '4px', display: 'inline-block', lineHeight: 0 }}>
                  <img src={logo} alt="Logo FMX" style={{ width: "48px", height: "auto" }} />
                </div>
              </div>
              <div><h1>Gestão da FMX</h1><p>Painel de Administração</p></div>
            </div>
          </div>
          <nav className={styles.nav}>
            {[{ key: "dashboard", label: "Painel", icon: "dashboard" }, { key: "associations", label: "Associações", icon: "account_balance" }, { key: "database", label: "Lista de Jogadores", icon: "database" }, { key: "reports", label: "Relatórios", icon: "assessment" }, { key: "tournaments", label: "Torneios", icon: "emoji_events" }].map((item) => (
              <button key={item.key} className={`${styles.navLink} ${activeTab === item.key ? styles.active : ""}`} onClick={() => { setActiveTab(item.key as TabType); setIsSidebarOpen(false); }}>
                <span className="material-symbols-outlined">{item.icon}</span><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFooter}><button className={styles.footerLink} onClick={handleLogout}><span className="material-symbols-outlined">logout</span> Sair</button></div>
        </aside>
        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}><button className={styles.menuButton} onClick={() => setIsSidebarOpen((v) => !v)}><span className="material-symbols-outlined">menu</span></button><span className={styles.systemName}>SIFCQA-FMX</span></div>
            <div className={styles.topbarRight}>
              <button className={styles.themeToggle} onClick={toggleTheme}><span className="material-symbols-outlined">{isDark ? "light_mode" : "dark_mode"}</span></button>
              <div ref={avatarRef} style={{ position: "relative" }} onClick={() => setShowAvatarPopup((prev) => !prev)}>
                <div style={{ width: "40px", height: "40px", borderRadius: "50%", border: `3px solid ${avatarBorder}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backgroundColor: avatarBg, boxShadow: isDark ? "0 0 0 2px rgba(30, 58, 95, 0.3)" : "0 0 0 2px rgba(230, 0, 35, 0.3)" }}>
                  <span style={{ color: "#ffffff", fontSize: "18px", fontWeight: 600 }}>FM</span>
                </div>
                {showAvatarPopup && (
                  <div style={{ position: "absolute", top: "110%", right: 0, width: "200px", backgroundColor: "var(--color-surface-container)", border: "1px solid var(--color-outline-variant)", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", padding: "1rem", zIndex: 100 }}>
                    <div style={{ textAlign: "center" }}><strong>Gestor da FMX</strong><span style={{ fontSize: "0.8rem", color: "var(--color-on-surface-variant)" }}>Federação Moçambicana de Xadrez</span></div>
                    <div style={{ borderTop: "1px solid var(--color-outline-variant)", paddingTop: "0.5rem" }}><p style={{ fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--color-on-surface-variant)" }}><span className="material-symbols-outlined">admin_panel_settings</span>Acesso institucional</p></div>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className={styles.content}>{renderContent()}</div>
          <footer className={styles.footer}><p>© {new Date().getFullYear()} FMX · SIFCQA</p></footer>
        </main>
      </div>
      {showAssociationModal && <AssociationModal isOpen={showAssociationModal} association={editingAssoc} onClose={() => setShowAssociationModal(false)} onSuccess={() => { setShowAssociationModal(false); fetchData(); }} />}
      {showPresidentModal && selectedAssocForPresident && <PresidentModal association={selectedAssocForPresident} candidates={candidates} onSubmit={assignPresident} onClose={() => setShowPresidentModal(false)} submitting={presidentSubmitting} />}
    </div>
  );
};

/* ==================== DASHBOARD CONTENT ==================== */
const DashboardContent: React.FC<{ stats: any; provinces: any[]; tournaments: Tournament[]; loading: boolean; error: string | null; onViewAssociations: () => void }> = ({ stats, provinces, tournaments, loading, error, onViewAssociations }) => {
  if (loading) return <div className={styles.loading}>Carregando...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  return (
    <>
      <div className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <div><p className={styles.heroLabel}>Panorama Nacional</p><h2 className={styles.heroTitle}>Federação Moçambicana de Xadrez</h2><p className={styles.heroDesc}>Crescimento institucional de 12.4% no último trimestre.</p></div>
          <div className={styles.heroStats}><div><span>{stats.totalAthletes.toLocaleString()}</span><p>Atletas</p></div><div><span>{stats.activeProvinces}</span><p>Províncias Activas</p></div><div><span>{stats.officialClubs}</span><p>Associações</p></div></div>
        </div>
      </div>
      <div className={styles.dashboardGrid}>
        <div className={styles.mapCard}>
          <div className={styles.sectionHeader}><h3>Distribuição de Associações</h3><button onClick={onViewAssociations}>Ver todas</button></div>
          <div className={styles.mapContent}><div className={styles.mapPlaceholder}><img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDzTk8RFgVmNl63ng06_TE5bfqFdzoUOd8riLX3m0PMNtzg1xYqWMIyeusytbKj-6sMcEDI8cagrNFbpq3ycedb6BpiRFyGMGbFxRLQnFFvsnVTCFr9cSuix8Biw6s0W1nsa_l9BTArqPU_r_84qWnE6hxSRnGtFGBrTOFox6-_ZUTpPp-4Y9HUAlbkkyjL1DjN0EYPclLUWM94jeAQcshvqMJ3hArSs7i4NEB4WAfdnAVJuy4VgJlYvfu6jMaW8Hwx8CI1MnATnzw" alt="Mapa de Moçambique" /></div></div>
          <div className={styles.provinceList}>{provinces.length === 0 ? <div className={styles.empty}>Nenhuma associação registada.</div> : provinces.map((p) => (<div key={p.name} className={`${styles.provinceItem} ${!p.active ? styles.inactive : ""}`}><span className={styles.dot} /><span>{p.name}</span><span>{p.associations}</span></div>))}</div>
        </div>
        <div className={styles.tournamentCard}><div className={styles.sectionHeader}><h3>Próximos Torneios</h3></div><ul className={styles.tournamentList}>{tournaments.map((t) => (<li key={t.id}><div><p>{t.name}</p><span>{t.subtitle}</span></div><div className={styles.tournamentMeta}><span className="material-symbols-outlined">location_on</span> {t.location}<span className="material-symbols-outlined">calendar_today</span> {t.startDate}</div></li>))}</ul></div>
      </div>
    </>
  );
};

/* ==================== ASSOCIAÇÕES ==================== */
const AssociationsContent: React.FC<{ associations: Association[]; onEdit: (a: Association) => void; onCreate: () => void; onAssignPresident: (a: Association) => void; loading: boolean; error: string | null; onRefresh: () => void }> = ({ associations, onEdit, onCreate, onAssignPresident, loading, error, onRefresh }) => {
  const handleToggleStatus = async (assoc: Association) => { if (!confirm(`Deseja ${assoc.status ? "suspender" : "reactivar"} ${assoc.name}?`)) return; try { await http.patch(`/fmx/associations/${assoc.id}/status`, {}); onRefresh(); } catch (err: any) { alert(err.response?.data?.message || "Erro"); } };
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}><h2>Gestão de Associações Provinciais</h2><button className={styles.primaryButton} onClick={onCreate}><span className="material-symbols-outlined">add</span> Nova Associação</button></div>
      {loading && <div className={styles.loading}>Carregando...</div>}{error && <div className={styles.error}>{error}</div>}
      <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Endereço</th><th>Presidente</th><th>Estado</th><th>Acções</th></tr></thead><tbody>{associations.map((a) => (<tr key={a.id}><td>{a.name}</td><td>{a.contact_email || "—"}</td><td>{a.phone || "—"}</td><td>{a.address || "—"}</td><td>{a.president?.name || "—"}</td><td><span className={`${styles.status} ${a.status ? styles.active : styles.inactive}`}>{a.status ? "Activo" : "Inactivo"}</span></td><td><div className={styles.actionButtons}><button onClick={() => onEdit(a)} title="Editar"><span className="material-symbols-outlined">edit</span></button><button onClick={() => onAssignPresident(a)} title="Atribuir Presidente"><span className="material-symbols-outlined">person_add</span></button><button onClick={() => handleToggleStatus(a)} title={a.status ? "Suspender" : "Reactivar"}><span className="material-symbols-outlined">{a.status ? "block" : "check_circle"}</span></button></div></td></tr>))}</tbody></table>{associations.length === 0 && !loading && <div className={styles.empty}>Nenhuma associação cadastrada.</div>}</div>
    </div>
  );
};

/* ==================== BASE DE DADOS (JOGADORES) ==================== */
const DatabaseContent: React.FC<{ players: PlayerData[]; loading: boolean; error: string | null }> = ({ players, loading, error }) => {
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterGender, setFilterGender] = useState<string>("");
  const [filterMembership, setFilterMembership] = useState<string>("");
  const [filterStudent, setFilterStudent] = useState<boolean | null>(null);
  const [filterRating, setFilterRating] = useState<string>("");

  const safePlayers = Array.isArray(players) ? players : [];

  const filtered = safePlayers.filter((p) => {
    const term = search.toLowerCase();
    const matchesSearch = term === "" || (p.name || "").toLowerCase().includes(term) || (p.email || "").toLowerCase().includes(term) || (p.association_name || "").toLowerCase().includes(term) || (p.fide_id || "").toLowerCase().includes(term) || (p.membership || "").toLowerCase().includes(term);
    const matchesActive = filterActive === null || p.active === filterActive;
    const matchesGender = !filterGender || p.genero === filterGender;
    const matchesMembership = !filterMembership || p.membership === filterMembership;
    const matchesStudent = filterStudent === null || p.is_student === filterStudent;
    let matchesRating = true;
    if (filterRating) { const rating = p.rating || 0; switch (filterRating) { case "none": matchesRating = !p.rating; break; case "low": matchesRating = rating < 1200; break; case "medium": matchesRating = rating >= 1200 && rating < 1800; break; case "high": matchesRating = rating >= 1800 && rating < 2000; break; case "top": matchesRating = rating >= 2000; break; } }
    return matchesSearch && matchesActive && matchesGender && matchesMembership && matchesStudent && matchesRating;
  });

  const safe = (value: any, fallback = "—") => value ?? fallback;
  const formatMembership = (value?: string) => { if (!value) return "—"; const map: Record<string, string> = { fundador: "Fundador", efetivo: "Efectivo", atleta: "Atleta", de_mérito: "De Mérito", honorário: "Honorário", patrocinador: "Patrocinador" }; return map[value] || value; };
  const formatGender = (value?: string) => { if (value === "M") return "Masculino"; if (value === "F") return "Feminino"; return value || "—"; };

  const handleDownload = async () => { try { const res = await http.get("/fmx/reports/players/national/pdf", { responseType: "blob" }); const url = window.URL.createObjectURL(new Blob([res.data])); const a = document.createElement("a"); a.href = url; a.download = "base_dados_nacional_jogadores.pdf"; document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url); } catch (err) { alert("Não foi possível gerar o PDF."); } };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}><h2>Lista de Jogadores</h2><button className={styles.pdfButton} onClick={handleDownload}><span className="material-symbols-outlined">picture_as_pdf</span> Baixar Lista</button></div>
      <div className={styles.filters} style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input type="text" className={styles.searchInput} placeholder="Pesquisar nome, email, associação, FIDE ID..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: "1 1 250px", minWidth: "200px" }} />
        <select className={styles.filterSelect} value={filterActive === null ? "all" : filterActive ? "active" : "inactive"} onChange={(e) => { const val = e.target.value; setFilterActive(val === "all" ? null : val === "active"); }}><option value="all">Todos os estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select>
        <select className={styles.filterSelect} value={filterGender} onChange={(e) => setFilterGender(e.target.value)}><option value="">Todos os géneros</option><option value="M">Masculino</option><option value="F">Feminino</option></select>
        <select className={styles.filterSelect} value={filterMembership} onChange={(e) => setFilterMembership(e.target.value)}><option value="">Todos os tipos</option><option value="fundador">Fundador</option><option value="efetivo">Efectivo</option><option value="atleta">Atleta</option><option value="de_mérito">De Mérito</option><option value="honorário">Honorário</option><option value="patrocinador">Patrocinador</option></select>
        <select className={styles.filterSelect} value={filterStudent === null ? "all" : filterStudent ? "yes" : "no"} onChange={(e) => { const val = e.target.value; setFilterStudent(val === "all" ? null : val === "yes"); }}><option value="all">Estudante: Todos</option><option value="yes">Estudante: Sim</option><option value="no">Estudante: Não</option></select>
        <select className={styles.filterSelect} value={filterRating} onChange={(e) => setFilterRating(e.target.value)}><option value="">Rating: Todos</option><option value="none">Sem Rating</option><option value="low">&lt;1200</option><option value="medium">1200-1800</option><option value="high">1800-2000</option><option value="top">2000+</option></select>
        <span style={{ fontSize: "0.85rem", color: "var(--color-on-surface-variant)", whiteSpace: "nowrap" }}>{filtered.length} de {safePlayers.length} jogadores</span>
      </div>
      {loading && <div className={styles.loading}>Carregando...</div>}{error && <div className={styles.error}>{error}</div>}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead><tr><th>ID</th><th>Nome</th><th>Email</th><th>Género</th><th>Nascimento</th><th>Associação</th><th>Tipo</th><th>Estudante</th><th>FIDE ID</th><th>Rating</th><th>Activo</th><th>Ingresso</th></tr></thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.player_id}>
                <td>{safe(p.player_id)}</td><td><strong>{safe(p.name)}</strong></td><td style={{ fontSize: "0.8rem" }}>{safe(p.email)}</td>
                <td>{formatGender(p.genero)}</td><td style={{ fontSize: "0.8rem" }}>{safe(p.data_nascimento)}</td>
                <td>{safe(p.association_name)}</td><td><span style={{ fontSize: "0.75rem" }}>{formatMembership(p.membership)}</span></td>
                <td>{p.is_student ? "Sim" : "Não"}</td><td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{safe(p.fide_id)}</td>
                <td>{safe(p.rating)}</td>
                <td><span className={`${styles.status} ${p.active ? styles.active : styles.inactive}`}>{p.active ? "Sim" : "Não"}</span></td>
                <td style={{ fontSize: "0.8rem" }}>{safe(p.joined_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && !loading && <div className={styles.empty}>Nenhum jogador encontrado.</div>}
      </div>
    </div>
  );
};

/* ==================== RELATÓRIOS ==================== */
const ReportsSection: React.FC = () => {
  const [stats, setStats] = useState<ReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { const fetchStats = async () => { setLoading(true); try { const res = await http.get("/fmx/reports/player-stats"); setStats(res.data); } catch (err: any) { setError("Erro ao carregar estatísticas."); } finally { setLoading(false); } }; fetchStats(); }, []);
  if (loading) return <div className={styles.loading}>Carregando relatório...</div>;
  if (error) return <div className={styles.error}>{error}</div>;
  if (!stats) return <div className={styles.empty}>Nenhum dado disponível.</div>;

  const PRIMARY = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#e60023';
  const TERTIARY = getComputedStyle(document.documentElement).getPropertyValue('--color-tertiary').trim() || '#6b6a69';
  const ON_SURFACE_VARIANT = getComputedStyle(document.documentElement).getPropertyValue('--color-on-surface-variant').trim() || '#5a524c';

  const genderData = Object.entries(stats.gender_distribution).map(([name, value]) => ({ name: name === 'M' ? 'Masculino' : name === 'F' ? 'Feminino' : name, value }));
  const membershipData = Object.entries(stats.membership_distribution).map(([name, value]) => { const labels: Record<string, string> = { fundador: 'Fundador', efetivo: 'Efectivo', atleta: 'Atleta', de_mérito: 'De Mérito', honorário: 'Honorário', patrocinador: 'Patrocinador' }; return { name: labels[name] || name, value }; });
  const associationData = Object.entries(stats.association_distribution).map(([name, value]) => ({ name, value }));
  const ageData = Object.entries(stats.age_distribution).map(([name, value]) => ({ name, value }));
  const provinceData = Object.entries(stats.province_distribution).map(([name, value]) => ({ name, value }));
  const ratingData = Object.entries(stats.rating_distribution).map(([name, value]) => ({ name, value }));

  return (
    <div className={styles.pageContainer}>
      <h2 style={{ marginBottom: "1.5rem" }}>Relatórios Estatísticos</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className={styles.metricCard} style={{ padding: "1.5rem", background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", textAlign: "center" }}><p className={styles.metricLabel}>Total Jogadores</p><h3 className={styles.metricValue}>{stats.total_players}</h3></div>
        <div className={styles.metricCard} style={{ padding: "1.5rem", background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", textAlign: "center" }}><p className={styles.metricLabel}>Jogadores Activos</p><h3 className={styles.metricValue}>{stats.active_players}</h3></div>
        <div className={styles.metricCard} style={{ padding: "1.5rem", background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", textAlign: "center" }}><p className={styles.metricLabel}>Estudantes</p><h3 className={styles.metricValue}>{stats.student_count}</h3></div>
        <div className={styles.metricCard} style={{ padding: "1.5rem", background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", textAlign: "center" }}><p className={styles.metricLabel}>Associações</p><h3 className={styles.metricValue}>{Object.keys(stats.association_distribution).length}</h3></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(500px, 1fr))", gap: "1.5rem" }}>
        <div style={{ background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", padding: "1.5rem" }}><h3 style={{ marginBottom: "1rem" }}>Distribuição por Género</h3><ReactECharts style={{ height: 320 }} option={{ tooltip: { trigger: 'item' }, series: [{ type: 'pie', radius: ['45%', '75%'], data: genderData, color: ['#3b82f6', '#ec4899', '#6b7280'] }], backgroundColor: 'transparent' }} /></div>
        <div style={{ background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", padding: "1.5rem" }}><h3 style={{ marginBottom: "1rem" }}>Jogadores por Tipo de Associado</h3><ReactECharts style={{ height: 320 }} option={{ tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: membershipData.map(d => d.name), axisLabel: { rotate: 45, color: ON_SURFACE_VARIANT, fontSize: 11 } }, yAxis: { type: 'value' }, series: [{ data: membershipData.map(d => d.value), type: 'bar', itemStyle: { borderRadius: [6, 6, 0, 0], color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: PRIMARY }, { offset: 1, color: TERTIARY }]) } }], backgroundColor: 'transparent' }} /></div>
        <div style={{ background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", padding: "1.5rem" }}><h3 style={{ marginBottom: "1rem" }}>Distribuição por Faixa Etária</h3><ReactECharts style={{ height: 320 }} option={{ tooltip: { trigger: 'item' }, series: [{ type: 'pie', radius: ['40%', '70%'], data: ageData, color: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'] }], backgroundColor: 'transparent' }} /></div>
        <div style={{ background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", padding: "1.5rem" }}><h3 style={{ marginBottom: "1rem" }}>Jogadores por Província</h3><ReactECharts style={{ height: 350 }} option={{ tooltip: { trigger: 'axis' }, xAxis: { type: 'value' }, yAxis: { type: 'category', data: provinceData.map(d => d.name), axisLabel: { color: ON_SURFACE_VARIANT, fontSize: 11 } }, series: [{ data: provinceData.map(d => d.value), type: 'bar', itemStyle: { borderRadius: [0, 6, 6, 0], color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: PRIMARY }, { offset: 1, color: TERTIARY }]) } }], backgroundColor: 'transparent' }} /></div>
        <div style={{ background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", padding: "1.5rem" }}><h3 style={{ marginBottom: "1rem" }}>Distribuição por Rating</h3><ReactECharts style={{ height: 320 }} option={{ tooltip: { trigger: 'item' }, series: [{ type: 'pie', radius: ['45%', '75%'], data: ratingData, color: ['#6b7280', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'] }], backgroundColor: 'transparent' }} /></div>
        <div style={{ background: "var(--color-surface)", borderRadius: "1rem", border: "1px solid var(--color-outline-variant)", padding: "1.5rem" }}><h3 style={{ marginBottom: "1rem" }}>Jogadores por Associação</h3><div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Associação</th><th>Total</th><th>Percentagem</th></tr></thead><tbody>{associationData.map((item) => (<tr key={item.name}><td>{item.name}</td><td>{item.value}</td><td>{((item.value / stats.total_players) * 100).toFixed(1)}%</td></tr>))}</tbody></table></div></div>
      </div>
    </div>
  );
};

/* ==================== TORNEIOS ==================== */
const TournamentsContent: React.FC<{ tournaments: Tournament[] }> = ({ tournaments }) => (
  <div className={styles.pageContainer}>
    {/* Aviso de funcionalidade futura */}
    <div className={styles.infoBanner} style={{ marginBottom: "1.5rem" }}>
      <span className="material-symbols-outlined">construction</span>
      <p>
        Esta funcionalidade será implementada nas próximas actualizações. 
        A gestão completa de torneios estará disponível em breve.
      </p>
    </div>

    <div className={styles.pageHeader}>
      <h2>Torneios Nacionais</h2>
      <button className={styles.primaryButton} disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
        <span className="material-symbols-outlined">add</span> Novo Torneio
      </button>
    </div>
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead><tr><th>Nome</th><th>Local</th><th>Data</th><th>Estado</th></tr></thead>
        <tbody>
          {tournaments.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td><td>{t.location}</td><td>{t.startDate}</td>
              <td><span className={`${styles.status} ${styles[t.status]}`}>
                {t.status === "open" ? "Aberto" : t.status === "ongoing" ? "Em curso" : "Agendado"}
              </span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ==================== MODAIS ==================== */
const AssociationModal: React.FC<{ isOpen: boolean; association: Association | null; onClose: () => void; onSuccess: () => void }> = ({ isOpen, association, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", status: true });
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (association) setForm({ name: association.name, email: association.contact_email || "", phone: association.phone || "", address: association.address || "", status: association.status }); else setForm({ name: "", email: "", phone: "", address: "", status: true }); }, [association]);
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setLoading(true); try { if (association) await http.put(`/fmx/associations/${association.id}`, form); else await http.post("/fmx/associations", form); onSuccess(); } catch (err: any) { alert(err.response?.data?.message || "Erro ao salvar"); } finally { setLoading(false); } };
  if (!isOpen) return null;
  return (<div className={styles.modalOverlay} onClick={onClose}><div className={styles.modal} onClick={(e) => e.stopPropagation()}><div className={styles.modalHeader}><h3>{association ? "Editar Associação" : "Nova Associação"}</h3><button onClick={onClose} className={styles.modalClose}>×</button></div><form onSubmit={handleSubmit}><div className={styles.modalBody}><div className={styles.formGroup}><label>Nome *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div><div className={styles.formGroup}><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div className={styles.formGroup}><label>Telefone</label><input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div className={styles.formGroup}><label>Endereço</label><input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div><div className={styles.formGroup}><label><input type="checkbox" checked={form.status} onChange={(e) => setForm({ ...form, status: e.target.checked })} /> Activo</label></div></div><div className={styles.modalActions}><button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button><button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Salvando..." : "Guardar"}</button></div></form></div></div>);
};

const PresidentModal: React.FC<{ association: Association; candidates: UserCandidate[]; onSubmit: (userId: number) => void; onClose: () => void; submitting: boolean }> = ({ association, candidates, onSubmit, onClose, submitting }) => {
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  return (<div className={styles.modalOverlay} onClick={onClose}><div className={styles.modal} onClick={(e) => e.stopPropagation()}><div className={styles.modalHeader}><h3>Atribuir Presidente a {association.name}</h3><button onClick={onClose} className={styles.modalClose}>×</button></div><div className={styles.modalBody}><div className={styles.formGroup}><label>Seleccionar Presidente</label><select value={selectedUserId} onChange={(e) => setSelectedUserId(Number(e.target.value))}><option value="">-- Escolha um utilizador --</option>{candidates.map((u) => (<option key={u.id} value={u.id}>{u.name} ({u.email})</option>))}</select></div><div className={styles.modalActions}><button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button><button onClick={() => selectedUserId && onSubmit(selectedUserId as number)} className={styles.submitButton} disabled={!selectedUserId || submitting}>{submitting ? "Salvando..." : "Atribuir"}</button></div></div></div></div>);
};

export default FmxDashboard;