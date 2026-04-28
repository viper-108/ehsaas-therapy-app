import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Save } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const SERVICE_TYPES = ['individual', 'couple', 'group', 'family', 'supervision'] as const;
const SERVICE_LABELS: Record<string, string> = {
  individual: 'Individual',
  couple: 'Couples',
  group: 'Group',
  family: 'Family',
  supervision: 'Supervision',
};

interface Props {
  therapistId: string;
  servicesOffered: any[];
  approvedServices: any[];
  onSaved?: () => void;
}

export function ServicesFinalizeForm({ therapistId, servicesOffered, approvedServices, onSaved }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [services, setServices] = useState<Record<string, { offered: boolean; min: string; max: string }>>({} as any);

  useEffect(() => {
    const init: Record<string, { offered: boolean; min: string; max: string }> = {} as any;
    SERVICE_TYPES.forEach(t => {
      const apr = approvedServices.find((s: any) => s.type === t);
      const ofr = servicesOffered.find((s: any) => s.type === t);
      if (apr) {
        init[t] = { offered: true, min: String(apr.minPrice), max: String(apr.maxPrice) };
      } else if (ofr) {
        init[t] = { offered: false, min: String(ofr.minPrice), max: String(ofr.maxPrice) };
      } else {
        init[t] = { offered: false, min: '', max: '' };
      }
    });
    setServices(init);
  }, [therapistId, servicesOffered, approvedServices]);

  const handleSave = async () => {
    const toSave: { type: string; minPrice: number; maxPrice: number }[] = [];
    let invalid = '';
    SERVICE_TYPES.forEach(t => {
      const s = services[t];
      if (!s?.offered) return;
      const min = Number(s.min); const max = Number(s.max);
      if (!s.max || isNaN(max) || max <= 0) { invalid = `Set max price for ${SERVICE_LABELS[t]}`; return; }
      if (s.min && !isNaN(min) && min > max) { invalid = `Min for ${SERVICE_LABELS[t]} must be ≤ max`; return; }
      toSave.push({ type: t, minPrice: !isNaN(min) ? min : 0, maxPrice: max });
    });
    if (invalid) return toast({ title: "Invalid", description: invalid, variant: "destructive" });
    if (toSave.length === 0) {
      if (!window.confirm('No services selected. This will leave the therapist with no approved services. Continue?')) return;
    }

    setBusy(true);
    try {
      await api.setApprovedServicesForTherapist(therapistId, toSave);
      toast({ title: "Services finalized", description: "Therapist has been notified by email." });
      onSaved?.();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">Finalize Services & Pricing (admin)</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Toggle each service the therapist has been APPROVED for and set the final Min/Max price range. Saving will email them to accept or reject each.
      </p>
      <div className="space-y-2">
        {SERVICE_TYPES.map(t => {
          const s = services[t] || { offered: false, min: '', max: '' };
          const apr = approvedServices.find((x: any) => x.type === t);
          return (
            <div key={t} className={`p-3 rounded-md border ${s.offered ? 'bg-background border-primary/30' : 'bg-muted/30 border-border'}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <Checkbox
                  checked={s.offered}
                  onCheckedChange={(v) => setServices(p => ({ ...p, [t]: { ...p[t], offered: v === true } }))}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{SERVICE_LABELS[t]}</p>
                  {apr?.therapistAccepted && <Badge className="bg-success/10 text-success text-xs mt-1">Accepted by therapist</Badge>}
                  {apr?.therapistRejected && <Badge className="bg-destructive/10 text-destructive text-xs mt-1">Rejected by therapist</Badge>}
                </div>
                {s.offered && (
                  <div className="flex gap-2 items-center">
                    <Input type="number" placeholder="Min" className="w-20 h-9" value={s.min}
                      onChange={e => setServices(p => ({ ...p, [t]: { ...p[t], min: e.target.value } }))} />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input type="number" placeholder="Max" className="w-20 h-9" value={s.max}
                      onChange={e => setServices(p => ({ ...p, [t]: { ...p[t], max: e.target.value } }))} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Button onClick={handleSave} disabled={busy} className="mt-4 w-full">
        <Save className="w-4 h-4 mr-2" /> {busy ? 'Saving...' : 'Save & Notify Therapist'}
      </Button>
    </Card>
  );
}
