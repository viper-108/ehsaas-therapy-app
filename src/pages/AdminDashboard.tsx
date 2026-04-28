import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, UserX, Clock, Calendar, DollarSign, BarChart3,
  CheckCircle, XCircle, LogOut, ChevronRight, Shield, Loader2, Star, TrendingUp,
  Trash2, Percent, Flag, AlertTriangle, IndianRupee, CalendarDays, MoreVertical, ArrowRight, FileText, Download, Heart
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { SessionsListWithFilters } from "@/components/SessionsListWithFilters";
import { AdminReviewModeration } from "@/components/AdminReviewModeration";
import { DashboardSidebar, SidebarItem } from "@/components/DashboardSidebar";
import { PriceNegotiationsPanel } from "@/components/PriceNegotiationsPanel";
import { useConfirm } from "@/components/ConfirmDialog";
import { ServicesFinalizeForm } from "@/components/ServicesFinalizeForm";
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
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('pending');
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [pendingNegotiations, setPendingNegotiations] = useState<any[]>([]);
  const [pendingGroups, setPendingGroups] = useState<any[]>([]);
  const [pendingCouples, setPendingCouples] = useState<any[]>([]);
  const [allTherapists, setAllTherapists] = useState<any[]>([]);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState<{ open: boolean; therapistId: string; name: string }>({ open: false, therapistId: '', name: '' });
  const [interviewModal, setInterviewModal] = useState<{ open: boolean; therapistId: string; name: string; status: 'interview_scheduled' | 'in_process'; link: string; scheduledAt: string; notes: string }>({ open: false, therapistId: '', name: '', status: 'interview_scheduled', link: '', scheduledAt: '', notes: '' });
  const [interviewSubmitting, setInterviewSubmitting] = useState(false);
  const [transferModal, setTransferModal] = useState<{ open: boolean; clientId: string; clientName: string; fromTherapistId: string; toTherapistId: string; reason: string }>({ open: false, clientId: '', clientName: '', fromTherapistId: '', toTherapistId: '', reason: '' });
  const [transferSubmitting, setTransferSubmitting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [detailModal, setDetailModal] = useState<{ open: boolean; type: 'therapist' | 'client'; data: any | null; loading: boolean }>({ open: false, type: 'therapist', data: null, loading: false });
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [commissionModal, setCommissionModal] = useState<{ open: boolean; therapist: any | null; value: string }>({ open: false, therapist: null, value: '' });
  const [pricingModal, setPricingModal] = useState<{ open: boolean; therapist: any | null; max30: string; max50: string; min30: string; min50: string }>({ open: false, therapist: null, max30: '', max50: '', min30: '', min50: '' });
  const [pricingSaving, setPricingSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; therapist: any | null }>({ open: false, therapist: null });

  const loadMonthlyAnalytics = async () => {
    try {
      const month = selectedMonth === 'all' ? undefined : Number(selectedMonth);
      const data = await api.getMonthlyAnalytics(selectedYear, month);
      setMonthlyData(data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load analytics", variant: "destructive" });
    }
  };

  useEffect(() => {
    if (activeTab === 'monthly' || activeTab === 'stats') {
      loadMonthlyAnalytics();
    }
  }, [activeTab, selectedYear, selectedMonth]);

  const handleDeleteTherapist = async () => {
    if (!deleteConfirm.therapist) return;
    try {
      await api.deleteTherapist(deleteConfirm.therapist._id);
      toast({ title: "Deleted", description: `${deleteConfirm.therapist.name} was removed` });
      setDeleteConfirm({ open: false, therapist: null });
      loadDashboard();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to delete", variant: "destructive" });
    }
  };

  const handleSaveCommission = async () => {
    if (!commissionModal.therapist) return;
    const pct = Number(commissionModal.value);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
      toast({ title: "Error", description: "Enter a percentage between 0 and 100", variant: "destructive" });
      return;
    }
    try {
      await api.setTherapistCommission(commissionModal.therapist._id, pct);
      toast({ title: "Updated", description: `Commission set to ${pct}%` });
      setCommissionModal({ open: false, therapist: null, value: '' });
      loadDashboard();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

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
      const [statsData, pendingData, therapistsData, clientsData, sessionsData, reviewsData, pendingReviewsData, allNegotiations, pendingGroupsData, pendingCouplesData] = await Promise.all([
        api.getAdminStats(),
        api.getPendingTherapists(),
        api.getAllTherapistsAdmin(),
        api.getAllClients(),
        api.getAllSessions(),
        api.getAllReviews().catch(() => []),
        api.getPendingReviews().catch(() => []),
        api.getMyPriceNegotiations().catch(() => []),
        api.listPendingGroups().catch(() => []),
        api.getPendingCouplesProfiles().catch(() => []),
      ]);
      setStats(statsData);
      setPending(pendingData);
      setAllTherapists(therapistsData);
      setAllClients(clientsData);
      setAllSessions(sessionsData);
      setAllReviews(reviewsData);
      setPendingReviews(pendingReviewsData);
      setPendingNegotiations((allNegotiations || []).filter((n: any) => ['proposed', 'partially_approved'].includes(n.status)));
      setPendingGroups(pendingGroupsData);
      setPendingCouples(pendingCouplesData);
    } catch (error) {
      console.error('Admin dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    const t = pending.find(p => p._id === id) || allTherapists.find(p => p._id === id);
    const ok = await confirm({
      title: `Approve ${t?.name || 'this therapist'}?`,
      description: 'They will be visible to clients and able to receive bookings. You can revoke this approval anytime.',
      confirmLabel: 'Approve',
    });
    if (!ok) return;
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
            (() => {
              const sidebarItems: SidebarItem[] = [
                { value: 'pending', label: 'Pending Approvals', icon: Clock, badge: (pending.length + pendingReviews.length + pendingNegotiations.length + pendingGroups.length + pendingCouples.length) || null, group: 'Approvals' },
                { value: 'reviews', label: 'Reviews', icon: Star, group: 'Approvals' },
                { value: 'therapists', label: 'Therapists', icon: UserCheck, group: 'People' },
                { value: 'clients', label: 'Clients', icon: Users, group: 'People' },
                { value: 'sessions', label: 'Sessions', icon: Calendar, group: 'Activity' },
                { value: 'monthly', label: 'Earnings', icon: CalendarDays, group: 'Activity' },
                { value: 'stats', label: 'Statistics', icon: BarChart3, group: 'Insights' },
                { value: 'analytics', label: 'Analytics', icon: TrendingUp, group: 'Insights' },
              ];
              return (
                <div className="flex gap-6">
                  <DashboardSidebar items={sidebarItems} activeValue={activeTab} onChange={setActiveTab} />
                  <div className="flex-1 min-w-0">
                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                      <TabsList className="hidden">
                        {sidebarItems.map(i => <TabsTrigger key={i.value} value={i.value}>{i.label}</TabsTrigger>)}
                      </TabsList>

              {/* ========== PENDING APPROVALS (UNIFIED) ========== */}
              <TabsContent value="pending">
                <h2 className="text-xl font-semibold text-foreground mb-4">Pending Approvals</h2>
                {pending.length === 0 ? (
                  null
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-primary" /> Pending Therapist Applications ({pending.length})
                    </h3>
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

                        {/* Resume */}
                        <div className="mb-4 p-3 bg-muted/40 rounded-lg flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                            <span className="text-sm font-medium">Resume</span>
                          </div>
                          {therapist.resume ? (
                            <Button asChild size="sm" variant="outline">
                              <a href={therapist.resume} target="_blank" rel="noopener noreferrer">
                                <Download className="w-3 h-3 mr-1" /> View / Download
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Not uploaded</span>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground mb-4">
                          Applied: {new Date(therapist.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>

                        {/* Current status / interview info */}
                        {(therapist.onboardingStatus === 'interview_scheduled' || therapist.onboardingStatus === 'in_process') && (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded">
                            {therapist.interviewScheduledAt && <p className="text-xs"><strong>Interview:</strong> {new Date(therapist.interviewScheduledAt).toLocaleString('en-IN')}</p>}
                            {therapist.interviewLink && <p className="text-xs"><strong>Link:</strong> <a href={therapist.interviewLink} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{therapist.interviewLink}</a></p>}
                            {therapist.interviewNotes && <p className="text-xs mt-1"><strong>Notes:</strong> {therapist.interviewNotes}</p>}
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap">
                          <Button onClick={() => handleApprove(therapist._id)} className="flex-1 min-w-[120px]">
                            <CheckCircle className="w-4 h-4 mr-2" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 min-w-[120px] border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={() => setInterviewModal({ open: true, therapistId: therapist._id, name: therapist.name, status: 'interview_scheduled', link: therapist.interviewLink || '', scheduledAt: therapist.interviewScheduledAt || '', notes: therapist.interviewNotes || '' })}
                          >
                            Schedule Interview
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 min-w-[120px] border-amber-500 text-amber-600 hover:bg-amber-50"
                            onClick={() => setInterviewModal({ open: true, therapistId: therapist._id, name: therapist.name, status: 'in_process', link: therapist.interviewLink || '', scheduledAt: therapist.interviewScheduledAt || '', notes: therapist.interviewNotes || '' })}
                          >
                            Mark In Process
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1 min-w-[120px]"
                            onClick={() => setRejectModal({ open: true, therapistId: therapist._id, name: therapist.name })}
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Reject
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* ===== PENDING REVIEWS ===== */}
                {pendingReviews.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" /> Pending Reviews ({pendingReviews.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingReviews.map((r: any) => (
                        <Card key={r._id} className="p-4">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant={r.reviewType === 'ehsaas' ? 'default' : 'secondary'} className="text-xs">
                                  {r.reviewType === 'ehsaas' ? 'For Ehsaas' : `For ${r.therapistId?.name || 'therapist'}`}
                                </Badge>
                                <div className="flex">
                                  {[1,2,3,4,5].map(n => (
                                    <Star key={n} className={`w-4 h-4 ${n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
                                  ))}
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">From: {r.clientId?.name} ({r.clientId?.email})</p>
                              {r.comment && <p className="text-sm mt-2 bg-muted/30 p-2 rounded">{r.comment}</p>}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                if (!window.confirm(`Approve this ${r.rating}-star review?`)) return;
                                try { await api.approveReview(r._id); toast({ title: "Approved" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                                const reason = window.prompt('Reason for rejection (optional):') || '';
                                try { await api.rejectReview(r._id, reason); toast({ title: "Rejected" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== PENDING PRICE NEGOTIATIONS ===== */}
                {pendingNegotiations.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <IndianRupee className="w-4 h-4 text-primary" /> Pending Price Negotiations ({pendingNegotiations.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingNegotiations.map((n: any) => (
                        <Card key={n._id} className="p-4">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                {n.clientId?.name} → {n.therapistId?.name}
                                <Badge variant="outline" className="ml-2 text-xs">{n.duration}-min</Badge>
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Range: ₹{n.minPrice}-₹{n.originalPrice}
                                {n.proposedPrice && <> · <strong className="text-foreground">Client proposed: ₹{n.proposedPrice}</strong></>}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {n.therapistApproved ? '✓ Therapist approved' : '○ Therapist pending'} · {n.adminApproved ? '✓ Admin approved' : '○ Admin pending'}
                              </p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              {!n.adminApproved && (
                                <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                  if (!window.confirm(`Approve client's proposed price of ₹${n.proposedPrice}?`)) return;
                                  try { await api.approvePriceNegotiation(n._id); toast({ title: "Approved" }); loadAll(); }
                                  catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                                }}>
                                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                                const reason = window.prompt('Reason for rejection (optional):') || '';
                                try { await api.rejectPriceNegotiation(n._id, reason); toast({ title: "Rejected" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== PENDING GROUP THERAPY REQUESTS ===== */}
                {pendingGroups.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" /> Pending Group Therapy Requests ({pendingGroups.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingGroups.map((g: any) => (
                        <Card key={g._id} className="p-4">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant="outline" className="capitalize">{g.groupType}</Badge>
                                <p className="font-medium">{g.title}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">Focus: {g.focus} · Ages {g.ageMin}-{g.ageMax} · ₹{g.pricePerMember}/member · Max {g.maxMembers} members</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Lead: {(g.leadTherapists || []).map((t: any) => t.name).join(' & ')}
                              </p>
                              <p className="text-xs text-muted-foreground">First session: {new Date(g.sessionStartAt).toLocaleString('en-IN')}</p>
                              {g.description && <p className="text-xs text-muted-foreground mt-1 italic">"{g.description}"</p>}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                const ok = await confirm({ title: `Approve "${g.title}"?`, description: 'Group will become visible to clients and accept applications.', confirmLabel: 'Approve' });
                                if (!ok) return;
                                try { await api.approveGroupTherapy(g._id); toast({ title: "Approved" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                                const reason = window.prompt('Reason for rejection (optional):') || '';
                                try { await api.rejectGroupTherapy(g._id, reason); toast({ title: "Rejected" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== PENDING COUPLES PROFILES ===== */}
                {pendingCouples.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-500" /> Pending Couples Profiles ({pendingCouples.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingCouples.map((c: any) => {
                        const cp = c.couplesProfile || {};
                        return (
                          <Card key={c._id} className="p-4">
                            <div className="flex justify-between items-start gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <Badge variant="outline" className="capitalize">{cp.relationshipType || 'partners'}</Badge>
                                  {cp.partnerId ? (
                                    <Badge className="bg-success/10 text-success text-xs">Partner registered</Badge>
                                  ) : (
                                    <Badge className="bg-amber-500/10 text-amber-700 text-xs">Partner not yet registered</Badge>
                                  )}
                                </div>
                                <p className="font-medium">{c.name} <span className="text-muted-foreground font-normal">({c.email})</span></p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Partner: <strong>{cp.partnerName}</strong> ({cp.partnerEmail})
                                  {cp.relationshipDuration && <> · {cp.relationshipDuration}</>}
                                </p>
                                {cp.challengesFacing && <p className="text-xs text-muted-foreground mt-1 italic">"{cp.challengesFacing}"</p>}
                                {cp.goalsForTherapy && <p className="text-xs text-muted-foreground mt-1">Goals: {cp.goalsForTherapy}</p>}
                                <p className="text-xs text-muted-foreground mt-1">Submitted {new Date(cp.profileCompletedAt).toLocaleDateString('en-IN')}</p>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                  const ok = await confirm({
                                    title: `Approve ${c.name}'s couples profile?`,
                                    description: cp.partnerId ? `Partner ${cp.partnerName} is also registered. If they're approved too, both will be notified that they can book.` : `Partner ${cp.partnerName} hasn't signed up yet. They need to register and complete their own profile before couples sessions can begin.`,
                                    confirmLabel: 'Approve',
                                  });
                                  if (!ok) return;
                                  try { await api.approveCouplesProfile(c._id); toast({ title: "Approved" }); loadAll(); }
                                  catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                                }}>
                                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openClientDetail(c._id)}>
                                  View Details
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* "All caught up" — when literally nothing is pending */}
                {pending.length === 0 && pendingReviews.length === 0 && pendingNegotiations.length === 0 && pendingGroups.length === 0 && pendingCouples.length === 0 && (
                  <Card className="p-12 text-center mt-4">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending items. All caught up!</p>
                  </Card>
                )}
              </TabsContent>

              {/* ========== ALL THERAPISTS ========== */}
              <TabsContent value="therapists">
                <h2 className="text-xl font-semibold text-foreground mb-4">All Therapists ({allTherapists.length})</h2>
                <div className="space-y-3">
                  {allTherapists.map(t => (
                    <Card key={t._id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => openTherapistDetail(t._id)}>
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                            {t.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{t.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{t.email}</p>
                          </div>
                        </div>

                        {/* Front-of-card: status + earnings only */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {t.accountStatus === 'past' ? (
                            <Badge className="bg-muted text-muted-foreground">Past</Badge>
                          ) : !t.isApproved || ['pending_approval', 'interview_scheduled', 'in_process'].includes(t.onboardingStatus) ? (
                            <Badge className="bg-warm/10 text-warm border-warm/20">
                              {t.onboardingStatus === 'interview_scheduled' ? 'Interview Scheduled'
                               : t.onboardingStatus === 'in_process' ? 'In Process'
                               : 'Pending'}
                            </Badge>
                          ) : t.onboardingStatus === 'rejected' ? (
                            <Badge className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>
                          ) : (
                            <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                          )}
                          <span className="text-sm font-semibold text-foreground">₹{(t.totalEarnings || 0).toLocaleString('en-IN')}</span>

                          {/* 3-dot menu — all actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => openTherapistDetail(t._id)}>View Details</DropdownMenuItem>
                              {t.accountStatus === 'past' ? (
                                <DropdownMenuItem onClick={async () => {
                                  try {
                                    await fetch(`${(import.meta as any).env?.PROD ? '/api' : 'http://localhost:5001/api'}/admin/therapists/${t._id}/restore`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('ehsaas_token')}` }
                                    });
                                    toast({ title: "Restored", description: `${t.name} is active again` });
                                    loadDashboard();
                                  } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                                }}>
                                  Restore
                                </DropdownMenuItem>
                              ) : (
                                <>
                                  {t.onboardingStatus === 'pending_approval' && (
                                    <DropdownMenuItem onClick={() => handleApprove(t._id)}>Approve</DropdownMenuItem>
                                  )}
                                  {t.isApproved && t.onboardingStatus === 'approved' && (
                                    <DropdownMenuItem className="text-amber-600" onClick={async () => {
                                      const ok = await confirm({
                                        title: `Revoke approval for ${t.name}?`,
                                        description: 'They will become invisible to clients and unable to receive new bookings. Existing sessions remain. You can re-approve them anytime.',
                                        confirmLabel: 'Revoke Approval',
                                        variant: 'destructive',
                                      });
                                      if (!ok) return;
                                      const reason = window.prompt('Reason (optional, shown to therapist):') || '';
                                      try { await api.revokeTherapistApproval(t._id, reason); toast({ title: "Approval revoked" }); loadAll(); }
                                      catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                                    }}>
                                      Revoke Approval
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem onClick={() => setCommissionModal({ open: true, therapist: t, value: String(t.commissionPercent ?? 60) })}>
                                    <Percent className="w-3 h-3 mr-2" /> Set Commission ({t.commissionPercent ?? 60}%)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => {
                                    const p = t.pricing || {};
                                    const pm = t.pricingMin || {};
                                    setPricingModal({
                                      open: true, therapist: t,
                                      max30: p['30'] != null ? String(p['30']) : '',
                                      max50: p['50'] != null ? String(p['50']) : '',
                                      min30: pm['30'] != null ? String(pm['30']) : '',
                                      min50: pm['50'] != null ? String(pm['50']) : '',
                                    });
                                  }}>
                                    <IndianRupee className="w-3 h-3 mr-2" /> Set Pricing (Min/Max)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={async () => {
                                    const next = t.therapistType === 'psychiatrist' ? 'psychologist' : 'psychiatrist';
                                    try {
                                      await api.setTherapistType(t._id, next);
                                      toast({ title: "Updated", description: `Set to ${next}` });
                                      loadDashboard();
                                    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                                  }}>
                                    {t.therapistType === 'psychiatrist' ? 'Mark as Psychologist' : 'Mark as Psychiatrist'}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm({ open: true, therapist: t })}>
                                    <Trash2 className="w-3 h-3 mr-2" /> Deactivate
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                    {allClients.map((c: any) => {
                      const flagged = c.flags?.highCancellations || c.flags?.highNoShows || c.flags?.frequentTherapistChanges;
                      return (
                      <Card key={c._id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-4 flex-1 min-w-0 cursor-pointer" onClick={() => openClientDetail(c._id)}>
                            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-sm font-bold text-secondary flex-shrink-0">
                              {c.name.split(' ').map((n: string) => n[0]).join('')}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{c.name}</p>
                              <p className="text-sm text-muted-foreground truncate">{c.email}</p>
                            </div>
                          </div>

                          {/* Front-of-card: status + spend only */}
                          <div className="flex items-center gap-3 flex-wrap">
                            {flagged ? (
                              <Badge className="bg-destructive/10 text-destructive border-destructive/20"><Flag className="w-3 h-3 mr-1" />Flagged</Badge>
                            ) : (
                              <Badge className="bg-success/10 text-success border-success/20">Active</Badge>
                            )}
                            <span className="text-sm font-semibold text-foreground">₹{(c.totalSpent || 0).toLocaleString('en-IN')}</span>

                            {/* 3-dot menu — all actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={(e) => e.stopPropagation()}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuItem onClick={() => openClientDetail(c._id)}>View Details</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTransferModal({ open: true, clientId: c._id, clientName: c.name, fromTherapistId: '', toTherapistId: '', reason: '' })}>
                                  <ArrowRight className="w-3 h-3 mr-2" /> Transfer to Another Therapist
                                </DropdownMenuItem>
                                {flagged && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                                      {c.flags?.highCancellations && `${c.cancellationCount}+ cancellations`}
                                      {c.flags?.highNoShows && ` · ${c.noShowCount}+ no-shows`}
                                      {c.flags?.frequentTherapistChanges && ` · frequent therapist changes`}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ========== ALL SESSIONS ========== */}
              <TabsContent value="sessions">
                <SessionsListWithFilters sessions={allSessions} role="admin" />
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
                <AdminReviewModeration />
                <div className="mt-8">
                  <h2 className="text-xl font-semibold text-foreground mb-4">All Reviews — Approved ({allReviews.length})</h2>
                  {allReviews.length === 0 ? (
                    <Card className="p-12 text-center"><p className="text-muted-foreground">No approved reviews yet.</p></Card>
                  ) : (
                    <div className="space-y-3">
                      {allReviews.map((r: any) => (
                        <Card key={r._id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-foreground">{r.clientId?.name || 'Client'} → {r.therapistId?.name || (r.reviewType === 'ehsaas' ? 'Ehsaas' : 'Therapist')}</p>
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
                </div>
              </TabsContent>

              {/* ========== ANALYTICS ========== */}
              <TabsContent value="analytics">
                <h2 className="text-xl font-semibold text-foreground mb-4">Platform Analytics</h2>
                <AnalyticsCharts />
              </TabsContent>

              {/* ========== MONTHLY & EARNINGS ========== */}
              <TabsContent value="monthly">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                  <h2 className="text-xl font-semibold text-foreground">Earnings</h2>
                  <div className="flex gap-3">
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[selectedYear - 2, selectedYear - 1, selectedYear, selectedYear + 1].map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                          <SelectItem key={i+1} value={String(i+1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {!monthlyData ? (
                  <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></Card>
                ) : (
                  <div className="space-y-6">
                    {/* Year totals */}
                    <Card className="p-6">
                      <h3 className="font-semibold mb-4">{selectedMonth === 'all' ? `${monthlyData.year} Totals` : `${['','January','February','March','April','May','June','July','August','September','October','November','December'][Number(selectedMonth)]} ${monthlyData.year}`}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground">Total Sessions</p>
                          <p className="text-2xl font-bold">{monthlyData.yearTotal.total}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {monthlyData.yearTotal.completed} completed · {monthlyData.yearTotal.cancelled} cancelled · {monthlyData.yearTotal.noShow} no-show
                          </p>
                        </div>
                        <div className="p-4 bg-primary/10 rounded-lg">
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                          <p className="text-2xl font-bold text-primary">₹{monthlyData.yearTotal.totalRevenue.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-4 bg-secondary/10 rounded-lg">
                          <p className="text-xs text-muted-foreground">Therapists Earned</p>
                          <p className="text-2xl font-bold text-secondary">₹{monthlyData.yearTotal.therapistShare.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-4 bg-warm/10 rounded-lg">
                          <p className="text-xs text-muted-foreground">Ehsaas Revenue</p>
                          <p className="text-2xl font-bold text-warm">₹{monthlyData.yearTotal.ehsaasShare.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </Card>

                    {/* Per-month breakdown */}
                    {monthlyData.monthly.filter((m: any) => selectedMonth === 'all' || m.month === Number(selectedMonth)).map((m: any) => (
                      <Card key={m.month} className="p-6">
                        <h4 className="font-semibold text-lg mb-3">{m.monthName} {m.year}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
                          <div><p className="text-muted-foreground">Sessions</p><p className="font-bold">{m.total}</p></div>
                          <div><p className="text-muted-foreground">Completed</p><p className="font-bold text-success">{m.completed}</p></div>
                          <div><p className="text-muted-foreground">Revenue</p><p className="font-bold">₹{m.totalRevenue.toLocaleString('en-IN')}</p></div>
                          <div><p className="text-muted-foreground">Therapist Share</p><p className="font-bold text-secondary">₹{m.therapistShare.toLocaleString('en-IN')}</p></div>
                          <div><p className="text-muted-foreground">Ehsaas Share</p><p className="font-bold text-warm">₹{m.ehsaasShare.toLocaleString('en-IN')}</p></div>
                        </div>
                        {m.therapists.length > 0 && (
                          <div className="border-t pt-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">BY THERAPIST</p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-muted-foreground text-xs border-b">
                                    <th className="pb-2">Therapist</th>
                                    <th className="pb-2">Cut %</th>
                                    <th className="pb-2">Sessions</th>
                                    <th className="pb-2">Revenue</th>
                                    <th className="pb-2">Therapist Earned</th>
                                    <th className="pb-2">Ehsaas Earned</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {m.therapists.map((t: any) => (
                                    <tr key={t.therapistId} className="border-b last:border-0">
                                      <td className="py-2">
                                        {t.name}
                                        {t.accountStatus === 'past' && (
                                          <Badge className="ml-2 bg-muted text-muted-foreground text-xs">Past</Badge>
                                        )}
                                      </td>
                                      <td className="py-2">{t.commissionPercent}%</td>
                                      <td className="py-2">{t.sessions}</td>
                                      <td className="py-2">₹{t.revenue.toLocaleString('en-IN')}</td>
                                      <td className="py-2 text-secondary">₹{t.therapistShare.toLocaleString('en-IN')}</td>
                                      <td className="py-2 text-warm">₹{t.ehsaasShare.toLocaleString('en-IN')}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                )}

                {/* Price Negotiations */}
                <Card className="p-5 mt-6">
                  <PriceNegotiationsPanel role="admin" adminEnableData={{
                    clients: allClients.map((c: any) => ({ _id: c._id, name: c.name })),
                    therapists: allTherapists.filter((t: any) => t.accountStatus !== 'past').map((t: any) => ({ _id: t._id, name: t.name, pricing: t.pricing, pricingMin: t.pricingMin })),
                  }} />
                </Card>
              </TabsContent>
            </Tabs>
                  </div>
                </div>
              );
            })()
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

      {/* Interview / In-Process Modal */}
      <Dialog open={interviewModal.open} onOpenChange={(open) => { if (!open) setInterviewModal(p => ({ ...p, open: false })); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {interviewModal.status === 'interview_scheduled' ? `Schedule Interview with ${interviewModal.name}` : `Mark ${interviewModal.name} as In Process`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {interviewModal.status === 'interview_scheduled' && (
              <>
                <div>
                  <label className="text-sm font-medium">Interview Link</label>
                  <Input
                    placeholder="https://meet.google.com/..."
                    value={interviewModal.link}
                    onChange={e => setInterviewModal(p => ({ ...p, link: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={interviewModal.scheduledAt ? new Date(interviewModal.scheduledAt).toISOString().slice(0,16) : ''}
                    onChange={e => setInterviewModal(p => ({ ...p, scheduledAt: e.target.value }))}
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium">Notes for therapist (optional)</label>
              <Textarea
                placeholder={interviewModal.status === 'interview_scheduled' ? 'e.g. Please bring your portfolio and licence' : 'e.g. We\'re reviewing your documents'}
                value={interviewModal.notes}
                onChange={e => setInterviewModal(p => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">An email will be sent to the therapist with these details.</p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setInterviewModal(p => ({ ...p, open: false }))}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={interviewSubmitting}
                onClick={async () => {
                  setInterviewSubmitting(true);
                  try {
                    await api.setTherapistInterview(interviewModal.therapistId, {
                      status: interviewModal.status,
                      interviewLink: interviewModal.link || undefined,
                      interviewScheduledAt: interviewModal.scheduledAt || undefined,
                      interviewNotes: interviewModal.notes || undefined,
                    });
                    toast({ title: "Updated", description: `Therapist notified by email.` });
                    setInterviewModal(p => ({ ...p, open: false }));
                    loadAll();
                  } catch (e: any) {
                    toast({ title: "Error", description: e.message, variant: "destructive" });
                  } finally { setInterviewSubmitting(false); }
                }}
              >
                {interviewSubmitting ? 'Saving...' : 'Save & Notify'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Client Modal */}
      <Dialog open={transferModal.open} onOpenChange={(open) => { if (!open) setTransferModal(p => ({ ...p, open: false })); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer {transferModal.clientName} to a New Therapist</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-100 space-y-1">
                <p className="font-medium">This action will:</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  <li>Mark the old therapist's relationship as <strong>past</strong> — they lose access to this client's notes/history</li>
                  <li>Copy all client history & notes to the new therapist for continuity of care</li>
                  <li>Cancel any future scheduled sessions with the old therapist</li>
                  <li>Email both therapists and the client</li>
                </ul>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">From (current therapist) <span className="text-destructive">*</span></label>
              <Select value={transferModal.fromTherapistId} onValueChange={(v) => setTransferModal(p => ({ ...p, fromTherapistId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select current therapist" /></SelectTrigger>
                <SelectContent>
                  {allTherapists.filter((t: any) => t.accountStatus !== 'past').map((t: any) => (
                    <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">To (new therapist) <span className="text-destructive">*</span></label>
              <Select value={transferModal.toTherapistId} onValueChange={(v) => setTransferModal(p => ({ ...p, toTherapistId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select new therapist" /></SelectTrigger>
                <SelectContent>
                  {allTherapists.filter((t: any) => t.accountStatus !== 'past' && t._id !== transferModal.fromTherapistId).map((t: any) => (
                    <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Reason (optional)</label>
              <Textarea
                placeholder="Why is this client being transferred?"
                value={transferModal.reason}
                onChange={(e) => setTransferModal(p => ({ ...p, reason: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setTransferModal(p => ({ ...p, open: false }))}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={transferSubmitting || !transferModal.fromTherapistId || !transferModal.toTherapistId}
                onClick={async () => {
                  setTransferSubmitting(true);
                  try {
                    await api.transferClient({
                      clientId: transferModal.clientId,
                      fromTherapistId: transferModal.fromTherapistId,
                      toTherapistId: transferModal.toTherapistId,
                      reason: transferModal.reason,
                    });
                    toast({ title: "Transferred", description: `${transferModal.clientName} moved successfully. Both therapists & client have been emailed.` });
                    setTransferModal(p => ({ ...p, open: false }));
                    loadDashboard();
                  } catch (e: any) {
                    toast({ title: "Error", description: e.message, variant: "destructive" });
                  } finally { setTransferSubmitting(false); }
                }}
              >
                {transferSubmitting ? 'Transferring...' : 'Transfer Client'}
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
                        <p className="text-sm font-medium text-foreground mb-2">Pricing (Max — shown to clients)</p>
                        <div className="flex gap-2 flex-wrap">{Object.entries(detailModal.data.pricing).map(([d, p]: [string, any]) => <span key={d} className="bg-primary/10 text-primary px-2 py-1 rounded text-sm">₹{p}/{d}min</span>)}</div>
                      </div>
                    )}
                    {detailModal.data.pricingMin && Object.keys(detailModal.data.pricingMin).length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">Pricing (Min — admin only)</p>
                        <div className="flex gap-2 flex-wrap">{Object.entries(detailModal.data.pricingMin).map(([d, p]: [string, any]) => <span key={d} className="bg-amber-500/10 text-amber-700 dark:text-amber-300 px-2 py-1 rounded text-sm">₹{p}/{d}min</span>)}</div>
                        <p className="text-xs text-muted-foreground mt-1">Therapist will accept any price between min and max for negotiations.</p>
                      </div>
                    )}

                    {/* Resume / CV */}
                    <div className="p-3 bg-muted/40 rounded-lg flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm font-medium">Resume / CV</span>
                      </div>
                      {detailModal.data.resume ? (
                        <Button asChild size="sm" variant="outline">
                          <a href={detailModal.data.resume} target="_blank" rel="noopener noreferrer">
                            <Download className="w-3 h-3 mr-1" /> View / Download
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not uploaded</span>
                      )}
                    </div>

                    {detailModal.data.educationBackground && (
                      <div><p className="text-sm font-medium text-foreground mb-1">Education Background</p><p className="text-sm text-muted-foreground whitespace-pre-wrap">{detailModal.data.educationBackground}</p></div>
                    )}
                    {detailModal.data.highestEducation && (
                      <div><p className="text-sm font-medium text-foreground mb-1">Highest Education</p><p className="text-sm text-muted-foreground">{detailModal.data.highestEducation}</p></div>
                    )}

                    {/* Therapist's original service ASKS (admin-only) */}
                    {Array.isArray(detailModal.data.servicesOffered) && detailModal.data.servicesOffered.length > 0 && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                        <p className="text-sm font-medium text-foreground mb-2">Therapist's Original Asks (admin-only, never shown publicly)</p>
                        <div className="space-y-1">
                          {detailModal.data.servicesOffered.map((s: any) => (
                            <p key={s.type} className="text-xs text-muted-foreground">
                              <strong className="capitalize">{s.type}</strong> — ₹{s.minPrice} to ₹{s.maxPrice}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ADMIN: Finalize services + per-service pricing */}
                    <ServicesFinalizeForm
                      therapistId={detailModal.data._id}
                      servicesOffered={detailModal.data.servicesOffered || []}
                      approvedServices={detailModal.data.approvedServices || []}
                      onSaved={() => openTherapistDetail(detailModal.data._id)}
                    />
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

      {/* Commission Modal */}
      <Dialog open={commissionModal.open} onOpenChange={(open) => { if (!open) setCommissionModal({ open: false, therapist: null, value: '' }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Commission for {commissionModal.therapist?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Percentage of each session fee that goes to the therapist. The rest stays with Ehsaas.
            </p>
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                min={0}
                max={100}
                value={commissionModal.value}
                onChange={(e) => setCommissionModal({ ...commissionModal, value: e.target.value })}
                className="text-center text-2xl"
              />
              <span className="text-xl">%</span>
            </div>
            {commissionModal.value && (
              <p className="text-sm text-muted-foreground">
                Therapist gets <strong>{commissionModal.value}%</strong>, Ehsaas keeps <strong>{100 - Number(commissionModal.value)}%</strong>
              </p>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCommissionModal({ open: false, therapist: null, value: '' })}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSaveCommission}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Modal */}
      <Dialog open={pricingModal.open} onOpenChange={(open) => { if (!open) setPricingModal({ open: false, therapist: null, max30: '', max50: '', min30: '', min50: '' }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Pricing for {pricingModal.therapist?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Set the official Min and Max prices for this therapist after their interview. Clients see only the Max price; Min is used for sliding-scale negotiations.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">30-min Max ₹</label>
                <Input type="number" placeholder="900" value={pricingModal.max30} onChange={e => setPricingModal(p => ({ ...p, max30: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">30-min Min ₹</label>
                <Input type="number" placeholder="600" value={pricingModal.min30} onChange={e => setPricingModal(p => ({ ...p, min30: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">50-min Max ₹</label>
                <Input type="number" placeholder="1500" value={pricingModal.max50} onChange={e => setPricingModal(p => ({ ...p, max50: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">50-min Min ₹</label>
                <Input type="number" placeholder="1000" value={pricingModal.min50} onChange={e => setPricingModal(p => ({ ...p, min50: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Min price is required for sliding-scale negotiations. Leave blank if you don't want to allow negotiation for that duration.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setPricingModal({ open: false, therapist: null, max30: '', max50: '', min30: '', min50: '' })}>Cancel</Button>
              <Button className="flex-1" disabled={pricingSaving} onClick={async () => {
                if (!pricingModal.therapist) return;
                const pricing: any = {};
                const pricingMin: any = {};
                if (pricingModal.max30) pricing['30'] = Number(pricingModal.max30);
                if (pricingModal.max50) pricing['50'] = Number(pricingModal.max50);
                if (pricingModal.min30) pricingMin['30'] = Number(pricingModal.min30);
                if (pricingModal.min50) pricingMin['50'] = Number(pricingModal.min50);
                setPricingSaving(true);
                try {
                  await api.setTherapistPricing(pricingModal.therapist._id, { pricing, pricingMin });
                  toast({ title: "Pricing updated", description: `${pricingModal.therapist.name} has been notified.` });
                  setPricingModal({ open: false, therapist: null, max30: '', max50: '', min30: '', min50: '' });
                  loadDashboard();
                } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                finally { setPricingSaving(false); }
              }}>
                {pricingSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => { if (!open) setDeleteConfirm({ open: false, therapist: null }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleteConfirm.therapist?.name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-md text-destructive text-sm">
              This will permanently delete the therapist's profile. Past sessions remain but the therapist won't be able to log in. This cannot be undone.
            </div>
            <p className="text-sm text-muted-foreground">
              If the therapist has upcoming sessions, those must be cancelled or completed first.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm({ open: false, therapist: null })}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDeleteTherapist}>
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
