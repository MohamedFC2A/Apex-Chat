import { motion } from "framer-motion";
import { Wallet, History, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface WalletDisplayProps {
    variant?: "compact" | "full";
    className?: string;
}

export function WalletDisplay({ variant = "compact", className = "" }: WalletDisplayProps) {
    const { user } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);

    const balance = user?.wallet?.balance ?? 0;
    const currency = user?.wallet?.currency ?? "USD";
    const history = user?.history ?? [];

    if (variant === "compact") {
        return (
            <Badge
                className={`bg-emerald-950/50 text-emerald-400 border border-emerald-800/50 px-3 py-1.5 font-mono ${className}`}
            >
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                ${balance.toFixed(2)}
            </Badge>
        );
    }

    // Full variant with collapsible history
    return (
        <div className={`bg-zinc-900/80 rounded-xl border border-zinc-800 p-4 ${className}`}>
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-950/50 rounded-lg border border-emerald-800/30">
                            <Wallet className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 uppercase tracking-wide">Wallet Balance</p>
                            <p className="text-2xl font-bold text-emerald-400 font-mono">
                                ${balance.toFixed(2)} <span className="text-sm text-zinc-500">{currency}</span>
                            </p>
                        </div>
                    </div>

                    {history.length > 0 && (
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
                                <History className="w-4 h-4 mr-1" />
                                History
                                {isOpen ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                            </Button>
                        </CollapsibleTrigger>
                    )}
                </div>

                <CollapsibleContent>
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-zinc-800"
                    >
                        <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Transaction History</p>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {history.slice(0, 10).map((txn) => (
                                <div key={txn.id} className="flex items-center justify-between py-2 px-3 bg-zinc-950/50 rounded-lg">
                                    <div>
                                        <p className="text-sm text-zinc-300">{txn.description}</p>
                                        <p className="text-xs text-zinc-500">
                                            {new Date(txn.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`font-mono font-semibold ${txn.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {txn.amount >= 0 ? '+' : ''}{txn.amount.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                            {history.length === 0 && (
                                <p className="text-sm text-zinc-500 text-center py-4">No transactions yet</p>
                            )}
                        </div>
                    </motion.div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}
