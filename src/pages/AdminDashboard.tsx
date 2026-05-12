import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Users, UserCheck, UserX, Clock, Calendar, DollarSign, BarChart3,
  CheckCircle, XCircle, LogOut, ChevronRight, Shield, Loader2, Star, TrendingUp,
  Trash2, Percent, Flag, AlertTriangle, IndianRupee, CalendarDays, MoreVertical, ArrowRight, FileText, Download, Heart, Briefcase, BookOpen, GraduationCap, MessageCircle
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
import { ConversationList } from "@/components/ConversationList";
import { ChatWindow } from "@/components/ChatWindow";
import { toIstDatetimeLocal, istDatetimeLocalToIso, formatDateTimeIst } from "@/lib/dateIst";
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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const confirm = useConfirm();
  // Initial tab honours ?tab=… in the URL so that a notification linking to
  // /admin-dashboard?tab=therapists actually lands on the Therapists tab
  // instead of always opening Pending Approvals.
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pending');

  // React to URL changes too (e.g. clicking a different notification while
  // the page is already open).
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);
  const [stats, setStats] = useState<any>(null);
  const [pending, setPending] = useState<any[]>([]);
  const [pendingReviews, setPendingReviews] = useState<any[]>([]);
  const [pendingNegotiations, setPendingNegotiations] = useState<any[]>([]);
  const [pendingGroups, setPendingGroups] = useState<any[]>([]);
  const [pendingCouples, setPendingCouples] = useState<any[]>([]);
  const [serviceChangeRequests, setServiceChangeRequests] = useState<any[]>([]);
  const [pendingWorkshops, setPendingWorkshops] = useState<any[]>([]);
  const [pendingSupervisors, setPendingSupervisors] = useState<any[]>([]);
  const [pendingSupervisees, setPendingSupervisees] = useState<any[]>([]);
  const [pendingSupervisionGroups, setPendingSupervisionGroups] = useState<any[]>([]);
  const [pendingTrainings, setPendingTrainings] = useState<any[]>([]);
  const [allTherapists, setAllTherapists] = useState<any[]>([]);
  const [rejectedTherapists, setRejectedTherapists] = useState<any[]>([]);
  // Account-status filters for the All Therapists / All Clients tabs.
  // Mongo's accountStatus enum on both models is 'active' | 'past'
  // ('past' === soft-deleted, hidden from public/bookings).
  const [therapistsAccountFilter, setTherapistsAccountFilter] = useState<'all' | 'active' | 'past'>('all');
  const [clientsAccountFilter, setClientsAccountFilter] = useState<'all' | 'active' | 'past'>('all');
  // Admin chat panel state. Admin can message anyone (clients + therapists
  // at any stage — including those still in onboarding/interview).
  const [chatConvKey, setChatConvKey] = useState('');
  const [chatOtherUser, setChatOtherUser] = useState<any>(null);
  // All InterviewSchedule rows. Keyed by therapistId so we can look up the
  // active interview from a therapist card and surface the right
  // approve/reject/cancel actions.
  const [interviews, setInterviews] = useState<any[]>([]);
  const [interviewDecisionModal, setInterviewDecisionModal] = useState<{
    open: boolean; interviewId: string; therapistName: string; action: 'approve' | 'reject' | 'cancel' | null; reason: string;
  }>({ open: false, interviewId: '', therapistName: '', action: null, reason: '' });
  // Filter for the unified Pending Approvals tab — narrows the long list
  // to just the category admin is reviewing right now.
  const [approvalCategory, setApprovalCategory] = useState<
    'all' | 'new-therapist' | 'profile-changes' | 'couples' | 'sliding-scale' | 'supervision' | 'groups'
  >('all');
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
      loadAll();
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
      loadAll();
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
      const [statsData, pendingData, therapistsData, clientsData, sessionsData, reviewsData, pendingReviewsData, allNegotiations, pendingGroupsData, pendingCouplesData, serviceChangeData, pendingWorkshopsData, pSup, pSupe, pSupGroups, pTrainings, rejectedData, interviewsData] = await Promise.all([
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
        api.listServiceChangeRequests().catch(() => []),
        api.listPendingWorkshops().catch(() => []),
        api.listPendingSupervisors().catch(() => []),
        api.listPendingSupervisees().catch(() => []),
        api.listPendingSupervisionGroups().catch(() => []),
        api.listPendingTrainings().catch(() => []),
        api.getRejectedTherapists().catch(() => []),
        api.getInterviews().catch(() => []),
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
      setServiceChangeRequests(serviceChangeData);
      setPendingWorkshops(pendingWorkshopsData);
      setPendingSupervisors(pSup);
      setPendingSupervisees(pSupe);
      setPendingSupervisionGroups(pSupGroups);
      setPendingTrainings(pTrainings);
      setRejectedTherapists(Array.isArray(rejectedData) ? rejectedData : []);
      setInterviews(Array.isArray(interviewsData) ? interviewsData : []);
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
                { value: 'pending', label: 'Pending Approvals', icon: Clock, badge: (pending.length + pendingReviews.length + pendingNegotiations.length + pendingGroups.length + pendingCouples.length + serviceChangeRequests.length + pendingWorkshops.length + pendingSupervisors.length + pendingSupervisees.length + pendingSupervisionGroups.length + pendingTrainings.length) || null, group: 'Approvals' },
                { value: 'reviews', label: 'Reviews', icon: Star, group: 'Approvals' },
                { value: 'rejected', label: 'Rejected Therapists', icon: UserX, badge: rejectedTherapists.length || null, group: 'People' },
                { value: 'therapists', label: 'Therapists', icon: UserCheck, group: 'People' },
                { value: 'clients', label: 'Clients', icon: Users, group: 'People' },
                { value: 'messages', label: 'Messages', icon: MessageCircle, group: 'People' },
                { value: 'interviews', label: 'Interviews', icon: Calendar, badge: (interviews.filter((iv: any) => iv.status === 'scheduled').length) || null, group: 'Activity' },
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
                <h2 className="text-xl font-semibold text-foreground mb-2">Pending Approvals</h2>

                {/* Category filter — narrows the unified Pending list to a
                    single workflow at a time so admin can focus. */}
                <div className="flex flex-wrap gap-2 mb-5">
                  {([
                    { value: 'all',              label: 'All' },
                    { value: 'new-therapist',    label: `New therapists (${pending.length})` },
                    { value: 'profile-changes',  label: `Profile changes (${serviceChangeRequests.length})` },
                    { value: 'couples',          label: `Couples (${pendingCouples.length})` },
                    { value: 'sliding-scale',    label: `Sliding-scale (${pendingNegotiations.length})` },
                    { value: 'supervision',      label: `Supervision (${pendingSupervisors.length + pendingSupervisees.length + pendingSupervisionGroups.length})` },
                    { value: 'groups',           label: `Groups & Workshops (${pendingGroups.length + pendingWorkshops.length + pendingTrainings.length})` },
                  ] as const).map(opt => (
                    <Badge
                      key={opt.value}
                      variant={approvalCategory === opt.value ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setApprovalCategory(opt.value as any)}
                    >
                      {opt.label}
                    </Badge>
                  ))}
                </div>

                {(approvalCategory === 'all' || approvalCategory === 'new-therapist') && pending.length === 0 ? (
                  null
                ) : (approvalCategory === 'all' || approvalCategory === 'new-therapist') && (
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

                        {/* Services the therapist asked for (admin sees their original asks).
                            For multi-duration services (individual / couple / supervision)
                            we surface each duration band separately. */}
                        {Array.isArray(therapist.servicesOffered) && therapist.servicesOffered.length > 0 ? (
                          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                              <Briefcase className="w-4 h-4 text-blue-700 dark:text-blue-300" />
                              Services therapist offered (their asks — admin only)
                            </p>
                            <div className="space-y-2">
                              {therapist.servicesOffered.map((s: any) => {
                                const dps = Array.isArray(s.durationPricing) ? s.durationPricing : [];
                                return (
                                  <div key={s.type} className="text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="capitalize font-medium">{s.type === 'couple' ? 'Couples' : s.type} Therapy</span>
                                      {dps.length === 0 && (
                                        <span className="text-muted-foreground">₹{s.minPrice} — ₹{s.maxPrice}</span>
                                      )}
                                    </div>
                                    {dps.length > 0 && (
                                      <div className="mt-1 ml-3 space-y-0.5">
                                        {dps.map((dp: any) => (
                                          <div key={dp.duration} className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">{dp.duration} min</span>
                                            <span className="text-muted-foreground">₹{dp.minPrice} — ₹{dp.maxPrice}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-2 italic">
                              Use the therapist's detail page to finalize per-service prices after interview.
                            </p>
                          </div>
                        ) : (
                          // Therapist did not pick any services / pricing during
                          // onboarding. Flag this clearly so admin knows to ask
                          // for it during the interview rather than assuming a
                          // default.
                          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                              Therapist hasn't selected any price range yet
                            </p>
                            <p className="text-xs text-amber-800 dark:text-amber-200 mt-1">
                              No services or pricing were submitted during onboarding. Ask during the interview, then set prices from the therapist's detail page after approval.
                            </p>
                          </div>
                        )}

                        {/* Already-approved services (after admin finalizes) */}
                        {Array.isArray(therapist.approvedServices) && therapist.approvedServices.length > 0 && (
                          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4 text-green-700 dark:text-green-300" />
                              Admin-approved services
                            </p>
                            <div className="space-y-1">
                              {therapist.approvedServices.map((s: any) => (
                                <div key={s.type} className="flex items-center justify-between text-sm gap-2">
                                  <span className="capitalize font-medium">{s.type === 'couple' ? 'Couples' : s.type}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">₹{s.minPrice} — ₹{s.maxPrice}</span>
                                    {s.therapistAccepted && <Badge className="bg-success/10 text-success text-[10px] px-1.5 py-0">accepted</Badge>}
                                    {s.therapistRejected && <Badge className="bg-destructive/10 text-destructive text-[10px] px-1.5 py-0">rejected</Badge>}
                                    {!s.therapistAccepted && !s.therapistRejected && <Badge className="bg-amber-500/10 text-amber-700 text-[10px] px-1.5 py-0">awaiting</Badge>}
                                  </div>
                                </div>
                              ))}
                            </div>
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
                        {(therapist.onboardingStatus === 'interview_scheduled' || therapist.onboardingStatus === 'in_process') && (() => {
                          // Look up the active interview record for this
                          // therapist so admin can approve/reject/cancel it
                          // inline. We pick the most recent one whose status
                          // is still 'scheduled' (one therapist can have
                          // multiple historical interview rows).
                          const activeInterview = interviews
                            .filter((iv: any) => String(iv.therapistId?._id || iv.therapistId) === String(therapist._id) && iv.status === 'scheduled')
                            .sort((a: any, b: any) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())[0];
                          return (
                            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded">
                              {therapist.interviewScheduledAt && <p className="text-xs"><strong>Interview:</strong> {new Date(therapist.interviewScheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>}
                              {therapist.interviewLink && <p className="text-xs"><strong>Link:</strong> <a href={therapist.interviewLink} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">{therapist.interviewLink}</a></p>}
                              {therapist.interviewNotes && <p className="text-xs mt-1"><strong>Notes:</strong> {therapist.interviewNotes}</p>}

                              {/* Decision buttons always available while
                                  status is interview_scheduled / in_process.
                                  If there's an InterviewSchedule row we
                                  drive it via /interviews/:id/{approve,reject,cancel}
                                  (which also syncs the therapist record).
                                  If not (legacy data / sync gap), we fall
                                  back to the therapist-level approve /
                                  reject / cancel-interview endpoints —
                                  same outcome for the therapist. Admin
                                  can decide without taking the interview. */}
                              <div className="flex flex-wrap gap-2 mt-3">
                                <Button size="sm" onClick={() => {
                                  if (activeInterview) {
                                    setInterviewDecisionModal({ open: true, interviewId: activeInterview._id, therapistName: therapist.name, action: 'approve', reason: '' });
                                  } else {
                                    handleApprove(therapist._id);
                                  }
                                }}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => {
                                  if (activeInterview) {
                                    setInterviewDecisionModal({ open: true, interviewId: activeInterview._id, therapistName: therapist.name, action: 'reject', reason: '' });
                                  } else {
                                    setRejectModal({ open: true, therapistId: therapist._id, name: therapist.name });
                                  }
                                }}>
                                  Reject
                                </Button>
                                <Button size="sm" variant="outline" onClick={async () => {
                                  if (activeInterview) {
                                    setInterviewDecisionModal({ open: true, interviewId: activeInterview._id, therapistName: therapist.name, action: 'cancel', reason: '' });
                                  } else {
                                    const reason = window.prompt('Reason for cancelling the interview slot (shown to therapist, optional):') || '';
                                    try {
                                      await api.cancelTherapistInterview(therapist._id, reason);
                                      toast({ title: 'Interview cancelled', description: `${therapist.name} has been notified.` });
                                      loadAll();
                                    } catch (e: any) {
                                      toast({ title: 'Failed', description: e.message || 'Try again later', variant: 'destructive' });
                                    }
                                  }
                                }}>
                                  Cancel Interview
                                </Button>
                              </div>
                              {!activeInterview && (
                                <p className="text-[11px] text-muted-foreground italic mt-2">
                                  No interview record on file — these actions update the therapist's status directly.
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* Cancelled-interview reschedule prompt */}
                        {(() => {
                          const cancelled = interviews
                            .filter((iv: any) => String(iv.therapistId?._id || iv.therapistId) === String(therapist._id) && iv.status === 'cancelled')
                            .sort((a: any, b: any) => new Date(b.decidedAt || b.updatedAt).getTime() - new Date(a.decidedAt || a.updatedAt).getTime())[0];
                          if (!cancelled || (therapist.onboardingStatus !== 'pending_approval' && therapist.onboardingStatus !== 'in_process')) return null;
                          return (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded">
                              <p className="text-xs"><strong>Most recent interview was cancelled</strong>{cancelled.decidedAt ? ` on ${new Date(cancelled.decidedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}` : ''}.</p>
                              {cancelled.decisionNote && <p className="text-xs text-muted-foreground mt-1"><em>{cancelled.decisionNote}</em></p>}
                              <Button
                                size="sm"
                                className="mt-2"
                                onClick={() => setInterviewModal({ open: true, therapistId: therapist._id, name: therapist.name, status: 'interview_scheduled', link: cancelled.meetingLink || therapist.interviewLink || '', scheduledAt: '', notes: cancelled.notes || therapist.interviewNotes || '' })}
                              >
                                Reschedule Interview
                              </Button>
                            </div>
                          );
                        })()}

                        <div className="flex gap-2 flex-wrap">
                          <Button onClick={() => handleApprove(therapist._id)} className="flex-1 min-w-[120px]">
                            <CheckCircle className="w-4 h-4 mr-2" /> Approve
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 min-w-[120px]"
                            onClick={() => {
                              // Jump to Messages tab with this therapist pre-
                              // selected. Conversation key is "smaller_larger"
                              // sort of the two ObjectIds (server convention).
                              const ids = [String(user?._id), String(therapist._id)].sort();
                              setChatConvKey(ids.join('_'));
                              setChatOtherUser({ _id: therapist._id, name: therapist.name, title: therapist.title, role: 'therapist' });
                              setActiveTab('messages');
                            }}
                          >
                            <MessageCircle className="w-4 h-4 mr-2" /> Message
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
                {approvalCategory === 'all' && pendingReviews.length > 0 && (
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
                {(approvalCategory === 'all' || approvalCategory === 'sliding-scale') && pendingNegotiations.length > 0 && (
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
                {(approvalCategory === 'all' || approvalCategory === 'groups') && pendingGroups.length > 0 && (
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
                {(approvalCategory === 'all' || approvalCategory === 'couples') && pendingCouples.length > 0 && (
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

                {/* ===== SERVICE CHANGE REQUESTS ===== */}
                {(approvalCategory === 'all' || approvalCategory === 'profile-changes') && serviceChangeRequests.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-primary" /> Service Change Requests ({serviceChangeRequests.length})
                    </h3>
                    <div className="space-y-2">
                      {serviceChangeRequests.map((t: any) => (
                        <Card key={t._id} className="p-4">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{t.name} <span className="text-muted-foreground font-normal">({t.email})</span></p>
                              <p className="text-xs text-muted-foreground mt-1">Submitted {new Date(t.servicesPendingReviewAt).toLocaleDateString('en-IN')}</p>
                              <div className="mt-2 space-y-1">
                                {(t.pendingServiceChanges || []).map((c: any, i: number) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    <Badge variant={c.action === 'add' ? 'default' : 'outline'} className="capitalize text-xs">
                                      {c.action === 'add' ? '➕ Add' : '➖ Remove'}
                                    </Badge>
                                    <span className="capitalize font-medium">{c.type}</span>
                                    {c.action === 'add' && (c.minPrice || c.maxPrice) && (
                                      <span className="text-muted-foreground">at ₹{c.minPrice} - ₹{c.maxPrice}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                              {(t.pendingServiceChanges || []).some((c: any) => c.note) && (
                                <p className="text-xs text-muted-foreground mt-2 italic">
                                  {(t.pendingServiceChanges || []).map((c: any) => c.note).filter(Boolean).join(' · ')}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                const ok = await confirm({
                                  title: `Approve ${t.name}'s service changes?`,
                                  description: 'New services will be added (therapist must accept the price). Removed services will be dropped from their public profile immediately.',
                                  confirmLabel: 'Approve',
                                });
                                if (!ok) return;
                                try { await api.decideServiceChange(t._id, true); toast({ title: "Approved" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                                const reason = window.prompt('Reason for rejection (optional):') || '';
                                try { await api.decideServiceChange(t._id, false, reason); toast({ title: "Rejected" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <XCircle className="w-3 h-3 mr-1" /> Reject
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => openTherapistDetail(t._id)}>
                                View Profile
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== PENDING WORKSHOPS ===== */}
                {(approvalCategory === 'all' || approvalCategory === 'groups') && pendingWorkshops.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-primary" /> Pending Workshop Requests ({pendingWorkshops.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingWorkshops.map((w: any) => (
                        <Card key={w._id} className="p-4">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{w.title}</p>
                              <p className="text-xs text-muted-foreground">Topic: {w.topic} · ₹{w.pricePerParticipant}/participant · {w.sessionDates?.length || 0} session(s)</p>
                              <p className="text-xs text-muted-foreground mt-1">By: {(w.facilitatorTherapistIds || []).map((t: any) => t.name).join(' & ')}</p>
                              {w.sessionDates?.[0] && <p className="text-xs text-muted-foreground">First session: {new Date(w.sessionDates[0]).toLocaleString('en-IN')}</p>}
                              {Array.isArray(w.learningOutcomes) && w.learningOutcomes.length > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">{w.learningOutcomes.length} learning outcome{w.learningOutcomes.length > 1 ? 's' : ''}</p>
                              )}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => window.open(`/workshops/${w._id}`, '_blank')}>
                                Preview
                              </Button>
                              <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                const ok = await confirm({ title: `Approve "${w.title}"?`, description: 'Workshop will become visible to clients for registration.', confirmLabel: 'Approve' });
                                if (!ok) return;
                                try { await api.approveWorkshop(w._id); toast({ title: "Approved" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                                const reason = window.prompt('Reason for rejection (optional):') || '';
                                try { await api.rejectWorkshop(w._id, reason); toast({ title: "Rejected" }); loadAll(); }
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

                {/* ===== PENDING SUPERVISOR APPLICATIONS ===== */}
                {(approvalCategory === 'all' || approvalCategory === 'supervision') && pendingSupervisors.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" /> Pending Supervisor Applications ({pendingSupervisors.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingSupervisors.map((t: any) => {
                        const sp = t.supervisorProfile || {};
                        return (
                          <Card key={t._id} className="p-4">
                            <div className="flex justify-between items-start gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{t.name} <span className="text-muted-foreground font-normal">({t.email})</span></p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {sp.therapyExperienceYears}+ yrs therapy · {sp.supervisionExperienceYears || 0}+ yrs supervision · Open to: <span className="capitalize">{sp.openTo}</span>
                                </p>
                                {sp.audience && <p className="text-xs text-muted-foreground mt-1"><strong>For:</strong> {sp.audience}</p>}
                                {sp.focusBio && <p className="text-xs text-muted-foreground mt-1 italic">"{sp.focusBio}"</p>}
                                <p className="text-xs text-muted-foreground mt-1">₹{sp.individualPrice50}/50min{sp.individualPrice90 > 0 ? ` · ₹${sp.individualPrice90}/90min` : ''}</p>
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                  const ok = await confirm({ title: `Approve ${t.name} as Supervisor?`, description: 'They will appear in the public supervisor directory once they also accept the "supervision" service.', confirmLabel: 'Approve' });
                                  if (!ok) return;
                                  try { await api.decideSupervisor(t._id, true); toast({ title: "Approved" }); loadAll(); }
                                  catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                                }}>
                                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                                  const reason = window.prompt('Reason for rejection (optional):') || '';
                                  try { await api.decideSupervisor(t._id, false, reason); toast({ title: "Rejected" }); loadAll(); }
                                  catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                                }}>
                                  <XCircle className="w-3 h-3 mr-1" /> Reject
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => openTherapistDetail(t._id)}>View Profile</Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ===== PENDING SUPERVISEE APPLICATIONS ===== */}
                {(approvalCategory === 'all' || approvalCategory === 'supervision') && pendingSupervisees.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" /> Pending Supervisee Applications ({pendingSupervisees.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingSupervisees.map((t: any) => {
                        const svp = t.superviseeProfile || {};
                        return (
                          <Card key={t._id} className="p-4">
                            <div className="flex justify-between items-start gap-3 flex-wrap">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{t.name} <span className="text-muted-foreground font-normal">({t.email})</span></p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {svp.experienceLevelHours} hrs experience · Caseload: {svp.currentCaseload}
                                </p>
                                {svp.goalsExpectations && <p className="text-xs text-muted-foreground mt-1 italic">"{svp.goalsExpectations}"</p>}
                                {svp.modalities && <p className="text-xs text-muted-foreground mt-1"><strong>Modalities:</strong> {svp.modalities}</p>}
                              </div>
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                  const ok = await confirm({ title: `Approve ${t.name} for Supervision?`, description: 'They will be able to book individual or group supervision.', confirmLabel: 'Approve' });
                                  if (!ok) return;
                                  try { await api.decideSupervisee(t._id, true); toast({ title: "Approved" }); loadAll(); }
                                  catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                                }}>
                                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                                  const reason = window.prompt('Reason for rejection (optional):') || '';
                                  try { await api.decideSupervisee(t._id, false, reason); toast({ title: "Rejected" }); loadAll(); }
                                  catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                                }}>
                                  <XCircle className="w-3 h-3 mr-1" /> Reject
                                </Button>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ===== PENDING SUPERVISION GROUPS ===== */}
                {(approvalCategory === 'all' || approvalCategory === 'supervision') && pendingSupervisionGroups.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" /> Pending Supervision Groups ({pendingSupervisionGroups.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingSupervisionGroups.map((g: any) => (
                        <Card key={g._id} className="p-4">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{g.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{g.level} · {g.totalSessions}×{g.durationMinutes}min · ₹{g.pricePer4Sessions}/{g.totalSessions} sessions · Up to {g.groupSize} members</p>
                              <p className="text-xs text-muted-foreground mt-1">Led by: {(g.supervisorTherapistIds || []).map((t: any) => t.name).join(' & ')}</p>
                              {g.format && <p className="text-xs text-muted-foreground mt-1"><strong>Format:</strong> {g.format}</p>}
                              {g.description && <p className="text-xs text-muted-foreground mt-1 italic">"{g.description}"</p>}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                const ok = await confirm({ title: `Approve "${g.title}"?`, description: 'It will appear in the public supervision page.', confirmLabel: 'Approve' });
                                if (!ok) return;
                                try { await api.decideSupervisionGroup(g._id, true); toast({ title: "Approved" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                                const reason = window.prompt('Reason for rejection (optional):') || '';
                                try { await api.decideSupervisionGroup(g._id, false, reason); toast({ title: "Rejected" }); loadAll(); }
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

                {/* ===== PENDING TRAINING PROGRAMS ===== */}
                {(approvalCategory === 'all' || approvalCategory === 'groups') && pendingTrainings.length > 0 && (
                  <div className="mt-10">
                    <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-primary" /> Pending Training Programs ({pendingTrainings.length})
                    </h3>
                    <div className="space-y-2">
                      {pendingTrainings.map((tr: any) => (
                        <Card key={tr._id} className="p-4">
                          <div className="flex justify-between items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{tr.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {tr.totalSessions || '?'} sessions · {tr.totalDurationHours || '?'} hrs · ₹{tr.pricePerTrainee}/trainee · {tr.mode}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">By: {(tr.facilitators || []).map((f: any) => f.name || f.therapistId?.name).filter(Boolean).join(' & ')}</p>
                              {tr.startDate && <p className="text-xs text-muted-foreground">Starts: {new Date(tr.startDate).toLocaleDateString('en-IN')}</p>}
                              {tr.about && <p className="text-xs text-muted-foreground mt-1 italic line-clamp-2">"{tr.about}"</p>}
                              {(tr.facilitatorCommitmentHours || tr.traineeCommitmentHours) > 0 && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Commitment — Facilitator: {tr.facilitatorCommitmentHours}h · Trainee: {tr.traineeCommitmentHours}h
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2 flex-wrap">
                              <Button size="sm" variant="outline" onClick={() => window.open(`/trainings/${tr._id}`, '_blank')}>Preview</Button>
                              <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={async () => {
                                const ok = await confirm({ title: `Approve "${tr.title}"?`, description: 'It will appear on the public trainings page.', confirmLabel: 'Approve' });
                                if (!ok) return;
                                try { await api.approveTraining(tr._id); toast({ title: "Approved" }); loadAll(); }
                                catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                              }}>
                                <CheckCircle className="w-3 h-3 mr-1" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={async () => {
                                const reason = window.prompt('Reason for rejection (optional):') || '';
                                try { await api.rejectTraining(tr._id, reason); toast({ title: "Rejected" }); loadAll(); }
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

                {/* "All caught up" — when literally nothing is pending */}
                {pending.length === 0 && pendingReviews.length === 0 && pendingNegotiations.length === 0 && pendingGroups.length === 0 && pendingCouples.length === 0 && serviceChangeRequests.length === 0 && pendingWorkshops.length === 0 && pendingSupervisors.length === 0 && pendingSupervisees.length === 0 && pendingSupervisionGroups.length === 0 && pendingTrainings.length === 0 && (
                  <Card className="p-12 text-center mt-4">
                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                    <p className="text-muted-foreground">No pending items. All caught up!</p>
                  </Card>
                )}
              </TabsContent>

              {/* ========== ALL THERAPISTS ========== */}
              <TabsContent value="therapists">
                {(() => {
                  // Apply the account-status filter. accountStatus on the
                  // Therapist model is 'active' | 'past' (past === soft-deleted).
                  const filteredTherapists = allTherapists.filter(t =>
                    therapistsAccountFilter === 'all' || (t.accountStatus || 'active') === therapistsAccountFilter
                  );
                  const activeCount = allTherapists.filter(t => (t.accountStatus || 'active') === 'active').length;
                  const pastCount = allTherapists.filter(t => t.accountStatus === 'past').length;
                  return (
                    <>
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <h2 className="text-xl font-semibold text-foreground">All Therapists ({filteredTherapists.length})</h2>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { value: 'all', label: `All (${allTherapists.length})` },
                            { value: 'active', label: `Active (${activeCount})` },
                            { value: 'past', label: `Past (${pastCount})` },
                          ] as const).map(opt => (
                            <Badge
                              key={opt.value}
                              variant={therapistsAccountFilter === opt.value ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => setTherapistsAccountFilter(opt.value)}
                            >
                              {opt.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        {filteredTherapists.map(t => (
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
                                    loadAll();
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
                                  <DropdownMenuItem onClick={() => setPricingModal({
                                    // Open the full services-and-pricing modal
                                    // (same form View Profile uses) so admin
                                    // sets each service's per-duration band
                                    // from the 3-dot menu too.
                                    open: true, therapist: t,
                                    max30: '', max50: '', min30: '', min50: '',
                                  })}>
                                    <IndianRupee className="w-3 h-3 mr-2" /> Set Pricing (Min/Max)
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={async () => {
                                    const next = t.therapistType === 'psychiatrist' ? 'psychologist' : 'psychiatrist';
                                    try {
                                      await api.setTherapistType(t._id, next);
                                      toast({ title: "Updated", description: `Set to ${next}` });
                                      loadAll();
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
                    </>
                  );
                })()}
              </TabsContent>

              {/* ========== REJECTED + REVOKED THERAPISTS ========== */}
              <TabsContent value="rejected">
                <h2 className="text-xl font-semibold text-foreground mb-1">Rejected & Revoked Therapists ({rejectedTherapists.length})</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Profiles we passed on (rejected) or pulled (revoked), kept on file. Revoked therapists have a 30-day reapply cooldown enforced by the server.
                </p>
                {rejectedTherapists.length === 0 ? (
                  <Card className="p-12 text-center"><p className="text-muted-foreground">No rejected therapist profiles.</p></Card>
                ) : (
                  <div className="space-y-3">
                    {rejectedTherapists.map((t: any) => {
                      const isRevoked = t.onboardingStatus === 'revoked';
                      const stamp = isRevoked ? t.revokedAt : t.rejectedAt;
                      const eligible = isRevoked && t.revokedAt
                        ? new Date(new Date(t.revokedAt).getTime() + 30 * 24 * 60 * 60 * 1000)
                        : null;
                      const daysLeft = eligible ? Math.max(0, Math.ceil((eligible.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0;
                      return (
                        <Card key={t._id} className="p-4">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-foreground">{t.name}</p>
                                <Badge variant="outline" className="text-xs">{t.title || 'Therapist'}</Badge>
                                <Badge className={isRevoked ? 'bg-amber-500/10 text-amber-700' : 'bg-destructive/10 text-destructive'}>
                                  {isRevoked ? 'Revoked' : 'Rejected'}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{t.email} · {t.phone || 'no phone'}</p>
                              <p className="text-xs text-muted-foreground mt-1">{t.experience || 0} years experience · {(t.specializations || []).slice(0, 4).join(', ')}</p>
                              {t.rejectionReason && (
                                <div className="mt-2 p-2 bg-destructive/5 border border-destructive/20 rounded text-xs">
                                  <strong>{isRevoked ? 'Revocation reason:' : 'Rejection reason:'}</strong> {t.rejectionReason}
                                </div>
                              )}
                              {stamp && (
                                <p className="text-[11px] text-muted-foreground mt-1">
                                  {isRevoked ? 'Revoked' : 'Rejected'} on {new Date(stamp).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}
                                </p>
                              )}
                              {isRevoked && eligible && daysLeft > 0 && (
                                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">
                                  Reapply unlocks in {daysLeft} day{daysLeft === 1 ? '' : 's'} (on {eligible.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })}).
                                </p>
                              )}
                              {isRevoked && eligible && daysLeft === 0 && (
                                <p className="text-[11px] text-green-700 dark:text-green-300 mt-1">30-day cooldown complete — eligible to reapply.</p>
                              )}
                            </div>
                            <Button size="sm" variant="outline" onClick={() => setDetailModal({ open: true, type: 'therapist', data: t, loading: false })}>
                              View Details
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ========== ALL CLIENTS ========== */}
              <TabsContent value="clients">
                {(() => {
                  // accountStatus on Client model: 'active' | 'past' (past =
                  // soft-deleted account, hidden from new bookings).
                  const filteredClients = allClients.filter((c: any) =>
                    clientsAccountFilter === 'all' || (c.accountStatus || 'active') === clientsAccountFilter
                  );
                  const activeCount = allClients.filter((c: any) => (c.accountStatus || 'active') === 'active').length;
                  const pastCount = allClients.filter((c: any) => c.accountStatus === 'past').length;
                  return (
                    <>
                      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                        <h2 className="text-xl font-semibold text-foreground">All Clients ({filteredClients.length})</h2>
                        <div className="flex flex-wrap gap-2">
                          {([
                            { value: 'all', label: `All (${allClients.length})` },
                            { value: 'active', label: `Active (${activeCount})` },
                            { value: 'past', label: `Past (${pastCount})` },
                          ] as const).map(opt => (
                            <Badge
                              key={opt.value}
                              variant={clientsAccountFilter === opt.value ? 'default' : 'outline'}
                              className="cursor-pointer"
                              onClick={() => setClientsAccountFilter(opt.value)}
                            >
                              {opt.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      {filteredClients.length === 0 ? (
                        <Card className="p-12 text-center">
                          <p className="text-muted-foreground">
                            {clientsAccountFilter === 'all' ? 'No clients registered yet.' : `No ${clientsAccountFilter} clients.`}
                          </p>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {filteredClients.map((c: any) => {
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
                    </>
                  );
                })()}
              </TabsContent>

              {/* ========== MESSAGES ========== */}
              {/* Admin can message any therapist (including those still in
                  onboarding / interview) and any client at any time. The
                  Pending Approvals card also has a "Message" shortcut that
                  jumps straight to a conversation here. */}
              <TabsContent value="messages">
                <Card className="p-0 overflow-hidden" style={{ height: '600px' }}>
                  <div className="flex h-full">
                    <div className={`w-full md:w-80 border-r overflow-y-auto p-3 ${chatConvKey ? 'hidden md:block' : ''}`}>
                      <h3 className="font-semibold text-foreground mb-1 px-1">Messages</h3>
                      <p className="text-xs text-muted-foreground mb-3 px-1">Reach out to any therapist or client — including pending interviews.</p>
                      <ConversationList
                        onSelectConversation={(key, other) => { setChatConvKey(key); setChatOtherUser(other); }}
                        selectedKey={chatConvKey}
                      />
                    </div>
                    <div className={`flex-1 ${!chatConvKey ? 'hidden md:flex' : 'flex'}`}>
                      <ChatWindow
                        conversationKey={chatConvKey}
                        otherUser={chatOtherUser}
                        onBack={() => { setChatConvKey(''); setChatOtherUser(null); }}
                      />
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* ========== INTERVIEWS ========== */}
              {/* Admin's interview calendar — every scheduled / past
                  interview with the therapist name, IST start time, a
                  Join button, and a "Download .ics" so admin can add it
                  to their own calendar even after the original email is
                  archived. */}
              <TabsContent value="interviews">
                {(() => {
                  const upcoming = interviews.filter((iv: any) => iv.status === 'scheduled')
                    .sort((a: any, b: any) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
                  const past = interviews.filter((iv: any) => iv.status !== 'scheduled')
                    .sort((a: any, b: any) => new Date(b.decidedAt || b.updatedAt).getTime() - new Date(a.decidedAt || a.updatedAt).getTime());

                  const statusBadgeIv = (s: string) => {
                    switch (s) {
                      case 'scheduled': return <Badge className="bg-primary/10 text-primary">Scheduled</Badge>;
                      case 'completed': return <Badge className="bg-success/10 text-success">Approved</Badge>;
                      case 'rejected':  return <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>;
                      case 'cancelled': return <Badge className="bg-amber-500/10 text-amber-700">Cancelled</Badge>;
                      default: return <Badge variant="outline">{s}</Badge>;
                    }
                  };

                  // Build a minimal RFC-5545 ICS in IST so admin can save it
                  // to their calendar from this tab even if the original
                  // scheduling email is gone.
                  const downloadIcs = (iv: any) => {
                    const sched = new Date(iv.scheduledDate);
                    // Compute end = start + 60min using UTC ms math (timezone-safe)
                    const end = new Date(sched.getTime() + 60 * 60 * 1000);
                    const pad = (n: number) => String(n).padStart(2, '0');
                    const istFmt = (d: Date) => {
                      // Floating IST datetime stamp: YYYYMMDDTHHMMSS
                      const parts = new Intl.DateTimeFormat('en-GB', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
                      }).formatToParts(d);
                      const g = (t: string) => parts.find(p => p.type === t)?.value || '';
                      return `${g('year')}${g('month')}${g('day')}T${g('hour')}${g('minute')}${g('second')}`;
                    };
                    const therapistName = iv.therapistId?.name || 'Therapist';
                    const summary = `Ehsaas Interview — ${therapistName}`;
                    const description = `${iv.notes || 'Onboarding interview with Ehsaas Therapy Centre.'}\\nJoin: ${iv.meetingLink || 'TBD'}`;
                    const ics = [
                      'BEGIN:VCALENDAR',
                      'VERSION:2.0',
                      'PRODID:-//Ehsaas Therapy Centre//Admin//EN',
                      'BEGIN:VEVENT',
                      `UID:interview-${iv._id}@ehsaastherapycentre.com`,
                      `DTSTAMP:${istFmt(new Date())}`,
                      `DTSTART;TZID=Asia/Kolkata:${istFmt(sched)}`,
                      `DTEND;TZID=Asia/Kolkata:${istFmt(end)}`,
                      `SUMMARY:${summary}`,
                      `DESCRIPTION:${description}`,
                      `LOCATION:${iv.meetingLink || ''}`,
                      'END:VEVENT',
                      'END:VCALENDAR',
                    ].join('\r\n');
                    const blob = new Blob([ics], { type: 'text/calendar' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `interview-${therapistName.replace(/\s+/g, '-').toLowerCase()}.ics`;
                    a.click();
                    URL.revokeObjectURL(url);
                  };

                  const renderRow = (iv: any) => (
                    <Card key={iv._id} className="p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold text-foreground">{iv.therapistId?.name || 'Therapist'}</p>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{iv.therapistId?.email || ''}</span>
                            {statusBadgeIv(iv.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDateTimeIst(iv.scheduledDate)}
                          </p>
                          {iv.meetingLink && (
                            <p className="text-xs text-muted-foreground mt-1 break-all">Link: <a className="text-primary underline" href={iv.meetingLink} target="_blank" rel="noopener noreferrer">{iv.meetingLink}</a></p>
                          )}
                          {iv.notes && <p className="text-xs text-muted-foreground mt-1"><em>{iv.notes}</em></p>}
                          {iv.decisionNote && iv.status !== 'scheduled' && (
                            <p className="text-xs text-muted-foreground mt-1"><strong>Decision:</strong> {iv.decisionNote}</p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          {iv.status === 'scheduled' && iv.meetingLink && (
                            <Button asChild size="sm">
                              <a href={iv.meetingLink} target="_blank" rel="noopener noreferrer">Join interview</a>
                            </Button>
                          )}
                          {iv.status === 'scheduled' && (
                            <Button size="sm" variant="outline" onClick={() => downloadIcs(iv)}>
                              <CalendarDays className="w-4 h-4 mr-1" /> Add to calendar
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );

                  return (
                    <div className="space-y-6">
                      <div>
                        <h2 className="text-xl font-semibold text-foreground mb-1">Upcoming Interviews ({upcoming.length})</h2>
                        <p className="text-xs text-muted-foreground mb-3">All times in IST. Join from your browser or download the .ics to add to your calendar.</p>
                        {upcoming.length === 0 ? (
                          <Card className="p-8 text-center"><p className="text-sm text-muted-foreground">No upcoming interviews. Schedule one from Pending Approvals.</p></Card>
                        ) : (
                          <div className="space-y-2">{upcoming.map(renderRow)}</div>
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-foreground mb-1">Past Interviews ({past.length})</h2>
                        {past.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No past interviews yet.</p>
                        ) : (
                          <div className="space-y-2">{past.map(renderRow)}</div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </TabsContent>

              {/* ========== ALL SESSIONS ========== */}
              <TabsContent value="sessions">
                <SessionsListWithFilters
                  sessions={allSessions}
                  role="admin"
                  onClientClick={(id) => openClientDetail(id)}
                />
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
      {/* Interview decision dialog (approve / reject / cancel a scheduled interview) */}
      <Dialog
        open={interviewDecisionModal.open}
        onOpenChange={(open) => { if (!open) setInterviewDecisionModal(p => ({ ...p, open: false })); }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {interviewDecisionModal.action === 'approve' && `Approve interview — ${interviewDecisionModal.therapistName}`}
              {interviewDecisionModal.action === 'reject' && `Reject after interview — ${interviewDecisionModal.therapistName}`}
              {interviewDecisionModal.action === 'cancel' && `Cancel interview slot — ${interviewDecisionModal.therapistName}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {interviewDecisionModal.action === 'approve' && (
              <p className="text-muted-foreground">
                Marks the interview as completed and approves the therapist. They'll be notified by email and in-app, and can finalise services & pricing on their dashboard.
              </p>
            )}
            {interviewDecisionModal.action === 'reject' && (
              <p className="text-muted-foreground">
                Marks the interview as rejected and moves the therapist into the rejected list. They'll receive the standard rejection email.
              </p>
            )}
            {interviewDecisionModal.action === 'cancel' && (
              <p className="text-muted-foreground">
                Scraps the interview slot. The therapist moves back to <strong>Pending</strong> and you can reschedule a new slot from this card.
              </p>
            )}
            <div>
              <label className="text-xs font-medium block mb-1">
                {interviewDecisionModal.action === 'reject' ? 'Rejection reason' : interviewDecisionModal.action === 'cancel' ? 'Reason (shown to therapist)' : 'Note (optional)'}
              </label>
              <Textarea
                rows={3}
                value={interviewDecisionModal.reason}
                onChange={e => setInterviewDecisionModal(p => ({ ...p, reason: e.target.value }))}
                placeholder={interviewDecisionModal.action === 'approve' ? 'Welcome note, next steps, etc.' : 'Why?'}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setInterviewDecisionModal(p => ({ ...p, open: false }))}>Cancel</Button>
            <Button
              variant={interviewDecisionModal.action === 'reject' ? 'destructive' : 'default'}
              onClick={async () => {
                if (!interviewDecisionModal.action) return;
                try {
                  await api.decideInterview(interviewDecisionModal.interviewId, interviewDecisionModal.action, interviewDecisionModal.reason);
                  toast({
                    title: interviewDecisionModal.action === 'approve' ? 'Interview approved' :
                           interviewDecisionModal.action === 'reject'  ? 'Interview rejected' :
                                                                          'Interview cancelled',
                    description: `${interviewDecisionModal.therapistName} has been notified.`,
                  });
                  setInterviewDecisionModal({ open: false, interviewId: '', therapistName: '', action: null, reason: '' });
                  loadAll();
                } catch (e: any) {
                  toast({ title: 'Failed', description: e.message || 'Try again later', variant: 'destructive' });
                }
              }}
            >
              {interviewDecisionModal.action === 'approve' && 'Approve & notify'}
              {interviewDecisionModal.action === 'reject' && 'Reject & notify'}
              {interviewDecisionModal.action === 'cancel' && 'Cancel slot & notify'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  <label className="text-sm font-medium">Date & Time <span className="text-xs text-muted-foreground font-normal">(IST)</span></label>
                  <Input
                    type="datetime-local"
                    // Show / capture the value in IST regardless of the
                    // admin's browser timezone. Stored as a plain
                    // "YYYY-MM-DDTHH:MM" string for the lifetime of the
                    // modal; converted to a proper UTC ISO at submit time.
                    value={toIstDatetimeLocal(interviewModal.scheduledAt)}
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
                    // Submit-time conversion: the modal's local-state
                    // scheduledAt is either a raw datetime-local string
                    // (user just typed it) or a stored ISO (loaded from
                    // the server). Normalise both into "YYYY-MM-DDTHH:MM"
                    // in IST, then convert IST → UTC ISO for storage.
                    const istLocal = toIstDatetimeLocal(interviewModal.scheduledAt) || interviewModal.scheduledAt;
                    const interviewScheduledAt = istLocal ? istDatetimeLocalToIso(istLocal) : undefined;
                    await api.setTherapistInterview(interviewModal.therapistId, {
                      status: interviewModal.status,
                      interviewLink: interviewModal.link || undefined,
                      interviewScheduledAt,
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
                    loadAll();
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

      {/* Set Pricing Modal — uses the same ServicesFinalizeForm View Profile
          uses, so admin sees the full per-service per-duration breakdown
          (individual 30+50, couples & supervision 50+90, family/group
          single band). Min appears before Max in every row. */}
      <Dialog open={pricingModal.open} onOpenChange={(open) => { if (!open) setPricingModal({ open: false, therapist: null, max30: '', max50: '', min30: '', min50: '' }); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Pricing for {pricingModal.therapist?.name}</DialogTitle>
          </DialogHeader>
          {pricingModal.therapist && (
            <ServicesFinalizeForm
              therapistId={pricingModal.therapist._id}
              servicesOffered={pricingModal.therapist.servicesOffered || []}
              approvedServices={pricingModal.therapist.approvedServices || []}
              onSaved={() => {
                setPricingModal({ open: false, therapist: null, max30: '', max50: '', min30: '', min50: '' });
                loadAll();
              }}
            />
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setPricingModal({ open: false, therapist: null, max30: '', max50: '', min30: '', min50: '' })}>Close</Button>
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
