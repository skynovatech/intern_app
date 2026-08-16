import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  FileText,
  Plus,
  Save,
  Trash2,
  Copy,
  Eye,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  EyeOff,
  Settings2,
  ListOrdered,
  Palette,
  CheckCircle2,
} from "lucide-react";
import type {
  OfferLetterTemplate,
  OfferLetterTemplateListItem,
  OfferLetterStructure,
  OfferLetterDesign,
  OfferLetterSection,
  OfferLetterSectionType,
  OfferLetterTableRow,
  OfferLetterListItem,
} from "@/types";
import {
  OFFER_LETTER_FIELDS,
  OFFER_LETTER_ALIGNS,
  OFFER_LETTER_TEXT_COLORS,
  OFFER_LETTER_FONTS,
} from "@/types";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogFooter,
} from "@/components/ui/dialog";

const SECTION_TYPES: Array<{ value: OfferLetterSectionType; label: string }> = [
  { value: "header", label: "Header" },
  { value: "title", label: "Document Title" },
  { value: "candidate", label: "Candidate Info" },
  { value: "heading_paragraph", label: "Heading + Paragraph" },
  { value: "paragraph", label: "Paragraph" },
  { value: "list", label: "Bullet List" },
  { value: "table", label: "Details Table" },
  { value: "signature", label: "Signature" },
  { value: "footer", label: "Footer" },
];

const DESIGN_COLOR_KEYS = [
  { key: "primary", label: "Primary Color" },
  { key: "dark_text", label: "Heading Text" },
  { key: "body_text", label: "Body Text" },
  { key: "border", label: "Border" },
  { key: "background", label: "Background" },
  { key: "accent", label: "Accent" },
];

const DESIGN_FONT_KEYS = [
  { key: "body", label: "Body Font Size" },
  { key: "title", label: "Title Font Size" },
  { key: "table_label", label: "Table Label Size" },
  { key: "table_value", label: "Table Value Size" },
  { key: "heading", label: "Heading Size" },
  { key: "signature", label: "Signature Size" },
  { key: "footer", label: "Footer Size" },
];

export function OfferLetterTemplatesPage() {
  const [templates, setTemplates] = useState<OfferLetterTemplateListItem[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [structure, setStructure] = useState<OfferLetterStructure>({ sections: [] });
  const [design, setDesign] = useState<OfferLetterDesign>({});
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"structure" | "design">("structure");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [isNew, setIsNew] = useState(false);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewCounter = useRef(0);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await api.get<OfferLetterTemplateListItem[]>("/offer-letter-templates");
      setTemplates(res.data);
      if (res.data.length > 0) {
        const active = res.data.find((t) => t.is_active) ?? res.data[0];
        setTemplateId((prev) => (prev && res.data.some((t) => t.id === prev) ? prev : active.id));
      }
    } catch {
      toast({ title: "Failed to load templates", variant: "destructive" });
    }
  }, []);

  const loadTemplate = useCallback(
    async (id: number) => {
      try {
        const res = await api.get<OfferLetterTemplate>(`/offer-letter-templates/${id}`);
        setTemplateId(res.data.id);
        setName(res.data.name);
        setDescription(res.data.description ?? "");
        setStructure(
          res.data.structure && res.data.structure.sections
            ? res.data.structure
            : { sections: [] }
        );
        setDesign(res.data.design ?? {});
        setSelectedSectionId(
          res.data.structure?.sections?.[0]?.id ?? null
        );
        setIsNew(false);
        refreshPreview(res.data.id, res.data.structure, res.data.design);
      } catch {
        toast({ title: "Failed to load template", variant: "destructive" });
      }
    },
    []
  );

  const refreshPreview = useCallback(
    (id: number, struct?: OfferLetterStructure, dsgn?: OfferLetterDesign) => {
      if (!id) return;
      const myId = ++previewCounter.current;
      if (previewTimer.current) clearTimeout(previewTimer.current);
      previewTimer.current = setTimeout(async () => {
        try {
          const res = await api.post(
            `/offer-letter-templates/${id}/preview`,
            {
              structure: struct ?? structure,
              design: dsgn ?? design,
            },
            { responseType: "blob" }
          );
          if (previewCounter.current !== myId) return;
          const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
          setPreviewUrl((prev) => {
            if (prev) URL.revokeObjectURL(prev);
            return url;
          });
        } catch {
          /* preview failure is non-fatal */
        }
      }, 350);
    },
    [structure, design]
  );

  useEffect(() => {
    fetchTemplates();
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [fetchTemplates]);

  useEffect(() => {
    if (templateId && !isNew) {
      refreshPreview(templateId);
    }
  }, [structure, design, templateId, isNew, refreshPreview]);

  const selectedSection = useMemo(
    () => structure.sections.find((s) => s.id === selectedSectionId) ?? null,
    [structure, selectedSectionId]
  );

  const updateSection = (id: string, patch: Partial<OfferLetterSection>) => {
    setStructure((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  };

  const moveSection = (id: string, dir: -1 | 1) => {
    setStructure((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.sections.length) return prev;
      const arr = [...prev.sections];
      const [item] = arr.splice(idx, 1);
      arr.splice(target, 0, item);
      return { ...prev, sections: arr };
    });
  };

  const addSection = (type: OfferLetterSectionType) => {
    const id = `sec-${Date.now()}`;
    const section: OfferLetterSection = {
      id,
      type,
      label: SECTION_TYPES.find((t) => t.value === type)?.label ?? type,
      visible: true,
      props: defaultPropsFor(type),
    };
    setStructure((prev) => ({ ...prev, sections: [...prev.sections, section] }));
    setSelectedSectionId(id);
    if (type === "table") setActiveTab("structure");
  };

  const removeSection = (id: string) => {
    setStructure((prev) => {
      const sections = prev.sections.filter((s) => s.id !== id);
      if (selectedSectionId === id) setSelectedSectionId(sections[0]?.id ?? null);
      return { ...prev, sections };
    });
  };

  const duplicateSection = (id: string) => {
    const idx = structure.sections.findIndex((s) => s.id === id);
    if (idx < 0) return;
    const src = structure.sections[idx];
    const copy: OfferLetterSection = {
      ...src,
      id: `sec-${Date.now()}`,
      label: `${src.label} (Copy)`,
    };
    setStructure((prev) => {
      const i = prev.sections.findIndex((s) => s.id === id);
      if (i < 0) return prev;
      const arr = [...prev.sections];
      arr.splice(i + 1, 0, copy);
      return { ...prev, sections: arr };
    });
    setSelectedSectionId(copy.id);
  };

  const handleSave = async () => {
    if (!templateId || isNew) {
      toast({ title: "Save the template first, then edit.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      await api.put(`/offer-letter-templates/${templateId}`, {
        name,
        description,
        structure,
        design,
      });
      toast({ title: "Template saved" });
      fetchTemplates();
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast({ title: "Template name is required", variant: "destructive" });
      return;
    }
    try {
      const res = await api.post<OfferLetterTemplate>("/offer-letter-templates", {
        name: newName.trim(),
        description: "",
        structure: { title: { text1: "INTERNSHIP", text2: "OFFER LETTER", size: 20 }, sections: [] },
        design: {},
      });
      setNewDialogOpen(false);
      setNewName("");
      await fetchTemplates();
      await loadTemplate(res.data.id);
      setIsNew(true);
      setStructure({
        title: { text1: "INTERNSHIP", text2: "OFFER LETTER", size: 20 },
        sections: defaultSections(),
      });
    } catch {
      toast({ title: "Failed to create template", variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    if (!templateId) return;
    try {
      const res = await api.post<OfferLetterTemplate>(`/offer-letter-templates/${templateId}/duplicate`);
      await fetchTemplates();
      await loadTemplate(res.data.id);
      toast({ title: "Template duplicated" });
    } catch {
      toast({ title: "Failed to duplicate template", variant: "destructive" });
    }
  };

  const handleReset = async () => {
    if (!templateId) return;
    try {
      const res = await api.post<OfferLetterTemplate>("/offer-letter-templates/reset-default");
      await loadTemplate(res.data.id);
      toast({ title: "Template reset to default" });
    } catch {
      toast({ title: "Failed to reset template", variant: "destructive" });
    }
  };

  const handlePublish = async () => {
    if (!templateId) return;
    setIsPublishing(true);
    try {
      await api.put(`/offer-letter-templates/${templateId}`, {
        name,
        description,
        structure,
        design,
      });
      const res = await api.post<OfferLetterTemplate>(`/offer-letter-templates/${templateId}/activate`);
      toast({ title: `"${res.data.name}" is now the active template` });
      fetchTemplates();
    } catch {
      toast({ title: "Failed to publish template", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!templateId) return;
    try {
      await api.delete(`/offer-letter-templates/${templateId}`);
      setTemplateId(null);
      setPreviewUrl((p) => {
        if (p) URL.revokeObjectURL(p);
        return null;
      });
      await fetchTemplates();
      toast({ title: "Template deleted" });
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      toast({ title: msg ?? "Failed to delete template", variant: "destructive" });
    }
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Offer Letter Template Editor</h2>
            <p className="text-sm text-muted-foreground">
              Customize the structure and design of your internship offer letter.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={templateId?.toString() ?? ""}
            onValueChange={(v) => loadTemplate(Number(v))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id.toString()}>
                  <span className="flex items-center gap-2">
                    {t.name}
                    {t.is_active && (
                      <Badge variant="default" className="ml-1">Active</Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setNewDialogOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            New
          </Button>
          <Button size="sm" variant="outline" onClick={handleDuplicate}>
            <Copy className="mr-1 h-3 w-3" />
            Duplicate
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset to Default
          </Button>
          <Button size="sm" onClick={handleSave} disabled={isSaving || !templateId}>
            <Save className="mr-1 h-3 w-3" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700"
            onClick={handlePublish}
            disabled={isPublishing || !templateId}
          >
            <CheckCircle2 className="mr-1 h-3 w-3" />
            {isPublishing ? "Publishing..." : "Publish / Set Active"}
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[280px_1fr_320px] overflow-hidden">
        {/* Left: structure */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ListOrdered className="h-4 w-4 text-muted-foreground" />
                Sections
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {structure.sections.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 overflow-y-auto p-3">
            {structure.sections.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                No sections yet. Add one below.
              </p>
            )}
            {structure.sections.map((s, idx) => (
              <div
                key={s.id}
                className={`group rounded-md border p-2 transition-colors ${
                  selectedSectionId === s.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
                onClick={() => setSelectedSectionId(s.id)}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSection(s.id, -1);
                    }}
                    disabled={idx === 0}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      moveSection(s.id, 1);
                    }}
                    disabled={idx === structure.sections.length - 1}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {s.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{s.type}</p>
                  </div>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSection(s.id, { visible: !s.visible });
                    }}
                  >
                    {s.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    title="Duplicate section"
                    onClick={(e) => {
                      e.stopPropagation();
                      duplicateSection(s.id);
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSection(s.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <Separator className="my-2" />
            <p className="text-xs font-medium text-muted-foreground">Add section</p>
            <div className="flex flex-wrap gap-1.5">
              {SECTION_TYPES.map((t) => (
                <Button
                  key={t.value}
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => addSection(t.value)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  {t.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Center: preview */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="h-4 w-4 text-muted-foreground" />
                Live Preview
              </CardTitle>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={() => templateId && refreshPreview(templateId)}
              >
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden bg-muted/30 p-4">
            {previewUrl ? (
              <iframe
                title="Offer Letter Preview"
                src={previewUrl}
                className="h-full w-full rounded-md border border-border bg-white shadow-sm"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                <FileText className="mb-2 h-8 w-8" />
                <p className="text-sm">Preview will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: properties */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("structure")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "structure"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <ListOrdered className="h-3.5 w-3.5" />
                Section
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("design")}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === "design"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Palette className="h-3.5 w-3.5" />
                Design
              </button>
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-4 p-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <Separator />

              {activeTab === "design" ? (
                <DesignEditor design={design} setDesign={setDesign} structure={structure} setStructure={setStructure} />
              ) : selectedSection ? (
                <SectionEditor
                  section={selectedSection}
                  structure={structure}
                  onUpdate={(patch) => updateSection(selectedSection.id, patch)}
                  onStructureChange={setStructure}
                  onDuplicate={() => duplicateSection(selectedSection.id)}
                  globalLineHeight={Number(design.spacing?.line_height ?? 5)}
                />
              ) : (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  Select a section to edit its properties.
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Offer Letter Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Template Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Corporate Internship Letter"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function defaultPropsFor(type: OfferLetterSectionType): Record<string, unknown> {
  switch (type) {
    case "header":
      return {
        show_logo: true,
        show_company_name: true,
        show_tagline: true,
        show_date: true,
        logo_width: 12,
        company_size: 13.5,
        tagline_size: 7.2,
        space_before: 0,
        space_after: 0,
      };
    case "candidate":
      return {
        greeting: "Dear {name},",
        show_qualification: true,
        show_college: true,
        show_enrollment: true,
        name_size: 11.5,
        greeting_size: 11.5,
        detail_size: 9,
        space_before: 0,
        space_after: 0,
      };
    case "heading_paragraph":
      return {
        heading: "Congratulations!",
        heading_size: 13.5,
        heading_color: "primary",
        heading_align: "left",
        text: "We are pleased to offer you an opportunity to undergo On-The-Job Training (OJT) and Internship with {company_name}.\n\nThis program is designed to provide you with practical exposure and hands-on experience.",
        align: "justify",
        text_size: 10,
        bold: false,
        italic: false,
        color: "body",
        line_height: 5,
        letter_spacing: 0,
        text_indent: 0,
        space_before: 0,
        space_after: 0,
      };
    case "paragraph":
      return {
        text: "Enter your paragraph text here. Use {{field}} to insert dynamic values.",
        align: "justify",
        text_size: 10,
        bold: false,
        italic: false,
        color: "body",
        line_height: 5,
        letter_spacing: 0,
        text_indent: 0,
        space_before: 0,
        space_after: 0,
      };
    case "list":
      return {
        items: [
          { text: "Six months internship program covering practical exposure", visible: true },
          { text: "A certificate of completion will be awarded upon successful completion", visible: true },
          { text: "Performance-based stipend as per company policy", visible: true },
        ],
        item_size: 10,
        align: "left",
        bold: false,
        italic: false,
        color: "body",
        bullet: true,
        spacing: 2,
        line_height: 5,
        letter_spacing: 0,
        text_indent: 0,
        space_before: 0,
        space_after: 0,
      };
    case "table":
      return {
        heading: "INTERNSHIP DETAILS",
        heading_size: 9,
        heading_color: "primary",
        heading_align: "left",
        label_width: 60,
        zebra: false,
        rows: defaultRows(),
        two_column: true,
        space_before: 0,
        space_after: 0,
      };
    case "signature":
      return {
        show_authorized: true,
        show_seal: true,
        show_candidate: true,
        authorized_label: "AUTHORIZED SIGNATORY",
        candidate_label: "CANDIDATE SIGNATURE",
        signature_height: 11,
        space_before: 0,
        space_after: 0,
      };
    case "footer":
      return {
        show_email: true,
        show_website: true,
        show_address: true,
        show_phone: true,
        space_before: 0,
        space_after: 0,
      };
    case "title":
      return {
        space_before: 0,
        space_after: 0,
      };
    default:
      return {};
  }
}

function defaultRows(): OfferLetterTableRow[] {
  return [
    { label: "Enrollment", value: "Academic Internship", visible: true },
    { label: "Internship Enrollment ID", field: "enrollment_id", visible: true },
    { label: "Technology", field: "technology", visible: true },
    { label: "Domain", field: "domain_label", visible: true },
    { label: "Organization", field: "organization", visible: true },
    { label: "Start Date", field: "start_date", visible: true },
    { label: "End Date", field: "end_date", visible: true },
    { label: "Stipend", field: "stipend", visible: true },
  ];
}

function defaultSections(): OfferLetterSection[] {
  return [
    { id: "sec-header", type: "header", label: "Header", visible: true, props: defaultPropsFor("header") },
    { id: "sec-title", type: "title", label: "Document Title", visible: true, props: {} },
    { id: "sec-candidate", type: "candidate", label: "Candidate Info", visible: true, props: defaultPropsFor("candidate") },
    { id: "sec-congrats", type: "heading_paragraph", label: "Congratulations", visible: true, props: defaultPropsFor("heading_paragraph") },
    { id: "sec-details", type: "table", label: "Details Table", visible: true, props: defaultPropsFor("table") },
    { id: "sec-closing", type: "paragraph", label: "Closing Paragraph", visible: true, props: defaultPropsFor("paragraph") },
    { id: "sec-signature", type: "signature", label: "Signature", visible: true, props: defaultPropsFor("signature") },
    { id: "sec-footer", type: "footer", label: "Footer", visible: true, props: defaultPropsFor("footer") },
  ];
}

interface SectionEditorProps {
  section: OfferLetterSection;
  structure: OfferLetterStructure;
  onUpdate: (patch: Partial<OfferLetterSection>) => void;
  onStructureChange: React.Dispatch<React.SetStateAction<OfferLetterStructure>>;
  onDuplicate: () => void;
  globalLineHeight?: number;
}

function SectionEditor({ section, structure, onUpdate, onStructureChange, onDuplicate, globalLineHeight = 5 }: SectionEditorProps) {
  const props = section.props ?? {};

  const setProp = (key: string, value: unknown) => {
    onUpdate({ props: { ...props, [key]: value } });
  };

  const setRows = (rows: OfferLetterTableRow[]) => setProp("rows", rows);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Section Label</Label>
        <div className="flex gap-2">
          <Input value={section.label} onChange={(e) => onUpdate({ label: e.target.value })} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="shrink-0 px-2"
            title="Duplicate this section"
            onClick={onDuplicate}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`visible-${section.id}`}
          checked={section.visible}
          onChange={(e) => onUpdate({ visible: e.target.checked })}
        />
        <Label htmlFor={`visible-${section.id}`} className="text-sm">Visible in letter</Label>
      </div>

      <Separator />
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Section Spacing (mm)</Label>
        <NumberField label="Space Before" value={Number(props.space_before ?? 0)} onChange={(v) => setProp("space_before", v)} />
        <NumberField label="Space After" value={Number(props.space_after ?? 0)} onChange={(v) => setProp("space_after", v)} />
        {(section.type === "paragraph" ||
          section.type === "heading_paragraph" ||
          section.type === "list") && (
          <>
            <NumberField label="Line Height" value={Number(props.line_height ?? globalLineHeight)} onChange={(v) => setProp("line_height", v)} />
            <NumberField label="Letter Spacing" value={Number(props.letter_spacing ?? 0)} onChange={(v) => setProp("letter_spacing", v)} />
            <NumberField label="Left Indent" value={Number(props.text_indent ?? 0)} onChange={(v) => setProp("text_indent", v)} />
          </>
        )}
      </div>
      <Separator />

      {section.type === "header" && (
        <>
          <BoolField label="Show Logo" checked={!!props.show_logo} onChange={(v) => setProp("show_logo", v)} />
          <BoolField label="Show Company Name" checked={!!props.show_company_name} onChange={(v) => setProp("show_company_name", v)} />
          <BoolField label="Show Tagline" checked={!!props.show_tagline} onChange={(v) => setProp("show_tagline", v)} />
          <BoolField label="Show Date" checked={!!props.show_date} onChange={(v) => setProp("show_date", v)} />
          <NumberField label="Company Name Size" value={Number(props.company_size ?? 13.5)} onChange={(v) => setProp("company_size", v)} />
          <NumberField label="Tagline Size" value={Number(props.tagline_size ?? 7.2)} onChange={(v) => setProp("tagline_size", v)} />
        </>
      )}

      {section.type === "title" && (
        <TitleEditor
          title={structure.title ?? {}}
          onTitleChange={(t) => onStructureChange((prev) => ({ ...prev, title: t }))}
        />
      )}

      {section.type === "candidate" && (
        <>
          <TextField label="Greeting" value={String(props.greeting ?? "Dear {name},")} onChange={(v) => setProp("greeting", v)} />
          <BoolField label="Show Qualification" checked={!!props.show_qualification} onChange={(v) => setProp("show_qualification", v)} />
          <BoolField label="Show College" checked={!!props.show_college} onChange={(v) => setProp("show_college", v)} />
          <BoolField label="Show Enrollment ID" checked={!!props.show_enrollment} onChange={(v) => setProp("show_enrollment", v)} />
          <NumberField label="Greeting Size" value={Number(props.greeting_size ?? 11.5)} onChange={(v) => setProp("greeting_size", v)} />
          <NumberField label="Name Size" value={Number(props.name_size ?? 11.5)} onChange={(v) => setProp("name_size", v)} />
          <NumberField label="Detail Size" value={Number(props.detail_size ?? 9)} onChange={(v) => setProp("detail_size", v)} />
          <FontField label="Font" value={String(props.font ?? "")} onChange={(v) => setProp("font", v)} defaultLabel="Default" />
        </>
      )}

      {(section.type === "heading_paragraph" || section.type === "paragraph") && (
        <>
          {section.type === "heading_paragraph" && (
            <>
              <TextField label="Heading" value={String(props.heading ?? "")} onChange={(v) => setProp("heading", v)} />
              <NumberField label="Heading Size" value={Number(props.heading_size ?? 13.5)} onChange={(v) => setProp("heading_size", v)} />
              <ColorField label="Heading Color" value={String(props.heading_color ?? "primary")} onChange={(v) => setProp("heading_color", v)} />
              <AlignField label="Heading Alignment" value={String(props.heading_align ?? "left")} onChange={(v) => setProp("heading_align", v)} />
              <Separator />
            </>
          )}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Text</Label>
              <VariableHint />
            </div>
            <Textarea
              value={String(props.text ?? "")}
              onChange={(e) => setProp("text", e.target.value)}
              rows={8}
              placeholder="Use {{candidate_name}} style variables"
            />
          </div>
          <NumberField label="Text Size" value={Number(props.text_size ?? 10)} onChange={(v) => setProp("text_size", v)} />
          <AlignField label="Text Alignment" value={String(props.align ?? "justify")} onChange={(v) => setProp("align", v)} />
          <ColorField label="Text Color" value={String(props.color ?? "body")} onChange={(v) => setProp("color", v)} />
          <StyleToggles bold={!!props.bold} italic={!!props.italic} onBold={(v) => setProp("bold", v)} onItalic={(v) => setProp("italic", v)} />
          <FontField label="Font" value={String(props.font ?? "")} onChange={(v) => setProp("font", v)} defaultLabel="Default" />
        </>
      )}

      {section.type === "list" && (
        <ListEditor props={props} setProp={setProp} />
      )}

      {section.type === "table" && (
        <>
          <NumberField label="Label Column Width" value={Number(props.label_width ?? 60)} onChange={(v) => setProp("label_width", v)} />
          <ColorField label="Heading Color" value={String(props.heading_color ?? "primary")} onChange={(v) => setProp("heading_color", v)} />
          <AlignField label="Heading Alignment" value={String(props.heading_align ?? "left")} onChange={(v) => setProp("heading_align", v)} />
          <BoolField label="Zebra Striping" checked={!!props.zebra} onChange={(v) => setProp("zebra", v)} />
          <FontField label="Font" value={String(props.font ?? "")} onChange={(v) => setProp("font", v)} defaultLabel="Default" />
          <TableEditor rows={(props.rows as OfferLetterTableRow[]) ?? []} setRows={setRows} />
        </>
      )}

      {section.type === "signature" && (
        <>
          <BoolField label="Show Authorized Signatory" checked={!!props.show_authorized} onChange={(v) => setProp("show_authorized", v)} />
          <BoolField label="Show Company Seal" checked={!!props.show_seal} onChange={(v) => setProp("show_seal", v)} />
          <BoolField label="Show Candidate Signature" checked={!!props.show_candidate} onChange={(v) => setProp("show_candidate", v)} />
          <TextField label="Authorized Label" value={String(props.authorized_label ?? "AUTHORIZED SIGNATORY")} onChange={(v) => setProp("authorized_label", v)} />
          <TextField label="Candidate Label" value={String(props.candidate_label ?? "CANDIDATE SIGNATURE")} onChange={(v) => setProp("candidate_label", v)} />
          <NumberField label="Signature Height" value={Number(props.signature_height ?? 11)} onChange={(v) => setProp("signature_height", v)} />
        </>
      )}

      {section.type === "footer" && (
        <>
          <BoolField label="Show Email" checked={!!props.show_email} onChange={(v) => setProp("show_email", v)} />
          <BoolField label="Show Website" checked={!!props.show_website} onChange={(v) => setProp("show_website", v)} />
          <BoolField label="Show Address" checked={!!props.show_address} onChange={(v) => setProp("show_address", v)} />
          <BoolField label="Show Phone" checked={!!props.show_phone} onChange={(v) => setProp("show_phone", v)} />
        </>
      )}
    </div>
  );
}

function TitleEditor({
  title,
  onTitleChange,
}: {
  title: NonNullable<OfferLetterStructure["title"]>;
  onTitleChange: (t: NonNullable<OfferLetterStructure["title"]>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Line 1</Label>
        <Input
          value={String(title.text1 ?? "INTERNSHIP")}
          onChange={(e) => onTitleChange({ ...title, text1: e.target.value })}
          placeholder="INTERNSHIP"
        />
      </div>
      <ColorField
        label="Line 1 Color"
        value={String(title.text1_color ?? "dark")}
        onChange={(v) => onTitleChange({ ...title, text1_color: v })}
      />
      <div className="space-y-2">
        <Label>Line 2</Label>
        <Input
          value={String(title.text2 ?? "OFFER LETTER")}
          onChange={(e) => onTitleChange({ ...title, text2: e.target.value })}
          placeholder="OFFER LETTER"
        />
      </div>
      <ColorField
        label="Line 2 Color"
        value={String(title.text2_color ?? "primary")}
        onChange={(v) => onTitleChange({ ...title, text2_color: v })}
      />
      <NumberField
        label="Font Size"
        value={Number(title.size ?? 20)}
        onChange={(v) => onTitleChange({ ...title, size: v })}
      />
      <AlignField
        label="Alignment"
        value={String(title.align ?? "center")}
        onChange={(v) => onTitleChange({ ...title, align: v })}
      />
      <NumberField
        label="Letter Spacing"
        value={Number(title.letter_spacing ?? 1.6)}
        onChange={(v) => onTitleChange({ ...title, letter_spacing: v })}
      />
      <FontField
        label="Font"
        value={String(title.font ?? "")}
        onChange={(v) => onTitleChange({ ...title, font: v })}
        defaultLabel="Default"
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id="title-underline"
          checked={title.show_underline !== false}
          onChange={(e) => onTitleChange({ ...title, show_underline: e.target.checked })}
        />
        <Label htmlFor="title-underline" className="text-sm">Show underline</Label>
      </div>
      {title.show_underline !== false && (
        <ColorField
          label="Underline Color"
          value={String(title.underline_color ?? "primary")}
          onChange={(v) => onTitleChange({ ...title, underline_color: v })}
        />
      )}
    </div>
  );
}

function TableEditor({ rows, setRows }: { rows: OfferLetterTableRow[]; setRows: (rows: OfferLetterTableRow[]) => void }) {
  const updateRow = (idx: number, patch: Partial<OfferLetterTableRow>) => {
    setRows(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRow = () => {
    setRows([...rows, { label: "New Field", field: "candidate_name", visible: true }]);
  };
  const removeRow = (idx: number) => setRows(rows.filter((_, i) => i !== idx));
  const moveRow = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= rows.length) return;
    const arr = [...rows];
    const [item] = arr.splice(idx, 1);
    arr.splice(target, 0, item);
    setRows(arr);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Table Rows</Label>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={addRow}>
          <Plus className="mr-1 h-3 w-3" />
          Add Row
        </Button>
      </div>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div key={idx} className="rounded-md border border-border p-2">
            <div className="flex items-center gap-1.5">
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => moveRow(idx, -1)}>
                <ChevronUp className="h-3 w-3" />
              </button>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => moveRow(idx, 1)}>
                <ChevronDown className="h-3 w-3" />
              </button>
              <Input
                className="h-7 text-xs"
                value={row.label}
                onChange={(e) => updateRow(idx, { label: e.target.value })}
                placeholder="Label"
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Select
                value={row.value !== undefined ? "__value" : (row.field ?? "candidate_name")}
                onValueChange={(v) => {
                  if (v === "__value") {
                    updateRow(idx, { field: undefined, value: row.value ?? "" });
                  } else {
                    updateRow(idx, { field: v, value: undefined });
                  }
                }}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OFFER_LETTER_FIELDS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
                  ))}
                  <SelectItem value="__value">Static value…</SelectItem>
                </SelectContent>
              </Select>
              {row.value !== undefined && (
                <Input
                  className="h-7 flex-1 text-xs"
                  value={row.value}
                  onChange={(e) => updateRow(idx, { value: e.target.value })}
                  placeholder="Static value"
                />
              )}
              <Checkbox
                checked={row.visible}
                onChange={(e) => updateRow(idx, { visible: e.target.checked })}
                title="Visible"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DesignEditorProps {
  design: OfferLetterDesign;
  setDesign: React.Dispatch<React.SetStateAction<OfferLetterDesign>>;
  structure: OfferLetterStructure;
  setStructure: React.Dispatch<React.SetStateAction<OfferLetterStructure>>;
}

function DesignEditor({ design, setDesign, structure, setStructure }: DesignEditorProps) {
  const colors = design.colors ?? {};
  const fonts = design.fonts ?? {};
  const spacing = design.spacing ?? {};
  const page = design.page ?? {};

  const setColors = (patch: Record<string, string>) =>
    setDesign({ ...design, colors: { ...colors, ...patch } });
  const setFonts = (patch: Record<string, number | string>) =>
    setDesign({ ...design, fonts: { ...fonts, ...patch } });
  const setSpacing = (patch: Record<string, number>) =>
    setDesign({ ...design, spacing: { ...spacing, ...patch } });
  const setPage = (patch: Record<string, number>) =>
    setDesign({ ...design, page: { ...page, ...patch } });

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Title Text
        </Label>
        <Input
          value={String(structure.title?.text1 ?? "INTERNSHIP")}
          onChange={(e) =>
            setStructure({ ...structure, title: { ...structure.title, text1: e.target.value } })
          }
          placeholder="INTERNSHIP"
        />
        <Input
          value={String(structure.title?.text2 ?? "OFFER LETTER")}
          onChange={(e) =>
            setStructure({ ...structure, title: { ...structure.title, text2: e.target.value } })
          }
          placeholder="OFFER LETTER"
        />
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Colors
        </Label>
        {DESIGN_COLOR_KEYS.map((c) => (
          <div key={c.key} className="flex items-center gap-2">
            <input
              type="color"
              value={colors[c.key as keyof typeof colors] ?? "#2875E8"}
              onChange={(e) => setColors({ [c.key]: e.target.value })}
              className="h-7 w-10 cursor-pointer rounded border border-border"
            />
            <div className="flex-1">
              <p className="text-xs font-medium text-foreground">{c.label}</p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {colors[c.key as keyof typeof colors] ?? ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" /> Typography
        </Label>
        <div className="space-y-1.5">
          <Label className="text-xs">Default Font</Label>
          <Select
            value={String(fonts.family ?? "inter")}
            onValueChange={(v) => setFonts({ family: v })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OFFER_LETTER_FONTS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {DESIGN_FONT_KEYS.map((f) => (
          <NumberField
            key={f.key}
            label={f.label}
            value={Number(fonts[f.key as keyof typeof fonts] ?? 10)}
            onChange={(v) => setFonts({ [f.key]: v })}
          />
        ))}
      </div>

      <Separator />

      <div className="space-y-3">
        <Label className="flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" /> Spacing (mm)
        </Label>
        <NumberField
          label="Section Gap"
          value={Number(spacing.section_gap ?? 4)}
          onChange={(v) => setSpacing({ section_gap: v })}
        />
        <NumberField
          label="Table Row Height"
          value={Number(spacing.table_row ?? 7)}
          onChange={(v) => setSpacing({ table_row: v })}
        />
        <NumberField
          label="Line Height"
          value={Number(spacing.line_height ?? 5)}
          onChange={(v) => setSpacing({ line_height: v })}
        />
        <NumberField
          label="Top Margin"
          value={Number(page.margin_top ?? 14)}
          onChange={(v) => setPage({ margin_top: v })}
        />
        <NumberField
          label="Side Margin"
          value={Number(page.margin_side ?? 18)}
          onChange={(v) => setPage({ margin_side: v })}
        />
      </div>
    </div>
  );
}

function BoolField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={`bf-${label}`} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <Label htmlFor={`bf-${label}`} className="text-sm">{label}</Label>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        step="0.5"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function VariableHint() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="text-[11px] text-primary underline-offset-2 hover:underline"
      >
        Variables
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 w-56 rounded-lg border bg-card p-2 shadow-lg">
          <div className="space-y-0.5">
            {OFFER_LETTER_FIELDS.map((f) => (
              <button
                key={f.key}
                type="button"
                className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-accent"
                onClick={() => setOpen(false)}
              >
                <code className="text-primary">{`{{${f.key}}}`}</code>
                <span className="ml-2 text-muted-foreground">{f.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ALIGN_LABELS: Record<string, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
  justify: "Justify",
};

function AlignField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OFFER_LETTER_ALIGNS.map((a) => (
            <SelectItem key={a} value={a}>
              {ALIGN_LABELS[a] ?? a}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OFFER_LETTER_TEXT_COLORS.map((c) => (
            <SelectItem key={c.key} value={c.key}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FontField({
  label,
  value,
  onChange,
  defaultLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  defaultLabel?: string;
}) {
  const sentinel = "__default";
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value || sentinel} onValueChange={(v) => onChange(v === sentinel ? "" : v)}>
        <SelectTrigger className="h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {defaultLabel && <SelectItem value={sentinel}>{defaultLabel}</SelectItem>}
          {OFFER_LETTER_FONTS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StyleToggles({
  bold,
  italic,
  onBold,
  onItalic,
}: {
  bold: boolean;
  italic: boolean;
  onBold: (v: boolean) => void;
  onItalic: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">Text Style</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={bold ? "default" : "outline"}
          className="h-8 flex-1 text-xs font-bold"
          onClick={() => onBold(!bold)}
        >
          Bold
        </Button>
        <Button
          type="button"
          size="sm"
          variant={italic ? "default" : "outline"}
          className="h-8 flex-1 text-xs italic"
          onClick={() => onItalic(!italic)}
        >
          Italic
        </Button>
      </div>
    </div>
  );
}

function ListEditor({
  props,
  setProp,
}: {
  props: Record<string, unknown>;
  setProp: (key: string, value: unknown) => void;
}) {
  const items = (props.items as OfferLetterListItem[]) ?? [];

  const updateItem = (idx: number, patch: Partial<OfferLetterListItem>) => {
    setProp("items", items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => {
    setProp("items", [...items, { text: "Enter a key point here", visible: true }]);
  };
  const removeItem = (idx: number) => {
    setProp("items", items.filter((_, i) => i !== idx));
  };
  const moveItem = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const arr = [...items];
    const [item] = arr.splice(idx, 1);
    arr.splice(target, 0, item);
    setProp("items", arr);
  };

  return (
    <div className="space-y-4">
      <BoolField label="Show Bullet Marks" checked={props.bullet !== false} onChange={(v) => setProp("bullet", v)} />
      <NumberField label="Item Font Size" value={Number(props.item_size ?? 10)} onChange={(v) => setProp("item_size", v)} />
      <AlignField label="Alignment" value={String(props.align ?? "left")} onChange={(v) => setProp("align", v)} />
      <ColorField label="Text Color" value={String(props.color ?? "body")} onChange={(v) => setProp("color", v)} />
      <NumberField label="Item Spacing" value={Number(props.spacing ?? 2)} onChange={(v) => setProp("spacing", v)} />
      <StyleToggles bold={!!props.bold} italic={!!props.italic} onBold={(v) => setProp("bold", v)} onItalic={(v) => setProp("italic", v)} />
      <FontField label="Font" value={String(props.font ?? "")} onChange={(v) => setProp("font", v)} defaultLabel="Default" />
      <Separator />
      <div className="flex items-center justify-between">
        <Label>Items</Label>
        <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={addItem}>
          <Plus className="mr-1 h-3 w-3" />
          Add Item
        </Button>
      </div>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">No items yet.</p>
        )}
        {items.map((item, idx) => (
          <div key={idx} className="rounded-md border border-border p-2">
            <div className="flex items-center gap-1.5">
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => moveItem(idx, -1)}>
                <ChevronUp className="h-3 w-3" />
              </button>
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => moveItem(idx, 1)}>
                <ChevronDown className="h-3 w-3" />
              </button>
              <Input
                className="h-7 text-xs"
                value={item.text}
                onChange={(e) => updateItem(idx, { text: e.target.value })}
                placeholder="Item text"
              />
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(idx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Checkbox
                checked={item.visible}
                onChange={(e) => updateItem(idx, { visible: e.target.checked })}
                title="Visible"
              />
              <span className="text-xs text-muted-foreground">Visible</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
