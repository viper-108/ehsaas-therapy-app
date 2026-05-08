import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Star, Clock, MessageCircle, MapPin, Calendar, Languages, Loader2, Phone, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingModal } from "@/components/BookingModal";
import { SupervisionBookingDialog } from "@/components/SupervisionBookingDialog";
import { AuthModal } from "@/components/AuthModal";
import { PaymentSuccess } from "@/components/PaymentSuccess";
import { ReviewList } from "@/components/ReviewList";
import { IntroCallForm } from "@/components/IntroCallForm";
import { useToast } from "@/hooks/use-toast";
import { psychologists } from "@/data/psychologists";
import { Psychologist } from "@/types/psychologist";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Convert MongoDB therapist to the Psychologist interface used by the UI
const mongoToPsychologist = (t: any): Psychologist => {
  // Convert pricing from MongoDB format to the expected {[duration: number]: number}
  const pricing: { [duration: number]: number } = {};
  if (t.pricing) {
    const pricingObj = t.pricing instanceof Map ? Object.fromEntries(t.pricing) : t.pricing;
    for (const [key, val] of Object.entries(pricingObj)) {
      pricing[Number(key)] = val as number;
    }
  }

  // Convert availability slots to readable strings
  const availabilityStrings: string[] = [];
  if (t.availability && Array.isArray(t.availability)) {
    t.availability
      .filter((a: any) => a.isAvailable)
      .forEach((a: any) => {
        availabilityStrings.push(`${DAYS[a.dayOfWeek]}: ${a.startTime} - ${a.endTime}`);
      });
  }

  return {
    id: t._id,
    name: t.name,
    title: t.title || 'Psychologist',
    specializations: t.specializations || [],
    experience: t.experience || 0,
    rating: t.rating || 5.0,
    totalSessions: t.totalSessions || 0,
    image: t.image || '',
    bio: t.bio || '',
    languages: t.languages || [],
    availability: availabilityStrings.length > 0 ? availabilityStrings : ['Contact for availability'],
    calendlyLink: t.calendlyLink || '',
    pricing,
    slidingScaleAvailable: !!t.slidingScaleAvailable,
    // Approved services this therapist offers (admin-finalized + therapist-accepted only)
    approvedServices: Array.isArray(t.approvedServices) ? t.approvedServices : [],
    // Supervisor pricing (only present if this therapist is an approved supervisor)
    supervisorProfile: t.supervisorProfile || null,
  };
};

const PsychologistProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  // Which service the BookingModal was opened for. The same modal handles
  // individual + family bookings (couple/group go through their own flows).
  const [bookingServiceType, setBookingServiceType] = useState<'individual' | 'family'>('individual');
  const [isSupervisionOpen, setIsSupervisionOpen] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showIntroCall, setShowIntroCall] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<{
    duration: number;
    amount: number;
    psychologist: Psychologist;
  } | null>(null);
  const { user, role } = useAuth();
  const { toast } = useToast();

  /**
   * Click handler for the "Book Session" button. Routes the user based on
   * their auth state — keeping the individual-therapy flow strictly for
   * clients, with a clear login prompt for signed-out visitors.
   */
  const handleBookSessionClick = () => {
    if (!user) {
      setShowAuth(true);   // signed-out → open AuthModal so they can log in / sign up
      return;
    }
    if (role !== 'client') {
      toast({
        title: "Therapy bookings are for clients",
        description: role === 'therapist'
          ? "You're logged in as a therapist. Therapy sessions on Ehsaas can only be booked by clients."
          : "You're logged in as an admin. Therapy sessions can only be booked by clients.",
        variant: "destructive",
      });
      return;
    }
    setIsBookingModalOpen(true);
  };

  const handleIntroCallClick = () => {
    if (!user) { setShowAuth(true); return; }
    if (role !== 'client') {
      toast({ title: "Intro calls are for clients", variant: "destructive" });
      return;
    }
    setShowIntroCall(true);
  };

  /**
   * Click handler for the per-service Book buttons in the Services Offered
   * card. Routes by service type:
   *   individual / family → BookingModal (with the right sessionType)
   *   couple              → /services (couples flow needs profile approval)
   *   group               → /team?service=group filtered to this therapist
   *   supervision         → SupervisionBookingDialog (therapist-only)
   */
  const handleBookServiceClick = (svcType: string) => {
    if (svcType === 'supervision') {
      // Supervision is therapist→therapist. Reuse the dialog's own gating.
      if (!user) { setShowAuth(true); return; }
      if (role !== 'therapist') {
        toast({ title: "Supervision is for therapists", variant: "destructive" });
        return;
      }
      setIsSupervisionOpen(true);
      return;
    }

    // All non-supervision services are for clients
    if (!user) { setShowAuth(true); return; }
    if (role !== 'client') {
      toast({
        title: "Therapy bookings are for clients",
        description: role === 'therapist'
          ? "You're logged in as a therapist. Therapy sessions can only be booked by clients."
          : "You're logged in as an admin. Therapy sessions can only be booked by clients.",
        variant: "destructive",
      });
      return;
    }

    if (svcType === 'individual' || svcType === 'family') {
      setBookingServiceType(svcType);
      setIsBookingModalOpen(true);
      return;
    }
    if (svcType === 'couple') {
      // Couples therapy has its own intake-and-approval flow on /services →
      // Couples Therapy, not a direct booking modal. Send them there.
      navigate('/services');
      toast({
        title: "Couples therapy needs a couples-profile first",
        description: "Both partners complete the couples profile, admin approves, then you can book.",
      });
      return;
    }
    if (svcType === 'group') {
      // Group therapy: see this therapist's groups (already shown lower on the
      // page) or browse all groups.
      navigate('/group-therapy');
      return;
    }
  };

  // Try hardcoded lookup first (for Team page links like /psychologist/1)
  const staticPsychologist = psychologists.find(p => p.id === id);

  // State for API-fetched therapist (for MongoDB IDs from Client Dashboard)
  const [apiPsychologist, setApiPsychologist] = useState<Psychologist | null>(null);
  const [loading, setLoading] = useState(!staticPsychologist);
  const [therapistGroups, setTherapistGroups] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // If found in static data, no need to fetch
    if (staticPsychologist) {
      setLoading(false);
      return;
    }

    // Otherwise, try fetching from API (MongoDB ID)
    const fetchFromApi = async () => {
      try {
        const data = await api.getTherapist(id!);
        setApiPsychologist(mongoToPsychologist(data));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchFromApi();
    // Also fetch groups led by this therapist
    api.getGroupsByTherapist?.(id!).then((d: any) => setTherapistGroups(d || [])).catch(() => setTherapistGroups([]));
  }, [id, staticPsychologist]);

  // Use whichever source found the therapist
  const psychologist = staticPsychologist || apiPsychologist;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !psychologist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Psychologist Not Found</h1>
          <Button onClick={() => navigate('/')} variant="trust">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const handleBookingConfirm = (duration: 30 | 60, amount: number) => {
    // Simulate payment processing
    setIsBookingModalOpen(false);
    setBookingDetails({ duration, amount, psychologist });
    setShowPaymentSuccess(true);
  };

  const handleClosePaymentSuccess = () => {
    setShowPaymentSuccess(false);
    setBookingDetails(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-foreground">Psychologist Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-6 animate-fade-in">
        {/* Profile Header */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              <img
                src={psychologist.image}
                alt={psychologist.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `data:image/svg+xml,${encodeURIComponent(`
                    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
                      <rect width="80" height="80" fill="hsl(210, 100%, 56%)" rx="40"/>
                      <text x="40" y="50" font-family="Arial" font-size="28" fill="white" text-anchor="middle">
                        ${psychologist.name.split(' ').map(n => n[0]).join('')}
                      </text>
                    </svg>
                  `)}`;
                }}
              />
            </div>

            <div className="flex-1">
              <h1 className="text-xl font-bold text-foreground mb-1">{psychologist.name}</h1>
              <p className="text-muted-foreground mb-3">{psychologist.title}</p>

              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-warm text-warm" />
                  <span className="font-medium">{psychologist.rating}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{psychologist.experience} years</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="w-4 h-4" />
                  <span>{psychologist.totalSessions} sessions</span>
                </div>
                {(psychologist as any).slidingScaleAvailable && (
                  <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200">
                    Sliding scale available
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Pricing */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Session Rates</h2>
          <div className={`grid grid-cols-${Object.keys(psychologist.pricing).length > 1 ? '2' : '1'} gap-4`}>
            {Object.entries(psychologist.pricing).map(([duration, price]) => (
              <div key={duration} className="bg-muted/30 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary mb-1">₹{price}</div>
                <div className="text-sm text-muted-foreground">{duration} minutes</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Number(duration) <= 30 ? 'Quick consultation' : 'In-depth session'}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Specializations */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">Specializations</h2>
          <div className="flex flex-wrap gap-2">
            {psychologist.specializations.map((spec, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-secondary/50 text-secondary-foreground"
              >
                {spec}
              </Badge>
            ))}
          </div>
        </Card>

        {/* Services Offered — each row is now bookable. The button routes
            to the right flow for that service (see handleBookServiceClick). */}
        {Array.isArray((psychologist as any).approvedServices) && (psychologist as any).approvedServices.filter((s: any) => s.therapistAccepted).length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Services Offered</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Pick the service you want to book. Each service routes to the right flow.
            </p>
            <div className="space-y-2">
              {(psychologist as any).approvedServices
                .filter((s: any) => s.therapistAccepted)
                .map((s: any) => {
                  const labels: Record<string, string> = {
                    individual: 'Individual Therapy',
                    couple: 'Couples Therapy',
                    group: 'Group Therapy',
                    family: 'Family Therapy',
                    supervision: 'Supervision',
                  };
                  const ctaLabel: Record<string, string> = {
                    individual: 'Book',
                    couple: 'Set up',
                    group: 'Browse groups',
                    family: 'Book',
                    supervision: 'Request',
                  };
                  // Hide the supervision row from non-therapist viewers — clients
                  // can't book supervision, so showing it would be confusing.
                  if (s.type === 'supervision' && role !== 'therapist') return null;
                  return (
                    <div key={s.type} className="flex items-center justify-between gap-3 p-3 bg-primary/5 rounded-lg flex-wrap">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{labels[s.type] || s.type}</p>
                        <p className="text-xs text-primary font-semibold">
                          {s.minPrice && s.minPrice !== s.maxPrice ? `₹${s.minPrice} – ₹${s.maxPrice}` : `₹${s.maxPrice}`}
                        </p>
                      </div>
                      <Button size="sm" onClick={() => handleBookServiceClick(s.type)}>
                        {ctaLabel[s.type] || 'Book'}
                      </Button>
                    </div>
                  );
                })}
            </div>
          </Card>
        )}

        {/* Groups Led by this Therapist */}
        {therapistGroups.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Group Therapy</h2>
            <div className="space-y-3">
              {(['upcoming', 'ongoing', 'completed'] as const).map((bucket) => {
                const items = therapistGroups.filter((g: any) => g.liveStatus === bucket);
                if (items.length === 0) return null;
                const labels: any = { upcoming: 'Upcoming', ongoing: 'Ongoing', completed: 'Past' };
                return (
                  <div key={bucket}>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">{labels[bucket]}</p>
                    <div className="space-y-2">
                      {items.map((g: any) => (
                        <div
                          key={g._id}
                          className="p-3 border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors"
                          onClick={() => navigate(`/group-therapy/${g._id}`)}
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div>
                              <p className="font-medium text-sm text-foreground">{g.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {g.focus} · {g.groupType} · {new Date(g.sessionStartAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                            <Badge variant="secondary" className="text-xs">{g.enrolledCount || 0}/{g.maxMembers}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* About */}
        <Card className="p-6">
          <h2 className="font-semibold text-foreground mb-4">About</h2>
          <p className="text-muted-foreground leading-relaxed">{psychologist.bio}</p>
        </Card>

        {/* Languages */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Languages className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Languages</h2>
          </div>
          <p className="text-muted-foreground">{psychologist.languages.join(", ")}</p>
        </Card>

        {/* Availability */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Availability</h2>
          </div>
          <div className="space-y-1">
            {psychologist.availability.map((schedule, index) => (
              <p key={index} className="text-muted-foreground text-sm">{schedule}</p>
            ))}
          </div>
        </Card>

        {/* Reviews */}
        <Card className="p-6">
          <ReviewList therapistId={psychologist.id} />
        </Card>

        {/* Book Session + Intro Call Buttons */}
        {(() => {
          const approvedSvcs: any[] = Array.isArray((psychologist as any).approvedServices)
            ? (psychologist as any).approvedServices
            : [];
          const targetOffersSupervision = approvedSvcs.some((s: any) => s.type === 'supervision');
          // For real (Mongo-backed) therapists, approvedServices is the source of
          // truth for "do they take individual therapy bookings". For static
          // demo therapists (data/psychologists.ts) the array is empty, so we
          // treat them as offering individual by default to preserve the demo.
          const targetOffersIndividual = approvedSvcs.length === 0
            ? true
            : approvedSvcs.some((s: any) => s.type === 'individual' && s.therapistAccepted);
          const viewerIsTherapist = !!user && role === 'therapist';
          // Therapist viewing themselves shouldn't see booking buttons at all
          const viewingSelf = viewerIsTherapist && (user as any)?._id === (psychologist as any).id;
          if (viewingSelf) return null;

          // Therapist viewing a supervisor → request supervision flow (no client-only block)
          if (viewerIsTherapist && targetOffersSupervision) {
            return (
              <div className="sticky bottom-4 flex gap-3">
                <Button
                  variant="booking"
                  size="lg"
                  className="flex-1"
                  onClick={() => setIsSupervisionOpen(true)}
                >
                  <GraduationCap className="w-4 h-4 mr-2" />
                  Request Supervision
                </Button>
              </div>
            );
          }

          // Therapist viewing a non-supervisor — explain why they can't book here
          if (viewerIsTherapist && !targetOffersSupervision) {
            return (
              <div className="sticky bottom-4">
                <Card className="p-3 text-xs text-muted-foreground bg-muted/30">
                  This therapist doesn't currently offer supervision. Therapists can only book supervision sessions on Ehsaas — therapy bookings are for clients.
                </Card>
              </div>
            );
          }

          // Client / signed-out viewing a therapist who *doesn't* currently
          // offer individual therapy — the Services Offered card above
          // already lists their actual services with per-service Book
          // buttons, so the bottom sticky bar just nudges them up to it.
          if (!targetOffersIndividual) {
            return (
              <div className="sticky bottom-4">
                <Card className="p-4 bg-muted/30 border-amber-200 dark:border-amber-800">
                  <p className="text-sm font-medium text-foreground mb-1">
                    This therapist doesn't offer individual therapy.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use the <strong>Services Offered</strong> section above to book one of the services they actually provide, or browse other individual therapists.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => navigate('/team?service=individual')}>
                      Browse individual therapists
                    </Button>
                  </div>
                </Card>
              </div>
            );
          }

          // Default: client (or signed-out visitor) flow.
          // Click handlers gate by auth state so signed-out users get the
          // AuthModal and non-clients get a toast — never a broken modal.
          return (
            <div className="sticky bottom-4 flex gap-3">
              {(!user || role === 'client') && (
                <Button
                  variant="outline"
                  size="lg"
                  className="flex-shrink-0"
                  onClick={handleIntroCallClick}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Intro Call
                </Button>
              )}
              <Button
                variant="booking"
                size="lg"
                className="flex-1"
                onClick={handleBookSessionClick}
              >
                Book Session
              </Button>
            </div>
          );
        })()}
      </div>

      {/* Booking Modal — same component handles individual + family bookings */}
      <BookingModal
        psychologist={psychologist}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onBookingConfirm={handleBookingConfirm}
        sessionType={bookingServiceType}
      />

      {/* Supervision Booking Dialog (therapist → supervisor) */}
      <SupervisionBookingDialog
        isOpen={isSupervisionOpen}
        onClose={() => setIsSupervisionOpen(false)}
        supervisor={{
          id: psychologist.id,
          name: psychologist.name,
          title: psychologist.title,
          image: psychologist.image,
          individualPrice50: (psychologist as any).supervisorProfile?.individualPrice50 || 0,
          individualPrice90: (psychologist as any).supervisorProfile?.individualPrice90 || 0,
        }}
      />

      {/* Intro Call Form */}
      {showIntroCall && (
        <IntroCallForm
          therapistId={psychologist.id}
          therapistName={psychologist.name}
          isOpen={showIntroCall}
          onClose={() => setShowIntroCall(false)}
        />
      )}

      {/* Auth Modal (shown when a signed-out user tries to book) */}
      <AuthModal
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        defaultTab="client"
      />

      {/* Payment Success */}
      {showPaymentSuccess && bookingDetails && (
        <PaymentSuccess
          psychologist={bookingDetails.psychologist}
          duration={bookingDetails.duration}
          amount={bookingDetails.amount}
          onClose={handleClosePaymentSuccess}
        />
      )}
    </div>
  );
};

export default PsychologistProfile;
