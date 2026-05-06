import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Calendar, Clock, Award, Loader2, Plus, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { CreateTrainingDialog } from "@/components/CreateTrainingDialog";

export default function Trainings() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'upcoming' | 'ongoing' | 'past' | 'all'>('upcoming');
  const [trainings, setTrainings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [myRegs, setMyRegs] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listTrainings(filter);
      setTrainings(data || []);
      if (user) {
        const my = await api.getMyTrainingRegistrations().catch(() => []);
        setMyRegs(my || []);
      }
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const myReg = (id: string) => myRegs.find(r => String(r.trainingId?._id || r.trainingId) === String(id));

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                <GraduationCap className="w-9 h-9 text-primary" />
                Training Programs
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Multi-session structured training for mental health professionals and students. Certificate of completion provided.
              </p>
            </div>
            {role === 'therapist' && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Request New Training
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
          ) : trainings.length === 0 ? (
            <Card className="p-12 text-center">
              <GraduationCap className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No {filter === 'all' ? '' : filter} trainings right now.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {trainings.map((t: any) => {
                const reg = myReg(t._id);
                const start = t.startDate ? new Date(t.startDate) : null;
                return (
                  <Card key={t._id} className="overflow-hidden hover:shadow-lg hover:border-primary/40 transition-all cursor-pointer flex flex-col" onClick={() => navigate(`/trainings/${t._id}`)}>
                    {t.syllabusBrochureUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(t.syllabusBrochureUrl) && (
                      <div className="aspect-video w-full bg-muted overflow-hidden">
                        <img src={t.syllabusBrochureUrl} alt={t.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        {t.certificateProvided && <Badge className="bg-yellow-500/10 text-yellow-700 text-xs"><Award className="w-3 h-3 mr-1" />Certificate</Badge>}
                        <Badge variant="outline" className="capitalize text-xs">{t.mode}</Badge>
                        {t.totalSessions > 1 && <Badge variant="secondary" className="text-xs">{t.totalSessions} sessions</Badge>}
                      </div>
                      <h3 className="text-lg font-bold mb-2 line-clamp-2">{t.title}</h3>
                      {t.about && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t.about}</p>}

                      <div className="space-y-1 text-xs text-muted-foreground mb-3 mt-auto">
                        {start && <p className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Starts {start.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</p>}
                        {t.totalDurationHours > 0 && <p className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {t.totalDurationHours} hrs total</p>}
                        {t.facilitators && t.facilitators.length > 0 && (
                          <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {t.facilitators.map((f: any) => f.name || f.therapistId?.name).filter(Boolean).slice(0, 2).join(', ')}{t.facilitators.length > 2 ? ` +${t.facilitators.length - 2}` : ''}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-lg font-bold">₹{t.pricePerTrainee}</span>
                        {reg ? (
                          <Badge variant="secondary" className="capitalize">{reg.paymentStatus === 'paid' ? 'Confirmed' : 'Payment pending'}</Badge>
                        ) : (
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/trainings/${t._id}`); }}>View & Join</Button>
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
      <CreateTrainingDialog isOpen={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  );
}
