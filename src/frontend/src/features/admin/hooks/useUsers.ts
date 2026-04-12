import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminServices";

export const useUsers = () => {
  return useQuery({
    queryKey: ["users"],
    queryFn: adminService.getUsers,
  });
};