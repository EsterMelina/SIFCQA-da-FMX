import styles from "./AuditTable.module.css";

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  status: "success" | "error" | "blocked";
}

interface AuditTableProps {
  logs: AuditLog[];
  isLoading?: boolean;
}

export const AuditTable = ({ logs, isLoading }: AuditTableProps) => (
  <div>
    <div className={styles.sectionHeader}>
      <h4>Registos de Auditoria Recentes</h4>
      <button className={styles.exportButton}>Exportar Logs CSV</button>
    </div>
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Utilizador</th>
            <th>Acção</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={4}>Carregando...</td></tr>
          ) : logs.map(log => (
            <tr key={log.id}>
              <td>{log.timestamp}</td>
              <td>{log.user}</td>
              <td>{log.action}</td>
              <td>
                <span className={log.status === "success" ? styles.success : styles.error}>
                  {log.status === "success" ? "Sucesso" : log.status === "blocked" ? "Bloqueado" : "Falha"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);