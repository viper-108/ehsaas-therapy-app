import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface ReviewFormProps {
  sessionId: string;
  therapistName: string;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

export const ReviewForm = ({ sessionId, therapistName, isOpen, onClose, onReviewSubmitted }: ReviewFormProps) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api.createReview(sessionId, rating, comment);
      toast({ title: "Review submitted!", description: "Thank you for your feedback" });
      onReviewSubmitted?.();
      onClose();
      setRating(0);
      setComment('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Session with {therapistName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Rating</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${star <= displayRating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                  />
                </button>
              ))}
              {displayRating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground self-center">
                  {displayRating === 1 ? 'Poor' : displayRating === 2 ? 'Fair' : displayRating === 3 ? 'Good' : displayRating === 4 ? 'Very Good' : 'Excellent'}
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Your Review (optional)</p>
            <Textarea
              placeholder="Share your experience..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={4}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading || rating === 0}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
