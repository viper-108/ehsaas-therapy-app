import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateGroupTherapyDialog({ isOpen, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [coLeads, setCoLeads] = useState<any[]>([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    focus: '',
    groupType: 'closed' as 'open' | 'closed',
    ageMin: '18',
    ageMax: '65',
    pricePerMember: '',
    sessionStartAt: '',
    sessionEndAt: '',
    totalSessions: '8',
    coLeadTherapistId: '',
  });

  useEffect(() => {
    if (!isOpen) return;
    setForm({ title: '', description: '', focus: '', groupType: 'closed', ageMin: '18', ageMax: '65', pricePerMember: '', sessionStartAt: '', sessionEndAt: '', totalSessions: '8', coLeadTherapistId: '' });
    // Load potential co-leads (other approved-for-group therapists)
    api.getContacts('all').then((d: any) => {
      const group_offering = (d || []).filter((u: any) => u.role === 'therapist');
      setCoLeads(group_offering);
    }).catch(() => {});
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!form.title || !form.focus || !form.pricePerMember || !form.sessionStartAt) {
      return toast({ title: "Required fields missing", variant: "destructive" });
    }
    setSubmitting(true);
    try {
      await api.requestGroupTherapy({
        title: form.title.trim(),
        description: form.description,
        focus: form.focus.trim(),
        groupType: form.groupType,
        ageMin: Number(form.ageMin) || 18,
        ageMax: Number(form.ageMax) || 65,
        pricePerMember: Number(form.pricePerMember),
        sessionStartAt: new Date(form.sessionStartAt).toISOString(),
        sessionEndAt: form.sessionEndAt ? new Date(form.sessionEndAt).toISOString() : null,
        totalSessions: Number(form.totalSessions) || 1,
        coLeadTherapistId: form.coLeadTherapistId || null,
      });
      toast({ title: "Group request submitted", description: "Admin will review and approve. You'll be notified by email." });
      onCreated?.();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Request New Group Therapy</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Group Title *</Label>
            <Input placeholder="e.g. Anxiety Support Group" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <Label>Focus / Topic *</Label>
            <Input placeholder="Anxiety, Grief, Trauma, Self-esteem..." value={form.focus} onChange={e => setForm(p => ({ ...p, focus: e.target.value }))} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={3} placeholder="What will members work on? Frequency & format?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Group Type *</Label>
              <Select value={form.groupType} onValueChange={(v: 'open' | 'closed') => setForm(p => ({ ...p, groupType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="closed">Closed (set members, deeper trust)</SelectItem>
                  <SelectItem value="open">Open (drop-in, flexible)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Price per member (₹) *</Label>
              <Input type="number" placeholder="500" value={form.pricePerMember} onChange={e => setForm(p => ({ ...p, pricePerMember: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Min age</Label>
              <Input type="number" value={form.ageMin} onChange={e => setForm(p => ({ ...p, ageMin: e.target.value }))} />
            </div>
            <div>
              <Label>Max age</Label>
              <Input type="number" value={form.ageMax} onChange={e => setForm(p => ({ ...p, ageMax: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First session start *</Label>
              <Input type="datetime-local" value={form.sessionStartAt} onChange={e => setForm(p => ({ ...p, sessionStartAt: e.target.value }))} />
            </div>
            <div>
              <Label>Last session end (optional)</Label>
              <Input type="datetime-local" value={form.sessionEndAt} onChange={e => setForm(p => ({ ...p, sessionEndAt: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Total sessions</Label>
              <Input type="number" value={form.totalSessions} onChange={e => setForm(p => ({ ...p, totalSessions: e.target.value }))} />
            </div>
            <div>
              <Label>Co-lead Therapist (optional)</Label>
              <Select value={form.coLeadTherapistId} onValueChange={(v) => setForm(p => ({ ...p, coLeadTherapistId: v === 'none' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="None — solo lead" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None — I lead alone</SelectItem>
                  {coLeads.map((t: any) => <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-xs text-blue-900 dark:text-blue-100">
            <strong>Capacity rule:</strong> 1 lead → 5 max members. 2 leads → 10 max members. (Auto-set on submit.)
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
              {submitting ? 'Submitting...' : 'Submit for Admin Approval'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
