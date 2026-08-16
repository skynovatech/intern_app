import { useEffect, useState, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ArrowRight, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import type { DashboardStats, AnalyticsData, Application } from "@/types";
import { STATUS_COLORS } from "@/types";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0891b2",
];

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, analyticsRes, appsRes] = await Promise.all([
        api.get<DashboardStats>("/dashboard"),
        api.get<AnalyticsData>("/analytics"),
        api.get<{ items: Application[] }>("/applications", {
          params: { per_page: 5, sort_by: "created_at", sort_order: "desc" },
        }),
      ]);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
      setRecentApplications(appsRes.data.items);
    } catch {
      toast({ title: "Failed to load dashboard data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const domainData =
    analytics?.domain_distribution.map((d) => ({
      name: d.domain,
      value: d.count,
    })) ?? [];

  const statusData = stats
    ? ([
        { name: "Pending", value: stats.pending },
        { name: "Reviewed", value: stats.reviewed },
        { name: "Shortlisted", value: stats.shortlisted },
        { name: "Interview Scheduled", value: stats.interview_scheduled },
        { name: "Interview Completed", value: stats.interview_completed },
        { name: "Selected", value: stats.selected },
        { name: "Rejected", value: stats.rejected },
        { name: "Withdrawn", value: stats.withdrawn },
      ].filter((d) => d.value > 0) as { name: string; value: number }[])
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Dashboard Overview
        </h2>
        <p className="text-sm text-muted-foreground">
          Welcome back! Here's what's happening with your applications.
        </p>
      </div>

      {stats && <StatsCards stats={stats} />}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Domain Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {domainData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={domainData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${(name ?? "").length > 12 ? (name ?? "").slice(0, 12) + "..." : name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    outerRadius="65%"
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {domainData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No domain data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Applications</CardTitle>
          <Link
            to="/applications"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentApplications.length > 0 ? (
            <div className="space-y-3">
              {recentApplications.map((app) => (
                <Link
                  key={app.id}
                  to={`/applications/${app.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="text-sm font-medium text-primary">
                        {app.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div>
                      <p className="truncate text-sm font-medium text-foreground">
                        {app.full_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {app.college} &middot; {app.domain}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge className={STATUS_COLORS[app.status] ?? ""}>
                      {app.status}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(app.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No applications yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
