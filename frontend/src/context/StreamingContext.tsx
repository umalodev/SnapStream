import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';
import { API_URL } from '../config';
import { useAuth } from './AuthContext';

// Extend Window interface for garbage collection
declare global {
  interface Window {
    gc?: () => void;
  }
}

interface StreamingState {
  isStreaming: boolean;
  isRecording: boolean;
  isScreenRecording: boolean;
  roomId: string | null;
  localStream: MediaStream | null;
  recordingStream: MediaStream | null;
  mediaRecorder: MediaRecorder | null;
  liveStreamRecorder: MediaRecorder | null; // For live stream recording
  videoBlob: Blob | null;
  videoUrl: string | null;
  status: string;
  selectedKelas: string;
  selectedMapel: string;
  recordingStartTime: number | null;
  recordingDuration: number;
  recordingTitle: string; // Store the recording title
}

interface StreamingContextType {
  streamingState: StreamingState;
  startStream: (kelas: string, mapel: string, customStream?: MediaStream) => Promise<void>;
  stopStream: () => Promise<void>;
  startCameraRecording: (kelas: string, judul: string) => Promise<void>;
  startScreenRecording: (kelas: string, judul: string) => Promise<void>;
  stopRecording: () => void;
  uploadRecording: () => Promise<void>;
  cancelUpload: () => void;
  updateStatus: (status: string) => void;
  setSelectedKelas: (kelas: string) => void;
  setSelectedMapel: (mapel: string) => void;
  startMultiCameraRecording: (selectedCameras: string[], layoutType: string, judul: string, customLayout?: any[], screenSource?: any) => Promise<void>;
  startMultiCameraStreaming: (selectedCameras: string[], layoutType: string, judul: string, customLayout?: any[], screenSource?: any) => Promise<void>;
  updateRecordingLayout: (newLayout: any[]) => void;
  updateStreamingLayout: (newLayout: any[]) => void;
}

const StreamingContext = createContext<StreamingContextType | undefined>(undefined);

export const useStreaming = () => {
  const context = useContext(StreamingContext);
  if (!context) {
    throw new Error('useStreaming must be used within a StreamingProvider');
  }
  return context;
};

export const StreamingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    isRecording: false,
    isScreenRecording: false,
    roomId: null,
    localStream: null,
    recordingStream: null,
    mediaRecorder: null,
    liveStreamRecorder: null,
    videoBlob: null,
    videoUrl: null,
    status: 'Ready to stream',
    selectedKelas: '',
    selectedMapel: '',
    recordingStartTime: null,
    recordingDuration: 0,
    recordingTitle: '',
  });

  const socket = useRef<any>(null);
  const deviceRef = useRef<any>(null);
  const producerTransportRef = useRef<any>(null);
  const videoProducerRef = useRef<any>(null);
  const audioProducerRef = useRef<any>(null);
  const currentRecordingLayout = useRef<any[]>([]);
  const [recordingLayoutVersion, setRecordingLayoutVersion] = useState(0);
  
  // Streaming layout management
  const currentStreamingLayout = useRef<any[]>([]);
  const [streamingLayoutVersion, setStreamingLayoutVersion] = useState(0);
  const streamingAnimateRef = useRef<(() => void) | null>(null);
  
  // Memory management refs for proper cleanup
  const streamMonitorRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamingAnimationFrameRef = useRef<number | null>(null);
  
  // Force re-render when streaming layout changes
  useEffect(() => {
    // This effect will trigger when streamingLayoutVersion changes
    // The animate function will automatically pick up the new layout
    console.log('Streaming layout version changed:', streamingLayoutVersion);
    // No need to call animate here as it's already running in a loop
    // The layout change will be picked up by the next frame
  }, [streamingLayoutVersion]);

  useEffect(() => {
    socket.current = io('http://192.168.1.37:4000');
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  // Keep MediaStream active when window is minimized or hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (streamingState.isStreaming && streamingState.localStream) {
        const videoTracks = streamingState.localStream.getVideoTracks();
        const audioTracks = streamingState.localStream.getAudioTracks();
        
        // Ensure tracks remain active even when window is hidden
        videoTracks.forEach(track => {
          if (track.readyState === 'live') {
            track.enabled = true;
          }
        });
        
        audioTracks.forEach(track => {
          if (track.readyState === 'live') {
            track.enabled = true;
          }
        });
        
        console.log('MediaStream tracks kept active during visibility change');
      }
    };

    const handlePageHide = () => {
      if (streamingState.isStreaming && streamingState.localStream) {
        console.log('Page hidden, keeping MediaStream active');
        // Force MediaStream to stay active
        streamingState.localStream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.enabled = true;
          }
        });
      }
    };

    const handlePageShow = () => {
      if (streamingState.isStreaming && streamingState.localStream) {
        console.log('Page shown, ensuring MediaStream is still active');
        // Verify MediaStream is still active
        streamingState.localStream.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.enabled = true;
          }
        });
      }
    };

    // Add event listeners for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [streamingState.isStreaming, streamingState.localStream]);

  // Cleanup effect to prevent memory leaks on component unmount
  useEffect(() => {
    return () => {
      // Clean up all intervals and animation frames when component unmounts
      if (streamMonitorRef.current) {
        clearInterval(streamMonitorRef.current);
        streamMonitorRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamingAnimationFrameRef.current) {
        cancelAnimationFrame(streamingAnimationFrameRef.current);
        streamingAnimationFrameRef.current = null;
      }
      
      // Call streaming cleanup if available
      if (streamingAnimateRef.current) {
        streamingAnimateRef.current();
        streamingAnimateRef.current = null;
      }
      
      console.log('StreamingContext cleanup completed on unmount');
    };
  }, []);

  const updateStatus = (status: string) => {
    setStreamingState(prev => ({ ...prev, status }));
  };

  const setSelectedKelas = (kelas: string) => {
    setStreamingState(prev => ({ ...prev, selectedKelas: kelas }));
  };

  const setSelectedMapel = (mapel: string) => {
    setStreamingState(prev => ({ ...prev, selectedMapel: mapel }));
  };

  const startStream = async (kelas: string, title: string, customStream?: MediaStream) => {
    const roomId = `${kelas}_${title.replace(/\s+/g, '_')}_${Date.now()}`;
    
    updateStatus('Memulai kamera...');
    
    try {
      // Check audio permission first
      try {
        const audioPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        console.log('Audio permission status:', audioPermission.state);
        
        if (audioPermission.state === 'denied') {
          console.warn('Audio permission denied, user needs to enable microphone access');
          updateStatus('Izin mikrofon diperlukan untuk audio. Silakan aktifkan akses mikrofon.');
        }
      } catch (permissionError) {
        console.log('Permission API not supported, continuing...');
      }
      let stream: MediaStream;
      if (customStream) {
        stream = customStream;
      } else {
        // Explicitly request audio with better constraints for low latency
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2
          }
        });
      }

      console.log("Stream tracks:", stream.getTracks());
      console.log("Available tracks:", stream.getTracks());
      console.log("Video track:", stream.getVideoTracks()[0]);
      console.log("Audio track:", stream.getAudioTracks()[0]);

      // 1. Get RTP Capabilities
      console.log('Getting RTP capabilities...');
      const rtpCapabilities = await new Promise<any>((resolve) => {
        socket.current.emit("getRtpCapabilities", null, resolve);
      });
      console.log('RTP capabilities received:', rtpCapabilities);

      // 2. Create Device
      console.log('Creating MediaSoup device...');
      const device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      console.log('MediaSoup device created and loaded');

      // 3. Create Producer Transport
      console.log('Creating producer transport...');
      const producerTransportParams = await new Promise<any>((resolve) => {
        socket.current.emit("createProducerTransport", null, resolve);
      });
      console.log('Producer transport params received:', producerTransportParams);
      const producerTransport = device.createSendTransport(producerTransportParams);
      producerTransportRef.current = producerTransport;
      console.log('Producer transport created');

      producerTransport.on("connect", ({ dtlsParameters }: any, callback: any) => {
        console.log('Producer transport connecting...');
        socket.current.emit("connectProducerTransport", { dtlsParameters }, callback);
      });

      producerTransport.on("produce", ({ kind, rtpParameters }: any, callback: any) => {
        console.log('Producer transport producing:', kind);
        socket.current.emit("produce", { kind, rtpParameters, roomId }, ({ id }: any) => callback({ id }));
      });

      producerTransport.on("connectionstatechange", (state) => {
        console.log('Producer transport connection state:', state);
        if (state === 'disconnected' || state === 'failed') {
          console.error('Producer transport disconnected, attempting to reconnect...');
          updateStatus('Koneksi terputus, mencoba menyambung kembali...');
          // Attempt to restart stream
          setTimeout(() => {
            if (streamingState.isStreaming) {
              console.log('Attempting to restart stream...');
              startStream(kelas, title, customStream);
            }
          }, 2000);
        }
      });

      // 4. Produce video & audio
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      if (!videoTrack) {
        throw new Error("No video track available");
      }
      
      // Check if we have audio track
      if (!audioTrack) {
        console.warn("No audio track available, trying to get audio separately...");
        
        // Try to get audio separately
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100
            }
          });
          
          const separateAudioTrack = audioStream.getAudioTracks()[0];
          if (separateAudioTrack) {
            console.log("Got separate audio track:", separateAudioTrack);
            // Add the audio track to the main stream
            stream.addTrack(separateAudioTrack);
            console.log("Added separate audio track to stream");
          }
        } catch (audioError: any) {
          console.error("Failed to get separate audio track:", audioError);
          
          // Provide specific error messages
          if (audioError.name === 'NotAllowedError') {
            console.error("Audio access denied by user");
            updateStatus("Akses mikrofon ditolak. Silakan izinkan akses mikrofon untuk audio.");
          } else if (audioError.name === 'NotFoundError') {
            console.error("No audio device found");
            updateStatus("Tidak ada mikrofon yang ditemukan. Periksa perangkat audio Anda.");
          } else {
            console.warn("Continuing without audio...");
            updateStatus("Audio tidak tersedia, melanjutkan tanpa audio...");
          }
        }
      }
      
      // Get audio track again after potential addition
      const finalAudioTrack = stream.getAudioTracks()[0];
      
      // Ensure audio track is enabled if available
      if (finalAudioTrack) {
        finalAudioTrack.enabled = true;
        console.log('Audio track enabled for streaming:', finalAudioTrack.enabled);
        console.log('Audio track details:', {
          id: finalAudioTrack.id,
          kind: finalAudioTrack.kind,
          enabled: finalAudioTrack.enabled,
          muted: finalAudioTrack.muted,
          readyState: finalAudioTrack.readyState,
          label: finalAudioTrack.label
        });
      } else {
        console.warn("Still no audio track available after retry");
      }

      console.log('Producing video track...');
      videoProducerRef.current = await producerTransport.produce({
        track: videoTrack,
        codecOptions: {
          videoGoogleStartBitrate: 1500, // Balanced for stability
          videoGoogleMaxBitrate: 3000,   // Balanced for stability
          videoGoogleMinBitrate: 500     // Lower minimum for better adaptation
        }
      });
      console.log("videoTrack produced:", videoTrack, "producerId:", videoProducerRef.current.id);
      
      // Simplified producer event listeners
      videoProducerRef.current.on('transportclose', () => {
        console.log('Video producer transport closed');
        updateStatus('Video producer transport terputus');
      });
      
      if (finalAudioTrack) {
        console.log('Producing audio track...');
        console.log('Audio track details:', {
          id: finalAudioTrack.id,
          kind: finalAudioTrack.kind,
          enabled: finalAudioTrack.enabled,
          muted: finalAudioTrack.muted,
          readyState: finalAudioTrack.readyState,
          label: finalAudioTrack.label
        });
        
        audioProducerRef.current = await producerTransport.produce({
          track: finalAudioTrack,
          codecOptions: {
            opusStereo: true,
            opusFec: true, // Enable FEC for stability
            opusDtx: true,
            opusMaxPlaybackRate: 48000,
            opusPtime: 10, // Back to 10ms for stability
            opusMaxAverageBitrate: 128000
          }
        });
        console.log("audioTrack produced:", finalAudioTrack, "producerId:", audioProducerRef.current.id);
        
        // Simplified audio producer event listeners
        audioProducerRef.current.on('transportclose', () => {
          console.log('Audio producer transport closed');
          updateStatus('Audio producer transport terputus');
        });
      } else {
        console.error("No audio track available!");
        console.log("Available tracks:", stream.getTracks().map(track => ({
          kind: track.kind,
          enabled: track.enabled,
          muted: track.muted,
          label: track.label
        })));
      }

      // 5. Start recording the stream for local storage with optimized settings
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 2500000,
        audioBitsPerSecond: 128000
      });
      
      // Background-compatible stream monitoring with delay prevention
      streamMonitorRef.current = setInterval(async () => {
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];
        
        // Keep tracks active even when window is hidden/minimized
        if (videoTrack && videoTrack.readyState === 'live') {
          videoTrack.enabled = true;
        }
        if (audioTrack && audioTrack.readyState === 'live') {
          audioTrack.enabled = true;
        }
        
        if (videoTrack && videoTrack.readyState === 'ended') {
          console.error('Video track ended unexpectedly');
          updateStatus('Video track berakhir, mencoba restart...');
          if (streamMonitorRef.current) {
            clearInterval(streamMonitorRef.current);
            streamMonitorRef.current = null;
          }
          
          // Try to recover the video track first
          try {
            if (videoTrack.readyState === 'ended') {
              // Attempt to restart the track
              const newStream = await navigator.mediaDevices.getUserMedia({
                video: {
                  width: { ideal: 1280, max: 1920 },
                  height: { ideal: 720, max: 1080 },
                  frameRate: { ideal: 30, max: 60 },
                  facingMode: 'user'
                },
                audio: false
              });
              
              const newVideoTrack = newStream.getVideoTracks()[0];
              if (newVideoTrack && videoProducerRef.current) {
                // Replace the track
                await videoProducerRef.current.replaceTrack({ track: newVideoTrack });
                console.log('Video track replaced successfully');
                updateStatus('Video track diperbaiki');
              }
            }
          } catch (recoveryError) {
            console.error('Failed to recover video track:', recoveryError);
            // Full restart as fallback
            setTimeout(() => {
              if (streamingState.isStreaming) {
                startStream(kelas, title, customStream);
              }
            }, 2000);
          }
        }
        
        if (audioTrack && audioTrack.readyState === 'ended') {
          console.error('Audio track ended unexpectedly');
          updateStatus('Audio track berakhir');
        }
        
        // Prevent delay accumulation by refreshing producers
        const currentTime = Date.now();
        const streamStartTime = streamingState.recordingStartTime || currentTime;
        const streamDuration = currentTime - streamStartTime;
        
        // Refresh stream every 10 minutes to prevent delay (more stable)
        if (streamDuration > 0 && streamDuration % 600000 < 10000) { // Every 10 minutes
          console.log('Performing gentle stream refresh to prevent delay accumulation...');
          updateStatus('Memperbarui stream untuk mencegah delay...');
          
          // Gentle refresh without pausing - just check connection
          if (videoProducerRef.current && videoProducerRef.current.paused) {
            console.log('Video producer was paused, resuming...');
            videoProducerRef.current.resume();
          }
          
          if (audioProducerRef.current && audioProducerRef.current.paused) {
            console.log('Audio producer was paused, resuming...');
            audioProducerRef.current.resume();
          }
        }
      }, 5000); // Check every 5 seconds for better responsiveness

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          // Prevent memory accumulation by limiting chunks
          if (chunks.length > 100) {
            chunks.splice(0, 50); // Remove old chunks to prevent memory buildup
          }
        }
      };

      mediaRecorder.onstop = async () => {
  console.log("⏹ MediaRecorder stopped, assembling final Blob...");

  // Tunggu 300–500ms agar chunk terakhir masuk
  await new Promise(resolve => setTimeout(resolve, 500));

  // Jangan hapus chunks sebelum final blob dibuat!
  const finalBlob = new Blob([...chunks], { type: "video/webm" });

  if (finalBlob.size < 5000) {
    console.error("❌ Blob size too small, recording is corrupted");
    return;
  }

  // Setelah berhasil jadi blob, baru clear chunks
  chunks.length = 0;

  // Upload
  try {
    const formData = new FormData();
    formData.append("recording", finalBlob, `${roomId}.webm`);
    formData.append("streamId", roomId);
    formData.append("judul", `Live Stream ${roomId}`);

    const res = await fetch(`${API_URL}/api/livestream/upload-recording`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      console.error("❌ Upload failed");
    } else {
      console.log("✅ Upload success!");
    }
  } catch (err) {
    console.error("❌ Upload error:", err);
  }
};


mediaRecorder.start(); // biarkan browser buffer sendiri
      console.log('Live stream recording started');

      // Update state
      setStreamingState(prev => ({
        ...prev,
        isStreaming: true,
        roomId,
        localStream: stream,
        liveStreamRecorder: mediaRecorder,
        status: 'Live streaming berjalan!',
        selectedKelas: kelas,
        selectedMapel: title,
        recordingStartTime: Date.now() // Track stream start time for delay monitoring
      }));

      console.log('Stream state updated, isStreaming:', true, 'roomId:', roomId);

      // Notify backend (automatically save to database)
      console.log('Notifying backend about stream start...');
      const response = await fetch(`${API_URL}/api/livestream/start`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: roomId,
          title: title,
          isRecording: false, // All streams are saved to database by default
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backend API error:', errorData);
        throw new Error(errorData.error || 'Failed to start live stream');
      }
      
      console.log('Backend notified successfully, stream is now active');

    } catch (error) {
      console.error("Error starting stream:", error);
      console.error("Error details:", error);
      
      // Clean up on error
      if (streamingState.localStream) {
        streamingState.localStream.getTracks().forEach(track => track.stop());
      }
      if (videoProducerRef.current) {
        videoProducerRef.current.close();
        videoProducerRef.current = null;
      }
      if (audioProducerRef.current) {
        audioProducerRef.current.close();
        audioProducerRef.current = null;
      }
      if (producerTransportRef.current) {
        producerTransportRef.current.close();
        producerTransportRef.current = null;
      }
      
      // Clear any pending intervals or animation frames
      if (streamMonitorRef.current) {
        clearInterval(streamMonitorRef.current);
        streamMonitorRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamingAnimationFrameRef.current) {
        cancelAnimationFrame(streamingAnimationFrameRef.current);
        streamingAnimationFrameRef.current = null;
      }
      
      // Force garbage collection to free memory immediately
      if (window.gc) {
        window.gc();
      }
      
      updateStatus("Gagal memulai live streaming. Silakan coba lagi.");
    }
  };

  const stopStream = async () => {
    try {
      console.log('stopStream called, current roomId:', streamingState.roomId);
      updateStatus("Menghentikan live streaming...");

      // Clear stream monitoring interval to prevent memory leaks
      if (streamMonitorRef.current) {
        clearInterval(streamMonitorRef.current);
        streamMonitorRef.current = null;
        console.log('Stream monitor interval cleared');
      }

      // Cancel any pending animation frames to prevent memory leaks
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
        console.log('Animation frame cancelled');
      }

      if (streamingAnimationFrameRef.current) {
        cancelAnimationFrame(streamingAnimationFrameRef.current);
        streamingAnimationFrameRef.current = null;
        console.log('Streaming animation frame cancelled');
      }

      // Stop live stream recording
      if (streamingState.liveStreamRecorder && streamingState.liveStreamRecorder.state === 'recording') {
        streamingState.liveStreamRecorder.stop();
        console.log('Live stream recording stopped');
      }

      // Stop MediaSoup producers
      if (videoProducerRef.current) {
        videoProducerRef.current.close();
        videoProducerRef.current = null;
      }
      if (audioProducerRef.current) {
        audioProducerRef.current.close();
        audioProducerRef.current = null;
      }

      // Stop producer transport
      if (producerTransportRef.current) {
        producerTransportRef.current.close();
        producerTransportRef.current = null;
      }

      // Stop local stream
      if (streamingState.localStream) {
        streamingState.localStream.getTracks().forEach(track => track.stop());
      }
      
      // Clean up any video elements that might be in the DOM
      const videoElements = document.querySelectorAll('video[style*="display: none"]');
      videoElements.forEach(video => {
        if (video.parentNode) {
          video.parentNode.removeChild(video);
        }
      });

      // Notify backend
      if (streamingState.roomId) {
        await fetch(`${API_URL}/api/livestream/stop`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ id: streamingState.roomId }),
        });
        
        // // Notify all viewers that stream has ended
        // try {
        //   await fetch(`${API_URL}/api/stream-ended`, {
        //     method: "POST",
        //     headers: { 
        //       "Content-Type": "application/json",
        //     },
        //     body: JSON.stringify({ roomId: streamingState.roomId }),
        //   });
        //   console.log('Stream ended notification sent to all viewers');
        // } catch (error) {
        //   console.error('Failed to send stream ended notification:', error);
        // }
      }

      // Call cleanup function if available
      if (streamingAnimateRef.current) {
        streamingAnimateRef.current();
      }
      
      // Clear streaming animate reference
      streamingAnimateRef.current = null;
      
      // Update state
      setStreamingState(prev => ({
        ...prev,
        isStreaming: false,
        roomId: null,
        localStream: null,
        liveStreamRecorder: null,
        status: 'Live streaming dihentikan',
        recordingStartTime: null,
        recordingDuration: 0,
      }));

      console.log('Stream cleanup completed successfully');
      
      // Force garbage collection to free memory immediately
      if (window.gc) {
        window.gc();
      }

    } catch (error) {
      console.error("Error stopping stream:", error);
      updateStatus("Gagal menghentikan live streaming.");
    }
  };

  const startCameraRecording = async (kelas: string, judul: string) => {
    try {
      updateStatus("Memulai recording kamera...");
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !('getUserMedia' in navigator.mediaDevices)) {
        throw new Error("Camera recording tidak didukung di browser ini. Silakan gunakan browser yang lebih baru.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: true,
        });
      } catch (getUserMediaError: any) {
        console.error("getUserMedia error:", getUserMediaError);
        
        // Handle specific error cases
        if (getUserMediaError.name === 'NotAllowedError') {
          throw new Error("Akses kamera dan mikrofon ditolak. Silakan izinkan akses dan coba lagi.");
        } else if (getUserMediaError.name === 'NotFoundError') {
          throw new Error("Kamera atau mikrofon tidak ditemukan. Pastikan perangkat tersambung.");
        } else if (getUserMediaError.name === 'NotReadableError') {
          throw new Error("Kamera atau mikrofon sedang digunakan oleh aplikasi lain.");
        } else if (getUserMediaError.name === 'OverconstrainedError') {
          throw new Error("Pengaturan kamera tidak dapat dipenuhi. Silakan coba lagi.");
        } else {
          throw new Error(`Gagal mengakses kamera: ${getUserMediaError.message || 'Error tidak diketahui'}`);
        }
      }

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder tidak didukung di browser ini.");
      }

      // Check for supported MIME types
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error("Format video tidak didukung di browser ini.");
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        setStreamingState(prev => ({
          ...prev,
          videoBlob,
          videoUrl,
          recordingStream: null,
          mediaRecorder: null,
          status: 'Recording selesai'
        }));
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        updateStatus("Error saat recording kamera. Silakan coba lagi.");
      };

      mediaRecorder.start();
      
      setStreamingState(prev => ({
        ...prev,
        isRecording: true,
        recordingStream: stream,
        mediaRecorder,
        recordingStartTime: Date.now(),
        recordingTitle: judul,
        status: 'Recording kamera berjalan...'
      }));

    } catch (error: any) {
      console.error("Error starting camera recording:", error);
      updateStatus(error.message || "Gagal memulai recording kamera.");
    }
  };

  const startScreenRecording = async (kelas: string, judul: string) => {
    try {
      updateStatus("Memulai recording layar...");
      
      // Check if we're in Electron
      const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
      
      // For Electron, try to use desktopCapturer API
      if (isElectron && (window as any).electronAPI && (window as any).electronAPI.getScreenSources) {
        try {
          updateStatus("Mengambil daftar layar yang tersedia...");
          const sources = await (window as any).electronAPI.getScreenSources();
          
          if (sources.length === 0) {
            throw new Error("Tidak ada layar yang tersedia untuk recording.");
          }
          
          // For now, use the first available screen source
          const source = sources[0];
          updateStatus(`Menggunakan layar: ${source.name}`);
          
          // Create screen stream with system audio
          const screenStream = await navigator.mediaDevices.getUserMedia({
            video: {
              // @ts-ignore - Electron specific constraint
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id,
                minWidth: 1280,
                maxWidth: 1920,
                minHeight: 720,
                maxHeight: 1080
              }
            },
            audio: {
              // @ts-ignore - Electron specific constraint
              mandatory: {
                chromeMediaSource: 'desktop'
              }
            }
          });

          // Create microphone stream for external audio
          const micStream = await navigator.mediaDevices.getUserMedia({
            audio: true
          });

          // Combine audio streams using AudioContext
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const destination = audioContext.createMediaStreamDestination();

          // Add screen audio (system audio from laptop)
          if (screenStream.getAudioTracks().length > 0) {
            const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
            screenAudioSource.connect(destination);
            console.log('System audio connected');
          }

          // Add microphone audio (external audio)
          if (micStream.getAudioTracks().length > 0) {
            const micAudioSource = audioContext.createMediaStreamSource(micStream);
            micAudioSource.connect(destination);
            console.log('Microphone audio connected');
          }

          // Create combined stream with video and mixed audio
          const combinedStream = new MediaStream();
          
          // Add video track from screen
          screenStream.getVideoTracks().forEach(track => {
            combinedStream.addTrack(track);
          });
          
          // Add mixed audio tracks
          destination.stream.getAudioTracks().forEach(track => {
            combinedStream.addTrack(track);
          });

          console.log('Combined stream created with', combinedStream.getAudioTracks().length, 'audio tracks');
          
          // Continue with MediaRecorder setup
          const mediaRecorder = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp8,opus'
          });

          const chunks: Blob[] = [];
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          mediaRecorder.onstop = () => {
            const videoBlob = new Blob(chunks, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(videoBlob);
            
            // Clean up audio context
            if (audioContext.state !== 'closed') {
              audioContext.close();
            }
            
            // Stop all tracks
            screenStream.getTracks().forEach(track => track.stop());
            micStream.getTracks().forEach(track => track.stop());
            
            setStreamingState(prev => ({
              ...prev,
              videoBlob,
              videoUrl,
              recordingStream: null,
              mediaRecorder: null,
              status: 'Recording selesai dengan audio laptop dan mikrofon'
            }));
          };

          mediaRecorder.onerror = (event: any) => {
            console.error("MediaRecorder error:", event);
            updateStatus("Error saat recording layar. Silakan coba lagi.");
          };

          mediaRecorder.start();
          
          setStreamingState(prev => ({
            ...prev,
            isScreenRecording: true,
            recordingStream: combinedStream,
            mediaRecorder,
            recordingStartTime: Date.now(),
            recordingTitle: judul,
            status: 'Recording layar berjalan dengan audio laptop dan mikrofon...'
          }));
          
          return; // Success, exit early
          
        } catch (electronError: any) {
          console.error("Electron screen recording failed:", electronError);
          updateStatus("Screen recording melalui Electron gagal. Mencoba metode alternatif...");
        }
      }
      
      // Check if getDisplayMedia is supported (fallback for web browsers)
      if (!navigator.mediaDevices || !('getDisplayMedia' in navigator.mediaDevices)) {
        if (isElectron) {
          throw new Error("Screen recording tidak didukung di Electron. Silakan gunakan aplikasi web di browser Chrome/Firefox/Edge untuk screen recording.");
        } else {
          throw new Error("Screen recording tidak didukung di browser ini. Silakan gunakan browser yang lebih baru seperti Chrome, Firefox, atau Edge.");
        }
      }

      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '192.168.1.37') {
        throw new Error("Screen recording memerlukan koneksi HTTPS atau localhost untuk keamanan.");
      }

      // Get screen stream with system audio and memory optimization
      let screenStream: MediaStream;
      try {
        updateStatus("Meminta izin untuk screen recording...");
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 15, max: 30 } // Reduced frame rate for memory optimization
          },
          audio: true, // This will capture system audio if user allows it
        });
        updateStatus("Screen stream berhasil didapatkan...");
        
        // Optimize screen stream for memory management
        const videoTrack = screenStream.getVideoTracks()[0];
        if (videoTrack) {
          // Apply constraints to reduce memory usage
          await videoTrack.applyConstraints({
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 15, max: 30 }
          });
        }
      } catch (getDisplayMediaError: any) {
        console.error("getDisplayMedia error:", getDisplayMediaError);
        
        // Handle specific error cases
        if (getDisplayMediaError.name === 'NotAllowedError') {
          throw new Error("Akses untuk screen recording ditolak. Silakan izinkan akses layar dan coba lagi.");
        } else if (getDisplayMediaError.name === 'NotSupportedError') {
          throw new Error("Screen recording tidak didukung di browser ini. Silakan gunakan browser yang lebih baru.");
        } else if (getDisplayMediaError.name === 'AbortError') {
          throw new Error("Screen recording dibatalkan oleh pengguna.");
        } else {
          throw new Error(`Gagal memulai screen recording: ${getDisplayMediaError.message || 'Error tidak diketahui'}`);
        }
      }

      // Get microphone stream for external audio
      let micStream: MediaStream;
      try {
        updateStatus("Meminta izin untuk mikrofon...");
        micStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
        updateStatus("Mikrofon berhasil didapatkan...");
      } catch (micError: any) {
        console.warn("Microphone access failed:", micError);
        updateStatus("Mikrofon tidak tersedia, melanjutkan tanpa audio eksternal...");
        // Continue without microphone if it fails
        micStream = new MediaStream();
      }

      // Combine audio streams using AudioContext
      updateStatus("Menggabungkan audio streams...");
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const destination = audioContext.createMediaStreamDestination();

      // Add screen audio (system audio)
      if (screenStream.getAudioTracks().length > 0) {
        const screenAudioSource = audioContext.createMediaStreamSource(screenStream);
        screenAudioSource.connect(destination);
        console.log('System audio connected (web browser)');
      }

      // Add microphone audio (external audio)
      if (micStream.getAudioTracks().length > 0) {
        const micAudioSource = audioContext.createMediaStreamSource(micStream);
        micAudioSource.connect(destination);
        console.log('Microphone audio connected (web browser)');
      }

      // Create combined stream with video and mixed audio
      const combinedStream = new MediaStream();
      
      // Add video track from screen
      screenStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });
      
      // Add mixed audio tracks
      destination.stream.getAudioTracks().forEach(track => {
        combinedStream.addTrack(track);
      });

      console.log('Combined stream created (web browser) with', combinedStream.getAudioTracks().length, 'audio tracks');
      updateStatus("Stream gabungan berhasil dibuat...");

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder tidak didukung di browser ini.");
      }

      // Check for supported MIME types
      updateStatus("Menyiapkan MediaRecorder...");
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error("Format video tidak didukung di browser ini.");
          }
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        // Clean up audio context
        if (audioContext.state !== 'closed') {
          audioContext.close();
        }
        
        // Stop all tracks
        screenStream.getTracks().forEach(track => track.stop());
        micStream.getTracks().forEach(track => track.stop());
        
        setStreamingState(prev => ({
          ...prev,
          videoBlob,
          videoUrl,
          recordingStream: null,
          mediaRecorder: null,
          status: 'Recording selesai dengan audio laptop dan mikrofon'
        }));
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        updateStatus("Error saat recording layar. Silakan coba lagi.");
      };

      mediaRecorder.start();
      updateStatus("Recording layar dimulai...");
      
      setStreamingState(prev => ({
        ...prev,
        isScreenRecording: true,
        recordingStream: combinedStream,
        mediaRecorder,
        recordingStartTime: Date.now(),
        recordingTitle: judul,
        status: 'Recording layar berjalan dengan audio laptop dan mikrofon...'
      }));

    } catch (error: any) {
      console.error("Error starting screen recording:", error);
      updateStatus(error.message || "Gagal memulai recording layar.");
    }
  };

  const stopRecording = () => {
  // 1️⃣ Stop MediaRecorder
  if (
    streamingState.mediaRecorder &&
    streamingState.mediaRecorder.state === "recording"
  ) {
    streamingState.mediaRecorder.stop();
  }

  // 2️⃣ Stop semua track MediaStream
  if (streamingState.recordingStream) {
    streamingState.recordingStream
      .getTracks()
      .forEach(track => track.stop());
  }

  // 3️⃣ RESET SEMUA STATE VIDEO (WAJIB)
  setStreamingState(prev => ({
    ...prev,
    isRecording: false,
    isScreenRecording: false,
    recordingStream: null,
    mediaRecorder: null,

    // 🔴 PENTING (INI YANG HILANG SEBELUMNYA)
    videoBlob: null,
    videoUrl: null,
    recordingStartTime: null,
    recordingDuration: 0,

    status: "Recording dihentikan"
  }));
};


  const uploadRecording = async () => {
    if (!streamingState.videoBlob) return;

    try {
      updateStatus("Mengupload recording...");
      
      const formData = new FormData();
      formData.append('recording', streamingState.videoBlob, 'recording.webm');
      formData.append('kelas', streamingState.selectedKelas);
      formData.append('judul', streamingState.recordingTitle || 'Recording');
      formData.append('duration', streamingState.recordingDuration.toString());

      const response = await fetch(`${API_URL}/api/recordings/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        updateStatus("Recording berhasil diupload!");
        setStreamingState(prev => ({
          ...prev,
          videoBlob: null,
          videoUrl: null,
          recordingTitle: '',
          status: 'Recording berhasil diupload'
        }));
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error("Error uploading recording:", error);
      updateStatus("Gagal mengupload recording.");
    }
  };

  const cancelUpload = () => {
    if (streamingState.videoUrl) {
      URL.revokeObjectURL(streamingState.videoUrl);
    }
    
    setStreamingState(prev => ({
      ...prev,
      videoBlob: null,
      videoUrl: null,
      recordingTitle: '',
      status: 'Upload dibatalkan'
    }));
  };

  const startMultiCameraRecording = async (selectedCameras: string[], layoutType: string, judul: string, customLayout?: any[], screenSource?: any) => {
    try {
      updateStatus("Memulai recording multi-kamera...");
      
      if (selectedCameras.length === 0 && !screenSource) {
        throw new Error("Pilih setidaknya satu kamera atau aktifkan screen recording");
      }

      if (selectedCameras.length > 4) {
        throw new Error("Maksimal 4 kamera untuk recording");
      }

      // Store the initial layout
      if (customLayout && customLayout.length > 0) {
        currentRecordingLayout.current = customLayout;
      }

      // Get streams from selected cameras
      const cameraStreams: { [deviceId: string]: MediaStream } = {};
      const audioStreams: MediaStream[] = [];
      let screenStream: MediaStream | null = null;

      for (const deviceId of selectedCameras) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false // We'll handle audio separately
          });
          cameraStreams[deviceId] = stream;
        } catch (error: any) {
          console.error(`Error accessing camera ${deviceId}:`, error);
          throw new Error(`Gagal mengakses kamera: ${error.message}`);
        }
      }

      // Get screen stream if screen recording is enabled
      if (screenSource) {
        try {
          updateStatus("Meminta izin untuk screen recording...");
          
          const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
          
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
              audio: false // We'll handle audio separately
            });
          } else if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
            // Use web browser's getDisplayMedia with specific constraints based on screenSource type
            let displayMediaOptions: any = {
              video: {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 30, max: 60 }
              },
              audio: false // We'll handle audio separately
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
          
          updateStatus("Screen stream berhasil didapatkan...");
          
          // Optimize screen stream for memory management
          const videoTrack = screenStream.getVideoTracks()[0];
          if (videoTrack) {
            // Apply constraints to reduce memory usage
            await videoTrack.applyConstraints({
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 15, max: 30 }
            });
          }
        } catch (error: any) {
          console.error("Error accessing screen:", error);
          throw new Error(`Gagal mengakses layar: ${error.message}`);
        }
      }

      // Get audio stream (microphone)
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true
        });
        audioStreams.push(audioStream);
      } catch (error: any) {
        console.warn("Audio stream failed:", error);
        // Continue without audio if it fails
      }

      // Create canvas for composition with optimized size for memory management
      const canvas = document.createElement('canvas');
      canvas.width = 1280; // Optimized size for memory management
      canvas.height = 720;  // Optimized size for memory management
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context tidak tersedia');
      }
      
      // Optimize canvas for better memory management
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';

      // Create video elements for each camera with memory optimization
      const videoElements: { [deviceId: string]: HTMLVideoElement } = {};
      Object.entries(cameraStreams).forEach(([deviceId, stream]) => {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.style.width = '320px';
        video.style.height = '240px';
        video.style.display = 'none';
        // Optimize video element for memory management
        video.preload = 'none';
        video.controls = false;
        videoElements[deviceId] = video;
      });

      // Create video element for screen stream with memory optimization
      let screenVideoElement: HTMLVideoElement | null = null;
      if (screenStream) {
        screenVideoElement = document.createElement('video');
        screenVideoElement.srcObject = screenStream;
        screenVideoElement.autoplay = true;
        screenVideoElement.muted = true;
        screenVideoElement.playsInline = true;
        screenVideoElement.style.width = '320px';
        screenVideoElement.style.height = '240px';
        screenVideoElement.style.display = 'none';
        // Optimize screen video element for memory management
        screenVideoElement.preload = 'none';
        screenVideoElement.controls = false;
      }

      // Wait for videos to load and start playing
      const videoPromises = Object.values(videoElements).map(video => 
        new Promise(resolve => {
          video.onloadedmetadata = () => {
            video.play().then(() => {
              // Small delay to ensure video is actually playing
              setTimeout(() => {
                resolve(true);
              }, 100);
            }).catch(resolve);
          };
        })
      );

      // Add screen video promise if available
      if (screenVideoElement) {
        videoPromises.push(new Promise(resolve => {
          screenVideoElement!.onloadedmetadata = () => {
            screenVideoElement!.play().then(() => {
              // Small delay to ensure video is actually playing
              setTimeout(() => {
                resolve(true);
              }, 100);
            }).catch(resolve);
          };
        }));
      }

      await Promise.all(videoPromises);

      // Additional delay to ensure all videos are ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create canvas stream with optimized settings and memory management
      const canvasStream = canvas.captureStream(15); // Reduced to 15 FPS to save memory
      
      // Store canvas reference for cleanup
      const canvasRef = canvas;

      // Combine canvas video with audio
      const combinedStream = new MediaStream();
      
      // Add canvas video track
      canvasStream.getVideoTracks().forEach(track => {
        combinedStream.addTrack(track);
      });

      // Add audio track if available
      if (audioStreams.length > 0) {
        audioStreams[0].getAudioTracks().forEach(track => {
          combinedStream.addTrack(track);
        });
      }

      // Background-compatible animation function using setInterval for recording
      let isRecordingAnimating = true;
      let recordingAnimationInterval: NodeJS.Timeout | null = null;
      const recordingTargetFPS = 15; // Reduced to 15 FPS for screen sharing to save memory
      const recordingFrameInterval = 1000 / recordingTargetFPS;
      
      // Pre-calculate active streams to avoid filtering every frame
      const activeStreams = Object.entries(cameraStreams).filter(([deviceId]) => 
        selectedCameras.includes(deviceId)
      );
      const allStreams = [...activeStreams];
      if (screenStream && screenVideoElement) {
        allStreams.push(['screen', screenStream]);
      }
      
      const allVideoElements = { ...videoElements };
      if (screenVideoElement) {
        allVideoElements['screen'] = screenVideoElement;
      }
      
      const drawCamerasToCanvas = () => {
        if (!isRecordingAnimating) return;
        
        try {
          // Clear canvas completely to prevent memory leaks
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (allStreams.length === 0) {
            const frameId = requestAnimationFrame(drawCamerasToCanvas);
            animationFrameRef.current = frameId;
            return;
          }

          switch (layoutType) {
            case 'pip':
              drawPictureInPictureLayout(ctx, canvas.width, canvas.height, allStreams, allVideoElements);
              break;
            case 'custom':
              // Use current recording layout if available, otherwise use initial customLayout
              const layoutToUse = currentRecordingLayout.current.length > 0 ? currentRecordingLayout.current : customLayout;
              if (layoutToUse && layoutToUse.length > 0) {
                drawCustomLayout(ctx, canvas.width, canvas.height, layoutToUse, allVideoElements);
              } else {
                drawPictureInPictureLayout(ctx, canvas.width, canvas.height, allStreams, allVideoElements);
              }
              break;
          }
        } catch (error) {
          console.error('Error drawing to canvas:', error);
        }
      };

      // Layout drawing functions

      const drawPictureInPictureLayout = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, streams: [string, MediaStream][], videos: { [deviceId: string]: HTMLVideoElement }) => {
        if (streams.length === 0) return;

        // Filter enabled streams first
        const enabledStreams = streams.filter(([deviceId, stream]) => {
          const layout = currentRecordingLayout.current.find(l => l.deviceId === deviceId);
          return layout ? layout.enabled !== false : true; // Default to enabled if not found
        });
        
        if (enabledStreams.length === 0) return; // No enabled streams
        
        // Check if screen recording is included
        const screenStream = enabledStreams.find(([deviceId]) => deviceId === 'screen');
        const cameraStreams = enabledStreams.filter(([deviceId]) => deviceId !== 'screen');
        
        let mainDeviceId: string;
        let mainStream: MediaStream;
        
        if (screenStream) {
          // If screen recording is included, make it the main layout
          [mainDeviceId, mainStream] = screenStream;
        } else {
          // If no screen recording, use first camera as main
          [mainDeviceId, mainStream] = enabledStreams[0];
        }
        
        const mainVideo = videos[mainDeviceId];
        if (mainVideo && mainVideo.readyState >= 2) {
          try {
            ctx.drawImage(mainVideo, 0, 0, canvasWidth, canvasHeight);
          } catch (error) {
            console.error('Error drawing main source:', error);
          }
        }

        // Secondary sources as small windows
        const pipSize = Math.min(canvasWidth, canvasHeight) * 0.25;
        const pipSpacing = pipSize + 10;

        // Get all other sources (cameras if screen is main, or remaining cameras if camera is main)
        const otherStreams = screenStream ? cameraStreams : enabledStreams.slice(1);
        
        otherStreams.forEach(([deviceId, stream], index) => {
          const video = videos[deviceId];
          if (!video || video.readyState < 2) return;

          const x = canvasWidth - pipSize - 10;
          const y = 10 + (index * pipSpacing);

          try {
            // Draw small video
            ctx.drawImage(video, x, y, pipSize, pipSize);

            // Draw border
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, pipSize, pipSize);

            // Draw label
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(x, y + pipSize - 20, pipSize, 20);
            ctx.fillStyle = 'white';
            ctx.font = '12px Arial';
            const label = deviceId === 'screen' ? 'Layar' : `Kamera ${index + 1}`;
            ctx.fillText(label, x + 5, y + pipSize - 5);
          } catch (error) {
            console.error(`Error drawing PIP source ${index + 1}:`, error);
          }
        });
      };


      const drawCustomLayout = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, layouts: any[], videos: { [deviceId: string]: HTMLVideoElement }) => {
        if (layouts.length === 0) return;

        // Sort layouts by zIndex to draw in correct order
        const sortedLayouts = [...layouts].sort((a, b) => a.zIndex - b.zIndex);

        sortedLayouts.filter(layout => layout.enabled !== false).forEach(layout => {
          const video = videos[layout.deviceId];
          if (!video || video.readyState < 2) return;

          // Convert percentage to pixel coordinates
          const x = (layout.x / 100) * canvasWidth;
          const y = (layout.y / 100) * canvasHeight;
          const width = (layout.width / 100) * canvasWidth;
          const height = (layout.height / 100) * canvasHeight;

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
            ctx.fillText(layout.label, x + 10, y + 20);
          } catch (error) {
            console.error(`Error drawing custom camera ${layout.deviceId}:`, error);
          }
        });
      };

      // Start background-compatible animation loop using setInterval for recording
      recordingAnimationInterval = setInterval(drawCamerasToCanvas, recordingFrameInterval);

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error("MediaRecorder tidak didukung di browser ini.");
      }

      // Check for supported MIME types
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            throw new Error("Format video tidak didukung di browser ini.");
          }
        }
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: mimeType
      });

      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          // Prevent memory accumulation by limiting chunks
          if (chunks.length > 100) {
            chunks.splice(0, 50); // Remove old chunks to prevent memory buildup
          }
        }
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(chunks, { type: mimeType });
        const videoUrl = URL.createObjectURL(videoBlob);
        
        // Clear chunks array to free memory
        chunks.length = 0;
        
        // Stop animation loop and clean up animation intervals
        isRecordingAnimating = false;
        if (recordingAnimationInterval) {
          clearInterval(recordingAnimationInterval);
          recordingAnimationInterval = null;
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
        
        // Clean up camera streams
        Object.values(cameraStreams).forEach(stream => {
          stream.getTracks().forEach(track => track.stop());
        });
        
        // Clean up screen stream
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
        }
        
        audioStreams.forEach(stream => {
          stream.getTracks().forEach(track => track.stop());
        });
        
        // Clean up video elements (they're not in DOM, just stop their streams)
        Object.values(videoElements).forEach(video => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
          // Clear video element to prevent memory leaks
          video.srcObject = null;
        });
        
        if (screenVideoElement && screenVideoElement.srcObject) {
          const stream = screenVideoElement.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          screenVideoElement.srcObject = null;
        }
        
        // Clean up canvas to prevent memory leaks
        if (canvasRef) {
          const ctx = canvasRef.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
          }
        }
        
        // Force garbage collection to free memory immediately
        if (window.gc) {
          window.gc();
        }
        
        setStreamingState(prev => ({
          ...prev,
          videoBlob,
          videoUrl,
          recordingStream: null,
          mediaRecorder: null,
          isRecording: false,
          status: `Recording ${selectedCameras.length} kamera${screenSource ? ' + layar' : ''} selesai`
        }));
      };

      mediaRecorder.onerror = (event: any) => {
        console.error("MediaRecorder error:", event);
        updateStatus("Error saat recording multi-kamera. Silakan coba lagi.");
      };

      // Start recording
      mediaRecorder.start();
      
      setStreamingState(prev => ({
        ...prev,
        isRecording: true,
        recordingStream: combinedStream,
        mediaRecorder,
        recordingStartTime: Date.now(),
        recordingTitle: judul,
        status: `Recording ${selectedCameras.length} kamera${screenSource ? ' + layar' : ''} berjalan...`
      }));


      updateStatus(`Recording ${selectedCameras.length} kamera${screenSource ? ' + layar' : ''} berjalan...`);

    } catch (error: any) {
      console.error("Error starting Multi-Camera Recorder:", error);
      updateStatus(error.message || "Gagal memulai recording multi-kamera.");
    }
  };

  const startMultiCameraStreaming = useCallback(async (
    selectedCameras: string[], 
    layoutType: string, 
    judul: string, 
    customLayout?: any[], 
    screenSource?: any
  ) => {
    try {
      updateStatus("Memulai multi-camera streaming...");

      // Validate inputs
      if (selectedCameras.length === 0 && !screenSource) {
        throw new Error("Pilih setidaknya satu kamera atau aktifkan screen recording");
      }

      if (!judul.trim()) {
        throw new Error("Judul streaming harus diisi");
      }

      // Get camera streams
      const cameraStreams: { [deviceId: string]: MediaStream } = {};
      for (const deviceId of selectedCameras) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: { exact: deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false // We'll handle audio separately
          });
          cameraStreams[deviceId] = stream;
        } catch (error: any) {
          console.error(`Error accessing camera ${deviceId}:`, error);
          throw new Error(`Gagal mengakses kamera: ${error.message}`);
        }
      }

      // Get screen stream if screen recording is enabled
      let screenStream: MediaStream | null = null;
      if (screenSource) {
        try {
          updateStatus("Meminta izin untuk screen recording...");
          
          const isElectron = window.navigator.userAgent.toLowerCase().includes('electron');
          
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
              audio: false // We'll handle audio separately
            });
          } else if (navigator.mediaDevices && 'getDisplayMedia' in navigator.mediaDevices) {
            // Use web browser's getDisplayMedia with specific constraints based on screenSource type
            let displayMediaOptions: any = {
              video: {
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 },
                frameRate: { ideal: 30, max: 60 }
              },
              audio: false // We'll handle audio separately
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
          
          updateStatus("Screen stream berhasil didapatkan...");
          
          // Optimize screen stream for memory management
          const videoTrack = screenStream.getVideoTracks()[0];
          if (videoTrack) {
            // Apply constraints to reduce memory usage
            await videoTrack.applyConstraints({
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
              frameRate: { ideal: 15, max: 30 }
            });
          }
        } catch (error: any) {
          console.error("Error getting screen stream:", error);
          throw new Error(`Gagal mendapatkan screen stream: ${error.message}`);
        }
      }

      // Create canvas for composition with optimized size for memory management
      const canvas = document.createElement('canvas');
      canvas.width = 1280; // Reduced from 1920 to save memory
      canvas.height = 720;  // Reduced from 1080 to save memory
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error("Gagal membuat canvas context");
      }
      
      // Optimize canvas for better memory management
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';

      // Create video elements for each stream with memory optimization
      const videoElements: { [deviceId: string]: HTMLVideoElement } = {};
      for (const [deviceId, stream] of Object.entries(cameraStreams)) {
        const video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.style.display = 'none';
        video.playsInline = true;
        // Optimize video element for memory management
        video.preload = 'none';
        video.playsInline = true;
        video.controls = false;
        // Add to DOM temporarily for streaming
        document.body.appendChild(video);
        videoElements[deviceId] = video;
      }

      let screenVideoElement: HTMLVideoElement | null = null;
      if (screenStream) {
        screenVideoElement = document.createElement('video');
        screenVideoElement.srcObject = screenStream;
        screenVideoElement.autoplay = true;
        screenVideoElement.muted = true;
        screenVideoElement.style.display = 'none';
        screenVideoElement.playsInline = true;
        // Optimize screen video element for memory management
        screenVideoElement.preload = 'none';
        screenVideoElement.playsInline = true;
        screenVideoElement.controls = false;
        // Add to DOM temporarily for streaming
        document.body.appendChild(screenVideoElement);
      }

      // Store references for cleanup
      const activeStreams: [string, MediaStream][] = Object.entries(cameraStreams);
      if (screenStream && screenVideoElement) {
        activeStreams.push(['screen', screenStream]);
      }

      // Store initial streaming layout
      if (customLayout && customLayout.length > 0) {
        currentStreamingLayout.current = customLayout;
      }

      // Background-compatible animation function using setInterval instead of requestAnimationFrame
      let isAnimating = true;
      let animationInterval: NodeJS.Timeout | null = null;
      const targetFPS = 15; // Reduced from 30 to 15 FPS for screen sharing to save memory
      const frameInterval = 1000 / targetFPS;
      
      // Pre-calculate enabled streams to avoid filtering every frame
      let cachedEnabledStreams: [string, MediaStream][] = [];
      let lastLayoutVersion = -1;
      
      const updateCachedStreams = () => {
        if (lastLayoutVersion !== streamingLayoutVersion) {
          cachedEnabledStreams = activeStreams.filter(([deviceId, stream]) => {
            const layout = currentStreamingLayout.current.find(l => l.deviceId === deviceId);
            return layout ? layout.enabled !== false : true;
          });
          lastLayoutVersion = streamingLayoutVersion;
        }
      };
      
      const animate = () => {
        if (!isAnimating || !ctx) return;
        
        // Update cached streams only when layout changes
        updateCachedStreams();
        
        // Clear canvas completely to prevent memory accumulation
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        try {
          const allVideoElements = { ...videoElements };
          if (screenVideoElement) {
            allVideoElements['screen'] = screenVideoElement;
          }

          switch (layoutType) {
            case 'pip':
              drawPictureInPictureLayout(ctx, canvas.width, canvas.height, cachedEnabledStreams, allVideoElements);
              break;
            case 'custom':
              const layoutToUse = currentStreamingLayout.current.length > 0 ? currentStreamingLayout.current : (customLayout || []);
              if (layoutToUse.length > 0) {
                drawCustomLayout(ctx, canvas.width, canvas.height, layoutToUse, allVideoElements);
              } else {
                drawPictureInPictureLayout(ctx, canvas.width, canvas.height, cachedEnabledStreams, allVideoElements);
              }
              break;
          }
        } catch (error) {
          console.error('Error drawing to canvas:', error);
        }
      };
      
      // Optimized drawing functions
      const drawPictureInPictureLayout = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, streams: [string, MediaStream][], videos: { [deviceId: string]: HTMLVideoElement }) => {
        if (streams.length === 0) return;
        
        // Check if screen sharing is included and enabled
        const screenStream = streams.find(([deviceId]) => deviceId === 'screen');
        const cameraStreams = streams.filter(([deviceId]) => deviceId !== 'screen');
        
        let mainDeviceId: string;
        
        if (screenStream) {
          [mainDeviceId] = screenStream;
        } else {
          [mainDeviceId] = streams[0];
        }
        
        const mainVideo = videos[mainDeviceId];
        if (mainVideo && mainVideo.readyState >= 2) {
          ctx.drawImage(mainVideo, 0, 0, canvasWidth, canvasHeight);
        }
        
        // Draw other enabled streams as PIP
        const pipSize = Math.min(canvasWidth, canvasHeight) * 0.25;
        const otherStreams = screenStream ? cameraStreams : streams.slice(1);
        
        otherStreams.forEach(([deviceId], index) => {
          const video = videos[deviceId];
          if (video && video.readyState >= 2) {
            const x = canvasWidth - pipSize - 10;
            const y = 10 + (index * (pipSize + 10));
            ctx.drawImage(video, x, y, pipSize, pipSize);
          }
        });
      };
      
      const drawCustomLayout = (ctx: CanvasRenderingContext2D, canvasWidth: number, canvasHeight: number, layouts: any[], videos: { [deviceId: string]: HTMLVideoElement }) => {
        if (layouts.length === 0) return;
        
        // Sort layouts by zIndex to draw in correct order
        const sortedLayouts = [...layouts].sort((a, b) => a.zIndex - b.zIndex);
        
        sortedLayouts.filter(layout => layout.enabled !== false).forEach(layout => {
          const video = videos[layout.deviceId];
          if (!video || video.readyState < 2) return;
          
          // Convert percentage to pixel coordinates
          const x = (layout.x / 100) * canvasWidth;
          const y = (layout.y / 100) * canvasHeight;
          const width = (layout.width / 100) * canvasWidth;
          const height = (layout.height / 100) * canvasHeight;
          
          ctx.drawImage(video, x, y, width, height);
        });
      };

      // Get canvas stream with optimized settings and memory management
      const canvasStream = canvas.captureStream(15); // Reduced to 15 FPS to match animation FPS and save memory
      
      // Store canvas reference for cleanup
      const canvasRef = canvas;

      // Add audio to canvas stream for multi-camera streaming
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 44100
          }
        });
        
        const audioTrack = audioStream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
          console.log('Added audio track to canvas stream for multi-camera streaming');
        }
      } catch (audioError: any) {
        console.error("Failed to get audio for multi-camera streaming:", audioError);
        
        // Provide specific error messages
        if (audioError.name === 'NotAllowedError') {
          console.error("Audio access denied by user for multi-camera streaming");
          updateStatus("Akses mikrofon ditolak untuk multi-camera streaming.");
        } else if (audioError.name === 'NotFoundError') {
          console.error("No audio device found for multi-camera streaming");
          updateStatus("Tidak ada mikrofon yang ditemukan untuk multi-camera streaming.");
        } else {
          console.warn("Continuing multi-camera streaming without audio...");
          updateStatus("Audio tidak tersedia untuk multi-camera streaming, melanjutkan tanpa audio...");
        }
      }

      // Start streaming with canvas stream
      await startStream("admin", judul, canvasStream);

      // Store references for cleanup
      setStreamingState(prev => ({
        ...prev,
        isStreaming: true,
        localStream: canvasStream,
        status: `Streaming ${selectedCameras.length} kamera${screenSource ? ' + layar' : ''} berjalan...`
      }));

      // Store cleanup function for streaming
      const cleanupStreaming = () => {
        isAnimating = false;
        
        // Clear animation interval to prevent memory leaks
        if (animationInterval) {
          clearInterval(animationInterval);
          animationInterval = null;
        }
        
        // Cancel animation frames to prevent memory leaks
        if (streamingAnimationFrameRef.current) {
          cancelAnimationFrame(streamingAnimationFrameRef.current);
          streamingAnimationFrameRef.current = null;
        }
        
        // Clean up camera streams
        Object.values(cameraStreams).forEach(stream => {
          stream.getTracks().forEach(track => track.stop());
        });
        
        // Clean up screen stream
        if (screenStream) {
          screenStream.getTracks().forEach(track => track.stop());
        }
        
        // Clean up video elements from DOM and stop their streams
        Object.values(videoElements).forEach(video => {
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
          // Clear video element to prevent memory leaks
          video.srcObject = null;
          video.remove();
        });
        
        if (screenVideoElement) {
          if (screenVideoElement.parentNode) {
            screenVideoElement.parentNode.removeChild(screenVideoElement);
          }
          if (screenVideoElement.srcObject) {
            const stream = screenVideoElement.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
          }
          // Clear video element to prevent memory leaks
          screenVideoElement.srcObject = null;
          screenVideoElement.remove();
        }
        
        // Clean up canvas to prevent memory leaks
        if (canvasRef) {
          const ctx = canvasRef.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.width, canvasRef.height);
          }
        }
        
        // Force garbage collection to free memory immediately
        if (window.gc) {
          window.gc();
        }
      };
      
      // Store cleanup function reference
      streamingAnimateRef.current = cleanupStreaming;
      
      // Start background-compatible animation loop using setInterval
      animationInterval = setInterval(animate, frameInterval);

      updateStatus(`Streaming ${selectedCameras.length} kamera${screenSource ? ' + layar' : ''} berjalan...`);

    } catch (error: any) {
      console.error("Error starting multi-camera streaming:", error);
      updateStatus(error.message || "Gagal memulai streaming multi-kamera.");
    }
  }, [startStream, updateStatus]);

  const updateRecordingLayout = useCallback((newLayout: any[]) => {
    currentRecordingLayout.current = newLayout;
    setRecordingLayoutVersion(prev => prev + 1); // Trigger re-render
    updateStatus("Layout recording telah diupdate!");
  }, []);

  const updateStreamingLayout = useCallback((newLayout: any[]) => {
    console.log('Updating streaming layout:', newLayout);
    // Update current streaming layout
    currentStreamingLayout.current = newLayout;
    setStreamingLayoutVersion(prev => prev + 1); // Trigger re-render
    
    // Save to localStorage for streaming layout
    localStorage.setItem('streamingLayout', JSON.stringify(newLayout));
    console.log('Streaming layout updated, version:', streamingLayoutVersion + 1);
    updateStatus("Layout streaming telah diupdate!");
  }, [streamingLayoutVersion, updateStatus]);

  const value = {
    streamingState,
    startStream,
    stopStream,
    startCameraRecording,
    startScreenRecording,
    stopRecording,
    uploadRecording,
    cancelUpload,
    updateStatus,
    setSelectedKelas,
    setSelectedMapel,
    startMultiCameraRecording,
    startMultiCameraStreaming,
    updateRecordingLayout,
    updateStreamingLayout
  };

  return (
    <StreamingContext.Provider value={value}>
      {children}
    </StreamingContext.Provider>
  );
};
