import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Share2,
  Copy,
  Check,
  Mail,
  MessageCircle,
  Send,
  QrCode,
  Sparkles,
  Smartphone,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface ShareModalProps {
  title?: string;
  description?: string;
  shareUrl?: string;
  shareText?: string;
  customButton?: React.ReactNode;
  triggerClassName?: string;
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "link";
  children?: React.ReactNode;
}

export function ShareModal({
  title = "Share SocietyOne",
  description = "Share this application with residents, neighbors, family, or visitors.",
  shareUrl,
  shareText = "🏡 SocietyOne — Modern Visitor & Residential Society Management Portal. Fast entry approvals, advance registrations, and community security. Check it out:",
  customButton,
  triggerClassName,
  triggerSize = "sm",
  triggerVariant = "outline",
  children,
}: ShareModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Compute active target URL
  const currentUrl =
    shareUrl ||
    (typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : "https://society-one-backend.onrender.com");

  const fullShareMessage = `${shareText} ${currentUrl}`;

  // Copy link to clipboard
  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(currentUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = currentUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Failed to copy link.");
    }
  };

  // WhatsApp Share
  const handleWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(fullShareMessage)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Email Share
  const handleEmail = () => {
    const subject = encodeURIComponent("Check out SocietyOne Portal");
    const body = encodeURIComponent(
      `Hello,\n\nI wanted to share SocietyOne with you:\n\n${fullShareMessage}\n\nEasily manage visitor registrations, entry clearances, and society notifications.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  };

  // Telegram Share
  const handleTelegram = () => {
    const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgUrl, "_blank", "noopener,noreferrer");
  };

  // Instagram / Social Direct copy helper
  const handleInstagram = async () => {
    await handleCopy();
    toast.info("Link copied! Paste it in your Instagram Story, Bio, or Direct Message.", {
      duration: 4000,
    });
    // On mobile or web, try to open Instagram if appropriate
    window.open("https://instagram.com", "_blank", "noopener,noreferrer");
  };

  // Native Web Share API if supported
  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "SocietyOne",
          text: shareText,
          url: currentUrl,
        });
        toast.success("Shared successfully!");
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          toast.error("Share dismissed or not supported.");
        }
      }
    } else {
      await handleCopy();
    }
  };

  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? (
          children
        ) : customButton ? (
          customButton
        ) : triggerSize === "icon" ? (
          <Button
            type="button"
            variant={triggerVariant}
            size="icon"
            className={`transition-all duration-200 hover:-translate-y-0.5 shrink-0 ${triggerClassName || ""}`}
            aria-label={title || "Share application"}
          >
            <Share2 className="size-4 text-brand-orange" />
            <span className="sr-only">Share</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant={triggerVariant}
            size={triggerSize}
            className={`gap-1.5 font-medium transition-all duration-200 hover:-translate-y-0.5 shrink-0 ${triggerClassName || ""}`}
          >
            <Share2 className="size-4 text-brand-orange shrink-0" />
            <span>Share</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="w-[94vw] max-w-md rounded-2xl sm:rounded-3xl border-border bg-card p-5 sm:p-6 shadow-2xl">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-orange/10 text-brand-orange">
              <Share2 className="size-4.5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="font-display text-base sm:text-lg font-bold text-foreground truncate">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground line-clamp-2">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Share Channel Buttons Grid */}
        <div className="grid grid-cols-3 gap-2.5 py-4">
          {/* WhatsApp */}
          <button
            type="button"
            onClick={handleWhatsApp}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-50/50 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500 hover:bg-emerald-50 hover:shadow-md dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
          >
            <div className="grid size-10 place-items-center rounded-full bg-emerald-500 text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
              <MessageCircle className="size-5 fill-current" />
            </div>
            <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              WhatsApp
            </span>
          </button>

          {/* Email */}
          <button
            type="button"
            onClick={handleEmail}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-50/50 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-blue-500 hover:bg-blue-50 hover:shadow-md dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
          >
            <div className="grid size-10 place-items-center rounded-full bg-blue-600 text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
              <Mail className="size-5" />
            </div>
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
              Email
            </span>
          </button>

          {/* Instagram */}
          <button
            type="button"
            onClick={handleInstagram}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-pink-500/20 bg-pink-50/50 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-pink-500 hover:bg-pink-50 hover:shadow-md dark:bg-pink-950/20 dark:hover:bg-pink-950/40"
          >
            <div className="grid size-10 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
              <Sparkles className="size-5" />
            </div>
            <span className="text-xs font-semibold text-pink-900 dark:text-pink-200">
              Instagram
            </span>
          </button>

          {/* Telegram */}
          <button
            type="button"
            onClick={handleTelegram}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-sky-500/20 bg-sky-50/50 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-sky-500 hover:bg-sky-50 hover:shadow-md dark:bg-sky-950/20 dark:hover:bg-sky-950/40"
          >
            <div className="grid size-10 place-items-center rounded-full bg-sky-500 text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
              <Send className="size-5 -ml-0.5" />
            </div>
            <span className="text-xs font-semibold text-sky-900 dark:text-sky-200">
              Telegram
            </span>
          </button>

          {/* QR Code Toggle */}
          <button
            type="button"
            onClick={() => setShowQr(!showQr)}
            className={`group flex flex-col items-center justify-center gap-2 rounded-2xl border p-3.5 transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
              showQr
                ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                : "border-purple-500/20 bg-purple-50/50 hover:border-purple-500 hover:bg-purple-50 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 text-purple-900 dark:text-purple-200"
            }`}
          >
            <div className="grid size-10 place-items-center rounded-full bg-purple-600 text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
              <QrCode className="size-5" />
            </div>
            <span className="text-xs font-semibold">
              {showQr ? "Hide QR" : "QR Code"}
            </span>
          </button>

          {/* More Options / Native Share on Mobile */}
          <button
            type="button"
            onClick={hasNativeShare ? handleNativeShare : handleCopy}
            className="group flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-muted/50 p-3.5 transition-all duration-200 hover:-translate-y-1 hover:border-brand-blue hover:bg-info-soft hover:shadow-md"
          >
            <div className="grid size-10 place-items-center rounded-full bg-brand-blue text-white shadow-sm transition-transform duration-200 group-hover:scale-110">
              {hasNativeShare ? <Smartphone className="size-5" /> : <ExternalLink className="size-5" />}
            </div>
            <span className="text-xs font-semibold text-foreground">
              {hasNativeShare ? "Device Share" : "Direct Link"}
            </span>
          </button>
        </div>

        {/* QR Code Display View */}
        {showQr && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-brand-orange/30 bg-muted/30 p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="rounded-xl bg-white p-2.5 shadow-sm">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(currentUrl)}`}
                alt="Scan to open SocietyOne"
                className="size-36 object-contain"
                loading="lazy"
              />
            </div>
            <p className="text-center text-[11px] font-medium text-muted-foreground">
              Scan with your phone camera to open instantly
            </p>
          </div>
        )}

        {/* Copy Link Input Bar */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Direct Application Link
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="text"
              readOnly
              value={currentUrl}
              className="h-10 text-xs font-mono bg-muted/40 text-foreground truncate select-all"
            />
            <Button
              type="button"
              variant={copied ? "default" : "secondary"}
              size="sm"
              onClick={handleCopy}
              className={`h-10 shrink-0 gap-1.5 px-4 font-semibold transition-all duration-200 ${
                copied ? "bg-emerald-600 hover:bg-emerald-600 text-white" : ""
              }`}
            >
              {copied ? (
                <>
                  <Check className="size-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="size-4" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
