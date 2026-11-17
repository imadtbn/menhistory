import { normalizeText, highlightMatch, fetchJSON, escapeHtml } from "./utils.js";

let figuresIndex = [];
let loaded = false;

export async function initSearch() {
  if (loaded) return;
  const data = await fetchJSON("data/figures/index.json").catch(() => null)
    || await fetchJSON("../data/figures/index.json").catch(() => null);
  if (Array.isArray(data)) {
    figuresIndex = data.map((f) => ({
      ...f,
      _search: normalizeText(`${f.nameAr} ${f.nameEn} ${f.country || ""} ${f.field || ""}`),
    }));
    loaded = true;
  }
}

export function searchFigures(query, limit = 8) {
  const q = normalizeText(query);
  if (!q) return [];
  return figuresIndex
    .map((f) => {
      const idx = f._search.indexOf(q);
      return idx === -1 ? null : { ...f, _idx: idx };
    })
    .filter(Boolean)
    .sort((a, b) => a._idx - b._idx)
    .slice(0, limit);
}

/** ربط صندوق البحث المنبثق */
export function bindSearchPopover(inputEl, popoverEl) {
  if (!inputEl || !popoverEl) return;

  let activeIndex = -1;

  const render = (results, q) => {
    activeIndex = -1;
    if (!results.length) {
      popoverEl.innerHTML = `<div class="search-empty">لا توجد نتائج مطابقة</div>`;
      popoverEl.dataset.open = "true";
      return;
    }
    popoverEl.innerHTML = results
      .map(
        (f) => `
      <a class="search-result" href="figures/figure.html?slug=${encodeURIComponent(f.slug)}" data-index="${results.indexOf(f)}">
        <div class="avatar">${
          f.image
            ? `<img src="${escapeHtml(f.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
            : escapeHtml((f.nameAr || "?").charAt(0))
        }</div>
        <div class="info">
          <b>${highlightMatch(f.nameAr, q)}</b>
          <small>${escapeHtml(f.field || "")} · ${escapeHtml(f.country || "")}</small>
        </div>
      </a>`
      )
      .join("");
    popoverEl.dataset.open = "true";
  };

  const close = () => {
    popoverEl.dataset.open = "false";
    activeIndex = -1;
  };

  const handle = async () => {
    await initSearch();
    const q = inputEl.value.trim();
    if (!q) return close();
    const results = searchFigures(q);
    render(results, q);
  };

  inputEl.addEventListener("input", handle);
  inputEl.addEventListener("focus", () => {
    if (inputEl.value.trim()) handle();
  });

  document.addEventListener("click", (e) => {
    if (!popoverEl.contains(e.target) && e.target !== inputEl) close();
  });

  inputEl.addEventListener("keydown", (e) => {
    const items = popoverEl.querySelectorAll(".search-result");
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      items[activeIndex].click();
      return;
    } else if (e.key === "Escape") {
      return close();
    } else {
      return;
    }
    items.forEach((el, i) =>
      el.setAttribute("aria-selected", i === activeIndex ? "true" : "false")
    );
  });
}