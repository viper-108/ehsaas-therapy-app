import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Calendar, Clock, Globe, Award, Plus, Loader2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { CreateWorkshopDialog } from "@/components/CreateWorkshopDialog";

const Workshops = () => {
  const { user, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'upcoming' | 'ongoing' | 'past' | 'all'>('upcoming');
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [myRegistrations, setMyRegistrations] = useState<any[]>([]);

  const canCreate = role === 'therapist'; // any approved therapist can request a workshop

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listWorkshops(filter);
      setWorkshops(data || []);
      if (role === 'client') {
        const my = await api.getMyWorkshops().catch(() => []);
        setMyRegistrations(my || []);
      }
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const myReg = (wid: string) => myRegistrations.find(r => String(r.workshopId?._id || r.workshopId) === String(wid));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2 flex items-center gap-3">
                <GraduationCap className="w-9 h-9 text-primary" />
                Workshops
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Short, skill-based learning experiences. Pay, join, and walk away with a clear takeaway. Certificate of completion provided for most workshops.
              </p>
            </div>
            {canCreate && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Request New Workshop
              </Button>
            )}
          </div>

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
          ) : workshops.length === 0 ? (
            <Card className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No {filter === 'all' ? '' : filter} workshops right now.</p>
              <p className="text-sm text-muted-foreground mt-1">Check back soon — new workshops are added every month.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workshops.map((w: any) => {
                const reg = myReg(w._id);
                const firstDate = w.sessionDates?.[0] ? new Date(w.sessionDates[0]) : null;
                return (
                  <Card key={w._id} className="overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer flex flex-col" onClick={() => navigate(`/workshops/${w._id}`)}>
                    {w.brochureUrl && (
                      <div className="aspect-video w-full bg-muted overflow-hidden">
                        <img src={w.brochureUrl} alt={w.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{w.topic}</Badge>
                        {w.certificateProvided && <Badge className="bg-yellow-500/10 text-yellow-700 text-xs"><Award className="w-3 h-3 mr-1" /> Certificate</Badge>}
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-2">{w.title}</h3>
                      {w.subtopics && w.subtopics.length > 0 && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{w.subtopics.join(' · ')}</p>
                      )}

                      {Array.isArray(w.learningOutcomes) && w.learningOutcomes.length > 0 && (
                        <ul className="text-xs text-muted-foreground space-y-0.5 mb-3 list-disc list-inside line-clamp-3">
                          {w.learningOutcomes.slice(0, 3).map((lo: string, i: number) => (
                            <li key={i}>{lo}</li>
                          ))}
                        </ul>
                      )}

                      <div className="space-y-1 text-xs text-muted-foreground mb-4 mt-auto">
                        {firstDate && (
                          <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />
                            {firstDate.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {w.sessionDates.length > 1 && ` (+${w.sessionDates.length - 1} more)`}
                          </p>
                        )}
                        <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {w.durationMinutes} min</p>
                        <p className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> {w.language} · <span className="capitalize">{w.mode}</span></p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-lg font-bold text-foreground">₹{w.pricePerParticipant}</span>
                        {role === 'client' && reg ? (
                          <Badge variant="secondary" className="capitalize">
                            {reg.paymentStatus === 'paid' ? 'Confirmed' : 'Payment Pending'}
                          </Badge>
                        ) : (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/workshops/${w._id}`); }}>
                            View & Join
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <CreateWorkshopDialog isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  );
};

export default Workshops;
