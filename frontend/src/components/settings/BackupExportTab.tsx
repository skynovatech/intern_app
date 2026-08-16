import { useEffect, useState } from "react";
import { Download, Upload, Loader2, Cpu, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface SettingsCount {
  settings: number;
  applications: number;
  selected: number;
  offer_drafts: number;
  offer_sent: number;
  jobs_failed: number;
}

interface SettingsExportItem {
  key: string;
  label: string;
  value: string | null;
  type: string;
  group: string;
  is_public: boolean;
}

export function BackupExportTab() {
  const [counts, setCounts] = useState<SettingsCount | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const fetchCounts = async () => {
    setLoadingCounts(true);
    try {
      const res = await api.get<SettingsCount>("/settings/counts");
      setCounts(res.data);
    } catch {
      setCounts(null);
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get<{ settings: SettingsExportItem[] }>("/settings/export");
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `settings-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Settings exported", variant: "success" });
    } catch {
      toast({ title: "Failed to export settings", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({ title: "Choose a settings file to import", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const text = await importFile.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed.settings)
        ? parsed.settings.map((s: SettingsExportItem) => ({ key: s.key, value: s.value ?? "" }))
        : Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) }));
      const res = await api.post("/settings/import", { settings: list });
      toast({ title: "Import complete", description: res.data.message, variant: "success" });
      setImportFile(null);
      fetchCounts();
    } catch {
      toast({ title: "Import failed — invalid file", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const rows = counts
    ? [
        { label: "Applications", value: counts.applications },
        { label: "Apps selected", value: counts.selected },
        { label: "Offer drafts", value: counts.offer_drafts },
        { label: "Offer letters sent", value: counts.offer_sent },
        { label: "Settings stored", value: counts.settings },
        { label: "Failed jobs", value: counts.jobs_failed },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5" /> Live System Counts
          </CardTitle>
          <Button size="sm" variant="outline" className="h-8" onClick={fetchCounts} disabled={loadingCounts}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {loadingCounts && !counts ? (
            <p className="text-sm text-muted-foreground">Loading counts…</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {rows.map((r) => (
                <div key={r.label} className="rounded-lg border border-border p-3">
                  <div className="text-xl font-bold">{r.value}</div>
                  <div className="text-xs text-muted-foreground">{r.label}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" /> Backup & Export
          </CardTitle>
          <CardDescription>
            Download all settings as JSON, or restore from a previously exported backup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Export settings</p>
              <p className="text-xs text-muted-foreground">
                Downloads a JSON file containing every setting key and value. Use this along with your database backup.
              </p>
            </div>
            <Button variant="outline" onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Download className="mr-1 h-4 w-4" />}
              Export JSON
            </Button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <Label htmlFor="import-settings">Import settings backup</Label>
              <Input id="import-settings" type="file" accept="application/json,.json" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
              <p className="text-xs text-muted-foreground">
                Only known setting keys are applied; unknown keys are skipped and reported.
              </p>
            </div>
            <Button onClick={handleImport} disabled={importing || !importFile}>
              {importing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
              Import
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}