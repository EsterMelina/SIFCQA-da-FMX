import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { useNavigate } from "react-router-dom";

import { http } from "@/services/http";
import { endpoints } from "@/services/endpoints";

interface AssociationMember {
  id: number;
  association_id: number;
  position: string;
  active: boolean;
}

interface FmxStaff {
  id: number;
  fmx_id: number;
  position: string;
  active: boolean;
}

interface Player {
  id: number;
  association_id: number | null;
  position?: string | null;
  active: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;

  type: string | null;
  roles: string[];

  association_id?: number | null;

  association_member?: AssociationMember | null;
  fmx_staff?: FmxStaff | null;
  player?: Player | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  initialized: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);

  const [initialized, setInitialized] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  /**
   * Extrai o tipo principal do utilizador
   */
  const extractUserType = (userData: any): string | null => {
    if (userData.type && typeof userData.type === "string") {
      return userData.type;
    }

    const roles = userData.roles ?? [];

    if (roles.length === 0) return null;

    const order = ["admin", "fmx", "association", "player"];

    for (const role of order) {
      if (roles.includes(role)) {
        return role;
      }
    }

    return roles[0];
  };

  /**
   * Normaliza o user vindo do backend
   */
  const normalizeUser = (response: any): User => {
    const user = response.user ?? response;

    return {
      id: user.id,
      name: user.name,
      email: user.email,

      type: extractUserType({
        ...user,
        roles: response.roles ?? [],
      }),

      roles: response.roles ?? [],

      association_id:
        user.association_member?.association_id ??
        user.player?.association_id ??
        null,

     association_member: user.association_member
  ? {
      id: user.association_member.id,
      association_id: user.association_member.association_id,
      position: user.association_member.position,
      active: user.association_member.active,
    }
  : null,

      fmx_staff: user.fmx_staff
        ? {
            id: user.fmx_staff.id,
            fmx_id: user.fmx_staff.fmx_id,
            position: user.fmx_staff.position,
            active: user.fmx_staff.active,
          }
        : null,

      player: user.player
        ? {
            id: user.player.id,
            association_id: user.player.association_id,
            position: user.player.position,
            active: user.player.active,
          }
        : null,
    };
  };

  /**
   * Carrega utilizador autenticado ao iniciar
   */
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setInitialized(true);
      return;
    }

    http
      .get(endpoints.auth.me)
      .then((res) => {
        const normalizedUser = normalizeUser(res.data);

        setUser(normalizedUser);
      })
      .catch((err) => {
        console.error("Erro ao carregar sessão:", err);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setUser(null);
      })
      .finally(() => {
        setInitialized(true);
      });
  }, []);

  /**
   * Login
   */
  const login = async (
    email: string,
    password: string
  ): Promise<void> => {
    setIsLoading(true);

    try {
      const res = await http.post(endpoints.auth.login, {
        email,
        password,
      });

      const normalizedUser = normalizeUser(res.data);

      localStorage.setItem("token", res.data.token);

      localStorage.setItem(
        "user",
        JSON.stringify(normalizedUser)
      );

      setUser(normalizedUser);

      navigate(
        getDashboardRoute(normalizedUser.type),
        {
          replace: true,
        }
      );
    } catch (err) {
      console.error("Erro no login:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Logout
   */
  const logout = async (): Promise<void> => {
    try {
      await http.post(endpoints.auth.logout);
    } catch (err) {
      console.error("Erro no logout:", err);
    }

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);

    navigate("/login", {
      replace: true,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        initialized,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    );
  }

  return context;
};

/**
 * Rotas por tipo
 */
const getDashboardRoute = (
  type: string | null
): string => {
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