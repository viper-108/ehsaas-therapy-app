import { useEffect, useState, useRef } from "react";
import { CheckCircle, Clock, FileText, Loader2, Upload, User, Briefcase, Languages, IndianRupee, Check, ChevronsUpDown, X, MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { ChatWindow } from "@/components/ChatWindow";
import { ConversationList } from "@/components/ConversationList";

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

  // Pending / interview / in-process therapists don't reach the regular
  // dashboard Messages tab — so we surface a full Messages panel on the
  // status screen instead (conversation list on the left, ChatWindow on
  // the right). They can read any admin messages, reply, or start a new
  // conversation with admin.
  const [adminContact, setAdminContact] = useState<{ _id: string; name: string } | null>(null);
  const [chatConvKey, setChatConvKey] = useState('');
  const [chatOther, setChatOther] = useState<any>(null);

  useEffect(() => {
    if (!user || !user._id || adminContact) return;
    api.getContacts?.('all').then((list: any[]) => {
      const admin = (list || []).find(c => c.role === 'admin');
      if (admin) setAdminContact({ _id: admin._id, name: admin.name || 'Ehsaas Admin' });
    }).catch(() => {});
  }, [user, adminContact]);

  // Default-select the admin conversation as soon as we know who admin is,
  // so the chat is one click away (or already loaded if admin has messaged
  // them first).
  useEffect(() => {
    if (!adminContact || !user?._id || chatConvKey) return;
    const key = [String(user._id), String(adminContact._id)].sort().join('_');
    setChatConvKey(key);
    setChatOther({ _id: adminContact._id, name: adminContact.name, role: 'admin' });
  }, [adminContact, user, chatConvKey]);

  // Profile form state — pre-populate from existing user data
  // pricing30/50 = max price (shown to clients); min30/50 = lowest price you'll accept (admin only)
  const [form, setForm] = useState({
    title: '',
    phone: '',
    experience: '',
    bio: '',
    specializations: '',
    languages: '',
    educationBackground: '',
    highestEducation: '',
    pronouns: '',
    hoursPerWeek: '',
    pricing30: '',
    pricing50: '',
    pricingMin30: '',
    pricingMin50: '',
  });

  // Services offered (per-service-per-duration min/max ASKS) — used for
  // admin to finalize after interview.
  //
  // Each service type has a fixed set of supported session durations:
  //   individual  → 30, 50 min
  //   couple      → 50, 90 min
  //   supervision → 50, 90 min
  //   family      → single price band (no duration split)
  //   group       → single price band (no duration split)
  const SERVICE_TYPES = ['individual', 'couple', 'group', 'family', 'supervision'] as const;
  type ServiceType = typeof SERVICE_TYPES[number];
  const SERVICE_DURATIONS: Record<ServiceType, number[]> = {
    individual:  [30, 50],
    couple:      [50, 90],
    supervision: [50, 90],
    family:      [],  // empty = single price band, uses top-level min/max
    group:       [],
  };
  type ServiceState = {
    offered: boolean;
    // Top-level band — used as the "ask" for family/group, derived from the
    // duration bands' min-of-mins / max-of-maxes for individual/couple/supervision.
    min: string;
    max: string;
    // Per-duration bands. Keys are duration strings ("30","50","90").
    durations: Record<string, { min: string; max: string }>;
  };
  const emptyService = (type: ServiceType): ServiceState => ({
    offered: false, min: '', max: '',
    durations: Object.fromEntries(SERVICE_DURATIONS[type].map(d => [String(d), { min: '', max: '' }])),
  });
  const [services, setServices] = useState<Record<ServiceType, ServiceState>>({
    individual:  emptyService('individual'),
    couple:      emptyService('couple'),
    group:       emptyService('group'),
    family:      emptyService('family'),
    supervision: emptyService('supervision'),
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
      const pricingMin = user.pricingMin instanceof Map ? Object.fromEntries(user.pricingMin) : (user.pricingMin || {});
      // Hydrate services + their per-duration pricing bands from whatever
      // the server has on file (durationPricing array is the new shape).
      const next: any = {
        individual:  emptyService('individual'),
        couple:      emptyService('couple'),
        group:       emptyService('group'),
        family:      emptyService('family'),
        supervision: emptyService('supervision'),
      };
      (user.servicesOffered || []).forEach((s: any) => {
        if (!s?.type || !SERVICE_TYPES.includes(s.type)) return;
        next[s.type].offered = true;
        next[s.type].min = String(s.minPrice ?? '');
        next[s.type].max = String(s.maxPrice ?? '');
        (s.durationPricing || []).forEach((dp: any) => {
          const key = String(dp.duration);
          if (next[s.type].durations[key]) {
            next[s.type].durations[key] = {
              min: String(dp.minPrice ?? ''),
              max: String(dp.maxPrice ?? ''),
            };
          }
        });
      });
      setServices({
        individual: next.individual,
        couple: next.couple,
        group: next.group,
        family: next.family,
        supervision: next.supervision,
      });
      setForm({
        title: user.title || '',
        phone: user.phone || '',
        experience: user.experience != null ? String(user.experience) : '',
        bio: user.bio || '',
        specializations: (user.specializations || []).join(', '),
        languages: (user.languages || []).join(', '),
        educationBackground: user.educationBackground || '',
        highestEducation: user.highestEducation || '',
        pronouns: user.pronouns || '',
        hoursPerWeek: user.hoursPerWeek || '',
        pricing30: pricing['30'] != null ? String(pricing['30']) : '',
        pricing50: pricing['50'] != null ? String(pricing['50']) : '',
        pricingMin30: pricingMin['30'] != null ? String(pricingMin['30']) : '',
        pricingMin50: pricingMin['50'] != null ? String(pricingMin['50']) : '',
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
            {user.interviewScheduledAt && (
              <p className="mt-3 font-medium text-foreground">
                📅 {new Date(user.interviewScheduledAt).toLocaleString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })} IST
              </p>
            )}
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
        <div className="flex flex-col items-center justify-center py-12 px-4 gap-6">
          <Card className="max-w-lg w-full p-8 text-center">
            <div className={`w-16 h-16 ${statusUi.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <StatusIcon className={`w-8 h-8 ${statusUi.iconColor}`} />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-3">{statusUi.title}</h2>
            <div className="text-muted-foreground mb-6">{statusUi.description}</div>
            <Badge className={`${statusUi.bg} ${statusUi.iconColor} text-sm`}>Status: {statusUi.badge}</Badge>
          </Card>

          {/* Messages — pending / interview / in-process therapists don't
              reach the regular dashboard Messages tab while their profile
              is under review, but they still need to talk to admin (about
              their application, interview reschedule, updates, etc.).
              Same ConversationList + ChatWindow used by the dashboard. */}
          <Card className="max-w-4xl w-full p-0 overflow-hidden">
            <div className="px-5 py-3 border-b">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                Messages
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Read messages from Ehsaas admin and reply. Ask questions about your application, request a reschedule, or share updates.
              </p>
            </div>
            <div className="flex" style={{ height: '500px' }}>
              <div className={`w-full md:w-72 border-r overflow-y-auto p-3 ${chatConvKey ? 'hidden md:block' : ''}`}>
                <ConversationList
                  onSelectConversation={(key, other) => { setChatConvKey(key); setChatOther(other); }}
                  selectedKey={chatConvKey}
                />
              </div>
              <div className={`flex-1 ${!chatConvKey ? 'hidden md:flex' : 'flex'}`}>
                <ChatWindow
                  conversationKey={chatConvKey}
                  otherUser={chatOther}
                  onBack={() => { setChatConvKey(''); setChatOther(null); }}
                />
              </div>
            </div>
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
  // Returns true on a successful save, false otherwise. handleSubmit calls
  // this with quiet=true so the final "Submitted" toast is the only message
  // the user sees when they go straight from filling the form to submitting.
  const handleProfileSave = async (opts?: { quiet?: boolean }): Promise<boolean> => {
    const quiet = !!opts?.quiet;
    const fail = (title: string, description?: string) => {
      toast({ title, description, variant: "destructive" });
      return false;
    };
    // Every visible profile field is mandatory. Toast the first missing one.
    if (!form.title.trim()) return fail("Title required");
    if (!form.experience || isNaN(Number(form.experience))) return fail("Valid experience years required");
    if (!form.phone.trim()) return fail("Phone required");
    // Phone must be digits + the standard ITU set of separators.
    if (!/^[0-9+\-\s()]+$/.test(form.phone.trim())) return fail("Phone number can't contain letters", "Use digits and optionally + - ( ) and spaces.");
    if (!form.pronouns) return fail("Pronouns required");
    if (!form.hoursPerWeek) return fail("Hours per week required");
    if (!form.highestEducation.trim()) return fail("Highest education required");
    if (!form.educationBackground.trim()) return fail("Education background required");
    if (!form.bio.trim()) return fail("Bio required");
    const specs = form.specializations.split(',').map(s => s.trim()).filter(Boolean);
    if (specs.length === 0) return fail("At least one specialization is required");
    const langs = form.languages.split(',').map(s => s.trim()).filter(Boolean);
    if (langs.length === 0) return fail("At least one language is required");

    // Per-service-per-duration pricing. Each entry carries an aggregate
    // band (minPrice/maxPrice) for legacy callers + a durationPricing
    // array with the explicit (duration, min, max) tuples the therapist
    // entered. Services with no configured durations (family, group) just
    // use the aggregate band.
    type SvcPayload = {
      type: string; minPrice: number; maxPrice: number;
      durationPricing: { duration: number; minPrice: number; maxPrice: number }[];
    };
    const servicesArr: SvcPayload[] = [];
    let svcInvalid = '';
    for (const t of SERVICE_TYPES) {
      const s = services[t];
      if (!s.offered) continue;
      const durs = SERVICE_DURATIONS[t];

      if (durs.length === 0) {
        // Single-band service (family, group)
        const min = Number(s.min); const max = Number(s.max);
        if (!s.max || isNaN(max) || max <= 0) { svcInvalid = `Set a max price for ${t} therapy.`; break; }
        if (s.min && !isNaN(min) && min > max) { svcInvalid = `Min price for ${t} therapy must be ≤ max.`; break; }
        servicesArr.push({
          type: t,
          minPrice: !isNaN(min) ? min : 0,
          maxPrice: max,
          durationPricing: [],
        });
      } else {
        // Multi-duration service — every configured duration must have a
        // valid max price. We then derive the aggregate band as
        // min-of-mins / max-of-maxes for legacy consumers.
        const dp: { duration: number; minPrice: number; maxPrice: number }[] = [];
        for (const d of durs) {
          const cell = s.durations[String(d)] || { min: '', max: '' };
          const cMin = Number(cell.min); const cMax = Number(cell.max);
          if (!cell.max || isNaN(cMax) || cMax <= 0) {
            svcInvalid = `Set a max price for ${t} ${d}-min sessions.`;
            break;
          }
          if (cell.min && !isNaN(cMin) && cMin > cMax) {
            svcInvalid = `Min price for ${t} ${d}-min must be ≤ max.`;
            break;
          }
          dp.push({ duration: d, minPrice: !isNaN(cMin) ? cMin : 0, maxPrice: cMax });
        }
        if (svcInvalid) break;
        servicesArr.push({
          type: t,
          minPrice: Math.min(...dp.map(x => x.minPrice || x.maxPrice)),
          maxPrice: Math.max(...dp.map(x => x.maxPrice)),
          durationPricing: dp,
        });
      }
    }
    if (svcInvalid) return fail("Invalid pricing", svcInvalid);
    if (servicesArr.length === 0) return fail("Select at least one service type you offer");

    // Top-level pricing map — built from the individual service's
    // durationPricing if present, else from the first selected service's
    // aggregate maxPrice. Used by legacy booking/payment paths.
    const pricing: any = {};
    const indiv = servicesArr.find(s => s.type === 'individual');
    if (indiv && indiv.durationPricing.length) {
      for (const dp of indiv.durationPricing) pricing[String(dp.duration)] = dp.maxPrice;
    } else if (servicesArr[0]?.maxPrice) {
      pricing['50'] = servicesArr[0].maxPrice;
    }

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
        pronouns: form.pronouns,
        hoursPerWeek: form.hoursPerWeek,
        pricing,
      });
      // Save services-offered
      await api.setMyServicesOffered(servicesArr);
      if (data) updateUser({ ...data, servicesOffered: servicesArr });
      if (!quiet) toast({ title: "Profile saved", description: "Now upload your resume and accept the terms to submit." });
      return true;
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
      return false;
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

  // Keep this in lock-step with handleProfileSave's validation. The UI was
  // showing the green "Complete" badge based on a shorter checklist, while
  // Save Profile was actually requiring more — leading to "I filled bio,
  // languages, specializations, why does it still say fill these to apply".
  const missingProfileFields = (() => {
    const missing: string[] = [];
    if (!form.title.trim()) missing.push('Title');
    if (!form.experience || isNaN(Number(form.experience))) missing.push('Years of experience');
    if (!form.phone.trim()) missing.push('Phone');
    if (!form.pronouns) missing.push('Pronouns');
    if (!form.hoursPerWeek) missing.push('Hours per week');
    if (!form.highestEducation.trim()) missing.push('Highest education');
    if (!form.educationBackground.trim()) missing.push('Education background');
    if (!form.bio.trim()) missing.push('Bio');
    if (form.specializations.split(',').filter(s => s.trim()).length === 0) missing.push('Specializations');
    if (form.languages.split(',').filter(s => s.trim()).length === 0) missing.push('Languages');
    return missing;
  })();
  const profileComplete = missingProfileFields.length === 0;

  // True when the in-memory form has changes the user hasn't pushed to the
  // server yet. The "Submit for Approval" endpoint validates the SAVED
  // record, so unsaved profile changes always caused a confusing error
  // ("Please complete the following: Bio, Specializations, Languages…")
  // even though those fields were visibly filled in the UI.
  const userSpecs = ((user as any)?.specializations || []).join(', ');
  const userLangs = ((user as any)?.languages || []).join(', ');
  const profileDirty = !!user && (
    form.title.trim()              !== ((user as any)?.title || '').trim() ||
    String(form.experience)        !== String((user as any)?.experience ?? '') ||
    form.phone.trim()              !== ((user as any)?.phone || '').trim() ||
    form.pronouns                  !== ((user as any)?.pronouns || '') ||
    form.hoursPerWeek              !== ((user as any)?.hoursPerWeek || '') ||
    form.highestEducation.trim()   !== ((user as any)?.highestEducation || '').trim() ||
    form.educationBackground.trim()!== ((user as any)?.educationBackground || '').trim() ||
    form.bio.trim()                !== ((user as any)?.bio || '').trim() ||
    form.specializations.trim()    !== userSpecs.trim() ||
    form.languages.trim()          !== userLangs.trim()
  );

  const canSubmit = profileComplete && !!resumeUrl && accepted && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Auto-save the profile first if there are unsaved changes. The
      // server's complete-onboarding endpoint validates the saved record,
      // not the in-memory form, so without this an unsaved Bio /
      // Specializations / Languages would fail submission even though
      // they're visibly filled in the form. If the save itself fails
      // (validation / network), the helper has already toasted the reason
      // — short-circuit here so we don't fire a second confusing error
      // from /complete-onboarding.
      if (profileDirty) {
        const ok = await handleProfileSave({ quiet: true });
        if (!ok) return;
      }
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
                <Input required placeholder="e.g. Clinical Psychologist" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <Label>Years of Experience <span className="text-destructive">*</span></Label>
                <Input required type="number" placeholder="e.g. 5" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} />
              </div>
              <div>
                <Label>Phone <span className="text-destructive">*</span></Label>
                <Input
                  required
                  type="tel"
                  inputMode="tel"
                  // Filter on every keystroke so alphabets can't even be
                  // entered. Allowed chars: digits, +, -, spaces, parens.
                  placeholder="+91-XXXXXXXXXX"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/[^0-9+\-\s()]/g, '') }))}
                />
              </div>
              <div>
                <Label>Highest Education <span className="text-destructive">*</span></Label>
                <Input required placeholder="e.g. M.Phil Clinical Psychology" value={form.highestEducation} onChange={e => setForm(p => ({ ...p, highestEducation: e.target.value }))} />
              </div>
              <div>
                <Label>Pronouns <span className="text-destructive">*</span></Label>
                <Select value={form.pronouns} onValueChange={(v) => setForm(p => ({ ...p, pronouns: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="she/her">she/her</SelectItem>
                    <SelectItem value="he/him">he/him</SelectItem>
                    <SelectItem value="they/them">they/them</SelectItem>
                    <SelectItem value="she/they">she/they</SelectItem>
                    <SelectItem value="he/they">he/they</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hours per week available for Ehsaas <span className="text-destructive">*</span></Label>
                <Select value={form.hoursPerWeek} onValueChange={(v) => setForm(p => ({ ...p, hoursPerWeek: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select range" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-5">0–5 hours/week</SelectItem>
                    <SelectItem value="6-10">6–10 hours/week</SelectItem>
                    <SelectItem value="11-20">11–20 hours/week</SelectItem>
                    <SelectItem value="21-30">21–30 hours/week</SelectItem>
                    <SelectItem value="30+">30+ hours/week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Specializations (comma separated) <span className="text-destructive">*</span></Label>
                <Input required placeholder="e.g. Anxiety, Depression, Trauma" value={form.specializations} onChange={e => setForm(p => ({ ...p, specializations: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Languages (comma separated) <span className="text-destructive">*</span></Label>
                <Input required placeholder="e.g. English, Hindi, Marathi" value={form.languages} onChange={e => setForm(p => ({ ...p, languages: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Education Background <span className="text-destructive">*</span></Label>
                <Textarea required placeholder="Briefly describe your degree(s), certifications, and training" rows={2} value={form.educationBackground} onChange={e => setForm(p => ({ ...p, educationBackground: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <Label>Bio <span className="text-destructive">*</span></Label>
                <Textarea required placeholder="Tell prospective clients about your approach, experience, and what they can expect" rows={4} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
              </div>
              <div className="md:col-span-2">
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <p className="text-sm font-semibold text-foreground mb-2">🩺 Services You Offer <span className="text-destructive">*</span></p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Pick every kind of therapy you'd like to offer (multi-select), then enter your preferred Min/Max charges for each. <strong>Admin will finalize each service + price after your interview.</strong>
                  </p>

                  {(() => {
                    const labels: Record<string, { name: string; desc: string }> = {
                      individual: { name: 'Individual Therapy', desc: '1-on-1 sessions' },
                      couple: { name: 'Couples Therapy', desc: 'Two partners, one therapist' },
                      group: { name: 'Group Therapy', desc: '5–10 clients, focused topic' },
                      family: { name: 'Family Therapy', desc: 'Multiple family members' },
                      supervision: { name: 'Supervision', desc: 'For other therapists' },
                    };
                    const selectedTypes = SERVICE_TYPES.filter(t => services[t].offered);
                    return (
                      <>
                        {/* Multi-select dropdown using Popover + Command */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" type="button" className="w-full justify-between h-auto min-h-10 py-2">
                              <div className="flex flex-wrap gap-1 items-center">
                                {selectedTypes.length === 0 ? (
                                  <span className="text-muted-foreground text-sm">Select services…</span>
                                ) : selectedTypes.map(t => (
                                  <Badge key={t} variant="secondary" className="text-xs">
                                    {labels[t].name}
                                    <X className="w-3 h-3 ml-1 cursor-pointer" onClick={(e) => {
                                      e.stopPropagation();
                                      setServices(p => ({ ...p, [t]: { ...p[t], offered: false } }));
                                    }} />
                                  </Badge>
                                ))}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search services…" />
                              <CommandList>
                                <CommandEmpty>No service found.</CommandEmpty>
                                <CommandGroup>
                                  {SERVICE_TYPES.map(t => {
                                    const isSel = services[t].offered;
                                    return (
                                      <CommandItem
                                        key={t}
                                        onSelect={() => setServices(p => ({ ...p, [t]: { ...p[t], offered: !isSel } }))}
                                      >
                                        <Check className={`mr-2 h-4 w-4 ${isSel ? 'opacity-100' : 'opacity-0'}`} />
                                        <div className="flex-1">
                                          <p className="text-sm">{labels[t].name}</p>
                                          <p className="text-[11px] text-muted-foreground">{labels[t].desc}</p>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>

                        {/* Per-service pricing — duration-aware. Services
                            with no configured durations (family, group)
                            show a single Min/Max band. Multi-duration
                            services (individual / couple / supervision)
                            show one Min/Max row per session length. */}
                        {selectedTypes.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {selectedTypes.map(t => {
                              const s = services[t];
                              const durs = SERVICE_DURATIONS[t];
                              return (
                                <div key={t} className="p-3 rounded-md bg-primary/5 border border-primary/20">
                                  <p className="text-sm font-medium mb-2">{labels[t].name}</p>
                                  {durs.length === 0 ? (
                                    // Single band (family, group)
                                    <div className="flex gap-2 items-center flex-wrap">
                                      <Input
                                        type="number"
                                        placeholder="Min ₹"
                                        className="w-24 h-9"
                                        value={s.min}
                                        onChange={e => setServices(p => ({ ...p, [t]: { ...p[t], min: e.target.value } }))}
                                      />
                                      <span className="text-xs text-muted-foreground">to</span>
                                      <Input
                                        type="number"
                                        placeholder="Max ₹"
                                        className="w-24 h-9"
                                        value={s.max}
                                        onChange={e => setServices(p => ({ ...p, [t]: { ...p[t], max: e.target.value } }))}
                                      />
                                    </div>
                                  ) : (
                                    // One row per supported duration
                                    <div className="space-y-2">
                                      {durs.map(d => {
                                        const key = String(d);
                                        const cell = s.durations[key] || { min: '', max: '' };
                                        return (
                                          <div key={d} className="flex gap-2 items-center flex-wrap">
                                            <span className="text-xs font-medium w-16">{d} min</span>
                                            <Input
                                              type="number"
                                              placeholder="Min ₹"
                                              className="w-24 h-9"
                                              value={cell.min}
                                              onChange={e => setServices(p => ({
                                                ...p,
                                                [t]: {
                                                  ...p[t],
                                                  durations: {
                                                    ...p[t].durations,
                                                    [key]: { ...p[t].durations[key], min: e.target.value },
                                                  },
                                                },
                                              }))}
                                            />
                                            <span className="text-xs text-muted-foreground">to</span>
                                            <Input
                                              type="number"
                                              placeholder="Max ₹"
                                              className="w-24 h-9"
                                              value={cell.max}
                                              onChange={e => setServices(p => ({
                                                ...p,
                                                [t]: {
                                                  ...p[t],
                                                  durations: {
                                                    ...p[t].durations,
                                                    [key]: { ...p[t].durations[key], max: e.target.value },
                                                  },
                                                },
                                              }))}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
            <p className="text-xs text-muted-foreground mt-3">Services and per-service pricing above are finalized by Ehsaas admin after your interview.</p>

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
                    {!profileComplete && (
                      <>☝ Still missing: <strong>{missingProfileFields.join(', ')}</strong>.</>
                    )}
                    {profileComplete && !resumeUrl && '☝ Upload your resume to continue.'}
                    {profileComplete && resumeUrl && !accepted && '☝ Accept the terms to enable submit.'}
                  </p>
                )}
                {canSubmit && profileDirty && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 text-center mt-2">
                    You have unsaved profile changes — clicking <strong>Submit for Approval</strong> will save them automatically.
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
