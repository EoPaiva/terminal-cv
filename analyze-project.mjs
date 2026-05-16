// analyze-project.mjs
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const ALLOWED_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".md",
  ".json",
  ".txt"
]);

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".vercel",
  "dist",
  "build"
]);

const stats = {
  files: 0,
  lines: 0,
  blankLines: 0,
  words: 0,
  characters: 0,
  jsFunctions: 0,
  cssClasses: 0,
  cssIds: 0,
  htmlTags: 0,
  htmlIds: 0,
  links: 0,
  scripts: 0,
  stylesheets: 0,
  byExtension: {},
  largestFile: null,
  filesDetail: []
};

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) walk(fullPath);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();

    if (ALLOWED_EXTENSIONS.has(ext)) {
      analyzeFile(fullPath, ext);
    }
  }
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function analyzeFile(filePath, ext) {
  const content = fs.readFileSync(filePath, "utf8");
  const relative = path.relative(ROOT, filePath);

  const lines = content.split(/\r\n|\r|\n/);
  const blankLines = lines.filter((line) => !line.trim()).length;
  const words = content.match(/\b[\p{L}\p{N}_-]+\b/gu)?.length || 0;
  const characters = content.length;

  const jsFunctions =
    ext === ".js"
      ? countMatches(content, /\bfunction\s+[a-zA-Z_$][\w$]*\s*\(/g) +
        countMatches(content, /\bconst\s+[a-zA-Z_$][\w$]*\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g) +
        countMatches(content, /\bconst\s+[a-zA-Z_$][\w$]*\s*=\s*(?:async\s*)?[a-zA-Z_$][\w$]*\s*=>/g)
      : 0;

  const cssClasses =
    ext === ".css" || ext === ".html" || ext === ".js"
      ? new Set([...content.matchAll(/\.([a-zA-Z_-][\w-]*)/g)].map((m) => m[1])).size
      : 0;

  const cssIds =
    ext === ".css"
      ? new Set([...content.matchAll(/#([a-zA-Z_-][\w-]*)/g)].map((m) => m[1])).size
      : 0;

  const htmlTags =
    ext === ".html"
      ? countMatches(content, /<\/?[a-zA-Z][\w:-]*(?:\s|>|\/>)/g)
      : 0;

  const htmlIds =
    ext === ".html"
      ? new Set([...content.matchAll(/\bid=["']([^"']+)["']/g)].map((m) => m[1])).size
      : 0;

  const links =
    ext === ".html" || ext === ".md" || ext === ".js"
      ? countMatches(content, /\bhref=["'][^"']+["']|https?:\/\/[^\s"'`)]+/g)
      : 0;

  const scripts =
    ext === ".html"
      ? countMatches(content, /<script\b/gi)
      : 0;

  const stylesheets =
    ext === ".html"
      ? countMatches(content, /rel=["']stylesheet["']/gi)
      : 0;

  const detail = {
    file: relative,
    extension: ext,
    lines: lines.length,
    blankLines,
    words,
    characters,
    jsFunctions,
    cssClasses,
    cssIds,
    htmlTags,
    htmlIds,
    links,
    scripts,
    stylesheets
  };

  stats.files += 1;
  stats.lines += detail.lines;
  stats.blankLines += blankLines;
  stats.words += words;
  stats.characters += characters;
  stats.jsFunctions += jsFunctions;
  stats.cssClasses += cssClasses;
  stats.cssIds += cssIds;
  stats.htmlTags += htmlTags;
  stats.htmlIds += htmlIds;
  stats.links += links;
  stats.scripts += scripts;
  stats.stylesheets += stylesheets;

  stats.byExtension[ext] ||= {
    files: 0,
    lines: 0,
    words: 0,
    characters: 0
  };

  stats.byExtension[ext].files += 1;
  stats.byExtension[ext].lines += detail.lines;
  stats.byExtension[ext].words += words;
  stats.byExtension[ext].characters += characters;

  if (!stats.largestFile || characters > stats.largestFile.characters) {
    stats.largestFile = detail;
  }

  stats.filesDetail.push(detail);
}

walk(ROOT);

stats.filesDetail.sort((a, b) => b.lines - a.lines);

console.log(JSON.stringify(stats, null, 2));

console.log("\n\n## Estatísticas do projeto\n");

console.log(`- Arquivos analisados: ${stats.files}`);
console.log(`- Linhas totais: ${stats.lines.toLocaleString("pt-BR")}`);
console.log(`- Linhas em branco: ${stats.blankLines.toLocaleString("pt-BR")}`);
console.log(`- Palavras totais: ${stats.words.toLocaleString("pt-BR")}`);
console.log(`- Caracteres totais: ${stats.characters.toLocaleString("pt-BR")}`);
console.log(`- Funções JavaScript: ${stats.jsFunctions.toLocaleString("pt-BR")}`);
console.log(`- Classes CSS/seletores de classe encontrados: ${stats.cssClasses.toLocaleString("pt-BR")}`);
console.log(`- IDs CSS encontrados: ${stats.cssIds.toLocaleString("pt-BR")}`);
console.log(`- Tags HTML: ${stats.htmlTags.toLocaleString("pt-BR")}`);
console.log(`- IDs HTML únicos: ${stats.htmlIds.toLocaleString("pt-BR")}`);
console.log(`- Links/referências externas e internas: ${stats.links.toLocaleString("pt-BR")}`);
console.log(`- Scripts declarados em HTML: ${stats.scripts.toLocaleString("pt-BR")}`);
console.log(`- Stylesheets declarados em HTML: ${stats.stylesheets.toLocaleString("pt-BR")}`);
console.log(`- Maior arquivo: ${stats.largestFile.file} (${stats.largestFile.lines.toLocaleString("pt-BR")} linhas)`);

console.log("\n### Arquivos com mais linhas\n");

for (const file of stats.filesDetail.slice(0, 8)) {
  console.log(`- ${file.file}: ${file.lines.toLocaleString("pt-BR")} linhas`);
}