import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from './config';
import { io } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import ChatSidebar from './components/ChatSidebar';

// YouTube-like color palette
const COLORS = {
  background: '#0f0f0f',
  surface: '#ffffff',
  surfaceDark: '#272727',
  text: '#0f0f0f',
  textSecondary: '#606060',
  textTertiary: '#aaaaaa',
  border: '#e5e5e5',
  red: '#ff0000',
  redDark: '#cc0000',
  blue: '#065fd4',
  hover: '#f5f5f5',
};

const FONT_FAMILY = '"Roboto", "Arial", sans-serif';

interface LiveStreamData {
  id: string;
  title: string;
  startTime: string;
  viewers: number;
  status: 'active' | 'ended' | 'recording';
  isRecording: boolean;
  recordingPath?: string;
}

const ViewerPage: React.FC = () => {
  const { streamId } = useParams<{ streamId: string }>();
  const [streamData, setStreamData] = useState<LiveStreamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewers, setViewers] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'fair' | 'poor'>('good');
  const [currentBitrate, setCurrentBitrate] = useState(0);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [showStreamEndedModal, setShowStreamEndedModal] = useState(false);
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [username, setUsername] = useState<string>('Pengunjung');
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<any>(null);
  const chatSocketRef = useRef<any>(null);
  const deviceRef = useRef<any>(null);
  const consumerRef = useRef<any>(null);
  const audioConsumerRef = useRef<any>(null);
  const consumerTransportRef = useRef<any>(null);
  const networkMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const bufferResetRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Generate or get username from localStorage
    const savedUsername = localStorage.getItem('viewer_username');
    if (savedUsername) {
      setUsername(savedUsername);
    } else {
      const generatedUsername = `Pengunjung_${Math.floor(Math.random() * 10000)}`;
      setUsername(generatedUsername);
      localStorage.setItem('viewer_username', generatedUsername);
    }

    // Initialize chat socket connection
    if (streamId && !chatSocketRef.current) {
      chatSocketRef.current = io('http://192.168.1.15:4000');
      console.log('[ViewerPage] Chat socket initialized for stream:', streamId);
    }

    if (streamId) {
      fetchStreamData();
    }
    
    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (chatSocketRef.current) {
        chatSocketRef.current.disconnect();
        chatSocketRef.current = null;
      }
      if (consumerRef.current) {
        consumerRef.current.close();
      }
      if (audioConsumerRef.current) {
        audioConsumerRef.current.close();
      }
      if (networkMonitorRef.current) {
        clearInterval(networkMonitorRef.current);
      }
      if (bufferResetRef.current) {
        clearInterval(bufferResetRef.current);
      }
    };
  }, [streamId]);

  // Listen for viewer count updates
  useEffect(() => {
    if (socketRef.current && streamId) {
      const handleViewerCountUpdate = (data: { roomId: string; viewers: number }) => {
        if (data.roomId === streamId) {
          setViewers(data.viewers);
          console.log(`[ViewerPage] Viewer count updated: ${data.viewers}`);
        }
      };

      socketRef.current.on('viewerCountUpdate', handleViewerCountUpdate);

      return () => {
        if (socketRef.current) {
          socketRef.current.off('viewerCountUpdate', handleViewerCountUpdate);
        }
      };
    }
  }, [streamId, socketRef.current]);

  // Check stream status periodically
  useEffect(() => {
    if (!streamId || !isConnected) return;
    
    const statusInterval = setInterval(async () => {
      const streamEnded = await checkStreamStatus();
      if (streamEnded) {
        clearInterval(statusInterval);
      }
    }, 5000);
    
    return () => clearInterval(statusInterval);
  }, [streamId, isConnected]);

  const fetchStreamData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/livestream/detail/${streamId}`);
      
      if (response.ok) {
        const data = await response.json();
        setStreamData(data.data);
        setViewers(data.data.viewers || 0);
        
        if (data.data.status === 'active') {
          try {
            await connectToStream();
          } catch (err) {
            console.error('WebRTC connection failed:', err);
            if (data.data.recordingPath) {
              setStreamData(prev => prev ? { ...prev, status: 'recording' } : null);
            } else {
              setError('Gagal terhubung ke live stream. Pastikan admin sedang streaming dan coba lagi.');
            }
          }
        } else if (data.data.status === 'ended') {
          if (data.data.recordingPath) {
            setStreamData(prev => prev ? { ...prev, status: 'recording' } : null);
          } else {
            setTimeout(async () => {
              try {
                const retryResponse = await fetch(`${API_URL}/api/livestream/detail/${streamId}`);
                if (retryResponse.ok) {
                  const retryData = await retryResponse.json();
                  if (retryData.data.recordingPath) {
                    setStreamData(prev => prev ? { ...prev, status: 'recording', recordingPath: retryData.data.recordingPath } : null);
                  } else {
                    setError('Live stream sudah berakhir. Recording sedang diproses, silakan coba lagi dalam beberapa saat.');
                  }
                }
              } catch (retryErr) {
                console.error('Retry failed:', retryErr);
                setError('Live stream sudah berakhir. Recording sedang diproses, silakan coba lagi dalam beberapa saat.');
              }
            }, 3000);
          }
        } else if (data.data.status === 'recording') {
          setStreamData(prev => prev ? { ...prev, status: 'recording' } : null);
        } else {
          setError('Status live stream tidak valid atau tidak dikenali.');
        }
      } else {
        setError('Live stream tidak ditemukan atau sudah berakhir');
      }
    } catch (err) {
      setError('Gagal memuat live stream');
      console.error('Error fetching stream data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Network quality monitoring
  const startNetworkMonitoring = () => {
    if (networkMonitorRef.current) {
      clearInterval(networkMonitorRef.current);
    }
    
    networkMonitorRef.current = setInterval(() => {
      if (consumerRef.current && consumerTransportRef.current) {
        try {
          const stats = consumerRef.current.getStats();
          if (stats && stats.length > 0) {
            const videoStats = stats.find((stat: any) => stat.type === 'inbound-rtp' && stat.kind === 'video');
            if (videoStats) {
              const bitrate = videoStats.bytesReceived * 8 / 1000;
              setCurrentBitrate(bitrate);
              
              if (bitrate > 2000 && (!videoStats.packetsLost || videoStats.packetsLost < 5)) {
                setNetworkQuality('good');
              } else if (bitrate > 1000 && (!videoStats.packetsLost || videoStats.packetsLost < 15)) {
                setNetworkQuality('fair');
              } else {
                setNetworkQuality('poor');
              }
              
              if (bitrate === 0 || videoStats.packetsLost > 50) {
                console.warn('Stream quality degraded, attempting recovery...');
                setError('Kualitas stream menurun. Mencoba perbaikan...');
                setTimeout(() => {
                  if (streamId) {
                    connectToStream();
                  }
                }, 3000);
              }
              
              if (videoStats.packetsLost > 20 || bitrate < 500) {
                console.warn('Delay accumulation detected, attempting recovery...');
                if (videoRef.current && videoRef.current.readyState >= 2) {
                  const buffered = videoRef.current.buffered;
                  if (buffered.length > 0) {
                    const bufferEnd = buffered.end(buffered.length - 1);
                    const currentTime = videoRef.current.currentTime;
                    const bufferSize = bufferEnd - currentTime;
                    
                    if (bufferSize > 15) {
                      console.log('Large buffer detected, performing gentle reset...');
                      videoRef.current.currentTime = bufferEnd - 5;
                    }
                  }
                }
              }
            }
          }
        } catch (error) {
          console.warn('Error getting network stats:', error);
        }
      }
    }, 5000);
  };

  const startBufferReset = () => {
    if (bufferResetRef.current) {
      clearInterval(bufferResetRef.current);
    }
    
    bufferResetRef.current = setInterval(() => {
      if (streamStartTime && videoRef.current) {
        const currentTime = Date.now();
        const streamDuration = currentTime - streamStartTime;
        
        if (streamDuration > 0 && streamDuration % 300000 < 10000) {
          console.log('Performing gentle buffer reset to prevent delay...');
          
          if (videoRef.current && videoRef.current.readyState >= 2) {
            const currentTime = videoRef.current.currentTime;
            const buffered = videoRef.current.buffered;
            
            if (buffered.length > 0) {
              const bufferEnd = buffered.end(buffered.length - 1);
              const bufferSize = bufferEnd - currentTime;
              
              if (bufferSize > 10) {
                console.log('Buffer too large, performing gentle reset...');
                videoRef.current.currentTime = bufferEnd - 2;
              }
            }
          }
        }
      }
    }, 30000);
  };

  const checkStreamStatus = async () => {
    if (!streamId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/livestream/detail/${streamId}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.data) {
          if (data.data.status === 'ended' || data.data.status === 'recording') {
            setShowStreamEndedModal(true);
            if (videoRef.current) {
              videoRef.current.pause();
            }
            setIsConnected(false);
            return true;
          }
        }
      }
    } catch (error) {
      console.error('Error checking stream status:', error);
    }
  };

  const connectToStream = async () => {
    try {
      const connectionTimeout = setTimeout(() => {
        console.log('WebRTC connection timeout');
        setError('Timeout terhubung ke live stream. Pastikan admin sedang streaming dan coba lagi.');
      }, 10000);
      
      socketRef.current = io('http://192.168.1.15:4000');
      
      socketRef.current.on('connect', async () => {
        console.log('Connected to MediaSoup server');
        setIsConnected(true);
        clearTimeout(connectionTimeout);
        
        socketRef.current.on('viewerCountUpdate', (data: { roomId: string; viewers: number }) => {
          if (data.roomId === streamId) {
            setViewers(data.viewers);
            console.log(`[ViewerPage] Viewer count updated: ${data.viewers}`);
          }
        });
        
        console.log('Checking producer for room:', streamId);
        const producerCheck: any = await Promise.race([
          new Promise((resolve) => {
            socketRef.current.emit('checkProducer', { roomId: streamId }, resolve);
          }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Producer check timeout')), 5000);
          })
        ]).catch((error) => {
          console.error('Producer check failed:', error);
          return { hasVideoProducer: false, hasAudioProducer: false, error: error.message };
        });
        
        if (!producerCheck.hasVideoProducer) {
          console.log('No video producer found for live stream');
          setError('Admin belum memulai streaming. Silakan tunggu atau hubungi admin untuk memulai live stream.');
          return;
        }
        
        const rtpCapabilities = await new Promise((resolve) => {
          socketRef.current.emit('getRtpCapabilities', null, resolve);
        });
        
        deviceRef.current = new mediasoupClient.Device();
        await deviceRef.current.load({ routerRtpCapabilities: rtpCapabilities });
        
        const transportParams = await new Promise((resolve) => {
          socketRef.current.emit('createConsumerTransport', null, resolve);
        });
        
        const consumerTransport = deviceRef.current.createRecvTransport(transportParams);
        consumerTransportRef.current = consumerTransport;
        
        consumerTransport.on('connect', async ({ dtlsParameters }: any, callback: any, errback: any) => {
          try {
            await new Promise((resolve) => {
              socketRef.current.emit('connectConsumerTransport', { dtlsParameters }, resolve);
            });
            callback();
          } catch (err) {
            errback(err);
          }
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        console.log('Attempting to consume stream for room:', streamId);
        let consumeParams: any = null;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries && (!consumeParams || consumeParams.error)) {
          if (retryCount > 0) {
            console.log(`Retry ${retryCount} for consume...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          consumeParams = await new Promise((resolve) => {
            socketRef.current.emit('consume', { 
              transportId: consumerTransport.id,
              rtpCapabilities: deviceRef.current.rtpCapabilities,
              roomId: streamId 
            }, resolve);
          });
          
          retryCount++;
        }
        
        if (consumeParams && !consumeParams.error) {
          const consumers = consumeParams.consumers || (Array.isArray(consumeParams) ? consumeParams : [consumeParams]);
          
          const videoConsumer = consumers.find((c: any) => c.kind === 'video');
          const audioConsumer = consumers.find((c: any) => c.kind === 'audio');
          
          const tracks = [];
          let videoConsumerRef = null;
          let audioConsumerLocal = null;
          
          if (videoConsumer && videoConsumer.producerId) {
            try {
              videoConsumerRef = await consumerTransport.consume({
                id: videoConsumer.id,
                producerId: videoConsumer.producerId,
                kind: videoConsumer.kind,
                rtpParameters: videoConsumer.rtpParameters
              });
              tracks.push(videoConsumerRef.track);
            } catch (error) {
              console.error('Error creating video consumer:', error);
            }
          }
          
          if (audioConsumer && audioConsumer.producerId) {
            try {
              audioConsumerLocal = await consumerTransport.consume({
                id: audioConsumer.id,
                producerId: audioConsumer.producerId,
                kind: audioConsumer.kind,
                rtpParameters: audioConsumer.rtpParameters
              });
              
              if (audioConsumerLocal.track) {
                audioConsumerLocal.track.enabled = true;
              }
              
              tracks.push(audioConsumerLocal.track);
            } catch (error) {
              console.error('Error creating audio consumer:', error);
            }
          }
          
          consumerRef.current = videoConsumerRef;
          audioConsumerRef.current = audioConsumerLocal;
          
          if (tracks.length > 0 && videoRef.current) {
            const stream = new MediaStream(tracks);
            
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
              setHasAudio(true);
            } else {
              setHasAudio(false);
            }
            
            setIsConnected(true);
            
            if (videoRef.current) {
              try {
                videoRef.current.srcObject = stream;
              } catch (error) {
                console.error('Error assigning stream to video element:', error);
                setError('Gagal mengaitkan stream ke video element');
              }
            }
            
            startNetworkMonitoring();
            setStreamStartTime(Date.now());
            startBufferReset();
            
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.muted = false;
                videoRef.current.volume = 1.0;
                
                videoRef.current.play().then(() => {
                  console.log('Video started playing successfully');
                  
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                  }
                }).catch((error) => {
                  console.error('Error playing video:', error);
                });
              }
            }, 500);
          } else if (videoConsumer && !videoConsumer.producerId) {
            setError('Error: Video consumer tidak memiliki producerId. Silakan coba lagi.');
          } else if (!videoConsumer) {
            setError('Admin belum memulai streaming video. Silakan tunggu atau hubungi admin.');
          } else {
            setError('Gagal mengonsumsi stream.');
          }
        } else {
          setError('Gagal mengonsumsi stream: ' + (consumeParams?.error || 'Unknown error'));
        }
      });
      
      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from MediaSoup server');
        setIsConnected(false);
        setError('Koneksi ke server terputus. Mencoba menyambung kembali...');
        
        setTimeout(() => {
          if (streamId) {
            connectToStream();
          }
        }, 3000);
      });
      
      socketRef.current.on('newProducer', async ({ roomId, kind }: any) => {
        console.log('New producer detected:', { roomId, kind });
        if (roomId === streamId && deviceRef.current) {
          try {
            const consumeParams: any = await new Promise((resolve) => {
              socketRef.current.emit('consume', { 
                transportId: consumerTransportRef.current.id,
                rtpCapabilities: deviceRef.current.rtpCapabilities,
                roomId: streamId 
              }, resolve);
            });
            
            if (consumeParams && !consumeParams.error) {
              const consumers = Array.isArray(consumeParams) ? consumeParams : [consumeParams];
              const videoConsumer = consumers.find(c => c.kind === 'video');
              const audioConsumer = consumers.find(c => c.kind === 'audio');
              
              const tracks = [];
              
              if (videoConsumer && !consumerRef.current) {
                const videoConsumerRef = await consumerTransportRef.current.consume({
                  id: videoConsumer.id,
                  producerId: videoConsumer.producerId,
                  kind: videoConsumer.kind,
                  rtpParameters: videoConsumer.rtpParameters
                });
                consumerRef.current = videoConsumerRef;
                tracks.push(videoConsumerRef.track);
              }
              
              if (audioConsumer) {
                const audioConsumerRef = await consumerTransportRef.current.consume({
                  id: audioConsumer.id,
                  producerId: audioConsumer.producerId,
                  kind: audioConsumer.kind,
                  rtpParameters: audioConsumer.rtpParameters
                });
                tracks.push(audioConsumerRef.track);
              }
              
              if (tracks.length > 0 && videoRef.current) {
                const stream = new MediaStream(tracks);
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(console.error);
                console.log('Updated stream with new producer:', kind);
              }
            }
          } catch (err) {
            console.error('Error consuming new producer:', err);
          }
        }
      });
      
    } catch (err) {
      console.error('Error connecting to stream:', err);
      setError('Gagal terhubung ke live stream. Pastikan admin sedang streaming dan coba lagi.');
    }
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatViewers = (count: number) => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)} jt`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)} rb`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: COLORS.surface,
        fontFamily: FONT_FAMILY,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: `4px solid ${COLORS.border}`,
            borderTop: `4px solid ${COLORS.red}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ fontSize: '16px', color: COLORS.text, fontWeight: 500 }}>
            Memuat live stream...
          </div>
        </div>
      </div>
    );
  }

  if (error || !streamData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: COLORS.surface,
        fontFamily: FONT_FAMILY,
      }}>
        <div style={{
          background: COLORS.surface,
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          margin: '0 20px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>📺</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 500,
            color: COLORS.text,
            margin: '0 0 16px 0'
          }}>
            Live Stream Tidak Tersedia
          </h1>
          <p style={{
            fontSize: '16px',
            color: COLORS.textSecondary,
            margin: '0 0 24px 0',
            lineHeight: 1.5
          }}>
            {error || 'Live stream yang Anda cari tidak ditemukan atau sudah berakhir.'}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: COLORS.red,
                color: COLORS.surface,
                border: 'none',
                borderRadius: '18px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = COLORS.redDark}
              onMouseOut={e => e.currentTarget.style.background = COLORS.red}
            >
              🔄 Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: COLORS.surface,
      fontFamily: FONT_FAMILY,
      color: COLORS.text,
    }}>
      {/* YouTube-like Header */}
      <div style={{
        background: COLORS.surface,
        padding: '0 16px',
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: '56px',
        borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flex: 1,
          minWidth: 0
        }}>
          {/* Logo/Title */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            cursor: 'pointer'
          }}>
            <img 
              src="/assets/umalo.png" 
              alt="Umalo" 
              style={{
                height: '40px',
                width: 'auto',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>

        {/* Right side - Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {streamData.status === 'active' && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: COLORS.red,
              color: COLORS.surface,
              borderRadius: '18px',
              fontSize: '12px',
              fontWeight: 500
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: COLORS.surface,
                animation: 'pulse 1s infinite'
              }} />
              LIVE
            </div>
          )}
        </div>
      </div>

      {/* Main Content - YouTube Layout */}
      <div 
        ref={containerRef}
        style={{
          width: '100%',
          maxWidth: '100%',
          margin: '0 auto',
          paddingTop: '24px',
          paddingBottom: '40px',
          paddingLeft: '24px',
          paddingRight: showChatSidebar ? '424px' : '24px', // 400px sidebar + 24px margin
          transition: 'padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          boxSizing: 'border-box'
        }}
      >
        {/* Video Container */}
        <div style={{
          width: '100%',
          maxWidth: '100%',
        }}>
          {/* Video Player */}
          {streamData.status === 'active' ? (
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <video
                ref={videoRef}
                autoPlay
                controls
                playsInline
                muted={false}
                preload="none"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  console.error('Video load error:', e);
                  setError('Gagal memuat video live stream');
                }}
              >
                Browser Anda tidak mendukung video player.
              </video>
              
              {!isConnected && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0, 0, 0, 0.8)',
                  color: COLORS.surface,
                  padding: '20px',
                  borderRadius: '8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>🔄</div>
                  <div>Menghubungkan ke live stream...</div>
                </div>
              )}

              {/* Live Badge on Video */}
              <div style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                background: COLORS.red,
                color: COLORS.surface,
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: COLORS.surface,
                  animation: 'pulse 1s infinite'
                }} />
                LIVE
              </div>

              {/* Chat Toggle Button - Small Icon (YouTube Style) */}
              {!showChatSidebar && (
                <button
                  onClick={() => {
                    setShowChatSidebar(true);
                    setUnreadMessages(0);
                  }}
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    background: 'rgba(0, 0, 0, 0.8)',
                    backdropFilter: 'blur(10px)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '48px',
                    height: '48px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '20px',
                    fontWeight: 400,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s ease',
                    zIndex: 10
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                  }}
                  title="Buka Live Chat"
                >
                  💬
                  {unreadMessages > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      background: COLORS.red,
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      border: '2px solid #000000',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                    }}>
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : (streamData.status === 'ended' || streamData.status === 'recording') && streamData.recordingPath ? (
            <div style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              background: '#000',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '16px'
            }}>
              <video
                ref={videoRef}
                controls
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
                src={`${API_URL}${streamData.recordingPath}`}
                onError={(e) => {
                  console.error('Video load error:', e);
                  setError('Gagal memuat recording');
                }}
              >
                Browser Anda tidak mendukung video player.
              </video>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              aspectRatio: '16/9',
              background: COLORS.hover,
              borderRadius: '12px',
              color: COLORS.textSecondary,
              fontSize: '16px',
              marginBottom: '16px'
            }}>
              Live stream sudah berakhir dan tidak ada recording tersedia
            </div>
          )}

          {/* Video Info Section - YouTube Style */}
          {streamData.status === 'active' && (
            <div style={{
              padding: '0 4px',
              marginBottom: '24px'
            }}>
              {/* Title */}
              <h1 style={{
                fontSize: '20px',
                fontWeight: 500,
                lineHeight: '28px',
                color: COLORS.text,
                margin: '0 0 12px 0',
                wordBreak: 'break-word'
              }}>
                {streamData.title || 'Live Stream'}
              </h1>

              {/* Video Metadata */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '12px',
                borderBottom: `1px solid ${COLORS.border}`,
                marginBottom: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  fontSize: '14px',
                  color: COLORS.textSecondary
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>👥</span>
                    <span style={{ fontWeight: 500, color: COLORS.text }}>{formatViewers(viewers)}</span>
                    <span>penonton</span>
                  </div>
                  {streamData.startTime && (
                    <div>
                      Dimulai {new Date(streamData.startTime).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div style={{
                background: COLORS.hover,
                borderRadius: '12px',
                padding: '16px',
                fontSize: '14px',
                lineHeight: '20px',
                color: COLORS.text,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                <div style={{ fontWeight: 500, marginBottom: '8px', color: COLORS.text }}>
                  Tentang Live Stream
                </div>
                <div style={{ color: COLORS.textSecondary }}>
                  {streamData.title ? `Streaming langsung: ${streamData.title}` : 'Live streaming sedang berlangsung. Nikmati tayangan langsung!'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Sidebar - Fixed Position (Outside Main Container) */}
      {streamData.status === 'active' && (
        <ChatSidebar
          isOpen={showChatSidebar}
          onToggle={() => {
            setShowChatSidebar(!showChatSidebar);
            if (showChatSidebar) {
              setUnreadMessages(0);
            }
          }}
          streamId={streamId || ''}
          socket={chatSocketRef.current}
          currentUsername={username}
          isAdmin={false}
          readOnly={false}
          onNewMessage={() => {
            if (!showChatSidebar) {
              setUnreadMessages(prev => prev + 1);
            }
          }}
        />
      )}

      {/* Stream Ended Modal */}
      {showStreamEndedModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: COLORS.surface,
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📺</div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 500,
              color: COLORS.text,
              margin: '0 0 16px 0'
            }}>
              Livestream Berakhir
            </h2>
            <p style={{
              fontSize: '14px',
              color: COLORS.textSecondary,
              margin: '0 0 24px 0',
              lineHeight: '1.5'
            }}>
              Admin telah mengakhiri livestream. Terima kasih telah menonton!
            </p>
            <button
              onClick={() => {
                setShowStreamEndedModal(false);
                window.location.reload();
              }}
              style={{
                background: COLORS.red,
                color: COLORS.surface,
                border: 'none',
                borderRadius: '18px',
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = COLORS.redDark;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = COLORS.red;
              }}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default ViewerPage;
