// app/providers/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";

interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "association" | "player" | "fmx";
  association_id?: number;
  player_id?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (token) {
      http.get(endpoints.auth.me)
        .then(res => {
          console.log("ME RAW RESPONSE:", res.data);
          setUser(res.data);
        })
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await http.post(endpoints.auth.login, { email, password });
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};