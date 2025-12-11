import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ModelSelector } from "@/components/model-selector";
import { ServiceModeSwitcher } from "@/components/service-mode-switcher";
import { PulsingBrainIndicator } from "@/components/thinking-controls";
import ChatPage from "@/pages/chat";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ChatPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayout() {
  return (
    <div className="flex h-screen w-full bg-background">
      <ChatSidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center justify-between gap-4 px-4 h-14 border-b flex-shrink-0">
          <div className="flex items-center gap-2">
            <ModelSelector />
          </div>
          <div className="flex items-center gap-3">
            <PulsingBrainIndicator />
            <ServiceModeSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
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
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
