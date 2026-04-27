import { useEffect, useState, useRef } from "react";
import { CheckCircle, Clock, FileText, Loader2, Upload, User, Briefcase, Languages, IndianRupee, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state — pre-populate from existing user data
  const [form, setForm] = useState({
    title: '',
    phone: '',
    experience: '',
    bio: '',
    specializations: '',
    languages: '',
    educationBackground: '',
    highestEducation: '',
    pricing30: '',
    pricing50: '',
  });
  const [resumeUrl, setResumeUrl] = useState('');
  const [resumeUploading, setResumeUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (user) {
      const pricing = user.pricing instanceof Map ? Object.fromEntries(user.pricing) : (user.pricing || {});
      setForm({
        title: user.title || '',
        phone: user.phone || '',
        experience: user.experience != null ? String(user.experience) : '',
        bio: user.bio || '',
        specializations: (user.specializations || []).join(', '),
        languages: (user.languages || []).join(', '),
        educationBackground: user.educationBackground || '',
        highestEducation: user.highestEducation || '',
        pricing30: pricing['30'] != null ? String(pricing['30']) : '',
        pricing50: pricing['50'] != null ? String(pricing['50']) : '',
      });
      setResumeUrl(user.resume || '');
    }
  }, [user]);

  if (!user) return null;

  // ===== STATUS SCREENS (already submitted) =====
  if (user.isOnboarded && !user.isApproved) {
    const status = user.onboardingStatus || 'pending_approval';
    let statusUi: { icon: any; iconColor: string; bg: string; title: string; description: any; badge: string };
    if (status === 'interview_scheduled') {
      statusUi = {
        icon: Clock, iconColor: 'text-blue-600', bg: 'bg-blue-500/10', title: 'Interview Scheduled',
        description: (
          <>
            Our team has scheduled an interview with you.
            {user.interviewScheduledAt && <p className="mt-3 font-medium text-foreground">📅 {new Date(user.interviewScheduledAt).toLocaleString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
            {user.interviewLink && (
              <p className="mt-4">
                <a href={user.interviewLink} target="_blank" rel="noopener noreferrer"
                   className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90">
                  Join Interview
                </a>
              </p>
            )}
            {user.interviewNotes && <p className="mt-4 text-sm bg-muted/40 p-3 rounded text-left"><strong>Notes:</strong> {user.interviewNotes}</p>}
          </>
        ), badge: 'Interview Scheduled',
      };
    } else if (status === 'in_process') {
      statusUi = {
        icon: Clock, iconColor: 'text-amber-600', bg: 'bg-amber-500/10', title: 'Application In Process',
        description: <>Your application is being actively reviewed by the Ehsaas team. We'll be in touch shortly.{user.interviewNotes && <p className="mt-4 text-sm bg-muted/40 p-3 rounded text-left"><strong>Notes:</strong> {user.interviewNotes}</p>}</>,
        badge: 'In Process',
      };
    } else if (status === 'rejected') {
      statusUi = {
        icon: Clock, iconColor: 'text-destructive', bg: 'bg-destructive/10', title: 'Application Not Approved',
        description: (
          <>
            Unfortunately, your application was not approved at this time.
            {user.rejectionReason && <p className="mt-4 text-sm bg-destructive/10 p-3 rounded text-left"><strong className="text-destructive">Reason:</strong> {user.rejectionReason}</p>}
            <p className="mt-4 text-xs text-muted-foreground">You may reapply after addressing the feedback. Reach out to sessions@ehsaastherapycentre.com if you have questions.</p>
          </>
        ), badge: 'Rejected',
      };
    } else {
      statusUi = {
        icon: Clock, iconColor: 'text-warm', bg: 'bg-warm/10', title: 'Profile Under Review',
        description: <>Your profile has been submitted for review. Our admin team will review your application and get back to you within <strong>24 hours</strong>.</>,
        badge: 'Pending Approval',
      };
    }
    const StatusIcon = statusUi.icon;
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20 px-4">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className={`w-16 h-16 ${statusUi.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <StatusIcon className={`w-8 h-8 ${statusUi.iconColor}`} />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">{statusUi.title}</h2>
            <div className="text-muted-foreground mb-6">{statusUi.description}</div>
            <Badge className={`${statusUi.bg} ${statusUi.iconColor} text-sm`}>Status: {statusUi.badge}</Badge>
          </Card>
        </div>
      </div>
    );
  }

  // ===== SUCCESS SCREEN =====
  if (completed) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center py-20 px-4">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">Application Submitted!</h2>
            <p className="text-muted-foreground mb-6">
              Your profile and resume have been sent to the Ehsaas team for review. We'll get back to you within <strong>24 hours</strong>.
            </p>
            <Badge className="bg-warm/10 text-warm text-sm">Status: Pending Approval</Badge>
          </Card>
        </div>
      </div>
    );
  }

  // ===== ONBOARDING FORM =====
  const handleProfileSave = async () => {
    if (!form.title.trim()) return toast({ title: "Title required", variant: "destructive" });
    if (!form.experience || isNaN(Number(form.experience))) return toast({ title: "Valid experience years required", variant: "destructive" });
    if (!form.bio.trim()) return toast({ title: "Bio required", variant: "destructive" });
    const specs = form.specializations.split(',').map(s => s.trim()).filter(Boolean);
    if (specs.length === 0) return toast({ title: "At least one specialization is required", variant: "destructive" });
    const langs = form.languages.split(',').map(s => s.trim()).filter(Boolean);
    if (langs.length === 0) return toast({ title: "At least one language is required", variant: "destructive" });

    const pricing: any = {};
    if (form.pricing30 && !isNaN(Number(form.pricing30))) pricing['30'] = Number(form.pricing30);
    if (form.pricing50 && !isNaN(Number(form.pricing50))) pricing['50'] = Number(form.pricing50);
    if (Object.keys(pricing).length === 0) return toast({ title: "Set at least one pricing tier (30 or 50 min)", variant: "destructive" });

    setProfileSaving(true);
    try {
      const data = await api.updateTherapistProfile({
        title: form.title.trim(),
        phone: form.phone.trim(),
        experience: Number(form.experience),
        bio: form.bio.trim(),
        specializations: specs,
        languages: langs,
        educationBackground: form.educationBackground.trim(),
        highestEducation: form.highestEducation.trim(),
        pricing,
      });
      if (data) updateUser(data);
      toast({ title: "Profile saved", description: "Now upload your resume and accept the terms to submit." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setProfileSaving(false); }
  };

  const handleResumeUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      return toast({ title: "File too large", description: "Please upload a resume under 5 MB", variant: "destructive" });
    }
    setResumeUploading(true);
    try {
      const data = await api.uploadResume(file);
      setResumeUrl(data.resume || data.url || '');
      if (data.user) updateUser(data.user);
      toast({ title: "Resume uploaded", description: file.name });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setResumeUploading(false); }
  };

  const profileComplete = !!(form.title.trim() && form.experience && form.bio.trim() &&
    form.specializations.split(',').filter(Boolean).length > 0 &&
    form.languages.split(',').filter(Boolean).length > 0 &&
    (form.pricing30 || form.pricing50));

  const canSubmit = profileComplete && !!resumeUrl && accepted && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const data = await api.completeOnboarding();
      updateUser(data.user);
      setCompleted(true);
      toast({ title: "Submitted", description: "Your profile is under review." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  // Click handler that scrolls to a section by id
  const scrollToStep = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const StepItem = ({
    n, label, done, target,
  }: { n: number; label: string; done: boolean; target: string }) => (
    <button
      type="button"
      onClick={() => scrollToStep(target)}
      className={`w-full flex items-start gap-3 text-left px-3 py-3 rounded-lg transition-all
        ${done
          ? 'bg-success/5 border border-success/20 hover:bg-success/10'
          : 'bg-muted/30 border border-transparent hover:bg-muted/50 hover:border-muted-foreground/30'}`}
    >
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
        ${done ? 'bg-success text-white' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
        {done ? <Check className="w-4 h-4" /> : n}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'text-success-foreground' : 'text-foreground'}`}>{label}</p>
        <p className="text-xs text-muted-foreground">{done ? 'Completed' : 'Click to view'}</p>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Ehsaas Therapy Centre</h1>
            <p className="text-muted-foreground">Complete your profile, upload your resume, and submit for admin review.</p>
          </div>

          <div className="flex gap-6">
            {/* LEFT — Sticky steps sidebar (desktop) */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <Card className="p-4 sticky top-24">
                <h3 className="font-semibold text-foreground mb-3 text-sm uppercase tracking-wide">Steps to Complete</h3>
                <div className="space-y-2">
                  <StepItem n={1} label="Professional Profile" done={profileComplete} target="step-profile" />
                  <StepItem n={2} label="Upload Resume / CV" done={!!resumeUrl} target="step-resume" />
                  <StepItem n={3} label="Accept Terms & Conditions" done={accepted} target="step-terms" />
                  <StepItem n={4} label="Submit for Approval" done={false} target="step-submit" />
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Progress</p>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(((profileComplete ? 1 : 0) + (resumeUrl ? 1 : 0) + (accepted ? 1 : 0)) / 3) * 100}%` }}
                    />
                  </div>
                </div>
              </Card>
            </aside>

            {/* MAIN — Form sections */}
            <div className="flex-1 min-w-0">

              {/* Mobile: condensed checklist */}
              <Card className="p-3 mb-4 bg-muted/30 lg:hidden">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Steps</p>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => scrollToStep('step-profile')} className={`text-left px-2 py-1.5 rounded text-xs ${profileComplete ? 'bg-success/10 text-success' : 'bg-background border'}`}>
                    {profileComplete ? '✓' : '1.'} Profile
                  </button>
                  <button onClick={() => scrollToStep('step-resume')} className={`text-left px-2 py-1.5 rounded text-xs ${resumeUrl ? 'bg-success/10 text-success' : 'bg-background border'}`}>
                    {resumeUrl ? '✓' : '2.'} Resume
                  </button>
                  <button onClick={() => scrollToStep('step-terms')} className={`text-left px-2 py-1.5 rounded text-xs ${accepted ? 'bg-success/10 text-success' : 'bg-background border'}`}>
                    {accepted ? '✓' : '3.'} Terms
                  </button>
                  <button onClick={() => scrollToStep('step-submit')} className="text-left px-2 py-1.5 rounded text-xs bg-background border">
                    4. Submit
                  </button>
                </div>
              </Card>

              {/* STEP 1 — PROFILE */}
              <Card id="step-profile" className="p-6 mb-6 scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Step 1 — Your Professional Profile</h2>
              {profileComplete && <Badge className="ml-auto bg-success/10 text-success"><Check className="w-3 h-3 mr-1" />Complete</Badge>}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Clinical Psychologist" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <Label>Years of Experience <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="e.g. 5" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input type="tel" placeholder="+91-XXXXXXXXXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Highest Education</Label>
                <Input placeholder="e.g. M.Phil Clinical Psychology" value={form.highestEducation} onChange={e => setForm(p => ({ ...p, highestEducation: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Specializations (comma separated) <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Anxiety, Depression, Trauma" value={form.specializations} onChange={e => setForm(p => ({ ...p, specializations: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Languages (comma separated) <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. English, Hindi, Marathi" value={form.languages} onChange={e => setForm(p => ({ ...p, languages: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Education Background</Label>
                <Textarea placeholder="Briefly describe your degree(s), certifications, and training" rows={2} value={form.educationBackground} onChange={e => setForm(p => ({ ...p, educationBackground: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Bio <span className="text-destructive">*</span></Label>
                <Textarea placeholder="Tell prospective clients about your approach, experience, and what they can expect" rows={4} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <div>
                <Label>Price (30 min) ₹ <span className="text-destructive">*</span></Label>
                <Input type="number" placeholder="600" value={form.pricing30} onChange={e => setForm(p => ({ ...p, pricing30: e.target.value }))} />
              </div>
              <div>
                <Label>Price (50 min) ₹</Label>
                <Input type="number" placeholder="900" value={form.pricing50} onChange={e => setForm(p => ({ ...p, pricing50: e.target.value }))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">At least one pricing tier (30 or 50 min) is required.</p>

            <Button onClick={handleProfileSave} disabled={profileSaving} className="mt-4 w-full md:w-auto">
              {profileSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : 'Save Profile'}
            </Button>
          </Card>

          {/* STEP 2 — RESUME */}
          <Card id="step-resume" className="p-6 mb-6 scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Step 2 — Upload Your Resume / CV</h2>
              {resumeUrl && <Badge className="ml-auto bg-success/10 text-success"><Check className="w-3 h-3 mr-1" />Uploaded</Badge>}
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Upload a PDF or DOC file (max 5 MB). This helps the admin team verify your credentials.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleResumeUpload(file);
              }}
            />

            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Button onClick={() => fileInputRef.current?.click()} disabled={resumeUploading} variant={resumeUrl ? 'outline' : 'default'}>
                <Upload className="w-4 h-4 mr-2" />
                {resumeUploading ? 'Uploading...' : resumeUrl ? 'Replace Resume' : 'Upload Resume'}
              </Button>
              {resumeUrl && (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
                  View uploaded resume
                </a>
              )}
            </div>
          </Card>

          {/* STEP 3 — TERMS */}
          <Card id="step-terms" className="p-6 mb-6 scroll-mt-24">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Step 3 — Terms & Conditions</h2>
              {accepted && <Badge className="ml-auto bg-success/10 text-success"><Check className="w-3 h-3 mr-1" />Accepted</Badge>}
            </div>
            <ScrollArea className="h-64 border rounded-lg p-4 mb-4 bg-muted/20">
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans leading-relaxed">
                {TERMS_AND_CONDITIONS}
              </pre>
            </ScrollArea>
            <div className="flex items-center space-x-3">
              <Checkbox id="accept-tnc" checked={accepted} onCheckedChange={(checked) => setAccepted(checked === true)} />
              <label htmlFor="accept-tnc" className="text-sm font-medium text-foreground cursor-pointer">
                I have read and agree to the Terms & Conditions of Ehsaas Therapy Centre
              </label>
            </div>
          </Card>

              {/* STEP 4 — SUBMIT */}
              <div id="step-submit" className="scroll-mt-24">
                <Button onClick={handleSubmit} disabled={!canSubmit} size="lg" className="w-full">
                  {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : 'Submit for Admin Approval'}
                </Button>
                {!canSubmit && !submitting && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {!profileComplete && '☝ Complete your profile first.'}
                    {profileComplete && !resumeUrl && '☝ Upload your resume to continue.'}
                    {profileComplete && resumeUrl && !accepted && '☝ Accept the terms to enable submit.'}
                  </p>
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
