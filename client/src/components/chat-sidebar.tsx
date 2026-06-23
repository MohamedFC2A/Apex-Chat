import { useState, useEffect } from "react";
import { useChatStore } from "@/lib/store";
import { useSubscriptionStore } from "@/lib/subscription-store";
import { useAuthStore } from "@/lib/auth-store";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  MessageSquare,
  Trash2,
  PanelLeftClose,
  PanelLeft,
  MoreHorizontal,
  Crown,
  Sparkles,
  Settings,
  Wallet,
  LogOut,
  Zap,
  MessagesSquare,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { Conversation } from "@shared/schema";

export function ChatSidebar() {
  const {
    conversations,
    activeConversationId,
    sidebarOpen,
    setSidebarOpen,
    createConversation,
    setActiveConversation,
    deleteConversation,
    isGenerating,
  } = useChatStore();

  const { tier } = useSubscriptionStore();
  const { user } = useAuthStore();
  const [, setLocation] = useLocation();

  const handleNewChat = () => {
    const id = createConversation();
    setActiveConversation(id);
  };

  const tierConfig = {
    starter: {
      name: "Starter",
      icon: Sparkles,
      gradient: "from-zinc-800 to-zinc-900",
      glow: "",
      text: "text-zinc-400",
      bg: "bg-zinc-900/60 border-zinc-800",
    },
    pro: {
      name: "Pro",
      icon: Zap,
      gradient: "from-zinc-800 to-zinc-900",
      glow: "",
      text: "text-zinc-400",
      bg: "bg-zinc-900/60 border-zinc-800",
    },
    elite: {
      name: "Elite",
      icon: Crown,
      gradient: "from-zinc-800 to-zinc-900",
      glow: "",
      text: "text-zinc-400",
      bg: "bg-zinc-900/60 border-zinc-800",
    },
    omni: {
      name: "Apex Omni",
      icon: Crown,
      gradient: "from-zinc-800 to-zinc-900",
      glow: "",
      text: "text-zinc-400",
      bg: "bg-zinc-900/60 border-zinc-800",
    },
  };

  const currentTier = tierConfig[tier];
  const TierIcon = currentTier.icon;

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    if (isMobile) setSidebarOpen(false);
  };

  // ── Collapsed mini rail (desktop only) ──
  if (!sidebarOpen) {
    return (
      <div className="hidden md:flex flex-col items-center py-4 px-2 border-r border-sidebar-border h-full w-14"
        style={{ background: "hsl(223 23% 8%)" }}>

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost" size="icon"
            onClick={() => setSidebarOpen(true)}
            className="mb-3 w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl transition-all"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
          <Button
            variant="ghost" size="icon"
            onClick={handleNewChat}
            disabled={isGenerating}
            className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </motion.div>

        {/* Mini conversation dots */}
        <div className="mt-4 flex flex-col items-center gap-1.5">
          {conversations.slice(0, 8).map((conv) => (
            <motion.button
              key={conv.id}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleSelectConversation(conv.id)}
              className={`w-2 h-2 rounded-full transition-all ${
                conv.id === activeConversationId
                  ? "bg-violet-400 shadow-md shadow-violet-500/50 scale-125"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/60"
              }`}
              title={conv.title}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar panel ── */}
      <AnimatePresence>
        <motion.div
          key="sidebar"
          initial={{ x: "-100%", opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="fixed md:relative inset-y-0 left-0 z-50 md:z-auto flex flex-col w-64 border-r h-full text-sidebar-foreground overflow-hidden"
          style={{
            background: "hsl(var(--sidebar))",
            borderColor: "hsl(var(--border))",
          }}
        >
          {/* Top ambient glow removed */}

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b relative z-10"
            style={{ borderColor: "hsl(var(--border))" }}>
            <div className="flex items-center gap-2.5">
              {/* Logo */}
              <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Zap className="w-4 h-4 text-violet-400" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-sm font-bold tracking-tight text-foreground leading-none">ApexChat</h2>
                <p className="text-[10px] text-muted-foreground/60 tracking-widest uppercase mt-0.5">AI Studio</p>
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost" size="icon"
                onClick={() => setSidebarOpen(false)}
                className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-white/6 rounded-xl transition-all"
              >
                <PanelLeftClose className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>

          {/* ── New Chat ── */}
          <div className="px-3 pt-3 pb-2 relative z-10">
            <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}>
              <Button
                onClick={handleNewChat}
                disabled={isGenerating}
                className="w-full gap-2 btn-new-chat text-white font-semibold border-0 rounded-xl h-10"
              >
                <Plus className="w-4 h-4" strokeWidth={2.5} />
                <span>محادثة جديدة</span>
              </Button>
            </motion.div>
          </div>

          {/* ── Conversations ── */}
          <div className="px-2 py-1.5 relative z-10">
            <p className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground/40 px-2 mb-1.5">
              Recent
            </p>
          </div>

          <ScrollArea className="flex-1 relative z-10">
            <div className="px-2 space-y-0.5 pb-2">
              {conversations.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center mx-auto mb-3">
                    <MessagesSquare className="w-5 h-5 text-muted-foreground/30" />
                  </div>
                  <p className="text-sm text-muted-foreground/60 font-medium">No conversations yet</p>
                  <p className="text-xs text-muted-foreground/40 mt-1">Start a new chat above</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={conversation.id === activeConversationId}
                    onSelect={() => handleSelectConversation(conversation.id)}
                    onDelete={() => deleteConversation(conversation.id)}
                    disabled={isGenerating}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* ── User Profile ── */}
          <div className="p-3 border-t relative z-10" style={{ borderColor: "hsl(224 18% 15%)" }}>
            {/* Tier badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${currentTier.bg} ${currentTier.text} w-fit mb-2.5 text-[10px] font-bold tracking-wider uppercase`}>
              <TierIcon className="w-3 h-3" />
              {currentTier.name}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 w-full hover:bg-white/4 rounded-xl p-2 transition-all duration-200 group"
                >
                  <Avatar className="w-9 h-9 ring-2 ring-border/40 group-hover:ring-white/20 transition-all">
                    <AvatarFallback className="text-sm font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-semibold truncate text-foreground leading-tight">
                      {user?.displayName || user?.email?.split("@")[0] || "User"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 truncate mt-0.5">
                      {user?.email || "No email"}
                    </p>
                  </div>
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground/80 transition-colors flex-shrink-0" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top" className="w-52 mb-1 bg-popover border-border/60 shadow-2xl shadow-black/40 rounded-xl">
                <DropdownMenuItem onClick={() => setLocation("/settings")}
                  className="cursor-pointer rounded-lg gap-2.5 text-sm py-2.5">
                  <Settings className="w-4 h-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/pricing")}
                  className="cursor-pointer rounded-lg gap-2.5 text-sm py-2.5">
                  <Crown className="w-4 h-4" /> Manage Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation("/billing")}
                  className="cursor-pointer rounded-lg gap-2.5 text-sm py-2.5">
                  <Wallet className="w-4 h-4" /> Wallet & Billing
                </DropdownMenuItem>
                <div className="h-px bg-border/60 mx-2 my-1" />
                <DropdownMenuItem
                  onClick={async () => {
                    const { useAuth } = await import("@/lib/auth-provider");
                    const { logout } = useAuth();
                    await logout();
                    setLocation("/login");
                  }}
                  className="cursor-pointer rounded-lg gap-2.5 text-sm py-2.5 text-red-400 focus:text-red-400 focus:bg-red-500/10"
                >
                  <LogOut className="w-4 h-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// ── Conversation Item ────────────────────────────────────────────────────────
function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  disabled,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const timeAgo = formatDistanceToNow(conversation.updatedAt, { addSuffix: true });

  return (
    <motion.div
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      onClick={onSelect}
      className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
        isActive
          ? "conv-active text-foreground"
          : "text-muted-foreground/70 hover:text-foreground hover:bg-white/4"
      } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="active-conv"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-full"
        />
      )}

      <MessageSquare className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? "text-white" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium truncate leading-tight">{conversation.title}</p>
        <p className="text-[10px] text-muted-foreground/40 truncate mt-0.5">{timeAgo}</p>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost" size="icon"
            className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 rounded-lg hover:bg-white/10"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36 bg-popover border-border/60 shadow-xl rounded-xl">
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg gap-2 text-sm"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
