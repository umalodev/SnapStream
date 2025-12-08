import React, { useState, useEffect, useCallback } from 'react';
import { FaCamera, FaDesktop, FaTimes, FaSpinner, FaStar, FaTh, FaArrowsAlt, FaPlay } from 'react-icons/fa';
import BasicLayoutEditor from './BasicLayoutEditor';

interface CameraDevice {
  deviceId: string;
  label: string;
}

interface ScreenSource {
  id: string;
  name: string;
  type: string;
}

type LayoutType = 'pip' | 'custom';

interface CameraLayout {
  id: string;
  deviceId: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  enabled: boolean;
}

interface MultiCameraStreamerProps {
  onStartStreaming: (
    selectedCameras: string[],
    layoutType: string,
    streamJudul: string,
    customLayout?: CameraLayout[],
    selectedCameraDevices?: CameraDevice[],
    screenSource?: ScreenSource
  ) => void;
  onStatusUpdate: (message: string) => void;
  onClose: () => void;
}

const MultiCameraStreamer: React.FC<MultiCameraStreamerProps> = ({
  onStartStreaming,
  onStatusUpdate,
  onClose
}) => {
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [layoutType, setLayoutType] = useState<LayoutType>('pip');
  const [streamJudul, setStreamJudul] = useState('');
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const [customLayouts, setCustomLayouts] = useState<CameraLayout[]>([]);
  const [savedLayouts, setSavedLayouts] = useState<CameraLayout[]>([]);
  const [includeScreenRecording, setIncludeScreenRecording] = useState(false);
  const [availableScreens, setAvailableScreens] = useState<ScreenSource[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<ScreenSource | null>(null);
  const [isLoadingScreens, setIsLoadingScreens] = useState(false);

  // Detect available cameras
  const getAvailableCameras = useCallback(async () => {
    if (isLoadingCameras) return;
    
    try {
      setIsLoadingCameras(true);
      onStatusUpdate('Mendeteksi kamera yang tersedia...');
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Kamera ${device.deviceId.slice(0, 8)}`
        }));
      
      setAvailableCameras(videoDevices);
      onStatusUpdate(`Ditemukan ${videoDevices.length} kamera`);
    } catch (error: any) {
      console.error('Error getting cameras:', error);
      onStatusUpdate('Gagal mendeteksi kamera: ' + error.message);
      setAvailableCameras([]);
    } finally {
      setIsLoadingCameras(false);
    }
  }, [isLoadingCameras, onStatusUpdate]);

  // Detect available screen sources
  const getAvailableScreens = useCallback(async () => {
    if (isLoadingScreens) return;
    
    try {
      setIsLoadingScreens(true);
      onStatusUpdate('Mendeteksi layar yang tersedia...');
      
      const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
      
      if (isElectron && (window as any).electronAPI && (window as any).electronAPI.getScreenSources) {
        // Use Electron's desktopCapturer API
        const sources = await (window as any).electronAPI.getScreenSources();
        const screenSources = sources.map((source: any) => ({
          id: source.id,
          name: source.name,
          type: source.id.startsWith('screen:') ? 'screen' : 'window'
        }));
        setAvailableScreens(screenSources);
        onStatusUpdate(`Ditemukan ${screenSources.length} layar/jendela`);
      } else if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
        // For web browsers, provide multiple options
        const screenOptions = [
          {
            id: 'entire-screen',
            name: 'Entire screen (Layar)',
            type: 'screen'
          },
          {
            id: 'browser-tab',
            name: 'Browser Tab (Tab Chrome)',
            type: 'tab'
          },
          {
            id: 'application-window',
            name: 'Application Window (Jendela Aplikasi)',
            type: 'window'
          }
        ];
        setAvailableScreens(screenOptions);
        onStatusUpdate('Screen recording tersedia - pilih sumber yang diinginkan');
      } else {
        setAvailableScreens([]);
        onStatusUpdate('Screen recording tidak didukung di browser ini');
      }
    } catch (error: any) {
      console.error('Error getting screen sources:', error);
      onStatusUpdate('Gagal mendeteksi layar: ' + error.message);
      setAvailableScreens([]);
    } finally {
      setIsLoadingScreens(false);
    }
  }, [isLoadingScreens, onStatusUpdate]);

  // Load saved layouts
  useEffect(() => {
    if (layoutType === 'custom' && showLayoutEditor) {
      try {
        const savedLayout = localStorage.getItem('cameraLayout');
        if (savedLayout) {
          const parsedLayout = JSON.parse(savedLayout);
          setSavedLayouts(parsedLayout);
          setCustomLayouts(parsedLayout);
        }
      } catch (error) {
        console.error('Error parsing saved layout:', error);
      }
    }
  }, [layoutType, showLayoutEditor]);

  // Initialize cameras and screens on mount
  useEffect(() => {
    getAvailableCameras();
    getAvailableScreens();
  }, []); // Remove function dependencies to prevent infinite loop

  const handleStartStreaming = () => {
    if (selectedCameras.length === 0 && !includeScreenRecording) {
      onStatusUpdate('Pilih setidaknya satu kamera atau aktifkan screen recording');
      return;
    }

    if (!streamJudul.trim()) {
      onStatusUpdate('Judul streaming harus diisi');
      return;
    }

    const selectedCameraDevices = availableCameras.filter(camera => 
      selectedCameras.includes(camera.deviceId)
    );

    onStartStreaming(
      selectedCameras,
      layoutType,
      streamJudul,
      layoutType === 'custom' ? customLayouts : undefined,
      selectedCameraDevices,
      includeScreenRecording && selectedScreen ? selectedScreen : undefined
    );
  };

  const totalSources = selectedCameras.length + (includeScreenRecording ? 1 : 0);

  return (
    <>
    
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>


      {/* Notification Bar */}
      <div style={{ backgroundColor: '#facc15', padding: '6px 12px', marginBottom: '12px' }}>
        <p style={{ fontSize: '12px', fontWeight: '500', color: 'black', margin: 0 }}>
          Ditemukan {availableCameras.length} kamera{availableScreens.length > 0 ? ` dan ${availableScreens.length} layar` : ''}
        </p>
      </div>

      {/* Content */}
      <div>
        {/* Judul Stream Section */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <FaStar style={{ fontSize: '12px', color: 'black' }} />
            <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'black', margin: 0 }}>Judul Stream</h3>
            <FaCamera style={{ fontSize: '12px', color: 'black', marginLeft: 'auto' }} />
          </div>
          <input
            type="text"
            value={streamJudul}
            onChange={(e) => setStreamJudul(e.target.value)}
            placeholder="Masukkan judul yang sesuai"
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px', 
              fontSize: '12px',
              backgroundColor: 'white',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'black';
              e.target.style.boxShadow = '0 0 0 1px black';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Camera Selection */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCamera style={{ fontSize: '12px', color: 'black' }} />
              <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'black', margin: 0 }}>Pilih Kamera</h3>
            </div>
            <button
              onClick={getAvailableCameras}
              disabled={isLoadingCameras}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                fontSize: '12px', 
                color: 'black', 
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: isLoadingCameras ? 'not-allowed' : 'pointer',
                opacity: isLoadingCameras ? 0.6 : 1
              }}
            >
              {isLoadingCameras ? (
                <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                'Refresh'
              )}
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableCameras.map((camera, index) => {
              const isSelected = selectedCameras.includes(camera.deviceId);
              
              return (
                <label
                  key={camera.deviceId}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '10px', 
                    border: `1px solid ${isSelected ? 'black' : '#d1d5db'}`,
                    backgroundColor: isSelected ? '#f9fafb' : 'white',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#9ca3af';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCameras(prev => [...prev, camera.deviceId]);
                      } else {
                        setSelectedCameras(prev => prev.filter(id => id !== camera.deviceId));
                      }
                    }}
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      accentColor: 'black'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: 'black', flex: 1 }}>
                    {camera.label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Screen Recording Section */}
        {availableScreens.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FaDesktop style={{ fontSize: '12px', color: 'black' }} />
                <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'black', margin: 0 }}>Screen Recorder</h3>
              </div>
              <button
                onClick={getAvailableScreens}
                disabled={isLoadingScreens}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  fontSize: '12px', 
                  color: 'black', 
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: isLoadingScreens ? 'not-allowed' : 'pointer',
                  opacity: isLoadingScreens ? 0.6 : 1
                }}
              >
                {isLoadingScreens ? (
                  <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                ) : (
                  'Refresh'
                )}
              </button>
            </div>
            
            {/* Screen Recording Toggle */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '10px', 
                border: `1px solid ${includeScreenRecording ? 'black' : '#d1d5db'}`,
                backgroundColor: includeScreenRecording ? '#f9fafb' : 'white',
                cursor: 'pointer',
                borderRadius: '6px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!includeScreenRecording) {
                  e.currentTarget.style.borderColor = '#9ca3af';
                }
              }}
              onMouseLeave={(e) => {
                if (!includeScreenRecording) {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }
              }}>
                <input
                  type="checkbox"
                  checked={includeScreenRecording}
                  onChange={(e) => setIncludeScreenRecording(e.target.checked)}
                  style={{ 
                    width: '16px', 
                    height: '16px', 
                    accentColor: 'black'
                  }}
                />
                <span style={{ fontSize: '12px', color: 'black', flex: 1 }}>
                  Aktifkan Screen Recorder
                </span>
              </label>
            </div>

            {/* Screen Selection */}
            {includeScreenRecording && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availableScreens.map((screen, index) => {
                  const isSelected = selectedScreen?.id === screen.id;
                  
                  return (
                    <label
                      key={screen.id}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px', 
                        padding: '10px', 
                        border: `1px solid ${isSelected ? 'black' : '#d1d5db'}`,
                        backgroundColor: isSelected ? '#f9fafb' : 'white',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#9ca3af';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.borderColor = '#d1d5db';
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name="screen"
                        value={screen.id}
                        checked={isSelected}
                        onChange={() => setSelectedScreen(screen)}
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          accentColor: 'black'
                        }}
                      />
                      <span style={{ fontSize: '12px', color: 'black', flex: 1 }}>
                        {screen.name} ({screen.type === 'screen' ? 'Layar' : 'Jendela'})
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Layout Section */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <FaTh style={{ fontSize: '12px', color: 'black' }} />
            <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'black', margin: 0 }}>
              Layout {includeScreenRecording ? 'Kamera & Layar' : 'Kamera'}
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Picture-in-Picture Layout */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px', 
              border: `1px solid ${layoutType === 'pip' ? 'black' : '#d1d5db'}`,
              backgroundColor: layoutType === 'pip' ? '#f9fafb' : 'white',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (layoutType !== 'pip') {
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              if (layoutType !== 'pip') {
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}>
              <input
                type="radio"
                name="layout"
                value="pip"
                checked={layoutType === 'pip'}
                onChange={() => setLayoutType('pip')}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  accentColor: 'black'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    border: '1px solid black', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px' }}>
                      <rect x="2" y="2" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                      <rect x="14" y="14" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: '500', color: 'black', margin: 0, marginBottom: '2px' }}>Picture-in-Picture</h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {includeScreenRecording 
                        ? 'Satu sumber utama (kamera atau layar) menempati layar penuh, sumber lainnya muncul sebagai jendela kecil di pojok. Layar akan otomatis menjadi konten utama.' 
                        : 'Satu kamera utama menempati sebagian besar layar, kamera lainnya muncul sebagai thumbnail kecil di sisi layar.'}
                    </p>
                  </div>
                </div>
              </div>
            </label>

            {/* Custom Layout */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px', 
              border: `1px solid ${layoutType === 'custom' ? 'black' : '#d1d5db'}`,
              backgroundColor: layoutType === 'custom' ? '#f9fafb' : 'white',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s',
              marginBottom: '15px'
            }}
            onMouseEnter={(e) => {
              if (layoutType !== 'custom') {
                e.currentTarget.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              if (layoutType !== 'custom') {
                e.currentTarget.style.borderColor = '#d1d5db';
              }
            }}>
              <input
                type="radio"
                name="layout"
                value="custom"
                checked={layoutType === 'custom'}
                onChange={() => setLayoutType('custom')}
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  accentColor: 'black'
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    border: '1px solid black', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                  }}>
                    <FaArrowsAlt style={{ fontSize: '16px', color: 'black' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '12px', fontWeight: '500', color: 'black', margin: 0, marginBottom: '2px' }}>Custom Layout</h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {includeScreenRecording ? 'Atur ukuran dan posisi kamera & layar secara bebas sesuai kebutuhan Anda. Seret dan ubah ukuran setiap elemen secara manual.' : 'Atur ukuran dan posisi kamera secara bebas sesuai kebutuhan Anda. Seret dan ubah ukuran setiap elemen secara manual.'}
                    </p>
                  </div>
                </div>
              </div>
            </label>
          </div>

          {/* Custom Layout Buttons */}
          {layoutType === 'custom' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <button
                  onClick={() => {
                    // Load saved layout before opening editor
                    const savedLayout = localStorage.getItem('cameraLayout');
                    if (savedLayout) {
                      try {
                        const parsedLayout = JSON.parse(savedLayout);
                        setCustomLayouts(parsedLayout);
                        setSavedLayouts(parsedLayout);
                      } catch (error) {
                        console.error('Error parsing saved layout:', error);
                      }
                    }
                    setShowLayoutEditor(true);
                  }}
                  disabled={selectedCameras.length === 0}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '12px 24px', 
                    borderRadius: '6px', 
                    fontSize: '12px', 
                    fontWeight: '500',
                    backgroundColor: selectedCameras.length === 0 ? '#d1d5db' : '#3b82f6',
                    color: selectedCameras.length === 0 ? '#6b7280' : 'white',
                    border: 'none',
                    cursor: selectedCameras.length === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    flex: 1,
                    justifyContent: 'center'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedCameras.length > 0) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedCameras.length > 0) {
                      e.currentTarget.style.backgroundColor = '#3b82f6';
                    }
                  }}
                >
                  <FaArrowsAlt style={{ fontSize: '12px' }} />
                  Atur Layout
                </button>
                
                {(savedLayouts.length > 0 || customLayouts.length > 0) && (
                  <button
                    onClick={() => {
                      const layoutToLoad = customLayouts.length > 0 ? customLayouts : savedLayouts;
                      setCustomLayouts(layoutToLoad);
                      onStatusUpdate('Layout tersimpan telah dimuat!');
                    }}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      padding: '12px 16px', 
                      borderRadius: '6px', 
                      fontSize: '12px', 
                      fontWeight: '500',
                      backgroundColor: '#10b981',
                      color: 'white',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                  >
                    💾 Muat Layout
                  </button>
                )}
              </div>
              
              {(savedLayouts.length > 0 || customLayouts.length > 0) && (
                <div style={{ 
                  padding: '8px 12px', 
                  backgroundColor: '#f0f9ff', 
                  border: '1px solid #0ea5e9', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  color: '#0369a1'
                }}>
                  Layout tersimpan tersedia ({customLayouts.length > 0 ? customLayouts.length : savedLayouts.length} kamera)
                </div>
              )}
            </div>
          )}
        </div>
     

        {/* Mulai Streaming Button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
          <button
            onClick={handleStartStreaming}
            disabled={
              (selectedCameras.length === 0 && !includeScreenRecording) || 
              !streamJudul.trim() || 
              (layoutType === 'custom' && customLayouts.length === 0) ||
              (includeScreenRecording && !selectedScreen)
            }
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px 32px', 
              borderRadius: '6px', 
              fontSize: '12px', 
              fontWeight: '500',
              backgroundColor: (
                (selectedCameras.length === 0 && !includeScreenRecording) || 
                !streamJudul.trim() || 
                (layoutType === 'custom' && customLayouts.length === 0) ||
                (includeScreenRecording && !selectedScreen)
              ) ? '#d1d5db' : '#f3f4f6',
              color: (
                (selectedCameras.length === 0 && !includeScreenRecording) || 
                !streamJudul.trim() || 
                (layoutType === 'custom' && customLayouts.length === 0) ||
                (includeScreenRecording && !selectedScreen)
              ) ? '#6b7280' : 'black',
              border: (
                (selectedCameras.length === 0 && !includeScreenRecording) || 
                !streamJudul.trim() || 
                (layoutType === 'custom' && customLayouts.length === 0) ||
                (includeScreenRecording && !selectedScreen)
              ) ? 'none' : '1px solid #d1d5db',
              cursor: (
                (selectedCameras.length === 0 && !includeScreenRecording) || 
                !streamJudul.trim() || 
                (layoutType === 'custom' && customLayouts.length === 0) ||
                (includeScreenRecording && !selectedScreen)
              ) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              const isValid = (
                (selectedCameras.length > 0 || includeScreenRecording) && 
                streamJudul.trim() && 
                !(layoutType === 'custom' && customLayouts.length === 0) &&
                (!includeScreenRecording || selectedScreen)
              );
              if (isValid) {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
              }
            }}
            onMouseLeave={(e) => {
              const isValid = (
                (selectedCameras.length > 0 || includeScreenRecording) && 
                streamJudul.trim() && 
                !(layoutType === 'custom' && customLayouts.length === 0) &&
                (!includeScreenRecording || selectedScreen)
              );
              if (isValid) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
          >
            <FaPlay style={{ fontSize: '12px' }} />
            Mulai Streaming
          </button>
        </div>
      </div>

      {/* Layout Editor Modal */}
      {showLayoutEditor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <BasicLayoutEditor
              cameras={availableCameras.filter(camera => selectedCameras.includes(camera.deviceId))}
              onLayoutChange={setCustomLayouts}
              onClose={() => setShowLayoutEditor(false)}
              initialLayouts={savedLayouts}
              screenSource={includeScreenRecording && selectedScreen ? selectedScreen : undefined}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default MultiCameraStreamer;
