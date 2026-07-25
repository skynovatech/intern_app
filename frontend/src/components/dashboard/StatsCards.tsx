import type { DashboardStats } from "@/types";
import {
  Users,
  Clock,
  Eye,
  Star,
  Calendar,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface StatsCardsProps {
  stats: DashboardStats;
}

const statCards = [
  {
    key: "total",
    label: "Total Applications",
    icon: Users,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  {
    key: "reviewed",
    label: "Reviewed",
    icon: Eye,
    color: "text-blue-500",
    bg: "bg-blue-400/10",
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    icon: Star,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
  },
  {
    key: "interview_scheduled",
    label: "Interview",
    icon: Calendar,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
  },
  {
    key: "selected",
    label: "Selected",
    icon: CheckCircle,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  {
    key: "rejected",
    label: "Rejected",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
] as const;

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {statCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="glass animate-fade-in rounded-xl p-4 sm:p-5"
            style={{
              animationDelay: `${index * 50}ms`,
              animationFillMode: "both",
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats[card.key]}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {card.label}
                </p>
              </div>
              <div className={`rounded-lg ${card.bg} p-3`}>
                <Icon className={`h-6 w-6 ${card.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
