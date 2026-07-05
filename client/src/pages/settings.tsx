import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Mail, Camera, Save, ArrowLeft, LogOut, Wallet, Cloud, CloudOff, 
  RefreshCw, Cpu, ShieldCheck, Check, Crown, Zap, Lock, Sparkles, Sliders,
  Settings, AlertCircle
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-provider";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/hooks/use-toast";
import { getSyncState, forceSyncNow } from "@/lib/cloud-sync";
import { useChatStore } from "@/lib/store";
import type { AIModel, ServiceMode, ReasoningLevel } from "@shared/schema";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { user, updateUserProfile, logout } = useAuth();
  const authStore = useAuthStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"profile" | "preferences" | "wallet" | "sync" | "security">("profile");
  const [displayName, setDisplayName] = useState(user?.user_metadata?.display_name || "");
  const [photoURL, setPhotoURL] = useState(user?.user_metadata?.avatar_url || "");
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(getSyncState());
  const [isSyncing, setIsSyncing] = useState(false);

  const { 
    conversations, 
    selectedModel, setSelectedModel, 
    serviceMode, setServiceMode, 
    reasoningLevel, setReasoningLevel 
  } = useChatStore();

  // Interactive Grid Spotlight Tracking
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseActive, setIsMouseActive] = useState(false);
  const mouseTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 768) return;
      setIsMouseActive(true);
      if (mouseTimeoutRef.current) window.clearTimeout(mouseTimeoutRef.current);
      
      mouseTimeoutRef.current = window.setTimeout(() => {
        setIsMouseActive(false);
      }, 4000);

      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      el.style.setProperty("--mouse-x", `${x}px`);
      el.style.setProperty("--mouse-y", `${y}px`);
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (mouseTimeoutRef.current) window.clearTimeout(mouseTimeoutRef.current);
    };
  }, []);

  // Spotlight Auto-Animation for Mobile / Idle Desktop
  useEffect(() => {
    let animationFrameId: number;
    let angle = 0;

    const animateSpotlight = () => {
      const el = containerRef.current;
      const isMobile = window.innerWidth < 768;
      
      if (el && (!isMouseActive || isMobile)) {
        angle += 0.004;
        const x = 50 + Math.sin(angle) * 35;
        const y = 45 + Math.cos(angle * 1.4) * 20;
        el.style.setProperty("--mouse-x", `${x}%`);
        el.style.setProperty("--mouse-y", `${y}%`);
      }
      animationFrameId = requestAnimationFrame(animateSpotlight);
    };

    animationFrameId = requestAnimationFrame(animateSpotlight);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isMouseActive]);

  // Update sync status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(getSyncState());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleForceSync = async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    try {
      await forceSyncNow(user.id);
      toast({
        title: "✅ تم تحديث المزامنة",
        description: "تمت مزامنة جميع المحادثات مع السحابة بنجاح.",
      });
      setSyncStatus(getSyncState());
    } catch (error) {
      toast({
        title: "❌ فشلت المزامنة",
        description: "تعذر الاتصال بالسحابة. يرجى التحقق من الشبكة.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateUserProfile(displayName || undefined, photoURL || undefined);
      toast({
        title: "✅ تم تحديث الحساب",
        description: "تم حفظ بيانات ملفك الشخصي بنجاح.",
      });
    } catch (error: any) {
      toast({
        title: "❌ فشل التحديث",
        description: error.message || "تعذر حفظ التغييرات.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "👋 تم تسجيل الخروج",
        description: "تم تسجيل خروجك بأمان من النظام.",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "❌ فشل تسجيل الخروج",
        description: error.message || "حدث خطأ أثناء الخروج.",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    setLocation("/login");
    return null;
  }

  const userProfile = authStore.user;
  const initials = (displayName || user.email || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div 
      ref={containerRef}
      className="flex flex-col h-screen w-full bg-black text-white relative overflow-hidden select-none font-sans"
      style={{
        backgroundImage: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(124, 58, 237, 0.08) 0%, rgba(6, 182, 212, 0.03) 33%, transparent 70%)`,
      }}
    >
      {/* Background grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808007_1px,transparent_1px),linear-gradient(to_bottom,#80808007_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Header bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-16 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl shrink-0" dir="rtl">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setLocation("/chat")}
            variant="ghost"
            size="sm"
            className="gap-2 text-zinc-400 hover:text-white border border-white/5 hover:bg-white/5 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>العودة للمحادثة</span>
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-violet-400" />
          <h1 className="text-base font-extrabold tracking-wider text-white">إعدادات النظام // SYSTEM SETTINGS</h1>
        </div>

        <div className="w-24"></div>
      </header>

      {/* Main Settings Frame */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative z-10 w-full max-w-7xl mx-auto p-4 sm:p-6 gap-6" dir="rtl">
        
        {/* SIDEBAR TABS: Navigation */}
        <div className="w-full md:w-64 flex shrink-0 md:flex-col overflow-x-auto md:overflow-x-visible gap-2 p-1 bg-zinc-950/50 backdrop-blur-md border border-white/5 rounded-xl md:h-fit">
          {[
            { id: "profile", label: "الملف الشخصي", sub: "Profile settings", icon: User },
            { id: "preferences", label: "تفضيلات النظام", sub: "System preferences", icon: Sliders },
            { id: "wallet", label: "المحفظة والاشتراك", sub: "Wallet & Subscription", icon: Wallet },
            { id: "sync", label: "المزامنة السحابية", sub: "Cloud data sync", icon: Cloud },
            { id: "security", label: "الأمان والخروج", sub: "Security & Logout", icon: ShieldCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 w-full p-3 rounded-lg text-right shrink-0 transition-all duration-200 border ${
                  isSelected
                    ? "bg-white/5 border-white/10 text-white shadow-[0_4px_12px_rgba(255,255,255,0.02)]"
                    : "border-transparent text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-5 h-5 ${isSelected ? "text-violet-400" : "text-zinc-500"}`} />
                <div>
                  <div className="text-xs font-bold font-sans">{tab.label}</div>
                  <div className="text-[9px] text-zinc-500 font-mono tracking-wider">{tab.sub}</div>
                </div>
                {isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400 mr-auto shrink-0 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* TAB CONTENTS: Main View */}
        <div className="flex-1 min-w-0 bg-zinc-950/50 backdrop-blur-md border border-white/5 rounded-xl flex flex-col overflow-y-auto">
          <div className="p-6 sm:p-8 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                
                {/* ─── TAB 1: PROFILE ─── */}
                {activeTab === "profile" && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-lg font-bold text-white">الملف الشخصي // PROFILE</h2>
                      <p className="text-[11px] text-zinc-500 mt-1">تحديث وتعديل البيانات الشخصية المعروضة على حسابك.</p>
                    </div>

                    {/* Avatar display & edit */}
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-5 bg-white/2 rounded-xl border border-white/5">
                      <Avatar className="w-20 h-20 border-2 border-white/10 shadow-xl">
                        <AvatarImage src={photoURL || user.user_metadata?.avatar_url || undefined} />
                        <AvatarFallback className="bg-zinc-900 text-white text-xl font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 w-full space-y-2">
                        <Label htmlFor="photoURL" className="text-[11px] font-bold text-zinc-400">
                          رابط صورة الحساب الشخصية (URL)
                        </Label>
                        <div className="relative">
                          <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <Input
                            id="photoURL"
                            type="url"
                            placeholder="https://example.com/avatar.jpg"
                            value={photoURL}
                            onChange={(e) => setPhotoURL(e.target.value)}
                            className="pl-10 bg-zinc-950/80 border-white/10 text-white focus:border-violet-500/50 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Form fields */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-[11px] font-bold text-zinc-400">
                          الاسم بالكامل (اسم العرض)
                        </Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <Input
                            id="displayName"
                            type="text"
                            placeholder="محمد أحمد"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="pl-10 bg-zinc-950/80 border-white/10 text-white focus:border-violet-500/50 rounded-lg text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label htmlFor="email" className="text-[11px] font-bold text-zinc-400">
                            البريد الإلكتروني (معرّف معتمد)
                          </Label>
                          <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                            معتمد بنجاح
                          </span>
                        </div>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <Input
                            id="email"
                            type="email"
                            value={user.email || "حساب ضيف (محلي)"}
                            disabled
                            className="pl-10 bg-zinc-900/30 border-white/5 text-zinc-500 cursor-not-allowed rounded-lg text-xs"
                          />
                        </div>
                        <p className="text-[9px] text-zinc-500">
                          لا يمكن تغيير البريد الإلكتروني الخاص بك المسجل في النظام.
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4">
                      <Button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-black font-bold text-xs gap-2 px-5 py-2.5 rounded-lg transition-all duration-200"
                      >
                        <Save className="w-4 h-4" />
                        <span>حفظ التغييرات الشخصية</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* ─── TAB 2: SYSTEM PREFERENCES ─── */}
                {activeTab === "preferences" && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-lg font-bold text-white">تفضيلات النظام // PREFERENCES</h2>
                      <p className="text-[11px] text-zinc-500 mt-1">تخصيص السلوك الافتراضي لمحرك الدردشة والذكاء الاصطناعي.</p>
                    </div>

                    {/* Selected Model */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-violet-400" />
                        النموذج الافتراضي للدردشة (Default AI Model)
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {[
                          { id: "apex-flash", name: "APEX Flash", desc: "أسرع استجابة للمحادثات" },
                          { id: "apex-pro", name: "APEX Pro", desc: "متوازن للبرمجة والمنطق" },
                          { id: "apex-elite", name: "APEX Search", desc: "بحث متكامل في الويب" },
                          { id: "apex-omni", name: "APEX Omni", desc: "الأعلى ذكاءً وقدرة معرفية" },
                          { id: "apex-unbound", name: "APEX Unbound", desc: "غير خاضع للرقابة / عميق" },
                        ].map((m) => {
                          const isSel = selectedModel === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => setSelectedModel(m.id as AIModel)}
                              className={`p-3 rounded-lg border text-right transition-all flex flex-col justify-between ${
                                isSel
                                  ? "bg-white/5 border-violet-500/50 text-white"
                                  : "border-white/5 bg-zinc-950/40 text-zinc-400 hover:text-white hover:border-white/10"
                              }`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className="text-xs font-bold">{m.name}</span>
                                {isSel && <Check className="w-3.5 h-3.5 text-violet-400" />}
                              </div>
                              <span className="text-[10px] text-zinc-500 mt-1.5">{m.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Service Mode */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-violet-400" />
                        وضع محرك الخدمة (Service Mode)
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "standard", label: "القياسي", desc: "محادثة عامة" },
                          { id: "dev", label: "التطوير", desc: "حلول البرمجة" },
                          { id: "education", label: "التعليم", desc: "أكاديمي وشرح" },
                        ].map((mode) => {
                          const isSel = serviceMode === mode.id;
                          return (
                            <button
                              key={mode.id}
                              onClick={() => setServiceMode(mode.id as ServiceMode)}
                              className={`p-3 rounded-lg border text-center transition-all ${
                                isSel
                                  ? "bg-white/5 border-violet-500/50 text-white"
                                  : "border-white/5 bg-zinc-950/40 text-zinc-400 hover:text-white hover:border-white/10"
                              }`}
                            >
                              <div className="text-xs font-bold">{mode.label}</div>
                              <div className="text-[9px] text-zinc-500 mt-1">{mode.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Reasoning level */}
                    <div className="space-y-2 pt-2">
                      <Label className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                        مستوى قوة التفكير (Reasoning/Thinking Level)
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: "none", label: "بدون تفكير", desc: "سرعة فائقة" },
                          { id: "thinking", label: "تفكير عميق", desc: "تفصيل وتحليل" },
                          { id: "overthinking", label: "تفكير مفرط", desc: "أعلى درجة منطق" },
                        ].map((lvl) => {
                          const isSel = reasoningLevel === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              onClick={() => setReasoningLevel(lvl.id as ReasoningLevel)}
                              className={`p-3 rounded-lg border text-center transition-all ${
                                isSel
                                  ? "bg-white/5 border-violet-500/50 text-white"
                                  : "border-white/5 bg-zinc-950/40 text-zinc-400 hover:text-white hover:border-white/10"
                              }`}
                            >
                              <div className="text-xs font-bold">{lvl.label}</div>
                              <div className="text-[9px] text-zinc-500 mt-1">{lvl.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-violet-500/10 bg-violet-500/5 text-violet-300 text-xs leading-relaxed" dir="rtl">
                      💡 **تنبيه**: هذه الإعدادات سيتم اعتمادها تلقائياً عند فتح محادثات جديدة. يمكنك دائماً تغيير النموذج مؤقتاً للمحادثة الحالية من شريط الدردشة العلوي.
                    </div>
                  </div>
                )}

                {/* ─── TAB 3: WALLET & PLAN ─── */}
                {activeTab === "wallet" && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-lg font-bold text-white">الاشتراك والمحفظة // SUBSCRIPTION & WALLET</h2>
                      <p className="text-[11px] text-zinc-500 mt-1">تتبع خطتك الحالية ورصيدك المالي المتاح للاستخدام.</p>
                    </div>

                    {/* Subscription premium display */}
                    <div className="p-6 bg-gradient-to-br from-violet-600/10 via-zinc-900 to-zinc-900 border border-violet-500/20 rounded-xl relative overflow-hidden">
                      {/* Glow indicator */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/20 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex justify-between items-start">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/25 text-violet-300 text-[10px] font-bold uppercase tracking-wider mb-4">
                            <Crown className="w-3.5 h-3.5 text-violet-400" />
                            <span>خطة البلاتينيوم العظمى // OMNI PLAN</span>
                          </div>
                          
                          <h3 className="text-2xl font-extrabold text-white uppercase tracking-wider">APEX OMNI TIER 4</h3>
                          <p className="text-xs text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            حساب بريميوم نشط بالكامل مدى الحياة (Lifetime Unlimited)
                          </p>
                        </div>
                      </div>

                      {/* Benefits list */}
                      <div className="grid grid-cols-2 gap-3 mt-6 border-t border-white/5 pt-4 text-zinc-400 text-xs">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>الوصول غير المحدود لجميع النماذج الذكية</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>خاصية التفكير الفائق المزدوجة</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>تصدير مستندات PDF مخصصة ومفتوحة</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>توليد عدد لا نهائي من الاختبارات التفاعلية</span>
                        </div>
                      </div>
                    </div>

                    {/* Wallet display */}
                    <div className="p-5 bg-zinc-900/50 border border-white/5 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                          <Wallet className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-[10px] text-zinc-500 uppercase font-mono tracking-wider">رصيدك الحالي المتاح</p>
                          <p className="text-2xl font-black bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                            ${(userProfile?.wallet?.balance ?? 1000).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <Button
                        onClick={() => setLocation("/billing")}
                        className="w-full sm:w-auto bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 text-xs px-5 py-2.5 rounded-lg transition-all duration-200"
                      >
                        <Wallet className="w-4 h-4 ml-2" />
                        <span>شحن الرصيد والمدفوعات</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* ─── TAB 4: CLOUD SYNC ─── */}
                {activeTab === "sync" && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-lg font-bold text-white">المزامنة السحابية // CLOUD SYNC</h2>
                      <p className="text-[11px] text-zinc-500 mt-1">إدارة اتصال قاعدة البيانات السحابية وحفظ المحادثات والذاكرة احتياطياً.</p>
                    </div>

                    {/* Status Indicator */}
                    <div className="flex items-center justify-between p-5 bg-zinc-900/40 rounded-xl border border-white/5">
                      <div className="flex items-center gap-4">
                        {syncStatus.isOnline && !syncStatus.permissionDenied ? (
                          <>
                            <div className="relative shrink-0">
                              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                              <div className="absolute inset-0 w-3.5 h-3.5 rounded-full bg-emerald-500 animate-ping" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">متصل بالسحابة // Connected</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">يتم حفظ جميع المحادثات وتزامنها تلقائياً.</p>
                            </div>
                          </>
                        ) : syncStatus.permissionDenied ? (
                          <>
                            <AlertCircle className="w-6 h-6 text-amber-500 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-amber-400">مزامنة محلية فقط // Local Only</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">أنت مسجل بحساب محلي/غير متصل بـ Supabase.</p>
                            </div>
                          </>
                        ) : (
                          <>
                            <CloudOff className="w-6 h-6 text-zinc-500 shrink-0" />
                            <div>
                              <p className="text-sm font-bold text-zinc-400">أنت خارج الشبكة // Offline</p>
                              <p className="text-[10px] text-zinc-500 mt-0.5">يتم التخزين في المتصفح حالياً حتى معاودة الاتصال.</p>
                            </div>
                          </>
                        )}
                      </div>
                      
                      <Button
                        onClick={handleForceSync}
                        disabled={isSyncing || !syncStatus.isOnline || syncStatus.permissionDenied}
                        size="sm"
                        className="bg-violet-600 hover:bg-violet-700 text-white gap-2 px-4 py-2 text-xs rounded-lg shrink-0"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}</span>
                      </Button>
                    </div>

                    {/* Sync Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-zinc-900/20 rounded-xl border border-white/5">
                        <p className="text-[10px] text-zinc-500 mb-1">المحادثات المحفوظة</p>
                        <p className="text-xl font-bold text-white">{conversations.length} دردشة</p>
                      </div>
                      <div className="p-4 bg-zinc-900/20 rounded-xl border border-white/5">
                        <p className="text-[10px] text-zinc-500 mb-1">آخر وقت تحديث</p>
                        <p className="text-xs font-mono text-zinc-300 mt-1.5">
                          {syncStatus.lastSyncAt 
                            ? new Date(syncStatus.lastSyncAt).toLocaleTimeString("ar-EG")
                            : 'لم يتم حفظ محتوى بعد'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB 5: SECURITY & LOGOUT ─── */}
                {activeTab === "security" && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-lg font-bold text-white">الأمان وتسجيل الخروج // SECURITY</h2>
                      <p className="text-[11px] text-zinc-500 mt-1">إجراءات الأمان وخروج المستخدم بشكل آمن من حساب الدردشة.</p>
                    </div>

                    {/* Safe logout warning */}
                    <div className="p-6 bg-red-950/20 border border-red-900/30 rounded-xl">
                      <div className="flex items-start gap-4" dir="rtl">
                        <div className="w-10 h-10 rounded-lg bg-red-950/80 border border-red-900/50 flex items-center justify-center shrink-0">
                          <LogOut className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-red-400">منطقة الأمان القصوى // DANGER ZONE</h4>
                          <p className="text-xs text-zinc-400 leading-relaxed mt-2">
                            عند تسجيل الخروج، سيتم مسح بيانات الجلسة المؤقتة محلياً والتحقق من تأمين ملفك الشخصي بالكامل. لمعاودة فتح محادثاتك لاحقاً، يرجى حفظ بيانات تسجيل الدخول الخاصة بك جيداً.
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-start">
                        <Button
                          onClick={handleLogout}
                          className="w-full sm:w-auto bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-900/50 gap-2 text-xs px-5 py-2.5 rounded-lg"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>تسجيل الخروج الآمن الآن (Sign Out)</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
