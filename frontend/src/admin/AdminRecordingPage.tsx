import React, { useRef, useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useStreaming } from "../context/StreamingContext";
import {
  FaCamera,
  FaTimes,
} from "react-icons/fa";
import ModalNotifikasi from "../components/ModalNotifikasi";
import MultiCameraRecorder from "../components/MultiCameraRecorder";
import BasicLayoutEditor from "../components/BasicLayoutEditor";
import { API_URL } from "../config";

// Color palette konsisten dengan AdminPanel
const LIGHT_GREEN = "#BBF7D0";
const SOFT_GREEN = "#DCFCE7";
const WHITE = "#fff";
const GRAY_TEXT = "#64748b";
const CARD_RADIUS = 18;
const SHADOW = "0 4px 24px rgba(187,247,208,0.12)";
const FONT_FAMILY = "Poppins, Inter, Segoe UI, Arial, sans-serif";
const LIGHT_GRAY = "#f5f5f5";

const COLORS = {
  primary: LIGHT_GREEN,
  primaryDark: "#86EFAC",
  accent: "#ef4444",
  accentDark: "#dc2626",
  text: "#1e293b",
  subtext: GRAY_TEXT,
  border: "#e5e7eb",
  bg: LIGHT_GRAY,
  white: WHITE,
  green: "#22c55e",
  greenDark: "#16a34a",
  red: "#ef4444",
  redDark: "#dc2626",
  yellow: "#facc15",
  yellowDark: "#eab308",
  badge: ["#dbeafe", "#fce7f3", "#fef3c7", "#d1fae5", "#fee2e2", "#f3e8ff"],
};

// Animated dot for recording status
const AnimatedDot = () => (
  <span
    style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: COLORS.accent,
      marginRight: 6,
      animation: "blink 1s infinite",
      verticalAlign: "middle",
    }}
  />
);

// Popup Modal
const PopupModal: React.FC<{
  open: boolean;
  onClose: () => void;
  message: string;
}> = ({ open, onClose, message }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: COLORS.white,
          borderRadius: CARD_RADIUS,
          boxShadow: SHADOW,
          padding: "24px",
          minWidth: 300,
          maxWidth: "90vw",
          textAlign: "center",
          border: `1px solid ${COLORS.border}`,
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 16,
            color: COLORS.accent,
            marginBottom: 8,
          }}
        >
          Peringatan
        </div>
        <div
          style={{ color: COLORS.text, fontSize: 14, marginBottom: 16 }}
        >
          {message}
        </div>
        <button
          onClick={onClose}
          style={{
            background: COLORS.primary,
            color: COLORS.white,
            border: "none",
            borderRadius: 6,
            fontWeight: 500,
            fontSize: 14,
            padding: "8px 20px",
            cursor: "pointer",
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
};

const AdminRecordingPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const {
    streamingState,
    startCameraRecording,
    startScreenRecording,
    stopRecording,
    uploadRecording,
    cancelUpload,
    setSelectedKelas,
    setSelectedMapel,
    startMultiCameraRecording,
    updateRecordingLayout,
  } = useStreaming();

  const [recordings, setRecordings] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [showPopup, setShowPopup] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1024
  );
  const [showJudulModal, setShowJudulModal] = useState(false);
  const [recordingJudul, setRecordingJudul] = useState("");
  const [pendingRecordingType, setPendingRecordingType] = useState<
    "camera" | "screen" | "multi-camera" | null
  >(null);
  const [showMultiCameraRecorder, setShowMultiCameraRecorder] =
    useState(false);
  const [multiCameraStatus, setMultiCameraStatus] = useState("");
  const [showRecordingLayoutEditor, setShowRecordingLayoutEditor] =
    useState(false);
  const [recordingLayouts, setRecordingLayouts] = useState<any[]>([]);
  const [recordingCameras, setRecordingCameras] = useState<any[]>([]);
  const [recordingScreenSource, setRecordingScreenSource] =
    useState<any>(null);
  const [currentRecordingLayoutType, setCurrentRecordingLayoutType] =
    useState<string>("");
  const [showFinishedPage, setShowFinishedPage] = useState(false);
  const [finishedRecordingData, setFinishedRecordingData] =
    useState<any>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
    duration: number;
  } | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<any>(null);
  const [showDeleteVideoModal, setShowDeleteVideoModal] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentRecordingTime, setCurrentRecordingTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Set srcObject only when recordingStream changes (prevents flicker)
  // This prevents the video from flickering by avoiding unnecessary srcObject resets
  useEffect(() => {
    if (!videoRef.current) return;
    
    // Only update srcObject when we have a stream and it's different
    // This prevents flicker caused by setting the same stream repeatedly
    if (streamingState.recordingStream) {
      if (videoRef.current.srcObject !== streamingState.recordingStream) {
        videoRef.current.srcObject = streamingState.recordingStream;
      }
    }
    // Don't clear srcObject here - let the cleanup useEffect handle it when recording stops
  }, [streamingState.recordingStream]);
  
  // 🔴 WAJIB: reset video element saat recording berhenti
  useEffect(() => {
    if (
      !streamingState.isRecording &&
      !streamingState.isScreenRecording
    ) {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
    }
  }, [
    streamingState.isRecording,
    streamingState.isScreenRecording,
  ]);


  // Responsive listener
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;

  // Pagination logic
  const totalPages = Math.ceil(recordings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRecordings = recordings.slice(startIndex, endIndex);

  const fetchRecordings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/recording`);
      if (res.ok) {
        const data = await res.json();
        setRecordings(data);
      }
    } catch (err) {
      // silent
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  // Reset to page 1 when recordings change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [recordings.length, currentPage, totalPages]);

  // Reset partial state when recording berhenti (bukan di finished page)
  useEffect(() => {
    if (
      !streamingState.isRecording &&
      !streamingState.isScreenRecording &&
      !showFinishedPage
    ) {
      setRecordingCameras([]);
      setRecordingScreenSource(null);
      setRecordingLayouts([]);
      setCurrentRecordingLayoutType("");
    }
  }, [
    streamingState.isRecording,
    streamingState.isScreenRecording,
    showFinishedPage,
  ]);

  // Update timer realtime
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (streamingState.isRecording || streamingState.isScreenRecording) {
      interval = setInterval(() => {
        if (streamingState.recordingStartTime) {
          const elapsed = Math.floor(
            (Date.now() - streamingState.recordingStartTime) / 1000
          );
          setCurrentRecordingTime(elapsed);
        } else {
          setCurrentRecordingTime(streamingState.recordingDuration);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    streamingState.isRecording,
    streamingState.isScreenRecording,
    streamingState.recordingStartTime,
    streamingState.recordingDuration,
  ]);

  const handleStartCameraRecording = () => {
    setPendingRecordingType("camera");
    setShowJudulModal(true);
  };

  const handleStartMultiCameraRecording = () => {
    setPendingRecordingType("multi-camera");
    setShowMultiCameraRecorder(true);
  };

  const handleConfirmRecording = async () => {
    if (!recordingJudul.trim()) {
      alert("Judul recording harus diisi!");
      return;
    }

    try {
      if (pendingRecordingType === "camera") {
        await startCameraRecording("admin", recordingJudul);
      }
      setShowJudulModal(false);
      setRecordingJudul("");
      setPendingRecordingType(null);
    } catch (error) {
      // silent
    }
  };

  const handleStopRecording = () => {
    stopRecording();
    handleStopAndPrepareFinishedPage();
  };

  const handleStopAndPrepareFinishedPage = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      const actualDuration = streamingState.recordingStartTime
        ? Math.floor((Date.now() - streamingState.recordingStartTime) / 1000)
        : currentRecordingTime ||
          streamingState.recordingDuration ||
          1;

      const finishedData = {
        judul:
          streamingState.recordingTitle ||
          recordingJudul ||
          "Recording Baru",
        duration: actualDuration,
        resolution: "1080p (Full HD)",
        frameRate: 60,
        size: 0,
        cameras: recordingCameras.length || 1,
        layers: recordingLayouts.length || 1,
        quality: "Excellent",
        bitrate: 5.0,
        uploadedAt: new Date().toISOString(),
        isUploaded: false,
        videoBlob: streamingState.videoBlob,
        videoUrl: streamingState.videoUrl,
      };

      setFinishedRecordingData(finishedData);
      setShowFinishedPage(true);
    } catch (err) {
      console.error("Error preparing finished page data:", err);
    }
  };

  const handleUploadVideo = async () => {
    if (!streamingState.videoBlob) {
      setNotification({
        message: "Tidak ada video untuk diunggah.",
        type: "error",
        duration: 3000,
      });
      return;
    }

    try {
      const uploadDuration =
        finishedRecordingData?.duration ||
        (streamingState.recordingStartTime
          ? Math.floor(
              (Date.now() - streamingState.recordingStartTime) / 1000
            )
          : currentRecordingTime || streamingState.recordingDuration || 0);

      const formData = new FormData();
      formData.append("recording", streamingState.videoBlob, "recording.webm");
      formData.append("kelas", streamingState.selectedKelas);
      formData.append(
        "judul",
        streamingState.recordingTitle ||
          finishedRecordingData?.judul ||
          "Recording"
      );
      formData.append("duration", uploadDuration.toString());

      const response = await fetch(
        `${API_URL}/api/recordings/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        fetchRecordings();
        setFinishedRecordingData((prev: any) => ({
          ...prev,
          size: streamingState.videoBlob
            ? streamingState.videoBlob.size
            : prev.size,
          isUploaded: true,
        }));
        setNotification({
          message: "Video berhasil diunggah!",
          type: "success",
          duration: 3000,
        });

        setTimeout(() => {
          handleBackToRecording();
        }, 1000);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err) {
      console.error("Error uploading video:", err);
      setNotification({
        message: "Gagal mengunggah video.",
        type: "error",
        duration: 3000,
      });
    }
  };

  const handlePreviewVideo = (blob: Blob | null, videoUrl?: string) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } else if (videoUrl) {
      window.open(videoUrl, "_blank");
    } else {
      setNotification({
        message: "Video tidak tersedia untuk pratinjau.",
        type: "error",
        duration: 3000,
      });
    }
  };

  const handlePlayVideo = (recording: any) => {
    setSelectedVideo(recording);
    setShowVideoModal(true);
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  const handleDeleteVideo = (recording: any) => {
    setVideoToDelete(recording);
    setShowDeleteVideoModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteVideoModal(false);
    setVideoToDelete(null);
  };

  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;

    try {
      setIsDeleting(true);
      const response = await fetch(
        `${API_URL}/api/recording/${videoToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        setNotification({
          message: "Video berhasil dihapus!",
          type: "success",
          duration: 3000,
        });
        fetchRecordings();
      } else {
        setNotification({
          message: "Gagal menghapus video.",
          type: "error",
          duration: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      setNotification({
        message: "Gagal menghapus video.",
        type: "error",
        duration: 3000,
      });
    } finally {
      setIsDeleting(false);
      handleCloseDeleteModal();
    }
  };

  const showConfirmDialog = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    if (confirmAction) confirmAction();
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const handleCancelUpload = () => {
    showConfirmDialog(
      "Apakah Anda yakin ingin membatalkan upload video ini? Video yang sudah direkam akan dihapus.",
      () => {
        cancelUpload();
      }
    );
  };

  const handleMultiCameraStartRecording = async (
    selectedCameras: string[],
    layoutType: string,
    judul: string,
    customLayout?: any[],
    cameras?: any[],
    screenSource?: any
  ) => {
    try {
      if (cameras) setRecordingCameras(cameras);
      if (screenSource) setRecordingScreenSource(screenSource);

      setCurrentRecordingLayoutType(layoutType);

      await startMultiCameraRecording(
        selectedCameras,
        layoutType,
        judul,
        customLayout,
        screenSource
      );
      setShowMultiCameraRecorder(false);
      setPendingRecordingType(null);
    } catch (error) {
      console.error("Error starting multi-camera recording:", error);
    }
  };

  const handleMultiCameraStatusUpdate = useCallback((status: string) => {
    setMultiCameraStatus(status);
  }, []);

  const handleRecordingLayoutChange = useCallback(
    (layouts: any[]) => {
      setRecordingLayouts(layouts);
      updateRecordingLayout(layouts);
    },
    [updateRecordingLayout]
  );

  const handleBackToRecording = () => {
    setShowFinishedPage(false);
    setFinishedRecordingData(null);
    setRecordingCameras([]);
    setRecordingScreenSource(null);
    setRecordingLayouts([]);
    setCurrentRecordingLayoutType("");
    setCurrentRecordingTime(0);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // ================= FINISHED PAGE (RESPONSIVE) =================
  if (showFinishedPage && finishedRecordingData) {
    return (
      <div
        style={{
          padding: isMobile ? "16px" : "24px",
          background: "#f3f4f6",
          fontFamily: FONT_FAMILY,
          minHeight: "100vh",
        }}
      >
        <style>
          {`
            @keyframes blink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.3; }
            }
            @keyframes pulse {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.05); }
            }
          `}
        </style>

        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {/* Banner */}
          <div
            style={{
              background: "#d1fae5",
              borderRadius: 16,
              padding: isMobile ? "20px" : "28px",
              marginBottom: 24,
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              gap: 20,
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
            }}
          >
            <div
              style={{
                width: isMobile ? 64 : 80,
                height: isMobile ? 64 : 80,
                borderRadius: "50%",
                background: "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i
                className="fas fa-check"
                style={{
                  fontSize: isMobile ? 28 : 32,
                  color: "white",
                }}
              />
            </div>
            <div>
              <h1
                style={{
                  fontSize: isMobile ? 20 : 24,
                  fontWeight: 700,
                  color: "#1f2937",
                  margin: "0 0 8px 0",
                }}
              >
                Recording Selesai!
              </h1>
              <p
                style={{
                  fontSize: isMobile ? 13 : 15,
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                Video recording Anda telah berhasil disimpan dan siap untuk
                digunakan.
              </p>
            </div>
          </div>

          {/* Ringkasan */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: isMobile ? "18px" : "24px",
              marginBottom: 24,
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
              border: "1px solid #e5e7eb",
            }}
          >
            <h2
              style={{
                fontSize: isMobile ? 18 : 20,
                fontWeight: 600,
                color: "#1f2937",
                margin: "0 0 16px 0",
              }}
            >
              Ringkasan Recording
            </h2>

            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: 20,
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: isMobile ? "100%" : 220,
                  height: isMobile ? 140 : 130,
                  borderRadius: 10,
                  background: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  border: "1px solid #e5e7eb",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {(() => {
                  const videoBlob =
                    finishedRecordingData.videoBlob ||
                    streamingState.videoBlob;
                  const videoUrl =
                    finishedRecordingData.videoUrl ||
                    streamingState.videoUrl;

                  if (videoBlob) {
                    return (
                      <video
                        src={URL.createObjectURL(videoBlob)}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        muted
                        preload="metadata"
                      />
                    );
                  } else if (videoUrl) {
                    return (
                      <video
                        src={videoUrl}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                        muted
                        preload="metadata"
                      />
                    );
                  } else {
                    return (
                      <i
                        className="fas fa-video"
                        style={{ fontSize: 32, color: "#10b981" }}
                      />
                    );
                  }
                })()}
              </div>

              {/* Detail */}
              <div
                style={{
                  flex: 1,
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "auto 1fr",
                  rowGap: 10,
                  columnGap: 12,
                }}
              >
                <div style={{ fontWeight: 600, color: "#374151" }}>
                  JUDUL RECORDING:
                </div>
                <div style={{ color: "#6b7280" }}>
                  {streamingState.recordingTitle ||
                    finishedRecordingData.judul ||
                    recordingJudul ||
                    "Recording Baru"}
                </div>

                <div style={{ fontWeight: 600, color: "#374151" }}>
                  DURASI:
                </div>
                <div style={{ color: "#6b7280" }}>
                  {formatDuration(
                    finishedRecordingData.duration || currentRecordingTime || 0
                  )}
                </div>

                <div style={{ fontWeight: 600, color: "#374151" }}>
                  RESOLUTION:
                </div>
                <div style={{ color: "#6b7280" }}>
                  {finishedRecordingData.resolution}
                </div>

                <div style={{ fontWeight: 600, color: "#374151" }}>
                  FRAME RATE:
                </div>
                <div style={{ color: "#6b7280" }}>
                  {finishedRecordingData.frameRate} FPS
                </div>

                <div style={{ fontWeight: 600, color: "#374151" }}>
                  WAKTU SIMPAN:
                </div>
                <div style={{ color: "#6b7280" }}>
                  {formatDate(finishedRecordingData.uploadedAt)}
                </div>
              </div>
            </div>
          </div>

          {/* Tombol Aksi */}
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <button
               onClick={() =>
    handlePreviewVideo(
      streamingState.videoBlob ?? finishedRecordingData?.videoBlob,
      streamingState.videoUrl ?? finishedRecordingData?.videoUrl
    )
              }
              style={{
                padding: "12px 20px",
                background: "#ffffff",
                color: "#10b981",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
                boxShadow:
                  "0 1px 3px rgba(0, 0, 0, 0.1)",
              }}
            >
              <i className="fas fa-play" style={{ fontSize: 14 }} />
              Preview Video
            </button>

            <button
              onClick={handleUploadVideo}
              disabled={finishedRecordingData.isUploaded}
              style={{
                padding: "12px 20px",
                borderRadius: 8,
                background: finishedRecordingData.isUploaded
                  ? "#e5e7eb"
                  : "#10b981",
                color: finishedRecordingData.isUploaded
                  ? "#6b7280"
                  : "#ffffff",
                border: "none",
                fontSize: 14,
                fontWeight: 500,
                cursor: finishedRecordingData.isUploaded
                  ? "not-allowed"
                  : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <i className="fas fa-upload" style={{ fontSize: 14 }} />
              {finishedRecordingData.isUploaded
                ? "Uploaded"
                : "Upload Video"}
            </button>

            <button
              onClick={handleBackToRecording}
              style={{
                padding: "12px 20px",
                background: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "center",
              }}
            >
              <i className="fas fa-times" style={{ fontSize: 14 }} />
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ================= RECORDING FULLSCREEN MODE =================
  if (streamingState.isRecording || streamingState.isScreenRecording) {
    return (
      <>
        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
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
            color: "#000000",
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
              borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
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

            {/* Right - REC badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "6px 12px",
                  background: "rgba(239, 68, 68, 0.2)",
                  borderRadius: "20px",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: COLORS.accent,
                    animation: "blink 1s infinite",
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#ffffff",
                    textTransform: "uppercase",
                  }}
                >
                  REC
                </span>
              </div>

              {/* Timer */}
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#000000",
                  fontFamily: "monospace",
                  padding: "6px 12px",
                  background: "rgba(0, 0, 0, 0.05)",
                  borderRadius: "4px",
                }}
              >
                {Math.floor(currentRecordingTime / 60)
                  .toString()
                  .padStart(2, "0")}
                :
                {(currentRecordingTime % 60)
                  .toString()
                  .padStart(2, "0")}
              </div>

              {/* Stop Button */}
              <button
                onClick={handleStopRecording}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "8px 16px",
                  background: COLORS.accent,
                  color: COLORS.white,
                  border: "none",
                  borderRadius: "4px",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = COLORS.accentDark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = COLORS.accent;
                }}
              >
                <AnimatedDot />
                Stop Recording
              </button>
            </div>
          </div>

          {/* ================= VIDEO CONTAINER ================= */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
              background: "#ffffff",
            }}
          >
            {streamingState.recordingStream ? (
              <video
                key={streamingState.recordingStartTime}
                ref={(el) => {
                  videoRef.current = el;
                  // Don't set srcObject here - use useEffect instead to prevent flicker
                }}
                autoPlay
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                  color: "#000000",
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: "50%",
                    background: "rgba(0, 0, 0, 0.05)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    animation: "pulse 2s infinite",
                  }}
                >
                  <i className="fas fa-video" style={{ fontSize: 24 }} />
                </div>
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  Menunggu video stream...
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // ================= MAIN PAGE (RESPONSIVE) =================
  return (
    <>
      {/* Animations */}
      <style>
        {`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
              @keyframes fadeIn {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes fadeInUp {
    0% { opacity: 0; transform: translateY(30px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }
        `}
      </style>

      <div
        style={{
          padding: isMobile ? "16px" : "24px",
          background: COLORS.bg,
          fontFamily: FONT_FAMILY,
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
          }}
        >
          {/* HERO / WELCOME CARD */}
          <div
            style={{
              background:
                "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              borderRadius: 16,
              padding: isMobile ? "20px 18px" : "26px 24px",
              marginBottom: 24,
              color: "#ffffff",
              position: "relative",
              overflow: "hidden",
              boxShadow:
                "0 10px 30px rgba(16, 185, 129, 0.2)",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: isMobile ? 16 : 0,
                  animation: "fadeIn 0.6s ease-out",

            }}
          >
            {/* Decorative circles */}
            <div
              style={{
                position: "absolute",
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                background: "rgba(255, 255, 255, 0.12)",
                borderRadius: "50%",
                filter: "blur(40px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -30,
                left: -30,
                width: 150,
                height: 150,
                background: "rgba(255, 255, 255, 0.1)",
                borderRadius: "50%",
                filter: "blur(30px)",
              }}
            />

            {/* Text */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: isMobile ? 13 : 14,
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  color: "rgba(255, 255, 255, 0.9)",
                  fontWeight: 500,
                }}
              >
                <i
                  className="fas fa-calendar-days"
                  style={{ fontSize: 14 }}
                />
                {new Date().toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>

              <h1
                style={{
                  fontSize: isMobile ? 20 : 26,
                  fontWeight: 700,
                  margin: "0 0 10px 0",
                  letterSpacing: "-0.5px",
                }}
              >
                Video Recording
              </h1>

              <div
                style={{
                  fontSize: isMobile ? 13 : 15,
                  color: "rgba(255, 255, 255, 0.92)",
                  lineHeight: 1.6,
                  maxWidth: 520,
                }}
              >
                Selamat datang, {user?.name || "Admin"}! Buat dan kelola
                video pembelajaran Anda dengan mudah.
              </div>
            </div>

            {/* Icon */}
            <div
              style={{
                position: "relative",
                zIndex: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: isMobile ? 60 : 90,
                  filter:
                    "drop-shadow(0 4px 18px rgba(0,0,0,0.25))",
                }}
              >
                🎥
              </span>
            </div>
          </div>

          {/* MAIN CARD: Controls + List */}
          <div
            style={{
              background:
                "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
              borderRadius: 24,
              padding: isMobile ? "18px 16px" : "24px 22px",
              boxShadow:
                "0 20px 40px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)",
              border: "1px solid #e5e7eb",
              position: "relative",
            }}
          >
            {/* Background pattern */}
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 180,
                height: 180,
                background:
                  "radial-gradient(circle, rgba(187,247,208,0.16) 0%, transparent 70%)",
                borderRadius: "50%",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -40,
                left: -40,
                width: 180,
                height: 180,
                background:
                  "radial-gradient(circle, rgba(134,239,172,0.16) 0%, transparent 70%)",
                borderRadius: "50%",
              }}
            />

            {/* Title */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: isMobile ? 18 : 22,
                  fontWeight: 700,
                  color: COLORS.text,
                  margin: 0,
                  background:
                    "linear-gradient(135deg, #1e293b 0%, #475569 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Buat Video Recording
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: COLORS.subtext,
                  margin: "4px 0 0 0",
                }}
              >
                Buat dan kelola recording video dengan mudah.
              </p>
            </div>

            {/* Buttons */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  gap: 10,
                }}
              >
                {/* Jika TIDAK sedang recording */}
                {!(streamingState.isRecording ||
                  streamingState.isScreenRecording) ? (
                  <>
                    <button
                      onClick={handleStartMultiCameraRecording}
                      disabled={
                        streamingState.isRecording ||
                        streamingState.isScreenRecording ||
                        streamingState.isStreaming
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                        background: streamingState.isStreaming
                          ? "linear-gradient(135deg, #64748b 0%, #64748b 100%)"
                          : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: 16,
                        padding: "12px 18px",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: streamingState.isStreaming
                          ? "not-allowed"
                          : "pointer",
                        opacity: streamingState.isStreaming ? 0.6 : 1,
                        boxShadow: streamingState.isStreaming
                          ? "none"
                          : "0 8px 20px rgba(16,185,129,0.35)",
                        width: isMobile ? "100%" : "auto",
                      }}
                      title={
                        streamingState.isStreaming
                          ? "Live streaming sedang aktif. Stop live streaming terlebih dahulu untuk memulai recording."
                          : ""
                      }
                    >
                      <span style={{ fontSize: 18 }}>🎥</span>
                      <span>
                        Multi-Camera Recording{" "}
                        {streamingState.isStreaming
                          ? "(Live Streaming Aktif)"
                          : ""}
                      </span>
                    </button>
                  </>
                ) : (
                  <>
                    {/* STOP BUTTON */}
                    <button
                      onClick={handleStopRecording}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        background: COLORS.accent,
                        color: COLORS.white,
                        border: "none",
                        borderRadius: 12,
                        padding: "10px 14px",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      <AnimatedDot />
                      {streamingState.isRecording
                        ? "Stop Recording"
                        : "Stop Screen Recording"}
                    </button>

                    {/* EDIT LAYOUT (jika custom) */}
                    {streamingState.isRecording &&
                      currentRecordingLayoutType === "custom" && (
                        <button
                          onClick={() => {
                            const savedLayout =
                              localStorage.getItem("cameraLayout");
                            if (savedLayout) {
                              try {
                                const parsed = JSON.parse(savedLayout);
                                setRecordingLayouts(parsed);
                              } catch (e) {
                                console.error(
                                  "Error parsing saved layout:",
                                  e
                                );
                              }
                            }
                            const savedScreen =
                              localStorage.getItem("screenSource");
                            if (savedScreen) {
                              try {
                                const parsed = JSON.parse(savedScreen);
                                setRecordingScreenSource(parsed);
                              } catch (e) {
                                console.error(
                                  "Error parsing saved screen source:",
                                  e
                                );
                              }
                            }
                            setShowRecordingLayoutEditor(true);
                          }}
                          style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 8,
                            padding: "10px 14px",
                            backgroundColor: "#3b82f6",
                            color: COLORS.white,
                            border: "none",
                            borderRadius: 12,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          🎨 Edit Layout
                        </button>
                      )}
                  </>
                )}
              </div>
            </div>

            {/* LIVE PREVIEW */}
            {(streamingState.isRecording ||
              streamingState.isScreenRecording) &&
              streamingState.recordingStream && (
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 10,
                      padding: "8px 10px",
                      background: COLORS.yellow,
                      borderRadius: 8,
                      border: `1px solid ${COLORS.yellowDark}`,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: COLORS.accent,
                        animation: "pulse 1s infinite",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      📹 Preview{" "}
                      {streamingState.isRecording ? "Kamera" : "Layar"}{" "}
                      (Sedang Recording)
                      {streamingState.isScreenRecording &&
                        " - Audio: Laptop + Mikrofon"}
                    </span>
                  </div>
                  <div
                    style={{
                      position: "relative",
                      borderRadius: 10,
                      overflow: "hidden",
                      border: `2px solid ${COLORS.yellow}`,
                      background: "#000",
                    }}
                  >
                   <video
  ref={(el) => {
    videoRef.current = el;
    // Don't set srcObject here - use useEffect instead to prevent flicker
  }}
  autoPlay
  muted
  style={{
    width: "100%",
    height: isMobile ? 220 : 380,
    objectFit: "contain",
    display: "block",
  }}
/>

                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        background: "rgba(0,0,0,0.7)",
                        color: COLORS.white,
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        animation: "pulse 2s infinite",
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: COLORS.accent,
                          animation: "blink 1s infinite",
                        }}
                      />
                      REC
                    </div>
                    <div
                      style={{
                        position: "absolute",
                        bottom: 8,
                        left: 8,
                        background: "rgba(0,0,0,0.7)",
                        color: COLORS.white,
                        padding: "4px 8px",
                        borderRadius: 4,
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "monospace",
                      }}
                    >
                      {Math.floor(currentRecordingTime / 60)
                        .toString()
                        .padStart(2, "0")}
                      :
                      {(currentRecordingTime % 60)
                        .toString()
                        .padStart(2, "0")}
                    </div>
                  </div>
                </div>
              )}

            {/* LIST VIDEO TERSIMPAN */}
            {!streamingState.isRecording &&
              !streamingState.isScreenRecording &&
              recordings &&
              recordings.length > 0 && (
                <div
                  style={{
                    position: "relative",
                    zIndex: 1,
                    marginTop: 22,
                  }}
                >
                  <h2
                    style={{
                      fontSize: isMobile ? 17 : 19,
                      fontWeight: 600,
                      color: "#1f2937",
                      marginBottom: 14,
                    }}
                  >
                    Daftar Video Tersimpan
                  </h2>

                  {/* HEADER (desktop) */}
                  <div
                    style={{
                      display: isMobile ? "none" : "grid",
                      gridTemplateColumns:
                        "120px 1fr 100px 140px 120px",
                      gap: 12,
                      padding: "12px 16px",
                      fontWeight: 500,
                      color: "#6b7280",
                      fontSize: 13,
                      background: "#f9fafb",
                      borderRadius: "12px 12px 0 0",
                      border: "1px solid #e5e7eb",
                      borderBottom: "1px solid #e5e7eb",
                    }}
                  >
                    <div>Video</div>
                    <div style={{ textAlign: "center" }}>Judul</div>
                    <div style={{ textAlign: "center" }}>Durasi</div>
                    <div style={{ textAlign: "center" }}>
                      Tanggal & Waktu
                    </div>
                    <div style={{ textAlign: "center" }}>Aksi</div>
                  </div>

                  {/* BODY */}
                  <div
                    style={{
                      background: "#ffffff",
                      borderRadius: isMobile
                        ? 12
                        : "0 0 12px 12px",
                      border: "1px solid #e5e7eb",
                      borderTop: isMobile ? "1px solid #e5e7eb" : "none",
                    }}
                  >
                    {paginatedRecordings.map(
                      (recording: any, idx: number) => (
                        <div
                          key={recording.id}
                          style={{
                            display: isMobile ? "block" : "grid",
                            gridTemplateColumns:
                              "120px 1fr 100px 140px 120px",
                            gap: 12,
                            padding: isMobile
                              ? "12px 14px"
                              : "14px 16px",
                            borderBottom:
                              idx <
                              paginatedRecordings.length - 1
                                ? "1px solid #e5e7eb"
                                : "none",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isMobile)
                              (e.currentTarget.style.background =
                                "#f9fafb");
                          }}
                          onMouseLeave={(e) => {
                            if (!isMobile)
                              (e.currentTarget.style.background =
                                "transparent");
                          }}
                        >
                          {/* Thumbnail (desktop) */}
                          <div
                            style={{
                              display: isMobile ? "none" : "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              height: 70,
                              borderRadius: 8,
                              background:
                                "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(52,211,153,0.05))",
                              position: "relative",
                              overflow: "hidden",
                            }}
                          >
                            <video
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: 8,
                              }}
                              muted
                              preload="metadata"
                              src={`${API_URL}/api/recording/download/${recording.filename}`}
                              onError={(e) => {
                                (e.currentTarget.style.display =
                                  "none");
                                if (e.currentTarget.parentElement) {
                                  e.currentTarget.parentElement.innerHTML =
                                    '<div style="display:flex;align-items:center;justify-content:center;color:#9ca3af;"><div style="font-size:24px;">📹</div></div>';
                                }
                              }}
                            />
                          </div>

                          {/* Judul & info (mobile card top) */}
                          {isMobile && (
                            <div
                              style={{
                                marginBottom: 8,
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 600,
                                  color: "#111827",
                                }}
                              >
                                {recording.judul ||
                                  recording.filename}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#6b7280",
                                }}
                              >
                                Durasi:{" "}
                                {formatDuration(
                                  recording.duration || 0
                                )}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "#6b7280",
                                }}
                              >
                                {new Date(
                                  recording.uploadedAt ||
                                    recording.createdAt
                                ).toLocaleString("id-ID")}
                              </div>
                            </div>
                          )}

                          {/* Judul (desktop) */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              alignItems: "center",
                              textAlign: "center",
                              minHeight: 70,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: "#4b5563",
                                lineHeight: 1.3,
                              }}
                            >
                              {recording.judul ||
                                recording.filename}
                            </div>
                          </div>

                          {/* Durasi (desktop) */}
                          <div
                            style={{
                              display: isMobile ? "none" : "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              color: "#6b7280",
                            }}
                          >
                            {formatDuration(recording.duration || 0)}
                          </div>

                          {/* Tanggal & Waktu (desktop) */}
                          <div
                            style={{
                              display: isMobile ? "none" : "flex",
                              flexDirection: "column",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 13,
                              color: "#6b7280",
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 500,
                                marginBottom: 2,
                              }}
                            >
                              {new Date(
                                recording.uploadedAt ||
                                  recording.createdAt
                              ).toLocaleDateString("id-ID", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </div>
                            <div
                              style={{
                                color: "#9ca3af",
                                fontSize: 11,
                              }}
                            >
                              {new Date(
                                recording.uploadedAt ||
                                  recording.createdAt
                              ).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>

                          {/* Aksi */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: isMobile
                                ? "flex-start"
                                : "center",
                              alignItems: "center",
                              gap: 8,
                              marginTop: isMobile ? 6 : 0,
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              onClick={() =>
                                handlePlayVideo(recording)
                              }
                              style={{
                                padding: isMobile
                                  ? "8px 12px"
                                  : 8,
                                background: "#ffffff",
                                color: "#10b981",
                                border:
                                  "1px solid #10b981",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                              }}
                            >
                              <i
                                className="fas fa-play"
                                style={{ fontSize: 12 }}
                              />
                              {isMobile && "Putar"}
                            </button>

                            <button
                              onClick={() =>
                                handleDeleteVideo(recording)
                              }
                              style={{
                                padding: isMobile
                                  ? "8px 12px"
                                  : 8,
                                background: "#ffffff",
                                color: "#ef4444",
                                border:
                                  "1px solid #ef4444",
                                borderRadius: 8,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                              }}
                            >
                              <i
                                className="fas fa-trash"
                                style={{ fontSize: 12 }}
                              />
                              {isMobile && "Hapus"}
                            </button>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* PAGINATION */}
                  {totalPages > 1 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "20px",
                        padding: isMobile ? "16px" : "20px",
                        background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                        borderRadius: 12,
                        border: "1px solid #e5e7eb",
                        flexDirection: isMobile ? "column" : "row",
                        gap: isMobile ? "12px" : "0",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "14px",
                          color: "#6b7280",
                          fontWeight: 500,
                          textAlign: isMobile ? "center" : "left",
                        }}
                      >
                        Menampilkan{" "}
                        <strong
                          style={{
                            color: COLORS.green,
                            fontWeight: 700,
                            fontSize: "15px",
                          }}
                        >
                          {startIndex + 1}-{Math.min(endIndex, recordings.length)}
                        </strong>{" "}
                        dari{" "}
                        <strong
                          style={{
                            color: "#1e293b",
                            fontWeight: 700,
                            fontSize: "15px",
                          }}
                        >
                          {recordings.length}
                        </strong>{" "}
                        video
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        {/* Prev */}
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(prev - 1, 1))
                          }
                          disabled={currentPage === 1}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            background:
                              currentPage === 1 ? "#f3f4f6" : "#ffffff",
                            color:
                              currentPage === 1 ? "#9ca3af" : "#374151",
                            fontSize: "14px",
                            fontWeight: 600,
                            cursor:
                              currentPage === 1 ? "not-allowed" : "pointer",
                            border: "1px solid #e5e7eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (currentPage !== 1) {
                              e.currentTarget.style.background = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentPage !== 1) {
                              e.currentTarget.style.background = "#ffffff";
                            }
                          }}
                        >
                          <i className="fas fa-chevron-left" style={{ fontSize: "12px" }} />
                        </button>

                        {/* Page numbers */}
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          {Array.from(
                            { length: Math.min(totalPages, 5) },
                            (_, i) => {
                              let page: number;
                              if (totalPages <= 5) {
                                page = i + 1;
                              } else if (currentPage <= 3) {
                                page = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                page = totalPages - 4 + i;
                              } else {
                                page = currentPage - 2 + i;
                              }

                              const isActive = currentPage === page;

                              return (
                                <button
                                  key={page}
                                  onClick={() => setCurrentPage(page)}
                                  style={{
                                    padding: "8px 12px",
                                    borderRadius: 8,
                                    background: isActive
                                      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                      : "#ffffff",
                                    color: isActive ? "#ffffff" : "#374151",
                                    fontSize: "14px",
                                    fontWeight: isActive ? 700 : 600,
                                    cursor: "pointer",
                                    border: `2px solid ${
                                      isActive ? COLORS.green : "#e5e7eb"
                                    }`,
                                    transition: "all 0.2s ease",
                                    minWidth: 40,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!isActive) {
                                      e.currentTarget.style.background = "#f9fafb";
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!isActive) {
                                      e.currentTarget.style.background = "#ffffff";
                                    }
                                  }}
                                >
                                  {page}
                                </button>
                              );
                            }
                          )}

                          {totalPages > 5 && currentPage < totalPages - 2 && (
                            <span
                              style={{
                                color: "#9ca3af",
                                fontSize: "16px",
                                fontWeight: 700,
                                padding: "0 4px",
                              }}
                            >
                              ...
                            </span>
                          )}
                        </div>

                        {/* Next */}
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                          }
                          disabled={currentPage === totalPages}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            background:
                              currentPage === totalPages
                                ? "#f3f4f6"
                                : "#ffffff",
                            color:
                              currentPage === totalPages
                                ? "#9ca3af"
                                : "#374151",
                            fontSize: "14px",
                            fontWeight: 600,
                            cursor:
                              currentPage === totalPages
                                ? "not-allowed"
                                : "pointer",
                            border: "1px solid #e5e7eb",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (currentPage !== totalPages) {
                              e.currentTarget.style.background = "#f9fafb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentPage !== totalPages) {
                              e.currentTarget.style.background = "#ffffff";
                            }
                          }}
                        >
                          <i className="fas fa-chevron-right" style={{ fontSize: "12px" }} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </div>

          {/* Popup Modal */}
          <PopupModal
            open={showPopup}
            onClose={() => setShowPopup(false)}
            message="Silakan pilih kelas dan mata pelajaran terlebih dahulu sebelum melakukan recording."
          />

          {/* Modal Konfirmasi */}
          <ModalNotifikasi
            isOpen={showConfirmModal}
            title="Konfirmasi"
            message={confirmMessage}
            type="warning"
            onConfirm={handleConfirmAction}
            onCancel={() => {
              setShowConfirmModal(false);
              setConfirmAction(null);
            }}
            confirmText="Ya"
            cancelText="Batal"
          />

          {/* Modal Input Judul */}
          {showJudulModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: 20,
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: 24,
                  maxWidth: 500,
                  width: "100%",
                  boxShadow:
                    "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                }}
              >
                <h3
                  style={{
                    margin: "0 0 12px 0",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "#1e293b",
                  }}
                >
                  Masukkan Judul Recording
                </h3>
                <p
                  style={{
                    margin: "0 0 16px 0",
                    fontSize: 14,
                    color: "#64748b",
                  }}
                >
                  Berikan judul yang deskriptif untuk recording Anda.
                </p>
                <input
                  type="text"
                  value={recordingJudul}
                  onChange={(e) => setRecordingJudul(e.target.value)}
                  placeholder="Contoh: Tutorial React - Bagian 1"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: 14,
                    marginBottom: 18,
                    boxSizing: "border-box",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleConfirmRecording();
                  }}
                  autoFocus
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                  }}
                >
                  <button
                    onClick={() => {
                      setShowJudulModal(false);
                      setRecordingJudul("");
                      setPendingRecordingType(null);
                    }}
                    style={{
                      padding: "9px 16px",
                      background: "#f3f4f6",
                      color: "#374151",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleConfirmRecording}
                    style={{
                      padding: "9px 16px",
                      background: "#2563eb",
                      color: "white",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Mulai Recording
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Camera Recorder Modal */}
          {showMultiCameraRecorder && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1100,
                padding: 20,
              }}
            >
              <div
                style={{
                  background: COLORS.white,
                  borderRadius: CARD_RADIUS,
                  padding: isMobile ? 18 : 22,
                  maxWidth: 480,
                  width: "100%",
                  maxHeight: "80vh",
                  overflow: "auto",
                  boxShadow: SHADOW,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: isMobile ? "flex-start" : "center",
                    gap: isMobile ? 12 : 0,
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: isMobile ? 28 : 32,
                        height: isMobile ? 28 : 32,
                        borderRadius: 8,
                        background: COLORS.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: COLORS.white,
                      }}
                    >
                      <FaCamera size={isMobile ? 12 : 14} />
                    </div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: isMobile ? 16 : 18,
                        fontWeight: 600,
                        color: COLORS.text,
                      }}
                    >
                      Multi-Camera Recording
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      setShowMultiCameraRecorder(false);
                      setPendingRecordingType(null);
                    }}
                    style={{
                      background: COLORS.bg,
                      color: COLORS.subtext,
                      border: `1px solid ${COLORS.border}`,
                      borderRadius: 8,
                      padding: isMobile ? "6px 10px" : "8px 12px",
                      fontSize: isMobile ? 12 : 13,
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <FaTimes size={12} />
                    Tutup
                  </button>
                </div>

                {/* Status */}
                {multiCameraStatus && (
                  <div
                    style={{
                      marginBottom: 14,
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 500,
                      background: multiCameraStatus.includes("berhasil")
                        ? "#d1fae5"
                        : multiCameraStatus.includes("Error")
                        ? "#fee2e2"
                        : "#fef3c7",
                      color: multiCameraStatus.includes("berhasil")
                        ? "#065f46"
                        : multiCameraStatus.includes("Error")
                        ? "#dc2626"
                        : "#d97706",
                      border: `1px solid ${
                        multiCameraStatus.includes("berhasil")
                          ? "#a7f3d0"
                          : multiCameraStatus.includes("Error")
                          ? "#fecaca"
                          : "#fde68a"
                      }`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: multiCameraStatus.includes("berhasil")
                          ? "#10b981"
                          : multiCameraStatus.includes("Error")
                          ? "#ef4444"
                          : "#f59e0b",
                        animation: multiCameraStatus.includes("Error")
                          ? "none"
                          : "blink 1s infinite",
                      }}
                    />
                    {multiCameraStatus}
                  </div>
                )}

                <MultiCameraRecorder
                  onStartRecording={handleMultiCameraStartRecording}
                  onStatusUpdate={handleMultiCameraStatusUpdate}
                />
              </div>
            </div>
          )}

          {/* Layout Editor Modal */}
          {showRecordingLayoutEditor && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 2000,
                padding: 20,
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: 0,
                  maxWidth: 1000,
                  width: "100%",
                  maxHeight: "90vh",
                  overflow: "hidden",
                  boxShadow:
                    "0 25px 50px -12px rgba(0,0,0,0.25)",
                  border: "1px solid #e5e7eb",
                }}
              >
                <BasicLayoutEditor
                  cameras={recordingCameras}
                  onLayoutChange={handleRecordingLayoutChange}
                  onClose={() => setShowRecordingLayoutEditor(false)}
                  initialLayouts={recordingLayouts}
                  screenSource={recordingScreenSource}
                />
              </div>
            </div>
          )}

          {/* Video Player Modal */}
          {showVideoModal && selectedVideo && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
                padding: 20,
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: 12,
                  padding: 16,
                  maxWidth: 800,
                  maxHeight: "80vh",
                  width: "100%",
                  position: "relative",
                }}
              >
                <button
                  onClick={handleCloseVideoModal}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: 30,
                    height: 30,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  ✕
                </button>
                <h3
                  style={{
                    margin: "0 0 10px 0",
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#1e293b",
                  }}
                >
                  {selectedVideo.judul || selectedVideo.filename}
                </h3>
                <div>
                  <video
                    controls
                    autoPlay
                    style={{
                      width: "100%",
                      maxHeight: 400,
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                    src={`${API_URL}/api/recording/download/${selectedVideo.filename}`}
                  >
                    Browser Anda tidak mendukung video player.
                  </video>
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  <strong>Tanggal:</strong>{" "}
                  {new Date(
                    selectedVideo.uploadedAt ||
                      selectedVideo.createdAt
                  ).toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          )}

          {/* Delete Video Confirmation */}
          {showDeleteVideoModal && videoToDelete && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10001,
                padding: 20,
              }}
            >
              <div
                style={{
                  background: "white",
                  borderRadius: 16,
                  padding: 24,
                  maxWidth: 400,
                  width: "100%",
                  position: "relative",
                  boxShadow:
                    "0 20px 40px rgba(0,0,0,0.3)",
                }}
              >
                <button
                  onClick={handleCloseDeleteModal}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "transparent",
                    color: "#64748b",
                    border: "none",
                    borderRadius: "50%",
                    width: 30,
                    height: 30,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  ✕
                </button>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 42,
                      marginBottom: 10,
                    }}
                  >
                    ⚠️
                  </div>
                  <h3
                    style={{
                      margin: "0 0 12px 0",
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#1e293b",
                    }}
                  >
                    Hapus Video?
                  </h3>
                  <p
                    style={{
                      margin: "0 0 18px 0",
                      fontSize: 14,
                      color: "#64748b",
                      lineHeight: 1.5,
                    }}
                  >
                    Apakah Anda yakin ingin menghapus video{" "}
                    <strong>
                      "{videoToDelete.judul || videoToDelete.filename}"
                    </strong>
                    ?
                    <br />
                    <br />
                    <strong style={{ color: "#ef4444" }}>
                      Tindakan ini tidak dapat dibatalkan!
                    </strong>
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      onClick={handleCloseDeleteModal}
                      disabled={isDeleting}
                      style={{
                        padding: "10px 16px",
                        background: "#e5e7eb",
                        color: "#1e293b",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: isDeleting
                          ? "not-allowed"
                          : "pointer",
                      }}
                    >
                      Batal
                    </button>
                    <button
                      onClick={confirmDeleteVideo}
                      disabled={isDeleting}
                      style={{
                        padding: "10px 16px",
                        background: isDeleting
                          ? "#64748b"
                          : "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: isDeleting
                          ? "not-allowed"
                          : "pointer",
                      }}
                    >
                      {isDeleting
                        ? "⏳ Menghapus..."
                        : "🗑️ Ya, Hapus"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AdminRecordingPage;
