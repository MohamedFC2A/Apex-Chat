// God Mode Theme Utilities
// CRITICAL FIX: God Mode NO LONGER changes the theme background
// Only applies subtle UI indicators (red border on input, UNBOUND badge)

export const godModeTheme = {
    colors: {
        border: "#ef4444",
        accent: "#dc2626",
        glow: "#ef4444",
    },
    effects: {
        borderGlow: "0 0 10px #ef4444, 0 0 20px #ef444433",
        textShadow: "0 0 8px #ef4444",
    },
};

/**
 * DO NOT APPLY GLOBAL THEME CHANGES
 * God Mode only adds subtle visual indicators
 */
export function applyGodModeTheme() {
    // DO NOTHING - We don't want to change the global theme anymore
    // The bug was caused by applying the 'god-mode' class to body
    console.log("⚡ God Mode ACTIVE - Subtle UI indicators only");
}

/**
 * Remove God Mode indicators
 */
export function removeGodModeTheme() {
    // Clean up in case the old god-mode class was applied
    document.body.classList.remove("god-mode");
    console.log("✅ God Mode INACTIVE");
}
