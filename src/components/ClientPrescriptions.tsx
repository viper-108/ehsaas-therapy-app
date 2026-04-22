import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pill } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

export const ClientPrescriptions = () => {
  const { toast } = useToast();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getClientPrescriptions();
        setPrescriptions(data || []);
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">My Prescriptions</h2>
        <p className="text-sm text-muted-foreground">Prescriptions issued by your psychiatrist</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No prescriptions yet</h3>
            <p className="text-sm text-muted-foreground">
              Prescriptions from your psychiatrist will appear here. Note: Only psychiatrists (not psychologists) can issue prescriptions.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((p) => (
            <Card key={p._id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                  <div>
                    <p className="font-semibold">Dr. {p.psychiatristId?.name || 'Psychiatrist'}</p>
                    <p className="text-xs text-muted-foreground">{p.psychiatristId?.title || 'Psychiatrist'}</p>
                    <p className="text-xs text-muted-foreground">Issued {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  {p.followUpDate && (
                    <Badge variant="outline" className="text-xs">
                      Follow-up: {new Date(p.followUpDate).toLocaleDateString('en-IN')}
                    </Badge>
                  )}
                </div>
                {p.diagnosis && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Diagnosis</p>
                    <p className="text-sm">{p.diagnosis}</p>
                  </div>
                )}
                {p.medications?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Medications</p>
                    <div className="space-y-2">
                      {p.medications.map((m: any, i: number) => (
                        <div key={i} className="p-3 bg-muted rounded-md">
                          <p className="font-semibold">{m.name} {m.dosage && <span className="text-muted-foreground">— {m.dosage}</span>}</p>
                          <div className="text-sm text-muted-foreground mt-1 space-x-3">
                            {m.frequency && <span><strong>Frequency:</strong> {m.frequency}</span>}
                            {m.duration && <span><strong>Duration:</strong> {m.duration}</span>}
                          </div>
                          {m.notes && <p className="text-sm text-muted-foreground italic mt-1">{m.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {p.advice && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Advice</p>
                    <p className="text-sm whitespace-pre-wrap">{p.advice}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
