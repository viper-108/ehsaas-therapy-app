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

interface Props { isOpen: boolean; onClose: () => void; onCreated?: () => void; }

export function CreateTrainingDialog({ isOpen, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '', about: '', outcomes: '', targetAudience: '',
    syllabus: '', syllabusBrochureUrl: '',
    coFacilitators: [] as { name: string; credentials: string; experience: string }[],
    startDate: '', endDate: '', totalDurationHours: '',
    sessionTime: '', frequency: '', totalSessions: '6', durationMinutes: '90',
    facilitatorCommitmentHours: '', traineeCommitmentHours: '',
    language: 'English', mode: 'online' as 'online' | 'in-person' | 'hybrid',
    pricePerTrainee: '', capacity: '', certificateProvided: true,
  });

  useEffect(() => { if (isOpen) setStep(1); }, [isOpen]);

  const addFac = () => setForm(p => ({ ...p, coFacilitators: [...p.coFacilitators, { name: '', credentials: '', experience: '' }] }));
  const removeFac = (i: number) => setForm(p => ({ ...p, coFacilitators: p.coFacilitators.filter((_, idx) => idx !== i) }));
  const setFac = (i: number, key: string, v: string) => setForm(p => ({ ...p, coFacilitators: p.coFacilitators.map((f, idx) => idx === i ? { ...f, [key]: v } : f) }));

  const handleSubmit = async () => {
    if (!form.title || !form.startDate || !form.pricePerTrainee) return toast({ title: "Required fields missing", variant: "destructive" });
    setSubmitting(true);
    try {
      await api.requestTraining({
        title: form.title.trim(),
        about: form.about, outcomes: form.outcomes, targetAudience: form.targetAudience,
        syllabus: form.syllabus, syllabusBrochureUrl: form.syllabusBrochureUrl,
        facilitators: form.coFacilitators.filter(f => f.name?.trim()),
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        totalDurationHours: Number(form.totalDurationHours) || 0,
        sessionTime: form.sessionTime, frequency: form.frequency,
        totalSessions: Number(form.totalSessions) || 1,
        durationMinutes: Number(form.durationMinutes) || 90,
        facilitatorCommitmentHours: Number(form.facilitatorCommitmentHours) || 0,
        traineeCommitmentHours: Number(form.traineeCommitmentHours) || 0,
        language: form.language, mode: form.mode,
        pricePerTrainee: Number(form.pricePerTrainee),
        capacity: form.capacity ? Number(form.capacity) : null,
        certificateProvided: form.certificateProvided,
      });
      toast({ title: "Training submitted", description: "Admin will review and notify you by email." });
      onCreated?.(); onClose();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" /> Request Training Program
            <span className="text-xs text-muted-foreground font-normal ml-auto">Step {step} of 3</span>
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input placeholder="e.g. Foundations of Cognitive Behavioral Therapy" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>About</Label>
              <Textarea rows={3} placeholder="Description that will appear on the discovery page" value={form.about} onChange={e => setForm(p => ({ ...p, about: e.target.value }))} />
            </div>
            <div>
              <Label>Outcomes / Goals</Label>
              <Textarea rows={3} placeholder="What will trainees walk away with?" value={form.outcomes} onChange={e => setForm(p => ({ ...p, outcomes: e.target.value }))} />
            </div>
            <div>
              <Label>Who is it for? (Target audience)</Label>
              <Textarea rows={2} placeholder="Skill level, prerequisites, professional background..." value={form.targetAudience} onChange={e => setForm(p => ({ ...p, targetAudience: e.target.value }))} />
            </div>
            <div>
              <Label>Co-facilitators (optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">You're auto-added as the lead. Add others below.</p>
              <div className="space-y-2">
                {form.coFacilitators.map((f, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center">
                    <Input placeholder="Name" value={f.name} onChange={e => setFac(i, 'name', e.target.value)} />
                    <Input placeholder="Credentials" value={f.credentials} onChange={e => setFac(i, 'credentials', e.target.value)} />
                    <div className="flex gap-1">
                      <Input placeholder="Experience" value={f.experience} onChange={e => setFac(i, 'experience', e.target.value)} className="flex-1" />
                      <Button size="sm" variant="ghost" onClick={() => removeFac(i)}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={addFac} className="mt-2"><Plus className="w-3 h-3 mr-1" /> Add facilitator</Button>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!form.title} className="flex-1">Next: Schedule</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date *</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>End date</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
              <div>
                <Label>Total duration (hours)</Label>
                <Input type="number" placeholder="40" value={form.totalDurationHours} onChange={e => setForm(p => ({ ...p, totalDurationHours: e.target.value }))} />
              </div>
              <div>
                <Label>Frequency</Label>
                <Input placeholder="Weekly / Bi-weekly" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} />
              </div>
              <div>
                <Label>Session time</Label>
                <Input placeholder="Saturdays 10am-1pm" value={form.sessionTime} onChange={e => setForm(p => ({ ...p, sessionTime: e.target.value }))} />
              </div>
              <div>
                <Label>Number of sessions</Label>
                <Input type="number" value={form.totalSessions} onChange={e => setForm(p => ({ ...p, totalSessions: e.target.value }))} />
              </div>
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

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <Label>Facilitator commitment (hrs)</Label>
                <Input type="number" placeholder="e.g. 60" value={form.facilitatorCommitmentHours} onChange={e => setForm(p => ({ ...p, facilitatorCommitmentHours: e.target.value }))} />
              </div>
              <div>
                <Label>Trainee commitment (hrs)</Label>
                <Input type="number" placeholder="e.g. 50" value={form.traineeCommitmentHours} onChange={e => setForm(p => ({ ...p, traineeCommitmentHours: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={() => setStep(3)} disabled={!form.startDate} className="flex-1">Next: Curriculum & Pricing</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div>
              <Label>Syllabus & Structure</Label>
              <Textarea rows={6} placeholder="Module / week-wise breakdown..." value={form.syllabus} onChange={e => setForm(p => ({ ...p, syllabus: e.target.value }))} />
            </div>
            <div>
              <Label>Brochure URL (optional)</Label>
              <Input placeholder="https://... (PDF / image)" value={form.syllabusBrochureUrl} onChange={e => setForm(p => ({ ...p, syllabusBrochureUrl: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price per trainee (₹) *</Label>
                <Input type="number" value={form.pricePerTrainee} onChange={e => setForm(p => ({ ...p, pricePerTrainee: e.target.value }))} />
              </div>
              <div>
                <Label>Capacity (optional)</Label>
                <Input type="number" placeholder="Unlimited" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 p-3 border rounded">
              <Checkbox checked={form.certificateProvided} onCheckedChange={(v) => setForm(p => ({ ...p, certificateProvided: v === true }))} />
              <span className="text-sm">Provide certificate of completion to trainees</span>
            </label>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button onClick={handleSubmit} disabled={submitting || !form.pricePerTrainee} className="flex-1">{submitting ? 'Submitting...' : 'Submit for Admin Approval'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
