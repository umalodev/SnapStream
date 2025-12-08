import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaVideo, FaBroadcastTower, FaEye } from 'react-icons/fa';
import { API_URL } from '../config';

interface Stats {
  totalRecordings: number;
  totalStreams: number;
  activeStreams: number;
}

interface LiveStream {
  id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  viewers?: number;
  isRecording?: boolean;
  recordingPath?: string;
  status?: 'active' | 'ended' | 'recording';
}

const COLORS = {
  primary: '#BBF7D0',
  green: '#22c55e',
  yellow: '#eab308',
  accent: '#BBF7D0',
  text: '#1e293b',
  subtext: '#64748b',
  border: '#e2e8f0',
  bg: '#f8fafc',
  white: '#ffffff',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#BBF7D0',
};

// Skeleton Loading Component
const SkeletonLoader = () => (
  <div style={{
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'loading 1. 5s infinite',
    borderRadius: '4px',
    height: '24px',
    width: '60px',
  }} />
);

const AdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalRecordings: 0,
    totalStreams: 0,
    activeStreams: 0,
  });
  const [liveStreamHistory, setLiveStreamHistory] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [recordingsRes, streamsRes, activeRes] = await Promise.all([
        fetch(`${API_URL}/api/recording`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/api/livestream/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/api/livestream/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      ]);

      const recordings = recordingsRes.ok ? await recordingsRes.json() : [];
      const streams = streamsRes.ok ? await streamsRes. json() : { totalStreams: 0, totalDuration: 0 };
      const active = activeRes.ok ? await activeRes.json() : [];

      setStats({
        totalRecordings: Array.isArray(recordings) ? recordings.length : 0,
        totalStreams: streams.totalStreams || 0,
        activeStreams: Array.isArray(active) ? active.length : 0,
      });
    } catch (error) {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveStreamHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/livestream/history?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setLiveStreamHistory(data. data || []);
      }
    } catch (error) {
      console.error("Error fetching live stream history:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchLiveStreamHistory();
  }, []);

  // Format tanggal untuk live stream history
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Tanggal hari ini
  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const todayFormatted = `${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

  // Responsive breakpoints
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Get Status Badge
  const getStatusBadge = (status?: string) => {
    const statusConfig = {
      active: { label: 'Aktif', color: '#10b981', bg: '#d1fae5' },
      ended: { label: 'Selesai', color: '#64748b', bg: '#f1f5f9' },
      recording: { label: 'Recording', color: '#ef4444', bg: '#fee2e2' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ended;

    return (
      <span style={{
        padding: '4px 12px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 600,
        color: config. color,
        background: config.bg,
        display: 'inline-block',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {config.label}
      </span>
    );
  };

  // Add keyframe animation to style tag
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.8; }
      }
    `;
    document.head. appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div style={{ 
      padding: isMobile ? '16px' : isTablet ? '24px' : '32px', 
      background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)', 
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      maxWidth: '100%',
      overflowX: 'hidden'
    }}>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        borderRadius: '16px',
        padding: isMobile ? '24px' : '32px',
        marginBottom: '32px',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)',
        animation: 'fadeIn 0.6s ease-out'
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '200px',
          height: '200px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30px',
          left: '-30px',
          width: '150px',
          height: '150px',
          background: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }} />
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{
              fontSize: '32px',
              animation: 'pulse 2s infinite'
            }}>
              👋
            </div>
            <h1 style={{ 
              fontSize: isMobile ? '20px' : '28px', 
              fontWeight: 700, 
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              Selamat Datang Kembali, {user?.name || 'Admin'}!
            </h1>
          </div>
          <p style={{ 
            fontSize: isMobile ? '13px' : '15px', 
            margin: 0, 
            color: 'rgba(255, 255, 255, 0.9)', 
            lineHeight: '1.6', 
            maxWidth: '600px',
            fontWeight: 400
          }}>
            Dashboard Anda menampilkan ringkasan lengkap aktivitas streaming dan konten terbaru. Pantau performa secara real-time. 
          </p>
          <div style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0. 15)',
            borderRadius: '8px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 500
          }}>
            <i className="fas fa-calendar-alt"></i>
            {todayFormatted}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ?  '1fr' : isTablet ?  'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: isMobile ? '16px' : '24px',
        marginBottom: '32px',
      }}>
        {/* Total Recording Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          animation: 'fadeIn 0. 6s ease-out 0.1s backwards',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 24px rgba(16, 185, 129, 0.15)';
          e.currentTarget.style.borderColor = '#10b981';
        }}
        onMouseLeave={(e) => {
          e. currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style. boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          e. currentTarget.style.borderColor = '#e2e8f0';
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent)',
            borderRadius: '0 16px 0 100%',
          }} />
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #10b981, #059669)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            boxShadow: '0 8px 16px rgba(16, 185, 129, 0.3)',
            position: 'relative',
            zIndex: 1
          }}>
            <i className="fas fa-video"></i>
          </div>
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Recording
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {loading ? <SkeletonLoader /> : stats.totalRecordings}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
              📹 Video tersimpan
            </div>
          </div>
        </div>

        {/* Total Stream Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          animation: 'fadeIn 0.6s ease-out 0.2s backwards',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget. style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 24px rgba(59, 130, 246, 0.15)';
          e.currentTarget.style.borderColor = '#3b82f6';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          e. currentTarget.style.borderColor = '#e2e8f0';
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), transparent)',
            borderRadius: '0 16px 0 100%',
          }} />
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)',
            position: 'relative',
            zIndex: 1
          }}>
            <i className="fas fa-wifi"></i>
          </div>
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0. 5px' }}>
              Total Stream
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>
              {loading ? <SkeletonLoader /> : stats.totalStreams}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
              📡 Sesi streaming
            </div>
          </div>
        </div>

        {/* Active Now Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          animation: 'fadeIn 0.6s ease-out 0.3s backwards',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style. boxShadow = '0 12px 24px rgba(245, 158, 11, 0.15)';
          e.currentTarget.style.borderColor = '#f59e0b';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
          e. currentTarget.style.borderColor = '#e2e8f0';
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), transparent)',
            borderRadius: '0 16px 0 100%',
          }} />
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '28px',
            boxShadow: '0 8px 16px rgba(245, 158, 11, 0.3)',
            position: 'relative',
            zIndex: 1
          }}>
            <i className="fas fa-eye"></i>
          </div>
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0. 5px' }}>
              Active Now
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#1e293b', lineHeight: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {loading ? <SkeletonLoader /> : stats.activeStreams}
              {! loading && stats.activeStreams > 0 && (
                <span style={{
                  width: '12px',
                  height: '12px',
                  background: '#ef4444',
                  borderRadius: '50%',
                  animation: 'pulse 2s infinite',
                  boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.7)'
                }}></span>
              )}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>
              👁️ Stream aktif
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: isMobile ? '16px' : '32px',
      }}>
        {/* Live Stream History */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          animation: 'fadeIn 0. 6s ease-out 0. 4s backwards',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px',
            background: 'linear-gradient(to right, #f8fafc, #ffffff)',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <h2 style={{
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: 700,
              margin: 0,
              color: '#1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '18px'
              }}>
                <i className="fas fa-history"></i>
              </div>
              Live Stream History
            </h2>
            <button
              onClick={() => fetchLiveStreamHistory()}
              style={{
                padding: '8px 16px',
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                color: '#64748b',
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0. 2s ease',
                fontWeight: 500
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f8fafc';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget. style.borderColor = '#e2e8f0';
              }}
            >
              <i className="fas fa-sync-alt"></i>
              Refresh
            </button>
          </div>

          {/* Table Content */}
          <div style={{ padding: isMobile ? '16px' : '24px' }}>
            {/* Desktop Table Header */}
            {! isMobile && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto',
                gap: '16px',
                fontSize: '12px',
                color: '#64748b',
                fontWeight: 700,
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '2px solid #e2e8f0',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <div>📺 Judul Stream</div>
                <div>📅 Tanggal & Waktu</div>
                <div style={{ textAlign: 'right' }}>🏷️ Status</div>
              </div>
            )}

            {/* Loading State */}
            {historyLoading ?  (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '60px 20px',
                color: '#64748b',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: '4px solid #e2e8f0',
                  borderTop: '4px solid #10b981',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  marginBottom: '16px'
                }}></div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Memuat history...</p>
              </div>
            ) : liveStreamHistory.length === 0 ? (
              // Empty State
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '60px 20px',
                color: '#94a3b8',
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  marginBottom: '16px'
                }}>
                  📭
                </div>
                <h3 style={{ 
                  margin: '0 0 8px 0', 
                  fontSize: '16px', 
                  fontWeight: 600,
                  color: '#64748b' 
                }}>
                  Belum Ada History
                </h3>
                <p style={{ 
                  margin: 0, 
                  fontSize: '14px',
                  color: '#94a3b8',
                  textAlign: 'center'
                }}>
                  Riwayat live stream Anda akan muncul di sini
                </p>
              </div>
            ) : (
              // Table Rows
              <div>
                {liveStreamHistory. map((stream, index) => (
                  <div key={stream.id} style={{
                    display: isMobile ? 'block' : 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr auto auto',
                    gap: '16px',
                    padding: isMobile ? '16px' : '16px 0',
                    borderBottom: index < liveStreamHistory.length - 1 ? '1px solid #f1f5f9' : 'none',
                    alignItems: 'center',
                    transition: 'all 0.2s ease',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: index % 2 === 0 ? 'transparent' : '#fafbfc'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget. style.background = '#f8fafc';
                    e.currentTarget.style.paddingLeft = isMobile ? '16px' : '12px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = index % 2 === 0 ? 'transparent' : '#fafbfc';
                    e.currentTarget.style.paddingLeft = '0';
                  }}>
                    {/* Title */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#1e293b', 
                      fontWeight: 600,
                      marginBottom: isMobile ? '12px' : '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        background: stream.status === 'active' ?  '#10b981' : '#cbd5e1',
                        borderRadius: '50%',
                        flexShrink: 0
                      }}></div>
                      <span style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {stream.title || `Live Stream #${stream.id}`}
                      </span>
                    </div>

                    {/* Date */}
                    <div style={{ 
                      fontSize: '13px', 
                      color: '#64748b',
                      marginBottom: isMobile ? '12px' : '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 500
                    }}>
                      <i className="fas fa-clock" style={{ fontSize: '11px' }}></i>
                      {stream.startTime ?  formatDate(stream.startTime) : '-'}
                    </div>

                    {/* Status Badge */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: isMobile ? 'flex-start' : 'flex-end' 
                    }}>
                      {getStatusBadge(stream.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add spin animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;