// PlayerDashboard.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./PlayerDashboard.module.css";
import { useAuth } from "@/app/providers/AuthProvider";

type TabType = "profile" | "quotas" | "history" | "notifications" | "transfer";

// ---- Tipos actualizados para Quotas e Pagamentos ----
interface QuotaInstallment {
  number: number;
  label: string;
  amount: number;
  status: "not_submitted" | "pending" | "confirmed" | "rejected";
  payment?: any;
}

interface PlayerQuota {
  id: number;
  title: string;
  total_amount: number;
  status: string;
  due_date?: string;
  installments?: {
    total: number;
    amount_each: number;
    next_number?: number;
    can_pay: boolean;
    detail: QuotaInstallment[];
  };
  player?: { name: string };
  association?: { id: number; name: string };
}

interface PlayerPayment {
  id: number;
  quota_id: number;
  installment_number: number;
  label?: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  created_at?: string;
  quota_title?: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  icon: string;
  iconColor: string;
  highlight?: boolean;
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
  status: "pending_origin" | "pending_destination" | "approved" | "rejected" | "cancelled";
  reason: string;
  origin_document?: string;
  dest_document?: string;
  rejection_reason?: string;
  created_at: string;
  to_association?: { id: number; name: string };
  from_association?: { id: number; name: string };
  documents?: TransferDoc[];
}

// Mapa de tradução de status para ortografia antiga
const statusTranslationMap: Record<string, string> = {
  active: "activo",
  Active: "Activo",
  Ativa: "Activa",
  ativa: "activa",
  pending: "pendente",
  Pending: "Pendente",
  confirmed: "confirmado",
  Confirmed: "Confirmado",
  rejected: "rejeitado",
  Rejected: "Rejeitado",
  cancelled: "cancelada",
  Cancelled: "Cancelada",
  not_submitted: "não submetida",
  paid: "paga",
  Paid: "Paga",
};

const translateStatus = (status: string | undefined): string => {
  if (!status) return "—";
  return statusTranslationMap[status] ?? status;
};

const PlayerDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    return saved ?? null;
  });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [playerData, setPlayerData] = useState({
    name: "",
    birthDate: "",
    birthPlace: "",
    association: "",
    category: "",
    license: "",
    licenseStatus: "",
    licenseValidUntil: "",
    playerId: "",
    fromAssociationId: null as number | null,
  });

  const [stats] = useState({
    yearsAffiliated: 14,
    nationalTitles: 3,
    financialAttendance: "100%",
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [transferForm, setTransferForm] = useState({
    targetAssociation: "",
    reason: "",
  });

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [activeTransfer, setActiveTransfer] = useState<Transfer | null>(null);

  // Estado para o visualizador de documento
  const [documentViewer, setDocumentViewer] = useState<{
    url: string;
    originalName: string;
    mimeType: string;
  } | null>(null);

  // Tema
  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    root.classList.toggle("dark", isDark);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => {
      if (prev === "light") return "dark";
      if (prev === "dark") return null;
      return "light";
    });
  };

  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);
  const closeSidebar = () => setIsSidebarOpen(false);

  useEffect(() => {
    const loadPlayer = async () => {
      setProfileLoaded(false);
      try {
        const { data } = await http.get("/players/me");
        setPlayerData({
          playerId: data.id,
          fromAssociationId: data.association_id,
          name: data.name,
          association: data.association?.name || data.association_name,
          birthDate: data.birth_date || "12 de Maio de 2002",
          birthPlace: data.birth_place || "Maputo, MZ",
          category: data.category || "Sénior Profissional",
          license: data.license || "MT-98234-X",
          licenseStatus: translateStatus(data.license_status) || "Activa",
          licenseValidUntil:
            data.license_valid_until || "31 de Dezembro de 2024",
        });
        setProfileLoaded(true);
      } catch (err) {
        console.error("Erro ao carregar dados do jogador", err);
        setError(
          "Não foi possível carregar o seu perfil. Recarregue a página."
        );
        setProfileLoaded(false);
      }
    };
    loadPlayer();
  }, []);

  useEffect(() => {
    if (!playerData.playerId) return;
    const fetchTransfers = async () => {
      try {
        const { data } = await http.get(
          `/players/${playerData.playerId}/transfers`
        );
        setTransfers(data);
        const active = data.find(
          (t: Transfer) =>
            t.status === "pending_origin" || t.status === "pending_destination"
        );
        setActiveTransfer(active || null);
      } catch (err) {
        console.error("Erro ao carregar transferências", err);
      }
    };
    fetchTransfers();
  }, [playerData.playerId]);

  const handleLogout = async () => {
    await logout();
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileLoaded || playerData.fromAssociationId === null) {
      alert("Ainda estamos a carregar os seus dados. Aguarde um instante.");
      return;
    }
    if (!transferForm.targetAssociation) {
      alert("Seleccione a associação de destino.");
      return;
    }
    if (!transferForm.reason || transferForm.reason.trim().length < 10) {
      alert("O motivo deve ter pelo menos 10 caracteres.");
      return;
    }

    const formData = new FormData();
    formData.append("player_id", playerData.playerId);
    formData.append(
      "from_association_id",
      String(playerData.fromAssociationId)
    );
    formData.append("to_association_id", transferForm.targetAssociation);
    formData.append("reason", transferForm.reason);

    try {
      await http.post(endpoints.players.transferRequest, formData);
      alert("Solicitação de transferência enviada com sucesso!");
      setShowTransferModal(false);
      setTransferForm({ targetAssociation: "", reason: "" });
      const { data } = await http.get(
        `/players/${playerData.playerId}/transfers`
      );
      setTransfers(data);
      const active = data.find(
        (t: Transfer) =>
          t.status === "pending_origin" || t.status === "pending_destination"
      );
      setActiveTransfer(active || null);
    } catch (error: any) {
      console.error("Erro ao enviar transferência:", error);
      alert("Erro ao enviar solicitação.");
    }
  };

  const handleCancelTransfer = async (transferId: number) => {
    if (!confirm("Tem certeza que deseja cancelar esta solicitação?")) return;
    try {
      await http.patch(`/transfers/${transferId}/cancel`);
      alert("Solicitação cancelada com sucesso!");
      const { data } = await http.get(
        `/players/${playerData.playerId}/transfers`
      );
      setTransfers(data);
      setActiveTransfer(null);
    } catch (error) {
      console.error("Erro ao cancelar transferência", error);
      alert("Não foi possível cancelar a solicitação.");
    }
  };

  // Função para abrir o visualizador de documento
  const openDocumentViewer = (doc: TransferDoc) => {
    setDocumentViewer({
      url: doc.url,
      originalName: doc.original_name || doc.type,
      mimeType: doc.mime_type,
    });
  };

  const closeDocumentViewer = () => {
    setDocumentViewer(null);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileContent player={playerData} stats={stats} />;
      case "quotas":
        return <QuotasContent />;
      case "history":
        return <HistoryContent />;
      case "notifications":
        return <NotificationsContent />;
      case "transfer":
        return (
          <TransferContent
            onOpenModal={() => setShowTransferModal(true)}
            activeTransfer={activeTransfer}
            onCancelTransfer={handleCancelTransfer}
            transfers={transfers}
            onViewDocument={openDocumentViewer}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <div
          className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`}
          onClick={closeSidebar}
        />
        <aside
          className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}
        >
          <div className={styles.sidebarHeader}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <span className="material-symbols-outlined">sports_soccer</span>
              </div>
              <div>
                <h1>SIFCQA-FMX</h1>
                <p>Direcção FMX</p>
              </div>
            </div>
          </div>
          <nav className={styles.nav}>
            <button
              onClick={() => {
                setActiveTab("profile");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "profile" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">person</span>
              <span>O Meu Perfil</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("quotas");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "quotas" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">receipt_long</span>
              <span>Minhas Quotas</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "history" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">history</span>
              <span>Histórico de Pagamentos</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("notifications");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "notifications" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">notifications</span>
              <span>Notificações</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("transfer");
                closeSidebar();
              }}
              className={`${styles.navLink} ${activeTab === "transfer" ? styles.active : ""}`}
            >
              <span className="material-symbols-outlined">swap_horiz</span>
              <span>Transferência</span>
            </button>
          </nav>
          <div className={styles.sidebarFooter}>
            <button
              className={styles.primaryButton}
              style={{ width: "100%" }}
              onClick={() => {
                setActiveTab("quotas");
                closeSidebar();
              }}
            >
              <span className="material-symbols-outlined">payments</span>
              Ver Quotas
            </button>
            <div className={styles.footerLinks}>
              <button className={styles.footerLink}>
                <span className="material-symbols-outlined">settings</span>
                Definições
              </button>
              <button className={styles.footerLink} onClick={handleLogout}>
                <span className="material-symbols-outlined">logout</span>
                Sair
              </button>
            </div>
          </div>
        </aside>

        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.menuButton} onClick={toggleSidebar}>
                <span className="material-symbols-outlined">menu</span>
              </button>
              <span className={styles.systemName}>Perfil do Atleta</span>
            </div>
            <div className={styles.topbarRight}>
              <button
                className={styles.iconButton}
                onClick={() => setShowNotificationsModal(true)}
              >
                <span className="material-symbols-outlined">notifications</span>
                <span className={styles.notificationBadge}></span>
              </button>
              <button className={styles.themeToggle} onClick={toggleTheme}>
                <span className="material-symbols-outlined">
                  {theme === "light"
                    ? "dark_mode"
                    : theme === "dark"
                      ? "light_mode"
                      : "routine"}
                </span>
              </button>
              <div
                className={styles.avatar}
                onClick={() => setShowProfileModal(true)}
              >
                <img src="https://via.placeholder.com/40" alt="Avatar" />
              </div>
            </div>
          </header>
          <div className={styles.content}>{renderContent()}</div>
        </main>
      </div>

      <NotificationsModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
      />
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        player={playerData}
        onLogout={handleLogout}
      />
      <TransferModal
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        form={transferForm}
        setForm={setTransferForm}
        onSubmit={handleTransferSubmit}
        profileLoaded={profileLoaded}
        disabled={!!activeTransfer}
      />
      {documentViewer && (
        <DocumentViewerModal
          url={documentViewer.url}
          originalName={documentViewer.originalName}
          mimeType={documentViewer.mimeType}
          onClose={closeDocumentViewer}
        />
      )}
    </div>
  );
};

// ---- QuotasContent (mantido igual, mas com ortografia ajustada nos labels) ----
const QuotasContent: React.FC = () => {
  const [quotas, setQuotas] = useState<PlayerQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotas = async () => {
    try {
      setLoading(true);
      const { data } = await http.get("/player/quotas");
      setQuotas(data.data || data);
      setError(null);
    } catch (err: any) {
      setError("Erro ao carregar quotas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotas();
  }, []);

  const [selectedQuota, setSelectedQuota] = useState<PlayerQuota | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payInstallment, setPayInstallment] =
    useState<QuotaInstallment | null>(null);

  const handleViewDetails = async (quotaId: number) => {
    try {
      const { data } = await http.get(`/player/quotas/${quotaId}`);
      const quotaDetail = data.data || data;
      setSelectedQuota(quotaDetail);
      setShowDetailModal(true);
    } catch (err) {
      alert("Erro ao carregar detalhes da quota.");
    }
  };

  const handlePayClick = (installment: QuotaInstallment) => {
    setPayInstallment(installment);
    setShowPayModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPayModal(false);
    setShowDetailModal(false);
    fetchQuotas();
  };

  if (loading)
    return <div className={styles.loading}>Carregando quotas...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.pageContainer}>
      <h2>Minhas Quotas</h2>
      {quotas.length === 0 ? (
        <p className={styles.infoText}>Nenhuma quota encontrada.</p>
      ) : (
        <div className={styles.quotaCards}>
          {quotas.map((q) => (
            <div key={q.id} className={styles.quotaCard}>
              <div className={styles.quotaCardInfo}>
                <h3>{q.title}</h3>
                <p>
                  Valor total: <strong>{q.total_amount} MT</strong>
                </p>
                <p>
                  Estado:{" "}
                  <span
                    className={`${styles.statusBadge} ${q.status === "paid" ? styles.validated : styles.pending}`}
                  >
                    {translateStatus(q.status)}
                  </span>
                </p>
                {q.due_date && <p>Vence: {q.due_date}</p>}
                {q.installments && (
                  <p>
                    Prestações: {q.installments.total}x de{" "}
                    {q.installments.amount_each} MT
                  </p>
                )}
              </div>
              <button
                className={styles.secondaryButton}
                onClick={() => handleViewDetails(q.id)}
              >
                Ver detalhes
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedQuota && showDetailModal && (
        <QuotaDetailModal
          quota={selectedQuota}
          onClose={() => setShowDetailModal(false)}
          onPayInstallment={handlePayClick}
        />
      )}
      {showPayModal && payInstallment && selectedQuota && (
        <PayInstallmentModal
          quotaId={selectedQuota.id}
          installment={payInstallment}
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

const QuotaDetailModal: React.FC<{
  quota: PlayerQuota;
  onClose: () => void;
  onPayInstallment: (inst: QuotaInstallment) => void;
}> = ({ quota, onClose, onPayInstallment }) => {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Detalhes da Quota</h3>
          <button onClick={onClose} className={styles.modalClose}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <h4>{quota.title}</h4>
          <p>
            Total: <strong>{quota.total_amount} MT</strong>
          </p>
          <p>Estado: {translateStatus(quota.status)}</p>
          {quota.installments && (
            <div className={styles.installmentList}>
              <h4>Prestações</h4>
              {quota.installments.detail.map((inst) => {
                const canPay =
                  inst.number === quota.installments?.next_number &&
                  quota.installments.can_pay;
                return (
                  <div key={inst.number} className={styles.installmentItem}>
                    <div>
                      <span>{inst.label}</span>
                      <span> – {inst.amount} MT</span>
                    </div>
                    <div>
                      <span
                        className={`${styles.statusBadge} ${
                          inst.status === "confirmed"
                            ? styles.validated
                            : inst.status === "pending"
                              ? styles.pending
                              : inst.status === "rejected"
                                ? styles.rejected
                                : styles.inactive
                        }`}
                      >
                        {translateStatus(inst.status)}
                      </span>
                      {canPay && (
                        <button
                          className={styles.payButton}
                          onClick={() => onPayInstallment(inst)}
                        >
                          Pagar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className={styles.modalActions}>
            <button onClick={onClose} className={styles.cancelButton}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PayInstallmentModal: React.FC<{
  quotaId: number;
  installment: QuotaInstallment;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ quotaId, installment, onClose, onSuccess }) => {
  const [method, setMethod] = useState("mpesa");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) {
      setError("Seleccione o método de pagamento.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await http.post(`/player/quotas/${quotaId}/pay`, {
        amount: installment.amount,
        method,
        reference: reference || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Erro ao processar pagamento."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Pagar {installment.label}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Valor (fixo)</label>
              <input
                type="text"
                value={`${installment.amount} MT`}
                disabled
                className={styles.readonly}
              />
            </div>
            <div className={styles.formGroup}>
              <label>Método de pagamento *</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                required
              >
                <option value="mpesa">M-Pesa</option>
                <option value="transfer">Transferência Bancária</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Referência (opcional)</label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: TXN-ABC123"
              />
            </div>
            {error && <p className={styles.fieldError}>{error}</p>}
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelButton}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Enviando..." : "Confirmar Pagamento"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

const HistoryContent: React.FC = () => {
  const [payments, setPayments] = useState<PlayerPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const { data } = await http.get("/player/payments");
      setPayments(data.data || data);
      setError(null);
    } catch (err: any) {
      setError("Erro ao carregar histórico de pagamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmado";
      case "pending":
        return "Pendente";
      case "rejected":
        return "Rejeitado";
      default:
        return translateStatus(status);
    }
  };

  const getStatusClass = (status: string) => {
    if (status === "confirmed") return styles.validated;
    if (status === "pending") return styles.pending;
    return styles.rejected;
  };

  if (loading)
    return <div className={styles.loading}>Carregando histórico...</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.pageContainer}>
      <h2>Histórico de Pagamentos</h2>
      {payments.length === 0 ? (
        <p className={styles.infoText}>Nenhum pagamento registado.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Quota</th>
                <th>Prestação</th>
                <th>Valor</th>
                <th>Método</th>
                <th>Estado</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td>{p.quota_title || `#${p.quota_id}`}</td>
                  <td>{p.label || `Prestação ${p.installment_number}`}</td>
                  <td>{p.amount} MT</td>
                  <td>{p.method}</td>
                  <td>
                    <span
                      className={`${styles.statusBadge} ${getStatusClass(p.status)}`}
                    >
                      {getStatusLabel(p.status)}
                    </span>
                  </td>
                  <td>
                    {p.created_at
                      ? new Date(p.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const NotificationsContent: React.FC = () => {
  const notifications: Notification[] = [
    {
      id: 1,
      title: "Convocatória para Treinos Provinciais",
      message:
        "A Federação Moçambicana convoca todos os atletas da categoria Sénior para a sessão de treinos no dia 12 de Junho.",
      time: "Há 2 horas",
      icon: "calendar_month",
      iconColor: "primary",
      highlight: true,
    },
    {
      id: 2,
      title: "Novo Regulamento de Antidopagem",
      message:
        "Aceda à área de documentos para ler a nova directiva institucional sobre controlo de substâncias.",
      time: "Há 1 dia",
      icon: "campaign",
      iconColor: "tertiary",
    },
  ];
  return (
    <div className={styles.pageContainer}>
      <h2>Notificações</h2>
      <div className={styles.notificationListFull}>
        {notifications.map((n) => (
          <div key={n.id} className={styles.notificationItem}>
            <div
              className={`${styles.notificationIcon} ${styles[n.iconColor]}`}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {n.icon}
              </span>
            </div>
            <div>
              <h5>{n.title}</h5>
              <p>{n.message}</p>
              <span>{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfileContent: React.FC<{ player: any; stats: any }> = ({
  player,
  stats,
}) => (
  <div className={styles.profileGrid}>
    <div className={styles.profileCard}>
      <div className={styles.profileImageWrapper}>
        <img src="https://via.placeholder.com/150" alt="Profile" />
      </div>
      <div className={styles.profileInfo}>
        <span className={styles.badge}>Atleta Federado</span>
        <h3>{player.name}</h3>
        <p>
          Nascido em {player.birthDate} — {player.birthPlace}
        </p>
        <div className={styles.profileDetails}>
          <div>
            <span>Associação</span>
            <span>{player.association}</span>
          </div>
          <div>
            <span>Categoria</span>
            <span>{player.category}</span>
          </div>
          <div>
            <span>Licença</span>
            <span>{player.license}</span>
          </div>
        </div>
      </div>
    </div>
    <div className={styles.licenseCard}>
      <div className={styles.licenseHeader}>
        <span
          className="material-symbols-outlined"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          verified_user
        </span>
        <span className={styles.season}>Época 2024</span>
      </div>
      <div className={styles.licenseBody}>
        <p>Estado da Licença</p>
        <h4>{player.licenseStatus}</h4>
        <p>Válida até {player.licenseValidUntil}</p>
      </div>
      <button onClick={() => console.log("Ver Cartão Digital")}>
        Ver Cartão Digital
      </button>
    </div>
    <div className={styles.statsCard}>
      <h4>Estatísticas Institucionais</h4>
      <div>
        <span>{stats.yearsAffiliated}</span>
        <span>Anos de Filiação</span>
      </div>
      <div>
        <span>{stats.nationalTitles.toString().padStart(2, "0")}</span>
        <span>Títulos Nacionais</span>
      </div>
      <div>
        <span>{stats.financialAttendance}</span>
        <span>Assiduidade Financeira</span>
      </div>
    </div>
  </div>
);

const TransferContent: React.FC<{
  onOpenModal: () => void;
  activeTransfer: Transfer | null;
  onCancelTransfer: (id: number) => void;
  transfers: Transfer[];
  onViewDocument: (doc: TransferDoc) => void;
}> = ({
  onOpenModal,
  activeTransfer,
  onCancelTransfer,
  transfers,
  onViewDocument,
}) => {
  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_origin":
        return "Aguardando origem";
      case "pending_destination":
        return "Aguardando destino";
      case "approved":
        return "Aprovada";
      case "rejected":
        return "Rejeitada";
      case "cancelled":
        return "Cancelada";
      default:
        return translateStatus(status);
    }
  };
  const getStatusClass = (status: string) => {
    if (status === "approved") return styles.validated;
    if (status === "rejected" || status === "cancelled")
      return styles.rejected;
    return styles.pending;
  };

  return (
    <div className={styles.pageContainer}>
      <h2>Transferências</h2>
      {activeTransfer ? (
        <div className={styles.activeTransferCard}>
          <div className={styles.activeTransferHeader}>
            <span
              className={`${styles.statusBadge} ${getStatusClass(activeTransfer.status)}`}
            >
              {getStatusLabel(activeTransfer.status)}
            </span>
            <button
              className={styles.dangerButton}
              onClick={() => onCancelTransfer(activeTransfer.id)}
            >
              Cancelar Solicitação
            </button>
          </div>
          <div className={styles.activeTransferBody}>
            <div className={styles.transferDetail}>
              <span>Destino</span>
              <strong>
                {activeTransfer.to_association?.name || "N/A"}
              </strong>
            </div>
            <div className={styles.transferDetail}>
              <span>Motivo</span>
              <p>{activeTransfer.reason}</p>
            </div>
            <div className={styles.transferDetail}>
              <span>Data do pedido</span>
              <span>
                {new Date(activeTransfer.created_at).toLocaleDateString()}
              </span>
            </div>
            {activeTransfer.documents &&
              activeTransfer.documents.length > 0 && (
                <div className={styles.transferDetail}>
                  <span>Documentos</span>
                  <TransferDocuments
                    documents={activeTransfer.documents}
                    onView={onViewDocument}
                  />
                </div>
              )}
          </div>
          <p className={styles.infoText}>
            Você já possui uma solicitação em andamento. Aguarde a conclusão
            antes de abrir uma nova.
          </p>
        </div>
      ) : (
        <div className={styles.transferInfo}>
          <p>
            Para solicitar uma transferência entre clubes/associações, você
            precisa fornecer:
          </p>
          <ul>
            <li>
              <strong>Carta de Saída</strong> – documento do clube actual
              autorizando a transferência (será anexado pela associação de
              origem).
            </li>
            <li>
              <strong>Carta de Aceitação</strong> – documento do novo clube
              confirmando a recepção (será anexado pela associação de destino).
            </li>
          </ul>
          <p>
            O motivo deve descrever claramente a razão do pedido (mínimo 10
            caracteres).
          </p>
          <button className={styles.primaryButton} onClick={onOpenModal}>
            <span className="material-symbols-outlined">upload</span> Iniciar
            Solicitação
          </button>
        </div>
      )}
      <div>
        <h3
          style={{
            marginBottom: "1rem",
            fontSize: "1.25rem",
            fontWeight: 700,
          }}
        >
          Histórico de Transferências
        </h3>
        {transfers.length === 0 ? (
          <p className={styles.infoText}>
            Nenhuma transferência encontrada.
          </p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Destino</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Documentos</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t) => (
                  <tr key={t.id}>
                    <td>{t.to_association?.name || "N/A"}</td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${getStatusClass(t.status)}`}
                      >
                        {getStatusLabel(t.status)}
                      </span>
                    </td>
                    <td>
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      {t.documents && t.documents.length > 0 ? (
                        <TransferDocuments
                          documents={t.documents}
                          onView={onViewDocument}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Componente de exibição de documentos com ícones de ver/baixar
const TransferDocuments: React.FC<{
  documents: TransferDoc[];
  onView: (doc: TransferDoc) => void;
}> = ({ documents, onView }) => (
  <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
    {documents.map((doc) => (
      <li
        key={doc.id}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.25rem",
        }}
      >
        <button
          type="button"
          onClick={() => onView(doc)}
          title="Visualizar documento"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "1.2rem" }}
          >
            visibility
          </span>
        </button>
        <a
          href={doc.url}
          download={doc.original_name || undefined}
          title="Baixar documento"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            color: "inherit",
          }}
        >
          <span
            className="material-symbols-outlined"
            style={{ fontSize: "1.2rem" }}
          >
            download
          </span>
        </a>
        <span style={{ fontSize: "0.9rem" }}>
          {doc.original_name || doc.type}
        </span>
        <span style={{ marginLeft: "0.5rem", color: "#666", fontSize: "0.8rem" }}>
          — {doc.type === "origin_approval" ? "Doc. origem" : "Doc. destino"}
        </span>
      </li>
    ))}
  </ul>
);

// ---- Modal de visualização de documento ----
const DocumentViewerModal: React.FC<{
  url: string;
  originalName: string;
  mimeType: string;
  onClose: () => void;
}> = ({ url, originalName, mimeType, onClose }) => {
  const isPDF = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modal}
        style={{ maxWidth: "90vw", width: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>{originalName}</h3>
          <button onClick={onClose} className={styles.modalClose}>
            &times;
          </button>
        </div>
        <div
          className={styles.modalBody}
          style={{ padding: "1rem", textAlign: "center" }}
        >
          {isPDF ? (
            <iframe
              src={url}
              title={originalName}
              style={{
                width: "100%",
                height: "70vh",
                border: "none",
              }}
            />
          ) : isImage ? (
            <img
              src={url}
              alt={originalName}
              style={{ maxWidth: "100%", maxHeight: "70vh" }}
            />
          ) : (
            <p>
              O formato deste documento não permite pré‑visualização. Pode
              baixá‑lo usando o ícone de download.
            </p>
          )}
        </div>
        <div
          className={styles.modalActions}
          style={{ justifyContent: "center" }}
        >
          <a
            href={url}
            download={originalName}
            className={styles.submitButton}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <span className="material-symbols-outlined">download</span>
            Baixar
          </a>
          <button onClick={onClose} className={styles.cancelButton}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

const NotificationsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.notificationsModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Notificações</h3>
          <button onClick={onClose} className={styles.modalClose}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>
          <p>Funcionalidade em breve.</p>
        </div>
      </div>
    </div>
  );
};

const ProfileModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  player: any;
  onLogout: () => void;
}> = ({ isOpen, onClose, player, onLogout }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.profileModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.profileHeader}>
          <img src="https://via.placeholder.com/40" alt="Avatar" />
          <h4>{player.name}</h4>
          <p>{player.playerId}</p>
        </div>
        <div className={styles.profileMenu}>
          <button>
            <span className="material-symbols-outlined">person</span>Perfil
          </button>
          <button>
            <span className="material-symbols-outlined">settings</span>
            Definições
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

const TransferModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  profileLoaded: boolean;
  disabled?: boolean;
}> = ({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  profileLoaded,
  disabled = false,
}) => {
  const [associations, setAssociations] = useState<
    { id: number | string; name: string }[]
  >([]);
  const [loadingAssociations, setLoadingAssociations] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchAssociations = async () => {
      setLoadingAssociations(true);
      try {
        const { data } = await http.get("/associations/get");
        setAssociations(data);
      } catch (err) {
        console.error("Erro ao carregar associações", err);
      } finally {
        setLoadingAssociations(false);
      }
    };
    fetchAssociations();
  }, [isOpen]);

  if (!isOpen || disabled) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.transferModal}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Nova Solicitação de Transferência</h3>
          <button onClick={onClose} className={styles.modalClose}>
            &times;
          </button>
        </div>
        {!profileLoaded ? (
          <div className={styles.modalBody}>
            <p>A carregar o seu perfil…</p>
          </div>
        ) : (
          <form onSubmit={onSubmit}>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Associação de Destino</label>
                {loadingAssociations ? (
                  <p>A carregar lista de associações…</p>
                ) : (
                  <select
                    value={form.targetAssociation}
                    onChange={(e) =>
                      setForm({ ...form, targetAssociation: e.target.value })
                    }
                    required
                  >
                    <option value="">Seleccione...</option>
                    {associations.map((assoc) => (
                      <option key={assoc.id} value={assoc.id}>
                        {assoc.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className={styles.formGroup}>
                <label>Motivo da Transferência</label>
                <textarea
                  value={form.reason}
                  onChange={(e) =>
                    setForm({ ...form, reason: e.target.value })
                  }
                  placeholder="Explique o motivo do pedido (mín. 10 caracteres)"
                  rows={3}
                  minLength={10}
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.submitButton}>
                  Enviar Solicitação
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default PlayerDashboard;