
"use strict";

const DASHBOARD_API_BASE = "https://www.alura.com.br/api/dashboard";

const DASHBOARD_HEADERS = {
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36 MPaivaLearningOSDashboardApi/1.1",
  accept: "application/json,text/plain;q=0.9,*/*;q=0.8",
  "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  referer: "https://www.alura.com.br/"
};

function normalize(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text = "") {
  return normalize(text).replace(/\s+/g, "-") || "item";
}

function parseNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : null;
}

function parsePercent(value) {
  const number = parseNumber(value);
  if (number === null) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function safeAluraUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return null;
  try {
    const resolved = new URL(value, "https://www.alura.com.br").toString();
    return /^https:\/\/(cursos|www)\.alura\.com\.br\//i.test(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function cleanSecretLikeValue(value = "") {
  return String(value || "")
    .trim()
    .replace(/^['"]|['"]$/g, "")
    .trim();
}

function normalizeDashboardToken(value = "") {
  let token = cleanSecretLikeValue(value);
  token = token.replace(/^ALURA_DASHBOARD_API_TOKEN\s*=\s*/i, "").trim();
  token = token.replace(/^ALURA_DASHBOARD_API_URL\s*=\s*/i, "").trim();

  const urlMatch = token.match(/\/api\/dashboard\/([^\s?#"']+)/i);
  if (urlMatch) token = urlMatch[1];

  token = token.replace(/^['"]|['"]$/g, "").trim();
  return token;
}

function dashboardStatusForHttp(statusCode) {
  if (statusCode === 401 || statusCode === 403) return "auth_blocked_by_alura";
  if (statusCode === 404) return "not_found";
  return "http_error";
}

function dashboardWarningForStatus(statusCode) {
  if (statusCode === 401 || statusCode === 403) {
    return "API Dashboard protegida pela Alura. Usando sincronização privada como fallback quando disponível.";
  }
  if (statusCode === 404) {
    return "API Dashboard não encontrada. Verifique se o token/link da Alura continua válido.";
  }
  return `API Dashboard retornou HTTP ${statusCode}.`;
}

function buildDashboardApiCandidates() {
  const explicitUrl = cleanSecretLikeValue(process.env.ALURA_DASHBOARD_API_URL);
  const token = normalizeDashboardToken(process.env.ALURA_DASHBOARD_API_TOKEN || process.env.ALURA_DASHBOARD_API_URL);
  const candidates = [];

  if (explicitUrl && /^https?:\/\//i.test(explicitUrl)) candidates.push(safeAluraUrl(explicitUrl));

  if (token) {
    const encoded = encodeURIComponent(token);
    candidates.push(`${DASHBOARD_API_BASE}/${encoded}`);
    candidates.push(`https://cursos.alura.com.br/api/dashboard/${encoded}`);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function buildDashboardApiUrl() {
  return buildDashboardApiCandidates()[0] || null;
}

function getDashboardApiConfig() {
  return {
    enabled: Boolean(cleanSecretLikeValue(process.env.ALURA_DASHBOARD_API_URL) || normalizeDashboardToken(process.env.ALURA_DASHBOARD_API_TOKEN)),
    hasUrl: Boolean(cleanSecretLikeValue(process.env.ALURA_DASHBOARD_API_URL)),
    hasToken: Boolean(normalizeDashboardToken(process.env.ALURA_DASHBOARD_API_TOKEN)),
    candidateCount: buildDashboardApiCandidates().length,
    secretExposed: false
  };
}

function parseDashboardText(raw = "") {
  const text = String(raw || "").trim();
  if (!text) {
    const error = new Error("empty_response");
    error.code = "empty_response";
    throw error;
  }

  const normalized = text.replace(/^﻿/, "").replace(/^\)\]\}',?\s*/, "").trim();
  return JSON.parse(normalized);
}

async function fetchDashboardJson(timeoutMs = 12000) {
  const candidates = buildDashboardApiCandidates();
  if (!candidates.length) {
    return {
      ok: false,
      status: "not_configured",
      statusCode: null,
      data: null,
      warning: "API Dashboard da Alura não configurada."
    };
  }

  const attempts = [];

  for (const url of candidates) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: DASHBOARD_HEADERS,
        redirect: "follow",
        signal: controller.signal
      });

      const contentType = response.headers.get("content-type") || "";
      const text = await response.text();
      const bodyPreview = String(text || "").trim().slice(0, 140);

      if (!response.ok) {
        attempts.push({
          ok: false,
          status: dashboardStatusForHttp(response.status),
          statusCode: response.status,
          contentType,
          warning: dashboardWarningForStatus(response.status)
        });
        continue;
      }

      try {
        return {
          ok: true,
          status: "dashboard_api_ok",
          statusCode: response.status,
          contentType,
          data: parseDashboardText(text),
          warning: null,
          attempts: attempts.length + 1
        };
      } catch (error) {
        attempts.push({
          ok: false,
          status: error.code === "empty_response" ? "empty_response" : "invalid_json",
          statusCode: response.status,
          contentType,
          warning: error.code === "empty_response"
            ? "API Dashboard respondeu sem conteúdo. Mantendo fallback público/privado ativo."
            : `API Dashboard não retornou JSON válido. Mantendo fallback público/privado ativo: ${error.message}`,
          preview: bodyPreview ? `[prévia sanitizada: ${bodyPreview.replace(/[A-Za-z0-9_-]{24,}/g, "[oculto]")}]` : null
        });
        continue;
      }
    } catch (error) {
      attempts.push({
        ok: false,
        status: error.name === "AbortError" ? "timeout" : "fetch_error",
        statusCode: null,
        contentType: null,
        warning: `Falha ao consultar API Dashboard: ${error.message}`
      });
    } finally {
      clearTimeout(timeout);
    }
  }

  const last = attempts.at(-1) || {};
  const uniqueWarnings = [...new Set(attempts.map((attempt) => attempt.warning).filter(Boolean))];
  return {
    ok: false,
    status: last.status || "dashboard_api_unavailable",
    statusCode: last.statusCode ?? null,
    contentType: last.contentType || null,
    data: null,
    warning: uniqueWarnings.join(" ") || "API Dashboard indisponível no momento.",
    attempts: attempts.length
  };
}

function deepValuesByKey(input, keyRegex, out = []) {
  if (!input || typeof input !== "object") return out;

  if (Array.isArray(input)) {
    input.forEach((item) => deepValuesByKey(item, keyRegex, out));
    return out;
  }

  for (const [key, value] of Object.entries(input)) {
    if (keyRegex.test(String(key))) out.push(value);
    if (value && typeof value === "object") deepValuesByKey(value, keyRegex, out);
  }
  return out;
}

function firstNumberByKey(input, keyRegex) {
  const values = deepValuesByKey(input, keyRegex);
  for (const value of values) {
    const number = parseNumber(value);
    if (number !== null) return number;
  }
  return null;
}

function extractArray(data, candidates) {
  for (const path of candidates) {
    const value = path.split(".").reduce((acc, part) => acc && acc[part], data);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function findCourseProgress(data) {
  const direct = extractArray(data, [
    "courseProgress",
    "coursesProgress",
    "courses",
    "course_progress",
    "dashboard.courseProgress",
    "dashboard.courses",
    "data.courseProgress",
    "data.courses",
    "user.courseProgress"
  ]);
  if (direct.length) return direct;

  const found = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      const plausible = value.filter((item) => item && typeof item === "object" && (item.slug || item.name || item.courseName || item.title) && ("progress" in item || "finished" in item || "lastAccessTime" in item || "readyToFinish" in item));
      if (plausible.length >= 2) found.push(...plausible);
      value.forEach(visit);
      return;
    }
    Object.values(value).forEach(visit);
  };
  visit(data);
  return found;
}

function findGuides(data) {
  const direct = extractArray(data, [
    "guides",
    "learningGuides",
    "degrees",
    "formations",
    "dashboard.guides",
    "data.guides",
    "user.guides"
  ]);
  if (direct.length) return direct;

  const found = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      const plausible = value.filter((item) => item && typeof item === "object" && (item.kind || item.totalCourses || item.finishedCourses) && (item.name || item.title || item.code || item.url));
      if (plausible.length >= 1) found.push(...plausible);
      value.forEach(visit);
      return;
    }
    Object.values(value).forEach(visit);
  };
  visit(data);
  return found;
}

function normalizeCourse(input = {}, index = 0) {
  const title = String(input.name || input.title || input.courseName || input.course || input.label || "").replace(/\s+/g, " ").trim();
  const courseSlug = String(input.slug || input.courseSlug || input.code || input.courseCode || "").trim() || null;
  if (!title && !courseSlug) return null;

  const progress = parsePercent(input.progress ?? input.percentage ?? input.percentual ?? input.conclusionPercentage ?? input.finishedPercentage) ?? 0;
  const finished = input.finished === true || input.completed === true || input.done === true || progress >= 100;
  const status = finished ? "completed" : progress > 0 ? "in_progress" : "started";
  const courseUrl = safeAluraUrl(input.url || input.link || input.courseUrl || (courseSlug ? `https://cursos.alura.com.br/course/${courseSlug}` : null));

  return {
    id: input.id || courseSlug || slugify(title) || `dashboard-course-${index + 1}`,
    title: title || courseSlug,
    courseSlug,
    courseUrl,
    progress,
    finished,
    readyToFinish: Boolean(input.readyToFinish),
    status,
    lastAccess: input.lastAccessTime || input.lastAccess || input.updatedAt || input.lastAccessAt || null,
    startedAt: input.startedAt || null,
    completedAt: input.finishedAt || input.completedAt || null,
    hours: parseNumber(input.hours ?? input.workload ?? input.estimatedHours) ?? null,
    area: input.area || input.category || null,
    source: "dashboard-api",
    confidence: "private-dashboard-api",
    order: Number(input.order || index + 1)
  };
}

function guideKindToType(kind = "", url = "") {
  const normalized = normalize(`${kind} ${url}`);
  if (normalized.includes("career") || normalized.includes("carreira") || String(url).includes("/carreiras/")) return "career";
  if (normalized.includes("degree") || normalized.includes("formacao") || normalized.includes("formation") || String(url).includes("/formacao")) return "formation";
  return "formation";
}

function normalizeGuide(input = {}, index = 0) {
  const name = String(input.name || input.title || input.label || input.code || "").replace(/\s+/g, " ").trim();
  if (!name) return null;

  const totalCourses = parseNumber(input.totalCourses ?? input.coursesTotal ?? input.total) ?? 0;
  const finishedCourses = parseNumber(input.finishedCourses ?? input.completedCourses ?? input.doneCourses ?? input.finished) ?? 0;
  const progress = totalCourses ? Math.round((finishedCourses / totalCourses) * 100) : parsePercent(input.progress) ?? 0;
  const kind = String(input.kind || input.type || "").trim();
  const url = safeAluraUrl(input.url || input.link || input.guideUrl || input.path || null);
  const type = guideKindToType(kind, url || "");

  return {
    id: input.id || input.code || slugify(name) || `dashboard-guide-${index + 1}`,
    code: input.code || null,
    name,
    title: name,
    kind: kind || null,
    type,
    url,
    totalCourses,
    finishedCourses,
    progress: Math.max(0, Math.min(100, progress)),
    status: progress >= 100 ? "completed" : progress > 0 ? "started" : "not_started",
    lastAccess: input.lastAccessTime || input.lastAccess || input.updatedAt || null,
    color: input.color || null,
    author: input.author || null,
    source: "dashboard-api",
    confidence: "private-dashboard-api",
    order: Number(input.order || index + 1)
  };
}

function buildPerformance(data, normalizedCourses = []) {
  const completedFromCourses = normalizedCourses.filter((course) => course.finished || course.status === "completed").length;

  const performance = {
    ranking30Days: firstNumberByKey(data, /ranking.*30|rank.*30|position.*30|posicao.*30/i),
    points: firstNumberByKey(data, /points|pontos|score|pontuacao/i),
    completedCoursesDashboard: firstNumberByKey(data, /completedCoursesDashboard|completedCourses|finishedCourses|cursosConcluidos|cursos_concluidos/i) ?? (completedFromCourses || null),
    resolvedExercises: firstNumberByKey(data, /resolvedExercises|exercisesResolved|exerciciosResolvidos|exercicios|exercises/i),
    resolvedForumTopics: firstNumberByKey(data, /resolvedForumTopics|forumTopicsResolved|topicosResolvidos|topicsResolved|topicos/i),
    forumPosts: firstNumberByKey(data, /forumPosts|postsForum|postsNoForum|posts/i),
    status: "dashboard_api_ok",
    source: "dashboard-api",
    confidence: "private"
  };

  return performance;
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

async function runDashboardApiSync() {
  const config = getDashboardApiConfig();
  if (!config.enabled) {
    return {
      ...config,
      status: "not_configured",
      ok: false,
      syncedAt: null,
      courses: [],
      completedCourses: [],
      inProgressCourses: [],
      guides: [],
      performance: null,
      warnings: []
    };
  }

  const fetched = await fetchDashboardJson();
  if (!fetched.ok) {
    return {
      ...config,
      status: fetched.status,
      ok: false,
      statusCode: fetched.statusCode,
      syncedAt: new Date().toISOString(),
      courses: [],
      completedCourses: [],
      inProgressCourses: [],
      guides: [],
      performance: null,
      warnings: [fetched.warning].filter(Boolean)
    };
  }

  const courses = uniqueBy(findCourseProgress(fetched.data).map(normalizeCourse).filter(Boolean), (course) => course.courseSlug || normalize(course.title));
  const completedCourses = courses.filter((course) => course.status === "completed");
  const inProgressCourses = courses.filter((course) => course.status !== "completed" && Number(course.progress || 0) > 0);
  const guides = uniqueBy(findGuides(fetched.data).map(normalizeGuide).filter(Boolean), (guide) => guide.id || normalize(guide.name));
  const performance = buildPerformance(fetched.data, courses);

  return {
    ...config,
    status: "dashboard_api_ok",
    ok: true,
    statusCode: fetched.statusCode,
    syncedAt: new Date().toISOString(),
    courses,
    completedCourses,
    inProgressCourses,
    guides,
    performance,
    warnings: []
  };
}

module.exports = {
  runDashboardApiSync,
  getDashboardApiConfig
};
