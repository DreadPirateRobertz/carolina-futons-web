// WARNING: STORAGE_KEY is embedded as a literal inside THEME_INIT_SCRIPT below.
// Changing STORAGE_KEY here automatically keeps both in sync — do not hardcode
// the key string anywhere else (ThemeToggle.tsx imports this constant too).
export const STORAGE_KEY = "cf-theme";

// Exported for unit testing — contains the same logic as THEME_INIT_SCRIPT
// so tests stay in sync with production behaviour without executing a string.
export function applyInitialTheme() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    const d =
      s === "dark" ||
      (s === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    if (d) document.documentElement.classList.add("dark");
  } catch {}
}

// Inline blocking script injected into <head> before first paint.
// Logic mirrors applyInitialTheme above — STORAGE_KEY interpolation ensures the
// key never drifts between the init script and the toggle component.
// suppressHydrationWarning on <html> suppresses the expected class mismatch.
export const THEME_INIT_SCRIPT =
  "(function(){try{var s=localStorage.getItem('" +
  STORAGE_KEY +
  "');var d=s==='dark'||(s===null&&window.matchMedia('(prefers-color-scheme: dark)').matches);" +
  "if(d)document.documentElement.classList.add('dark');}catch(e){}})();";
