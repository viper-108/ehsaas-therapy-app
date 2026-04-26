import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export function EhsaasReviewCard() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating < 1) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.createEhsaasReview(rating, comment);
      setSubmitted(true);
      toast({ title: "Thank you!", description: "Your review will be visible after admin approval." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (submitted) {
    return (
      <Card className="p-6 text-center bg-primary/5 border-primary/30">
        <Star className="w-8 h-8 mx-auto text-primary mb-2" />
        <h3 className="font-semibold text-foreground">Thank you for your feedback!</h3>
        <p className="text-sm text-muted-foreground">Your review will be published once approved by our team.</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-foreground mb-1">Rate Your Experience with Ehsaas</h3>
      <p className="text-sm text-muted-foreground mb-4">Share your thoughts about the platform overall — the booking experience, therapists, support, etc.</p>
      <div className="flex gap-1 mb-4">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)}>
            <Star className={`w-8 h-8 transition-colors ${(hover || rating) >= n ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
          </button>
        ))}
      </div>
      <Textarea
        placeholder="Tell us about your experience (optional)..."
        rows={3}
        value={comment}
        onChange={e => setComment(e.target.value)}
        className="mb-3"
      />
      <Button onClick={handleSubmit} disabled={submitting || rating < 1}>
        <Send className="w-4 h-4 mr-2" /> {submitting ? 'Submitting...' : 'Submit Review'}
      </Button>
    </Card>
  );
}
