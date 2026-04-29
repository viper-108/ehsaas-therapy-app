import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Plus, X } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateWorkshopDialog({ isOpen, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', topic: '', subtopics: '', description: '',
    durationMinutes: '90',
    learningOutcomes: ['', '', '', '', '', ''],
    targetAudience: '', contraindications: '', planProcedure: '',
    mode: 'online' as 'online' | 'in-person' | 'hybrid',
    language: 'English',
    pricePerParticipant: '',
    capacity: '',
    certificateProvided: true,
    brochureUrl: '',
    sessionDates: [''], // up to 3 typically
  });

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setForm({
      title: '', topic: '', subtopics: '', description: '',
      durationMinutes: '90',
      learningOutcomes: ['', '', '', '', '', ''],
      targetAudience: '', contraindications: '', planProcedure: '',
      mode: 'online', language: 'English',
      pricePerParticipant: '', capacity: '',
      certificateProvided: true,
      brochureUrl: '',
      sessionDates: [''],
    });
  }, [isOpen]);

  const addSession = () => setForm(p => ({ ...p, sessionDates: [...p.sessionDates, ''] }));
  const removeSession = (i: number) => setForm(p => ({ ...p, sessionDates: p.sessionDates.filter((_, idx) => idx !== i) }));
  const setSession = (i: number, v: string) => setForm(p => ({ ...p, sessionDates: p.sessionDates.map((d, idx) => idx === i ? v : d) }));

  const setLO = (i: number, v: string) => setForm(p => ({ ...p, learningOutcomes: p.learningOutcomes.map((lo, idx) => idx === i ? v : lo) }));

  const handleSubmit = async () => {
    if (!form.title || !form.topic || !form.pricePerParticipant) return toast({ title: "Required fields missing", variant: "destructive" });
    const sessionDates = form.sessionDates.filter(Boolean).map(d => new Date(d).toISOString());
    if (sessionDates.length === 0) return toast({ title: "Add at least one session date", variant: "destructive" });
    const learningOutcomes = form.learningOutcomes.map(s => s.trim()).filter(Boolean);

    setSubmitting(true);
    try {
      await api.requestWorkshop({
        title: form.title.trim(),
        topic: form.topic.trim(),
        subtopics: form.subtopics.split(',').map(s => s.trim()).filter(Boolean),
        description: form.description,
        sessionDates,
        durationMinutes: Number(form.durationMinutes) || 90,
        learningOutcomes,
        targetAudience: form.targetAudience,
        contraindications: form.contraindications,
        planProcedure: form.planProcedure,
        mode: form.mode,
        language: form.language,
        pricePerParticipant: Number(form.pricePerParticipant),
        capacity: form.capacity ? Number(form.capacity) : null,
        certificateProvided: form.certificateProvided,
        brochureUrl: form.brochureUrl,
      });
      toast({ title: "Workshop request submitted", description: "Admin will review and approve. You'll be notified by email." });
      onCreated?.();
      onClose();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> Request New Workshop
            <span className="text-xs text-muted-foreground font-normal ml-auto">Step {step} of 2</span>
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Workshop Title *</Label>
              <Input placeholder="e.g. Introduction to Mindful Self-Compassion" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>Topic *</Label>
              <Input placeholder="Self-compassion / Boundaries / Emotional regulation..." value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} />
            </div>
            <div>
              <Label>Subtopics (comma-separated)</Label>
              <Input placeholder="Loving-kindness, body scan, working with critic..." value={form.subtopics} onChange={e => setForm(p => ({ ...p, subtopics: e.target.value }))} />
            </div>
            <div>
              <Label>Short Description</Label>
              <Textarea rows={2} placeholder="Quick teaser for the public workshop card" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div>
              <Label>Learning Outcomes (5-6 bullet points)</Label>
              <p className="text-xs text-muted-foreground mb-2">What will participants walk away with?</p>
              <div className="space-y-2">
                {form.learningOutcomes.map((lo, i) => (
                  <Input key={i} placeholder={`Outcome ${i + 1}`} value={lo} onChange={e => setLO(i, e.target.value)} />
                ))}
              </div>
            </div>

            <div>
              <Label>Target Audience (skill level, age, gender)</Label>
              <Textarea rows={2} placeholder="e.g. Beginners 18+. Any gender. No prior therapy/meditation experience required." value={form.targetAudience} onChange={e => setForm(p => ({ ...p, targetAudience: e.target.value }))} />
            </div>

            <div>
              <Label>Contraindications (optional — who is this NOT for?)</Label>
              <Textarea rows={2} value={form.contraindications} onChange={e => setForm(p => ({ ...p, contraindications: e.target.value }))} />
            </div>

            <div>
              <Label>Plan & Procedure (with rationale)</Label>
              <Textarea rows={5} placeholder="Session 1 (90 min):&#10;- Welcome & intentions (10 min)&#10;- Theory: ... (rationale: ...)&#10;- Practice: ... (rationale: ...)&#10;..." value={form.planProcedure} onChange={e => setForm(p => ({ ...p, planProcedure: e.target.value }))} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!form.title || !form.topic} className="flex-1">Next: Logistics</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <Label>Session Date(s) *</Label>
              <p className="text-xs text-muted-foreground mb-2">Workshops are short — usually 1-3 sessions.</p>
              <div className="space-y-2">
                {form.sessionDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input type="datetime-local" value={d} onChange={e => setSession(i, e.target.value)} className="flex-1" />
                    {form.sessionDates.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeSession(i)}><X className="w-3 h-3" /></Button>
                    )}
                  </div>
                ))}
              </div>
              {form.sessionDates.length < 5 && (
                <Button size="sm" variant="outline" onClick={addSession} className="mt-2">
                  <Plus className="w-3 h-3 mr-1" /> Add another session
                </Button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Duration / session (min)</Label>
                <Input type="number" value={form.durationMinutes} onChange={e => setForm(p => ({ ...p, durationMinutes: e.target.value }))} />
              </div>
              <div>
                <Label>Mode</Label>
                <Select value={form.mode} onValueChange={(v: any) => setForm(p => ({ ...p, mode: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="in-person">In-person</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language</Label>
                <Input value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price per participant (₹) *</Label>
                <Input type="number" placeholder="500" value={form.pricePerParticipant} onChange={e => setForm(p => ({ ...p, pricePerParticipant: e.target.value }))} />
              </div>
              <div>
                <Label>Capacity (optional)</Label>
                <Input type="number" placeholder="Unlimited" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} />
              </div>
            </div>

            <label className="flex items-center gap-2 p-3 border rounded">
              <Checkbox checked={form.certificateProvided} onCheckedChange={(v) => setForm(p => ({ ...p, certificateProvided: v === true }))} />
              <span className="text-sm">Provide certificate of completion to attendees</span>
            </label>

            <div>
              <Label>Brochure Image URL (optional)</Label>
              <Input placeholder="https://... (Insta post / promo image)" value={form.brochureUrl} onChange={e => setForm(p => ({ ...p, brochureUrl: e.target.value }))} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.pricePerParticipant} className="flex-1">
                {submitting ? 'Submitting...' : 'Submit for Admin Approval'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
