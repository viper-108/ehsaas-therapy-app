import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ExternalLink, Save, User, IndianRupee, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export function TherapistProfileTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    title: user?.title || '',
    phone: user?.phone || '',
    experience: String(user?.experience ?? ''),
    bio: user?.bio || '',
    specializations: (user?.specializations || []).join(', '),
    languages: (user?.languages || []).join(', '),
    educationBackground: user?.educationBackground || '',
    highestEducation: user?.highestEducation || '',
    image: user?.image || '',
    slidingScaleAvailable: !!user?.slidingScaleAvailable,
  });

  const pricing = user?.pricing instanceof Map ? Object.fromEntries(user.pricing) : (user?.pricing || {});
  const pricingMin = user?.pricingMin instanceof Map ? Object.fromEntries(user.pricingMin) : (user?.pricingMin || {});

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        title: user.title || '',
        phone: user.phone || '',
        experience: String(user.experience ?? ''),
        bio: user.bio || '',
        specializations: (user.specializations || []).join(', '),
        languages: (user.languages || []).join(', '),
        educationBackground: user.educationBackground || '',
        highestEducation: user.highestEducation || '',
        image: user.image || '',
        slidingScaleAvailable: !!user.slidingScaleAvailable,
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await api.updateTherapistProfile({
        name: form.name.trim(),
        title: form.title.trim(),
        phone: form.phone.trim(),
        experience: Number(form.experience) || 0,
        bio: form.bio.trim(),
        specializations: form.specializations.split(',').map(s => s.trim()).filter(Boolean),
        languages: form.languages.split(',').map(s => s.trim()).filter(Boolean),
        educationBackground: form.educationBackground.trim(),
        highestEducation: form.highestEducation.trim(),
        image: form.image.trim(),
        slidingScaleAvailable: form.slidingScaleAvailable,
      });
      if (data) updateUser(data);
      toast({ title: "Saved", description: "Your profile has been updated." });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (!user) return null;

  return (
    <div className="space-y-5">
      {/* Header with public-profile link */}
      <Card className="p-5 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><User className="w-5 h-5 text-primary" /> My Profile</h2>
          <p className="text-sm text-muted-foreground mt-1">Edit your public-facing details. Pricing is set by Ehsaas admin.</p>
        </div>
        <Button asChild variant="outline">
          <Link to={`/psychologist/${user._id}`} target="_blank" rel="noreferrer">
            <ExternalLink className="w-4 h-4 mr-2" /> View Public Profile (clients can book)
          </Link>
        </Button>
      </Card>

      {/* Pricing summary (read-only) */}
      <Card className="p-5">
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3"><IndianRupee className="w-5 h-5 text-primary" /> Pricing</h3>
        {Object.keys(pricing).length === 0 ? (
          <p className="text-sm text-muted-foreground">Pricing has not been set by admin yet. You'll be notified once it's finalized.</p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {Object.entries(pricing).map(([d, p]: [string, any]) => (
                <Badge key={d} className="bg-primary/10 text-primary text-sm">₹{p}/{d}min</Badge>
              ))}
            </div>
            {Object.keys(pricingMin).length > 0 && (
              <div className="text-xs text-muted-foreground">
                Sliding-scale floor (admin-only): {Object.entries(pricingMin).map(([d, p]: [string, any]) => `₹${p}/${d}min`).join(', ')}
              </div>
            )}
            <p className="text-xs text-muted-foreground italic">Pricing is set by Ehsaas admin. To request a change, message admin.</p>
          </div>
        )}

        {/* Sliding scale toggle */}
        <div className="mt-4 pt-4 border-t flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Sliding Scale Available
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              When ON, clients can request a price between your admin-set min and max. Both you and admin must approve each negotiation.
            </p>
          </div>
          <Switch
            checked={form.slidingScaleAvailable}
            onCheckedChange={async (v) => {
              setForm(p => ({ ...p, slidingScaleAvailable: v }));
              try {
                const data = await api.updateTherapistProfile({ slidingScaleAvailable: v });
                if (data) updateUser(data);
                toast({ title: v ? "Sliding Scale Enabled" : "Sliding Scale Disabled" });
              } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
            }}
          />
        </div>
      </Card>

      {/* Editable profile fields */}
      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-3">Public Profile</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label>Title</Label>
            <Input placeholder="e.g. Clinical Psychologist" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
          <div>
            <Label>Experience (years)</Label>
            <Input type="number" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))} />
          </div>
          <div>
            <Label>Highest Education</Label>
            <Input value={form.highestEducation} onChange={e => setForm(p => ({ ...p, highestEducation: e.target.value }))} />
          </div>
          <div>
            <Label>Profile Image URL</Label>
            <Input value={form.image} onChange={e => setForm(p => ({ ...p, image: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="md:col-span-2">
            <Label>Specializations (comma-separated)</Label>
            <Input value={form.specializations} onChange={e => setForm(p => ({ ...p, specializations: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label>Languages (comma-separated)</Label>
            <Input value={form.languages} onChange={e => setForm(p => ({ ...p, languages: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label>Education Background</Label>
            <Textarea rows={2} value={form.educationBackground} onChange={e => setForm(p => ({ ...p, educationBackground: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Label>Bio</Label>
            <Textarea rows={4} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} />
          </div>
        </div>
        <div className="flex justify-end pt-4 border-t mt-4">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
