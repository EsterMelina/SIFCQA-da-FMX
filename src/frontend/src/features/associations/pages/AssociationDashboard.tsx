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
  name: string;
  email?: string;
  birth_date?: string;
  team?: string;
  active: boolean;
  created_at?: string;
}

interface Quota {
  id: number;
  player_id: number;
  amount: number;
  status: "paid" | "pending";
  due_date?: string;
  player?: { name: string };
}

interface Transfer {
  id: number;
  player_id: number;
  from_association: string;
  to_association: string;
  status: "pending" | "approved" | "rejected";
  player?: { name: string };
  created_at?: string;
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

// Interface que reflete os dados reais do utilizador (backend)
interface AssociationUser {
  id: number;
  name: string;
  email: string;
  roles?: string[] | { name: string }[]; // aceita ambos os formatos
  association_id?: number;
}

/* ==================== HELPERS ==================== */
const getUserRole = (user: AssociationUser | null): "president" | "secretary" => {
  if (!user || !user.roles) return "secretary";
  // Extrai os nomes das roles independentemente do formato
  const roles = user.roles.map((r: any) => (typeof r === "string" ? r : r.name));
  if (roles.includes("association_president") || roles.includes("president")) return "president";
  return "secretary";
};

/* ==================== COMPONENTE PRINCIPAL ==================== */
const AssociationDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  // user pode ser null → lança para AssociationUser através de unknown
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
          pendingTransfers: transfers.filter((t: Transfer) => t.status === "pending").length,
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
      case "secretaries": return <SecretariesSection addToast={addToast} associationId={associationId} onEdit={(s) => { setEditingSecretary(s); setShowSecretaryModal(true); }} onCreate={() => { setEditingSecretary(null); setShowSecretaryModal(true); }} />;
      case "players": return <PlayersSection addToast={addToast} associationId={associationId} role={role} onEdit={(p) => { setEditingPlayer(p); setShowPlayerModal(true); }} onCreate={() => { setEditingPlayer(null); setShowPlayerModal(true); }} />;
      case "quotas": return <QuotasSection addToast={addToast} role={role} />;
      case "transfers": return <TransfersSection addToast={addToast} role={role} />;
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

      {showSecretaryModal && <SecretaryModal isOpen={showSecretaryModal} secretary={editingSecretary} associationId={associationId} onClose={() => setShowSecretaryModal(false)} onSuccess={() => { setShowSecretaryModal(false); addToast("success", "Secretário guardado!"); }} />}
      {showPlayerModal && <PlayerModal isOpen={showPlayerModal} player={editingPlayer} associationId={associationId} onClose={() => setShowPlayerModal(false)} onSuccess={() => { setShowPlayerModal(false); addToast("success", "Jogador guardado!"); }} />}
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
      const res = await http.get(endpoints.associations.associationPlayers(associationId));
      setPlayers(res.data.data || res.data);
    } catch (err: any) { addToast("error", "Erro ao carregar"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPlayers(); }, []);

  const handleToggleActive = async (player: Player) => {
    if (!confirm(`Deseja ${player.active ? "suspender" : "ativar"} este jogador?`)) return;
    try {
      await http.patch(endpoints.players.toggleStatus(player.id));
      addToast("success", `Jogador ${player.active ? "suspenso" : "ativado"}`);
      fetchPlayers();
    } catch (err: any) { addToast("error", err.response?.data?.message || "Erro"); }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Jogadores</h2>
        <button className={styles.primaryButton} onClick={onCreate}><span className="material-symbols-outlined">add</span> Registar Jogador</button>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead><tr><th>Nome</th><th>Email</th><th>Equipa</th><th>Ativo</th><th>Ações</th></tr></thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td><td>{p.email || "—"}</td><td>{p.team || "—"}</td>
                <td><span className={`${styles.statusBadge} ${p.active ? styles.active : styles.inactive}`}>{p.active ? "Ativo" : "Inativo"}</span></td>
                <td>
                  <button className={styles.actionBtn} onClick={() => onEdit(p)}>{role === "secretary" ? "Atualizar" : "Editar"}</button>
                  {role === "president" && <button className={styles.actionBtn} onClick={() => handleToggleActive(p)}>{p.active ? "Suspender" : "Ativar"}</button>}
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
      const res = await http.get("/quotas"); // ajustar endpoint
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

/* ==================== TRANSFERÊNCIAS ==================== */
const TransfersSection: React.FC<{ addToast: (type: ToastMessage["type"], msg: string) => void; role: string }> = ({ addToast, role }) => {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    try {
      const res = await http.get("/transfers"); // ajustar
      setTransfers(res.data.data || res.data);
    } catch (err: any) { addToast("error", "Erro ao carregar"); } finally { setLoading(false); }
  };

  useEffect(() => { fetchTransfers(); }, []);

  const handleApprove = async (transferId: number) => {
    try {
      await http.post(`/transfers/${transferId}/approve`); // ajustar rota real
      addToast("success", "Transferência aprovada!");
      fetchTransfers();
    } catch (err: any) { addToast("error", err.response?.data?.message || "Erro"); }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <h2>Transferências</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead><tr><th>Jogador</th><th>Origem</th><th>Destino</th><th>Status</th>{role === "president" && <th>Ações</th>}</tr></thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id}>
                <td>{t.player?.name || `#${t.player_id}`}</td><td>{t.from_association}</td><td>{t.to_association}</td>
                <td><span className={`${styles.statusBadge} ${styles[t.status]}`}>{t.status === "pending" ? "Pendente" : t.status === "approved" ? "Aprovada" : "Rejeitada"}</span></td>
                {role === "president" && <td>{t.status === "pending" && <button className={styles.actionBtn} onClick={() => handleApprove(t.id)}>Aprovar Saída</button>}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ==================== RELATÓRIOS ==================== */
const ReportsSection: React.FC<{ role: string }> = ({ role }) => (
  <div className={styles.pageContainer}>
    <h2>Relatórios {role === "president" ? "da Associação" : "Básicos"}</h2>
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
  const [form, setForm] = useState({ name: "", email: "", team: "", active: true });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (player) setForm({ name: player.name, email: player.email || "", team: player.team || "", active: player.active });
    else setForm({ name: "", email: "", team: "", active: true });
  }, [player]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (player) {
        await http.put(endpoints.players.detail(player.id), form);
      } else {
        await http.post(endpoints.associations.associationPlayers(associationId), form);
      }
      onSuccess();
    } catch (err: any) { alert(err.response?.data?.message || "Erro"); } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}><h3>{player ? "Editar Jogador" : "Registar Jogador"}</h3><button onClick={onClose} className={styles.modalClose}>×</button></div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}><label>Nome *</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className={styles.formGroup}><label>Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className={styles.formGroup}><label>Equipa</label><input value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })} /></div>
            <div className={styles.formGroup}><label><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo</label></div>
          </div>
          <div className={styles.modalActions}><button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button><button type="submit" className={styles.submitButton} disabled={loading}>{loading ? "Salvando..." : "Guardar"}</button></div>
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