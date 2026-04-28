import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Calendar, Clock, Loader2, Lock, UserPlus, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { CreateGroupTherapyDialog } from "@/components/CreateGroupTherapyDialog";
import { EnrollGroupDialog } from "@/components/EnrollGroupDialog";

const GroupTherapy = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'upcoming' | 'ongoing' | 'past' | 'all'>('upcoming');
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [enrollGroup, setEnrollGroup] = useState<any | null>(null);
  const [myEnrollments, setMyEnrollments] = useState<any[]>([]);

  // Therapist-only: check if approved+accepted for 'group' service
  const canCreateGroup = role === 'therapist' && Array.isArray((user as any)?.approvedServices) &&
    (user as any).approvedServices.some((s: any) => s.type === 'group' && s.therapistAccepted);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listGroupTherapy(filter);
      setGroups(data);
      if (role === 'client') {
        const en = await api.getMyGroupEnrollments().catch(() => []);
        setMyEnrollments(en);
      }
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const enrollmentFor = (gid: string) => myEnrollments.find(e => String(e.groupId?._id || e.groupId) === String(gid));

  const statusBadge = (g: any) => {
    const s = g.liveStatus || g.status;
    const isFull = (g.enrolledCount || 0) >= g.maxMembers;
    if (s === 'completed') return <Badge variant="secondary">Past</Badge>;
    if (s === 'ongoing') return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200">Ongoing</Badge>;
    if (g.isLocked) return <Badge className="bg-red-500/10 text-red-700"><Lock className="w-3 h-3 mr-1" />Locked</Badge>;
    if (isFull) return <Badge className="bg-orange-500/10 text-orange-700">Full · Waitlist Open</Badge>;
    if (g.enrolledCount >= g.maxMembers - 1) return <Badge className="bg-yellow-500/10 text-yellow-700">Filling fast</Badge>;
    return <Badge className="bg-green-500/10 text-green-700">Open</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">Group Therapy</h1>
              <p className="text-muted-foreground max-w-2xl">
                Join a small group of 5–10 people working on similar challenges. Open groups welcome new members anytime; closed groups start and end together for deeper trust.
              </p>
            </div>
            {canCreateGroup && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Request New Group
              </Button>
            )}
          </div>

          {/* Filter tabs */}
          <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="mb-6">
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></Card>
          ) : groups.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No {filter === 'all' ? '' : filter} groups available right now.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon — new groups open frequently.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((g: any) => {
                const myEnroll = enrollmentFor(g._id);
                const startDate = new Date(g.sessionStartAt);
                return (
                  <Card key={g._id} className="p-5 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                      <Badge variant="outline" className="capitalize">{g.groupType}</Badge>
                      {statusBadge(g)}
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-1">{g.title}</h3>
                    <p className="text-sm text-primary mb-2">Focus: {g.focus}</p>
                    {g.description && <p className="text-xs text-muted-foreground line-clamp-3 mb-3">{g.description}</p>}

                    <div className="space-y-1.5 text-xs text-muted-foreground mb-4">
                      <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /> Starts {startDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> {g.enrolledCount || 0} / {g.maxMembers} enrolled</p>
                      <p className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Ages {g.ageMin}-{g.ageMax}</p>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className="text-lg font-bold text-foreground">₹{g.pricePerMember}<span className="text-xs text-muted-foreground font-normal">/member</span></span>
                      {role === 'client' ? (
                        myEnroll ? (
                          <Badge variant="secondary" className="capitalize">{myEnroll.status.replace('_', ' ')}</Badge>
                        ) : (
                          <Button size="sm" disabled={g.isLocked || g.liveStatus === 'completed'} onClick={() => setEnrollGroup(g)}>
                            <UserPlus className="w-3 h-3 mr-1" /> Apply
                          </Button>
                        )
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/group-therapy/${g._id}`)}>
                          View Details
                        </Button>
                      )}
                    </div>

                    {g.leadTherapists && g.leadTherapists.length > 0 && (
                      <div className="mt-3 pt-3 border-t flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Led by:</span>
                        <div className="flex -space-x-2">
                          {g.leadTherapists.map((t: any) => (
                            <div key={t._id} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-bold text-primary" title={t.name}>
                              {t.name?.[0] || '?'}
                            </div>
                          ))}
                        </div>
                        <span className="text-xs text-foreground truncate">
                          {g.leadTherapists.map((t: any) => t.name).join(' & ')}
                        </span>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* My applications (clients only) */}
          {role === 'client' && myEnrollments.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold text-foreground mb-4">My Applications</h2>
              <div className="space-y-2">
                {myEnrollments.map(e => (
                  <Card key={e._id} className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{e.groupId?.title || 'Group'}</p>
                        <p className="text-xs text-muted-foreground">Applied {new Date(e.createdAt).toLocaleDateString('en-IN')}</p>
                      </div>
                      <Badge className="capitalize">{e.status.replace('_', ' ')}</Badge>
                    </div>
                    {e.rejectionReason && <p className="text-xs text-destructive mt-2">{e.rejectionReason}</p>}
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateGroupTherapyDialog isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
      {enrollGroup && (
        <EnrollGroupDialog
          group={enrollGroup}
          isOpen={!!enrollGroup}
          onClose={() => setEnrollGroup(null)}
          onEnrolled={load}
        />
      )}
    </div>
  );
};

export default GroupTherapy;
