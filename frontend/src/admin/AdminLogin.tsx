import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../config';

// Import images using ES6 imports
import umaloLogo from '../assets/umalo.png';

// Color palette - Snap Stream theme
const PRIMARY = '#10b981';
const PRIMARY_LIGHT = '#34d399';
const PRIMARY_DARK = '#047857';
const TEXT_DARK = '#0f172a';
const TEXT_GRAY = '#475569';
const TEXT_LIGHT = '#94a3b8';
const BG_WHITE = '#ffffff';
const BG_LIGHT = '#f8fafc';
const BORDER_LIGHT = '#e2e8f0';
const ERROR = '#ef4444';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();

  // Note: Auto-redirect removed - users must explicitly log in even if token exists

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: BG_LIGHT
      }}>
        <div style={{
          textAlign: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <div style={{ color: TEXT_GRAY, fontSize: '16px' }}>Loading...</div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user.role === 'admin') {
          localStorage.setItem('adminToken', data.token);
          localStorage.setItem('adminData', JSON.stringify(data.user));
          login(data.user, data.token);
          navigate('/admin/dashboard');
        } else {
          setError('Akun ini bukan admin');
        }
      } else {
        const errorData = await response.json();
        // Handle specific error messages
        if (errorData.errorType === 'EMAIL_NOT_FOUND') {
          setError('Email tidak terdaftar dalam sistem');
        } else if (errorData.errorType === 'INVALID_PASSWORD') {
          setError('Password yang Anda masukkan salah');
        } else {
          setError(errorData.error || 'Login gagal');
        }
      }
    } catch (error) {
      setError('Terjadi kesalahan pada server');
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Sora", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f0fdf4 100%)',
      color: TEXT_DARK,
      overflow: 'hidden',
    }}>
      {/* Floating Particles */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
        {[...Array(20)].map((_, i) => {
          const isReverse = i % 2 === 0;
          const duration = 15 + (i % 10) * 2;
          const delay = (i % 5) * 0.5;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: `${4 + (i % 4) * 2}px`,
                height: `${4 + (i % 4) * 2}px`,
                background: `rgba(16, 185, 129, ${0.2 + (i % 3) * 0.1})`,
                borderRadius: '50%',
                left: `${(i * 5) % 100}%`,
                top: `${100 + (i % 20)}%`,
                animation: `${isReverse ? 'floatParticleReverse' : 'floatParticle'} ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Background Animation */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(52, 211, 153, 0.1))',
          borderRadius: '50%',
          top: '-100px',
          right: '50px',
          filter: 'blur(80px)',
          animation: 'float-bg 20s ease-in-out infinite',
        }}></div>
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(96, 165, 250, 0.08))',
          borderRadius: '50%',
          bottom: '100px',
          left: '-50px',
          filter: 'blur(80px)',
          animation: 'float-bg 25s ease-in-out infinite reverse',
        }}></div>
        <div style={{
          position: 'absolute',
          width: '250px',
          height: '250px',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.08), rgba(196, 181, 253, 0.05))',
          borderRadius: '50%',
          top: '50%',
          right: '-100px',
          filter: 'blur(80px)',
          animation: 'float-bg 22s ease-in-out infinite',
        }}></div>
        
        {/* SVG Blobs */}
        <svg style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          top: '10%',
          left: '5%',
          animation: 'float-blob 20s ease-in-out infinite',
        }} viewBox="0 0 200 200">
          <defs>
            <linearGradient id="grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#10b981', stopOpacity: 0.15}} />
              <stop offset="100%" style={{stopColor: '#34d399', stopOpacity: 0.1}} />
            </linearGradient>
          </defs>
          <path d="M50,50 Q100,0 150,50 T150,150 Q100,200 50,150 T50,50" fill="url(#grad-1)" />
        </svg>
        <svg style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          bottom: '10%',
          right: '5%',
          animation: 'float-blob 25s ease-in-out infinite reverse',
        }} viewBox="0 0 200 200">
          <defs>
            <linearGradient id="grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{stopColor: '#3b82f6', stopOpacity: 0.1}} />
              <stop offset="100%" style={{stopColor: '#60a5fa', stopOpacity: 0.08}} />
            </linearGradient>
          </defs>
          <path d="M50,50 Q100,0 150,50 T150,150 Q100,200 50,150 T50,50" fill="url(#grad-2)" />
        </svg>
      </div>

      {/* Main Layout */}
      <div style={{
        width: '100%',
        maxWidth: '1400px',
        height: '100%',
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1.1fr 1fr',
        gap: isMobile ? '30px' : '60px',
        padding: isMobile ? '30px 20px' : '60px',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Left Column - Hero */}
        {!isMobile && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            animation: 'fadeInLeft 0.8s ease-out',
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '48px',
            }}>
              {/* Logo */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})`,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '32px',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.2)',
                  animation: 'floatLogo 3s ease-in-out infinite',
                }}>
                  <img 
                    src="/assets/menu.png" 
                    alt="Menu Icon"
                    style={{
                      height: '32px',
                      width: '32px',
                      objectFit: 'contain',
                      filter: 'brightness(0) invert(1)',
                    }}
                  />
                </div>
                <div>
                  <h1 style={{
                    fontSize: '36px',
                    fontWeight: 800,
                    marginBottom: '4px',
                    color: TEXT_DARK,
                  }}>
                    Snap <span style={{
                      background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}>Stream</span>
                  </h1>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: TEXT_LIGHT,
                    textTransform: 'uppercase',
                    letterSpacing: '2px',
                  }}>
                    <span>Professional Platform powered by</span>
                    <img 
                      src={umaloLogo} 
                      alt="Umalo Logo"
                      style={{
                        height: '25px',
                        width: 'auto',
                        objectFit: 'contain',

                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Hero Text */}
              <div>
                <h2 style={{
                  fontSize: '48px',
                  fontWeight: 800,
                  lineHeight: 1.2,
                  marginBottom: '16px',
                  color: TEXT_DARK,
                }}>
                  Admin Dashboard
                </h2>
                <p style={{
                  fontSize: '16px',
                  color: TEXT_GRAY,
                  lineHeight: 1.6,
                  maxWidth: '500px',
                }}>
                  Professional admin panel for managing live streaming platform. 
                  Access advanced controls and analytics for your streaming infrastructure.
                </p>
              </div>

              {/* Feature Cards */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}>
                <div style={{
                  padding: '16px',
                  background: BG_WHITE,
                  border: `1.5px solid ${BORDER_LIGHT}`,
                  borderRadius: '12px',
                  display: 'flex',
                  gap: '12px',
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  animation: 'floatCard 4s ease-in-out infinite',
                  animationDelay: '0s',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: `linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.08))`,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: PRIMARY,
                    fontSize: '20px',
                    flexShrink: 0,
                  }}>
                    <i className="fas fa-video"></i>
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: TEXT_DARK,
                      marginBottom: '2px',
                    }}>Live Streaming</h3>
                    <p style={{
                      fontSize: '11px',
                      color: TEXT_LIGHT,
                    }}>Manage live streams</p>
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  background: BG_WHITE,
                  border: `1.5px solid ${BORDER_LIGHT}`,
                  borderRadius: '12px',
                  display: 'flex',
                  gap: '12px',
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  animation: 'floatCard 4s ease-in-out infinite',
                  animationDelay: '0.5s',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: `linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.08))`,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: PRIMARY,
                    fontSize: '20px',
                    flexShrink: 0,
                  }}>
                    <i className="fas fa-chart-line"></i>
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: TEXT_DARK,
                      marginBottom: '2px',
                    }}>Analytics</h3>
                    <p style={{
                      fontSize: '11px',
                      color: TEXT_LIGHT,
                    }}>Real-time data</p>
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  background: BG_WHITE,
                  border: `1.5px solid ${BORDER_LIGHT}`,
                  borderRadius: '12px',
                  display: 'flex',
                  gap: '12px',
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  animation: 'floatCard 4s ease-in-out infinite',
                  animationDelay: '1s',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: `linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.08))`,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: PRIMARY,
                    fontSize: '20px',
                    flexShrink: 0,
                  }}>
                    <i className="fas fa-users"></i>
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: TEXT_DARK,
                      marginBottom: '2px',
                    }}>User Management</h3>
                    <p style={{
                      fontSize: '11px',
                      color: TEXT_LIGHT,
                    }}>Control access</p>
                  </div>
                </div>

                <div style={{
                  padding: '16px',
                  background: BG_WHITE,
                  border: `1.5px solid ${BORDER_LIGHT}`,
                  borderRadius: '12px',
                  display: 'flex',
                  gap: '12px',
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  animation: 'floatCard 4s ease-in-out infinite',
                  animationDelay: '1.5s',
                }}>
                  <div style={{
                    width: '44px',
                    height: '44px',
                    background: `linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(52, 211, 153, 0.08))`,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: PRIMARY,
                    fontSize: '20px',
                    flexShrink: 0,
                  }}>
                    <i className="fas fa-shield-alt"></i>
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: TEXT_DARK,
                      marginBottom: '2px',
                    }}>Security</h3>
                    <p style={{
                      fontSize: '11px',
                      color: TEXT_LIGHT,
                    }}>Enterprise grade</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Right Column - Form */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeInRight 0.8s ease-out',
        }}>
          <div style={{
            width: '100%',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            gap: '28px',
          }}>
            {/* Language Selector */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
            </div>

            {/* Form Header */}
            <div>
              <h1 style={{
                fontSize: isMobile ? '26px' : '32px',
                fontWeight: 800,
                marginBottom: '8px',
                color: TEXT_DARK,
              }}>
                Admin Login
              </h1>
              <p style={{
                fontSize: '14px',
                color: TEXT_GRAY,
              }}>
                Access your admin dashboard
              </p>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}>
              {/* Email Input */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <label style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: TEXT_GRAY,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Email</label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: BG_WHITE,
                  border: `1.5px solid ${BORDER_LIGHT}`,
                  borderRadius: '10px',
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                  <i className="fas fa-envelope" style={{
                    fontSize: '16px',
                    color: TEXT_LIGHT,
                    transition: 'color 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}></i>
                  <input
                    type="email"
                    placeholder="admin@snapstream.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '14px',
                      color: TEXT_DARK,
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              {/* Password Input */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <label style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: TEXT_GRAY,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>Password</label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  background: BG_WHITE,
                  border: `1.5px solid ${BORDER_LIGHT}`,
                  borderRadius: '10px',
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                }}>
                  <i className="fas fa-lock" style={{
                    fontSize: '16px',
                    color: TEXT_LIGHT,
                    transition: 'color 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    style={{
                      flex: 1,
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '14px',
                      color: TEXT_DARK,
                      fontFamily: 'inherit',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: TEXT_LIGHT,
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px 8px',
                      transition: 'color 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <i className={`fas fa-eye${showPassword ? '' : '-slash'}`}></i>
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  color: ERROR,
                  background: '#fef2f2',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                }}>
                  {error}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.2)',
                  position: 'relative',
                  overflow: 'hidden',
                  animation: 'pulseButton 2s ease-in-out infinite',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 12px 30px rgba(16, 185, 129, 0.3)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.2)';
                }}
              >
                <span>Sign In Now</span>
                <i className="fas fa-arrow-right"></i>
              </button>
            </form>

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              fontSize: '13px',
              color: TEXT_GRAY,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}>
                <span>Snap Stream powered by</span>
                <img 
                  src={umaloLogo} 
                  alt="Umalo Logo"
                  style={{
                    height: '25px',
                    width: 'auto',
                    objectFit: 'contain',
                  }}
                />
              </div>
            </div>

            {/* Footer Links */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              paddingTop: '16px',
              borderTop: `1px solid ${BORDER_LIGHT}`,
              fontSize: '11px',
            }}>
              <a href="#" style={{
                color: TEXT_LIGHT,
                textDecoration: 'none',
                transition: 'color 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}>Privacy</a>
              <a href="#" style={{
                color: TEXT_LIGHT,
                textDecoration: 'none',
                transition: 'color 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}>Terms</a>
              <a href="#" style={{
                color: TEXT_LIGHT,
                textDecoration: 'none',
                transition: 'color 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}>Support</a>
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float-bg {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(50px, 50px); }
        }
        
        @keyframes float-blob {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(30px, 30px); }
        }

        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes floatLogo {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(5deg);
          }
        }

        @keyframes floatCard {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes pulseButton {
          0%, 100% {
            box-shadow: 0 8px 20px rgba(16, 185, 129, 0.2);
          }
          50% {
            box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
          }
        }

        @keyframes floatParticle {
          0% {
            transform: translateY(100vh) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) translateX(100px);
            opacity: 0;
          }
        }
        
        @keyframes floatParticleReverse {
          0% {
            transform: translateY(100vh) translateX(0px);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-10vh) translateX(-100px);
            opacity: 0;
          }
        }

        /* Input focus animations */
        input:focus + div,
        input:focus ~ div {
          border-color: ${PRIMARY} !important;
        }
      `}</style>
    </div>
  );
};

export default AdminLogin; 