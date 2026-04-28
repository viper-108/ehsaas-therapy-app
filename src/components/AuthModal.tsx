import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCircle, Stethoscope, Mail, Lock, User, Phone, Shield, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const CLIENT_TERMS_AND_CONDITIONS = `EHSAAS THERAPY CENTRE — CLIENT TERMS & CONDITIONS

Last Updated: April 2026

By creating an account and using the services of Ehsaas Therapy Centre ("Ehsaas", "we", "us"), you ("Client") agree to the following terms and conditions:

1. SERVICES
Ehsaas Therapy Centre is an online platform that connects clients with licensed and qualified therapists. We facilitate the scheduling and payment of therapy sessions but do not directly provide therapy services. The therapeutic relationship is between you and your chosen therapist.

2. ELIGIBILITY
You must be at least 18 years of age to create an account and use our services. By registering, you confirm that the information provided is accurate and complete.

3. BOOKING & SESSIONS
- Sessions can be booked based on therapist availability displayed on the platform.
- Session durations and pricing vary by therapist and are clearly displayed before booking.
- You are expected to join your session on time. Late arrivals may result in a shortened session.
- Sessions are conducted via secure online video platforms unless otherwise arranged.

4. CANCELLATION & RESCHEDULING POLICY
- Sessions may be cancelled or rescheduled free of charge up to 24 hours before the scheduled time.
- Cancellations made within 24 hours of the session are not permitted and the full session fee will be charged.
- No-shows (failing to attend without prior notice) will be charged the full session fee.

5. PAYMENTS
- All payments are processed securely through our integrated payment gateway.
- Payment must be completed at the time of booking to confirm your session.
- Refunds for eligible cancellations will be processed within 5-7 business days.

6. CONFIDENTIALITY & PRIVACY
- All session content is strictly confidential between you and your therapist.
- Your personal information is stored securely and will not be shared with third parties without your explicit consent, except as required by law.
- We comply with applicable data protection regulations.

7. LIMITATIONS
- Ehsaas Therapy Centre is not a crisis or emergency service. If you are experiencing a mental health emergency, please contact local emergency services (112) or a crisis helpline immediately.
- Our therapists provide professional guidance but cannot guarantee specific outcomes.
- The platform is not a substitute for medical treatment or psychiatric care where needed.

8. CODE OF CONDUCT
- Clients are expected to treat therapists with respect and professionalism.
- Any form of harassment, abuse, or inappropriate behaviour may result in immediate account termination without refund.
- Recording sessions without the therapist's explicit consent is strictly prohibited.

9. ACCOUNT SECURITY
- You are responsible for maintaining the confidentiality of your login credentials.
- Notify us immediately if you suspect unauthorized access to your account.

10. MODIFICATIONS
- Ehsaas reserves the right to modify these terms at any time. Continued use of the platform after changes constitutes acceptance of the updated terms.
- Material changes will be communicated via email or platform notification.

11. LIMITATION OF LIABILITY
- Ehsaas Therapy Centre acts as a facilitator and is not liable for the quality or outcomes of therapy provided by individual therapists.
- Our total liability shall not exceed the amount paid for the specific session in question.

12. CONTACT
For questions or concerns regarding these terms, please contact us at:
Email: sessions.ehsaas@gmail.com
WhatsApp: +91-7411948161
Instagram: @ehsaas.therapy.centre`;

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'client' | 'therapist';
}

const THERAPY_TYPES = [
  "Anxiety", "Depression", "Trauma", "Relationship Issues", "Self-esteem",
  "Grief", "LGBTQ+", "Stress", "Life Transitions", "Identity",
  "Anger Management", "OCD", "PTSD", "Eating Disorders", "Addiction"
];

export const AuthModal = ({ isOpen, onClose, defaultTab = 'client' }: AuthModalProps) => {
  const { login } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(defaultTab);
  const [isSignUp, setIsSignUp] = useState(true);
  const [loading, setLoading] = useState(false);

  // Client fields
  const [clientForm, setClientForm] = useState({
    name: '', email: '', password: '', phone: '',
    therapyType: '', concerns: [] as string[], description: '', preferredLanguage: 'English'
  });
  const [clientAcceptedTnc, setClientAcceptedTnc] = useState(false);

  // Therapist fields
  const [therapistForm, setTherapistForm] = useState({
    name: '', email: '', password: '', phone: '', title: 'Psychologist',
    specializations: '', experience: '', bio: '', languages: '', pricing30: '600', pricing50: '900'
  });

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleRequestOtp = async () => {
    if (!loginEmail) {
      toast({ title: "Error", description: "Enter your email first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (activeTab === 'therapist') await api.requestTherapistOtp(loginEmail);
      else await api.requestOtp(loginEmail);
      setOtpSent(true);
      toast({ title: "Code sent", description: "Check your email for a 6-digit code" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      toast({ title: "Error", description: "Enter the 6-digit code", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = activeTab === 'therapist'
        ? await api.verifyTherapistOtp(loginEmail, otpCode)
        : await api.verifyOtp(loginEmail, otpCode);
      login(data.token, data.user, data.role);
      toast({ title: "Welcome back!", description: `Logged in as ${data.user.name}` });
      onClose();
      setUseOtp(false); setOtpSent(false); setOtpCode('');
      // First-time client login: redirect to service picker
      if (data.role === 'client' && !data.user.preferredServiceType) {
        setTimeout(() => navigate('/choose-service'), 100);
      }
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleConcern = (concern: string) => {
    setClientForm(prev => ({
      ...prev,
      concerns: prev.concerns.includes(concern)
        ? prev.concerns.filter(c => c !== concern)
        : [...prev.concerns, concern]
    }));
  };

  const handleClientSignup = async () => {
    if (!clientForm.name || !clientForm.email || !clientForm.password) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const data = await api.clientRegister({
        name: clientForm.name,
        email: clientForm.email,
        password: clientForm.password,
        phone: clientForm.phone,
        therapyPreferences: {
          type: clientForm.therapyType,
          concerns: clientForm.concerns,
          preferredLanguage: clientForm.preferredLanguage,
          description: clientForm.description,
        }
      });
      login(data.token, data.user, 'client');
      toast({ title: "Welcome!", description: "Your account has been created successfully" });
      onClose();
      // New clients: send to service picker
      setTimeout(() => navigate('/choose-service'), 50);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleTherapistSignup = async () => {
    if (!therapistForm.name || !therapistForm.email || !therapistForm.password) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const pricing: any = {};
      if (therapistForm.pricing30) pricing['30'] = parseInt(therapistForm.pricing30);
      if (therapistForm.pricing50) pricing['50'] = parseInt(therapistForm.pricing50);

      const data = await api.therapistRegister({
        name: therapistForm.name,
        email: therapistForm.email,
        password: therapistForm.password,
        phone: therapistForm.phone,
        title: therapistForm.title,
        specializations: therapistForm.specializations.split(',').map(s => s.trim()).filter(Boolean),
        experience: parseInt(therapistForm.experience) || 0,
        bio: therapistForm.bio,
        languages: therapistForm.languages.split(',').map(s => s.trim()).filter(Boolean),
        pricing,
      });
      login(data.token, data.user, 'therapist');
      toast({ title: "Welcome!", description: "Your therapist account has been created. You'll be reviewed shortly." });
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      toast({ title: "Error", description: "Please enter email and password", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      let data;
      if (activeTab === 'admin') {
        data = await api.adminLogin(loginEmail, loginPassword);
      } else if (activeTab === 'therapist') {
        data = await api.therapistLogin(loginEmail, loginPassword);
      } else {
        data = await api.clientLogin(loginEmail, loginPassword);
      }
      login(data.token, data.user, data.role);
      toast({ title: "Welcome back!", description: `Logged in as ${data.user.name}` });
      onClose();
      // First-time client login: redirect to service picker
      if (data.role === 'client' && !data.user.preferredServiceType) {
        setTimeout(() => navigate('/choose-service'), 100);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground text-center">
            {isSignUp ? t('auth.signUp') : t('auth.logIn')}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="client" className="flex items-center gap-2">
              <UserCircle className="w-4 h-4" />
              {t('auth.client')}
            </TabsTrigger>
            <TabsTrigger value="therapist" className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              {t('auth.therapist')}
            </TabsTrigger>
          </TabsList>

          {/* ============ CLIENT TAB ============ */}
          <TabsContent value="client" className="space-y-4 mt-4">
            {isSignUp ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Your full name" className="pl-10"
                        value={clientForm.name} onChange={e => setClientForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder="your@email.com" className="pl-10"
                        value={clientForm.email} onChange={e => setClientForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder="Create a password" className="pl-10"
                        value={clientForm.password} onChange={e => setClientForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">You can complete the rest of your profile (phone, therapy preferences, emergency contact) after sign up.</p>
                </div>

                {/* Client Terms & Conditions */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <label className="text-sm font-medium text-foreground">Terms & Conditions</label>
                  </div>
                  <ScrollArea className="h-40 border rounded-lg p-3 mb-3 bg-muted/20">
                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-sans leading-relaxed">
                      {CLIENT_TERMS_AND_CONDITIONS}
                    </pre>
                  </ScrollArea>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="client-accept-tnc"
                      checked={clientAcceptedTnc}
                      onCheckedChange={(checked) => setClientAcceptedTnc(checked === true)}
                    />
                    <label htmlFor="client-accept-tnc" className="text-xs font-medium text-foreground cursor-pointer">
                      I have read and agree to the Terms & Conditions
                    </label>
                  </div>
                </div>

                <Button onClick={handleClientSignup} disabled={loading || !clientAcceptedTnc} className="w-full" size="lg">
                  {loading ? 'Creating Account...' : 'Sign Up as Client'}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder="your@email.com" className="pl-10"
                        value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                    </div>
                  </div>
                  {!useOtp ? (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input type="password" placeholder="Your password" className="pl-10"
                          value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                      </div>
                    </div>
                  ) : otpSent ? (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">6-Digit Code</label>
                      <Input type="text" maxLength={6} placeholder="000000" className="text-center text-2xl tracking-widest"
                        value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} />
                      <p className="text-xs text-muted-foreground mt-1">Check your email for the login code. Expires in 10 minutes.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">We'll send a 6-digit code to your email for login.</p>
                  )}
                </div>
                {!useOtp ? (
                  <>
                    <Button onClick={handleLogin} disabled={loading} className="w-full" size="lg">
                      {loading ? 'Logging in...' : 'Login as Client'}
                    </Button>
                    <div className="flex justify-between text-sm">
                      <button type="button" onClick={() => { setUseOtp(true); setOtpSent(false); }} className="text-primary hover:underline">
                        Login with OTP instead
                      </button>
                      <a href="/forgot-password" className="text-primary hover:underline">Forgot password?</a>
                    </div>
                  </>
                ) : !otpSent ? (
                  <>
                    <Button onClick={handleRequestOtp} disabled={loading} className="w-full" size="lg">
                      {loading ? 'Sending...' : 'Send Login Code'}
                    </Button>
                    <button type="button" onClick={() => setUseOtp(false)} className="text-sm text-primary hover:underline block w-full text-center">
                      Back to password login
                    </button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleVerifyOtp} disabled={loading} className="w-full" size="lg">
                      {loading ? 'Verifying...' : 'Verify & Login'}
                    </Button>
                    <div className="flex justify-between text-sm">
                      <button type="button" onClick={() => { setOtpSent(false); setOtpCode(''); }} className="text-primary hover:underline">
                        Resend code
                      </button>
                      <button type="button" onClick={() => { setUseOtp(false); setOtpSent(false); setOtpCode(''); }} className="text-primary hover:underline">
                        Back to password login
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>

          {/* ============ THERAPIST TAB ============ */}
          <TabsContent value="therapist" className="space-y-4 mt-4">
            {isSignUp ? (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Your full name" className="pl-10"
                        value={therapistForm.name} onChange={e => setTherapistForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder="your@email.com" className="pl-10"
                        value={therapistForm.email} onChange={e => setTherapistForm(p => ({ ...p, email: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder="Create a password" className="pl-10"
                        value={therapistForm.password} onChange={e => setTherapistForm(p => ({ ...p, password: e.target.value }))} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground italic">You'll set up your title, specializations, languages, pricing, bio and availability after signing up. Profile must be approved by admin before going live.</p>
                </div>

                <Button onClick={handleTherapistSignup} disabled={loading} className="w-full" size="lg">
                  {loading ? 'Creating Account...' : 'Sign Up as Therapist'}
                </Button>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input type="email" placeholder="your@email.com" className="pl-10"
                        value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
                    </div>
                  </div>
                  {!useOtp ? (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input type="password" placeholder="Your password" className="pl-10"
                          value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
                      </div>
                    </div>
                  ) : otpSent ? (
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">6-Digit Code</label>
                      <Input type="text" maxLength={6} placeholder="000000" className="text-center text-2xl tracking-widest"
                        value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} />
                      <p className="text-xs text-muted-foreground mt-1">Check your email for the login code. Expires in 10 minutes.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">We'll send a 6-digit code to your email for login.</p>
                  )}
                </div>
                {!useOtp ? (
                  <>
                    <Button onClick={handleLogin} disabled={loading} className="w-full" size="lg">
                      {loading ? 'Logging in...' : 'Login as Therapist'}
                    </Button>
                    <div className="flex justify-between text-sm">
                      <button type="button" onClick={() => { setUseOtp(true); setOtpSent(false); }} className="text-primary hover:underline">
                        Login with OTP instead
                      </button>
                      <a href="/forgot-password" className="text-primary hover:underline">Forgot password?</a>
                    </div>
                  </>
                ) : !otpSent ? (
                  <>
                    <Button onClick={handleRequestOtp} disabled={loading} className="w-full" size="lg">
                      {loading ? 'Sending...' : 'Send Login Code'}
                    </Button>
                    <button type="button" onClick={() => setUseOtp(false)} className="text-sm text-primary hover:underline block w-full text-center">
                      Back to password login
                    </button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleVerifyOtp} disabled={loading} className="w-full" size="lg">
                      {loading ? 'Verifying...' : 'Verify & Login'}
                    </Button>
                    <div className="flex justify-between text-sm">
                      <button type="button" onClick={() => { setOtpSent(false); setOtpCode(''); }} className="text-primary hover:underline">
                        Resend code
                      </button>
                      <button type="button" onClick={() => { setUseOtp(false); setOtpSent(false); setOtpCode(''); }} className="text-primary hover:underline">
                        Back to password login
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>

        {/* Admin Login Tab (hidden until active) */}
        {activeTab === 'admin' && (
          <div className="space-y-3 mt-4">
            <div className="text-center mb-2">
              <Shield className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-sm font-medium text-foreground">Admin Login</p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="email" placeholder="admin@ehsaas.com" className="pl-10"
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input type="password" placeholder="Admin password" className="pl-10"
                  value={loginPassword} onChange={e => setLoginPassword(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full" size="lg">
              {loading ? 'Logging in...' : 'Login as Admin'}
            </Button>
            <button
              onClick={() => { setActiveTab('client'); setLoginEmail(''); setLoginPassword(''); }}
              className="text-xs text-muted-foreground hover:underline w-full text-center"
            >
              ← Back to Client/Therapist login
            </button>
          </div>
        )}

        {/* Toggle Sign up / Login */}
        {activeTab !== 'admin' && (
          <div className="text-center pt-2">
            <p className="text-sm text-muted-foreground">
              {isSignUp ? t('auth.alreadyHaveAccount') : t('auth.dontHaveAccount')}
              {' '}
              <button
                onClick={() => { setIsSignUp(!isSignUp); setLoginEmail(''); setLoginPassword(''); setUseOtp(false); setOtpSent(false); setOtpCode(''); }}
                className="text-primary font-medium hover:underline"
              >
                {isSignUp ? t('auth.logIn') : t('auth.signUp')}
              </button>
            </p>
            <button
              onClick={() => { setActiveTab('admin'); setIsSignUp(false); setLoginEmail(''); setLoginPassword(''); setUseOtp(false); setOtpSent(false); setOtpCode(''); }}
              className="text-xs text-muted-foreground hover:text-primary mt-2 inline-block"
            >
              Admin Login →
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
