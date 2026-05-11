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
  type: string | null;
  roles?: string[];
  association_id?: number | null; // 🔥 ADD ISTO
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
  const [user, setUser] = useState<User | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Extrai o tipo: prioriza o campo 'type' do usuário, depois tenta pegar da lista 'roles'
  const extractUserType = (userData: any): string | null => {
    if (userData.type && typeof userData.type === "string") {
      return userData.type;
    }
    const roles = userData.roles ?? [];
    if (roles.length === 0) return null;
    const order = ["admin", "fmx", "association", "player"];
    for (const role of order) {
      if (roles.includes(role)) return role;
    }
    return roles[0];
  };

  // Carrega o usuário ao iniciar
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setInitialized(true);
      return;
    }

    http
      .get(endpoints.auth.me)
      .then((res) => {
        const data = res.data.user ?? res.data;
        const userType = extractUserType(data);

        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          type: userType,
          roles: data.roles ?? [],
        });
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
      })
      .finally(() => {
        setInitialized(true);
      });
  }, []);

  // Login
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await http.post(endpoints.auth.login, { email, password });
      const userData = res.data.user;
      const userType = extractUserType(userData);

     const newUser: User = {
  id: userData.id,
  name: userData.name,
  email: userData.email,
  type: extractUserType(userData),
  roles: userData.roles ?? [],
  association_id: userData.association_id ?? null, // 🔥 aqui é o sítio certo
};

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(newUser));
      setUser(newUser);

      const dashboardRoute = getDashboardRoute(userType);
      navigate(dashboardRoute, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await http.post(endpoints.auth.logout);
    } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, initialized, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const getDashboardRoute = (type: string | null): string => {
  switch (type) {
    case "admin":
      return "/admin";
    case "fmx":
      return "/fmx";
    case "association":
      return "/association";
    case "player":
      return "/player";
    default:
      return "/";
  }
};