import { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  CheckCircle2,
  XCircle,
  Loader2,
  QrCode,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  Phone,
  Plus,
  ExternalLink,
  KeyRound,
  Copy,
  Pencil,
  Eye,
  EyeOff,
} from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface WhatsAppStatus {
  server_running: boolean;
  instance_connected: boolean;
  connection_state: string;
  api_url: string;
  instance_name: string;
}

interface QRCodeData {
  base64: string;
  code: string;
}

interface InstanceItem {
  name: string;
  instance_id: string | null;
  apikey: string;
  owner_jid: string | null;
  connection_name: string;
  created_at: string | null;
  state: string;
}

export function WhatsAppConfigPage() {
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newInstanceDialog, setNewInstanceDialog] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState("");
  const [newInstanceNumber, setNewInstanceNumber] = useState("");
  const [creatingInstance, setCreatingInstance] = useState(false);

  const [instances, setInstances] = useState<InstanceItem[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [renameTarget, setRenameTarget] = useState<InstanceItem | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  const fetchInstances = useCallback(async () => {
    try {
      setInstancesLoading(true);
      const res = await api.get<{ instances: InstanceItem[] }>("/whatsapp/instances");
      setInstances(res.data.instances ?? []);
    } catch {
      setInstances([]);
    } finally {
      setInstancesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInstances();
  }, [fetchInstances]);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<WhatsAppStatus>("/whatsapp/status");
      setStatus(res.data);
    } catch {
      setStatus(null);
      toast({ title: "Failed to fetch WhatsApp status", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleGetQR = async () => {
    try {
      setQrLoading(true);
      const res = await api.get<QRCodeData>("/whatsapp/qr");
      setQrCode(res.data);
    } catch {
      setQrCode(null);
      toast({ title: "Failed to get QR code", variant: "destructive" });
    } finally {
      setQrLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setActionLoading("logout");
      await api.post("/whatsapp/logout");
      setQrCode(null);
      fetchStatus();
    } catch {
      toast({ title: "Failed to logout WhatsApp", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReconnect = async () => {
    try {
      setActionLoading("reconnect");
      await api.post("/whatsapp/reconnect");
      setQrCode(null);
      fetchStatus();
    } catch {
      toast({ title: "Failed to reconnect WhatsApp", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteInstance = async () => {
    if (!confirm("Are you sure? This will delete the WhatsApp instance.")) return;
    try {
      setActionLoading("delete");
      await api.delete("/whatsapp/instance");
      setQrCode(null);
      fetchStatus();
    } catch {
      toast({ title: "Failed to delete WhatsApp instance", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateInstance = async () => {
    try {
      setCreatingInstance(true);
      await api.post("/whatsapp/instance", {
        instance_name: newInstanceName,
        number: newInstanceNumber,
      });
      setNewInstanceDialog(false);
      setNewInstanceName("");
      setNewInstanceNumber("");
      fetchStatus();
      fetchInstances();
    } catch {
      toast({ title: "Failed to create WhatsApp instance", variant: "destructive" });
    } finally {
      setCreatingInstance(false);
    }
  };

  const handleRenameInstance = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    try {
      setRenaming(true);
      const res = await api.post(`/whatsapp/instances/${encodeURIComponent(renameTarget.name)}/rename`, {
        new_instance_name: renameValue.trim(),
      });
      setRenameTarget(null);
      setRenameValue("");
      toast({ title: "Instance renamed", description: res.data.message, variant: "success" });
      fetchInstances();
    } catch {
      toast({ title: "Failed to rename instance", variant: "destructive" });
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteNamedInstance = async (name: string) => {
    if (!confirm(`Delete instance "${name}"? This will remove it from Evolution API.`)) return;
    try {
      setDeletingName(name);
      const res = await api.delete(`/whatsapp/instances/${encodeURIComponent(name)}`);
      toast({ title: "Instance deleted", description: res.data.message, variant: "success" });
      fetchInstances();
    } catch {
      toast({ title: "Failed to delete instance", variant: "destructive" });
    } finally {
      setDeletingName(null);
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: `${label} copied`, variant: "success" });
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case "open":
      case "connected":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "close":
      case "disconnected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    }
  };

  const getStateLabel = (state: string) => {
    switch (state) {
      case "open":
        return "Connected";
      case "close":
        return "Disconnected";
      case "instance_not_found":
        return "Instance Not Found";
      case "server_unreachable":
        return "Server Unreachable";
      case "error":
        return "Error";
      default:
        return state;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">WhatsApp Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Manage Evolution API WhatsApp connection for sending messages.
          </p>
        </div>
        {status?.server_running && !status.instance_connected && (
          <Button onClick={() => setNewInstanceDialog(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Create Instance
          </Button>
        )}
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wifi className="h-4 w-4 text-primary" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">Evolution API Server</span>
              {status?.server_running ? (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Running
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="mr-1 h-3 w-3" /> Offline
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">WhatsApp Instance</span>
              <Badge className={getStateColor(status?.connection_state ?? "")}>
                {status?.instance_connected ? (
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                ) : (
                  <XCircle className="mr-1 h-3 w-3" />
                )}
                {getStateLabel(status?.connection_state ?? "")}
              </Badge>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-sm overflow-hidden">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-muted-foreground shrink-0">API URL:</span>
              <code className="font-mono text-xs truncate">{status?.api_url}</code>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-muted-foreground">Instance:</span>
              <code className="font-mono text-xs">{status?.instance_name}</code>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={fetchStatus}>
              <RefreshCw className="mr-1 h-3 w-3" />
              Refresh Status
            </Button>
            {status?.api_url && (
              <Button size="sm" variant="outline" asChild>
                <a href={`${status.api_url.replace(/\/+$/, "")}/manager/`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Open Evolution Manager
                </a>
              </Button>
            )}
            {status?.instance_connected && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleLogout}
                  disabled={actionLoading === "logout"}
                >
                  {actionLoading === "logout" ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <WifiOff className="mr-1 h-3 w-3" />
                  )}
                  Logout
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReconnect}
                  disabled={actionLoading === "reconnect"}
                >
                  {actionLoading === "reconnect" ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  Reconnect
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteInstance}
                  disabled={actionLoading === "delete"}
                >
                  {actionLoading === "delete" ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1 h-3 w-3" />
                  )}
                  Delete Instance
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Instances List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-primary" />
            Instances
          </CardTitle>
          <Button size="sm" variant="outline" onClick={fetchInstances} disabled={instancesLoading}>
            <RefreshCw className="mr-1 h-3 w-3" /> Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {instancesLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : instances.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {status?.server_running
                ? "No instances created yet. Click 'Create Instance' to add one."
                : "Evolution API server is unreachable."}
            </div>
          ) : (
            instances.map((inst) => {
              const keyVisible = !!visibleKeys[inst.name];
              const isConfigured = inst.name === status?.instance_name;
              return (
                <div key={inst.name} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge className={getStateColor(inst.state)}>
                        <Wifi className="mr-1 h-3 w-3" />
                        {getStateLabel(inst.state)}
                      </Badge>
                      <span className="truncate font-medium text-sm">{inst.name}</span>
                      {isConfigured && (
                        <Badge variant="outline" className="text-[10px]">active</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7"
                        onClick={() => { setRenameTarget(inst); setRenameValue(inst.name); }}
                      >
                        <Pencil className="h-3 w-3" /> Rename
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7"
                        disabled={deletingName === inst.name}
                        onClick={() => handleDeleteNamedInstance(inst.name)}
                      >
                        {deletingName === inst.name ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {inst.owner_jid && (
                    <p className="mt-2 text-xs text-muted-foreground">JID: <code className="font-mono">{inst.owner_jid}</code></p>
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <KeyRound className="h-3 w-3" />
                      API Key:
                    </span>
                    <code className="max-w-[220px] truncate rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                      {keyVisible || !inst.apikey
                        ? inst.apikey || "(none)"
                        : "•••••••••"}
                    </code>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setVisibleKeys((p) => ({ ...p, [inst.name]: !keyVisible }))}>
                      {keyVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    {inst.apikey && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copyToClipboard(inst.apikey, "API key")}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* QR Code Section */}
      {!status?.instance_connected && status?.server_running && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <QrCode className="h-4 w-4 text-primary" />
              Scan QR Code to Connect
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Open WhatsApp on your phone, go to <strong>Settings &gt; Linked Devices &gt; Link a Device</strong>,
              then scan this QR code.
            </p>

            {qrCode ? (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg border border-border p-4 bg-white">
                  <img
                    src={`data:image/png;base64,${qrCode.base64}`}
                    alt="WhatsApp QR Code"
                    className="h-48 w-48 sm:h-64 sm:w-64"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  QR code expires in a few minutes. Click refresh if expired.
                </p>
                <Button size="sm" variant="outline" onClick={handleGetQR}>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Refresh QR Code
                </Button>
              </div>
            ) : (
              <Button onClick={handleGetQR} disabled={qrLoading}>
                {qrLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <QrCode className="mr-2 h-4 w-4" />
                )}
                Generate QR Code
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      {!status?.server_running && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Setup Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  1
                </span>
                <div>
                  <p className="font-medium">Start Docker & run Evolution API</p>
                  <p className="text-muted-foreground">
                    <code>cd E:\intern_app &amp;&amp; docker-compose up -d</code>
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  2
                </span>
                <div>
                  <p className="font-medium">Wait 30 seconds, then refresh this page</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Instance Dialog */}
      <Dialog open={newInstanceDialog} onOpenChange={setNewInstanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create WhatsApp Instance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inst-name">Instance Name</Label>
              <Input
                id="inst-name"
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
                placeholder="ats-whatsapp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inst-number">
                <Phone className="mr-1 inline h-3 w-3" />
                WhatsApp Phone Number
              </Label>
              <Input
                id="inst-number"
                value={newInstanceNumber}
                onChange={(e) => setNewInstanceNumber(e.target.value)}
                placeholder="919876543210"
              />
              <p className="text-xs text-muted-foreground">
                10-digit Indian number (+91 will be added automatically)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewInstanceDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateInstance}
              disabled={creatingInstance || !newInstanceName || !newInstanceNumber}
            >
              {creatingInstance ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Create Instance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Instance Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Instance</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-inst">New Instance Name</Label>
            <Input
              id="rename-inst"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="ats-whatsapp"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={handleRenameInstance} disabled={renaming || !renameValue.trim() || renameValue.trim() === renameTarget?.name}>
              {renaming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
