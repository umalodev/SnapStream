import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  timestamp: string;
  isAdmin?: boolean;
}

interface LiveChatProps {
  streamId: string;
  socket: Socket | null;
  currentUsername?: string;
  isAdmin?: boolean;
}

const LiveChat: React.FC<LiveChatProps> = ({ streamId, socket, currentUsername = 'Pengunjung', isAdmin = false }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for chat messages
  useEffect(() => {
    if (!socket || !streamId) return;

    const handleChatMessage = (data: ChatMessage) => {
      if (data.id && data.message) {
        setMessages(prev => [...prev, data]);
      }
    };

    const handleConnect = () => {
      setIsConnected(true);
      // Join chat room
      socket.emit('joinChatRoom', { roomId: streamId, username: currentUsername, isAdmin });
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chatMessage', handleChatMessage);

    // Join chat room on mount
    if (socket.connected) {
      socket.emit('joinChatRoom', { roomId: streamId, username: currentUsername, isAdmin });
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chatMessage', handleChatMessage);
    };
  }, [socket, streamId, currentUsername, isAdmin]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !isConnected) return;

    const messageData: ChatMessage = {
      id: Date.now().toString(),
      username: currentUsername,
      message: newMessage.trim(),
      timestamp: new Date().toISOString(),
      isAdmin
    };

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
    <div style={{
      position: 'fixed',
      right: isOpen ? '20px' : '-400px',
      bottom: '20px',
      width: '380px',
      maxHeight: '600px',
      background: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'right 0.3s ease',
      zIndex: 1000,
      fontFamily: 'Poppins, Inter, Segoe UI, Arial, sans-serif'
    }}>
      {/* Chat Header */}
      <div style={{
        background: 'linear-gradient(135deg, #BBF7D0 0%, #86EFAC 100%)',
        padding: '16px 20px',
        borderRadius: '16px 16px 0 0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: 'pointer'
      }} onClick={() => setIsOpen(!isOpen)}>
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
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#1e293b',
            padding: '4px 8px'
          }}
        >
          {isOpen ? '−' : '+'}
        </button>
      </div>

      {/* Chat Messages */}
      {isOpen && (
        <>
          <div
            ref={chatContainerRef}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              background: '#f8f9fa',
              maxHeight: '400px',
              minHeight: '200px'
            }}
          >
            {messages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                color: '#64748b',
                fontSize: '14px',
                padding: '40px 20px'
              }}>
                Belum ada pesan. Mulai obrolan!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    marginBottom: '12px',
                    padding: '10px 12px',
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
                    marginBottom: '4px'
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
          <form onSubmit={handleSendMessage} style={{
            padding: '12px',
            background: '#ffffff',
            borderTop: '1px solid #e5e7eb',
            borderRadius: '0 0 16px 16px',
            display: 'flex',
            gap: '8px'
          }}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Ketik pesan..."
              disabled={!isConnected}
              style={{
                flex: 1,
                padding: '10px 14px',
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
                padding: '10px 20px',
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
        </>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default LiveChat;

