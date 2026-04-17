import { useState, useEffect } from "react";
import { Users, Calendar, Clock, Star, MapPin, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const GroupTherapy = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const data = await api.getGroupSessions();
      setSessions(data);
    } catch {}
    finally { setLoading(false); }
  };

  const handleRegister = async (sessionId: string) => {
    if (!user || role !== 'client') {
      setShowAuth(true);
      return;
    }
    setRegistering(sessionId);
    try {
      await api.registerGroupSession(sessionId);
      toast({ title: "Registered!", description: "You're registered for the group session. Check your email for the calendar invite." });
      loadSessions();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setRegistering(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="py-20">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-foreground mb-6">Group Therapy Sessions</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join our curated group therapy sessions led by experienced therapists. Connect with others, share experiences, and grow together.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sessions.length === 0 ? (
            <Card className="p-12 text-center">
              <Users className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No Upcoming Group Sessions</h2>
              <p className="text-muted-foreground">Check back soon for new group therapy sessions.</p>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-6">
              {sessions.map(session => {
                const spotsLeft = session.maxParticipants - (session.participants?.length || 0);
                const isRegistered = user && session.participants?.some((p: any) => p.clientId === user._id || p.clientId?._id === user._id);

                return (
                  <Card key={session._id} className="overflow-hidden hover:shadow-large transition-all duration-300">
                    <div className="p-6">
                      {/* Title & Status */}
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-xl font-bold text-foreground">{session.title}</h3>
                        <Badge className={spotsLeft <= 2 ? 'bg-warm/10 text-warm' : 'bg-success/10 text-success'}>
                          {spotsLeft} spots left
                        </Badge>
                      </div>

                      <p className="text-muted-foreground mb-4 line-clamp-3">{session.description}</p>

                      {/* Therapist */}
                      {session.therapistId && (
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {session.therapistId.name?.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{session.therapistId.name}</p>
                            <p className="text-xs text-muted-foreground">{session.therapistId.title}</p>
                          </div>
                        </div>
                      )}

                      {/* Details */}
                      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(session.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span>{session.startTime} - {session.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span>{session.participants?.length || 0}/{session.maxParticipants} participants</span>
                        </div>
                        <div className="text-lg font-bold text-primary">₹{session.amount}</div>
                      </div>

                      {/* Action */}
                      {isRegistered ? (
                        <Button disabled className="w-full" variant="outline">
                          ✅ Already Registered
                        </Button>
                      ) : session.status === 'full' ? (
                        <Button disabled className="w-full" variant="outline">
                          Session Full
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleRegister(session._id)}
                          disabled={registering === session._id}
                        >
                          {registering === session._id ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...</>
                          ) : (
                            `Register & Pay ₹${session.amount}`
                          )}
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultTab="client" />
    </div>
  );
};

export default GroupTherapy;
