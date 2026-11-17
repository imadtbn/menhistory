import { escapeHtml, formatDateRange, normalizeText, highlightMatch } from "./utils.js";

/** بطاقة شخصية */
export function renderFigureCard(f) {
  const initials = (f.nameAr || "?").charAt(0);
  const media = f.image
    ? `<img src="${escapeHtml(f.image)}" alt="${escapeHtml(f.nameAr)}" loading="lazy"
         onerror="this.parentElement.querySelector('.placeholder')?.style.removeProperty('display');this.remove();">
       <div class="placeholder" style="display:none">${escapeHtml(initials)}</div>`
    : `<div class="placeholder">${escapeHtml(initials)}</div>`;
  return `
    <a class="card fade-up" href="figures/figure.html?slug=${encodeURIComponent(f.slug)}">
      <div class="card-media">${media}</div>
      <div class="card-body">
        <h3 class="card-title">${escapeHtml(f.nameAr)}</h3>
        <div class="card-title-en">${escapeHtml(f.nameEn)}</div>
        <div class="card-meta">
          ${f.era ? `<span class="tag gold">${escapeHtml(f.era)}</span>` : ""}
          ${f.country ? `<span class="tag">${escapeHtml(f.country)}</span>` : ""}
        </div>
        <div class="card-footer">
          <span>${escapeHtml(formatDateRange(f.birth, f.death) || "—")}</span>
          <span class="arrow">←</span>
        </div>
      </div>
    </a>`;
}

/** عرض شبكة */
export function renderFigureGrid(container, figures) {
  if (!figures.length) {
    container.innerHTML = `<div class="empty-state">
      <div class="icon">🔍</div>
      <p>لا توجد نتائج مطابقة. جرّب تعديل الفلاتر.</p>
    </div>`;
    return;
  }
  container.innerHTML = figures.map(renderFigureCard).join("");
}

/** تحميل وعرض الصفحة الرئيسية: شخصيات مميزة/الأكثر مشاهدة/حديثة */
export async function loadHomepageSections() {
  const [all, featured] = await Promise.all([
    import("./utils.js").then((m) => m.fetchJSON("data/figures/index.json")),
    import("./utils.js").then((m) => m.fetchJSON("data/featured.json")),
  ]);
  if (!Array.isArray(all)) return;

  const bySlug = Object.fromEntries(all.map((f) => [f.slug, f]));

  const mount = (selector, slugs) => {
    const el = document.querySelector(selector);
    if (!el) return;
    const list = (slugs || []).map((s) => bySlug[s]).filter(Boolean);
    el.innerHTML = list.map(renderFigureCard).join("");
  };

  mount("#featured-grid", featured?.featured);
  mount("#most-viewed-grid", featured?.mostViewed);
  mount("#recent-grid", featured?.recentlyAdded);

  // عدد الإحصائيات
  const statFigures = document.getElementById("stat-figures");
  if (statFigures) statFigures.textContent = all.length;
  const statRegions = document.getElementById("stat-regions");
  if (statRegions) statRegions.textContent = new Set(all.map((f) => f.region)).size;
  const statEras = document.getElementById("stat-eras");
  if (statEras) statEras.textContent = new Set(all.map((f) => f.era)).size;
  const statFields = document.getElementById("stat-fields");
  if (statFields) statFields.textContent = new Set(all.map((f) => f.field)).size;
}