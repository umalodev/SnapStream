import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FaArrowsAlt, FaExpand, FaTimes } from 'react-icons/fa';

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

interface BasicLayoutEditorProps {
  cameras: Array<{ deviceId: string; label: string }>;
  onLayoutChange: (layouts: CameraLayout[]) => void;
  onClose?: () => void;
  initialLayouts?: CameraLayout[];
  screenSource?: { id: string; name: string; type: string };
}

const BasicLayoutEditor: React.FC<BasicLayoutEditorProps> = ({
  cameras,
  onLayoutChange,
  onClose,
  initialLayouts,
  screenSource
}) => {
  const [layouts, setLayouts] = useState<CameraLayout[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizingItem, setResizingItem] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [videoElements, setVideoElements] = useState<{ [deviceId: string]: HTMLVideoElement }>({});
  const [screenVideoElement, setScreenVideoElement] = useState<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastLayoutRef = useRef<string>('');

  // Initialize layouts when cameras or initialLayouts change
  useEffect(() => {
    if (cameras.length === 0 && !screenSource) return;
    
    console.log('BasicLayoutEditor: cameras received:', cameras.length, cameras);
    console.log('BasicLayoutEditor: screenSource:', screenSource);
    console.log('BasicLayoutEditor: initialLayouts:', initialLayouts);
    
    const totalSources = cameras.length + (screenSource ? 1 : 0);
    
    // Use initialLayouts if provided and matches total source count, otherwise create default layout
    if (initialLayouts && initialLayouts.length > 0 && initialLayouts.length === totalSources) {
      console.log('BasicLayoutEditor: Using initialLayouts with', initialLayouts.length, 'sources');
      setLayouts(initialLayouts);
    } else {
      console.log('BasicLayoutEditor: Creating default layout for', totalSources, 'sources');
      const defaultLayouts: CameraLayout[] = [];
      
      // Add camera layouts (Picture-in-Picture style)
      cameras.forEach((camera, index) => {
        let x = 0, y = 0, width = 0, height = 0;
        
        if (totalSources === 1) {
          // Single source takes full screen
          x = 0; y = 0; width = 100; height = 100;
        } else if (screenSource) {
          // If screen recording is included, cameras become PIP windows
          const pipSize = 25; // 25% of screen
          x = 75; y = 5 + (index * 30); width = pipSize; height = pipSize;
        } else if (index === 0) {
          // Main camera takes most of the screen (when no screen recording)
          x = 0; y = 0; width = 100; height = 100;
        } else {
          // Secondary cameras as small PIP windows (when no screen recording)
          const pipSize = 25; // 25% of screen
          x = 75; y = 5 + ((index - 1) * 30); width = pipSize; height = pipSize;
        }

        defaultLayouts.push({
          id: `camera-${camera.deviceId}`,
          deviceId: camera.deviceId,
          label: camera.label,
          x, y, width, height,
          zIndex: index,
          enabled: true
        });
      });
      
      // Add screen layout if available (Picture-in-Picture style)
      if (screenSource) {
        let x = 0, y = 0, width = 0, height = 0;
        
        if (totalSources === 1) {
          // Single source takes full screen
          x = 0; y = 0; width = 100; height = 100;
        } else {
          // Screen recording becomes the main layout (full screen)
          x = 0; y = 0; width = 100; height = 100;
        }

        defaultLayouts.push({
          id: `screen-${screenSource.id}`,
          deviceId: 'screen',
          label: screenSource.name,
          x, y, width, height,
          zIndex: cameras.length, // Screen gets highest zIndex to be on top
          enabled: true
        });
      }

      setLayouts(defaultLayouts);
    }
  }, [cameras.length, screenSource, initialLayouts]);

  // Initialize video elements
  useEffect(() => {
    const initializeVideos = async () => {
      // Clean up existing videos first
      Object.values(videoElements).forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        if (video.parentNode === document.body) {
          document.body.removeChild(video);
        }
      });
      
      // Clean up screen video
      if (screenVideoElement) {
        if (screenVideoElement.srcObject) {
          const stream = screenVideoElement.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        if (screenVideoElement.parentNode === document.body) {
          document.body.removeChild(screenVideoElement);
        }
      }
      
      const newVideoElements: { [deviceId: string]: HTMLVideoElement } = {};
      
      // Initialize camera videos
      for (const camera of cameras) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: camera.deviceId } },
            audio: false
          });
          
          const video = document.createElement('video');
          video.srcObject = stream;
          video.autoplay = true;
          video.muted = true;
          video.style.display = 'none';
          document.body.appendChild(video);
          
          newVideoElements[camera.deviceId] = video;
        } catch (error) {
          console.error(`Error initializing camera ${camera.deviceId}:`, error);
        }
      }
      
      // Initialize screen video if available
      if (screenSource) {
        try {
          const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
          let screenStream: MediaStream;
          
          if (isElectron && (window as any).electronAPI && (window as any).electronAPI.getScreenSources) {
            // Use Electron's desktopCapturer API
            screenStream = await navigator.mediaDevices.getUserMedia({
              video: {
                // @ts-ignore - Electron specific constraint
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: screenSource.id,
                  minWidth: 1280,
                  maxWidth: 1920,
                  minHeight: 720,
                  maxHeight: 1080
                }
              },
              audio: false
            });
          } else if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
            // Use web browser's getDisplayMedia with specific constraints based on screenSource type
            let displayMediaOptions: any = {
              video: {
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              },
              audio: false
            };

            // Add specific constraints based on screenSource type
            if (screenSource.type === 'tab') {
              displayMediaOptions.video.displaySurface = 'browser';
            } else if (screenSource.type === 'window') {
              displayMediaOptions.video.displaySurface = 'window';
            } else {
              displayMediaOptions.video.displaySurface = 'monitor';
            }

            screenStream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
          } else {
            throw new Error("Screen recording tidak didukung di browser ini");
          }
          
          const screenVideo = document.createElement('video');
          screenVideo.srcObject = screenStream;
          screenVideo.autoplay = true;
          screenVideo.muted = true;
          screenVideo.style.display = 'none';
          document.body.appendChild(screenVideo);
          
          setScreenVideoElement(screenVideo);
        } catch (error) {
          console.error(`Error initializing screen ${screenSource.id}:`, error);
        }
      }
      
      setVideoElements(newVideoElements);
    };

    if (cameras.length > 0 || screenSource) {
      initializeVideos();
    }

    // Cleanup
    return () => {
      Object.values(videoElements).forEach(video => {
        if (video.srcObject) {
          const stream = video.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        if (video.parentNode === document.body) {
          document.body.removeChild(video);
        }
      });
      
      if (screenVideoElement) {
        if (screenVideoElement.srcObject) {
          const stream = screenVideoElement.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
        if (screenVideoElement.parentNode === document.body) {
          document.body.removeChild(screenVideoElement);
        }
      }
    };
  }, [cameras.length, screenSource]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each layout (only enabled ones)
    layouts.filter(layout => layout.enabled).forEach(layout => {
      let video: HTMLVideoElement | null = null;
      
      // Get video element - either from cameras or screen
      if (layout.deviceId === 'screen') {
        video = screenVideoElement;
      } else {
        video = videoElements[layout.deviceId];
      }
      
      if (!video || video.readyState < 2) return;

      const x = (layout.x / 100) * canvas.width;
      const y = (layout.y / 100) * canvas.height;
      const width = (layout.width / 100) * canvas.width;
      const height = (layout.height / 100) * canvas.height;

      try {
        // Draw video frame
        ctx.drawImage(video, x, y, width, height);

        // Draw border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, width, 30);

        // Draw label text
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        const label = layout.deviceId === 'screen' ? 'Layar' : layout.label;
        ctx.fillText(label, x + 10, y + 20);
      } catch (error) {
        console.error(`Error drawing ${layout.deviceId}:`, error);
      }
    });
  }, [layouts, videoElements, screenVideoElement]);

  // Update canvas with interval
  useEffect(() => {
    const interval = setInterval(() => {
      drawCanvas();
    }, 100); // Update every 100ms

    return () => clearInterval(interval);
  }, [drawCanvas]);

  // Notify parent only when layouts actually change
  useEffect(() => {
    if (layouts.length > 0) {
      const layoutString = JSON.stringify(layouts);
      // Only call onLayoutChange if layout actually changed
      if (lastLayoutRef.current !== layoutString) {
        lastLayoutRef.current = layoutString;
        // Use setTimeout to prevent setState during render
        setTimeout(() => {
          onLayoutChange(layouts);
        }, 0);
        // Auto-save to localStorage when layout changes
        localStorage.setItem('cameraLayout', layoutString);
      }
    }
  }, [layouts.length]); // Only depend on length to prevent infinite loop

  // Mouse event handlers
  const handleMouseDown = (e: React.MouseEvent, itemId: string, action: 'drag' | 'resize') => {
    e.preventDefault();
    
    if (action === 'drag') {
      setDraggedItem(itemId);
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const item = layouts.find(l => l.id === itemId);
        if (item) {
          setDragOffset({
            x: e.clientX - rect.left - (item.x / 100) * rect.width,
            y: e.clientY - rect.top - (item.y / 100) * rect.height
          });
        }
      }
    } else if (action === 'resize') {
      setResizingItem(itemId);
      const item = layouts.find(l => l.id === itemId);
      if (item) {
        setResizeStart({
          x: e.clientX,
          y: e.clientY,
          width: item.width,
          height: item.height
        });
      }
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const containerWidth = rect.width;
    const containerHeight = rect.height;

    if (draggedItem) {
      const newX = Math.max(0, Math.min(100 - layouts.find(l => l.id === draggedItem)!.width, 
        ((e.clientX - rect.left - dragOffset.x) / containerWidth) * 100));
      const newY = Math.max(0, Math.min(100 - layouts.find(l => l.id === draggedItem)!.height, 
        ((e.clientY - rect.top - dragOffset.y) / containerHeight) * 100));

      setLayouts(prev => prev.map(layout => 
        layout.id === draggedItem 
          ? { ...layout, x: newX, y: newY }
          : layout
      ));
    }

    if (resizingItem) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(10, Math.min(100 - layouts.find(l => l.id === resizingItem)!.x, 
        resizeStart.width + (deltaX / containerWidth) * 100));
      const newHeight = Math.max(10, Math.min(100 - layouts.find(l => l.id === resizingItem)!.y, 
        resizeStart.height + (deltaY / containerHeight) * 100));

      setLayouts(prev => prev.map(layout => 
        layout.id === resizingItem 
          ? { ...layout, width: newWidth, height: newHeight }
          : layout
      ));
    }
  }, [draggedItem, dragOffset, resizingItem, resizeStart, layouts]);

  const handleMouseUp = useCallback(() => {
    setDraggedItem(null);
    setResizingItem(null);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (draggedItem || resizingItem) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedItem, resizingItem, handleMouseMove, handleMouseUp]);

  const bringToFront = (itemId: string) => {
    const maxZ = Math.max(...layouts.map(l => l.zIndex));
    setLayouts(prev => prev.map(layout => 
      layout.id === itemId 
        ? { ...layout, zIndex: maxZ + 1 }
        : layout
    ));
  };

  const removeCamera = (itemId: string) => {
    setLayouts(prev => prev.filter(layout => layout.id !== itemId));
  };

  const toggleCamera = (itemId: string) => {
    setLayouts(prev => prev.map(layout => 
      layout.id === itemId 
        ? { ...layout, enabled: !layout.enabled }
        : layout
    ));
  };

  const resetLayout = () => {
    const totalSources = cameras.length + (screenSource ? 1 : 0);
    const resetLayouts: CameraLayout[] = [];
    
    // Reset camera layouts (Picture-in-Picture style)
    cameras.forEach((camera, index) => {
      let x = 0, y = 0, width = 0, height = 0;
      
      if (totalSources === 1) {
        // Single source takes full screen
        x = 0; y = 0; width = 100; height = 100;
      } else if (screenSource) {
        // If screen recording is included, cameras become PIP windows
        const pipSize = 25; // 25% of screen
        x = 75; y = 5 + (index * 30); width = pipSize; height = pipSize;
      } else if (index === 0) {
        // Main camera takes most of the screen (when no screen recording)
        x = 0; y = 0; width = 100; height = 100;
      } else {
        // Secondary cameras as small PIP windows (when no screen recording)
        const pipSize = 25; // 25% of screen
        x = 75; y = 5 + ((index - 1) * 30); width = pipSize; height = pipSize;
      }

      resetLayouts.push({
        id: `camera-${camera.deviceId}`,
        deviceId: camera.deviceId,
        label: camera.label,
        x, y, width, height,
        zIndex: index,
        enabled: true
      });
    });
    
    // Reset screen layout if available (Picture-in-Picture style)
    if (screenSource) {
      let x = 0, y = 0, width = 0, height = 0;
      
      if (totalSources === 1) {
        // Single source takes full screen
        x = 0; y = 0; width = 100; height = 100;
      } else {
        // Screen recording becomes the main layout (full screen)
        x = 0; y = 0; width = 100; height = 100;
      }

      resetLayouts.push({
        id: `screen-${screenSource.id}`,
        deviceId: 'screen',
        label: screenSource.name,
        x, y, width, height,
        zIndex: cameras.length, // Screen gets highest zIndex to be on top
        enabled: true
      });
    }
    
    setLayouts(resetLayouts);
  };

  return (
    <div style={{ 
      width: '100%', 
      maxWidth: '800px', 
      margin: '0 auto', 
      backgroundColor: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '16px', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'black', margin: 0 }}>
          Atur Layout Kamera
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              padding: '8px 12px', 
              fontSize: '14px', 
              color: 'black', 
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FaTimes style={{ fontSize: '14px' }} />
            Tutup
          </button>
        )}
      </div>

      {/* Instructions */}
      <div style={{ 
        padding: '16px', 
        backgroundColor: '#f9fafb', 
        borderBottom: '1px solid #e5e7eb' 
      }}>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          Drag kamera untuk mengatur posisi, tarik sudut kanan bawah untuk resize. Double-click untuk bring to front.
        </p>
      </div>

      {/* Layout Container */}
      <div 
        ref={containerRef}
        style={{ 
          position: 'relative', 
          width: '100%', 
          aspectRatio: '16/9',
          backgroundColor: '#000',
          overflow: 'hidden'
        }}
      >
        {/* Canvas for video preview */}
        <canvas
          ref={canvasRef}
          width={800}
          height={450}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain'
          }}
        />

        {/* Overlay Controls */}
        {layouts.map(layout => (
          <div
            key={layout.id}
            style={{
              position: 'absolute',
              left: `${layout.x}%`,
              top: `${layout.y}%`,
              width: `${layout.width}%`,
              height: `${layout.height}%`,
              border: '2px solid transparent',
              cursor: draggedItem === layout.id ? 'grabbing' : 'grab',
              zIndex: layout.zIndex + 1000
            }}
            onMouseDown={(e) => handleMouseDown(e, layout.id, 'drag')}
            onDoubleClick={() => bringToFront(layout.id)}
          >
            {/* Resize Handle */}
            <div
              style={{
                position: 'absolute',
                bottom: '-5px',
                right: '-5px',
                width: '10px',
                height: '10px',
                backgroundColor: '#3b82f6',
                border: '2px solid white',
                borderRadius: '2px',
                cursor: 'nw-resize'
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, layout.id, 'resize');
              }}
            />

            {/* Camera Controls */}
            <div
              style={{
                position: 'absolute',
                top: '-30px',
                left: '0',
                display: 'flex',
                gap: '4px',
                opacity: 0,
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
            >
              <button
                onClick={() => bringToFront(layout.id)}
                style={{
                  padding: '4px',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
                title="Bring to Front"
              >
                <FaExpand />
              </button>
              <button
                onClick={() => removeCamera(layout.id)}
                style={{
                  padding: '4px',
                  backgroundColor: 'rgba(239,68,68,0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '10px'
                }}
                title="Remove Camera"
              >
                <FaTimes />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Camera Selection */}
      <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', color: 'black', margin: '0 0 12px 0' }}>
          Pilih {screenSource ? 'Kamera & Layar' : 'Kamera'} yang Aktif
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          {layouts.map(layout => (
            <label key={layout.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 12px',
              backgroundColor: layout.enabled ? '#f0f9ff' : '#f9fafb',
              border: `1px solid ${layout.enabled ? '#3b82f6' : '#d1d5db'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              color: layout.enabled ? '#1e40af' : '#6b7280'
            }}>
              <input
                type="checkbox"
                checked={layout.enabled}
                onChange={() => toggleCamera(layout.id)}
                style={{ 
                  width: '16px', 
                  height: '16px',
                  accentColor: '#3b82f6'
                }}
              />
              <span style={{ fontWeight: layout.enabled ? '500' : '400' }}>
                {layout.deviceId === 'screen' ? 'Layar' : layout.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Layout Info */}
      <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
              {layouts.filter(layout => layout.enabled).length} dari {layouts.length} {screenSource ? 'sumber' : 'kamera'} aktif
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={resetLayout}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: 'black',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Reset Layout
            </button>
            <button
              onClick={() => {
                // Save layout to localStorage
                localStorage.setItem('cameraLayout', JSON.stringify(layouts));
                // Also save screen source info if available
                if (screenSource) {
                  localStorage.setItem('screenSource', JSON.stringify(screenSource));
                } else {
                  localStorage.removeItem('screenSource');
                }
                // Explicitly call onLayoutChange to ensure parent gets updated
                onLayoutChange(layouts);
                // Close modal immediately after saving
                if (onClose) {
                  onClose();
                }
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'background-color 0.2s'
              }}
            >
              💾 Simpan Layout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicLayoutEditor;
