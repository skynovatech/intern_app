import { useState, useRef } from "react";
import {
  User, Lock, KeyRound, Camera, Trash2, Save, Loader2,
} from "lucide-react";
import api, { getBackendAssetUrl } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/authStore";
import { CompanySettingsTab } from "@/components/settings/CompanySettingsTab";
import { LookupsTab } from "@/components/settings/LookupsTab";
import { AdminUsersTab } from "@/components/settings/AdminUsersTab";
import { SystemDefaultsTab } from "@/components/settings/SystemDefaultsTab";
import { AuditLogsTab } from "@/components/settings/AuditLogsTab";
import { BackupExportTab } from "@/components/settings/BackupExportTab";

export function AdminSettingsPage() {
  const { admin } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileForm, setProfileForm] = useState({
    full_name: admin?.full_name ?? "",
    email: admin?.email ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    current_password: "", new_password: "", confirm_password: "",
  });
  const [changingPassword, setChangingPassword] = useState(false);

  const [uploading, setUploading] = useState(false);

  const initials = admin?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "AD";

  const avatarUrl = admin?.avatar_path
    ? getBackendAssetUrl(`uploads/${admin.avatar_path}`)
    : null;

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await api.put("/auth/me", profileForm);
      useAuthStore.setState({ admin: res.data });
      toast({ title: "Profile updated", variant: "success" });
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordForm.new_password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      await api.put("/auth/me/password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      toast({ title: "Password changed successfully", variant: "success" });
    } catch (err: any) {
      toast({
        title: err?.response?.data?.detail || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/auth/me/avatar", formData, {
        headers: { "Content-Type": undefined },
      });
      useAuthStore.setState({ admin: res.data });
      toast({ title: "Avatar updated", variant: "success" });
    } catch {
      toast({ title: "Failed to upload avatar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      const res = await api.delete("/auth/me/avatar");
      useAuthStore.setState({ admin: res.data });
      toast({ title: "Avatar removed", variant: "success" });
    } catch {
      toast({ title: "Failed to remove avatar", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage your profile, company information, and configurable options.
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="justify-start">
          <TabsTrigger value="profile">Profile &amp; Security</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="lists">Lists</TabsTrigger>
          <TabsTrigger value="admins">Admin Users</TabsTrigger>
          <TabsTrigger value="defaults">System Defaults</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="backup">Backup &amp; Export</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" /> Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-5">
                <div className="relative group">
                  <Avatar className="h-20 w-20 border-2 border-border">
                    <AvatarImage src={avatarUrl ?? undefined} alt={admin?.full_name} />
                    <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center h-full w-full"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      ) : (
                        <Camera className="h-6 w-6 text-white" />
                      )}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUploadAvatar}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{admin?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{admin?.email}</p>
                  {admin?.avatar_path && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-destructive hover:text-destructive px-0"
                      onClick={handleRemoveAvatar}
                      disabled={uploading}
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Remove
                    </Button>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-name">Full Name</Label>
                  <Input
                    id="settings-name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">Email</Label>
                  <Input
                    id="settings-email"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4 text-primary" /> Change Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-current-pw">Current Password</Label>
                <Input
                  id="settings-current-pw"
                  type="password"
                  value={passwordForm.current_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="settings-new-pw">New Password</Label>
                  <Input
                    id="settings-new-pw"
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-confirm-pw">Confirm New Password</Label>
                  <Input
                    id="settings-confirm-pw"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  />
                </div>
              </div>
              <Button
                onClick={handleChangePassword}
                disabled={changingPassword || !passwordForm.current_password || !passwordForm.new_password || !passwordForm.confirm_password}
              >
                {changingPassword ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="mr-2 h-4 w-4" />
                )}
                Change Password
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="mt-4">
          <CompanySettingsTab />
        </TabsContent>

        <TabsContent value="lists" className="mt-4">
          <LookupsTab />
        </TabsContent>

        <TabsContent value="admins" className="mt-4">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="defaults" className="mt-4">
          <SystemDefaultsTab />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditLogsTab />
        </TabsContent>

        <TabsContent value="backup" className="mt-4">
          <BackupExportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
