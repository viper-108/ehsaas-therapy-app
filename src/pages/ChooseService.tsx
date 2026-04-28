import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Users, UsersRound, Home, GraduationCap, ArrowRight } from "lucide-react";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const SERVICES = [
  { type: 'individual', name: 'Individual Therapy', icon: Heart, desc: '1-on-1 sessions for you alone. Ideal for anxiety, depression, life transitions, and personal growth.', cta: 'Find a Therapist' },
  { type: 'couple', name: 'Couples Therapy', icon: Users, desc: 'Therapy with your partner. We\'ll help you onboard your partner and match you with a couple-expert therapist.', cta: 'Set up Couples' },
  { type: 'group', name: 'Group Therapy', icon: UsersRound, desc: 'Small groups (5–10 members) facing similar challenges. Apply, get screened, and join.', cta: 'Browse Groups' },
  { type: 'family', name: 'Family Therapy', icon: Home, desc: 'Therapy for the whole family unit. Find therapists trained in family-systems work.', cta: 'Find a Therapist' },
  { type: 'supervision', name: 'Supervision', icon: GraduationCap, desc: 'For therapists & counselling students seeking professional supervision.', cta: 'Find a Supervisor' },
] as const;

export default function ChooseService() {
  const { user, role, isLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && (!user || role !== 'client')) navigate('/');
  }, [user, role, isLoading, navigate]);

  const pick = async (type: string) => {
    try { await api.updateClientProfile?.({ preferredServiceType: type }); } catch {}
    if (type === 'couple') {
      navigate('/client-dashboard?tab=couples');
    } else if (type === 'group') {
      navigate('/group-therapy');
    } else {
      navigate(`/team?service=${type}`);
    }
  };

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-foreground mb-3">What kind of therapy are you looking for?</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">Pick a service to see therapists that specialise in it. You can change your selection anytime from your dashboard.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map(s => {
              const Icon = s.icon;
              return (
                <Card key={s.type} className="p-6 hover:shadow-lg transition-all hover:border-primary/40 cursor-pointer group" onClick={() => pick(s.type)}>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 min-h-[60px]">{s.desc}</p>
                  <Button variant="ghost" className="text-primary p-0 h-auto group-hover:underline">
                    {s.cta} <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Card>
              );
            })}
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Need help choosing? <a href="/contact" className="text-primary hover:underline">Contact our team</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
