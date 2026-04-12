import { useDashboardMetrics } from "../hooks/useDashboardMetrics";
import { useAuditLogs } from "../hooks/useAuditLogs";
import { MetricCard } from "../components/MetricCard/MetricCard";
import { AuditTable } from "../components/AuditTable/AuditTable";
import styles from "./AdminDashboard.module.css";

interface DashboardMetrics {
  serverLoad?: number;
  responseTime?: number;
  activeUsers?: number;
  securityScore?: number;
}

export const AdminDashboard = () => {
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics() as {
    data?: DashboardMetrics;
    isLoading: boolean;
  };
  const { data: auditLogs, isLoading: logsLoading } = useAuditLogs({ limit: 5 });

  return (
    <div className={styles.content}>
      <div className={styles.dashboardHeader}>
        <div>
          <p className={styles.breadcrumb}>Painel de Controlo Principal</p>
          <h2>Estado do Sistema <span className={styles.accent}>.</span></h2>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot}></span>
          <span>Todos os sistemas operacionais</span>
        </div>
      </div>

      <div className={styles.metricsGrid}>
        <MetricCard
          icon="dns"
          label="Carga do Servidor"
          value={metrics?.serverLoad ? `${metrics.serverLoad}%` : "—"}
          progress={metrics?.serverLoad}
        />
        <MetricCard
          icon="speed"
          label="Tempo de Resposta"
          value={metrics?.responseTime ? `${metrics.responseTime}ms` : "—"}
          trend="12% vs última hora"
        />
        <div className={`${styles.metricCard} ${styles.darkCard} ${styles.metricCardLarge}`}>
          <p className={styles.metricLabel}>Utilizadores Ativos</p>
          <h3 className={styles.metricValue}>
            {metrics?.activeUsers?.toLocaleString() || "—"}
            <span>sessões agora</span>
          </h3>
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
        <AuditTable logs={auditLogs || []} isLoading={logsLoading} />
        <InfrastructureStatus metrics={metrics} />
      </div>
    </div>
  );
};

// Componente auxiliar InfrastructureStatus (pode ser movido para components/)
const InfrastructureStatus = ({ metrics }: { metrics: any }) => (
  <div>
    <h4 className={styles.sectionHeader}>Infraestrutura Local</h4>
    <div className={styles.infraList}>
      <div className={styles.infraItem}>
        <div className={styles.infraLeft}>
          <span className="material-symbols-outlined">storage</span>
          <div>
            <p>Core Database (Maputo)</p>
            <p>MySQL 8.0 Cluster</p>
          </div>
        </div>
        <div className={styles.infraStatus}>
          <p className={styles.online}>ONLINE</p>
          <p>Uptime: 99.9%</p>
        </div>
      </div>
      <div className={styles.infraItem}>
        <div className={styles.infraLeft}>
          <span className="material-symbols-outlined">cloud_done</span>
          <div>
            <p>API Gateway Service</p>
            <p>Proxy reverso Nginx</p>
          </div>
        </div>
        <div className={styles.infraStatus}>
          <p className={styles.online}>ONLINE</p>
          <p>Uptime: 100%</p>
        </div>
      </div>
      <div className={`${styles.infraItem} ${styles.warning}`}>
        <div className={styles.infraLeft}>
          <span className="material-symbols-outlined">sd_card_alert</span>
          <div>
            <p>Storage de Relatórios</p>
            <p>Capacidade 92% ocupada</p>
          </div>
        </div>
        <div className={styles.infraStatus}>
          <p className={styles.alert}>ALERTA</p>
          <p>Expansão necessária</p>
        </div>
      </div>
    </div>
    <div className={styles.securityScore}>
      <h5>Integridade Global</h5>
      <div className={styles.scoreCard}>
        <div className={styles.scoreCircle}>
          <svg viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-surface-container)" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-tertiary)" strokeWidth="3" strokeDasharray={`${metrics?.securityScore || 96}, 100`} />
          </svg>
          <div className={styles.scoreValue}>{metrics?.securityScore || 96}%</div>
        </div>
        <div>
          <p>Score de Segurança</p>
          <p>Protocolo SIFCQA v2.4</p>
        </div>
      </div>
    </div>
  </div>
);