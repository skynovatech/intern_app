import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Sun,
  Moon,
  LogOut,
  X,
  Mail,
  MessageSquare,
  Settings,
  FileText,
  LayoutTemplate,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/appStore";
import { useAuthStore } from "@/stores/authStore";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
  { label: "Applications", icon: Users, to: "/applications" },
  { label: "Analytics", icon: BarChart3, to: "/analytics" },
  { label: "Templates", icon: Mail, to: "/templates" },
  { label: "Offer Letters", icon: FileText, to: "/offer-letters" },
  { label: "Letter Template", icon: LayoutTemplate, to: "/offer-letter-templates" },
  { label: "WhatsApp", icon: MessageSquare, to: "/whatsapp" },
  { label: "Settings", icon: Settings, to: "/settings" },
] as const;

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
  const { darkMode, toggleDarkMode } = useAppStore();
  const { logout, admin } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Skynova Tech Solutions" className="h-8 w-8" />
          <span className="text-lg font-semibold text-foreground">
            Skynova Tech Solutions
          </span>
        </div>
        <button
          onClick={() => onOpenChange(false)}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => onOpenChange(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 px-3 pb-4">
        {admin && (
          <div className="mb-2 rounded-lg border border-border px-3 py-2">
            <p className="truncate text-xs font-medium text-foreground">
              {admin.full_name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {admin.email}
            </p>
            <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary uppercase tracking-wider">
              {admin.role}
            </span>
          </div>
        )}
        <button
          onClick={toggleDarkMode}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? (
            <Sun className="h-5 w-5 shrink-0" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" />
          )}
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border glass lg:block">
        {sidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => onOpenChange(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-border glass animate-slide-in">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
