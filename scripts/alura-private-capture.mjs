#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

const EMAIL = process.env.ALURA_EMAIL;
const PASSWORD = process.env.ALURA_PASSWORD;
const HEADLESS = process.env.ALURA_HEADLESS === "true";
const USER_SLUG = process.env.ALURA_USER_SLUG || "mpaiiva21";

const OUTPUT_DIR = path.resolve("private");
const JSON_OUTPUT = path.join(OUTPUT_DIR, "alura-private-progress.json");
const COOKIE_OUTPUT = path.join(OUTPUT_DIR, ".alura-session-cookie.txt");

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safePercent(value) {
  const number = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function slug(text = "") {
  return normalize(text).replace(/\s+/g, "-") || "item";
}

function classifyArea(title = "") {
  const normalized = normalize(title);
  const rules = [
    ["IA", ["ia", "inteligencia artificial", "langchain", "langgraph", "rag", "agente", "machine learning", "deep learning", "nlp", "pytorch", "hugging face"]],
    ["Tech", ["javascript", "html", "css", "node", "react", "python", "backend", "frontend", "programacao", "algoritmo"]],
    ["Dados", ["dados", "data", "excel", "analytics", "pandas", "dashboard", "metricas", "indicadores"]],
    ["RH", ["rh", "recrutamento", "selecao", "pessoas", "competencias", "people"]],
    ["Liderança", ["lideranca", "feedback", "comunicacao", "mentoria", "stakeholders", "mudanca"]],
    ["Gestão", ["gestao", "processos", "design thinking", "negociacao", "estrategia", "inovacao"]],
    ["Automação", ["automacao", "rpa", "webhook", "n8n", "make"]],
    ["Produto", ["produto", "projeto", "negocio", "saas", "cliente"]]
  ];
  for (const [area, terms] of rules) {
    if (terms.some((term) => normalized.includes(normalize(term)))) return area;
  }
  return "Complementares";
}

function uniqueBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const old = map.get(key);
    if (!old || Number(item.progress || item.officialProgress || 0) > Number(old.progress || old.officialProgress || 0)) map.set(key, item);
  }
  return [...map.values()];
}

function parseProgressText(text = "") {
  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const inProgressCourses = [];
  const officialCareers = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalized = normalize(line);
    if (!line || line.length > 180) continue;
    if (["email", "senha", "entrar", "sair", "alura"].includes(normalized)) continue;

    const combined = `${line} ${lines[index + 1] || ""}`;
    const percentMatch = combined.match(/(.{4,150}?)(?:\s+|:|-)(100|[1-9]?\d)%/);
    if (!percentMatch) continue;

    const title = percentMatch[1]
      .replace(/continuar|progresso|curso|carreira|meu aprendizado|minhas carreiras/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const progress = safePercent(percentMatch[2]);
    if (!title || progress === null) continue;

    if (/carreira/i.test(combined)) {
      officialCareers.push({
        id: slug(title),
        name: title,
        area: classifyArea(title),
        officialProgress: progress,
        officialStatus: progress >= 100 ? "completed" : progress > 0 ? "started" : "not_started",
        source: "private",
        confidence: "private"
      });
    } else {
      inProgressCourses.push({
        id: slug(title),
        title,
        area: classifyArea(title),
        progress,
        status: progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "started",
        source: "private",
        confidence: "private"
      });
    }
  }

  return {
    inProgressCourses: uniqueBy(inProgressCourses, (course) => normalize(course.title)),
    officialCareers: uniqueBy(officialCareers, (career) => normalize(career.name))
  };
}

async function fillFirst(page, selectors, value) {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.count()) {
        await locator.fill(value, { timeout: 5000 });
        return true;
      }
    } catch (_) {}
  }
  return false;
}

async function clickFirst(page, selectors) {
  for (const selector of selectors) {
    try {
      const locator = page.locator(selector).first();
      if (await locator.count()) {
        await locator.click({ timeout: 5000 });
        return true;
      }
    } catch (_) {}
  }
  return false;
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("Configure ALURA_EMAIL e ALURA_PASSWORD apenas no ambiente local antes de rodar este script.");
    process.exit(1);
  }

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    console.error("Playwright não está instalado. Rode: npm i -D playwright && npx playwright install chromium");
    process.exit(1);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({ viewport: { width: 1366, height: 820 } });
  const page = await context.newPage();

  try {
    await page.goto("https://cursos.alura.com.br/loginForm", { waitUntil: "domcontentloaded", timeout: 45000 });

    await fillFirst(page, [
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[autocomplete="email"]'
    ], EMAIL);

    await fillFirst(page, [
      'input[type="password"]',
      'input[name="password"]',
      'input[autocomplete="current-password"]'
    ], PASSWORD);

    await clickFirst(page, [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Entrar")',
      'text=Entrar'
    ]);

    await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});

    const currentUrl = page.url();
    const pageText = await page.locator("body").innerText().catch(() => "");
    if (/faça seu login|senha|entrar com o google/i.test(pageText) && /login/i.test(currentUrl)) {
      throw new Error("Login não confirmado. Pode ter senha incorreta, captcha, 2FA ou bloqueio temporário.");
    }

    const urls = [
      "https://cursos.alura.com.br/dashboard",
      `https://cursos.alura.com.br/user/${USER_SLUG}`,
      "https://cursos.alura.com.br/carreiras"
    ];

    const texts = [];
    for (const url of urls) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
      await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
      texts.push(await page.locator("body").innerText().catch(() => ""));
    }

    const parsed = parseProgressText(texts.join("\n"));
    const cookies = await context.cookies();
    const cookieHeader = cookies
      .filter((cookie) => /alura|cursos|caelum|session|token|remember|csrf|JSESSIONID/i.test(cookie.name))
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");

    const output = {
      status: parsed.inProgressCourses.length || parsed.officialCareers.length ? "active" : "empty",
      mode: "playwright-local",
      message: "Dados privados extraídos localmente e sanitizados. Nenhuma senha foi salva neste JSON.",
      syncedAt: new Date().toISOString(),
      inProgressCourses: parsed.inProgressCourses,
      officialCareers: parsed.officialCareers,
      warnings: parsed.inProgressCourses.length || parsed.officialCareers.length ? [] : ["Login feito, mas o parser não encontrou progresso explícito no HTML atual."]
    };

    await fs.writeFile(JSON_OUTPUT, JSON.stringify(output, null, 2), "utf8");
    await fs.writeFile(COOKIE_OUTPUT, cookieHeader, "utf8");

    console.log(`JSON privado salvo em: ${JSON_OUTPUT}`);
    console.log(`Cookie de sessão salvo em: ${COOKIE_OUTPUT}`);
    console.log("Coloque o conteúdo do JSON em ALURA_PRIVATE_PROGRESS_JSON ou o cookie em ALURA_SESSION_COOKIE nas variáveis sensíveis da Vercel.");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
