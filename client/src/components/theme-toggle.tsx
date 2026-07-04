import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

/**
 * ThemeToggle component renders a button that toggles between dark and light themes.
 * It includes accessibility attributes for screen readers and tooltips.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      data-testid="button-theme-toggle"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </Button>
  );
}
