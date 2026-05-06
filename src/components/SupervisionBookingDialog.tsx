import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Clock, Calendar, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Supervisor {
  id: string;
  name: string;
  title?: string;
  image?: string;
  individualPrice50?: number;
  individualPrice90?: number;
}

interface SupervisionBookingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  supervisor: Supervisor;
}

/**
 * Supervision request flow used when a THERAPIST (supervisee) wants to book
 * an individual supervision session with an approved supervisor.
 *
 * Distinct from BookingModal (which is for client → therapist sessions).
 *
 * Flow:
 *  1. Supervisee picks duration (50 or 90 min) + topic + preferred date/time.
 *  2. Submits via POST /api/supervision (admin then approves & schedules).
 *  3. Supervisee tracks status from their dashboard.
 */
export function SupervisionBookingDialog({ isOpen, onClose, supervisor }: SupervisionBookingDialogProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const supervisee = (user as any)?.superviseeProfile;
  const isApprovedSupervisee = !!supervisee?.isApproved;
  const hasApplied = !!supervisee?.isApplied;

  const has50 = (supervisor.individualPrice50 || 0) > 0;
  const has90 = (supervisor.individualPrice90 || 0) > 0;
  const defaultDuration = has50 ? 50 : has90 ? 90 : 50;

  const [duration, setDuration] = useState<50 | 90>(defaultDuration as 50 | 90);
  const [topic, setTopic] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const price = duration === 50 ? supervisor.individualPrice50 : supervisor.individualPrice90;

  const reset = () => {
    setTopic(""); setPreferredDate(""); setPreferredTime(""); setNotes("");
    setSubmitting(false); setSubmitted(false);
  };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!topic.trim()) return toast({ title: "Topic is required", description: "What would you like to discuss in supervision?", variant: "destructive" });
    setSubmitting(true);
    try {
      await api.createSupervision({
        type: 'individual',
        supervisorId: supervisor.id,
        topic: topic.trim() + (notes.trim() ? `\n\nNotes: ${notes.trim()}` : ''),
        preferredDate: preferredDate || undefined,
        preferredTime: preferredTime || undefined,
      });
      setSubmitted(true);
      toast({ title: "Request submitted", description: "Admin will review and schedule your supervision session." });
    } catch (e: any) {
      toast({ title: "Could not submit", description: e.message || 'Try again later', variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  // Not a therapist — wrong dialog
  if (role !== 'therapist') {
    return (
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader><DialogTitle>Supervision is for therapists</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Supervision is a service for licensed therapists and students-in-training, not for therapy clients.
            If you're looking for therapy, use the regular "Book Session" button on a therapist's profile.
          </p>
          <Button onClick={close}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Submitted state
  if (submitted) {
    return (
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="sm:max-w-md mx-4">
          <div className="text-center space-y-4 py-2">
            <div className="w-14 h-14 bg-success/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7 text-success" />
            </div>
            <h2 className="text-lg font-semibold">Supervision request submitted</h2>
            <p className="text-sm text-muted-foreground">
              Admin will review your request and schedule the session with <strong>{supervisor.name}</strong>.
              You'll get an email and calendar invite once it's confirmed.
            </p>
            <Button className="w-full" onClick={close}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Therapist but not yet approved as supervisee
  if (!isApprovedSupervisee) {
    return (
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              Apply for supervision first
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              To book supervision sessions, you first need to apply as a supervisee.
              Admin reviews each application before you can book.
            </p>
            {hasApplied ? (
              <Card className="p-3 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">Application pending</p>
                <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                  Your supervisee application is under admin review. We'll email you once it's decided.
                </p>
              </Card>
            ) : (
              <Button asChild className="w-full" onClick={close}>
                <Link to="/therapist-dashboard?tab=supervision">
                  <GraduationCap className="w-4 h-4 mr-2" /> Apply as supervisee
                </Link>
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={close}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Approved — booking form
  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="sm:max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Request Supervision
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supervisor info */}
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary overflow-hidden">
                {supervisor.image ? <img src={supervisor.image} alt="" className="w-full h-full object-cover" /> : (supervisor.name?.[0] || '?')}
              </div>
              <div>
                <p className="font-medium text-foreground">{supervisor.name}</p>
                {supervisor.title && <p className="text-sm text-muted-foreground">{supervisor.title}</p>}
                <Badge variant="outline" className="text-xs mt-1">Supervisor</Badge>
              </div>
            </div>
          </Card>

          {/* Duration */}
          {(has50 || has90) && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Choose Duration</Label>
              <div className="grid grid-cols-2 gap-2">
                {has50 && (
                  <Card
                    className={`p-3 cursor-pointer transition-all ${duration === 50 ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setDuration(50)}
                  >
                    <Clock className="w-4 h-4 text-primary mb-1" />
                    <div className="font-semibold">50 min</div>
                    <div className="text-primary font-bold">₹{supervisor.individualPrice50}</div>
                  </Card>
                )}
                {has90 && (
                  <Card
                    className={`p-3 cursor-pointer transition-all ${duration === 90 ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                    onClick={() => setDuration(90)}
                  >
                    <Clock className="w-4 h-4 text-primary mb-1" />
                    <div className="font-semibold">90 min</div>
                    <div className="text-primary font-bold">₹{supervisor.individualPrice90}</div>
                  </Card>
                )}
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm font-medium">Topic <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Working with trauma in adolescents"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-sm font-medium flex items-center gap-1"><Calendar className="w-3 h-3" /> Preferred date</Label>
              <Input type="date" min={today} value={preferredDate} onChange={e => setPreferredDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Preferred time</Label>
              <Input type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Anything else admin should know?</Label>
            <Textarea
              rows={3}
              placeholder="(Optional) Specific case context, urgency, etc."
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p><strong>How this works:</strong> Admin reviews & schedules supervision requests. Once confirmed, you and the supervisor get a calendar invite and meeting link.</p>
            {price ? <p>Indicative fee: <strong>₹{price}</strong> for {duration} minutes.</p> : null}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={close} disabled={submitting}>Cancel</Button>
            <Button className="flex-1" onClick={submit} disabled={submitting}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</> : 'Submit Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
