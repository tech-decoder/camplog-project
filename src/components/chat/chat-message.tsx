"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ACTION_TYPE_CONFIG } from "@/lib/constants";
import { ActionType } from "@/lib/types/changes";
import { ActionIcon } from "@/components/ui/action-icon";
import Link from "next/link";
import Image from "next/image";

interface ExtractedChange {
  campaign_name: string;
  site?: string;
  action_type: string;
  geo: string | null;
  change_value: string | null;
  description: string;
  confidence: number;
  id?: string;
}

interface MessageProps {
  message: {
    id: string;
    role: "user" | "assistant";
    content: string;
    image_urls: string[];
    extracted_changes?: ExtractedChange[];
    created_at: string;
  };
}

export function ChatMessage({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {/* Images */}
        {message.image_urls.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {message.image_urls.map((url, i) => (
              <div
                key={i}
                className="relative w-48 h-32 rounded-lg overflow-hidden"
              >
                <Image
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        )}

        {/* Text */}
        {message.content && (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        )}

        {/* Extracted Changes (assistant only) */}
        {message.extracted_changes && message.extracted_changes.length > 0 && (
          <div className="mt-3 space-y-2">
            {message.extracted_changes.map((change, i) => {
              const config =
                ACTION_TYPE_CONFIG[change.action_type as ActionType];
              return (
                <div
                  key={i}
                  className="bg-background/50 rounded-lg p-3 border border-border/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-xs",
                        config?.bgColor,
                        config?.color
                      )}
                    >
                      {config && <ActionIcon iconName={config.icon} className="h-3 w-3" />}
                      {config?.label}
                    </Badge>
                    {change.confidence < 0.8 && (
                      <Badge
                        variant="secondary"
                        className="bg-amber-500/15 text-amber-700 dark:text-amber-400 text-xs"
                      >
                        Low confidence
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">
                    {change.campaign_name}
                    {change.site ? ` (${change.site})` : ""}
                    {change.geo ? ` — ${change.geo}` : ""}
                    {change.change_value ? ` ${change.change_value}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {change.description}
                  </p>
                  {change.id && (
                    <Link
                      href={`/changes/${change.id}`}
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      View details →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            "text-[10px] mt-1",
            isUser
              ? "text-primary-foreground/60"
              : "text-muted-foreground"
          )}
        >
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}
