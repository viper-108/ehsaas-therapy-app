import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IndianRupee, Check, X, Plus, AlertTriangle } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  /** "client" | "therapist" | "admin" */
  role: 'client' | 'therapist' | 'admin';
  /** For admin role only: list of (clients, therapists) so they can enable negotiation */
  adminEnableData?: {
    clients: { _id: string; name: string }[];
    therapists: { _id: string; name: string; pricing?: any; pricingMin?: any }[];
  };
}

const statusBadge = (s: string) => {
  const map: Record<string, { label: string; cls: string }> = {
    invited: { label: 'Awaiting client', cls: 'bg-blue-500/10 text-blue-600' },
    proposed: { label: 'Client proposed — awaiting approvals', cls: 'bg-amber-500/10 text-amber-600' },
    partially_approved: { label: 'Partially approved', cls: 'bg-amber-500/10 text-amber-600' },
    approved: { label: 'Active — Approved', cls: 'bg-green-500/10 text-green-700' },
    rejected: { label: 'Rejected', cls: 'bg-red-500/10 text-red-600' },
    cancelled: { label: 'Cancelled', cls: 'bg-muted text-muted-foreground' },
  };
  const v = map[s] || { label: s, cls: 'bg-muted text-muted-foreground' };
  return <Badge className={`${v.cls} text-xs`}>{v.label}</Badge>;
};

export function PriceNegotiationsPanel({ role, adminEnableData }: Props) {
  const { toast } = useToast();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [proposeId, setProposeId] = useState<string | null>(null);
  const [proposedPrice, setProposedPrice] = useState('');
  const [enableModal, setEnableModal] = useState<{ open: boolean; clientId: string; therapistId: string; duration: string }>({ open: false, clientId: '', therapistId: '', duration: '50' });

  // For therapist, self-fetch clients (admin gets clients via adminEnableData)
  const [therapistClients, setTherapistClients] = useState<{ _id: string; name: string }[]>([]);

  const load = async () => {
    setLoading(true);
    try { const d = await api.getMyPriceNegotiations(); setList(d || []); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    if (role === 'therapist') {
      api.getTherapistClients?.()
        .then((data: any) => setTherapistClients(data || []))
        .catch(() => setTherapistClients([]));
    }
  }, []);

  const enableClients = role === 'admin'
    ? (adminEnableData?.clients || [])
    : therapistClients;

  const activeNeg = useMemo(() => list.find(n => ['invited', 'proposed', 'partially_approved'].includes(n.status)), [list]);

  const handleApprove = async (id: string) => {
    try { await api.approvePriceNegotiation(id); toast({ title: "Approved" }); load(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };
  const handleReject = async (id: string) => {
    const reason = window.prompt('Reason for rejection (optional):') || '';
    try { await api.rejectPriceNegotiation(id, reason); toast({ title: "Rejected" }); load(); }
    catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };
  const handlePropose = async () => {
    if (!proposeId) return;
    const price = Number(proposedPrice);
    if (isNaN(price) || price <= 0) return toast({ title: "Enter a valid price", variant: "destructive" });
    try {
      await api.proposePrice(proposeId, price);
      toast({ title: "Submitted", description: "Awaiting therapist + admin approval." });
      setProposeId(null); setProposedPrice('');
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };
  const handleEnable = async () => {
    if (!enableModal.clientId || (!enableModal.therapistId && role === 'admin') || !enableModal.duration) {
      return toast({ title: "Missing fields", variant: "destructive" });
    }
    try {
      const body: any = { clientId: enableModal.clientId, duration: enableModal.duration };
      if (role === 'admin') body.therapistId = enableModal.therapistId;
      await api.enablePriceNegotiation(body);
      toast({ title: "Negotiation enabled", description: "The client has been notified." });
      setEnableModal({ open: false, clientId: '', therapistId: '', duration: '50' });
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2"><IndianRupee className="w-5 h-5 text-primary" /> Price Negotiations</h3>
          <p className="text-xs text-muted-foreground">
            {role === 'client' && 'Therapists can invite you to propose a lower session price. Both therapist and admin must approve.'}
            {role === 'therapist' && 'Enable negotiation for a client; review and approve their proposed price.'}
            {role === 'admin' && 'Enable negotiation for any client/therapist pair; approve or reject proposals.'}
          </p>
        </div>
        {(role === 'therapist' || role === 'admin') && (
          <Button size="sm" onClick={() => setEnableModal({ open: true, clientId: '', therapistId: '', duration: '50' })}>
            <Plus className="w-4 h-4 mr-1" /> Enable for client
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="p-6 text-center text-muted-foreground">Loading...</Card>
      ) : list.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground text-sm">No price negotiations yet.</Card>
      ) : (
        <div className="space-y-2">
          {list.map(n => {
            const meIsTherapist = role === 'therapist';
            const meIsAdmin = role === 'admin';
            const meIsClient = role === 'client';
            const canApprove = (meIsTherapist && !n.therapistApproved) || (meIsAdmin && !n.adminApproved);
            const canReject = (meIsTherapist || meIsAdmin) && ['proposed', 'partially_approved'].includes(n.status);
            const showProposeBtn = meIsClient && ['invited', 'proposed'].includes(n.status);

            return (
              <Card key={n._id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {statusBadge(n.status)}
                      <Badge variant="outline" className="text-xs">{n.duration}-min</Badge>
                    </div>
                    <p className="text-sm">
                      <strong>
                        {role === 'client' ? `${n.therapistId?.name || 'Therapist'}` :
                         role === 'therapist' ? `${n.clientId?.name || 'Client'}` :
                         `${n.clientId?.name || 'Client'} → ${n.therapistId?.name || 'Therapist'}`}
                      </strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Range: ₹{n.minPrice} - ₹{n.originalPrice}
                      {n.proposedPrice && <> &middot; <strong className="text-foreground">Proposed: ₹{n.proposedPrice}</strong></>}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{n.therapistApproved ? '✓ Therapist approved' : '○ Therapist pending'}</span>
                      <span>{n.adminApproved ? '✓ Admin approved' : '○ Admin pending'}</span>
                    </div>
                    {n.rejectionReason && <p className="text-xs text-destructive mt-1">Rejected: {n.rejectionReason}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {showProposeBtn && (
                      <Button size="sm" onClick={() => { setProposeId(n._id); setProposedPrice(String(n.proposedPrice || n.minPrice)); }}>
                        {n.proposedPrice ? 'Edit Proposal' : 'Propose Price'}
                      </Button>
                    )}
                    {canApprove && (
                      <Button size="sm" variant="outline" onClick={() => handleApprove(n._id)} className="border-green-500 text-green-600 hover:bg-green-50">
                        <Check className="w-3 h-3 mr-1" /> Approve
                      </Button>
                    )}
                    {canReject && (
                      <Button size="sm" variant="outline" onClick={() => handleReject(n._id)} className="border-red-500 text-red-600 hover:bg-red-50">
                        <X className="w-3 h-3 mr-1" /> Reject
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Propose Price Dialog */}
      <Dialog open={!!proposeId} onOpenChange={(o) => { if (!o) setProposeId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Propose a Lower Price</DialogTitle></DialogHeader>
          {proposeId && (() => {
            const n = list.find(x => x._id === proposeId);
            if (!n) return null;
            return (
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-100">
                    Enter a price between <strong>₹{n.minPrice}</strong> and <strong>₹{n.originalPrice}</strong> per {n.duration}-min session. Once submitted, both your therapist and the Ehsaas team must approve.
                  </div>
                </div>
                <div>
                  <Label>Your proposed price (₹)</Label>
                  <Input type="number" min={n.minPrice} max={n.originalPrice} value={proposedPrice} onChange={e => setProposedPrice(e.target.value)} />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setProposeId(null)} className="flex-1">Cancel</Button>
                  <Button onClick={handlePropose} className="flex-1">Submit Proposal</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Enable Negotiation Dialog */}
      <Dialog open={enableModal.open} onOpenChange={(o) => { if (!o) setEnableModal(p => ({ ...p, open: false })); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Enable Price Negotiation</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {role === 'admin' && adminEnableData && (
              <div>
                <Label>Therapist</Label>
                <Select value={enableModal.therapistId} onValueChange={(v) => setEnableModal(p => ({ ...p, therapistId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select therapist" /></SelectTrigger>
                  <SelectContent>
                    {adminEnableData.therapists.map((t: any) => (
                      <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Client</Label>
              <Select value={enableModal.clientId} onValueChange={(v) => setEnableModal(p => ({ ...p, clientId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>
                  {enableClients.map((c: any) => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Session duration</Label>
              <Select value={enableModal.duration} onValueChange={(v) => setEnableModal(p => ({ ...p, duration: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="50">50 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              The client will be notified to propose a price within your min/max range. Both therapist and admin must approve before it activates.
            </p>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setEnableModal(p => ({ ...p, open: false }))} className="flex-1">Cancel</Button>
              <Button onClick={handleEnable} className="flex-1">Enable</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
