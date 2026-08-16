import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Eye, Star, MoreHorizontal, ArrowUpDown,
  CheckCircle, XCircle, Mail, MessageSquare, Calendar,
  CheckCheck, X, Send, FolderDown, SlidersHorizontal, RotateCcw,
  FilterX, FileDown, Loader2, Trash2, Columns3, List as ListIcon,
} from "lucide-react";
import { KanbanBoard } from "@/components/applications/KanbanBoard";
import type { Application, PaginatedResponse } from "@/types";
import { STATUS_COLORS } from "@/types";
import { useStatuses, useDomains, useGenders, useYears, useDegrees, useDurations } from "@/stores/lookupsStore";
import api from "@/lib/api";
import { formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/components/ui/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

type SortField = "id" | "full_name" | "email" | "college" | "domain" | "status" | "rating" | "created_at";
type SortOrder = "asc" | "desc";

export function ApplicationsPage() {
  const statuses = useStatuses();
  const domains = useDomains();
  const genders = useGenders();
  const years = useYears();
  const degrees = useDegrees();
  const durations = useDurations();

  const [searchParams] = useSearchParams();
  const [data, setData] = useState<Application[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [perPage] = useState(10);
  const [view, setView] = useState<"table" | "kanban">("table");
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Application | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [domainFilter, setDomainFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [degreeFilter, setDegreeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [cgpaMin, setCgpaMin] = useState("");
  const [cgpaMax, setCgpaMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("created_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkWhatsAppOpen, setBulkWhatsAppOpen] = useState(false);
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    scheduled_date: "", scheduled_time: "", interview_type: "Video",
    interviewer: "", location: "", notes: "",
  });

  const hasActiveFilters = [statusFilter, domainFilter, genderFilter, degreeFilter, yearFilter, durationFilter]
    .some((f) => f !== "all") || cgpaMin || cgpaMax || dateFrom || dateTo || search;

  const filtersApplied = [statusFilter, domainFilter, genderFilter, degreeFilter, yearFilter, durationFilter]
    .filter((f) => f !== "all").length;

  const fetchData = useCallback(async () => {
    try { setLoading(true);
      const effectivePerPage = view === "kanban" ? 10000 : perPage;
      const params: Record<string, string | number> = { page: view === "kanban" ? 1 : page, per_page: effectivePerPage, sort_by: sortBy, sort_order: sortOrder };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (domainFilter !== "all") params.domain = domainFilter;
      if (genderFilter !== "all") params.gender = genderFilter;
      if (degreeFilter !== "all") params.degree = degreeFilter;
      if (yearFilter !== "all") params.current_year = yearFilter;
      if (durationFilter !== "all") params.duration = durationFilter;
      if (cgpaMin) params.cgpa_min = parseFloat(cgpaMin);
      if (cgpaMax) params.cgpa_max = parseFloat(cgpaMax);
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await api.get<PaginatedResponse<Application>>("/applications", { params });
      setData(res.data.items);
      setTotalPages(res.data.total_pages);
      setTotal(res.data.total);
    } catch {
      toast({ title: "Failed to load applications", variant: "destructive" });
    } finally { setLoading(false); }
  }, [page, perPage, view, search, statusFilter, domainFilter, genderFilter, degreeFilter, yearFilter, durationFilter, cgpaMin, cgpaMax, dateFrom, dateTo, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, statusFilter, domainFilter, genderFilter, degreeFilter, yearFilter, durationFilter, cgpaMin, cgpaMax, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch(""); setStatusFilter("all"); setDomainFilter("all"); setGenderFilter("all");
    setDegreeFilter("all"); setYearFilter("all"); setDurationFilter("all");
    setCgpaMin(""); setCgpaMax(""); setDateFrom(""); setDateTo("");
  };

  const handleSort = (field: SortField) => {
    if (sortBy === field) setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortOrder("asc"); }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await api.put(`/applications/${id}/status`, { new_status: newStatus });
      setData((prev) => prev.map((app) => (app.id === id ? { ...app, status: newStatus } : app)));
      toast({ title: "Status updated", description: `Changed to ${newStatus}`, variant: "success" });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleDeleteApplication = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/applications/${deleteTarget.id}`);
      setDeleteTarget(null);
      toast({ title: "Application deleted", description: `${deleteTarget.full_name} was removed`, variant: "success" });
      fetchData();
    } catch {
      toast({ title: "Failed to delete application", variant: "destructive" });
    } finally { setDeleting(false); }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.size) return;
    setDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/applications/${id}`)));
      const count = selectedIds.size;
      setSelectedIds(new Set());
      toast({ title: "Applications deleted", description: `${count} application(s) removed`, variant: "success" });
      fetchData();
    } catch {
      toast({ title: "Bulk delete failed", variant: "destructive" });
    } finally { setDeleting(false); }
  };

  const toggleSelect = (id: number) => setSelectedIds((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  const toggleSelectAll = () => setSelectedIds(selectedIds.size === data.length ? new Set() : new Set(data.map((a) => a.id)));
  const clearSelection = () => setSelectedIds(new Set());

  const bulkStatusChange = async (s: string) => {
    if (!selectedIds.size) return;
    setBulkProcessing(true);
    try {
      const res = await api.put("/applications/bulk/status", { ids: Array.from(selectedIds), new_status: s });
      setSelectedIds(new Set()); fetchData();
      toast({ title: "Bulk update complete", description: res.data.message, variant: "success" });
    } catch {
      toast({ title: "Bulk update failed", variant: "destructive" });
    } finally { setBulkProcessing(false); }
  };

  const handleBulkEmail = async () => {
    if (!selectedIds.size || !bulkSubject || !bulkMessage) return;
    setBulkProcessing(true);
    try {
      const res = await api.post("/applications/bulk/send-email", { ids: Array.from(selectedIds), subject: bulkSubject, message: bulkMessage });
      setBulkEmailOpen(false); setBulkSubject(""); setBulkMessage("");
      toast({ title: "Emails sent", description: res.data.message, variant: "success" });
    } catch {
      toast({ title: "Bulk email failed", variant: "destructive" });
    } finally { setBulkProcessing(false); }
  };

  const handleBulkWhatsApp = async () => {
    if (!selectedIds.size || !bulkMessage) return;
    setBulkProcessing(true);
    try {
      const res = await api.post("/applications/bulk/send-whatsapp", { ids: Array.from(selectedIds), message: bulkMessage });
      setBulkWhatsAppOpen(false); setBulkMessage("");
      toast({ title: "WhatsApp messages sent", description: res.data.message, variant: "success" });
    } catch {
      toast({ title: "Bulk WhatsApp failed", variant: "destructive" });
    } finally { setBulkProcessing(false); }
  };

  const handleBulkInterview = async () => {
    if (!selectedIds.size || !interviewForm.scheduled_date || !interviewForm.scheduled_time) return;
    setBulkProcessing(true);
    try {
      const res = await api.post("/applications/bulk/interview", {
        ids: Array.from(selectedIds), ...interviewForm,
      });
      setInterviewDialogOpen(false);
      setInterviewForm({ scheduled_date: "", scheduled_time: "", interview_type: "Video", interviewer: "", location: "", notes: "" });
      setSelectedIds(new Set()); fetchData();
      toast({ title: "Interviews scheduled", description: res.data.message, variant: "success" });
    } catch {
      toast({ title: "Bulk interview scheduling failed", variant: "destructive" });
    } finally { setBulkProcessing(false); }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const params: Record<string, string | number> = { per_page: 10000, sort_by: sortBy, sort_order: sortOrder };
      if (search) params.search = search;
      if (statusFilter !== "all") params.status = statusFilter;
      if (domainFilter !== "all") params.domain = domainFilter;
      if (genderFilter !== "all") params.gender = genderFilter;
      if (degreeFilter !== "all") params.degree = degreeFilter;
      if (yearFilter !== "all") params.current_year = yearFilter;
      if (durationFilter !== "all") params.duration = durationFilter;
      if (cgpaMin) params.cgpa_min = parseFloat(cgpaMin);
      if (cgpaMax) params.cgpa_max = parseFloat(cgpaMax);
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const res = await api.get<PaginatedResponse<Application>>("/applications", { params });
      const apps = res.data.items;
      const headers = ["Name", "Email", "Mobile", "WhatsApp", "Gender", "College", "Degree", "Department", "Year", "Domain", "Status", "Rating", "CGPA", "Duration", "Date"];
      const rows = apps.map((a) => [a.full_name, a.email, a.mobile, a.whatsapp || "", a.gender, a.college, a.degree, a.department, a.current_year, a.domain, a.status, String(a.rating), a.cgpa != null ? String(a.cgpa) : "", a.duration, formatDate(a.created_at)]);
      const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href = url; link.download = `applications_${new Date().toISOString().slice(0, 10)}.csv`; link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: `${apps.length} applications exported`, variant: "success" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally { setExporting(false); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortOrder === "asc" ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />;
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"}`} />
      ))}
    </div>
  );

  const FilterSelect = ({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: readonly string[]; label: string }) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {label}s</SelectItem>
        {options.filter((o) => o !== "all").map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Applications</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{total} total application{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("table")}
              className={cn("h-8 gap-1.5 text-xs", view === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground")}
            >
              <ListIcon className="h-4 w-4" /> Table
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("kanban")}
              className={cn("h-8 gap-1.5 text-xs", view === "kanban" ? "bg-primary/10 text-primary" : "text-muted-foreground")}
            >
              <Columns3 className="h-4 w-4" /> Pipeline
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setFiltersOpen(!filtersOpen)} className={hasActiveFilters ? "border-primary" : ""}>
            <SlidersHorizontal className="mr-1.5 h-4 w-4" />
            Filters
            {filtersApplied > 0 && <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-xs">{filtersApplied}</Badge>}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileDown className="mr-1.5 h-4 w-4" />}
            Export
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search by name, email, or college..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
      </div>

      {filtersOpen && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Advanced Filters</span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <RotateCcw className="mr-1 h-3 w-3" /> Reset
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <FilterSelect value={statusFilter} onChange={setStatusFilter} options={["all", ...statuses]} label="Status" />
              <FilterSelect value={domainFilter} onChange={setDomainFilter} options={["all", ...domains]} label="Domain" />
              <FilterSelect value={genderFilter} onChange={setGenderFilter} options={["all", ...genders]} label="Gender" />
              <FilterSelect value={degreeFilter} onChange={setDegreeFilter} options={["all", ...degrees]} label="Degree" />
              <FilterSelect value={yearFilter} onChange={setYearFilter} options={["all", ...years]} label="Year" />
              <FilterSelect value={durationFilter} onChange={setDurationFilter} options={["all", ...durations]} label="Duration" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CGPA Min</Label>
                <Input type="number" placeholder="Min" value={cgpaMin} onChange={(e) => setCgpaMin(e.target.value)} className="h-9 text-xs" min={0} max={10} step={0.1} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">CGPA Max</Label>
                <Input type="number" placeholder="Max" value={cgpaMax} onChange={(e) => setCgpaMax(e.target.value)} className="h-9 text-xs" min={0} max={10} step={0.1} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From Date</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To Date</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-xs" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-primary/5 p-3 animate-in slide-in-from-top-2">
          <span className="text-sm font-semibold mr-1">{selectedIds.size} selected</span>
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={() => bulkStatusChange("Shortlisted")} disabled={bulkProcessing} className="h-8 text-xs">
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Shortlist
          </Button>
          <Button variant="ghost" size="sm" onClick={() => bulkStatusChange("Selected")} disabled={bulkProcessing} className="h-8 text-xs text-green-600">
            <CheckCircle className="mr-1 h-3.5 w-3.5" /> Select
          </Button>
          <Button variant="ghost" size="sm" onClick={() => bulkStatusChange("Rejected")} disabled={bulkProcessing} className="h-8 text-xs text-red-600">
            <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
          </Button>
          <div className="h-4 w-px bg-border mx-1" />
          <Button variant="ghost" size="sm" onClick={() => { setBulkSubject(""); setBulkMessage(""); setBulkEmailOpen(true); }} disabled={bulkProcessing} className="h-8 text-xs">
            <Mail className="mr-1 h-3.5 w-3.5" /> Email
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setBulkMessage(""); setBulkWhatsAppOpen(true); }} disabled={bulkProcessing} className="h-8 text-xs">
            <MessageSquare className="mr-1 h-3.5 w-3.5" /> WhatsApp
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setInterviewDialogOpen(true)} disabled={bulkProcessing} className="h-8 text-xs">
            <Calendar className="mr-1 h-3.5 w-3.5" /> Interview
          </Button>
          <Button variant="ghost" size="sm" onClick={async () => {
            try {
              const res = await api.post("/applications/bulk/download", { ids: Array.from(selectedIds) }, { responseType: "blob" });
              const url = URL.createObjectURL(res.data); const link = document.createElement("a");
              link.href = url; link.download = `applications_bulk_${new Date().toISOString().slice(0, 10)}.zip`; link.click(); URL.revokeObjectURL(url);
            } catch {
              toast({ title: "Bulk download failed", variant: "destructive" });
            }
          }} disabled={bulkProcessing} className="h-8 text-xs">
            <FolderDown className="mr-1 h-3.5 w-3.5" /> Download
          </Button>
          <Button variant="ghost" size="sm" onClick={handleBulkDelete} disabled={bulkProcessing || deleting} className="h-8 text-xs text-red-600 hover:text-red-700">
            {deleting ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1 h-3.5 w-3.5" />} Delete
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={clearSelection} disabled={bulkProcessing} className="h-8 text-xs text-muted-foreground">
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        </div>
      )}

      <Dialog open={bulkEmailOpen} onOpenChange={setBulkEmailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Email</DialogTitle>
            <DialogDescription>Send email to {selectedIds.size} selected applicant(s)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Subject</Label><Input value={bulkSubject} onChange={(e) => setBulkSubject(e.target.value)} placeholder="Enter email subject" /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} placeholder="Type your message..." rows={8} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleBulkEmail} disabled={bulkProcessing || !bulkSubject || !bulkMessage}>
              <Send className="mr-2 h-4 w-4" /> {bulkProcessing ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk Schedule Interview</DialogTitle>
            <DialogDescription>Schedule interview for {selectedIds.size} selected applicant(s)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={interviewForm.scheduled_date} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={interviewForm.scheduled_time} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_time: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={interviewForm.interview_type} onValueChange={(v) => setInterviewForm({ ...interviewForm, interview_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Video", "In-Person", "Phone"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Interviewer</Label><Input value={interviewForm.interviewer} onChange={(e) => setInterviewForm({ ...interviewForm, interviewer: e.target.value })} placeholder="Interviewer name" /></div>
            <div className="space-y-2"><Label>Location / Link</Label><Input value={interviewForm.location} onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })} placeholder="Office address or video link" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={interviewForm.notes} onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })} placeholder="Additional notes..." rows={3} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleBulkInterview} disabled={bulkProcessing || !interviewForm.scheduled_date || !interviewForm.scheduled_time}>
              <Calendar className="mr-2 h-4 w-4" /> {bulkProcessing ? "Scheduling..." : "Schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkWhatsAppOpen} onOpenChange={setBulkWhatsAppOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bulk WhatsApp</DialogTitle>
            <DialogDescription>Send WhatsApp to {selectedIds.size} selected applicant(s)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Message</Label><Textarea value={bulkMessage} onChange={(e) => setBulkMessage(e.target.value)} placeholder="Type your message..." rows={8} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleBulkWhatsApp} disabled={bulkProcessing || !bulkMessage}>
              <Send className="mr-2 h-4 w-4" /> {bulkProcessing ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.full_name}</span>? This will
              permanently remove the application, its resume, and photo. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleDeleteApplication} disabled={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {view === "kanban" ? (
        <KanbanBoard
          applications={data}
          loading={loading}
          onStatusChange={handleStatusChange}
          refetch={fetchData}
        />
      ) : (
        <>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10"><Checkbox checked={data.length > 0 && selectedIds.size === data.length} onChange={toggleSelectAll} aria-label="Select all applications" /></TableHead>
              <TableHead className="cursor-pointer select-none hidden sm:table-cell w-16" onClick={() => handleSort("id")} aria-sort={sortBy === "id" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}><span className="flex items-center text-xs">ID <SortIcon field="id" /></span></TableHead>
              <TableHead className="cursor-pointer select-none min-w-[140px]" onClick={() => handleSort("full_name")} aria-sort={sortBy === "full_name" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}><span className="flex items-center text-xs">Name <SortIcon field="full_name" /></span></TableHead>
              <TableHead className="cursor-pointer select-none hidden md:table-cell min-w-[180px]" onClick={() => handleSort("email")} aria-sort={sortBy === "email" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}><span className="flex items-center text-xs">Email <SortIcon field="email" /></span></TableHead>
              <TableHead className="cursor-pointer select-none hidden lg:table-cell" onClick={() => handleSort("college")} aria-sort={sortBy === "college" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}><span className="flex items-center text-xs">College <SortIcon field="college" /></span></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("domain")} aria-sort={sortBy === "domain" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}><span className="flex items-center text-xs">Domain <SortIcon field="domain" /></span></TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")} aria-sort={sortBy === "status" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}><span className="flex items-center text-xs">Status <SortIcon field="status" /></span></TableHead>
              <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort("rating")} aria-sort={sortBy === "rating" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}><span className="flex items-center text-xs">Rating <SortIcon field="rating" /></span></TableHead>
              <TableHead className="cursor-pointer select-none hidden sm:table-cell" onClick={() => handleSort("created_at")} aria-sort={sortBy === "created_at" ? (sortOrder === "asc" ? "ascending" : "descending") : "none"}><span className="flex items-center text-xs">Date <SortIcon field="created_at" /></span></TableHead>
              <TableHead className="text-right w-24"><span className="text-xs">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 10 }).map((__, j) => <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : data.length > 0 ? (
              data.map((app) => (
                <TableRow key={app.id} className={`group transition-colors ${selectedIds.has(app.id) ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                  <TableCell><Checkbox checked={selectedIds.has(app.id)} onChange={() => toggleSelect(app.id)} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground font-mono tabular-nums hidden sm:table-cell">#{app.id}</TableCell>
                  <TableCell>
                    <Link to={`/applications/${app.id}`} className="font-medium text-sm hover:text-primary transition-colors">
                      {app.full_name}
                    </Link>
                    <p className="text-xs text-muted-foreground md:hidden">{app.email}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{app.email}</TableCell>
                  <TableCell className="text-sm hidden lg:table-cell max-w-[200px] truncate">{app.college}</TableCell>
                  <TableCell className="text-sm">{app.domain}</TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[app.status] ?? ""} text-xs font-medium`}>{app.status}</Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{renderStars(app.rating)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap hidden sm:table-cell">{formatDate(app.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link to={`/applications/${app.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                      </Button>
                      {app.status !== "Shortlisted" && app.status !== "Rejected" && app.status !== "Selected" && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-700 hidden sm:inline-flex" onClick={() => handleStatusChange(app.id, "Shortlisted")}>
                            <CheckCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hidden sm:inline-flex" onClick={() => handleStatusChange(app.id, "Rejected")}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-40">
                          <DropdownMenuItem asChild><Link to={`/applications/${app.id}`}><Eye className="mr-2 h-4 w-4" />View Details</Link></DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-700"
                            onClick={() => setDeleteTarget(app)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />Delete Application
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {statuses.map((s) => (
                            <DropdownMenuItem key={s} disabled={app.status === s} onClick={() => handleStatusChange(app.id, s)}>
                              Move to {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <FilterX className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">No applications found</p>
                    {hasActiveFilters && (
                      <Button variant="link" size="sm" onClick={clearFilters} className="text-xs">Clear filters</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="h-9">
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <div className="flex flex-wrap items-center gap-1">
              {Array.from({ length: totalPages }).map((_, i) => {
                const p = i + 1;
                if (p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
                  return <Button key={p} variant={p === page ? "default" : "outline"} size="sm" className="h-9 w-9 p-0 text-xs" onClick={() => setPage(p)}>{p}</Button>;
                if (p === page - 2 || p === page + 2) return <span key={p} className="px-1 text-xs text-muted-foreground">...</span>;
                return null;
              })}
            </div>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="h-9">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
