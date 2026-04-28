import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowLeft, Star, Clock, MessageCircle, MapPin, Calendar, Languages, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingModal } from "@/components/BookingModal";
import { PaymentSuccess } from "@/components/PaymentSuccess";
import { ReviewList } from "@/components/ReviewList";
import { IntroCallForm } from "@/components/IntroCallForm";
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
  };
};

const PsychologistProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [showIntroCall, setShowIntroCall] = useState(false);
  const [bookingDetails, setBookingDetails] = useState<{
    duration: number;
    amount: number;
    psychologist: Psychologist;
  } | null>(null);
  const { user, role } = useAuth();

  // Try hardcoded lookup first (for Team page links like /psychologist/1)
  const staticPsychologist = psychologists.find(p => p.id === id);

  // State for API-fetched therapist (for MongoDB IDs from Client Dashboard)
  const [apiPsychologist, setApiPsychologist] = useState<Psychologist | null>(null);
  const [loading, setLoading] = useState(!staticPsychologist);
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

        {/* Services Offered (admin-approved + therapist-accepted) */}
        {Array.isArray((psychologist as any).approvedServices) && (psychologist as any).approvedServices.length > 0 && (
          <Card className="p-6">
            <h2 className="font-semibold text-foreground mb-4">Services Offered</h2>
            <div className="space-y-2">
              {(psychologist as any).approvedServices.map((s: any) => {
                const labels: Record<string, string> = {
                  individual: 'Individual Therapy',
                  couple: 'Couples Therapy',
                  group: 'Group Therapy',
                  family: 'Family Therapy',
                  supervision: 'Supervision',
                };
                return (
                  <div key={s.type} className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
                    <span className="text-sm font-medium text-foreground">{labels[s.type] || s.type}</span>
                    <span className="text-sm text-primary font-semibold">
                      {s.minPrice && s.minPrice !== s.maxPrice ? `₹${s.minPrice} – ₹${s.maxPrice}` : `₹${s.maxPrice}`}
                    </span>
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
        <div className="sticky bottom-4 flex gap-3">
          {user && role === 'client' && (
            <Button
              variant="outline"
              size="lg"
              className="flex-shrink-0"
              onClick={() => setShowIntroCall(true)}
            >
              <Phone className="w-4 h-4 mr-2" />
              Intro Call
            </Button>
          )}
          <Button
            variant="booking"
            size="lg"
            className="flex-1"
            onClick={() => setIsBookingModalOpen(true)}
          >
            Book Session
          </Button>
        </div>
      </div>

      {/* Booking Modal */}
      <BookingModal
        psychologist={psychologist}
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onBookingConfirm={handleBookingConfirm}
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
