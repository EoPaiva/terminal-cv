"use strict";

const DEFAULT_PRIVATE_URLS = [
  "https://cursos.alura.com.br/dashboard",
  "https://cursos.alura.com.br/user/mpaiiva21",
  "https://cursos.alura.com.br/carreiras"
];

const PRIVATE_HEADERS = {
  "user-agent": "MPaivaLearningOSPrivate/1.0 (+https://upaiva.dev)",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

function decodeHtmlEntities(text = "") {
  return String(text)
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&ccedil;/g, "ç")
    .replace(/&atilde;/g, "ã")
    .replace(/&otilde;/g, "õ")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú");
}

function htmlToText(html = "") {
  return decodeHtmlEntities(String(html))
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/section>|<\/article>|<\/tr>|<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(text = "") {
  return normalize(text).replace(/\s+/g, "-") || "item";
}

function safePercent(value) {
  const number = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function parseLocalizedInteger(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value)
    .replace(/&nbsp;/g, " ")
    .replace(/[^0-9]/g, "");

  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function formatPerformanceStatus(performance) {
  const keys = [
    "ranking30Days",
    "points",
    "completedCoursesDashboard",
    "resolvedExercises",
    "resolvedForumTopics",
    "forumPosts"
  ];

  return keys.some((key) => performance[key] !== null && performance[key] !== undefined)
    ? "private_sync_ok"
    : "private_data_unavailable";
}

function emptyPerformance(status = "waiting_private_session") {
  return {
    ranking30Days: null,
    points: null,
    completedCoursesDashboard: null,
    resolvedExercises: null,
    resolvedForumTopics: null,
    forumPosts: null,
    status,
    source: "private-dashboard",
    confidence: "private"
  };
}

function sanitizePerformance(input = {}) {
  const performance = {
    ranking30Days: parseLocalizedInteger(input.ranking30Days ?? input.ranking ?? input.ranking30dias),
    points: parseLocalizedInteger(input.points ?? input.pontos ?? input.totalPoints),
    completedCoursesDashboard: parseLocalizedInteger(input.completedCoursesDashboard ?? input.completedCourses ?? input.courses),
    resolvedExercises: parseLocalizedInteger(input.resolvedExercises ?? input.exercises ?? input.exercicios),
    resolvedForumTopics: parseLocalizedInteger(input.resolvedForumTopics ?? input.forumTopics ?? input.topicos),
    forumPosts: parseLocalizedInteger(input.forumPosts ?? input.posts),
    source: "private-dashboard",
    confidence: "private"
  };

  return {
    ...performance,
    status: input.status || formatPerformanceStatus(performance)
  };
}

function extractNumberAround(lines, index, sameLinePatterns = []) {
  const current = lines[index] || "";

  for (const pattern of sameLinePatterns) {
    const match = current.match(pattern);
    const number = parseLocalizedInteger(match?.[1]);
    if (number !== null) return number;
  }

  const windowLines = [
    lines[index - 2],
    lines[index - 1],
    lines[index + 1],
    lines[index + 2]
  ].filter(Boolean);

  for (const line of windowLines) {
    const match = String(line).match(/([0-9][0-9.]*)(?:º|\b)/);
    const number = parseLocalizedInteger(match?.[1]);
    if (number !== null) return number;
  }

  return null;
}

function firstCompactNumber(text = "", patterns = []) {
  const compact = normalize(String(text || ""))
    .replace(/\bultimos\b/g, "ultimos")
    .replace(/\s+/g, " ")
    .trim();

  for (const pattern of patterns) {
    const match = compact.match(pattern);
    const number = parseLocalizedInteger(match?.[1]);
    if (number !== null) return number;
  }

  return null;
}

function parseAluraPerformance(text = "") {
  const lines = String(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const performance = emptyPerformance("private_data_unavailable");
  const fullText = lines.join(" ");

  performance.ranking30Days = firstCompactNumber(fullText, [
    /(\d[\d.]*)\s*o?\s*(?:no\s+)?ranking\s+nos\s+ultimos\s+30\s+dias/i,
    /ranking\s+nos\s+ultimos\s+30\s+dias\s*(\d[\d.]*)/i
  ]);
  performance.points = firstCompactNumber(fullText, [
    /(\d[\d.]*)\s+pontos\s+acumulados/i,
    /pontos\s+acumulados\s*(\d[\d.]*)/i
  ]);
  performance.completedCoursesDashboard = firstCompactNumber(fullText, [
    /(\d[\d.]*)\s+cursos\s+concluidos/i,
    /cursos\s+concluidos\s*(\d[\d.]*)/i
  ]);
  performance.resolvedExercises = firstCompactNumber(fullText, [
    /(\d[\d.]*)\s+exercicios\s+resolvidos/i,
    /exercicios\s+resolvidos\s*(\d[\d.]*)/i
  ]);
  performance.resolvedForumTopics = firstCompactNumber(fullText, [
    /(\d[\d.]*)\s+topicos\s+resolvidos\s+no\s+forum/i,
    /topicos\s+resolvidos\s+no\s+forum\s*(\d[\d.]*)/i
  ]);
  performance.forumPosts = firstCompactNumber(fullText, [
    /(\d[\d.]*)\s+posts\s+no\s+forum/i,
    /posts\s+no\s+forum\s*(\d[\d.]*)/i
  ]);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalized = normalize(line);

    if (performance.ranking30Days === null && normalized.includes("ranking nos ultimos 30 dias")) {
      performance.ranking30Days = extractNumberAround(lines, index, [/(\d[\d.]*)\s*º?/i]);
    }

    if (performance.points === null && normalized.includes("pontos acumulados")) {
      performance.points = extractNumberAround(lines, index, [/(\d[\d.]*)\s*pontos/i]);
    }

    if (performance.completedCoursesDashboard === null && normalized.includes("cursos concluidos")) {
      performance.completedCoursesDashboard = extractNumberAround(lines, index, [/(\d[\d.]*)\s*cursos/i]);
    }

    if (performance.resolvedExercises === null && normalized.includes("exercicios resolvidos")) {
      performance.resolvedExercises = extractNumberAround(lines, index, [/(\d[\d.]*)\s*exercicios/i]);
    }

    if (performance.resolvedForumTopics === null && normalized.includes("topicos resolvidos") && normalized.includes("forum")) {
      performance.resolvedForumTopics = extractNumberAround(lines, index, [/(\d[\d.]*)\s*topicos/i]);
    }

    if (performance.forumPosts === null && normalized.includes("posts no forum")) {
      performance.forumPosts = extractNumberAround(lines, index, [/(\d[\d.]*)\s*posts/i]);
    }
  }

  return {
    ...performance,
    status: formatPerformanceStatus(performance)
  };
}

function uniqueBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const previous = map.get(key);
    if (!previous || Number(item.progress || 0) > Number(previous.progress || 0)) map.set(key, item);
  }
  return [...map.values()];
}

function sanitizeCourse(input = {}, index = 0) {
  const title = String(input.title || input.name || input.course || "").replace(/\s+/g, " ").trim();
  if (!title || title.length < 3) return null;

  const progress = safePercent(input.progress ?? input.percentage ?? input.percentual ?? input.conclusionPercentage);

  return {
    id: input.id || slug(title),
    title,
    area: input.area || null,
    career: input.career || input.careerName || null,
    progress: progress ?? 0,
    status: input.status || (progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "started"),
    lastAccess: input.lastAccess || input.lastAccessAt || input.updatedAt || null,
    source: "private",
    confidence: "private",
    order: Number(input.order || index + 1)
  };
}

function sanitizeCareer(input = {}, index = 0) {
  const name = String(input.name || input.title || input.career || "").replace(/\s+/g, " ").trim();
  if (!name || name.length < 3) return null;

  const officialProgress = safePercent(input.officialProgress ?? input.progress ?? input.percentage ?? input.percentual);

  return {
    id: input.id || slug(name),
    name,
    area: input.area || null,
    officialProgress: officialProgress ?? 0,
    officialStatus: input.officialStatus || input.status || (officialProgress >= 100 ? "completed" : officialProgress > 0 ? "started" : "not_started"),
    lastAccess: input.lastAccess || input.lastAccessAt || input.updatedAt || null,
    source: "private",
    confidence: "private",
    order: Number(input.order || index + 1)
  };
}

function sanitizePrivateProgress(raw = {}) {
  const inProgressCourses = Array.isArray(raw.inProgressCourses)
    ? raw.inProgressCourses.map(sanitizeCourse).filter(Boolean)
    : [];

  const officialCareers = Array.isArray(raw.officialCareers)
    ? raw.officialCareers.map(sanitizeCareer).filter(Boolean)
    : [];

  const performance = sanitizePerformance(raw.performance || raw.aluraPerformance || {});
  const hasPrivatePayload = inProgressCourses.length || officialCareers.length || performance.status === "private_sync_ok";

  return {
    status: raw.status || (hasPrivatePayload ? "active" : "empty"),
    mode: raw.mode || "manual-json",
    message: raw.message || "Sincronização privada carregada de fonte protegida e sanitizada.",
    syncedAt: raw.syncedAt || new Date().toISOString(),
    inProgressCourses: uniqueBy(inProgressCourses, (course) => normalize(course.title)),
    officialCareers: uniqueBy(officialCareers, (career) => normalize(career.name)),
    performance,
    warnings: Array.isArray(raw.warnings) ? raw.warnings : []
  };
}

function parseJsonEnv() {
  const raw = process.env.ALURA_PRIVATE_PROGRESS_JSON;
  if (!raw) return null;

  try {
    return sanitizePrivateProgress({
      ...JSON.parse(raw),
      mode: "env-json",
      message: "Dados privados carregados de ALURA_PRIVATE_PROGRESS_JSON."
    });
  } catch (error) {
    return {
      status: "error",
      mode: "env-json",
      message: `ALURA_PRIVATE_PROGRESS_JSON inválido: ${error.message}`,
      syncedAt: new Date().toISOString(),
      inProgressCourses: [],
      officialCareers: [],
      warnings: ["JSON privado inválido. Confira aspas, vírgulas e formato."]
    };
  }
}

async function fetchWithCookie(url, cookie, timeoutMs = 12000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        ...PRIVATE_HEADERS,
        cookie
      },
      redirect: "follow",
      signal: controller.signal
    });

    return {
      url: response.url || url,
      ok: response.ok,
      status: response.status,
      html: await response.text()
    };
  } finally {
    clearTimeout(timeout);
  }
}

function splitSetCookieHeader(header = "") {
  if (!header) return [];
  return String(header).split(/,(?=\s*[^;,\s]+=)/g).map((item) => item.trim()).filter(Boolean);
}

function collectSetCookies(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get("set-cookie");
  return splitSetCookieHeader(raw);
}

function storeSetCookies(jar, headers) {
  for (const cookie of collectSetCookies(headers)) {
    const pair = String(cookie).split(";")[0];
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (name) jar.set(name, value);
  }
}

function jarToCookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function absoluteUrl(url, base = "https://cursos.alura.com.br") {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

async function fetchWithJar(url, jar, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = {
      ...PRIVATE_HEADERS,
      ...(options.headers || {})
    };

    const cookie = jarToCookieHeader(jar);
    if (cookie) headers.cookie = cookie;

    const response = await fetch(url, {
      ...options,
      headers,
      redirect: options.redirect || "manual",
      signal: controller.signal
    });

    storeSetCookies(jar, response.headers);

    const location = response.headers.get("location");
    const html = await response.text();

    return {
      url: response.url || url,
      ok: response.ok,
      status: response.status,
      location: location ? absoluteUrl(location, url) : null,
      headers: response.headers,
      html
    };
  } finally {
    clearTimeout(timeout);
  }
}

function parseHiddenInputs(html = "") {
  const values = {};
  const inputRegex = /<input\b[^>]*>/gi;
  let match;
  while ((match = inputRegex.exec(String(html))) !== null) {
    const tag = match[0];
    const name = tag.match(/\bname=["']?([^"'\s>]+)/i)?.[1];
    if (!name) continue;
    const value = tag.match(/\bvalue=["']([^"']*)["']/i)?.[1] || "";
    const type = tag.match(/\btype=["']?([^"'\s>]+)/i)?.[1] || "text";
    if (/hidden|submit/i.test(type) || /csrf|token|authenticity/i.test(name)) values[name] = decodeHtmlEntities(value);
  }
  return values;
}

function parseLoginAction(html = "") {
  const forms = [...String(html).matchAll(/<form\b[^>]*>/gi)].map((match) => match[0]);
  const loginForm = forms.find((form) => /login|signin|entrar|password|senha/i.test(form)) || forms[0] || "";
  const action = loginForm.match(/\baction=["']([^"']+)["']/i)?.[1] || "/signin";
  return absoluteUrl(action, "https://cursos.alura.com.br/loginForm");
}

function looksLikeBlockedLogin(text = "") {
  const normalized = normalize(text);
  return normalized.includes("captcha") || normalized.includes("verificacao") || normalized.includes("verifique que voce") || normalized.includes("codigo de seguranca");
}

async function tryCredentialsLogin() {
  const email = process.env.ALURA_EMAIL;
  const password = process.env.ALURA_PASSWORD;

  if (!email || !password) return null;

  const jar = new Map();
  const warnings = [];
  const loginUrl = "https://cursos.alura.com.br/loginForm";

  let loginPage;
  try {
    loginPage = await fetchWithJar(loginUrl, jar, { method: "GET", redirect: "follow" });
  } catch (error) {
    return {
      status: "credentials_login_error",
      mode: "credentials",
      message: "Não foi possível abrir a tela de login da Alura pelo servidor.",
      syncedAt: new Date().toISOString(),
      inProgressCourses: [],
      officialCareers: [],
      performance: emptyPerformance("credentials_login_error"),
      warnings: [`Falha ao abrir login: ${error.message}`]
    };
  }

  const loginHtml = loginPage.html || "";
  const actionUrl = parseLoginAction(loginHtml);
  const hidden = parseHiddenInputs(loginHtml);

  const candidatePayloads = [
    { ...hidden, username: email, password },
    { ...hidden, email, password },
    { ...hidden, login: email, password },
    { ...hidden, usuario: email, senha: password },
    { ...hidden, username: email, senha: password }
  ];

  const candidateUrls = [...new Set([
    actionUrl,
    "https://cursos.alura.com.br/signin",
    "https://cursos.alura.com.br/login",
    "https://cursos.alura.com.br/loginForm"
  ])];

  let dashboardText = "";
  let loginBlocked = false;
  let lastStatus = null;

  for (const url of candidateUrls) {
    for (const payload of candidatePayloads) {
      try {
        const body = new URLSearchParams(payload);
        const post = await fetchWithJar(url, jar, {
          method: "POST",
          redirect: "manual",
          headers: {
            "content-type": "application/x-www-form-urlencoded",
            "origin": "https://cursos.alura.com.br",
            "referer": loginUrl
          },
          body
        });

        lastStatus = post.status;

        if (post.location) {
          await fetchWithJar(post.location, jar, { method: "GET", redirect: "manual", headers: { referer: url } });
        }

        const dashboard = await fetchWithJar("https://cursos.alura.com.br/dashboard", jar, { method: "GET", redirect: "follow" });
        dashboardText = htmlToText(dashboard.html);

        if (looksLikeBlockedLogin(dashboardText) || looksLikeBlockedLogin(post.html)) loginBlocked = true;

        if (dashboard.ok && !looksLikeLoginPage(dashboardText) && dashboardText.length > 200) {
          const urls = String(process.env.ALURA_PRIVATE_URLS || DEFAULT_PRIVATE_URLS.join(","))
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);

          const texts = [dashboardText];

          for (const privateUrl of urls.filter((item) => !/dashboard\/?$/i.test(item))) {
            try {
              const page = await fetchWithJar(privateUrl, jar, { method: "GET", redirect: "follow" });
              const text = htmlToText(page.html);
              if (!page.ok) warnings.push(`Página privada retornou HTTP ${page.status}: ${privateUrl}`);
              if (!looksLikeLoginPage(text)) texts.push(text);
            } catch (error) {
              warnings.push(`Falha ao ler página privada ${privateUrl}: ${error.message}`);
            }
          }

          const parsed = parsePrivateText(texts.join("\n"));
          return {
            ...parsed,
            status: parsed.status === "empty" ? "credentials_active_empty" : "active",
            mode: "credentials",
            message: parsed.inProgressCourses.length || parsed.officialCareers.length || parsed.performance?.status === "private_sync_ok"
              ? "Login privado via variáveis protegidas concluído. Dados de performance sanitizados enviados ao Learning OS."
              : "Login privado via variáveis protegidas funcionou, mas o HTML atual não expôs progresso privado legível.",
            syncedAt: new Date().toISOString(),
            warnings
          };
        }
      } catch (error) {
        warnings.push(`Tentativa de login falhou sem expor credenciais: ${error.message}`);
      }
    }
  }

  return {
    status: loginBlocked ? "credentials_login_blocked" : "credentials_login_failed",
    mode: "credentials",
    message: loginBlocked
      ? "A Alura exigiu verificação humana/captcha ou bloqueou login automático. A sincronização pública continua ativa."
      : "E-mail e senha foram lidos das variáveis privadas, mas o servidor não conseguiu concluir o login automático na Alura.",
    syncedAt: new Date().toISOString(),
    inProgressCourses: [],
    officialCareers: [],
    performance: emptyPerformance(loginBlocked ? "captcha_or_verification_required" : "credentials_login_failed"),
    warnings: [
      `Último status HTTP de login: ${lastStatus || "indisponível"}.`,
      ...warnings.slice(0, 8)
    ]
  };
}

function looksLikeLoginPage(text = "") {
  const normalized = normalize(text);
  return normalized.includes("faca seu login") || normalized.includes("email senha entrar") || normalized.includes("esqueceu sua senha");
}

function classifyPrivateArea(title = "") {
  const normalized = normalize(title);
  const rules = [
    ["IA", ["ia", "inteligencia artificial", "langchain", "langgraph", "rag", "llm", "agente", "machine learning", "deep learning", "nlp", "pytorch", "hugging face"]],
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

function parsePrivateText(text = "") {
  const lines = String(text)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const inProgressCourses = [];
  const officialCareers = [];

  const forbidden = [
    "entrar", "senha", "email", "matricula", "alura", "sobre a alura", "dúvidas", "duvidas", "blog", "faq"
  ];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalized = normalize(line);
    if (line.length > 180 || forbidden.some((term) => normalized === normalize(term))) continue;

    const percentMatch = line.match(/(.{4,150}?)(?:\s+|:|-)(100|[1-9]?\d)%/);
    if (percentMatch) {
      const title = percentMatch[1]
        .replace(/progresso|continuar|curso|carreira/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
      const progress = safePercent(percentMatch[2]);

      if (title.length >= 4 && progress !== null) {
        if (/carreira/i.test(line) || /carreira/i.test(lines[Math.max(0, index - 1)] || "")) {
          officialCareers.push(sanitizeCareer({ name: title, progress, area: classifyPrivateArea(title) }, index));
        } else {
          inProgressCourses.push(sanitizeCourse({ title, progress, area: classifyPrivateArea(title) }, index));
        }
      }
      continue;
    }

    const next = lines[index + 1] || "";
    const nextPercent = next.match(/^(100|[1-9]?\d)%$/);
    if (nextPercent && line.length >= 4 && line.length <= 150) {
      const progress = safePercent(nextPercent[1]);
      if (/carreira/i.test(line)) officialCareers.push(sanitizeCareer({ name: line, progress, area: classifyPrivateArea(line) }, index));
      else inProgressCourses.push(sanitizeCourse({ title: line, progress, area: classifyPrivateArea(line) }, index));
    }
  }

  const performance = parseAluraPerformance(text);

  return sanitizePrivateProgress({
    status: inProgressCourses.length || officialCareers.length || performance.status === "private_sync_ok" ? "active" : "empty",
    mode: "session-cookie",
    message: inProgressCourses.length || officialCareers.length || performance.status === "private_sync_ok"
      ? "Dados privados lidos de sessão protegida da Alura e sanitizados para o Learning OS."
      : "Sessão protegida acessou a Alura, mas nenhum progresso privado foi identificado no HTML atual.",
    inProgressCourses,
    officialCareers,
    performance
  });
}

async function parseCookieMode() {
  const cookie = process.env.ALURA_SESSION_COOKIE;
  if (!cookie) return null;

  const urls = String(process.env.ALURA_PRIVATE_URLS || DEFAULT_PRIVATE_URLS.join(","))
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  const warnings = [];
  const texts = [];
  let loginDetected = false;

  for (const url of urls) {
    try {
      const page = await fetchWithCookie(url, cookie);
      const text = htmlToText(page.html);
      if (!page.ok) warnings.push(`Página privada retornou HTTP ${page.status}: ${url}`);
      if (looksLikeLoginPage(text)) loginDetected = true;
      texts.push(text);
    } catch (error) {
      warnings.push(`Falha ao ler página privada ${url}: ${error.message}`);
    }
  }

  if (loginDetected) {
    return {
      status: "session_expired",
      mode: "session-cookie",
      message: "ALURA_SESSION_COOKIE configurado, mas a Alura retornou tela de login. Renove o cookie de sessão.",
      syncedAt: new Date().toISOString(),
      inProgressCourses: [],
      officialCareers: [],
      performance: emptyPerformance("session_expired"),
      warnings: ["Sessão privada expirada ou inválida.", ...warnings]
    };
  }

  const parsed = parsePrivateText(texts.join("\n"));
  return {
    ...parsed,
    warnings: [...(parsed.warnings || []), ...warnings],
    syncedAt: new Date().toISOString()
  };
}

async function runPrivateProgressSync() {
  if (process.env.ALURA_PRIVATE_SYNC !== "true") {
    return {
      status: "waiting_private_session",
      mode: "disabled",
      message: "Sincronização privada preparada, mas desativada. Defina ALURA_PRIVATE_SYNC=true para habilitar.",
      syncedAt: null,
      inProgressCourses: [],
      officialCareers: [],
      performance: emptyPerformance("waiting_private_session"),
      warnings: []
    };
  }

  const jsonMode = parseJsonEnv();
  if (jsonMode) return jsonMode;

  const authMode = String(process.env.ALURA_AUTH_MODE || "").toLowerCase();
  const hasCredentials = Boolean(process.env.ALURA_EMAIL && process.env.ALURA_PASSWORD);

  if (authMode === "credentials" && hasCredentials) {
    const credentialMode = await tryCredentialsLogin();
    if (credentialMode) return credentialMode;
  }

  const cookieMode = await parseCookieMode();
  if (cookieMode) return cookieMode;

  if (hasCredentials) {
    const credentialMode = await tryCredentialsLogin();
    if (credentialMode) return credentialMode;
  }

  return {
    status: "waiting_private_session",
    mode: "not-configured",
    message: "Sincronização privada preparada, mas sem ALURA_SESSION_COOKIE ou ALURA_PRIVATE_PROGRESS_JSON configurado.",
    syncedAt: null,
    inProgressCourses: [],
    officialCareers: [],
    warnings: []
  };
}

module.exports = {
  runPrivateProgressSync,
  sanitizePrivateProgress
};
