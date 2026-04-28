import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UsersRound } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  group: any;
  isOpen: boolean;
  onClose: () => void;
  onEnrolled?: () => void;
}

export function EnrollGroupDialog({ group, isOpen, onClose, onEnrolled }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    age: '',
    reasonForJoining: '',
    expectations: '',
    relevantHistory: '',
    agreedToGroupRules: false,
  });

  const handleSubmit = async () => {
    if (!form.agreedToGroupRules) return toast({ title: "Please agree to the group rules", variant: "destructive" });
    if (!form.age || isNaN(Number(form.age))) return toast({ title: "Enter a valid age", variant: "destructive" });
    const age = Number(form.age);
    if (age < group.ageMin || age > group.ageMax) {
      return toast({ title: `This group is for ages ${group.ageMin}-${group.ageMax}.`, variant: "destructive" });
    }
    if (!form.reasonForJoining.trim()) return toast({ title: "Please share why you want to join", variant: "destructive" });

    setSubmitting(true);
    try {
      await api.enrollInGroupTherapy(group._id, {
        age, reasonForJoining: form.reasonForJoining,
        expectations: form.expectations,
        relevantHistory: form.relevantHistory,
        agreedToGroupRules: true,
      });
      toast({ title: "Application submitted", description: "Lead therapists & admin will review your application." });
      onEnrolled?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UsersRound className="w-5 h-5 text-primary" /> Apply: {group.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded p-3 text-sm">
            <p><strong>Focus:</strong> {group.focus}</p>
            <p><strong>Type:</strong> {group.groupType === 'open' ? 'Open (drop-in)' : 'Closed (start & finish together)'}</p>
            <p><strong>Ages:</strong> {group.ageMin}-{group.ageMax}</p>
            <p><strong>Price:</strong> ₹{group.pricePerMember} per member per session series</p>
          </div>

          <div>
            <Label>Your age *</Label>
            <Input type="number" value={form.age} onChange={e => setForm(p => ({ ...p, age: e.target.value }))} />
          </div>
          <div>
            <Label>Why do you want to join this group? *</Label>
            <Textarea rows={3} placeholder="Briefly describe what you're hoping to work on or learn..." value={form.reasonForJoining} onChange={e => setForm(p => ({ ...p, reasonForJoining: e.target.value }))} />
          </div>
          <div>
            <Label>What do you hope to gain from this group?</Label>
            <Textarea rows={2} value={form.expectations} onChange={e => setForm(p => ({ ...p, expectations: e.target.value }))} />
          </div>
          <div>
            <Label>Relevant history (optional)</Label>
            <Textarea rows={2} placeholder="Any relevant therapy history, current support, or context..." value={form.relevantHistory} onChange={e => setForm(p => ({ ...p, relevantHistory: e.target.value }))} />
          </div>

          <div className="flex items-start gap-2 p-3 border rounded bg-muted/30">
            <Checkbox id="agree" checked={form.agreedToGroupRules} onCheckedChange={(v) => setForm(p => ({ ...p, agreedToGroupRules: v === true }))} />
            <label htmlFor="agree" className="text-xs text-muted-foreground cursor-pointer">
              I agree to maintain confidentiality of all members, attend regularly once approved, and respect group norms. I understand that once the group is locked (48h before start), I cannot leave or get a refund.
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
