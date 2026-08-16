import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Loader2,
  RefreshCw,
  Download,
  Send,
  Mail,
  UserPlus,
  Plus,
  Pencil,
  Trash2,
  Eye,
  Users,
  FilePlus2,
  Copy,
  CheckCircle2,
  CheckSquare,
  Clock,
} from "lucide-react";
import api from "@/lib/api";
import type { Application, OfferLetter, OfferLetterStats, OfferBulkResult, JobEntry } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OfferLetterEditor } from "@/components/applications/OfferLetterEditor";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

function makeFilename(name: string, id: number) {
  return `Offer_Letter_${name.replace(/[^a-zA-Z0-9]+/g, "_")}_${id}.pdf`;
}

const OFFER_JOB_KINDS = ["send_offer_letter_draft_notification", "send_offer_letter_notification"];

export function OfferLettersPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [drafts, setDrafts] = useState<OfferLetter[]>([]);
  const [stats, setStats] = useState<OfferLetterStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState<"draft" | "send" | null>(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorApp, setEditorApp] = useState<Application | null>(null);
  const [editorDraft, setEditorDraft] = useState<OfferLetter | null>(null);

  const fetchOfferLetters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<Application[]>("/offer-letters", {
        params: { search: search || undefined },
      });
      setApplications(res.data);
    } catch {
      setApplications([]);
      toast({ title: "Failed to load selected candidates", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchDrafts = useCallback(async () => {
    try {
      setLoadingDrafts(true);
      const res = await api.get<OfferLetter[]>("/offer-letters/drafts", {
        params: { search: draftSearch || undefined },
      });
      setDrafts(res.data);
    } catch {
      setDrafts([]);
      toast({ title: "Failed to load drafts", variant: "destructive" });
    } finally {
      setLoadingDrafts(false);
    }
  }, [draftSearch]);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const res = await api.get<OfferLetterStats>("/offer-letters/stats");
      setStats(res.data);
    } catch {
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setJobsLoading(true);
      const res = await api.get<JobEntry[]>("/jobs", {
        params: { kind: OFFER_JOB_KINDS.join(","), limit: 20 },
      });
      setJobs(res.data);
    } catch {
      setJobs([]);
    } finally {
      setJobsLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    fetchOfferLetters();
    fetchDrafts();
    fetchStats();
    fetchJobs();
  }, [fetchOfferLetters, fetchDrafts, fetchStats, fetchJobs]);

  useEffect(() => {
    const t = setTimeout(fetchOfferLetters, 300);
    return () => clearTimeout(t);
  }, [fetchOfferLetters]);

  useEffect(() => {
    const t = setTimeout(fetchDrafts, 300);
    return () => clearTimeout(t);
  }, [fetchDrafts]);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  useEffect(() => {
    fetchJobs();
    const id = setInterval(fetchJobs, 15_000);
    return () => clearInterval(id);
  }, [fetchJobs]);

  function openCreateFromApp(app: Application) {
    setEditorDraft(null);
    setEditorApp(app);
    setEditorOpen(true);
  }

  function openBlank() {
    setEditorApp(null);
    setEditorDraft(null);
    setEditorOpen(true);
  }

  function openEditDraft(draft: OfferLetter) {
    setEditorApp(null);
    setEditorDraft(draft);
    setEditorOpen(true);
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleSelectAll(ids: number[]) {
    setSelectedIds((prev) => (prev.length === ids.length ? [] : ids));
  }

  async function handleBulk(action: "draft" | "send") {
    if (selectedIds.length === 0) return;
    if (!confirm(`${action === "draft" ? "Create" : "Send"} offer letters for ${selectedIds.length} selected candidate(s)?`)) return;
    setBulkAction(action);
    try {
      const res = await api.post<OfferBulkResult>("/offer-letters/bulk", {
        application_ids: selectedIds,
        action,
      });
      const created = res.data.created.length;
      const queued = res.data.queued.length;
      toast({
        title: `Bulk ${action} complete`,
        description: `${created} draft(s) created, ${queued} send job(s) queued.`,
        variant: "success",
      });
      setSelectedIds([]);
      refreshAll();
    } catch {
      toast({ title: "Bulk action failed", variant: "destructive" });
    } finally {
      setBulkAction(null);
    }
  }

  async function handleDuplicateDraft(draft: OfferLetter) {
    setBusyKey(`dup-${draft.id}`);
    try {
      await api.post<OfferLetter>(`/offer-letters/drafts/${draft.id}/duplicate`);
      toast({ title: "Draft duplicated", variant: "success" });
      await fetchDrafts();
    } catch {
      toast({ title: "Failed to duplicate draft", variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSendDraft(draft: OfferLetter) {
    if (!confirm(`Send offer letter for ${draft.full_name} (${draft.email})?`)) return;
    setBusyKey(`send-${draft.id}`);
    try {
      const res = await api.post(`/offer-letters/drafts/${draft.id}/send`);
      toast({ title: "Offer letter sending initiated", description: res.data.message, variant: "success" });
      await fetchDrafts();
      fetchStats();
      fetchJobs();
    } catch {
      toast({ title: "Failed to send offer letter", variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePreviewDraft(draft: OfferLetter) {
    setBusyId(draft.id);
    setBusyKey("preview");
    try {
      const res = await api.get(`/offer-letters/drafts/${draft.id}/preview`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast({ title: "Failed to generate preview", variant: "destructive" });
    } finally {
      setBusyId(null);
      setBusyKey(null);
    }
  }

  async function handleDeleteDraft(draft: OfferLetter) {
    if (!confirm(`Delete draft offer letter for ${draft.full_name}?`)) return;
    try {
      await api.delete(`/offer-letters/drafts/${draft.id}`);
      toast({ title: "Draft deleted" });
      await fetchDrafts();
      await fetchStats();
    } catch {
      toast({ title: "Failed to delete draft", variant: "destructive" });
    }
  }

  const handleDownload = async (app: Application) => {
    try {
      setBusyId(app.id);
      setBusyKey("download");
      const res = await api.get(`/applications/${app.id}/offer-letter`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = makeFilename(app.full_name, app.id);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Offer letter downloaded", variant: "success" });
    } catch {
      toast({
        title: "Failed to generate offer letter",
        description: "Only selected applications can receive an offer letter.",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
      setBusyKey(null);
    }
  };

  const handleSend = async (app: Application) => {
    if (!confirm(`Send offer letter to ${app.full_name} (${app.email})?`)) return;
    try {
      setBusyId(app.id);
      setBusyKey("send");
      const res = await api.post(`/applications/${app.id}/offer-letter/send`);
      toast({ title: "Offer letter sent", description: res.data.message, variant: "success" });
      refreshAll();
    } catch {
      toast({ title: "Failed to send offer letter", variant: "destructive" });
    } finally {
      setBusyId(null);
      setBusyKey(null);
    }
  };

  const handleBulkSendAll = async () => {
    const ids = applications.map((a) => a.id);
    if (ids.length === 0) return;
    if (!confirm(`Queue offer letters for ALL ${ids.length} selected candidate(s)?`)) return;
    setBulkAction("send");
    try {
      await api.post("/offer-letters/bulk", { application_ids: ids, action: "send" });
      toast({ title: "Send jobs queued", variant: "success" });
      fetchStats();
      fetchJobs();
    } catch {
      toast({ title: "Failed to queue sends", variant: "destructive" });
    } finally {
      setBulkAction(null);
    }
  };

  const isBusy = (id: number, key?: string) => busyId === id && (key ? busyKey === key : true);

  const bulkAllSelected = selectedIds.length === applications.length && applications.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Offer Letters</h2>
          <p className="text-sm text-muted-foreground">
            Create, edit, preview, and send internship offer letters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={openBlank}>
            <Plus className="mr-1 h-4 w-4" />
            New Offer Letter
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={refreshAll}
            disabled={loading || loadingDrafts}
          >
            {(loading || loadingDrafts) ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <StatsBar stats={stats} loading={statsLoading} onSendAll={handleBulkSendAll} sendingAll={bulkAction === "send"} />

      <Tabs defaultValue="selected">
        <TabsList>
          <TabsTrigger value="selected" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Selected Candidates
          </TabsTrigger>
          <TabsTrigger value="drafts" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Drafts & Sent
            {drafts.length > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {drafts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="jobs" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Send Jobs
            {stats && stats.offer_jobs.pending + stats.offer_jobs.running + stats.offer_jobs.failed > 0 && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]">
                {stats.offer_jobs.pending + stats.offer_jobs.running + stats.offer_jobs.failed}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="selected">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-primary" />
                Selected Candidates
              </CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                {selectedIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedIds.length} selected</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7"
                      disabled={bulkAction !== null}
                      onClick={() => handleBulk("draft")}
                    >
                      {bulkAction === "draft" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <FilePlus2 className="mr-1 h-3 w-3" />}
                      Create Drafts
                    </Button>
                    <Button
                      size="sm"
                      className="h-7"
                      disabled={bulkAction !== null}
                      onClick={() => handleBulk("send")}
                    >
                      {bulkAction === "send" ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
                      Send
                    </Button>
                  </div>
                )}
                <div className="relative w-full max-w-xs">
                  <SearchIcon />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, email, or Employee ID..."
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SkeletonRows />
              ) : applications.length === 0 ? (
                <EmptyState icon={<UserPlus className="mx-auto h-10 w-10 text-muted-foreground" />} title="No selected candidates" body='When an application is moved to "Selected", it will appear here with an auto-generated Employee ID.' />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 font-medium">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={bulkAllSelected}
                            onChange={() => toggleSelectAll(applications.map((a) => a.id))}
                          />
                        </th>
                        <th className="px-3 py-2.5 font-medium">Candidate</th>
                        <th className="px-3 py-2.5 font-medium">Email</th>
                        <th className="px-3 py-2.5 font-medium">Employee ID</th>
                        <th className="px-3 py-2.5 font-medium">Domain</th>
                        <th className="px-3 py-2.5 font-medium">Duration</th>
                        <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.map((app) => (
                        <tr key={app.id} className="border-b border-border transition-colors hover:bg-accent/50">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input"
                              checked={selectedIds.includes(app.id)}
                              onChange={() => toggleSelect(app.id)}
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="font-medium text-foreground">{app.full_name}</div>
                            <div className="text-xs text-muted-foreground">#{app.id}</div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">
                            <span className="inline-flex items-center gap-1.5">
                              <Mail className="h-3 w-3" />
                              {app.email}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {app.employee_id ? (
                              <Badge variant="outline" className="font-mono">
                                {app.employee_id}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{app.domain}</td>
                          <td className="px-3 py-3 text-muted-foreground">{app.duration}</td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                onClick={() => openCreateFromApp(app)}
                              >
                                <Pencil className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                disabled={isBusy(app.id, "download")}
                                onClick={() => handleDownload(app)}
                              >
                                {isBusy(app.id, "download") ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Download className="mr-1 h-3 w-3" />
                                )}
                                Download
                              </Button>
                              <Button
                                size="sm"
                                className="h-7"
                                disabled={isBusy(app.id, "send")}
                                onClick={() => handleSend(app)}
                              >
                                {isBusy(app.id, "send") ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="mr-1 h-3 w-3" />
                                )}
                                Send
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-primary" />
                Draft & Sent Letters
              </CardTitle>
              <div className="relative w-full max-w-xs">
                <SearchIcon />
                <Input
                  value={draftSearch}
                  onChange={(e) => setDraftSearch(e.target.value)}
                  placeholder="Search drafts..."
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {loadingDrafts ? (
                <SkeletonRows />
              ) : drafts.length === 0 ? (
                <EmptyState icon={<FilePlus2 className="mx-auto h-10 w-10 text-muted-foreground" />} title="No offer letters yet" body='Click "New Offer Letter" to manually create one, or open Edit on any selected candidate.' />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2.5 font-medium">Candidate</th>
                        <th className="px-3 py-2.5 font-medium">Email</th>
                        <th className="px-3 py-2.5 font-medium">Employee ID</th>
                        <th className="px-3 py-2.5 font-medium">Status</th>
                        <th className="px-3 py-2.5 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {drafts.map((draft) => (
                        <tr key={draft.id} className="border-b border-border transition-colors hover:bg-accent/50">
                          <td className="px-3 py-3">
                            <div className="font-medium text-foreground">{draft.full_name}</div>
                            <div className="text-xs text-muted-foreground">Draft #{draft.id}</div>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{draft.email}</td>
                          <td className="px-3 py-3">
                            {draft.employee_id ? (
                              <Badge variant="outline" className="font-mono">
                                {draft.employee_id}
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <Badge variant={draft.status === "sent" ? "default" : "secondary"}>
                              {draft.status}
                            </Badge>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                onClick={() => openEditDraft(draft)}
                              >
                                <Pencil className="mr-1 h-3 w-3" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                disabled={busyKey === `dup-${draft.id}`}
                                onClick={() => handleDuplicateDraft(draft)}
                              >
                                {busyKey === `dup-${draft.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Copy className="mr-1 h-3 w-3" />
                                )}
                                Duplicate
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                disabled={isBusy(draft.id, "preview")}
                                onClick={() => handlePreviewDraft(draft)}
                              >
                                {isBusy(draft.id, "preview") ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Eye className="mr-1 h-3 w-3" />
                                )}
                                Preview
                              </Button>
                              <Button
                                size="sm"
                                className="h-7"
                                disabled={draft.status === "sent" || isBusy(draft.id, "send")}
                                onClick={() => handleSendDraft(draft)}
                              >
                                {isBusy(draft.id, "send") ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Send className="mr-1 h-3 w-3" />
                                )}
                                Send
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-destructive"
                                onClick={() => handleDeleteDraft(draft)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs">
          <JobMonitor jobs={jobs} loading={jobsLoading} onRefresh={fetchJobs} stats={stats} />
        </TabsContent>
      </Tabs>

      <OfferLetterEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        application={editorApp}
        existing={editorDraft}
        onSaved={() => {
          refreshAll();
        }}
      />
    </div>
  );
}

function StatsBar({ stats, loading, onSendAll, sendingAll }: {
  stats: OfferLetterStats | null;
  loading: boolean;
  onSendAll: () => void;
  sendingAll: boolean;
}) {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  const s = stats;
  const items = [
    { label: "Selected", value: s?.selected_candidates ?? "—", icon: Users, tone: "text-primary" },
    { label: "With Emp. ID", value: s?.with_employee_id ?? "—", icon: CheckSquare, tone: "text-emerald-600" },
    { label: "Drafts", value: s?.drafts ?? "—", icon: FileText, tone: "text-amber-600" },
    { label: "Sent", value: s?.sent ?? "—", icon: Send, tone: "text-sky-600" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {items.map((it) => (
        <Card key={it.label}>
          <CardContent className="flex items-center gap-3 p-4">
            <it.icon className={"h-5 w-5 " + it.tone} />
            <div>
              <div className="text-xl font-bold text-foreground">{it.value}</div>
              <div className="text-xs text-muted-foreground">{it.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardContent className="flex flex-col justify-center p-4">
          <Button size="sm" variant="outline" className="h-7 w-full" disabled={sendingAll || !s || s.selected_candidates === 0} onClick={onSendAll}>
            {sendingAll ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
            Send All
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function JobMonitor({ jobs, loading, onRefresh, stats }: {
  jobs: JobEntry[];
  loading: boolean;
  onRefresh: () => void;
  stats: OfferLetterStats | null;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Offer Letter Send Jobs
          <span className="text-xs font-normal text-muted-foreground">auto-refreshes every 15s</span>
        </CardTitle>
        <div className="flex items-center gap-2">
          {stats && (
            <Badge variant="secondary">{stats.offer_jobs.pending} pending · {stats.offer_jobs.running} running · {stats.offer_jobs.failed} failed</Badge>
          )}
          <Button size="sm" variant="outline" className="h-7" onClick={onRefresh} disabled={loading}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(loading && jobs.length === 0) ? (
          <SkeletonRows />
        ) : jobs.length === 0 ? (
          <EmptyState icon={<CheckCircle2 className="mx-auto h-10 w-10 text-muted-foreground" />} title="No offer letter jobs" body="Sending an offer letter will create a job here, with live status updates." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2.5 font-medium">ID</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">Kind</th>
                  <th className="px-3 py-2.5 font-medium">Attempts</th>
                  <th className="px-3 py-2.5 font-medium">Created</th>
                  <th className="px-3 py-2.5 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-border align-top">
                    <td className="px-3 py-2.5 font-mono text-xs">#{job.id}</td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant={
                          job.status === "done" ? "default" : job.status === "failed" ? "destructive" : "secondary"
                        }
                      >
                        {job.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{job.kind}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{job.attempts}/{job.max_attempts}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{new Date(job.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2.5 max-w-[220px] truncate text-xs text-red-600" title={job.error ?? undefined}>
                      {job.error ?? "—"}
                    </td>
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

function SearchIcon() {
  return (
    <svg
      className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
    </svg>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 sm:p-10 text-center">
      {icon}
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}