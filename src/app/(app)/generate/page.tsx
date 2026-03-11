"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Save, Library, Plus } from "lucide-react";
import { toast } from "sonner";
import { GenerationMode, GenerationStrategy, GenerationJob } from "@/lib/types/generation-jobs";
import { GeneratedImage } from "@/lib/types/generated-images";
import { ModeSelector } from "@/components/generate/mode-selector";
import { AiTakeoverForm, AiTakeoverFormData } from "@/components/generate/ai-takeover-form";
import { CustomForm, CustomFormData } from "@/components/generate/custom-form";
import { WinningVariantsForm, WinningVariantsFormData } from "@/components/generate/winning-variants-form";
import { StrategyPreview } from "@/components/generate/strategy-preview";
import { GenerationProgress } from "@/components/generate/generation-progress";
import { ImageGallery } from "@/components/generate/image-gallery";
import { SaveCampaignDialog } from "@/components/generate/save-campaign-dialog";
import { PipelineBreadcrumbs } from "@/components/generate/pipeline-breadcrumbs";
import { GenerationTimer } from "@/components/generate/generation-timer";
import { PageShell } from "@/components/layout/page-shell";
import { GradientPageHeader } from "@/components/layout/gradient-page-header";

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <GeneratePageContent />
    </Suspense>
  );
}

type PageStep = "form" | "strategy" | "generating" | "complete";

function GeneratePageContent() {
  const [mode, setMode] = useState<GenerationMode>("ai_takeover");
  const [step, setStep] = useState<PageStep>("form");

  // Job state
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [strategy, setStrategy] = useState<GenerationStrategy | null>(null);
  const [jobImages, setJobImages] = useState<GeneratedImage[]>([]);

  // Loading states
  const [strategizing, setStrategizing] = useState(false);
  const [executing, setExecuting] = useState(false);

  // All generated images (gallery)
  const [allImages, setAllImages] = useState<GeneratedImage[]>([]);
  const [loadingGallery, setLoadingGallery] = useState(true);

  // Timer — starts when user clicks Generate Strategy
  const [pipelineStartTime, setPipelineStartTime] = useState<number | null>(null);

  // Library view toggle
  const [showLibrary, setShowLibrary] = useState(false);

  // Save campaign dialog
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Polling ref
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch all user images for gallery
  useEffect(() => {
    async function load() {
      setLoadingGallery(true);
      const res = await fetch("/api/generated-images");
      if (res.ok) {
        const data = await res.json();
        setAllImages(data.images || []);
      }
      setLoadingGallery(false);
    }
    load();
  }, []);

  // Poll job status during generation
  const startPolling = useCallback(
    (id: string) => {
      if (pollRef.current) clearInterval(pollRef.current);

      pollRef.current = setInterval(async () => {
        try {
          const [jobRes, imgRes] = await Promise.all([
            fetch(`/api/generation-jobs/${id}`),
            fetch(`/api/generation-jobs/${id}/images`),
          ]);

          if (jobRes.ok) {
            const { job: updatedJob } = await jobRes.json();
            setJob(updatedJob);

            if (updatedJob.status === "completed" || updatedJob.status === "failed") {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              setStep("complete");

              if (updatedJob.status === "completed") {
                toast.success(`Generated ${updatedJob.images_completed} images`);
                const galleryRes = await fetch("/api/generated-images");
                if (galleryRes.ok) {
                  const data = await galleryRes.json();
                  setAllImages(data.images || []);
                }
              } else {
                toast.error(updatedJob.error_message || "Generation failed");
              }
            }
          }

          if (imgRes.ok) {
            const { images } = await imgRes.json();
            setJobImages(images || []);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 3000);
    },
    []
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Form Submission Handlers ──────────────────────────────────────────

  async function handleTakeoverSubmit(data: AiTakeoverFormData) {
    setStrategizing(true);
    setPipelineStartTime(Date.now());
    try {
      const createRes = await fetch("/api/generation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ai_takeover",
          brand_name: data.brand_name,
          model: data.model,
          language: data.language,
          format_split: data.format_split,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        toast.error(err.error || "Failed to create job");
        setPipelineStartTime(null);
        return;
      }

      const { job: newJob } = await createRes.json();
      setJobId(newJob.id);
      setJob(newJob);

      const stratRes = await fetch(`/api/generation-jobs/${newJob.id}/strategize`, {
        method: "POST",
      });

      if (!stratRes.ok) {
        const err = await stratRes.json();
        const detail = err.detail ? `\n${err.detail}` : "";
        toast.error(`Strategy failed: ${err.error || "Unknown error"}${detail}`, { duration: 8000 });
        setPipelineStartTime(null);
        return;
      }

      const { strategy: newStrategy } = await stratRes.json();
      setStrategy(newStrategy);
      setStep("strategy");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Strategy failed: ${msg}`, { duration: 8000 });
      setPipelineStartTime(null);
    } finally {
      setStrategizing(false);
    }
  }

  async function handleRegenerate() {
    if (!jobId) return;
    setStrategizing(true);
    try {
      const res = await fetch(`/api/generation-jobs/${jobId}/strategize`, {
        method: "POST",
      });
      if (res.ok) {
        const { strategy: newStrategy } = await res.json();
        setStrategy(newStrategy);
        toast.success("Strategy regenerated");
      } else {
        const err = await res.json();
        const detail = err.detail ? `\n${err.detail}` : "";
        toast.error(`Regenerate failed: ${err.error || "Unknown error"}${detail}`, { duration: 8000 });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Regenerate failed: ${msg}`, { duration: 8000 });
    } finally {
      setStrategizing(false);
    }
  }

  async function handleCustomSubmit(data: CustomFormData) {
    setStrategizing(true);
    setPipelineStartTime(Date.now());
    try {
      const createRes = await fetch("/api/generation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "custom",
          brand_name: data.brand_name,
          model: data.model,
          language: data.language,
          format_split: data.format_split,
          style_preferences: data.style_preferences,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        toast.error(err.error || "Failed to create job");
        setPipelineStartTime(null);
        return;
      }

      const { job: newJob } = await createRes.json();
      setJobId(newJob.id);
      setJob(newJob);

      const stratRes = await fetch(`/api/generation-jobs/${newJob.id}/strategize`, {
        method: "POST",
      });

      if (!stratRes.ok) {
        const err = await stratRes.json();
        const detail = err.detail ? `\n${err.detail}` : "";
        toast.error(`Strategy failed: ${err.error || "Unknown error"}${detail}`, { duration: 8000 });
        setPipelineStartTime(null);
        return;
      }

      const { strategy: newStrategy } = await stratRes.json();
      setStrategy(newStrategy);
      setStep("strategy");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Strategy failed: ${msg}`, { duration: 8000 });
      setPipelineStartTime(null);
    } finally {
      setStrategizing(false);
    }
  }

  async function handleWinningVariantsSubmit(data: WinningVariantsFormData) {
    setStrategizing(true);
    setPipelineStartTime(Date.now());
    try {
      const createRes = await fetch("/api/generation-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "winning_variants",
          brand_name: data.brand_name,
          model: data.model,
          language: data.language,
          format_split: data.format_split,
          reference_images: data.reference_images,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        toast.error(err.error || "Failed to create job");
        setPipelineStartTime(null);
        return;
      }

      const { job: newJob } = await createRes.json();
      setJobId(newJob.id);
      setJob(newJob);

      const stratRes = await fetch(`/api/generation-jobs/${newJob.id}/strategize`, {
        method: "POST",
      });

      if (!stratRes.ok) {
        const err = await stratRes.json();
        const detail = err.detail ? `\n${err.detail}` : "";
        toast.error(`Strategy failed: ${err.error || "Unknown error"}${detail}`, { duration: 8000 });
        setPipelineStartTime(null);
        return;
      }

      const { strategy: newStrategy } = await stratRes.json();
      setStrategy(newStrategy);
      setStep("strategy");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      toast.error(`Strategy failed: ${msg}`, { duration: 8000 });
      setPipelineStartTime(null);
    } finally {
      setStrategizing(false);
    }
  }

  // ── Execute ──────────────────────────────────────────────────────────

  async function handleExecute() {
    if (!jobId) return;
    setExecuting(true);
    try {
      const res = await fetch(`/api/generation-jobs/${jobId}/execute`, {
        method: "POST",
      });
      if (res.ok) {
        setStep("generating");
        setJobImages([]);
        startPolling(jobId);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to start generation");
      }
    } catch {
      toast.error("Failed to start generation");
    } finally {
      setExecuting(false);
    }
  }

  // ── Delete handlers ────────────────────────────────────────────────

  async function handleDeleteImage(imageId: string) {
    const res = await fetch("/api/generated-images", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    if (res.ok) {
      setAllImages((prev) => prev.filter((img) => img.id !== imageId));
      setJobImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success("Image deleted");
    }
  }

  function handleBulkDelete(imageIds: string[]) {
    const idSet = new Set(imageIds);
    setAllImages((prev) => prev.filter((img) => !idSet.has(img.id)));
    setJobImages((prev) => prev.filter((img) => !idSet.has(img.id)));
  }

  // ── Reset ────────────────────────────────────────────────────────────

  function handleNewGeneration() {
    setStep("form");
    setJobId(null);
    setJob(null);
    setStrategy(null);
    setJobImages([]);
    setPipelineStartTime(null);
    setShowLibrary(false);
  }

  function handleBreadcrumbNav(target: PageStep) {
    // Only allow navigating back to form
    if (target === "form") {
      handleNewGeneration();
    }
  }

  const isComplete = step === "complete";
  const showTimer = pipelineStartTime !== null;

  return (
    <PageShell className="space-y-4">
      <GradientPageHeader
        icon={Sparkles}
        title="Generate"
        description="Create ad creatives with AI."
        actions={
          <div className="flex items-center gap-2">
            {!loadingGallery && allImages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setShowLibrary(!showLibrary)}
              >
                <Library className="h-3.5 w-3.5" />
                Library ({allImages.length})
              </Button>
            )}
            {step !== "form" && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={handleNewGeneration}
              >
                <Plus className="h-3.5 w-3.5" />
                New
              </Button>
            )}
          </div>
        }
      />

      {/* Breadcrumbs (visible once you leave the form) */}
      {step !== "form" && (
        <PipelineBreadcrumbs
          currentStep={step}
          onNavigate={handleBreadcrumbNav}
        />
      )}

      {/* ── Step: Configure ──────────────────────────────────────────── */}
      {step === "form" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <ModeSelector value={mode} onChange={setMode} />

            <div className="border-t border-border pt-4">
              {mode === "ai_takeover" && (
                <AiTakeoverForm
                  onSubmit={handleTakeoverSubmit}
                  loading={strategizing}
                />
              )}
              {mode === "custom" && (
                <CustomForm
                  onSubmit={handleCustomSubmit}
                  loading={strategizing}
                />
              )}
              {mode === "winning_variants" && (
                <WinningVariantsForm
                  onSubmit={handleWinningVariantsSubmit}
                  loading={strategizing}
                />
              )}
            </div>
            {/* Timer during strategizing — shows below the form, near the button */}
            {showTimer && (
              <GenerationTimer
                startTimestamp={pipelineStartTime!}
                isComplete={isComplete}
                totalImages={job?.images_completed || 0}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step: Strategy Preview ───────────────────────────────────── */}
      {step === "strategy" && strategy && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              AI Strategy Preview
            </h2>
            <StrategyPreview
              strategy={strategy}
              onExecute={handleExecute}
              onRegenerate={handleRegenerate}
              executing={executing}
              regenerating={strategizing}
            />
            {showTimer && (
              <GenerationTimer
                startTimestamp={pipelineStartTime!}
                isComplete={isComplete}
                totalImages={job?.images_completed || 0}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step: Generating ─────────────────────────────────────────── */}
      {step === "generating" && job && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <GenerationProgress job={job} images={jobImages} />
            {showTimer && (
              <GenerationTimer
                startTimestamp={pipelineStartTime!}
                isComplete={isComplete}
                totalImages={job?.images_completed || 0}
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step: Complete ───────────────────────────────────────────── */}
      {step === "complete" && (
        <div className="space-y-4">
          {/* Completion actions bar */}
          {job && (
            <div className="flex items-center gap-2 flex-wrap">
              {jobId && !job.campaign_id && (
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setShowSaveDialog(true)}
                >
                  <Save className="h-3.5 w-3.5" />
                  Save as Campaign
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={handleNewGeneration}
              >
                <Plus className="h-3.5 w-3.5" />
                Generate More
              </Button>
            </div>
          )}

          {/* Show batch results with full gallery (click-to-view, rating, etc.) */}
          {jobImages.length > 0 && (
            <ImageGallery
              images={jobImages}
              onDelete={handleDeleteImage}
              onBulkDelete={handleBulkDelete}
            />
          )}

          {showTimer && (
            <GenerationTimer
              startTimestamp={pipelineStartTime!}
              isComplete={isComplete}
              totalImages={job?.images_completed || 0}
            />
          )}
        </div>
      )}

      {/* ── Library Panel (toggleable overlay) ───────────────────────── */}
      {showLibrary && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              All Creatives
              {allImages.length > 0 && (
                <span className="ml-1 font-normal">({allImages.length})</span>
              )}
            </h2>
            <button
              onClick={() => setShowLibrary(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          {loadingGallery ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : allImages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No images generated yet.</p>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Generate your first batch to see them here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ImageGallery
              images={allImages}
              onDelete={handleDeleteImage}
              onBulkDelete={handleBulkDelete}
            />
          )}
        </div>
      )}

      {/* ── Save Campaign Dialog ─────────────────────────────────────── */}
      {job && jobId && (
        <SaveCampaignDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          jobId={jobId}
          brandName={job.brand_name}
          imageCount={jobImages.length}
          onSaved={handleNewGeneration}
        />
      )}
    </PageShell>
  );
}
