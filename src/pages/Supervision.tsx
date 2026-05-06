import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Users, Clock, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { AuthModal } from "@/components/AuthModal";

export default function Supervision() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([
        api.listSupervisors().catch(() => []),
        api.listSupervisionGroups().catch(() => []),
      ]);
      setSupervisors(s || []);
      setGroups(g || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleApply = () => {
    if (!user) { setShowAuth(true); return; }
    if (role === 'therapist') {
      navigate('/therapist-dashboard?tab=supervision');
    } else {
      // Clients aren't the audience for supervision
      alert("Supervision is for therapists & students. Sign up as a therapist to apply.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                <GraduationCap className="w-9 h-9 text-primary" />
                Supervision
              </h1>
              <p className="text-muted-foreground max-w-2xl">
                Professional supervision for therapists and students — case discussion, ethical practice, skill-building, and growth. Both individual and group formats available.
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleApply}>Apply for Supervision</Button>
              <Button onClick={handleApply}>Become a Supervisor</Button>
            </div>
          </div>

          <Tabs defaultValue="individual">
            <TabsList>
              <TabsTrigger value="individual">Individual Supervision ({supervisors.length})</TabsTrigger>
              <TabsTrigger value="group">Group Supervision ({groups.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="mt-6">
              {loading ? (
                <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></Card>
              ) : supervisors.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No supervisors listed right now. Check back soon.</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supervisors.map((s: any) => {
                    const sp = s.supervisorProfile || {};
                    return (
                      <Card key={s._id} className="p-5 hover:shadow-lg transition-all cursor-pointer" onClick={() => navigate(`/psychologist/${s._id}`)}>
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0 overflow-hidden">
                            {s.image ? <img src={s.image} alt="" className="w-full h-full object-cover" /> : (s.name?.[0] || '?')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground">{s.name}</p>
                            {s.title && <p className="text-xs text-muted-foreground">{s.title}</p>}
                            {sp.openTo && <Badge variant="outline" className="text-xs mt-1 capitalize">{sp.openTo}</Badge>}
                          </div>
                        </div>
                        {sp.audience && <p className="text-xs text-muted-foreground mb-1"><strong>For:</strong> {sp.audience}</p>}
                        {sp.focusBio && <p className="text-xs text-muted-foreground mb-1 line-clamp-2">{sp.focusBio}</p>}
                        {sp.approach && <p className="text-xs text-muted-foreground mb-2"><strong>Approach:</strong> {sp.approach}</p>}
                        <div className="flex gap-2 text-xs text-muted-foreground mb-3">
                          {sp.therapyExperienceYears > 0 && <span>{sp.therapyExperienceYears}+ yrs therapy</span>}
                          {sp.supervisionExperienceYears > 0 && <span>· {sp.supervisionExperienceYears}+ yrs supervision</span>}
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="text-sm">
                            {sp.individualPrice50 > 0 && <span className="font-bold">₹{sp.individualPrice50}<span className="text-xs text-muted-foreground font-normal"> / 50 min</span></span>}
                            {sp.individualPrice90 > 0 && <span className="font-bold ml-2">₹{sp.individualPrice90}<span className="text-xs text-muted-foreground font-normal"> / 90 min</span></span>}
                          </div>
                          <Button size="sm" variant="outline">View <ChevronRight className="w-3 h-3 ml-1" /></Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="group" className="mt-6">
              {loading ? (
                <Card className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" /></Card>
              ) : groups.length === 0 ? (
                <Card className="p-12 text-center">
                  <p className="text-muted-foreground">No group supervision listings right now. Check back soon.</p>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {groups.map((g: any) => (
                    <Card key={g._id} className="p-5 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="capitalize">{g.level}</Badge>
                        <Badge className="bg-green-500/10 text-green-700 text-xs">Open</Badge>
                      </div>
                      <h3 className="text-lg font-bold mb-1">{g.title}</h3>
                      {g.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{g.description}</p>}
                      <div className="text-xs text-muted-foreground space-y-1 mb-3">
                        {g.format && <p><strong>Format:</strong> {g.format}</p>}
                        <p className="flex items-center gap-1"><Users className="w-3 h-3" /> Up to {g.groupSize} members</p>
                        <p className="flex items-center gap-1"><Clock className="w-3 h-3" /> {g.totalSessions} × {g.durationMinutes} min</p>
                        {g.schedule && <p>📅 {g.schedule}</p>}
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-300 italic mb-3">
                        Note: Pay for {g.totalSessions} sessions in one go. No cancellation/refund.
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t">
                        <span className="text-lg font-bold">₹{g.pricePer4Sessions}<span className="text-xs text-muted-foreground font-normal"> / {g.totalSessions} sessions</span></span>
                        <Button size="sm" onClick={handleApply}>Apply</Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <Card className="p-6 mt-12 bg-muted/30">
            <h2 className="font-semibold mb-2">How supervision works on Ehsaas</h2>
            <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
              <li><strong>Supervisors</strong> are experienced therapists who apply (intake form), get reviewed by admin, and once approved appear in the supervisor directory.</li>
              <li><strong>Supervisees</strong> are therapists or students who apply for supervision, get reviewed by admin, and once approved can book individual sessions or join group supervision.</li>
              <li><strong>Individual supervision</strong> can be 50 or 90 minutes, paid per session.</li>
              <li><strong>Group supervision</strong> is paid in 4-session blocks (lockstep) — no cancellation/refund. Smaller commitment? Try individual first.</li>
              <li>Supervision notes are kept private between supervisor and supervisee, with optional supervisor-only fields.</li>
            </ul>
          </Card>
        </div>
      </div>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} defaultTab="therapist" />
    </div>
  );
}
