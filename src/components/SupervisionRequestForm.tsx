import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, User } from "lucide-react";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface SupervisionRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export const SupervisionRequestForm = ({ isOpen, onClose, onCreated }: SupervisionRequestFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [therapists, setTherapists] = useState<any[]>([]);
  const [type, setType] = useState<'individual' | 'group'>('individual');
  const [topic, setTopic] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    // Load available therapists (exclude self)
    api.getTherapists()
      .then(data => setTherapists(data.filter((t: any) => t._id !== user?._id)))
      .catch(() => {});
  }, [isOpen]);

  const toggleParticipant = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!topic.trim()) {
      toast({ title: "Error", description: "Topic is required", variant: "destructive" });
      return;
    }
    if (type === 'individual' && !supervisorId) {
      toast({ title: "Error", description: "Please select a supervisor", variant: "destructive" });
      return;
    }
    if (type === 'group' && selectedParticipants.length === 0) {
      toast({ title: "Error", description: "Please select at least one participant", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await api.createSupervision({
        type,
        topic,
        supervisorId: type === 'individual' ? supervisorId : undefined,
        participantIds: type === 'group' ? selectedParticipants : undefined,
        preferredDate: preferredDate || undefined,
        preferredTime: preferredTime || undefined,
      });
      toast({ title: "Request Sent", description: "Your supervision request has been sent to admin for approval." });
      onCreated?.();
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Supervision</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Supervision Type</label>
            <div className="flex gap-2">
              <Button
                variant={type === 'individual' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setType('individual')}
                className="flex-1"
              >
                <User className="w-4 h-4 mr-1" /> Individual
              </Button>
              <Button
                variant={type === 'group' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setType('group')}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-1" /> Group
              </Button>
            </div>
          </div>

          {/* Topic */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Topic *</label>
            <Textarea
              placeholder="What would you like to discuss in supervision?"
              rows={3}
              value={topic}
              onChange={e => setTopic(e.target.value)}
            />
          </div>

          {/* Supervisor (Individual) */}
          {type === 'individual' && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Select Supervisor *</label>
              <Select value={supervisorId} onValueChange={setSupervisorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a therapist..." />
                </SelectTrigger>
                <SelectContent>
                  {therapists.map(t => (
                    <SelectItem key={t._id} value={t._id}>{t.name} — {t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Participants (Group) */}
          {type === 'group' && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Invite Therapists *</label>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {therapists.map(t => (
                  <Badge
                    key={t._id}
                    variant={selectedParticipants.includes(t._id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleParticipant(t._id)}
                  >
                    {t.name}
                  </Badge>
                ))}
              </div>
              {selectedParticipants.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">{selectedParticipants.length} therapists selected</p>
              )}
            </div>
          )}

          {/* Preferred Date/Time (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Preferred Date</label>
              <Input type="date" value={preferredDate} onChange={e => setPreferredDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Preferred Time</label>
              <Input type="time" value={preferredTime} onChange={e => setPreferredTime(e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Note: All supervision sessions require admin approval before they can be scheduled.
          </p>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
