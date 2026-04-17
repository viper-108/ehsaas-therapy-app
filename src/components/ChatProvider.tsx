import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

interface ChatContextType {
  socket: Socket | null;
  unreadCount: number;
  refreshUnread: () => void;
}

const ChatContext = createContext<ChatContextType>({
  socket: null,
  unreadCount: 0,
  refreshUnread: () => {},
});

export const useChat = () => useContext(ChatContext);

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || (import.meta.env.PROD ? '' : 'http://localhost:5001');

export const ChatProvider = ({ children }: { children: ReactNode }) => {
  const { token, user, role } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const refreshUnread = useCallback(() => {
    if (token && (role === 'client' || role === 'therapist')) {
      api.getUnreadCount()
        .then(data => setUnreadCount(data.count || 0))
        .catch(() => {});
    }
  }, [token, role]);

  useEffect(() => {
    if (!token || !user || role === 'admin') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('[SOCKET] Connected');
    });

    newSocket.on('new_message', () => {
      setUnreadCount(prev => prev + 1);
    });

    newSocket.on('connect_error', (err) => {
      console.log('[SOCKET] Connection error:', err.message);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
    refreshUnread();

    return () => {
      newSocket.disconnect();
    };
  }, [token, user, role]);

  return (
    <ChatContext.Provider value={{ socket, unreadCount, refreshUnread }}>
      {children}
    </ChatContext.Provider>
  );
};
