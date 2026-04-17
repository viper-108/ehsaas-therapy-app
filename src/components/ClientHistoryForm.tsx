import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, FileText } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface ClientHistoryFormProps {
  clientId: string;
  clientName: string;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ClientHistoryForm = ({ clientId, clientName, isOpen, onClose, onSaved }: ClientHistoryFormProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({
    socioDemographics: '',
    dateOfFirstSession: '',
    presentingConcerns: '',
    historyOfPresentingConcerns: '',
    familyHistoryMentalHealth: '',
    personalHistory: '',
    premorbidPersonality: '',
    clientEngagementMotivation: '',
  });

  useEffect(() => {
    if (!isOpen || !clientId) return;
    setLoading(true);
    api.getClientHistory(clientId)
      .then(data => {
        if (data) {
          setIsEdit(true);
          setForm({
            socioDemographics: data.socioDemographics || '',
            dateOfFirstSession: data.dateOfFirstSession ? new Date(data.dateOfFirstSession).toISOString().split('T')[0] : '',
            presentingConcerns: data.presentingConcerns || '',
            historyOfPresentingConcerns: data.historyOfPresentingConcerns || '',
            familyHistoryMentalHealth: data.familyHistoryMentalHealth || '',
            personalHistory: data.personalHistory || '',
            premorbidPersonality: data.premorbidPersonality || '',
            clientEngagementMotivation: data.clientEngagementMotivation || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, clientId]);

  const handleSave = async () => {
    // Validate all mandatory fields
    const fields = [
      { key: 'socioDemographics', label: 'Socio-Demographics' },
      { key: 'dateOfFirstSession', label: 'Date of First Session' },
      { key: 'presentingConcerns', label: 'Presenting Concerns' },
      { key: 'historyOfPresentingConcerns', label: 'History of Presenting Concerns' },
      { key: 'familyHistoryMentalHealth', label: 'Family History of Mental Health Issues' },
      { key: 'personalHistory', label: 'Personal History' },
      { key: 'premorbidPersonality', label: 'Premorbid Personality' },
      { key: 'clientEngagementMotivation', label: "Client's Engagement and Motivation" },
    ];

    for (const f of fields) {
      if (!(form as any)[f.key]?.trim()) {
        toast({ title: "Required", description: `${f.label} is mandatory`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      if (isEdit) {
        await api.updateClientHistory(clientId, form);
      } else {
        await api.saveClientHistory({ clientId, ...form });
      }
      toast({ title: "Saved", description: "Client history saved successfully" });
      onSaved?.();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Client History — {clientName}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">All fields are mandatory. This form should be completed after the first session or intro call.</p>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Date of First Session *</label>
              <Input type="date" value={form.dateOfFirstSession} onChange={e => set('dateOfFirstSession', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Socio-Demographics *</label>
              <Textarea placeholder="Age, gender, occupation, marital status, location, etc."
                rows={2} value={form.socioDemographics} onChange={e => set('socioDemographics', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Presenting Concerns *</label>
              <Textarea placeholder="What issues brought the client to therapy?"
                rows={3} value={form.presentingConcerns} onChange={e => set('presentingConcerns', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">History of Presenting Concerns *</label>
              <Textarea placeholder="When did these concerns begin? How have they evolved?"
                rows={3} value={form.historyOfPresentingConcerns} onChange={e => set('historyOfPresentingConcerns', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Family History of Mental Health Issues *</label>
              <Textarea placeholder="Any family history of mental health conditions, treatments, or hospitalizations?"
                rows={3} value={form.familyHistoryMentalHealth} onChange={e => set('familyHistoryMentalHealth', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Personal History *</label>
              <p className="text-xs text-muted-foreground mb-1">Developmental milestones, education, relationships, childhood, medical history, sexual history, marital history, substance use</p>
              <Textarea placeholder="Detailed personal history covering all relevant areas..."
                rows={4} value={form.personalHistory} onChange={e => set('personalHistory', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Premorbid Personality *</label>
              <p className="text-xs text-muted-foreground mb-1">Social relations, intellectual activities, mood, attitude, energy and initiative, habits</p>
              <Textarea placeholder="Describe the client's personality before the onset of concerns..."
                rows={3} value={form.premorbidPersonality} onChange={e => set('premorbidPersonality', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Client's Engagement and Motivation for Therapy *</label>
              <Textarea placeholder="How engaged is the client? What is their motivation for seeking help?"
                rows={2} value={form.clientEngagementMotivation} onChange={e => set('clientEngagementMotivation', e.target.value)} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : isEdit ? 'Update History' : 'Save History'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
