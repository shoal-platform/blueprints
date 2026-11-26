// Light / dark theme handling.
// Loaded in <head> so the saved theme is applied before the page paints.

const STORAGE_KEY = "theme";
const root = document.documentElement;

function preferredTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  root.classList.toggle("dark", theme === "dark");
}

applyTheme(preferredTheme());

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("theme-toggle").addEventListener("click", () => {
    const next = root.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  });
});
