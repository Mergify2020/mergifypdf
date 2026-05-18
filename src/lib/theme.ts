export type ThemeMode = "light" | "dark";

function setCssVar(target: HTMLElement, name: string, value: string) {
  target.style.setProperty(name, value);
}

export function applyThemePreference(nextTheme: ThemeMode) {
  if (typeof document === "undefined") return;

  const isDark = nextTheme === "dark";
  const surface = isDark ? "#222224" : "#f1f4f9";
  const foreground = isDark ? "#f5f5f5" : "#171717";
  const spinnerTrack = isDark ? "#3f3f3f" : "#d9ccff";
  const spinnerHead = "#6C47FF";

  const html = document.documentElement;
  const body = document.body;

  html.classList.toggle("dark", isDark);
  html.style.backgroundColor = surface;
  html.style.color = foreground;
  html.style.colorScheme = isDark ? "dark light" : "light dark";
  setCssVar(html, "--app-surface", surface);
  setCssVar(html, "--app-foreground", foreground);
  setCssVar(html, "--spinner-track", spinnerTrack);
  setCssVar(html, "--spinner-head", spinnerHead);

  if (body) {
    body.classList.toggle("dark", isDark);
    body.style.backgroundColor = surface;
    body.style.color = foreground;
    body.style.colorScheme = isDark ? "dark light" : "light dark";
    setCssVar(body, "--app-surface", surface);
    setCssVar(body, "--app-foreground", foreground);
    setCssVar(body, "--spinner-track", spinnerTrack);
    setCssVar(body, "--spinner-head", spinnerHead);
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) {
    themeColor.setAttribute("content", surface);
  }
}

export function persistThemePreference(nextTheme: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("theme", nextTheme);
  document.cookie = `theme=${nextTheme}; path=/; max-age=31536000`;
}
