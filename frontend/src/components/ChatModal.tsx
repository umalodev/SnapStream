import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isAdmin?: boolean;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamId: string;
  socket: Socket | null;
  currentUsername?: string;
  isAdmin?: boolean;
  readOnly?: boolean;
  onNewMessage?: () => void;
}

const ChatModal: React.FC<ChatModalProps> = ({ 
  isOpen, 
  onClose, 
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
    scrollToBottom();
  }, [messages]);

  // Listen for chat messages - Keep listening even when modal is closed for real-time updates
  useEffect(() => {
    if (!socket || !streamId) return;

    const handleChatMessage = (data: ChatMessage) => {
      if (data.id && data.message) {
        // Prevent duplicate messages by checking processed IDs
        if (processedMessageIds.current.has(data.id)) {
          console.log(`[ChatModal] Duplicate message ignored: ${data.id}`);
          return;
        }
        
        processedMessageIds.current.add(data.id);
        
        setMessages(prev => {
          // Double check to prevent duplicates in state
          const exists = prev.some(msg => msg.id === data.id);
          if (exists) return prev;
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
      console.log(`[ChatModal] Connecting to chat room: ${streamId} as ${currentUsername} (Admin: ${isAdmin})`);
      socket.emit('joinChatRoom', { roomId: streamId, username: currentUsername, isAdmin });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
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
      console.log(`[ChatModal] Already connected, joining room: ${streamId} as ${currentUsername} (Admin: ${isAdmin})`);
      socket.emit('joinChatRoom', { roomId: streamId, username: currentUsername, isAdmin });
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chatMessage', handleChatMessage);
    };
  }, [socket, streamId, currentUsername, isAdmin]); // Removed isOpen dependency to keep listening

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

    console.log(`[ChatModal] Sending message to room ${streamId}:`, messageData);
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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      fontFamily: 'Poppins, Inter, Segoe UI, Arial, sans-serif'
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden'
      }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{
          background: 'linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb'
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
              fontSize: '18px',
              fontWeight: 600,
              color: '#1e293b'
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
            onClick={onClose}
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

        {/* Chat Messages */}
        <div
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            background: '#f8f9fa',
            minHeight: '300px',
            maxHeight: '400px'
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
                  marginBottom: '12px',
                  padding: '12px 14px',
                  background: msg.isAdmin ? '#E0F2FE' : '#ffffff',
                  borderRadius: '12px',
                  borderLeft: msg.isAdmin ? '3px solid #2563EB' : '3px solid #BBF7D0',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: msg.isAdmin ? '#2563EB' : '#1e293b'
                    }}>
                      {msg.isAdmin ? '👑 ' : ''}{msg.username}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    color: '#64748b'
                  }}>
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#1e293b',
                  lineHeight: '1.5',
                  wordBreak: 'break-word'
                }}>
                  {msg.message}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        {!readOnly && (
          <form onSubmit={handleSendMessage} style={{
            padding: '16px',
            background: '#ffffff',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            gap: '10px'
          }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ketik pesan..."
              disabled={!isConnected}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#BBF7D0'}
              onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !isConnected}
              style={{
                padding: '12px 24px',
                background: isConnected && newMessage.trim() ? '#BBF7D0' : '#e5e7eb',
                color: isConnected && newMessage.trim() ? '#1e293b' : '#9ca3af',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isConnected && newMessage.trim() ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                fontFamily: 'inherit'
              }}
              onMouseOver={(e) => {
                if (isConnected && newMessage.trim()) {
                  e.currentTarget.style.background = '#86EFAC';
                }
              }}
              onMouseOut={(e) => {
                if (isConnected && newMessage.trim()) {
                  e.currentTarget.style.background = '#BBF7D0';
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
    </div>
  );
};

export default ChatModal;

