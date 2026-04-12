import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminServices";

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: adminService.getDashboardMetrics,
  });
};