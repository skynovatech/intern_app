import { useEffect, useState, useCallback } from "react";
import { Save, Loader2, Settings2 } from "lucide-react";
import type { AppSetting } from "@/types";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function SystemDefaultsTab() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const defaultKeys = new Set(["admin_whatsapp_threshold", "site_url", "brand_color", "company_logo_path"]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string> = {};
      for (const s of settings) if (defaultKeys.has(s.key)) payload[s.key] = form[s.key] ?? "";
      await api.put("/settings", { settings: payload });
      toast({ title: "System defaults saved", variant: "success" });
      await load();
    } catch {
      toast({ title: "Could not save system defaults", variant: "destructive" });
    } finally {
      setSaving(false);
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
          <Settings2 className="h-5 w-5" /> System Defaults
        </CardTitle>
        <CardDescription>
          Technical defaults used across the platform, including branding and communication settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {settings
          .filter((s) => defaultKeys.has(s.key))
          .map((s) => (
            <div key={s.key} className="space-y-1.5">
              <Label htmlFor={`sys-${s.key}`}>{s.label}</Label>
              <Input
                id={`sys-${s.key}`}
                value={form[s.key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [s.key]: e.target.value }))}
                placeholder={s.key === "site_url" ? "https://your-portal.example.com" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {s.key === "site_url"
                  ? "Base URL of your portal (no trailing slash), e.g. https://your-portal.example.com."
                  : s.key === "brand_color"
                    ? "Accent color used on public offer letter pages."
                    : s.key === "admin_whatsapp_threshold"
                      ? "Batch size for bulk WhatsApp sends."
                      : "Leave empty to use the default logo."}
              </p>
            </div>
          ))}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Defaults
        </Button>
      </CardContent>
    </Card>
  );
}