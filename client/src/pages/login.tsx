import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Chrome,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Search,
  BookOpen,
  FileDown,
  CloudLightning,
  ShieldCheck,
  Zap,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAnonymously, resetPassword } = useAuth();
  const { toast } = useToast();

  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGuestSignIn = async () => {
    setIsLoading(true);
    try {
      await signInAnonymously();
      toast({
        title: "مرحباً بك في APEX",
        description: "تم تسجيل الدخول بنجاح كضيف.",
      });
      setLocation("/chat");
    } catch (error: any) {
      toast({
        title: "فشل الدخول كضيف",
        description: error.message || "عذراً، تعذر الدخول كضيف.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "مرحباً بك في APEX",
        description: "تم تسجيل الدخول بنجاح عبر حساب Google.",
      });
      setLocation("/chat");
    } catch (error: any) {
      toast({
        title: "فشل تسجيل الدخول",
        description: error.message || "تعذر تسجيل الدخول باستخدام Google.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmail(email, password);
        toast({
          title: "مرحباً بعودتك",
          description: "تم تسجيل الدخول بنجاح.",
        });
        setLocation("/chat");
      } else if (mode === "signup") {
        await signUpWithEmail(email, password, displayName);
        toast({
          title: "تم إنشاء الحساب",
          description: "مرحباً بك في منصة APEX Chat.",
        });
        setLocation("/chat");
      } else if (mode === "reset") {
        await resetPassword(email);
        toast({
          title: "تم إرسال رابط الاستعادة",
          description: "يرجى التحقق من بريدك الإلكتروني لتعليمات استعادة كلمة المرور.",
        });
        setMode("login");
        setEmail("");
      }
    } catch (error: any) {
      toast({
        title: "فشل التحقق",
        description: error.message || "حدث خطأ أثناء عملية التحقق.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 min-h-screen w-full bg-background overflow-hidden select-none font-sans">
      
      {/* ─── LEFT PANE: BRAND SHOWCASE & LANDING (Desktop Only) ─── */}
      <div className="hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-between p-12 bg-card border-r border-white/5 relative overflow-hidden">
        
        {/* Glow Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Tech grid lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        {/* Top brand header */}
        <div className="flex items-center gap-2.5 z-10">
          <div className="w-8 h-8 rounded-lg bg-muted border border-white/10 flex items-center justify-center shadow-lg">
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <span className="font-display font-bold tracking-[0.2em] text-white text-sm">APEX CHAT</span>
        </div>

        {/* Main Hero texts */}
        <div className="my-auto max-w-xl z-10 flex flex-col items-start text-right" dir="rtl">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-mono mb-6 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-violet-400" />
              <span>النسخة الرابعة المطورة // v4.0 PRO</span>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white mb-6"
          >
            الجيل القادم من <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-300 to-emerald-400 bg-clip-text text-transparent">
              منصات المحادثة الذكية
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-zinc-400 text-base leading-relaxed mb-10 font-sans"
          >
            بيئة عمل سحابية فائقة الموثوقية تدمج أحدث نماذج الذكاء الاصطناعي مع أدوات متقدمة للبحث على الويب وصياغة المستندات والاختبارات التفاعلية بميزات استئناف ذكية وحفظ متواصل.
          </motion.p>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-4 w-full text-right">
            {[
              {
                icon: Search,
                title: "محرك البحث الذكي",
                desc: "جلب وتلخيص أحدث معلومات الويب بدقة عبر موديل Search المخصص.",
                color: "text-emerald-400",
                bg: "bg-emerald-500/5 border-emerald-500/10"
              },
              {
                icon: BookOpen,
                title: "اختبارات تفاعلية",
                desc: "توليد فوري لاختبارات خيارات متعددة مع شريط تقدم حقيقي لتتبع الفهم.",
                color: "text-amber-400",
                bg: "bg-amber-500/5 border-amber-500/10"
              },
              {
                icon: FileDown,
                title: "صياغة وتصدير الـ PDF",
                desc: "تنزيل مستندات منسقة ومفهرسة بالكامل بتصاميم داكنة وفاتحة ممتازة.",
                color: "text-violet-400",
                bg: "bg-violet-500/5 border-violet-500/10"
              },
              {
                icon: CloudLightning,
                title: "مرونة كاملة وسحابة ذكية",
                desc: "حفظ محلي فوري واستئناف تلقائي للدردشة عند انقطاع الشبكة أو التحديث.",
                color: "text-sky-400",
                bg: "bg-sky-500/5 border-sky-500/10"
              }
            ].map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4 + idx * 0.1 }}
                className={cn("p-4 rounded-xl border bg-muted/40 backdrop-blur-md transition-all duration-300 hover:bg-muted/70 hover:border-white/10", feat.bg)}
              >
                <div className="flex items-center justify-start gap-2.5 mb-2">
                  <span className={feat.color}>
                    <feat.icon className="w-5 h-5" />
                  </span>
                  <h3 className="font-bold text-sm text-white font-sans">{feat.title}</h3>
                </div>
                <p className="text-zinc-500 text-[11px] leading-relaxed font-sans">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Footer Metrics */}
        <div className="flex items-center justify-between border-t border-white/5 pt-6 text-[10px] font-mono text-zinc-500 z-10">
          <div className="flex gap-6">
            <span>CLOUDFLARE CLOUD // 240MS RESP</span>
            <span>PDF ENGINE // V4 COMPILER</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span>ALL SYSTEMS OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* ─── RIGHT PANE: AUTHENTICATION INTERFACE ─── */}
      <div className="col-span-12 md:col-span-6 lg:col-span-5 flex flex-col justify-center items-center p-6 sm:p-12 bg-background relative">
        
        {/* Glow behind form */}
        <div className="absolute top-[40%] right-[-10%] w-[60%] h-[60%] bg-violet-950/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Mobile-only logo */}
        <div className="flex md:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-muted border border-white/10 flex items-center justify-center shadow-lg">
            <Zap className="w-4 h-4 text-violet-400" />
          </div>
          <span className="font-display font-bold tracking-[0.2em] text-white text-sm">APEX CHAT</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          {/* Glass form container */}
          <div className="bg-card border border-white/8 rounded-2xl p-6 sm:p-8 shadow-[0_30px_90px_rgba(0,0,0,0.8)] relative overflow-hidden">
            
            {/* Header intro */}
            <div className="text-center mb-6">
              <h2 className="text-xl font-extrabold text-white tracking-wide uppercase font-sans">
                {mode === "login" && "تسجيل الدخول"}
                {mode === "signup" && "إنشاء حساب جديد"}
                {mode === "reset" && "استعادة كلمة المرور"}
              </h2>
              <p className="text-zinc-500 text-[11px] mt-1.5 font-sans">
                {mode === "login" && "ادخل لحسابك لمواصلة استخدام APEX Chat"}
                {mode === "signup" && "ابدأ رحلتك وصمم اختباراتك ومستنداتك بذكاء"}
                {mode === "reset" && "أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين"}
              </p>
            </div>

            {/* Custom Tab Switcher (Only if not in Reset mode) */}
            {mode !== "reset" && (
              <div className="flex p-0.5 rounded-lg bg-muted/60 border border-white/5 mb-6">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-md transition-all duration-200 font-sans",
                    mode === "login"
                      ? "bg-white text-black shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  تسجيل الدخول
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-bold rounded-md transition-all duration-200 font-sans",
                    mode === "signup"
                      ? "bg-white text-black shadow-lg"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  إنشاء حساب
                </button>
              </div>
            )}

            {/* Social Buttons */}
            {mode !== "reset" && (
              <div className="space-y-2.5 mb-6">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="w-full bg-white hover:bg-zinc-100 text-zinc-950 font-bold h-11 text-xs gap-2 rounded-lg transition-all duration-200 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
                >
                  <Chrome className="w-4 h-4 shrink-0 text-zinc-950" />
                  <span>المتابعة باستخدام Google</span>
                </Button>

                <Button
                  onClick={handleGuestSignIn}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full bg-muted/30 border-white/8 hover:bg-muted text-white font-bold h-11 text-xs gap-2 rounded-lg transition-all duration-200 hover:border-white/20"
                >
                  <User className="w-4 h-4 text-zinc-400" />
                  <span>الدخول الفوري كضيف (تخطي)</span>
                </Button>

                {/* Separator or */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/5"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-mono">
                    <span className="bg-zinc-950 px-3 text-zinc-600">أو بالبريد الإلكتروني</span>
                  </div>
                </div>
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleEmailAuth} className="space-y-4">
              
              {/* Display name (Signup only) */}
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="displayName" className="text-[11px] font-bold text-zinc-400 font-sans">
                    الاسم بالكامل
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="محمد أحمد"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="pl-10 pr-4 bg-muted/40 border-white/8 text-white h-11 text-xs focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] font-bold text-zinc-400 font-sans">
                  البريد الإلكتروني
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 pr-4 bg-muted/40 border-white/8 text-white h-11 text-xs focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all rounded-lg"
                  />
                </div>
              </div>

              {/* Password */}
              {mode !== "reset" && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[11px] font-bold text-zinc-400 font-sans">
                      كلمة المرور
                    </Label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setMode("reset")}
                        className="text-[10px] text-zinc-500 hover:text-white transition-colors font-sans"
                      >
                        نسيت كلمة المرور؟
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pl-10 pr-4 bg-muted/40 border-white/8 text-white h-11 text-xs focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all rounded-lg"
                    />
                  </div>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold h-11 text-xs gap-2 rounded-lg mt-6 shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all duration-200 active:scale-98"
              >
                <span>
                  {mode === "login" && "تسجيل الدخول"}
                  {mode === "signup" && "إنشاء حساب"}
                  {mode === "reset" && "إرسال رابط استعادة كلمة المرور"}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Button>
            </form>

            {/* Bottom Back Button for Reset mode */}
            {mode === "reset" && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-xs text-zinc-400 hover:text-white transition-colors font-sans"
                >
                  العودة لتسجيل الدخول
                </button>
              </div>
            )}
          </div>

          {/* Bottom Agreement Text */}
          <p className="text-[10px] text-zinc-600 text-center mt-6 leading-relaxed font-sans" dir="rtl">
            باستمرارك في تسجيل الدخول، فإنك توافق على <a href="#" className="text-zinc-500 hover:text-zinc-400 underline">شروط الخدمة</a> و <a href="#" className="text-zinc-500 hover:text-zinc-400 underline">سياسة الخصوصية</a> الخاصة بمنصة APEX.
          </p>
        </motion.div>
      </div>

    </div>
  );
}
