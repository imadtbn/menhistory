import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const DATA_DIR = "data/figures";
const REQUIRED = ["slug", "nameAr", "nameEn", "birth", "fields", "era", "summary", "sources"];
let errors = 0;
let checked = 0;

const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json") && f !== "index.json");
const seenSlugs = new Set();

for (const file of files) {
  checked++;
  const path = join(DATA_DIR, file);
  let data;
  try {
    data = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    console.error(`✗ ${file}: JSON غير صالح — ${e.message}`);
    errors++;
    continue;
  }
  for (const key of REQUIRED) {
    if (data[key] == null) {
      console.error(`✗ ${file}: الحقل المطلوب مفقود — ${key}`);
      errors++;
    }
  }
  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    console.error(`✗ ${file}: slug غير صالح`);
    errors++;
  }
  if (seenSlugs.has(data.slug)) {
    console.error(`✗ ${file}: slug مكرر — ${data.slug}`);
    errors++;
  }
  seenSlugs.add(data.slug);
  if (!Array.isArray(data.sources) || data.sources.length === 0) {
    console.error(`✗ ${file}: يجب توفير مصدر واحد على الأقل`);
    errors++;
  }
  if (file.replace(".json", "") !== data.slug) {
    console.warn(`⚠ ${file}: اسم الملف لا يطابق slug (${data.slug})`);
  }
}

console.log(`\nتم التحقق من ${checked} ملف.`);
console.log(errors ? `❌ ${errors} أخطاء.` : "✅ جميع الملفات صالحة.");
process.exit(errors ? 1 : 0);