import { create } from "zustand";
import type { AdminUser } from "@/types";
import api from "@/lib/api";

interface AuthState {
  token: string | null;
  admin: AdminUser | null;
  isAuthenticated: boolean;
  setAuth: (token: string, refreshToken: string, admin: AdminUser) => void;
  logout: () => void;
  fetchAdmin: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem("ats_token"),
  admin: null,
  isAuthenticated: !!localStorage.getItem("ats_token"),
  setAuth: (token, refreshToken, admin) => {
    localStorage.setItem("ats_token", token);
    localStorage.setItem("ats_refresh_token", refreshToken);
    set({ token, admin, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("ats_token");
    localStorage.removeItem("ats_refresh_token");
    set({ token: null, admin: null, isAuthenticated: false });
  },
  fetchAdmin: async () => {
    if (!get().token) return;
    try {
      const res = await api.get<AdminUser>("/auth/me");
      set({ admin: res.data });
    } catch {
      get().logout();
    }
  },
}));
