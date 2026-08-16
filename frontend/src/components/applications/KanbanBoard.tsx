import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Star, GraduationCap, Building2, Loader2, MoreHorizontal,
  CheckCircle, XCircle, Calendar, StickyNote, Star as StarIcon,
} from "lucide-react";
import type { Application } from "@/types";
import { STATUS_COLORS } from "@/types";
import { useStatuses } from "@/stores/lookupsStore";
import { cn, formatDate } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub,
  DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

const COLUMN_ACCENTS: Record<string, string> = {
  Pending: "border-t-yellow-400",
  Reviewed: "border-t-blue-400",
  Shortlisted: "border-t-purple-400",
  "Interview Scheduled": "border-t-indigo-400",
  "Interview Completed": "border-t-cyan-400",
  Selected: "border-t-green-400",
  Rejected: "border-t-red-400",
  Withdrawn: "border-t-gray-400",
};

const DOT_COLORS: Record<string, string> = {
  Pending: "bg-yellow-400",
  Reviewed: "bg-blue-400",
  Shortlisted: "bg-purple-400",
  "Interview Scheduled": "bg-indigo-400",
  "Interview Completed": "bg-cyan-400",
  Selected: "bg-green-400",
  Rejected: "bg-red-400",
  Withdrawn: "bg-gray-400",
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface KanbanBoardProps {
  applications: Application[];
  loading?: boolean;
  onStatusChange: (id: number, newStatus: string) => void;
  refetch?: () => void;
}

function QuickActions({ app, onStatusChange, refetch }: {
  app: Application;
  onStatusChange: (id: number, newStatus: string) => void;
  refetch?: () => void;
}) {
  const statuses = useStatuses();
  const [actionLoading, setActionLoading] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(app.notes ?? "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [interviewForm, setInterviewForm] = useState({
    scheduled_date: "", scheduled_time: "", interview_type: "Video",
    interviewer: "", location: "", notes: "",
  });
  const [interviewSaving, setInterviewSaving] = useState(false);

  const run = async (action: string, fn: () => Promise<unknown>, successMsg: string) => {
    setActionLoading(action);
    try {
      await fn();
      toast({ title: successMsg, variant: "success" });
      refetch?.();
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      setActionLoading("");
    }
  };

  const setRating = (rating: number) =>
    run("rating", () => api.put(`/applications/${app.id}/rating`, { rating }), `Rating set to ${rating}`);

  const saveNote = async () => {
    setNoteSaving(true);
    try {
      await api.put(`/applications/${app.id}/notes`, { notes: noteText });
      setNoteOpen(false);
      toast({ title: "Note saved", variant: "success" });
      refetch?.();
    } catch {
      toast({ title: "Failed to save note", variant: "destructive" });
    } finally {
      setNoteSaving(false);
    }
  };

  const scheduleInterview = async () => {
    if (!interviewForm.scheduled_date || !interviewForm.scheduled_time) return;
    setInterviewSaving(true);
    try {
      await api.post(`/applications/${app.id}/interview`, interviewForm);
      setInterviewOpen(false);
      toast({ title: "Interview scheduled", variant: "success" });
      onStatusChange(app.id, "Interview Scheduled");
    } catch {
      toast({ title: "Failed to schedule interview", variant: "destructive" });
    } finally {
      setInterviewSaving(false);
    }
  };

  const iconSize = "h-3.5 w-3.5";

  return (
    <>
      <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-green-600 hover:text-green-700"
          disabled={actionLoading === "shortlist" || app.status === "Shortlisted"}
          onClick={() => onStatusChange(app.id, "Shortlisted")}
          aria-label="Shortlist"
        >
          {actionLoading === "shortlist" ? <Loader2 className={cn(iconSize, "animate-spin")} /> : <CheckCircle className={iconSize} />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-red-600 hover:text-red-700"
          disabled={actionLoading === "reject" || app.status === "Rejected"}
          onClick={() => onStatusChange(app.id, "Rejected")}
          aria-label="Reject"
        >
          {actionLoading === "reject" ? <Loader2 className={cn(iconSize, "animate-spin")} /> : <XCircle className={iconSize} />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="More actions">
              <MoreHorizontal className={iconSize} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuLabel className="font-semibold text-xs">{app.full_name}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2">
                <StarIcon className="h-4 w-4" /> Set rating
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {[5, 4, 3, 2, 1, 0].map((r) => (
                    <DropdownMenuItem key={r} disabled={actionLoading === "rating"} onClick={() => setRating(r)}>
                      <span className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <StarIcon key={i} className={cn("h-3.5 w-3.5", i < r ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600")} />
                        ))}
                        {r === 0 && <span className="text-xs text-muted-foreground">None</span>}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>

            <DropdownMenuItem onClick={() => { setNoteText(app.notes ?? ""); setNoteOpen(true); }}>
              <StickyNote className="h-4 w-4" /> Add note
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setInterviewOpen(true)}>
              <Calendar className="h-4 w-4" /> Schedule interview
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {statuses.filter((s) => s !== app.status).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onStatusChange(app.id, s)}>
                Move to {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Note for {app.full_name}</DialogTitle>
            <DialogDescription>Internal note visible only to HR.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={5}
            placeholder="Add an internal note..."
          />
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveNote} disabled={noteSaving}>
              {noteSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={interviewOpen} onOpenChange={setInterviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>Schedule an interview for {app.full_name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={interviewForm.scheduled_date} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={interviewForm.scheduled_time} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_time: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Interviewer</Label>
              <Input value={interviewForm.interviewer} onChange={(e) => setInterviewForm({ ...interviewForm, interviewer: e.target.value })} placeholder="Interviewer name" />
            </div>
            <div className="space-y-2">
              <Label>Location / Link</Label>
              <Input value={interviewForm.location} onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })} placeholder="Office address or video link" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={scheduleInterview} disabled={interviewSaving || !interviewForm.scheduled_date || !interviewForm.scheduled_time}>
              {interviewSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function KanbanBoard({ applications, loading, onStatusChange, refetch }: KanbanBoardProps) {
  const statuses = useStatuses();
  const [dragId, setDragId] = useState<number | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const groups = statuses.map((status) => ({
    status,
    items: applications.filter((a) => a.status === status),
  }));

  const handleDrop = (status: string) => {
    if (dragId != null) {
      const app = applications.find((a) => a.id === dragId);
      if (app && app.status !== status) {
        onStatusChange(dragId, status);
      }
    }
    setDragId(null);
    setOverColumn(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-border py-16">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Loading pipeline...</span>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border py-16 text-center">
        <p className="text-sm text-muted-foreground">No applications match the current view</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {groups.map(({ status, items }) => (
        <div
          key={status}
          onDragOver={(e) => {
            e.preventDefault();
            setOverColumn(status);
          }}
          onDragLeave={() => setOverColumn((cur) => (cur === status ? null : cur))}
          onDrop={() => handleDrop(status)}
          className={cn(
            "flex min-w-[260px] max-w-[280px] flex-1 flex-col rounded-xl border border-t-2 border-border bg-muted/20 transition-colors",
            COLUMN_ACCENTS[status] ?? "",
            overColumn === status ? "bg-primary/10 ring-2 ring-primary/40" : ""
          )}
        >
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", DOT_COLORS[status] ?? "bg-gray-400")} />
              <span className="text-sm font-semibold text-foreground">{status}</span>
            </div>
            <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
              {items.length}
            </span>
          </div>

          <div className="flex flex-col gap-2 p-2">
            {items.length === 0 && (
              <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted-foreground">
                Drop here
              </div>
            )}
            {items.map((app) => (
              <div
                key={app.id}
                draggable
                onDragStart={(e) => {
                  setDragId(app.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverColumn(null);
                }}
                className={cn(
                  "group cursor-grab rounded-lg border border-border bg-background p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing",
                  dragId === app.id ? "opacity-50" : ""
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    to={`/applications/${app.id}`}
                    className="flex min-w-0 items-center gap-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {initials(app.full_name)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
                        {app.full_name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        #{app.id} &middot; {app.domain}
                      </span>
                    </span>
                  </Link>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-medium", STATUS_COLORS[app.status] ?? "")}>
                    {app.status}
                  </span>
                </div>

                <div className="mt-2.5 space-y-1">
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{app.college}</span>
                    {app.cgpa != null && <span className="ml-auto font-medium tabular-nums">{app.cgpa}</span>}
                  </p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{app.degree} &middot; {app.duration}</span>
                  </p>
                </div>

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-3 w-3",
                          i < app.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 dark:text-gray-600"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] text-muted-foreground">{formatDate(app.created_at)}</span>
                </div>

                <div className="mt-2 flex items-center justify-end border-t border-border/60 pt-1.5">
                  <QuickActions app={app} onStatusChange={onStatusChange} refetch={refetch} />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}