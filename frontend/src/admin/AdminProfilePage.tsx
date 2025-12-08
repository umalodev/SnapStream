import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ModalNotifikasi from '../components/ModalNotifikasi';
import { API_URL } from '../config';

// Soft professional color palette
// Premium Green Palette
const PRIMARY = '#10b981';      
const PRIMARY_LIGHT = '#34d399';
const PRIMARY_DARK = '#059669';

const TEXT_DARK = '#334155';
const TEXT_GRAY = '#64748b';
const TEXT_LIGHT = '#94a3b8';
const BG_WHITE = '#ffffff';
const BG_LIGHT = '#f8fafc';
const BORDER_LIGHT = '#e2e8f0';
const ERROR = '#f87171';
const SUCCESS = '#6ee7b7';

const COLORS = {
  primary: PRIMARY,
  primaryLight: PRIMARY_LIGHT,
  primaryDark: PRIMARY_DARK,
  text: TEXT_DARK,
  textGray: TEXT_GRAY,
  textLight: TEXT_LIGHT,
  subtext: TEXT_GRAY,
  bg: BG_LIGHT,
  bgWhite: BG_WHITE,
  white: BG_WHITE,
  border: BORDER_LIGHT,
  error: ERROR,
  success: SUCCESS,
};

const CARD_RADIUS = 12;
const SHADOW = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';

const AdminProfilePage: React.FC = () => {
  const { user, token, logout, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'warning' | 'info'>('info');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [hasChanges, setHasChanges] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  // Check for changes whenever formData changes
  useEffect(() => {
    if (user) {
      const hasFormChanges = (
        formData.name.trim() !== (user.name || '') || 
        formData.email.trim() !== (user.email || '')
      );
      setHasChanges(hasFormChanges);
    }
  }, [formData, user]);

  const isMobile = windowWidth < 768;

  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setAlertMessage(message);
    setAlertType(type);
    setShowAlertModal(true);
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) {
      setEmailError('');
      return true;
    }
    
    if (!email.includes('@')) {
      setEmailError("Please include an '@' in the email address. '" + email + "' is missing an '@'.");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("Format email tidak valid. pastikan memasukkan alamat email yang valid");
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate email in real-time
    if (name === 'email') {
      validateEmail(value);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!hasChanges) {
      showAlert('Tidak ada perubahan yang perlu disimpan', 'info');
      setLoading(false);
      return;
    }

    // Validate required fields
    if (!formData.name.trim()) {
      showAlert('Nama tidak boleh kosong', 'error');
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      showAlert('Email tidak boleh kosong', 'error');
      setLoading(false);
      return;
    }

    // Check if email has validation errors
    if (emailError) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim()
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        // Update user context with new data
        updateUser({
          name: responseData.name,
          email: responseData.email
        });
        showAlert('Profil berhasil diperbarui!', 'success');
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || 'Gagal memperbarui profil', 'error');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      showAlert('Terjadi kesalahan saat memperbarui profil', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      showAlert('Password baru dan konfirmasi password tidak cocok', 'error');
      return;
    }

    if (formData.newPassword.length < 6) {
      showAlert('Password baru harus minimal 6 karakter', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/${user?.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      if (response.ok) {
        showAlert('Password berhasil diperbarui!', 'success');
        setFormData(prev => ({
          ...prev,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        }));
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || 'Gagal memperbarui password', 'error');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showAlert('Terjadi kesalahan saat memperbarui password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  // Fungsi inisial nama
  const getInitials = (name: string) => {
    if (!name) return 'A';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0]?.toUpperCase() || 'A';
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div style={{ 
      padding: isMobile ? '20px' : '40px', 
      background: COLORS.bg, 
      minHeight: '100vh',
      position: 'relative',
      overflowX: 'hidden',
    }}>
        {/* Add CSS animations */}
        <style>
          {`
            @keyframes fadeInUp {
              0% {
                opacity: 0;
                transform: translateY(30px);
              }
              100% {
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            @keyframes slideInRight {
              0% {
                opacity: 0;
                transform: translateX(30px);
              }
              100% {
                opacity: 1;
                transform: translateX(0);
              }
            }
            
            @keyframes gradient {
              0% {
                background-position: 0% 50%;
              }
              50% {
                background-position: 100% 50%;
              }
              100% {
                background-position: 0% 50%;
              }
            }
              @keyframes fadeIn {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

          `}
        </style>

      {/* Welcome Card (MATCHED STYLE) */}
<div style={{
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  borderRadius: '20px',
  padding: isMobile ? '24px' : '36px',
  marginBottom: '32px',
  color: '#ffffff',
  position: 'relative',
  overflow: 'hidden',
  boxShadow: '0 14px 34px rgba(16, 185, 129, 0.25)',
  animation: 'fadeIn 0.6s ease-out'
}}>

  {/* Decorative circles */}
  <div style={{
    position: 'absolute',
    top: '-60px',
    right: '-60px',
    width: '220px',
    height: '220px',
    background: 'rgba(255, 255, 255, 0.12)',
    borderRadius: '50%',
    filter: 'blur(45px)'
  }} />
  <div style={{
    position: 'absolute',
    bottom: '-40px',
    left: '-40px',
    width: '170px',
    height: '170px',
    background: 'rgba(255, 255, 255, 0.10)',
    borderRadius: '50%',
    filter: 'blur(35px)'
  }} />

  {/* Content */}
  <div style={{ position: 'relative', zIndex: 1 }}>

    {/* Icon + Title */}
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '12px', 
      marginBottom: '14px' 
    }}>
      <div style={{
        fontSize: '32px',
        animation: 'pulse 2s infinite'
      }}>
        👤
      </div>

      <h1 style={{
        fontSize: isMobile ? '20px' : '28px',
        fontWeight: 700,
        margin: 0,
        letterSpacing: '-0.5px'
      }}>
        Profile Admin
      </h1>
    </div>

    {/* Subtitle */}
    <div style={{
      fontSize: isMobile ? '13px' : '15px',
      margin: 0,
      color: 'rgba(255, 255, 255, 0.92)',
      lineHeight: '1.6',
      maxWidth: '620px',
      fontWeight: 400
    }}>
      Kelola informasi profil dan keamanan akun Anda. Selamat datang, <b>{user?.name || 'Admin'}</b>!
    </div>

    {/* Date capsule */}
    <div style={{
      marginTop: '16px',
      padding: '8px 16px',
      background: 'rgba(255, 255, 255, 0.18)',
      borderRadius: '10px',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '13px',
      fontWeight: 500,
      backdropFilter: 'blur(3px)'
    }}>
      <i className="fas fa-calendar-alt"></i>
      {new Date().toLocaleDateString('id-ID', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}
    </div>

  </div>
</div>


        {/* Profile Information Card */}
        <div style={{
          background: COLORS.white,
          border: `1px solid ${COLORS.border}`,
          borderRadius: CARD_RADIUS,
          padding: isMobile ? '24px' : '32px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
          position: 'relative',
          overflow: 'hidden',
          animation: 'fadeInUp 0.6s ease-out 0.3s both',
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(187, 247, 208, 0.2)';
          e.currentTarget.style.transform = 'translateY(-4px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.06)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}>
          {/* Card accent bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${PRIMARY}, ${PRIMARY_LIGHT})`,
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              boxShadow: `0 4px 12px rgba(16, 185, 129, 0.15)`,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"/>
                <path d="M12.0002 14.5C6.99016 14.5 2.91016 17.86 2.91016 22C2.91016 22.28 3.13016 22.5 3.41016 22.5H20.5902C20.8702 22.5 21.0902 22.28 21.0902 22C21.0902 17.86 17.0102 14.5 12.0002 14.5Z"/>
              </svg>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: COLORS.text, margin: 0 }}>
              Profile Information
            </h2>
          </div>

          {/* Profile Avatar */}
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: '24px', marginBottom: '32px', paddingBottom: '32px', borderBottom: `1px solid ${COLORS.border}` }}>
            <div style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_LIGHT})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.white,
              fontSize: '32px',
              fontWeight: 500,
              boxShadow: `0 8px 24px rgba(16, 185, 129, 0.25)`,
              position: 'relative',
              border: '4px solid white',
            }}>
              {getInitials(user?.name || 'Admin')}
              <div style={{
                position: 'absolute',
                bottom: '4px',
                right: '4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: '#22c55e',
                border: '4px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'white',
                }} />
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '18px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                {user?.name || 'Administrator'}
              </div>
              <div style={{ fontSize: '14px', color: COLORS.textGray, marginBottom: '6px' }}>
                {user?.email || 'admin@example.com'}
              </div>
              <div style={{ fontSize: '12px', color: COLORS.primary, fontWeight: 500 }}>
                ADMIN
              </div>
            </div>
          </div>

          {/* Info Details */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '20px', marginBottom: '32px' }}>
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textGray, marginBottom: '4px', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.5px' }}>
                Nama Lengkap
              </div>
              <div style={{ fontSize: '14px', color: COLORS.text, fontWeight: 400 }}>
                {user?.name || 'Administrator'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textGray, marginBottom: '4px', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.5px' }}>
                Email
              </div>
              <div style={{ fontSize: '14px', color: COLORS.text, fontWeight: 400 }}>
                {user?.email || 'admin@example.com'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textGray, marginBottom: '4px', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.5px' }}>
                Role
              </div>
              <div style={{ fontSize: '14px', color: COLORS.primary, fontWeight: 500 }}>
                Admin
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: COLORS.textGray, marginBottom: '4px', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.5px' }}>
                Status
              </div>
              <div style={{ fontSize: '14px', color: COLORS.success, fontWeight: 500 }}>
                Aktif
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', flexDirection: isMobile ? 'column' : 'row' }}>
            <button
  onClick={() => setShowEditProfileModal(true)}
  style={{
    flex: 1,
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: 16,
    padding: '14px 20px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 8px 20px rgba(16,185,129,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow =
      '0 12px 28px rgba(16,185,129,0.45)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow =
      '0 8px 20px rgba(16,185,129,0.35)';
  }}
>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
  Edit Profile
</button>

            <button
              onClick={() => setShowChangePasswordModal(true)}
              style={{
                flex: 1,
                background: `linear-gradient(135deg, #fbbf24, #fcd34d)`,
                color: COLORS.white,
                border: 'none',
                borderRadius: 10,
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: `0 2px 8px rgba(251, 191, 36, 0.2)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
               onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = `0 4px 12px rgba(251, 191, 36, 0.3)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 2px 8px rgba(251, 191, 36, 0.2)`;
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7C7 3.68629 9.68629 1 13 1C16.3137 1 19 3.68629 19 7V11"/>
              </svg>
              Change Password
            </button>
          </div>
        </div>

        {/* Edit Profile Modal */}
        {showEditProfileModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowEditProfileModal(false)}
          >
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.text, margin: 0 }}>
                  Edit Profile
                </h3>
                <button
                  onClick={() => setShowEditProfileModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: COLORS.subtext,
                    padding: '4px 8px',
                    borderRadius: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = COLORS.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = COLORS.subtext;
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleUpdateProfile}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                      Nama Lengkap
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: `2px solid ${COLORS.border}`,
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.target.style.borderColor = COLORS.primary}
                      onBlur={(e) => e.target.style.borderColor = COLORS.border}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: `2px solid ${emailError ? '#ef4444' : COLORS.border}`,
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = emailError ? '#ef4444' : COLORS.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = emailError ? '#ef4444' : COLORS.border}
                    />
                    {emailError && (
                      <div style={{
                        marginTop: '8px',
                        padding: '12px 16px',
                        backgroundColor: '#fef3c7',
                        border: '1px solid #f59e0b',
                        borderRadius: 8,
                        fontSize: '14px',
                        color: '#92400e',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="12" y1="16" x2="12" y2="12"/>
                          <line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <span>{emailError}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowEditProfileModal(false)}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        background: '#f3f4f6',
                        color: COLORS.text,
                        border: 'none',
                        borderRadius: 10,
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !hasChanges}
                      onClick={() => {
                        handleUpdateProfile({ preventDefault: () => {} } as React.FormEvent);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        background: loading || !hasChanges 
                          ? '#9ca3af' 
                          : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: (loading || !hasChanges) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {showChangePasswordModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowChangePasswordModal(false)}
          >
            <div style={{
              background: 'white',
              borderRadius: 16,
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.text, margin: 0 }}>
                  Perbarui Password
                </h3>
                <button
                  onClick={() => setShowChangePasswordModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    color: COLORS.subtext,
                    padding: '4px 8px',
                    borderRadius: 6,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6';
                    e.currentTarget.style.color = COLORS.text;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = COLORS.subtext;
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleChangePassword}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                      Password Saat Ini
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: `2px solid ${COLORS.border}`,
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = COLORS.border}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                      Password Baru
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: `2px solid ${COLORS.border}`,
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = COLORS.border}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: COLORS.text, marginBottom: '6px' }}>
                      Konfirmasi Password Baru
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 10,
                        border: `2px solid ${COLORS.border}`,
                        fontSize: '15px',
                        outline: 'none',
                        transition: 'border-color 0.2s',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = COLORS.primary}
                      onBlur={(e) => e.currentTarget.style.borderColor = COLORS.border}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setShowChangePasswordModal(false)}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        background: '#f3f4f6',
                        color: COLORS.text,
                        border: 'none',
                        borderRadius: 10,
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#e5e7eb'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#f3f4f6'}
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      onClick={() => {
                        handleChangePassword({ preventDefault: () => {} } as React.FormEvent);
                      }}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        background: loading ? '#9ca3af' : '#fbbf24',
                        color: 'white',
                        border: 'none',
                        borderRadius: 10,
                        fontSize: '15px',
                        fontWeight: 600,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {loading ? 'Mengubah...' : 'Ubah Password'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Notifikasi */}
        <ModalNotifikasi
          isOpen={showAlertModal}
          title="Pemberitahuan"
          message={alertMessage}
          type={alertType}
          onConfirm={() => setShowAlertModal(false)}
          onCancel={() => setShowAlertModal(false)}
          confirmText="OK"
          cancelText=""
        />
    </div>
  );
};

export default AdminProfilePage;
