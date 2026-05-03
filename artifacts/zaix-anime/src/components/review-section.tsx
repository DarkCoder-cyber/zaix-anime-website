import { useState, useEffect, useCallback } from "react";
import { Star, Send, User, MessageSquare, Trash2, Flag, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAdmin, isAdminUsername } from "@/hooks/use-admin";
import { AdminCrown } from "@/components/admin-badge";

interface Review {
  id: number;
  contentType: string;
  contentId: string;
  userName: string;
  rating: number;
  reviewText: string | null;
  createdAt: string;
}

interface ReviewsData {
  reviews: Review[];
  averageRating: number | null;
  total: number;
}

const REPORT_REASONS = [
  "Inappropriate content",
  "Spoilers without warning",
  "Spam or advertisement",
  "Harassment or hate speech",
  "Misleading information",
  "Other",
];

function StarRating({ value, onChange, readonly = false, size = "md" }: {
  value: number; onChange?: (v: number) => void; readonly?: boolean; size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClass = size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-7 h-7" : "w-5 h-5";
  const active = hovered || value;
  return (
    <div className={`flex gap-0.5 ${readonly ? "" : "cursor-pointer"}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star}
          className={`${sizeClass} transition-colors ${star <= active ? "fill-primary text-primary" : "fill-none text-muted-foreground"}`}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          onClick={() => !readonly && onChange?.(star)}
        />
      ))}
    </div>
  );
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function ReportModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [reportedBy, setReportedBy] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: review.id,
          contentType: review.contentType,
          contentId: review.contentId,
          reportedUser: review.userName,
          reviewText: review.reviewText,
          reason,
          reportedBy: reportedBy.trim() || "Anonymous",
        }),
      });
      if (!res.ok) throw new Error();
      setDone(true);
      toast.success("Report submitted — admins will review it shortly.");
      setTimeout(onClose, 2000);
    } catch {
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm bg-black border border-red-500/30 rounded-2xl p-6 flex flex-col gap-4 shadow-[0_0_30px_rgba(255,50,50,0.2)]"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-bold text-white">Report Review</h3>
            <p className="text-xs text-muted-foreground">by {review.userName}</p>
          </div>
        </div>
        {review.reviewText && (
          <div className="bg-secondary/30 rounded-lg px-3 py-2 border border-border">
            <p className="text-xs text-muted-foreground italic line-clamp-2">"{review.reviewText}"</p>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Reason</label>
          <div className="relative">
            <select
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-white appearance-none focus:outline-none focus:border-primary/50"
            >
              {REPORT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold text-muted-foreground">Your Name (optional)</label>
          <input
            type="text"
            value={reportedBy}
            onChange={e => setReportedBy(e.target.value)}
            placeholder="Anonymous"
            maxLength={50}
            className="bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500/50"
          />
        </div>
        {done ? (
          <div className="text-center py-2 text-primary text-sm font-medium">✓ Report submitted!</div>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 border-border text-muted-foreground" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold" onClick={submit} disabled={submitting}>
              {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> : <Flag className="w-4 h-4 mr-2" />}
              Submit Report
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ReviewSection({ contentType, contentId, title }: {
  contentType: "anime" | "manga"; contentId: string; title?: string;
}) {
  const { authenticated, isBanned } = useAdmin();
  const [data, setData] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reportingReview, setReportingReview] = useState<Review | null>(null);
  const [userName, setUserName] = useState("");
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews/${contentType}/${contentId}`);
      if (!res.ok) throw new Error("Failed to load reviews");
      setData(await res.json());
    } catch {
      setData({ reviews: [], averageRating: null, total: 0 });
    } finally { setLoading(false); }
  }, [contentType, contentId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError("Please select a star rating."); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await fetch(`/api/reviews/${contentType}/${contentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: userName.trim() || "Anonymous", rating, reviewText: reviewText.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit review");
      }
      setSubmitted(true); setRating(0); setUserName(""); setReviewText("");
      await fetchReviews();
      setTimeout(() => setSubmitted(false), 4000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (review: Review) => {
    setDeletingId(review.id);
    try {
      const res = await fetch(`/api/reviews/${review.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setData(prev => prev ? { ...prev, reviews: prev.reviews.filter(r => r.id !== review.id), total: prev.total - 1 } : null);
      toast.success("Review deleted");
    } catch { toast.error("Could not delete review"); }
    finally { setDeletingId(null); }
  };

  const visibleReviews = (data?.reviews ?? []).filter(r => !isBanned(r.userName));

  return (
    <>
      {reportingReview && <ReportModal review={reportingReview} onClose={() => setReportingReview(null)} />}
      <section className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary shrink-0" />
            <h3 className="font-bold font-heading text-white">Community Reviews</h3>
            {!loading && data && data.total > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{data.total}</span>
            )}
          </div>
          {!loading && data?.averageRating != null && (
            <div className="flex items-center gap-2">
              <StarRating value={Math.round(data.averageRating)} readonly size="sm" />
              <span className="text-primary font-bold text-sm">{data.averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground text-xs">/ 5</span>
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col gap-6">
          <form onSubmit={handleSubmit} className="bg-background/50 border border-primary/20 rounded-xl p-4 flex flex-col gap-4">
            <h4 className="font-semibold text-white text-sm">Rate{title ? ` "${title}"` : " this"}</h4>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-muted-foreground">Your rating *</span>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Name (optional)</label>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Anonymous" maxLength={50}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Review (optional)</label>
              <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} placeholder="Share your thoughts..." maxLength={2000} rows={3}
                className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 resize-none transition-colors" />
            </div>
            {error && <p className="text-red-400 text-xs">{error}</p>}
            {submitted && <p className="text-primary text-xs font-medium">✓ Review submitted! Thank you.</p>}
            <Button type="submit" disabled={submitting || rating === 0}
              className="bg-primary text-black hover:bg-primary/90 shadow-neon font-bold w-fit gap-2 disabled:opacity-50">
              <Send className="w-4 h-4" />
              {submitting ? "Submitting…" : "Submit Review"}
            </Button>
          </form>

          {loading ? (
            <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="flex flex-col gap-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-16 w-full" /></div>)}</div>
          ) : visibleReviews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="w-8 h-8 mx-auto mb-3 text-primary/20" />
              <p className="text-sm">No reviews yet. Be the first!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {visibleReviews.map((review) => {
                const isAdmin = isAdminUsername(review.userName);
                return (
                  <div key={review.id}
                    className={`border rounded-xl p-4 flex flex-col gap-2 hover:border-primary/30 transition-colors ${isAdmin ? "border-yellow-500/30 bg-yellow-500/5" : "border-border"}`}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isAdmin ? "bg-yellow-500/20 border border-yellow-500/40" : "bg-primary/10 border border-primary/20"}`}>
                          {isAdmin ? <AdminCrown size="xs" /> : <User className="w-3.5 h-3.5 text-primary" />}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm" style={isAdmin ? { color: "#FFD700" } : { color: "white" }}>
                            {review.userName}
                          </span>
                          {isAdmin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.4)", color: "#FFD700" }}>
                              ADMIN
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StarRating value={review.rating} readonly size="sm" />
                        <span className="text-xs text-muted-foreground">{timeAgo(review.createdAt)}</span>
                        {!isAdmin && (
                          <button
                            onClick={() => setReportingReview(review)}
                            className="text-muted-foreground/40 hover:text-orange-400 transition-colors"
                            title="Report this review"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {authenticated && (
                          <button onClick={() => handleDelete(review)} disabled={deletingId === review.id}
                            className="text-red-400/60 hover:text-red-400 transition-colors disabled:opacity-40" title="Delete review (Admin)">
                            {deletingId === review.id
                              ? <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                              : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                    {review.reviewText && (
                      <p className="text-sm text-muted-foreground leading-relaxed pl-9">{review.reviewText}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
