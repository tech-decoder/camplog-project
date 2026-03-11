"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";
import { CopyPool } from "@/lib/types/generation-jobs";

function CopyPoolSection({
  label,
  items,
  placeholder,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onAdd: (text: string) => void;
  onRemove: (index: number) => void;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInput("");
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs"
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleAdd}
          disabled={!input.trim()}
          className="h-8 w-8 p-0 flex-shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted border border-border text-xs text-foreground"
            >
              {item}
              <button
                onClick={() => onRemove(i)}
                className="text-muted-foreground hover:text-foreground transition-colors ml-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function CopyPoolEditor({
  value,
  onChange,
}: {
  value: CopyPool;
  onChange: (pool: CopyPool) => void;
}) {
  return (
    <div className="space-y-4">
      <CopyPoolSection
        label="Headlines"
        items={value.headlines}
        placeholder='e.g. NOW HIRING AT KFC'
        onAdd={(text) => onChange({ ...value, headlines: [...value.headlines, text] })}
        onRemove={(i) => onChange({ ...value, headlines: value.headlines.filter((_, idx) => idx !== i) })}
      />
      <CopyPoolSection
        label="Subheadlines"
        items={value.subheadlines}
        placeholder='e.g. Start work this week'
        onAdd={(text) => onChange({ ...value, subheadlines: [...value.subheadlines, text] })}
        onRemove={(i) => onChange({ ...value, subheadlines: value.subheadlines.filter((_, idx) => idx !== i) })}
      />
      <CopyPoolSection
        label="CTAs"
        items={value.ctas}
        placeholder='e.g. APPLY IN MINUTES'
        onAdd={(text) => onChange({ ...value, ctas: [...value.ctas, text] })}
        onRemove={(i) => onChange({ ...value, ctas: value.ctas.filter((_, idx) => idx !== i) })}
      />
      <CopyPoolSection
        label="Disclaimers"
        items={value.disclaimers || []}
        placeholder='e.g. This is an informational guide. Not an official application.'
        onAdd={(text) => onChange({ ...value, disclaimers: [...(value.disclaimers || []), text] })}
        onRemove={(i) => onChange({ ...value, disclaimers: (value.disclaimers || []).filter((_, idx) => idx !== i) })}
      />
    </div>
  );
}
