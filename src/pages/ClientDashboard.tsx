import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import {
  Calendar, Clock, Search, Star, Languages, LogOut, ChevronRight,
  Filter, XCircle, MessageCircle, Repeat, Library
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { CalendarSyncButton } from "@/components/CalendarSyncButton";
import { ReviewForm } from "@/components/ReviewForm";
import { ConversationList } from "@/components/ConversationList";
import { ChatWindow } from "@/components/ChatWindow";
import { ClientResources } from "@/components/ClientResources";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const THERAPY_CONCERNS = [
  "Anxiety", "Depression", "Trauma", "Relationship Issues", "Self-esteem",
  "Grief", "LGBTQ+", "Stress", "Life Transitions", "Identity",
  "Anger Management", "OCD", "PTSD"
];

const ClientDashboard = () => {
  const { user, role, logout, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'find-therapist');
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [pastSessions, setPastSessions] = useState<any[]>([]);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedConcern, setSelectedConcern] = useState('');
  const [reviewSession, setReviewSession] = useState<{ id: string; therapistName: string } | null>(null);
  const [chatConvKey, setChatConvKey] = useState('');
  const [chatOtherUser, setChatOtherUser] = useState<any>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user || role !== 'client') {
      navigate('/');
      return;
    }
    loadDashboard();
  }, [user, role, isLoading]);

  // React to URL tab param changes
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const loadDashboard = async () => {
    try {
      const [upcoming, past] = await Promise.all([
        api.getClientSessions('upcoming'),
        api.getClientSessions('past'),
      ]);
      setUpcomingSessions(upcoming);
      setPastSessions(past);
      searchTherapists();
    } catch (error) {
      console.error('Dashboard load error:', error);
    }
  };

  const searchTherapists = async () => {
    try {
      const params: any = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedConcern) params.specialization = selectedConcern;
      const data = await api.getTherapists(params);
      setTherapists(data);
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchTherapists();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedConcern]);

  const handleCancelSession = async (sessionId: string) => {
    try {
      await api.cancelSession(sessionId);
      toast({ title: "Cancelled", description: "Session has been cancelled" });
      loadDashboard();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('dashboard.welcome')}, {user.name}</h1>
              <p className="text-muted-foreground mt-1">Your wellness dashboard</p>
            </div>
            <Button variant="outline" onClick={() => { logout(); navigate('/'); }}>
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex-wrap">
              <TabsTrigger value="find-therapist"><Search className="w-4 h-4 mr-2" />{t('common.search')}</TabsTrigger>
              <TabsTrigger value="upcoming"><Calendar className="w-4 h-4 mr-2" />{t('dashboard.upcoming')}</TabsTrigger>
              <TabsTrigger value="past"><Clock className="w-4 h-4 mr-2" />{t('dashboard.past')}</TabsTrigger>
              <TabsTrigger value="resources"><Library className="w-4 h-4 mr-2" />Resources</TabsTrigger>
              <TabsTrigger value="messages"><MessageCircle className="w-4 h-4 mr-2" />{t('dashboard.messages')}</TabsTrigger>
            </TabsList>

            {/* ========== FIND THERAPIST TAB ========== */}
            <TabsContent value="find-therapist">
              {/* Search & Filter */}
              <Card className="p-6 mb-6">
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by name, specialization..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">What are you looking for help with?</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={selectedConcern === '' ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedConcern('')}
                      >
                        All
                      </Badge>
                      {THERAPY_CONCERNS.map(concern => (
                        <Badge
                          key={concern}
                          variant={selectedConcern === concern ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => setSelectedConcern(concern === selectedConcern ? '' : concern)}
                        >
                          {concern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Results */}
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Available Therapists ({therapists.length})
                </h2>
              </div>

              {therapists.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No therapists found matching your criteria</p>
                </Card>
              ) : (
                <div className="grid lg:grid-cols-2 gap-6">
                  {therapists.map(therapist => (
                    <Card key={therapist._id} className="p-6 hover:shadow-large transition-all duration-300">
                      <div className="flex gap-6">
                        <div className="flex-shrink-0">
                          <div className="w-24 h-24 rounded-lg bg-gradient-primary flex items-center justify-center overflow-hidden">
                            <img
                              src={therapist.image}
                              alt={therapist.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                target.parentElement!.innerHTML = `
                                  <svg class="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                  </svg>
                                `;
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-xl font-semibold text-foreground">{therapist.name}</h3>
                              <p className="text-sm text-muted-foreground">{therapist.title}</p>
                            </div>
                            <div className="flex items-center gap-1 text-sm">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{therapist.rating}</span>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{therapist.bio}</p>

                          <div className="flex flex-wrap gap-1 mb-3">
                            {therapist.specializations?.slice(0, 3).map((spec: string) => (
                              <Badge key={spec} variant="secondary" className="text-xs">{spec}</Badge>
                            ))}
                          </div>

                          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                            <Languages className="w-4 h-4" />
                            <span>{therapist.languages?.join(", ")}</span>
                          </div>

                          <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{therapist.experience} years exp</span>
                            </div>
                            <span>•</span>
                            <span>{therapist.totalSessions}+ sessions</span>
                          </div>

                          <div className="flex items-center gap-2 mb-4 text-sm">
                            {therapist.pricing && Object.entries(therapist.pricing).map(([duration, price]: [string, any]) => (
                              <span key={duration} className="bg-primary/10 text-primary px-2 py-1 rounded">
                                ₹{price}/{duration}min
                              </span>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <Button asChild size="sm" className="flex-1">
                              <Link to={`/psychologist/${therapist._id}`}>
                                View & Book <ChevronRight className="w-4 h-4 ml-1" />
                              </Link>
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => {
                              const key = [user?._id, therapist._id].sort().join('_');
                              setChatConvKey(key);
                              setChatOtherUser({ _id: therapist._id, name: therapist.name, title: therapist.title, role: 'therapist' });
                              setActiveTab('messages');
                            }}>
                              <MessageCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ========== UPCOMING SESSIONS TAB ========== */}
            <TabsContent value="upcoming">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Upcoming Sessions</h2>
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                    <Button onClick={() => setActiveTab('find-therapist')}>
                      Find a Therapist
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingSessions.map(session => (
                      <div key={session._id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                            {session.therapistId?.image ? (
                              <img src={session.therapistId.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Calendar className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{session.therapistId?.name || 'Therapist'}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-sm text-muted-foreground">{session.startTime} - {session.endTime} ({session.duration} min)</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="secondary">₹{session.amount}</Badge>
                          {session.isRecurring && <Badge variant="outline" className="text-xs"><Repeat className="w-3 h-3 mr-1" />Recurring</Badge>}
                          <div className="flex gap-2">
                            <CalendarSyncButton
                              title={`Session with ${session.therapistId?.name || 'Therapist'}`}
                              date={session.date?.split('T')[0] || ''}
                              startTime={session.startTime}
                              endTime={session.endTime}
                              duration={session.duration}
                            />
                            {(() => {
                              const sessionDt = new Date(session.date);
                              const [hh, mm] = (session.startTime || '00:00').split(':');
                              sessionDt.setHours(parseInt(hh), parseInt(mm), 0, 0);
                              const hoursLeft = (sessionDt.getTime() - Date.now()) / (1000 * 60 * 60);
                              const within24 = hoursLeft < 24;
                              return within24 ? (
                                <div className="text-right">
                                  <Button size="sm" variant="destructive" disabled title="Cannot cancel within 24 hours">
                                    <XCircle className="w-4 h-4 mr-1" /> Cancel
                                  </Button>
                                  <p className="text-xs text-muted-foreground mt-1">Locked (within 24hrs)</p>
                                </div>
                              ) : (
                                <Button size="sm" variant="destructive" onClick={() => handleCancelSession(session._id)}>
                                  <XCircle className="w-4 h-4 mr-1" /> Cancel
                                </Button>
                              );
                            })()}
                          </div>
                          {session.isRecurring && session.recurringGroupId && (
                            <Button size="sm" variant="outline" className="text-xs" onClick={async () => {
                              try {
                                await api.cancelRecurringSeries(session.recurringGroupId);
                                toast({ title: "Series Cancelled", description: "All recurring sessions cancelled" });
                                loadDashboard();
                              } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
                            }}>
                              Cancel All Recurring
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ========== PAST SESSIONS TAB ========== */}
            <TabsContent value="past">
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">Past Sessions</h2>
                {pastSessions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-12">No past sessions yet</p>
                ) : (
                  <div className="space-y-3">
                    {pastSessions.map(session => (
                      <div key={session._id} className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {session.therapistId?.image ? (
                              <img src={session.therapistId.image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Clock className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{session.therapistId?.name || 'Therapist'}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.date).toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                              {' '}at {session.startTime} • {session.duration} min
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">₹{session.amount}</Badge>
                          <Badge
                            className={session.status === 'completed' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}
                          >
                            {session.status}
                          </Badge>
                          {session.status === 'completed' && !session.reviewId && (
                            <Button size="sm" variant="outline" onClick={() => setReviewSession({ id: session._id, therapistName: session.therapistId?.name || 'Therapist' })}>
                              <Star className="w-3 h-3 mr-1" /> Review
                            </Button>
                          )}
                          {session.reviewId && (
                            <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs">Reviewed</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* ========== RESOURCES TAB ========== */}
            <TabsContent value="resources">
              <ClientResources />
            </TabsContent>

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
          </Tabs>
        </div>
      </div>

      {/* Review Form Dialog */}
      {reviewSession && (
        <ReviewForm
          sessionId={reviewSession.id}
          therapistName={reviewSession.therapistName}
          isOpen={!!reviewSession}
          onClose={() => setReviewSession(null)}
          onReviewSubmitted={() => loadDashboard()}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
