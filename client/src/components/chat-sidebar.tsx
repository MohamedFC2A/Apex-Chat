import { useState, useEffect, useRef, useCallback } from "react";
import { useChatStore } from "@/lib/store";
import { useSubscriptionStore } from "@/lib/subscription-store";
import { useAuthStore } from "@/lib/auth-store";
import { useAuth } from "@/lib/auth-provider";
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
  Search,
  X,
  ChevronRight,
  Edit3,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow, isToday, isYesterday, isThisWeek } from "date-fns";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "framer-motion";
import type { Conversation } from "@shared/schema";

// ── Helpers ──────────────────────────────────────────────────────────────────
function groupConversations(conversations: Conversation[]) {
  const groups: { label: string; items: Conversation[] }[] = [];
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const thisWeek: Conversation[] = [];
  const older: Conversation[] = [];

  conversations.forEach((c) => {
    const date = new Date(c.updatedAt);
    if (isToday(date)) today.push(c);
    else if (isYesterday(date)) yesterday.push(c);
    else if (isThisWeek(date)) thisWeek.push(c);
    else older.push(c);
  });

  if (today.length) groups.push({ label: "اليوم", items: today });
  if (yesterday.length) groups.push({ label: "أمس", items: yesterday });
  if (thisWeek.length) groups.push({ label: "هذا الأسبوع", items: thisWeek });
  if (older.length) groups.push({ label: "سابقاً", items: older });

  return groups;
}

// ── Sidebar Entry Point ───────────────────────────────────────────────────────
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
  const { logout } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" && window.innerWidth <= 768
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleNewChat = useCallback(() => {
    const id = createConversation();
    setActiveConversation(id);
    if (isMobile) setSidebarOpen(false);
  }, [createConversation, setActiveConversation, isMobile, setSidebarOpen]);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversation(id);
    if (isMobile) setSidebarOpen(false);
  }, [setActiveConversation, isMobile, setSidebarOpen]);

  const toggleSearch = useCallback(() => {
    setSearchOpen(v => {
      if (!v) setTimeout(() => searchRef.current?.focus(), 80);
      else setSearchQuery("");
      return !v;
    });
  }, []);

  const tierConfig = {
    starter: { name: "Starter", icon: Sparkles, color: "text-zinc-400", bg: "bg-zinc-900/60 border-zinc-800" },
    pro:     { name: "Pro",     icon: Zap,      color: "text-blue-400",  bg: "bg-blue-950/40 border-blue-800/40" },
    elite:   { name: "Elite",   icon: Crown,    color: "text-emerald-400", bg: "bg-emerald-950/40 border-emerald-800/40" },
    omni:    { name: "Apex Omni", icon: Crown,  color: "text-amber-400", bg: "bg-amber-950/40 border-amber-800/40" },
  };

  const currentTier = tierConfig[tier] || tierConfig.starter;
  const TierIcon = currentTier.icon;

  const filteredConversations = searchQuery.trim()
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  const groups = groupConversations(filteredConversations);

  // ── Collapsed mini rail (desktop only) ──
  if (!sidebarOpen && !isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="hidden md:flex flex-col items-center py-4 px-2 border-r border-sidebar-border h-full w-14 gap-1"
        style={{ background: "hsl(223 23% 8%)" }}
      >
        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
          <Button
            variant="ghost" size="icon"
            onClick={() => setSidebarOpen(true)}
            className="mb-1 w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-white/8 rounded-xl"
            title="فتح القائمة"
          >
            <PanelLeft className="w-4 h-4" />
          </Button>
        </motion.div>

        <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
          <Button
            variant="ghost" size="icon"
            onClick={handleNewChat}
            disabled={isGenerating}
            className="w-9 h-9 text-muted-foreground hover:text-foreground hover:bg-white/8 rounded-xl"
            title="محادثة جديدة"
          >
            <Edit3 className="w-4 h-4" />
          </Button>
        </motion.div>

        <div className="h-px w-6 bg-white/10 my-1 rounded-full" />

        <div className="flex flex-col items-center gap-1.5 mt-1">
          {conversations.slice(0, 9).map((conv, i) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: isGenerating ? 1 : 1.2 }}
              whileTap={{ scale: isGenerating ? 1 : 0.85 }}
              onClick={() => !isGenerating && handleSelectConversation(conv.id)}
              disabled={isGenerating}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                conv.id === activeConversationId
                  ? "bg-white shadow-sm shadow-white/30 scale-125"
                  : "bg-white/20 hover:bg-white/50"
              } ${isGenerating ? "opacity-40 cursor-not-allowed" : ""}`}
              title={conv.title}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  // ── Mobile edge drag area (when sidebar closed on mobile) ──
  if (!sidebarOpen && isMobile) {
    return (
      <motion.div
        key="sidebar-drag-open-handle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-y-0 left-0 w-6 z-40 cursor-grab active:cursor-grabbing md:hidden bg-transparent"
        drag="x"
        dragConstraints={{ left: 0, right: 100 }}
        onDragEnd={(_, info) => {
          if (info.offset.x > 30) {
            setSidebarOpen(true);
          }
        }}
      />
    );
  }

  return (
    <>
      {/* ── Mobile overlay ── */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-[2px] z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* ── Sidebar panel ── */}
      <AnimatePresence>
        <motion.div
          key="sidebar-panel"
          initial={isMobile ? { x: "-100%" } : { x: -8, opacity: 0 }}
          animate={isMobile ? { x: 0 } : { x: 0, opacity: 1 }}
          exit={isMobile ? { x: "-100%" } : { x: -8, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: isMobile ? 380 : 400,
            damping: isMobile ? 38 : 35,
            mass: 0.8,
          }}
          drag={isMobile ? "x" : false}
          dragConstraints={{ left: -300, right: 0 }}
          dragElastic={{ left: 0, right: 0.1 }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -50) {
              setSidebarOpen(false);
            }
          }}
          className="fixed md:relative inset-y-0 left-0 z-50 md:z-auto flex flex-col h-full overflow-hidden"
          style={{
            width: isMobile ? "min(280px, 85vw)" : "260px",
            background: "hsl(var(--sidebar))",
            borderRight: "1px solid hsl(var(--border))",
          }}
        >
          {/* Subtle top gradient accent */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-violet-950/15 to-transparent pointer-events-none" />

          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3.5 relative z-10 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div>
                <h2 className="text-sm font-bold tracking-tight text-white leading-none">ApexChat</h2>
                <p className="text-[10px] text-white/30 tracking-widest uppercase mt-0.5">AI Studio</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Search toggle */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={toggleSearch}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
                  searchOpen ? "bg-white/10 text-white" : "text-white/35 hover:text-white/70 hover:bg-white/6"
                }`}
              >
                <Search className="w-3.5 h-3.5" />
              </motion.button>

              {/* Close button */}
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setSidebarOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 hover:text-white/70 hover:bg-white/6 transition-all duration-150"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>

          {/* ── Search bar ── */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden flex-shrink-0 px-3 relative z-10"
              >
                <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-2 mb-2">
                  <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                  <input
                    ref={searchRef}
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="بحث في المحادثات..."
                    className="flex-1 bg-transparent text-sm text-white/80 placeholder:text-white/25 outline-none font-arabic"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-white/30 hover:text-white/60">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── New Chat button ── */}
          <div className="px-3 pb-2.5 relative z-10 flex-shrink-0">
            <motion.button
              onClick={handleNewChat}
              disabled={isGenerating}
              whileHover={isGenerating ? {} : { scale: 1.02, y: -1 }}
              whileTap={isGenerating ? {} : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 500, damping: 28 }}
              className={`w-full flex items-center justify-center gap-2.5 h-10 rounded-2xl font-semibold text-sm transition-all duration-200 relative overflow-hidden group ${
                isGenerating
                  ? "bg-white/5 text-white/25 cursor-not-allowed border border-white/5"
                  : "bg-white text-black shadow-md shadow-black/30 hover:shadow-lg hover:shadow-black/40"
              }`}
            >
              {/* shimmer effect */}
              {!isGenerating && (
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-black/5 to-transparent" />
              )}
              <Plus className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
              <span>محادثة جديدة</span>
            </motion.button>
          </div>

          {/* ── Conversations list ── */}
          <ScrollArea className="flex-1 relative z-10 min-h-0">
            <div className="px-2 pb-3">
              {conversations.length === 0 ? (
                <EmptyState />
              ) : filteredConversations.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm text-white/30 font-arabic">لا توجد نتائج</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.label} className="mb-1">
                    <p className="text-[9px] font-bold tracking-widest uppercase text-white/20 px-3 py-2 font-arabic">
                      {group.label}
                    </p>
                    <div className="space-y-0.5">
                      {group.items.map((conversation) => (
                        <ConversationItem
                          key={conversation.id}
                          conversation={conversation}
                          isActive={conversation.id === activeConversationId}
                          onSelect={() => handleSelectConversation(conversation.id)}
                          onDelete={() => deleteConversation(conversation.id)}
                          disabled={isGenerating}
                          isMobile={isMobile}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* ── User Profile ── */}
          <UserProfile
            user={user}
            tier={tier}
            TierIcon={TierIcon}
            currentTier={currentTier}
            setLocation={setLocation}
          />
        </motion.div>
      </AnimatePresence>
    </>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="px-3 py-12 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-white/4 border border-white/6 flex items-center justify-center mx-auto mb-4">
        <MessagesSquare className="w-6 h-6 text-white/20" />
      </div>
      <p className="text-sm text-white/40 font-medium font-arabic">لا توجد محادثات</p>
      <p className="text-xs text-white/20 mt-1.5 font-arabic">ابدأ محادثة جديدة بالضغط أعلاه</p>
    </motion.div>
  );
}

// ── User Profile Footer ───────────────────────────────────────────────────────
function UserProfile({
  user,
  tier,
  TierIcon,
  currentTier,
  setLocation,
}: {
  user: any;
  tier: string;
  TierIcon: any;
  currentTier: any;
  setLocation: (path: string) => void;
}) {
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div
      className="flex-shrink-0 border-t relative z-10 p-3"
      style={{ borderColor: "hsl(224 18% 11%)" }}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="flex items-center gap-3 w-full hover:bg-white/5 active:bg-white/8 rounded-2xl p-2.5 transition-all duration-150 group text-left"
          >
            {/* Avatar with tier ring */}
            <div className="relative flex-shrink-0">
              <Avatar className="w-9 h-9">
                <AvatarFallback
                  className={`text-sm font-bold border ${
                    tier === "elite" ? "bg-emerald-900/60 text-emerald-300 border-emerald-700/50" :
                    tier === "pro" ? "bg-blue-900/60 text-blue-300 border-blue-700/50" :
                    tier === "omni" ? "bg-amber-900/60 text-amber-300 border-amber-700/50" :
                    "bg-zinc-800 text-zinc-300 border-zinc-700"
                  }`}
                >
                  {initial}
                </AvatarFallback>
              </Avatar>
              {tier !== "starter" && (
                <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-black flex items-center justify-center ${
                  tier === "elite" ? "bg-emerald-500" :
                  tier === "pro" ? "bg-blue-500" :
                  "bg-amber-500"
                }`}>
                  <TierIcon className="w-2 h-2 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold truncate text-white/90 leading-tight">{displayName}</p>
              <p className="text-[10px] text-white/35 truncate mt-0.5">{user?.email || "No email"}</p>
            </div>

            <div className="flex-shrink-0 w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all">
              <MoreHorizontal className="w-3 h-3 text-white/30 group-hover:text-white/60" />
            </div>
          </motion.button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end" side="top"
          className="w-56 mb-2 bg-zinc-900/95 border-white/10 shadow-2xl shadow-black/60 rounded-2xl backdrop-blur-xl overflow-hidden p-1.5"
        >
          {/* Tier info header */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 ${currentTier.bg}`}>
            <TierIcon className={`w-3.5 h-3.5 ${currentTier.color}`} />
            <span className={`text-xs font-bold ${currentTier.color}`}>{currentTier.name}</span>
          </div>

          <div className="h-px bg-white/6 mx-1 my-1" />

          <DropdownMenuItem
            onClick={() => setLocation("/settings")}
            className="cursor-pointer rounded-xl gap-2.5 text-sm py-2.5 text-white/75 hover:text-white focus:text-white focus:bg-white/8"
          >
            <Settings className="w-4 h-4" /> الإعدادات
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setLocation("/pricing")}
            className="cursor-pointer rounded-xl gap-2.5 text-sm py-2.5 text-white/75 hover:text-white focus:text-white focus:bg-white/8"
          >
            <Crown className="w-4 h-4" /> إدارة الخطة
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setLocation("/billing")}
            className="cursor-pointer rounded-xl gap-2.5 text-sm py-2.5 text-white/75 hover:text-white focus:text-white focus:bg-white/8"
          >
            <Wallet className="w-4 h-4" /> المحفظة والفواتير
          </DropdownMenuItem>

          <div className="h-px bg-white/6 mx-1 my-1" />

          <DropdownMenuItem
            onClick={async () => {
              await logout();
              setLocation("/login");
            }}
            className="cursor-pointer rounded-xl gap-2.5 text-sm py-2.5 text-red-400/80 hover:text-red-400 focus:text-red-400 focus:bg-red-500/10"
          >
            <LogOut className="w-4 h-4" /> تسجيل الخروج
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ── Conversation Item ─────────────────────────────────────────────────────────
function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
  disabled,
  isMobile,
}: {
  conversation: Conversation;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  disabled: boolean;
  isMobile: boolean;
}) {
  const timeAgo = formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true });
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimer = useRef<number | null>(null);

  const handleTouchStart = useCallback(() => {
    if (disabled) return;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);

    longPressTimer.current = window.setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setMenuOpen(true);
    }, 500); // 500ms long press
  }, [disabled]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <motion.div
        whileTap={!disabled ? { scale: 0.98 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchEnd}
        onClick={() => {
          if (!disabled) onSelect();
        }}
        className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-colors duration-150 select-none ${
          isActive
            ? "bg-white/7 border border-white/10"
            : "hover:bg-white/5 active:bg-white/8"
        } ${disabled ? "opacity-40 pointer-events-none" : ""}`}
      >
        {/* Active bar */}
        {isActive && (
          <motion.div
            layoutId="active-conv-bar"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-full"
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
          />
        )}

        {/* Icon */}
        <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
          isActive ? "bg-white/10" : "bg-white/4 group-hover:bg-white/8"
        }`}>
          <MessageSquare className={`w-3.5 h-3.5 ${isActive ? "text-white" : "text-white/40"}`} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium truncate leading-tight ${isActive ? "text-white" : "text-white/65"}`}>
            {conversation.title}
          </p>
          <p className="text-[10px] text-white/25 truncate mt-0.5">{timeAgo}</p>
        </div>

        {/* Dropdown Menu (both desktop and mobile) */}
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}>
            <button
              className="w-6 h-6 flex md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0 rounded-lg hover:bg-white/10 items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="w-3.5 h-3.5 text-white/50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40 bg-zinc-900/95 border-white/10 shadow-xl rounded-xl backdrop-blur-xl"
          >
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
              className="cursor-pointer text-red-400/80 focus:text-red-400 focus:bg-red-500/10 rounded-lg gap-2 text-sm"
            >
              <Trash2 className="w-3.5 h-3.5" /> حذف
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    </div>
  );
}
