import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Loader2, Briefcase } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const SERVICE_LABELS: Record<string, string> = {
  individual: 'Individual Therapy',
  couple: 'Couples Therapy',
  group: 'Group Therapy',
  family: 'Family Therapy',
  supervision: 'Supervision',
};

export function MyServicesPanel() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const services: any[] = (user as any)?.approvedServices || [];

  if (!(user as any)?.servicesFinalized) {
    return (
      <Card className="p-5 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-3">
          <Briefcase className="w-5 h-5 text-amber-700 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Services pending admin review</p>
            <p className="text-xs text-amber-800 dark:text-amber-300">Once admin finalizes your services and pricing, you'll see them here to accept or reject.</p>
          </div>
        </div>
      </Card>
    );
  }

  const handleAccept = async (type: string) => {
    setBusy(type);
    try {
      const updated = await api.acceptApprovedService(type);
      updateUser(updated);
      toast({ title: "Accepted", description: `You're now offering ${SERVICE_LABELS[type]} on Ehsaas.` });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };
  const handleReject = async (type: string) => {
    if (!window.confirm(`Reject the admin's pricing for ${SERVICE_LABELS[type]}? You can message admin to negotiate.`)) return;
    setBusy(type);
    try {
      const updated = await api.rejectApprovedService(type);
      updateUser(updated);
      toast({ title: "Rejected", description: 'Admin has been notified.' });
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Briefcase className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">My Approved Services</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Admin has finalized your services. Accept each price to start accepting bookings, or reject + chat with admin to renegotiate.
      </p>
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No services approved yet.</p>
      ) : (
        <div className="space-y-2">
          {services.map((s) => {
            const label = SERVICE_LABELS[s.type] || s.type;
            return (
              <div key={s.type} className="flex items-center justify-between gap-3 p-3 border rounded-lg flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">Approved range: ₹{s.minPrice} - ₹{s.maxPrice}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {s.therapistAccepted ? (
                    <Badge className="bg-success/10 text-success"><CheckCircle className="w-3 h-3 mr-1" />Accepted</Badge>
                  ) : s.therapistRejected ? (
                    <>
                      <Badge className="bg-destructive/10 text-destructive">Rejected</Badge>
                      <Button size="sm" variant="outline" disabled={busy === s.type} onClick={() => handleAccept(s.type)}>Reconsider & Accept</Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" disabled={busy === s.type} onClick={() => handleAccept(s.type)}>
                        {busy === s.type ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle className="w-3 h-3 mr-1" />Accept</>}
                      </Button>
                      <Button size="sm" variant="outline" disabled={busy === s.type} onClick={() => handleReject(s.type)}>
                        <XCircle className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
