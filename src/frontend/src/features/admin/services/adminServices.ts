import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";

export const adminService = {
  getDashboardMetrics: async () => {
    const { data } = await http.get(endpoints.reports.dashboard);
    return data;
  },
  getUsers: async () => {
    const { data } = await http.get(endpoints.users.base);
    return data;
  },
  updateUserRole: async (userId: number, role: string) => {
    const { data } = await http.patch(endpoints.users.updateRole(userId), { role });
    return data;
  },
};