/**
 * أدوات مساعدة مشتركة
 */

/** تطبيع النص العربي للبحث (لا يغيّر النص المعروض) */
export function normalizeArabicText(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, "") // التشكيل
    .replace(/\u0640/g, "") // التطويل
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627") // أ إ آ ٱ → ا
    .replace(/\u0629/g, "\u0647") // ة → ه (للبحث فقط)
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\u0624/g, "\u0648") // ؤ → و
    .replace(/\u0626/g, "\u064A") // ئ → ي
    .replace(/\s+/g, " ")
    .trim();
}

/** تطبيع النص اللاتيني */
export function normalizeLatinText(text) {
  if (!text) return "";
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** تطبيع مزدوج (عربي + لاتيني) */
export function normalizeText(text) {
  if (!text) return "";
  return normalizeArabicText(normalizeLatinText(text));
}

/** تنسيق التاريخ */
export function formatDateRange(birth, death) {
  if (!birth && !death) return "";
  if (birth && !death) return birth;
  if (!death) return birth;
  return `${birth} – ${death}`;
}

/** إبراز الكلمة المطابقة */
export function highlightMatch(text, query) {
  if (!query || !text) return escapeHtml(text);
  const normalizedText = normalizeText(text);
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return escapeHtml(text);

  // بحث بسيط بالكلمة الأولى المطابقة (بدون regex معقد)
  const idx = normalizedText.indexOf(normalizedQuery);
  if (idx === -1) return escapeHtml(text);

  // نحتاج لربط النص المطبع بالنص الأصلي — حل تقريبي
  const safe = escapeHtml(text);
  // ابحث في النص الأصلي (مع تجاهل حالة الأحرف)
  const lower = text.toLowerCase();
  const originalIdx = lower.indexOf(query.toLowerCase());
  if (originalIdx === -1) return safe;
  return (
    safe.slice(0, originalIdx) +
    "<mark>" +
    safe.slice(originalIdx, originalIdx + query.length) +
    "</mark>" +
    safe.slice(originalIdx + query.length)
  );
}

/** حماية XSS عند إدراج نص */
export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** تحميل JSON مع معالجة الأخطاء */
export async function fetchJSON(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error("fetchJSON error:", url, err);
    return null;
  }
}

/** debounce */
export function debounce(fn, wait = 250) {
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

/** الحصول على معامل URL */
export function getParam(name) {
  return new URLSearchParams(location.search).get(name);
}