import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";

export const login = (data: { email: string; password: string }) =>
  http.post(endpoints.auth.login, data);

export const me = () =>
  http.get(endpoints.auth.me);

export const logout = () =>
  http.post(endpoints.auth.logout);