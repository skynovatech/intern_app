import { useEffect, useState, useCallback } from "react";
import { RefreshCw, ScrollText } from "lucide-react";
import type { AuditLogPage } from "@/types";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function AuditLogsTab() {
  const [page, setPage] = useState<AuditLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");
  const [resourceFilter, setResourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [meta, setMeta] = useState<{ actions: string[]; resources: string[] }>({ actions: [], resources: [] });

  const fetchPage = useCallback(async () => {
    setLoading(true);
    try {
      const loadedFilters = actionFilter || resourceFilter || search;
      const res = await api.get<AuditLogPage>("/audit-logs", {
        params: {
          page: 1,
          page_size: 100,
          action: actionFilter || undefined,
          resource: resourceFilter || undefined,
          search: search || undefined,
        },
      });
      setPage(res.data);
      if (!loadedFilters) {
        setMeta({ actions: res.data.actions, resources: res.data.resources });
      }
    } catch {
      toast({ title: "Failed to load audit logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, resourceFilter, search]);

  useEffect(() => {
    const t = setTimeout(fetchPage, 300);
    return () => clearTimeout(t);
  }, [fetchPage]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" /> Audit Log
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full max-w-[180px]">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search logs..."
              className="pl-3 h-8"
            />
          </div>
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue placeholder="Action: all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {(meta.actions.length ? meta.actions : ["status_update", "settings_update", "login", "bulk_offer", "lookup_create", "lookup_update", "lookup_delete", "admin_create", "admin_update", "admin_delete"]).map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={resourceFilter} onValueChange={(v) => setResourceFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue placeholder="Resource: all" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All resources</SelectItem>
              {(meta.resources.length ? meta.resources : ["application", "offer_letter", "settings", "admin", "lookup", "auth"]).map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" className="h-8" onClick={fetchPage} disabled={loading}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !page || page.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No audit log entries match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">Time</th>
                  <th className="px-3 py-2.5 font-medium">Admin</th>
                  <th className="px-3 py-2.5 font-medium">Action</th>
                  <th className="px-3 py-2.5 font-medium">Resource</th>
                  <th className="px-3 py-2.5 font-medium">Summary</th>
                </tr>
              </thead>
              <tbody>
                {page.items.map((log) => (
                  <tr key={log.id} className="border-b border-border align-top">
                    <td className="px-3 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-xs font-medium">{log.actor_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{log.actor_email}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="secondary">{log.action}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">
                      {log.resource}
                      {log.resource_id ? <span className="ml-1 font-mono">#{log.resource_id}</span> : null}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-foreground">{log.summary ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}