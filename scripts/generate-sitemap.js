import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://imadtbn.github.io/menhistory";
const figures = readdirSync("data/figures")
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .map((file) => JSON.parse(readFileSync(join("data/figures", file), "utf8")))
  .filter((figure) => figure.status === "published");

const staticPages = [
  { url: "/", priority: 1.0 },
  { url: "/figures/", priority: 0.9 },
  { url: "/figures/directory.html", priority: 0.8 },
  { url: "/categories/", priority: 0.8 },
  { url: "/regions/", priority: 0.8 },
  { url: "/eras/", priority: 0.8 },
  { url: "/pages/about.html", priority: 0.5 },
  { url: "/pages/methodology.html", priority: 0.5 },
  { url: "/pages/sources.html", priority: 0.4 },
  { url: "/pages/privacy.html", priority: 0.3 }
];

function validDate(value) {
  if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) return null;
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : value;
}

const urls = staticPages.concat(figures.map((figure) => ({
  url: "/figures/" + figure.slug + ".html",
  priority: 0.7,
  lastmod: validDate(figure.updatedAt || figure.updated_at)
})));
const unique = new Map(urls.map((item) => [item.url, item]));
const xml = '<?xml version="1.0" encoding="UTF-8"?>\\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\\n' +
  [...unique.values()].map((item) => "  <url>\\n" +
    "    <loc>" + BASE + item.url + "</loc>\\n" +
    (item.lastmod ? "    <lastmod>" + item.lastmod + "</lastmod>\\n" : "") +
    "    <priority>" + item.priority.toFixed(1) + "</priority>\\n" +
    "  </url>").join("\\n") + "\\n</urlset>\\n";
writeFileSync("sitemap.xml", xml, "utf8");
console.log("✓ sitemap.xml (" + unique.size + " unique URLs; lastmod only where source dates exist)");
