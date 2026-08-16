import { useEffect, useState, useCallback } from "react";
import { Save, Loader2, Building2, UploadCloud } from "lucide-react";
import type { AppSetting } from "@/types";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const GROUP_LABELS: Record<string, string> = {
  company: "Company profile",
  branding: "Offer letter branding",
  notifications: "Notification defaults",
  general: "General",
};

const PUBLIC_LABELS: Record<string, string> = {
  company_name: "Company Name",
  company_tagline: "Company Tagline",
  company_phone: "Company Phone",
  company_email: "Company Email",
  company_website: "Company Website",
  company_address: "Company Address",
  authorized_signatory: "Authorized Signatory Name",
  authorized_designation: "Authorized Signatory Designation",
  brand_primary_color: "Document Primary Color",
  brand_accent_color: "Document Accent Color",
  authorized_signature: "Authorized Signature (image path)",
  company_seal: "Company Seal (image path)",
};

export function CompanySettingsTab() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const IMAGE_SETTING_KEYS = ["authorized_signature", "company_seal"];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AppSetting[]>("/settings");
      setSettings(res.data);
      const initial: Record<string, string> = {};
      for (const s of res.data) initial[s.key] = s.value ?? "";
      setForm(initial);
    } catch {
      toast({ title: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groups = Array.from(
    new Set(
      settings
        .filter((s) => s.group === "company" || s.group === "branding" || s.group === "notifications")
        .map((s) => s.group)
    )
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/settings", { settings: form });
      toast({ title: "Settings saved", variant: "success" });
      await load();
    } catch {
      toast({ title: "Could not save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post<{ path: string }>("/upload", formData, {
        headers: { "Content-Type": undefined },
      });
      setForm((f) => ({ ...f, [key]: res.data.path }));
      toast({ title: "Image uploaded", description: res.data.path, variant: "success" });
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploadingKey(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" /> Company Settings
        </CardTitle>
        <CardDescription>
          These values are used in notifications, offer letters, and the public pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {groups.map((group) => (
          <div key={group} className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {GROUP_LABELS[group] ?? group}
            </h3>
            {settings
              .filter((s) => s.group === group)
              .map((s) => (
                <div key={s.key} className="space-y-1.5">
                  <Label htmlFor={`setting-${s.key}`}>{PUBLIC_LABELS[s.key] ?? s.label}</Label>
                  {s.type === "textarea" ? (
                    <Textarea
                      id={`setting-${s.key}`}
                      rows={2}
                      value={form[s.key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
                    />
                  ) : IMAGE_SETTING_KEYS.includes(s.key) ? (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Input
                        id={`setting-${s.key}`}
                        value={form[s.key] ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
                        placeholder="e.g. photos/abc123.png"
                      />
                      <label
                        htmlFor={`upload-${s.key}`}
                        className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
                      >
                        {uploadingKey === s.key ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UploadCloud className="h-4 w-4" />
                        )}
                        Upload
                        <input
                          id={`upload-${s.key}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingKey !== null}
                          onChange={(e) => handleUploadImage(s.key, e)}
                        />
                      </label>
                      {form[s.key] && (
                        <div className="flex shrink-0 items-center gap-2">
                          <img
                            src={`/uploads/${form[s.key].replace(/^uploads\//, "")}`}
                            alt={s.label}
                            className="h-10 w-10 rounded border border-border bg-muted object-contain"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <Input
                      id={`setting-${s.key}`}
                      value={form[s.key] ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
          </div>
        ))}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
