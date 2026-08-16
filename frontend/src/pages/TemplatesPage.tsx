import { useEffect, useState, useCallback } from "react";
import {
  Mail,
  MessageSquare,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Info,
  Eye,
  Code,
} from "lucide-react";
import type { EmailTemplate, WhatsAppTemplate } from "@/types";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TEMPLATE_CATEGORIES = [
  { value: "status_change", label: "Status Change" },
  { value: "interview_scheduled", label: "Interview Scheduled" },
  { value: "application_confirmation", label: "Application Confirmation" },
] as const;

interface TemplateVariable {
  variable: string;
  description: string;
}

export function TemplatesPage() {
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [whatsappTemplates, setWhatsappTemplates] = useState<WhatsAppTemplate[]>([]);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState<EmailTemplate | null>(null);
  const [editingWhatsapp, setEditingWhatsapp] = useState<WhatsAppTemplate | null>(null);
  const [emailForm, setEmailForm] = useState({ name: "", subject: "", body: "", category: "", html: false });
  const [whatsappForm, setWhatsappForm] = useState({ name: "", message: "", category: "" });
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [defaultEmailTemplates, setDefaultEmailTemplates] = useState<Array<{ category: string; name: string; subject: string; body: string }>>([]);
  const [defaultWhatsappTemplates, setDefaultWhatsappTemplates] = useState<Array<{ category: string; name: string; message: string }>>([]);
  const [emailPreview, setEmailPreview] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [emailRes, waRes, varRes, defEmailRes, defWaRes] = await Promise.all([
        api.get<EmailTemplate[]>("/email-templates"),
        api.get<WhatsAppTemplate[]>("/whatsapp-templates"),
        api.get<TemplateVariable[]>("/template-variables"),
        api.get<Array<{ category: string; name: string; subject: string; body: string }>>("/default-email-templates"),
        api.get<Array<{ category: string; name: string; message: string }>>("/default-whatsapp-templates"),
      ]);
      setEmailTemplates(emailRes.data);
      setWhatsappTemplates(waRes.data);
      setTemplateVariables(varRes.data);
      setDefaultEmailTemplates(defEmailRes.data);
      setDefaultWhatsappTemplates(defWaRes.data);
    } catch {
      toast({ title: "Failed to load templates", variant: "destructive" });
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveEmailTemplate = async () => {
    try {
      const payload: Record<string, unknown> = { name: emailForm.name, subject: emailForm.subject, body: emailForm.body };
      if (emailForm.category) payload.category = emailForm.category;
      if (editingEmail) {
        await api.put(`/email-templates/${editingEmail.id}`, payload);
      } else {
        await api.post("/email-templates", payload);
      }
      setEmailDialogOpen(false);
      setEditingEmail(null);
      setEmailForm({ name: "", subject: "", body: "", category: "", html: false });
      fetchData();
    } catch {
      toast({ title: "Failed to save email template", variant: "destructive" });
    }
  };

  const handleSaveWhatsappTemplate = async () => {
    try {
      const payload = { ...whatsappForm };
      if (!payload.category) delete (payload as any).category;
      if (editingWhatsapp) {
        await api.put(`/whatsapp-templates/${editingWhatsapp.id}`, payload);
      } else {
        await api.post("/whatsapp-templates", payload);
      }
      setWhatsappDialogOpen(false);
      setEditingWhatsapp(null);
      setWhatsappForm({ name: "", message: "", category: "" });
      fetchData();
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    }
  };

  const handleDeleteEmailTemplate = async (id: number) => {
    try {
      await api.delete(`/email-templates/${id}`);
      fetchData();
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  const handleDeleteWhatsappTemplate = async (id: number) => {
    try {
      await api.delete(`/whatsapp-templates/${id}`);
      fetchData();
    } catch {
      toast({ title: "Failed to delete template", variant: "destructive" });
    }
  };

  const handleToggleEmailTemplate = async (tpl: EmailTemplate) => {
    try {
      await api.put(`/email-templates/${tpl.id}`, { is_active: !tpl.is_active });
      fetchData();
    } catch {
      toast({ title: "Failed to update template", variant: "destructive" });
    }
  };

  const handleToggleWhatsappTemplate = async (tpl: WhatsAppTemplate) => {
    try {
      await api.put(`/whatsapp-templates/${tpl.id}`, { is_active: !tpl.is_active });
      fetchData();
    } catch {
      toast({ title: "Failed to update template", variant: "destructive" });
    }
  };

  const openEditEmail = (tpl: EmailTemplate) => {
    setEditingEmail(tpl);
    setEmailForm({ name: tpl.name, subject: tpl.subject, body: tpl.body, category: tpl.category ?? "", html: false });
    setEmailDialogOpen(true);
  };

  const openEditWhatsapp = (tpl: WhatsAppTemplate) => {
    setEditingWhatsapp(tpl);
    setWhatsappForm({ name: tpl.name, message: tpl.message, category: tpl.category ?? "" });
    setWhatsappDialogOpen(true);
  };

  const openNewEmail = () => {
    setEditingEmail(null);
    setEmailForm({ name: "", subject: "", body: "", category: "", html: false });
    setEmailDialogOpen(true);
  };

  const openNewWhatsapp = () => {
    setEditingWhatsapp(null);
    setWhatsappForm({ name: "", message: "", category: "" });
    setWhatsappDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Templates</h2>
        <p className="text-sm text-muted-foreground">
          Manage email and WhatsApp message templates for communications.
        </p>
      </div>

      <Tabs defaultValue="email">
        <TabsList className="flex w-full sm:w-auto">
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="h-4 w-4" />
            Email Templates
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-1.5">
            <MessageSquare className="h-4 w-4" />
            WhatsApp Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {emailTemplates.length} custom template{emailTemplates.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm" onClick={openNewEmail}>
              <Plus className="mr-1 h-3 w-3" />
              New Template
            </Button>
          </div>

          {/* System Defaults */}
          {defaultEmailTemplates.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                System Defaults
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {defaultEmailTemplates.map((tpl, idx) => (
                  <Card key={idx} className="border-dashed border-muted-foreground/30">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm">{tpl.name}</CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground truncate">
                          Subject: {tpl.subject}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono shrink-0 ml-2">
                        {tpl.category.replace(/_/g, " ")}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                        {tpl.body}
                      </p>
                      <Separator />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onClick={async () => {
                          try {
                            const existing = emailTemplates.find(t => t.category === tpl.category);
                            let saved;
                            if (existing) {
                              const r = await api.put(`/email-templates/${existing.id}`, { name: existing.name, subject: tpl.subject, body: tpl.body, category: tpl.category });
                              saved = r.data;
                            } else {
                              const label = TEMPLATE_CATEGORIES.find(c => c.value === tpl.category)?.label || tpl.category;
                              const r = await api.post("/email-templates", { name: `${label} Template`, subject: tpl.subject, body: tpl.body, category: tpl.category });
                              saved = r.data;
                            }
                            await fetchData();
                            openEditEmail(saved);
                          } catch {
                            toast({ title: "Failed to customize template", variant: "destructive" });
                          }
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Customize
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {emailTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Mail className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No custom email templates yet. Click "New Template" or customize a system default above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {emailTemplates.map((tpl) => (
                  <Card key={tpl.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm">{tpl.name}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground truncate">
                        Subject: {tpl.subject}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {tpl.category && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {tpl.category.replace(/_/g, " ")}
                        </Badge>
                      )}
                      <Badge variant={tpl.is_active ? "default" : "secondary"}>
                        {tpl.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                      {tpl.body}
                    </p>
                    <Separator />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleEmailTemplate(tpl)}
                      >
                        {tpl.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditEmail(tpl)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteEmailTemplate(tpl.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {whatsappTemplates.length} custom template{whatsappTemplates.length !== 1 ? "s" : ""}
            </p>
            <Button size="sm" onClick={openNewWhatsapp}>
              <Plus className="mr-1 h-3 w-3" />
              New Template
            </Button>
          </div>

          {/* System Defaults */}
          {defaultWhatsappTemplates.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                System Defaults
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {defaultWhatsappTemplates.map((tpl, idx) => (
                  <Card key={idx} className="border-dashed border-muted-foreground/30">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm">{tpl.name}</CardTitle>
                        {tpl.category && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                            {tpl.category.replace(/_/g, " ")}
                          </p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                        {tpl.message}
                      </p>
                      <Separator />
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onClick={async () => {
                          try {
                            const existing = whatsappTemplates.find(t => t.category === tpl.category);
                            let saved;
                            if (existing) {
                              const r = await api.put(`/whatsapp-templates/${existing.id}`, { name: existing.name, message: tpl.message, category: tpl.category });
                              saved = r.data;
                            } else {
                              const label = TEMPLATE_CATEGORIES.find(c => c.value === tpl.category)?.label || tpl.category;
                              const r = await api.post("/whatsapp-templates", { name: `${label} Template`, message: tpl.message, category: tpl.category });
                              saved = r.data;
                            }
                            await fetchData();
                            openEditWhatsapp(saved);
                          } catch {
                            toast({ title: "Failed to customize template", variant: "destructive" });
                          }
                        }}
                      >
                        <Pencil className="mr-1 h-3 w-3" />
                        Customize
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {whatsappTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="mb-3 h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No custom WhatsApp templates yet. Click "New Template" or customize a system default above.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {whatsappTemplates.map((tpl) => (
                  <Card key={tpl.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-sm">{tpl.name}</CardTitle>
                      {tpl.category && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground font-mono">
                          {tpl.category.replace(/_/g, " ")}
                        </p>
                      )}
                    </div>
                    <Badge variant={tpl.is_active ? "default" : "secondary"}>
                      {tpl.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-wrap">
                      {tpl.message}
                    </p>
                    <Separator />
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleWhatsappTemplate(tpl)}
                      >
                        {tpl.is_active ? <X className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditWhatsapp(tpl)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteWhatsappTemplate(tpl.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Email Template Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEmail ? "Edit Email Template" : "New Email Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="et-name">Template Name</Label>
              <Input
                id="et-name"
                value={emailForm.name}
                onChange={(e) => setEmailForm({ ...emailForm, name: e.target.value })}
                placeholder="e.g. Application Received"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="et-subject">Subject</Label>
              <Input
                id="et-subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                placeholder="Email subject line"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="et-category">Category</Label>
              <Select
                value={emailForm.category}
                onValueChange={(v) => setEmailForm({ ...emailForm, category: v })}
              >
                <SelectTrigger id="et-category">
                  <SelectValue placeholder="None (manual only)" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {emailForm.category && (
                <p className="text-xs text-muted-foreground">
                  This template will auto-send on <span className="font-medium">{TEMPLATE_CATEGORIES.find(c => c.value === emailForm.category)?.label}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="et-body">Body</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEmailPreview(!emailPreview)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {emailPreview ? <Code className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {emailPreview ? "Edit" : "Preview"}
                  </button>
                  <TemplateVariablesDropdown variables={templateVariables} />
                </div>
              </div>
              {emailPreview ? (
                <div
                  className="min-h-[200px] rounded-md border border-input bg-background p-4 text-sm prose prose-sm dark:prose-invert max-w-none overflow-auto"
                  dangerouslySetInnerHTML={{ __html: emailForm.body }}
                />
              ) : (
                <Textarea
                  id="et-body"
                  value={emailForm.body}
                  onChange={(e) => setEmailForm({ ...emailForm, body: e.target.value })}
                  placeholder="Email body content... (HTML supported)"
                  rows={10}
                />
              )}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="et-html"
                  checked={emailForm.html}
                  onChange={(e) => setEmailForm({ ...emailForm, html: e.target.checked })}
                  className="h-4 w-4 rounded border-border accent-indigo-600"
                />
                <Label htmlFor="et-html" className="text-sm">Send as HTML</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEmailTemplate}
              disabled={!emailForm.name || !emailForm.subject || !emailForm.body}
            >
              {editingEmail ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Template Dialog */}
      <Dialog open={whatsappDialogOpen} onOpenChange={setWhatsappDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingWhatsapp ? "Edit WhatsApp Template" : "New WhatsApp Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wt-name">Template Name</Label>
              <Input
                id="wt-name"
                value={whatsappForm.name}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, name: e.target.value })}
                placeholder="e.g. Interview Reminder"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wt-category">Category</Label>
              <Select
                value={whatsappForm.category}
                onValueChange={(v) => setWhatsappForm({ ...whatsappForm, category: v })}
              >
                <SelectTrigger id="wt-category">
                  <SelectValue placeholder="None (manual only)" />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {whatsappForm.category && (
                <p className="text-xs text-muted-foreground">
                  This template will auto-send on <span className="font-medium">{TEMPLATE_CATEGORIES.find(c => c.value === whatsappForm.category)?.label}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="wt-message">Message</Label>
                <TemplateVariablesDropdown variables={templateVariables} />
              </div>
              <Textarea
                id="wt-message"
                value={whatsappForm.message}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, message: e.target.value })}
                placeholder="WhatsApp message content..."
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWhatsappDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveWhatsappTemplate}
              disabled={!whatsappForm.name || !whatsappForm.message}
            >
              {editingWhatsapp ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemplateVariablesPanel variables={templateVariables} />
    </div>
  );
}

function TemplateVariablesDropdown({ variables }: { variables: TemplateVariable[] }) {
  const [open, setOpen] = useState(false);
  if (variables.length === 0) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <Info className="h-3 w-3" /> Available Variables
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 w-[min(80vw,16rem)] rounded-lg border bg-card p-3 shadow-lg">
          <p className="mb-2 text-xs font-medium text-foreground">Insert a variable:</p>
          <div className="space-y-1">
            {variables.map((v) => (
              <button
                key={v.variable}
                type="button"
                className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
                onClick={() => {
                  const textarea = document.querySelector("textarea:focus") as HTMLTextAreaElement | null;
                  if (textarea) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    textarea.value = textarea.value.slice(0, start) + v.variable + textarea.value.slice(end);
                    textarea.dispatchEvent(new Event("input", { bubbles: true }));
                  }
                  setOpen(false);
                }}
              >
                <code className="text-primary">{v.variable}</code>
                <span className="ml-2 text-muted-foreground">{v.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TemplateVariablesPanel({ variables }: { variables: TemplateVariable[] }) {
  if (variables.length === 0) return null;
  return (
    <div className="mt-8 rounded-lg border border-border/50 bg-muted/20 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Available Template Variables</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {variables.map((v) => (
          <div key={v.variable} className="flex items-center gap-2 rounded-md bg-background/50 px-3 py-1.5">
            <code className="text-xs text-primary font-mono">{v.variable}</code>
            <span className="text-xs text-muted-foreground">{v.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
