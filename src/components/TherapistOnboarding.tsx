import { useState } from "react";
import { CheckCircle, Clock, FileText, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const TERMS_AND_CONDITIONS = `
EHSAAS THERAPY CENTRE — THERAPIST TERMS & CONDITIONS

1. ELIGIBILITY
You must hold a valid degree or certification in psychology, counselling, psychiatry, or a related mental health field from a recognized institution. You must provide proof of your qualifications upon request.

2. PROFESSIONAL CONDUCT
You agree to adhere to the ethical guidelines set forth by your professional licensing body. You will maintain the highest standards of professionalism, confidentiality, and client care at all times.

3. CONFIDENTIALITY
All client information shared during sessions is strictly confidential. You agree to comply with applicable data protection and privacy laws. You will not disclose any client information to third parties without the client's explicit written consent, except where required by law.

4. SESSION MANAGEMENT
You are responsible for managing your availability accurately on the platform. You agree to honour all confirmed bookings. Cancellations must be made at least 24 hours in advance. Repeated no-shows or last-minute cancellations may result in suspension from the platform.

5. FEES & PAYMENTS
Session fees are set collaboratively between you and Ehsaas Therapy Centre. Payments for sessions will be processed through the platform's payment system. Ehsaas Therapy Centre may retain a platform fee as agreed upon during onboarding.

6. PLATFORM USAGE
You agree not to solicit clients outside the platform for services originally booked through Ehsaas. You will maintain an updated and accurate profile including your qualifications, specializations, and bio.

7. QUALITY ASSURANCE
Ehsaas Therapy Centre may request feedback from clients regarding their experience. You agree to participate in periodic reviews to maintain service quality. The platform reserves the right to suspend or terminate your account if quality standards are not met.

8. LIABILITY
Ehsaas Therapy Centre acts as a platform connecting therapists with clients and is not liable for the therapeutic outcomes of any session. You maintain full professional liability for the services you provide. You are encouraged to hold professional indemnity insurance.

9. TERMINATION
Either party may terminate this agreement with 30 days written notice. Ehsaas reserves the right to immediately terminate your account in cases of professional misconduct, violation of these terms, or client safety concerns.

10. MODIFICATIONS
Ehsaas Therapy Centre reserves the right to modify these terms at any time. You will be notified of significant changes and continued use of the platform constitutes acceptance.

By accepting these terms, you confirm that you have read, understood, and agree to abide by all the above conditions.
`.trim();

export const TherapistOnboarding = () => {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  if (!user) return null;

  // If already onboarded but pending approval
  if (user.isOnboarded && !user.isApproved) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20 px-4">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="w-16 h-16 bg-warm/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-warm" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Profile Under Review</h2>
            <p className="text-muted-foreground mb-6">
              Your profile has been submitted for review. Our admin team will review your application
              and get back to you within <strong>24 hours</strong>.
            </p>
            <Badge className="bg-warm/10 text-warm border-warm/20 text-sm">
              Status: Pending Approval
            </Badge>
            {user.onboardingStatus === 'rejected' && user.rejectionReason && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg text-left">
                <p className="text-sm font-medium text-destructive mb-1">Application was not approved:</p>
                <p className="text-sm text-destructive/80">{user.rejectionReason}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Show success screen after completing onboarding
  if (completed) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20 px-4">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Onboarding Complete!</h2>
            <p className="text-muted-foreground mb-6">
              Your verification request has been sent to the admin team.
              They will review your profile and get back to you within <strong>24 hours</strong>.
            </p>
            <Badge className="bg-warm/10 text-warm border-warm/20 text-sm">
              Status: Pending Approval
            </Badge>
          </Card>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!accepted) return;
    setLoading(true);
    try {
      const data = await api.completeOnboarding();
      updateUser(data.user);
      setCompleted(true);
      toast({ title: "Onboarding Complete", description: "Your profile is now under review." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Get pricing display
  const pricing = user.pricing || {};
  const pricingObj = pricing instanceof Map ? Object.fromEntries(pricing) : pricing;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="py-8">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Ehsaas Therapy Centre</h1>
            <p className="text-muted-foreground">Complete your onboarding to start accepting sessions</p>
          </div>

          {/* Profile Summary */}
          <Card className="p-6 mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Profile Summary</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium text-foreground">{user.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Title</p>
                <p className="font-medium text-foreground">{user.title || 'Psychologist'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Experience</p>
                <p className="font-medium text-foreground">{user.experience || 0} years</p>
              </div>
              {user.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium text-foreground">{user.phone}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Languages</p>
                <p className="font-medium text-foreground">{(user.languages || []).join(', ') || 'Not specified'}</p>
              </div>
            </div>
            {user.specializations && user.specializations.length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Specializations</p>
                <div className="flex flex-wrap gap-2">
                  {user.specializations.map((spec: string) => (
                    <Badge key={spec} variant="secondary">{spec}</Badge>
                  ))}
                </div>
              </div>
            )}
            {Object.keys(pricingObj).length > 0 && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Session Pricing</p>
                <div className="flex gap-3">
                  {Object.entries(pricingObj).map(([duration, price]) => (
                    <span key={duration} className="bg-primary/10 text-primary px-3 py-1 rounded text-sm font-medium">
                      ₹{String(price)} / {duration} min
                    </span>
                  ))}
                </div>
              </div>
            )}
            {user.bio && (
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-1">Bio</p>
                <p className="text-foreground text-sm">{user.bio}</p>
              </div>
            )}
          </Card>

          {/* Terms and Conditions */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Terms & Conditions</h2>
            </div>
            <ScrollArea className="h-64 border rounded-lg p-4 mb-4 bg-muted/20">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
                {TERMS_AND_CONDITIONS}
              </pre>
            </ScrollArea>
            <div className="flex items-center space-x-3">
              <Checkbox
                id="accept-tnc"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked === true)}
              />
              <label htmlFor="accept-tnc" className="text-sm font-medium text-foreground cursor-pointer">
                I have read and agree to the Terms & Conditions of Ehsaas Therapy Centre
              </label>
            </div>
          </Card>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={!accepted || loading}
            size="lg"
            className="w-full"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
            ) : (
              'Complete Onboarding & Submit for Review'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
