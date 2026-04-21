import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Video, BookOpen, Activity, Link as LinkIcon, Plus, Edit, Trash2, Share2, Globe, Lock, Users } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { ResourceShareDialog } from "./ResourceShareDialog";

const RESOURCE_TYPES = [
  { value: 'article', label: 'Article', icon: BookOpen },
  { value: 'worksheet', label: 'Worksheet', icon: FileText },
  { value: 'exercise', label: 'Exercise', icon: Activity },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'other', label: 'Other', icon: LinkIcon },
];

const iconFor = (type: string) => {
  const match = RESOURCE_TYPES.find(t => t.value === type);
  return match ? match.icon : LinkIcon;
};

export const TherapistResources = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharingResource, setSharingResource] = useState<any | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'article',
    content: '',
    fileUrl: '',
    isPublic: false,
    tags: '',
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.getMyResources();
      setResources(data || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setEditing(null);
    setForm({ title: '', description: '', type: 'article', content: '', fileUrl: '', isPublic: false, tags: '' });
    setEditOpen(true);
  };

  const openEdit = (r: any) => {
    setEditing(r);
    setForm({
      title: r.title || '',
      description: r.description || '',
      type: r.type || 'article',
      content: r.content || '',
      fileUrl: r.fileUrl || '',
      isPublic: r.isPublic || false,
      tags: (r.tags || []).join(', '),
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Error", description: "Title is required", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };
    try {
      if (editing) {
        await api.updateResource(editing._id, payload);
        toast({ title: "Updated", description: "Resource updated" });
      } else {
        await api.createResource(payload);
        toast({ title: "Created", description: "Resource added" });
      }
      setEditOpen(false);
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resource? This cannot be undone.")) return;
    try {
      await api.deleteResource(id);
      toast({ title: "Deleted", description: "Resource removed" });
      load();
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to delete", variant: "destructive" });
    }
  };

  const openShare = (r: any) => {
    setSharingResource(r);
    setShareOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Resources</h2>
          <p className="text-sm text-muted-foreground">Create and share articles, worksheets, videos with your clients</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Resource
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : resources.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No resources yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create articles, worksheets, exercises, or videos to share with your clients.
            </p>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" /> Create Your First Resource
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((r) => {
            const Icon = iconFor(r.type);
            return (
              <Card key={r._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{r.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">{r.type}</Badge>
                        {r.isPublic ? (
                          <Badge variant="secondary" className="text-xs"><Globe className="w-3 h-3 mr-1" />Public</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs"><Lock className="w-3 h-3 mr-1" />Private</Badge>
                        )}
                        {(r.sharedWith?.length > 0) && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />{r.sharedWith.length} shared
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {r.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{r.description}</p>
                  )}
                  {r.fileUrl && (
                    <a href={r.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline block mb-3 truncate">
                      <LinkIcon className="w-3 h-3 inline mr-1" />{r.fileUrl}
                    </a>
                  )}
                  {r.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {r.tags.map((tag: string, i: number) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded">#{tag}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => openShare(r)} className="flex-1">
                      <Share2 className="w-3 h-3 mr-1" /> Share
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(r._id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Resource' : 'New Resource'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. CBT Thought Record Worksheet"
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of this resource"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="fileUrl">File / Link URL</Label>
              <Input
                id="fileUrl"
                value={form.fileUrl}
                onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                placeholder="https://..."
              />
              <p className="text-xs text-muted-foreground mt-1">Paste a link to a PDF, YouTube video, Google Doc, etc.</p>
            </div>
            <div>
              <Label htmlFor="content">Content (optional)</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write the content directly here (e.g. grounding exercise instructions)"
                rows={4}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="anxiety, grounding, breathing"
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-md">
              <div>
                <Label htmlFor="isPublic" className="cursor-pointer">Make Public</Label>
                <p className="text-xs text-muted-foreground">Anyone can view this in the resource library</p>
              </div>
              <Switch
                id="isPublic"
                checked={form.isPublic}
                onCheckedChange={(v) => setForm({ ...form, isPublic: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <ResourceShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        resource={sharingResource}
        onShared={load}
      />
    </div>
  );
};
