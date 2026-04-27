import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, XCircle } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface CancelSessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  sessionId: string;
  /** Display info about the session being cancelled */
  clientName?: string;
  sessionDate?: string;
  sessionTime?: string;
  paymentStatus?: 'unpaid' | 'paid' | 'refunded' | string;
}

const QUICK_REASONS = [
  'Personal emergency',
  'Health issue',
  'Schedule conflict',
  'Need to reschedule due to unforeseen circumstances',
];

export function CancelSessionDialog({ isOpen, onClose, onSuccess, sessionId, clientName, sessionDate, sessionTime, paymentStatus }: CancelSessionDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 5) {
      toast({ title: "Reason required", description: "Please provide a reason of at least 5 characters", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      await api.cancelSession(sessionId, reason);
      toast({
        title: "Session cancelled",
        description: paymentStatus === 'paid'
          ? `${clientName || 'Client'} has been emailed with a reschedule link. Their payment is preserved as credit.`
          : `${clientName || 'Client'} has been emailed with a reschedule link.`
      });
      onSuccess?.();
      onClose();
      setReason("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) { onClose(); setReason(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="w-5 h-5" /> Cancel Session?
          </DialogTitle>
          <DialogDescription>
            {clientName && <>Cancelling session with <strong>{clientName}</strong>{sessionDate && ` on ${sessionDate}`}{sessionTime && ` at ${sessionTime}`}.</>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-100">
              <p className="font-medium mb-1">Your client will receive an email immediately with:</p>
              <ul className="list-disc ml-4 space-y-0.5">
                <li>The reason you provide below</li>
                <li>A link to reschedule the session</li>
                {paymentStatus === 'paid' ? (
                  <li>Confirmation that their payment is preserved as credit (no need to pay again)</li>
                ) : (
                  <li>A note that they'll need to pay when rescheduling (no payment was made yet)</li>
                )}
              </ul>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Reason for cancellation <span className="text-destructive">*</span></Label>
            <p className="text-xs text-muted-foreground mb-2">This will be shared with the client. Please be honest and respectful.</p>
            <Textarea
              placeholder="e.g. Health issue requiring me to step away today..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={5}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">{reason.length}/500 characters (min 5)</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground w-full">Quick reasons:</span>
            {QUICK_REASONS.map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="text-xs px-2 py-1 rounded-full border border-border hover:bg-muted transition-colors"
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => { onClose(); setReason(""); }} className="flex-1">
            Keep Session
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting || reason.trim().length < 5} className="flex-1">
            {submitting ? 'Cancelling...' : 'Cancel & Notify Client'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
