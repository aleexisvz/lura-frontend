import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/lib/apiClient";
import { clearToken, getToken, saveToken } from "@/lib/storage";
import { decodeJwtPayload, extractRoleFromToken, tokenIsExpired } from "@/lib/jwt";
import { Role } from "@/types/domain";

type AuthContextValue = {
  initialized: boolean;
  isAuthenticated: boolean;
  token: string | null;
  role: Role | null;
  email: string | null;
  setSession: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const [initialized, setInitialized] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const clearSession = () => {
    clearToken();
    setToken(null);
    setRole(null);
    setEmail(null);
  };

  const setSession = (nextToken: string) => {
    saveToken(nextToken);
    setToken(nextToken);
    setRole(extractRoleFromToken(nextToken));

    const payload = decodeJwtPayload(nextToken);
    setEmail(typeof payload?.email === "string" ? payload.email : null);
  };

  const logout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const saved = getToken();
    if (saved && !tokenIsExpired(saved)) {
      setSession(saved);
    } else {
      clearSession();
    }

    setInitialized(true);
  }, []);

  useEffect(() => {
    apiClient.setUnauthorizedHandler(() => {
      clearSession();
      navigate("/login", { replace: true });
    });

    return () => {
      apiClient.setUnauthorizedHandler(null);
    };
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({
      initialized,
      isAuthenticated: Boolean(token),
      token,
      role,
      email,
      setSession,
      logout
    }),
    [email, initialized, role, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}

