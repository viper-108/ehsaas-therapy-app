import { useState, useEffect } from "react";
import { MessageCircle, Loader2, UserPlus, Ban, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";
import { CreateGroupDialog } from "@/components/CreateGroupDialog";

interface ConversationListProps {
  onSelectConversation: (conversationKey: string, otherUser: any) => void;
  selectedKey?: string;
}

export const ConversationList = ({ onSelectConversation, selectedKey }: ConversationListProps) => {
  const { user, role } = useAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContacts, setShowContacts] = useState(false);
  const [groups, setGroups] = useState<any[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  const loadGroups = async () => {
    try { const d = await api.getMyChatGroups(); setGroups(d || []); } catch {}
  };
  useEffect(() => { loadGroups(); }, []);

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // When user opens the "New Chat" tab, fetch the full directory (all therapists, peers, admin)
  useEffect(() => {
    if (showContacts) loadContacts('all');
  }, [showContacts]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations();
      setConversations(data);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async (scope: 'all' | 'sessions' = 'sessions') => {
    try {
      const data = await api.getContacts(scope);
      setContacts(data);
    } catch {}
  };

  const startConversation = (contact: any) => {
    const key = [user?._id, contact._id].sort().join('_');
    onSelectConversation(key, {
      _id: contact._id,
      name: contact.name,
      title: contact.title,
      role: contact.role,
    });
    setShowContacts(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  // Contacts that don't already have conversations
  const existingOtherIds = new Set(conversations.map(c => c.otherUser?._id));
  const newContacts = contacts.filter(c => !existingOtherIds.has(c._id) && !c.isBlocked);

  return (
    <div className="space-y-2">
      {/* Toggle: Chats / New Chat */}
      <div className="flex gap-1 mb-2">
        <Button
          variant={!showContacts ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs h-8"
          onClick={() => setShowContacts(false)}
        >
          <MessageCircle className="w-3 h-3 mr-1" /> Chats
        </Button>
        <Button
          variant={showContacts ? "default" : "outline"}
          size="sm"
          className="flex-1 text-xs h-8"
          onClick={() => setShowContacts(true)}
        >
          <UserPlus className="w-3 h-3 mr-1" /> New Chat
        </Button>
      </div>

      {/* Therapist-only: Create Group button */}
      {role === 'therapist' && (
        <Button variant="outline" size="sm" className="w-full text-xs h-8 mb-1" onClick={() => setShowCreateGroup(true)}>
          <Users className="w-3 h-3 mr-1" /> Create Group Chat
        </Button>
      )}

      {/* Group chats list */}
      {!showContacts && groups.length > 0 && (
        <div className="space-y-1 pb-2 border-b mb-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 mt-1">Groups</p>
          {groups.map(g => {
            const key = `group_${g._id}`;
            const isSelected = selectedKey === key;
            return (
              <Card
                key={g._id}
                className={`p-2 cursor-pointer transition-colors ${isSelected ? 'bg-primary/10 border-primary/30' : 'hover:bg-muted/40'}`}
                onClick={() => onSelectConversation(key, { _id: g._id, name: g.name, role: 'group', isGroup: true, members: g.members })}
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center"><Users className="w-3.5 h-3.5 text-primary" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.members.length} members</p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <CreateGroupDialog isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} onCreated={loadGroups} />

      {showContacts ? (
        /* ===== CONTACTS (full directory) ===== */
        <div>
          <p className="text-xs text-muted-foreground px-1 mb-2">
            Start a chat with any therapist, your clients, or Ehsaas support:
          </p>

          {contacts.filter(c => !c.isBlocked).length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No contacts yet</p>
              <p className="text-xs text-muted-foreground">Book a session to start messaging</p>
            </div>
          ) : (
            <>
              {/* New contacts (no existing conversation) */}
              {newContacts.map(contact => (
                <button
                  key={contact._id}
                  onClick={() => startConversation(contact)}
                  className="w-full p-3 rounded-lg text-left hover:bg-muted/50 transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary flex-shrink-0">
                    {contact.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {contact.title || contact.email || contact.role}
                    </p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-primary flex-shrink-0" />
                </button>
              ))}

              {/* Contacts with existing conversations */}
              {contacts.filter(c => existingOtherIds.has(c._id) && !c.isBlocked).length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground px-1 mt-3 mb-1">Already chatting:</p>
                  {contacts.filter(c => existingOtherIds.has(c._id) && !c.isBlocked).map(contact => (
                    <button
                      key={contact._id}
                      onClick={() => startConversation(contact)}
                      className="w-full p-2 rounded-lg text-left hover:bg-muted/30 transition-colors flex items-center gap-3 opacity-60"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground flex-shrink-0">
                        {contact.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{contact.name}</p>
                    </button>
                  ))}
                </>
              )}
            </>
          )}

          {/* Blocked users */}
          {contacts.filter(c => c.iBlockedThem).length > 0 && (
            <>
              <p className="text-xs text-muted-foreground px-1 mt-4 mb-1 flex items-center gap-1">
                <Ban className="w-3 h-3" /> Blocked:
              </p>
              {contacts.filter(c => c.iBlockedThem).map(contact => (
                <div key={contact._id} className="w-full p-2 rounded-lg flex items-center gap-3 opacity-40">
                  <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center text-xs flex-shrink-0">
                    <Ban className="w-3 h-3 text-destructive" />
                  </div>
                  <p className="text-sm text-muted-foreground truncate flex-1">{contact.name}</p>
                  <Badge variant="destructive" className="text-xs">Blocked</Badge>
                </div>
              ))}
            </>
          )}
        </div>
      ) : (
        /* ===== EXISTING CONVERSATIONS ===== */
        <>
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mb-3">Messages will appear here</p>
              <Button variant="outline" size="sm" onClick={() => setShowContacts(true)}>
                <UserPlus className="w-3 h-3 mr-1" /> Start a Chat
              </Button>
            </div>
          ) : (
            conversations.map(conv => (
              <Card
                key={conv.conversationKey}
                className={`p-3 transition-colors flex items-center gap-3 ${
                  conv.isBlocked
                    ? 'opacity-40 cursor-not-allowed'
                    : `cursor-pointer hover:bg-muted/50 ${selectedKey === conv.conversationKey ? 'bg-primary/5 border-primary/20' : ''}`
                }`}
                onClick={() => !conv.isBlocked && onSelectConversation(conv.conversationKey, conv.otherUser)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  conv.isBlocked ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
                }`}>
                  {conv.isBlocked ? (
                    <Ban className="w-4 h-4" />
                  ) : (
                    conv.otherUser?.name?.split(' ').map((n: string) => n[0]).join('') || '?'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground text-sm truncate">{conv.otherUser?.name || 'Unknown'}</p>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {conv.lastMessageAt ? new Date(conv.lastMessageAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.isBlocked ? 'Blocked' : conv.lastMessage}
                    </p>
                    {conv.unreadCount > 0 && !conv.isBlocked && (
                      <Badge className="bg-primary text-white text-xs ml-2 flex-shrink-0">{conv.unreadCount}</Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
};
