import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useAppStore } from "@/stores/appStore";
import api from "@/lib/api";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { darkMode, toggleDarkMode } = useAppStore();
  const [companyName, setCompanyName] = useState("Skynova Tech Solutions");
  const [tagline, setTagline] = useState("");
  const [brandColor, setBrandColor] = useState("");

  useEffect(() => {
    let active = true;
    api
      .get<{ settings: Record<string, string> }>("/settings/public")
      .then((res) => {
        if (!active) return;
        const s = res.data.settings ?? {};
        if (s.company_name) setCompanyName(s.company_name);
        if (s.company_tagline) setTagline(s.company_tagline);
        if (s.brand_color) setBrandColor(s.brand_color);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const btnStyle = brandColor ? { color: brandColor } : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt={companyName} className="h-8 w-8" />
            <span className="text-lg font-semibold text-foreground">
              {companyName}
              {tagline && (
                <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
                  {tagline}
                </span>
              )}
            </span>
          </Link>
          <button
            onClick={toggleDarkMode}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground"
            style={btnStyle}
          >
            {darkMode ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
