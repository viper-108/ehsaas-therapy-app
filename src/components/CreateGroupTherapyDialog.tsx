import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const DEFAULT_POLICY = `CONFIDENTIALITY & GROUND RULES
• Whatever you hear in this group stays in this group.
• Listen with respect; speak from your own experience.
• No advice-giving unless invited.

WHAT HAPPENS IN A CRISIS
If at any time you or someone in the group is in danger of harming themselves or others, the facilitator will pause the group and provide individual support / contact emergency services.

CANCELLATION & REFUND POLICY
• Once you join a closed group, you cannot cancel individual sessions — you may DROP OFF entirely.
• If you drop off before the group is locked: 50% of remaining sessions will be refunded.
• Once the group is locked (48 hours before start), no refunds.
• No-shows will not be refunded.

A NOTE
Trust your instincts and your capacity to engage with the group right now. Some discomfort is normally experienced. Leaving mid-group affects cohesion for everyone — we hope you're making a well-informed decision.`;

export function CreateGroupTherapyDialog({ isOpen, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [coLeads, setCoLeads] = useState<any[]>([]);
  const [step, setStep] = useState(1); // 3-step wizard
  const [form, setForm] = useState({
    title: '', focus: '', themes: '', description: '',
    rationale: '', audienceDescription: '', contraindications: '', outcomes: '', planProcedure: '',
    groupType: 'closed' as 'open' | 'closed',
    ageMin: '18', ageMax: '65', genderPreference: 'all',
    pricePerMember: '', sessionStartAt: '', sessionEndAt: '', totalSessions: '8',
    coLeadTherapistId: '',
    language: 'English', frequency: 'Weekly', mode: 'online' as 'online' | 'in-person' | 'hybrid', durationMinutes: '60',
    policyText: DEFAULT_POLICY, brochureUrl: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setForm({
      title: '', focus: '', themes: '', description: '',
      rationale: '', audienceDescription: '', contraindications: '', outcomes: '', planProcedure: '',
      groupType: 'closed', ageMin: '18', ageMax: '65', genderPreference: 'all',
      pricePerMember: '', sessionStartAt: '', sessionEndAt: '', totalSessions: '8', coLeadTherapistId: '',
      language: 'English', frequency: 'Weekly', mode: 'online', durationMinutes: '60',
      policyText: DEFAULT_POLICY, brochureUrl: '',
    });
    api.getContacts('all').then((d: any) => setCoLeads((d || []).filter((u: any) => u.role === 'therapist'))).catch(() => {});
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!form.title || !form.focus || !form.pricePerMember || !form.sessionStartAt) {
      return toast({ title: "Required fields missing", variant: "destructive" });
    }
    setSubmitting(true);
    try {
      await api.requestGroupTherapy({
        title: form.title.trim(),
        description: form.description,
        focus: form.focus.trim(),
        themes: form.themes.split(',').map(s => s.trim()).filter(Boolean),
        rationale: form.rationale,
        audienceDescription: form.audienceDescription,
        contraindications: form.contraindications,
        outcomes: form.outcomes,
        planProcedure: form.planProcedure,
        groupType: form.groupType,
        ageMin: Number(form.ageMin) || 18,
        ageMax: Number(form.ageMax) || 65,
        genderPreference: form.genderPreference,
        pricePerMember: Number(form.pricePerMember),
        sessionStartAt: new Date(form.sessionStartAt).toISOString(),
        sessionEndAt: form.sessionEndAt ? new Date(form.sessionEndAt).toISOString() : null,
        totalSessions: Number(form.totalSessions) || 1,
        coLeadTherapistId: form.coLeadTherapistId || null,
        language: form.language,
        frequency: form.frequency,
        mode: form.mode,
        durationMinutes: Number(form.durationMinutes) || 60,
        policyText: form.policyText,
        brochureUrl: form.brochureUrl,
      });
      toast({ title: "Group request submitted", description: "Admin will review and approve. You'll be notified by email." });
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
            <Users className="w-5 h-5 text-primary" /> Request New Group Therapy
            <span className="text-xs text-muted-foreground font-normal ml-auto">Step {step} of 3</span>
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1 — Group Identity */}
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label>Group Title *</Label>
              <Input placeholder="e.g. Anxiety Support Group" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>Primary Focus *</Label>
              <Input placeholder="Anxiety / Grief / Trauma..." value={form.focus} onChange={e => setForm(p => ({ ...p, focus: e.target.value }))} />
            </div>
            <div>
              <Label>Themes / Subtopics (comma-separated)</Label>
              <Input placeholder="Self-compassion, panic management, grounding..." value={form.themes} onChange={e => setForm(p => ({ ...p, themes: e.target.value }))} />
            </div>
            <div>
              <Label>Short Description (visible on the group card)</Label>
              <Textarea rows={2} placeholder="Quick teaser for the public group page" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Rationale</Label>
              <Textarea rows={3} placeholder="Why this group? Why now? Theoretical/clinical justification" value={form.rationale} onChange={e => setForm(p => ({ ...p, rationale: e.target.value }))} />
            </div>
            <div>
              <Label>Target Audience (issues, age, gender, prerequisites)</Label>
              <Textarea rows={3} placeholder="e.g. Adults 25-45 dealing with workplace burnout. Open to all genders. No prior therapy required..." value={form.audienceDescription} onChange={e => setForm(p => ({ ...p, audienceDescription: e.target.value }))} />
            </div>
            <div>
              <Label>Who is this NOT for? (Contraindications)</Label>
              <Textarea rows={2} placeholder="e.g. Active suicidal ideation, untreated psychosis, current substance dependence..." value={form.contraindications} onChange={e => setForm(p => ({ ...p, contraindications: e.target.value }))} />
            </div>
            <div>
              <Label>Outcomes / Goals</Label>
              <Textarea rows={2} placeholder="What members will gain by the end of the group" value={form.outcomes} onChange={e => setForm(p => ({ ...p, outcomes: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!form.title || !form.focus} className="flex-1">Next: Plan & Logistics</Button>
            </div>
          </div>
        )}

        {/* STEP 2 — Plan + Logistics */}
        {step === 2 && (
          <div className="space-y-3">
            <div>
              <Label>Plan / Procedure (session-by-session)</Label>
              <Textarea rows={6} placeholder="Session 1: Introductions, ground rules, intention setting...&#10;Session 2: Identifying triggers (techniques: ...)&#10;..." value={form.planProcedure} onChange={e => setForm(p => ({ ...p, planProcedure: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Group Type *</Label>
                <Select value={form.groupType} onValueChange={(v: 'open' | 'closed') => setForm(p => ({ ...p, groupType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closed">Closed (set members, deeper trust)</SelectItem>
                    <SelectItem value="open">Open (drop-in, flexible)</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Language</Label>
                <Input value={form.language} onChange={e => setForm(p => ({ ...p, language: e.target.value }))} />
              </div>
              <div>
                <Label>Frequency</Label>
                <Input placeholder="Weekly / Bi-weekly" value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} />
              </div>
              <div>
                <Label>Duration / session (min)</Label>
                <Input type="number" value={form.durationMinutes} onChange={e => setForm(p => ({ ...p, durationMinutes: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Min age</Label>
                <Input type="number" value={form.ageMin} onChange={e => setForm(p => ({ ...p, ageMin: e.target.value }))} />
              </div>
              <div>
                <Label>Max age</Label>
                <Input type="number" value={form.ageMax} onChange={e => setForm(p => ({ ...p, ageMax: e.target.value }))} />
              </div>
              <div>
                <Label>Gender preference</Label>
                <Select value={form.genderPreference} onValueChange={(v) => setForm(p => ({ ...p, genderPreference: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="women">Women only</SelectItem>
                    <SelectItem value="men">Men only</SelectItem>
                    <SelectItem value="queer-affirmative">Queer-affirmative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>First session start *</Label>
                <Input type="datetime-local" value={form.sessionStartAt} onChange={e => setForm(p => ({ ...p, sessionStartAt: e.target.value }))} />
              </div>
              <div>
                <Label>Last session end (optional)</Label>
                <Input type="datetime-local" value={form.sessionEndAt} onChange={e => setForm(p => ({ ...p, sessionEndAt: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Total sessions</Label>
                <Input type="number" value={form.totalSessions} onChange={e => setForm(p => ({ ...p, totalSessions: e.target.value }))} />
              </div>
              <div>
                <Label>Price per member (₹) *</Label>
                <Input type="number" placeholder="500" value={form.pricePerMember} onChange={e => setForm(p => ({ ...p, pricePerMember: e.target.value }))} />
              </div>
              <div>
                <Label>Co-lead (optional)</Label>
                <Select value={form.coLeadTherapistId || 'none'} onValueChange={(v) => setForm(p => ({ ...p, coLeadTherapistId: v === 'none' ? '' : v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Solo</SelectItem>
                    {coLeads.map((t: any) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-3 text-xs text-blue-900 dark:text-blue-100">
              <strong>Capacity rule:</strong> 1 lead → 5 max members. 2 leads → 10 max. Auto-set on submit.
              {form.groupType === 'closed' && ' Closed groups charge total fee upfront.'}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
              <Button onClick={() => setStep(3)} disabled={!form.pricePerMember || !form.sessionStartAt} className="flex-1">Next: Policy</Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Policy + Brochure */}
        {step === 3 && (
          <div className="space-y-3">
            <div>
              <Label>Confidentiality, Ground Rules, Crisis & Refund Policy</Label>
              <p className="text-xs text-muted-foreground mb-1">This appears on the public group page so members know what they're signing up for. You can edit the default below.</p>
              <Textarea rows={12} className="font-mono text-xs" value={form.policyText} onChange={e => setForm(p => ({ ...p, policyText: e.target.value }))} />
            </div>

            <div>
              <Label>Brochure Image URL (optional)</Label>
              <Input placeholder="https://... (Insta post / promo image link)" value={form.brochureUrl} onChange={e => setForm(p => ({ ...p, brochureUrl: e.target.value }))} />
              <p className="text-[11px] text-muted-foreground mt-1">For now, paste a hosted image link. File upload coming soon.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
                {submitting ? 'Submitting...' : 'Submit for Admin Approval'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
