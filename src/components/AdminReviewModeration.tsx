import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Check, X, MessageSquare } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export function AdminReviewModeration() {
  const [pending, setPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getPendingReviews();
      setPending(data || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleApprove = async (id: string) => {
    try {
      await api.approveReview(id);
      toast({ title: "Approved", description: "Review is now public" });
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  const handleReject = async (id: string) => {
    const reason = window.prompt('Reason for rejecting this review (optional):') || '';
    try {
      await api.rejectReview(id, reason);
      toast({ title: "Rejected", description: "Review will not be shown publicly" });
      load();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
  };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-foreground">Pending Reviews ({pending.length})</h2>
      {loading ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">Loading...</p></Card>
      ) : pending.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No reviews awaiting approval.</p></Card>
      ) : (
        pending.map(r => (
          <Card key={r._id} className="p-4">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={r.reviewType === 'ehsaas' ? 'default' : 'secondary'}>
                    {r.reviewType === 'ehsaas' ? 'For Ehsaas' : `For ${r.therapistId?.name || 'therapist'}`}
                  </Badge>
                  <div className="flex">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`w-4 h-4 ${n <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-1">From: {r.clientId?.name} ({r.clientId?.email})</p>
                {r.comment && (
                  <div className="bg-muted/30 rounded p-3 mt-2">
                    <p className="text-sm flex gap-2"><MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0 text-muted-foreground" />{r.comment}</p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">{new Date(r.createdAt).toLocaleString('en-IN')}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="border-green-500 text-green-600 hover:bg-green-50" onClick={() => handleApprove(r._id)}>
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="border-red-500 text-red-600 hover:bg-red-50" onClick={() => handleReject(r._id)}>
                  <X className="w-4 h-4 mr-1" /> Reject
                </Button>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
