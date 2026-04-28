import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Briefcase, Plus, X, Clock } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const ALL_TYPES = ['individual', 'couple', 'group', 'family', 'supervision'] as const;
const LABELS: Record<string, string> = {
  individual: 'Individual', couple: 'Couples', group: 'Group', family: 'Family', supervision: 'Supervision',
};

type Change = { type: string; action: 'add' | 'remove'; minPrice?: string; maxPrice?: string; note?: string };

export function ManageServicesPanel() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [changes, setChanges] = useState<Change[]>([]);
  const [draftType, setDraftType] = useState<string>('');
  const [draftAction, setDraftAction] = useState<'add' | 'remove'>('add');
  const [draftMin, setDraftMin] = useState('');
  const [draftMax, setDraftMax] = useState('');
  const [draftNote, setDraftNote] = useState('');

  const acceptedTypes = useMemo(() => {
    return ((user as any)?.approvedServices || [])
      .filter((s: any) => s.therapistAccepted)
      .map((s: any) => s.type);
  }, [user]);

  const pendingFromBackend = (user as any)?.pendingServiceChanges || [];
  const isPending = !!(user as any)?.servicesPendingReview;

  const addToBatch = () => {
    if (!draftType) return toast({ title: "Pick a service type", variant: "destructive" });
    if (draftAction === 'add' && (!draftMax || isNaN(Number(draftMax)) || Number(draftMax) <= 0)) {
      return toast({ title: "Enter a valid max price", variant: "destructive" });
    }
    if (draftAction === 'add' && draftMin && Number(draftMin) > Number(draftMax)) {
      return toast({ title: "Min must be ≤ max", variant: "destructive" });
    }
    if (draftAction === 'add' && acceptedTypes.includes(draftType)) {
      return toast({ title: `You already offer ${LABELS[draftType]}`, variant: "destructive" });
    }
    if (draftAction === 'remove' && !acceptedTypes.includes(draftType)) {
      return toast({ title: `You don't currently offer ${LABELS[draftType]}`, variant: "destructive" });
    }
    if (changes.some(c => c.type === draftType && c.action === draftAction)) {
      return toast({ title: "That change is already in the batch", variant: "destructive" });
    }
    setChanges(prev => [...prev, { type: draftType, action: draftAction, minPrice: draftMin, maxPrice: draftMax, note: draftNote }]);
    setDraftType(''); setDraftAction('add'); setDraftMin(''); setDraftMax(''); setDraftNote('');
  };
  const removeFromBatch = (i: number) => setChanges(prev => prev.filter((_, idx) => idx !== i));

  const submit = async () => {
    if (changes.length === 0) return toast({ title: "Add at least one change", variant: "destructive" });
    setSubmitting(true);
    try {
      const payload = changes.map(c => ({
        type: c.type,
        action: c.action,
        minPrice: c.minPrice ? Number(c.minPrice) : 0,
        maxPrice: c.maxPrice ? Number(c.maxPrice) : 0,
        note: c.note || '',
      }));
      const updated = await api.requestServiceChange(payload);
      if (updated) updateUser(updated);
      toast({ title: "Submitted for admin approval", description: "You'll be notified once admin reviews your request." });
      setChanges([]);
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  if (!(user as any)?.servicesFinalized) return null; // first-time onboarding flow handles initial setup

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <Briefcase className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Manage Your Services</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Want to start offering a new type of therapy, or stop offering one? Submit a request below — admin must approve before changes take effect.
      </p>

      {isPending && pendingFromBackend.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-sm font-semibold flex items-center gap-1.5 mb-2">
            <Clock className="w-4 h-4 text-amber-700 dark:text-amber-300" /> Pending admin review
          </p>
          <div className="space-y-1">
            {pendingFromBackend.map((c: any, i: number) => (
              <div key={i} className="text-xs text-muted-foreground">
                {c.action === 'add' ? '➕ Add' : '➖ Remove'} <strong className="capitalize">{LABELS[c.type] || c.type}</strong>
                {c.action === 'add' && (c.minPrice || c.maxPrice) ? ` at ₹${c.minPrice}-${c.maxPrice}` : ''}
                {c.note ? ` — ${c.note}` : ''}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-2 italic">
            You can't submit another change until admin reviews this one.
          </p>
        </div>
      )}

      {!isPending && (
        <>
          {/* Batch list */}
          {changes.length > 0 && (
            <div className="mb-4 space-y-1">
              {changes.map((c, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-2 bg-muted/40 rounded text-sm">
                  <span>
                    <Badge variant={c.action === 'add' ? 'default' : 'outline'} className="mr-2">{c.action === 'add' ? '➕ Add' : '➖ Remove'}</Badge>
                    <strong className="capitalize">{LABELS[c.type]}</strong>
                    {c.action === 'add' && c.maxPrice ? ` — ₹${c.minPrice || 0} to ₹${c.maxPrice}` : ''}
                  </span>
                  <Button size="sm" variant="ghost" onClick={() => removeFromBatch(i)}><X className="w-3 h-3" /></Button>
                </div>
              ))}
            </div>
          )}

          {/* Draft form */}
          <div className="space-y-3 border-t pt-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Action</Label>
                <Select value={draftAction} onValueChange={(v: 'add' | 'remove') => setDraftAction(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">Start offering (Add)</SelectItem>
                    <SelectItem value="remove">Stop offering (Remove)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Service Type</Label>
                <Select value={draftType} onValueChange={setDraftType}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    {ALL_TYPES
                      .filter(t => draftAction === 'add' ? !acceptedTypes.includes(t) : acceptedTypes.includes(t))
                      .map(t => <SelectItem key={t} value={t}>{LABELS[t]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {draftAction === 'add' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Min Price ₹</Label>
                  <Input type="number" placeholder="600" value={draftMin} onChange={e => setDraftMin(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Max Price ₹ <span className="text-destructive">*</span></Label>
                  <Input type="number" placeholder="1200" value={draftMax} onChange={e => setDraftMax(e.target.value)} />
                </div>
              </div>
            )}

            <div>
              <Label className="text-xs">Note for admin (optional)</Label>
              <Textarea rows={2} placeholder="e.g. I just completed group facilitation training..." value={draftNote} onChange={e => setDraftNote(e.target.value)} />
            </div>

            <Button variant="outline" className="w-full" onClick={addToBatch}>
              <Plus className="w-4 h-4 mr-1" /> Add to request
            </Button>
          </div>

          {changes.length > 0 && (
            <Button onClick={submit} disabled={submitting} className="w-full mt-4">
              {submitting ? 'Submitting...' : `Submit ${changes.length} change${changes.length > 1 ? 's' : ''} for admin approval`}
            </Button>
          )}
        </>
      )}
    </Card>
  );
}
