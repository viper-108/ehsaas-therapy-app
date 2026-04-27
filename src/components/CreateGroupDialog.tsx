import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateGroupDialog({ isOpen, onClose, onCreated }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    api.getTherapistClients?.()
      .then((d: any) => setClients(d || []))
      .catch(() => setClients([]))
      .finally(() => setLoading(false));
    setName(""); setDescription(""); setSelected(new Set());
  }, [isOpen]);

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) return toast({ title: "Group name required", variant: "destructive" });
    if (selected.size === 0) return toast({ title: "Select at least one client", variant: "destructive" });
    setSubmitting(true);
    try {
      await api.createChatGroup({ name: name.trim(), description, clientIds: Array.from(selected) });
      toast({ title: "Group created", description: `${selected.size} client${selected.size === 1 ? '' : 's'} added.` });
      onCreated?.();
      onClose();
    } catch (e: any) { toast({ title: "Error", description: e.message, variant: "destructive" }); }
    finally { setSubmitting(false); }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Create Group Chat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Group Name *</Label>
            <Input placeholder="e.g. Anxiety Support Group" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <Label>Description (optional)</Label>
            <Textarea rows={2} placeholder="Brief description shown to members" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <Label>Add Clients ({selected.size} selected)</Label>
            <ScrollArea className="h-48 border rounded p-2 mt-1">
              {loading ? (
                <p className="text-xs text-muted-foreground py-4 text-center">Loading clients...</p>
              ) : clients.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">No clients yet — book sessions first.</p>
              ) : (
                clients.map(c => (
                  <label key={c._id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/40 cursor-pointer">
                    <Checkbox checked={selected.has(c._id)} onCheckedChange={() => toggle(c._id)} />
                    <span className="text-sm">{c.name}</span>
                    {c.email && <span className="text-xs text-muted-foreground ml-auto">{c.email}</span>}
                  </label>
                ))
              )}
            </ScrollArea>
            <p className="text-xs text-muted-foreground mt-1">Only clients you have sessions with can be added.</p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={submitting || !name.trim() || selected.size === 0} className="flex-1">
              {submitting ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
