import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Clock, Calendar, Loader2, AlertCircle, CreditCard } from "lucide-react";
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
 * Supervision booking flow used when an admin-approved supervisee (therapist)
 * wants to book a paid individual supervision session with an approved supervisor.
 *
 * Flow:
 *   1. Pick duration (50 / 90 min) — price comes from supervisor.supervisorProfile
 *   2. Pick date → fetch available slots from supervisor's calendar
 *   3. Pick a slot, enter topic
 *   4. Click "Pay & Book" → backend creates SupervisionSession + Payment, returns
 *      PhonePe checkout URL → redirect.
 *   5. After payment, confirm-payment endpoint flips status → 'scheduled' and
 *      sends ICS to both parties.
 *
 * If the user is a therapist who hasn't yet been approved as a supervisee,
 * the dialog gates them with a link to apply.
 */
export function SupervisionBookingDialog({ isOpen, onClose, supervisor }: SupervisionBookingDialogProps) {
  const { user, role } = useAuth();
  const { toast } = useToast();

  const supervisee = (user as any)?.superviseeProfile;
  const isApprovedSupervisee = !!supervisee?.isApproved;
  const hasApplied = !!supervisee?.isApplied;

  const has50 = (supervisor.individualPrice50 || 0) > 0;
  const has90 = (supervisor.individualPrice90 || 0) > 0;
  const defaultDuration: 50 | 90 = has50 ? 50 : has90 ? 90 : 50;

  const [duration, setDuration] = useState<50 | 90>(defaultDuration);
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const price = duration === 50 ? supervisor.individualPrice50 : supervisor.individualPrice90;

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setTopic(""); setDate(""); setTime("");
      setSlots([]); setSubmitting(false); setLoadingSlots(false);
      setDuration(defaultDuration);
    }
  }, [isOpen, defaultDuration]);

  // Fetch slots when date or supervisor changes
  useEffect(() => {
    if (!isOpen || !date || !isApprovedSupervisee) return;
    setLoadingSlots(true);
    setTime('');
    api.getSupervisionSlots(supervisor.id, date)
      .then(d => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [date, supervisor.id, isOpen, isApprovedSupervisee]);

  const submit = async () => {
    if (!topic.trim()) return toast({ title: "Topic is required", description: "What would you like to discuss?", variant: "destructive" });
    if (!date) return toast({ title: "Pick a date", variant: "destructive" });
    if (!time) return toast({ title: "Pick a time slot", variant: "destructive" });
    setSubmitting(true);
    try {
      const result = await api.bookIndividualSupervision({
        supervisorId: supervisor.id,
        date, startTime: time, duration, topic: topic.trim(),
      });
      if (result?.url) {
        // Redirect to PhonePe checkout — payment confirms the booking
        window.location.href = result.url;
        return;
      }
      toast({ title: "Could not start payment", description: "Please try again.", variant: "destructive" });
      setSubmitting(false);
    } catch (e: any) {
      toast({ title: "Booking failed", description: e.message || 'Try again later', variant: "destructive" });
      setSubmitting(false);
    }
  };

  // ── Wrong role ───────────────────────────────────────────────────────────
  if (role !== 'therapist') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader><DialogTitle>Supervision is for therapists</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Supervision is a service for licensed therapists and students-in-training, not for therapy clients.
            If you're looking for therapy, use the regular "Book Session" button on a therapist's profile.
          </p>
          <Button onClick={onClose}>Close</Button>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Approval gate ────────────────────────────────────────────────────────
  if (!isApprovedSupervisee) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
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
              <Button asChild className="w-full" onClick={onClose}>
                <Link to="/therapist-dashboard?tab=supervision">
                  <GraduationCap className="w-4 h-4 mr-2" /> Apply as supervisee
                </Link>
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Approved booking form ────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            Book Supervision
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Supervisor card */}
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

          {/* Topic */}
          <div>
            <Label className="text-sm font-medium">Topic <span className="text-destructive">*</span></Label>
            <Input
              placeholder="e.g. Working with trauma in adolescents"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Date */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Date <span className="text-destructive">*</span>
            </Label>
            <Input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          {/* Time slots */}
          {date && (
            <div>
              <Label className="text-sm font-medium flex items-center gap-1 mb-2">
                <Clock className="w-3 h-3" /> Available times <span className="text-destructive">*</span>
              </Label>
              {loadingSlots ? (
                <div className="text-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                </div>
              ) : slots.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No available slots on this date. Try another day.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map(s => (
                    <Button
                      key={s.time}
                      variant={time === s.time ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTime(s.time)}
                    >
                      {s.time}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {time && price ? (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-primary text-lg">₹{price}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {duration} min on {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} at {time}
              </p>
            </Card>
          ) : null}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button className="flex-1" onClick={submit} disabled={submitting || !time || !topic.trim()}>
              {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting…</> : <><CreditCard className="w-4 h-4 mr-2" /> Pay & Book</>}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            You'll be redirected to PhonePe to complete payment. The session is confirmed once payment succeeds.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
