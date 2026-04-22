import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pill, Plus, Trash2, Edit, FileText } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const emptyMed = () => ({ name: '', dosage: '', frequency: '', duration: '', notes: '' });

export const PsychiatristPrescriptions = () => {
  const { toast } = useToast();
  const [clients, setClients] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({
    clientId: '',
    diagnosis: '',
    advice: '',
    followUpDate: '',
    medications: [emptyMed()],
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([
        api.getTherapistClients().catch(() => []),
        api.getMyPrescriptions().catch(() => []),
      ]);
      setClients(c || []);
      setPrescriptions(p || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ clientId: '', diagnosis: '', advice: '', followUpDate: '', medications: [emptyMed()] });
    setOpen(true);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      clientId: p.clientId?._id || p.clientId || '',
      diagnosis: p.diagnosis || '',
      advice: p.advice || '',
      followUpDate: p.followUpDate ? new Date(p.followUpDate).toISOString().slice(0, 10) : '',
      medications: p.medications?.length > 0 ? p.medications : [emptyMed()],
    });
    setOpen(true);
  };

  const addMed = () => setForm({ ...form, medications: [...form.medications, emptyMed()] });
  const removeMed = (i: number) => setForm({ ...form, medications: form.medications.filter((_, idx) => idx !== i) });
  const updateMed = (i: number, field: string, value: string) => {
    const meds = [...form.medications];
    meds[i] = { ...meds[i], [field]: value };
    setForm({ ...form, medications: meds });
  };

  const save = async () => {
    if (!form.clientId) {
      toast({ title: "Error", description: "Select a client", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      medications: form.medications.filter(m => m.name.trim()),
      followUpDate: form.followUpDate || null,
    };
    try {
      if (editing) {
        await api.updatePrescription(editing._id, payload);
        toast({ title: "Updated", description: "Prescription updated" });
      } else {
        await api.createPrescription(payload);
        toast({ title: "Created", description: "Prescription created" });
      }
      setOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const del = async (id: string) => {
    if (!confirm("Delete this prescription?")) return;
    try {
      await api.deletePrescription(id);
      toast({ title: "Deleted" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Prescriptions</h2>
          <p className="text-sm text-muted-foreground">Write and manage prescriptions for your clients</p>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Prescription</Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : prescriptions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Pill className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No prescriptions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Create your first prescription for a client.</p>
            <Button onClick={openNew}><Plus className="w-4 h-4 mr-2" /> New Prescription</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((p) => (
            <Card key={p._id}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3 gap-3 flex-wrap">
                  <div>
                    <p className="font-semibold">{p.clientId?.name || 'Unknown client'}</p>
                    <p className="text-xs text-muted-foreground">{p.clientId?.email}</p>
                    <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Edit className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="text-destructive" onClick={() => del(p._id)}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                {p.diagnosis && <div className="mb-2"><strong className="text-sm">Diagnosis:</strong> <span className="text-sm">{p.diagnosis}</span></div>}
                {p.medications?.length > 0 && (
                  <div className="mt-2">
                    <strong className="text-sm block mb-1">Medications:</strong>
                    <ul className="space-y-1 pl-4 list-disc text-sm">
                      {p.medications.map((m: any, i: number) => (
                        <li key={i}>
                          <span className="font-medium">{m.name}</span>
                          {m.dosage && ` — ${m.dosage}`}
                          {m.frequency && ` · ${m.frequency}`}
                          {m.duration && ` · ${m.duration}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {p.advice && <div className="mt-2"><strong className="text-sm">Advice:</strong> <span className="text-sm whitespace-pre-wrap">{p.advice}</span></div>}
                {p.followUpDate && <div className="mt-2 text-sm text-muted-foreground">Follow-up: {new Date(p.followUpDate).toLocaleDateString('en-IN')}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit' : 'New'} Prescription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Client *</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger><SelectValue placeholder="Select a client..." /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.name} ({c.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Diagnosis</Label>
              <Textarea value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} rows={2} />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <Label>Medications</Label>
                <Button type="button" size="sm" variant="outline" onClick={addMed}><Plus className="w-3 h-3 mr-1" /> Add</Button>
              </div>
              <div className="space-y-3">
                {form.medications.map((m, i) => (
                  <div key={i} className="border rounded-md p-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Med #{i + 1}</span>
                      {form.medications.length > 1 && (
                        <Button type="button" size="sm" variant="ghost" onClick={() => removeMed(i)}><Trash2 className="w-3 h-3" /></Button>
                      )}
                    </div>
                    <Input placeholder="Medicine name" value={m.name} onChange={(e) => updateMed(i, 'name', e.target.value)} />
                    <div className="grid grid-cols-3 gap-2">
                      <Input placeholder="Dosage (10mg)" value={m.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)} />
                      <Input placeholder="Frequency (2x/day)" value={m.frequency} onChange={(e) => updateMed(i, 'frequency', e.target.value)} />
                      <Input placeholder="Duration (30 days)" value={m.duration} onChange={(e) => updateMed(i, 'duration', e.target.value)} />
                    </div>
                    <Input placeholder="Notes (take with food)" value={m.notes} onChange={(e) => updateMed(i, 'notes', e.target.value)} />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Advice / Instructions</Label>
              <Textarea value={form.advice} onChange={(e) => setForm({ ...form, advice: e.target.value })} rows={3} />
            </div>
            <div>
              <Label>Follow-up Date</Label>
              <Input type="date" value={form.followUpDate} onChange={(e) => setForm({ ...form, followUpDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
