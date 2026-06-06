// AssociationDashboard.tsx (versão final com ECharts)
import React, { useState, useEffect, useCallback, useRef } from "react";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import { useAuth } from "@/app/providers/AuthProvider";
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import styles from "./AssociationDashboard.module.css";

/* ==================== TIPOS ==================== */
type TabType =
  | "dashboard"
  | "secretaries"
  | "players"
  | "quotas"
  | "transfers"
  | "reports";

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
  "fide-id"?: string;
  rating?: number;
  user?: {
    id?: number;
    name: string;
    email: string;
    genero?: string;
    dataNascimento?: string;
  };
  association?: { id: number; name: string };
  age?: number;
  province?: string;
  monthly_fee?: number;
  team?: string;
}

interface Quota {
  id: number;
  player_id: number;
  title?: string;
  total_amount: number;
  paid_amount?: number;
  remaining?: number;
  status: "pending" | "paid" | "rejected" | "expired";
  due_date?: string;
  player?: { id: number; name: string };
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
  created_at?: string;
}

interface TransferDoc {
  id: number;
  type: "origin_approval" | "destination_approval";
  url: string;
  original_name: string | null;
  mime_type: string;
  uploaded_at: string;
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
  documents?: TransferDoc[];
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

interface QuotaConfig {
  annual_amount: number;
  installments: number;
  title_template: string;
  auto_generate: boolean;
  issue_month: number;
  issue_day: number;
  due_month: number;
  due_day: number;
}

/* ==================== HELPERS ==================== */
const getUserRole = (user: AuthUser | null): "president" | "secretary" => {
  if (!user) return "secretary";
  const pos = user?.association_member?.position?.toLowerCase();
  if (pos === "presidente" || pos === "president") return "president";
  if (pos === "secretário" || pos === "secretary") return "secretary";
  if (
    user.roles?.includes("association_president") ||
    user.roles?.includes("president")
  )
    return "president";
  return "secretary";
};

const normalizeStatus = (
  status: string,
  isOrigin?: boolean,
  isDestination?: boolean,
): string => {
  const valid = [
    "pending_origin",
    "pending_destination",
    "completed",
    "rejected_origin",
    "rejected_destination",
    "cancelled",
  ];
  if (valid.includes(status)) return status;
  if (status === "approved") return "completed";
  if (status === "rejected")
    return isOrigin
      ? "rejected_origin"
      : isDestination
        ? "rejected_destination"
        : "rejected_origin";
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
    localStorage.getItem("theme") === "dark" ? "dark" : "light",
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
  const [editingSecretary, setEditingSecretary] =
    useState<AssociationMember | null>(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [secretariesRefreshKey, setSecretariesRefreshKey] = useState(0);
  const [playersRefreshKey, setPlayersRefreshKey] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const addToast = useCallback(
    (type: ToastMessage["type"], message: string) => {
      const id = Date.now().toString();
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(
        () => setToasts((prev) => prev.filter((t) => t.id !== id)),
        4000,
      );
    },
    [],
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (user !== undefined) setIsAuthReady(true);
  }, [user]);

  useEffect(() => {
    if (!isAuthReady) return;
    const fetchProfile = async () => {
      try {
        const res = await http.get("/associations/me");
        const profile: UserProfile = res.data;
        setUserProfile(profile);
        setAssociationId(
          profile.association?.id ?? authUser?.association_id ?? null,
        );
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
        setAssociationId(authUser?.association_id ?? null);
      } finally {
        setIsProfileLoaded(true);
      }
    };
    fetchProfile();
  }, [isAuthReady]);

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
        const allTransfers = [
          ...(transfersData.outgoing || []),
          ...(transfersData.incoming || []),
        ];
        setStats({
          totalPlayers: players.length,
          activePlayers: players.filter((p: Player) => p.active).length,
          pendingQuotas: quotas.filter((q: Quota) => q.status === "pending")
            .length,
          pendingTransfers: allTransfers.filter((t: Transfer) => {
            const norm = normalizeStatus(
              t.status,
              t.is_origin,
              t.is_destination,
            );
            return norm === "pending_origin" || norm === "pending_destination";
          }).length,
        });
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      }
    };
    fetchStats();
  }, [activeTab, associationId]);

  const menuItems: {
    key: TabType;
    label: string;
    icon: string;
    roles: string[];
  }[] = [
    {
      key: "dashboard",
      label: "Painel",
      icon: "dashboard",
      roles: ["president", "secretary"],
    },
    {
      key: "secretaries",
      label: "Secretários",
      icon: "group",
      roles: ["president"],
    },
    {
      key: "players",
      label: "Jogadores",
      icon: "sports_motorsports",
      roles: ["president", "secretary"],
    },
    {
      key: "quotas",
      label: "Quotas",
      icon: "payments",
      roles: ["president", "secretary"],
    },
    {
      key: "transfers",
      label: "Transferências",
      icon: "swap_horiz",
      roles: ["president", "secretary"],
    },
    {
      key: "reports",
      label: "Relatórios",
      icon: "assessment",
      roles: ["president", "secretary"],
    },
  ];

  const visibleMenu = menuItems.filter((item) => item.roles.includes(role));

  const renderContent = () => {
    if (!isProfileLoaded)
      return <div className={styles.loading}>A carregar associação...</div>;
    if (!associationId)
      return (
        <div className={styles.pageContainer}>
          <div className={styles.emptyState} style={{ marginTop: "4rem" }}>
            <span className="material-symbols-outlined">lock</span>
            <h2>Acesso restrito</h2>
            <p>Não tem uma associação atribuída. Contacte o administrador.</p>
          </div>
        </div>
      );

    switch (activeTab) {
      case "dashboard":
        return (
          <DashboardContent
            stats={stats}
            role={role}
            associationId={associationId}
            associationName={
              userProfile?.association?.name || "Associação Desportiva"
            }
          />
        );
      case "secretaries":
        return (
          <SecretariesSection
            key={secretariesRefreshKey}
            addToast={addToast}
            associationId={associationId}
            onEdit={(s) => {
              setEditingSecretary(s);
              setShowSecretaryModal(true);
            }}
            onCreate={() => {
              setEditingSecretary(null);
              setShowSecretaryModal(true);
            }}
          />
        );
      case "players":
        return (
          <PlayersSection
            key={playersRefreshKey}
            addToast={addToast}
            associationId={associationId}
            role={role}
            onEdit={(p) => {
              setEditingPlayer(p);
              setShowPlayerModal(true);
            }}
            onCreate={() => {
              setEditingPlayer(null);
              setShowPlayerModal(true);
            }}
          />
        );
      case "quotas":
        return (
          <QuotasSection
            addToast={addToast}
            role={role}
            associationId={associationId}
          />
        );
      case "transfers":
        return (
          <TransfersSection addToast={addToast} associationId={associationId} />
        );
      case "reports":
        return <ReportsSection associationId={associationId} />;
      default:
        return null;
    }
  };

  if (!isAuthReady)
    return (
      <div className={styles.container}>
        <div className={styles.loading}>A carregar sessão...</div>
      </div>
    );

  const avatarSrc = userProfile?.user?.name
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.user.name)}&background=1e3a5f&color=fff&size=256`
    : "https://via.placeholder.com/40";

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <div
          className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        <aside
          className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}
        >
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
            {visibleMenu.map((item) => (
              <button
                key={item.key}
                className={`${styles.navLink} ${activeTab === item.key ? styles.active : ""}`}
                onClick={() => {
                  setActiveTab(item.key);
                  setIsSidebarOpen(false);
                }}
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
              <button
                className={styles.menuButton}
                onClick={() => setIsSidebarOpen((v) => !v)}
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <span className={styles.systemName}>
                {userProfile?.association?.name || "SIFCQA - Associação"}
              </span>
            </div>
            <div className={styles.topbarRight}>
              <button
                className={styles.themeToggle}
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : "light"))
                }
              >
                <span className="material-symbols-outlined">
                  {theme === "light" ? "dark_mode" : "light_mode"}
                </span>
              </button>
              <div
                className={styles.avatarWrapper}
                ref={profileRef}
                onClick={() => setShowProfileDropdown((v) => !v)}
              >
                <div className={styles.avatar}>
                  <img src={avatarSrc} alt="User" />
                </div>
                {showProfileDropdown && userProfile && (
                  <div className={styles.profileDropdown}>
                    <div className={styles.profileHeader}>
                      <img
                        src={avatarSrc}
                        alt={userProfile.user.name}
                        className={styles.profileAvatar}
                      />
                      <div>
                        <strong>{userProfile.user.name}</strong>
                        <span>{userProfile.user.email}</span>
                      </div>
                    </div>
                    <div className={styles.profileDetails}>
                      {userProfile.association && (
                        <p>
                          <span className="material-symbols-outlined">
                            location_city
                          </span>
                          {userProfile.association.name}
                        </p>
                      )}
                      {userProfile.association_member && (
                        <p>
                          <span className="material-symbols-outlined">
                            badge
                          </span>
                          {userProfile.association_member.position}
                        </p>
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
            setSecretariesRefreshKey((prev) => prev + 1);
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
            addToast(
              "success",
              editingPlayer ? "Jogador atualizado!" : "Jogador registado!",
            );
            setPlayersRefreshKey((prev) => prev + 1);
          }}
        />
      )}
      <ToastContainer
        toasts={toasts}
        onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};

/* ==================== DASHBOARD CONTENT ==================== */
const DashboardContent: React.FC<{
  stats: DashboardStats;
  role: string;
  associationId: number;
  associationName: string;
}> = ({ stats, role, associationName }) => {
  const activityData = [
    { label: "Seg", value: 2 },
    { label: "Ter", value: 5 },
    { label: "Qua", value: 3 },
    { label: "Qui", value: 7 },
    { label: "Sex", value: 4 },
    { label: "Sáb", value: 6 },
    { label: "Dom", value: 1 },
  ];
  const maxVal = Math.max(...activityData.map((d) => d.value));

  return (
    <div className={styles.pageContainer}>
      <div className={styles.dashboardHero}>
        <div className={styles.heroText}>
          <p>Bem-vindo ao painel da</p>
          <h2>{associationName}</h2>
          <span className={styles.roleBadge}>
            {role === "president" ? "Presidente" : "Secretário(a)"}
          </span>
        </div>
        <div className={styles.heroIcon}>
          <span className="material-symbols-outlined">stadium</span>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.cardPlayers}`}>
          <div className={styles.statIcon}>
            <span className="material-symbols-outlined">groups</span>
          </div>
          <div className={styles.statInfo}>
            <p>Jogadores Ativos</p>
            <strong>{stats.activePlayers}</strong>
            <small>de {stats.totalPlayers} registados</small>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.cardQuotas}`}>
          <div className={styles.statIcon}>
            <span className="material-symbols-outlined">payments</span>
          </div>
          <div className={styles.statInfo}>
            <p>Quotas Pendentes</p>
            <strong>{stats.pendingQuotas}</strong>
            <small>a aguardar pagamento</small>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.cardTransfers}`}>
          <div className={styles.statIcon}>
            <span className="material-symbols-outlined">swap_horiz</span>
          </div>
          <div className={styles.statInfo}>
            <p>Transferências Pendentes</p>
            <strong>{stats.pendingTransfers}</strong>
            <small>para aprovação</small>
          </div>
        </div>
        <div className={`${styles.statCard} ${styles.cardTotal}`}>
          <div className={styles.statIcon}>
            <span className="material-symbols-outlined">people</span>
          </div>
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
            {activityData.map((item) => (
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
      setSecretaries(
        (res.data.data || res.data).filter(
          (m: AssociationMember) => m.position === "secretary",
        ),
      );
    } catch (err: any) {
      addToast("error", "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecretaries();
  }, [associationId]);

  const handleDelete = async (id: number) => {
    if (!confirm("Remover secretário?")) return;
    try {
      await http.delete(
        `${endpoints.associations.members(associationId)}/${id}`,
      );
      addToast("success", "Removido");
      fetchSecretaries();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro");
    }
  };

  const filtered = secretaries.filter(
    (s) =>
      s.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.user?.email?.toLowerCase().includes(search.toLowerCase()),
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
            {filtered.map((s) => (
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
                  <span
                    className={`${styles.statusBadge} ${s.active ? styles.active : styles.inactive}`}
                  >
                    {s.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <button
                    className={styles.actionBtn}
                    onClick={() => onEdit(s)}
                  >
                    Editar
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleDelete(s.id)}
                  >
                    Remover
                  </button>
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
      const res = await http.get(
        endpoints.associations.associationPlayers(associationId),
      );
      setPlayers(res.data.data || res.data);
    } catch (err: any) {
      addToast("error", "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [associationId]);

  const handleToggleActive = async (player: Player) => {
    if (
      !confirm(`Deseja ${player.active ? "suspender" : "ativar"} este jogador?`)
    )
      return;
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

  const filtered = players.filter(
    (p) =>
      p.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.association?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Jogadores</h2>
        <button className={styles.primaryButton} onClick={onCreate}>
          <span className="material-symbols-outlined">add</span> Registar
          Jogador
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
            {filtered.map((p) => (
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
                  <span
                    className={`${styles.statusBadge} ${p.active ? styles.active : styles.inactive}`}
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <button
                    className={styles.actionBtn}
                    onClick={() => onEdit(p)}
                  >
                    Editar
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleToggleActive(p)}
                  >
                    {p.active ? "Suspender" : "Ativar"}
                  </button>
                  <button
                    className={styles.actionBtn}
                    onClick={() => handleDelete(p.id)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ==================== QUOTAS (COM CONFIGURAÇÃO GLOBAL) ==================== */
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
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [config, setConfig] = useState<QuotaConfig | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [quotasRes, paymentsRes, configRes] = await Promise.all([
        http.get("/association/quotas"),
        http.get("/association/payments"),
        http.get("/association/quota-config"),
      ]);
      setQuotas(quotasRes.data.data || quotasRes.data);
      const payments = paymentsRes.data.data || paymentsRes.data;
      payments.sort((a: PendingPayment, b: PendingPayment) => b.id - a.id);
      setPendingPayments(payments);
      setConfig(configRes.data.data || configRes.data);
    } catch (err: any) {
      addToast("error", "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateNow = async () => {
    if (!confirm(`Gerar quotas automáticas para ${new Date().getFullYear()}?`))
      return;
    try {
      const { data } = await http.post(
        "/association/quota-config/generate-now",
        {},
      );
      addToast(
        "success",
        `Criadas: ${data.data.created}, já existiam: ${data.data.skipped}`,
      );
      fetchData();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao gerar");
    }
  };

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

  const filteredQuotas =
    statusFilter === "all"
      ? quotas
      : quotas.filter((q) => q.status === statusFilter);

  const statusClass = (status: string) => {
    switch (status) {
      case "paid":
        return styles.statusPaid;
      case "pending":
        return styles.statusPending;
      case "rejected":
        return styles.statusRejected;
      case "expired":
        return styles.statusExpired;
      default:
        return "";
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Pago";
      case "pending":
        return "Pendente";
      case "rejected":
        return "Rejeitado";
      case "expired":
        return "Expirado";
      default:
        return status;
    }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Quotizações</h2>
        <div className={styles.headerActions}>
          {config && (
            <div className={styles.quotaConfigBadge}>
              <span>
                Quota global:{" "}
                <strong>
                  {config.annual_amount > 0
                    ? `${config.annual_amount} MT`
                    : "não definida"}
                </strong>
              </span>
              {config.auto_generate && (
                <span className={styles.autoBadge}>Auto</span>
              )}
            </div>
          )}
          <button
            className={styles.secondaryButton}
            onClick={() => setShowConfigModal(true)}
          >
            <span className="material-symbols-outlined">settings</span>
            Configurar Quota Global
          </button>
          {config?.auto_generate && config.annual_amount > 0 && (
            <button
              className={styles.secondaryButton}
              onClick={handleGenerateNow}
            >
              <span className="material-symbols-outlined">bolt</span>
              Gerar Agora
            </button>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="paid">Pago</option>
            <option value="rejected">Rejeitado</option>
            <option value="expired">Expirado</option>
          </select>
          <button
            className={styles.primaryButton}
            onClick={() => setShowCreateModal(true)}
          >
            <span className="material-symbols-outlined">add</span> Nova Quota
            Manual
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
            {filteredQuotas.map((q) => (
              <tr key={q.id}>
                <td>{q.player?.name || `#${q.player_id}`}</td>
                <td>{q.title || "—"}</td>
                <td>{q.total_amount} MT</td>
                <td>
                  {q.installments?.total
                    ? `${q.installments.total}x de ${q.installments.amount_each} MT`
                    : "—"}
                </td>
                <td>
                  <span
                    className={`${styles.statusBadge} ${statusClass(q.status)}`}
                  >
                    {statusLabel(q.status)}
                  </span>
                </td>
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
            {pendingPayments.map((payment) => (
              <div key={payment.id} className={styles.paymentCard}>
                <div className={styles.paymentInfo}>
                  <strong>{payment.player_name}</strong>
                  <span>
                    Quota: {payment.quota_title || `#${payment.quota_id}`}
                  </span>
                  <span>
                    Prestação {payment.installment_number} – {payment.amount} MT
                  </span>
                  <span className={styles.paymentMethod}>
                    {payment.method}{" "}
                    {payment.reference ? `(ref: ${payment.reference})` : ""}
                  </span>
                </div>
                <div className={styles.paymentActions}>
                  <button
                    className={styles.approveButton}
                    onClick={() => handleConfirm(payment.id)}
                  >
                    Confirmar
                  </button>
                  <button
                    className={styles.rejectButton}
                    onClick={() => handleReject(payment.id)}
                  >
                    Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showConfigModal && config && (
        <QuotaConfigModal
          config={config}
          addToast={addToast}
          onClose={() => setShowConfigModal(false)}
          onSuccess={(updated) => {
            setConfig(updated);
            setShowConfigModal(false);
            addToast("success", "Configuração guardada!");
          }}
        />
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

/* ---- Modal de Configuração da Quota Global ---- */
const QuotaConfigModal: React.FC<{
  config: QuotaConfig;
  addToast: (type: ToastMessage["type"], msg: string) => void;
  onClose: () => void;
  onSuccess: (updated: QuotaConfig) => void;
}> = ({ config, addToast, onClose, onSuccess }) => {
  const [form, setForm] = useState<QuotaConfig>({ ...config });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await http.put("/association/quota-config", form);
      onSuccess(data.data);
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao guardar");
    } finally {
      setLoading(false);
    }
  };

  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Configuração de Quota Global</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Valor Anual (MT) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.annual_amount}
                onChange={(e) =>
                  setForm({ ...form, annual_amount: Number(e.target.value) })
                }
                required
              />
              <small>
                Será dividido em 2 prestações de{" "}
                {form.annual_amount > 0
                  ? (form.annual_amount / 2).toFixed(2)
                  : "—"}{" "}
                MT
              </small>
            </div>
            <div className={styles.formGroup}>
              <label>Título (use {"{year}"} para o ano)</label>
              <input
                value={form.title_template}
                onChange={(e) =>
                  setForm({ ...form, title_template: e.target.value })
                }
                placeholder="Quota Anual {year}"
              />
              <small>Exemplo: "Quota Anual 2025"</small>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.auto_generate}
                  onChange={(e) =>
                    setForm({ ...form, auto_generate: e.target.checked })
                  }
                />
                Geração automática anual (1 de Janeiro)
              </label>
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Mês de vencimento</label>
                <select
                  value={form.due_month}
                  onChange={(e) =>
                    setForm({ ...form, due_month: Number(e.target.value) })
                  }
                >
                  {months.map((m, i) => (
                    <option key={i + 1} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>Dia de vencimento</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.due_day}
                  onChange={(e) =>
                    setForm({ ...form, due_day: Number(e.target.value) })
                  }
                />
              </div>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "A guardar..." : "Guardar Configuração"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ---- Modal de Criação de Quota Manual ---- */
const CreateQuotaModal: React.FC<{
  associationId: number;
  addToast: (type: ToastMessage["type"], msg: string) => void;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ associationId, addToast, onClose, onSuccess }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [form, setForm] = useState({
    player_id: "",
    title: "",
    total_amount: "",
    due_date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoadingPlayers(true);
      try {
        const res = await http.get(
          endpoints.associations.associationPlayers(associationId),
        );
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
    if (
      !form.total_amount ||
      isNaN(Number(form.total_amount)) ||
      Number(form.total_amount) <= 0
    )
      newErrors.total_amount = "Valor inválido.";
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
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Nova Quota</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Jogador *</label>
              {loadingPlayers ? (
                <p>Carregando...</p>
              ) : (
                <select
                  value={form.player_id}
                  onChange={(e) =>
                    setForm({ ...form, player_id: e.target.value })
                  }
                  required
                >
                  <option value="">Selecione...</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user?.name || `#${p.id}`}
                    </option>
                  ))}
                </select>
              )}
              {errors.player_id && (
                <span className={styles.fieldError}>{errors.player_id}</span>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>Título *</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              {errors.title && (
                <span className={styles.fieldError}>{errors.title}</span>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>Valor Total (MT) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.total_amount}
                onChange={(e) =>
                  setForm({ ...form, total_amount: e.target.value })
                }
                required
              />
              {errors.total_amount && (
                <span className={styles.fieldError}>{errors.total_amount}</span>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>Data de Vencimento *</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                required
              />
              {errors.due_date && (
                <span className={styles.fieldError}>{errors.due_date}</span>
              )}
            </div>
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Criando..." : "Criar Quota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== TRANSFERÊNCIAS ==================== */
const TransfersSection: React.FC<{
  addToast: (type: "success" | "error" | "info", msg: string) => void;
  associationId: number;
}> = ({ addToast, associationId }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [showOriginApprove, setShowOriginApprove] = useState<Transfer | null>(
    null,
  );
  const [showDestinationApprove, setShowDestinationApprove] =
    useState<Transfer | null>(null);
  const [showReject, setShowReject] = useState<{
    transfer: Transfer;
    type: "origin" | "destination";
  } | null>(null);

  const fetchTransfers = async () => {
    try {
      const res = await http.get(`/associations/${associationId}/transfers`);
      const data = res.data;
      const outgoing = (data.outgoing || []).map((t: Transfer) => ({
        ...t,
        is_origin: true,
      }));
      const incoming = (data.incoming || []).map((t: Transfer) => ({
        ...t,
        is_destination: true,
      }));
      setTransfers([...outgoing, ...incoming]);
    } catch (err: any) {
      addToast("error", "Erro ao carregar transferências");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [associationId]);

  const handleOriginApprove = async (transferId: number, file?: File) => {
    const formData = new FormData();
    if (file) formData.append("document", file);
    try {
      await http.post(`/transfers/${transferId}/origin/approve`, formData);
      addToast("success", "Saída aprovada!");
      setShowOriginApprove(null);
      fetchTransfers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao aprovar");
    }
  };

  const handleDestinationApprove = async (transferId: number, file?: File) => {
    const formData = new FormData();
    if (file) formData.append("document", file);
    try {
      await http.post(`/transfers/${transferId}/destination/approve`, formData);
      addToast("success", "Entrada aprovada!");
      setShowDestinationApprove(null);
      fetchTransfers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao aprovar");
    }
  };

  const handleReject = async (
    transferId: number,
    type: "origin" | "destination",
    reason: string,
  ) => {
    try {
      if (type === "origin")
        await http.patch(`/transfers/${transferId}/origin/reject`, { reason });
      else
        await http.patch(`/transfers/${transferId}/destination/reject`, {
          reason,
        });
      addToast("success", "Transferência rejeitada.");
      setShowReject(null);
      fetchTransfers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao rejeitar");
    }
  };

  const pendingTransfers = transfers.filter(
    (t) => (t.actions || []).length > 0,
  );
  const historyTransfers = transfers.filter(
    (t) => (t.actions || []).length === 0,
  );

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <h2>Transferências</h2>
      <div className={styles.transferTabs}>
        <button
          className={`${styles.transferTab} ${tab === "pending" ? styles.activeTab : ""}`}
          onClick={() => setTab("pending")}
        >
          Por Aprovar
        </button>
        <button
          className={`${styles.transferTab} ${tab === "history" ? styles.activeTab : ""}`}
          onClick={() => setTab("history")}
        >
          Histórico
        </button>
      </div>

      {tab === "pending" &&
        (pendingTransfers.length === 0 ? (
          <div className={styles.emptyState}>
            <span className="material-symbols-outlined">check_circle</span>
            <p>Nenhuma transferência pendente.</p>
          </div>
        ) : (
          <div className={styles.pendingActionsList}>
            {pendingTransfers.map((t) => {
              const playerName =
                t.player?.user?.name || t.player?.name || `#${t.player_id}`;
              const actions = t.actions || [];
              return (
                <div key={t.id} className={styles.transferActionCard}>
                  <div className={styles.transferCardInfo}>
                    <strong>{playerName}</strong>
                    <div className={styles.direction}>
                      <span>{t.from_association?.name || "Origem"}</span>
                      <span className="material-symbols-outlined arrow">
                        arrow_forward
                      </span>
                      <span>{t.to_association?.name || "Destino"}</span>
                    </div>
                    {t.documents && t.documents.length > 0 && (
                      <div className={styles.documentsInline}>
                        {t.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.docLink}
                          >
                            📎 {doc.original_name || doc.type}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={styles.transferCardActions}>
                    {actions.includes("approve_origin") && (
                      <button
                        className={styles.approveButton}
                        onClick={() => setShowOriginApprove(t)}
                      >
                        Aprovar Saída
                      </button>
                    )}
                    {actions.includes("reject_origin") && (
                      <button
                        className={styles.rejectButton}
                        onClick={() =>
                          setShowReject({ transfer: t, type: "origin" })
                        }
                      >
                        Rejeitar Saída
                      </button>
                    )}
                    {actions.includes("approve_destination") && (
                      <button
                        className={styles.approveButton}
                        onClick={() => setShowDestinationApprove(t)}
                      >
                        Aprovar Entrada
                      </button>
                    )}
                    {actions.includes("reject_destination") && (
                      <button
                        className={styles.rejectButton}
                        onClick={() =>
                          setShowReject({ transfer: t, type: "destination" })
                        }
                      >
                        Rejeitar Entrada
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

      {tab === "history" && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Estado</th>
                <th>Data</th>
                <th>Documentos</th>
              </tr>
            </thead>
            <tbody>
              {historyTransfers.map((t) => {
                const normalized = normalizeStatus(
                  t.status,
                  t.is_origin,
                  t.is_destination,
                );
                return (
                  <tr key={t.id}>
                    <td>
                      {t.player?.user?.name ||
                        t.player?.name ||
                        `#${t.player_id}`}
                    </td>
                    <td>{t.from_association?.name || "—"}</td>
                    <td>{t.to_association?.name || "—"}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${normalized.startsWith("completed") ? styles.statusPaid : normalized.startsWith("rejected") ? styles.statusRejected : styles.statusPending}`}
                      >
                        {normalized.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>
                      {t.created_at
                        ? new Date(t.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      {t.documents && t.documents.length > 0
                        ? t.documents.map((doc) => (
                            <a
                              key={doc.id}
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.docLink}
                            >
                              {doc.original_name || doc.type}
                            </a>
                          ))
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showOriginApprove && (
        <ApproveModal
          title="Aprovar Saída"
          transfer={showOriginApprove}
          onClose={() => setShowOriginApprove(null)}
          onApprove={handleOriginApprove}
        />
      )}
      {showDestinationApprove && (
        <ApproveModal
          title="Aprovar Entrada"
          transfer={showDestinationApprove}
          onClose={() => setShowDestinationApprove(null)}
          onApprove={handleDestinationApprove}
        />
      )}
      {showReject && (
        <RejectModal
          title={
            showReject.type === "origin" ? "Rejeitar Saída" : "Rejeitar Entrada"
          }
          onClose={() => setShowReject(null)}
          onSubmit={(reason) =>
            handleReject(showReject.transfer.id, showReject.type, reason)
          }
        />
      )}
    </div>
  );
};

const ApproveModal: React.FC<{
  title: string;
  transfer: Transfer;
  onClose: () => void;
  onApprove: (transferId: number, file?: File) => void;
}> = ({ title, transfer, onClose, onApprove }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onApprove(transfer.id, file || undefined);
    setLoading(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <p>
              Jogador:{" "}
              <strong>
                {transfer.player?.user?.name ||
                  transfer.player?.name ||
                  `#${transfer.player_id}`}
              </strong>
            </p>
            <div className={styles.formGroup}>
              <label>Documento comprovativo (PDF ou imagem)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Aprovar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const RejectModal: React.FC<{
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}> = ({ title, onClose, onSubmit }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 5) {
      alert("Motivo deve ter pelo menos 5 caracteres.");
      return;
    }
    setLoading(true);
    onSubmit(reason);
    setLoading(false);
  };
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Motivo</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                required
              />
            </div>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== RELATÓRIOS (com ECharts) ==================== */
const ReportsSection: React.FC<{ associationId: number }> = ({ associationId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchReportData = async () => {
      try {
        const [playersRes, quotasRes, transfersRes, paymentsRes] = await Promise.all([
          http.get(endpoints.associations.associationPlayers(associationId)),
          http.get("/association/quotas", { params: { per_page: 1000 } }),
          http.get(`/associations/${associationId}/transfers`),
          http.get("/association/payments", { params: { per_page: 1000 } }),
        ]);

        const players: Player[] = playersRes.data.data || playersRes.data;
        const quotas: Quota[] = quotasRes.data.data || quotasRes.data;
        const transfersData = transfersRes.data;
        const allTransfers: Transfer[] = [
          ...(transfersData.outgoing || []),
          ...(transfersData.incoming || []),
        ];
        const payments: PendingPayment[] = paymentsRes.data.data || paymentsRes.data;

        const totalPlayers = players.length;
        const activePlayers = players.filter(p => p.active).length;

        const quotaCounts: Record<string, number> = { pending: 0, paid: 0, rejected: 0, expired: 0 };
        let totalQuotaAmount = 0, paidAmount = 0, pendingAmount = 0;
        quotas.forEach(q => {
          quotaCounts[q.status]++;
          totalQuotaAmount += Number(q.total_amount) || 0;
          paidAmount += Number(q.paid_amount) || 0;
          pendingAmount += Number(q.remaining) || 0;
        });

        const transferCounts: Record<string, number> = {
          total: allTransfers.length,
          completed: 0, pending_origin: 0, pending_destination: 0,
          rejected_origin: 0, rejected_destination: 0,
        };
        allTransfers.forEach(t => {
          const norm = normalizeStatus(t.status, t.is_origin, t.is_destination);
          if (norm in transferCounts) transferCounts[norm]++;
        });

        const now = new Date();
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const last6Months: { month: string; amount: number }[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          last6Months.push({ month: monthNames[d.getMonth()] + " " + d.getFullYear(), amount: 0 });
        }
        payments
          .filter(p => p.status === "confirmed" || p.status === "paid")
          .forEach(p => {
            if (p.created_at) {
              const d = new Date(p.created_at);
              const existing = last6Months.find(m => m.month.startsWith(monthNames[d.getMonth()]));
              if (existing) existing.amount += Number(p.amount) || 0;
            }
          });

        if (!cancelled) {
          setData({
            players: { total: totalPlayers, active: activePlayers, inactive: totalPlayers - activePlayers },
            quotas: { total: quotas.length, ...quotaCounts, totalAmount: totalQuotaAmount, paidAmount, pendingAmount },
            transfers: transferCounts,
            revenueByMonth: last6Months,
          });
        }
      } catch (err) {
        console.error("Erro ao carregar relatório:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchReportData();
    return () => { cancelled = true; };
  }, [associationId]);

  if (loading) return <div className={styles.loading}>A carregar relatório...</div>;
  if (!data) return <div className={styles.emptyState}>Erro ao carregar dados.</div>;

  // ─── Dados para gráficos ──────────────────────────────────────────
  const quotaPieData = [
    { name: "Pendente", value: data.quotas.pending },
    { name: "Pago", value: data.quotas.paid },
    { name: "Rejeitado", value: data.quotas.rejected },
    { name: "Expirado", value: data.quotas.expired },
  ];

  const transferPieData = [
    { name: "Concluídas", value: data.transfers.completed },
    { name: "Pendentes (saída)", value: data.transfers.pending_origin },
    { name: "Pendentes (entrada)", value: data.transfers.pending_destination },
    { name: "Rejeitadas (saída)", value: data.transfers.rejected_origin },
    { name: "Rejeitadas (entrada)", value: data.transfers.rejected_destination },
  ];

  const barMonths = data.revenueByMonth.map((m: any) => m.month.split(" ")[0]);
  const barValues = data.revenueByMonth.map((m: any) => m.amount);

  // Cores do tema (usando as variáveis CSS)
  const PRIMARY = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#e60023';
  const TERTIARY = getComputedStyle(document.documentElement).getPropertyValue('--color-tertiary').trim() || '#6b6a69';
  const ON_SURFACE_VARIANT = getComputedStyle(document.documentElement).getPropertyValue('--color-on-surface-variant').trim() || '#5a524c';
  const SURFACE_CONTAINER = getComputedStyle(document.documentElement).getPropertyValue('--color-surface-container').trim() || '#eee9e2';

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    rejected: "Rejeitado",
    expired: "Expirado",
  };

  return (
    <div className={styles.pageContainer}>
      <h2 style={{ marginBottom: "1.5rem" }}>Relatório Estatístico da Associação</h2>

      {/* Jogadores */}
      <div className={styles.reportSection}>
        <h3>Jogadores</h3>
        <div className={styles.reportGrid}>
          <div className={styles.reportCard}><strong>{data.players.total}</strong><span>Total</span></div>
          <div className={styles.reportCard}><strong>{data.players.active}</strong><span>Ativos</span></div>
          <div className={styles.reportCard}><strong>{data.players.inactive}</strong><span>Inativos</span></div>
        </div>
      </div>

      {/* Quotas */}
      <div className={styles.reportSection}>
        <h3>Quotizações</h3>
        <div className={styles.reportGrid}>
          <div className={styles.reportCard}><strong>{data.quotas.total}</strong><span>Total de quotas</span></div>
          {Object.entries(data.quotas)
            .filter(([k]) => ["pending", "paid", "rejected", "expired"].includes(k))
            .map(([key, value]) => (
              <div className={styles.reportCard} key={key}>
                <strong>{value as number}</strong>
                <span>{statusLabels[key]}</span>
              </div>
            ))}
        </div>
        <div className={styles.amountTable}>
          <table className={styles.table}>
            <thead><tr><th>Indicador</th><th>Valor (MT)</th></tr></thead>
            <tbody>
              <tr><td>Valor total emitido</td><td>{data.quotas.totalAmount.toLocaleString("pt-MZ")} MT</td></tr>
              <tr><td>Valor já pago</td><td>{data.quotas.paidAmount.toLocaleString("pt-MZ")} MT</td></tr>
              <tr><td>Valor pendente</td><td>{data.quotas.pendingAmount.toLocaleString("pt-MZ")} MT</td></tr>
            </tbody>
          </table>
        </div>

        {/* Gráfico pizza – Quotas (ECharts) */}
        <div className={styles.chartContainer}>
          <ReactECharts
            style={{ height: 320, width: '100%' }}
            option={{
              tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
              legend: { orient: 'horizontal', bottom: 0, textStyle: { color: ON_SURFACE_VARIANT } },
              series: [{
                type: 'pie',
                radius: ['45%', '75%'],
                avoidLabelOverlap: false,
                label: { show: true, formatter: '{b}: {d}%', color: ON_SURFACE_VARIANT },
                emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
                data: quotaPieData,
                color: ['#f59e0b', '#10b981', '#ef4444', '#6b7280'],
              }],
              backgroundColor: 'transparent',
            }}
          />
        </div>
      </div>

      {/* Transferências */}
      <div className={styles.reportSection}>
        <h3>Transferências</h3>
        <div className={styles.reportGrid}>
          <div className={styles.reportCard}><strong>{data.transfers.total}</strong><span>Total</span></div>
          <div className={styles.reportCard}><strong>{data.transfers.completed}</strong><span>Concluídas</span></div>
          <div className={styles.reportCard}><strong>{data.transfers.pending_origin}</strong><span>Pendentes (saída)</span></div>
          <div className={styles.reportCard}><strong>{data.transfers.pending_destination}</strong><span>Pendentes (entrada)</span></div>
          <div className={styles.reportCard}><strong>{data.transfers.rejected_origin}</strong><span>Rejeitadas (saída)</span></div>
          <div className={styles.reportCard}><strong>{data.transfers.rejected_destination}</strong><span>Rejeitadas (entrada)</span></div>
        </div>

        {/* Gráfico pizza – Transferências (ECharts) */}
        <div className={styles.chartContainer}>
          <ReactECharts
            style={{ height: 320, width: '100%' }}
            option={{
              tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
              legend: { orient: 'horizontal', bottom: 0, textStyle: { color: ON_SURFACE_VARIANT } },
              series: [{
                type: 'pie',
                radius: ['45%', '75%'],
                avoidLabelOverlap: false,
                label: { show: true, formatter: '{b}: {d}%', color: ON_SURFACE_VARIANT },
                emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
                data: transferPieData,
                color: ['#10b981', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6'],
              }],
              backgroundColor: 'transparent',
            }}
          />
        </div>
      </div>

      {/* Receita Mensal (ECharts bar) */}
      <div className={styles.reportSection}>
        <h3>Receita Mensal (pagamentos confirmados)</h3>
        <div className={styles.chartContainer}>
          <ReactECharts
            style={{ height: 300, width: '100%' }}
            option={{
              tooltip: { trigger: 'axis', formatter: '{b}: {c} MT' },
              xAxis: {
                type: 'category',
                data: barMonths,
                axisLabel: { color: ON_SURFACE_VARIANT },
              },
              yAxis: {
                type: 'value',
                axisLabel: { color: ON_SURFACE_VARIANT },
                splitLine: { lineStyle: { color: SURFACE_CONTAINER } },
              },
              series: [{
                data: barValues,
                type: 'bar',
                barWidth: '50%',
                itemStyle: {
                  borderRadius: [6, 6, 0, 0],
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: PRIMARY },
                    { offset: 1, color: TERTIARY },
                  ]),
                },
              }],
              grid: { top: 10, bottom: 30, left: 40, right: 20 },
              backgroundColor: 'transparent',
            }}
          />
        </div>
      </div>
    </div>
  );
};

/* ==================== MODAIS DE SECRETÁRIO E JOGADOR ==================== */
interface SecretaryModalProps {
  isOpen: boolean;
  secretary: AssociationMember | null;
  associationId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const SecretaryModal: React.FC<SecretaryModalProps> = ({
  isOpen,
  secretary,
  associationId,
  onClose,
  onSuccess,
}) => {
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data } = await http.get(
          `/users?not_in_association=${associationId}`,
        );
        setUsers(data.data || data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingUsers(false);
      }
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
        await http.put(
          `${endpoints.associations.members(associationId)}/${secretary.id}`,
          { user_id: Number(selectedUserId), position: "secretary" },
        );
      } else {
        await http.post(endpoints.associations.storeMember(associationId), {
          user_id: Number(selectedUserId),
          position: "secretary",
        });
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{secretary ? "Editar Secretário" : "Novo Secretário"}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Utilizador</label>
              {loadingUsers ? (
                <p>Carregando...</p>
              ) : (
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">Selecione...</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading || !selectedUserId}
            >
              {loading ? "Salvando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== PLAYER MODAL (com FIDE ID e Rating) ==================== */
interface PlayerModalProps {
  isOpen: boolean;
  player: Player | null;
  associationId: number;
  onClose: () => void;
  onSuccess: () => void;
}

const PlayerModal: React.FC<PlayerModalProps> = ({
  isOpen,
  player,
  associationId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [active, setActive] = useState(true);
  const [fideId, setFideId] = useState("");
  const [rating, setRating] = useState("");
  const [genero, setGenero] = useState("M");
  const [dataNascimento, setDataNascimento] = useState("2000-01-01");

  const [loading, setLoading] = useState(false);
  const isEditing = !!player;

  useEffect(() => {
    if (player) {
      setName(player.user?.name || "");
      setEmail(player.user?.email || "");
      setActive(player.active);
      setFideId(player["fide-id"] || "");
      setRating(player.rating?.toString() || "");
      setGenero(player.user?.genero || "M");
      setDataNascimento(
        player.user?.dataNascimento
          ? player.user.dataNascimento.split("T")[0]
          : "2000-01-01",
      );
    } else {
      setName("");
      setEmail("");
      setActive(true);
      setFideId("");
      setRating("");
      setGenero("M");
      setDataNascimento("2000-01-01");
    }
  }, [player]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name,
        email,
        genero,
        dataNascimento,
        active,
        "fide-id": fideId || null,
        rating: rating ? parseInt(rating, 10) : null,
      };

      if (isEditing) {
        await http.put(endpoints.players.detail(player.id), payload);
      } else {
        await http.post(
          endpoints.associations.associationPlayers(associationId),
          payload,
        );
      }
      onSuccess();
    } catch (err: any) {
      alert(err.response?.data?.message || "Erro ao guardar jogador");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div className={styles.modalHeader}>
          <h3>{isEditing ? "Editar Jogador" : "Registar Jogador"}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            ×
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          style={{
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            flex: 1,
          }}
        >
          <div
            className={styles.modalBody}
            style={{ overflowY: "auto", flex: 1 }}
          >
            <div className={styles.formGroup}>
              <label>Nome *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Email *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Género</label>
              <select value={genero} onChange={(e) => setGenero(e.target.value)}>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Data de Nascimento</label>
              <input
                type="date"
                value={dataNascimento}
                onChange={(e) => setDataNascimento(e.target.value)}
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>FIDE ID</label>
              <input
                type="text"
                maxLength={15}
                value={fideId}
                onChange={(e) => setFideId(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Rating</label>
              <input
                type="number"
                step="1"
                min="0"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                placeholder="Opcional"
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                />{" "}
                Ativo
              </label>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelButton}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Salvando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onClose: (id: string) => void;
}> = ({ toasts, onClose }) => (
  <div className={styles.toastContainer}>
    {toasts.map((t) => (
      <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
        <span>
          {t.type === "success" ? "✓" : t.type === "error" ? "⚠️" : "ℹ️"}
        </span>
        <p>{t.message}</p>
        <button onClick={() => onClose(t.id)}>×</button>
      </div>
    ))}
  </div>
);

export default AssociationDashboard;