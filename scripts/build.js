import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";

const DATA = "data/figures";
const OUT = "figures";
const BASE = "https://imadtbn.github.io/menhistory";
const records = readdirSync(DATA).filter((name) => name.endsWith(".json") && name !== "index.json")
  .map((name) => JSON.parse(readFileSync(join(DATA, name), "utf8")));
const published = records.filter((item) => item.status === "published");
const slugs = new Set(published.map((item) => item.slug));
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

for (const file of readdirSync(OUT)) {
  if (!file.endsWith(".html") || ["index.html", "figure.html", "directory.html"].includes(file)) continue;
  if (!slugs.has(file.slice(0, -5))) {
    unlinkSync(join(OUT, file));
    console.log("− removed stale page: " + file);
  }
}
for (const figure of published) {
  writeFileSync(join(OUT, figure.slug + ".html"), renderFigure(figure), "utf8");
  console.log("✓ generated " + figure.slug + ".html");
}
writeFileSync(join(OUT, "directory.html"), renderDirectory(published), "utf8");
console.log("✓ generated " + published.length + " standalone figure pages.");

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}
function json(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}
function asset(path) {
  if (!path) return "";
  return /^https?:\/\//i.test(path) ? path : BASE + "/" + String(path).replace(/^\/+/, "");
}
function schemaDate(value) {
  return typeof value === "string" && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(value) ? value : undefined;
}
function renderFigure(f) {
  const url = BASE + "/figures/" + f.slug + ".html";
  const title = f.nameAr + " (" + f.nameEn + ") — رجال عبر التاريخ";
  const description = (f.summary || ("السيرة التاريخية لـ " + f.nameAr + ".")).slice(0, 160);
  const imagePath = f.image && f.image.url && (/^https?:\\/\\//i.test(f.image.url) || existsSync(resolve(f.image.url))) ? asset(f.image.url) : "";
  const person = {
    "@type": "Person", "@id": url + "#person", name: f.nameAr,
    alternateName: [f.nameEn].concat(f.alternateNames || []).filter(Boolean),
    description: f.summary, url: url, mainEntityOfPage: { "@id": url + "#webpage" },
    ...(schemaDate(f.birth && f.birth.date) ? { birthDate: schemaDate(f.birth.date) } : {}),
    ...(schemaDate(f.death && f.death.date) ? { deathDate: schemaDate(f.death.date) } : {}),
    ...(f.birth && f.birth.place ? { birthPlace: { "@type": "Place", name: f.birth.place } } : {}),
    ...(f.death && f.death.place ? { deathPlace: { "@type": "Place", name: f.death.place } } : {}),
    ...(f.nationality ? { nationality: f.nationality } : {}),
    ...(f.fields && f.fields.primary ? { jobTitle: f.fields.primary } : {}),
    ...(imagePath ? { image: imagePath } : {})
  };
  const graph = { "@context": "https://schema.org", "@graph": [
    person,
    { "@type": "WebPage", "@id": url + "#webpage", url: url, name: title, description: description,
      inLanguage: "ar", mainEntity: { "@id": url + "#person" }, breadcrumb: { "@id": url + "#breadcrumb" } },
    { "@type": "BreadcrumbList", "@id": url + "#breadcrumb", itemListElement: [
      { "@type": "ListItem", position: 1, name: "الرئيسية", item: BASE + "/" },
      { "@type": "ListItem", position: 2, name: "الشخصيات", item: BASE + "/figures/" },
      { "@type": "ListItem", position: 3, name: f.nameAr, item: url }
    ]}
  ]};
  const bio = f.biography || {};
  const image = imagePath ? '<figure><img src="' + esc(imagePath) + '" alt="' + esc(f.image.alt || f.nameAr) + '" loading="eager" width="320" height="400"><figcaption>' + esc(f.image.credit || "") + '</figcaption></figure>' : "";
  const achievements = (bio.achievements || []).map((x) => "<li>" + esc(x) + "</li>").join("");
  const timeline = (f.timeline || []).map((x) => '<li><span class="year">' + esc(x.year) + "</span> — " + esc(x.event) + "</li>").join("");
  const sources = (f.sources || []).map((x) => '<li><a href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.title) + "</a><div>" + esc(x.publisher) + " · " + esc(x.type) + (x.supports ? "<p>" + esc(x.supports) + "</p>" : "") + "</div></li>").join("");
  const related = (f.relatedFigures || []).filter((slug) => slugs.has(slug)).map((slug) => records.find((x) => x.slug === slug))
    .filter(Boolean).map((x) => '<li><a href="' + esc(x.slug) + '.html">' + esc(x.nameAr) + " (" + esc(x.nameEn) + ")</a></li>").join("");
  const section = (heading, body) => body ? '<section class="figure-section"><h2>' + heading + "</h2>" + body + "</section>" : "";
  return '<!DOCTYPE html>\n<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>" + esc(title) + "</title><meta name=\"description\" content=\"" + esc(description) + '">' +
    '<meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="' + url + '">' +
    '<meta property="og:locale" content="ar_AR"><meta property="og:site_name" content="رجال عبر التاريخ — Men Throughout History">' +
    '<meta property="og:title" content="' + esc(title) + '"><meta property="og:description" content="' + esc(description) + '">' +
    '<meta property="og:type" content="profile"><meta property="og:url" content="' + url + '">' +
    (imagePath ? '<meta property="og:image" content="' + esc(imagePath) + '">' : "") +
    '<meta name="twitter:card" content="' + (imagePath ? "summary_large_image" : "summary") + '">' +
    '<meta name="twitter:title" content="' + esc(title) + '"><meta name="twitter:description" content="' + esc(description) + '">' +
    (imagePath ? '<meta name="twitter:image" content="' + esc(imagePath) + '">' : "") +
    '<link rel="stylesheet" href="../assets/css/main.css"><link rel="stylesheet" href="../assets/css/components.css"><link rel="stylesheet" href="../assets/css/responsive.css">' +
    '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
    '<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">' +
    '<script type="application/ld+json">' + json(graph) + "</script></head><body>" +
    '<header class="site-header"><div class="header-inner"><a class="brand" href="../index.html"><span class="brand-mark">MTH</span><span class="brand-text">رجال عبر التاريخ<small>Men Throughout History</small></span></a>' +
    '<nav aria-label="القائمة الرئيسية"><ul class="nav-list" id="nav-list"><li><a href="../index.html">الرئيسية</a></li><li><a href="index.html">الشخصيات</a></li><li><a href="../categories/index.html">المجالات</a></li><li><a href="../regions/index.html">المناطق</a></li><li><a href="../eras/index.html">الحقب</a></li><li><a href="../pages/about.html">عن الموسوعة</a></li></ul></nav>' +
    '<div class="header-actions"><button class="icon-btn" id="theme-toggle" aria-label="تبديل الوضع الليلي">🌓</button></div></div></header>' +
    '<main class="container" style="max-width:1000px;padding:32px 24px 80px"><nav aria-label="مسار التنقل"><ol class="breadcrumb"><li><a href="../index.html">الرئيسية</a></li><li><a href="index.html">الشخصيات</a></li><li aria-current="page">' + esc(f.nameAr) + "</li></ol></nav>" +
    '<article class="figure-article" itemscope itemtype="https://schema.org/Person"><header class="figure-title-block">' + image +
    '<h1 itemprop="name">' + esc(f.nameAr) + '</h1><p class="name-en" lang="en" dir="ltr">' + esc(f.nameEn) + "</p>" +
    ((f.alternateNames || []).length ? '<p class="alt-names">أسماء بديلة: ' + f.alternateNames.map(esc).join(" · ") + "</p>" : "") +
    '<p class="lead" itemprop="description">' + esc(f.summary) + "</p><div class=\"figure-tags\">" +
    (f.era ? '<span class="tag gold">' + esc(f.era) + "</span>" : "") +
    (f.fields && f.fields.primary ? '<span class="tag">' + esc(f.fields.primary) + "</span>" : "") +
    (f.nationality ? '<span class="tag">' + esc(f.nationality) + "</span>" : "") + "</div></header>" +
    section("أبرز ما عُرف به", f.notableFor ? "<p>" + esc(f.notableFor) + "</p>" : "") +
    section("النشأة والتعليم", bio.earlyLife ? "<p>" + esc(bio.earlyLife) + "</p>" : "") +
    section("المسيرة المهنية", bio.career ? "<p>" + esc(bio.career) + "</p>" : "") +
    section("أبرز الإنجازات", achievements ? "<ul>" + achievements + "</ul>" : "") +
    section("الأعمال والابتكارات", bio.inventions && bio.inventions.length ? "<ul>" + bio.inventions.map((x) => "<li>" + esc(x) + "</li>").join("") + "</ul>" : "") +
    section("التسلسل الزمني", timeline ? '<ul class="timeline-list">' + timeline + "</ul>" : "") +
    section("الأفكار والمواقف", bio.ideas ? "<p>" + esc(bio.ideas) + "</p>" : "") +
    section("شخصيات ذات صلة", related ? "<ul>" + related + "</ul>" : "") +
    section("المصادر والمراجع", sources ? '<ul class="sources-list" id="sources">' + sources + "</ul>" : "") +
    "</article></main><footer class=\"site-footer\"><div class=\"container\"><div class=\"footer-bottom\">© 2026 رجال عبر التاريخ — Men Throughout History.</div></div></footer>" +
    '<script type="module" src="../assets/js/app.js"></script></body></html>';
}
function renderDirectory(figures) {
  const entries = [...figures].sort((a, b) => a.nameAr.localeCompare(b.nameAr, "ar"));
  const links = entries.map((f) => '<li><a href="' + esc(f.slug) + '.html">' + esc(f.nameAr) + '</a> <span lang="en" dir="ltr">' + esc(f.nameEn) + "</span></li>").join("\n");
  const url = BASE + "/figures/directory.html";
  return '<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    "<title>دليل الشخصيات — رجال عبر التاريخ</title><meta name=\"description\" content=\"دليل أبجدي يضم جميع الشخصيات المنشورة وروابط صفحات سيرهم المستقلة.\">" +
    '<meta name="robots" content="index,follow"><link rel="canonical" href="' + url + '">' +
    '<link rel="stylesheet" href="../assets/css/main.css"><link rel="stylesheet" href="../assets/css/components.css"><link rel="stylesheet" href="../assets/css/responsive.css"></head><body>' +
    '<header class="site-header"><div class="header-inner"><a class="brand" href="../index.html"><span class="brand-mark">MTH</span><span class="brand-text">رجال عبر التاريخ</span></a><nav><ul class="nav-list" id="nav-list"><li><a href="../index.html">الرئيسية</a></li><li><a href="index.html">الشخصيات</a></li></ul></nav></div></header>' +
    '<main class="container" style="padding:40px 24px 80px"><nav aria-label="مسار التنقل"><ol class="breadcrumb"><li><a href="../index.html">الرئيسية</a></li><li><a href="index.html">الشخصيات</a></li><li>دليل الشخصيات</li></ol></nav>' +
    '<h1 class="section-title">دليل الشخصيات</h1><p>قائمة تضم ' + entries.length + ' شخصية منشورة، مع رابط مستقل لكل سيرة.</p><ul class="figure-directory">' + links + "</ul></main>" +
    '<footer class="site-footer"><div class="container"><div class="footer-bottom">© 2026 رجال عبر التاريخ — Men Throughout History.</div></div></footer><script type="module" src="../assets/js/app.js"></script></body></html>';
}
