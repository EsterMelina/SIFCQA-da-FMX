import React, { useState, useEffect } from "react";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import { useAuth } from "@/app/providers/AuthProvider";
import styles from "./AdminDashboard.module.css";

// ================= TIPOS =================
type TabType = "dashboard" | "users" | "associations" | "fmxStaff" | "members" | "players" | "fmxSettings";

interface User {
  id: number; name: string; email: string; status?: string; roles?: string[];
}
interface Association {
  id: number; name: string; contact_email?: string; phone?: string; address?: string; status?: string;
}
interface FmxStaff {
  id: number; user_id: number; position: string; active: boolean; user?: { name: string; email: string };
}
interface AssociationMember {
  id: number; user_id: number; position: string; user?: { name: string; email: string };
}
interface Player {
  id: number; user_id: number; active: boolean; user?: { name: string; email: string };
}
interface ToastMessage { id: string; type: "success" | "error" | "info"; message: string; }

// ================= COMPONENTE PRINCIPAL =================
const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => localStorage.getItem("theme") as any || null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [fmxStaff, setFmxStaff] = useState<FmxStaff[]>([]);
  const [members, setMembers] = useState<AssociationMember[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedAssociationId, setSelectedAssociationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAssociationModal, setShowAssociationModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Tema
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === "dark" || (theme === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme === null ? "auto" : theme);
  }, [theme]);

  const addToast = (type: ToastMessage["type"], message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Carregar dados para as abas de gestão (não para o dashboard)
  useEffect(() => {
    if (activeTab === "dashboard") return; // dashboard não carrega dados externos
    const loadData = async () => {
      setLoading(true); setError(null);
      try {
        if (activeTab === "users") {
          const res = await http.get(endpoints.users.base);
          setUsers(res.data.data || res.data);
        } else if (activeTab === "associations") {
          const res = await http.get(endpoints.associations.base);
          setAssociations(res.data.data || res.data);
        } else if (activeTab === "fmxStaff") {
          const res = await http.get("/admin/fmx/staff");
          setFmxStaff(res.data.data || res.data);
        } else if (activeTab === "members" && selectedAssociationId) {
          const res = await http.get(endpoints.associations.members(selectedAssociationId));
          setMembers(res.data.data || res.data);
        } else if (activeTab === "players" && selectedAssociationId) {
          const res = await http.get(endpoints.associations.associationPlayers(selectedAssociationId));
          setPlayers(res.data.data || res.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Erro ao carregar dados");
        addToast("error", `Erro: ${err.response?.data?.message || "Falha na requisição"}`);
      } finally { setLoading(false); }
    };
    loadData();
  }, [activeTab, selectedAssociationId]);

  const handleDelete = async (url: string, id: number, callback: () => void) => {
    if (!confirm("Tem a certeza que deseja eliminar?")) return;
    try { await http.delete(url); addToast("success", "Eliminado com sucesso!"); callback(); }
    catch (err: any) { addToast("error", err.response?.data?.message || "Erro ao eliminar"); }
  };

  const handleStatusToggle = async (url: string, currentStatus: string, callback: () => void) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try { await http.patch(url, { status: newStatus }); addToast("success", `Status alterado para ${newStatus}`); callback(); }
    catch (err: any) { addToast("error", err.response?.data?.message || "Erro ao alterar status"); }
  };

  const handlePlayerActiveToggle = async (playerId: number, currentActive: boolean, callback: () => void) => {
    try { await http.patch(`/admin/players/${playerId}/status`, { active: !currentActive }); addToast("success", `Jogador ${!currentActive ? "ativado" : "desativado"}`); callback(); }
    catch (err: any) { addToast("error", err.response?.data?.message || "Erro"); }
  };

  const toggleSidebar = () => setIsSidebarOpen(v => !v);
  const closeSidebar = () => setIsSidebarOpen(false);
  const handleLogout = async () => { await logout(); };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardContent />;
      case "users":
        return <UserManagement users={users} loading={loading} error={error} onRefresh={() => setActiveTab("users")}
          onEdit={(u: User) => { setEditingItem(u); setShowUserModal(true); }}
          onDelete={(id: number) => handleDelete(`${endpoints.users.base}/${id}`, id, () => setActiveTab("users"))}
          onToggleStatus={(u: User) => handleStatusToggle(`${endpoints.users.base}/${u.id}/status`, u.status || "active", () => setActiveTab("users"))}
          onNew={() => { setEditingItem(null); setShowUserModal(true); }} />;
      case "associations":
        return <AssociationManagement associations={associations} loading={loading} error={error} onRefresh={() => setActiveTab("associations")}
          onEdit={(a: Association) => { setEditingItem(a); setShowAssociationModal(true); }}
          onDelete={(id: number) => handleDelete(`${endpoints.associations.base}/${id}`, id, () => setActiveTab("associations"))}
          onToggleStatus={(a: Association) => handleStatusToggle(`${endpoints.associations.base}/${a.id}/status`, a.status || "active", () => setActiveTab("associations"))}
          onNew={() => { setEditingItem(null); setShowAssociationModal(true); }} />;
      case "fmxStaff":
        return <FmxStaffManagement staff={fmxStaff} loading={loading} error={error} onRefresh={() => setActiveTab("fmxStaff")} onNew={() => setShowStaffModal(true)} />;
      case "members":
        return <AssociationMembersManagement associationId={selectedAssociationId} members={members} associations={associations} loading={loading} error={error}
          onAssociationChange={(id: number) => setSelectedAssociationId(id)} onRefresh={() => selectedAssociationId && setActiveTab("members")} onNew={() => setShowMemberModal(true)} />;
      case "players":
        return <PlayersManagement associationId={selectedAssociationId} players={players} associations={associations} loading={loading} error={error}
          onAssociationChange={(id: number) => setSelectedAssociationId(id)} onRefresh={() => selectedAssociationId && setActiveTab("players")}
          onNew={() => setShowPlayerModal(true)} onToggleActive={(playerId: number, currentActive: boolean) => handlePlayerActiveToggle(playerId, currentActive, () => setActiveTab("players"))} />;
      case "fmxSettings":
        return <FmxSettings onRefresh={() => setActiveTab("fmxSettings")} addToast={addToast} />;
      default: return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <div className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`} onClick={closeSidebar} />
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brandWrapper}><div className={styles.logoIcon}><span className="material-symbols-outlined">shield_person</span></div><div><h1>FMX Direction</h1><p>Admin Panel</p></div></div>
          </div>
          <nav className={styles.nav}>
            {["dashboard", "users", "associations", "fmxStaff", "members", "players", "fmxSettings"].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab as TabType); closeSidebar(); }} className={`${styles.navLink} ${activeTab === tab ? styles.active : ""}`}>
                <span className="material-symbols-outlined">
                  {tab === "dashboard" ? "dashboard" : tab === "users" ? "group" : tab === "associations" ? "business" : tab === "fmxStaff" ? "badge" : tab === "members" ? "diversity_3" : tab === "players" ? "sports_motorsports" : "settings"}
                </span>
                <span>
                  {tab === "dashboard" ? "Dashboard" : tab === "users" ? "Utilizadores" : tab === "associations" ? "Associações" : tab === "fmxStaff" ? "Staff FMX" : tab === "members" ? "Membros" : tab === "players" ? "Jogadores" : "Config. FMX"}
                </span>
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <button className={styles.reportButton} onClick={() => addToast("info", "Funcionalidade em breve")}>Relatórios</button>
            <div className={styles.footerLinks}><button className={styles.footerLink} onClick={handleLogout}><span className="material-symbols-outlined">logout</span> Sair</button></div>
          </div>
        </aside>
        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}><button className={styles.menuButton} onClick={toggleSidebar}><span className="material-symbols-outlined">menu</span></button><span className={styles.systemName}>SIFCQA-FMX</span></div>
            <div className={styles.topbarRight}>
              <button className={styles.themeToggle} onClick={() => setTheme(t => t === "light" ? "dark" : t === "dark" ? null : "light")}>
                <span className="material-symbols-outlined">{theme === "light" ? "light_mode" : theme === "dark" ? "dark_mode" : "routine"}</span>
              </button>
              <div className={styles.avatar}><img src="https://via.placeholder.com/40" alt="Admin" /></div>
            </div>
          </header>
          <div className={styles.content}>{renderContent()}</div>
          <footer className={styles.footer}><p>© {new Date().getFullYear()} FMX - SIFCQA</p></footer>
        </main>
      </div>
      {/* Modais */}
      <UserModal isOpen={showUserModal} user={editingItem} onClose={() => setShowUserModal(false)} onSuccess={() => { setShowUserModal(false); setActiveTab("users"); addToast("success", "Utilizador guardado!"); }} />
      <AssociationModal isOpen={showAssociationModal} association={editingItem} onClose={() => setShowAssociationModal(false)} onSuccess={() => { setShowAssociationModal(false); setActiveTab("associations"); addToast("success", "Associação guardada!"); }} />
      <StaffModal isOpen={showStaffModal} onClose={() => setShowStaffModal(false)} onSuccess={() => { setShowStaffModal(false); setActiveTab("fmxStaff"); addToast("success", "Staff adicionado!"); }} />
      <MemberModal isOpen={showMemberModal} associationId={selectedAssociationId} onClose={() => setShowMemberModal(false)} onSuccess={() => { setShowMemberModal(false); setActiveTab("members"); addToast("success", "Membro adicionado!"); }} />
      <PlayerModal isOpen={showPlayerModal} associationId={selectedAssociationId} onClose={() => setShowPlayerModal(false)} onSuccess={() => { setShowPlayerModal(false); setActiveTab("players"); addToast("success", "Jogador adicionado!"); }} />
      <ToastContainer toasts={toasts} onClose={(id: string) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
};

// ================= DASHBOARD CONTENT (MÉTRICAS E LOGS) =================
const DashboardContent: React.FC = () => {
  // Dados mockados (podes substituir por chamadas HTTP reais quando os endpoints existirem)
  const [metrics, setMetrics] = useState({
    serverLoad: 14.2,
    responseTime: 124,
    activeUsers: 1842,
    securityScore: 96,
  });
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, timestamp: "2023-10-24 14:22:01", user: "admin.silva", action: "Acesso ao Módulo Financeiro", status: "success" as const },
    { id: 2, timestamp: "2023-10-24 14:15:45", user: "gestor.marquez", action: "Alteração de Permissões #U902", status: "success" as const },
    { id: 3, timestamp: "2023-10-24 14:02:11", user: "guest_4522", action: "Falha de Autenticação (IP 192.168.1.1)", status: "blocked" as const },
    { id: 4, timestamp: "2023-10-24 13:55:30", user: "admin.silva", action: "Cópia de Segurança de Base de Dados", status: "success" as const },
  ]);

  // (Opcional) Carregar métricas reais do backend – descomenta quando tiveres os endpoints
  // useEffect(() => {
  //   const fetchMetrics = async () => {
  //     try {
  //       const res = await http.get(endpoints.reports.dashboard);
  //       setMetrics(prev => ({ ...prev, ...res.data }));
  //     } catch (err) { console.error(err); }
  //   };
  //   fetchMetrics();
  // }, []);

  const handleExportLogs = () => {
    console.log("Exportar logs CSV");
    // implementar exportação
  };

  return (
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
            <button className={styles.exportButton} onClick={handleExportLogs}>Exportar Logs CSV</button>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead><tr><th>Timestamp</th><th>Utilizador</th><th>Acção</th><th>Status</th></tr></thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td>{log.timestamp}</td><td>{log.user}</td><td>{log.action}</td>
                    <td><span className={log.status === "success" ? styles.statusSuccess : styles.statusError}>
                      <span className={styles.statusDot}></span>{log.status === "success" ? "Sucesso" : log.status === "blocked" ? "Bloqueado" : "Falha"}
                    </span></td>
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
  );
};

// ================= SUBCOMPONENTES DE GESTÃO =================
interface UserManagementProps {
  users: User[]; loading: boolean; error: string | null; onRefresh: () => void; onEdit: (user: User) => void;
  onDelete: (id: number) => void; onToggleStatus: (user: User) => void; onNew: () => void;
}
const UserManagement: React.FC<UserManagementProps> = ({ users, loading, error, onRefresh, onEdit, onDelete, onToggleStatus, onNew }) => (
  <div className={styles.pageContainer}>
    <div className={styles.pageHeader}><h2>Utilizadores</h2><div><button className={styles.addButton} onClick={onRefresh}>Refresh</button><button className={styles.addButton} onClick={onNew}>Novo Utilizador</button></div></div>
    {loading && <div>Loading...</div>}{error && <div className={styles.error}>{error}</div>}
    {!loading && !error && (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Perfil</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.roles?.join(", ")}</td>
                <td>
                  <span className={u.status === "active" ? styles.statusActive : styles.statusInactive}>
                    {u.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <button className={styles.actionBtn} onClick={() => onEdit(u)}>Editar</button>
                  <button className={styles.actionBtn} onClick={() => onToggleStatus(u)}>
                    {u.status === "active" ? "Desativar" : "Ativar"}
                  </button>
                  <button className={styles.actionBtn} onClick={() => onDelete(u.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

interface AssociationManagementProps {
  associations: Association[]; loading: boolean; error: string | null; onRefresh: () => void; onEdit: (assoc: Association) => void;
  onDelete: (id: number) => void; onToggleStatus: (assoc: Association) => void; onNew: () => void;
}
const AssociationManagement: React.FC<AssociationManagementProps> = ({ associations, loading, error, onRefresh, onEdit, onDelete, onToggleStatus, onNew }) => (
  <div className={styles.pageContainer}>
    <div className={styles.pageHeader}><h2>Associações</h2><div><button className={styles.addButton} onClick={onRefresh}>Refresh</button><button className={styles.addButton} onClick={onNew}>Nova Associação</button></div></div>
    {loading && <div>Loading...</div>}{error && <div className={styles.error}>{error}</div>}
    {!loading && !error && <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Estado</th><th>Ações</th></tr></thead><tbody>
      {associations.map(a => <tr key={a.id}><td>{a.name}</td><td>{a.contact_email}</td><td>{a.phone}</td><td><span className={a.status === "active" ? styles.statusActive : styles.statusInactive}>{a.status === "active" ? "Ativa" : "Inativa"}</span></td>
      <td><button className={styles.actionBtn} onClick={() => onEdit(a)}>Editar</button><button className={styles.actionBtn} onClick={() => onToggleStatus(a)}>{a.status === "active" ? "Desativar" : "Ativar"}</button><button className={styles.actionBtn} onClick={() => onDelete(a.id)}>Eliminar</button></td></tr>)}
    </tbody></table></div>}
  </div>
);

interface FmxStaffManagementProps { staff: FmxStaff[]; loading: boolean; error: string | null; onRefresh: () => void; onNew: () => void; }
const FmxStaffManagement: React.FC<FmxStaffManagementProps> = ({ staff, loading, error, onRefresh, onNew }) => (
  <div className={styles.pageContainer}>
    <div className={styles.pageHeader}><h2>Staff FMX</h2><div><button className={styles.addButton} onClick={onRefresh}>Refresh</button><button className={styles.addButton} onClick={onNew}>Adicionar Staff</button></div></div>
    {loading && <div>Loading...</div>}{error && <div className={styles.error}>{error}</div>}
    {!loading && !error && <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Nome</th><th>Email</th><th>Cargo</th><th>Ativo</th></tr></thead><tbody>
      {staff.map(s => <tr key={s.id}><td>{s.user?.name}</td><td>{s.user?.email}</td><td>{s.position}</td><td>{s.active ? "Sim" : "Não"}</td></tr>)}
    </tbody></table></div>}
  </div>
);

interface AssociationMembersManagementProps {
  associationId: number | null; members: AssociationMember[]; associations: Association[]; loading: boolean; error: string | null;
  onAssociationChange: (id: number) => void; onRefresh: () => void; onNew: () => void;
}
const AssociationMembersManagement: React.FC<AssociationMembersManagementProps> = ({ associationId, members, associations, loading, error, onAssociationChange, onRefresh, onNew }) => (
  <div className={styles.pageContainer}>
    <div className={styles.pageHeader}><h2>Membros</h2></div>
    <div className={styles.filters}>
      <select value={associationId || ""} onChange={e => onAssociationChange(Number(e.target.value))}>
        <option value="">Selecione associação</option>{associations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <button className={styles.addButton} onClick={onRefresh}>Refresh</button><button className={styles.addButton} onClick={onNew} disabled={!associationId}>Adicionar Membro</button>
    </div>
    {loading && <div>Loading...</div>}{error && <div className={styles.error}>{error}</div>}
    {!loading && !error && associationId && <div className={styles.tableWrapper}><table className={styles.table}><thead><tr><th>Nome</th><th>Email</th><th>Cargo</th></tr></thead><tbody>
      {members.map(m => <tr key={m.id}><td>{m.user?.name}</td><td>{m.user?.email}</td><td>{m.position}</td></tr>)}
    </tbody></table></div>}
  </div>
);

interface PlayersManagementProps {
  associationId: number | null; players: Player[]; associations: Association[]; loading: boolean; error: string | null;
  onAssociationChange: (id: number) => void; onRefresh: () => void; onNew: () => void; onToggleActive: (playerId: number, currentActive: boolean) => void;
}
const PlayersManagement: React.FC<PlayersManagementProps> = ({ associationId, players, associations, loading, error, onAssociationChange, onRefresh, onNew, onToggleActive }) => (
  <div className={styles.pageContainer}>
    <div className={styles.pageHeader}><h2>Jogadores</h2></div>
    <div className={styles.filters}>
      <select value={associationId || ""} onChange={e => onAssociationChange(Number(e.target.value))}>
        <option value="">Selecione associação</option>{associations.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>
      <button className={styles.addButton} onClick={onRefresh}>Refresh</button><button className={styles.addButton} onClick={onNew} disabled={!associationId}>Adicionar Jogador</button>
    </div>
    {loading && <div>Loading...</div>}{error && <div className={styles.error}>{error}</div>}
    {!loading && !error && associationId && (
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead><tr><th>Nome</th><th>Email</th><th>Ativo</th><th>Ações</th></tr></thead>
          <tbody>
            {players.map(p => (
              <tr key={p.id}>
                <td>{p.user?.name}</td>
                <td>{p.user?.email}</td>
                <td>{p.active ? "Sim" : "Não"}</td>
                <td><button className={styles.actionBtn} onClick={() => onToggleActive(p.id, p.active)}>{p.active ? "Desativar" : "Ativar"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

interface FmxSettingsProps { onRefresh: () => void; addToast: (type: ToastMessage["type"], msg: string) => void; }
const FmxSettings: React.FC<FmxSettingsProps> = ({ onRefresh, addToast }) => {
  const [fmx, setFmx] = useState<any>(null);
  const [form, setForm] = useState({ name: "", contact_email: "", phone: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchFmx = async () => {
      try {
        const res = await http.get("/admin/fmx");
        setFmx(res.data);
        setForm({ name: res.data.name, contact_email: res.data.contact_email, phone: res.data.phone || "", address: res.data.address || "" });
      } catch { addToast("error", "Erro ao carregar FMX"); } finally { setLoading(false); }
    };
    fetchFmx();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await http.put("/admin/fmx", form); addToast("success", "Dados actualizados!"); onRefresh(); }
    catch (err: any) { addToast("error", err.response?.data?.message || "Erro"); } finally { setSaving(false); }
  };
  if (loading) return <div>Carregando...</div>;
  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}><h2>Configurações da FMX</h2></div>
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}><label>Nome</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
        <div className={styles.formGroup}><label>Email de contacto</label><input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} required /></div>
        <div className={styles.formGroup}><label>Telefone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
        <div className={styles.formGroup}><label>Morada</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
        <div className={styles.modalActions}><button type="submit" className={styles.submitButton} disabled={saving}>{saving ? "A guardar..." : "Guardar alterações"}</button></div>
      </form>
    </div>
  );
};

// ================= MODAIS (COM TIPOS EXPLÍCITOS) =================
interface UserModalProps { isOpen: boolean; user?: User | null; onClose: () => void; onSuccess: () => void; }
const UserModal: React.FC<UserModalProps> = ({ isOpen, user, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: "", email: "", role: "player", password: "" });
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (user) setForm({ name: user.name, email: user.email, role: user.roles?.[0] || "player", password: "" }); else setForm({ name: "", email: "", role: "player", password: "" }); }, [user]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      if (user) await http.put(`${endpoints.users.base}/${user.id}`, form);
      else await http.post(endpoints.users.base, form);
      onSuccess();
    } catch (err: any) { alert(err.response?.data?.message || "Erro ao salvar"); } finally { setLoading(false); }
  };
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}><div className={styles.modal} onClick={e => e.stopPropagation()}>
      <div className={styles.modalHeader}><h3>{user ? "Editar Utilizador" : "Novo Utilizador"}</h3><button onClick={onClose}>X</button></div>
      <form onSubmit={handleSubmit}><div className={styles.modalBody}>
        <div className={styles.formGroup}><label>Nome</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
        <div className={styles.formGroup}><label>Email</label><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
        <div className={styles.formGroup}><label>Função</label><select value={form.role} onChange={e => setForm({...form, role: e.target.value})}><option value="admin">Admin</option><option value="fmx">FMX</option><option value="association">Associação</option><option value="player">Jogador</option></select></div>
        {!user && <div className={styles.formGroup}><label>Password (deixar vazio para convite)</label><input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>}
      </div><div className={styles.modalActions}><button type="button" onClick={onClose}>Cancelar</button><button type="submit" disabled={loading}>{loading ? "A guardar..." : "Guardar"}</button></div></form>
    </div></div>
  );
};

interface AssociationModalProps { isOpen: boolean; association?: Association | null; onClose: () => void; onSuccess: () => void; }
const AssociationModal: React.FC<AssociationModalProps> = ({ isOpen, association, onClose, onSuccess }) => {
  const [form, setForm] = useState({ name: "", contact_email: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  useEffect(() => { if (association) setForm({ name: association.name, contact_email: association.contact_email || "", phone: association.phone || "", address: association.address || "" }); else setForm({ name: "", contact_email: "", phone: "", address: "" }); }, [association]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      if (association) await http.put(endpoints.associations.update(association.id), form);
      else await http.post(endpoints.associations.base, form);
      onSuccess();
    } catch (err: any) { alert(err.response?.data?.message || "Erro ao salvar"); } finally { setLoading(false); }
  };
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}><div className={styles.modal} onClick={e => e.stopPropagation()}>
      <div className={styles.modalHeader}><h3>{association ? "Editar Associação" : "Nova Associação"}</h3><button onClick={onClose}>X</button></div>
      <form onSubmit={handleSubmit}><div className={styles.modalBody}>
        <div className={styles.formGroup}><label>Nome</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
        <div className={styles.formGroup}><label>Email de contacto</label><input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} /></div>
        <div className={styles.formGroup}><label>Telefone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
        <div className={styles.formGroup}><label>Morada</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
      </div><div className={styles.modalActions}><button type="button" onClick={onClose}>Cancelar</button><button type="submit" disabled={loading}>{loading ? "A guardar..." : "Guardar"}</button></div></form>
    </div></div>
  );
};

interface StaffModalProps { isOpen: boolean; onClose: () => void; onSuccess: () => void; }
const StaffModal: React.FC<StaffModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({ user_id: "", fmx_id: "1", position: "", active: true });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await http.post("/admin/fmx/staff", form); onSuccess(); } catch (err: any) { alert(err.response?.data?.message || "Erro ao adicionar staff"); } finally { setLoading(false); }
  };
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}><div className={styles.modal} onClick={e => e.stopPropagation()}>
      <div className={styles.modalHeader}><h3>Adicionar Staff FMX</h3><button onClick={onClose}>X</button></div>
      <form onSubmit={handleSubmit}><div className={styles.modalBody}>
        <div className={styles.formGroup}><label>ID do Utilizador</label><input type="number" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} required /></div>
        <div className={styles.formGroup}><label>ID da FMX</label><input type="number" value={form.fmx_id} onChange={e => setForm({...form, fmx_id: e.target.value})} required /></div>
        <div className={styles.formGroup}><label>Cargo</label><input value={form.position} onChange={e => setForm({...form, position: e.target.value})} required /></div>
        <div className={styles.formGroup}><label><input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} /> Ativo</label></div>
      </div><div className={styles.modalActions}><button type="button" onClick={onClose}>Cancelar</button><button type="submit" disabled={loading}>{loading ? "A adicionar..." : "Adicionar"}</button></div></form>
    </div></div>
  );
};

interface MemberModalProps { isOpen: boolean; associationId: number | null; onClose: () => void; onSuccess: () => void; }
const MemberModal: React.FC<MemberModalProps> = ({ isOpen, associationId, onClose, onSuccess }) => {
  const [form, setForm] = useState({ user_id: "", position: "" });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await http.post(endpoints.associations.storeMember(associationId!), form); onSuccess(); } catch (err: any) { alert(err.response?.data?.message || "Erro ao adicionar membro"); } finally { setLoading(false); }
  };
  if (!isOpen || !associationId) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}><div className={styles.modal} onClick={e => e.stopPropagation()}>
      <div className={styles.modalHeader}><h3>Adicionar Membro</h3><button onClick={onClose}>X</button></div>
      <form onSubmit={handleSubmit}><div className={styles.modalBody}>
        <div className={styles.formGroup}><label>ID do Utilizador</label><input type="number" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} required /></div>
        <div className={styles.formGroup}><label>Cargo (president, secretary, member)</label><input value={form.position} onChange={e => setForm({...form, position: e.target.value})} required /></div>
      </div><div className={styles.modalActions}><button type="button" onClick={onClose}>Cancelar</button><button type="submit" disabled={loading}>{loading ? "A adicionar..." : "Adicionar"}</button></div></form>
    </div></div>
  );
};

interface PlayerModalProps { isOpen: boolean; associationId: number | null; onClose: () => void; onSuccess: () => void; }
const PlayerModal: React.FC<PlayerModalProps> = ({ isOpen, associationId, onClose, onSuccess }) => {
  const [form, setForm] = useState({ user_id: "", active: true });
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try { await http.post(endpoints.associations.associationPlayers(associationId!), form); onSuccess(); } catch (err: any) { alert(err.response?.data?.message || "Erro ao adicionar jogador"); } finally { setLoading(false); }
  };
  if (!isOpen || !associationId) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}><div className={styles.modal} onClick={e => e.stopPropagation()}>
      <div className={styles.modalHeader}><h3>Adicionar Jogador</h3><button onClick={onClose}>X</button></div>
      <form onSubmit={handleSubmit}><div className={styles.modalBody}>
        <div className={styles.formGroup}><label>ID do Utilizador</label><input type="number" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})} required /></div>
        <div className={styles.formGroup}><label><input type="checkbox" checked={form.active} onChange={e => setForm({...form, active: e.target.checked})} /> Ativo</label></div>
      </div><div className={styles.modalActions}><button type="button" onClick={onClose}>Cancelar</button><button type="submit" disabled={loading}>{loading ? "A adicionar..." : "Adicionar"}</button></div></form>
    </div></div>
  );
};

interface ToastContainerProps { toasts: ToastMessage[]; onClose: (id: string) => void; }
const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose }) => (
  <div className={styles.toastContainer}>
    {toasts.map(t => <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}><span>{t.type === "success" ? "✓" : t.type === "error" ? "⚠️" : "ℹ️"}</span><p>{t.message}</p><button onClick={() => onClose(t.id)}>×</button></div>)}
  </div>
);

export default AdminDashboard;