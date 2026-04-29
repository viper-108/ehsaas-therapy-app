import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Plus, Loader2, ChevronRight, Award, ClipboardList } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { CreateWorkshopDialog } from "@/components/CreateWorkshopDialog";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending_admin: { label: 'Pending admin approval', cls: 'bg-amber-500/10 text-amber-700' },
  upcoming: { label: 'Upcoming', cls: 'bg-green-500/10 text-green-700' },
  ongoing: { label: 'Ongoing', cls: 'bg-blue-500/10 text-blue-700' },
  completed: { label: 'Past', cls: 'bg-muted text-muted-foreground' },
  rejected: { label: 'Rejected', cls: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground' },
};

export function TherapistWorkshopsTab() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [registrationsByWorkshop, setRegistrationsByWorkshop] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [summaryWorkshop, setSummaryWorkshop] = useState<any>(null);
  const [summary, setSummary] = useState({
    attendanceCount: '', topicsCovered: '', keyTakeaways: '', activitiesConducted: '',
    participantEngagement: '', whatToImprove: '', learningOutcomesAchieved: '',
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.getMyFacilitatingWorkshops();
      setWorkshops(list || []);
      const regs: Record<string, any[]> = {};
      await Promise.all((list || []).map(async (w: any) => {
        try { regs[w._id] = await api.getWorkshopRegistrations(w._id); } catch { regs[w._id] = []; }
      }));
      setRegistrationsByWorkshop(regs);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const grouped = {
    upcoming: workshops.filter(w => ['upcoming', 'ongoing'].includes(w.status)),
    pending: workshops.filter(w => w.status === 'pending_admin'),
    past: workshops.filter(w => ['completed', 'rejected', 'cancelled'].includes(w.status)),
  };

  const renderCard = (w: any) => {
    const regs = registrationsByWorkshop[w._id] || [];
    const paid = regs.filter(r => r.paymentStatus === 'paid');
    const sb = STATUS_LABELS[w.status] || { label: w.status, cls: 'bg-muted text-muted-foreground' };
    const firstDate = w.sessionDates?.[0] ? new Date(w.sessionDates[0]) : null;
    const isPast = w.status === 'completed' || (firstDate && new Date() > new Date(firstDate.getTime() + (w.durationMinutes || 90) * 60000 * w.sessionDates.length));

    return (
      <Card key={w._id} className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge className={sb.cls}>{sb.label}</Badge>
              {w.certificateProvided && <Badge variant="outline" className="text-xs"><Award className="w-3 h-3 mr-1" />Certificate</Badge>}
            </div>
            <h3 className="text-lg font-bold text-foreground">{w.title}</h3>
            <p className="text-xs text-muted-foreground">Topic: {w.topic} · ₹{w.pricePerParticipant}/participant</p>
            {firstDate && <p className="text-xs text-muted-foreground mt-1">Starts {firstDate.toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">{paid.length} paid</p>
            <p className="text-muted-foreground">{regs.length} registered</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={() => navigate(`/workshops/${w._id}`)}>
            View public page <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
          {isPast && !w.sessionSummary?.submittedAt && (
            <Button size="sm" onClick={() => {
              setSummaryWorkshop(w);
              setSummary({
                attendanceCount: String(paid.length),
                topicsCovered: '', keyTakeaways: '', activitiesConducted: '',
                participantEngagement: 'medium', whatToImprove: '', learningOutcomesAchieved: '',
              });
            }}>
              <ClipboardList className="w-3 h-3 mr-1" /> Submit Session Summary
            </Button>
          )}
          {w.sessionSummary?.submittedAt && (
            <Badge className="bg-success/10 text-success self-center">Summary submitted</Badge>
          )}
        </div>

        {regs.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs font-semibold mb-2">Participants</p>
            <div className="flex flex-wrap gap-1">
              {regs.map(r => (
                <Badge key={r._id} variant="secondary" className="text-xs">
                  {r.clientId?.name} {r.paymentStatus === 'paid' ? '✓' : r.attended ? '◉' : '○'}
                </Badge>
              ))}
            </div>
            {isPast && paid.length > 0 && (
              <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={async () => {
                // Quick attendance: mark all paid as attended
                if (!window.confirm(`Mark all ${paid.length} paid participants as attended?`)) return;
                try {
                  await api.setWorkshopAttendance(w._id, paid.map(r => ({ id: r._id, attended: true })));
                  toast({ title: "Attendance marked" });
                  load();
                } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
              }}>
                Mark all paid as attended
              </Button>
            )}
          </div>
        )}
      </Card>
    );
  };

  const submitSummary = async () => {
    if (!summaryWorkshop) return;
    setBusy(true);
    try {
      await api.submitWorkshopSummary(summaryWorkshop._id, {
        ...summary, attendanceCount: Number(summary.attendanceCount) || 0,
      });
      toast({ title: "Session summary saved" });
      setSummaryWorkshop(null);
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" /> My Workshops</h2>
          <p className="text-xs text-muted-foreground mt-1">Create new workshops, manage registrations, and submit session summaries.</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Request New Workshop
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></Card>
      ) : workshops.length === 0 ? (
        <Card className="p-12 text-center">
          <GraduationCap className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">You haven't created any workshops yet.</p>
          <Button className="mt-3" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Create Your First Workshop</Button>
        </Card>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Active ({grouped.upcoming.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({grouped.pending.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({grouped.past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {grouped.upcoming.length === 0 ? <p className="text-sm text-muted-foreground italic text-center py-6">No active workshops.</p> : grouped.upcoming.map(renderCard)}
          </TabsContent>
          <TabsContent value="pending" className="space-y-3 mt-4">
            {grouped.pending.length === 0 ? <p className="text-sm text-muted-foreground italic text-center py-6">No pending requests.</p> : grouped.pending.map(renderCard)}
          </TabsContent>
          <TabsContent value="past" className="space-y-3 mt-4">
            {grouped.past.length === 0 ? <p className="text-sm text-muted-foreground italic text-center py-6">No past workshops.</p> : grouped.past.map(renderCard)}
          </TabsContent>
        </Tabs>
      )}

      <CreateWorkshopDialog isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />

      {/* Session Summary Dialog */}
      <Dialog open={!!summaryWorkshop} onOpenChange={(o) => { if (!o) setSummaryWorkshop(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Session Summary — {summaryWorkshop?.title}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Attendance count</Label>
              <Input type="number" value={summary.attendanceCount} onChange={e => setSummary(p => ({ ...p, attendanceCount: e.target.value }))} />
            </div>
            <div>
              <Label>Topics covered</Label>
              <Textarea rows={2} value={summary.topicsCovered} onChange={e => setSummary(p => ({ ...p, topicsCovered: e.target.value }))} />
            </div>
            <div>
              <Label>Key takeaways</Label>
              <Textarea rows={2} value={summary.keyTakeaways} onChange={e => setSummary(p => ({ ...p, keyTakeaways: e.target.value }))} />
            </div>
            <div>
              <Label>Activities conducted</Label>
              <Textarea rows={2} value={summary.activitiesConducted} onChange={e => setSummary(p => ({ ...p, activitiesConducted: e.target.value }))} />
            </div>
            <div>
              <Label>Participant engagement</Label>
              <Select value={summary.participantEngagement} onValueChange={(v) => setSummary(p => ({ ...p, participantEngagement: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>What to improve next time</Label>
              <Textarea rows={2} value={summary.whatToImprove} onChange={e => setSummary(p => ({ ...p, whatToImprove: e.target.value }))} />
            </div>
            <div>
              <Label>Learning outcomes achieved? (Why / why not)</Label>
              <Textarea rows={3} value={summary.learningOutcomesAchieved} onChange={e => setSummary(p => ({ ...p, learningOutcomesAchieved: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setSummaryWorkshop(null)} className="flex-1">Cancel</Button>
              <Button onClick={submitSummary} disabled={busy} className="flex-1">{busy ? 'Saving...' : 'Submit Summary'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
