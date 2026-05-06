import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, Loader2 } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  groupId: string;
  totalSessions: number;
  enrollments: any[];                  // approved/enrolled
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function GroupEffectivenessDialog({ groupId, totalSessions, enrollments, isOpen, onClose, onSaved }: Props) {
  const { toast } = useToast();
  const [sessionNumber, setSessionNumber] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allIndicators, setAllIndicators] = useState<any[]>([]);
  const [data, setData] = useState({
    attendanceCount: '',
    topicCovered: '',
    goalForSession: '',
    goalAchieved: '',
    interventions: '',
    processingNotes: '',
    groupDynamics: '',
    notableMoments: '',
    overallMood: '',
    participationLevel: '',
    conflictsBiasesCountertransferences: '',
    crisisOccurred: '',
    memberFeedbacks: '',
    selfReflection: '',
    questionsForSupervision: '',
  });

  // Per-session attendance
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.getGroupEffectiveness(groupId).then((list: any[]) => {
      setAllIndicators(list || []);
      // Default to next un-filled session, else session 1
      const filledNums = new Set((list || []).map((x: any) => x.sessionNumber));
      let pick = 1;
      for (let i = 1; i <= totalSessions; i++) { if (!filledNums.has(i)) { pick = i; break; } }
      setSessionNumber(pick);
    }).catch(() => setAllIndicators([])).finally(() => setLoading(false));
  }, [isOpen, groupId, totalSessions]);

  // When session changes, hydrate from existing data + reset attendance from enrollments
  useEffect(() => {
    const existing = allIndicators.find(x => x.sessionNumber === sessionNumber);
    setData({
      attendanceCount: existing?.attendanceCount != null ? String(existing.attendanceCount) : String(enrollments.length),
      topicCovered: existing?.topicCovered || '',
      goalForSession: existing?.goalForSession || '',
      goalAchieved: existing?.goalAchieved || '',
      interventions: existing?.interventions || '',
      processingNotes: existing?.processingNotes || '',
      groupDynamics: existing?.groupDynamics || '',
      notableMoments: existing?.notableMoments || '',
      overallMood: existing?.overallMood || '',
      participationLevel: existing?.participationLevel || '',
      conflictsBiasesCountertransferences: existing?.conflictsBiasesCountertransferences || '',
      crisisOccurred: existing?.crisisOccurred || '',
      memberFeedbacks: existing?.memberFeedbacks || '',
      selfReflection: existing?.selfReflection || '',
      questionsForSupervision: existing?.questionsForSupervision || '',
    });
    // Hydrate attendance from each enrollment.attendance for this session number
    const att: Record<string, boolean> = {};
    enrollments.forEach((e: any) => {
      const rec = (e.attendance || []).find((a: any) => a.sessionNumber === sessionNumber);
      att[e._id] = !!rec?.attended;
    });
    setAttendance(att);
  }, [sessionNumber, allIndicators, enrollments]);

  const set = (k: string, v: string) => setData(p => ({ ...p, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      // Save attendance first
      const records = Object.entries(attendance).map(([enrollmentId, attended]) => ({ enrollmentId, attended }));
      await api.saveGroupAttendance(groupId, sessionNumber, records);

      // Compute attendance count from records if user didn't override
      const auto = records.filter(r => r.attended).length;
      const finalAttendanceCount = data.attendanceCount ? Number(data.attendanceCount) : auto;

      await api.saveGroupEffectiveness(groupId, sessionNumber, {
        ...data,
        attendanceCount: finalAttendanceCount,
        sessionDate: new Date(),
      });
      toast({ title: "Session indicators saved" });
      onSaved?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-primary" /> Group Effectiveness Indicators
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <Label className="m-0">Session #</Label>
              <Select value={String(sessionNumber)} onValueChange={(v) => setSessionNumber(Number(v))}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalSessions }, (_, i) => i + 1).map(n => (
                    <SelectItem key={n} value={String(n)}>Session {n}{allIndicators.some(x => x.sessionNumber === n) ? ' ✓' : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">Sessions with ✓ already have indicators saved.</span>
            </div>

            {/* Attendance per member */}
            <div className="border rounded-lg p-3">
              <p className="font-semibold text-sm mb-2">Attendance ({Object.values(attendance).filter(Boolean).length} of {enrollments.length})</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {enrollments.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No enrolled members yet.</p>
                ) : enrollments.map((e: any) => (
                  <label key={e._id} className="flex items-center gap-2 p-2 hover:bg-muted/40 rounded cursor-pointer">
                    <Checkbox checked={attendance[e._id] || false} onCheckedChange={(v) => setAttendance(p => ({ ...p, [e._id]: v === true }))} />
                    <span className="text-sm">{e.clientId?.name || 'Member'}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label>Topic covered</Label>
              <Textarea rows={2} value={data.topicCovered} onChange={e => set('topicCovered', e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>What was my goal for this session?</Label>
                <Textarea rows={2} value={data.goalForSession} onChange={e => set('goalForSession', e.target.value)} />
              </div>
              <div>
                <Label>Did we meet that?</Label>
                <Textarea rows={2} value={data.goalAchieved} onChange={e => set('goalAchieved', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Interventions used</Label>
              <Textarea rows={2} value={data.interventions} onChange={e => set('interventions', e.target.value)} />
            </div>
            <div>
              <Label>How did the processing go?</Label>
              <Textarea rows={2} value={data.processingNotes} onChange={e => set('processingNotes', e.target.value)} />
            </div>
            <div>
              <Label>Group dynamics (brief)</Label>
              <Textarea rows={2} value={data.groupDynamics} onChange={e => set('groupDynamics', e.target.value)} />
            </div>
            <div>
              <Label>Notable moments</Label>
              <Textarea rows={2} value={data.notableMoments} onChange={e => set('notableMoments', e.target.value)} />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Overall mood of the group</Label>
                <Input value={data.overallMood} onChange={e => set('overallMood', e.target.value)} />
              </div>
              <div>
                <Label>Overall participation level</Label>
                <Select value={data.participationLevel} onValueChange={(v) => set('participationLevel', v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Conflicts / biases / countertransferences</Label>
              <Textarea rows={2} value={data.conflictsBiasesCountertransferences} onChange={e => set('conflictsBiasesCountertransferences', e.target.value)} />
            </div>
            <div>
              <Label>Crisis (if any)</Label>
              <Textarea rows={2} value={data.crisisOccurred} onChange={e => set('crisisOccurred', e.target.value)} />
            </div>
            <div>
              <Label>Member feedbacks</Label>
              <Textarea rows={2} value={data.memberFeedbacks} onChange={e => set('memberFeedbacks', e.target.value)} />
            </div>
            <div>
              <Label>Self-reflection (therapist)</Label>
              <Textarea rows={2} value={data.selfReflection} onChange={e => set('selfReflection', e.target.value)} />
            </div>
            <div>
              <Label>Questions for supervision</Label>
              <Textarea rows={2} value={data.questionsForSupervision} onChange={e => set('questionsForSupervision', e.target.value)} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={submit} disabled={busy} className="flex-1">{busy ? 'Saving...' : 'Save Indicators'}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
