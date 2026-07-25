import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft, Star, Calendar, ExternalLink, GitBranch, Link as LinkIcon,
  Globe, Save, Send, FileText, User, GraduationCap, Briefcase,
  Wrench, Link2, Download, Mail, Phone, MapPin, Cake, Building2,
  BookOpen, Clock, ChevronRight, MessageSquare, BadgeCheck,
  Loader2, Activity, History, MessageCircle, Image, Edit2,
} from "lucide-react";
import type {
  Application, StatusHistoryEntry, Interview, CommunicationLog,
  EmailTemplate, WhatsAppTemplate,
} from "@/types";
import { APPLICATION_STATUSES, STATUS_COLORS } from "@/types";
import api from "@/lib/api";
import { formatDate, formatDateTime } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const INTERVIEW_TYPES = ["Video", "In-Person", "Phone"] as const;

function fileUrl(path: string | null): string {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `/uploads/${path}`;
}

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [app, setApp] = useState<Application | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [communications, setCommunications] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const [interviewDialogOpen, setInterviewDialogOpen] = useState(false);
  const [interviewForm, setInterviewForm] = useState({ scheduled_date: "", scheduled_time: "", interview_type: "Video", interviewer: "", location: "", notes: "" });
  const [schedulingInterview, setSchedulingInterview] = useState(false);

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: "", message: "", html: false });
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [whatsappForm, setWhatsappForm] = useState({ message: "" });
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);

  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingPhoto, setDownloadingPhoto] = useState(false);

  const [editingRemarks, setEditingRemarks] = useState<Record<number, string>>({});
  const [savingRemarks, setSavingRemarks] = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [appRes, historyRes, interviewsRes, commsRes, emailTplRes, waTplRes] = await Promise.all([
        api.get<Application>(`/applications/${id}`),
        api.get<StatusHistoryEntry[]>(`/applications/${id}/history`),
        api.get<Interview[]>(`/applications/${id}/interviews`),
        api.get<CommunicationLog[]>(`/applications/${id}/communications`),
        api.get<EmailTemplate[]>("/email-templates"),
        api.get<WhatsAppTemplate[]>("/whatsapp-templates"),
      ]);
      setApp(appRes.data);
      setHistory(historyRes.data);
      setInterviews(interviewsRes.data);
      setCommunications(commsRes.data);
      setEmailTemplates(emailTplRes.data);
      setWhatsappTemplates(waTplRes.data);
      setNotes(appRes.data.notes ?? "");
    } catch {
      toast({ title: "Failed to load application details", variant: "destructive" });
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await api.put(`/applications/${id}/status`, { new_status: newStatus });
      setApp((prev) => (prev ? { ...prev, status: newStatus } : null));
      const r = await api.get<StatusHistoryEntry[]>(`/applications/${id}/history`);
      setHistory(r.data);
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  const handleRatingChange = async (rating: number) => {
    if (!id) return;
    try { await api.put(`/applications/${id}`, { rating }); setApp((prev) => (prev ? { ...prev, rating } : null)); } catch {
      toast({ title: "Failed to update rating", variant: "destructive" });
    }
  };

  const handleSaveNotes = async () => {
    if (!id) return;
    try { setSavingNotes(true); await api.put(`/applications/${id}`, { notes }); } catch {
      toast({ title: "Failed to save notes", variant: "destructive" });
    } finally { setSavingNotes(false); }
  };

  const handleScheduleInterview = async () => {
    if (!id) return;
    try {
      setSchedulingInterview(true);
      await api.post(`/applications/${id}/interview`, interviewForm);
      const r = await api.get<Interview[]>(`/applications/${id}/interviews`);
      setInterviews(r.data);
      setInterviewDialogOpen(false);
      setInterviewForm({ scheduled_date: "", scheduled_time: "", interview_type: "Video", interviewer: "", location: "", notes: "" });
    } catch {
      toast({ title: "Failed to schedule interview", variant: "destructive" });
    } finally { setSchedulingInterview(false); }
  };

  const handleSendEmail = async () => {
    if (!id || !app) return;
    try {
      setSendingEmail(true);
      await api.post(`/applications/${id}/send-email`, { to_email: app.email, subject: emailForm.subject, message: emailForm.message, html: emailForm.html });
      const r = await api.get<CommunicationLog[]>(`/applications/${id}/communications`);
      setCommunications(r.data);
      setEmailDialogOpen(false);
      setEmailForm({ subject: "", message: "", html: false });
    } catch {
      toast({ title: "Failed to send email", variant: "destructive" });
    } finally { setSendingEmail(false); }
  };

  const handleSendWhatsapp = async () => {
    if (!id || !app) return;
    const phone = app.whatsapp || app.mobile;
    if (!phone) return;
    try {
      setSendingWhatsapp(true);
      await api.post(`/applications/${id}/send-whatsapp`, { to_phone: phone, message: whatsappForm.message });
      const r = await api.get<CommunicationLog[]>(`/applications/${id}/communications`);
      setCommunications(r.data);
      setWhatsappDialogOpen(false);
      setWhatsappForm({ message: "" });
    } catch {
      toast({ title: "Failed to send WhatsApp message", variant: "destructive" });
    } finally { setSendingWhatsapp(false); }
  };

  const handleDownloadPdf = async () => {
    if (!id) return;
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/applications/${id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url; link.download = `application_${app?.full_name.replace(/\s+/g, "_")}.pdf`; link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Failed to download PDF", variant: "destructive" });
    } finally { setDownloadingPdf(false); }
  };

  const handleSaveRemarks = async (interviewId: number) => {
    const text = editingRemarks[interviewId]?.trim();
    if (text === undefined) return;
    setSavingRemarks((prev) => ({ ...prev, [interviewId]: true }));
    try {
      await api.put(`/interview/${interviewId}/remarks`, { remarks: text });
      setInterviews((prev) => prev.map((iv) => (iv.id === interviewId ? { ...iv, remarks: text } : iv)));
      setEditingRemarks((prev) => { const n = { ...prev }; delete n[interviewId]; return n; });
    } catch {
      toast({ title: "Failed to save remarks", variant: "destructive" });
    } finally { setSavingRemarks((prev) => ({ ...prev, [interviewId]: false })); }
  };

  const handleDownloadPhoto = async () => {
    if (!id) return;
    setDownloadingPhoto(true);
    try {
      const res = await api.get(`/applications/${id}/photo`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      const ct = res.headers["content-type"];
      const ext = typeof ct === "string" && ct.includes("png") ? ".png" : ".jpg";
      link.href = url; link.download = `${app?.full_name.replace(/\s+/g, "_")}_photo${ext}`; link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Failed to download photo", variant: "destructive" });
    } finally { setDownloadingPhoto(false); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
          <div className="space-y-6"><Skeleton className="h-64 rounded-xl" /><Skeleton className="h-64 rounded-xl" /></div>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg text-muted-foreground">Application not found</p>
        <Button variant="link" asChild className="mt-2"><Link to="/applications">Back to Applications</Link></Button>
      </div>
    );
  }

  const initials = app.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const photoSrc = fileUrl(app.photo_path);
  const resumeSrc = fileUrl(app.resume_path);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/applications"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <nav className="flex items-center gap-1 text-sm text-muted-foreground flex-1 min-w-0">
          <Link to="/applications" className="hover:text-foreground shrink-0">Applications</Link>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="text-foreground font-medium truncate">{app.full_name}</span>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloadingPdf} className="h-8">
            {downloadingPdf ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
            PDF
          </Button>
          {app.photo_path && (
            <Button variant="outline" size="sm" onClick={handleDownloadPhoto} disabled={downloadingPhoto} className="h-8">
              {downloadingPhoto ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Image className="mr-1.5 h-3.5 w-3.5" />}
              Photo
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <div className="flex items-center gap-5 p-6 sm:flex-1">
            <Avatar className="h-20 w-20 border-2 border-primary/20 shrink-0">
              <AvatarImage src={photoSrc} alt={app.full_name} />
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-bold text-foreground">{app.full_name}</h2>
                <Badge variant="outline" className="text-xs font-mono">#{app.id}</Badge>
                <Badge className={`${STATUS_COLORS[app.status] ?? ""} text-xs`}>{app.status}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{app.email}</span>
                <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{app.mobile}</span>
                <span className="flex items-center gap-1.5 text-xs">Applied {formatDate(app.created_at)}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 border-t bg-muted/30 p-4 sm:border-t-0 sm:border-l sm:px-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <button key={i} onClick={() => handleRatingChange(i + 1)} className="focus:outline-none">
                <Star className={`h-5 w-5 transition-colors ${i < app.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300 hover:text-yellow-200 dark:text-gray-600"}`} />
              </button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile"><User className="h-4 w-4 mr-2" />Profile</TabsTrigger>
              <TabsTrigger value="timeline"><History className="h-4 w-4 mr-2" />Timeline</TabsTrigger>
              <TabsTrigger value="interviews"><Briefcase className="h-4 w-4 mr-2" />Interviews</TabsTrigger>
              <TabsTrigger value="communications"><MessageCircle className="h-4 w-4 mr-2" />Communications</TabsTrigger>
              <TabsTrigger value="resume"><FileText className="h-4 w-4 mr-2" />Resume</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6 mt-0">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><User className="h-4 w-4 text-primary" /> Personal Details</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Full Name" value={app.full_name} />
                    <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={app.email} />
                    <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Mobile" value={app.mobile} />
                    {app.whatsapp && <InfoRow icon={<MessageCircle className="h-3.5 w-3.5" />} label="WhatsApp" value={app.whatsapp} />}
                    <InfoRow icon={<Cake className="h-3.5 w-3.5" />} label="Date of Birth" value={formatDate(app.dob)} />
                    <InfoRow icon={<User className="h-3.5 w-3.5" />} label="Gender" value={app.gender} />
                    {app.address && <div className="sm:col-span-2"><InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={app.address} /></div>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><GraduationCap className="h-4 w-4 text-primary" /> Education</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label="College" value={app.college} />
                    <InfoRow icon={<BookOpen className="h-3.5 w-3.5" />} label="Degree" value={app.degree} />
                    <InfoRow icon={<GraduationCap className="h-3.5 w-3.5" />} label="Department" value={app.department} />
                    <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Current Year" value={app.current_year} />
                    {app.cgpa != null && <InfoRow icon={<BadgeCheck className="h-3.5 w-3.5" />} label="CGPA" value={String(app.cgpa)} />}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Briefcase className="h-4 w-4 text-primary" /> Internship Preferences</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    <InfoRow icon={<Briefcase className="h-3.5 w-3.5" />} label="Domain" value={app.domain} />
                    <InfoRow icon={<Clock className="h-3.5 w-3.5" />} label="Duration" value={app.duration} />
                    {app.preferred_joining_date && <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label="Preferred Joining" value={formatDate(app.preferred_joining_date)} />}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wrench className="h-4 w-4 text-primary" /> Skills</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {app.technical_skills && app.technical_skills.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Technical Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {app.technical_skills.map((s) => <Badge key={s} variant="secondary" className="rounded-full">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                  {app.soft_skills && app.soft_skills.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Soft Skills</p>
                      <div className="flex flex-wrap gap-2">
                        {app.soft_skills.map((s) => <Badge key={s} variant="outline" className="rounded-full">{s}</Badge>)}
                      </div>
                    </div>
                  )}
                  {(!app.technical_skills?.length && !app.soft_skills?.length) && <p className="text-sm text-muted-foreground">No skills listed</p>}
                </CardContent>
              </Card>

              {(app.projects || app.certifications) && (
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4 text-primary" /> Projects & Certifications</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {app.projects && <div><p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Projects</p><p className="whitespace-pre-wrap text-sm">{app.projects}</p></div>}
                    {app.certifications && <div><p className="mb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Certifications</p><p className="whitespace-pre-wrap text-sm">{app.certifications}</p></div>}
                  </CardContent>
                </Card>
              )}

              {(app.github || app.linkedin || app.portfolio) && (
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4 text-primary" /> Links</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {app.github && <a href={app.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"><GitBranch className="h-4 w-4" /> GitHub <ExternalLink className="h-3 w-3" /></a>}
                      {app.linkedin && <a href={app.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"><LinkIcon className="h-4 w-4" /> LinkedIn <ExternalLink className="h-3 w-3" /></a>}
                      {app.portfolio && <a href={app.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-accent"><Globe className="h-4 w-4" /> Portfolio <ExternalLink className="h-3 w-3" /></a>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="space-y-4 mt-0">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" /> Status History</CardTitle></CardHeader>
                <CardContent>
                  {history.length > 0 ? (
                    <div className="space-y-0">
                      {history.slice().sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((entry) => (
                        <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                          <div className="absolute left-[7px] top-2 h-full w-px bg-border last:hidden" />
                          <div className="relative z-10 mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-background" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{entry.old_status ? `${entry.old_status} \u2192 ${entry.new_status}` : entry.new_status}</p>
                            {entry.changed_by && <p className="text-xs text-muted-foreground">by {entry.changed_by}</p>}
                            {entry.notes && <p className="mt-0.5 text-xs text-muted-foreground">{entry.notes}</p>}
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-muted-foreground">No status changes yet</p>}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="interviews" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{interviews.length} interview{interviews.length !== 1 ? "s" : ""} scheduled</p>
                <Button size="sm" onClick={() => setInterviewDialogOpen(true)}>
                  <Calendar className="mr-1.5 h-4 w-4" /> Schedule Interview
                </Button>
              </div>
              {interviews.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {interviews.map((iv) => (
                    <Card key={iv.id}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">{iv.interview_type}</Badge>
                          <Badge variant={iv.status === "Completed" ? "default" : iv.status === "Cancelled" ? "destructive" : "secondary"}>{iv.status}</Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{formatDate(iv.scheduled_date)} at {iv.scheduled_time}</p>
                          {iv.interviewer && <p className="text-xs text-muted-foreground mt-0.5">Interviewer: {iv.interviewer}</p>}
                          {iv.location && <p className="text-xs text-muted-foreground">Location: {iv.location}</p>}
                        </div>
                        {iv.notes && <p className="text-xs text-muted-foreground">{iv.notes}</p>}
                        <Separator />
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Interviewer Remarks</p>
                            <button
                              type="button"
                              onClick={() => setEditingRemarks((prev) => ({ ...prev, [iv.id]: iv.remarks ?? "" }))}
                              className="text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          </div>
                          {editingRemarks[iv.id] !== undefined ? (
                            <div className="space-y-2">
                              <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                rows={3}
                                value={editingRemarks[iv.id] ?? ""}
                                onChange={(e) => setEditingRemarks((prev) => ({ ...prev, [iv.id]: e.target.value }))}
                                placeholder="Add interviewer remarks..."
                              />
                              <div className="flex gap-2">
                                <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveRemarks(iv.id)} disabled={savingRemarks[iv.id]}>
                                  {savingRemarks[iv.id] ? "Saving..." : "Save"}
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingRemarks((prev) => { const n = { ...prev }; delete n[iv.id]; return n; })}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : iv.remarks ? (
                            <p className="whitespace-pre-wrap text-xs text-foreground">{iv.remarks}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No remarks yet</p>
                          )}
                        </div>
                        {iv.result && <p className="text-xs font-medium text-foreground">Result: {iv.result}</p>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No interviews scheduled</p>}
            </TabsContent>

            <TabsContent value="communications" className="space-y-4 mt-0">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{communications.length} communication{communications.length !== 1 ? "s" : ""}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEmailDialogOpen(true)}><Mail className="mr-1.5 h-4 w-4" /> Send Email</Button>
                  <Button size="sm" variant="outline" onClick={() => setWhatsappDialogOpen(true)}><MessageSquare className="mr-1.5 h-4 w-4" /> Send WhatsApp</Button>
                </div>
              </div>
              {communications.length > 0 ? (
                <div className="space-y-3">
                  {communications.map((comm) => (
                    <Card key={comm.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            {comm.channel === "email" ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                            {comm.channel}
                          </Badge>
                          <Badge variant={comm.status === "sent" ? "default" : "secondary"} className="text-xs">{comm.status}</Badge>
                        </div>
                        {comm.subject && <p className="text-sm font-medium mb-1">{comm.subject}</p>}
                        <p className="text-xs text-muted-foreground line-clamp-2">{comm.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{formatDateTime(comm.created_at)}{comm.sent_by && ` \u2022 ${comm.sent_by}`}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">No communications logged</p>}
            </TabsContent>

            <TabsContent value="resume" className="space-y-4 mt-0">
              {app.resume_path ? (
                <Card>
                  <CardContent className="p-0">
                    {app.resume_path.endsWith(".pdf") ? (
                      <iframe src={resumeSrc} className="h-[600px] w-full rounded-lg" title="Resume Preview" />
                    ) : (
                      <div className="flex flex-col items-center py-12">
                        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <p className="text-sm text-muted-foreground mb-4">Resume file is not a PDF</p>
                        <Button variant="outline" asChild><a href={resumeSrc} download><Download className="mr-2 h-4 w-4" />Download Resume</a></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : <p className="text-sm text-muted-foreground">No resume uploaded</p>}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Change Status</p>
                <Select value={app.status} onValueChange={handleStatusChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {APPLICATION_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Separator className="my-4" />
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Notes</p>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add notes about this candidate..." rows={4} />
                <Button size="sm" className="mt-2 w-full" onClick={handleSaveNotes} disabled={savingNotes}>
                  {savingNotes ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Save className="mr-2 h-3 w-3" />}
                  {savingNotes ? "Saving..." : "Save Notes"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Recent Timeline</CardTitle></CardHeader>
            <CardContent className="max-h-64 overflow-y-auto">
              {history.length > 0 ? (
                <div className="space-y-0">
                  {history.slice(0, 5).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((entry) => (
                    <div key={entry.id} className="relative flex gap-3 pb-3 last:pb-0">
                      <div className="absolute left-[6px] top-1.5 h-full w-px bg-border last:hidden" />
                      <div className="relative z-10 mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-primary bg-background" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium">{entry.old_status ? `${entry.old_status} \u2192 ${entry.new_status}` : entry.new_status}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(entry.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">No changes yet</p>}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={interviewDialogOpen} onOpenChange={setInterviewDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Date</Label><Input type="date" value={interviewForm.scheduled_date} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_date: e.target.value })} /></div>
              <div className="space-y-2"><Label>Time</Label><Input type="time" value={interviewForm.scheduled_time} onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_time: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Type</Label>
              <Select value={interviewForm.interview_type} onValueChange={(v) => setInterviewForm({ ...interviewForm, interview_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{INTERVIEW_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Interviewer</Label><Input value={interviewForm.interviewer} onChange={(e) => setInterviewForm({ ...interviewForm, interviewer: e.target.value })} placeholder="Interviewer name" /></div>
            <div className="space-y-2"><Label>Location / Link</Label><Input value={interviewForm.location} onChange={(e) => setInterviewForm({ ...interviewForm, location: e.target.value })} placeholder="Office address or video link" /></div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={interviewForm.notes} onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })} placeholder="Any additional notes..." rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInterviewDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleScheduleInterview} disabled={schedulingInterview || !interviewForm.scheduled_date || !interviewForm.scheduled_time}>
              {schedulingInterview ? "Scheduling..." : <><Send className="mr-2 h-4 w-4" />Schedule Interview</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={emailDialogOpen} onOpenChange={(open) => { setEmailDialogOpen(open); if (!open) setEmailForm({ subject: "", message: "", html: false }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send Email to {app.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm"><span className="text-muted-foreground">To:</span> <span className="font-medium">{app.email}</span></div>
            {emailTemplates.filter((t) => t.is_active).length > 0 && (
              <div className="space-y-2">
                <Label>Use Template</Label>
                <Select onValueChange={(v) => { const t = emailTemplates.find((t) => t.id === Number(v)); if (t) setEmailForm({ subject: t.subject, message: t.body }); }}>
                  <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                  <SelectContent>{emailTemplates.filter((t) => t.is_active).map((tpl) => <SelectItem key={tpl.id} value={String(tpl.id)}>{tpl.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Subject</Label><Input value={emailForm.subject} onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })} placeholder="Email subject..." /></div>
            <div className="space-y-2"><Label>Message</Label><Textarea value={emailForm.message} onChange={(e) => setEmailForm({ ...emailForm, message: e.target.value })} placeholder="Type your email message..." rows={8} /></div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="html-toggle" checked={emailForm.html} onChange={(e) => setEmailForm({ ...emailForm, html: e.target.checked })} className="h-4 w-4 rounded border-border accent-indigo-600" />
              <Label htmlFor="html-toggle" className="text-sm">HTML format</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEmailDialogOpen(false); setEmailForm({ subject: "", message: "", html: false }); }}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={sendingEmail || !emailForm.subject || !emailForm.message}>
              {sendingEmail ? "Sending..." : <><Send className="mr-2 h-4 w-4" />Send Email</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={whatsappDialogOpen} onOpenChange={(open) => { setWhatsappDialogOpen(open); if (!open) setWhatsappForm({ message: "" }); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send WhatsApp to {app.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">To:</span> <span className="font-medium">{app.whatsapp || app.mobile}</span>
              {!app.whatsapp && <span className="ml-2 text-xs text-muted-foreground">(using mobile)</span>}
            </div>
            {whatsappTemplates.filter((t) => t.is_active).length > 0 && (
              <div className="space-y-2">
                <Label>Use Template</Label>
                <Select onValueChange={(v) => { const t = whatsappTemplates.find((t) => t.id === Number(v)); if (t) setWhatsappForm({ message: t.message }); }}>
                  <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                  <SelectContent>{whatsappTemplates.filter((t) => t.is_active).map((tpl) => <SelectItem key={tpl.id} value={String(tpl.id)}>{tpl.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Message</Label><Textarea value={whatsappForm.message} onChange={(e) => setWhatsappForm({ message: e.target.value })} placeholder="Type your WhatsApp message..." rows={6} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setWhatsappDialogOpen(false); setWhatsappForm({ message: "" }); }}>Cancel</Button>
            <Button onClick={handleSendWhatsapp} disabled={sendingWhatsapp || !whatsappForm.message}>
              {sendingWhatsapp ? "Sending..." : <><Send className="mr-2 h-4 w-4" />Send WhatsApp</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-muted-foreground shrink-0">{icon}</span>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
