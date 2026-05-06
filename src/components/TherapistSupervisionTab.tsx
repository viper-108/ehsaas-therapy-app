import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GraduationCap, ClipboardList, Plus, Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const TC_TEXT = `Supervision Guidelines & T&Cs (summary):
• Maintain client confidentiality at all times when discussing cases.
• Follow ethical guidelines of your professional licensing body.
• Active engagement & honest reflection expected.
• Group supervision: 4-session lockstep payment, no cancellation/refund.
• Individual supervision: standard cancellation policy applies.
• Supervisors may keep some notes private (e.g. their own reflections / supervision-of-supervision).`;

export function TherapistSupervisionTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'supervisor' | 'supervisee' | 'group'>('supervisor');
  const [showSupervisorForm, setShowSupervisorForm] = useState(false);
  const [showSuperviseeForm, setShowSuperviseeForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [notes, setNotes] = useState<{ asSupervisor: any[]; asSupervisee: any[] }>({ asSupervisor: [], asSupervisee: [] });

  const sp: any = (user as any)?.supervisorProfile || {};
  const svp: any = (user as any)?.superviseeProfile || {};
  const supervisionAccepted = ((user as any)?.approvedServices || []).some((s: any) => s.type === 'supervision' && s.therapistAccepted);

  // Supervisor form state
  const [supForm, setSupForm] = useState({
    therapyExperienceYears: '', supervisionExperienceYears: '',
    audience: '', focusBio: '', approach: '',
    durationOptions: ['50'], openTo: 'individual',
    individualPrice50: '', individualPrice90: '',
  });

  // Supervisee form state
  const [supeForm, setSupeForm] = useState({
    experienceLevelHours: '', currentCaseload: '',
    goalsExpectations: '', modalities: '',
    consentToGuidelines: false,
  });

  // Group form state
  const [groupForm, setGroupForm] = useState({
    title: '', description: '', level: 'beginner', format: '',
    groupSize: '4', schedule: '', sessionStartAt: '', totalSessions: '4',
    durationMinutes: '90', pricePer4Sessions: '', language: 'English', mode: 'online',
  });

  useEffect(() => {
    if (sp.isApplied) {
      setSupForm(p => ({
        ...p,
        therapyExperienceYears: String(sp.therapyExperienceYears || ''),
        supervisionExperienceYears: String(sp.supervisionExperienceYears || ''),
        audience: sp.audience || '', focusBio: sp.focusBio || '',
        approach: sp.approach || '',
        durationOptions: (sp.durationOptions || [50]).map(String),
        openTo: sp.openTo || 'individual',
        individualPrice50: String(sp.individualPrice50 || ''),
        individualPrice90: String(sp.individualPrice90 || ''),
      }));
    }
    if (svp.isApplied) {
      setSupeForm(p => ({
        ...p,
        experienceLevelHours: String(svp.experienceLevelHours || ''),
        currentCaseload: String(svp.currentCaseload || ''),
        goalsExpectations: svp.goalsExpectations || '',
        modalities: svp.modalities || '',
        consentToGuidelines: svp.consentToGuidelines || false,
      }));
    }
    // Load my supervision groups + notes
    (async () => {
      try { setMyGroups(await api.getMyLeadingSupervisionGroups()); } catch {}
      try { setNotes(await api.getMySupervisionNotes()); } catch {}
    })();
    // eslint-disable-next-line
  }, [user]);

  const submitSupervisor = async () => {
    const required: { key: keyof typeof supForm; label: string }[] = [
      { key: 'therapyExperienceYears', label: 'Therapy experience' },
      { key: 'supervisionExperienceYears', label: 'Supervision experience' },
      { key: 'audience', label: 'Audience' },
      { key: 'focusBio', label: 'Focus / Bio' },
      { key: 'approach', label: 'Approach' },
      { key: 'openTo', label: 'Open to' },
      { key: 'individualPrice50', label: 'Price (50 min)' },
      { key: 'individualPrice90', label: 'Price (90 min)' },
    ];
    for (const f of required) {
      const v = String((supForm as any)[f.key] ?? '').trim();
      if (!v) return toast({ title: `${f.label} is required`, variant: "destructive" });
    }
    setSubmitting(true);
    try {
      const r = await api.applyAsSupervisor({
        therapyExperienceYears: Number(supForm.therapyExperienceYears),
        supervisionExperienceYears: Number(supForm.supervisionExperienceYears) || 0,
        audience: supForm.audience,
        focusBio: supForm.focusBio,
        approach: supForm.approach,
        durationOptions: supForm.durationOptions.map(Number),
        openTo: supForm.openTo,
        individualPrice50: Number(supForm.individualPrice50),
        individualPrice90: Number(supForm.individualPrice90) || 0,
      });
      if (r.user) updateUser(r.user);
      toast({ title: "Supervisor application submitted", description: "Admin will review and notify you by email." });
      setShowSupervisorForm(false);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const submitSupervisee = async () => {
    const required: { key: keyof typeof supeForm; label: string }[] = [
      { key: 'experienceLevelHours', label: 'Experience hours' },
      { key: 'currentCaseload', label: 'Current caseload' },
      { key: 'goalsExpectations', label: 'Goals / Expectations' },
      { key: 'modalities', label: 'Approaches / Modalities' },
    ];
    for (const f of required) {
      const v = String((supeForm as any)[f.key] ?? '').trim();
      if (!v) return toast({ title: `${f.label} is required`, variant: "destructive" });
    }
    if (!supeForm.consentToGuidelines) return toast({ title: "Please consent to the guidelines", variant: "destructive" });
    setSubmitting(true);
    try {
      const r = await api.applyAsSupervisee({
        experienceLevelHours: Number(supeForm.experienceLevelHours) || 0,
        currentCaseload: Number(supeForm.currentCaseload) || 0,
        goalsExpectations: supeForm.goalsExpectations,
        modalities: supeForm.modalities,
        consentToGuidelines: true,
      });
      if (r.user) updateUser(r.user);
      toast({ title: "Application submitted", description: "Admin will review and notify you by email." });
      setShowSuperviseeForm(false);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const submitGroup = async () => {
    const required: { key: keyof typeof groupForm; label: string }[] = [
      { key: 'title', label: 'Title' },
      { key: 'description', label: 'Description' },
      { key: 'level', label: 'Level' },
      { key: 'groupSize', label: 'Group size' },
      { key: 'format', label: 'Format' },
      { key: 'schedule', label: 'Schedule' },
      { key: 'sessionStartAt', label: 'First session start' },
      { key: 'totalSessions', label: 'Total sessions' },
      { key: 'durationMinutes', label: 'Duration' },
      { key: 'pricePer4Sessions', label: 'Price' },
    ];
    for (const f of required) {
      const v = String((groupForm as any)[f.key] ?? '').trim();
      if (!v) return toast({ title: `${f.label} is required`, variant: "destructive" });
    }
    setSubmitting(true);
    try {
      await api.createSupervisionGroup({
        title: groupForm.title.trim(),
        description: groupForm.description,
        level: groupForm.level, format: groupForm.format,
        groupSize: Number(groupForm.groupSize),
        schedule: groupForm.schedule,
        sessionStartAt: groupForm.sessionStartAt ? new Date(groupForm.sessionStartAt).toISOString() : null,
        totalSessions: Number(groupForm.totalSessions) || 4,
        durationMinutes: Number(groupForm.durationMinutes) || 90,
        pricePer4Sessions: Number(groupForm.pricePer4Sessions),
        language: groupForm.language, mode: groupForm.mode,
      });
      toast({ title: "Group request submitted", description: "Admin will review." });
      setShowGroupForm(false);
      const list = await api.getMyLeadingSupervisionGroups();
      setMyGroups(list);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> Supervision</h2>
        <p className="text-xs text-muted-foreground mt-1">Apply to be a supervisor, request supervision yourself, or manage group supervision sessions.</p>
      </div>

      <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
        <TabsList>
          <TabsTrigger value="supervisor">As Supervisor</TabsTrigger>
          <TabsTrigger value="supervisee">As Supervisee</TabsTrigger>
          <TabsTrigger value="group">My Groups</TabsTrigger>
        </TabsList>

        {/* As Supervisor */}
        <TabsContent value="supervisor" className="space-y-3 mt-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="font-semibold">Supervisor Profile</h3>
              {sp.isApproved && <Badge className="bg-success/10 text-success">Approved</Badge>}
              {sp.isApplied && !sp.isApproved && !sp.isRejected && <Badge className="bg-amber-500/10 text-amber-700">Pending review</Badge>}
              {sp.isRejected && <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>}
            </div>
            {!supervisionAccepted && (
              <p className="text-xs text-amber-700 italic mb-3">
                You must have the "Supervision" service approved + accepted in your services to be listed publicly. Visit Approvals tab.
              </p>
            )}
            {sp.isApplied ? (
              <div className="space-y-1 text-sm">
                <p><strong>Therapy experience:</strong> {sp.therapyExperienceYears}+ years</p>
                <p><strong>Supervision experience:</strong> {sp.supervisionExperienceYears || 0}+ years</p>
                <p><strong>Open to:</strong> <span className="capitalize">{sp.openTo}</span></p>
                {sp.individualPrice50 > 0 && <p><strong>Individual ₹{sp.individualPrice50} / 50min</strong>{sp.individualPrice90 > 0 ? ` · ₹${sp.individualPrice90} / 90min` : ''}</p>}
                {sp.audience && <p className="text-muted-foreground text-xs"><strong className="text-foreground">For:</strong> {sp.audience}</p>}
                {sp.focusBio && <p className="text-muted-foreground text-xs">{sp.focusBio}</p>}
                {sp.isRejected && sp.rejectionReason && <p className="text-destructive text-xs mt-2">Reason: {sp.rejectionReason}</p>}
                {(sp.isRejected || (!sp.isApproved && !sp.isApplied)) && (
                  <Button size="sm" className="mt-2" onClick={() => setShowSupervisorForm(true)}>{sp.isRejected ? 'Re-apply' : 'Edit & resubmit'}</Button>
                )}
                {sp.isApproved && (
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowSupervisorForm(true)}>Update profile</Button>
                )}
              </div>
            ) : (
              <Button onClick={() => setShowSupervisorForm(true)}>
                <Plus className="w-4 h-4 mr-1" /> Apply to be a Supervisor
              </Button>
            )}
          </Card>

          {/* Supervisor notes (visible when supervisor) */}
          {sp.isApproved && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Supervision Notes</h3>
              </div>
              {notes.asSupervisor.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No notes written yet.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {notes.asSupervisor.slice(0, 10).map((n: any) => (
                    <div key={n._id} className="text-xs p-3 border rounded">
                      <p className="font-medium">{n.superviseeTherapistId?.name || 'Group session'} · {new Date(n.createdAt).toLocaleDateString('en-IN')}</p>
                      {n.casesDiscussed && <p className="text-muted-foreground mt-1"><strong>Cases:</strong> {n.casesDiscussed}</p>}
                      {n.actionPlans && <p className="text-muted-foreground mt-1"><strong>Action:</strong> {n.actionPlans}</p>}
                      {n.privateToSupervisor && <Badge variant="outline" className="mt-1 text-[10px]">Private</Badge>}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </TabsContent>

        {/* As Supervisee */}
        <TabsContent value="supervisee" className="space-y-3 mt-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <h3 className="font-semibold">Supervisee Application</h3>
              {svp.isApproved && <Badge className="bg-success/10 text-success">Approved</Badge>}
              {svp.isApplied && !svp.isApproved && !svp.isRejected && <Badge className="bg-amber-500/10 text-amber-700">Pending review</Badge>}
              {svp.isRejected && <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>}
            </div>
            {svp.isApplied && svp.isApproved ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">You're approved to receive supervision. Browse the public supervisor directory.</p>
                <Button size="sm" variant="outline" onClick={() => window.open('/supervision', '_blank')}>Browse Supervisors</Button>
              </>
            ) : svp.isApplied ? (
              <>
                <p className="text-sm text-muted-foreground mb-2">Your application is pending admin review.</p>
                {svp.isRejected && svp.rejectionReason && <p className="text-destructive text-xs mb-2">Reason: {svp.rejectionReason}</p>}
                {svp.isRejected && <Button size="sm" onClick={() => setShowSuperviseeForm(true)}>Re-apply</Button>}
              </>
            ) : (
              <Button onClick={() => setShowSuperviseeForm(true)}>Apply for Supervision</Button>
            )}
          </Card>

          {notes.asSupervisee.length > 0 && (
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList className="w-4 h-4 text-primary" />
                <h3 className="font-semibold">Notes from my supervisor(s)</h3>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {notes.asSupervisee.slice(0, 10).map((n: any) => (
                  <div key={n._id} className="text-xs p-3 border rounded">
                    <p className="font-medium">{n.supervisorTherapistId?.name} · {new Date(n.createdAt).toLocaleDateString('en-IN')}</p>
                    {n.actionPlans && <p className="text-muted-foreground mt-1"><strong>Action plans:</strong> {n.actionPlans}</p>}
                    {n.readingsAssigned && <p className="text-muted-foreground mt-1"><strong>Readings:</strong> {n.readingsAssigned}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* My Groups */}
        <TabsContent value="group" className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Group supervision you're leading.</p>
            {sp.isApproved && ['group', 'both'].includes(sp.openTo) && (
              <Button size="sm" onClick={() => setShowGroupForm(true)}>
                <Plus className="w-3 h-3 mr-1" /> Request Group Supervision
              </Button>
            )}
          </div>

          {!sp.isApproved && <Card className="p-5"><p className="text-sm text-muted-foreground italic">Approve as a supervisor first to lead group supervision.</p></Card>}

          {myGroups.length === 0 && sp.isApproved ? (
            <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">No supervision groups yet.</p></Card>
          ) : (
            <div className="space-y-2">
              {myGroups.map((g: any) => (
                <Card key={g._id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="font-medium">{g.title}</p>
                      <p className="text-xs text-muted-foreground">{g.level} · {g.totalSessions}×{g.durationMinutes}min · ₹{g.pricePer4Sessions}/{g.totalSessions} sessions</p>
                    </div>
                    <Badge variant={g.status === 'upcoming' ? 'default' : 'outline'} className="capitalize">{g.status.replace('_', ' ')}</Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* SUPERVISOR APPLICATION DIALOG */}
      <Dialog open={showSupervisorForm} onOpenChange={(o) => { if (!o) setShowSupervisorForm(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Supervisor Intake</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Therapy experience (years) *</Label>
                <Input required type="number" value={supForm.therapyExperienceYears} onChange={e => setSupForm(p => ({ ...p, therapyExperienceYears: e.target.value }))} />
              </div>
              <div>
                <Label>Supervision experience (years) *</Label>
                <Input required type="number" value={supForm.supervisionExperienceYears} onChange={e => setSupForm(p => ({ ...p, supervisionExperienceYears: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Who is it for? *</Label>
              <Input required placeholder="e.g. Students, Early-career therapists" value={supForm.audience} onChange={e => setSupForm(p => ({ ...p, audience: e.target.value }))} />
            </div>
            <div>
              <Label>Focus / Bio *</Label>
              <Textarea required rows={3} placeholder="Case discussion, ethical practice, skill-building..." value={supForm.focusBio} onChange={e => setSupForm(p => ({ ...p, focusBio: e.target.value }))} />
            </div>
            <div>
              <Label>Approach *</Label>
              <Input required placeholder="Person-centered, CBT, psychodynamic..." value={supForm.approach} onChange={e => setSupForm(p => ({ ...p, approach: e.target.value }))} />
            </div>
            <div>
              <Label>Open to *</Label>
              <Select value={supForm.openTo} onValueChange={(v) => setSupForm(p => ({ ...p, openTo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual only</SelectItem>
                  <SelectItem value="group">Group only</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Price (50 min) ₹ *</Label>
                <Input required type="number" value={supForm.individualPrice50} onChange={e => setSupForm(p => ({ ...p, individualPrice50: e.target.value }))} />
              </div>
              <div>
                <Label>Price (90 min) ₹ *</Label>
                <Input required type="number" value={supForm.individualPrice90} onChange={e => setSupForm(p => ({ ...p, individualPrice90: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowSupervisorForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={submitSupervisor} disabled={submitting} className="flex-1">{submitting ? 'Submitting...' : 'Submit for Approval'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* SUPERVISEE APPLICATION DIALOG */}
      <Dialog open={showSuperviseeForm} onOpenChange={(o) => { if (!o) setShowSuperviseeForm(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Apply for Supervision</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Experience (hours, including direct counseling during master's) *</Label>
                <Input required type="number" value={supeForm.experienceLevelHours} onChange={e => setSupeForm(p => ({ ...p, experienceLevelHours: e.target.value }))} />
              </div>
              <div>
                <Label>Current caseload *</Label>
                <Input required type="number" value={supeForm.currentCaseload} onChange={e => setSupeForm(p => ({ ...p, currentCaseload: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Goals / Expectations from supervision *</Label>
              <Textarea required rows={3} value={supeForm.goalsExpectations} onChange={e => setSupeForm(p => ({ ...p, goalsExpectations: e.target.value }))} />
            </div>
            <div>
              <Label>What approaches / modalities influence your sessions? *</Label>
              <Textarea required rows={2} placeholder="CBT, person-centered, narrative therapy..." value={supeForm.modalities} onChange={e => setSupeForm(p => ({ ...p, modalities: e.target.value }))} />
            </div>

            <Card className="p-3 bg-muted/30 text-xs whitespace-pre-wrap">{TC_TEXT}</Card>
            <label className="flex items-center gap-2">
              <Checkbox checked={supeForm.consentToGuidelines} onCheckedChange={(v) => setSupeForm(p => ({ ...p, consentToGuidelines: v === true }))} />
              <span className="text-sm">I consent to the supervision guidelines and T&Cs</span>
            </label>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowSuperviseeForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={submitSupervisee} disabled={submitting || !supeForm.consentToGuidelines} className="flex-1">{submitting ? 'Submitting...' : 'Submit'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GROUP SUPERVISION DIALOG */}
      <Dialog open={showGroupForm} onOpenChange={(o) => { if (!o) setShowGroupForm(false); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Request Group Supervision</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title *</Label>
              <Input required value={groupForm.title} onChange={e => setGroupForm(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div>
              <Label>About this group *</Label>
              <Textarea required rows={2} value={groupForm.description} onChange={e => setGroupForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Level *</Label>
                <Input required placeholder="Beginners 0-2 yrs" value={groupForm.level} onChange={e => setGroupForm(p => ({ ...p, level: e.target.value }))} />
              </div>
              <div>
                <Label>Group size *</Label>
                <Input required type="number" value={groupForm.groupSize} onChange={e => setGroupForm(p => ({ ...p, groupSize: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Format *</Label>
              <Input required placeholder="One case discussion, one theme discussion..." value={groupForm.format} onChange={e => setGroupForm(p => ({ ...p, format: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Schedule (e.g. Mon 7-9 PM) *</Label>
                <Input required value={groupForm.schedule} onChange={e => setGroupForm(p => ({ ...p, schedule: e.target.value }))} />
              </div>
              <div>
                <Label>First session start *</Label>
                <Input required type="datetime-local" value={groupForm.sessionStartAt} onChange={e => setGroupForm(p => ({ ...p, sessionStartAt: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Total sessions *</Label>
                <Input required type="number" value={groupForm.totalSessions} onChange={e => setGroupForm(p => ({ ...p, totalSessions: e.target.value }))} />
              </div>
              <div>
                <Label>Duration (min) *</Label>
                <Input required type="number" value={groupForm.durationMinutes} onChange={e => setGroupForm(p => ({ ...p, durationMinutes: e.target.value }))} />
              </div>
              <div>
                <Label>Price (lockstep) ₹ *</Label>
                <Input required type="number" value={groupForm.pricePer4Sessions} onChange={e => setGroupForm(p => ({ ...p, pricePer4Sessions: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowGroupForm(false)} className="flex-1">Cancel</Button>
              <Button onClick={submitGroup} disabled={submitting} className="flex-1">{submitting ? 'Submitting...' : 'Submit'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
