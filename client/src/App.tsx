import { lazy, Suspense } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ProtectedRoute } from "@/components/protected-route";
import { AuthProvider, useAuth } from "@/lib/auth-provider";
import ChatPage from "@/pages/chat";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-black text-white p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load non-critical routes for faster initial load
const SettingsPage = lazy(() => import("@/pages/settings"));
const PricingPage = lazy(() => import("@/pages/pricing-page"));
const BillingPage = lazy(() => import("@/pages/billing"));

// Login route that redirects authenticated users to chat
function LoginRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-background">
        <div className="w-12 h-12 border-2 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/chat" />;
  }

  return <LoginPage />;
}

function Router() {
  return (
    <Switch>
      {/* Root redirects to chat (which will redirect to login if not authenticated) */}
      <Route path="/">
        <Redirect to="/chat" />
      </Route>

      {/* Login route - auto-redirects if already logged in */}
      <Route path="/login" component={LoginRoute} />

      {/* Auth alias for login */}
      <Route path="/auth">
        <Redirect to="/login" />
      </Route>

      {/* Protected routes with lazy loading */}
      <Route path="/chat">
        <ProtectedRoute>
          <ChatPage />
        </ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute>
          <Suspense fallback={<LoadingScreen />}>
            <SettingsPage />
          </Suspense>
        </ProtectedRoute>
      </Route>

      {/* Pricing/Subscription consolidated */}
      <Route path="/pricing">
        <ProtectedRoute>
          <Suspense fallback={<LoadingScreen />}>
            <PricingPage />
          </Suspense>
        </ProtectedRoute>
      </Route>
      <Route path="/subscription">
        <Redirect to="/pricing" />
      </Route>

      {/* Wallet & Billing */}
      <Route path="/billing">
        <ProtectedRoute>
          <Suspense fallback={<LoadingScreen />}>
            <BillingPage />
          </Suspense>
        </ProtectedRoute>
      </Route>

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Loading screen component for lazy routes
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen w-full bg-background">
      <div className="w-12 h-12 border-2 border-border border-t-primary rounded-full animate-spin" />
    </div>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const isLoginPage = location === "/login" || location === "/auth";
  const isFullPageRoute = location === "/pricing" || location === "/settings" || location === "/billing";
  const showSidebar = !isLoginPage && !isFullPageRoute;

  return (
    <div className="flex h-[100dvh] w-full bg-background text-foreground overflow-hidden">
      {showSidebar && <ChatSidebar />}

      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <main className={`flex-1 ${isLoginPage || isFullPageRoute ? "overflow-y-auto" : "overflow-hidden"} min-h-0`}>
          <Router />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <AppLayout />
            </ErrorBoundary>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
