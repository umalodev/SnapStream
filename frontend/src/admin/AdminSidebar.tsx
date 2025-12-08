import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

interface SidebarProps {
  mobileOpen: boolean;
  onMobileToggle: () => void;
}

const COLORS = {
  sidebarBg: "#ffffff",
  sidebarText: "#64748b",
  sidebarActiveBg: "#F0FDF4",
  sidebarActiveText: "#16A34A",
  sidebarHoverBg: "#F8FAFC",
  icon: "#64748B",
  iconActive: "#16A34A",
  divider: "#e2e8f0",
  shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
};

const MENU = [
  { label: "Dashboard", path: "/admin/dashboard", icon: "fas fa-home" },
  { label: "Live Stream", path: "/admin/dashboard/livestream", icon: "fas fa-wifi" },
  { label: "History", path: "/admin/dashboard/livestream-history", icon: "fas fa-clock" },
  { label: "Recording", path: "/admin/dashboard/recording", icon: "fas fa-video" },
  { label: "Camera", path: "/admin/dashboard/camera-preview", icon: "fas fa-camera" },
];

const AdminSidebar: React.FC<SidebarProps> = ({ mobileOpen, onMobileToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) setCollapsed(true);
    };
    check();
    window. addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Adjust content margin on desktop only
  useEffect(() => {
    const el = document.getElementById("admin-content");
    if (! el) return;

    if (isMobile) {
      el.style.marginLeft = "0px";
    } else {
      el.style.marginLeft = collapsed ? "70px" : "280px";
    }
    el.style.transition = "margin-left 0. 3s cubic-bezier(0.4, 0, 0.2, 1)";
  }, [collapsed, isMobile]);

  const handleMenuClick = (path: string) => {
    navigate(path);
    if (isMobile) onMobileToggle();
  };

  const handleToggleCollapse = () => {
    setCollapsed(prev => !prev);
  };

  // ============================
  //   MOBILE SIDEBAR (OVERLAY)
  // ============================
  if (isMobile && mobileOpen) {
    return (
      <>
        {/* BACKDROP */}
        <div
          onClick={onMobileToggle}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 900,
            animation: "fadeIn 0.25s ease-out",
          }}
        />

        {/* SIDEBAR PANEL */}
        <aside
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            bottom: 0,
            width: 280,
            background: COLORS.sidebarBg,
            zIndex: 950,
            padding: "24px 20px",
            boxShadow: "2px 0 20px rgba(0,0,0,0.15)",
            overflowY: "auto",
            animation: "slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              marginBottom: 32,
              gap: 12,
              paddingBottom: 20,
              borderBottom: `1px solid ${COLORS.divider}`,
            }}
          >
            <button
              onClick={onMobileToggle}
              style={{
                background: "#f1f5f9",
                border: "none",
                fontSize: 18,
                cursor: "pointer",
                width: 40,
                height: 40,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                color: COLORS.sidebarText,
              }}
              onMouseEnter={(e) => {
                e. currentTarget.style.background = "#e2e8f0";
                e.currentTarget.style. transform = "rotate(90deg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#f1f5f9";
                e.currentTarget.style. transform = "rotate(0deg)";
              }}
            >
              <i className="fas fa-times"></i>
            </button>

            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "0.3px",
                  background: "linear-gradient(135deg, #000 0%, #16A34A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Snap Stream
              </div>
              <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                Powered by 
                <img 
                  src="/assets/umalo.png" 
                  alt="Umalo"
                  style={{ height: 14, display: "inline-block" }}
                  onError={(e) => {
                    // Fallback jika gambar tidak ditemukan
                    e.currentTarget.style.display = "none";
                    const fallback = document.createElement("span");
                    fallback.textContent = "Umalo";
                    fallback.style.fontWeight = "600";
                    fallback.style.color = "#16A34A";
                    e.currentTarget.parentNode?.appendChild(fallback);
                  }}
                />
              </div>
            </div>
          </div>

          {/* MENU */}
          <nav>
            {MENU.map((item, i) => {
              const active = location.pathname === item.path;

              return (
                <button
                  key={i}
                  onClick={() => handleMenuClick(item.path)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    marginBottom: 6,
                    borderRadius: 12,
                    border: "none",
                    cursor: "pointer",
                    background: active ? COLORS.sidebarActiveBg : "transparent",
                    color: active ? COLORS.sidebarActiveText : COLORS.sidebarText,
                    fontWeight: active ? 600 : 500,
                    fontSize: 15,
                    transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseEnter={(e) => {
                    if (! active) {
                      e.currentTarget.style.background = COLORS.sidebarHoverBg;
                      e.currentTarget.style.transform = "translateX(4px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.transform = "translateX(0)";
                    }
                  }}
                >
                  {active && (
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "50%",
                        transform: "translateY(-50%)",
                        width: 4,
                        height: "70%",
                        background: COLORS.sidebarActiveText,
                        borderRadius: "0 4px 4px 0",
                      }}
                    />
                  )}
                  <i
                    className={item.icon}
                    style={{
                      color: active ? COLORS.iconActive : COLORS.icon,
                      fontSize: 18,
                      width: 20,
                      textAlign: "center",
                    }}
                  />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideInLeft {
            from {
              transform: translateX(-100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>
      </>
    );
  }

  // ============================
  //   DESKTOP SIDEBAR
  // ============================
  if (isMobile) return null;

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: collapsed ? 70 : 280,
        background: COLORS.sidebarBg,
        borderRight: `1px solid ${COLORS.divider}`,
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        zIndex: 100,
        overflow: "hidden",
        boxShadow: COLORS.shadow,
      }}
    >
      {/* HEADER */}
      <div
        style={{
          padding: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${COLORS.divider}`,
          minHeight: 76,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* LOGO & TEXT - Hidden when collapsed */}
        {!collapsed && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              animation: "fadeInSlide 0.3s ease-out",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #000 0%, #16A34A 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  whiteSpace: "nowrap",
                }}
              >
                Snap Stream
              </div>
              <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
                Powered by 
                <img 
                  src="/assets/umalo.png" 
                  alt="Umalo"
                  style={{ height: 14, display: "inline-block" }}
                  onError={(e) => {
                    // Fallback jika gambar tidak ditemukan
                    e. currentTarget.style.display = "none";
                    const parent = e.currentTarget.parentElement;
                    if (parent && ! parent.querySelector('. fallback-text')) {
                      const fallback = document.createElement("span");
                      fallback. className = "fallback-text";
                      fallback.textContent = "Umalo";
                      fallback.style.fontWeight = "600";
                      fallback. style.color = "#16A34A";
                      parent.appendChild(fallback);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* TOGGLE BUTTON - Always visible */}
        <button
          onClick={handleToggleCollapse}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            background: "#f1f5f9",
            border: "none",
            fontSize: 16,
            cursor: "pointer",
            width: 40,
            height: 40,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0. 2s ease",
            color: COLORS.sidebarText,
            flexShrink: 0,
            marginLeft: collapsed ? "auto" : "0",
            marginRight: collapsed ? "auto" : "0",
          }}
          onMouseEnter={(e) => {
            e. currentTarget.style.background = "#e2e8f0";
            e.currentTarget.style. transform = "scale(1.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#f1f5f9";
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          <i 
            className={collapsed ? "fas fa-chevron-right" : "fas fa-chevron-left"}
            style={{
              transition: "transform 0.3s ease",
            }}
          ></i>
        </button>
      </div>

      {/* MENU */}
      <nav style={{ padding: "20px 0" }}>
        {MENU.map((item, i) => {
          const active = location.pathname === item.path;
          const hovered = hoverIdx === i;

          return (
            <div 
              key={i} 
              style={{ 
                padding: collapsed ? "0 10px" : "0 16px",
                position: "relative",
              }}
            >
              <button
                onClick={() => handleMenuClick(item.path)}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
                title={collapsed ? item.label : ""}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  padding: collapsed ? "14px 0" : "14px 16px",
                  gap: collapsed ? 0 : 14,
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: active
                    ? COLORS.sidebarActiveBg
                    : hovered
                    ? COLORS.sidebarHoverBg
                    : "transparent",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  color: active ? COLORS.sidebarActiveText : COLORS.sidebarText,
                  fontWeight: active ? 600 : 500,
                  fontSize: 15,
                  marginBottom: 6,
                  transition: "all 0.2s cubic-bezier(0. 4, 0, 0. 2, 1)",
                  transform: hovered && ! active && !collapsed ? "translateX(4px)" : "translateX(0)",
                  position: "relative",
                }}
              >
                {/* Active indicator */}
                {active && ! collapsed && (
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 4,
                      height: "70%",
                      background: COLORS.sidebarActiveText,
                      borderRadius: "0 4px 4px 0",
                    }}
                  />
                )}
                
                {/* Icon */}
                <i
                  className={item.icon}
                  style={{
                    fontSize: 18,
                    color: active ? COLORS.iconActive : COLORS.icon,
                    width: 20,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                />
                
                {/* Label - Only show when not collapsed */}
                {!collapsed && (
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      animation: "fadeInSlide 0.3s ease-out",
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </button>

              {/* Tooltip for collapsed state */}
              {collapsed && hovered && (
                <div
                  style={{
                    position: "absolute",
                    left: 70,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "#1e293b",
                    color: "white",
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    zIndex: 200,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                    pointerEvents: "none",
                    animation: "tooltipFadeIn 0.2s ease-out",
                  }}
                >
                  {item.label}
                  <div
                    style={{
                      position: "absolute",
                      left: -4,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 0,
                      height: 0,
                      borderTop: "4px solid transparent",
                      borderBottom: "4px solid transparent",
                      borderRight: "4px solid #1e293b",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <style>{`
        @keyframes fadeInSlide {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateY(-50%) translateX(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
          }
        }
      `}</style>
    </aside>
  );
};

export default AdminSidebar;