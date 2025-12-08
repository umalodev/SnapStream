import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../config";

// Color palette
const WHITE = "#fff";
const GRAY_TEXT = "#64748b";
const LIGHT_GRAY = "#f5f5f5";
const FONT_FAMILY = "Poppins, Inter, Segoe UI, Arial, sans-serif";

const COLORS = {
  text: "#1e293b",
  subtext: GRAY_TEXT,
  bg: LIGHT_GRAY,
  white: WHITE,
  green: "#10b981",
  greenDark: "#059669",
  red: "#ef4444",
  redDark: "#dc2626",
  yellow: "#facc15",
  blue: "#3b82f6",
};

interface LiveStream {
  id: string;
  title?: string;
  startTime?: string;
  endTime?: string;
  duration?: number; // in hours (untuk stats) atau bisa diadaptasi
  viewers?: number;
  isRecording?: boolean;
  recordingPath?: string;
  status?: "active" | "ended" | "recording";
}

interface StreamingStats {
  totalStreams: number;
  totalDuration: number;
  totalViewers: number;
  activeStreams: number;
  averageViewers: number;
}

const AdminLiveStreamHistoryPage: React.FC = () => {
  const { user, token } = useAuth();
  const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);

  const [liveStreamHistory, setLiveStreamHistory] = useState<LiveStream[]>([]);
  const [streamingStats, setStreamingStats] = useState<StreamingStats>({
    totalStreams: 0,
    totalDuration: 0,
    totalViewers: 0,
    activeStreams: 0,
    averageViewers: 0,
  });

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [sortBy, setSortBy] = useState<"startTime" | "duration" | "viewers">(
    "startTime"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<LiveStream | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [streamToDelete, setStreamToDelete] = useState<LiveStream | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Responsive
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isMobile = windowWidth < 768;

  // Reset page ketika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDate]);

  // Fetch streaming stats
  const fetchStreamingStats = async () => {
    try {
      setStatsLoading(true);

      const [statsRes, activeRes] = await Promise.all([
        fetch(`${API_URL}/api/livestream/stats`),
        fetch(`${API_URL}/api/livestream/active`),
      ]);

      let stats: StreamingStats = {
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
        stats.activeStreams = Array.isArray(activeData)
          ? activeData.length
          : stats.activeStreams;
      }

      setStreamingStats(stats);
    } catch (error) {
      console.error("Error fetching streaming stats:", error);
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
  };

  // Fetch live stream history
  const fetchLiveStreamHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/livestream/history`);
      if (response.ok) {
        const data = await response.json();
        setLiveStreamHistory(data.data || []);
        console.log("Live stream history loaded:", data.data);
      }
    } catch (error) {
      console.error("Error fetching live stream history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStreamingStats();
    fetchLiveStreamHistory();
  }, []);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateOnly = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTimeOnly = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Durasi dalam jam → text
  const formatDurationHours = (hours?: number) => {
    if (!hours || hours <= 0) return "-";
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    if (hours < 24) return `${hours.toFixed(1)}j`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}h ${remainingHours.toFixed(1)}j`;
  };

  const handlePlayVideo = (stream: LiveStream) => {
    setSelectedVideo(stream);
    setShowVideoModal(true);
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setSelectedVideo(null);
  };

  const handleDeleteStream = (stream: LiveStream) => {
    setStreamToDelete(stream);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setStreamToDelete(null);
  };

  const confirmDelete = async () => {
    if (!streamToDelete) return;

    try {
      setDeleting(true);
      if (!token) {
        alert("Anda harus login untuk menghapus live stream");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/livestream/${streamToDelete.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        setLiveStreamHistory((prev) =>
          prev.filter((stream) => stream.id !== streamToDelete.id)
        );
        setStreamingStats((prev) => ({
          ...prev,
          totalStreams: Math.max(prev.totalStreams - 1, 0),
        }));

        setShowDeleteModal(false);
        setStreamToDelete(null);
      } else {
        const errorData = await response.json();
        alert(
          `Gagal menghapus live stream: ${
            errorData.error || "Unknown error"
          }`
        );
      }
    } catch (error) {
      console.error("Error deleting live stream:", error);
      alert("Gagal menghapus live stream. Silakan coba lagi.");
    } finally {
      setDeleting(false);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setFilterDate("");
    setCurrentPage(1);
  };

  // Filter + sort
  const filteredAndSortedHistory = liveStreamHistory
    .filter((stream) => {
      const search = searchTerm.trim().toLowerCase();
      const hasSearch =
        !search ||
        (stream.title && stream.title.toLowerCase().includes(search)) ||
        (stream.id && stream.id.toLowerCase().includes(search));

      const hasDate =
        !filterDate ||
        (stream.startTime &&
          new Date(stream.startTime).toDateString() ===
            new Date(filterDate).toDateString());

      return hasSearch && hasDate;
    })
    .sort((a, b) => {
      let aValue: number = 0;
      let bValue: number = 0;

      switch (sortBy) {
        case "startTime":
          aValue = a.startTime ? new Date(a.startTime).getTime() : 0;
          bValue = b.startTime ? new Date(b.startTime).getTime() : 0;
          break;
        case "duration":
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case "viewers":
          aValue = a.viewers || 0;
          bValue = b.viewers || 0;
          break;
        default:
          break;
      }

      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedHistory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedHistory = filteredAndSortedHistory.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  if (loading) {
    return (
      <div
        style={{
          padding: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px",
          background: COLORS.bg,
          fontFamily: FONT_FAMILY,
        }}
      >
        <div style={{ textAlign: "center", color: COLORS.subtext }}>
          <div
            style={{
              fontSize: "24px",
              marginBottom: "16px",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          >
            ⏳
          </div>
          <div
            style={{
              fontSize: "18px",
              marginBottom: "8px",
              fontWeight: 600,
              color: COLORS.text,
            }}
          >
            Memuat Data...
          </div>
          <div style={{ fontSize: "14px", color: COLORS.subtext }}>
            Menyiapkan history streaming Anda
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: isMobile ? "16px" : "32px",
        maxWidth: "1200px",
        margin: "0 auto",
        overflowX: "hidden",
        background: COLORS.bg,
        fontFamily: FONT_FAMILY,
        minHeight: "100vh",
      }}
    >
      {/* HERO BANNER */}
      <div
        style={{
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
          borderRadius: "20px",
          padding: isMobile ? "24px 20px" : "40px 36px",
          marginBottom: "32px",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 20px 50px rgba(16, 185, 129, 0.25)",
          animation: "fadeIn 0.6s ease-out",
        }}
      >
        {/* Blur circles */}
        <div
          style={{
            position: "absolute",
            top: "-60px",
            right: "-60px",
            width: "220px",
            height: "220px",
            background: "rgba(255, 255, 255, 0.12)",
            borderRadius: "50%",
            filter: "blur(50px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-40px",
            left: "-40px",
            width: "180px",
            height: "180px",
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            filter: "blur(40px)",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: isMobile ? "13px" : "15px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "rgba(255, 255, 255, 0.95)",
              fontWeight: 500,
            }}
          >
            <i
              className="fas fa-calendar-days"
              style={{ fontSize: isMobile ? "13px" : "15px" }}
            />
            {new Date().toLocaleDateString("id-ID", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>

          <h1
            style={{
              fontSize: isMobile ? "24px" : "32px",
              fontWeight: 700,
              margin: 0,
              marginBottom: "12px",
              letterSpacing: "-0.5px",
              textShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
            }}
          >
            📺 History Streaming
          </h1>

          <div
            style={{
              fontSize: isMobile ? "14px" : "16px",
              color: "rgba(255, 255, 255, 0.95)",
              lineHeight: "1.6",
              maxWidth: "700px",
            }}
          >
            Selamat datang,{" "}
            <strong>{user?.name || "Admin"}</strong>! Kelola dan pantau semua
            riwayat live streaming Anda dengan mudah.
          </div>

          {/* Stats mini bar */}
          <div
            style={{
              marginTop: "18px",
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>📊</span>
              <span>
                Total stream:{" "}
                <strong>{streamingStats.totalStreams || 0}</strong>
              </span>
            </div>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>👥</span>
              <span>
                Total viewers:{" "}
                <strong>{streamingStats.totalViewers || 0}</strong>
              </span>
            </div>
            <div
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🔴</span>
              <span>
                Aktif:{" "}
                <strong>{statsLoading ? "..." : streamingStats.activeStreams}</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: isMobile ? "20px" : "28px",
          marginBottom: 24,
          boxShadow:
            "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "center",
            flexDirection: isMobile ? "column" : "row",
            gap: isMobile ? "16px" : "0",
            marginBottom: "24px",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: isMobile ? "20px" : "22px",
                fontWeight: 600,
                color: COLORS.text,
                margin: 0,
                marginBottom: "6px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <i
                className="fas fa-history"
                style={{ fontSize: "18px", color: COLORS.green }}
              />
              Riwayat Streaming
            </h2>
            <p
              style={{
                fontSize: isMobile ? "13px" : "14px",
                color: "#6b7280",
                margin: 0,
              }}
            >
              Total{" "}
              <strong style={{ color: COLORS.green }}>
                {filteredAndSortedHistory.length}
              </strong>{" "}
              dari <strong>{liveStreamHistory.length}</strong> streaming.
            </p>
          </div>

          <button
            onClick={() => {
              fetchLiveStreamHistory();
              fetchStreamingStats();
            }}
            style={{
              padding: isMobile ? "10px 18px" : "12px 20px",
              background: "#ecfdf5",
              color: COLORS.greenDark,
              border: "1px solid #a7f3d0",
              borderRadius: 10,
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              transition: "all 0.3s ease",
              boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#d1fae5";
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow =
                "0 4px 6px rgba(0, 0, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ecfdf5";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 1px 2px rgba(0, 0, 0, 0.05)";
            }}
          >
            <i className="fas fa-sync-alt" style={{ fontSize: "13px" }} />
            {isMobile ? "Refresh" : "Refresh Data"}
          </button>
        </div>

        {/* Search & Filter */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            padding: isMobile ? "16px" : "20px",
            background: "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {/* Search */}
            <div
              style={{
                position: "relative",
                flex: "1 1 280px",
                minWidth: isMobile ? "100%" : "260px",
              }}
            >
              <i
                className="fas fa-search"
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9ca3af",
                  fontSize: "14px",
                }}
              />
              <input
                type="text"
                placeholder="Cari judul atau ID streaming..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 40px",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  background: "#ffffff",
                  color: COLORS.text,
                  fontWeight: 500,
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.green;
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(16, 185, 129, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Date filter */}
            <div
              style={{
                flex: isMobile ? "1 1 100%" : "0 0 auto",
              }}
            >
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                style={{
                  padding: "12px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: 10,
                  fontSize: "14px",
                  outline: "none",
                  transition: "all 0.2s ease",
                  background: "#ffffff",
                  color: COLORS.text,
                  cursor: "pointer",
                  fontWeight: 500,
                  width: isMobile ? "100%" : "auto",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.green;
                  e.target.style.boxShadow =
                    "0 0 0 3px rgba(16, 185, 129, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#d1d5db";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Clear filters */}
            {(searchTerm || filterDate) && (
              <button
                onClick={handleClearFilters}
                style={{
                  padding: "12px 18px",
                  background: "#fef2f2",
                  color: COLORS.redDark,
                  border: "1px solid #fecaca",
                  borderRadius: 10,
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.3s ease",
                  flex: isMobile ? "1 1 100%" : "0 0 auto",
                  justifyContent: "center",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#fee2e2";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#fef2f2";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <i
                  className="fas fa-times-circle"
                  style={{ fontSize: "13px" }}
                />
                Hapus Filter
              </button>
            )}
          </div>

          {(searchTerm || filterDate) && (
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                paddingTop: "8px",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  color: "#6b7280",
                  fontWeight: 500,
                }}
              >
                Filter aktif:
              </span>
              {searchTerm && (
                <span
                  style={{
                    padding: "4px 10px",
                    background: "#ecfdf5",
                    color: COLORS.greenDark,
                    borderRadius: 6,
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "1px solid #a7f3d0",
                  }}
                >
                  📝 &quot;{searchTerm}&quot;
                </span>
              )}
              {filterDate && (
                <span
                  style={{
                    padding: "4px 10px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    borderRadius: 6,
                    fontSize: "12px",
                    fontWeight: 600,
                    border: "1px solid #bfdbfe",
                  }}
                >
                  📅{" "}
                  {new Date(filterDate).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* CONTENT: EMPTY / LIST */}
        {filteredAndSortedHistory.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: isMobile ? "40px 20px" : "60px 32px",
              color: COLORS.subtext,
              background: "#f9fafb",
              borderRadius: 12,
              border: "1px dashed #d1d5db",
            }}
          >
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>
              {searchTerm || filterDate ? "🔍" : "📺"}
            </div>
            <div
              style={{
                fontSize: isMobile ? "18px" : "20px",
                fontWeight: 600,
                marginBottom: "8px",
                color: COLORS.text,
              }}
            >
              {searchTerm || filterDate
                ? "Tidak Ada Hasil"
                : "Belum Ada History Streaming"}
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#6b7280",
                lineHeight: 1.6,
                maxWidth: "400px",
                margin: "0 auto",
              }}
            >
              {searchTerm || filterDate
                ? "Coba ubah kata kunci pencarian atau filter tanggal Anda."
                : "Mulai live streaming untuk melihat riwayat di sini."}
            </div>
            {(searchTerm || filterDate) && (
              <button
                onClick={handleClearFilters}
                style={{
                  marginTop: "20px",
                  padding: "12px 24px",
                  background: COLORS.green,
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = COLORS.greenDark;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = COLORS.green;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                Reset Filter
              </button>
            )}
          </div>
        ) : (
          <>
            {/* DESKTOP HEADER */}
            {!isMobile && (
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "14px 14px 0 0",
                  border: "1px solid #e5e7eb",
                  borderBottom: "none",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "130px 1fr 110px 110px 150px 110px 160px",
                    gap: "16px",
                    padding: "18px 24px",
                    background:
                      "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                    fontWeight: 600,
                    color: "#475569",
                    fontSize: "13px",
                    borderBottom: "2px solid #e5e7eb",
                    letterSpacing: "0.3px",
                    textTransform: "uppercase",
                  }}
                >
                  <div>Preview</div>
                  <div style={{ textAlign: "center" }}>Judul</div>
                  <div style={{ textAlign: "center" }}>Durasi</div>
                  <div style={{ textAlign: "center" }}>Viewers</div>
                  <div style={{ textAlign: "center" }}>Tanggal & Waktu</div>
                  <div style={{ textAlign: "center" }}>Status</div>
                  <div style={{ textAlign: "center" }}>Aksi</div>
                </div>
              </div>
            )}

            {/* LIST */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: isMobile ? 14 : "0 0 14px 14px",
                border: "1px solid #e5e7eb",
                borderTop: isMobile ? "1px solid #e5e7eb" : "none",
                overflow: "hidden",
              }}
            >
              {paginatedHistory.map((stream, index) =>
                isMobile ? (
                  // MOBILE LAYOUT → CARD
                  <div
                    key={stream.id}
                    style={{
                      padding: "16px 14px",
                      borderBottom:
                        index < paginatedHistory.length - 1
                          ? "1px solid #f3f4f6"
                          : "none",
                      transition:
                        "background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 8px rgba(148,163,184,0.35)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {/* Title + Date */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background:
                            "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: COLORS.greenDark,
                          fontSize: 20,
                          flexShrink: 0,
                        }}
                      >
                        🎥
                      </div>
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 600,
                            color: COLORS.text,
                            marginBottom: 4,
                            lineHeight: 1.4,
                          }}
                        >
                          {stream.title || `Live Stream #${stream.id}`}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "#9ca3af",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <i
                            className="fas fa-calendar"
                            style={{ fontSize: 11 }}
                          />
                          {formatDateTime(stream.startTime)}
                        </div>
                      </div>
                    </div>

                    {/* Stats line */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 12,
                        fontSize: 12,
                      }}
                    >
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "#ecfdf5",
                          color: COLORS.greenDark,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          border: "1px solid #a7f3d0",
                        }}
                      >
                        ⏱️{" "}
                        <span>{formatDurationHours(stream.duration || 0)}</span>
                      </div>
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background: "#eff6ff",
                          color: "#1d4ed8",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          border: "1px solid #bfdbfe",
                        }}
                      >
                        👥 <span>{stream.viewers || 0} viewers</span>
                      </div>
                      <div
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          background:
                            stream.status === "active"
                              ? "#fef2f2"
                              : "#f0fdf4",
                          color:
                            stream.status === "active"
                              ? COLORS.redDark
                              : COLORS.greenDark,
                          border:
                            stream.status === "active"
                              ? "1px solid #fecaca"
                              : "1px solid #bbf7d0",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {stream.status === "active" ? "🔴 LIVE" : "✅ SAVED"}
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() =>
                          stream.status !== "active" && handlePlayVideo(stream)
                        }
                        disabled={stream.status === "active"}
                        title={
                          stream.status === "active"
                            ? "Stream masih berlangsung"
                            : "Tonton rekaman"
                        }
                        style={{
                          flex: "1 1 calc(50% - 8px)",
                          padding: "10px 14px",
                          background:
                            stream.status === "active"
                              ? "#f3f4f6"
                              : "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                          color:
                            stream.status === "active"
                              ? "#9ca3af"
                              : COLORS.greenDark,
                          border:
                            stream.status === "active"
                              ? "1px solid #d1d5db"
                              : "2px solid #a7f3d0",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor:
                            stream.status === "active"
                              ? "not-allowed"
                              : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          opacity: stream.status === "active" ? 0.7 : 1,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (stream.status !== "active") {
                            e.currentTarget.style.background =
                              "linear-gradient(135deg, #10b981 0%, #059669 100%)";
                            e.currentTarget.style.color = "#ffffff";
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
                            e.currentTarget.style.boxShadow =
                              "0 4px 8px rgba(16,185,129,0.3)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (stream.status !== "active") {
                            e.currentTarget.style.background =
                              "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)";
                            e.currentTarget.style.color = COLORS.greenDark;
                            e.currentTarget.style.transform =
                              "translateY(0)";
                            e.currentTarget.style.boxShadow = "none";
                          }
                        }}
                      >
                        <i
                          className="fas fa-play"
                          style={{ fontSize: "12px" }}
                        />
                        Tonton
                      </button>

                      <button
                        onClick={() => handleDeleteStream(stream)}
                        style={{
                          flex: "1 1 calc(50% - 8px)",
                          padding: "10px 14px",
                          background:
                            "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                          color: COLORS.redDark,
                          border: "2px solid #fecaca",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                          e.currentTarget.style.color = "#ffffff";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)";
                          e.currentTarget.style.color = COLORS.redDark;
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <i
                          className="fas fa-trash-alt"
                          style={{ fontSize: "12px" }}
                        />
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  // DESKTOP ROW
                  <div
                    key={stream.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "130px 1fr 110px 110px 150px 110px 160px",
                      gap: "16px",
                      padding: "18px 24px",
                      borderBottom:
                        index < paginatedHistory.length - 1
                          ? "1px solid #f3f4f6"
                          : "none",
                      transition:
                        "background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#f9fafb";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "75px",
                        borderRadius: "10px",
                        background:
                          "linear-gradient(135deg, rgba(187,247,208,0.15) 0%, rgba(134,239,172,0.08) 100%)",
                        position: "relative",
                        overflow: "hidden",
                        border: "2px solid #e5e7eb",
                      }}
                    >
                      {stream.recordingPath ? (
                        <video
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            borderRadius: "8px",
                          }}
                          muted
                          preload="metadata"
                          src={`${API_URL}${stream.recordingPath}`}
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: COLORS.subtext,
                          }}
                        >
                          <span style={{ fontSize: "28px" }}>🎥</span>
                        </div>
                      )}

                      <div
                        style={{
                          position: "absolute",
                          top: "6px",
                          right: "6px",
                          background:
                            stream.status === "active"
                              ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"
                              : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                          color: "#ffffff",
                          fontSize: "10px",
                          padding: "3px 8px",
                          borderRadius: 6,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        {stream.status === "active" ? "LIVE" : "SAVED"}
                      </div>
                    </div>

                    {/* Title */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        textAlign: "center",
                        minHeight: "75px",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: 600,
                          color: COLORS.text,
                          marginBottom: "4px",
                          lineHeight: 1.4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                        }}
                      >
                        {stream.title || `Live Stream #${stream.id}`}
                      </div>
                    </div>

                    {/* Duration */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "14px",
                        color: COLORS.text,
                        fontWeight: 600,
                      }}
                    >
                      {formatDurationHours(stream.duration)}
                    </div>

                    {/* Viewers */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "14px",
                        color: COLORS.text,
                        fontWeight: 600,
                      }}
                    >
                      {stream.viewers || 0}
                    </div>

                    {/* Date */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        fontSize: "13px",
                        color: "#374151",
                      }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: "3px" }}>
                        {formatDateOnly(stream.startTime)}
                      </div>
                      <div
                        style={{
                          color: "#9ca3af",
                          fontSize: "12px",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <i
                          className="fas fa-clock"
                          style={{ fontSize: "10px" }}
                        />
                        {formatTimeOnly(stream.startTime)}
                      </div>
                    </div>

                    {/* Status */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          background:
                            stream.status === "active"
                              ? "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"
                              : "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                          color:
                            stream.status === "active"
                              ? COLORS.redDark
                              : COLORS.greenDark,
                          fontSize: "11px",
                          padding: "6px 12px",
                          borderRadius: 8,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          border:
                            stream.status === "active"
                              ? "2px solid #fecaca"
                              : "2px solid #bbf7d0",
                        }}
                      >
                        {stream.status === "active" ? "🔴 LIVE" : "✅ SAVED"}
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        gap: "10px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        onClick={() =>
                          stream.status !== "active" && handlePlayVideo(stream)
                        }
                        disabled={stream.status === "active"}
                        title={
                          stream.status === "active"
                            ? "Stream masih berlangsung"
                            : "Tonton rekaman"
                        }
                        style={{
                          padding: "10px 14px",
                          background:
                            stream.status === "active"
                              ? "#f3f4f6"
                              : "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                          color:
                            stream.status === "active"
                              ? "#9ca3af"
                              : COLORS.greenDark,
                          border:
                            stream.status === "active"
                              ? "1px solid #d1d5db"
                              : "2px solid #a7f3d0",
                          borderRadius: 10,
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor:
                            stream.status === "active"
                              ? "not-allowed"
                              : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          minWidth: 90,
                          height: 40,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          if (stream.status !== "active") {
                            e.currentTarget.style.background =
                              "linear-gradient(135deg, #10b981 0%, #059669 100%)";
                            e.currentTarget.style.color = "#ffffff";
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (stream.status !== "active") {
                            e.currentTarget.style.background =
                              "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)";
                            e.currentTarget.style.color = COLORS.greenDark;
                            e.currentTarget.style.transform =
                              "translateY(0)";
                          }
                        }}
                      >
                        <i
                          className="fas fa-play"
                          style={{ fontSize: "12px" }}
                        />
                        Tonton
                      </button>

                      <button
                        onClick={() => handleDeleteStream(stream)}
                        style={{
                          padding: "10px 14px",
                          background:
                            "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                          color: COLORS.redDark,
                          border: "2px solid #fecaca",
                          borderRadius: 10,
                          fontSize: "13px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          minWidth: 90,
                          height: 40,
                          transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                          e.currentTarget.style.color = "#ffffff";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)";
                          e.currentTarget.style.color = COLORS.redDark;
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                      >
                        <i
                          className="fas fa-trash-alt"
                          style={{ fontSize: "12px" }}
                        />
                        Hapus
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "24px",
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
                {startIndex + 1}-{Math.min(endIndex, filteredAndSortedHistory.length)}
              </strong>{" "}
              dari{" "}
              <strong
                style={{
                  color: COLORS.text,
                  fontWeight: 700,
                  fontSize: "15px",
                }}
              >
                {filteredAndSortedHistory.length}
              </strong>{" "}
              streaming
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
              >
                <i className="fas fa-chevron-right" style={{ fontSize: "12px" }} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIDEO MODAL */}
      {showVideoModal && selectedVideo && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? "16px" : "24px",
            backdropFilter: "blur(4px)",
          }}
          onClick={handleCloseVideoModal}
        >
          <div
            style={{
              background: COLORS.white,
              borderRadius: isMobile ? 16 : 20,
              padding: isMobile ? "20px" : "28px",
              maxWidth: isMobile ? "100%" : "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseVideoModal}
              style={{
                position: "absolute",
                top: isMobile ? "12px" : "16px",
                right: isMobile ? "12px" : "16px",
                background:
                  "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                color: COLORS.white,
                border: "none",
                borderRadius: "50%",
                width: isMobile ? "36px" : "42px",
                height: isMobile ? "36px" : "42px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? "18px" : "20px",
                zIndex: 1001,
                fontWeight: "bold",
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                transition: "all 0.3s ease",
              }}
            >
              ✕
            </button>

            <h3
              style={{
                margin: "0 50px 16px 0",
                fontSize: isMobile ? "18px" : "22px",
                fontWeight: 700,
                color: COLORS.text,
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {selectedVideo.title || `Live Stream #${selectedVideo.id}`}
            </h3>

            <div
              style={{
                width: "100%",
                margin: "0 auto",
                borderRadius: 12,
                overflow: "hidden",
                background: "#000",
                boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)",
              }}
            >
              <video
                controls
                controlsList="nodownload"
                autoPlay
                style={{
                  width: "100%",
                  maxHeight: isMobile ? "280px" : "450px",
                  display: "block",
                }}
                src={
                  selectedVideo.recordingPath
                    ? `${API_URL}${selectedVideo.recordingPath}`
                    : `${API_URL}/api/livestream/stream/${selectedVideo.id}`
                }
                onError={(e) => {
                  console.error("Video load error:", e);
                  alert("Gagal memuat video. Pastikan file video tersedia.");
                }}
              >
                Browser Anda tidak mendukung video player.
              </video>
            </div>

            {/* Info */}
            <div
              style={{
                marginTop: "20px",
                padding: isMobile ? "14px" : "18px",
                background:
                  "linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)",
                borderRadius: 10,
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: isMobile ? "10px" : "14px",
                  fontSize: isMobile ? "13px" : "14px",
                  color: COLORS.text,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px",
                    background: "#ffffff",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <span style={{ fontSize: isMobile ? "18px" : "20px" }}>
                    📅
                  </span>
                  <span
                    style={{
                      fontSize: isMobile ? "12px" : "13px",
                      color: "#6b7280",
                      fontWeight: 600,
                    }}
                  >
                    {selectedVideo.startTime &&
                      formatDateTime(selectedVideo.startTime)}
                  </span>
                </div>

                {selectedVideo.duration && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px",
                      background: "#ffffff",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ fontSize: isMobile ? "18px" : "20px" }}>
                      ⏱️
                    </span>
                    <span
                      style={{
                        fontSize: isMobile ? "12px" : "13px",
                        color: "#6b7280",
                        fontWeight: 600,
                      }}
                    >
                      {formatDurationHours(selectedVideo.duration)}
                    </span>
                  </div>
                )}

                {selectedVideo.viewers !== undefined && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px",
                      background: "#ffffff",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <span style={{ fontSize: isMobile ? "18px" : "20px" }}>
                      👥
                    </span>
                    <span
                      style={{
                        fontSize: isMobile ? "12px" : "13px",
                        color: "#6b7280",
                        fontWeight: 600,
                      }}
                    >
                      {selectedVideo.viewers} viewers
                    </span>
                  </div>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px",
                    background: "#ffffff",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <span style={{ fontSize: isMobile ? "18px" : "20px" }}>
                    🔴
                  </span>
                  <span
                    style={{
                      background:
                        selectedVideo.status === "active"
                          ? "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)"
                          : "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                      color:
                        selectedVideo.status === "active"
                          ? COLORS.redDark
                          : COLORS.greenDark,
                      padding: "4px 12px",
                      borderRadius: 6,
                      fontSize: isMobile ? "11px" : "12px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      border:
                        selectedVideo.status === "active"
                          ? "1px solid #fecaca"
                          : "1px solid #bbf7d0",
                    }}
                  >
                    {selectedVideo.status === "active"
                      ? "🔴 LIVE"
                      : "✅ SAVED"}
                  </span>
                </div>
              </div>
            </div>

            {!isMobile && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "14px",
                  background: "#ecfdf5",
                  borderRadius: 10,
                  border: "1px solid #a7f3d0",
                  fontSize: "13px",
                  color: "#065f46",
                  lineHeight: 1.6,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "10px",
                }}
              >
                <span style={{ fontSize: "18px" }}>💡</span>
                <div>
                  <strong style={{ fontWeight: 700 }}>Tips:</strong>
                  <br />
                  Gunakan kontrol player untuk play/pause, atur volume, dan
                  kecepatan pemutaran. Tekan F untuk masuk ke mode fullscreen.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DELETE MODAL */}
      {showDeleteModal && streamToDelete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: isMobile ? "20px" : "24px",
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: isMobile ? "24px" : "30px",
              maxWidth: "420px",
              width: "100%",
              position: "relative",
              boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
            }}
          >
            <button
              onClick={handleCloseDeleteModal}
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                background: "transparent",
                color: "#64748b",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "42px", marginBottom: "10px" }}>⚠️</div>
              <h3
                style={{
                  margin: "0 0 12px 0",
                  fontSize: isMobile ? "20px" : "22px",
                  fontWeight: 600,
                  color: COLORS.text,
                }}
              >
                Hapus Live Stream?
              </h3>
              <p
                style={{
                  margin: "0 0 18px 0",
                  fontSize: "14px",
                  color: COLORS.subtext,
                  lineHeight: 1.6,
                }}
              >
                Apakah Anda yakin ingin menghapus live stream{" "}
                <br />
                <strong>
                  &quot;
                  {streamToDelete.title ||
                    `Live Stream #${streamToDelete.id}`}
                  &quot;
                </strong>
                ?
                <br />
                <br />
                <strong style={{ color: COLORS.red }}>
                  Tindakan ini tidak dapat dibatalkan!
                </strong>
              </p>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "center",
                  flexDirection: isMobile ? "column" : "row",
                }}
              >
                <button
                  onClick={handleCloseDeleteModal}
                  disabled={deleting}
                  style={{
                    padding: "11px 22px",
                    background: "#e5e7eb",
                    color: COLORS.text,
                    border: "none",
                    borderRadius: 8,
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: deleting ? "not-allowed" : "pointer",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deleting}
                  style={{
                    padding: "11px 22px",
                    background: deleting ? "#9ca3af" : COLORS.red,
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 8,
                    fontSize: "14px",
                    fontWeight: 600,
                    cursor: deleting ? "not-allowed" : "pointer",
                    width: isMobile ? "100%" : "auto",
                  }}
                >
                  {deleting ? "⏳ Menghapus..." : "🗑️ Ya, Hapus"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AdminLiveStreamHistoryPage;
