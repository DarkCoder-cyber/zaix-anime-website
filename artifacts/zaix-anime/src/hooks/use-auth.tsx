import { createContext, useContext, useState, ReactNode, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLogin, useRegister, useLogout, useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { LoginBody, RegisterBody, UserProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  login: ReturnType<typeof useLogin>["mutateAsync"];
  register: ReturnType<typeof useRegister>["mutateAsync"];
  logout: () => Promise<void>;
  isModalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  modalTab: "login" | "register";
  setModalTab: (tab: "login" | "register") => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "zaix_token";

function getStoredToken(): string | null {
  try {
    return typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"login" | "register">("login");
  // Reactive token state — updates whenever login/register/logout runs
  const [token, setToken] = useState<string | null>(getStoredToken);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Sync token state if localStorage changes in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) setToken(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const { data: user, isLoading: isUserLoading, isError: isMeError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  });

  // Clear invalid/expired token automatically when /auth/me returns 401
  useEffect(() => {
    if (isMeError && token) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      queryClient.setQueryData(getGetMeQueryKey(), null);
    }
  }, [isMeError, token, queryClient]);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const login = useCallback(async (data: { data: LoginBody }) => {
    const res = await loginMutation.mutateAsync(data);
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    toast({ title: "Welcome back!" });
    setModalOpen(false);
    return res;
  }, [loginMutation, queryClient, toast]);

  const register = useCallback(async (data: { data: RegisterBody }) => {
    const res = await registerMutation.mutateAsync(data);
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    toast({ title: "Account created! Welcome to Zaix Anime." });
    setModalOpen(false);
    return res;
  }, [registerMutation, queryClient, toast]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      // Ignore errors on logout
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    queryClient.setQueryData(getGetMeQueryKey(), null);
    toast({ title: "Logged out successfully." });
  }, [logoutMutation, queryClient, toast]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoggedIn: !!user,
        isLoading: isUserLoading,
        login,
        register,
        logout,
        isModalOpen,
        setModalOpen,
        modalTab,
        setModalTab,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
