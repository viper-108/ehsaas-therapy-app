import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Video, BookOpen, Activity, Link as LinkIcon, Globe, Sparkles } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

const iconFor = (type: string) => {
  const map: Record<string, any> = {
    article: BookOpen,
    worksheet: FileText,
    exercise: Activity,
    video: Video,
    other: LinkIcon,
  };
  return map[type] || LinkIcon;
};

const ResourceCard = ({ r, showTherapist }: { r: any; showTherapist?: boolean }) => {
  const Icon = iconFor(r.type);
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold">{r.title}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline" className="text-xs capitalize">{r.type}</Badge>
              {r.isPublic && (
                <Badge variant="secondary" className="text-xs">
                  <Globe className="w-3 h-3 mr-1" />Public
                </Badge>
              )}
            </div>
            {showTherapist && r.therapistId && (
              <p className="text-xs text-muted-foreground mt-1">
                by {r.therapistId.name}
                {r.therapistId.title && ` · ${r.therapistId.title}`}
              </p>
            )}
          </div>
        </div>
        {r.description && (
          <p className="text-sm text-muted-foreground mb-3">{r.description}</p>
        )}
        {r.content && (
          <div className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md mb-3 max-h-40 overflow-y-auto">
            {r.content}
          </div>
        )}
        {r.fileUrl && (
          <a
            href={r.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-medium"
          >
            <LinkIcon className="w-4 h-4" /> Open resource
          </a>
        )}
        {r.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {r.tags.map((tag: string, i: number) => (
              <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded">#{tag}</span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const ClientResources = () => {
  const { toast } = useToast();
  const [shared, setShared] = useState<any[]>([]);
  const [publicRes, setPublicRes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, p] = await Promise.all([
        api.getSharedResources('assigned').catch(() => []),
        api.getSharedResources('public').catch(() => []),
      ]);
      setShared(s || []);
      setPublicRes(p || []);
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load resources", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Resources</h2>
        <p className="text-sm text-muted-foreground">
          Articles, worksheets, and exercises shared by therapists
        </p>
      </div>

      <Tabs defaultValue="shared">
        <TabsList>
          <TabsTrigger value="shared">
            <Sparkles className="w-4 h-4 mr-2" />
            Shared With Me {shared.length > 0 && <Badge variant="secondary" className="ml-2">{shared.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="public">
            <Globe className="w-4 h-4 mr-2" />
            Public Library {publicRes.length > 0 && <Badge variant="secondary" className="ml-2">{publicRes.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shared" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : shared.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No resources shared yet</h3>
                <p className="text-sm text-muted-foreground">
                  Your therapist hasn't shared any resources with you yet. Check back after your next session, or browse the public library.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {shared.map((r) => (
                <ResourceCard key={r._id} r={r} showTherapist />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="public" className="mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : publicRes.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Globe className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Public library is empty</h3>
                <p className="text-sm text-muted-foreground">
                  No public resources are available yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {publicRes.map((r) => (
                <ResourceCard key={r._id} r={r} showTherapist />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
