import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, CheckCircle, Mail, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function CouplesProfileTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const cp: any = (user as any)?.couplesProfile || {};
  const [form, setForm] = useState({
    partnerName: cp.partnerName || '',
    partnerEmail: cp.partnerEmail || '',
    relationshipDuration: cp.relationshipDuration || '',
    relationshipType: cp.relationshipType || '',
    challengesFacing: cp.challengesFacing || '',
    goalsForTherapy: cp.goalsForTherapy || '',
  });

  useEffect(() => {
    setForm({
      partnerName: cp.partnerName || '',
      partnerEmail: cp.partnerEmail || '',
      relationshipDuration: cp.relationshipDuration || '',
      relationshipType: cp.relationshipType || '',
      challengesFacing: cp.challengesFacing || '',
      goalsForTherapy: cp.goalsForTherapy || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSubmit = async () => {
    if (!form.partnerName || !form.partnerEmail || !form.relationshipType) {
      return toast({ title: "Required fields missing", description: "Partner name, email, and relationship type are required.", variant: "destructive" });
    }
    setSubmitting(true);
    try {
      const data = await api.updateCouplesProfile(form);
      if (data?.user) updateUser(data.user);
      toast({ title: "Couples profile saved", description: "Admin will review and approve. We've also emailed your partner if they're not signed up." });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  const isApproved = cp.isApprovedByAdmin;
  const profileSubmitted = cp.profileCompletedAt;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Heart className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-semibold">Couples Therapy Profile</h3>
          {isApproved && <Badge className="bg-success/10 text-success ml-auto"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mb-5">
          Tell us about your partnership. Both partners need to register and complete their profiles to start couples therapy. Admin reviews and approves the pair before booking.
        </p>

        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Partner Name *</Label>
              <Input value={form.partnerName} onChange={e => setForm(p => ({ ...p, partnerName: e.target.value }))} />
            </div>
            <div>
              <Label>Partner Email *</Label>
              <Input type="email" value={form.partnerEmail} onChange={e => setForm(p => ({ ...p, partnerEmail: e.target.value }))} />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Relationship Type *</Label>
              <Select value={form.relationshipType} onValueChange={(v) => setForm(p => ({ ...p, relationshipType: v }))}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dating">Dating</SelectItem>
                  <SelectItem value="engaged">Engaged</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="partnered">Domestic partnership</SelectItem>
                  <SelectItem value="separated">Separated / considering separation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Relationship Duration</Label>
              <Input placeholder="e.g. 5 years" value={form.relationshipDuration} onChange={e => setForm(p => ({ ...p, relationshipDuration: e.target.value }))} />
            </div>
          </div>

          <div>
            <Label>What are the main challenges you're facing?</Label>
            <Textarea rows={3} value={form.challengesFacing} onChange={e => setForm(p => ({ ...p, challengesFacing: e.target.value }))} />
          </div>
          <div>
            <Label>What are your goals for couples therapy?</Label>
            <Textarea rows={3} value={form.goalsForTherapy} onChange={e => setForm(p => ({ ...p, goalsForTherapy: e.target.value }))} />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={submitting} className="mt-5">
          {submitting ? 'Saving...' : profileSubmitted ? 'Update Profile' : 'Submit Profile'}
        </Button>
      </Card>

      {profileSubmitted && (
        <Card className={`p-5 ${isApproved ? 'bg-success/5 border-success/30' : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'}`}>
          {isApproved ? (
            <div>
              <p className="font-medium text-success">✓ Profile approved!</p>
              <p className="text-sm text-muted-foreground mt-1 mb-3">
                You can now browse couple-expert therapists and book sessions.
              </p>
              <Button onClick={() => navigate('/team?service=couple')} variant="outline" size="sm">
                Browse Couple Therapists <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          ) : (
            <div>
              <p className="font-medium">⏳ Pending admin approval</p>
              <p className="text-xs text-muted-foreground mt-1">
                We'll notify you (and your partner) by email and in-app once approved.
              </p>
            </div>
          )}
        </Card>
      )}

      {cp.partnerEmail && !cp.partnerId && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-blue-700" />
            <p className="text-sm text-blue-900 dark:text-blue-100">
              We've emailed <strong>{cp.partnerEmail}</strong> with an invite. They need to sign up and complete their own couples profile.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
