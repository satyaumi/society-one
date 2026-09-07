import { useState, useRef, type ChangeEvent } from "react";
import { Camera, Image as ImageIcon, Loader2, Trash2, UploadCloud, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { resolveMediaUrl } from "@/lib/media-url";
import { visitorService } from "@/services";

interface VisitorPhotoUploadProps {
  photoUrl?: string;
  onPhotoChange: (url: string | undefined) => void;
  required?: boolean;
  isPublic?: boolean;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  existingPhotoReused?: boolean;
}

export function VisitorPhotoUpload({
  photoUrl,
  onPhotoChange,
  required = false,
  isPublic = false,
  label = "Visitor Photo",
  helperText,
  disabled = false,
  existingPhotoReused = false,
}: VisitorPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so re-selecting same file triggers change
    e.target.value = "";

    // 1. Frontend validation: file type
    const fileType = file.type.toLowerCase();
    if (!allowedTypes.includes(fileType)) {
      setError("Please select a valid image file (JPG, PNG, or WebP).");
      return;
    }

    // 2. Frontend validation: file size
    if (file.size > maxSizeBytes) {
      setError("Image file size must be under 5MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const uploadedUrl = isPublic
        ? await visitorService.uploadPublicVisitorPhoto(file)
        : await visitorService.uploadVisitorPhoto(file);

      onPhotoChange(uploadedUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload visitor photo.";
      setError(msg);
      // If optional and upload fails, parent is informed or can continue
      if (!required) {
        onPhotoChange(undefined);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    setError(null);
    onPhotoChange(undefined);
  }

  const resolvedUrl = resolveMediaUrl(photoUrl);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Camera className="size-4 text-brand-blue" />
          <span>{label}</span>
          {required ? (
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
              Required
            </span>
          ) : (
            <span className="text-xs font-normal text-muted-foreground">(Optional)</span>
          )}
        </Label>

        {existingPhotoReused && photoUrl && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" /> Photo on file
          </span>
        )}
      </div>

      {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => void handleFileSelected(e)}
        className="hidden"
        disabled={disabled || uploading}
      />

      {/* Photo Preview or Upload Zone */}
      {photoUrl && resolvedUrl ? (
        <div className="relative flex items-center gap-4 rounded-xl border border-border bg-card p-3 shadow-sm">
          <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
            <img
              src={resolvedUrl}
              alt="Visitor"
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback on broken image
                (e.target as HTMLImageElement).src = "";
              }}
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <Loader2 className="size-5 animate-spin text-brand-blue" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="truncate text-xs font-medium text-foreground">
              {existingPhotoReused ? "Existing Visitor Photo" : "Photo uploaded successfully"}
            </p>
            <p className="text-[11px] text-muted-foreground">JPG/PNG/WebP · Ready for verification</p>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled || uploading}
                onClick={() => fileInputRef.current?.click()}
                className="h-7 text-xs"
              >
                {uploading ? <Loader2 className="mr-1 size-3 animate-spin" /> : <UploadCloud className="mr-1 size-3" />}
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || uploading}
                onClick={handleRemove}
                className="h-7 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="mr-1 size-3" />
                Remove
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => {
            if (!disabled && !uploading) {
              fileInputRef.current?.click();
            }
          }}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card/60 p-5 text-center transition hover:border-brand-blue/50 hover:bg-info-soft/30 ${
            disabled ? "cursor-not-allowed opacity-60" : ""
          } ${required ? "border-brand-blue/30 bg-info-soft/10" : ""}`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2 py-2">
              <Loader2 className="size-8 animate-spin text-brand-blue" />
              <p className="text-xs font-medium text-muted-foreground">Uploading visitor photo...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-1">
              <div className="grid size-11 place-items-center rounded-full bg-info-soft text-brand-blue">
                <ImageIcon className="size-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">
                  <span className="font-semibold text-brand-blue hover:underline">Click or tap to upload</span> photo
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Supports JPG, PNG, WebP up to 5MB
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
