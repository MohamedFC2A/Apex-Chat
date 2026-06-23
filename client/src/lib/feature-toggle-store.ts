import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FeatureToggleStore {
    thinking: boolean;
    deepResearch: boolean;
    godMode: boolean;
    toggleThinking: () => void;
    toggleDeepResearch: () => void;
    toggleGodMode: () => void;
    setDeepResearch: (val: boolean) => void;
    setGodMode: (val: boolean) => void;
    reset: () => void;
}

export const useFeatureToggleStore = create<FeatureToggleStore>()(
    persist(
        (set) => ({
            thinking: false,
            deepResearch: false,
            godMode: false, // DEV MODE: God Mode unlocked but off by default (user toggles)

            toggleThinking: () =>
                set((state) => ({ thinking: !state.thinking })),

            toggleDeepResearch: () =>
                set((state) => ({ deepResearch: !state.deepResearch })),

            toggleGodMode: () =>
                set((state) => ({ godMode: !state.godMode })),

            setDeepResearch: (val: boolean) =>
                set({ deepResearch: val }),

            setGodMode: (val: boolean) =>
                set({ godMode: val }),

            reset: () => set({ thinking: false, deepResearch: false, godMode: false }),
        }),
        {
            name: "apex-features-storage",
        }
    )
);
