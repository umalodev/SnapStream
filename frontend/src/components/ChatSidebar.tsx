import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isAdmin?: boolean;
}

interface ChatSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  streamId: string;
  socket: Socket | null;
  currentUsername?: string;
  isAdmin?: boolean;
  readOnly?: boolean;
  onNewMessage?: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({ 
  isOpen, 
  onToggle, 
  streamId, 
  socket, 
  currentUsername = 'Pengunjung', 
  isAdmin = false,
  readOnly = false,
  onNewMessage
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set());

  // Auto scroll to bottom when new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Listen for chat messages - Keep listening even when sidebar is closed for real-time updates
  useEffect(() => {
    if (!socket || !streamId) return;

    const handleChatMessage = (data: ChatMessage) => {
      if (data.id && data.message) {
        // Prevent duplicate messages by checking processed IDs
        if (processedMessageIds.current.has(data.id)) {
          console.log(`[ChatSidebar] Duplicate message ignored: ${data.id}`);
          return;
        }
        
        processedMessageIds.current.add(data.id);
        
        setMessages(prev => {
          // Double check to prevent duplicates in state
          const exists = prev.some(msg => msg.id === data.id);
          if (exists) return prev;
          console.log(`[ChatSidebar] New message received: ${data.username}: ${data.message}`);
          return [...prev, data];
        });
        
        // Notify parent component about new message
        if (onNewMessage && (!isOpen || data.username !== currentUsername)) {
          onNewMessage();
        }
      }
    };

    const handleConnect = () => {
      setIsConnected(true);
      // Join chat room
      console.log(`[ChatSidebar] Connecting to chat room: ${streamId} as ${currentUsername} (Admin: ${isAdmin})`);
      socket.emit('joinChatRoom', { roomId: streamId, username: currentUsername, isAdmin });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      console.log(`[ChatSidebar] Disconnected from room: ${streamId}`);
    };

    // Remove old listeners to prevent duplicates
    socket.off('connect', handleConnect);
    socket.off('disconnect', handleDisconnect);
    socket.off('chatMessage', handleChatMessage);

    // Add new listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chatMessage', handleChatMessage);

    // Join chat room immediately if connected
    if (socket.connected) {
      console.log(`[ChatSidebar] Already connected, joining room: ${streamId} as ${currentUsername} (Admin: ${isAdmin})`);
      socket.emit('joinChatRoom', { roomId: streamId, username: currentUsername, isAdmin });
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chatMessage', handleChatMessage);
    };
  }, [socket, streamId, currentUsername, isAdmin]); // Removed isOpen dependency to keep listening

  // Reset processed IDs when streamId changes
  useEffect(() => {
    processedMessageIds.current.clear();
    setMessages([]);
  }, [streamId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !isConnected || readOnly) return;

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const messageData: ChatMessage = {
      id: messageId,
      username: currentUsername,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isAdmin
    };

    // Mark as processed to prevent duplicate when broadcasted back
    processedMessageIds.current.add(messageId);

    // Optimistic update: Add message immediately to local state
    setMessages(prev => {
      const exists = prev.some(msg => msg.id === messageId);
      if (exists) return prev;
      return [...prev, messageData];
    });

    console.log(`[ChatSidebar] Sending message to room ${streamId}:`, messageData);
    socket.emit('sendChatMessage', {
      roomId: streamId,
      ...messageData
    });

    setNewMessage('');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      {/* Chat Sidebar - YouTube Style */}
      <div style={{
        position: 'fixed',
        right: isOpen ? '0' : '-400px',
        top: '56px',
        bottom: '0',
        width: '400px',
        background: '#ffffff',
        boxShadow: isOpen ? '-2px 0 8px rgba(0, 0, 0, 0.1)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 999,
        fontFamily: '"Roboto", "Arial", sans-serif',
        borderLeft: isOpen ? '1px solid #e5e5e5' : 'none',
        overflow: 'hidden'
      }}>
        {/* Sidebar Header - YouTube Style */}
        <div style={{
          background: '#ffffff',
          padding: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e5e5',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: isConnected ? '#22c55e' : '#ef4444',
              animation: isConnected ? 'pulse 2s infinite' : 'none'
            }} />
            <h3 style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 500,
              color: '#0f0f0f'
            }}>
              Live Chat
            </h3>
            {messages.length > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#ffffff',
                borderRadius: '12px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                {messages.length}
              </span>
            )}
          </div>
          <button
            onClick={onToggle}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#1e293b',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Chat Messages - YouTube Style */}
        <div
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            background: '#ffffff',
            minHeight: 0
          }}
        >
          {messages.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#64748b',
              fontSize: '14px',
              padding: '40px 20px'
            }}>
              Belum ada pesan. {readOnly ? 'Admin akan melihat komentar di sini.' : 'Mulai obrolan!'}
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  marginBottom: '16px',
                  padding: '12px 0',
                  borderBottom: '1px solid #f2f2f2',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f9f9f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: msg.isAdmin 
                      ? 'linear-gradient(135deg, #2563EB 0%, #1d4ed8 100%)'
                      : msg.username === currentUsername
                      ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 500,
                    flexShrink: 0
                  }}>
                    {msg.isAdmin ? '👑' : msg.username.charAt(0).toUpperCase()}
                  </div>
                  
                  {/* Message Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{
                        fontWeight: 500,
                        fontSize: '13px',
                        color: '#0f0f0f'
                      }}>
                        {msg.isAdmin ? '👑 ' : ''}{msg.username}
                        {msg.username === currentUsername && !msg.isAdmin && (
                          <span style={{ fontSize: '12px', color: '#606060', fontWeight: 400, marginLeft: '4px' }}>(Anda)</span>
                        )}
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: '#606060'
                      }}>
                        {formatTime(msg.timestamp)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#0f0f0f',
                      lineHeight: '20px',
                      wordBreak: 'break-word'
                    }}>
                      {msg.message}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input - YouTube Style */}
        {!readOnly && (
          <form onSubmit={handleSendMessage} style={{
            padding: '16px',
            background: '#ffffff',
            borderTop: '1px solid #e5e5e5',
            display: 'flex',
            gap: '8px',
            position: 'sticky',
            bottom: 0,
            zIndex: 10
          }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ketik pesan..."
              disabled={!isConnected}
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #e5e5e5',
                borderRadius: '18px',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'all 0.2s ease',
                background: '#ffffff'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#065fd4';
                e.target.style.boxShadow = '0 0 0 1px #065fd4';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e5e5';
                e.target.style.boxShadow = 'none';
              }}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              style={{
                padding: '10px 16px',
                background: isConnected && newMessage.trim() 
                  ? '#065fd4' 
                  : '#e5e5e5',
                color: isConnected && newMessage.trim() ? '#ffffff' : '#9ca3af',
                border: 'none',
                borderRadius: '18px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isConnected && newMessage.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                fontFamily: 'inherit'
              }}
              onMouseOver={(e) => {
                if (isConnected && newMessage.trim()) {
                  e.currentTarget.style.background = '#0550ae';
                }
              }}
              onMouseOut={(e) => {
                if (isConnected && newMessage.trim()) {
                  e.currentTarget.style.background = '#065fd4';
                }
              }}
            >
              Kirim
            </button>
          </form>
        )}

        {readOnly && (
          <div style={{
            padding: '16px',
            background: '#f8f9fa',
            borderTop: '1px solid #e5e7eb',
            textAlign: 'center',
            fontSize: '13px',
            color: '#64748b'
          }}>
            Mode lihat saja - Komentar dari penonton akan muncul di sini
          </div>
        )}

        {/* CSS Animations */}
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
      </div>
    </>
  );
};

export default ChatSidebar;

