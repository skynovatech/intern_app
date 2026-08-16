import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, Loader2, Star, GraduationCap, X } from "lucide-react";
import type { Application } from "@/types";
import { STATUS_COLORS } from "@/types";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Application[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    setActiveIndex(-1);
    if (!open) return;
    const timer = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await api.get<{ items: Application[] }>("/applications", {
          params: { per_page: 12, search: q, sort_by: "created_at", sort_order: "desc" },
        });
        setResults(res.data.items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, open]);

  const go = (id: number) => {
    setOpen(false);
    setQuery("");
    navigate(`/applications/${id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((cur) => Math.min(cur + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((cur) => Math.max(cur - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        go(results[activeIndex].id);
      } else if (results.length > 0) {
        go(results[0].id);
      } else if (query.trim()) {
        setOpen(false);
        navigate(`/applications?search=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="hidden items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-1.5 md:flex">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search...  (Ctrl+K)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-44 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none lg:w-56"
        />
        {open && query && (
          <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground" aria-label="Clear search">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </div>

      <button
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="rounded-md p-2 text-muted-foreground hover:text-foreground md:hidden"
        aria-label="Search applications"
      >
        <Search className="h-5 w-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(90vw,420px)] overflow-hidden rounded-xl border border-border bg-background shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search applicants by name, email, college..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-6 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Searching...</span>
              </div>
            ) : results.length > 0 ? (
              <div className="p-1.5">
                {results.map((app, index) => (
                  <button
                    key={app.id}
                    onClick={() => go(app.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      activeIndex === index ? "bg-accent" : "hover:bg-accent/50"
                    )}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(app.full_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">{app.full_name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {app.email} &middot; {app.domain}
                      </span>
                    </span>
                    <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                      <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", STATUS_COLORS[app.status] ?? "")}>
                        {app.status}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Star className={cn("h-3 w-3", app.rating > 0 ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600")} />
                        <span className="text-[10px] text-muted-foreground">{app.rating}</span>
                      </span>
                    </span>
                    <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                  </button>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="px-4 py-6 text-center">
                <p className="text-sm font-medium text-foreground">No applicants found</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Press Enter to open filtered Applications view
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted-foreground">
                <GraduationCap className="h-4 w-4" />
                Start typing to search applicants
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
