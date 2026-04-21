import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface Client {
  _id: string;
  name: string;
  email: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  resource: any | null;
  onShared: () => void;
}

export const ResourceShareDialog = ({ open, onClose, resource, onShared }: Props) => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && resource) {
      setSelected(new Set(resource.sharedWith || []));
      loadClients();
    }
  }, [open, resource]);

  const loadClients = async () => {
    try {
      // Get clients who have booked sessions with this therapist
      const data = await api.getTherapistClients();
      setClients(data || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load clients", variant: "destructive" });
    }
  };

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleSave = async () => {
    if (!resource) return;
    setLoading(true);
    try {
      await api.shareResource(resource._id, Array.from(selected));
      toast({ title: "Shared", description: `Resource shared with ${selected.size} client(s)` });
      onShared();
      onClose();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to share", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share "{resource?.title}" with clients</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
            {filtered.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                {clients.length === 0 ? "No clients found. Only clients who've booked with you appear here." : "No matches"}
              </div>
            ) : (
              filtered.map(c => (
                <label
                  key={c._id}
                  className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer"
                >
                  <Checkbox checked={selected.has(c._id)} onCheckedChange={() => toggle(c._id)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {selected.size} client(s) selected
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Share"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
