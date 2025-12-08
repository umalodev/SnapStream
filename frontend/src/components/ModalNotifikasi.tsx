import React from 'react';

interface ModalNotifikasiProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

const ModalNotifikasi: React.FC<ModalNotifikasiProps> = ({
  isOpen,
  title,
  message,
  type = 'info',
  onConfirm,
  onCancel,
  confirmText = 'Ya',
  cancelText = 'Batal'
}) => {
  if (!isOpen) return null;

  const getTypeColors = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: '#d1fae5',
          border: '#10b981',
          text: '#065f46',
          button: '#10b981',
          buttonHover: '#059669'
        };
      case 'error':
        return {
          bg: '#fee2e2',
          border: '#ef4444',
          text: '#dc2626',
          button: '#ef4444',
          buttonHover: '#dc2626'
        };
      case 'warning':
        return {
          bg: '#fef3c7',
          border: '#f59e0b',
          text: '#d97706',
          button: '#f59e0b',
          buttonHover: '#d97706'
        };
      default:
        return {
          bg: '#dbeafe',
          border: '#3b82f6',
          text: '#1e40af',
          button: '#3b82f6',
          buttonHover: '#2563eb'
        };
    }
  };

  const colors = getTypeColors(type);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      fontFamily: 'Poppins, Inter, Segoe UI, Arial, sans-serif'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '32px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: `2px solid ${colors.border}`,
        animation: 'modalSlideIn 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <div style={{
            fontSize: '24px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: colors.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${colors.border}`
          }}>
            {getIcon(type)}
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#1e293b',
            margin: 0
          }}>
            {title}
          </h3>
        </div>

        {/* Message */}
        <p style={{
          fontSize: '16px',
          color: '#64748b',
          lineHeight: '1.6',
          margin: '0 0 24px 0'
        }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          {cancelText && (
            <button
              onClick={onCancel}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#64748b',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#f8f9fa';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: colors.button,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = colors.buttonHover;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = colors.button;
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default ModalNotifikasi; 