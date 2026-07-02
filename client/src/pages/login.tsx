import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Chrome, Mail, Lock, User, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-provider";
import { useToast } from "@/hooks/use-toast";

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
        title: "Welcome to APEX",
        description: "Successfully signed in as Guest",
      });
      setLocation("/chat");
    } catch (error: any) {
      toast({
        title: "Guest Sign-in failed",
        description: error.message || "Could not sign in as Guest",
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
        title: "Welcome to APEX",
        description: "Successfully signed in with Google",
      });
      setLocation("/chat");
    } catch (error: any) {
      toast({
        title: "Sign-in failed",
        description: error.message || "Could not sign in with Google",
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
          title: "Welcome back",
          description: "Successfully signed in",
        });
        setLocation("/chat");
      } else if (mode === "signup") {
        await signUpWithEmail(email, password, displayName);
        toast({
          title: "Account created",
          description: "Welcome to APEX Chat",
        });
        setLocation("/chat");
      } else if (mode === "reset") {
        await resetPassword(email);
        toast({
          title: "Password reset sent",
          description: "Check your email for reset instructions",
        });
        setMode("login");
        setEmail("");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[100dvh] w-full bg-background px-4 py-6 md:py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-md"
      >
        {/* Glass Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          <div className="text-center mb-8 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="inline-block mb-4"
            >
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800 shadow-xl text-white">
                <Sparkles className="w-8 h-8 text-white animate-pulse" />
              </div>
            </motion.div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent mb-2">
              {mode === "login" && "Welcome Back"}
              {mode === "signup" && "Create Account"}
              {mode === "reset" && "Reset Password"}
            </h1>
            <p className="text-sm text-zinc-400">
              {mode === "login" && "Sign in to continue to APEX Chat"}
              {mode === "signup" && "Start your journey with APEX"}
              {mode === "reset" && "Enter your email to reset your password"}
            </p>
          </div>

          {/* Google Sign In */}
          <motion.div
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="mb-3"
          >
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-medium h-12 gap-3"
            >
              <Chrome className="w-5 h-5" />
              Continue with Google
            </Button>
          </motion.div>

          {/* Try as Guest */}
          <motion.div
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Button
              onClick={handleGuestSignIn}
              disabled={isLoading}
              variant="outline"
              className="w-full border-white/10 hover:bg-zinc-800 text-white font-medium h-12 gap-3"
            >
              <User className="w-5 h-5 text-zinc-400" />
              Try as Guest (Skip Registration)
            </Button>
          </motion.div>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-zinc-900 px-4 text-zinc-500">or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-sm text-zinc-300">
                  Display Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 bg-zinc-950/50 border-white/10 text-white h-12 focus:border-white/30"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-zinc-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-zinc-950/50 border-white/10 text-white h-12 focus:border-white/30"
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm text-zinc-300">
                  Password
                </Label>
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
                    className="pl-10 bg-zinc-950/50 border-white/10 text-white h-12 focus:border-white/30"
                  />
                </div>
              </div>
            )}

            <motion.div
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white hover:bg-zinc-200 text-zinc-900 font-medium h-12 gap-2 mt-6"
              >
                {mode === "login" && "Sign In"}
                {mode === "signup" && "Create Account"}
                {mode === "reset" && "Send Reset Link"}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center space-y-2">
            {mode === "login" && (
              <>
                <button
                  onClick={() => setMode("reset")}
                  className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
                <div className="text-sm text-zinc-500">
                  Don't have an account?{" "}
                  <button
                    onClick={() => {
                      setMode("signup");
                      setEmail("");
                      setPassword("");
                    }}
                    className="text-white hover:underline"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}

            {mode === "signup" && (
              <div className="text-sm text-zinc-500">
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setMode("login");
                    setEmail("");
                    setPassword("");
                    setDisplayName("");
                  }}
                  className="text-white hover:underline"
                >
                  Sign in
                </button>
              </div>
            )}

            {mode === "reset" && (
              <button
                onClick={() => {
                  setMode("login");
                  setEmail("");
                }}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>

        {/* Privacy Notice */}
        <p className="text-center text-xs text-zinc-600 mt-6">
          By continuing, you agree to APEX's Terms of Service and Privacy Policy
        </p>
      </motion.div>
    </div>
  );
}
