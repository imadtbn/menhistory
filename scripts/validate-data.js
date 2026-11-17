import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const DATA_DIR = "data/figures";
const INDEX_PATH = join(DATA_DIR, "index.json");
const REQUIRED = ["slug", "nameAr", "nameEn", "birth", "fields", "era", "summary", "sources"];
const errors = [];
const warnings = [];
const records = new Map();

function reportError(message) {
  errors.push(message);
  console.error(`✗ ${message}`);
}

function reportWarning(message) {
  warnings.push(message);
  console.warn(`⚠ ${message}`);
}

function readJSON(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    reportError(`${label}: JSON غير صالح — ${error.message}`);
    return null;
  }
}

if (!existsSync(DATA_DIR)) {
  reportError(`مجلد البيانات غير موجود: ${DATA_DIR}`);
} else {
  const files = readdirSync(DATA_DIR).filter((file) => file.endsWith(".json") && file !== "index.json");

  for (const file of files) {
    const path = join(DATA_DIR, file);
    const data = readJSON(path, file);
    if (!data) continue;

    for (const key of REQUIRED) {
      if (data[key] == null) reportError(`${file}: الحقل المطلوب مفقود — ${key}`);
    }

    if (typeof data.slug !== "string" || !/^[a-z0-9-]+$/.test(data.slug)) {
      reportError(`${file}: slug غير صالح`);
      continue;
    }

    if (file !== `${data.slug}.json`) {
      reportError(`${file}: اسم الملف لا يطابق slug (${data.slug})`);
    }
    if (records.has(data.slug)) {
      reportError(`${file}: slug مكرر — ${data.slug}`);
    } else {
      records.set(data.slug, data);
    }

    if (typeof data.nameAr !== "string" || data.nameAr.trim().length < 2) {
      reportError(`${file}: nameAr غير صالح`);
    }
    if (typeof data.nameEn !== "string" || data.nameEn.trim().length < 2) {
      reportError(`${file}: nameEn غير صالح`);
    }
    if (!data.birth || typeof data.birth !== "object" || typeof data.birth.date !== "string") {
      reportError(`${file}: birth.date مفقود أو غير صالح`);
    }
    if (!data.fields || typeof data.fields.primary !== "string" || !data.fields.primary) {
      reportError(`${file}: fields.primary مفقود أو غير صالح`);
    }
    if (!Array.isArray(data.sources) || data.sources.length === 0) {
      reportError(`${file}: يجب توفير مصدر واحد على الأقل`);
    } else {
      data.sources.forEach((source, index) => {
        if (!source || !source.title || !source.publisher || !source.type || !source.url) {
          reportError(`${file}: بيانات المصدر رقم ${index + 1} غير مكتملة`);
          return;
        }
        try {
          const url = new URL(source.url);
          if (!["http:", "https:"].includes(url.protocol)) {
            reportError(`${file}: بروتوكول رابط المصدر غير مسموح — ${source.url}`);
          }
        } catch {
          reportError(`${file}: رابط المصدر غير صالح — ${source.url}`);
        }
      });
    }

    if (!["published", "draft"].includes(data.status)) {
      reportError(`${file}: status يجب أن يكون published أو draft`);
    }
  }

  const index = existsSync(INDEX_PATH) ? readJSON(INDEX_PATH, "data/figures/index.json") : null;
  if (!Array.isArray(index)) {
    reportError("data/figures/index.json يجب أن يحتوي على مصفوفة");
  } else {
    const indexedSlugs = new Set();

    for (const [position, item] of index.entries()) {
      const label = `index.json [${position + 1}]`;
      if (!item || typeof item.slug !== "string" || !item.slug) {
        reportError(`${label}: slug مفقود أو غير صالح`);
        continue;
      }
      if (indexedSlugs.has(item.slug)) {
        reportError(`${label}: slug مكرر في الفهرس — ${item.slug}`);
        continue;
      }
      indexedSlugs.add(item.slug);

      const record = records.get(item.slug);
      if (!record) {
        reportError(`${label}: لا يوجد ملف بيانات مقابل للشخصية — ${item.slug}`);
        continue;
      }
      if (record.status !== "published") {
        reportError(`${label}: الشخصية مدرجة في الفهرس لكنها ليست منشورة — ${item.slug}`);
      }
      if (item.nameAr && item.nameAr !== record.nameAr) {
        reportWarning(`${label}: الاسم العربي لا يطابق ملف الشخصية — ${item.slug}`);
      }
      if (item.nameEn && item.nameEn !== record.nameEn) {
        reportWarning(`${label}: الاسم الإنجليزي لا يطابق ملف الشخصية — ${item.slug}`);
      }
    }

    for (const [slug, record] of records) {
      if (record.status === "published" && !indexedSlugs.has(slug)) {
        reportError(`الشخصية المنشورة غير موجودة في index.json — ${slug}`);
      }
    }
  }
}

console.log(`\nتم فحص ${records.size} ملف شخصية.`);
console.log(`الأخطاء: ${errors.length} | التحذيرات: ${warnings.length}`);
if (errors.length) {
  console.error("❌ فشل التحقق من البيانات.");
  process.exit(1);
}
console.log("✅ اجتازت البيانات فحوصات البنية والفهرس والمصادر.");
