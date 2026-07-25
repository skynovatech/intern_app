import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useAppStore } from "@/stores/appStore";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const { darkMode, toggleDarkMode } = useAppStore();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="Skynova Tech Solutions" className="h-8 w-8" />
            <span className="text-lg font-semibold text-foreground">
              Skynova Tech Solutions
            </span>
          </Link>
          <button
            onClick={toggleDarkMode}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground"
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
          &copy; {new Date().getFullYear()} Skynova Tech Solutions. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
