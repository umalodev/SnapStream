import React, { useState, useEffect, useRef } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import AdminSidebar from "./AdminSidebar";
import AdminDashboard from "./AdminDashboard";
import AdminLiveStreamPage from "./AdminLiveStreamPage";
import AdminLiveStreamHistoryPage from "./AdminLiveStreamHistoryPage";
import AdminRecordingPage from "./AdminRecordingPage";
import AdminCameraPreviewPage from "./AdminCameraPreviewPage";
import AdminProfilePage from "./AdminProfilePage";

import { useAuth } from "../context/AuthContext";
import { useStreaming } from "../context/StreamingContext";

const GRAY_TEXT = "#64748b";
const WHITE = "#ffffff";

const AdminPanel: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { streamingState } = useStreaming();
  const navigate = useNavigate();

  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const hoverTimeout = useRef<NodeJS. Timeout | null>(null);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Clean timeout when unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #f6f8fa 0%, #e9ecef 100%)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 50,
              height: 50,
              border: "4px solid #e2e8f0",
              borderTop: "4px solid #10b981",
              borderRadius: "50%",
              margin: "0 auto 20px",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <div style={{ color: "#64748b", fontSize: 16, fontWeight: 500 }}>Loading…</div>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // Auth check
  if (!isAuthenticated || ! user || user.role !== "admin") {
    return <Navigate to="/admin" replace />;
  }

  // Initials for avatar
  const getInitials = (name: string) => {
    if (!name) return "A";
    const p = name.trim().split(" ");
    if (p.length === 1) return p[0][0]. toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(user?. name || "Admin");
  const displayName = user?.name || "Administrator";

  // Toggle sidebar (mobile only)
  const handleMobileToggle = () => setMobileOpen(!mobileOpen);

  // Dropdown handlers
  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => {
      setShowProfileDropdown(true);
    }, 150);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout. current);
    hoverTimeout.current = setTimeout(() => {
      setShowProfileDropdown(false);
    }, 120);
  };

  // Jika streaming atau recording aktif, sembunyikan sidebar dan top bar untuk full screen
  const isStreamingActive = streamingState.isStreaming || streamingState.isRecording || streamingState.isScreenRecording;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* SIDEBAR - Sembunyikan jika streaming aktif */}
      {!isStreamingActive && (
        <AdminSidebar mobileOpen={mobileOpen} onMobileToggle={handleMobileToggle} />
      )}

      {/* MAIN CONTAINER */}
      <div
        id="admin-content"
        style={{
          flex: 1,
          background: isStreamingActive ? "transparent" : "#f6f8fa",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          width: isStreamingActive ? "100%" : "auto",
        }}
      >
        {/* TOP BAR - Sembunyikan jika streaming aktif */}
        {!isStreamingActive && (
        <div
          style={{
            background: WHITE,
            padding: "16px 28px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
            position: "sticky",
            top: 0,
            zIndex: 200, // PERBAIKAN: Turunkan dari 9999
            backdropFilter: "blur(10px)",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
          }}
        >
          {/* MOBILE HAMBURGER */}
          <button
            onClick={handleMobileToggle}
            style={{
              background: isMobile ? "#f1f5f9" : "transparent",
              border: "none",
              padding: 10,
              cursor: "pointer",
              visibility: isMobile ? "visible" : "hidden",
              minWidth: 44,
              minHeight: 44,
              borderRadius: "50%",
              transition: "all 0.2s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              if (isMobile) {
                e. currentTarget.style.background = "#e2e8f0";
                e.currentTarget.style. transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (isMobile) {
                e. currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style. transform = "scale(1)";
              }
            }}
          >
            <i className="fas fa-bars" style={{ fontSize: 20, color: GRAY_TEXT }} />
          </button>
          {/* PROFILE DROPDOWN */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              position: "relative",
              marginLeft: "auto",
              zIndex: 300, // PERBAIKAN: Turunkan dari 12000 (harus lebih tinggi dari header tapi lebih rendah dari modal)
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                cursor: "pointer",
                padding: "6px 12px 6px 6px",
                borderRadius: 50,
                transition: "all 0.2s ease",
                background: showProfileDropdown ? "#f1f5f9" : "transparent",
              }}
            >
              <span
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "white",
                  boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
                  transition: "transform 0.2s ease",
                  transform: showProfileDropdown ? "scale(1. 05)" : "scale(1)",
                }}
              >
                {initials}
              </span>
              {! isMobile && (
                <span style={{ fontSize: 15, fontWeight: 600, color: "#1e293b" }}>
                  {displayName}
                </span>
              )}
              <i
                className="fas fa-chevron-down"
                style={{
                  fontSize: 12,
                  color: GRAY_TEXT,
                  transition: "transform 0.2s ease",
                  transform: showProfileDropdown ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </div>

            {showProfileDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: 60,
                  right: 0,
                  width: 260,
                  background: "white",
                  borderRadius: 16,
                  padding: 20,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                  border: "1px solid #e2e8f0",
                  animation: "dropdownFadeIn 0.2s ease-out",
                }}
              >
                {/* PROFILE INFO */}
                <div
                  style={{
                    display: "flex",
                    gap: 14,
                    marginBottom: 20,
                    alignItems: "center",
                    paddingBottom: 16,
                    borderBottom: "1px solid #e2e8f0",
                  }}
                >
                  <span
                    style={{
                      width: 50,
                      height: 50,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      color: "white",
                      fontSize: 20,
                      fontWeight: 700,
                      boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
                    }}
                  >
                    {initials}
                  </span>

                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                      {displayName}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: GRAY_TEXT,
                        marginTop: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <i className="fas fa-shield-alt" style={{ fontSize: 12 }} />
                      Administrator
                    </div>
                  </div>
                </div>

                {/* PROFILE BUTTON */}
                <button
                  onClick={() => navigate("/admin/dashboard/profile")}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: "none",
                    background: "#f1f5f9",
                    marginBottom: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#1e293b",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#e2e8f0";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style. background = "#f1f5f9";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <i className="fas fa-user-circle" />
                  View Profile
                </button>

                {/* LOGOUT BUTTON */}
                <button
                  onClick={logout}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                    borderRadius: 10,
                    border: "none",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                  }}
                  onMouseEnter={(e) => {
                    e. currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget. style.transform = "translateY(0)";
                    e. currentTarget.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.3)";
                  }}
                >
                  <i className="fas fa-sign-out-alt" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
        )}

        {/* PAGE CONTENT */}
        <div style={{ 
          flex: 1, 
          overflowY: isStreamingActive ? "hidden" : "auto",
          overflowX: "hidden",
          width: "100%",
          height: isStreamingActive ? "100vh" : "auto"
        }}>
          <Routes>
            <Route index element={<AdminDashboard />} />
            <Route path="livestream" element={<AdminLiveStreamPage />} />
            <Route path="livestream-history" element={<AdminLiveStreamHistoryPage />} />
            <Route path="recording" element={<AdminRecordingPage />} />
            <Route path="camera-preview" element={<AdminCameraPreviewPage />} />
            <Route path="profile" element={<AdminProfilePage />} />
          </Routes>
        </div>
      </div>

      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AdminPanel;