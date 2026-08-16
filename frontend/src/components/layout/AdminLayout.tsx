import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Menu, Sun, Moon } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useAppStore } from "@/stores/appStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { ErrorBoundary } from "@/components/ui/error-boundary";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { isAuthenticated, admin, fetchAdmin } = useAuthStore();
  const { darkMode, toggleDarkMode } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (isAuthenticated && !admin) {
      fetchAdmin();
    }
  }, [isAuthenticated, admin, fetchAdmin]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 glass border-b border-border">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-md p-2 text-muted-foreground hover:text-foreground lg:hidden"
                aria-label="Open sidebar"
              >
                <Menu className="h-5 w-5" />
              </button>
              <h1 className="hidden text-lg font-semibold text-foreground sm:block">
                Skynova Tech Solutions
              </h1>
              <h1 className="truncate text-lg font-semibold text-foreground sm:hidden">
                Skynova
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <GlobalSearch />

              <button
                onClick={toggleDarkMode}
                className="rounded-md p-2 text-muted-foreground hover:text-foreground"
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-sm font-medium text-primary">
                    {admin?.full_name?.charAt(0) ?? "A"}
                  </span>
                </div>
                <span className="hidden text-sm font-medium text-foreground md:block">
                  {admin?.full_name ?? "Admin"}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6"><ErrorBoundary>{children}</ErrorBoundary></main>
      </div>
    </div>
  );
}
