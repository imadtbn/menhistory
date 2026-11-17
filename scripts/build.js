import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const DATA = "data/figures";
const OUT = "figures";

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const files = readdirSync(DATA).filter((f) => f.endsWith(".json") && f !== "index.json");

for (const file of files) {
  const data = JSON.parse(readFileSync(join(DATA, file), "utf8"));
  if (data.status !== "published") continue;

  const html = renderHTML(data);
  const outPath = join(OUT, `${data.slug}.html`);
  writeFileSync(outPath, html, "utf8");
  console.log(`✓ توليد ${outPath}`);
}

function renderHTML(f) {
  const title = `${f.nameAr} — رجال عبر التاريخ`;
  const desc = (f.summary || "").slice(0, 155);
  const canonical = `https://imadtbn.github.io/menhistory/figures/${f.slug}.html`;
  const ld = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Person",
    name: f.nameAr,
    alternateName: f.nameEn,
    description: f.summary,
    birthDate: f.birth?.date,
    deathDate: f.death?.date,
    birthPlace: f.birth?.place,
    deathPlace: f.death?.place,
    jobTitle: f.fields?.primary,
    knowsAbout: f.fields?.secondary || [],
    url: canonical,
  });

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${desc}">
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:type" content="profile">
<meta property="og:url" content="${canonical}">
${f.image?.url ? `<meta property="og:image" content="https://imadtbn.github.io/menhistory/${f.image.url}">` : ""}
<link rel="stylesheet" href="../assets/css/main.css">
<link rel="stylesheet" href="../assets/css/components.css">
<link rel="stylesheet" href="../assets/css/responsive.css">
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800;900&display=swap" rel="stylesheet">
<script type="application/ld+json">${ld}</script>
</head>
<body>
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="../index.html"><span class="brand-mark">MTH</span><span class="brand-text">رجال عبر التاريخ</span></a>
    <nav><ul class="nav-list" id="nav-list">
      <li><a href="../index.html">الرئيسية</a></li>
      <li><a href="index.html">الشخصيات</a></li>
      <li><a href="../categories/index.html">المجالات</a></li>
      <li><a href="../regions/index.html">المناطق</a></li>
      <li><a href="../eras/index.html">الحقب</a></li>
    </ul></nav>
    <div class="header-actions"><button class="icon-btn" id="theme-toggle" aria-label="تبديل الوضع الليلي">🌓</button></div>
  </div>
</header>

<main class="container" style="max-width:900px; padding:32px 24px 80px">
  <nav aria-label="breadcrumb"><ol class="breadcrumb">
    <li><a href="../index.html">الرئيسية</a></li>
    <li><a href="index.html">الشخصيات</a></li>
    <li>${f.nameAr}</li>
  </ol></nav>
  <h1 style="font-size:2.2rem; color:var(--navy); margin-bottom:4px">${f.nameAr}</h1>
  <div style="color:var(--text-muted); direction:ltr; text-align:right; margin-bottom:20px">${f.nameEn}</div>
  <p style="font-size:1.05rem; line-height:1.85; margin-bottom:24px">${f.summary || ""}</p>
  <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:32px">
    <span class="tag gold">${f.era}</span>
    <span class="tag">${f.fields.primary}</span>
    ${f.nationality ? `<span class="tag">${f.nationality}</span>` : ""}
  </div>
  ${f.biography?.earlyLife ? `<section class="figure-section"><h2>النشأة</h2><p>${f.biography.earlyLife}</p></section>` : ""}
  ${f.biography?.career ? `<section class="figure-section"><h2>المسيرة</h2><p>${f.biography.career}</p></section>` : ""}
  ${f.biography?.achievements?.length ? `<section class="figure-section"><h2>الإنجازات</h2><ul>${f.biography.achievements.map(a => `<li>${a}</li>`).join("")}</ul></section>` : ""}
  ${f.timeline?.length ? `<section class="figure-section"><h2>التسلسل الزمني</h2><ul class="timeline-list">${f.timeline.map(t => `<li><span class="year">${t.year}</span> — ${t.event}</li>`).join("")}</ul></section>` : ""}
  ${f.biography?.ideas ? `<section class="figure-section"><h2>الأفكار</h2><p>${f.biography.ideas}</p></section>` : ""}
  ${f.sources?.length ? `<section class="figure-section"><h2>المصادر</h2><ul class="sources-list">${f.sources.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.title}</a><div class="source-meta">${s.publisher} · ${s.type}</div></li>`).join("")}</ul></section>` : ""}
</main>

<footer class="site-footer"><div class="container"><div class="footer-bottom">© 2024 رجال عبر التاريخ.</div></div></footer>
<script type="module" src="../assets/js/app.js"></script>
</body>
</html>`;
}