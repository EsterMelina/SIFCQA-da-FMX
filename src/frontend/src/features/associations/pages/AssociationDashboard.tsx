// AssociationDashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
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
  amount?: number; // mantido para compatibilidade, mas o novo modelo usa total_amount
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

  if (user.roles?.includes("association_president") || user.roles?.includes("president")) {
    return "president";
  }
  return "secretary";
};

const normalizeStatus = (
  status: string,
  isOrigin?: boolean,
  isDestination?: boolean
): string => {
  const validStatuses = [
    "pending_origin",
    "pending_destination",
    "completed",
    "rejected_origin",
    "rejected_destination",
    "cancelled",
  ];
  if (validStatuses.includes(status)) return status;

  if (status === "approved") return "completed";
  if (status === "rejected") {
    if (isOrigin) return "rejected_origin";
    if (isDestination) return "rejected_destination";
    return "rejected_origin";
  }
  return status;
};

/* ==================== COMPONENTE PRINCIPAL ==================== */
const AssociationDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const authUser = user as AuthUser | null;
  const associationId = authUser?.association_id ?? null;

  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("theme") === "dark" ? "dark" : "light"
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");

  const role = getUserRole(authUser);

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

  const addToast = useCallback((type: ToastMessage["type"], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));

  useEffect(() => {
    if (!associationId) return;
    const fetchProfile = async () => {
      try {
        const res = await http.get("/associations/me");
        setUserProfile(res.data);
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      }
    };
    fetchProfile();
  }, [associationId]);

  useEffect(() => {
    if (activeTab !== "dashboard" || !associationId) return;
    const fetchStats = async () => {
      try {
        const [playersRes, quotasRes, transfersRes] = await Promise.all([
          http.get(endpoints.associations.associationPlayers(associationId)),
          http.get(`/association/quotas`), // sem query param, backend usa user logado
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

  const visibleMenu = menuItems.filter((item) => item.roles.includes(role));

  const renderContent = () => {
    if (!associationId) {
      return (
        <div className={styles.pageContainer}>
          <h2>Acesso restrito</h2>
          <p>Não tem uma associação atribuída. Contacte o administrador.</p>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard": return <DashboardContent stats={stats} role={role} />;
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

  const avatarSrc = userProfile?.user?.name
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile.user.name)}&background=e60023&color=fff&size=256`
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
            {visibleMenu.map((item) => (
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
              <button className={styles.menuButton} onClick={() => setIsSidebarOpen((v) => !v)}>
                <span className="material-symbols-outlined">menu</span>
              </button>
              <span className={styles.systemName}>SIFCQA - Associação</span>
            </div>
            <div className={styles.topbarRight}>
              <button className={styles.themeToggle} onClick={toggleTheme}>
                <span className="material-symbols-outlined">{theme === "light" ? "dark_mode" : "light_mode"}</span>
              </button>
              <div
                className={styles.avatarWrapper}
                onClick={() => setShowProfileDropdown((prev) => !prev)}
                ref={(node) => {
                  if (!node) return;
                  const handler = (e: MouseEvent) => {
                    if (node && !node.contains(e.target as Node)) {
                      setShowProfileDropdown(false);
                    }
                  };
                  document.addEventListener("mousedown", handler);
                  return () => document.removeEventListener("mousedown", handler);
                }}
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
                          <span className="material-symbols-outlined">location_city</span>
                          {userProfile.association.name}
                        </p>
                      )}
                      {userProfile.association_member && (
                        <p>
                          <span className="material-symbols-outlined">badge</span>
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
          <footer className={styles.footer}><p>© {new Date().getFullYear()} SIFCQA - Associação</p></footer>
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
      <ToastContainer toasts={toasts} onClose={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
};

/* ==================== DASHBOARD CONTENT ==================== */
const DashboardContent: React.FC<{ stats: DashboardStats; role: string }> = ({ stats, role }) => (
  <div className={styles.pageContainer}>
    <h2>Dashboard {role === "president" ? "do Presidente" : "do Secretário"}</h2>
    <div className={styles.statsGrid}>
      <div className={styles.statCard}><span className="material-symbols-outlined">groups</span><div><p>Jogadores Ativos</p><strong>{stats.activePlayers}</strong></div></div>
      <div className={styles.statCard}><span className="material-symbols-outlined">payments</span><div><p>Quotas Pendentes</p><strong>{stats.pendingQuotas}</strong></div></div>
      <div className={styles.statCard}><span className="material-symbols-outlined">swap_horiz</span><div><p>Transferências Pendentes</p><strong>{stats.pendingTransfers}</strong></div></div>
      <div className={styles.statCard}><span className="material-symbols-outlined">people</span><div><p>Total Jogadores</p><strong>{stats.totalPlayers}</strong></div></div>
    </div>
  </div>
);

/* ==================== SECRETÁRIOS ==================== */
const SecretariesSection: React.FC<{
  addToast: (type: ToastMessage["type"], msg: string) => void;
  associationId: number;
  onEdit: (s: AssociationMember) => void;
  onCreate: () => void;
}> = ({ addToast, associationId, onEdit, onCreate }) => {
  const [secretaries, setSecretaries] = useState<AssociationMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSecretaries = async () => {
    try {
      const res = await http.get(endpoints.associations.members(associationId));
      setSecretaries((res.data.data || res.data).filter((m: AssociationMember) => m.position === "secretary"));
    } catch (err: any) { addToast("error", "Erro ao carregar"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchSecretaries(); }, [associationId]);

  const handleDelete = async (id: number) => {
    if (!confirm("Remover?")) return;
    try {
      await http.delete(`${endpoints.associations.members(associationId)}/${id}`);
      addToast("success", "Removido");
      fetchSecretaries();
    } catch (err: any) { addToast("error", err.response?.data?.message || "Erro"); }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Secretários</h2>
        <button className={styles.primaryButton} onClick={onCreate}><span className="material-symbols-outlined">add</span> Novo Secretário</button>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead><tr><th>Nome</th><th>Email</th><th>Ativo</th><th>Ações</th></tr></thead>
          <tbody>
            {secretaries.map((s) => (
              <tr key={s.id}>
                <td>{s.user?.name}</td><td>{s.user?.email}</td><td>{s.active ? "Sim" : "Não"}</td>
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
}> = ({ addToast, associationId, role, onEdit, onCreate }) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlayers = async () => {
    try {
      const res = await http.get(endpoints.associations.associationPlayers(associationId));
      setPlayers(res.data.data || res.data);
    } catch (err: any) { addToast("error", "Erro ao carregar"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPlayers(); }, [associationId]);

  const handleToggleActive = async (player: Player) => {
    if (!confirm(`Deseja ${player.active ? "suspender" : "ativar"} este jogador?`)) return;
    try {
      await http.patch(endpoints.players.toggleStatus(player.id));
      addToast("success", `Jogador ${player.active ? "suspenso" : "ativado"}`);
      fetchPlayers();
    } catch (err: any) { addToast("error", err.response?.data?.message || "Erro"); }
  };

  const handleDelete = async (playerId: number) => {
    if (!confirm("Tem certeza que deseja eliminar este jogador?")) return;
    try {
      await http.delete(endpoints.players.detail(playerId));
      addToast("success", "Jogador eliminado");
      fetchPlayers();
    } catch (err: any) { addToast("error", err.response?.data?.message || "Erro ao eliminar"); }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Jogadores</h2>
        <button className={styles.primaryButton} onClick={onCreate}>
          <span className="material-symbols-outlined">add</span> Registar Jogador
        </button>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr><th>Nome</th><th>Email</th><th>Associação</th><th>Ativo</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>{p.user?.name}</td>
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

/* ==================== QUOTAS + PAGAMENTOS (MELHORADA) ==================== */
const QuotasSection: React.FC<{
  addToast: (type: ToastMessage["type"], msg: string) => void;
  role: string;
  associationId: number;
}> = ({ addToast, role, associationId }) => {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Buscar quotas e pagamentos pendentes
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [quotasRes, paymentsRes] = await Promise.all([
        http.get(`/association/quotas`), // sem query param
        http.get(`/association/payments`)
      ]);
      setQuotas(quotasRes.data.data || quotasRes.data);
      const payments = paymentsRes.data.data || paymentsRes.data;
      // Ordenar pagamentos por ID decrescente (mais recentes primeiro)
      payments.sort((a: PendingPayment, b: PendingPayment) => b.id - a.id);
      setPendingPayments(payments);
    } catch (err: any) {
      addToast("error", "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Confirmar pagamento
  const handleConfirm = async (paymentId: number) => {
    try {
      await http.post(`/association/payments/${paymentId}/confirm`);
      addToast("success", "Pagamento confirmado!");
      fetchData();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao confirmar");
    }
  };

  // Rejeitar pagamento
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

  const filteredQuotas = statusFilter === "all"
    ? quotas
    : quotas.filter(q => q.status === statusFilter);

  const statusBadgeClass = (status: string) => {
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
        <h2>Quotizações da Associação</h2>
        <div className={styles.headerActions}>
          <div className={styles.filterGroup}>
            <label>Filtrar:</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Todos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="rejected">Rejeitado</option>
              <option value="expired">Expirado</option>
            </select>
          </div>
          <button className={styles.primaryButton} onClick={() => setShowCreateModal(true)}>
            <span className="material-symbols-outlined">add</span> Nova Quota
          </button>
        </div>
      </div>

      {/* Lista de quotas */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Título</th>
              <th>Valor total</th>
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
                  <span className={`${styles.statusBadge} ${statusBadgeClass(q.status)}`}>
                    {statusLabel(q.status)}
                  </span>
                </td>
                <td>{q.due_date || "—"}</td>
              </tr>
            ))}
            {filteredQuotas.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "2rem" }}>
                  Nenhuma quota encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagamentos pendentes */}
      {pendingPayments.length > 0 && (
        <div className={styles.pageContainer} style={{ marginTop: "2rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "1rem" }}>
            Pagamentos por confirmar
          </h3>
          <div className={styles.pendingPaymentsList}>
            {pendingPayments.map((payment) => (
              <div key={payment.id} className={styles.paymentCard}>
                <div className={styles.paymentInfo}>
                  <strong>{payment.player_name}</strong>
                  <span>Quota: {payment.quota_title || `#${payment.quota_id}`}</span>
                  <span>Prestação {payment.installment_number} – {payment.amount} MT</span>
                  <span className={styles.paymentMethod}>
                    {payment.method} {payment.reference ? `(ref: ${payment.reference})` : ""}
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

      {showCreateModal && (
        <CreateQuotaModal
          associationId={associationId}
          addToast={addToast}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            addToast("success", "Quota criada com sucesso!");
            fetchData();
          }}
        />
      )}
    </div>
  );
};

/* ==================== MODAL CRIAÇÃO DE QUOTA (MELHORADA) ==================== */
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
        const res = await http.get(endpoints.associations.associationPlayers(associationId));
        setPlayers(res.data.data || res.data);
      } catch (err) {
        addToast("error", "Erro ao carregar jogadores");
      } finally {
        setLoadingPlayers(false);
      }
    };
    fetchPlayers();
  }, [associationId, addToast]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.player_id) newErrors.player_id = "Seleccione um jogador.";
    if (!form.title.trim()) newErrors.title = "O título é obrigatório.";
    if (!form.total_amount || isNaN(Number(form.total_amount)) || Number(form.total_amount) <= 0) {
      newErrors.total_amount = "Valor deve ser superior a 0.";
    }
    if (!form.due_date) newErrors.due_date = "Data obrigatória.";
    else if (new Date(form.due_date) < new Date(new Date().setHours(0,0,0,0))) {
      newErrors.due_date = "Data deve ser futura.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      // Envio sem association_id, backend usa user logado
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
          <button onClick={onClose} className={styles.modalClose} disabled={loading}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Jogador *</label>
              {loadingPlayers ? (
                <p>A carregar...</p>
              ) : (
                <select
                  value={form.player_id}
                  onChange={(e) => {
                    setForm({ ...form, player_id: e.target.value });
                    if (errors.player_id) setErrors({ ...errors, player_id: "" });
                  }}
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
              {errors.player_id && <span className={styles.fieldError}>{errors.player_id}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Título *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => {
                  setForm({ ...form, title: e.target.value });
                  if (errors.title) setErrors({ ...errors, title: "" });
                }}
                placeholder="ex: Quota Anual 2026"
                required
              />
              {errors.title && <span className={styles.fieldError}>{errors.title}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Valor Total (MT) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.total_amount}
                onChange={(e) => {
                  setForm({ ...form, total_amount: e.target.value });
                  if (errors.total_amount) setErrors({ ...errors, total_amount: "" });
                }}
                required
              />
              {errors.total_amount && <span className={styles.fieldError}>{errors.total_amount}</span>}
            </div>
            <div className={styles.formGroup}>
              <label>Data de Vencimento *</label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => {
                  setForm({ ...form, due_date: e.target.value });
                  if (errors.due_date) setErrors({ ...errors, due_date: "" });
                }}
                required
              />
              {errors.due_date && <span className={styles.fieldError}>{errors.due_date}</span>}
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)", marginTop: "-0.5rem" }}>
              Serão criadas automaticamente 2 prestações de igual valor.
            </p>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton} disabled={loading}>
              Cancelar
            </button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
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

  const [showOriginApprove, setShowOriginApprove] = useState<Transfer | null>(null);
  const [showReject, setShowReject] = useState<{ transfer: Transfer; type: "origin" | "destination" } | null>(null);

  // const fetchTransfers = async () => {
  //   try {
  //     const res = await http.get(`/associations/${associationId}/transfers`);
  //     const data = res.data;
  //     const outgoing = (data.outgoing || []).map((t: Transfer) => ({
  //       ...t,
  //       is_origin: true,
  //     }));
  //     const incoming = (data.incoming || []).map((t: Transfer) => ({
  //       ...t,
  //       is_destination: true,
  //     }));
  //     setTransfers([...outgoing, ...incoming]);
  //   } catch (err: any) {
  //     addToast("error", "Erro ao carregar transferências");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const fetchTransfers = async () => {
  try {
    console.log("➡️ A CHAMAR API TRANSFERS");
    console.log("ASSOCIATION ID:", associationId);

    const url = `/associations/${associationId}/transfers`;
    console.log("URL:", url);

    const res = await http.get(url);

    console.log("⬅️ RESPOSTA BRUTA:", res);
    console.log("⬅️ DATA:", res.data);

    const data = res.data;

    const outgoing = (data.outgoing || []).map((t: Transfer) => ({
      ...t,
      is_origin: true,
    }));

    const incoming = (data.incoming || []).map((t: Transfer) => ({
      ...t,
      is_destination: true,
    }));

    const finalData = [...outgoing, ...incoming];

    console.log("📦 TRANSFERS PROCESSADOS:", finalData);

    setTransfers(finalData);
  } catch (err: any) {
    console.log("❌ ERRO COMPLETO:", err);
    console.log("❌ ERRO RESPONSE:", err.response);
    console.log("❌ ERRO DATA:", err.response?.data);

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
      addToast("success", "Saída aprovada com sucesso!");
      setShowOriginApprove(null);
      fetchTransfers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao aprovar");
    }
  };

  const handleReject = async (transferId: number, type: "origin" | "destination", reason: string) => {
    try {
      if (type === "origin") {
        await http.patch(`/transfers/${transferId}/origin/reject`, { reason });
      } else {
        await http.patch(`/transfers/${transferId}/destination/reject`, { reason });
      }
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
      addToast("success", "Entrada aprovada com sucesso!");
      fetchTransfers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao aprovar");
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending_origin: "Aguard. Origem",
      pending_destination: "Aguard. Destino",
      completed: "Concluída",
      rejected_origin: "Rejeitada (Origem)",
      rejected_destination: "Rejeitada (Destino)",
      cancelled: "Cancelada",
      pending: "Pendente",
      approved: "Concluída",
      rejected: "Rejeitada",
    };
    return map[status] || status;
  };

  const getStatusClass = (status: string) => {
    if (status === "completed" || status === "approved") return styles.validated;
    if (status.startsWith("rejected") || status === "cancelled") return styles.rejected;
    return styles.pending;
  };

  const pendingTransfers = transfers.filter((t) => {
    const actions = t.actions || [];
    return actions.length > 0;
  });

  const historyTransfers = transfers.filter((t) => {
    const actions = t.actions || [];
    return actions.length === 0;
  });

  const formatDate = (date?: string) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString();
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <h2>Transferências da Associação</h2>

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

      {tab === "pending" && (
        <>
          {pendingTransfers.length === 0 ? (
            <div className={styles.emptyState}>
              <span className="material-symbols-outlined">check_circle</span>
              <p>Nenhuma transferência pendente de aprovação.</p>
            </div>
          ) : (
            <div className={styles.pendingActionsList}>
              {pendingTransfers.map((t) => {
                const actions = t.actions || [];
                const normalizedStatus = normalizeStatus(t.status, t.is_origin, t.is_destination);
                const playerName = t.player?.user?.name || t.player?.name || `#${t.player_id}`;
                const originName = t.from_association?.name || (t.is_origin ? "A minha Associação" : "—");
                const destName = t.to_association?.name || "—";

                return (
                  <div key={t.id} className={styles.transferActionCard}>
                    <div className={styles.transferCardInfo}>
                      <strong>{playerName}</strong>
                      <div className={styles.direction}>
                        <span>{originName}</span>
                        <span className="material-symbols-outlined arrow">arrow_forward</span>
                        <span>{destName}</span>
                      </div>
                      <span className={styles.statusBadge}>{getStatusLabel(normalizedStatus)}</span>
                    </div>
                    <div className={styles.transferCardActions}>
                      {actions.includes("approve_origin") && (
                        <button className={styles.approveButton} onClick={() => setShowOriginApprove(t)}>
                          Aprovar Saída
                        </button>
                      )}
                      {actions.includes("reject_origin") && (
                        <button className={styles.rejectButton} onClick={() => setShowReject({ transfer: t, type: "origin" })}>
                          Rejeitar Saída
                        </button>
                      )}
                      {actions.includes("approve_destination") && (
                        <button className={styles.approveButton} onClick={() => handleDestinationApprove(t.id)}>
                          Aprovar Entrada
                        </button>
                      )}
                      {actions.includes("reject_destination") && (
                        <button className={styles.rejectButton} onClick={() => setShowReject({ transfer: t, type: "destination" })}>
                          Rejeitar Entrada
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "history" && (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Jogador</th>
                <th>Origem</th>
                <th>Destino</th>
                <th>Status</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {historyTransfers.map((t) => {
                const normalizedStatus = normalizeStatus(t.status, t.is_origin, t.is_destination);
                const playerName = t.player?.user?.name || t.player?.name || `#${t.player_id}`;
                const originName = t.from_association?.name || (t.is_origin ? "A minha Associação" : "—");
                const destName = t.to_association?.name || "—";

                return (
                  <tr key={t.id}>
                    <td>{playerName}</td>
                    <td>{originName}</td>
                    <td>{destName}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${getStatusClass(normalizedStatus)}`}>
                        {getStatusLabel(normalizedStatus)}
                      </span>
                    </td>
                    <td>{formatDate(t.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showOriginApprove && (
        <OriginApproveModal
          transfer={showOriginApprove}
          onClose={() => setShowOriginApprove(null)}
          onApprove={handleOriginApprove}
        />
      )}

      {showReject && (
        <RejectModal
          title={showReject.type === "origin" ? "Rejeitar Saída" : "Rejeitar Entrada"}
          onClose={() => setShowReject(null)}
          onSubmit={(reason) => handleReject(showReject.transfer.id, showReject.type, reason)}
        />
      )}
    </div>
  );
};

/* ==================== RELATÓRIOS ==================== */
const ReportsSection: React.FC<{ role: string }> = ({ role }) => (
  <div className={styles.pageContainer}>
    <h2>Relatórios</h2>
    <div className={styles.placeholder}><span className="material-symbols-outlined">construction</span><p>Em desenvolvimento</p></div>
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
      } catch (err) {
        console.error("Erro ao carregar utilizadores");
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [isOpen, associationId]);

  useEffect(() => {
    if (secretary) {
      setSelectedUserId(String(secretary.user_id));
    } else {
      setSelectedUserId("");
    }
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
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Utilizador</label>
              {loadingUsers ? (
                <p>A carregar...</p>
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
      setName("");
      setEmail("");
      setActive(true);
      setAge("");
      setRating("");
      setProvince("");
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
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{isEditing ? "Editar Jogador" : "Registar Jogador"}</h3>
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {isEditing ? (
              <>
                <div className={styles.formGroup}><label>Nome</label><input value={name} disabled className={styles.readonly} /></div>
                <div className={styles.formGroup}><label>Idade</label><input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
                <div className={styles.formGroup}><label>Rating</label><input type="number" step="0.1" value={rating} onChange={(e) => setRating(e.target.value)} /></div>
                <div className={styles.formGroup}><label>Província</label><input value={province} onChange={(e) => setProvince(e.target.value)} /></div>
                <div className={styles.formGroup}><label>Mensalidade (automática)</label><input value={0} disabled className={styles.readonly} /><small>Calculado automaticamente</small></div>
              </>
            ) : (
              <>
                <div className={styles.formGroup}><label>Nome *</label><input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className={styles.formGroup}><label>Email *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
              </>
            )}
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativo
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

/* ==================== MODAL APROVAÇÃO DE ORIGEM (DOCUMENTO OPCIONAL) ==================== */
const OriginApproveModal: React.FC<{
  transfer: Transfer;
  onClose: () => void;
  onApprove: (transferId: number, file?: File) => void;
}> = ({ transfer, onClose, onApprove }) => {
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
          <h3>Aprovar Saída</h3>
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Documento (opcional – PDF ou imagem, máx. 5MB)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-on-surface-variant)", marginTop: "-0.5rem" }}>
              Pode aprovar sem anexar documento.
            </p>
            <div className={styles.modalActions}>
              <button type="button" onClick={onClose} className={styles.cancelButton}>
                Cancelar
              </button>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? "Enviando..." : "Aprovar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== MODAL DE REJEIÇÃO (MOTIVO) ==================== */
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
      alert("O motivo deve ter pelo menos 5 caracteres.");
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
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Motivo (mín. 5 caracteres)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                minLength={5}
                required
              />
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={onClose} className={styles.cancelButton}>
                Cancelar
              </button>
              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? "Enviando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ==================== TOAST ==================== */
const ToastContainer: React.FC<{ toasts: ToastMessage[]; onClose: (id: string) => void }> = ({ toasts, onClose }) => (
  <div className={styles.toastContainer}>
    {toasts.map((t) => (
      <div key={t.id} className={`${styles.toast} ${styles[t.type]}`}>
        <span>{t.type === "success" ? "✓" : t.type === "error" ? "⚠️" : "ℹ️"}</span>
        <p>{t.message}</p>
        <button onClick={() => onClose(t.id)}>×</button>
      </div>
    ))}
  </div>
);

export default AssociationDashboard;