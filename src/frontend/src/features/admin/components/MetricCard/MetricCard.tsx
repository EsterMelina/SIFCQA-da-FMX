import styles from "./MetricCard.module.css";

interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  progress?: number;
  trend?: string;
}

export const MetricCard = ({ icon, label, value, progress, trend }: MetricCardProps) => (
  <div className={styles.card}>
    <div className={styles.icon}>
      <span className="material-symbols-outlined">{icon}</span>
    </div>
    <p className={styles.label}>{label}</p>
    <h3 className={styles.value}>{value}</h3>
    {progress !== undefined && (
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>
    )}
    {trend && <p className={styles.trend}>{trend}</p>}
  </div>
);