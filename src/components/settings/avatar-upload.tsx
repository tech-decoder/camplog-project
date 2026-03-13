"use client";

import { useState, useRef, useCallback } from "react";
import { useProfile } from "@/components/providers/profile-provider";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function AvatarUpload() {
  const { profile, refresh } = useProfile();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = profile
    ? (profile.nickname || profile.full_name || profile.email || "?")
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "..";

  const displayUrl = preview || profile?.avatar_url || null;

  const handleFile = useCallback(
    async (file: File) => {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Invalid file type. Use JPEG, PNG, WebP, or GIF.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error("File too large. Maximum size is 5MB.");
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      setUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/profile/avatar", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error || "Upload failed");
        }

        await refresh();
        toast.success("Avatar updated");
      } catch (err) {
        setPreview(null);
        toast.error(
          err instanceof Error ? err.message : "Failed to upload avatar"
        );
      } finally {
        setUploading(false);
        URL.revokeObjectURL(objectUrl);
      }
    },
    [refresh]
  );

  const handleDelete = async () => {
    setUploading(true);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove avatar");
      setPreview(null);
      await refresh();
      toast.success("Avatar removed");
    } catch {
      toast.error("Failed to remove avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="flex items-center gap-4 mb-6">
      <div
        className={`relative cursor-pointer group ${
          dragOver
            ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-full"
            : ""
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <Avatar className="w-20 h-20">
          {displayUrl && <AvatarImage src={displayUrl} alt="Avatar" />}
          <AvatarFallback className="text-lg bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Camera className="h-6 w-6 text-white" />
          )}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">Profile Picture</p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG, WebP or GIF. Max 5MB.
        </p>
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : null}
            Upload
          </Button>
          {profile?.avatar_url && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={uploading}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remove
            </Button>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
