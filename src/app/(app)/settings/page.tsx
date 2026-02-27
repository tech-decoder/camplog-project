"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, User, Mail, Shield, Eye, EyeOff, Palette } from "lucide-react";
import { ThemeSelector } from "@/components/ui/theme-toggle";

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email: string; full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  async function loadUser() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUser({
        id: user.id,
        email: user.email || "",
        full_name: user.user_metadata?.full_name || "",
      });
      setFullName(user.user_metadata?.full_name || "");
    }
    setLoading(false);
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setProfileMsg(null);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName },
    });

    if (error) {
      setProfileMsg({ type: "error", text: error.message });
    } else {
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
    }
    setSaving(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setChangingPassword(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setPasswordMsg({ type: "error", text: error.message });
    } else {
      setPasswordMsg({ type: "success", text: "Password updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Appearance */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">Appearance</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">Choose your preferred theme.</p>
          <ThemeSelector />
        </CardContent>
      </Card>

      {/* Profile */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">Profile</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <Label htmlFor="settings-email" className="text-sm text-foreground/80">
                Email
              </Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="settings-email"
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="h-11 pl-10 bg-muted text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <Label htmlFor="settings-name" className="text-sm text-foreground/80">
                Full Name
              </Label>
              <Input
                id="settings-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                className="mt-1 h-11"
              />
            </div>

            {profileMsg && (
              <div className={`p-3 rounded-lg text-sm ${
                profileMsg.type === "success"
                  ? "bg-primary/5 border border-primary/15 text-primary"
                  : "bg-muted border border-border text-foreground"
              }`}>
                {profileMsg.text}
              </div>
            )}

            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password" className="text-sm text-foreground/80">
                New Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label htmlFor="confirm-password" className="text-sm text-foreground/80">
                Confirm Password
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                required
                minLength={6}
                className="mt-1 h-11"
              />
            </div>

            {passwordMsg && (
              <div className={`p-3 rounded-lg text-sm ${
                passwordMsg.type === "success"
                  ? "bg-primary/5 border border-primary/15 text-primary"
                  : "bg-muted border border-border text-foreground"
              }`}>
                {passwordMsg.text}
              </div>
            )}

            <Button
              type="submit"
              variant="outline"
              disabled={changingPassword}
            >
              {changingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Account ID</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5 font-mono">{user?.id}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
