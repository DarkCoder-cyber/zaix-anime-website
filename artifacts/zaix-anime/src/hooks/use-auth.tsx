import { createContext, useContext, useState, ReactNode, useCallback } from "react";
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<"login" | "register">("login");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const token = typeof window !== "undefined" ? localStorage.getItem("zaix_token") : null;

  const { data: user, isLoading: isUserLoading } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const logoutMutation = useLogout();

  const login = useCallback(async (data: { data: LoginBody }) => {
    const res = await loginMutation.mutateAsync(data);
    localStorage.setItem("zaix_token", res.token);
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    toast({ title: "Welcome back!" });
    setModalOpen(false);
    return res;
  }, [loginMutation, queryClient, toast]);

  const register = useCallback(async (data: { data: RegisterBody }) => {
    const res = await registerMutation.mutateAsync(data);
    localStorage.setItem("zaix_token", res.token);
    queryClient.setQueryData(getGetMeQueryKey(), res.user);
    toast({ title: "Account created! Welcome to Zaix Anime." });
    setModalOpen(false);
    return res;
  }, [registerMutation, queryClient, toast]);

  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (e) {
      // Ignore errors on logout
    }
    localStorage.removeItem("zaix_token");
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
