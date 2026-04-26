import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, CheckCheck, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const typeBadge = (type: string) => {
  const variants: Record<string, { label: string; cls: string }> = {
    session_reminder: { label: 'Reminder', cls: 'bg-blue-500/10 text-blue-600' },
    no_show: { label: 'No-Show', cls: 'bg-orange-500/10 text-orange-600' },
    cancellation: { label: 'Cancellation', cls: 'bg-red-500/10 text-red-600' },
    booking: { label: 'Booking', cls: 'bg-green-500/10 text-green-600' },
    review_pending: { label: 'Review', cls: 'bg-yellow-500/10 text-yellow-600' },
    flag_alert: { label: 'Alert', cls: 'bg-red-600/10 text-red-700' },
    intro_call: { label: 'Intro Call', cls: 'bg-purple-500/10 text-purple-600' },
    payout: { label: 'Payout', cls: 'bg-emerald-500/10 text-emerald-600' },
  };
  const v = variants[type] || { label: type || 'Notification', cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="secondary" className={`${v.cls} text-xs`}>{v.label}</Badge>;
};

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) navigate('/');
  }, [user, isLoading, navigate]);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const data = await api.getNotifications(p);
      setNotifications(data.notifications || []);
      setPage(data.page || 1);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { if (user) load(1); }, [user]);

  const handleClick = async (n: any) => {
    if (!n.read) {
      await api.markNotificationRead(n._id).catch(() => {});
      setNotifications(prev => prev.map(x => x._id === n._id ? { ...x, read: true } : x));
    }
    if (n.link) navigate(n.link);
  };

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(x => ({ ...x, read: true })));
    toast({ title: "All marked as read" });
  };

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read;
    if (filter === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" /> Notifications
          </h1>
          {unreadCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">{unreadCount} unread</Badge>
          )}
        </div>

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
            <TabsList>
              <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Read ({notifications.length - unreadCount})</TabsTrigger>
            </TabsList>
          </Tabs>

          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>

        {loading ? (
          <Card className="p-12 text-center"><p className="text-muted-foreground">Loading notifications...</p></Card>
        ) : filtered.length === 0 ? (
          <Card className="p-16 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No notifications</h3>
            <p className="text-sm text-muted-foreground">
              {filter === 'all' ? "You don't have any notifications yet." :
               filter === 'unread' ? "You're all caught up!" :
               "No read notifications to show."}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map(n => (
              <Card
                key={n._id}
                onClick={() => handleClick(n)}
                className={`p-4 cursor-pointer hover:shadow-md transition-all ${!n.read ? 'bg-primary/5 border-primary/30' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-primary/20' : 'bg-muted'}`}>
                    <Bell className={`w-5 h-5 ${!n.read ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {typeBadge(n.type)}
                      {!n.read && <div className="w-2 h-2 rounded-full bg-primary" />}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {new Date(n.createdAt).toLocaleString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-sm ${!n.read ? 'font-semibold text-foreground' : 'text-foreground/90'}`}>{n.title}</p>
                    {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                    {n.link && (
                      <p className="text-xs text-primary mt-2 flex items-center gap-1">
                        Click to view <ChevronRight className="w-3 h-3" />
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button variant="outline" size="sm" onClick={() => load(page - 1)} disabled={page <= 1}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <span className="text-sm text-muted-foreground">Page {page} of {pages} • {total} total</span>
            <Button variant="outline" size="sm" onClick={() => load(page + 1)} disabled={page >= pages}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
