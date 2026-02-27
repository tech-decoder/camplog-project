"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Eye, EyeOff, RefreshCw, Copy, Check } from "lucide-react";

function generatePassword(length = 16): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const symbols = "!@#$%&*_+-=";
  const all = upper + lower + digits + symbols;

  // Ensure at least one of each
  const required = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  const remaining = Array.from({ length: length - required.length }, () =>
    all[Math.floor(Math.random() * all.length)]
  );

  return [...required, ...remaining]
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const autoHideTimer = useRef<NodeJS.Timeout | null>(null);

  const hidePassword = useCallback(() => {
    setShowPassword(false);
  }, []);

  function togglePassword() {
    setShowPassword((prev) => {
      const next = !prev;
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
      if (next) {
        autoHideTimer.current = setTimeout(hidePassword, 3000);
      }
      return next;
    });
  }

  function handleGeneratePassword() {
    const pw = generatePassword();
    setPassword(pw);
    setShowPassword(true);
    if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    autoHideTimer.current = setTimeout(hidePassword, 5000);
  }

  async function handleCopyPassword() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  useEffect(() => {
    return () => {
      if (autoHideTimer.current) clearTimeout(autoHideTimer.current);
    };
  }, []);

  const passwordStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: "Too short", color: "bg-slate-300" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { label: "Weak", color: "bg-[#366ae8]/30" };
    if (score <= 3) return { label: "Medium", color: "bg-[#366ae8]/60" };
    return { label: "Strong", color: "bg-[#366ae8]" };
  })();

  async function handleEmailSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md text-center">
          <Image
            src="/camplog.svg"
            alt="CampLog"
            width={56}
            height={56}
            className="rounded-2xl mx-auto mb-6"
          />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Check your email
          </h1>
          <p className="text-slate-600 mb-6">
            We&apos;ve sent a confirmation link to{" "}
            <span className="font-medium text-slate-900">{email}</span>. Click
            the link to activate your account.
          </p>
          <Link href="/login">
            <Button variant="outline">Back to Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <Image src="/camplog.svg" alt="CampLog" width={48} height={48} className="rounded-xl" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Start tracking campaign changes today
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[#366ae8]/5 border border-[#366ae8]/15 text-sm text-[#366ae8]">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-sm text-slate-700">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required
                className="mt-1 h-11"
              />
            </div>
            <div>
              <Label htmlFor="email" className="text-sm text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                className="mt-1 h-11"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm text-slate-700">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1 text-xs text-[#366ae8] hover:text-[#2d5bcf] font-medium transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Generate
                </button>
              </div>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  minLength={6}
                  className="h-11 pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {password.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                      title="Copy password"
                    >
                      {copied ? (
                        <Check className="h-3.5 w-3.5 text-[#366ae8]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={togglePassword}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {passwordStrength && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                      style={{
                        width:
                          passwordStrength.label === "Too short"
                            ? "15%"
                            : passwordStrength.label === "Weak"
                              ? "33%"
                              : passwordStrength.label === "Medium"
                                ? "66%"
                                : "100%",
                      }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{passwordStrength.label}</span>
                </div>
              )}
            </div>
            <Button
              type="submit"
              className="w-full h-11 bg-[#366ae8] hover:bg-[#2d5bcf] text-white"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Create Account
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[#366ae8] hover:text-[#2d5bcf] font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
