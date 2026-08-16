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
import { TrendingUp, Users, Target, Award } from "lucide-react";
import type { AnalyticsData } from "@/types";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
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

const FUNNEL_STATUS_ORDER = [
  "Pending",
  "Reviewed",
  "Shortlisted",
  "Interview Scheduled",
  "Interview Completed",
  "Selected",
  "Rejected",
  "Withdrawn",
];

const FUNNEL_COLORS = [
  "#ca8a04",
  "#2563eb",
  "#7c3aed",
  "#6366f1",
  "#0891b2",
  "#16a34a",
  "#dc2626",
  "#6b7280",
];

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<AnalyticsData>("/analytics");
      setAnalytics(res.data);
    } catch {
      toast({ title: "Failed to load analytics", variant: "destructive" });
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (!analytics) return null;

  const { stats, domain_distribution, gender_distribution, daily_applications, college_distribution } =
    analytics;

  const domainData = domain_distribution.map((d) => ({
    name: d.domain,
    value: d.count,
  }));

  const genderData = gender_distribution.map((d) => ({
    name: d.domain,
    value: d.count,
  }));

  const dailyData = daily_applications.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    }),
    count: d.count,
  }));

  const collegeData = college_distribution.slice(0, 10).map((d) => ({
    name: d.domain.length > 20 ? d.domain.slice(0, 20) + "..." : d.domain,
    fullName: d.domain,
    value: d.count,
  }));

  const funnelData = FUNNEL_STATUS_ORDER.map((status) => ({
    name: status,
    value: stats[status.toLowerCase().replace(/ /g, "_") as keyof typeof stats] ?? 0,
  })).filter((d) => d.value > 0);

  const summaryStats = [
    {
      label: "Total Applications",
      value: stats.total,
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      label: "Selection Rate",
      value:
        stats.total > 0
          ? `${((stats.selected / stats.total) * 100).toFixed(1)}%`
          : "0%",
      icon: Target,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "Avg. Per Day",
      value:
        daily_applications.length > 0
          ? (daily_applications.reduce((s, d) => s + d.count, 0) /
              daily_applications.length
            ).toFixed(1)
          : "0",
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      label: "Top Domain",
      value:
        domain_distribution.length > 0
          ? domain_distribution.reduce((a, b) =>
              a.count > b.count ? a : b
            ).domain
          : "N/A",
      icon: Award,
      color: "text-orange-500",
      bg: "bg-orange-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Analytics Dashboard
        </h2>
        <p className="text-sm text-muted-foreground">
          Insights and trends from your internship applications
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {summaryStats.map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className={`rounded-lg ${stat.bg} p-3`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Applications Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    interval={Math.max(0, Math.floor(dailyData.length / 10))}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    fill="#2563eb"
                    radius={[4, 4, 0, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No daily data available
              </div>
            )}
          </CardContent>
        </Card>

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
                      `${(name ?? "").length > 15 ? (name ?? "").slice(0, 15) + "..." : name} (${((percent ?? 0) * 100).toFixed(0)}%)`
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
            <CardTitle>Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name ?? ""} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                    outerRadius="65%"
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {genderData.map((_, index) => (
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
                No gender data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Colleges</CardTitle>
          </CardHeader>
          <CardContent>
            {collegeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={collegeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value) => [value, "Applications"]}
                    labelFormatter={(_label, payload) =>
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (payload as any)?.[0]?.payload?.fullName ?? _label
                    }
                  />
                  <Bar
                    dataKey="value"
                    fill="#7c3aed"
                    radius={[0, 4, 4, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                No college data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {funnelData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Status Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((item, index) => {
                const maxValue = funnelData[0]?.value ?? 1;
                const percentage =
                  maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                return (
                  <div key={item.name} className="flex items-center gap-4">
                    <div className="w-32 sm:w-40 shrink-0 text-right text-sm font-medium text-muted-foreground">
                      {item.name}
                    </div>
                    <div className="relative h-8 flex-1 overflow-hidden rounded-lg bg-muted/30">
                      <div
                        className="absolute inset-y-0 left-0 flex items-center rounded-lg px-3 transition-all duration-500"
                        style={{
                          width: `${Math.max(percentage, 8)}%`,
                          backgroundColor:
                            FUNNEL_COLORS[index % FUNNEL_COLORS.length],
                        }}
                      >
                        <span className="text-xs font-semibold text-white">
                          {item.value}
                        </span>
                      </div>
                    </div>
                    <div className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
