import { useState } from "react";
import { Clock, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface WaitlistButtonProps {
  therapistId: string;
  date: string;
  therapistName: string;
}

export const WaitlistButton = ({ therapistId, date, therapistName }: WaitlistButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      await api.joinWaitlist(therapistId, date);
      setJoined(true);
      toast({ title: "Joined Waitlist", description: `You'll be notified when a slot opens with ${therapistName}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (joined) {
    return (
      <div className="flex items-center gap-2 p-3 bg-success/10 rounded-lg text-sm text-success">
        <CheckCircle className="w-4 h-4" />
        On waitlist — you'll be notified when a slot opens
      </div>
    );
  }

  return (
    <div className="text-center p-3 bg-muted/30 rounded-lg">
      <p className="text-sm text-muted-foreground mb-2">No slots available on this date</p>
      <Button variant="outline" size="sm" onClick={handleJoin} disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Clock className="w-4 h-4 mr-2" />}
        Join Waitlist
      </Button>
    </div>
  );
};
