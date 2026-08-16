import { useEffect, useState } from "react";
import {
  Save,
  Eye,
  Send,
  Loader2,
  User,
  FileBadge,
} from "lucide-react";
import api from "@/lib/api";
import type {
  Application,
  OfferLetter,
  OfferLetterDraftInput,
} from "@/types";
import { calculateOfferEndDate } from "@/types";
import { useDomains, useDurations } from "@/stores/lookupsStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

interface OfferLetterEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application?: Application | null;
  existing?: OfferLetter | null;
  onSaved?: () => void;
}

const EMPTY_BODY = `We are pleased to offer you an internship position at {company_name}. We are impressed by your profile and believe your skills will be a great addition to our team.

The details of your internship are as follows:

This offer is valid upon acceptance and is subject to the policies of {company_name}. We look forward to working with you and wish you a rewarding internship experience.`;

export function OfferLetterEditor({
  open,
  onOpenChange,
  application,
  existing,
  onSaved,
}: OfferLetterEditorProps) {
  const domains = useDomains();
  const durations = useDurations();
  const [form, setForm] = useState<OfferLetterDraftInput>({});
  const [offerId, setOfferId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setForm({
        application_id: existing.application_id,
        full_name: existing.full_name,
        email: existing.email,
        whatsapp: existing.whatsapp,
        degree: existing.degree,
        college: existing.college,
        city: existing.city,
        enrollment_id: existing.enrollment_id,
        technology: existing.technology,
        domain_label: existing.domain_label,
        organization: existing.organization,
        location: existing.location,
        domain: existing.domain,
        duration: existing.duration,
        start_date: existing.start_date,
        end_date: existing.end_date,
        stipend: existing.stipend,
        reporting_sme: existing.reporting_sme,
        shift_time: existing.shift_time,
        shift_days: existing.shift_days,
        sme_email: existing.sme_email,
        sme_mobile: existing.sme_mobile,
        employee_id: existing.employee_id,
        body: existing.body,
      });
      setOfferId(existing.id);
      return;
    }
    if (application) {
      setForm({
        application_id: application.id,
        full_name: application.full_name,
        email: application.email,
        whatsapp: application.whatsapp || application.mobile,
        degree: application.degree,
        college: application.college,
        city: application.address,
        enrollment_id: application.employee_id,
        technology: application.domain,
        domain_label: application.department,
        organization: null,
        location: application.address,
        domain: application.domain,
        duration: application.duration,
        start_date: application.preferred_joining_date,
        end_date: calculateOfferEndDate(
          application.preferred_joining_date,
          application.duration,
        ),
        employee_id: application.employee_id,
        body: EMPTY_BODY,
      });
    } else {
      setForm({ body: EMPTY_BODY });
    }
    setOfferId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, application, existing]);

  function set<K extends keyof OfferLetterDraftInput>(key: K, value: OfferLetterDraftInput[K]) {
    setForm((f) => {
      const next = { ...f, [key]: value === "" ? null : value };
      if (key === "duration" || key === "start_date") {
        next.end_date = calculateOfferEndDate(next.start_date, next.duration);
      }
      return next;
    });
  }

  const canSave = Boolean(form.full_name && form.email);

  async function handleSave() {
    if (!canSave) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (offerId) {
        await api.put(`/offer-letters/drafts/${offerId}`, form);
        toast({ title: "Draft updated" });
      } else {
        const res = await api.post<OfferLetter>("/offer-letters/drafts", form);
        setOfferId(res.data.id);
        toast({ title: "Draft saved", description: "You can preview or edit before sending." });
      }
      onSaved?.();
    } catch {
      toast({ title: "Failed to save draft", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    if (!offerId) {
      toast({ title: "Save the draft first to preview it", variant: "destructive" });
      return;
    }
    setPreviewing(true);
    try {
      const res = await api.get(`/offer-letters/drafts/${offerId}/preview`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast({ title: "Failed to generate preview", variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  }

  async function saveDraft(): Promise<number | null> {
    if (offerId) return offerId;
    if (!canSave) {
      toast({ title: "Name and email are required", variant: "destructive" });
      return null;
    }
    const res = await api.post<OfferLetter>("/offer-letters/drafts", form);
    setOfferId(res.data.id);
    return res.data.id;
  }

  async function handleSend() {
    setSending(true);
    try {
      const id = await saveDraft();
      if (!id) return;
      const target = form.email || existing?.email;
      if (!confirm(`Send this offer letter to ${form.full_name || existing?.full_name} (${target})?`)) return;
      await api.post(`/offer-letters/drafts/${id}/send`);
      toast({ title: "Offer letter sending initiated", description: `Sent to ${target}` });
      onSaved?.();
      onOpenChange(false);
    } catch {
      toast({ title: "Failed to send offer letter", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)] max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {offerId ? "Edit Offer Letter" : "Create Offer Letter"}
          </DialogTitle>
          <DialogDescription>
            Customize the details and letter content, then preview or send.
          </DialogDescription>
        </DialogHeader>

        {application && !existing && (
          <Badge variant="secondary" className="w-fit">
            <User className="mr-1 h-3 w-3" />
            Linked to application #{application.id} — {application.status}
          </Badge>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="ol-full-name">Full name *</Label>
            <Input
              id="ol-full-name"
              value={form.full_name ?? ""}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="Candidate name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-email">Email *</Label>
            <Input
              id="ol-email"
              type="email"
              value={form.email ?? ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="candidate@email.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-whatsapp">WhatsApp number</Label>
            <Input
              id="ol-whatsapp"
              value={form.whatsapp ?? ""}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="10 digit number"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-employee-id">Employee ID</Label>
            <Input
              id="ol-employee-id"
              value={form.employee_id ?? ""}
              onChange={(e) => set("employee_id", e.target.value)}
              placeholder="e.g. SA001"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-enrollment-id">Enrollment / Internship ID</Label>
            <Input
              id="ol-enrollment-id"
              value={form.enrollment_id ?? ""}
              onChange={(e) => set("enrollment_id", e.target.value)}
              placeholder="e.g. SA001"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-degree">Degree</Label>
            <Input
              id="ol-degree"
              value={form.degree ?? ""}
              onChange={(e) => set("degree", e.target.value)}
              placeholder="e.g. B.E. Computer Science"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-college">College / University</Label>
            <Input
              id="ol-college"
              value={form.college ?? ""}
              onChange={(e) => set("college", e.target.value)}
              placeholder="College name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-technology">Technology</Label>
            <Input
              id="ol-technology"
              value={form.technology ?? ""}
              onChange={(e) => set("technology", e.target.value)}
              placeholder="e.g. Full Stack Web Development"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-domain-label">Domain Label</Label>
            <Input
              id="ol-domain-label"
              value={form.domain_label ?? ""}
              onChange={(e) => set("domain_label", e.target.value)}
              placeholder="e.g. CSE"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-location">Location</Label>
            <Input
              id="ol-location"
              value={form.location ?? ""}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Trichy, Tamil Nadu"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-organization">Organization</Label>
            <Input
              id="ol-organization"
              value={form.organization ?? ""}
              onChange={(e) => set("organization", e.target.value)}
              placeholder="Company name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-stipend">Stipend</Label>
            <Input
              id="ol-stipend"
              value={form.stipend ?? ""}
              onChange={(e) => set("stipend", e.target.value)}
              placeholder="e.g. Not Applicable"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-reporting-sme">Reporting SME</Label>
            <Input
              id="ol-reporting-sme"
              value={form.reporting_sme ?? ""}
              onChange={(e) => set("reporting_sme", e.target.value)}
              placeholder="Name of reporting person"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-shift-time">Shift Time</Label>
            <Input
              id="ol-shift-time"
              value={form.shift_time ?? ""}
              onChange={(e) => set("shift_time", e.target.value)}
              placeholder="e.g. 10:00 AM - 5:00 PM"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-shift-days">Shift Days</Label>
            <Input
              id="ol-shift-days"
              value={form.shift_days ?? ""}
              onChange={(e) => set("shift_days", e.target.value)}
              placeholder="e.g. Mon - Sat"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-sme-email">SME Email</Label>
            <Input
              id="ol-sme-email"
              type="email"
              value={form.sme_email ?? ""}
              onChange={(e) => set("sme_email", e.target.value)}
              placeholder="sme@company.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-sme-mobile">SME Mobile</Label>
            <Input
              id="ol-sme-mobile"
              value={form.sme_mobile ?? ""}
              onChange={(e) => set("sme_mobile", e.target.value)}
              placeholder="Contact number"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-domain">Domain</Label>
            <Select value={form.domain ?? ""} onValueChange={(v) => set("domain", v)}>
              <SelectTrigger id="ol-domain">
                <SelectValue placeholder="Select domain" />
              </SelectTrigger>
              <SelectContent>
                {domains.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-duration">Duration</Label>
            <Select value={form.duration ?? ""} onValueChange={(v) => set("duration", v)}>
              <SelectTrigger id="ol-duration">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {durations.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-start-date">Start date</Label>
            <Input
              id="ol-start-date"
              value={form.start_date ?? ""}
              onChange={(e) => set("start_date", e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ol-end-date">End date</Label>
            <Input
              id="ol-end-date"
              value={form.end_date ?? ""}
              readOnly
              disabled={!form.start_date || !form.duration}
              placeholder="Auto from duration"
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Calculated automatically from start date and duration.
            </p>
          </div>
          <div className="grid gap-2 sm:col-span-2">
            <Label htmlFor="ol-body" className="flex items-center gap-1">
              <FileBadge className="h-3.5 w-3.5" />
              Letter content
            </Label>
            <Textarea
              id="ol-body"
              rows={8}
              value={form.body ?? ""}
              onChange={(e) => set("body", e.target.value)}
              placeholder="Write the offer letter body here..."
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              <code>{"{company_name}"}</code> and <code>{"{applicant_name}"}</code> are replaced automatically.
              Split paragraphs with blank lines.
            </p>
          </div>
        </div>

        {form.full_name && form.body && (
          <div className="mt-4 rounded-lg border border-border bg-muted/40 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              Live preview
            </div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
              {form.body
                .replace(/\{company_name\}/g, "Skynova Tech Solutions")
                .replace(/\{applicant_name\}/g, form.full_name)
                .replace(/\{employee_id\}/g, form.employee_id || "—")
                .replace(/\{domain\}/g, form.domain || "—")
                .replace(/\{duration\}/g, form.duration || "—")}
            </pre>
          </div>
        )}

        <DialogFooter className="mt-2 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={saving || !canSave}
          >
            {saving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />}
            {offerId ? "Save changes" : "Save draft"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={previewing || !offerId}
          >
            {previewing ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Eye className="mr-1 h-3 w-3" />}
            Preview PDF
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !canSave}
          >
            {sending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Send className="mr-1 h-3 w-3" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}