import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
const ROOT = resolve(".");
const errors = [];
const files = walk(ROOT).filter((file) => file.endsWith(".html"));
const inbound = new Map();
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === ".git" || entry.name === "node_modules") return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
function fail(message) { errors.push(message); console.error("✗ " + message); }
function localPath(source, reference) {
  const clean = reference.split("#")[0].split("?")[0];
  if (!clean) return { path: source, fragment: reference.includes("#") ? reference.split("#").slice(1).join("#") : "" };
  let target;
  if (clean.startsWith("/")) {
    const sitePath = clean.replace(/^\/menhistory\/?/, "");
    target = resolve(ROOT, "." + (sitePath.startsWith("/") ? sitePath : "/" + sitePath));
  } else target = resolve(dirname(source), decodeURIComponent(clean));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) return null;
  if (existsSync(target) && statSync(target).isDirectory()) target = join(target, "index.html");
  return { path: target, fragment: reference.includes("#") ? reference.split("#").slice(1).join("#") : "" };
}
for (const file of files) {
  const html = readFileSync(file, "utf8");
  const refs = [...html.matchAll(/\b(href|src)=["']([^"']+)["']/gi)];
  for (const match of refs) {
    const attr = match[1].toLowerCase(), ref = match[2];
    if (/^(https?:|mailto:|tel:|data:|javascript:|\/\/)/i.test(ref)) continue;
    const resolved = localPath(file, ref);
    if (!resolved) { fail(file + ": path escapes site root — " + ref); continue; }
    if (!existsSync(resolved.path)) { fail(file + ": broken local reference — " + ref); continue; }
    if (attr === "href" && resolved.path.endsWith(".html")) {
      inbound.set(resolve(resolved.path), (inbound.get(resolve(resolved.path)) || 0) + 1);
      if (resolved.fragment) {
        const targetHTML = readFileSync(resolved.path, "utf8");
        const ids = new Set([...targetHTML.matchAll(/\bid=["']([^"']+)["']/gi)].map((x) => x[1]));
        if (!ids.has(decodeURIComponent(resolved.fragment))) fail(file + ": missing fragment — " + ref);
      }
    }
  }
}
const generated = files.filter((file) => resolve(file).startsWith(resolve(ROOT, "figures") + sep) &&
  !["index.html", "figure.html", "directory.html"].includes(file.split(sep).pop()));
for (const file of generated) if (!inbound.has(resolve(file))) fail(file + ": orphan figure page (no internal incoming link)");
console.log("\nChecked " + files.length + " HTML files and " + generated.length + " generated figure pages.");
console.log("Broken references / orphan pages: " + errors.length);
if (errors.length) process.exit(1);
console.log("✓ Internal links, fragments, and figure discoverability passed.");
