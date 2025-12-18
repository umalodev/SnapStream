import React, { useEffect, useState, useCallback, useMemo, useRef} from 'react';
import { FaTh, FaSquare, FaColumns, FaCheck, FaTimes, FaRedo, FaStar, FaVideo, FaPlay, FaCamera, FaTimes as FaClose, FaArrowsAlt, FaDesktop } from 'react-icons/fa';
import BasicLayoutEditor from './BasicLayoutEditor';

interface CameraDevice {
  deviceId: string;
  label: string;
  kind: string;
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

interface MultiCameraRecorderProps {
  onStartRecording: (selectedCameras: string[], layoutType: LayoutType, judul: string, customLayout?: CameraLayout[], cameras?: CameraDevice[], screenSource?: ScreenSource) => void;
  onStatusUpdate: (status: string) => void;
  onClose?: () => void;
}

const MultiCameraRecorder: React.FC<MultiCameraRecorderProps> = ({
  onStartRecording,
  onStatusUpdate,
  onClose
}) => {
  const [availableCameras, setAvailableCameras] = useState<CameraDevice[]>([]);
  const [selectedCameras, setSelectedCameras] = useState<string[]>([]);
  const [layoutType, setLayoutType] = useState<LayoutType>('pip');
  const [recordingJudul, setRecordingJudul] = useState('');
  const [isLoadingCameras, setIsLoadingCameras] = useState(false);
  const [showLayoutEditor, setShowLayoutEditor] = useState(false);
  const [customLayouts, setCustomLayouts] = useState<CameraLayout[]>([]);
  const [savedLayouts, setSavedLayouts] = useState<CameraLayout[]>([]);
  const [includeScreenRecording, setIncludeScreenRecording] = useState(false);
  const [availableScreens, setAvailableScreens] = useState<ScreenSource[]>([]);
  const [selectedScreen, setSelectedScreen] = useState<ScreenSource | null>(null);
  const [isLoadingScreens, setIsLoadingScreens] = useState(false);
  // Guard agar init hanya jalan sekali (hindari spam)
const initializedRef = useRef(false);


  // Detect available cameras
  const getAvailableCameras = useCallback(async () => {
    if (isLoadingCameras) return; // Prevent multiple calls
    
    try {
      setIsLoadingCameras(true);
      // Defer status update to avoid updating parent during render
      setTimeout(() => onStatusUpdate('Mendeteksi kamera yang tersedia...'), 0);
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        throw new Error('Enumerate devices tidak didukung di browser ini');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Kamera ${device.deviceId.slice(0, 8)}`,
          kind: device.kind
        }));

      setAvailableCameras(cameras);
      setTimeout(() => onStatusUpdate(`Ditemukan ${cameras.length} kamera`), 0);
      
      console.log('Available cameras:', cameras);
    } catch (error: any) {
      console.error('Error getting cameras:', error);
      setTimeout(() => onStatusUpdate('Gagal mendeteksi kamera: ' + error.message), 0);
    } finally {
      setIsLoadingCameras(false);
    }
  }, [onStatusUpdate, isLoadingCameras]);


  // Detect available screen sources
  const getAvailableScreens = useCallback(async () => {
    if (isLoadingScreens) return;
    
    try {
      setIsLoadingScreens(true);
      // Defer status update to avoid updating parent during render
      setTimeout(() => onStatusUpdate('Mendeteksi layar yang tersedia...'), 0);
      
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
        setTimeout(() => onStatusUpdate(`Ditemukan ${screenSources.length} layar/jendela`), 0);
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
        setTimeout(() => onStatusUpdate('Screen recording tersedia - pilih sumber yang diinginkan'), 0);
      } else {
        setAvailableScreens([]);
        setTimeout(() => onStatusUpdate('Screen recording tidak didukung di browser ini'), 0);
      }
    } catch (error: any) {
      console.error('Error getting screen sources:', error);
      setTimeout(() => onStatusUpdate('Gagal mendeteksi layar: ' + error.message), 0);
      setAvailableScreens([]);
    } finally {
      setIsLoadingScreens(false);
    }
  }, [onStatusUpdate]);

  // Toggle camera selection
  const toggleCameraSelection = useCallback((deviceId: string) => {
    setSelectedCameras(prev => {
      const isSelected = prev.includes(deviceId);
      const newSelected = isSelected
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId];
      
      // Defer status update to avoid updating parent during render
      setTimeout(() => onStatusUpdate(`${newSelected.length} kamera dipilih`), 0);
      return newSelected;
    });
}, [onStatusUpdate, isLoadingScreens]);

  // Handle custom layout change
 const handleLayoutChange = useCallback((layouts: CameraLayout[]) => {
  setCustomLayouts(layouts);
}, []);

  // Start recording
  const handleStartRecording = () => {
    if (selectedCameras.length === 0 && !includeScreenRecording) {
      setTimeout(() => onStatusUpdate('Pilih setidaknya satu kamera atau aktifkan screen recording'), 0);
      return;
    }

    if (selectedCameras.length > 4) {
      setTimeout(() => onStatusUpdate('Maksimal 4 kamera untuk recording'), 0);
      return;
    }

    if (!recordingJudul.trim()) {
      setTimeout(() => onStatusUpdate('Judul recording harus diisi!'), 0);
      return;
    }

    if (layoutType === 'custom' && customLayouts.length === 0) {
      setTimeout(() => onStatusUpdate('Atur layout kamera terlebih dahulu!'), 0);
      return;
    }

    if (includeScreenRecording && !selectedScreen) {
      setTimeout(() => onStatusUpdate('Pilih layar untuk screen recording!'), 0);
      return;
    }

    // Get selected camera devices
    const selectedCameraDevices = availableCameras.filter(camera => 
      selectedCameras.includes(camera.deviceId)
    );
    
    onStartRecording(
      selectedCameras, 
      layoutType, 
      recordingJudul, 
      layoutType === 'custom' ? customLayouts : undefined, 
      selectedCameraDevices,
      includeScreenRecording && selectedScreen ? selectedScreen : undefined
    );
  };
    const closeLayoutEditor = useCallback(() => {
    setShowLayoutEditor(false);
  }, []);

  const filteredCameras = useMemo(() => {
    return availableCameras.filter(camera =>
      selectedCameras.includes(camera.deviceId)
    );
  }, [availableCameras, selectedCameras]);
  // Load saved layout on mount and when modal opens
  useEffect(() => {
    const savedLayout = localStorage.getItem('cameraLayout');
    if (savedLayout) {
      try {
        const parsedLayout = JSON.parse(savedLayout);
        setSavedLayouts(parsedLayout);
        // Also set customLayouts if we're in custom mode
        if (layoutType === 'custom') {
          setCustomLayouts(parsedLayout);
        }
      } catch (error) {
        console.error('Error parsing saved layout:', error);
      }
    }
  }, [layoutType, showLayoutEditor]);

  // Initialize cameras and screens on mount
 useEffect(() => {
  if (initializedRef.current) return;
  initializedRef.current = true;

  getAvailableCameras();
  getAvailableScreens();
}, [getAvailableCameras, getAvailableScreens]);

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
      <div style={{ 
        width: '90%', 
        maxWidth: '480px', 
        margin: '0 auto', 
        backgroundColor: 'white',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '12px', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FaCamera style={{ fontSize: '16px', color: 'black' }} />
          <h1 style={{ fontSize: '16px', fontWeight: '600', color: 'black', margin: 0 }}>Multi-Camera Recorder</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '6px 10px', 
              fontSize: '12px', 
              color: 'black', 
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FaClose style={{ fontSize: '12px' }} />
            Tutup
          </button>
        )}
      </div>

      {/* Notification Bar */}
      <div style={{ backgroundColor: '#facc15', padding: '6px 12px' }}>
        <p style={{ fontSize: '12px', fontWeight: '500', color: 'black', margin: 0 }}>
          Ditemukan {availableCameras.length} kamera{availableScreens.length > 0 ? ` dan ${availableScreens.length} layar` : ''}
        </p>
      </div>

      <div style={{ padding: '12px' }}>
        {/* Judul Recording Section */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <FaStar style={{ fontSize: '12px', color: 'black' }} />
            <h3 style={{ fontSize: '12px', fontWeight: '500', color: 'black', margin: 0 }}>Judul Recording</h3>
            <FaCamera style={{ fontSize: '12px', color: 'black', marginLeft: 'auto' }} />
          </div>
          
          <input
            type="text"
            value={recordingJudul}
            onChange={(e) => setRecordingJudul(e.target.value)}
            placeholder="Masukkan judul yang sesuai"
            style={{ 
              width: '100%', 
              padding: '10px', 
              border: '1px solid #d1d5db', 
              borderRadius: '6px', 
              fontSize: '13px',
              backgroundColor: 'white',
              outline: 'none'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'black';
              e.currentTarget.style.boxShadow = '0 0 0 1px black';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Pilih Kamera Section */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaCamera style={{ fontSize: '14px', color: 'black' }} />
              <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0 }}>Pilih Kamera</h3>
            </div>
            <button
              onClick={getAvailableCameras}
              disabled={isLoadingCameras}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                fontSize: '14px', 
                color: 'black', 
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 8px',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <FaRedo style={{ 
                fontSize: '14px', 
                animation: isLoadingCameras ? 'spin 1s linear infinite' : 'none'
              }} />
              Refresh
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
                    padding: '12px', 
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
                    onChange={() => toggleCameraSelection(camera.deviceId)}
                    style={{ 
                      width: '16px', 
                      height: '16px', 
                      accentColor: 'black'
                    }}
                  />
                  <span style={{ fontSize: '14px', color: 'black', flex: 1 }}>
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
                <FaDesktop style={{ fontSize: '14px', color: 'black' }} />
                <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0 }}>Screen Recorder</h3>
              </div>
              <button
                onClick={getAvailableScreens}
                disabled={isLoadingScreens}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '4px', 
                  fontSize: '14px', 
                  color: 'black', 
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <FaRedo style={{ 
                  fontSize: '14px', 
                  animation: isLoadingScreens ? 'spin 1s linear infinite' : 'none'
                }} />
                Refresh
              </button>
            </div>
            
            {/* Screen Recording Toggle */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px', 
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
                <span style={{ fontSize: '14px', color: 'black', flex: 1 }}>
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
                        padding: '12px', 
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
                        checked={isSelected}
                        onChange={() => setSelectedScreen(screen)}
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          accentColor: 'black'
                        }}
                      />
                      <span style={{ fontSize: '14px', color: 'black', flex: 1 }}>
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
            <FaTh style={{ fontSize: '14px', color: 'black' }} />
            <h3 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0 }}>
              Layout {includeScreenRecording ? 'Kamera & Layar' : 'Kamera'}
            </h3>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Picture-in-Picture Layout */}
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '12px', 
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
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0, marginBottom: '2px' }}>Picture-in-Picture</h4>
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
              padding: '12px', 
              border: `1px solid ${layoutType === 'custom' ? 'black' : '#d1d5db'}`,
              backgroundColor: layoutType === 'custom' ? '#f9fafb' : 'white',
              cursor: 'pointer',
              borderRadius: '6px',
              transition: 'all 0.2s'
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
                    justifyContent: 'center' 
                  }}>
                    <FaArrowsAlt style={{ fontSize: '16px', color: 'black' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: 'black', margin: 0, marginBottom: '2px' }}>Custom Layout</h4>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {includeScreenRecording ? 'Atur ukuran dan posisi kamera & layar secara bebas sesuai kebutuhan Anda. Seret dan ubah ukuran setiap elemen secara manual.' : 'Atur ukuran dan posisi kamera secara bebas sesuai kebutuhan Anda. Seret dan ubah ukuran setiap elemen secara manual.'}
                    </p>
                  </div>
                </div>
              </div>
            </label>
          </div>
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
                  fontSize: '14px', 
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
                <FaArrowsAlt style={{ fontSize: '14px' }} />
                Atur Layout
              </button>

            </div>
            
     
          </div>
        )}

        {/* Mulai Recording Button */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '16px' }}>
          <button
            onClick={handleStartRecording}
            disabled={
              (selectedCameras.length === 0 && !includeScreenRecording) || 
              !recordingJudul.trim() || 
              (layoutType === 'custom' && customLayouts.length === 0) ||
              (includeScreenRecording && !selectedScreen)
            }
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '12px 32px', 
              borderRadius: '6px', 
              fontSize: '14px', 
              fontWeight: '500',
              backgroundColor: (
                (selectedCameras.length === 0 && !includeScreenRecording) || 
                !recordingJudul.trim() || 
                (layoutType === 'custom' && customLayouts.length === 0) ||
                (includeScreenRecording && !selectedScreen)
              ) ? '#d1d5db' : '#f3f4f6',
              color: (
                (selectedCameras.length === 0 && !includeScreenRecording) || 
                !recordingJudul.trim() || 
                (layoutType === 'custom' && customLayouts.length === 0) ||
                (includeScreenRecording && !selectedScreen)
              ) ? '#6b7280' : 'black',
              border: (
                (selectedCameras.length === 0 && !includeScreenRecording) || 
                !recordingJudul.trim() || 
                (layoutType === 'custom' && customLayouts.length === 0) ||
                (includeScreenRecording && !selectedScreen)
              ) ? 'none' : '1px solid #d1d5db',
              cursor: (
                (selectedCameras.length === 0 && !includeScreenRecording) || 
                !recordingJudul.trim() || 
                (layoutType === 'custom' && customLayouts.length === 0) ||
                (includeScreenRecording && !selectedScreen)
              ) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              const isValid = (
                (selectedCameras.length > 0 || includeScreenRecording) && 
                recordingJudul.trim() && 
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
                recordingJudul.trim() && 
                !(layoutType === 'custom' && customLayouts.length === 0) &&
                (!includeScreenRecording || selectedScreen)
              );
              if (isValid) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
          >
            <FaPlay style={{ fontSize: '14px' }} />
            Mulai Recording
          </button>
        </div>
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
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '0',
          maxWidth: '1000px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e5e7eb'
        }}>
         <BasicLayoutEditor
  cameras={filteredCameras}
  onLayoutChange={handleLayoutChange}
  onClose={closeLayoutEditor}
  initialLayouts={savedLayouts}
  screenSource={includeScreenRecording && selectedScreen ? selectedScreen : undefined}
/>

        </div>
      </div>
    )}
    </>
  );
};

export default MultiCameraRecorder;