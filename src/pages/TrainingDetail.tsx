import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GraduationCap, Calendar, Clock, Award, Loader2, ChevronLeft, IndianRupee, Target, Users, Download, MessageSquare, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export default function TrainingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [t, setT] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState<any>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getTraining(id);
      setT(data);
      if (user) {
        const my = await api.getMyTrainingRegistrations().catch(() => []);
        setReg((my || []).find((r: any) => String(r.trainingId?._id || r.trainingId) === String(id)));
      }
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const handleRegister = async () => {
    if (!user) { navigate('/services'); return; }
    setBusy(true);
    try {
      const r = await api.registerForTraining(id!);
      const pay = await api.startTrainingCheckout(r._id);
      if (pay.url) window.location.href = pay.url;
      else load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handlePay = async () => {
    if (!reg) return;
    setBusy(true);
    try {
      const pay = await api.startTrainingCheckout(reg._id);
      if (pay.url) window.location.href = pay.url;
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background"><Navigation />
      <div className="max-w-4xl mx-auto py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>
    </div>
  );
  if (!t) return (
    <div className="min-h-screen bg-background"><Navigation />
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-muted-foreground mb-4">Training not found.</p>
        <Button onClick={() => navigate('/trainings')}>Back</Button>
      </div>
    </div>
  );

  const live = t.liveStatus || t.status;
  const start = t.startDate ? new Date(t.startDate) : null;
  const end = t.endDate ? new Date(t.endDate) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/trainings')} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> All trainings
        </Button>

        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="capitalize">{t.mode}</Badge>
                {t.certificateProvided && <Badge className="bg-yellow-500/10 text-yellow-700"><Award className="w-3 h-3 mr-1" /> Certificate</Badge>}
                <Badge variant="secondary" className="capitalize">{live}</Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{t.title}</h1>
              {t.targetAudience && <p className="text-sm text-primary"><strong>For:</strong> {t.targetAudience}</p>}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">₹{t.pricePerTrainee}</p>
              <p className="text-xs text-muted-foreground">per trainee</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2"><Calendar className="w-5 h-5 text-primary" /><h3 className="font-semibold">Schedule</h3></div>
            {start && <p className="text-sm"><strong>Starts:</strong> {start.toLocaleString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>}
            {end && <p className="text-sm mt-1"><strong>Ends:</strong> {end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>}
            {t.sessionTime && <p className="text-sm mt-1"><strong>Time:</strong> {t.sessionTime}</p>}
            {t.frequency && <p className="text-sm mt-1"><strong>Frequency:</strong> {t.frequency}</p>}
            {t.totalSessions > 0 && <p className="text-sm mt-1"><strong>Sessions:</strong> {t.totalSessions} × {t.durationMinutes}min</p>}
            {t.totalDurationHours > 0 && <p className="text-sm mt-1"><strong>Total duration:</strong> {t.totalDurationHours} hours</p>}
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2"><Users className="w-5 h-5 text-primary" /><h3 className="font-semibold">Logistics</h3></div>
            <p className="text-sm">Mode: <strong className="capitalize">{t.mode}</strong></p>
            <p className="text-sm">Language: <strong>{t.language}</strong></p>
            {t.capacity && <p className="text-xs text-muted-foreground mt-1"><Users className="w-3 h-3 inline mr-1" /> Registered: {t.registeredCount || 0} / {t.capacity}</p>}
            {t.syllabusBrochureUrl && (
              <Button size="sm" variant="outline" asChild className="mt-3">
                <a href={t.syllabusBrochureUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="w-3 h-3 mr-1" /> Download Brochure
                </a>
              </Button>
            )}
          </Card>
        </div>

        {t.about && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-2">About this training</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{t.about}</p>
          </Card>
        )}

        {t.outcomes && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Outcomes / Goals</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{t.outcomes}</p>
          </Card>
        )}

        {t.syllabus && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Syllabus</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{t.syllabus}</p>
          </Card>
        )}

        {Array.isArray(t.facilitators) && t.facilitators.length > 0 && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-3">Facilitator{t.facilitators.length > 1 ? 's' : ''}</h3>
            <div className="space-y-3">
              {t.facilitators.map((f: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 overflow-hidden">
                    {f.therapistId?.image ? <img src={f.therapistId.image} alt="" className="w-full h-full object-cover" /> : ((f.name || f.therapistId?.name || '?')[0])}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{f.name || f.therapistId?.name}</p>
                    {f.credentials && <p className="text-xs text-muted-foreground">{f.credentials}</p>}
                    {f.experience && <p className="text-xs text-muted-foreground">{f.experience}</p>}
                  </div>
                  {f.therapistId?._id && (
                    <Button size="sm" variant="ghost" onClick={() => navigate(`/messages?to=${f.therapistId._id}`)}>
                      <MessageSquare className="w-3 h-3 mr-1" /> Text
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action bar */}
        <Card className="p-5 sticky bottom-4 shadow-lg">
          {(role === 'client' || role === 'therapist') ? (
            reg ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Status: <Badge className="capitalize">{reg.paymentStatus === 'paid' ? 'Confirmed' : 'Payment pending'}</Badge></p>
                  {reg.certificateNumber && <p className="text-xs text-green-600 mt-1"><Award className="w-3 h-3 inline" /> Certificate #{reg.certificateNumber}</p>}
                </div>
                {reg.paymentStatus !== 'paid' && (
                  <Button size="sm" onClick={handlePay} disabled={busy}>
                    <IndianRupee className="w-3 h-3 mr-1" /> Pay ₹{t.pricePerTrainee}
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {t.capacity && t.registeredCount >= t.capacity ? 'Training is at capacity.' : 'Register and pay to confirm your spot.'}
                </p>
                <Button onClick={handleRegister} disabled={busy || (t.capacity && t.registeredCount >= t.capacity) || live === 'completed'}>
                  {busy ? 'Processing...' : 'Register & Pay'}
                </Button>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Sign in as a client or therapist to register.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
