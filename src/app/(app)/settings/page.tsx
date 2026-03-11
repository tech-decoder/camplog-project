"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/layout/page-shell";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";
import { Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, User, Mail, Shield, Eye, EyeOff, Palette, Key, Copy, Trash2, Plus, Type, Sprout } from "lucide-react";
import { toast } from "sonner";
import { ApiKey } from "@/lib/types/ad-copies";
import { ThemeSelector } from "@/components/ui/theme-toggle";
import { CopyPool } from "@/lib/types/generation-jobs";
import { CopyPoolEditor } from "@/components/generate/copy-pool-editor";

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

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("Default");
  const [generatingKey, setGeneratingKey] = useState(false);
  const [newPlaintextKey, setNewPlaintextKey] = useState<string | null>(null);

  // Copy Pool
  const [copyPool, setCopyPool] = useState<CopyPool>({ headlines: [], subheadlines: [], ctas: [], disclaimers: [] });
  const [savingPool, setSavingPool] = useState(false);
  const [seedingPool, setSeedingPool] = useState(false);

  const ENGLISH_SEED: CopyPool = {
    headlines: [
      "NOW HIRING AT {brand}",
      "{brand} IS HIRING",
      "HOW TO APPLY AT {brand}",
      "JOBS AT {brand}",
      "WE'RE HIRING",
      "START WORK THIS WEEK",
      "HIRING NOW — APPLY TODAY",
    ],
    subheadlines: [
      "Start work this week",
      "Step by step guide",
      "No resume needed",
      "Apply in minutes",
      "Part-Time • Free Food",
      "Free Meals • Flexible Shifts • Weekly Pay",
      "Quick and easy application",
    ],
    ctas: [
      "APPLY IN MINUTES",
      "APPLY TODAY",
      "OPEN THE GUIDE",
      "SEE JOBS",
      "APPLY NOW",
      "GET STARTED",
      "START TODAY",
    ],
    disclaimers: [
      "Guide only. Not an official application.",
      "Not affiliated with {brand}.",
      "Informational guide only.",
    ],
  };

  const SPANISH_SEED: CopyPool = {
    headlines: [
      "EMPLEOS EN {brand}",
      "CÓMO APLICAR EN {brand}",
      "{brand} ESTÁ CONTRATANDO",
    ],
    subheadlines: [
      "Guía clara de solicitud y requisitos",
      "Empieza esta semana",
      "Sin currículum necesario",
    ],
    ctas: [
      "VER EMPLEOS",
      "APLICA HOY",
      "ABRIR LA GUÍA",
    ],
    disclaimers: [
      "Solo guía. No es solicitud oficial.",
      "No afiliado con {brand}.",
    ],
  };

  useEffect(() => {
    loadUser();
    loadApiKeys();
    loadCopyPool();
  }, []);

  async function loadCopyPool() {
    try {
      const res = await fetch("/api/style-preferences");
      if (res.ok) {
        const { preferences } = await res.json();
        if (preferences?.copy_pool) {
          setCopyPool(preferences.copy_pool);
        }
      }
    } catch {
      // use defaults
    }
  }

  async function handleSeedCopyPool(seed: CopyPool) {
    setSeedingPool(true);
    try {
      const merged: CopyPool = {
        headlines: [...new Set([...copyPool.headlines, ...seed.headlines])],
        subheadlines: [...new Set([...copyPool.subheadlines, ...seed.subheadlines])],
        ctas: [...new Set([...copyPool.ctas, ...seed.ctas])],
        disclaimers: [...new Set([...(copyPool.disclaimers || []), ...(seed.disclaimers || [])])],
      };
      setCopyPool(merged);
      const res = await fetch("/api/style-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy_pool: merged }),
      });
      if (res.ok) {
        toast.success(`Seeded ${seed.headlines.length} headlines, ${seed.subheadlines.length} subheadlines, ${seed.ctas.length} CTAs`);
      } else {
        toast.error("Failed to seed copy pool");
      }
    } catch {
      toast.error("Failed to seed copy pool");
    }
    setSeedingPool(false);
  }

  async function handleSaveCopyPool() {
    setSavingPool(true);
    try {
      const res = await fetch("/api/style-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy_pool: copyPool }),
      });
      if (res.ok) {
        toast.success("Copy pool saved");
      } else {
        toast.error("Failed to save copy pool");
      }
    } catch {
      toast.error("Failed to save copy pool");
    }
    setSavingPool(false);
  }

  async function handleClearCopyPool() {
    const empty: CopyPool = { headlines: [], subheadlines: [], ctas: [], disclaimers: [] };
    setCopyPool(empty);
    setSavingPool(true);
    try {
      const res = await fetch("/api/style-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy_pool: empty }),
      });
      if (res.ok) {
        toast.success("Copy pool cleared");
      } else {
        toast.error("Failed to clear copy pool");
      }
    } catch {
      toast.error("Failed to clear copy pool");
    }
    setSavingPool(false);
  }

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

  async function loadApiKeys() {
    try {
      const res = await fetch("/api/api-keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch {
      // silently fail
    }
  }

  async function handleGenerateKey() {
    setGeneratingKey(true);
    setNewPlaintextKey(null);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewPlaintextKey(data.plaintext_key);
        setNewKeyName("Default");
        loadApiKeys();
      }
    } catch {
      toast.error("Failed to generate key");
    }
    setGeneratingKey(false);
  }

  async function handleRevokeKey(keyId: string) {
    const res = await fetch(`/api/api-keys?id=${keyId}`, { method: "DELETE" });
    if (res.ok) {
      loadApiKeys();
      toast.success("Key revoked");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageShell>
      <GradientPageHeader
        icon={Settings}
        title="Settings"
        description="Manage your account, appearance, and API access."
      />
      <div className="max-w-2xl space-y-6">
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

      {/* API Keys */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">API Keys</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                For external tools (e.g., Claude copywriter) to access your campaigns.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing keys */}
          {apiKeys.filter((k) => !k.revoked_at).length > 0 && (
            <div className="space-y-2">
              {apiKeys
                .filter((k) => !k.revoked_at)
                .map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium">{key.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{key.key_prefix}</p>
                      {key.last_used_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Last used: {new Date(key.last_used_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => handleRevokeKey(key.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Revoke
                    </Button>
                  </div>
                ))}
            </div>
          )}

          {/* New plaintext key display */}
          {newPlaintextKey && (
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
              <p className="text-sm font-medium text-primary">New API Key Created</p>
              <p className="text-xs text-muted-foreground">
                Copy this key now — it won&apos;t be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs font-mono bg-card p-2 rounded border border-border break-all">
                  {newPlaintextKey}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  className="flex-shrink-0"
                  onClick={() => {
                    navigator.clipboard.writeText(newPlaintextKey);
                    toast.success("Copied to clipboard");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Generate new key */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Key name"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="h-9 flex-1"
            />
            <Button
              size="sm"
              onClick={handleGenerateKey}
              disabled={generatingKey}
              className="w-full sm:w-auto"
            >
              {generatingKey ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Generate Key
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Copy Pool */}
      <Card className="border-border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Type className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Copy Pool</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Headlines, subheadlines, and CTAs the AI uses when generating in Custom mode.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyPoolEditor value={copyPool} onChange={setCopyPool} />
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" onClick={handleSaveCopyPool} disabled={savingPool}>
              {savingPool ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              Save Copy Pool
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSeedCopyPool(ENGLISH_SEED)}
              disabled={seedingPool}
            >
              {seedingPool ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sprout className="h-3.5 w-3.5 mr-1.5" />}
              Seed English
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSeedCopyPool(SPANISH_SEED)}
              disabled={seedingPool}
            >
              {seedingPool ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sprout className="h-3.5 w-3.5 mr-1.5" />}
              Seed Spanish
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleClearCopyPool}
              disabled={savingPool}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear All
            </Button>
          </div>
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
    </PageShell>
  );
}
