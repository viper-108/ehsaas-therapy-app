import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { GraduationCap, Calendar, Clock, Award, Loader2, ChevronLeft, Globe, IndianRupee, Target, Users, MessageSquare, Star } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export default function WorkshopDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { toast } = useToast();
  const [w, setW] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reg, setReg] = useState<any>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState({ rating: 5, learnings: '', suggestions: '', wouldRecommend: false });

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getWorkshop(id);
      setW(data);
      if (role === 'client') {
        const my = await api.getMyWorkshops().catch(() => []);
        setReg((my || []).find((r: any) => String(r.workshopId?._id || r.workshopId) === String(id)));
      }
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const handleRegister = async () => {
    if (!user) { navigate('/services'); return; }
    setBusy(true);
    try {
      const r = await api.registerForWorkshop(id!);
      // Immediately go to payment
      const pay = await api.startWorkshopCheckout(r._id);
      if (pay.url) window.location.href = pay.url;
      else load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const handlePayNow = async () => {
    if (!reg) return;
    setBusy(true);
    try {
      const pay = await api.startWorkshopCheckout(reg._id);
      if (pay.url) window.location.href = pay.url;
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const submitFeedback = async () => {
    if (!reg) return;
    setBusy(true);
    try {
      await api.submitWorkshopFeedback(reg._id, feedback);
      setShowFeedback(false);
      toast({ title: "Thanks for your feedback", description: "Your certificate (if eligible) is now in your dashboard." });
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-background"><Navigation />
      <div className="max-w-4xl mx-auto py-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" /></div>
    </div>
  );
  if (!w) return (
    <div className="min-h-screen bg-background"><Navigation />
      <div className="max-w-4xl mx-auto py-12 text-center">
        <p className="text-muted-foreground mb-4">Workshop not found.</p>
        <Button onClick={() => navigate('/workshops')}>Back</Button>
      </div>
    </div>
  );

  const live = w.liveStatus || w.status;
  const firstDate = w.sessionDates?.[0] ? new Date(w.sessionDates[0]) : null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate('/workshops')} className="mb-4">
          <ChevronLeft className="w-4 h-4 mr-1" /> All workshops
        </Button>

        {w.brochureUrl && (
          <Card className="overflow-hidden mb-6">
            <img src={w.brochureUrl} alt={w.title} className="w-full h-auto" />
          </Card>
        )}

        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{w.topic}</Badge>
                {w.certificateProvided && <Badge className="bg-yellow-500/10 text-yellow-700"><Award className="w-3 h-3 mr-1" /> Certificate provided</Badge>}
                <Badge variant="secondary" className="capitalize">{live}</Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground mb-2">{w.title}</h1>
              {w.subtopics?.length > 0 && (
                <p className="text-sm text-primary">{w.subtopics.join(' · ')}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">₹{w.pricePerParticipant}</p>
              <p className="text-xs text-muted-foreground">per participant</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2"><Calendar className="w-5 h-5 text-primary" /><h3 className="font-semibold">Schedule</h3></div>
            {(w.sessionDates || []).map((d: string, i: number) => (
              <p key={i} className="text-sm">{i + 1}. {new Date(d).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            ))}
            <p className="text-xs text-muted-foreground mt-2"><Clock className="w-3 h-3 inline mr-1" /> {w.durationMinutes} min per session</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2"><Globe className="w-5 h-5 text-primary" /><h3 className="font-semibold">Logistics</h3></div>
            <p className="text-sm">Mode: <strong className="capitalize">{w.mode}</strong></p>
            <p className="text-sm">Language: <strong>{w.language}</strong></p>
            {w.targetAudience && <p className="text-sm mt-1 text-muted-foreground"><strong className="text-foreground">For:</strong> {w.targetAudience}</p>}
            {w.capacity && <p className="text-xs text-muted-foreground mt-1"><Users className="w-3 h-3 inline mr-1" /> Capacity: {w.registeredCount || 0} / {w.capacity}</p>}
          </Card>
        </div>

        {w.description && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-2">About</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{w.description}</p>
          </Card>
        )}

        {Array.isArray(w.learningOutcomes) && w.learningOutcomes.length > 0 && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Learning Outcomes</h3>
            <ul className="space-y-1.5">
              {w.learningOutcomes.map((lo: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="text-primary mt-1">✓</span>
                  <span>{lo}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {w.contraindications && (
          <Card className="p-5 mb-6 bg-amber-50 dark:bg-amber-950/30 border-amber-200">
            <h3 className="font-semibold mb-2 text-amber-900 dark:text-amber-200">Who is this NOT for?</h3>
            <p className="text-sm text-amber-800 dark:text-amber-100 whitespace-pre-wrap">{w.contraindications}</p>
          </Card>
        )}

        {w.planProcedure && (
          <details className="mb-6">
            <summary className="cursor-pointer p-4 bg-card rounded-lg border font-semibold">Plan & Procedure</summary>
            <Card className="p-5 mt-2">
              <pre className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-sans">{w.planProcedure}</pre>
            </Card>
          </details>
        )}

        {Array.isArray(w.facilitatorTherapistIds) && w.facilitatorTherapistIds.length > 0 && (
          <Card className="p-5 mb-6">
            <h3 className="font-semibold mb-3">Facilitated by</h3>
            <div className="space-y-3">
              {w.facilitatorTherapistIds.map((t: any) => (
                <div key={t._id} className="flex items-start gap-3 p-3 bg-muted/30 rounded cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/psychologist/${t._id}`)}>
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0 overflow-hidden">
                    {t.image ? <img src={t.image} alt="" className="w-full h-full object-cover" /> : (t.name?.[0] || '?')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground">{t.name}</p>
                    {t.title && <p className="text-xs text-muted-foreground">{t.title}</p>}
                    {t.bio && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.bio}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Action bar */}
        <Card className="p-5 sticky bottom-4 shadow-lg">
          {role === 'client' ? (
            reg ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-medium">Your status: <Badge className="capitalize">{reg.paymentStatus === 'paid' ? 'Confirmed' : 'Payment pending'}</Badge></p>
                  {reg.attended && <p className="text-xs text-muted-foreground mt-1">✓ Attendance recorded</p>}
                  {reg.certificateIssuedAt && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <Award className="w-3 h-3" /> Certificate #{reg.certificateNumber} issued on {new Date(reg.certificateIssuedAt).toLocaleDateString('en-IN')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {reg.paymentStatus !== 'paid' && (
                    <Button size="sm" onClick={handlePayNow} disabled={busy}>
                      <IndianRupee className="w-3 h-3 mr-1" /> Pay ₹{w.pricePerParticipant}
                    </Button>
                  )}
                  {reg.paymentStatus === 'paid' && live === 'completed' && !reg.feedback?.submittedAt && (
                    <Button size="sm" onClick={() => setShowFeedback(true)}>
                      <MessageSquare className="w-3 h-3 mr-1" /> Submit Feedback
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  {w.capacity && w.registeredCount >= w.capacity ? 'Workshop is at capacity.' : 'Register and pay to confirm your spot.'}
                </p>
                <Button onClick={handleRegister} disabled={busy || (w.capacity && w.registeredCount >= w.capacity) || live === 'completed'}>
                  {busy ? 'Processing...' : 'Register & Pay'}
                </Button>
              </div>
            )
          ) : (
            <p className="text-sm text-muted-foreground">Sign in as a client to register.</p>
          )}
        </Card>

        {/* Feedback dialog */}
        <Dialog open={showFeedback} onOpenChange={setShowFeedback}>
          <DialogContent>
            <DialogHeader><DialogTitle>Workshop Feedback</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>How would you rate this workshop?</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setFeedback(p => ({ ...p, rating: n }))}>
                      <Star className={`w-8 h-8 ${n <= feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>What did you learn?</Label>
                <Textarea rows={3} value={feedback.learnings} onChange={e => setFeedback(p => ({ ...p, learnings: e.target.value }))} />
              </div>
              <div>
                <Label>Suggestions for next time</Label>
                <Textarea rows={2} value={feedback.suggestions} onChange={e => setFeedback(p => ({ ...p, suggestions: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2">
                <Checkbox checked={feedback.wouldRecommend} onCheckedChange={v => setFeedback(p => ({ ...p, wouldRecommend: v === true }))} />
                <span className="text-sm">I would recommend this workshop to others</span>
              </label>
              <Button onClick={submitFeedback} disabled={busy} className="w-full">
                {busy ? 'Submitting...' : 'Submit & Get Certificate'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
