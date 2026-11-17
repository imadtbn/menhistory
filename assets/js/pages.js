import { fetchJSON, escapeHtml } from "./utils.js";

/** يُنشئ صفحة فهرس (categories/regions/eras) ديناميكياً */
export async function initIndexPage(kind) {
  const root = document.getElementById("index-root");
  if (!root) return;

  const [figures, categories, regions, eras] = await Promise.all([
    fetchJSON("../data/figures/index.json"),
    fetchJSON("../data/categories.json"),
    fetchJSON("../data/regions.json"),
    fetchJSON("../data/eras.json"),
  ]);
  if (!Array.isArray(figures)) return;

  let items = [];
  let key = "";
  let basePath = "";

  if (kind === "categories") {
    items = categories?.fields || [];
    key = "field";
    basePath = "../figures/index.html?field=";
  } else if (kind === "regions") {
    items = regions || [];
    key = "region";
    basePath = "../figures/index.html?region=";
  } else if (kind === "eras") {
    items = eras || [];
    key = "era";
    basePath = "../figures/index.html?era=";
  }

  const counts = {};
  for (const f of figures) {
    const val = f[key];
    if (val) counts[val] = (counts[val] || 0) + 1;
  }

  root.innerHTML = `
    <div class="cards-grid">
      ${items.map((it) => `
        <a class="card fade-up" href="${basePath}${encodeURIComponent(it.id)}">
          <div class="card-media" style="aspect-ratio:16/9">
            <div class="placeholder" style="font-size:3rem">${escapeHtml(it.icon || "📚")}</div>
          </div>
          <div class="card-body">
            <h3 class="card-title">${escapeHtml(it.nameAr)}</h3>
            ${it.range ? `<div class="card-title-en">${escapeHtml(it.range)}</div>` : ""}
            <div class="card-footer">
              <span class="tag">${counts[it.id] || 0} شخصية</span>
              <span class="arrow">←</span>
            </div>
          </div>
        </a>
      `).join("")}
    </div>
  `;
}