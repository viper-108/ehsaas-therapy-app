import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Save } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface SessionNotesDialogProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const SessionNotesDialog = ({ sessionId, isOpen, onClose }: SessionNotesDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ sessionNumber: 0, clientName: '', therapistName: '', sessionDate: '' });
  const [notes, setNotes] = useState({
    clientMood: '',
    keyTopicsDiscussed: '',
    importantNotes: '',
    interventionsOrSkillsUsed: '',
    plannedAgreedTasks: '',
    readingsOrSupervisionQuestions: '',
  });

  useEffect(() => {
    if (!isOpen || !sessionId) return;
    setLoading(true);
    api.getSessionNotes(sessionId)
      .then(data => {
        setMeta({
          sessionNumber: data.sessionNumber || 0,
          clientName: data.clientName || '',
          therapistName: data.therapistName || '',
          sessionDate: data.sessionDate || '',
        });
        const n = data.notes || {};
        if (typeof n === 'string') {
          setNotes(prev => ({ ...prev, importantNotes: n }));
        } else {
          setNotes({
            clientMood: n.clientMood || '',
            keyTopicsDiscussed: n.keyTopicsDiscussed || '',
            importantNotes: n.importantNotes || '',
            interventionsOrSkillsUsed: n.interventionsOrSkillsUsed || '',
            plannedAgreedTasks: n.plannedAgreedTasks || '',
            readingsOrSupervisionQuestions: n.readingsOrSupervisionQuestions || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, sessionId]);

  const handleSave = async () => {
    const mandatory = [
      { key: 'clientMood', label: 'Client Mood / Key Emotions' },
      { key: 'keyTopicsDiscussed', label: 'Key Topics / Concerns Discussed' },
      { key: 'importantNotes', label: 'Important Notes' },
      { key: 'interventionsOrSkillsUsed', label: 'Interventions or Skills Used' },
      { key: 'plannedAgreedTasks', label: 'Planned / Agreed Tasks' },
    ];

    for (const f of mandatory) {
      if (!(notes as any)[f.key]?.trim()) {
        toast({ title: "Required", description: `${f.label} is mandatory`, variant: "destructive" });
        return;
      }
    }

    setSaving(true);
    try {
      await api.updateSessionNotes(sessionId, notes);
      toast({ title: "Saved", description: "Session notes saved successfully" });
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = (key: string, val: string) => setNotes(p => ({ ...p, [key]: val }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Session Notes
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Meta info (read-only) */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg text-sm">
              <div>
                <span className="text-muted-foreground">Therapist:</span>{' '}
                <span className="font-medium">{meta.therapistName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Client:</span>{' '}
                <span className="font-medium">{meta.clientName}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Date:</span>{' '}
                <span className="font-medium">{meta.sessionDate ? new Date(meta.sessionDate).toLocaleDateString('en-IN') : 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Session #:</span>{' '}
                <Badge variant="secondary">{meta.sessionNumber}</Badge>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Client Mood / Key Emotions *</label>
              <Input placeholder="e.g., Anxious, Low mood, Hopeful, Calm..."
                value={notes.clientMood} onChange={e => set('clientMood', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Key Topics / Concerns Discussed *</label>
              <Textarea placeholder="Main topics covered during the session..."
                rows={3} value={notes.keyTopicsDiscussed} onChange={e => set('keyTopicsDiscussed', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Important Notes *</label>
              <Textarea placeholder="Key observations, breakthroughs, or concerns to note..."
                rows={3} value={notes.importantNotes} onChange={e => set('importantNotes', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">In-session Interventions or Skills Used *</label>
              <Textarea placeholder="CBT techniques, mindfulness exercises, journaling prompts, etc."
                rows={3} value={notes.interventionsOrSkillsUsed} onChange={e => set('interventionsOrSkillsUsed', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Planned / Agreed Tasks *</label>
              <Textarea placeholder="Homework, activities, or goals agreed upon for next session..."
                rows={3} value={notes.plannedAgreedTasks} onChange={e => set('plannedAgreedTasks', e.target.value)} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Readings or Supervision Questions (optional)</label>
              <Textarea placeholder="Any readings to share with client, or questions to discuss in supervision..."
                rows={2} value={notes.readingsOrSupervisionQuestions} onChange={e => set('readingsOrSupervisionQuestions', e.target.value)} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</> : <><Save className="w-4 h-4 mr-2" /> Save Notes</>}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
