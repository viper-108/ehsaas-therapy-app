import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Check, CheckCheck, ChevronLeft, ChevronRight,
  Calendar, AlertTriangle, Star, Flag, Phone, IndianRupee, Users, MessageCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const TYPE_META: Record<string, { label: string; cls: string; icon: any }> = {
  session_reminder: { label: 'Reminder', cls: 'bg-blue-500/10 text-blue-600', icon: Calendar },
  no_show: { label: 'No-Show', cls: 'bg-orange-500/10 text-orange-600', icon: AlertTriangle },
  cancellation: { label: 'Cancellation', cls: 'bg-red-500/10 text-red-600', icon: AlertTriangle },
  booking: { label: 'Booking', cls: 'bg-green-500/10 text-green-600', icon: Calendar },
  review_pending: { label: 'Review', cls: 'bg-yellow-500/10 text-yellow-600', icon: Star },
  flag_alert: { label: 'Alert', cls: 'bg-red-600/10 text-red-700', icon: Flag },
  intro_call: { label: 'Intro Call', cls: 'bg-purple-500/10 text-purple-600', icon: Phone },
  payout: { label: 'Payout', cls: 'bg-emerald-500/10 text-emerald-600', icon: IndianRupee },
  price_negotiation: { label: 'Pricing', cls: 'bg-emerald-500/10 text-emerald-700', icon: IndianRupee },
  pricing_updated: { label: 'Pricing', cls: 'bg-emerald-500/10 text-emerald-700', icon: IndianRupee },
  group_added: { label: 'Group Chat', cls: 'bg-violet-500/10 text-violet-700', icon: Users },
  waitlist_open: { label: 'Slot Open', cls: 'bg-green-500/10 text-green-700', icon: Calendar },
  transfer: { label: 'Transfer', cls: 'bg-cyan-500/10 text-cyan-700', icon: Users },
  refund_requested: { label: 'Refund', cls: 'bg-amber-500/10 text-amber-700', icon: IndianRupee },
  approval_revoked: { label: 'Status Change', cls: 'bg-red-600/10 text-red-700', icon: AlertTriangle },
};

const typeBadge = (type: string) => {
  const v = TYPE_META[type] || { label: type || 'Notification', cls: 'bg-muted text-muted-foreground' };
  return <Badge variant="secondary" className={`${v.cls} text-xs`}>{v.label}</Badge>;
};

const typeIcon = (type: string) => {
  const v = TYPE_META[type];
  return v?.icon || Bell;
};

// Group notifications by recency
const groupByDate = (notifications: any[]) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, any[]> = { Today: [], Yesterday: [], 'This week': [], Earlier: [] };
  notifications.forEach(n => {
    const d = new Date(n.createdAt);
    if (d >= today) groups['Today'].push(n);
    else if (d >= yesterday) groups['Yesterday'].push(n);
    else if (d >= weekAgo) groups['This week'].push(n);
    else groups['Earlier'].push(n);
  });
  return groups;
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

  // Type-summary cards (top of page)
  const typeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    notifications.filter(n => !n.read).forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [notifications]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  if (isLoading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* HERO HEADER */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-background rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </div>
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-4xl font-bold text-foreground flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
                Notifications
              </h1>
              <p className="text-muted-foreground mt-2">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}.`
                  : "You're all caught up!"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="w-4 h-4 mr-1" /> Mark all read
              </Button>
            )}
          </div>

          {/* Type summary chips (only when there are unread items) */}
          {typeStats.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-5">
              {typeStats.map(([t, cnt]) => {
                const meta = TYPE_META[t] || { label: t, cls: 'bg-muted text-muted-foreground', icon: Bell };
                const Icon = meta.icon;
                return (
                  <div key={t} className={`p-3 rounded-lg ${meta.cls} flex items-center gap-3`}>
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-lg leading-none">{cnt}</p>
                      <p className="text-xs truncate">{meta.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FILTER TABS */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-3">
          <Tabs value={filter} onValueChange={(v: any) => setFilter(v)}>
            <TabsList>
              <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
              <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
              <TabsTrigger value="read">Read ({notifications.length - unreadCount})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {loading ? (
          <Card className="p-12 text-center"><p className="text-muted-foreground">Loading notifications...</p></Card>
        ) : filtered.length === 0 ? (
          <Card className="p-16 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-semibold text-foreground mb-1">
              {filter === 'all' ? 'No notifications' :
               filter === 'unread' ? "You're all caught up!" :
               "No read notifications"}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {filter === 'all' ? "When you book a session, get a reminder, or receive a message, it'll show up here." :
               filter === 'unread' ? "Great work! You've read everything." :
               "Notifications you've already read will appear here."}
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([groupName, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={groupName}>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{groupName}</h2>
                    <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {items.map((n: any) => {
                      const Icon = typeIcon(n.type);
                      return (
                        <Card
                          key={n._id}
                          onClick={() => handleClick(n)}
                          className={`p-4 cursor-pointer hover:shadow-md transition-all ${!n.read ? 'bg-primary/5 border-primary/30' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${!n.read ? 'bg-primary/20' : 'bg-muted'}`}>
                              <Icon className={`w-5 h-5 ${!n.read ? 'text-primary' : 'text-muted-foreground'}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {typeBadge(n.type)}
                                {!n.read && <div className="w-2 h-2 rounded-full bg-primary" />}
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {new Date(n.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
                      );
                    })}
                  </div>
                </div>
              );
            })}
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
