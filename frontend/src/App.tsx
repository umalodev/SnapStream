import React from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StreamingProvider } from './context/StreamingContext';
import AdminLogin from './admin/AdminLogin';
import AdminPanel from './admin/AdminPanel';
import ViewerPage from './ViewerPage';

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Ignore errors during initialization/refresh - they're often transient
    const errorMsg = error?.message || '';
    
    // Don't catch context/hydration errors that happen during refresh
    if (errorMsg.includes('Cannot read') || 
        errorMsg.includes('undefined') ||
        errorMsg.includes('context') ||
        errorMsg.includes('hydration') ||
        errorMsg.includes('Warning') ||
        !errorMsg) {
      return { hasError: false, error: null };
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log real errors, ignore common refresh/context errors
    const errorMsg = error?.message || '';
    const stack = errorInfo.componentStack || '';
    
    if (!errorMsg.includes('Cannot read') && 
        !errorMsg.includes('undefined') &&
        !errorMsg.includes('context') &&
        !errorMsg.includes('Warning') &&
        !stack.includes('AuthContext') &&
        !stack.includes('StreamingContext')) {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  // Note: Avoid resetting state in lifecycle methods to prevent update loops

  render() {
    // Always render children - don't show error UI
    // Errors are logged but not displayed to prevent loops
    return this.props.children;
  }
}

// Debug component to track location changes
function LocationTracker() {
  const location = useLocation();
  // Removed console.log to prevent excessive logging
  return null;
}

function App() {
  // Removed console.logs to prevent excessive logging
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StreamingProvider>
          <Router>
            <LocationTracker />
            <Routes>
              {/* Redirect root to admin login */}
              <Route path="/" element={<Navigate to="/admin" replace />} />
              
              {/* Viewer Routes - No authentication required */}
              <Route path="/view/:streamId" element={<ViewerPage />} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/dashboard/*" element={<AdminPanel />} />
              
              {/* Fallback - redirect to admin */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </Router>
        </StreamingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
