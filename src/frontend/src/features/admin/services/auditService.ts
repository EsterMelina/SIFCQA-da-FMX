import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";

export const auditService = {
  getLogs: async (params?: any) => {
    const { data } = await http.get(endpoints.audit.logs, { params });
    return data;
  },
  getLogDetail: async (id: number) => {
    const { data } = await http.get(endpoints.audit.detail(id));
    return data;
  },
};