import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Calendar, Clock, DollarSign, Users, TrendingUp, CheckCircle,
  XCircle, Settings, BarChart3, ChevronRight, LogOut, FileText, MessageCircle, ClipboardList, Phone, BookOpen, Library,
  MoreVertical, User as UserIcon
} from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { TherapistOnboarding } from "@/components/TherapistOnboarding";
import { SessionNotesDialog } from "@/components/SessionNotesDialog";
import { ClientHistoryForm } from "@/components/ClientHistoryForm";
import { CalendarSyncButton } from "@/components/CalendarSyncButton";
import { ConversationList } from "@/components/ConversationList";
import { ChatWindow } from "@/components/ChatWindow";
import { SupervisionRequestForm } from "@/components/SupervisionRequestForm";
import { TherapistResources } from "@/components/TherapistResources";
import { PsychiatristPrescriptions } from "@/components/PsychiatristPrescriptions";
import { SessionFilterBar, applySessionFilters, buildEntityOptions, defaultFilters } from "@/components/SessionFilterBar";
import { TherapistEarningsTab } from "@/components/TherapistEarningsTab";
import { TherapistGroupsTab } from "@/components/TherapistGroupsTab";
import { TherapistProfileTab } from "@/components/TherapistProfileTab";
import { DashboardSidebar, SidebarItem } from "@/components/DashboardSidebar";
import { CancelSessionDialog } from "@/components/CancelSessionDialog";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TherapistDashboard = () => {
  const { user, role, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [stats, setStats] = useState<any>(null);
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [upcomingFilters, setUpcomingFilters] = useState(defaultFilters);
  const [pastFilters, setPastFilters] = useState(defaultFilters);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; sessionId: string; clientName?: string; sessionDate?: string; sessionTime?: string; paymentStatus?: string } | null>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [notesSessionId, setNotesSessionId] = useState<string | null>(null);
  const [waitlistCount, setWaitlistCount] = useState(0);
  const [chatConvKey, setChatConvKey] = useState('');
  const [chatOtherUser, setChatOtherUser] = useState<any>(null);
  const [introCalls, setIntroCalls] = useState<any[]>([]);
  const [supervisionSessions, setSupervisionSessions] = useState<any[]>([]);
  const [showSupervisionForm, setShowSupervisionForm] = useState(false);
  const [clientHistoryModal, setClientHistoryModal] = useState<{ clientId: string; clientName: string } | null>(null);
  const [clientsNeedingHistory, setClientsNeedingHistory] = useState<any[]>([]);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState(8);

  useEffect(() => {
    if (isLoading) return; // Wait for auth to load
    if (!user || role !== 'therapist') {
      navigate('/');
      return;
    }
    // Only load dashboard if fully approved
    if (user.isOnboarded && user.isApproved) {
      loadDashboard();
    }
  }, [user, role, isLoading]);

  // React to URL tab param changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const loadDashboard = async () => {
    try {
      const [statsData, upcoming, past, profile, waitlist, calls, supervision, needsHistory] = await Promise.all([
        api.getTherapistStats(),
        api.getTherapistSessions('upcoming'),
        api.getTherapistSessions('past'),
        api.getTherapistDashboardProfile(),
        api.getTherapistWaitlist().catch(() => []),
        api.getTherapistIntroCalls().catch(() => []),
        api.getMySupervision().catch(() => []),
        api.getClientsNeedingHistory().catch(() => []),
      ]);
      setStats(statsData);
      setUpcomingSessions(upcoming);
      setPastSessions(past);
      setAvailability(profile.availability || []);
      setMaxSessionsPerDay(profile.maxSessionsPerDay || 8);
      setWaitlistCount(waitlist.length || 0);
      setIntroCalls(calls);
      setSupervisionSessions(supervision);
      setClientsNeedingHistory(needsHistory);
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  };

  const handleStatusUpdate = async (sessionId: string, status: string) => {
    try {
      await api.updateSessionStatus(sessionId, status);
      toast({ title: "Updated", description: `Session marked as ${status}` });
      loadDashboard();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAvailabilityUpdate = async () => {
    try {
      await api.updateTherapistAvailability(availability);
      toast({ title: "Saved", description: "Availability updated successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleDay = (dayOfWeek: number) => {
    setAvailability(prev => {
      const existing = prev.find(a => a.dayOfWeek === dayOfWeek);
      if (existing) {
        return prev.map(a => a.dayOfWeek === dayOfWeek ? { ...a, isAvailable: !a.isAvailable } : a);
      } else {
        return [...prev, { dayOfWeek, startTime: '09:00', endTime: '18:00', chunks: [{ startTime: '09:00', endTime: '18:00' }], isAvailable: true }];
      }
    });
  };

  const updateChunk = (dayOfWeek: number, chunkIdx: number, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev =>
      prev.map(a => {
        if (a.dayOfWeek !== dayOfWeek) return a;
        const chunks = Array.isArray(a.chunks) && a.chunks.length > 0
          ? [...a.chunks]
          : [{ startTime: a.startTime || '09:00', endTime: a.endTime || '18:00' }];
        chunks[chunkIdx] = { ...chunks[chunkIdx], [field]: value };
        // Keep legacy fields synced to first chunk for backward compat
        return {
          ...a,
          chunks,
          startTime: chunks[0]?.startTime || a.startTime,
          endTime: chunks[chunks.length - 1]?.endTime || a.endTime,
        };
      })
    );
  };

  const addChunk = (dayOfWeek: number) => {
    setAvailability(prev =>
      prev.map(a => {
        if (a.dayOfWeek !== dayOfWeek) return a;
        const chunks = Array.isArray(a.chunks) && a.chunks.length > 0
          ? [...a.chunks]
          : [{ startTime: a.startTime || '09:00', endTime: a.endTime || '18:00' }];
        chunks.push({ startTime: '14:00', endTime: '17:00' });
        return { ...a, chunks };
      })
    );
  };

  const removeChunk = (dayOfWeek: number, chunkIdx: number) => {
    setAvailability(prev =>
      prev.map(a => {
        if (a.dayOfWeek !== dayOfWeek) return a;
        const chunks = (Array.isArray(a.chunks) && a.chunks.length > 0 ? [...a.chunks] : []);
        if (chunks.length <= 1) return a; // keep at least one chunk
        chunks.splice(chunkIdx, 1);
        return { ...a, chunks };
      })
    );
  };

  const updateDayMaxSessions = (dayOfWeek: number, value: number | null) => {
    setAvailability(prev =>
      prev.map(a => a.dayOfWeek === dayOfWeek ? { ...a, maxSessionsThisDay: value } : a)
    );
  };

  if (isLoading || !user) return null;

  // Gate: show onboarding if not onboarded or not approved
  if (!user.isOnboarded || !user.isApproved) {
    return <TherapistOnboarding />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('dashboard.welcome')}, {user.name}</h1>
              <p className="text-muted-foreground mt-1">Therapist Dashboard</p>
            </div>
            <Button variant="outline" onClick={() => { logout(); navigate('/'); }}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>

          {(() => {
            const pendingIntroCalls = introCalls.filter(c => c.status === 'pending').length;
            const sidebarItems: SidebarItem[] = [
              { value: 'overview', label: t('dashboard.overview'), icon: BarChart3, group: 'Overview' },
              { value: 'earnings', label: t('dashboard.earnings'), icon: DollarSign, group: 'Overview' },
              { value: 'profile', label: 'Profile', icon: UserIcon, group: 'Overview' },
              { value: 'upcoming', label: t('dashboard.upcoming'), icon: Calendar, group: 'Sessions' },
              { value: 'past', label: t('dashboard.past'), icon: Clock, group: 'Sessions' },
              { value: 'availability', label: t('dashboard.availability'), icon: Settings, group: 'Sessions' },
              { value: 'intro-calls', label: t('dashboard.introCalls'), icon: Phone, badge: pendingIntroCalls || null, group: 'Clients' },
              { value: 'messages', label: t('dashboard.messages'), icon: MessageCircle, group: 'Clients' },
              { value: 'group-therapy', label: 'Group Therapy', icon: Users, group: 'Content' },
              { value: 'resources', label: 'Resources', icon: Library, group: 'Content' },
              { value: 'supervision', label: t('dashboard.supervision'), icon: BookOpen, group: 'Content' },
              ...(user?.therapistType === 'psychiatrist' ? [{ value: 'prescriptions', label: 'Prescriptions', icon: FileText, group: 'Content' } as SidebarItem] : []),
            ];
            return (
              <div className="flex gap-6">
                <DashboardSidebar items={sidebarItems} activeValue={activeTab} onChange={setActiveTab} />
                <div className="flex-1 min-w-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="hidden">
                      {sidebarItems.map(i => <TabsTrigger key={i.value} value={i.value}>{i.label}</TabsTrigger>)}
                    </TabsList>

            {/* ========== OVERVIEW TAB ========== */}
            <TabsContent value="overview">
              {stats && (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card className="p-6">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Sessions</p>
                            <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="p-6">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center">
                            <Clock className="w-6 h-6 text-secondary" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Total Hours</p>
                            <p className="text-2xl font-bold text-foreground">{stats.totalHours}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="p-6">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Earnings</p>
                            <p className="text-2xl font-bold text-foreground">₹{stats.totalEarnings.toLocaleString()}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="p-6">
                      <CardContent className="p-0">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-warm/10 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-warm" />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Upcoming</p>
                            <p className="text-2xl font-bold text-foreground">{stats.upcomingSessions}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Clients Needing History Alert */}
                  {clientsNeedingHistory.length > 0 && (
                    <Card className="p-4 bg-warm/5 border-warm/20 mb-4">
                      <p className="text-sm font-medium text-warm mb-2">⚠️ {clientsNeedingHistory.length} client(s) need intake history</p>
                      <div className="flex flex-wrap gap-2">
                        {clientsNeedingHistory.map(c => (
                          <Button key={c._id} size="sm" variant="outline" className="text-xs" onClick={() => setClientHistoryModal({ clientId: c._id, clientName: c.name })}>
                            <ClipboardList className="w-3 h-3 mr-1" /> {c.name}
                          </Button>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Upcoming Sessions Preview */}
                  <Card className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-xl font-semibold text-foreground">Upcoming Sessions</h2>
                      <Button variant="outline" size="sm" onClick={() => setActiveTab('upcoming')}>
                        View All <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    {upcomingSessions.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8">No upcoming sessions</p>
                    ) : (
                      <div className="space-y-3">
                        {upcomingSessions.slice(0, 5).map(session => (
                          <div key={session._id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium text-foreground">{session.clientId?.name || 'Client'}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(session.date).toLocaleDateString()} at {session.startTime} • {session.duration} min
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">₹{session.amount}</Badge>
                              <Badge className="bg-primary/10 text-primary">{session.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </>
              )}
            </TabsContent>

            {/* ========== UPCOMING SESSIONS TAB ========== */}
            <TabsContent value="upcoming">
              <SessionFilterBar
                filters={upcomingFilters}
                onChange={setUpcomingFilters}
                entityType="client"
                entityOptions={buildEntityOptions(upcomingSessions, 'client')}
              />
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming Sessions</h2>
                {(() => {
                  const filtered = applySessionFilters(upcomingSessions, upcomingFilters, 'client');
                  return filtered.length === 0 ? (
                    <p className="text-muted-foreground text-center py-12">No upcoming sessions match filters</p>
                  ) : (
                  <div className="space-y-4">
                    {filtered.map(session => (
                      <div key={session._id} className="flex items-center justify-between p-4 border rounded-lg gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{session.clientId?.name || 'Client'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(session.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} · {session.startTime}
                          </p>
                        </div>
                        {/* Front: only price + recurring */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge variant="secondary" className="text-base">₹{session.amount}</Badge>
                          {session.isRecurring && <Badge variant="outline" className="text-xs">Recurring</Badge>}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStatusUpdate(session._id, 'completed')}>
                                <CheckCircle className="w-3 h-3 mr-2 text-green-600" /> Mark Complete
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                if (window.confirm(`Mark this session as no-show? Client will be emailed.`)) handleStatusUpdate(session._id, 'no-show');
                              }}>
                                <span className="w-3 h-3 mr-2 inline-flex items-center justify-center text-orange-600">○</span> Mark No-Show
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setCancelDialog({
                                open: true,
                                sessionId: session._id,
                                clientName: session.clientId?.name,
                                sessionDate: new Date(session.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }),
                                sessionTime: session.startTime,
                                paymentStatus: session.paymentStatus,
                              })} className="text-destructive">
                                <XCircle className="w-3 h-3 mr-2" /> Cancel Session
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild>
                                <div className="cursor-default">
                                  <CalendarSyncButton
                                    title={`Session with ${session.clientId?.name || 'Client'}`}
                                    date={session.date?.split('T')[0] || ''}
                                    startTime={session.startTime}
                                    endTime={session.endTime}
                                    duration={session.duration}
                                  />
                                </div>
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled className="text-xs">
                                {session.endTime} · {session.duration} min · {session.clientId?.email || ''}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                  );
                })()}
              </Card>
            </TabsContent>

            {/* ========== PAST SESSIONS TAB ========== */}
            <TabsContent value="past">
              <SessionFilterBar
                filters={pastFilters}
                onChange={setPastFilters}
                entityType="client"
                entityOptions={buildEntityOptions(pastSessions, 'client')}
              />
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Past Sessions</h2>
                {(() => {
                  const filtered = applySessionFilters(pastSessions, pastFilters, 'client');
                  return filtered.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">No past sessions match filters</p>
                ) : (
                  <div className="space-y-3">
                    {filtered.map(session => (
                      <div key={session._id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{session.clientId?.name || 'Client'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            {' '}at {session.startTime} • {session.duration} min
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">₹{session.amount}</Badge>
                          <Badge
                            variant={session.status === 'completed' ? 'default' : 'destructive'}
                            className={session.status === 'completed' ? 'bg-success/10 text-success' : ''}
                          >
                            {session.status}
                          </Badge>
                          {session.status === 'completed' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => setNotesSessionId(session._id)}>
                                <FileText className="w-3 h-3 mr-1" />
                                {session.notes?.clientMood || session.notes?.importantNotes ? 'View Notes' : 'Add Notes'}
                              </Button>
                              <Button size="sm" variant="ghost" className="text-xs" onClick={() => setClientHistoryModal({ clientId: session.clientId?._id || session.clientId, clientName: session.clientId?.name || 'Client' })}>
                                <ClipboardList className="w-3 h-3 mr-1" /> History
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
                })()}
              </Card>
            </TabsContent>

            {/* ========== AVAILABILITY TAB ========== */}
            <TabsContent value="availability">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-6">Set Your Availability</h2>
                <div className="space-y-4">
                  {DAYS.map((day, index) => {
                    const slot = availability.find(a => a.dayOfWeek === index);
                    const isActive = slot?.isAvailable ?? false;
                    const chunks = (Array.isArray(slot?.chunks) && slot.chunks.length > 0)
                      ? slot.chunks
                      : [{ startTime: slot?.startTime || '09:00', endTime: slot?.endTime || '18:00' }];

                    return (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="w-28">
                            <p className="font-medium text-foreground">{day}</p>
                          </div>
                          <Switch
                            checked={isActive}
                            onCheckedChange={() => toggleDay(index)}
                          />
                          {!isActive && <span className="text-sm text-muted-foreground">Not available</span>}

                          {isActive && (
                            <div className="flex items-center gap-2 ml-auto">
                              <label className="text-xs text-muted-foreground">Max sessions:</label>
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                placeholder="Default"
                                value={slot?.maxSessionsThisDay ?? ''}
                                onChange={e => updateDayMaxSessions(index, e.target.value === '' ? null : parseInt(e.target.value))}
                                className="w-24 text-center"
                                title="Leave empty to use the default daily limit below"
                              />
                            </div>
                          )}
                        </div>

                        {isActive && (
                          <div className="mt-3 space-y-2 pl-32">
                            {chunks.map((c: any, cIdx: number) => (
                              <div key={cIdx} className="flex items-center gap-2 flex-wrap">
                                <Input
                                  type="time"
                                  value={c.startTime || '09:00'}
                                  onChange={e => updateChunk(index, cIdx, 'startTime', e.target.value)}
                                  className="w-32"
                                />
                                <span className="text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  value={c.endTime || '18:00'}
                                  onChange={e => updateChunk(index, cIdx, 'endTime', e.target.value)}
                                  className="w-32"
                                />
                                {chunks.length > 1 && (
                                  <Button size="sm" variant="ghost" onClick={() => removeChunk(index, cIdx)} className="text-destructive">
                                    Remove
                                  </Button>
                                )}
                              </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={() => addChunk(index)}>
                              + Add another time slot
                            </Button>
                            <p className="text-xs text-muted-foreground italic">e.g. 9:00–12:00 and 14:00–18:00 (lunch break in between).</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Max Sessions Per Day — DEFAULT (used when per-day not set) */}
                <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">Default Max Sessions Per Day</p>
                      <p className="text-xs text-muted-foreground">Used for any day where you didn't set a per-day limit above</p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={maxSessionsPerDay}
                      onChange={e => setMaxSessionsPerDay(parseInt(e.target.value) || 8)}
                      className="w-20 text-center"
                    />
                  </div>
                </div>

                <Button onClick={async () => {
                  await handleAvailabilityUpdate();
                  try {
                    await api.updateTherapistProfile({ maxSessionsPerDay });
                    toast({ title: "Saved", description: "Max sessions per day updated" });
                  } catch {}
                }} className="mt-6" size="lg">
                  Save Availability & Settings
                </Button>
              </Card>
            </TabsContent>

            {/* ========== INTRO CALLS TAB ========== */}
            <TabsContent value="intro-calls">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Intro Call Requests</h2>
                {introCalls.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">No intro call requests yet</p>
                ) : (
                  <div className="space-y-4">
                    {introCalls.map(call => (
                      <div key={call._id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium text-foreground">{call.clientName}</p>
                          <p className="text-sm text-muted-foreground">{call.email} • {call.phone}</p>
                          <p className="text-sm text-muted-foreground mt-1"><strong>Reason:</strong> {call.reasonForTherapy}</p>
                          <p className="text-sm text-muted-foreground"><strong>Looking for:</strong> {call.whatLookingFor}</p>
                          <p className="text-sm text-muted-foreground"><strong>Preferred:</strong> {new Date(call.preferredDateTime).toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge className={call.status === 'pending' ? 'bg-warm/10 text-warm' : call.status === 'approved' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}>
                            {call.status}
                          </Badge>
                          {call.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button size="sm" onClick={async () => {
                                await api.updateIntroCallStatus(call._id, 'approved');
                                toast({ title: "Approved", description: "Client has been notified" });
                                loadDashboard();
                              }}>
                                <CheckCircle className="w-4 h-4 mr-1" /> Accept
                              </Button>
                              <Button size="sm" variant="destructive" onClick={async () => {
                                await api.updateIntroCallStatus(call._id, 'rejected');
                                toast({ title: "Rejected" });
                                loadDashboard();
                              }}>
                                <XCircle className="w-4 h-4 mr-1" /> Decline
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ========== SUPERVISION TAB ========== */}
            <TabsContent value="supervision">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-foreground">Supervision Sessions</h2>
                  <Button onClick={() => setShowSupervisionForm(true)}>
                    <BookOpen className="w-4 h-4 mr-2" /> Request Supervision
                  </Button>
                </div>
                {supervisionSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">No supervision sessions yet. Request one to get started.</p>
                ) : (
                  <div className="space-y-4">
                    {supervisionSessions.map(s => (
                      <div key={s._id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground">{s.topic}</p>
                            <p className="text-sm text-muted-foreground">
                              {s.type === 'individual' ? 'Individual' : 'Group'} Supervision
                              {s.type === 'individual' && s.supervisorId && ` with ${s.supervisorId.name}`}
                            </p>
                          </div>
                          <Badge className={
                            s.status === 'scheduled' ? 'bg-success/10 text-success' :
                            s.status === 'admin_approved' ? 'bg-primary/10 text-primary' :
                            s.status === 'requested' ? 'bg-warm/10 text-warm' :
                            s.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                            'bg-muted text-muted-foreground'
                          }>
                            {s.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        {s.date && (
                          <p className="text-sm text-muted-foreground">
                            {new Date(s.date).toLocaleDateString('en-IN')} at {s.startTime}
                            {s.meetingLink && <> • <a href={s.meetingLink} target="_blank" rel="noopener noreferrer" className="text-primary underline">Join Meeting</a></>}
                          </p>
                        )}
                        {s.type === 'group' && s.participants?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {s.participants.map((p: any, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {p.therapistId?.name || 'Therapist'} ({p.status})
                              </Badge>
                            ))}
                          </div>
                        )}
                        {s.adminNotes && <p className="text-sm text-muted-foreground mt-1"><strong>Admin notes:</strong> {s.adminNotes}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ========== GROUP THERAPY TAB ========== */}
            <TabsContent value="group-therapy">
              <TherapistGroupsTab />
            </TabsContent>

            {/* ========== RESOURCES TAB ========== */}
            <TabsContent value="resources">
              <TherapistResources />
            </TabsContent>

            {/* ========== PRESCRIPTIONS TAB (psychiatrist only) ========== */}
            {user?.therapistType === 'psychiatrist' && (
              <TabsContent value="prescriptions">
                <PsychiatristPrescriptions />
              </TabsContent>
            )}

            {/* ========== MESSAGES TAB ========== */}
            <TabsContent value="messages">
              <Card className="p-0 overflow-hidden" style={{ height: '500px' }}>
                <div className="flex h-full">
                  <div className={`w-full md:w-80 border-r overflow-y-auto p-3 ${chatConvKey ? 'hidden md:block' : ''}`}>
                    <h3 className="font-semibold text-foreground mb-3 px-1">Messages</h3>
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

            {/* ========== EARNINGS TAB ========== */}
            <TabsContent value="earnings">
              <TherapistEarningsTab />
            </TabsContent>

            {/* ========== PROFILE TAB ========== */}
            <TabsContent value="profile">
              <TherapistProfileTab />
            </TabsContent>
          </Tabs>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Session Notes Dialog */}
      {notesSessionId && (
        <SessionNotesDialog
          sessionId={notesSessionId}
          isOpen={!!notesSessionId}
          onClose={() => { setNotesSessionId(null); loadDashboard(); }}
        />
      )}

      {/* Cancel Session Dialog (mandatory reason + email) */}
      {cancelDialog && (
        <CancelSessionDialog
          isOpen={cancelDialog.open}
          onClose={() => setCancelDialog(null)}
          onSuccess={() => loadDashboard()}
          sessionId={cancelDialog.sessionId}
          clientName={cancelDialog.clientName}
          sessionDate={cancelDialog.sessionDate}
          sessionTime={cancelDialog.sessionTime}
          paymentStatus={cancelDialog.paymentStatus}
        />
      )}

      {/* Client History Form */}
      {clientHistoryModal && (
        <ClientHistoryForm
          clientId={clientHistoryModal.clientId}
          clientName={clientHistoryModal.clientName}
          isOpen={!!clientHistoryModal}
          onClose={() => setClientHistoryModal(null)}
          onSaved={() => loadDashboard()}
        />
      )}

      {/* Supervision Request Form */}
      {showSupervisionForm && (
        <SupervisionRequestForm
          isOpen={showSupervisionForm}
          onClose={() => setShowSupervisionForm(false)}
          onCreated={() => loadDashboard()}
        />
      )}
    </div>
  );
};

export default TherapistDashboard;
