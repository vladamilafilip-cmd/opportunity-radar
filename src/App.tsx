import { useEffect, useState, Component, ReactNode } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Opportunity from "./pages/Opportunity";
import Trading from "./pages/Trading";
import Billing from "./pages/Billing";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import HealthCheck from "./pages/Index";
import NotFound from "./pages/NotFound";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RiskDisclosure from "./pages/RiskDisclosure";
import Disclaimer from "./pages/Disclaimer";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle } from "lucide-react";

const queryClient = new QueryClient();

// Error Boundary to catch runtime errors
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-4 text-center max-w-md">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/health'}>
              Open Health Check
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading spinner component with timeout fallback
function LoadingScreen() {
  const [showRetry, setShowRetry] = useState(false);
  const { error } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => setShowRetry(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {error && (
        <p className="text-destructive text-sm">{error}</p>
      )}
      {showRetry && (
        <div className="text-center">
          <p className="text-muted-foreground mb-2 text-sm">
            Loading is taking longer than expected...
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Retry
            </Button>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = '/health'}>
              Health Check
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Protected Route wrapper - validates session (not userData)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  // Only show loading during initial auth check
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // Redirect to login if no session
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // Session exists - render children (userData may still be loading)
  return <>{children}</>;
}

// Admin Route wrapper - validates admin role from database
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, isUserDataLoading } = useAuthStore();
  
  // Initial auth check
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // No session - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // User data still loading - show loading (we need to verify admin status)
  if (isUserDataLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Checking permissions...</p>
      </div>
    );
  }
  
  // Admin check comes from database via has_role() function
  // If userData failed to load or user is not admin, redirect to dashboard
  if (!user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Public Route wrapper (redirects to dashboard if already logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <LoadingScreen />;
  }
  
  // Redirect authenticated users to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}

// Auth initializer component
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthInitializer>
            <Routes>
              {/* Health check - ALWAYS accessible, no auth */}
              <Route path="/health" element={<HealthCheck />} />
              
              {/* Landing - NO auth wrapper, renders immediately */}
              <Route path="/" element={<Landing />} />
              
              {/* Legal pages - public access */}
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/risk-disclosure" element={<RiskDisclosure />} />
              <Route path="/disclaimer" element={<Disclaimer />} />
              
              {/* Auth routes - wrapped in PublicRoute */}
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              
              {/* Protected routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/opportunity/:id" element={<ProtectedRoute><Opportunity /></ProtectedRoute>} />
              <Route path="/trading" element={<ProtectedRoute><Trading /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              
              {/* Admin route - validates role from database */}
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              
              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthInitializer>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
