export type ThemeMode = "dark" | "light";

const THEME_KEY = "crm.theme";

export function getStoredTheme(): ThemeMode {
  const theme = localStorage.getItem(THEME_KEY);
  return theme === "light" ? "light" : "dark";
}

export function applyTheme(theme: ThemeMode) {
  document.documentElement.classList.toggle("light", theme === "light");
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
}

export function initializeTheme() {
  applyTheme(getStoredTheme());
}

export function toggleTheme(): ThemeMode {
  const nextTheme: ThemeMode = document.documentElement.classList.contains("light") ? "dark" : "light";
  applyTheme(nextTheme);
  return nextTheme;
}

