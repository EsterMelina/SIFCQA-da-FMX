import axios, { type InternalAxiosRequestConfig } from "axios";

export const http = axios.create({
  baseURL: "http://localhost:8000/api",
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});