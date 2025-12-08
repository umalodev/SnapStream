import React, { useState, useEffect } from 'react';
import { FaYoutube, FaPlay, FaStop, FaSpinner, FaCheck, FaTimes, FaExternalLinkAlt, FaEdit } from 'react-icons/fa';

interface SimpleYouTubeProps {
  roomId: string;
  streamTitle: string;
  onStreamStart?: (broadcastUrl: string) => void;
  onStreamStop?: () => void;
  isStreaming?: boolean;
}

interface StreamStatus {
  isActive: boolean;
  streamKey?: string;
  rtmpUrl?: string;
  actualRoomId?: string;
  processId?: number;
  startTime?: string;
}

const SimpleYouTube: React.FC<SimpleYouTubeProps> = ({
  roomId,
  streamTitle,
  onStreamStart,
  onStreamStop,
  isStreaming = false
}) => {
  const [streamStatus, setStreamStatus] = useState<StreamStatus>({
    isActive: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [streamKey, setStreamKey] = useState('');
  const [showStreamKeyInput, setShowStreamKeyInput] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  const API_URL = 'http://192.168.1.15:3000';

  // Helper function to get stream key from localStorage
  const getStreamKey = () => {
    try {
      return localStorage.getItem('youtubeStreamKey') || '';
    } catch (error) {
      console.error('Error getting stream key:', error);
      return '';
    }
  };

  // Helper function to save stream key to localStorage
  const saveStreamKey = (key: string) => {
    try {
      localStorage.setItem('youtubeStreamKey', key);
    } catch (error) {
      console.error('Error saving stream key:', error);
    }
  };

  // Check stream status
  const checkStreamStatus = async () => {
    try {
      console.log('[SimpleYouTube] Checking stream status for room:', roomId);
      const response = await fetch(`${API_URL}/api/youtube/status/${roomId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await response.json();
      
      console.log('[SimpleYouTube] Stream status response:', data);
      
      if (data.success) {
        setStreamStatus(data.data);
        console.log('[SimpleYouTube] Stream status updated:', data.data);
      } else {
        console.log('[SimpleYouTube] Stream status error:', data.error);
        setStreamStatus({ isActive: false });
      }
    } catch (error) {
      console.error('[SimpleYouTube] Error checking stream status:', error);
      setStreamStatus({ isActive: false });
    }
  };

  // Start YouTube streaming
  const startStream = async () => {
    console.log('[SimpleYouTube] Starting YouTube streaming...');
    
    // Check if we have stream key
    const currentStreamKey = getStreamKey();
    if (!currentStreamKey) {
      showMessage('Stream key required. Please enter your YouTube stream key first.', 'error');
      setShowStreamKeyInput(true);
      return;
    }

    try {
      setIsStarting(true);
      showMessage('Starting YouTube streaming...', 'info');
      
      const response = await fetch(`${API_URL}/api/youtube/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: roomId,
          streamKey: currentStreamKey,
          title: streamTitle
        })
      });

      const data = await response.json();
      console.log('[SimpleYouTube] Start stream response:', data);
      
      if (data.success) {
        showMessage(`YouTube streaming started! Stream key: ${currentStreamKey}`, 'success');
        
        // Update stream status
        setStreamStatus({
          isActive: true,
          streamKey: data.data.streamKey,
          rtmpUrl: data.data.rtmpUrl,
          actualRoomId: data.data.actualRoomId
        });
        
        if (onStreamStart) {
          onStreamStart(data.data.broadcastUrl);
        }
        
        // Refresh status after successful start
        setTimeout(() => {
          checkStreamStatus();
        }, 1000);
        
      } else {
        console.error('Stream error:', data);
        let errorMessage = data.error || 'Failed to start streaming';
        
        // Handle specific errors
        if (data.details && data.details.includes('Invalid stream key')) {
          errorMessage = 'Invalid stream key. Please check your YouTube stream key.';
        } else if (data.details && data.details.includes('FFmpeg not found')) {
          errorMessage = 'FFmpeg not found. Please install FFmpeg.';
        }
        
        showMessage(errorMessage, 'error');
      }
    } catch (error) {
      console.error('Error starting stream:', error);
      showMessage('Failed to start streaming', 'error');
    } finally {
      setIsStarting(false);
    }
  };

  // Stop YouTube streaming
  const stopStream = async () => {
    try {
      setIsStopping(true);
      
      const response = await fetch(`${API_URL}/api/youtube/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: roomId
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showMessage('YouTube streaming stopped successfully', 'success');
        setStreamStatus({ isActive: false });
        if (onStreamStop) {
          onStreamStop();
        }
      } else {
        showMessage(data.error || 'Failed to stop streaming', 'error');
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
      showMessage('Failed to stop streaming', 'error');
    } finally {
      setIsStopping(false);
    }
  };

  // Show message
  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
    }, 5000);
  };

  useEffect(() => {
    // Load stream key from localStorage
    const savedStreamKey = getStreamKey();
    if (savedStreamKey) {
      setStreamKey(savedStreamKey);
    }
    
    checkStreamStatus();
    
    // Ensure loading state is reset on component mount
    setIsLoading(false);
  }, [roomId]);

  return (
    <div className="simple-youtube">
      <style>{`
        .simple-youtube {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        }
        
        .youtube-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        
        .youtube-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .status-ready {
          background: #f0fdf4;
          border: 1px solid #22c55e;
          color: #166534;
        }
        
        .status-not-ready {
          background: #fef2f2;
          border: 1px solid #ef4444;
          color: #dc2626;
        }
        
        .stream-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
        }
        
        .stream-active {
          background: #f0fdf4;
          border: 1px solid #22c55e;
          color: #166534;
        }
        
        .stream-inactive {
          background: #f9fafb;
          border: 1px solid #d1d5db;
          color: #6b7280;
        }
        
        .youtube-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        
        .youtube-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          color: #374151;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .youtube-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }
        
        .youtube-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .youtube-btn.primary {
          background: #dc2626;
          color: white;
          border-color: #dc2626;
        }
        
        .youtube-btn.primary:hover {
          background: #b91c1c;
        }
        
        .youtube-btn.success {
          background: #22c55e;
          color: white;
          border-color: #22c55e;
        }
        
        .youtube-btn.success:hover {
          background: #16a34a;
        }
        
        .message {
          padding: 12px;
          border-radius: 6px;
          margin: 16px 0;
          font-size: 14px;
        }
        
        .message.success {
          background: #f0fdf4;
          border: 1px solid #22c55e;
          color: #166534;
        }
        
        .message.error {
          background: #fef2f2;
          border: 1px solid #ef4444;
          color: #dc2626;
        }
        
        .message.info {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          color: #0369a1;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #eee;
        }
        
        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }
        
        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
        }
        
        .modal-body {
          padding: 20px;
        }
        
        .modal-footer {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          padding: 16px 20px;
          border-top: 1px solid #eee;
        }
        
        .input-group {
          margin-top: 16px;
        }
        
        .input-group label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
        }
      `}</style>

      <div className="youtube-header">
        <FaYoutube style={{ color: '#dc2626', fontSize: '20px' }} />
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>YouTube Streaming</h3>
      </div>

      {/* Stream Key Status */}
      <div className={`youtube-status ${
        getStreamKey() ? 'status-ready' : 'status-not-ready'
      }`}>
        {getStreamKey() ? (
          <>
            <FaCheck />
            Stream Key configured - Ready to stream
          </>
        ) : (
          <>
            <FaTimes />
            Stream Key required - Enter your YouTube stream key
          </>
        )}
      </div>

      {/* Stream Status */}
      <div className={`stream-status ${
        streamStatus.isActive ? 'stream-active' : 'stream-inactive'
      }`}>
        {streamStatus.isActive ? (
          <>
            <FaCheck />
            YouTube Stream Active
            {streamStatus.actualRoomId && (
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Using room: {streamStatus.actualRoomId}
              </div>
            )}
          </>
        ) : (
          <>
            <FaTimes />
            {isStreaming ? 'Browser Only (YouTube inactive)' : 'YouTube Stream Inactive'}
          </>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`message ${messageType}`}>
          {message}
        </div>
      )}

      {/* Actions */}
      <div className="youtube-actions">
        {!getStreamKey() ? (
          <>
            <button
              className="youtube-btn primary"
              onClick={() => setShowStreamKeyInput(true)}
            >
              <FaYoutube />
              Enter Stream Key
            </button>
            <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
              Enter your YouTube stream key to start streaming (like OBS)
            </div>
          </>
        ) : (
          <>
            <button
              className="youtube-btn secondary"
              onClick={() => {
                setIsUpdateMode(true);
                setStreamKey(getStreamKey() || '');
                setShowStreamKeyInput(true);
              }}
              style={{ marginRight: '8px' }}
            >
              <FaEdit />
              Update Stream Key
            </button>
          </>
        )}
        
        {getStreamKey() && streamStatus.isActive ? (
          <>
            <button
              className="youtube-btn success"
              onClick={stopStream}
              disabled={isStopping}
            >
              {isStopping ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaStop />}
              Stop YouTube Stream
            </button>
            
            <button
              className="youtube-btn"
              onClick={() => window.open('https://www.youtube.com/live', '_blank')}
            >
              <FaExternalLinkAlt />
              View on YouTube
            </button>
          </>
        ) : (
          <>
            <button
              className="youtube-btn primary"
              onClick={startStream}
              disabled={isStarting}
            >
              {isStarting ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaPlay />}
              {isStarting ? 'Starting YouTube Stream...' : 'Start YouTube Stream'}
            </button>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              {isStreaming ? 'Will stream your camera to YouTube' : 'Will create YouTube stream'}
            </div>
          </>
        )}

        {/* Debug Tools */}
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#495057' }}>🔧 Debug Tools</h4>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
            <button
              className="youtube-btn"
              onClick={async () => {
                try {
                  const response = await fetch(`${API_URL}/api/youtube/test-ffmpeg`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  
                  const data = await response.json();
                  console.log('FFmpeg Test Result:', data);
                  showMessage(`FFmpeg Test: ${data.success ? 'PASSED' : 'FAILED'}`, data.success ? 'success' : 'error');
                } catch (error) {
                  console.error('Error testing FFmpeg:', error);
                  showMessage('Error testing FFmpeg', 'error');
                }
              }}
              style={{ fontSize: '12px', padding: '8px' }}
            >
              Test FFmpeg
            </button>
            
            <button
              className="youtube-btn"
              onClick={checkStreamStatus}
              style={{ fontSize: '12px', padding: '8px' }}
            >
              Check Status
            </button>
            
            <button
              className="youtube-btn"
              onClick={async () => {
                try {
                  const response = await fetch(`${API_URL}/api/youtube/all`);
                  const data = await response.json();
                  console.log('All Active Streams:', data);
                  showMessage(`Active Streams: ${Object.keys(data.data || {}).length}`, 'info');
                } catch (error) {
                  console.error('Error checking all streams:', error);
                  showMessage('Error checking streams', 'error');
                }
              }}
              style={{ fontSize: '12px', padding: '8px' }}
            >
              Check All Streams
            </button>
            
            <button
              className="youtube-btn"
              onClick={async () => {
                try {
                  const response = await fetch(`${API_URL}/api/youtube/reset-stream-key`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ roomId: roomId })
                  });
                  
                  const data = await response.json();
                  console.log('Reset Stream Key Result:', data);
                  showMessage(`Reset Stream Key: ${data.success ? 'SUCCESS' : 'FAILED'}`, data.success ? 'success' : 'error');
                  
                  if (data.success) {
                    // Refresh stream status after reset
                    setTimeout(() => {
                      checkStreamStatus();
                    }, 1000);
                  }
                } catch (error) {
                  console.error('Error resetting stream key:', error);
                  showMessage('Error resetting stream key', 'error');
                }
              }}
              style={{ fontSize: '12px', padding: '8px' }}
            >
              Reset Room Stream
            </button>
            
            <button
              className="youtube-btn"
              onClick={async () => {
                try {
                  const response = await fetch(`${API_URL}/api/youtube/reset-all-stream-keys`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  
                  const data = await response.json();
                  console.log('Reset All Stream Keys Result:', data);
                  showMessage(`Reset All Stream Keys: ${data.success ? 'SUCCESS' : 'FAILED'}`, data.success ? 'success' : 'error');
                  
                  if (data.success) {
                    // Refresh stream status after reset
                    setTimeout(() => {
                      checkStreamStatus();
                    }, 1000);
                  }
                } catch (error) {
                  console.error('Error resetting all stream keys:', error);
                  showMessage('Error resetting all stream keys', 'error');
                }
              }}
              style={{ fontSize: '12px', padding: '8px' }}
            >
              Reset All Streams
            </button>
          </div>
        </div>
      </div>

      {/* Stream Key Input Modal */}
      {showStreamKeyInput && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{isUpdateMode ? 'Update YouTube Stream Key' : 'Enter YouTube Stream Key'}</h3>
              <button 
                className="modal-close"
                onClick={() => {
                  setShowStreamKeyInput(false);
                  setStreamKey('');
                  setIsUpdateMode(false);
                }}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>{isUpdateMode ? 'Update your YouTube stream key:' : 'Enter your YouTube stream key to start streaming (like OBS):'}</p>
              <div className="input-group">
                <label htmlFor="streamKey">Stream Key:</label>
                <input
                  id="streamKey"
                  type="text"
                  placeholder="Enter your YouTube stream key (e.g., 81ue-2scr-37ee-43zj-age7)"
                  value={streamKey}
                  onChange={(e) => setStreamKey(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    marginTop: '8px',
                    fontFamily: 'monospace'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      if (streamKey.trim()) {
                        saveStreamKey(streamKey.trim());
                        setShowStreamKeyInput(false);
                        showMessage('Stream key saved successfully!', 'success');
                      }
                    }
                  }}
                />
              </div>
              <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                You can find your stream key in YouTube Studio → Go Live → Stream
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="youtube-btn"
                onClick={async () => {
                  if (streamKey.trim()) {
                    if (isUpdateMode) {
                      // Update stream key via API
                      try {
                        const response = await fetch(`${API_URL}/api/youtube/update-stream-key`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            roomId: roomId, 
                            newStreamKey: streamKey.trim() 
                          })
                        });
                        
                        const data = await response.json();
                        if (data.success) {
                          saveStreamKey(streamKey.trim());
                          setShowStreamKeyInput(false);
                          setIsUpdateMode(false);
                          showMessage('Stream key updated successfully!', 'success');
                          
                          // Refresh stream status after update
                          setTimeout(() => {
                            checkStreamStatus();
                          }, 1000);
                        } else {
                          showMessage(data.error || 'Failed to update stream key', 'error');
                        }
                      } catch (error) {
                        console.error('Error updating stream key:', error);
                        showMessage('Error updating stream key', 'error');
                      }
                    } else {
                      // Save new stream key
                      saveStreamKey(streamKey.trim());
                      setShowStreamKeyInput(false);
                      showMessage('Stream key saved successfully!', 'success');
                    }
                  } else {
                    showMessage('Please enter a valid stream key', 'error');
                  }
                }}
                disabled={!streamKey.trim()}
              >
                {isUpdateMode ? 'Update Stream Key' : 'Save Stream Key'}
              </button>
              <button
                className="youtube-btn"
                onClick={() => {
                  setShowStreamKeyInput(false);
                  setStreamKey('');
                  setIsUpdateMode(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default SimpleYouTube;
