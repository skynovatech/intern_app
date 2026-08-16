import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import type { AdminUserItem } from "@/types";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";

const ROLES = ["admin", "viewer"] as const;

export function AdminUsersTab() {
  const currentUser = useAuthStore((s) => s.admin);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", password: "", role: "admin" });
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState<AdminUserItem | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const isSuper = currentUser?.role === "admin";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<AdminUserItem[]>("/admins");
      setUsers(res.data);
    } catch {
      setUsers([]);
      toast({ title: "Failed to load admin users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuper) load();
    else setLoading(false);
  }, [isSuper, load]);

  const handleCreate = async () => {
    if (!createForm.full_name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.post("/admins", createForm);
      toast({ title: "Admin user created", variant: "success" });
      setCreateOpen(false);
      setCreateForm({ full_name: "", email: "", password: "", role: "admin" });
      await load();
    } catch (e: any) {
      toast({ title: e?.response?.data?.detail ?? "Could not create user", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: AdminUserItem) => {
    if (user.id === currentUser?.id) {
      toast({ title: "You cannot deactivate your own account", variant: "destructive" });
      return;
    }
    try {
      await api.put(`/admins/${user.id}`, { is_active: !user.is_active });
      toast({ title: "User updated", variant: "success" });
      await load();
    } catch (e: any) {
      toast({ title: e?.response?.data?.detail ?? "Could not update user", variant: "destructive" });
    }
  };

  const handleRoleChange = async (user: AdminUserItem, role: string) => {
    try {
      await api.put(`/admins/${user.id}`, { role });
      toast({ title: "Role updated", variant: "success" });
      await load();
    } catch (e: any) {
      toast({ title: e?.response?.data?.detail ?? "Could not update role", variant: "destructive" });
    }
  };

  const handleDelete = async (user: AdminUserItem) => {
    if (user.id === currentUser?.id) {
      toast({ title: "You cannot delete your own account", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Delete admin '${user.full_name}'? This cannot be undone.`)) return;
    try {
      await api.delete(`/admins/${user.id}`);
      toast({ title: "User deleted", variant: "success" });
      await load();
    } catch (e: any) {
      toast({ title: e?.response?.data?.detail ?? "Could not delete user", variant: "destructive" });
    }
  };

  const handleResetPassword = async () => {
    if (!resetOpen || newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await api.post(`/admins/${resetOpen.id}/reset-password`, { new_password: newPassword });
      toast({ title: "Password reset", variant: "success" });
      setResetOpen(null);
      setNewPassword("");
    } catch (e: any) {
      toast({ title: e?.response?.data?.detail ?? "Could not reset password", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!isSuper) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Only admins can manage team members.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Admin Users &amp; Roles
          </CardTitle>
          <CardDescription>
            Invite team members, set roles, reset passwords, deactivate or delete accounts.
          </CardDescription>
        </div>
        <div className="flex shrink-0">
          <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {user.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-medium">
                    {user.full_name} {user.id === currentUser?.id && <span className="text-xs text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.is_active ? "default" : "secondary"}>
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
                <Select
                  value={user.role}
                  disabled={user.id === currentUser?.id}
                  onValueChange={(v) => handleRoleChange(user, v)}
                >
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => handleToggleActive(user)}>
                  {user.is_active ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setResetOpen(user);
                    setNewPassword("");
                  }}
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(user)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full Name</Label>
              <Input
                value={createForm.full_name}
                onChange={(e) => setCreateForm((f) => ({ ...f, full_name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!resetOpen} onOpenChange={(o) => !o && setResetOpen(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Set a new password for {resetOpen?.email}.
          </p>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 6 characters)"
          />
          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleResetPassword} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}