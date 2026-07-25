import { create } from "zustand";
import type { Application, DashboardStats, AnalyticsData } from "@/types";

interface AppState {
  selectedApplication: Application | null;
  dashboardStats: DashboardStats | null;
  analyticsData: AnalyticsData | null;
  darkMode: boolean;
  setSelectedApplication: (app: Application | null) => void;
  setDashboardStats: (stats: DashboardStats) => void;
  setAnalyticsData: (data: AnalyticsData) => void;
  toggleDarkMode: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedApplication: null,
  dashboardStats: null,
  analyticsData: null,
  darkMode: localStorage.getItem("ats_dark") === "true",
  setSelectedApplication: (app) => set({ selectedApplication: app }),
  setDashboardStats: (stats) => set({ dashboardStats: stats }),
  setAnalyticsData: (data) => set({ analyticsData: data }),
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      localStorage.setItem("ats_dark", String(next));
      document.documentElement.classList.toggle("dark", next);
      return { darkMode: next };
    }),
}));
