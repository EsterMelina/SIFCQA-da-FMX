// AssociationDashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import { useAuth } from "@/app/providers/AuthProvider";
import styles from "./AssociationDashboard.module.css";

/* ==================== TIPOS ==================== */
type TabType = "dashboard" | "secretaries" | "players" | "quotas" | "transfers" | "reports";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  type?: string | null;
  roles?: string[];
  association_id?: number | null;
  association_member?: {
    id: number;
    position: string;
    active: boolean;
    association_id?: number;
  } | null;
}

interface AssociationMember {
  id: number;
  user_id: number;
  position: string;
  active: boolean;
  association_id: number;
  user?: { name: string; email: string };
}

interface Player {
  id: number;
  user_id: number;
  association_id?: number;
  position?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  user?: { id?: number; name: string; email: string };
  association?: { id: number; name: string };
  age?: number;
  rating?: number;
  province?: string;
  monthly_fee?: number;
  team?: string;
}

interface Quota {
  id: number;
  player_id: number;
  title?: string;
  total_amount: number;
  amount?: number;
  status: "pending" | "paid" | "rejected" | "expired";
  due_date?: string;
  player?: { name: string };
  year?: number;
  installment?: number;
  total_installments?: number;
  installments?: {
    total: number;
    amount_each: number;
  };
}

interface PendingPayment {
  id: number;
  quota_id: number;
  player_name: string;
  quota_title?: string;
  installment_number: number;
  amount: number;
  method: string;
  reference?: string;
  status: string;
}

interface Transfer {
  id: number;
  player_id: number;
  from_association_id: number;
  to_association_id: number;
  status: string;
  reason?: string;
  origin_document?: string;
  dest_document?: string;
  rejection_reason?: string;
  created_at: string;
  player?: { user?: { name: string }; name?: string };
  from_association?: { id: number; name: string } | null;
  to_association?: { id: number; name: string } | null;
  is_origin?: boolean;
  is_destination?: boolean;
  actions?: string[];
}

interface DashboardStats {
  totalPlayers: number;
  activePlayers: number;
  pendingQuotas: number;
  pendingTransfers: number;
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface UserOption {
  id: number;
  name: string;
  email: string;
}

interface UserProfile {
  user: {
    id: number;
    name: string;
    email: string;
    status: boolean;
    avatar: string;
  };
  association_member: {
    id: number;
    position: string;
    active: boolean;
  } | null;
  association: {
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    status: boolean;
  } | null;
  roles: string[];
}

/* ==================== HELPERS ==================== */
const getUserRole = (user: AuthUser | null): "president" | "secretary" => {
  if (!user) return "secretary";
  const pos = user?.association_member?.position?.toLowerCase();
  if (pos === "presidente" || pos === "president") return "president";
  if (pos === "secretário" || pos === "secretary") return "secretary";
  if (user.roles?.includes("association_president") || user.roles?.includes("president")) return "president";
  return "secretary";
};

const normalizeStatus = (status: string, isOrigin?: boolean, isDestination?: boolean): string => {
  const valid = [
    "pending_origin", "pending_destination", "completed",
    "rejected_origin", "rejected_destination", "cancelled",
  ];
  if (valid.includes(status)) return status;
  if (status === "approved") return "completed";
  if (status === "rejected") return isOrigin ? "rejected_origin" : isDestination ? "rejected_destination" : "rejected_origin";
  return status;
};

/* ==================== COMPONENTE PRINCIPAL ==================== */
const AssociationDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const authUser = user as AuthUser | null;
  const role = getUserRole(authUser);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [associationId, setAssociationId] = useState<number | null>(null);
  const [isProfileLoaded, setIsProfileLoaded] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("theme") === "dark" ? "dark" : "light"
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const [stats, setStats] = useState<DashboardStats>({
    totalPlayers: 0,
    activePlayers: 0,
    pendingQuotas: 0,
    pendingTransfers: 0,
  });

  const [showSecretaryModal, setShowSecretaryModal] = useState(false);
  const [editingSecretary, setEditingSecretary] = useState<AssociationMember | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [secretariesRefreshKey, setSecretariesRefreshKey] = useState(0);
  const [playersRefreshKey, setPlayersRefreshKey] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const addToast = useCallback((type: ToastMessage["type"], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Aguarda a definição do user (autenticação pronta)
  useEffect(() => {
    if (user !== undefined) {
      setIsAuthReady(true);
    }
  }, [user]);

  // Obtém o perfil da associação e extrai o ID real
  useEffect(() => {
    if (!isAuthReady) return;

    const fetchProfile = async () => {
      try {
        const res = await http.get("/associations/me");
        const profile: UserProfile = res.data;
        setUserProfile(profile);
        // Usa o ID da associação retornado pelo backend
        if (profile.association?.id) {
          setAssociationId(profile.association.id);
        } else {
          // fallback caso venha no authUser (pode acontecer)
          setAssociationId(authUser?.association_id ?? null);
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        // fallback
        setAssociationId(authUser?.association_id ?? null);
      } finally {
        setIsProfileLoaded(true);
      }
    };

    fetchProfile();
  }, [isAuthReady]); // Só tenta quando a auth estiver pronta

  useEffect(() => {
    if (activeTab !== "dashboard" || !associationId) return;
    const fetchStats = async () => {
      try {
        const [playersRes, quotasRes, transfersRes] = await Promise.all([
          http.get(endpoints.associations.associationPlayers(associationId)),
          http.get("/association/quotas"),
          http.get(`/associations/${associationId}/transfers`),
        ]);
        const players = playersRes.data.data || playersRes.data;
        const quotas = quotasRes.data.data || quotasRes.data;
        const transfersData = transfersRes.data;
        const allTransfers = [...(transfersData.outgoing || []), ...(transfersData.incoming || [])];
        setStats({
          totalPlayers: players.length,
          activePlayers: players.filter((p: Player) => p.active).length,
          pendingQuotas: quotas.filter((q: Quota) => q.status === "pending").length,
          pendingTransfers: allTransfers.filter((t: Transfer) => {
            const norm = normalizeStatus(t.status, t.is_origin, t.is_destination);
            return norm === "pending_origin" || norm === "pending_destination";
          }).length,
        });
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      }
    };
    fetchStats();
  }, [activeTab, associationId]);

  const menuItems: { key: TabType; label: string; icon: string; roles: string[] }[] = [
    { key: "dashboard", label: "Dashboard", icon: "dashboard", roles: ["president", "secretary"] },
    { key: "secretaries", label: "Secretários", icon: "group", roles: ["president"] },
    { key: "players", label: "Jogadores", icon: "sports_motorsports", roles: ["president", "secretary"] },
    { key: "quotas", label: "Quotizações", icon: "payments", roles: ["president", "secretary"] },
    { key: "transfers", label: "Transferências", icon: "swap_horiz", roles: ["president", "secretary"] },
    { key: "reports", label: "Relatórios", icon: "assessment", roles: ["president", "secretary"] },
  ];

  const visibleMenu = menuItems.filter(item => item.roles.includes(role));

  const renderContent = () => {
    // Só mostra conteúdo quando o perfil foi carregado e temos (ou não) um associationId
    if (!isProfileLoaded) {
      return <div className={styles.loading}>A carregar associação...</div>;
    }

    if (!associationId) {
      return (
        <div className={styles.pageContainer}>
          <div className={styles.emptyState} style={{ marginTop: "4rem" }}>
            <span className="material-symbols-outlined">lock</span>
            <h2>Acesso restrito</h2>
            <p>Não tem uma associação atribuída. Contacte o administrador.</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard": return <DashboardContent stats={stats} role={role} associationId={associationId} />;
      case "secretaries": return (
        <SecretariesSection
          key={secretariesRefreshKey}
          addToast={addToast}
          associationId={associationId}
          onEdit={(s) => { setEditingSecretary(s); setShowSecretaryModal(true); }}
          onCreate={() => { setEditingSecretary(null); setShowSecretaryModal(true); }}
        />
      );
      case "players": return (
        <PlayersSection
          key={playersRefreshKey}
          addToast={addToast}
          associationId={associationId}
          role={role}
          onEdit={(p) => { setEditingPlayer(p); setShowPlayerModal(true); }}
          onCreate={() => { setEditingPlayer(null); setShowPlayerModal(true); }}
        />
      );
      case "quotas": return <QuotasSection addToast={addToast} role={role} associationId={associationId} />;
      case "transfers": return <TransfersSection addToast={addToast} associationId={associationId} />;
      case "reports": return <ReportsSection role={role} />;
      default: return null;
    }
  };

  if (!isAuthReady) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>A carregar sessão...</div>
      </div>
    );
  }

  const avatarSrc = userProfile?.user?.name
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.user.name)}&background=1e3a5f&color=fff&size=256`
    : "https://via.placeholder.com/40";

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <div className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`} onClick={() => setIsSidebarOpen(false)} />
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <span className="material-symbols-outlined">chess</span>
              </div>
              <div>
                <h1>Associação</h1>
                <p>{role === "president" ? "Presidência" : "Secretaria"}</p>
              </div>
            </div>
          </div>
          <nav className={styles.nav}>
            {visibleMenu.map(item => (
              <button
                key={item.key}
                className={`${styles.navLink} ${activeTab === item.key ? styles.active : ""}`}
                onClick={() => { setActiveTab(item.key); setIsSidebarOpen(false); }}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className={styles.sidebarFooter}>
            <button className={styles.footerLink} onClick={logout}>
              <span className="material-symbols-outlined">logout</span> Sair
            </button>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.menuButton} onClick={() => setIsSidebarOpen(v => !v)}>
                <span className="material-symbols-outlined">menu</span>
              </button>
              <span className={styles.systemName}>SIFCQA - Associação</span>
            </div>
            <div className={styles.topbarRight}>
              <button className={styles.themeToggle} onClick={() => setTheme(t => t === "light" ? "dark" : "light")}>
                <span className="material-symbols-outlined">{theme === "light" ? "dark_mode" : "light_mode"}</span>
              </button>
              <div className={styles.avatarWrapper} ref={profileRef} onClick={() => setShowProfileDropdown(v => !v)}>
                <div className={styles.avatar}>
                  <img src={avatarSrc} alt="User" />
                </div>
                {showProfileDropdown && userProfile && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.profileHeader}>
                      <img src={avatarSrc} alt={userProfile.user.name} className={styles.profileAvatar} />
                      <div>
                        <strong>{userProfile.user.name}</strong>
                        <span>{userProfile.user.email}</span>
                      </div>
                    </div>
                    <div className={styles.profileDetails}>
                      {userProfile.association && (
                        <p><span className="material-symbols-outlined">location_city</span>{userProfile.association.name}</p>
                      )}
                      {userProfile.association_member && (
                        <p><span className="material-symbols-outlined">badge</span>{userProfile.association_member.position}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className={styles.content}>{renderContent()}</div>
          <footer className={styles.footer}>
            <p>© {new Date().getFullYear()} SIFCQA - Associação Desportiva</p>
          </footer>
        </main>
      </div>

      {showSecretaryModal && (
        <SecretaryModal
          isOpen={showSecretaryModal}
          secretary={editingSecretary}
          associationId={associationId!}
          onClose={() => setShowSecretaryModal(false)}
          onSuccess={() => {
            setShowSecretaryModal(false);
            addToast("success", "Secretário guardado!");
            setSecretariesRefreshKey(prev => prev + 1);
          }}
        />
      )}
      {showPlayerModal && (
        <PlayerModal
          isOpen={showPlayerModal}
          player={editingPlayer}
          associationId={associationId!}
          onClose={() => setShowPlayerModal(false)}
          onSuccess={() => {
            setShowPlayerModal(false);
            addToast("success", editingPlayer ? "Jogador atualizado!" : "Jogador registado!");
            setPlayersRefreshKey(prev => prev + 1);
          }}
        />
      )}
      <ToastContainer toasts={toasts} onClose={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
};

/* ==================== DASHBOARD CONTENT (MELHORADO) ==================== */
const DashboardContent: React.FC<{ stats: DashboardStats; role: string; associationId: number }> = ({ stats, role }) => {
  const activityData = [
    { label: "Seg", value: 2 },
    { label: "Ter", value: 5 },
    { label: "Qua", value: 3 },
    { label: "Qui", value: 7 },
    { label: "Sex", value: 4 },
    { label: "Sáb", value: 6 },
    { label: "Dom", value: 1 },
  ];
  const maxVal = Math.max(...activityData.map(d => d.value));

  return (
    <div className={styles.pageContainer}>
      <div className={styles.dashboardHero}>
        <div className={styles.heroText}>
          <p>Bem-vindo ao painel da</p>
          <h2>Associação Desportiva</h2>
          <span className={styles.roleBadge}>{role === "president" ? "Presidente" : "Secretário(a)"}</span>
        </div>
        <div className={styles.heroIcon}>
          <span className="material-symbols-outlined">stadium</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.cardPlayers}`}>
          <div className={styles.statIcon}><span className="material-symbols-outlined">groups</span></div>
          <div className={styles.statInfo}>
            <p>Jogadores Ativos</p>
            <strong>{stats.activePlayers}</strong>
            <small>de {stats.totalPlayers} registados</small>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.cardQuotas}`}>
          <div className={styles.statIcon}><span className="material-symbols-outlined">payments</span></div>
          <div className={styles.statInfo}>
            <p>Quotas Pendentes</p>
            <strong>{stats.pendingQuotas}</strong>
            <small>a aguardar pagamento</small>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.cardTransfers}`}>
          <div className={styles.statIcon}><span className="material-symbols-outlined">swap_horiz</span></div>
          <div className={styles.statInfo}>
            <p>Transferências Pendentes</p>
            <strong>{stats.pendingTransfers}</strong>
            <small>para aprovação</small>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.cardTotal}`}>
          <div className={styles.statIcon}><span className="material-symbols-outlined">people</span></div>
          <div className={styles.statInfo}>
            <p>Total Jogadores</p>
            <strong>{stats.totalPlayers}</strong>
            <small>na associação</small>
          </div>
        </div>
      </div>

      <div className={styles.dashboardGrid}>
        <div className={styles.chartCard}>
          <h4>Atividade Semanal</h4>
          <div className={styles.barChart}>
            {activityData.map(item => (
              <div key={item.label} className={styles.barColumn}>
                <div className={styles.barWrapper}>
                  <div
                    className={styles.bar}
                    style={{ height: `${(item.value / maxVal) * 100}%` }}
                  />
                </div>
                <span className={styles.barLabel}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <h4>Resumo Rápido</h4>
          <ul className={styles.summaryList}>
            <li>
              <span className="material-symbols-outlined">check_circle</span>
              <span>Jogadores ativos: {stats.activePlayers}</span>
            </li>
            <li>
              <span className="material-symbols-outlined">pending</span>
              <span>Quotas por cobrar: {stats.pendingQuotas}</span>
            </li>
            <li>
              <span className="material-symbols-outlined">sync</span>
              <span>Transferências em curso: {stats.pendingTransfers}</span>
            </li>
            <li>
              <span className="material-symbols-outlined">trending_up</span>
              <span>Total de membros: {stats.totalPlayers}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

/* ==================== SECRETÁRIOS ==================== */
const SecretariesSection: React.FC<{
  addToast: (type: ToastMessage["type"], msg: string) => void;
  associationId: number;
  onEdit: (s: AssociationMember) => void;
  onCreate: () => void;
}> = ({ addToast, associationId, onEdit, onCreate }) => {
  const [secretaries, setSecretaries] = useState<AssociationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSecretaries = async () => {
    try {
      const res = await http.get(endpoints.associations.members(associationId));
      setSecretaries((res.data.data || res.data).filter((m: AssociationMember) => m.position === "secretary"));
    } catch (err: any) {
      addToast("error", "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSecretaries(); }, [associationId]);

  const handleDelete = async (id: number) => {
    if (!confirm("Remover secretário?")) return;
    try {
      await http.delete(`${endpoints.associations.members(associationId)}/${id}`);
      addToast("success", "Removido");
      fetchSecretaries();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro");
    }
  };

  const filtered = secretaries.filter(s =>
    s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.user?.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Secretários da Associação</h2>
        <button className={styles.primaryButton} onClick={onCreate}>
          <span className="material-symbols-outlined">add</span> Novo Secretário
        </button>
      </div>
      <div className={styles.searchBar}>
        <span className="material-symbols-outlined">search</span>
        <input
          type="text"
          placeholder="Pesquisar secretário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <div className={styles.userCell}>
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(s.user?.name || "S")}&background=1e3a5f&color=fff&size=32`}
                      alt=""
                      className={styles.userAvatar}
                    />
                    {s.user?.name}
                  </div>
                </td>
                <td>{s.user?.email}</td>
                <td>
                  <span className={`${styles.statusBadge} ${s.active ? styles.active : styles.inactive}`}>
                    {s.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <button className={styles.actionBtn} onClick={() => onEdit(s)}>Editar</button>
                  <button className={styles.actionBtn} onClick={() => handleDelete(s.id)}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ==================== JOGADORES ==================== */
const PlayersSection: React.FC<{
  addToast: (type: ToastMessage["type"], msg: string) => void;
  associationId: number;
  role: string;
  onEdit: (p: Player) => void;
  onCreate: () => void;
}> = ({ addToast, associationId, onEdit, onCreate }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPlayers = async () => {
    try {
      const res = await http.get(endpoints.associations.associationPlayers(associationId));
      setPlayers(res.data.data || res.data);
    } catch (err: any) {
      addToast("error", "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlayers(); }, [associationId]);

  const handleToggleActive = async (player: Player) => {
    if (!confirm(`Deseja ${player.active ? "suspender" : "ativar"} este jogador?`)) return;
    try {
      await http.patch(endpoints.players.toggleStatus(player.id));
      addToast("success", `Jogador ${player.active ? "suspenso" : "ativado"}`);
      fetchPlayers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro");
    }
  };

  const handleDelete = async (playerId: number) => {
    if (!confirm("Eliminar jogador?")) return;
    try {
      await http.delete(endpoints.players.detail(playerId));
      addToast("success", "Jogador eliminado");
      fetchPlayers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro");
    }
  };

  const filtered = players.filter(p =>
    p.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    p.association?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Jogadores</h2>
        <button className={styles.primaryButton} onClick={onCreate}>
          <span className="material-symbols-outlined">add</span> Registar Jogador
        </button>
      </div>
      <div className={styles.searchBar}>
        <span className="material-symbols-outlined">search</span>
        <input
          type="text"
          placeholder="Pesquisar jogador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Associação</th>
              <th>Estado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <tr key={p.id}>
                <td>
                  <div className={styles.userCell}>
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.user?.name || "P")}&background=2e7d32&color=fff&size=32`}
                      alt=""
                      className={styles.userAvatar}
                    />
                    {p.user?.name}
                  </div>
                </td>
                <td>{p.user?.email || "—"}</td>
                <td>{p.association?.name || "—"}</td>
                <td>
                  <span className={`${styles.statusBadge} ${p.active ? styles.active : styles.inactive}`}>
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <button className={styles.actionBtn} onClick={() => onEdit(p)}>Editar</button>
                  <button className={styles.actionBtn} onClick={() => handleToggleActive(p)}>
                    {p.active ? "Suspender" : "Ativar"}
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleDelete(p.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ==================== QUOTAS + PAGAMENTOS (inalterada) ==================== */
const QuotasSection: React.FC<{
  addToast: (type: ToastMessage["type"], msg: string) => void;
  role: string;
  associationId: number;
}> = ({ addToast, associationId }) => {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [quotasRes, paymentsRes] = await Promise.all([
        http.get("/association/quotas"),
        http.get("/association/payments")
      ]);
      setQuotas(quotasRes.data.data || quotasRes.data);
      const payments = paymentsRes.data.data || paymentsRes.data;
      payments.sort((a: PendingPayment, b: PendingPayment) => b.id - a.id);
      setPendingPayments(payments);
    } catch (err: any) {
      addToast("error", "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleConfirm = async (paymentId: number) => {
    try {
      await http.post(`/association/payments/${paymentId}/confirm`);
      addToast("success", "Pagamento confirmado!");
      fetchData();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao confirmar");
    }
  };

  const handleReject = async (paymentId: number) => {
    const reason = prompt("Motivo da rejeição (opcional):");
    try {
      await http.post(`/association/payments/${paymentId}/reject`, { reason });
      addToast("success", "Pagamento rejeitado.");
      fetchData();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao rejeitar");
    }
  };

  const filteredQuotas = statusFilter === "all" ? quotas : quotas.filter(q => q.status === statusFilter);

  const statusClass = (status: string) => {
    switch (status) {
      case "paid": return styles.statusPaid;
      case "pending": return styles.statusPending;
      case "rejected": return styles.statusRejected;
      case "expired": return styles.statusExpired;
      default: return "";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "paid": return "Pago";
      case "pending": return "Pendente";
      case "rejected": return "Rejeitado";
      case "expired": return "Expirado";
      default: return status;
    }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Quotizações</h2>
        <div className={styles.headerActions}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className={styles.filterSelect}>
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="rejected">Rejeitado</option>
            <option value="expired">Expirado</option>
          </select>
          <button className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-outlined">add</span> Nova Quota
          </button>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Título</th>
              <th>Valor</th>
              <th>Prestações</th>
              <th>Estado</th>
              <th>Vencimento</th>
            </tr>
          </thead>
          <tbody>
            {filteredQuotas.map(q => (
              <tr key={q.id}>
                <td>{q.player?.name || `#${q.player_id}`}</td>
                <td>{q.title || "—"}</td>
                <td>{q.total_amount} MT</td>
                <td>{q.installments?.total ? `${q.installments.total}x de ${q.installments.amount_each} MT` : "—"}</td>
                <td><span className={`${styles.statusBadge} ${statusClass(q.status)}`}>{statusLabel(q.status)}</span></td>
                <td>{q.due_date || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pendingPayments.length > 0 && (
        <div className={styles.pendingPaymentsSection}>
          <h3>Pagamentos por confirmar</h3>
          <div className={styles.pendingPaymentsList}>
            {pendingPayments.map(payment => (
              <div key={payment.id} className={styles.paymentCard}>
                <div className={styles.paymentInfo}>
                  <strong>{payment.player_name}</strong>
                  <span>Quota: {payment.quota_title || `#${payment.quota_id}`}</span>
                  <span>Prestação {payment.installment_number} – {payment.amount} MT</span>
                  <span className={styles.paymentMethod}>{payment.method} {payment.reference ? `(ref: ${payment.reference})` : ""}</span>
                </div>
                <div className={styles.paymentActions}>
                  <button className={styles.approveButton} onClick={() => handleConfirm(payment.id)}>Confirmar</button>
                  <button className={styles.rejectButton} onClick={() => handleReject(payment.id)}>Rejeitar</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateQuotaModal
          associationId={associationId}
          addToast={addToast}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            addToast("success", "Quota criada!");
            fetchData();
          }}
        />
      )}
    </div>
  );
};

/* ==================== CREATE QUOTA MODAL ==================== */
const CreateQuotaModal: React.FC<{
  associationId: number;
  addToast: (type: ToastMessage["type"], msg: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ associationId, addToast, onClose, onSuccess }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [form, setForm] = useState({ player_id: "", title: "", total_amount: "", due_date: new Date().toISOString().split("T")[0] });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const res = await http.get(endpoints.associations.associationPlayers(associationId));
        setPlayers(res.data.data || res.data);
      } catch {
        addToast("error", "Erro ao carregar jogadores");
      } finally {
        setLoadingPlayers(false);
      }
    };
    fetchPlayers();
  }, [associationId, addToast]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.player_id) newErrors.player_id = "Seleccione um jogador.";
    if (!form.title.trim()) newErrors.title = "Título obrigatório.";
    if (!form.total_amount || isNaN(Number(form.total_amount)) || Number(form.total_amount) <= 0) {
      newErrors.total_amount = "Valor inválido.";
    }
    if (!form.due_date) newErrors.due_date = "Data obrigatória.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await http.post("/association/quotas", {
        player_id: Number(form.player_id),
        title: form.title.trim(),
        total_amount: Number(form.total_amount),
        due_date: form.due_date,
      });
      onSuccess();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao criar quota");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Nova Quota</h3>
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Jogador *</label>
              {loadingPlayers ? <p>Carregando...</p> : (
                <select value={form.player_id} onChange={e => setForm({...form, player_id: e.target.value})} required>
                  <option value="">Selecione...</option>
                  {players.map(p => <option key={p.id} value={p.id}>{p.user?.name || `#${p.id}`}</option>)}
                </select>
              )}
              {errors.player_id && <span className={styles.fieldError}>{errors.player_id}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Título *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
              {errors.title && <span className={styles.fieldError}>{errors.title}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Valor Total (MT) *</label>
              <input type="number" step="0.01" min="0.01" value={form.total_amount} onChange={e => setForm({...form, total_amount: e.target.value})} required />
              {errors.total_amount && <span className={styles.fieldError}>{errors.total_amount}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Data de Vencimento *</label>
              <input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} required />
              {errors.due_date && <span className={styles.fieldError}>{errors.due_date}</span>}
            </div>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
            <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Criando..." : "Criar Quota"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== TRANSFERÊNCIAS (inalterada) ==================== */
const TransfersSection: React.FC<{
  addToast: (type: "success" | "error" | "info", msg: string) => void;
  associationId: number;
}> = ({ addToast, associationId }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [showOriginApprove, setShowOriginApprove] = useState<Transfer | null>(null);
  const [showReject, setShowReject] = useState<{ transfer: Transfer; type: "origin" | "destination" } | null>(null);

  const fetchTransfers = async () => {
    try {
      const res = await http.get(`/associations/${associationId}/transfers`);
      const data = res.data;
      const outgoing = (data.outgoing || []).map((t: Transfer) => ({ ...t, is_origin: true }));
      const incoming = (data.incoming || []).map((t: Transfer) => ({ ...t, is_destination: true }));
      setTransfers([...outgoing, ...incoming]);
    } catch (err: any) {
      addToast("error", "Erro ao carregar transferências");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransfers(); }, [associationId]);

  const handleOriginApprove = async (transferId: number, file?: File) => {
    const formData = new FormData();
    if (file) formData.append("document", file);
    try {
      await http.post(`/transfers/${transferId}/origin/approve`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      addToast("success", "Saída aprovada!");
      setShowOriginApprove(null);
      fetchTransfers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao aprovar");
    }
  };

  const handleReject = async (transferId: number, type: "origin" | "destination", reason: string) => {
    try {
      if (type === "origin") await http.patch(`/transfers/${transferId}/origin/reject`, { reason });
      else await http.patch(`/transfers/${transferId}/destination/reject`, { reason });
      addToast("success", "Transferência rejeitada.");
      setShowReject(null);
      fetchTransfers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao rejeitar");
    }
  };

  const handleDestinationApprove = async (transferId: number) => {
    if (!confirm("Confirmar receção deste jogador?")) return;
    try {
      await http.patch(`/transfers/${transferId}/destination/approve`);
      addToast("success", "Entrada aprovada!");
      fetchTransfers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao aprovar");
    }
  };

  const pendingTransfers = transfers.filter(t => (t.actions || []).length > 0);
  const historyTransfers = transfers.filter(t => (t.actions || []).length === 0);

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <h2>Transferências</h2>
      <div className={styles.transferTabs}>
        <button className={`${styles.transferTab} ${tab === "pending" ? styles.activeTab : ""}`} onClick={() => setTab("pending")}>Por Aprovar</button>
        <button className={`${styles.transferTab} ${tab === "history" ? styles.activeTab : ""}`} onClick={() => setTab("history")}>Histórico</button>
      </div>

      {tab === "pending" && (
        pendingTransfers.length === 0 ? (
          <div className={styles.emptyState}>
            <span className="material-symbols-outlined">check_circle</span>
            <p>Nenhuma transferência pendente.</p>
          </div>
        ) : (
          <div className={styles.pendingActionsList}>
            {pendingTransfers.map(t => {
              const playerName = t.player?.user?.name || t.player?.name || `#${t.player_id}`;
              const actions = t.actions || [];
              return (
                <div key={t.id} className={styles.transferActionCard}>
                  <div className={styles.transferCardInfo}>
                    <strong>{playerName}</strong>
                    <div className={styles.direction}>
                      <span>{t.from_association?.name || "Origem"}</span>
                      <span className="material-symbols-outlined arrow">arrow_forward</span>
                      <span>{t.to_association?.name || "Destino"}</span>
                    </div>
                  </div>
                  <div className={styles.transferCardActions}>
                    {actions.includes("approve_origin") && <button className={styles.approveButton} onClick={() => setShowOriginApprove(t)}>Aprovar Saída</button>}
                    {actions.includes("reject_origin") && <button className={styles.rejectButton} onClick={() => setShowReject({ transfer: t, type: "origin" })}>Rejeitar Saída</button>}
                    {actions.includes("approve_destination") && <button className={styles.approveButton} onClick={() => handleDestinationApprove(t.id)}>Aprovar Entrada</button>}
                    {actions.includes("reject_destination") && <button className={styles.rejectButton} onClick={() => setShowReject({ transfer: t, type: "destination" })}>Rejeitar Entrada</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {tab === "history" && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr><th>Jogador</th><th>Origem</th><th>Destino</th><th>Estado</th><th>Data</th></tr>
            </thead>
            <tbody>
              {historyTransfers.map(t => {
                const normalized = normalizeStatus(t.status, t.is_origin, t.is_destination);
                return (
                  <tr key={t.id}>
                    <td>{t.player?.user?.name || t.player?.name || `#${t.player_id}`}</td>
                    <td>{t.from_association?.name || "—"}</td>
                    <td>{t.to_association?.name || "—"}</td>
                    <td><span className={`${styles.statusBadge} ${normalized.startsWith("completed") ? styles.statusPaid : normalized.startsWith("rejected") ? styles.statusRejected : styles.statusPending}`}>{normalized.replace(/_/g, " ")}</span></td>
                    <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showOriginApprove && <OriginApproveModal transfer={showOriginApprove} onClose={() => setShowOriginApprove(null)} onApprove={handleOriginApprove} />}
      {showReject && <RejectModal title={showReject.type === "origin" ? "Rejeitar Saída" : "Rejeitar Entrada"} onClose={() => setShowReject(null)} onSubmit={reason => handleReject(showReject.transfer.id, showReject.type, reason)} />}
    </div>
  );
};

/* ==================== RELATÓRIOS ==================== */
const ReportsSection: React.FC<{ role: string }> = () => (
  <div className={styles.pageContainer}>
    <h2>Relatórios</h2>
    <div className={styles.placeholder}>
      <span className="material-symbols-outlined">construction</span>
      <p>Em desenvolvimento</p>
    </div>
  </div>
);

/* ==================== MODAIS ==================== */
interface SecretaryModalProps {
  isOpen: boolean;
  secretary: AssociationMember | null;
  associationId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const SecretaryModal: React.FC<SecretaryModalProps> = ({ isOpen, secretary, associationId, onClose, onSuccess }) => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data } = await http.get(`/users?not_in_association=${associationId}`);
        setUsers(data.data || data);
      } catch (err) { console.error(err); }
      finally { setLoadingUsers(false); }
    };
    fetchUsers();
  }, [isOpen, associationId]);

  useEffect(() => {
    setSelectedUserId(secretary ? String(secretary.user_id) : "");
  }, [secretary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setLoading(true);
    try {
      if (secretary) {
        await http.put(`${endpoints.associations.members(associationId)}/${secretary.id}`, {
          user_id: Number(selectedUserId),
          position: "secretary",
        });
      } else {
        await http.post(endpoints.associations.storeMember(associationId), {
          user_id: Number(selectedUserId),
          position: "secretary",
        });
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro");
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{secretary ? "Editar Secretário" : "Novo Secretário"}</h3>
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Utilizador</label>
              {loadingUsers ? <p>Carregando...</p> : (
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)} required>
                  <option value="">Selecione...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
              )}
            </div>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
            <button type="submit" className={styles.submitButton} disabled={loading || !selectedUserId}>
              {loading ? "Salvando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PlayerModalProps {
  isOpen: boolean;
  player: Player | null;
  associationId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PlayerModal: React.FC<PlayerModalProps> = ({ isOpen, player, associationId, onClose, onSuccess }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [age, setAge] = useState("");
  const [rating, setRating] = useState("");
  const [province, setProvince] = useState("");
  const [loading, setLoading] = useState(false);
  const isEditing = !!player;

  useEffect(() => {
    if (player) {
      setName(player.user?.name || "");
      setEmail(player.user?.email || "");
      setActive(player.active);
      setAge(player.age?.toString() || "");
      setRating(player.rating?.toString() || "");
      setProvince(player.province || "");
    } else {
      setName(""); setEmail(""); setActive(true); setAge(""); setRating(""); setProvince("");
    }
  }, [player]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEditing) {
        await http.put(endpoints.players.detail(player.id), {
          age: age ? Number(age) : undefined,
          rating: rating ? Number(rating) : undefined,
          province,
          active,
        });
      } else {
        await http.post(endpoints.associations.associationPlayers(associationId), {
          name,
          email,
          status: active,
        });
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao guardar jogador");
    } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEditing ? "Editar Jogador" : "Registar Jogador"}</h3>
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {isEditing ? (
              <>
                <div className={styles.formGroup}><label>Nome</label><input value={name} disabled className={styles.readonly} /></div>
                <div className={styles.formGroup}><label>Idade</label><input type="number" value={age} onChange={e => setAge(e.target.value)} /></div>
                <div className={styles.formGroup}><label>Rating</label><input type="number" step="0.1" value={rating} onChange={e => setRating(e.target.value)} /></div>
                <div className={styles.formGroup}><label>Província</label><input value={province} onChange={e => setProvince(e.target.value)} /></div>
              </>
            ) : (
              <>
                <div className={styles.formGroup}><label>Nome *</label><input value={name} onChange={e => setName(e.target.value)} required /></div>
                <div className={styles.formGroup}><label>Email *</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              </>
            )}
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Ativo
              </label>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
            <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Salvando..." : "Guardar"}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const OriginApproveModal: React.FC<{ transfer: Transfer; onClose: () => void; onApprove: (transferId: number, file?: File) => void }> = ({ transfer, onClose, onApprove }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); await onApprove(transfer.id, file || undefined); setLoading(false);
  };
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}><h3>Aprovar Saída</h3><button onClick={onClose} className={styles.modalClose}>×</button></div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}><label>Documento (opcional)</label><input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
            <div className={styles.modalActions}>
              <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
              <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Enviando..." : "Aprovar"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const RejectModal: React.FC<{ title: string; onClose: () => void; onSubmit: (reason: string) => void }> = ({ title, onClose, onSubmit }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) { alert("Motivo deve ter pelo menos 5 caracteres."); return; }
    setLoading(true); onSubmit(reason); setLoading(false);
  };
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}><h3>{title}</h3><button onClick={onClose} className={styles.modalClose}>×</button></div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}><label>Motivo</label><textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} required /></div>
            <div className={styles.modalActions}>
              <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
              <button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Enviando..." : "Confirmar"}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: ToastMessage[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => (
  <div className={styles.toastContainer}>
    {toasts.map(t => (
      <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
        <span>{t.type === "success" ? "✓" : t.type === "error" ? "⚠️" : "ℹ️"}</span>
        <p>{t.message}</p>
        <button onClick={() => onClose(t.id)}>×</button>
      </div>
    ))}
  </div>
);

export default AssociationDashboard;