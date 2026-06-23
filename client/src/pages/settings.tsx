import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Camera, Save, ArrowLeft, LogOut, Wallet, Cloud, CloudOff, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
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

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { user, updateUserProfile, logout } = useAuth();
  const authStore = useAuthStore();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState(getSyncState());
  const [isSyncing, setIsSyncing] = useState(false);
  const { conversations } = useChatStore();

  // Update sync status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(getSyncState());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleForceSync = async () => {
    if (!user?.uid) return;
    setIsSyncing(true);
    try {
      await forceSyncNow(user.uid);
      toast({
        title: "✅ Sync Complete",
        description: "All chats synced to cloud successfully.",
      });
      setSyncStatus(getSyncState());
    } catch (error) {
      toast({
        title: "❌ Sync Failed",
        description: "Could not sync to cloud. Check your connection.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await updateUserProfile(
        displayName || undefined,
        photoURL || undefined
      );
      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message || "Could not update profile",
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
        title: "Signed out",
        description: "You have been logged out successfully",
      });
      setLocation("/login");
    } catch (error: any) {
      toast({
        title: "Logout failed",
        description: error.message || "Could not log out",
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
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col h-screen w-full bg-background overflow-y-auto">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 h-16 border-b border-border bg-card/85 backdrop-blur-xl">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            onClick={() => setLocation("/chat")}
            variant="ghost"
            size="sm"
            className="gap-2 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Button>
        </motion.div>

        <h1 className="text-lg sm:text-xl font-medium text-white">Settings</h1>

        <div className="w-20"></div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="space-y-6"
        >
          {/* Profile Section */}
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-medium text-white mb-6">Profile</h2>

            {/* Avatar */}
            <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
              <Avatar className="w-24 h-24 border-2 border-white/10">
                <AvatarImage src={photoURL || user.photoURL || undefined} />
                <AvatarFallback className="bg-zinc-800 text-white text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2 w-full">
                <Label htmlFor="photoURL" className="text-sm text-zinc-300">
                  Profile Photo URL
                </Label>
                <div className="relative">
                  <Camera className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    id="photoURL"
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    value={photoURL}
                    onChange={(e) => setPhotoURL(e.target.value)}
                    className="pl-10 bg-zinc-950/50 border-white/10 text-white focus:border-white/30"
                  />
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-2 mb-6">
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
                  className="pl-10 bg-zinc-950/50 border-white/10 text-white focus:border-white/30"
                />
              </div>
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2 mb-6">
              <Label htmlFor="email" className="text-sm text-zinc-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  value={user.email || ""}
                  disabled
                  className="pl-10 bg-zinc-950/30 border-white/5 text-zinc-500 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Email cannot be changed after registration
              </p>
            </div>

            {/* Save Button */}
            <motion.div
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full sm:w-auto bg-white hover:bg-zinc-200 text-zinc-900 font-medium gap-2"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </motion.div>
          </div>

          {/* Subscription Info */}
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-medium text-white mb-4">Subscription</h2>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Current Plan</p>
                <p className="text-2xl font-medium text-white capitalize">
                  {userProfile?.tier || "Starter"}
                </p>
              </div>

              <motion.div
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Button
                  onClick={() => setLocation("/subscription")}
                  className="w-full sm:w-auto bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10"
                >
                  Manage Subscription
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Wallet Section */}
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-emerald-900/30 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-medium text-white mb-4">Wallet</h2>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-400 mb-1">Available Balance</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-amber-400 bg-clip-text text-transparent">
                  ${(userProfile?.wallet?.balance ?? 0).toFixed(2)}
                </p>
              </div>

              <motion.div
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <Button
                  onClick={() => setLocation("/billing")}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Top Up Credit
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-blue-900/30 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-medium text-white mb-4 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-400" />
              Cloud Sync
            </h2>

            <div className="space-y-4">
              {/* Status Indicator */}
              <div className="flex items-center justify-between p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
                <div className="flex items-center gap-3">
                  {syncStatus.isOnline && !syncStatus.permissionDenied ? (
                    <>
                      <div className="relative">
                        <div className="w-3 h-3 rounded-full bg-emerald-500" />
                        <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Connected</p>
                        <p className="text-xs text-zinc-500">Syncing to Firestore</p>
                      </div>
                    </>
                  ) : syncStatus.permissionDenied ? (
                    <>
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                      <div>
                        <p className="text-sm font-medium text-amber-400">Permission Issue</p>
                        <p className="text-xs text-zinc-500">Using local storage only</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <CloudOff className="w-5 h-5 text-zinc-500" />
                      <div>
                        <p className="text-sm font-medium text-zinc-400">Offline</p>
                        <p className="text-xs text-zinc-500">Changes saved locally</p>
                      </div>
                    </>
                  )}
                </div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    onClick={handleForceSync}
                    disabled={isSyncing || !syncStatus.isOnline || syncStatus.permissionDenied}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Force Sync'}
                  </Button>
                </motion.div>
              </div>

              {/* Sync Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50">
                  <p className="text-xs text-zinc-500 mb-1">Chats Stored</p>
                  <p className="text-lg font-semibold text-white">{conversations.length}</p>
                </div>
                <div className="p-3 bg-zinc-950/30 rounded-lg border border-zinc-800/50">
                  <p className="text-xs text-zinc-500 mb-1">Last Sync</p>
                  <p className="text-sm font-mono text-white">
                    {syncStatus.lastSyncAt 
                      ? new Date(syncStatus.lastSyncAt).toLocaleTimeString()
                      : 'Never'
                    }
                  </p>
                </div>
              </div>

              {syncStatus.syncError && (
                <div className={`p-3 rounded-lg border ${
                  syncStatus.syncError.includes('Optimizing') 
                    ? 'bg-blue-950/30 border-blue-800/30' 
                    : syncStatus.syncError.includes('Login Refresh')
                    ? 'bg-amber-950/30 border-amber-800/30'
                    : 'bg-red-950/30 border-red-800/30'
                }`}>
                  <p className={`text-xs ${
                    syncStatus.syncError.includes('Optimizing') 
                      ? 'text-blue-400' 
                      : syncStatus.syncError.includes('Login Refresh')
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>{syncStatus.syncError}</p>
                  {syncStatus.syncError.includes('Login Refresh') && (
                    <Button
                      onClick={handleLogout}
                      size="sm"
                      className="mt-2 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                    >
                      Sign Out & Refresh
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-zinc-900/80 backdrop-blur-xl border border-red-900/30 rounded-2xl p-6 sm:p-8">
            <h2 className="text-xl font-medium text-red-400 mb-4">Danger Zone</h2>

            <motion.div
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              <Button
                onClick={handleLogout}
                className="w-full sm:w-auto bg-red-950/50 hover:bg-red-900/50 text-red-400 border border-red-900/50 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
