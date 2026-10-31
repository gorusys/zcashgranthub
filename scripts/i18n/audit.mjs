import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const root = process.cwd();
const dictionary = JSON.parse(fs.readFileSync(path.join(root, "src/i18n/messages/ui.json"), "utf8"));
const normalize = (s) => s.replace(/\s+/g, " ").trim();
const fixed = new Set(["Zcash Grants Hub", "Zcash Community Grants", "ZCG", "Coinholder", "ZecHub DAO", "DAO DAO", "Juno", "GitHub", "Keplr", "Leap", "daodao.zone", "CONTRIBUTING.md", "librustzcash", "URL", "USD", "ZEC", "UTC", "@owner1, @owner2", "proposals/create", "ZCG + Coinholder · GitHub", "Hardware/Software", "Hardware / Software", "breadcrumb", "NSM", "zcg-42", "DAO", "?prefill=", "src/data/grant-links.json", "ZIP 218", "ZIP 1016", "ZIP 235", "ZIP 237"]);
const enFile = ts.createSourceFile("en.ts", fs.readFileSync("src/i18n/messages/en.ts", "utf8"), ts.ScriptTarget.Latest, true);
function collectEn(n) {
  if (ts.isPropertyAssignment(n) && ts.isStringLiteral(n.initializer)) fixed.add(normalize(n.initializer.text));
  ts.forEachChild(n, collectEn);
}
collectEn(enFile);
const missing = new Set();
const uncovered = [];
fixed.add("application/rss+xml");
const attrs = new Set(["placeholder", "aria-label", "alt", "title", "content"]);
const files = [];
for (const dir of ["src/pages", "src/components"]) {
  files.push(...fs.readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => path.join(dir, f)));
}
files.push("src/lib/navigation.ts", "src/components/ui/dialog.tsx", "src/components/ui/sheet.tsx", "src/components/ui/carousel.tsx", "src/components/ui/breadcrumb.tsx", "src/components/analytics/ZcgWorkbookAnalytics.tsx", "src/components/zechub/ProposalDescription.tsx", "pages/_app.tsx", "pages/apply/coinholder.tsx");
function check(value) {
  const s = normalize(value);
  if (/[A-Za-z]{2}/.test(s) && !fixed.has(s) && !dictionary[s]) missing.add(s);
}
for (const file of files) {
  const sf = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function walk(n) {
    if (file === "src/lib/navigation.ts" && ts.isPropertyAssignment(n) && ["label", "description"].includes(n.name.getText(sf)) && ts.isStringLiteral(n.initializer)) check(n.initializer.text);
    if (ts.isCallExpression(n) && n.expression.getText(sf) === "tx" && n.arguments.length) {
      if (ts.isStringLiteral(n.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(n.arguments[0])) check(n.arguments[0].text);
    }
    if (ts.isStringLiteral(n) && ts.isJsxExpression(n.parent) && /^[a-z]+(?:\.[a-z_]+){2,}$/.test(n.text)) uncovered.push(`${file}: exposed translation key ${n.text}`);
    if (ts.isJsxAttribute(n) && n.name.text === "text" && ts.isStringLiteral(n.initializer)) check(n.initializer.text);
    if (ts.isJsxText(n) && /[A-Za-z]{2}/.test(n.text) && !fixed.has(normalize(n.text))) uncovered.push(`${file}:${sf.getLineAndCharacterOfPosition(n.pos).line + 1}: ${normalize(n.text)}`);
    if (ts.isJsxAttribute(n) && attrs.has(n.name.text) && n.initializer && ts.isStringLiteral(n.initializer)) {
      const s = n.initializer.text;
      if (/[A-Za-z]{2}/.test(s) && !/^https?:/.test(s) && !fixed.has(s)) uncovered.push(`${file}:${sf.getLineAndCharacterOfPosition(n.pos).line + 1}: ${s}`);
    }
    ts.forEachChild(n, walk);
  }
  walk(sf);
}
const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
for (const [source, values] of Object.entries(dictionary)) {
  if (values.length !== 2 || values.some((s) => !s.trim() || placeholders(s) !== placeholders(source))) throw new Error(`Invalid translation: ${source}`);
}
if (missing.size || uncovered.length) {
  console.error("Missing translations:\n" + [...missing].join("\n"));
  console.error("Unlocalized interface copy:\n" + uncovered.join("\n"));
  process.exitCode = 1;
} else console.log(`Checked ${files.length} interface files and ${Object.keys(dictionary).length} translation pairs.`);
