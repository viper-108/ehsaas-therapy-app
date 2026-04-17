import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, UserX, Clock, Calendar, DollarSign, BarChart3,
  CheckCircle, XCircle, LogOut, ChevronRight, Shield, Loader2, Star, TrendingUp
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import Navigation from "@/components/Navigation";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const statusBadge = (status: string) => {
  switch (status) {
    case 'approved': return <Badge className="bg-success/10 text-success border-success/20">Approved</Badge>;
    case 'pending_approval': return <Badge className="bg-warm/10 text-warm border-warm/20">Pending</Badge>;
    case 'rejected': return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
    case 'not_started': return <Badge variant="outline">Not Started</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const sessionStatusBadge = (status: string) => {
  switch (status) {
    case 'scheduled': return <Badge className="bg-primary/10 text-primary">Scheduled</Badge>;
    case 'completed': return <Badge className="bg-success/10 text-success">Completed</Badge>;
    case 'cancelled': return <Badge className="bg-destructive/10 text-destructive">Cancelled</Badge>;
    case 'no-show': return <Badge variant="outline">No Show</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
};

const AdminDashboard = () => {
  const { user, role, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [allTherapists, setAllTherapists] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; therapistId: string; name: string }>({ open: false, therapistId: '', name: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [detailModal, setDetailModal] = useState<{ open: boolean; type: 'therapist' | 'client'; data: any | null; loading: boolean }>({ open: false, type: 'therapist', data: null, loading: false });
  const [allReviews, setAllReviews] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || role !== 'admin') {
      navigate('/');
      return;
    }
    loadAll();
  }, [user, role, authLoading]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [statsData, pendingData, therapistsData, clientsData, sessionsData, reviewsData] = await Promise.all([
        api.getAdminStats(),
        api.getPendingTherapists(),
        api.getAllTherapistsAdmin(),
        api.getAllClients(),
        api.getAllSessions(),
        api.getAllReviews().catch(() => []),
      ]);
      setStats(statsData);
      setPending(pendingData);
      setAllTherapists(therapistsData);
      setAllClients(clientsData);
      setAllSessions(sessionsData);
      setAllReviews(reviewsData);
    } catch (error) {
      console.error('Admin dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.approveTherapist(id);
      toast({ title: "Approved", description: "Therapist has been approved and is now visible to clients." });
      loadAll();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async () => {
    try {
      await api.rejectTherapist(rejectModal.therapistId, rejectReason);
      toast({ title: "Rejected", description: "Therapist application has been rejected." });
      setRejectModal({ open: false, therapistId: '', name: '' });
      setRejectReason('');
      loadAll();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openTherapistDetail = async (id: string) => {
    setDetailModal({ open: true, type: 'therapist', data: null, loading: true });
    try {
      const data = await api.getTherapistDetails(id);
      setDetailModal({ open: true, type: 'therapist', data, loading: false });
    } catch {
      setDetailModal(prev => ({ ...prev, loading: false }));
    }
  };

  const openClientDetail = async (id: string) => {
    setDetailModal({ open: true, type: 'client', data: null, loading: true });
    try {
      const data = await api.getClientDetails(id);
      setDetailModal({ open: true, type: 'client', data, loading: false });
    } catch {
      setDetailModal(prev => ({ ...prev, loading: false }));
    }
  };

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-muted-foreground">Welcome, {user.name}</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => { logout(); navigate('/'); }}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="pending">
                  <Clock className="w-4 h-4 mr-2" />
                  Pending ({pending.length})
                </TabsTrigger>
                <TabsTrigger value="therapists"><UserCheck className="w-4 h-4 mr-2" />Therapists</TabsTrigger>
                <TabsTrigger value="clients"><Users className="w-4 h-4 mr-2" />Clients</TabsTrigger>
                <TabsTrigger value="sessions"><Calendar className="w-4 h-4 mr-2" />Sessions</TabsTrigger>
                <TabsTrigger value="stats"><BarChart3 className="w-4 h-4 mr-2" />Statistics</TabsTrigger>
                <TabsTrigger value="reviews"><Star className="w-4 h-4 mr-2" />Reviews</TabsTrigger>
                <TabsTrigger value="analytics"><TrendingUp className="w-4 h-4 mr-2" />Analytics</TabsTrigger>
              </TabsList>

              {/* ========== PENDING REQUESTS ========== */}
              <TabsContent value="pending">
                <h2 className="text-xl font-semibold text-foreground mb-4">Pending Therapist Requests</h2>
                {pending.length === 0 ? (
                  <Card className="p-12 text-center">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending requests. All caught up!</p>
                  </Card>
                ) : (
                  <div className="space-y-6">
                    {pending.map(therapist => (
                      <Card key={therapist._id} className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground">{therapist.name}</h3>
                            <p className="text-muted-foreground">{therapist.title}</p>
                          </div>
                          {statusBadge(therapist.onboardingStatus)}
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="text-foreground">{therapist.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="text-foreground">{therapist.phone || 'Not provided'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Experience</p>
                            <p className="text-foreground">{therapist.experience} years</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Languages</p>
                            <p className="text-foreground">{(therapist.languages || []).join(', ')}</p>
                          </div>
                        </div>

                        {therapist.specializations?.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-2">Specializations</p>
                            <div className="flex flex-wrap gap-2">
                              {therapist.specializations.map((s: string) => (
                                <Badge key={s} variant="secondary">{s}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {therapist.pricing && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-2">Pricing</p>
                            <div className="flex gap-3">
                              {Object.entries(therapist.pricing).map(([d, p]: [string, any]) => (
                                <span key={d} className="bg-primary/10 text-primary px-3 py-1 rounded text-sm">
                                  ₹{p} / {d} min
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {therapist.bio && (
                          <div className="mb-4">
                            <p className="text-sm text-muted-foreground mb-1">Bio</p>
                            <p className="text-foreground text-sm">{therapist.bio}</p>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground mb-4">
                          Applied: {new Date(therapist.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>

                        <div className="flex gap-3">
                          <Button onClick={() => handleApprove(therapist._id)} className="flex-1">
                            <CheckCircle className="w-4 h-4 mr-2" /> Approve
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => setRejectModal({ open: true, therapistId: therapist._id, name: therapist.name })}
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Reject
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ========== ALL THERAPISTS ========== */}
              <TabsContent value="therapists">
                <h2 className="text-xl font-semibold text-foreground mb-4">All Therapists ({allTherapists.length})</h2>
                <div className="space-y-3">
                  {allTherapists.map(t => (
                    <Card key={t._id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openTherapistDetail(t._id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {t.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{t.name}</p>
                            <p className="text-sm text-muted-foreground">{t.email} • {t.title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">{t.experience}y exp</span>
                          {statusBadge(t.onboardingStatus || (t.isApproved ? 'approved' : 'not_started'))}
                          {t.onboardingStatus === 'pending_approval' && (
                            <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApprove(t._id); }}>Approve</Button>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* ========== ALL CLIENTS ========== */}
              <TabsContent value="clients">
                <h2 className="text-xl font-semibold text-foreground mb-4">All Clients ({allClients.length})</h2>
                {allClients.length === 0 ? (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No clients registered yet.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {allClients.map((c: any) => (
                      <Card key={c._id} className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => openClientDetail(c._id)}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-sm font-bold text-secondary">
                              {c.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{c.name}</p>
                              <p className="text-sm text-muted-foreground">{c.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {c.phone && <span className="text-sm text-muted-foreground">{c.phone}</span>}
                            <span className="text-xs text-muted-foreground">
                              Joined {new Date(c.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                        {c.therapyPreferences?.concerns?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 ml-14">
                            {c.therapyPreferences.concerns.map((concern: string) => (
                              <Badge key={concern} variant="outline" className="text-xs">{concern}</Badge>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ========== ALL SESSIONS ========== */}
              <TabsContent value="sessions">
                <h2 className="text-xl font-semibold text-foreground mb-4">All Sessions ({allSessions.length})</h2>
                {allSessions.length === 0 ? (
                  <Card className="p-12 text-center">
                    <p className="text-muted-foreground">No sessions yet.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {allSessions.map((s: any) => (
                      <Card key={s._id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {s.clientId?.name || 'Unknown Client'} → {s.therapistId?.name || 'Unknown Therapist'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(s.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              {' '}at {s.startTime} • {s.duration} min
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">₹{s.amount}</Badge>
                            {sessionStatusBadge(s.status)}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ========== STATISTICS ========== */}
              <TabsContent value="stats">
                <h2 className="text-xl font-semibold text-foreground mb-4">Platform Statistics</h2>
                {stats && (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <UserCheck className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Therapists</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalTherapists}</p>
                          <p className="text-xs text-muted-foreground">{stats.approvedTherapists} approved</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-warm/10 rounded-full flex items-center justify-center">
                          <Clock className="w-6 h-6 text-warm" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Pending Approvals</p>
                          <p className="text-2xl font-bold text-foreground">{stats.pendingTherapists}</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Clients</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalClients}</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                          <Calendar className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Sessions</p>
                          <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
                          <p className="text-xs text-muted-foreground">{stats.completedSessions} completed</p>
                        </div>
                      </div>
                    </Card>
                    <Card className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                          <DollarSign className="w-6 h-6 text-success" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Total Revenue</p>
                          <p className="text-2xl font-bold text-foreground">₹{(stats.totalRevenue || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </TabsContent>

              {/* ========== REVIEWS ========== */}
              <TabsContent value="reviews">
                <h2 className="text-xl font-semibold text-foreground mb-4">All Reviews ({allReviews.length})</h2>
                {allReviews.length === 0 ? (
                  <Card className="p-12 text-center"><p className="text-muted-foreground">No reviews yet.</p></Card>
                ) : (
                  <div className="space-y-3">
                    {allReviews.map((r: any) => (
                      <Card key={r._id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-foreground">{r.clientId?.name || 'Client'} → {r.therapistId?.name || 'Therapist'}</p>
                            <div className="flex items-center gap-1 my-1">
                              {[1,2,3,4,5].map(s => (
                                <Star key={s} className={`w-4 h-4 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'}`} />
                              ))}
                              <span className="text-sm ml-1">{r.rating}/5</span>
                            </div>
                            {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* ========== ANALYTICS ========== */}
              <TabsContent value="analytics">
                <h2 className="text-xl font-semibold text-foreground mb-4">Platform Analytics</h2>
                <AnalyticsCharts />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectModal.open} onOpenChange={(open) => { if (!open) setRejectModal({ open: false, therapistId: '', name: '' }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject {rejectModal.name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for rejecting this application. The therapist will see this reason.
            </p>
            <Textarea
              placeholder="Reason for rejection (optional)..."
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setRejectModal({ open: false, therapistId: '', name: '' })}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleReject}>
                Confirm Rejection
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal for Therapist/Client */}
      <Dialog open={detailModal.open} onOpenChange={(open) => { if (!open) setDetailModal({ open: false, type: 'therapist', data: null, loading: false }); }}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailModal.loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : detailModal.data ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {detailModal.data.name} — {detailModal.type === 'therapist' ? 'Therapist' : 'Client'} Details
                </DialogTitle>
              </DialogHeader>

              {/* Profile Info */}
              <div className="space-y-4">
                <Card className="p-4 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Email:</span> <span className="text-foreground font-medium">{detailModal.data.email}</span></div>
                    <div><span className="text-muted-foreground">Phone:</span> <span className="text-foreground font-medium">{detailModal.data.phone || 'N/A'}</span></div>
                    {detailModal.type === 'therapist' && (
                      <>
                        <div><span className="text-muted-foreground">Title:</span> <span className="text-foreground font-medium">{detailModal.data.title}</span></div>
                        <div><span className="text-muted-foreground">Experience:</span> <span className="text-foreground font-medium">{detailModal.data.experience} years</span></div>
                        <div><span className="text-muted-foreground">Rating:</span> <span className="text-foreground font-medium">{detailModal.data.rating}/5</span></div>
                        <div><span className="text-muted-foreground">Status:</span> {statusBadge(detailModal.data.onboardingStatus || 'not_started')}</div>
                      </>
                    )}
                    <div className="col-span-2"><span className="text-muted-foreground">Joined:</span> <span className="text-foreground font-medium">{new Date(detailModal.data.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                  </div>
                </Card>

                {/* Therapist-specific info */}
                {detailModal.type === 'therapist' && (
                  <>
                    {detailModal.data.specializations?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Specializations</p>
                        <div className="flex flex-wrap gap-1">{detailModal.data.specializations.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}</div>
                      </div>
                    )}
                    {detailModal.data.languages?.length > 0 && (
                      <div><p className="text-sm font-medium text-foreground mb-1">Languages</p><p className="text-sm text-muted-foreground">{detailModal.data.languages.join(', ')}</p></div>
                    )}
                    {detailModal.data.bio && (
                      <div><p className="text-sm font-medium text-foreground mb-1">Bio</p><p className="text-sm text-muted-foreground">{detailModal.data.bio}</p></div>
                    )}
                    {detailModal.data.pricing && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Pricing</p>
                        <div className="flex gap-2">{Object.entries(detailModal.data.pricing).map(([d, p]: [string, any]) => <span key={d} className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">₹{p}/{d}min</span>)}</div>
                      </div>
                    )}
                  </>
                )}

                {/* Client therapy preferences */}
                {detailModal.type === 'client' && detailModal.data.therapyPreferences && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Therapy Preferences</p>
                    {detailModal.data.therapyPreferences.concerns?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">{detailModal.data.therapyPreferences.concerns.map((c: string) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}</div>
                    )}
                    {detailModal.data.therapyPreferences.description && (
                      <p className="text-sm text-muted-foreground">{detailModal.data.therapyPreferences.description}</p>
                    )}
                  </div>
                )}

                {/* Stats */}
                {detailModal.data.stats && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">Statistics</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-primary">{detailModal.data.stats.totalSessions}</p>
                        <p className="text-xs text-muted-foreground">Total Sessions</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-success">{detailModal.data.stats.completedSessions}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-warm">{detailModal.data.stats.upcomingSessions}</p>
                        <p className="text-xs text-muted-foreground">Upcoming</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-2xl font-bold text-foreground">
                          ₹{(detailModal.data.stats.totalEarnings || detailModal.data.stats.totalSpent || 0).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">{detailModal.type === 'therapist' ? 'Earnings' : 'Spent'}</p>
                      </Card>
                    </div>
                    {detailModal.type === 'therapist' && detailModal.data.stats.totalHours !== undefined && (
                      <p className="text-sm text-muted-foreground mt-2">Total hours: {detailModal.data.stats.totalHours}h</p>
                    )}
                  </div>
                )}

                {/* Sessions List */}
                {detailModal.data.sessions?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-3">Session History ({detailModal.data.sessions.length})</p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {detailModal.data.sessions.map((s: any) => (
                        <div key={s._id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg text-sm">
                          <div>
                            <p className="font-medium text-foreground">
                              {detailModal.type === 'therapist'
                                ? (s.clientId?.name || 'Client')
                                : (s.therapistId?.name || 'Therapist')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(s.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              {' '}at {s.startTime} • {s.duration}min
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">₹{s.amount}</Badge>
                            {sessionStatusBadge(s.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailModal.data.sessions?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No sessions yet</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-muted-foreground text-center py-8">Could not load details</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
