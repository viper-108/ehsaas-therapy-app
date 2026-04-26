import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadCount = async () => {
    try {
      const data = await api.getNotificationCount();
      setCount(data.count);
    } catch {}
  };

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await api.getNotifications(1);
      setNotifications(data.notifications || []);
    } catch {}
    finally { setLoading(false); }
  };

  const toggle = () => {
    if (!isOpen) loadNotifications();
    setIsOpen(!isOpen);
  };

  const markRead = async (id: string) => {
    await api.markNotificationRead(id).catch(() => {});
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
    setCount(prev => Math.max(0, prev - 1));
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead().catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setCount(0);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <Button variant="ghost" size="icon" onClick={toggle} className="w-9 h-9 relative">
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-xs rounded-full flex items-center justify-center">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-10 w-80 bg-card border rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm text-foreground">Notifications</h3>
            {count > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="overflow-y-auto max-h-72">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No notifications</p>
            ) : (
              notifications.slice(0, 10).map(n => (
                <div
                  key={n._id}
                  onClick={() => {
                    if (!n.read) markRead(n._id);
                    setIsOpen(false);
                    if (n.link) navigate(n.link);
                    else navigate('/notifications');
                  }}
                  className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                  </div>
                </div>
              ))
            )}
          </div>
          <button
            onClick={() => { setIsOpen(false); navigate('/notifications'); }}
            className="w-full p-3 border-t text-sm font-medium text-primary hover:bg-muted/40 transition-colors flex items-center justify-center gap-1"
          >
            View all notifications <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
