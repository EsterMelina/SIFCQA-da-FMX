import { useQuery } from "@tanstack/react-query";
import { auditService } from "../services/auditService";

export const useAuditLogs = (params?: { limit?: number }) => {
  return useQuery({
    queryKey: ["audit-logs", params],
    queryFn: () => auditService.getLogs(params),
  });
};