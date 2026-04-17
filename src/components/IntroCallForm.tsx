import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Phone, Mail, User, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface IntroCallFormProps {
  therapistId: string;
  therapistName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const IntroCallForm = ({ therapistId, therapistName, isOpen, onClose }: IntroCallFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientName: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    reasonForTherapy: '',
    whatLookingFor: '',
    preferredDateTime: '',
  });

  const handleSubmit = async () => {
    if (!form.clientName || !form.phone || !form.email || !form.reasonForTherapy || !form.whatLookingFor || !form.preferredDateTime) {
      toast({ title: "Error", description: "All fields are required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await api.requestIntroCall({ therapistId, ...form });
      toast({ title: "Request Sent!", description: `Your intro call request has been sent to ${therapistName}. They will respond within 24 hours.` });
      onClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Intro Call with {therapistName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Fill in the details below and the therapist will reach out to you for a brief introductory call.
          </p>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Full Name *</label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Your name" className="pl-10"
                value={form.clientName} onChange={e => setForm(p => ({ ...p, clientName: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Phone Number *</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="tel" placeholder="+91-XXXXXXXXXX" className="pl-10"
                value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="email" placeholder="your@email.com" className="pl-10"
                value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Reason for Therapy *</label>
            <Textarea placeholder="What brings you to therapy? What are you currently experiencing?"
              rows={3} value={form.reasonForTherapy}
              onChange={e => setForm(p => ({ ...p, reasonForTherapy: e.target.value }))} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">What are you looking for from therapy? *</label>
            <Textarea placeholder="What outcomes or support are you hoping for?"
              rows={3} value={form.whatLookingFor}
              onChange={e => setForm(p => ({ ...p, whatLookingFor: e.target.value }))} />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Preferred Date & Time *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input type="datetime-local" className="pl-10"
                min={new Date().toISOString().slice(0, 16)}
                value={form.preferredDateTime}
                onChange={e => setForm(p => ({ ...p, preferredDateTime: e.target.value }))} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
