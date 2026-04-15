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

  const normalizeRoles = (roles: any[]) =>
    Array.isArray(roles)
      ? roles.map((r) => (typeof r === "string" ? r : r.name))
      : [];

  // ================= INIT =================
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

        setUser({
          id: data.id,
          name: data.name,
          email: data.email,
          roles: normalizeRoles(res.data.roles ?? data.roles),
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

// ================= LOGIN =================
const login = async (email: string, password: string) => {
  console.log("🚀 LOGIN START");

  setIsLoading(true);

  try {
    const res = await http.post(endpoints.auth.login, {
      email,
      password,
    });

    console.log("📡 LOGIN RESPONSE FULL:", res.data);

    const data = res.data.user;

    console.log("👤 USER RAW:", data);
    console.log("🏷️ ROLES RAW:", res.data.roles);
    console.log("🔐 TOKEN RAW:", res.data.token);

    const newUser: User = {
      id: data.id,
      name: data.name,
      email: data.email,
      roles: normalizeRoles(res.data.roles),
    };

    console.log("🧠 NORMALIZED USER:", newUser);

    // ================= STORAGE =================
    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user", JSON.stringify(newUser));

    console.log("💾 TOKEN SAVED:", localStorage.getItem("token"));
    console.log("💾 USER SAVED:", localStorage.getItem("user"));

    // ================= STATE =================
    setUser(newUser);
    console.log("⚡ setUser CALLED");

    // ================= NAVIGATION =================
    setTimeout(() => {
      console.log("🧭 NAVIGATING TO /");
      navigate("/", { replace: true });
    }, 50);

  } catch (err) {
    console.log("💥 LOGIN ERROR:", err);
  } finally {
    console.log("🏁 LOGIN END");
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