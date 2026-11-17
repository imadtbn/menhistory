import { normalizeText, fetchJSON } from "./utils.js";

export function createFilterState() {
  const params = new URLSearchParams(location.search);
  return {
    q: params.get("q") || "",
    field: params.get("field") || "",
    region: params.get("region") || "",
    era: params.get("era") || "",
    country: params.get("country") || "",
  };
}

export function applyFilters(figures, state) {
  const q = normalizeText(state.q);
  return figures.filter((f) => {
    if (state.field && f.field !== state.field) return false;
    if (state.region && f.region !== state.region) return false;
    if (state.era && f.era !== state.era) return false;
    if (state.country && f.country !== state.country) return false;
    if (q) {
      const hay = normalizeText(`${f.nameAr} ${f.nameEn} ${f.country || ""}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function syncURL(state) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  const url = qs ? `?${qs}` : location.pathname;
  history.replaceState(null, "", url);
}

export async function loadMeta() {
  const [categories, regions, eras] = await Promise.all([
    fetchJSON("data/categories.json"),
    fetchJSON("data/regions.json"),
    fetchJSON("data/eras.json"),
  ]);
  return { categories, regions, eras };
}

export function populateFilterSelect(selectEl, items, placeholder, idKey = "id", nameKey = "nameAr") {
  if (!selectEl) return;
  selectEl.innerHTML =
    `<option value="">${placeholder}</option>` +
    (items || [])
      .map((it) => `<option value="${it[idKey]}">${it[nameKey]}</option>`)
      .join("");
}