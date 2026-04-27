import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Phone, User, Heart, Save } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { EhsaasReviewCard } from "@/components/EhsaasReviewCard";
import { PriceNegotiationsPanel } from "@/components/PriceNegotiationsPanel";

const THERAPY_TYPES = ["Anxiety", "Depression", "Relationships", "Trauma", "Grief", "Self-esteem", "Stress", "Career", "Family", "Couple"];

export function ClientProfileTab() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    therapyType: user?.therapyPreferences?.type || "",
    concerns: user?.therapyPreferences?.concerns || [],
    preferredLanguage: user?.therapyPreferences?.preferredLanguage || "English",
    description: user?.therapyPreferences?.description || "",
    emergencyName: user?.emergencyContact?.name || "",
    emergencyPhone: user?.emergencyContact?.phone || "",
    emergencyRelationship: user?.emergencyContact?.relationship || "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        therapyType: user.therapyPreferences?.type || "",
        concerns: user.therapyPreferences?.concerns || [],
        preferredLanguage: user.therapyPreferences?.preferredLanguage || "English",
        description: user.therapyPreferences?.description || "",
        emergencyName: user.emergencyContact?.name || "",
        emergencyPhone: user.emergencyContact?.phone || "",
        emergencyRelationship: user.emergencyContact?.relationship || "",
      });
    }
  }, [user]);

  const toggleConcern = (concern: string) => {
    setForm(p => ({
      ...p,
      concerns: p.concerns.includes(concern)
        ? p.concerns.filter((c: string) => c !== concern)
        : [...p.concerns, concern]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.updateClientProfile({
        name: form.name,
        phone: form.phone,
        therapyPreferences: {
          type: form.therapyType,
          concerns: form.concerns,
          preferredLanguage: form.preferredLanguage,
          description: form.description,
        },
        emergencyContact: {
          name: form.emergencyName,
          phone: form.emergencyPhone,
          relationship: form.emergencyRelationship,
        }
      });
      if (res?.user) updateUser(res.user);
      toast({ title: "Saved", description: "Profile updated successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Personal Info</h3>
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          <div>
            <Label>Full Name</Label>
            <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input type="tel" placeholder="+91-XXXXXXXXXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2"><Heart className="w-5 h-5 text-primary" /> Therapy Preferences</h3>
        <div className="space-y-3 mt-3">
          <div>
            <Label>Preferred Language</Label>
            <Input value={form.preferredLanguage} onChange={e => setForm(p => ({ ...p, preferredLanguage: e.target.value }))} />
          </div>
          <div>
            <Label>Areas of concern</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {THERAPY_TYPES.map(type => (
                <Badge
                  key={type}
                  variant={form.concerns.includes(type) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleConcern(type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <Label>Tell us more (optional)</Label>
            <Textarea rows={3} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h3 className="text-xl font-bold mb-1 flex items-center gap-2"><Phone className="w-5 h-5 text-red-500" /> Emergency Contact</h3>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-2 mb-4 flex gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-900 dark:text-amber-100">
            <strong>Disclaimer:</strong> In case of an emergency or crisis affecting your safety, your therapist may contact this person on your behalf. By providing this information, you authorize Ehsaas Therapy Centre and your therapist to reach out to your emergency contact only when there is a genuine concern for your wellbeing.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <Label>Contact Name</Label>
            <Input placeholder="Full name" value={form.emergencyName} onChange={e => setForm(p => ({ ...p, emergencyName: e.target.value }))} />
          </div>
          <div>
            <Label>Phone Number</Label>
            <Input type="tel" placeholder="+91-XXXXXXXXXX" value={form.emergencyPhone} onChange={e => setForm(p => ({ ...p, emergencyPhone: e.target.value }))} />
          </div>
          <div>
            <Label>Relationship</Label>
            <Input placeholder="e.g. Spouse, Parent, Sibling" value={form.emergencyRelationship} onChange={e => setForm(p => ({ ...p, emergencyRelationship: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>

      <div className="border-t pt-6">
        <PriceNegotiationsPanel role="client" />
      </div>

      <div className="border-t pt-6">
        <EhsaasReviewCard />
      </div>
    </Card>
  );
}
