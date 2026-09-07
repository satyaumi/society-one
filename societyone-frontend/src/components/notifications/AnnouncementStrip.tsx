import { useEffect, useState } from "react";
import type { Announcement } from "@/types/domain";
import { notificationService, realtimeEvents } from "@/services";
import {
  AnnouncementDetailsModal,
  getAnnouncementMeta,
  getAudienceLabel,
  getAnnouncementImage,
} from "./AnnouncementDetailsModal";
import {
  ChevronLeft,
  ChevronRight,
  Pin,
  X,
  Calendar,
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function AnnouncementStrip() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const data = await notificationService.listDashboardAnnouncements();
      setAnnouncements(data);
      if (currentIndex >= data.length) {
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error("Failed to load dashboard announcements:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAnnouncements();

    const unsubscribe = realtimeEvents.subscribe((event) => {
      if (
        event.type === "announcement:changed" ||
        event.type === "announcement:dismissed" ||
        event.type === "notification:read" ||
        event.type === "notification:all-read"
      ) {
        void fetchAnnouncements();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const AUTOSLIDE_INTERVAL = 5000;

  // Auto-slide loop: continuously rotates through every event,
  // then loops back to the top pinned event (index 0) after 5 seconds
  useEffect(() => {
    if (announcements.length <= 1 || selectedAnnouncement !== null) {
      return;
    }

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
    }, AUTOSLIDE_INTERVAL);

    return () => clearInterval(timer);
  }, [announcements.length, currentIndex, selectedAnnouncement]);

  const handleNext = () => {
    if (announcements.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % announcements.length);
  };

  const handlePrev = () => {
    if (announcements.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + announcements.length) % announcements.length);
  };

  const handleDismiss = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    // Optimistic removal
    setAnnouncements((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (currentIndex >= next.length) {
        setCurrentIndex(Math.max(0, next.length - 1));
      }
      return next;
    });

    try {
      await notificationService.dismissAnnouncement(id);
    } catch (err) {
      console.error("Failed to dismiss announcement:", err);
      void fetchAnnouncements();
    }
  };

  if (loading || announcements.length === 0) {
    return null;
  }

  const current = announcements[currentIndex] || announcements[0];
  const meta = getAnnouncementMeta(current.type);
  const audienceLabel = getAudienceLabel(current.audience);
  const imageUrl = getAnnouncementImage(current);

  return (
    <>
      <section
        aria-label="Society Live Announcement Banner"
        className="relative mb-8 w-full overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/50 p-5 shadow-md backdrop-blur-md transition-all duration-300 hover:shadow-lg dark:from-slate-900/90 dark:via-slate-900/60 dark:to-emerald-950/30 sm:p-7"
      >
        {/* Auto-slide Progress Indicator */}
        {announcements.length > 1 && !selectedAnnouncement && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/10 dark:bg-emerald-400/10 overflow-hidden rounded-t-3xl">
            <div
              key={`progress-${currentIndex}-${announcements.length}`}
              className="h-full bg-emerald-500/50 dark:bg-emerald-400/60 animate-announcement-progress"
            />
          </div>
        )}
        {/* Subtle Decorative Ambient Background Glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full bg-emerald-400/10 blur-3xl dark:bg-emerald-500/5" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 size-80 rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-500/5" />

        {/* Top Floating Controls Bar */}
        <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
          {/* Eyebrow & Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-xs">
              <Sparkles className="size-3.5" />
              Live Announcement
            </span>

            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.color}`}
            >
              {meta.icon}
              <span>{meta.label}</span>
            </span>

            {current.pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-bold text-brand-blue">
                <Pin className="size-3" /> Pinned
              </span>
            )}

            <span className="hidden text-xs font-medium text-muted-foreground sm:inline-block">
              • For {audienceLabel}
            </span>
          </div>

          {/* Top Right: Counter & Dismiss */}
          <div className="flex items-center gap-1.5">
            {announcements.length > 1 && (
              <span className="text-xs font-semibold text-muted-foreground mr-1">
                {currentIndex + 1} of {announcements.length}
              </span>
            )}

            <button
              type="button"
              onClick={(e) => void handleDismiss(e, current.id)}
              aria-label={`Dismiss notice: ${current.title}`}
              className="size-7 grid place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
              title="Dismiss from dashboard"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Main Spacious Content: Left Details + Right Image Poster */}
        <div
          key={current.id}
          className="relative z-10 grid grid-cols-1 gap-6 items-center md:grid-cols-12 animate-in fade-in-50 duration-300"
        >
          {/* Left Column: Title, Metadata, Description & Action Button */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-between space-y-4">
            <div>
              <h2
                onClick={() => setSelectedAnnouncement(current)}
                className="cursor-pointer font-display text-2xl font-extrabold tracking-tight text-foreground transition-colors hover:text-emerald-700 dark:hover:text-emerald-400 sm:text-3xl lg:text-4xl leading-tight"
              >
                {current.title}
              </h2>

              {/* Event Date, Time, Venue Chips */}
              {(current.eventDate || current.eventTime || current.purpose) && (
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs sm:text-sm font-medium text-foreground/80">
                  {current.eventDate && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100/70 dark:bg-emerald-950/40 px-2.5 py-1 text-emerald-900 dark:text-emerald-300">
                      <Calendar className="size-3.5 text-emerald-600" />
                      <span>{current.eventDate}</span>
                    </div>
                  )}

                  {current.eventTime && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100/70 dark:bg-amber-950/40 px-2.5 py-1 text-amber-900 dark:text-amber-300">
                      <Clock className="size-3.5 text-amber-600" />
                      <span>{current.eventTime}</span>
                    </div>
                  )}

                  {current.purpose && (
                    <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-800 dark:text-slate-200">
                      <MapPin className="size-3.5 text-slate-500" />
                      <span className="line-clamp-1">{current.purpose}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Interactive Description */}
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground line-clamp-3">
                {current.message}
              </p>
            </div>

            {/* Bottom Actions Row: Explore / View Details CTA + Pagination Controls */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => setSelectedAnnouncement(current)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 shadow-sm transition-all duration-200 hover:shadow-md inline-flex items-center gap-2 group"
                >
                  <span>View Details</span>
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              {/* Carousel Pagination Dots & Chevrons */}
              {announcements.length > 1 && (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 mr-2">
                    {announcements.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentIndex(idx)}
                        aria-label={`Jump to announcement ${idx + 1}`}
                        className={`size-2.5 rounded-full transition-all duration-300 ${
                          idx === currentIndex
                            ? "w-6 bg-emerald-600"
                            : "bg-emerald-300/60 hover:bg-emerald-400 dark:bg-emerald-800"
                        }`}
                      />
                    ))}
                  </div>

                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-full border-border/80 text-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    onClick={handlePrev}
                    aria-label="Previous announcement"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 rounded-full border-border/80 text-foreground hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    onClick={handleNext}
                    aria-label="Next announcement"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: High-Impact Event Photo Banner */}
          <div className="md:col-span-5 lg:col-span-4">
            <div
              onClick={() => setSelectedAnnouncement(current)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-emerald-500/20 bg-muted/40 shadow-sm transition-all duration-300 hover:shadow-xl hover:border-emerald-500/40"
            >
              <img
                src={imageUrl}
                alt={current.title}
                className="h-48 sm:h-56 md:h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-end p-4">
                <span className="text-xs font-semibold text-white inline-flex items-center gap-1.5">
                  Click to view details <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details Modal */}
      {selectedAnnouncement && (
        <AnnouncementDetailsModal
          announcement={selectedAnnouncement}
          onClose={() => setSelectedAnnouncement(null)}
        />
      )}
    </>
  );
}
