import { fetchJSON } from "./utils.js";
import { bindSearchPopover, initSearch } from "./search.js";
import { createFilterState, applyFilters, syncURL, loadMeta, populateFilterSelect } from "./filters.js";
import { renderFigureGrid, loadHomepageSections } from "./figures.js";
import { debounce } from "./utils.js";

/** تبديل الوضع الليلي */
function initTheme() {
  const saved = localStorage.getItem("mth-theme");
  const pref = saved || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = pref;
  const btn = document.getElementById("theme-toggle");
  if (btn) {
    btn.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem("mth-theme", next);
    });
  }
}

/** قائمة الجوال */
function initMobileMenu() {
  const toggle = document.getElementById("menu-toggle");
  const list = document.getElementById("nav-list");
  if (!toggle || !list) return;
  toggle.addEventListener("click", () => {
    const open = list.dataset.open === "true";
    list.dataset.open = open ? "false" : "true";
    toggle.setAttribute("aria-expanded", String(!open));
  });
}

/** ربط صندوق البحث في الهيدر */
function initHeaderSearch() {
  const input = document.getElementById("search-input");
  const popover = document.getElementById("search-popover");
  if (input && popover) bindSearchPopover(input, popover);
}

/** صفحة استعراض الشخصيات */
async function initFiguresPage() {
  const grid = document.getElementById("figures-grid");
  if (!grid) return;

  const [figures, meta] = await Promise.all([
    fetchJSON("data/figures/index.json"),
    loadMeta(),
  ]);
  if (!Array.isArray(figures)) return;

  const state = createFilterState();

  // تعبئة القوائم
  populateFilterSelect(document.getElementById("filter-field"), meta.categories?.fields, "كل المجالات");
  populateFilterSelect(document.getElementById("filter-region"), meta.regions, "كل المناطق");
  populateFilterSelect(document.getElementById("filter-era"), meta.eras, "كل الحقب");

  // قيم ابتدائية
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ""; };
  setVal("filter-field", state.field);
  setVal("filter-region", state.region);
  setVal("filter-era", state.era);
  const searchEl = document.getElementById("filter-search");
  if (searchEl) searchEl.value = state.q;

  const countEl = document.getElementById("results-count");
  const clearBtn = document.getElementById("clear-filters");

  const update = () => {
    const filtered = applyFilters(figures, state);
    renderFigureGrid(grid, filtered);
    if (countEl) countEl.innerHTML = `عدد النتائج: <b>${filtered.length}</b>`;
    if (clearBtn) clearBtn.dataset.visible = String(Boolean(state.q || state.field || state.region || state.era));
    syncURL(state);
  };

  const onChange = debounce(() => {
    state.field = document.getElementById("filter-field")?.value || "";
    state.region = document.getElementById("filter-region")?.value || "";
    state.era = document.getElementById("filter-era")?.value || "";
    state.q = document.getElementById("filter-search")?.value || "";
    update();
  }, 150);

  ["filter-field", "filter-region", "filter-era"].forEach((id) => {
    document.getElementById(id)?.addEventListener("change", onChange);
  });
  document.getElementById("filter-search")?.addEventListener("input", onChange);

  clearBtn?.addEventListener("click", () => {
    state.q = state.field = state.region = state.era = state.country = "";
    if (searchEl) searchEl.value = "";
    ["filter-field", "filter-region", "filter-era"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    update();
  });

  update();
}

/** الصفحة الرئيسية */
function initHomepage() {
  if (!document.getElementById("featured-grid")) return;
  loadHomepageSections();
  const input = document.getElementById("home-search");
  const popover = document.getElementById("home-search-popover");
  if (input && popover) bindSearchPopover(input, popover);
}

/** صفحة التفاصيل */
async function initFigurePage() {
  const root = document.getElementById("figure-root");
  if (!root) return;

  const params = new URLSearchParams(location.search);
  const slug = params.get("slug");
  if (!slug) {
    root.innerHTML = `<div class="not-found"><h1>404</h1><p>لم يتم تحديد شخصية.</p><a class="btn btn-primary" href="index.html">العودة للرئيسية</a></div>`;
    return;
  }

  const data = await fetchJSON(`data/figures/${slug}.json`);
  if (!data) {
    root.innerHTML = `<div class="not-found"><h1>404</h1><p>لم يتم العثور على هذه الشخصية.</p><a class="btn btn-primary" href="index.html">العودة للرئيسية</a></div>`;
    return;
  }

  // تعيين العنوان والميتا
  document.title = `${data.nameAr} — رجال عبر التاريخ`;
  const setMeta = (name, content, prop = false) => {
    const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(prop ? "property" : "name", name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  };
  setMeta("description", data.summary || "");
  setMeta("og:title", document.title, true);
  setMeta("og:description", data.summary || "", true);
  setMeta("og:type", "profile", true);
  if (data.image?.url) setMeta("og:image", data.image.url, true);

  // Schema.org
  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: data.nameAr,
    alternateName: data.nameEn,
    description: data.summary,
    birthDate: data.birth?.date,
    deathDate: data.death?.date,
    birthPlace: data.birth?.place,
    deathPlace: data.death?.place,
    jobTitle: data.fields?.primary,
    knowsAbout: data.fields?.secondary || [],
    url: location.href,
  });
  document.head.appendChild(ld);

  // التصيير
  root.innerHTML = renderFigurePage(data);
}

function renderFigurePage(f) {
  const initials = (f.nameAr || "?").charAt(0);
  const imgHtml = f.image?.url
    ? `<img src="${f.image.url}" alt="${f.image.alt || f.nameAr}" onerror="this.parentElement.innerHTML='<div class=\\'placeholder\\'>${initials}</div>'">`
    : `<div class="placeholder">${initials}</div>`;

  const info = (label, val) =>
    val ? `<li><span class="label">${label}</span><span class="value">${val}</span></li>` : "";

  const altNames = (f.alternateNames || []).join(" · ");

  const bio = f.biography || {};
  const hasBio = bio.earlyLife || bio.career || bio.achievements?.length || bio.ideas;

  return `
    <div class="figure-hero">
      <div class="container">
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb">
            <li><a href="index.html">الرئيسية</a></li>
            <li><a href="figures/index.html">الشخصيات</a></li>
            <li>${f.nameAr}</li>
          </ol>
        </nav>
      </div>
    </div>

    <div class="container">
      <div class="figure-layout">
        <main class="figure-main">
          <header class="figure-title-block">
            <h1>${f.nameAr}</h1>
            <div class="name-en">${f.nameEn}</div>
            ${altNames ? `<div class="alt-names">أسماء بديلة: ${altNames}</div>` : ""}
            <p class="lead">${f.summary || ""}</p>
            <div class="figure-tags">
              ${f.era ? `<span class="tag gold">${f.era}</span>` : ""}
              ${f.fields?.primary ? `<span class="tag">${f.fields.primary}</span>` : ""}
              ${f.country || f.nationality ? `<span class="tag">${f.nationality || ""}</span>` : ""}
            </div>
          </header>

          ${hasBio ? `
          <nav class="toc" aria-label="فهرس المحتوى">
            <h4>محتويات الصفحة</h4>
            <ul>
              ${bio.earlyLife ? `<li><a href="#early-life">النشأة</a></li>` : ""}
              ${bio.career ? `<li><a href="#career">المسيرة</a></li>` : ""}
              ${bio.achievements?.length ? `<li><a href="#achievements">الإنجازات</a></li>` : ""}
              ${f.timeline?.length ? `<li><a href="#timeline">التسلسل الزمني</a></li>` : ""}
              ${bio.ideas ? `<li><a href="#ideas">الأفكار</a></li>` : ""}
              ${f.sources?.length ? `<li><a href="#sources">المصادر</a></li>` : ""}
            </ul>
          </nav>` : ""}

          ${bio.earlyLife ? `<section class="figure-section" id="early-life">
            <h2>النشأة والتعليم</h2>
            <p>${bio.earlyLife}</p>
          </section>` : ""}

          ${bio.career ? `<section class="figure-section" id="career">
            <h2>المسيرة المهنية</h2>
            <p>${bio.career}</p>
          </section>` : ""}

          ${bio.achievements?.length ? `<section class="figure-section" id="achievements">
            <h2>أبرز الإنجازات</h2>
            <ul>${bio.achievements.map((a) => `<li>${a}</li>`).join("")}</ul>
          </section>` : ""}

          ${f.timeline?.length ? `<section class="figure-section" id="timeline">
            <h2>التسلسل الزمني</h2>
            <ul class="timeline-list">
              ${f.timeline.map((t) => `<li><span class="year">${t.year}</span> — ${t.event}</li>`).join("")}
            </ul>
          </section>` : ""}

          ${bio.ideas ? `<section class="figure-section" id="ideas">
            <h2>الأفكار والمواقف</h2>
            <p>${bio.ideas}</p>
          </section>` : ""}

          ${bio.quotes?.length ? `<section class="figure-section">
            <h2>أقوال مأثورة</h2>
            ${bio.quotes.map((q) => `<div class="quote-card"><blockquote>${q.text}</blockquote><cite>${q.source || ""}</cite></div>`).join("")}
          </section>` : ""}

          ${f.sources?.length ? `<section class="figure-section" id="sources">
            <h2>المصادر والمراجع</h2>
            <ul class="sources-list">
              ${f.sources.map((s) => `<li>
                <a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.title}</a>
                <div class="source-meta">${s.publisher} · ${s.type}${s.accessed ? ` · اطُّلع عليه ${s.accessed}` : ""}${s.supports ? ` · ${s.supports}` : ""}</div>
              </li>`).join("")}
            </ul>
          </section>` : ""}
        </main>

        <aside class="figure-sidebar">
          <div class="info-card">
            <div class="image-wrap">${imgHtml}</div>
            <h3>بطاقة معلومات</h3>
            <ul class="info-list">
              ${info("الميلاد", f.birth?.date)}
              ${info("مكان الميلاد", f.birth?.place)}
              ${f.death ? info("الوفاة", f.death.date) : ""}
              ${f.death ? info("مكان الوفاة", f.death.place) : ""}
              ${info("الجنسية", f.nationality)}
              ${info("المجال", f.fields?.primary)}
              ${info("الحقبة", f.era)}
              ${f.religion?.documented ? info("الانتماء الديني", f.religion.value) : ""}
              ${f.political?.documented ? info("الانتماء السياسي", f.political.value) : ""}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  `;
}

/** تسجيل Service Worker */
function registerSW() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      const swPath = document.querySelector('link[rel="manifest"]')?.getAttribute("href");
      const base = swPath ? swPath.replace("manifest.json", "") : "";
      navigator.serviceWorker.register(`${base}sw.js`).catch((err) => {
        console.warn("Service Worker registration failed:", err);
      });
    });
  }
}

/** نقطة الدخول */
document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initMobileMenu();
  initHeaderSearch();
  initHomepage();
  initFiguresPage();
  initFigurePage();
  initSearch();
  registerSW();
});




