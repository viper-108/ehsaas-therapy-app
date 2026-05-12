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
type ServiceType = typeof SERVICE_TYPES[number];

const SERVICE_LABELS: Record<ServiceType, string> = {
  individual: 'Individual',
  couple: 'Couples',
  group: 'Group',
  family: 'Family',
  supervision: 'Supervision',
};

// Per-service supported session durations — mirrors the onboarding form.
// Empty array = single price band (family / group).
const SERVICE_DURATIONS: Record<ServiceType, number[]> = {
  individual:  [30, 50],
  couple:      [50, 90],
  supervision: [50, 90],
  family:      [],
  group:       [],
};

interface Props {
  therapistId: string;
  servicesOffered: any[];
  approvedServices: any[];
  onSaved?: () => void;
}

type ServiceState = {
  offered: boolean;
  min: string;            // top-level aggregate band (used for family/group, derived for multi-duration)
  max: string;
  durations: Record<string, { min: string; max: string }>;
};

const blankService = (t: ServiceType): ServiceState => ({
  offered: false, min: '', max: '',
  durations: Object.fromEntries(SERVICE_DURATIONS[t].map(d => [String(d), { min: '', max: '' }])),
});

export function ServicesFinalizeForm({ therapistId, servicesOffered, approvedServices, onSaved }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [services, setServices] = useState<Record<ServiceType, ServiceState>>({} as any);

  // Pull initial values from approvedServices (admin-finalised, source of
  // truth) and fall back to servicesOffered (therapist's original ask) if
  // approvedServices is empty for a given type. We hydrate both the
  // top-level band and durationPricing.
  useEffect(() => {
    const init = {} as Record<ServiceType, ServiceState>;
    SERVICE_TYPES.forEach(t => {
      const apr = (approvedServices || []).find((s: any) => s.type === t);
      const ofr = (servicesOffered  || []).find((s: any) => s.type === t);
      const src = apr || ofr;
      const state: ServiceState = blankService(t);
      if (src) {
        state.offered = !!apr;
        state.min = src.minPrice != null ? String(src.minPrice) : '';
        state.max = src.maxPrice != null ? String(src.maxPrice) : '';
        const dps = Array.isArray(src.durationPricing) ? src.durationPricing : [];
        dps.forEach((dp: any) => {
          const key = String(dp.duration);
          if (state.durations[key]) {
            state.durations[key] = {
              min: dp.minPrice != null ? String(dp.minPrice) : '',
              max: dp.maxPrice != null ? String(dp.maxPrice) : '',
            };
          }
        });
      }
      init[t] = state;
    });
    setServices(init);
  }, [therapistId, servicesOffered, approvedServices]);

  const handleSave = async () => {
    type Out = {
      type: string; minPrice: number; maxPrice: number;
      durationPricing: { duration: number; minPrice: number; maxPrice: number }[];
    };
    const toSave: Out[] = [];
    let invalid = '';

    for (const t of SERVICE_TYPES) {
      const s = services[t];
      if (!s?.offered) continue;
      const durs = SERVICE_DURATIONS[t];

      if (durs.length === 0) {
        // Single-band service
        const min = Number(s.min); const max = Number(s.max);
        if (!s.max || isNaN(max) || max <= 0) { invalid = `Set max price for ${SERVICE_LABELS[t]}`; break; }
        if (s.min && !isNaN(min) && min > max) { invalid = `Min for ${SERVICE_LABELS[t]} must be ≤ max`; break; }
        toSave.push({
          type: t,
          minPrice: !isNaN(min) ? min : 0,
          maxPrice: max,
          durationPricing: [],
        });
      } else {
        const dp: { duration: number; minPrice: number; maxPrice: number }[] = [];
        for (const d of durs) {
          const cell = s.durations[String(d)] || { min: '', max: '' };
          const cMin = Number(cell.min); const cMax = Number(cell.max);
          if (!cell.max || isNaN(cMax) || cMax <= 0) { invalid = `Set max price for ${SERVICE_LABELS[t]} ${d}-min sessions`; break; }
          if (cell.min && !isNaN(cMin) && cMin > cMax) { invalid = `Min for ${SERVICE_LABELS[t]} ${d}-min must be ≤ max`; break; }
          dp.push({ duration: d, minPrice: !isNaN(cMin) ? cMin : 0, maxPrice: cMax });
        }
        if (invalid) break;
        toSave.push({
          type: t,
          minPrice: Math.min(...dp.map(x => x.minPrice || x.maxPrice)),
          maxPrice: Math.max(...dp.map(x => x.maxPrice)),
          durationPricing: dp,
        });
      }
    }
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

  const setSvc = (t: ServiceType, patch: Partial<ServiceState>) =>
    setServices(p => ({ ...p, [t]: { ...p[t], ...patch } }));
  const setSvcDuration = (t: ServiceType, key: string, patch: Partial<{ min: string; max: string }>) =>
    setServices(p => ({
      ...p,
      [t]: {
        ...p[t],
        durations: { ...p[t].durations, [key]: { ...p[t].durations[key], ...patch } },
      },
    }));

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-5 h-5 text-primary" />
        <h4 className="font-semibold text-foreground">Finalize Services & Pricing (admin)</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Toggle each service the therapist has been APPROVED for and set the final Min/Max price for each session length. Saving will email them to accept or reject each.
      </p>
      <div className="space-y-2">
        {SERVICE_TYPES.map(t => {
          const s = services[t] || blankService(t);
          const apr = (approvedServices || []).find((x: any) => x.type === t);
          const durs = SERVICE_DURATIONS[t];
          return (
            <div key={t} className={`p-3 rounded-md border ${s.offered ? 'bg-background border-primary/30' : 'bg-muted/30 border-border'}`}>
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <Checkbox
                  checked={s.offered}
                  onCheckedChange={(v) => setSvc(t, { offered: v === true })}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{SERVICE_LABELS[t]}</p>
                  {apr?.therapistAccepted && <Badge className="bg-success/10 text-success text-xs mt-1">Accepted by therapist</Badge>}
                  {apr?.therapistRejected && <Badge className="bg-destructive/10 text-destructive text-xs mt-1">Rejected by therapist</Badge>}
                </div>
              </div>

              {s.offered && durs.length === 0 && (
                /* Single band (family / group) — Min then Max */
                <div className="flex gap-2 items-center flex-wrap pl-7">
                  <Input type="number" placeholder="Min ₹" className="w-24 h-9" value={s.min}
                    onChange={e => setSvc(t, { min: e.target.value })} />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input type="number" placeholder="Max ₹" className="w-24 h-9" value={s.max}
                    onChange={e => setSvc(t, { max: e.target.value })} />
                </div>
              )}

              {s.offered && durs.length > 0 && (
                /* Per-duration bands (individual: 30+50, couple/supervision: 50+90) */
                <div className="space-y-2 pl-7">
                  {durs.map(d => {
                    const key = String(d);
                    const cell = s.durations[key] || { min: '', max: '' };
                    return (
                      <div key={d} className="flex gap-2 items-center flex-wrap">
                        <span className="text-xs font-medium w-14">{d} min</span>
                        <Input type="number" placeholder="Min ₹" className="w-24 h-9" value={cell.min}
                          onChange={e => setSvcDuration(t, key, { min: e.target.value })} />
                        <span className="text-xs text-muted-foreground">to</span>
                        <Input type="number" placeholder="Max ₹" className="w-24 h-9" value={cell.max}
                          onChange={e => setSvcDuration(t, key, { max: e.target.value })} />
                      </div>
                    );
                  })}
                </div>
              )}
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
