"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip, Send, X } from "lucide-react";
import Image from "next/image";

interface ChatInputProps {
  onSend: (content: string, images: File[]) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addImages = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/")
    );
    if (newFiles.length === 0) return;

    setImages((prev) => [...prev, ...newFiles]);
    const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!text.trim() && images.length === 0) return;
    onSend(text.trim(), images);
    setText("");
    setImages([]);
    previews.forEach((p) => URL.revokeObjectURL(p));
    setPreviews([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      addImages(imageFiles);
    }
  };

  return (
    <div className="border-t border-border bg-card px-4 py-3 pb-6 md:pb-3">
      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {previews.map((preview, i) => (
            <div key={i} className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-border">
                <Image
                  src={preview}
                  alt={`Preview ${i + 1}`}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              </div>
              <button
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Row */}
      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addImages(e.target.files)}
        />
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a change or paste a screenshot..."
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
          disabled={disabled}
        />

        <Button
          size="icon"
          className="flex-shrink-0"
          onClick={handleSubmit}
          disabled={disabled || (!text.trim() && images.length === 0)}
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
