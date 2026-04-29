import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Users, Calendar, Clock, Loader2, Lock, UserPlus, ChevronLeft, IndianRupee, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { EnrollGroupDialog } from "@/components/EnrollGroupDialog";

export default function GroupTherapyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [group, setGroup] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getGroupTherapy(id);
      setGroup(data);
      if (role === 'client') {
        const en = await api.getMyGroupEnrollments().catch(() => []);
        setMyEnrollments(en || []);
      }
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-background"><Navigation />
      <div className="max-w-4xl mx-auto px-4 py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>
    </div>
  );
  if (!group) return (
    <div className="min-h-screen bg-background"><Navigation />
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground mb-4">Group not found.</p>
        <Button onClick={() => navigate('/group-therapy')}>Back to Groups</Button>
      </div>
    </div>
  );

  const myEnroll = myEnrollments.find(e => String(e.groupId?._id || e.groupId) === String(group._id));
  const startDate = new Date(group.sessionStartAt);
  const isFull = (group.enrolledCount || 0) >= group.maxMembers;
  const live = group.liveStatus || group.status;
  const isLead = role === 'therapist' && (group.leadTherapists || []).some((t: any) => String(t._id) === String((user as any)?._id));
  const isAdmin = role === 'admin';
  const canLock = !group.isLocked && (isLead || isAdmin) && live !== 'completed';
  const hoursToStart = (new Date(group.sessionStartAt).getTime() - Date.now()) / (1000 * 60 * 60);

  const handleLock = async () => {
    if (!window.confirm('Lock this group? Once locked, no more cancellations or refunds. A chat group will auto-create with all members.')) return;
    setBusy(true);
    try { await api.lockGroupTherapy(group._id); toast({ title: "Locked", description: "Chat group created with all members." }); load(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handleCancel = async () => {
    if (!myEnroll) return;
    if (!window.confirm('Cancel your enrollment? If approved, the next person on the waitlist will get your spot.')) return;
    setBusy(true);
    try {
      await fetch(`${(import.meta as any).env?.PROD ? '/api' : 'http://localhost:5001/api'}/group-therapy/enrollments/${myEnroll._id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('ehsaas_token')}` }
      });
      toast({ title: "Cancelled" }); load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const statusBadge = () => {
    if (group.isLocked) return <Badge className="bg-red-500/10 text-red-700"><Lock className="w-3 h-3 mr-1" />Locked</Badge>;
    if (live === 'completed') return <Badge variant="secondary">Past</Badge>;
    if (live === 'ongoing') return <Badge className="bg-amber-500/10 text-amber-700">Ongoing</Badge>;
    if (isFull) return <Badge className="bg-orange-500/10 text-orange-700">Full · Waitlist Open</Badge>;
    return <Badge className="bg-green-500/10 text-green-700">Open</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-10">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/group-therapy')}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to all groups
        </Button>

        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="capitalize">{group.groupType}</Badge>
                {statusBadge()}
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{group.title}</h1>
              <p className="text-primary text-lg flex items-center gap-2"><Target className="w-4 h-4" />Focus: {group.focus}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">₹{group.pricePerMember}</p>
              <p className="text-xs text-muted-foreground">per member</p>
              {group.totalSessions > 1 && <p className="text-xs text-muted-foreground">× {group.totalSessions} sessions</p>}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3"><Calendar className="w-5 h-5 text-primary" /><h3 className="font-semibold">Schedule</h3></div>
            <p className="text-sm"><strong>First session:</strong> {startDate.toLocaleString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            {group.sessionEndAt && <p className="text-sm mt-1"><strong>Last session:</strong> {new Date(group.sessionEndAt).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</p>}
            <p className="text-sm mt-1"><strong>Total sessions:</strong> {group.totalSessions || 1}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3"><Users className="w-5 h-5 text-primary" /><h3 className="font-semibold">Group Info</h3></div>
            <p className="text-sm"><strong>Capacity:</strong> {group.enrolledCount || 0} / {group.maxMembers} members</p>
            <p className="text-sm mt-1"><strong>Age range:</strong> {group.ageMin} - {group.ageMax}</p>
            <p className="text-sm mt-1"><strong>Type:</strong> {group.groupType === 'open' ? 'Open (drop-in)' : 'Closed (start & finish together)'}</p>
            {group.mode && <p className="text-sm mt-1"><strong>Mode:</strong> <span className="capitalize">{group.mode}</span></p>}
            {group.language && <p className="text-sm mt-1"><strong>Language:</strong> {group.language}</p>}
            {group.frequency && <p className="text-sm mt-1"><strong>Frequency:</strong> {group.frequency}</p>}
            {group.durationMinutes && <p className="text-sm mt-1"><strong>Per session:</strong> {group.durationMinutes} min</p>}
            {group.genderPreference && group.genderPreference !== 'all' && <p className="text-sm mt-1"><strong>Open to:</strong> {group.genderPreference}</p>}
          </Card>
        </div>

        {group.brochureUrl && (
          <Card className="p-3 mb-6 overflow-hidden">
            <img src={group.brochureUrl} alt="Group brochure" className="w-full h-auto rounded" />
          </Card>
        )}

        {group.description && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-2">About this group</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{group.description}</p>
          </Card>
        )}

        {Array.isArray(group.themes) && group.themes.length > 0 && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-2">Themes & Topics</h3>
            <div className="flex flex-wrap gap-2">
              {group.themes.map((th: string) => (
                <Badge key={th} variant="secondary" className="text-xs">{th}</Badge>
              ))}
            </div>
          </Card>
        )}

        {group.audienceDescription && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-2">Who is this for?</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{group.audienceDescription}</p>
          </Card>
        )}

        {group.contraindications && (
          <Card className="p-5 mb-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <h3 className="font-semibold mb-2 text-amber-900 dark:text-amber-200">Who is this NOT for?</h3>
            <p className="text-sm text-amber-800 dark:text-amber-100 whitespace-pre-wrap leading-relaxed">{group.contraindications}</p>
          </Card>
        )}

        {group.outcomes && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-2">Outcomes & Goals</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{group.outcomes}</p>
          </Card>
        )}

        {group.rationale && (
          <details className="mb-6">
            <summary className="cursor-pointer p-4 bg-card rounded-lg border font-semibold">Rationale</summary>
            <Card className="p-5 mt-2">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{group.rationale}</p>
            </Card>
          </details>
        )}

        {group.planProcedure && (
          <details className="mb-6">
            <summary className="cursor-pointer p-4 bg-card rounded-lg border font-semibold">Session-by-session plan</summary>
            <Card className="p-5 mt-2">
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">{group.planProcedure}</pre>
            </Card>
          </details>
        )}

        {group.policyText && (
          <Card className="p-5 mb-6 bg-muted/30">
            <h3 className="font-semibold mb-3 flex items-center gap-2">📋 Confidentiality, Ground Rules, Crisis & Refund Policy</h3>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">{group.policyText}</pre>
          </Card>
        )}

        {group.leadTherapists && group.leadTherapists.length > 0 && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-3">Led by</h3>
            <div className="space-y-3">
              {group.leadTherapists.map((t: any) => (
                <div key={t._id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate(`/psychologist/${t._id}`)}>
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 overflow-hidden">
                    {t.image ? <img src={t.image} alt="" className="w-full h-full object-cover" /> : (t.name?.[0] || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{t.name}</p>
                    {t.title && <p className="text-xs text-muted-foreground">{t.title}</p>}
                    {t.specializations && t.specializations.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {t.specializations.slice(0, 4).map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                        ))}
                      </div>
                    )}
                    {t.bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{t.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action Bar */}
        <Card className="p-5 sticky bottom-4 shadow-lg">
          {role === 'client' ? (
            myEnroll ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Your application status: <Badge className="capitalize">{myEnroll.status.replace('_', ' ')}</Badge></p>
                  {myEnroll.rejectionReason && <p className="text-xs text-destructive mt-1">{myEnroll.rejectionReason}</p>}
                  {myEnroll.paymentStatus !== 'paid' && myEnroll.status === 'approved' && (
                    <p className="text-xs text-muted-foreground mt-1">Complete payment to lock your spot.</p>
                  )}
                  {myEnroll.attendance && myEnroll.attendance.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Attendance: {(myEnroll.attendance.filter((a: any) => a.attended)).length} / {group.totalSessions || 1} attended
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {!group.isLocked && !['cancelled', 'rejected', 'enrolled', 'dropped'].includes(myEnroll.status) && (
                    <Button size="sm" variant="outline" disabled={busy} onClick={handleCancel}>Cancel application</Button>
                  )}
                  {/* Drop off — only for paid + enrolled members BEFORE lock */}
                  {!group.isLocked && ['enrolled', 'approved'].includes(myEnroll.status) && (
                    <Button size="sm" variant="outline" className="border-amber-500 text-amber-700" disabled={busy} onClick={async () => {
                      const reason = window.prompt('Reason for leaving (optional):') || '';
                      if (!window.confirm(group.groupType === 'closed'
                        ? 'Drop off this closed group? You will be refunded 50% of remaining sessions. No refund after the group is locked.'
                        : 'Leave this open group? Per policy, no refund for sessions already paid.')) return;
                      setBusy(true);
                      try {
                        const r = await api.dropOffGroup(myEnroll._id, reason);
                        toast({ title: "You've dropped off", description: r.refundAmount ? `Partial refund: ₹${r.refundAmount}` : 'No refund issued.' });
                        load();
                      } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                      finally { setBusy(false); }
                    }}>Drop Off / Leave Group</Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">{isFull ? 'Group is currently full — apply to join the waitlist.' : 'Spots available.'}</p>
                <Button disabled={group.isLocked || live === 'completed'} onClick={() => setShowEnroll(true)}>
                  <UserPlus className="w-4 h-4 mr-2" /> Apply to Join
                </Button>
              </div>
            )
          ) : (canLock || isLead || isAdmin) ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {hoursToStart > 48 ? `Locks in ${Math.round(hoursToStart - 48)} hours` : group.isLocked ? 'Group is locked.' : 'Lock the group now to create the chat.'}
              </p>
              {canLock && (
                <Button size="sm" disabled={busy || (!isAdmin && hoursToStart > 48)} onClick={handleLock}>
                  <Lock className="w-3 h-3 mr-1" /> Lock Group
                </Button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in as a client to apply.</p>
          )}
        </Card>
      </div>

      {showEnroll && group && (
        <EnrollGroupDialog group={group} isOpen={showEnroll} onClose={() => setShowEnroll(false)} onEnrolled={load} />
      )}
    </div>
  );
}
