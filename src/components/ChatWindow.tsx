import { useState, useEffect, useRef } from "react";
import { Send, Loader2, ArrowLeft, Ban, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/components/ChatProvider";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface ChatWindowProps {
  conversationKey: string;
  otherUser: { _id: string; name: string; title?: string; role?: string } | null;
  onBack?: () => void;
}

export const ChatWindow = ({ conversationKey, otherUser, onBack }: ChatWindowProps) => {
  const { user } = useAuth();
  const { socket, refreshUnread } = useChat();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [blockStatus, setBlockStatus] = useState<{ iBlockedThem: boolean; theyBlockedMe: boolean; isBlocked: boolean }>({ iBlockedThem: false, theyBlockedMe: false, isBlocked: false });
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blocking, setBlocking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationKey || !otherUser) return;
    setLoading(true);
    api.getMessages(conversationKey)
      .then(data => { setMessages(data); })
      .catch(() => {})
      .finally(() => setLoading(false));

    // Mark as read
    api.markMessagesRead(conversationKey).then(() => refreshUnread()).catch(() => {});

    // Check block status
    api.checkBlockStatus(otherUser._id)
      .then(status => setBlockStatus(status))
      .catch(() => {});

    // Join socket room
    if (socket) {
      socket.emit('join_conversation', conversationKey);
    }
  }, [conversationKey, otherUser?._id, socket]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;
    const handler = (msg: any) => {
      if (msg.conversationKey === conversationKey) {
        setMessages(prev => [...prev, msg]);
        api.markMessagesRead(conversationKey).then(() => refreshUnread()).catch(() => {});
      }
    };
    socket.on('new_message', handler);
    return () => { socket.off('new_message', handler); };
  }, [socket, conversationKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !otherUser || blockStatus.isBlocked) return;
    setSending(true);
    try {
      const msg = await api.sendMessage(otherUser._id, input.trim());
      setMessages(prev => [...prev, msg]);
      setInput('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to send message", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBlock = async () => {
    if (!otherUser) return;
    setBlocking(true);
    try {
      await api.blockUser(otherUser._id, blockReason);
      setBlockStatus({ iBlockedThem: true, theyBlockedMe: false, isBlocked: true });
      setShowBlockDialog(false);
      setBlockReason('');
      toast({ title: "Blocked", description: `${otherUser.name} has been blocked` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setBlocking(false);
    }
  };

  const handleUnblock = async () => {
    if (!otherUser) return;
    try {
      await api.unblockUser(otherUser._id);
      setBlockStatus({ iBlockedThem: false, theyBlockedMe: false, isBlocked: false });
      toast({ title: "Unblocked", description: `${otherUser.name} has been unblocked` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (!conversationKey || !otherUser) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a conversation to start messaging</p>
      </div>
    );
  }

  const canSend = !blockStatus.isBlocked;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="p-3 border-b flex items-center gap-3">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        )}
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
          {otherUser.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{otherUser.name}</p>
          {otherUser.title && <p className="text-xs text-muted-foreground">{otherUser.title}</p>}
        </div>

        {/* Block / Unblock button */}
        {blockStatus.iBlockedThem ? (
          <Button variant="outline" size="sm" onClick={handleUnblock} className="text-xs flex-shrink-0">
            <ShieldCheck className="w-3 h-3 mr-1" /> Unblock
          </Button>
        ) : !blockStatus.theyBlockedMe && (
          <Button variant="ghost" size="sm" onClick={() => setShowBlockDialog(true)} className="text-xs text-destructive hover:text-destructive flex-shrink-0">
            <Ban className="w-3 h-3 mr-1" /> Block
          </Button>
        )}
      </div>

      {/* Block banner */}
      {blockStatus.isBlocked && (
        <div className="px-4 py-3 bg-destructive/5 border-b text-center">
          {blockStatus.iBlockedThem ? (
            <p className="text-sm text-destructive">
              You blocked {otherUser.name}.{' '}
              <button onClick={handleUnblock} className="underline font-medium">Unblock</button>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              You cannot message this user.
            </p>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === user?._id;
            return (
              <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${isMe ? 'bg-primary text-white' : 'bg-muted text-foreground'}`}>
                  <p>{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-white/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t">
        {canSend ? (
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <Button onClick={handleSend} disabled={sending || !input.trim()} size="icon">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-1">Messaging is not available</p>
        )}
      </div>

      {/* Block Confirmation Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Block {otherUser.name}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Blocking will prevent both of you from sending messages to each other.
            </p>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Reason (optional)</label>
              <Textarea
                placeholder="You can provide a reason..."
                rows={2}
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowBlockDialog(false); setBlockReason(''); }}>
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleBlock} disabled={blocking}>
                {blocking ? 'Blocking...' : 'Block User'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
