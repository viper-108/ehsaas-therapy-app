import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Users, Plus, Calendar, Lock, CheckCircle, XCircle, Loader2, ChevronRight, AlertCircle } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { CreateGroupTherapyDialog } from "@/components/CreateGroupTherapyDialog";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending_admin: { label: 'Pending admin approval', cls: 'bg-amber-500/10 text-amber-700' },
  upcoming: { label: 'Upcoming', cls: 'bg-green-500/10 text-green-700' },
  ongoing: { label: 'Ongoing', cls: 'bg-blue-500/10 text-blue-700' },
  completed: { label: 'Past', cls: 'bg-muted text-muted-foreground' },
  rejected: { label: 'Rejected by admin', cls: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground' },
};

export function TherapistGroupsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [enrollmentsByGroup, setEnrollmentsByGroup] = useState<Record<string, any[]>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Therapist must be approved+accepted for 'group' service to create groups
  const canCreateGroup = Array.isArray((user as any)?.approvedServices) &&
    (user as any).approvedServices.some((s: any) => s.type === 'group' && s.therapistAccepted);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getMyLeadingGroups();
      setGroups(data || []);
      // Load enrollments per group (parallel)
      const enrolls: Record<string, any[]> = {};
      await Promise.all((data || []).map(async (g: any) => {
        try { enrolls[g._id] = await api.getGroupEnrollments(g._id); } catch { enrolls[g._id] = []; }
      }));
      setEnrollmentsByGroup(enrolls);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleApprove = async (enrollId: string) => {
    setBusy(enrollId);
    try { await api.approveGroupEnrollment(enrollId); toast({ title: "Approved" }); load(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const handleReject = async (enrollId: string) => {
    const reason = window.prompt('Reason for rejection (optional):') || '';
    setBusy(enrollId);
    try { await api.rejectGroupEnrollment(enrollId, reason); toast({ title: "Rejected" }); load(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const handleLock = async (groupId: string) => {
    if (!window.confirm('Lock this group? Once locked, no cancellations or refunds. A chat group will auto-create with all members.')) return;
    setBusy(groupId);
    try { await api.lockGroupTherapy(groupId); toast({ title: "Locked", description: "Chat group created with all members." }); load(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const grouped = {
    pending: groups.filter(g => g.status === 'pending_admin'),
    upcoming: groups.filter(g => ['upcoming', 'ongoing'].includes(g.status)),
    past: groups.filter(g => ['completed', 'rejected', 'cancelled'].includes(g.status)),
  };

  const renderGroupCard = (g: any) => {
    const enrolls = enrollmentsByGroup[g._id] || [];
    const pendingApps = enrolls.filter(e => {
      const myApproval = e.therapistApprovals.find((a: any) => String(a.therapistId) === String((user as any)?._id));
      return e.status === 'pending_review' && myApproval && !myApproval.approved;
    });
    const enrolled = enrolls.filter(e => ['approved', 'enrolled'].includes(e.status));
    const waitlisted = enrolls.filter(e => e.status === 'waitlist');
    const hoursToStart = (new Date(g.sessionStartAt).getTime() - Date.now()) / (1000 * 60 * 60);
    const canLock = !g.isLocked && hoursToStart <= 48 && hoursToStart > 0 && ['upcoming'].includes(g.status);
    const sb = STATUS_LABELS[g.status] || { label: g.status, cls: 'bg-muted text-muted-foreground' };

    return (
      <Card key={g._id} className="p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="outline" className="capitalize">{g.groupType}</Badge>
              <Badge className={sb.cls}>{sb.label}</Badge>
              {g.isLocked && <Badge className="bg-red-500/10 text-red-700"><Lock className="w-3 h-3 mr-1" />Locked</Badge>}
            </div>
            <h3 className="text-lg font-bold text-foreground">{g.title}</h3>
            <p className="text-xs text-muted-foreground">Focus: {g.focus} · Ages {g.ageMin}-{g.ageMax} · ₹{g.pricePerMember}/member</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Starts {new Date(g.sessionStartAt).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <p className="text-sm font-semibold">{enrolled.length}/{g.maxMembers}</p>
            <p className="text-xs text-muted-foreground">enrolled</p>
            {waitlisted.length > 0 && <p className="text-xs text-amber-600">+{waitlisted.length} on waitlist</p>}
          </div>
        </div>

        {/* Action row */}
        <div className="flex gap-2 flex-wrap mb-3">
          <Button size="sm" variant="outline" onClick={() => navigate(`/group-therapy/${g._id}`)}>
            View public page <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
          {canLock && (
            <Button size="sm" disabled={busy === g._id} onClick={() => handleLock(g._id)}>
              <Lock className="w-3 h-3 mr-1" /> Lock Group (creates chat)
            </Button>
          )}
          {!canLock && !g.isLocked && hoursToStart > 48 && g.status === 'upcoming' && (
            <span className="text-xs text-muted-foreground self-center">Locks in {Math.round(hoursToStart - 48)}h</span>
          )}
        </div>

        {/* Pending applications awaiting your approval */}
        {pendingApps.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <p className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Applications awaiting your approval ({pendingApps.length})
            </p>
            <div className="space-y-2">
              {pendingApps.map((e: any) => (
                <div key={e._id} className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex justify-between items-start gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{e.clientId?.name} <span className="text-muted-foreground font-normal">({e.clientId?.email})</span></p>
                      <p className="text-xs text-muted-foreground mt-1">Age: {e.application?.age || '—'}</p>
                      {e.application?.reasonForJoining && <p className="text-xs text-muted-foreground mt-1 italic">"{e.application.reasonForJoining}"</p>}
                      {e.application?.expectations && <p className="text-xs text-muted-foreground mt-1"><strong>Expects:</strong> {e.application.expectations}</p>}
                      {e.application?.relevantHistory && <p className="text-xs text-muted-foreground mt-1"><strong>History:</strong> {e.application.relevantHistory}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        Admin: {e.adminApproved ? '✓ approved' : 'pending'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" disabled={busy === e._id} onClick={() => handleApprove(e._id)}>
                        <CheckCircle className="w-3 h-3 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" disabled={busy === e._id} onClick={() => handleReject(e._id)}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Enrolled members summary */}
        {enrolled.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Enrolled Members</p>
            <div className="flex flex-wrap gap-1">
              {enrolled.map((e: any) => (
                <Badge key={e._id} variant="secondary" className="text-xs">
                  {e.clientId?.name} {e.paymentStatus === 'paid' ? '✓' : '○'}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> My Group Therapy</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {canCreateGroup
              ? 'Create new groups, manage applications, and lock groups before start.'
              : 'You\'re not yet approved for the "Group Therapy" service. Once admin finalizes that service and you accept it, you can create groups.'}
          </p>
        </div>
        {canCreateGroup && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" /> Request New Group
          </Button>
        )}
      </div>

      {!canCreateGroup && (
        <Card className="p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-900 dark:text-amber-200">
            <strong>How to enable Group Therapy:</strong> During your onboarding, ensure "Group Therapy" is selected in your services. After admin reviews and finalizes the price, you'll be able to accept it from the Earnings tab — that unlocks group creation here.
          </p>
        </Card>
      )}

      {loading ? (
        <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></Card>
      ) : groups.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">You haven't created any groups yet.</p>
          {canCreateGroup && (
            <Button className="mt-3" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Create Your First Group
            </Button>
          )}
        </Card>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Active ({grouped.upcoming.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending Approval ({grouped.pending.length})</TabsTrigger>
            <TabsTrigger value="past">Past ({grouped.past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {grouped.upcoming.length === 0 ? <p className="text-sm text-muted-foreground italic text-center py-6">No active groups.</p> : grouped.upcoming.map(renderGroupCard)}
          </TabsContent>
          <TabsContent value="pending" className="space-y-3 mt-4">
            {grouped.pending.length === 0 ? <p className="text-sm text-muted-foreground italic text-center py-6">No pending requests.</p> : grouped.pending.map(renderGroupCard)}
          </TabsContent>
          <TabsContent value="past" className="space-y-3 mt-4">
            {grouped.past.length === 0 ? <p className="text-sm text-muted-foreground italic text-center py-6">No past groups.</p> : grouped.past.map(renderGroupCard)}
          </TabsContent>
        </Tabs>
      )}

      <CreateGroupTherapyDialog isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  );
}
