import React, { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useStreaming } from "../context/StreamingContext";
import CameraPreview from "./CameraPreview";
import ModalNotifikasi from "../components/ModalNotifikasi";
import MultiCameraStreamer from "../components/MultiCameraStreamer";
import BasicLayoutEditor from "../components/BasicLayoutEditor";
import SimpleYouTube from "../components/SimpleYouTube";
import ChatModal from "../components/ChatModal";
import ChatSidebar from "../components/ChatSidebar";
import AudioLevelIndicator from "../components/AudioLevelIndicator";
import { API_URL } from "../config";
import { io } from 'socket.io-client';

// Color palette dengan tema hijau muda (#BBF7D0)
const LIGHT_GREEN = "#BBF7D0";
const LIGHT_GREEN_DARK = "#86EFAC";
const LIGHT_GREEN_LIGHT = "#DCFCE7";
const WHITE = "#fff";
const GRAY_TEXT = "#64748b";
const CARD_RADIUS = 18;
const SHADOW = "0 4px 24px rgba(187,247,208,0.12)";
const FONT_FAMILY = "Poppins, Inter, Segoe UI, Arial, sans-serif";

const LIGHT_GRAY = '#f5f5f5';

const COLORS = {
  primary: LIGHT_GREEN,
  primaryDark: LIGHT_GREEN_DARK,
  accent: "#ef4444",
  accentDark: "#dc2626",
  text: "#1e293b",
  subtext: GRAY_TEXT,
  border: "#e5e7eb",
  bg: LIGHT_GRAY,
  white: WHITE,
  green: LIGHT_GREEN,
  greenDark: LIGHT_GREEN_DARK,
  greenLight: LIGHT_GREEN_LIGHT,
  red: "#ef4444",
  redDark: "#dc2626",
  yellow: "#facc15",
  yellowDark: "#eab308",
  blue: LIGHT_GREEN,
  blueDark: LIGHT_GREEN_DARK,
};




interface StreamingStats {
  totalStreams: number;
  totalDuration: number; // in hours
  totalViewers: number;
  activeStreams: number;
  averageViewers: number;
}

const AdminLiveStreamPage: React.FC = () => {
  const { user, token } = useAuth();
  const { streamingState, startStream, stopStream, updateStatus, setSelectedKelas, setSelectedMapel, startMultiCameraStreaming, updateStreamingLayout } = useStreaming();
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const webSocket = useRef<WebSocket | null>(null);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  const [streamingStats, setStreamingStats] = useState<StreamingStats>({
    totalStreams: 0,
    totalDuration: 0,
    totalViewers: 0,
    activeStreams: 0,
    averageViewers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [showTitleModal, setShowTitleModal] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [showMultiCameraStreamer, setShowMultiCameraStreamer] = useState(false);
  const [showStreamingLayoutEditor, setShowStreamingLayoutEditor] = useState(false);
  const [streamingCameras, setStreamingCameras] = useState<any[]>([]);
  const [streamingScreenSource, setStreamingScreenSource] = useState<any>(null);
  const [streamingLayouts, setStreamingLayouts] = useState<any[]>([]);
  const [currentStreamingLayoutType, setCurrentStreamingLayoutType] = useState<string>('');
  const [currentViewers, setCurrentViewers] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState<string | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  const [showChatModal, setShowChatModal] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const socketRef = useRef<any>(null);
  const chatSocketRef = useRef<any>(null);
  // Set waktu mulai streaming
useEffect(() => {
  // Jika streaming baru aktif dan belum ada waktu start → set sekarang
  if (streamingState.isStreaming && !streamStartTime) {
    const startedAt = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setStreamStartTime(startedAt);
  }

  // Jika streaming berhenti → reset
  if (!streamingState.isStreaming && streamStartTime !== null) {
    setStreamStartTime(null);
  }
}, [streamingState.isStreaming]);

  // Set video stream to video element
  useEffect(() => {
    if (videoRef.current && streamingState.localStream) {
      videoRef.current.srcObject = streamingState.localStream;
    }
  }, [streamingState.localStream]);

  // Check audio track status
  useEffect(() => {
    if (streamingState.localStream) {
      const audioTracks = streamingState.localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        setHasAudio(true);
        const audioTrack = audioTracks[0];
        setAudioEnabled(audioTrack.enabled && !audioTrack.muted);
        
        // Listen for track changes
        const handleTrackChange = () => {
          setAudioEnabled(audioTrack.enabled && !audioTrack.muted);
        };
        
        audioTrack.addEventListener('mute', handleTrackChange);
        audioTrack.addEventListener('unmute', handleTrackChange);
        
        return () => {
          audioTrack.removeEventListener('mute', handleTrackChange);
          audioTrack.removeEventListener('unmute', handleTrackChange);
        };
      } else {
        setHasAudio(false);
        setAudioEnabled(false);
      }
    } else {
      setHasAudio(false);
      setAudioEnabled(false);
    }
  }, [streamingState.localStream]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Socket connection for real-time viewer count updates
  useEffect(() => {
    socketRef.current = io('http://192.168.1.10:4000');
    
    socketRef.current.on('connect', () => {
      console.log('[AdminLiveStreamPage] Connected to MediaSoup server');
      // Join the room for real-time updates
      if (streamingState.roomId) {
        socketRef.current.emit('joinRoom', { roomId: streamingState.roomId });
        console.log(`[AdminLiveStreamPage] Joined room: ${streamingState.roomId}`);
      }
    });

    socketRef.current.on('viewerCountUpdate', (data: { roomId: string; viewers: number }) => {
      console.log(`[AdminLiveStreamPage] Received viewer count update:`, data);
      if (streamingState.roomId && data.roomId === streamingState.roomId) {
        setCurrentViewers(data.viewers);
        console.log(`[AdminLiveStreamPage] Viewer count updated to: ${data.viewers}`);
      } else {
        console.log(`[AdminLiveStreamPage] Ignoring viewer count update for different room: ${data.roomId} (current: ${streamingState.roomId})`);
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('[AdminLiveStreamPage] Disconnected from MediaSoup server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [streamingState.roomId]);

  // Initialize chat socket connection
  useEffect(() => {
    if (streamingState.roomId && !chatSocketRef.current) {
      chatSocketRef.current = io('http://192.168.1.10:4000');
      console.log('[AdminLiveStreamPage] Chat socket initialized for room:', streamingState.roomId);
    }

    return () => {
      if (chatSocketRef.current) {
        chatSocketRef.current.disconnect();
        chatSocketRef.current = null;
      }
    };
  }, [streamingState.roomId]);

  const isMobile = windowWidth < 768;
  



  // Fetch streaming statistics
  const fetchStreamingStats = useCallback(async () => {
    try {
      setStatsLoading(true);

      // Fetch from backend API
      const [statsRes, activeRes] = await Promise.all([
        fetch(`${API_URL}/api/livestream/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/api/livestream/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
      ]);

      let stats = {
        totalStreams: 0,
        totalDuration: 0,
        totalViewers: 0,
        activeStreams: 0,
        averageViewers: 0,
      };

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        stats = {
          totalStreams: statsData.totalStreams || 0,
          totalDuration: statsData.totalDuration || 0,
          totalViewers: statsData.totalViewers || 0,
          activeStreams: statsData.activeStreams || 0,
          averageViewers: statsData.averageViewers || 0,
        };
      }

      if (activeRes.ok) {
        const activeData = await activeRes.json();
        stats.activeStreams = activeData.length || 0;
      }

      setStreamingStats(stats);
    } catch (error) {
      console.error("Error fetching streaming stats:", error);
      // Jangan gunakan data mock, tampilkan nilai 0 saja
      setStreamingStats({
        totalStreams: 0,
        totalDuration: 0,
        totalViewers: 0,
        activeStreams: 0,
        averageViewers: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  }, [token]);




  // Fetch viewer count for current stream
  const fetchViewerCount = useCallback(async () => {
    if (!streamingState.roomId) return;
    
    try {
      console.log(`[AdminLiveStreamPage] Fetching viewer count for room: ${streamingState.roomId}`);
      const response = await fetch(`http://192.168.1.10:4000/api/viewer-count/${streamingState.roomId}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`[AdminLiveStreamPage] Viewer count response:`, data);
        setCurrentViewers(data.viewers);
        console.log(`[AdminLiveStreamPage] Fetched viewer count: ${data.viewers}`);
      } else {
        console.error(`[AdminLiveStreamPage] Failed to fetch viewer count: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching viewer count:', error);
    }
  }, [streamingState.roomId]);

  // Real-time stats updates
  useEffect(() => {
    fetchStreamingStats();

    const interval = setInterval(() => {
      fetchStreamingStats();
      if (streamingState.isStreaming) {
        fetchViewerCount();
      }
    }, 5000); // Update every 5 seconds for more frequent updates

    return () => clearInterval(interval);
  }, [fetchStreamingStats, fetchViewerCount, streamingState.isStreaming]);

  // Reset streaming information when streaming stops
  useEffect(() => {
    if (!streamingState.isStreaming) {
      setStreamingCameras([]);
      setStreamingScreenSource(null);
      setStreamingLayouts([]);
      setCurrentStreamingLayoutType('');
    }
  }, [streamingState.isStreaming]);

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        // Initial data loading if needed
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
      setLoading(false);
    };

    fetchInitialData();
  }, []);

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  const handleStartStream = () => {
    setShowTitleModal(true);
  };

  const handleStartMultiCameraStreaming = () => {
    setShowMultiCameraStreamer(true);
  };

  const handleMultiCameraStartStreaming = async (
    selectedCameras: string[],
    layoutType: string,
    streamJudul: string,
    customLayout?: any[],
    selectedCameraDevices?: any[],
    screenSource?: any
  ) => {
    try {
      await startMultiCameraStreaming(
        selectedCameras,
        layoutType,
        streamJudul,
        customLayout,
        screenSource
      );
      
      // Save streaming information for layout editing
      setStreamingCameras(selectedCameraDevices || []);
      setStreamingScreenSource(screenSource || null);
      setStreamingLayouts(customLayout || []);
      setCurrentStreamingLayoutType(layoutType);
      
      setShowMultiCameraStreamer(false);
      await fetchStreamingStats();
      showAlert("Multi-camera streaming berhasil dimulai!", "success");
    } catch (error) {
      console.error("Error starting multi-camera streaming:", error);
      showAlert((error as Error).message || "Error memulai multi-camera streaming", "error");
    }
  };

  const handleConfirmStartStream = async () => {
    if (!streamTitle.trim()) {
      showAlert("Judul live stream harus diisi!", "warning");
      return;
    }

    try {
      setShowTitleModal(false);
      
      // Start stream with title
       await startStream("admin", streamTitle);
      // Update stats immediately
      await fetchStreamingStats();
      
      // Fetch initial viewer count
      await fetchViewerCount();
      
      showAlert("Live stream berhasil dimulai!", "success");
    } catch (error) {
      console.error("Error starting stream:", error);
      showAlert((error as Error).message || "Error memulai streaming", "error");
    }
  };


  const handleStopStream = async () => {
    try {
      await stopStream();
      
      // Reset streaming information
      setStreamingCameras([]);
      setStreamingScreenSource(null);
      setStreamingLayouts([]);
      
      // Update stats
      await fetchStreamingStats();
      
      // Show success message
      showAlert("Live stream berhasil dihentikan!", "success");
    } catch (error) {
      console.error("Error stopping stream:", error);
      showAlert("Error menghentikan streaming", "error");
    }
  };

  const handleStreamingLayoutChange = (newLayout: any[]) => {
    setStreamingLayouts(newLayout);
    // Update the streaming layout in real-time
    handleUpdateStreamingLayout(newLayout);
  };

  const handleUpdateStreamingLayout = (newLayout: any[]) => {
    updateStreamingLayout(newLayout);
    showAlert("Layout streaming telah diupdate!", "success");
  };



  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours}j`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}h ${remainingHours}j`;
  };

  // Helper function to generate stream URL
  const generateStreamUrl = (roomId: string) => {
    // Always use HTTP server to avoid CORS issues
    return `http://192.168.1.10:3000/#/view/${roomId}`;
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.bg,
          fontFamily: FONT_FAMILY,
        }}
      >
        <div style={{ textAlign: "center", color: COLORS.subtext }}>
          <div style={{ fontSize: "18px", marginBottom: "8px" }}>
            Memuat...
          </div>
          <div style={{ fontSize: "14px" }}>
            Menyiapkan data live streaming
          </div>
        </div>
      </div>
    );
  }
  

  // Jika streaming aktif, tampilkan layout seperti user (full screen)
 // =======================
// LIVE STREAMING MODE
// =======================
if (streamingState.isStreaming) {
  return (
    <>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* ROOT FULLSCREEN WRAPPER */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          fontFamily: '"Roboto", "Arial", sans-serif',
          color: "#0f0f0f",
          zIndex: 1,
        }}
      >
        {/* ================= HEADER (FIXED) ================= */}
        <div
          style={{
            height: "56px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            borderBottom: "1px solid #e5e5e5",
            background: "#ffffff",
            zIndex: 10,
          }}
        >
          {/* Left */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <img
              src="/assets/umalo.png"
              alt="Umalo"
              style={{ height: "40px", objectFit: "contain" }}
            />
          </div>

          {/* Right - LIVE badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              background: "#ff0000",
              color: "#ffffff",
              borderRadius: "18px",
              fontSize: "12px",
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#ffffff",
                animation: "pulse 1s infinite",
              }}
            />
            LIVE
          </div>
        </div>

        {/* ================= CONTENT (SCROLLABLE) ================= */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",     // ✅ SCROLL AKTIF
            overflowX: "hidden",
            paddingTop: "24px",
            paddingBottom: "40px",
            paddingLeft: "24px",
            paddingRight: showChatSidebar ? "424px" : "24px",
            transition: "padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            boxSizing: "border-box",
          }}
        >
          {/* ================= VIDEO ================= */}
          {streamingState.localStream && (
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "16 / 9",
                background: "#000",
                borderRadius: "12px",
                overflow: "hidden",
                marginBottom: "16px",
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />

              {/* LIVE badge on video */}
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  left: "12px",
                  background: "#ff0000",
                  color: "#ffffff",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "#ffffff",
                    animation: "pulse 1s infinite",
                  }}
                />
                LIVE
              </div>

              {/* AUDIO INDICATOR */}
              {hasAudio && (
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    zIndex: 10,
                  }}
                >
                  <AudioLevelIndicator
                    stream={streamingState.localStream}
                    isActive={audioEnabled && streamingState.isStreaming}
                  />
                </div>
              )}
            </div>
          )}

          {/* ================= INFO ================= */}
          <h1
            style={{
              fontSize: "20px",
              fontWeight: 500,
              marginBottom: "12px",
            }}
          >
            {streamTitle || "Live Stream"}
          </h1>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: "14px",
              color: "#606060",
              marginBottom: "16px",
            }}
          >
            <div>
              👥 <strong style={{ color: "#0f0f0f" }}>{currentViewers}</strong>{" "}
              penonton
            </div>
            {streamStartTime && (
              <div>
                Dimulai{" "}
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            )}
          </div>

          {/* ================= ACTION BUTTONS ================= */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "40px" }}>
            <button
              onClick={() => {
                if (!streamingState.roomId) return;
                navigator.clipboard.writeText(
                  generateStreamUrl(streamingState.roomId)
                );
                showAlert("Link berhasil disalin!", "success");
              }}
              style={{
                background: "#065fd4",
                color: "#fff",
                border: "none",
                borderRadius: "18px",
                padding: "14px 32px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📋 Salin Link 
            </button>

            <button
              onClick={handleStopStream}
              style={{
                background: "#ff0000",
                color: "#fff",
                border: "none",
                borderRadius: "18px",
                padding: "14px 32px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ⏹️ Berhenti Live
            </button>
          </div>
        </div>

        {/* ================= CHAT SIDEBAR ================= */}
        {streamingState.roomId && (
          <ChatSidebar
            isOpen={showChatSidebar}
            onToggle={() => setShowChatSidebar(!showChatSidebar)}
            streamId={streamingState.roomId}
            socket={chatSocketRef.current}
            currentUsername={user?.name || "Admin"}
            isAdmin
            readOnly={false}
          />
        )}
      </div>

      {/* MODAL */}
      <ModalNotifikasi
        isOpen={showAlertModal}
        title="Pemberitahuan"
        message={alertMessage}
        type={alertType}
        onConfirm={() => setShowAlertModal(false)}
        onCancel={() => setShowAlertModal(false)}
        confirmText="OK"
        cancelText=""
      />
    </>
  );
}


  // Layout normal ketika streaming tidak aktif
  return (
    <>
      {/* Add CSS animations */}
     <style>
{`
  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes slideInRight {
    0% { opacity: 0; transform: translateX(30px); }
    100% { opacity: 1; transform: translateX(0); }
  }

  @keyframes scaleIn {
    0% { opacity: 0; transform: scale(0.9); }
    100% { opacity: 1; transform: scale(1); }
  }

  /* ⬅ WAJIB untuk banner kamu */
  @keyframes fadeIn {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  /* ⬅ WAJIB untuk icon 🎥 */
  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
`}
</style>

      
      <div
        style={{
          padding: isMobile ? "16px" : "32px",
          maxWidth: "100%",
          overflowX: "hidden",
          background: COLORS.bg,
          fontFamily: FONT_FAMILY,
        }}
      >
       {/* Welcome Card (MATCHED STYLE) */}
<div style={{
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  borderRadius: '16px',
  padding: isMobile ? '24px' : '32px',
  marginBottom: '32px',
  color: '#ffffff',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)',
animation: 'fadeInUp 0.6s ease-out'
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

  {/* Content */}
  <div style={{ position: 'relative', zIndex: 1 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <div style={{
        fontSize: '32px',
        animation: 'pulse 2s infinite'
      }}>
        🎥
      </div>
      <h1 style={{
        fontSize: isMobile ? '20px' : '28px',
        fontWeight: 700,
        margin: 0,
        letterSpacing: '-0.5px'
      }}>
        Live Streaming
      </h1>
    </div>

    <div style={{
      fontSize: isMobile ? '13px' : '15px',
      margin: 0,
      color: 'rgba(255, 255, 255, 0.9)',
      lineHeight: '1.6',
      maxWidth: '600px',
      fontWeight: 400
    }}>
      Selamat datang, {user?.name || 'Admin'}! Mulai live streaming pembelajaran dengan mudah.
    </div>

    <div style={{
      marginTop: '16px',
      padding: '8px 16px',
      background: 'rgba(255, 255, 255, 0.15)',
      borderRadius: '8px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      fontWeight: 500
    }}>
      <i className="fas fa-calendar-alt"></i>
      {new Date().toLocaleDateString('id-ID', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    </div>
  </div>
</div>


        {/* Stats Cards */}
         <div
           style={{
             display: "grid",
             gridTemplateColumns: isMobile
               ? "repeat(2, 1fr)"
               : "repeat(5, 1fr)",
             gap: "16px",
             marginBottom: "24px",
           }}
         >
          {/* Total Streams */}
          
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "24px",
          }}
        >
          {/* Main Content */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: isMobile ? "20px" : "32px",
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Modern Background Pattern */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(187, 247, 208, 0.1) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(50%, -50%)',
            }} />
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '150px',
              height: '150px',
              background: 'radial-gradient(circle, rgba(134, 239, 172, 0.08) 0%, transparent 70%)',
              borderRadius: '50%',
              transform: 'translate(-50%, 50%)',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2
                style={{
                  fontSize: "20px",
                  fontWeight: 500,
                  color: '#6b7280',
                  margin: "0 0 8px 0",
                }}
              >
                Kontrol Live Streaming
              </h2>
              <p style={{
                fontSize: "14px",
                color: '#9ca3af',
                margin: "0 0 24px 0",
                fontWeight: 400,
              }}>
                Kelola dan kontrol streaming live dengan mudah
              </p>
            </div>

            {/* Streaming Buttons */}
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '8px', marginBottom: '16px' }}>
             
            <button
  onClick={handleStartMultiCameraStreaming}
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: "white",
    border: 'none',
    borderRadius: 16,
    padding: '14px 24px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    opacity: 1,
    width: 'auto',
    boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35), 0 4px 8px rgba(16, 185, 129, 0.25)',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow =
      '0 12px 28px rgba(16, 185, 129, 0.45), 0 6px 12px rgba(16, 185, 129, 0.35)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow =
      '0 8px 20px rgba(16, 185, 129, 0.35), 0 4px 8px rgba(16, 185, 129, 0.25)';
  }}
>
  <span style={{ fontSize: '18px' }}>📹</span>
  Multi-Camera Stream
</button>

            </div>
          </div>
        </div>


      {/* Modal Input Judul */}
      {showTitleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: '#1e293b'
            }}>
              Masukkan Judul Live Stream
            </h3>
            
            <p style={{
              margin: '0 0 20px 0',
              fontSize: '14px',
              color: '#64748b'
            }}>
              Berikan judul yang deskriptif untuk live stream Anda.
            </p>

            <input
              type="text"
              value={streamTitle}
              onChange={(e) => setStreamTitle(e.target.value)}
              placeholder="Contoh: Tutorial React - Bagian 1"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                marginBottom: '20px',
                boxSizing: 'border-box'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmStartStream();
                }
              }}
              autoFocus
            />

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowTitleModal(false);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseOver={e => e.currentTarget.style.background = '#e5e7eb'}
                onMouseOut={e => e.currentTarget.style.background = '#f3f4f6'}
              >
                Batal
              </button>
              <button
                onClick={handleConfirmStartStream}
                style={{
                  padding: '10px 20px',
                  background: '#BBF7D0',
                  color: "black",
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                 onMouseOver={e => e.currentTarget.style.background = '#86EFAC'}
                onMouseOut={e => e.currentTarget.style.background = '#BBF7D0'}
              >
                Mulai Live Stream
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Notifikasi */}
      <ModalNotifikasi
        isOpen={showAlertModal}
        title="Pemberitahuan"
        message={alertMessage}
        type={alertType}
        onConfirm={() => setShowAlertModal(false)}
        onCancel={() => setShowAlertModal(false)}
        confirmText="OK"
        cancelText=""
        />

      {/* Multi-Camera Streamer Modal */}
      {showMultiCameraStreamer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: CARD_RADIUS,
            padding: isMobile ? '12px' : '16px',
            maxWidth: '480px',
            width: '90%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: SHADOW,
            border: `1px solid ${COLORS.border}`,
            margin: isMobile ? '10px' : '0'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              marginBottom: '24px',
              flexDirection: isMobile ? 'column' : 'row',
              gap: isMobile ? '12px' : '0'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: isMobile ? 32 : 40,
                  height: isMobile ? 32 : 40,
                  borderRadius: 8,
                  background: COLORS.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: COLORS.white,
                }}>
                  <span style={{ fontSize: isMobile ? 14 : 16 }}>📹</span>
                </div>
                <h3 style={{
                  margin: 0,
                  fontSize: isMobile ? '18px' : '24px',
                  fontWeight: 700,
                  color: COLORS.text,
                  fontFamily: FONT_FAMILY
                }}>
                  Multi-Camera Streaming
                </h3>
              </div>
              <button
                onClick={() => setShowMultiCameraStreamer(false)}
                style={{
                  background: COLORS.bg,
                  color: COLORS.subtext,
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  padding: isMobile ? '8px 12px' : '10px 16px',
                  fontSize: isMobile ? '12px' : '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  alignSelf: isMobile ? 'flex-end' : 'auto'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = COLORS.accent;
                  e.currentTarget.style.color = COLORS.white;
                  e.currentTarget.style.borderColor = COLORS.accent;
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = COLORS.bg;
                  e.currentTarget.style.color = COLORS.subtext;
                  e.currentTarget.style.borderColor = COLORS.border;
                }}
              >
                <span style={{ fontSize: 12 }}>✕</span>
                Tutup
              </button>
            </div>

            <MultiCameraStreamer
              onStartStreaming={handleMultiCameraStartStreaming}
              onStatusUpdate={updateStatus}
              onClose={() => setShowMultiCameraStreamer(false)}
            />
          </div>
        </div>
      )}

      {/* Streaming Layout Editor Modal */}
      {showStreamingLayoutEditor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '0',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <BasicLayoutEditor
              cameras={streamingCameras}
              onLayoutChange={handleStreamingLayoutChange}
              onClose={() => setShowStreamingLayoutEditor(false)}
              initialLayouts={streamingLayouts}
              screenSource={streamingScreenSource}
            />
          </div>
        </div>
      )}

      </div>
    </>
  );
};

export default AdminLiveStreamPage;
