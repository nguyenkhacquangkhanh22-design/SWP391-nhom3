import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, authApi } from "../services/authApi";
import type { User } from "../types/auth";

const TOKEN_KEY = "swp391_access_token";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  signIn: (token: string, user: User, rememberMe?: boolean) => void;
  signOut: () => Promise<void>;
  saveUser: (user: User) => void;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(token));

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    let active = true;
    setIsLoading(true);
    authApi
      .profile(token)
      .then(({ user: profile }) => {
        if (active) setUser(profile);
      })
      .catch((error: unknown) => {
        if (active && error instanceof ApiError && error.status === 401) {
          clearSession();
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [clearSession, token]);

  const signIn = useCallback(
    (accessToken: string, signedInUser: User, rememberMe = true) => {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      (rememberMe ? localStorage : sessionStorage).setItem(TOKEN_KEY, accessToken);
      setToken(accessToken);
      setUser(signedInUser);
    },
    [],
  );

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await authApi.logout(token);
      } finally {
        clearSession();
        navigate("/login", { replace: true });
      }
    } else {
      clearSession();
      navigate("/login", { replace: true });
    }
  }, [clearSession, navigate, token]);

  const saveUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!token) throw new ApiError("Phiên đăng nhập đã hết hạn.", 401);
      const result = await authApi.changePassword(token, {
        currentPassword,
        newPassword,
      });
      signIn(result.token, result.user);
    },
    [signIn, token],
  );

  const value = useMemo(
    () => ({ user, token, isLoading, signIn, signOut, saveUser, changePassword }),
    [user, token, isLoading, signIn, signOut, saveUser, changePassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
