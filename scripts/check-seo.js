import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const BASE = "https://imadtbn.github.io/menhistory";
const errors = [];
const requiredPages = [
  "index.html",
  "figures/index.html",
  "figures/directory.html",
  "categories/index.html",
  "regions/index.html",
  "eras/index.html",
  "pages/about.html",
  "pages/methodology.html",
  "pages/sources.html",
  "pages/privacy.html"
];

function fail(message) {
  errors.push(message);
  console.error("✗ " + message);
}
function readHTML(path) {
  if (!existsSync(path)) {
    fail("SEO page is missing: " + path);
    return "";
  }
  return readFileSync(path, "utf8");
}
function checkPage(path, expectedUrl, expectedType) {
  const html = readHTML(path);
  if (!html) return;
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim();
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1];
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1];
  const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i)?.[1];
  const ogDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i)?.[1];
  const ogUrl = html.match(/<meta\s+property=["']og:url["']\s+content=["']([^"']*)["']/i)?.[1];
  const twitterCard = html.match(/<meta\s+name=["']twitter:card["']\s+content=["']([^"']*)["']/i)?.[1];
  const jsonLd = [...html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi)];
  if (!title) fail(path + ": missing title");
  if (!description || description.trim().length < 40) fail(path + ": missing or short meta description");
  if (canonical !== expectedUrl) fail(path + ": canonical mismatch (expected " + expectedUrl + ")");
  if (!ogTitle || !ogDescription || ogUrl !== expectedUrl) fail(path + ": incomplete Open Graph metadata");
  if (!twitterCard) fail(path + ": missing Twitter card metadata");
  if (!jsonLd.length) fail(path + ": missing JSON-LD");
  for (const match of jsonLd) {
    try {
      const data = JSON.parse(match[1]);
      const graph = data["@graph"] || [data];
      if (!graph.some((item) => item["@type"] === expectedType || (Array.isArray(item["@type"]) && item["@type"].includes(expectedType)))) {
        fail(path + ": JSON-LD does not include expected schema type " + expectedType);
      }
    } catch (error) {
      fail(path + ": invalid JSON-LD — " + error.message);
    }
  }
}

const staticExpected = new Map([
  ["index.html", ["/", "WebSite"]],
  ["figures/index.html", ["/figures/", "WebPage"]],
  ["figures/directory.html", ["/figures/directory.html", "CollectionPage"]],
  ["categories/index.html", ["/categories/", "WebPage"]],
  ["regions/index.html", ["/regions/", "WebPage"]],
  ["eras/index.html", ["/eras/", "WebPage"]],
  ["pages/about.html", ["/pages/about.html", "WebPage"]],
  ["pages/methodology.html", ["/pages/methodology.html", "WebPage"]],
  ["pages/sources.html", ["/pages/sources.html", "WebPage"]],
  ["pages/privacy.html", ["/pages/privacy.html", "WebPage"]]
]);
for (const [path, [url, type]] of staticExpected) checkPage(path, BASE + url, type);

const figures = readdirSync("data/figures")
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .map((file) => JSON.parse(readFileSync(join("data/figures", file), "utf8")))
  .filter((figure) => figure.status === "published");
for (const figure of figures) {
  checkPage("figures/" + figure.slug + ".html", BASE + "/figures/" + figure.slug + ".html", "Person");
}

const sitemap = readHTML("sitemap.xml");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (!locations.length) fail("sitemap.xml contains no locations");
if (new Set(locations).size !== locations.length) fail("sitemap.xml contains duplicate URLs");
for (const url of locations) {
  if (!url.startsWith(BASE + "/") && url !== BASE + "/") {
    fail("sitemap URL is outside the canonical site: " + url);
    continue;
  }
  const pathname = new URL(url).pathname.replace(/^\/menhistory\/?/, "");
  const target = pathname ? (pathname.endsWith("/") ? join(pathname, "index.html") : pathname) : "index.html";
  if (!existsSync(target)) fail("sitemap URL has no local page: " + url);
}
console.log("\nChecked " + staticExpected.size + " static pages, " + figures.length + " figure pages, and " + locations.length + " sitemap URLs.");
console.log("SEO errors: " + errors.length);
if (errors.length) process.exit(1);
console.log("✓ Titles, descriptions, canonicals, social metadata, JSON-LD, and sitemap passed.");
