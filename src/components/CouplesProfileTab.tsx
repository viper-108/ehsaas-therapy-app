import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, CheckCircle, Mail, ArrowRight, Plus, X, ChevronDown, ChevronRight as Chev } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const SUBSTANCE_OPTIONS = ['Alcohol', 'Cigarettes', 'Vape', 'Weed', 'Other'];

const Section = ({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: any }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button type="button" className="w-full p-3 flex items-center justify-between bg-muted/40 hover:bg-muted/60 transition" onClick={() => setOpen(!open)}>
        <span className="font-semibold text-foreground text-sm">{title}</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <Chev className="w-4 h-4" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
};

export function CouplesProfileTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const cp: any = (user as any)?.couplesProfile || {};

  const [form, setForm] = useState({
    // Partner
    partnerName: '', partnerEmail: '', polyamorousNote: '',
    // Personal
    dateOfBirth: '', age: '', phone: '', languagePreference: '',
    assignedSex: '', pronouns: '', occupation: '', highestEducation: '',
    // Health & lifestyle
    medicationsRegular: '',
    substancesUsed: [] as string[],
    teaCoffeeFrequency: '',
    // Relationship
    relationshipStatus: '', relationshipDuration: '',
    livingSituation: '',
    children: [] as { name: string; age: string; gender: string }[],
    // Concerns
    primaryConcerns: '',
    expectationsFutureRelationship: '',
    expectationsTherapyGoals: '',
    // Health diagnoses
    selfDiagnoses: '',
    partnerDiagnoses: '',
    // Intimacy
    emotionalIntimacyRating: '5',
    physicalIntimacyRating: '5',
    selfHandlesConflict: '',
    partnerHandlesConflict: '',
    // Connection
    admireInPartner: '',
    partnerAdmiresInMe: '',
    funTogether: '',
    // Source
    heardAboutEhsaasFrom: '',
  });

  useEffect(() => {
    setForm(p => ({
      ...p,
      partnerName: cp.partnerName || '',
      partnerEmail: cp.partnerEmail || '',
      polyamorousNote: cp.polyamorousNote || '',
      dateOfBirth: cp.dateOfBirth ? new Date(cp.dateOfBirth).toISOString().slice(0, 10) : '',
      age: cp.age != null ? String(cp.age) : '',
      phone: cp.phone || '',
      languagePreference: cp.languagePreference || '',
      assignedSex: cp.assignedSex || '',
      pronouns: cp.pronouns || '',
      occupation: cp.occupation || '',
      highestEducation: cp.highestEducation || '',
      medicationsRegular: cp.medicationsRegular || '',
      substancesUsed: Array.isArray(cp.substancesUsed) ? cp.substancesUsed : [],
      teaCoffeeFrequency: cp.teaCoffeeFrequency || '',
      relationshipStatus: cp.relationshipStatus || cp.relationshipType || '',
      relationshipDuration: cp.relationshipDuration || '',
      livingSituation: cp.livingSituation || '',
      children: Array.isArray(cp.children) && cp.children.length > 0
        ? cp.children.map((c: any) => ({ name: c.name || '', age: c.age != null ? String(c.age) : '', gender: c.gender || '' }))
        : [],
      primaryConcerns: cp.primaryConcerns || cp.challengesFacing || '',
      expectationsFutureRelationship: cp.expectationsFutureRelationship || '',
      expectationsTherapyGoals: cp.expectationsTherapyGoals || cp.goalsForTherapy || '',
      selfDiagnoses: cp.selfDiagnoses || '',
      partnerDiagnoses: cp.partnerDiagnoses || '',
      emotionalIntimacyRating: cp.emotionalIntimacyRating != null ? String(cp.emotionalIntimacyRating) : '5',
      physicalIntimacyRating: cp.physicalIntimacyRating != null ? String(cp.physicalIntimacyRating) : '5',
      selfHandlesConflict: cp.selfHandlesConflict || '',
      partnerHandlesConflict: cp.partnerHandlesConflict || '',
      admireInPartner: cp.admireInPartner || '',
      partnerAdmiresInMe: cp.partnerAdmiresInMe || '',
      funTogether: cp.funTogether || '',
      heardAboutEhsaasFrom: cp.heardAboutEhsaasFrom || '',
    }));
    // eslint-disable-next-line
  }, [user]);

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const toggleSubstance = (s: string) => {
    setForm(p => ({ ...p, substancesUsed: p.substancesUsed.includes(s) ? p.substancesUsed.filter(x => x !== s) : [...p.substancesUsed, s] }));
  };
  const addChild = () => setForm(p => ({ ...p, children: [...p.children, { name: '', age: '', gender: '' }] }));
  const removeChild = (i: number) => setForm(p => ({ ...p, children: p.children.filter((_, idx) => idx !== i) }));
  const updateChild = (i: number, key: string, v: string) => setForm(p => ({ ...p, children: p.children.map((c, idx) => idx === i ? { ...c, [key]: v } : c) }));

  const handleSubmit = async () => {
    if (!form.partnerName || !form.partnerEmail) {
      return toast({ title: "Partner name & email required", variant: "destructive" });
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : null,
        emotionalIntimacyRating: Number(form.emotionalIntimacyRating) || null,
        physicalIntimacyRating: Number(form.physicalIntimacyRating) || null,
        children: form.children.map(c => ({ name: c.name, age: c.age ? Number(c.age) : null, gender: c.gender })),
      };
      const data = await api.updateCouplesProfile(payload);
      if (data?.user) updateUser(data.user);
      toast({ title: "Couples profile saved", description: "Admin will review and approve. We've also emailed your partner if they're not signed up." });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const isApproved = cp.isApprovedByAdmin;
  const profileSubmitted = cp.profileCompletedAt;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold">Couples Therapy Profile</h3>
          {isApproved && <Badge className="bg-success/10 text-success ml-auto"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Tell us about you and your relationship. Both partners need to complete this. Sections can be expanded as you go.
        </p>

        <div className="space-y-3">
          <Section title="1. Partner & contact" defaultOpen>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Partner Name *</Label>
                <Input value={form.partnerName} onChange={e => set('partnerName', e.target.value)} />
              </div>
              <div>
                <Label>Partner Email *</Label>
                <Input type="email" value={form.partnerEmail} onChange={e => set('partnerEmail', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>If polyamorous, who is coming to therapy?</Label>
              <Textarea rows={2} placeholder="(Optional) Mention specifically which partner(s) will attend" value={form.polyamorousNote} onChange={e => set('polyamorousNote', e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Phone (preferably WhatsApp)</Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <Label>Language preference</Label>
                <Input placeholder="English / Hindi / ..." value={form.languagePreference} onChange={e => set('languagePreference', e.target.value)} />
              </div>
            </div>
          </Section>

          <Section title="2. Personal demographics">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Date of birth</Label>
                <Input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <Label>Age</Label>
                <Input type="number" value={form.age} onChange={e => set('age', e.target.value)} />
              </div>
              <div>
                <Label>Assigned sex</Label>
                <Select value={form.assignedSex} onValueChange={(v) => set('assignedSex', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="intersex">Intersex</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pronouns</Label>
                <Input placeholder="she/her, he/him, they/them, ..." value={form.pronouns} onChange={e => set('pronouns', e.target.value)} />
              </div>
              <div>
                <Label>Occupation</Label>
                <Input value={form.occupation} onChange={e => set('occupation', e.target.value)} />
              </div>
              <div>
                <Label>Highest education</Label>
                <Input value={form.highestEducation} onChange={e => set('highestEducation', e.target.value)} />
              </div>
            </div>
          </Section>

          <Section title="3. Health & lifestyle">
            <div>
              <Label>Medications you take regularly</Label>
              <Textarea rows={2} placeholder="(If any)" value={form.medicationsRegular} onChange={e => set('medicationsRegular', e.target.value)} />
            </div>
            <div>
              <Label>Substances you use</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SUBSTANCE_OPTIONS.map(s => (
                  <label key={s} className="flex items-center gap-2 px-3 py-1.5 border rounded text-sm cursor-pointer hover:bg-muted/40">
                    <Checkbox checked={form.substancesUsed.includes(s)} onCheckedChange={() => toggleSubstance(s)} />
                    {s}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>How often do you have tea/coffee?</Label>
              <Input placeholder="e.g. 2 cups/day" value={form.teaCoffeeFrequency} onChange={e => set('teaCoffeeFrequency', e.target.value)} />
            </div>
          </Section>

          <Section title="4. Relationship details">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Relationship status</Label>
                <Select value={form.relationshipStatus} onValueChange={(v) => set('relationshipStatus', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dating">Dating</SelectItem>
                    <SelectItem value="engaged">Engaged</SelectItem>
                    <SelectItem value="in-relationship">In a relationship</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="separated">Separated</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration of relationship</Label>
                <Input placeholder="e.g. 5 years" value={form.relationshipDuration} onChange={e => set('relationshipDuration', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Living situation</Label>
              <Input placeholder="e.g. Living together, long-distance..." value={form.livingSituation} onChange={e => set('livingSituation', e.target.value)} />
            </div>
            <div>
              <Label>Children</Label>
              <p className="text-xs text-muted-foreground mb-2">Provide name, age, and gender for each (optional).</p>
              <div className="space-y-2">
                {form.children.map((c, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 items-center">
                    <Input placeholder="Name" value={c.name} onChange={e => updateChild(i, 'name', e.target.value)} />
                    <Input type="number" placeholder="Age" value={c.age} onChange={e => updateChild(i, 'age', e.target.value)} />
                    <div className="flex gap-1">
                      <Input placeholder="Gender" value={c.gender} onChange={e => updateChild(i, 'gender', e.target.value)} className="flex-1" />
                      <Button size="sm" variant="ghost" onClick={() => removeChild(i)}><X className="w-3 h-3" /></Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={addChild} className="mt-2">
                <Plus className="w-3 h-3 mr-1" /> Add child
              </Button>
            </div>
          </Section>

          <Section title="5. Concerns & expectations">
            <div>
              <Label>Primary concerns about the relationship</Label>
              <Textarea rows={3} value={form.primaryConcerns} onChange={e => set('primaryConcerns', e.target.value)} />
            </div>
            <div>
              <Label>Expectations for the future of your relationship</Label>
              <Textarea rows={2} value={form.expectationsFutureRelationship} onChange={e => set('expectationsFutureRelationship', e.target.value)} />
            </div>
            <div>
              <Label>Expectations / goals from therapy</Label>
              <Textarea rows={2} value={form.expectationsTherapyGoals} onChange={e => set('expectationsTherapyGoals', e.target.value)} />
            </div>
          </Section>

          <Section title="6. Health diagnoses (relevant for sessions)">
            <div>
              <Label>Any past or present medical / mental-health diagnoses YOU have</Label>
              <Textarea rows={2} value={form.selfDiagnoses} onChange={e => set('selfDiagnoses', e.target.value)} />
            </div>
            <div>
              <Label>Any diagnoses you believe your PARTNER has (relevant for sessions)</Label>
              <Textarea rows={2} value={form.partnerDiagnoses} onChange={e => set('partnerDiagnoses', e.target.value)} />
            </div>
          </Section>

          <Section title="7. Intimacy & conflict">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Emotional intimacy (1-10)</Label>
                <Input type="number" min={1} max={10} value={form.emotionalIntimacyRating} onChange={e => set('emotionalIntimacyRating', e.target.value)} />
              </div>
              <div>
                <Label>Physical/sexual intimacy (1-10)</Label>
                <Input type="number" min={1} max={10} value={form.physicalIntimacyRating} onChange={e => set('physicalIntimacyRating', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>How do YOU handle conflicts in the relationship?</Label>
              <Textarea rows={3} value={form.selfHandlesConflict} onChange={e => set('selfHandlesConflict', e.target.value)} />
            </div>
            <div>
              <Label>How does your PARTNER handle conflicts (in your view)?</Label>
              <Textarea rows={3} value={form.partnerHandlesConflict} onChange={e => set('partnerHandlesConflict', e.target.value)} />
            </div>
          </Section>

          <Section title="8. Connection">
            <div>
              <Label>What do you admire most in your partner?</Label>
              <Textarea rows={2} value={form.admireInPartner} onChange={e => set('admireInPartner', e.target.value)} />
            </div>
            <div>
              <Label>What do you think your partner admires most in you?</Label>
              <Textarea rows={2} value={form.partnerAdmiresInMe} onChange={e => set('partnerAdmiresInMe', e.target.value)} />
            </div>
            <div>
              <Label>What do you do for fun together?</Label>
              <Textarea rows={2} value={form.funTogether} onChange={e => set('funTogether', e.target.value)} />
            </div>
          </Section>

          <Section title="9. Source">
            <div>
              <Label>Where did you hear about us?</Label>
              <Input value={form.heardAboutEhsaasFrom} onChange={e => set('heardAboutEhsaasFrom', e.target.value)} />
            </div>
          </Section>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="mt-5 w-full md:w-auto">
          {submitting ? 'Saving...' : profileSubmitted ? 'Update Profile' : 'Submit Profile'}
        </Button>
      </Card>

      {profileSubmitted && (
        <Card className={`p-5 ${isApproved ? 'bg-success/5 border-success/30' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'}`}>
          {isApproved ? (
            <div>
              <p className="font-medium text-success">✓ Profile approved!</p>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                You can now browse couple-expert therapists and book sessions.
              </p>
              <Button onClick={() => navigate('/team?service=couple')} variant="outline" size="sm">
                Browse Couple Therapists <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div>
              <p className="font-medium">⏳ Pending admin approval</p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll notify you (and your partner) by email and in-app once approved.
              </p>
            </div>
          )}
        </Card>
      )}

      {cp.partnerEmail && !cp.partnerId && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-700" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              We've emailed <strong>{cp.partnerEmail}</strong> with an invite. They need to sign up and complete their own couples profile.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
