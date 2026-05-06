import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Heart, Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function CouplesSessionNotesDialog({ sessionId, isOpen, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [meta, setMeta] = useState<{ sessionDate: string; clientName: string; partnerName: string }>({ sessionDate: '', clientName: '', partnerName: '' });
  const [notes, setNotes] = useState({
    presentingConcernPartnerA: '',
    presentingConcernPartnerB: '',
    relationshipPattern: '',
    emotionalUndercurrentsA: '',
    emotionalUndercurrentsB: '',
    attachmentDynamics: '',
    communicationStyle: '',
    strengthsProtectiveFactors: '',
    interventionsUsed: '',
    sessionOutcome: '',
    actionPlanBetweenSessions: '',
  });

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    setLoading(true);
    api.getCouplesSessionNotes(sessionId)
      .then((data) => {
        setMeta({
          sessionDate: data.sessionDate || '',
          clientName: data.clientName || 'Partner A',
          partnerName: data.partnerName || 'Partner B',
        });
        if (data.couplesNotes) setNotes(p => ({ ...p, ...data.couplesNotes }));
      })
      .catch((e) => toast({ title: "Error", description: e.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [isOpen, sessionId]);

  const set = (k: string, v: string) => setNotes(p => ({ ...p, [k]: v }));

  const submit = async () => {
    const filled = Object.values(notes).some(v => typeof v === 'string' && v.trim());
    if (!filled) return toast({ title: "Fill at least one field", variant: "destructive" });
    setSubmitting(true);
    try {
      await api.saveCouplesSessionNotes(sessionId, notes);
      toast({ title: "Couples notes saved" });
      onSaved?.();
      onClose();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const partnerA = meta.clientName || 'Partner A';
  const partnerB = meta.partnerName || 'Partner B';

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary" /> Couples Session Notes
            {meta.sessionDate && <span className="text-xs text-muted-foreground font-normal ml-auto">{new Date(meta.sessionDate).toLocaleDateString('en-IN')}</span>}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Presenting Concern — {partnerA}</Label>
              <Textarea rows={2} value={notes.presentingConcernPartnerA} onChange={e => set('presentingConcernPartnerA', e.target.value)} />
            </div>
            <div>
              <Label>Presenting Concern — {partnerB}</Label>
              <Textarea rows={2} value={notes.presentingConcernPartnerB} onChange={e => set('presentingConcernPartnerB', e.target.value)} />
            </div>
            <div>
              <Label>Relationship Pattern / Cycle Identified</Label>
              <p className="text-[11px] text-muted-foreground mb-1">trigger → behavior → partner response → reinforcement loop</p>
              <Textarea rows={3} value={notes.relationshipPattern} onChange={e => set('relationshipPattern', e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Emotional Undercurrents — {partnerA}</Label>
                <p className="text-[11px] text-muted-foreground mb-1">primary vs secondary emotions</p>
                <Textarea rows={2} value={notes.emotionalUndercurrentsA} onChange={e => set('emotionalUndercurrentsA', e.target.value)} />
              </div>
              <div>
                <Label>Emotional Undercurrents — {partnerB}</Label>
                <p className="text-[11px] text-muted-foreground mb-1">primary vs secondary emotions</p>
                <Textarea rows={2} value={notes.emotionalUndercurrentsB} onChange={e => set('emotionalUndercurrentsB', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Attachment Dynamics</Label>
              <p className="text-[11px] text-muted-foreground mb-1">pursuer–withdrawer, anxious–avoidant patterns, etc.</p>
              <Textarea rows={2} value={notes.attachmentDynamics} onChange={e => set('attachmentDynamics', e.target.value)} />
            </div>
            <div>
              <Label>Communication Style Observed</Label>
              <p className="text-[11px] text-muted-foreground mb-1">criticism, defensiveness, stonewalling, repair attempts</p>
              <Textarea rows={2} value={notes.communicationStyle} onChange={e => set('communicationStyle', e.target.value)} />
            </div>
            <div>
              <Label>Strengths & Protective Factors</Label>
              <p className="text-[11px] text-muted-foreground mb-1">shared values, past repair ability, commitment level</p>
              <Textarea rows={2} value={notes.strengthsProtectiveFactors} onChange={e => set('strengthsProtectiveFactors', e.target.value)} />
            </div>
            <div>
              <Label>Interventions Used</Label>
              <p className="text-[11px] text-muted-foreground mb-1">reframing, enactment, validation, boundary setting</p>
              <Textarea rows={2} value={notes.interventionsUsed} onChange={e => set('interventionsUsed', e.target.value)} />
            </div>
            <div>
              <Label>Session Outcome / Movement</Label>
              <p className="text-[11px] text-muted-foreground mb-1">insight gained, de-escalation, partial repair, stuckness</p>
              <Textarea rows={2} value={notes.sessionOutcome} onChange={e => set('sessionOutcome', e.target.value)} />
            </div>
            <div>
              <Label>Action Plan / Between-Session Task</Label>
              <p className="text-[11px] text-muted-foreground mb-1">structured dialogue, time-outs, appreciation exercises</p>
              <Textarea rows={3} value={notes.actionPlanBetweenSessions} onChange={e => set('actionPlanBetweenSessions', e.target.value)} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={submit} disabled={submitting} className="flex-1">{submitting ? 'Saving...' : 'Save Notes'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
