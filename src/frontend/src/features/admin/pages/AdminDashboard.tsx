// AdminDashboard.tsx
import React, { useState, useEffect, useCallback } from "react";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import { useAuth } from "@/app/providers/AuthProvider";
import styles from "./AdminDashboard.module.css";

/* ==================== TIPOS ==================== */
type MainMenu =
  | "dashboard"
  | "fmx"
  | "presidente"
  | "utilizadores"
  | "permissoes"
  | "auditoria"
  | "sistema";

interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
  updated_at: string;
  pivot?: any;
}

interface User {
  id: number;
  name: string;
  email: string;
  status?: string;
  roles?: Role[];
}

interface PresidentData {
  id: number;
  user_id: number;
  position: string;
  active: boolean;
  user?: { name: string; email: string };
}

interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface Association {
  id: number;
  name: string;
}

/* ==================== COMPONENTE PRINCIPAL ==================== */
const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();

  const [theme, setTheme] = useState<"light" | "dark" | null>(
    () => localStorage.getItem("theme") as "light" | "dark" | null
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [activeMain, setActiveMain] = useState<MainMenu>("dashboard");

  // Dados globais de utilizadores
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [errorUsers, setErrorUsers] = useState<string | null>(null);

  // Chave para forçar refresh da secção do presidente
  const [presidentRefreshKey, setPresidentRefreshKey] = useState(0);

  // Função partilhada para buscar utilizadores
  const fetchUsers = useCallback(async () => {
    setLoadingUsers(true);
    setErrorUsers(null);
    try {
      const res = await http.get(endpoints.users.base);
      setUsers(res.data.data || res.data);
    } catch (err: any) {
      setErrorUsers("Erro ao carregar utilizadores");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  // Carrega utilizadores na montagem
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Modais
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPresidentModal, setShowPresidentModal] = useState(false);
  const [presidentEditMode, setPresidentEditMode] = useState<"create" | "edit">("create");
  const [currentPresident, setCurrentPresident] = useState<PresidentData | null>(null);

  // ==================== TEMA ====================
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
    localStorage.setItem("theme", theme === null ? "auto" : theme);
  }, [theme]);

  // ==================== TOAST ====================
  const addToast = useCallback((type: ToastMessage["type"], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // ==================== HANDLERS MENU ====================
  const handleMainClick = (key: MainMenu) => {
    if (key === "sistema") return;
    setActiveMain(key);
    setIsSidebarOpen(false);
  };

  // ==================== RENDERIZADOR DE CONTEÚDO ====================
  const renderContent = () => {
    switch (activeMain) {
      case "dashboard":
        return <DashboardContent />;
      case "fmx":
        return <FmxSection addToast={addToast} />;
      case "presidente":
        return (
          <PresidenteSection
            addToast={addToast}
            refreshKey={presidentRefreshKey}
            onOpenCreate={() => {
              setPresidentEditMode("create");
              setCurrentPresident(null);
              setShowPresidentModal(true);
            }}
            onOpenEdit={(p) => {
              setPresidentEditMode("edit");
              setCurrentPresident(p);
              setShowPresidentModal(true);
            }}
          />
        );
      case "utilizadores":
        return (
          <UtilizadoresSection
            users={users}
            setUsers={setUsers}
            loading={loadingUsers}
            error={errorUsers}
            addToast={addToast}
            onOpenCreate={() => {
              setEditingUser(null);
              setShowUserModal(true);
            }}
            onEditUser={(u) => {
              setEditingUser(u);
              setShowUserModal(true);
            }}
          />
        );
      case "permissoes":
        return <PermissoesSection addToast={addToast} />;
      case "auditoria":
        return <AuditoriaSection />;
      case "sistema":
        return <SistemaSection />;
      default:
        return <DashboardContent />;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        {/* Overlay mobile */}
        <div
          className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        {/* Sidebar simples */}
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brandWrapper}>
              <div className={styles.logoIcon}>
                <span className="material-symbols-outlined">shield_person</span>
              </div>
              <div>
                <h1>FMX Direction</h1>
                <p>Admin Panel</p>
              </div>
            </div>
          </div>
          <nav className={styles.nav}>
            {[
              { key: "dashboard", label: "Dashboard", icon: "dashboard" },
              { key: "fmx", label: "FMX", icon: "business" },
              { key: "presidente", label: "Presidente FMX", icon: "badge" },
              { key: "utilizadores", label: "Utilizadores", icon: "group" },
              { key: "permissoes", label: "Permissões", icon: "admin_panel_settings" },
              { key: "auditoria", label: "Auditoria", icon: "receipt_long" },
              { key: "sistema", label: "Sistema", icon: "settings", disabled: true },
            ].map((item) => (
              <button
                key={item.key}
                className={`${styles.navLink} ${activeMain === item.key ? styles.active : ""}`}
                onClick={() => handleMainClick(item.key as MainMenu)}
                disabled={item.disabled}
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

        {/* Main */}
        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.menuButton} onClick={() => setIsSidebarOpen((v) => !v)}>
                <span className="material-symbols-outlined">menu</span>
              </button>
              <span className={styles.systemName}>SIFCQA-FMX</span>
            </div>
            <div className={styles.topbarRight}>
              <button
                className={styles.themeToggle}
                onClick={() =>
                  setTheme((t) => (t === "light" ? "dark" : t === "dark" ? null : "light"))
                }
              >
                <span className="material-symbols-outlined">
                  {theme === "light" ? "light_mode" : theme === "dark" ? "dark_mode" : "routine"}
                </span>
              </button>
              <div className={styles.avatar}>
                <img src="https://via.placeholder.com/40" alt="Admin" />
              </div>
            </div>
          </header>
          <div className={styles.content}>{renderContent()}</div>
          <footer className={styles.footer}>
            <p>© {new Date().getFullYear()} FMX - SIFCQA</p>
          </footer>
        </main>
      </div>

      {/* Modal de utilizador */}
      {showUserModal && (
        <UserModal
          isOpen={showUserModal}
          user={editingUser}
          onClose={() => setShowUserModal(false)}
          onSuccess={() => {
            setShowUserModal(false);
            addToast("success", "Utilizador guardado!");
            fetchUsers();
          }}
        />
      )}
      {/* Modal de presidente */}
      {showPresidentModal && (
        <PresidentModal
          isOpen={showPresidentModal}
          mode={presidentEditMode}
          currentPresident={currentPresident}
          onClose={() => setShowPresidentModal(false)}
          onSuccess={() => {
            setShowPresidentModal(false);
            addToast(
              "success",
              presidentEditMode === "create" ? "Presidente criado" : "Presidente actualizado"
            );
            setPresidentRefreshKey((prev) => prev + 1); // dispara atualização
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

/* ==================== DASHBOARD ==================== */
const DashboardContent: React.FC = () => {
  const metrics = {
    serverLoad: 14.2,
    responseTime: 124,
    activeUsers: 1842,
    securityScore: 96,
  };
  const auditLogs = [
    { id: 1, timestamp: "2024-08-10 14:22", user: "admin.silva", action: "Acesso ao Módulo Financeiro", status: "success" as const },
    { id: 2, timestamp: "2024-08-10 14:15", user: "gestor.marquez", action: "Alteração de Permissões", status: "success" as const },
    { id: 3, timestamp: "2024-08-10 14:02", user: "guest_4522", action: "Falha de Autenticação", status: "blocked" as const },
    { id: 4, timestamp: "2024-08-10 13:55", user: "admin.silva", action: "Backup da Base de Dados", status: "success" as const },
  ];

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
        <div className={`${styles.metricCard} ${styles.darkCard}`}>
          <p className={styles.metricLabel}>Utilizadores Ativos</p>
          <h3 className={styles.metricValue}>{metrics.activeUsers.toLocaleString()} <span>sessões agora</span></h3>
          <div className={styles.chartBars}>
            {[0.5, 0.66, 0.83, 1, 0.75, 0.33].map((h, i) => (
              <div key={i} className={styles.chartBar}>
                <div className={styles.barFill} style={{ height: `${h * 100}%` }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div>
          <div className={styles.sectionHeader}>
            <h4>Registos de Auditoria Recentes</h4>
            <button className={styles.exportButton}>Exportar Logs CSV</button>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead><tr><th>Timestamp</th><th>Utilizador</th><th>Acção</th><th>Status</th></tr></thead>
              <tbody>
                {auditLogs.map(log => (
                  <tr key={log.id}>
                    <td>{log.timestamp}</td><td>{log.user}</td><td>{log.action}</td>
                    <td><span className={log.status === "success" ? styles.statusSuccess : styles.statusError}>
                      <span className={styles.statusDot}></span>{log.status === "success" ? "Sucesso" : "Bloqueado"}
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
              <div className={styles.infraLeft}><span className="material-symbols-outlined">storage</span><div><p>Core Database</p><p>MySQL 8.0 Cluster</p></div></div>
              <div className={styles.infraStatus}><p className={styles.online}>ONLINE</p><p>Uptime: 99.9%</p></div>
            </div>
            <div className={styles.infraItem}>
              <div className={styles.infraLeft}><span className="material-symbols-outlined">cloud_done</span><div><p>API Gateway</p><p>Nginx Proxy</p></div></div>
              <div className={styles.infraStatus}><p className={styles.online}>ONLINE</p><p>Uptime: 100%</p></div>
            </div>
            <div className={`${styles.infraItem} ${styles.warning}`}>
              <div className={styles.infraLeft}><span className="material-symbols-outlined">sd_card_alert</span><div><p>Storage de Relatórios</p><p>Capacidade 92%</p></div></div>
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

/* ==================== SEÇÕES ==================== */
const FmxSection: React.FC<{ addToast: (type: ToastMessage["type"], msg: string) => void }> = ({ addToast }) => {
  const [fmxData, setFmxData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", contact_email: "", phone: "", address: "" });
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");

  const fetchFmx = async () => {
    try {
      const res = await http.get("/admin/fmx");
      setFmxData(res.data);
      setForm({
        name: res.data.name || "",
        contact_email: res.data.contact_email || "",
        phone: res.data.phone || "",
        address: res.data.address || "",
      });
      setMode(res.data ? "view" : "create");
    } catch {
      addToast("error", "Erro ao carregar FMX");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFmx(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if (!fmxData) {
        await http.post("/admin/fmx", form);
      } else {
        await http.put("/admin/fmx", form);
      }
      addToast("success", fmxData ? "FMX actualizada" : "FMX criada");
      fetchFmx();
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro");
    } finally { setSaving(false); }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>FMX</h2>
        {fmxData && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className={styles.outlineButton} onClick={() => setMode("view")}>Ver</button>
            <button className={styles.outlineButton} onClick={() => setMode("edit")}>Editar</button>
          </div>
        )}
      </div>
      {mode === "view" && fmxData ? (
        <div className={styles.cardInfo}>
          <p><strong>Nome:</strong> {fmxData.name}</p>
          <p><strong>Email:</strong> {fmxData.contact_email}</p>
          <p><strong>Telefone:</strong> {fmxData.phone || "-"}</p>
          <p><strong>Morada:</strong> {fmxData.address || "-"}</p>
        </div>
      ) : (
        <form onSubmit={handleSave}>
          <div className={styles.formGroup}><label>Nome</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
          <div className={styles.formGroup}><label>Email de contacto</label><input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} required /></div>
          <div className={styles.formGroup}><label>Telefone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className={styles.formGroup}><label>Morada</label><input value={form.address} onChange={e => setForm({...form, address: e.target.value})} /></div>
          <div className={styles.modalActions}><button type="submit" className={styles.submitButton} disabled={saving}>{saving ? "Salvando..." : "Guardar"}</button></div>
        </form>
      )}
    </div>
  );
};

const PresidenteSection: React.FC<{
  addToast: (type: ToastMessage["type"], msg: string) => void;
  refreshKey: number;
  onOpenCreate: () => void;
  onOpenEdit: (president: PresidentData) => void;
}> = ({ addToast, refreshKey, onOpenCreate, onOpenEdit }) => {
  const [president, setPresident] = useState<PresidentData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPresident = async () => {
    setLoading(true);
    try {
      const res = await http.get("/admin/fmx/staff?position=Presidente");
      const list = res.data.data || res.data;
      setPresident(list.length > 0 ? list[0] : null);
    } catch {
      addToast("error", "Erro ao carregar presidente");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchPresident();
  }, [refreshKey]); // <-- recarrega quando a chave muda

  const handleSuspend = async () => {
    if (!president) return;
    if (!confirm("Tem certeza que deseja suspender o presidente?")) return;
    try {
      await http.patch(`/admin/fmx/staff/${president.id}/status`, { active: false });
      addToast("success", "Presidente suspenso");
      fetchPresident();
    } catch (err: any) { addToast("error", err.response?.data?.message || "Erro"); }
  };

  if (loading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={styles.pageContainer}>
      <h2>Presidente FMX</h2>
      {president ? (
        <div className={styles.cardInfo}>
          <div className={styles.cardHeader}>
            <div>
              <span className="material-symbols-outlined" style={{ fontSize: "3rem", color: "var(--color-primary)" }}>badge</span>
              <h3>{president.user?.name || "N/A"}</h3>
              <p className={styles.cardSubtitle}>{president.user?.email}</p>
            </div>
            <span className={president.active ? styles.statusActive : styles.statusInactive}>
              {president.active ? "Ativo" : "Inativo"}
            </span>
          </div>
          <div className={styles.cardActions}>
            <button className={styles.outlineButton} onClick={() => onOpenEdit(president)}>
              Alterar Presidente
            </button>
            <button className={styles.dangerButton} onClick={handleSuspend}>
              Suspender Presidente
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p>Nenhum presidente atribuído.</p>
          <button className={styles.addButton} onClick={onOpenCreate}>
            Criar Presidente
          </button>
        </div>
      )}
    </div>
  );
};

const UtilizadoresSection: React.FC<{
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  loading: boolean;
  error: string | null;
  addToast: (type: ToastMessage["type"], msg: string) => void;
  onOpenCreate: () => void;
  onEditUser: (user: User) => void;
}> = ({ users, setUsers, loading, error, addToast, onOpenCreate, onEditUser }) => {
  const [search, setSearch] = useState("");

  const filtered = search
    ? users.filter(
        (u) =>
          u.name?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  const handleDelete = async (id: number) => {
    if (!confirm("Eliminar utilizador?")) return;
    try {
      await http.delete(`${endpoints.users.base}/${id}`);
      addToast("success", "Eliminado");
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro");
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "inactive" : "active";
    try {
      await http.patch(`${endpoints.users.base}/${user.id}/status`, { status: newStatus });
      addToast("success", "Status alterado");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro");
    }
  };

  const getRoleNames = (user: User) => {
    return user.roles ? user.roles.map((r) => r.name).join(", ") : "—";
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.pageHeader}>
        <h2>Utilizadores</h2>
        <button className={styles.addButton} onClick={onOpenCreate}>
          Criar utilizador
        </button>
      </div>
      <div className={styles.filters}>
        <input
          placeholder="Pesquisar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading && <div className={styles.loading}>Carregando...</div>}
      {error && <div className={styles.error}>{error}</div>}
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
            {filtered.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{getRoleNames(u)}</td>
                <td>
                  <span className={u.status === "active" ? styles.statusActive : styles.statusInactive}>
                    {u.status === "active" ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td>
                  <button className={styles.actionBtn} onClick={() => onEditUser(u)}>
                    Editar
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleToggleStatus(u)}>
                    {u.status === "active" ? "Desativar" : "Ativar"}
                  </button>
                  <button className={styles.actionBtn} onClick={() => handleDelete(u.id)}>
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

const PermissoesSection: React.FC<{ addToast: (type: ToastMessage["type"], msg: string) => void }> = ({ addToast }) => {
  const roles = ["admin", "fmx", "association", "player"];
  const [selectedRole, setSelectedRole] = useState("admin");
  const [usersByRole, setUsersByRole] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUsersByRole = async (role: string) => {
    setLoading(true);
    try {
      const res = await http.get(`${endpoints.users.base}?role=${role}`);
      setUsersByRole(res.data.data || res.data);
    } catch {
      addToast("error", "Erro ao carregar utilizadores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersByRole(selectedRole);
  }, [selectedRole]);

  const handleChange = async (userId: number, newRole: string) => {
    try {
      await http.patch(`${endpoints.users.base}/${userId}/role`, { role: newRole });
      addToast("success", "Função alterada");
      fetchUsersByRole(selectedRole);
    } catch (err: any) {
      addToast("error", err.response?.data?.message || "Erro");
    }
  };

  return (
    <div className={styles.pageContainer}>
      <h2>Permissões</h2>
      <div className={styles.filters}>
        <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button onClick={() => fetchUsersByRole(selectedRole)} className={styles.outlineButton}>
          Actualizar
        </button>
      </div>
      {loading && <div className={styles.loading}>Carregando...</div>}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Função Actual</th>
              <th>Nova Função</th>
            </tr>
          </thead>
          <tbody>
            {usersByRole.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.roles?.[0]?.name ?? "—"}</td>
                <td>
                  <select
                    value={u.roles?.[0]?.name || "player"}
                    onChange={(e) => handleChange(u.id, e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AuditoriaSection: React.FC = () => {
  const logs = [
    { id: 1, timestamp: "2024-08-10 10:20", user: "admin", action: "Login", entity: "Sistema", status: "success" },
    { id: 2, timestamp: "2024-08-10 09:55", user: "presidente", action: "Criou jogador", entity: "Jogador #44", status: "success" },
  ];
  return (
    <div className={styles.pageContainer}>
      <h2>Auditoria</h2>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Utilizador</th>
              <th>Acção</th>
              <th>Entidade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.timestamp}</td>
                <td>{l.user}</td>
                <td>{l.action}</td>
                <td>{l.entity}</td>
                <td>
                  <span className={l.status === "success" ? styles.statusSuccess : styles.statusError}>
                    {l.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SistemaSection: React.FC = () => (
  <div className={styles.pageContainer}>
    <h2>Sistema</h2>
    <div className={styles.placeholder}>
      <span className="material-symbols-outlined">construction</span>
      <p>Em desenvolvimento</p>
    </div>
  </div>
);

/* ==================== MODAIS ==================== */
const UserModal: React.FC<{
  isOpen: boolean;
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, user, onClose, onSuccess }) => {
  const isEdit = !!user;

  const [form, setForm] = useState({ name: "", email: "", role: "association" });
  const [associationId, setAssociationId] = useState<number | "">("");
  const [position, setPosition] = useState<string>("Secretário");
  const [associations, setAssociations] = useState<Association[]>([]);
  const [loadingAssoc, setLoadingAssoc] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (user) {
        const currentRole = user.roles?.[0]?.name || "association";
        setForm({
          name: user.name,
          email: user.email,
          role: currentRole,
        });
        fetchAssociations();
        setAssociationId("");
        setPosition("Secretário");
      } else {
        setForm({ name: "", email: "", role: "association" });
        setAssociationId("");
        setPosition("Secretário");
      }
    }
  }, [isOpen, user]);

  const fetchAssociations = async () => {
    setLoadingAssoc(true);
    try {
      const res = await http.get("/admin/associations");
      setAssociations(res.data.data || res.data);
    } catch {
      // silencioso
    } finally {
      setLoadingAssoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        name: form.name,
        email: form.email,
        role: form.role,
      };

      if (isEdit) {
        if (form.role === "association") {
          if (associationId) payload.association_id = Number(associationId);
          payload.position = position;
        } else if (form.role === "fmx") {
          payload.cargo = "Secretário";
        }
        await http.put(`${endpoints.users.base}/${user!.id}`, payload);
      } else {
        await http.post(endpoints.users.base, payload);
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
          <h3>{isEdit ? "Editar Utilizador" : "Novo Utilizador"}</h3>
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Nome</label>
              <input
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
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label>Função</label>
              <select
                value={form.role}
                onChange={(e) => {
                  setForm({ ...form, role: e.target.value });
                  if (isEdit) {
                    setAssociationId("");
                    setPosition("Secretário");
                  }
                }}
                required
              >
                <option value="association">Associação</option>
                <option value="fmx">FMX</option>
              </select>
            </div>

            {isEdit && form.role === "association" && (
              <>
                <div className={styles.formGroup}>
                  <label>Associação</label>
                  {loadingAssoc ? (
                    <select disabled><option>Carregando...</option></select>
                  ) : (
                    <select
                      value={associationId}
                      onChange={(e) => setAssociationId(e.target.value ? Number(e.target.value) : "")}
                    >
                      <option value="">Selecione uma associação</option>
                      {associations.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className={styles.formGroup}>
                  <label>Position</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                  >
                    <option value="Presidente">Presidente</option>
                    <option value="Secretário">Secretário</option>
                  </select>
                </div>
              </>
            )}

            {isEdit && form.role === "fmx" && (
              <div className={styles.formGroup}>
                <label>Cargo</label>
                <select value="Secretário" disabled>
                  <option>Secretário</option>
                </select>
              </div>
            )}
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

const PresidentModal: React.FC<{
  isOpen: boolean;
  mode: "create" | "edit";
  currentPresident: PresidentData | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, mode, currentPresident, onClose, onSuccess }) => {
  const [form, setForm] = useState({ user_id: "", position: "Presidente", active: true });
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await http.get(endpoints.users.base);
        setAvailableUsers(res.data.data || res.data);
      } catch {}
    };
    if (isOpen) fetchUsers();
  }, [isOpen]);

  useEffect(() => {
    if (mode === "edit" && currentPresident) {
      setForm({
        user_id: String(currentPresident.user_id),
        position: currentPresident.position,
        active: currentPresident.active,
      });
    } else {
      setForm({ user_id: "", position: "Presidente", active: true });
    }
  }, [mode, currentPresident]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, user_id: Number(form.user_id) };
      if (mode === "create") {
        await http.post("/fmx/staff", payload);
      } else {
        await http.put(`/fmx/staff/${currentPresident?.id}`, payload);
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
          <h3>{mode === "create" ? "Criar Presidente" : "Alterar Presidente"}</h3>
          <button onClick={onClose} className={styles.modalClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Utilizador</label>
              <select value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required>
                <option value="">Selecione um utilizador</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Cargo</label>
              <input value={form.position} disabled />
            </div>
            <div className={styles.formGroup}>
              <label>
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Ativo
              </label>
            </div>
          </div>
          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>Cancelar</button>
            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "Salvando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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

export default AdminDashboard;