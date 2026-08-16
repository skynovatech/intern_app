import { create } from "zustand";
import api from "@/lib/api";
import type { LookupLists } from "@/types";
import {
  DOMAIN_OPTIONS,
  DURATION_OPTIONS,
  GENDER_OPTIONS,
  YEAR_OPTIONS,
  DEGREE_OPTIONS,
  APPLICATION_STATUSES,
} from "@/types";

const FALLBACKS: LookupLists = {
  domain: DOMAIN_OPTIONS as unknown as string[],
  duration: DURATION_OPTIONS as unknown as string[],
  gender: GENDER_OPTIONS as unknown as string[],
  degree: DEGREE_OPTIONS as unknown as string[],
  year: YEAR_OPTIONS as unknown as string[],
  status: APPLICATION_STATUSES as unknown as string[],
  interview_type: ["Video", "In-Person", "Phone", "Technical", "HR"],
};

interface LookupsState {
  lists: LookupLists;
  status: "idle" | "loading" | "ready" | "error";
  loadedAt: number | null;
  load: (force?: boolean) => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useLookupsStore = create<LookupsState>((set, get) => ({
  lists: FALLBACKS,
  status: "idle",
  loadedAt: null,
  load: async (force = false) => {
    const { status, loadedAt } = get();
    if (!force && (status === "loading" || (loadedAt && Date.now() - loadedAt < 60_000))) return;
    if (inFlight) return inFlight;

    set({ status: "loading" });
    inFlight = (async () => {
      try {
        const res = await api.get<Record<string, string[]>>("/lookups");
        const raw = res.data ?? {};
        const lists: LookupLists = { ...FALLBACKS };
        (Object.keys(lists) as Array<keyof LookupLists>).forEach((key) => {
          const arr = raw[key];
          if (Array.isArray(arr) && arr.length > 0) lists[key] = arr;
        });
        set({ lists, status: "ready", loadedAt: Date.now() });
      } catch {
        set({ status: "error", lists: FALLBACKS });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },
}));

export function useLookup(key: keyof LookupLists): string[] {
  const lists = useLookupsStore((s) => s.lists);
  return lists[key] ?? FALLBACKS[key];
}

export function useDomains() {
  return useLookup("domain");
}
export function useStatuses() {
  return useLookup("status");
}
export function useDegrees() {
  return useLookup("degree");
}
export function useYears() {
  return useLookup("year");
}
export function useDurations() {
  return useLookup("duration");
}
export function useGenders() {
  return useLookup("gender");
}
export function useInterviewTypes() {
  return useLookup("interview_type");
}