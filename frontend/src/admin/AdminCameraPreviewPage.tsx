import React, { useState, useEffect, useRef } from 'react';
import CameraPreview from './CameraPreview';

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
}

interface CameraStream {
  deviceId: string;
  stream: MediaStream;
  label: string;
}

const AdminCameraPreviewPage: React.FC = () => {
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [activeStreams, setActiveStreams] = useState<CameraStream[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<string | null>(null);

  // Get available camera devices
  const getAvailableCameras = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Request permission first
      await navigator.mediaDevices.getUserMedia({ video: true });

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');

      setAvailableCameras(videoDevices);

      // Automatically start all camera streams
      await startAllCameraStreams(videoDevices);
    } catch (err) {
      console.error('Error getting cameras:', err);
      setError('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start all camera streams automatically
  const startAllCameraStreams = async (cameras: CameraDevice[]) => {
    // Stop existing streams first
    setActiveStreams(prev => {
      prev.forEach(streamData => {
        streamData.stream.getTracks().forEach(track => track.stop());
      });
      return [];
    });

    // Start all cameras
    const streamPromises = cameras.map(async (camera) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: camera.deviceId } },
          audio: false
        });

        const label = camera.label || `Kamera ${camera.deviceId.slice(0, 8)}`;

        return { deviceId: camera.deviceId, stream, label };
      } catch (err) {
        console.error(`Error starting camera ${camera.label}:`, err);
        return null;
      }
    });

    const streams = await Promise.all(streamPromises);
    const validStreams = streams.filter(stream => stream !== null) as CameraStream[];

    setActiveStreams(validStreams);
  };

  // Start camera stream
  const startCameraStream = async (deviceId: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false
      });

      const device = availableCameras.find(cam => cam.deviceId === deviceId);
      const label = device?.label || `Kamera ${deviceId.slice(0, 8)}`;

      setActiveStreams(prev => [...prev, { deviceId, stream, label }]);
    } catch (err) {
      console.error('Error starting camera stream:', err);
      setError(`Gagal memulai kamera: ${err}`);
    }
  };

  // Stop camera stream
  const stopCameraStream = (deviceId: string) => {
    const streamData = activeStreams.find(s => s.deviceId === deviceId);
    if (streamData) {
      streamData.stream.getTracks().forEach(track => track.stop());
      setActiveStreams(prev => prev.filter(s => s.deviceId !== deviceId));
    }
  };


  // Toggle camera selection and start/stop stream
  const toggleCameraSelection = async (deviceId: string) => {
    if (activeStreams.find(s => s.deviceId === deviceId)) {
      // If camera is active, stop it
      stopCameraStream(deviceId);
    } else {
      // If camera is not active, start it
      await startCameraStream(deviceId);
    }
  };

  // Toggle fullscreen for specific camera
  const toggleFullscreen = (deviceId: string) => {
    setIsFullscreen(isFullscreen === deviceId ? null : deviceId);
  };

  // Handle escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        setIsFullscreen(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeStreams.forEach(streamData => {
        streamData.stream.getTracks().forEach(track => track.stop());
      });
    };
  }, []);

  // Load cameras on component mount
  useEffect(() => {
    getAvailableCameras();
  }, []);

  return (
    <div style={{
      padding: '24px',
      background: '#f6f8fa',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 24px rgba(187,247,208,0.12)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1e293b',
              margin: '0 0 8px 0'
            }}>
              Preview Kamera
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#64748b',
              margin: '0'
            }}>
              Semua kamera yang terdeteksi akan ditampilkan otomatis
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={getAvailableCameras}
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                background: isLoading
                  ? "linear-gradient(135deg, #64748b 0%, #64748b 100%)"  // disabled abu-abu
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)", // hijau gradasi seperti recording
                color: "white",
                border: "none",
                borderRadius: 16,
                padding: "12px 18px",
                fontSize: 14,
                fontWeight: 600,
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
                boxShadow: isLoading
                  ? "none"
                  : "0 8px 20px rgba(16,185,129,0.35)",
                transition: "all 0.25s ease",
              }}
              onMouseOver={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 24px rgba(16,185,129,0.45)";
                }
              }}
              onMouseOut={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow =
                    "0 8px 20px rgba(16,185,129,0.35)";
                }
              }}
            >
              {isLoading ? (
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    border: "2px solid #ffffff40",
                    borderTop: "2px solid #ffffff",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                  }}
                />
              ) : (
                <span style={{ fontSize: 16 }}>🔄</span>
              )}
              Refresh Kamera
            </button>

          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              fontSize: '20px',
              color: '#ef4444'
            }}>
              ⚠️
            </div>
            <div style={{
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '500'
            }}>
              {error}
            </div>
          </div>
        )}

        {/* Loading or No Cameras Message */}
        {isLoading && (
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📹</div>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Mencari kamera...
            </p>
          </div>
        )}
        {!isLoading && availableCameras.length === 0 && activeStreams.length === 0 && (
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #e2e8f0',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📹</div>
            <p style={{ margin: '0', fontSize: '14px' }}>
              Tidak ada kamera yang ditemukan
            </p>
          </div>
        )}
      </div>

      {/* Camera Previews */}
      {activeStreams.length > 0 && (
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 4px 24px rgba(187,247,208,0.12)',
          border: '1px solid #e2e8f0'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#1e293b',
            margin: '0 0 20px 0'
          }}>
            Preview Kamera ({activeStreams.length})
          </h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isFullscreen ? '1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '20px'
          }}>
            {activeStreams.map((streamData) => (
              <div
                key={streamData.deviceId}
                style={{
                  position: 'relative',
                  background: '#000',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                  border: '2px solid #e5e7eb'
                }}
              >
                <CameraPreview
                  stream={streamData.stream}
                  streamTitle={streamData.label}
                  fullScreen={isFullscreen === streamData.deviceId}
                />

                {/* Fullscreen Exit Button - Top Center */}
                {isFullscreen === streamData.deviceId && (
                  <button
                    onClick={() => toggleFullscreen(streamData.deviceId)}
                    style={{
                      position: 'absolute',
                      top: '80px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'rgba(239, 68, 68, 0.9)',
                      color: 'white',
                      border: '3px solid rgba(255, 255, 255, 0.8)',
                      borderRadius: '16px',
                      padding: '16px 24px',
                      fontSize: '16px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      zIndex: 10001,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      boxShadow: '0 8px 32px rgba(239, 68, 68, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)',
                      textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(220, 38, 38, 1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 1)';
                      e.currentTarget.style.transform = 'translateX(-50%) scale(1.1)';
                      e.currentTarget.style.boxShadow = '0 12px 40px rgba(220, 38, 38, 0.6), 0 6px 20px rgba(0, 0, 0, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
                      e.currentTarget.style.boxShadow = '0 8px 32px rgba(239, 68, 68, 0.4), 0 4px 16px rgba(0, 0, 0, 0.3)';
                    }}
                    title="Keluar dari Full Screen (ESC)"
                  >
                    <span style={{ fontSize: '18px' }}>⤓</span>
                    <span>KELUAR DARI FULLSCREEN</span>
                  </button>
                )}

                {/* ESC Instruction Text - Top Left */}
                {isFullscreen === streamData.deviceId && (
                  <div style={{
                    position: 'fixed',
                    top: '20px',
                    left: '220px',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '400',
                    zIndex: 99999,
                    textAlign: 'left',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                    minWidth: '200px',
                    background: 'transparent'
                  }}>
                    Tekan ESC untuk keluar dari fullscreen
                  </div>
                )}

                {/* Camera Controls */}
                <div style={{
                  position: 'absolute',
                  bottom: '12px',
                  left: '12px',
                  right: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'transparent',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  zIndex: isFullscreen === streamData.deviceId ? 10000 : 'auto'
                }}>
                  <div style={{
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {streamData.label}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => toggleFullscreen(streamData.deviceId)}
                      style={{
                        background: 'transparent',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        fontWeight: isFullscreen === streamData.deviceId ? '600' : '400'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title={isFullscreen === streamData.deviceId ? 'Keluar dari Full Screen' : 'Masuk ke Full Screen'}
                    >
                      {isFullscreen === streamData.deviceId ? '⤓ Keluar' : '⤢ Fullscreen'}
                    </button>

                    <button
                      onClick={() => stopCameraStream(streamData.deviceId)}
                      style={{
                        background: 'transparent',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      Stop
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default AdminCameraPreviewPage;
