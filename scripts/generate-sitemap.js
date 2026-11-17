import { readFileSync, writeFileSync, readdirSync } from "fs";
import { join } from "path";

const BASE = "https://imadtbn.github.io/menhistory";
const figures = readdirSync("data/figures")
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .map((f) => JSON.parse(readFileSync(join("data/figures", f), "utf8")))
  .filter((f) => f.status === "published");

const staticPages = [
  { url: "/", priority: 1.0 },
  { url: "/figures/", priority: 0.9 },
  { url: "/categories/", priority: 0.8 },
  { url: "/regions/", priority: 0.8 },
  { url: "/eras/", priority: 0.8 },
  { url: "/pages/about.html", priority: 0.5 },
  { url: "/pages/methodology.html", priority: 0.5 },
];

const today = new Date().toISOString().slice(0, 10);

const urls = [
  ...staticPages,
  ...figures.map((f) => ({
    url: `/figures/${f.slug}.html`,
    priority: 0.7,
    lastmod: today,
  })),
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${BASE}${u.url}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

writeFileSync("sitemap.xml", xml);
console.log(`✓ sitemap.xml (${urls.length} رابط)`);