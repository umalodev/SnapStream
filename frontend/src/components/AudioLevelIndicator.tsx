import React, { useEffect, useRef, useState } from 'react';

interface AudioLevelIndicatorProps {
  stream: MediaStream | null;
  isActive?: boolean;
}

const AudioLevelIndicator: React.FC<AudioLevelIndicatorProps> = ({ stream, isActive = true }) => {
  const [audioLevel, setAudioLevel] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!stream || !isActive) {
      // Clean up if not active
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setAudioLevel(null);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return;
    }

    try {
      // Initialize Audio Context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioContext;

      // Create analyser node
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connect audio source
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!isActive || !stream) return;

        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average level
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const level = Math.round((average / 255) * 100);
        setAudioLevel(level);

        // Clear canvas with subtle background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = 3;
        const barGap = 1;
        const barCount = 15;
        const barHeight = canvas.height * 0.85;

        // Draw bars with smoother appearance
        for (let i = 0; i < barCount; i++) {
          const sampleIndex = Math.floor((i / barCount) * bufferLength);
          const intensity = dataArray[sampleIndex] / 255;
          const currentBarHeight = intensity * barHeight;

          // Only draw if bar has meaningful height
          if (currentBarHeight > 2) {
            // Color based on intensity
            let color;
            if (intensity < 0.25) {
              color = '#10b981'; // Green
            } else if (intensity < 0.5) {
              color = '#22c55e'; // Bright Green
            } else if (intensity < 0.65) {
              color = '#f59e0b'; // Yellow
            } else if (intensity < 0.8) {
              color = '#f97316'; // Orange
            } else {
              color = '#ef4444'; // Red
            }

            const x = i * (barWidth + barGap) + barGap;
            const y = canvas.height - currentBarHeight;

            // Draw rounded rectangle
            ctx.fillStyle = color;
            const radius = 2;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + barWidth - radius, y);
            ctx.quadraticCurveTo(x + barWidth, y, x + barWidth, y + radius);
            ctx.lineTo(x + barWidth, y + currentBarHeight);
            ctx.quadraticCurveTo(x + barWidth, y + currentBarHeight, x + barWidth - radius, y + currentBarHeight);
            ctx.lineTo(x + radius, y + currentBarHeight);
            ctx.quadraticCurveTo(x, y + currentBarHeight, x, y + currentBarHeight - radius);
            ctx.lineTo(x, y + radius);
            ctx.quadraticCurveTo(x, y, x + radius, y);
            ctx.closePath();
            ctx.fill();

            // Add subtle shine effect
            if (intensity > 0.2) {
              const shineGradient = ctx.createLinearGradient(x, y, x + barWidth, y);
              shineGradient.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
              shineGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
              ctx.fillStyle = shineGradient;
              ctx.fill();
            }
          }
        }

        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (error) {
      console.error('Error setting up audio level indicator:', error);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [stream, isActive]);

  if (!stream) return null;

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px',
      background: 'rgba(255, 255, 255, 0.85)',
      backdropFilter: 'blur(8px)',
      padding: '3px 6px',
      borderRadius: '8px',
      border: '1px solid rgba(0, 0, 0, 0.08)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
    }}>
      <div style={{
        width: '16px',
        height: '16px',
        background: 'rgba(16, 185, 129, 0.9)',
        borderRadius: '4px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '10px',
        flexShrink: 0
      }}>
        🎤
      </div>
      
      <canvas
            ref={canvasRef}
            width={60}
            height={12}
            style={{
              border: '1px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '3px',
              backgroundColor: 'rgba(248, 250, 252, 0.8)'
            }}
          />
      {audioLevel !== null && (
        <span style={{ 
          fontSize: '8px', 
          color: '#10b981', 
          fontWeight: 700,
          minWidth: '26px',
          fontFamily: 'monospace'
        }}>
          {audioLevel}%
        </span>
      )}
    </div>
  );
};

export default AudioLevelIndicator;
