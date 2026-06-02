import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { getStoredTheme, toggleTheme, type ThemeMode } from "@/lib/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const isLight = theme === "light";

  useEffect(() => {
    setTheme(getStoredTheme());
  }, []);

  return (
    <button
      type="button"
      onClick={() => setTheme(toggleTheme())}
      className={`grid h-9 w-9 place-items-center rounded-md border border-border bg-card hover:bg-accent ${className}`}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Dark mode" : "Light mode"}
    >
      {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}

