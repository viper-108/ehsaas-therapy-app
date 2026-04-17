import { useState, useEffect } from "react";
import { Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { api } from "@/services/api";

interface ReviewListProps {
  therapistId: string;
}

const StarDisplay = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(star => (
      <Star
        key={star}
        className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`}
      />
    ))}
  </div>
);

export const ReviewList = ({ therapistId }: ReviewListProps) => {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (therapistId) {
      api.getTherapistReviews(therapistId)
        .then(setReviews)
        .catch(() => setReviews([]))
        .finally(() => setLoading(false));
    }
  }, [therapistId]);

  if (loading) return null;
  if (reviews.length === 0) return null;

  return (
    <div>
      <h2 className="font-semibold text-foreground mb-4">
        Client Reviews ({reviews.length})
      </h2>
      <div className="space-y-3">
        {reviews.map(review => (
          <Card key={review._id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium text-foreground text-sm">{review.clientId?.name || 'Anonymous'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <StarDisplay rating={review.rating} />
            </div>
            {review.comment && (
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};
