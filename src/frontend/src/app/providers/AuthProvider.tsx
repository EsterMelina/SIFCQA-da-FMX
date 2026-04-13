import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";
import { useNavigate } from "react-router-dom";



interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  association_id?: number;
  player_id?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const cached = localStorage.getItem("user");
    return cached ? JSON.parse(cached) : null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(true);

  const navigate = useNavigate();

  const normalizeRoles = (roles: any[]): string[] => {
    if (!Array.isArray(roles)) return [];
    return roles.map((r) => (typeof r === "string" ? r : r.name));
  };

  // ================= LOGIN =================
  const login = async (email: string, password: string) => {
  setIsLoading(true);

  try {
    const res = await http.post(endpoints.auth.login, {
      email,
      password,
    });

    const normalizedUser: User = {
      ...res.data.user,
      roles: normalizeRoles(res.data.roles),
    };

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(normalizedUser));

    setUser(normalizedUser);

    // 🔥 espera o React atualizar state
    setTimeout(() => {
      navigate("/", { replace: true });
    }, 0);

  } finally {
    setIsLoading(false);
  }
};

  // ================= LOGOUT =================
  const logout = async () => {
    try {
      await http.post(endpoints.auth.logout);
    } catch {}

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    navigate("/login", { replace: true });
  };

  // ================= REDIRECT CONTROLADO =================
  // useEffect(() => {
  //   if (user) {
  //     navigate("/", { replace: true });
  //   }
  // }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, initialized, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};