// AssociationDashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import { useAuth } from "@/app/providers/AuthProvider";
import styles from "./AssociationDashboard.module.css";

/* ==================== TIPOS ==================== */
type TabType = "dashboard" | "secretaries" | "players" | "quotas" | "transfers" | "reports";

interface AssociationMember {
  id: number;
  user_id: number;
  position: string;
  active: boolean;
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
  user?: {
    id?: number;
    name: string;
    email: string;
  };
  association?: {
    id: number;
    name: string;
  };
  age?: number;
  rating?: number;
  province?: string;
  monthly_fee?: number;
  team?: string;
}

interface Quota {
  id: number;
  player_id: number;
  amount: number;
  status: "paid" | "pending";
  due_date?: string;
  player?: { name: string };
}

// Interface Transfer atualizada
interface Transfer {
  id: number;
  player_id: number;
  from_association_id: number;
  to_association_id: number;
  status: "pending_origin" | "pending_destination" | "approved" | "rejected" | "cancelled";
  reason?: string;
  origin_document?: string;
  dest_document?: string;
  rejection_reason?: string;
  created_at: string;
  player?: { name: string };
  from_association?: { id: number; name: string };
  to_association?: { id: number; name: string };
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

interface AssociationUser {
  id: number;
  name: string;
  email: string;
  roles?: string[] | { name: string }[];
  association_id?: number;
}

/* ==================== HELPERS ==================== */
const getUserRole = (user: AssociationUser | null): "president" | "secretary" => {
  if (!user || !user.roles) return "secretary";
  const roles = user.roles.map((r: any) => (typeof r === "string" ? r : r.name));
  if (roles.includes("association_president") || roles.includes("president")) return "president";
  return "secretary";
};

/* ==================== COMPONENTE PRINCIPAL ==================== */
const AssociationDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const authUser = (user as unknown) as AssociationUser | null;
  const associationId = authUser?.association_id || 1;

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
    if (activeTab !== "dashboard") return;
    const fetchStats = async () => {
      try {
        const [playersRes, quotasRes, transfersRes] = await Promise.all([
          http.get(endpoints.associations.associationPlayers(associationId)),
          http.get("/quotas"),
          http.get("/transfers"),
        ]);
        const players = playersRes.data.data || playersRes.data;
        const quotas = quotasRes.data.data || quotasRes.data;
        const transfers = transfersRes.data.data || transfersRes.data;

        setStats({
          totalPlayers: players.length,
          activePlayers: players.filter((p: Player) => p.active).length,
          pendingQuotas: quotas.filter((q: Quota) => q.status === "pending").length,
          pendingTransfers: transfers.filter((t: Transfer) => t.status === "pending_origin" || t.status === "pending_destination").length,
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
      case "quotas": return <QuotasSection addToast={addToast} role={role} />;
      case "transfers": return <TransfersSection addToast={addToast} role={role} associationId={associationId} />;
      case "reports": return <ReportsSection role={role} />;
      default: return null;
    }
  };

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
              <button key={item.key} className={`${styles.navLink} ${activeTab === item.key ? styles.active : ""}`} onClick={() => { setActiveTab(item.key); setIsSidebarOpen(false); }}>
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
              <div className={styles.avatar}><img src="https://via.placeholder.com/40" alt="User" /></div>
            </div>
          </header>
          <div className={styles.content}>{renderContent()}</div>
          <footer className={styles.footer}><p>© {new Date().getFullYear()} SIFCQA - Associação</p></footer>
        </main>
      </div>

      {showSecretaryModal && <SecretaryModal isOpen={showSecretaryModal} secretary={editingSecretary} associationId={associationId} onClose={() => setShowSecretaryModal(false)} onSuccess={() => { setShowSecretaryModal(false); addToast("success", "Secretário guardado!"); setSecretariesRefreshKey(prev => prev + 1); }} />}
      {showPlayerModal && <PlayerModal isOpen={showPlayerModal} player={editingPlayer} associationId={associationId} onClose={() => setShowPlayerModal(false)} onSuccess={() => { setShowPlayerModal(false); addToast("success", editingPlayer ? "Jogador atualizado!" : "Jogador registado!"); setPlayersRefreshKey(prev => prev + 1); }} />}
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

/* ==================== SECRETÁRIOS (gestão) ==================== */
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

  useEffect(() => { fetchSecretaries(); }, []);

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
      const res = await http.get(
        endpoints.associations.associationPlayers(associationId)
      );
      setPlayers(res.data.data || res.data);
    } catch (err: any) {
      addToast("error", "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlayers(); }, []);

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
    if (!confirm("Tem certeza que deseja eliminar este jogador?")) return;
    try {
      await http.delete(endpoints.players.detail(playerId));
      addToast("success", "Jogador eliminado");
      fetchPlayers();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro ao eliminar");
    }
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
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Associação</th>
              <th>Ativo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>{p.user?.name}</td>
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
                  <button className={styles.actionBtn} onClick={() => onEdit(p)}>
                    Editar
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleToggleActive(p)}>
                    {p.active ? "Suspender" : "Ativar"}
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleDelete(p.id)}>
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

/* ==================== QUOTAS ==================== */
const QuotasSection: React.FC<{ addToast: (type: ToastMessage["type"], msg: string) => void; role: string }> = ({ addToast, role }) => {
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotas = async () => {
    try {
      const res = await http.get("/quotas");
      setQuotas(res.data.data || res.data);
    } catch (err: any) { addToast("error", "Erro ao carregar"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchQuotas(); }, []);

  const handleConfirm = async (quotaId: number) => {
    try {
      await http.post(`/payments/${quotaId}/confirm`);
      addToast("success", "Pagamento confirmado!");
      fetchQuotas();
    } catch (err: any) { addToast("error", err.response?.data?.message || "Erro"); }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <h2>Quotizações</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead><tr><th>Jogador</th><th>Valor (MT)</th><th>Status</th><th>Vencimento</th>{role === "president" && <th>Ações</th>}</tr></thead>
          <tbody>
            {quotas.map((q) => (
              <tr key={q.id}>
                <td>{q.player?.name || `#${q.player_id}`}</td><td>{q.amount}</td>
                <td><span className={`${styles.statusBadge} ${q.status === "paid" ? styles.validated : styles.pending}`}>{q.status === "paid" ? "Pago" : "Pendente"}</span></td>
                <td>{q.due_date || "—"}</td>
                {role === "president" && <td>{q.status === "pending" && <button className={styles.actionBtn} onClick={() => handleConfirm(q.id)}>Confirmar Pagamento</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ==================== TRANSFERÊNCIAS (ATUALIZADO) ==================== */
const TransfersSection: React.FC<{
  addToast: (type: "success" | "error" | "info", msg: string) => void;
  role: string;
  associationId: number;
}> = ({ addToast, associationId }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  const [showOriginApprove, setShowOriginApprove] = useState<Transfer | null>(null);
  const [showReject, setShowReject] = useState<{ transfer: Transfer; type: "origin" | "destination" } | null>(null);

  const fetchTransfers = async () => {
    try {
      // Endpoint hipotético: /associations/{id}/transfers (precisa ser implementado no backend)
      const res = await http.get(`/associations/${associationId}/transfers`);
      setTransfers(res.data.data || res.data);
    } catch (err: any) {
      addToast("error", "Erro ao carregar transferências");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransfers(); }, [associationId]);

  const handleOriginApprove = async (transferId: number, file: File) => {
    const formData = new FormData();
    formData.append("document", file);
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

  const getStatusLabel = (status: Transfer["status"]) => {
    const map: Record<Transfer["status"], string> = {
      pending_origin: "Aguard. Origem",
      pending_destination: "Aguard. Destino",
      approved: "Aprovada",
      rejected: "Rejeitada",
      cancelled: "Cancelada",
    };
    return map[status] || status;
  };

  const getStatusClass = (status: Transfer["status"]) => {
    if (status === "approved") return styles.validated;
    if (status === "rejected" || status === "cancelled") return styles.rejected;
    return styles.pending;
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <h2>Transferências</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Jogador</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => {
              const isOrigin = t.from_association_id === associationId;
              const isDestination = t.to_association_id === associationId;
              const showOriginActions = isOrigin && t.status === "pending_origin";
              const showDestActions = isDestination && t.status === "pending_destination";

              return (
                <tr key={t.id}>
                  <td>{t.player?.name || `#${t.player_id}`}</td>
                  <td>{t.from_association?.name || "—"}</td>
                  <td>{t.to_association?.name || "—"}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${getStatusClass(t.status)}`}>
                      {getStatusLabel(t.status)}
                    </span>
                  </td>
                  <td>{new Date(t.created_at).toLocaleDateString()}</td>
                  <td>
                    {showOriginActions && (
                      <>
                        <button className={styles.actionBtn} onClick={() => setShowOriginApprove(t)}>
                          Aprovar Saída
                        </button>
                        <button className={styles.actionBtn} onClick={() => setShowReject({ transfer: t, type: "origin" })}>
                          Rejeitar Saída
                        </button>
                      </>
                    )}
                    {showDestActions && (
                      <>
                        <button className={styles.actionBtn} onClick={() => handleDestinationApprove(t.id)}>
                          Aprovar Entrada
                        </button>
                        <button className={styles.actionBtn} onClick={() => setShowReject({ transfer: t, type: "destination" })}>
                          Rejeitar Entrada
                        </button>
                      </>
                    )}
                    {!showOriginActions && !showDestActions && "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (secretary) setUserId(String(secretary.user_id)); else setUserId(""); }, [secretary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (secretary) {
        await http.put(`${endpoints.associations.members(associationId)}/${secretary.id}`, { user_id: Number(userId), position: "secretary" });
      } else {
        await http.post(endpoints.associations.storeMember(associationId), { user_id: Number(userId), position: "secretary" });
      }
      onSuccess();
    } catch (err: any) { alert(err.response?.data?.message || "Erro"); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}><h3>{secretary ? "Editar Secretário" : "Novo Secretário"}</h3><button onClick={onClose} className={styles.modalClose}>×</button></div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}><label>ID do Utilizador</label><input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} required /></div>
          </div>
          <div className={styles.modalActions}><button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button><button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Salvando..." : "Guardar"}</button></div>
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

/* ==================== MODAL APROVAÇÃO DE ORIGEM (UPLOAD) ==================== */
const OriginApproveModal: React.FC<{
  transfer: Transfer;
  onClose: () => void;
  onApprove: (transferId: number, file: File) => void;
}> = ({ transfer, onClose, onApprove }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    await onApprove(transfer.id, file);
    setLoading(false);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Aprovar Saída (Documento)</h3>
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Documento obrigatório (PDF ou imagem, máx. 5MB)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setFile(e.target.files?.[0] || null)} required />
            </div>
            <div className={styles.modalActions}>
              <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
              <button type="submit" className={styles.submitButton} disabled={!file || loading}>{loading ? "Enviando..." : "Aprovar"}</button>
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
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} minLength={5} required />
            </div>
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