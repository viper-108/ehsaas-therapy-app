import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UsersRound, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  group: any;
  isOpen: boolean;
  onClose: () => void;
  onEnrolled?: () => void;
}

export function EnrollGroupDialog({ group, isOpen, onClose, onEnrolled }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    age: '',
    expectations: '',
    priorGroupExperience: '',
    inIndividualTherapy: '',          // 'no' | 'yes-different' | 'yes-same' (admin will check name)
    individualTherapistName: '',
    comfortableSharingFocus: false,
    canCommitSchedule: false,
    crisisRiskNow: false,
    languageComfortable: false,
    notesForFacilitator: '',
    safetyRequirements: '',
    agreedToGuidelines: false,
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const submit = async () => {
    if (form.crisisRiskNow) {
      // Soft-block — let them apply but warn them they may be redirected to individual support
      if (!window.confirm("You indicated you're currently experiencing thoughts of harming yourself or others. Group therapy may not be the safest space for you right now. We strongly recommend individual therapy or crisis support first. Are you sure you want to submit this application?")) {
        return;
      }
    }
    if (!form.agreedToGuidelines) return toast({ title: "Please agree to the guidelines", variant: "destructive" });
    if (!form.age || isNaN(Number(form.age))) return toast({ title: "Enter a valid age", variant: "destructive" });
    const age = Number(form.age);
    if (age < group.ageMin || age > group.ageMax) {
      return toast({ title: `This group is for ages ${group.ageMin}-${group.ageMax}.`, variant: "destructive" });
    }
    if (!form.expectations.trim()) return toast({ title: "Please share what you're expecting", variant: "destructive" });

    setSubmitting(true);
    try {
      await api.enrollInGroupTherapy(group._id, { ...form, age });
      toast({ title: "Application submitted", description: "Lead therapists & admin will review your application. You'll get an update by email." });
      onEnrolled?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UsersRound className="w-5 h-5 text-primary" /> Apply: {group.title}</DialogTitle>
        </DialogHeader>

        <div className="bg-primary/5 border border-primary/20 rounded p-3 text-xs">
          <p><strong>{group.title}</strong> · Focus: {group.focus}</p>
          <p>{group.groupType === 'open' ? 'Open (drop-in)' : 'Closed (start & finish together)'} · Ages {group.ageMin}-{group.ageMax}</p>
          <p>₹{group.pricePerMember}/member{group.totalSessions > 1 ? ` × ${group.totalSessions} sessions` : ''}</p>
          {group.language && <p>Language: <strong>{group.language}</strong></p>}
        </div>

        {step === 1 && (
          <div className="space-y-3 mt-3">
            <div>
              <Label>Your age *</Label>
              <Input type="number" value={form.age} onChange={e => set('age', e.target.value)} />
            </div>
            <div>
              <Label>What are you expecting from this group? *</Label>
              <Textarea rows={3} value={form.expectations} onChange={e => set('expectations', e.target.value)} />
            </div>
            <div>
              <Label>Have you attended group therapy before? How was your experience?</Label>
              <Textarea rows={2} value={form.priorGroupExperience} onChange={e => set('priorGroupExperience', e.target.value)} />
            </div>
            <div>
              <Label>Are you currently or recently in individual therapy?</Label>
              <Select value={form.inIndividualTherapy} onValueChange={(v) => set('inIndividualTherapy', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="yes-different">Yes, with a different therapist</SelectItem>
                  <SelectItem value="yes-this">Yes, with one of the lead therapists of this group</SelectItem>
                </SelectContent>
              </Select>
              {(form.inIndividualTherapy === 'yes-different' || form.inIndividualTherapy === 'yes-this') && (
                <Input className="mt-2" placeholder="Therapist name (optional)" value={form.individualTherapistName} onChange={e => set('individualTherapistName', e.target.value)} />
              )}
              {form.inIndividualTherapy === 'yes-this' && (
                <p className="text-xs text-amber-700 mt-2 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  If you're currently in individual therapy with one of the lead therapists, your application may be auto-rejected to avoid dual relationship. We'll refer you to a different group.
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={() => setStep(2)} className="flex-1">Next: Screening</Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground italic">A few yes/no checks to make sure this group is right for you.</p>

            <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/40">
              <Checkbox checked={form.comfortableSharingFocus} onCheckedChange={(v) => set('comfortableSharingFocus', v === true)} />
              <span className="text-sm">
                I'm comfortable that I won't get the same focus as in 1:1 therapy, but I can learn from others' experiences.
              </span>
            </label>

            <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/40">
              <Checkbox checked={form.canCommitSchedule} onCheckedChange={(v) => set('canCommitSchedule', v === true)} />
              <span className="text-sm">
                I can commit to attending all (or most) sessions at the scheduled time.<br />
                <span className="text-muted-foreground text-xs">First session: {new Date(group.sessionStartAt).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            </label>

            <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/40">
              <Checkbox checked={form.languageComfortable} onCheckedChange={(v) => set('languageComfortable', v === true)} />
              <span className="text-sm">
                I'm comfortable participating in <strong>{group.language || 'English'}</strong>.
              </span>
            </label>

            <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-amber-50">
              <Checkbox checked={form.crisisRiskNow} onCheckedChange={(v) => set('crisisRiskNow', v === true)} />
              <span className="text-sm">
                I'm <strong>currently</strong> experiencing thoughts of harming myself or others.<br />
                <span className="text-muted-foreground text-xs">Please answer honestly — this helps us route you to the right support. Group therapy may not be the safest space if "yes".</span>
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1">Next: Final Notes</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 mt-3">
            <div>
              <Label>Anything you'd like the facilitator to know before the group starts?</Label>
              <Textarea rows={2} value={form.notesForFacilitator} onChange={e => set('notesForFacilitator', e.target.value)} />
            </div>
            <div>
              <Label>What would make this group feel safe for you?</Label>
              <Textarea rows={2} value={form.safetyRequirements} onChange={e => set('safetyRequirements', e.target.value)} />
            </div>

            {/* Group's policy text shown for review */}
            {group.policyText && (
              <details className="border rounded p-2">
                <summary className="text-sm font-medium cursor-pointer">Read group guidelines & policies</summary>
                <pre className="whitespace-pre-wrap text-xs text-muted-foreground mt-2 font-sans leading-relaxed">{group.policyText}</pre>
              </details>
            )}

            <label className="flex items-start gap-2 p-3 border-2 border-primary/30 bg-primary/5 rounded cursor-pointer">
              <Checkbox checked={form.agreedToGuidelines} onCheckedChange={(v) => set('agreedToGuidelines', v === true)} />
              <span className="text-xs">
                I have read and understood the group's guidelines, the potential benefits and harms, and I'm making a well-informed decision to apply.
              </span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button onClick={submit} disabled={submitting} className="flex-1">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
