import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, Calendar, ExternalLink, Clock, Loader2, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { formatDateTimeIst, formatDateIst, todayIstISO } from "@/lib/dateIst";

/**
 * Therapist's "Calls & Interviews" tab. Shows two lists:
 *
 * 1. Intro Calls — clients requesting a discovery call. Therapist can
 *    Accept / Decline / Mark complete / Reschedule (propose a new time
 *    that's auto-applied + emailed to the client).
 * 2. Interviews — admin-scheduled interviews (initial onboarding). The
 *    therapist can request a reschedule, which goes to admin for
 *    approval. Status of any pending reschedule proposal is shown.
 *
 * Replaces the previous read-only intro-calls panel and surfaces the
 * existing InterviewSchedule data which had no UI before.
 */
export function CallsInterviewsTab() {
  const { toast } = useToast();
  const [introCalls, setIntroCalls] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Reschedule dialog state — used for both intro-calls and interviews
  const [reschedule, setReschedule] = useState<{
    type: 'intro' | 'interview';
    id: string;
    label: string;
    currentTime: string;
  } | null>(null);
  const [reDate, setReDate] = useState('');
  const [reTime, setReTime] = useState('');
  const [reReason, setReReason] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [calls, ivs] = await Promise.all([
        api.getTherapistIntroCalls().catch(() => []),
        api.getMyInterviews().catch(() => []),
      ]);
      setIntroCalls(Array.isArray(calls) ? calls : []);
      setInterviews(Array.isArray(ivs) ? ivs : []);
    } catch (e: any) {
      toast({ title: "Could not load", description: e.message || 'Try again later', variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const updateCallStatus = async (id: string, status: 'approved' | 'rejected' | 'completed') => {
    setBusyId(id);
    try {
      await api.updateIntroCallStatus(id, status);
      toast({ title: "Updated" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const submitReschedule = async () => {
    if (!reschedule) return;
    if (!reDate || !reTime) {
      toast({ title: "Pick a date and time", variant: "destructive" });
      return;
    }
    setBusyId(reschedule.id);
    try {
      if (reschedule.type === 'intro') {
        const iso = `${reDate}T${reTime}:00`;
        await api.rescheduleIntroCall(reschedule.id, iso);
        toast({ title: "Intro call rescheduled", description: "The client has been emailed the new time." });
      } else {
        await api.requestInterviewReschedule(reschedule.id, {
          proposedDate: reDate,
          proposedTime: reTime,
          reason: reReason,
        });
        toast({ title: "Reschedule requested", description: "Admin will review your proposal and confirm." });
      }
      setReschedule(null);
      setReDate(''); setReTime(''); setReReason('');
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setBusyId(null); }
  };

  const introBadge = (status: string) => {
    const base = "text-xs";
    switch (status) {
      case 'pending':   return <Badge className={`${base} bg-amber-500/10 text-amber-700 dark:text-amber-300`}>Pending</Badge>;
      case 'approved':  return <Badge className={`${base} bg-success/10 text-success`}>Approved</Badge>;
      case 'rejected':  return <Badge className={`${base} bg-destructive/10 text-destructive`}>Declined</Badge>;
      case 'completed': return <Badge className={`${base} bg-primary/10 text-primary`}>Completed</Badge>;
      default:          return <Badge className={base} variant="outline">{status}</Badge>;
    }
  };

  const interviewBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return <Badge className="text-xs bg-primary/10 text-primary">Scheduled</Badge>;
      case 'completed': return <Badge className="text-xs bg-success/10 text-success">Completed</Badge>;
      case 'cancelled': return <Badge className="text-xs bg-destructive/10 text-destructive">Cancelled</Badge>;
      default:          return <Badge className="text-xs" variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></Card>;
  }

  return (
    <div className="space-y-6">
      {/* INTRO CALLS */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Intro Call Requests</h3>
          <Badge variant="outline" className="ml-auto">{introCalls.length}</Badge>
        </div>
        {introCalls.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No intro call requests yet.</p>
        ) : (
          <div className="space-y-3">
            {introCalls.map((c: any) => {
              const canAct = c.status === 'pending' || c.status === 'approved';
              return (
                <div key={c._id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                    <div>
                      <p className="font-medium text-foreground">{c.clientName} {introBadge(c.status)}</p>
                      <p className="text-xs text-muted-foreground">{c.email} · {c.phone}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-1"><strong>Preferred:</strong> {formatDateTimeIst(c.preferredDateTime)}</p>
                  {c.reasonForTherapy && <p className="text-xs text-muted-foreground mb-1"><strong>Reason:</strong> {c.reasonForTherapy}</p>}
                  {c.whatLookingFor && <p className="text-xs text-muted-foreground mb-2"><strong>Looking for:</strong> {c.whatLookingFor}</p>}
                  {canAct && (
                    <div className="flex gap-2 flex-wrap pt-2 border-t">
                      {c.status === 'pending' && (
                        <>
                          <Button size="sm" disabled={busyId === c._id} onClick={() => updateCallStatus(c._id, 'approved')}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" disabled={busyId === c._id} onClick={() => updateCallStatus(c._id, 'rejected')}>
                            <XCircle className="w-3 h-3 mr-1" /> Decline
                          </Button>
                        </>
                      )}
                      {c.status === 'approved' && (
                        <Button size="sm" variant="outline" disabled={busyId === c._id} onClick={() => updateCallStatus(c._id, 'completed')}>
                          Mark complete
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === c._id}
                        onClick={() => {
                          setReschedule({ type: 'intro', id: c._id, label: c.clientName, currentTime: formatDateTimeIst(c.preferredDateTime) });
                          // Pre-fill with the existing date/time so therapist can tweak
                          const d = new Date(c.preferredDateTime);
                          if (!Number.isNaN(d.getTime())) {
                            setReDate(d.toISOString().split('T')[0]);
                            setReTime(d.toTimeString().slice(0, 5));
                          }
                        }}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Reschedule
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* INTERVIEWS */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Onboarding Interviews</h3>
          <Badge variant="outline" className="ml-auto">{interviews.length}</Badge>
        </div>
        {interviews.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No interviews scheduled.</p>
        ) : (
          <div className="space-y-3">
            {interviews.map((iv: any) => (
              <div key={iv._id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <div>
                    <p className="font-medium text-foreground flex items-center gap-2 flex-wrap">
                      Interview with admin {interviewBadge(iv.status)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateIst(iv.scheduledDate)} · {iv.scheduledTime} IST
                    </p>
                  </div>
                  {iv.meetingLink && (
                    <Button size="sm" variant="outline" asChild>
                      <a href={iv.meetingLink} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" /> Join
                      </a>
                    </Button>
                  )}
                </div>
                {iv.notes && <p className="text-xs text-muted-foreground mb-2"><strong>Notes:</strong> {iv.notes}</p>}

                {iv.rescheduleRequestedAt && iv.rescheduleProposedDate ? (
                  <div className="text-xs p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Reschedule requested: <strong>{formatDateIst(iv.rescheduleProposedDate)} · {iv.rescheduleProposedTime} IST</strong> — awaiting admin decision.
                    {iv.rescheduleReason && <p className="mt-1 italic">Reason: {iv.rescheduleReason}</p>}
                  </div>
                ) : iv.status === 'scheduled' && (
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === iv._id}
                      onClick={() => {
                        setReschedule({ type: 'interview', id: iv._id, label: 'Interview', currentTime: `${formatDateIst(iv.scheduledDate)} · ${iv.scheduledTime} IST` });
                        const d = new Date(iv.scheduledDate);
                        if (!Number.isNaN(d.getTime())) {
                          setReDate(d.toISOString().split('T')[0]);
                          setReTime(iv.scheduledTime || '10:00');
                        }
                      }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Request reschedule
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Reschedule dialog */}
      <Dialog open={!!reschedule} onOpenChange={(o) => { if (!o) { setReschedule(null); setReDate(''); setReTime(''); setReReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {reschedule?.type === 'intro' ? `Reschedule intro call with ${reschedule?.label}` : 'Request interview reschedule'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Currently: <strong>{reschedule?.currentTime}</strong></p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">New date <span className="text-destructive">*</span></Label>
                <Input required type="date" min={todayIstISO()} value={reDate} onChange={e => setReDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">New time (IST) <span className="text-destructive">*</span></Label>
                <Input required type="time" value={reTime} onChange={e => setReTime(e.target.value)} />
              </div>
            </div>
            {reschedule?.type === 'interview' && (
              <div>
                <Label className="text-xs">Reason (admin will see this)</Label>
                <Textarea rows={2} value={reReason} onChange={e => setReReason(e.target.value)} placeholder="Why you need to move it" />
              </div>
            )}
            <p className="text-[11px] text-muted-foreground">
              {reschedule?.type === 'intro'
                ? 'The client will be emailed the new time immediately.'
                : 'Admin must approve this proposal before the interview moves.'}
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setReschedule(null)}>Cancel</Button>
              <Button className="flex-1" onClick={submitReschedule} disabled={busyId === reschedule?.id || !reDate || !reTime}>
                {busyId === reschedule?.id ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
