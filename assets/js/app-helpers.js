/** دوال مساعدة مشتركة للصفحات المستقلة */
export function initIndexesTheme() {
  const saved = localStorage.getItem("mth-theme");
  const pref = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = pref;
  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("mth-theme", next);
  });
  document.getElementById("menu-toggle")?.addEventListener("click", () => {
    const list = document.getElementById("nav-list");
    if (!list) return;
    list.dataset.open = list.dataset.open === "true" ? "false" : "true";
  });
}