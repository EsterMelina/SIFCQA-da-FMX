// PlayerDashboard.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import styles from "./PlayerDashboard.module.css";
import { useAuth } from "@/app/providers/AuthProvider";

type TabType = "profile" | "quotas" | "history" | "notifications" | "transfer";

interface PaymentRecord {
  id: string;
  reference: string;
  description: string;
  amount: string;
  status: "confirmed" | "pending";
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

const PlayerDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("profile");
  const [theme, setTheme] = useState<"light" | "dark" | null>(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    return saved ?? null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [playerData, setPlayerData] = useState({
    name: "Nuno Domingos Mendes",
    birthDate: "12 de Maio de 2002",
    birthPlace: "Maputo, MZ",
    association: "AP Maputo Cidade",
    category: "Sénior Profissional",
    license: "MT-98234-X",
    licenseStatus: "Ativa",
    licenseValidUntil: "31 de Dezembro de 2024",
    playerId: "FMX-2024-089",
  });

  const [pendingQuota, setPendingQuota] = useState({
    month: "Junho 2024",
    dueIn: "5 dias",
    amount: "500,00 MT",
  });

  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([
    { id: "1", reference: "FMX-PAY-9812", description: "Quota Mensal - Maio 2024", amount: "500,00 MT", status: "confirmed" },
    { id: "2", reference: "FMX-PAY-7721", description: "Renovação de Licença 2024", amount: "2.500,00 MT", status: "confirmed" },
    { id: "3", reference: "FMX-PAY-4409", description: "Taxa de Torneio Nacional", amount: "1.200,00 MT", status: "confirmed" },
  ]);

  const [notifications, setNotifications] = useState<Notification[]>([
    { id: 1, title: "Convocatória para Treinos Provinciais", message: "A Federação Moçambicana convoca todos os atletas da categoria Sénior para a sessão de treinos no dia 12 de Junho.", time: "Há 2 horas", icon: "calendar_month", iconColor: "primary", highlight: true },
    { id: 2, title: "Novo Regulamento de Antidoping", message: "Aceda à área de documentos para ler a nova diretiva institucional sobre controlo de substâncias.", time: "Há 1 dia", icon: "campaign", iconColor: "tertiary" },
  ]);

  const [stats] = useState({
    yearsAffiliated: 14,
    nationalTitles: 3,
    financialAttendance: "100%",
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  const [transferForm, setTransferForm] = useState({
    targetAssociation: "",
    letterOut: null as File | null,
    letterIn: null as File | null,
  });

  useEffect(() => {
    const root = document.documentElement;
    const isDark =
      theme === "dark" ||
      (theme === null && window.matchMedia("(prefers-color-scheme: dark)").matches);
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
    const fetchData = async () => {
      setLoading(true);
      try {
        // const profileRes = await http.get(endpoints.players.me);
        // setPlayerData(profileRes.data);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError("Não foi possível carregar os dados.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  const handleMakePayment = () => setShowPaymentModal(true);
  const handleViewDigitalCard = () => console.log("Ver Cartão Digital");

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.letterOut || !transferForm.letterIn) {
      alert("Por favor, anexe ambas as cartas.");
      return;
    }
    const formData = new FormData();
    formData.append("target_association_id", transferForm.targetAssociation);
    formData.append("letter_out", transferForm.letterOut);
    formData.append("letter_in", transferForm.letterIn);
    try {
      await http.post(endpoints.players.transferRequest, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Solicitação de transferência enviada com sucesso!");
      setShowTransferModal(false);
      setTransferForm({ targetAssociation: "", letterOut: null, letterIn: null });
    } catch (error) {
      console.error("Erro ao enviar transferência:", error);
      alert("Erro ao enviar solicitação.");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileContent player={playerData} stats={stats} pendingQuota={pendingQuota} paymentHistory={paymentHistory} notifications={notifications} onMakePayment={handleMakePayment} onViewCard={handleViewDigitalCard} />;
      case "quotas":
        return <QuotasContent pendingQuota={pendingQuota} paymentHistory={paymentHistory} onMakePayment={handleMakePayment} />;
      case "history":
        return <HistoryContent paymentHistory={paymentHistory} />;
      case "notifications":
        return <NotificationsContent notifications={notifications} />;
      case "transfer":
        return <TransferContent onOpenModal={() => setShowTransferModal(true)} />;
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <div className={`${styles.overlay} ${isSidebarOpen ? styles.overlayVisible : ""}`} onClick={closeSidebar} />

        {/* Sidebar */}
        <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.sidebarOpen : ""}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brand}>
              <div className={styles.logo}>
                <span className="material-symbols-outlined">sports_soccer</span>
              </div>
              <div>
                <h1>SIFCQA-FMX</h1>
                <p>Direção FMX</p>
              </div>
            </div>
          </div>

          <nav className={styles.nav}>
            <button onClick={() => { setActiveTab("profile"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "profile" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">person</span>
              <span>O Meu Perfil</span>
            </button>
            <button onClick={() => { setActiveTab("quotas"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "quotas" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">receipt_long</span>
              <span>Minhas Quotas</span>
            </button>
            <button onClick={() => { setActiveTab("history"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "history" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">history</span>
              <span>Histórico de Pagamentos</span>
            </button>
            <button onClick={() => { setActiveTab("notifications"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "notifications" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">notifications</span>
              <span>Notificações</span>
            </button>
            <button onClick={() => { setActiveTab("transfer"); closeSidebar(); }} className={`${styles.navLink} ${activeTab === "transfer" ? styles.active : ""}`}>
              <span className="material-symbols-outlined">swap_horiz</span>
              <span>Transferência</span>
            </button>
          </nav>

          <div className={styles.sidebarFooter}>
            <button className={styles.primaryButton} style={{ width: '100%' }} onClick={() => { setShowPaymentModal(true); closeSidebar(); }}>
              <span className="material-symbols-outlined">payments</span>
              Efetuar Pagamento
            </button>
            <div className={styles.footerLinks}>
              <button className={styles.footerLink}><span className="material-symbols-outlined">settings</span>Definições</button>
              <button className={styles.footerLink} onClick={handleLogout}><span className="material-symbols-outlined">logout</span>Sair</button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className={styles.main}>
          <header className={styles.topbar}>
            <div className={styles.topbarLeft}>
              <button className={styles.menuButton} onClick={toggleSidebar}>
                <span className="material-symbols-outlined">menu</span>
              </button>
              <span className={styles.systemName}>Perfil do Atleta</span>
            </div>
            <div className={styles.topbarRight}>
              <button className={styles.iconButton} onClick={() => setShowNotificationsModal(true)}>
                <span className="material-symbols-outlined">notifications</span>
                <span className={styles.notificationBadge}></span>
              </button>
              <button className={styles.themeToggle} onClick={toggleTheme}>
                <span className="material-symbols-outlined">
                  {theme === "light" ? "dark_mode" : theme === "dark" ? "light_mode" : "routine"}
                </span>
              </button>
              <div className={styles.avatar} onClick={() => setShowProfileModal(true)}>
                <img src="https://via.placeholder.com/40" alt="Avatar" />
              </div>
            </div>
          </header>

          <div className={styles.content}>{renderContent()}</div>
        </main>
      </div>

      {/* Modais */}
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
      <NotificationsModal isOpen={showNotificationsModal} onClose={() => setShowNotificationsModal(false)} notifications={notifications} />
      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} player={playerData} onLogout={handleLogout} />
      <TransferModal isOpen={showTransferModal} onClose={() => setShowTransferModal(false)} form={transferForm} setForm={setTransferForm} onSubmit={handleTransferSubmit} />
    </div>
  );
};

// ===== CONTEÚDOS DAS ABAS (CSS classes padronizadas) =====

const ProfileContent: React.FC<{ player: any; stats: any; pendingQuota: any; paymentHistory: PaymentRecord[]; notifications: Notification[]; onMakePayment: () => void; onViewCard: () => void }> = ({ player, stats, pendingQuota, paymentHistory, notifications, onMakePayment, onViewCard }) => (
  <div className={styles.profileGrid}>
    <div className={styles.profileCard}>
      <div className={styles.profileImageWrapper}>
        <img src="https://via.placeholder.com/150" alt="Profile" />
      </div>
      <div className={styles.profileInfo}>
        <span className={styles.badge}>Atleta Federado</span>
        <h3>{player.name}</h3>
        <p>Nascido em {player.birthDate} — {player.birthPlace}</p>
        <div className={styles.profileDetails}>
          <div><span>Associação</span><span>{player.association}</span></div>
          <div><span>Categoria</span><span>{player.category}</span></div>
          <div><span>Licença</span><span>{player.license}</span></div>
        </div>
      </div>
    </div>

    <div className={styles.licenseCard}>
      <div className={styles.licenseHeader}>
        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
        <span className={styles.season}>Época 2024</span>
      </div>
      <div className={styles.licenseBody}>
        <p>Estado da Licença</p>
        <h4>{player.licenseStatus}</h4>
        <p>Válida até {player.licenseValidUntil}</p>
      </div>
      <button onClick={onViewCard}>Ver Cartão Digital</button>
    </div>

    <div className={styles.quotaSidebar}>
      <div className={styles.pendingQuota}>
        <h4><span className={styles.dot}></span>Quotas Pendentes</h4>
        <div className={styles.quotaItem}>
          <div><p>{pendingQuota.month}</p><p>Vence em {pendingQuota.dueIn}</p></div>
          <p className={styles.quotaAmount}>{pendingQuota.amount}</p>
        </div>
        <div className={styles.quotaItemPaid}>
          <div><p>Maio 2024</p><p>Pago</p></div>
          <span className="material-symbols-outlined">check_circle</span>
        </div>
        <button className={styles.primaryButton} onClick={onMakePayment}>Regularizar Situação</button>
      </div>
      <div className={styles.federationMessage}>
        <h4>Mensagem da Federação</h4>
        <p>"Informamos que as inscrições para o Campeonato Nacional de Inverno estão abertas até ao dia 15 de Junho."</p>
      </div>
    </div>

    <div className={styles.paymentHistory}>
      <div className={styles.sectionHeader}>
        <h4>Últimos Pagamentos</h4>
        <button>Ver Histórico Completo</button>
      </div>
      <table className={styles.table}>
        <thead><tr><th>Referência</th><th>Descrição</th><th>Valor</th><th>Estado</th></tr></thead>
        <tbody>
          {paymentHistory.slice(0, 3).map(p => (
            <tr key={p.id}>
              <td>{p.reference}</td>
              <td>{p.description}</td>
              <td>{p.amount}</td>
              <td><span className={`${styles.statusBadge} ${styles.validated}`}>Confirmado</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className={styles.notificationsSection}>
      <h4>Notificações Recentes</h4>
      <div className={styles.notificationList}>
        {notifications.slice(0, 2).map(n => (
          <div key={n.id} className={styles.notificationItem}>
            <div className={`${styles.notificationIcon} ${styles[n.iconColor]}`}><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{n.icon}</span></div>
            <div><h5>{n.title}</h5><p>{n.message}</p><span>{n.time}</span></div>
          </div>
        ))}
      </div>
    </div>

    <div className={styles.statsCard}>
      <h4>Estatísticas Institucionais</h4>
      <div><span>{stats.yearsAffiliated}</span><span>Anos de Filiação</span></div>
      <div><span>{stats.nationalTitles.toString().padStart(2, '0')}</span><span>Títulos Nacionais</span></div>
      <div><span>{stats.financialAttendance}</span><span>Assiduidade Financeira</span></div>
    </div>
  </div>
);

const QuotasContent: React.FC<{ pendingQuota: any; paymentHistory: PaymentRecord[]; onMakePayment: () => void }> = ({ pendingQuota, paymentHistory, onMakePayment }) => (
  <div className={styles.pageContainer}>
    <h2>Minhas Quotas</h2>
    <div className={styles.pendingHighlight}>
      <p>Quota pendente: {pendingQuota.month} - {pendingQuota.amount}</p>
      <button className={styles.primaryButton} onClick={onMakePayment}>Pagar Agora</button>
    </div>
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead><tr><th>Mês</th><th>Valor</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Junho 2024</td><td>500,00 MT</td><td><span className={`${styles.statusBadge} ${styles.pending}`}>Pendente</span></td></tr>
          <tr><td>Maio 2024</td><td>500,00 MT</td><td><span className={`${styles.statusBadge} ${styles.validated}`}>Pago</span></td></tr>
        </tbody>
      </table>
    </div>
  </div>
);

const HistoryContent: React.FC<{ paymentHistory: PaymentRecord[] }> = ({ paymentHistory }) => (
  <div className={styles.pageContainer}>
    <h2>Histórico de Pagamentos</h2>
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead><tr><th>Referência</th><th>Descrição</th><th>Valor</th><th>Estado</th></tr></thead>
        <tbody>
          {paymentHistory.map(p => (
            <tr key={p.id}>
              <td>{p.reference}</td><td>{p.description}</td><td>{p.amount}</td>
              <td><span className={`${styles.statusBadge} ${styles.validated}`}>Confirmado</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const NotificationsContent: React.FC<{ notifications: Notification[] }> = ({ notifications }) => (
  <div className={styles.pageContainer}>
    <h2>Notificações</h2>
    <div className={styles.notificationListFull}>
      {notifications.map(n => (
        <div key={n.id} className={styles.notificationItem}>
          <div className={`${styles.notificationIcon} ${styles[n.iconColor]}`}><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{n.icon}</span></div>
          <div><h5>{n.title}</h5><p>{n.message}</p><span>{n.time}</span></div>
        </div>
      ))}
    </div>
  </div>
);

const TransferContent: React.FC<{ onOpenModal: () => void }> = ({ onOpenModal }) => (
  <div className={styles.pageContainer}>
    <h2>Solicitar Transferência</h2>
    <div className={styles.transferInfo}>
      <p>Para solicitar uma transferência entre clubes/associações, você precisa anexar:</p>
      <ul>
        <li><strong>Carta de Saída</strong> – documento do clube atual autorizando a transferência.</li>
        <li><strong>Carta de Aceitação</strong> – documento do novo clube confirmando a recepção.</li>
      </ul>
      <button className={styles.primaryButton} onClick={onOpenModal}>
        <span className="material-symbols-outlined">upload</span>
        Iniciar Solicitação
      </button>
    </div>
  </div>
);

// ===== MODAIS (usando classes do design system) =====

const PaymentModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Efetuar Pagamento</h3>
          <button onClick={onClose} className={styles.modalClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label>Quota</label>
            <select><option>Junho 2024 - 500,00 MT</option></select>
          </div>
          <div className={styles.formGroup}>
            <label>Método</label>
            <select><option>M-Pesa</option><option>Transferência</option></select>
          </div>
          <div className={styles.modalActions}>
            <button className={styles.cancelButton} onClick={onClose}>Cancelar</button>
            <button className={styles.submitButton} onClick={() => { console.log("Pagar"); onClose(); }}>Confirmar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const NotificationsModal: React.FC<{ isOpen: boolean; onClose: () => void; notifications: Notification[] }> = ({ isOpen, onClose, notifications }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.notificationsModal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Notificações</h3>
          <button onClick={onClose} className={styles.modalClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className={styles.modalBody}>
          {notifications.map(n => (
            <div key={n.id} className={styles.notificationItem}>
              <div className={`${styles.notificationIcon} ${styles[n.iconColor]}`}>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{n.icon}</span>
              </div>
              <div><h5>{n.title}</h5><p>{n.message}</p><span>{n.time}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProfileModal: React.FC<{ isOpen: boolean; onClose: () => void; player: any; onLogout: () => void }> = ({ isOpen, onClose, player, onLogout }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.profileModal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.profileHeader}>
          <img src="https://via.placeholder.com/40" alt="Avatar" />
          <h4>{player.name}</h4>
          <p>{player.playerId}</p>
        </div>
        <div className={styles.profileMenu}>
          <button><span className="material-symbols-outlined">person</span>Perfil</button>
          <button><span className="material-symbols-outlined">settings</span>Definições</button>
          <button onClick={() => { onLogout(); onClose(); }}><span className="material-symbols-outlined">logout</span>Sair</button>
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
}> = ({ isOpen, onClose, form, setForm, onSubmit }) => {
  if (!isOpen) return null;
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.transferModal}`} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Nova Solicitação de Transferência</h3>
          <button onClick={onClose} className={styles.modalClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <form onSubmit={onSubmit}>
          <div className={styles.modalBody}>
            <div className={styles.formGroup}>
              <label>Associação de Destino</label>
              <select value={form.targetAssociation} onChange={e => setForm({ ...form, targetAssociation: e.target.value })} required>
                <option value="">Selecione...</option>
                <option value="maputo">Maputo Cidade</option>
                <option value="beira">Beira (Sofala)</option>
                <option value="nampula">Nampula</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Carta de Saída (PDF)</label>
              <input type="file" accept=".pdf,image/*" onChange={e => setForm({ ...form, letterOut: e.target.files?.[0] || null })} required />
            </div>
            <div className={styles.formGroup}>
              <label>Carta de Aceitação (PDF)</label>
              <input type="file" accept=".pdf,image/*" onChange={e => setForm({ ...form, letterIn: e.target.files?.[0] || null })} required />
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelButton} onClick={onClose}>Cancelar</button>
              <button type="submit" className={styles.submitButton}>Enviar Solicitação</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerDashboard;