(() => {
  "use strict";

  const API_ENDPOINT = "/api/learning";
  const HEALTH_ENDPOINT = "/api/learning-health";
  const LOCAL_CACHE_KEY = "mpaiva_learning_os_cache_v1";
  const COURSE_FILTERS = ["Todos", "IA", "Tech", "Dados", "RH", "Liderança", "Gestão", "Automação", "Produto", "Complementares"];

  let learningData = null;
  let activeCourseFilter = "Todos";
  let courseSearchTerm = "";

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const safeText = (value) => String(value ?? "");
  const isAvailable = (value) => value !== null && value !== undefined && value !== "";

  function hasPerformanceData(performance = {}) {
    return [
      performance.ranking30Days,
      performance.points,
      performance.completedCoursesDashboard,
      performance.resolvedExercises,
      performance.resolvedForumTopics,
      performance.forumPosts
    ].some(isAvailable);
  }

  function formatInteger(value) {
    if (!isAvailable(value)) return "não disponível";
    const number = Number(value);
    if (!Number.isFinite(number)) return safeText(value);
    return new Intl.NumberFormat("pt-BR").format(number);
  }

  function formatMetric(value, options = {}) {
    if (!isAvailable(value)) return options.empty || "não disponível";
    if (options.kind === "hours") return `${formatInteger(value)}h`;
    if (options.kind === "ranking") return `${formatInteger(value)}º`;
    if (options.suffix) return `${formatInteger(value)}${options.suffix}`;
    return formatInteger(value);
  }

  function safeAluraUrl(url = "") {
    const value = String(url || "").trim();
    return /^https:\/\/(cursos|www)\.alura\.com\.br\//i.test(value) ? value : "";
  }

  function actionForLearningItem(item = {}) {
    const url = safeAluraUrl(item.primaryActionUrl || item.certificateUrl || item.fallbackUrl);
    if (!url) return null;

    const status = item.certificateStatus || "";
    const label = item.primaryActionLabel || (status === "available" ? "Ver certificado" : "Ver certificado completo");

    return {
      url,
      label,
      status,
      kind: item.primaryActionKind || "certificate"
    };
  }

  function certificateBadge(status = "") {
    const labels = {
      available: "certificado direto",
      available_dashboard_slug: "certificado oficial",
      available_profile_link: "certificado real",
      generated: "link estimado",
      fallback_full_certificate: "certificado completo",
      not_detected: "não detectado",
      not_available: "pendente"
    };
    return labels[status] || "certificado";
  }

  function performanceStatusLabel(status) {
    const labels = {
      dashboard_api_ok: "API Dashboard ativa",
      private_sync_ok: "sync privado ativo",
      private_data_unavailable: "aguardando dados privados",
      waiting_private_session: "aguardando sync privado",
      credentials_login_failed: "login privado pendente",
      credentials_login_blocked: "verificação solicitada",
      session_expired: "sessão expirada",
      empty_response: "API Dashboard sem dados",
      invalid_json: "API Dashboard em validação",
      http_error: "API Dashboard indisponível",
      auth_blocked_by_alura: "API protegida · fallback privado",
      not_found: "API Dashboard não encontrada",
      fetch_error: "API Dashboard offline",
      timeout: "API Dashboard sem resposta",
      not_configured: "API Dashboard não configurada"
    };
    return labels[status] || "sync em análise";
  }

  function privateStatusLabel(status) {
    const labels = {
      active: "privado ativo",
      empty: "privado sem dados",
      credentials_active_empty: "login ativo",
      waiting_private_session: "em espera segura",
      credentials_login_failed: "login pendente",
      credentials_login_blocked: "verificação humana",
      session_expired: "sessão expirada"
    };
    return labels[status] || "status monitorado";
  }

  function dashboardApiLabel(dashboardApi = {}, summary = {}) {
    const status = dashboardApi.status || summary.dashboardApiStatus;
    const labels = {
      dashboard_api_ok: "conectada",
      configured: "configurada",
      empty_response: "sem dados",
      invalid_json: "validando",
      http_error: "indisponível",
      auth_blocked_by_alura: "fallback privado",
      not_found: "não encontrada",
      fetch_error: "offline",
      timeout: "sem resposta",
      not_configured: "não configurada",
      dashboard_api_error: "em atenção"
    };
    return labels[status] || (dashboardApi.enabled || summary.dashboardApiEnabled ? "configurada" : "não configurada");
  }

  function sourceStatusLabel(sourceStatus) {
    const labels = { ok: "online", degraded: "degradada", error: "erro" };
    return labels[sourceStatus] || "monitorada";
  }

  const fallbackLearningData = {
    version: "local-fallback",
    mode: "Learning OS / fallback local",
    source: {
      syncedAt: new Date().toISOString(),
      sourceStatus: "offline-fallback",
      durationMs: 0,
      confidence: {
        confirmed: "Exemplo local para visualização offline",
        estimated: "Estimativa local sem API ativa",
        private: "Privado em espera"
      }
    },
    summary: {
      totalCompletedCourses: 0,
      totalCompletedHours: 0,
      totalTracks: 0,
      careersStarted: 0,
      careersCompleted: 0,
      coursesInProgress: 0,
      officialCareersMapped: 0,
      privateSyncStatus: "waiting_private_session",
      strongestArea: "Aguardando API",
      noOpenAiCost: true
    },
    certificate: {
      courses: [],
      tracks: [],
      complementary: []
    },
    careers: [],
    recommendation: {
      title: "Ativar API /api/learning no deploy",
      area: "Sistema",
      reason: "Abra o site em produção na Vercel para a leitura serverless do certificado público da Alura funcionar sem CORS.",
      impact: "Quando a API estiver online, os agentes calculam cursos, carreiras, lacunas e recomendações automaticamente."
    },
    skillRadar: [],
    timeline: [],
    projectMap: [],
    recruiterSummary: "Learning OS aguardando a API serverless para gerar resumo real.",
    linkedinTemplate: "Learning OS aguardando sincronização real para gerar texto.",
    privateProgress: {
      status: "waiting_private_session",
      message: "Dados privados não configurados.",
      inProgressCourses: [],
      officialCareers: []
    },
    agents: [
      "CertificateAgent",
      "AluraDashboardApiAgent",
      "CareerDiscoveryAgent",
      "PrivateProgressAgent",
      "AluraPerformanceAgent",
      "CourseNormalizerAgent",
      "CourseClassifierAgent",
      "CareerMatcherAgent",
      "ProgressCalculatorAgent",
      "MissingCoursesAgent",
      "NextCourseAgent",
      "SkillRadarAgent",
      "ProjectConnectionAgent",
      "RecruiterModeAgent",
      "TechnicalModeAgent",
      "TimelineAgent",
      "LinkedInPostAgent",
      "PdfExportAgent",
      "SyncHealthAgent",
      "DataQualityAgent",
      "LearningOrchestratorAgent"
    ].map((name) => ({ name, status: "offline-fallback", provider: "rules/no-openai", cost: "zero" })),
    dataQuality: {
      warnings: ["API serverless indisponível no ambiente local ou estático."]
    }
  };

  function formatDateTime(value) {
    if (!value) return "sem data";
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short"
      }).format(new Date(value));
    } catch (error) {
      return "sem data";
    }
  }

  function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, Number(value) || 0));
  }

  function saveCache(data) {
    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify({ storedAt: Date.now(), data }));
    } catch (error) {
      // cache opcional
    }
  }

  function readCache() {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.data || null;
    } catch (error) {
      return null;
    }
  }

  async function fetchLearningData() {
    const response = await fetch(API_ENDPOINT, {
      headers: { accept: "application/json" }
    });

    if (!response.ok) throw new Error(`API respondeu ${response.status}`);
    return response.json();
  }

  async function fetchHealth() {
    try {
      const response = await fetch(HEALTH_ENDPOINT, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("health offline");
      return response.json();
    } catch (error) {
      return null;
    }
  }

  function setSyncStatus(kind, title, detail) {
    const dot = $("#learning-sync-dot");
    const status = $("#learning-sync-status");
    const description = $("#learning-sync-detail");

    if (dot) {
      dot.classList.remove("is-green", "is-yellow", "is-red");
      dot.classList.add(kind === "ok" ? "is-green" : kind === "warn" ? "is-yellow" : "is-red");
    }

    if (status) status.textContent = title;
    if (description) description.textContent = detail;
  }

  function renderAlert(data) {
    const alert = $("#learning-alert");
    if (!alert) return;

    const warnings = data?.dataQuality?.warnings || [];
    const privateStatus = data?.privateProgress?.status;
    const hasPrivateWarning = ["waiting_private_session", "needs_session_cookie", "session_expired", "credentials_login_failed", "credentials_login_blocked", "credentials_login_error", "error"].includes(privateStatus);

    if (!warnings.length && !hasPrivateWarning) {
      alert.hidden = true;
      alert.innerHTML = "";
      return;
    }

    const dashboardAuthFallback = warnings.some((warning) => /API Dashboard protegida|HTTP 401|HTTP 403/i.test(String(warning)));
    const visibleWarnings = dashboardAuthFallback
      ? ["API Dashboard protegida pela Alura. O painel segue usando certificado público, sincronização privada e fallback seguro."]
      : warnings.slice(0, 2);

    alert.hidden = false;
    alert.innerHTML = `
      <strong>Observação operacional</strong>
      <span>${hasPrivateWarning ? safeText(data?.privateProgress?.message || "Sincronização privada aguardando sessão protegida.") + " " : ""}${visibleWarnings.join(" ")}</span>
    `;
  }

  function renderStats(data) {
    const grid = $("#learning-stats-grid");
    if (!grid) return;

    const summary = data.summary || {};
    const performance = data.performance || data.privateProgress?.performance || {};
    const duration = data.source?.durationMs || 0;
    const syncDate = formatDateTime(data.source?.syncedAt).split(",")[0];
    const privateStatus = privateStatusLabel(summary.privateSyncStatus || data.privateProgress?.status);
    const performanceStatus = performanceStatusLabel(performance.status || summary.performanceSyncStatus);

    const dashboardApi = data.dashboardApi || data.source?.dashboardApi || {};
    const publicSourceLabel = sourceStatusLabel(data.source?.sourceStatus);
    const dashboardLabel = dashboardApiLabel(dashboardApi, summary);
    const metricsSource = performance.source === "dashboard-api" ? "dashboard-api" : (hasPerformanceData(performance) ? "privado" : "em espera");
    const paidAiLabel = summary.noOpenAiCost ? "não usada" : "externa";

    const groups = [
      {
        title: "Resumo Learning OS",
        subtitle: "certificado público + agentes locais",
        items: [
          { label: "cursos concluídos", value: formatMetric(summary.totalCompletedCourses), detail: "certificado público", tone: "strong" },
          { label: "horas mapeadas", value: formatMetric(summary.totalCompletedHours, { kind: "hours" }), detail: `${formatInteger(summary.totalTracks ?? 0)} trilhas/formações`, tone: "strong" },
          { label: "carreiras iniciadas", value: formatMetric(summary.careersStarted), detail: `${formatInteger(summary.careersCompleted ?? 0)} concluída(s)`, tone: "strong" },
          { label: "em andamento", value: formatMetric(summary.coursesInProgress ?? 0), detail: `${formatInteger(summary.officialCareersMapped ?? 0)} carreira(s) oficial(is)`, tone: Number(summary.coursesInProgress || 0) ? "strong" : "muted" },
          { label: "agentes ativos", value: formatMetric(data.agents?.length ?? 21), detail: summary.noOpenAiCost ? "sem OpenAI pago" : "provider externo", tone: "strong" },
          { label: "área mais forte", value: summary.strongestArea || "em análise", detail: "radar automático", tone: "strong" }
        ]
      },
      {
        title: "Performance Alura",
        subtitle: performanceStatus,
        items: [
          { label: "ranking 30 dias", value: formatMetric(performance.ranking30Days, { kind: "ranking", empty: "em espera" }), detail: "desempenho recente", tone: isAvailable(performance.ranking30Days) ? "strong" : "muted" },
          { label: "pontos acumulados", value: formatMetric(performance.points, { empty: "em espera" }), detail: "pontuação Alura", tone: isAvailable(performance.points) ? "strong" : "muted" },
          { label: "cursos na Alura", value: formatMetric(performance.completedCoursesDashboard, { empty: "em espera" }), detail: "dashboard logado", tone: isAvailable(performance.completedCoursesDashboard) ? "strong" : "muted" },
          { label: "exercícios", value: formatMetric(performance.resolvedExercises, { empty: "em espera" }), detail: "prática resolvida", tone: isAvailable(performance.resolvedExercises) ? "strong" : "muted" },
          { label: "tópicos fórum", value: formatMetric(performance.resolvedForumTopics, { empty: "em espera" }), detail: "resoluções no fórum", tone: isAvailable(performance.resolvedForumTopics) ? "strong" : "muted" },
          { label: "posts fórum", value: formatMetric(performance.forumPosts, { empty: "em espera" }), detail: "participação", tone: isAvailable(performance.forumPosts) ? "strong" : "muted" }
        ]
      },
      {
        title: "Status operacional",
        subtitle: "serverless protegido",
        items: [
          { label: "fonte pública", value: publicSourceLabel, detail: "certificado público", tone: publicSourceLabel === "online" ? "strong" : "muted" },
          { label: "sync privado", value: privateStatus, detail: "credenciais no servidor", tone: privateStatus.includes("ativo") || privateStatus.includes("login") ? "strong" : "muted" },
          { label: "API Dashboard", value: dashboardLabel, detail: summary.profileCertificateLinks ? `${formatInteger(summary.profileCertificateLinks)} certificados reais` : (dashboardApi.hasToken || summary.dashboardApiEnabled ? "token protegido" : "fonte opcional"), tone: ["conectada", "configurada", "fallback privado"].includes(dashboardLabel) ? "strong" : "muted" },
          { label: "métricas", value: metricsSource, detail: "performance Alura", tone: metricsSource !== "em espera" ? "strong" : "muted" },
          { label: "serverless", value: "protegido", detail: `${formatInteger(duration)}ms na última sync`, tone: "strong" },
          { label: "IA paga", value: paidAiLabel, detail: "rules/no-openai", tone: summary.noOpenAiCost ? "strong" : "muted" }
        ]
      }
    ];

    grid.innerHTML = groups.map((group) => `
      <section class="learning-metric-group">
        <div class="learning-metric-group-head">
          <span>${safeText(group.title)}</span>
          <small>${safeText(group.subtitle)}</small>
        </div>
        <div class="learning-metric-grid">
          ${group.items.map((stat) => `
            <article class="learning-stat-card ${stat.tone === "muted" ? "is-muted" : ""}">
              <span>${safeText(stat.label)}</span>
              <strong>${safeText(stat.value)}</strong>
              <small>${safeText(stat.detail)}</small>
            </article>
          `).join("")}
        </div>
      </section>
    `).join("");
  }

  function renderRecommendation(data) {
    const recommendation = data.recommendation || {};
    const title = $("#learning-next-course-title");
    const reason = $("#learning-next-course-reason");
    const impact = $("#learning-next-course-impact");
    const area = $("#learning-recommendation-area");

    if (title) title.textContent = recommendation.title || "Sem recomendação disponível";
    if (reason) reason.textContent = recommendation.reason || "O agente não encontrou lacunas suficientes.";
    if (impact) impact.textContent = recommendation.impact || "Impacto em análise";
    if (area) area.textContent = recommendation.area || recommendation.career || "radar";
  }

  function renderSkillRadar(data) {
    const container = $("#learning-skill-radar");
    if (!container) return;

    const skills = data.skillRadar || [];
    if (!skills.length) {
      container.innerHTML = `<p class="learning-empty">Radar será preenchido após sincronização real.</p>`;
      return;
    }

    container.innerHTML = skills.slice(0, 8).map((skill) => {
      const score = clamp(skill.score);
      return `
        <div class="learning-bar-row">
          <div class="learning-bar-info">
            <strong>${safeText(skill.area)}</strong>
            <span>${safeText(skill.label)} · ${safeText(skill.hours)}h</span>
          </div>
          <div class="learning-bar-track" aria-label="${safeText(skill.area)} ${score}%">
            <span style="width:${score}%"></span>
          </div>
          <em>${score}%</em>
        </div>
      `;
    }).join("");
  }

  function renderProjectMap(data) {
    const container = $("#learning-project-map");
    if (!container) return;

    const projects = data.projectMap || [];
    if (!projects.length) {
      container.innerHTML = `<p class="learning-empty">Conexão com projetos será exibida após sincronização.</p>`;
      return;
    }

    container.innerHTML = projects.map((project) => `
      <article class="learning-project-card">
        <span>${safeText(project.score)}%</span>
        <h4>${safeText(project.name)}</h4>
        <p>${safeText(project.text)}</p>
        <small>${(project.relatedSkills || []).map(safeText).join(" · ")}</small>
      </article>
    `).join("");
  }

  function renderTimeline(data) {
    const container = $("#learning-timeline");
    if (!container) return;

    const items = data.timeline || [];
    if (!items.length) {
      container.innerHTML = `<p class="learning-empty">Timeline será criada quando houver cursos sincronizados.</p>`;
      return;
    }

    container.innerHTML = items.slice(-8).map((item) => `
      <article class="learning-timeline-card">
        <span>${safeText(item.label)}</span>
        <strong>${safeText(item.mainArea)}</strong>
        <small>${safeText(item.courses)} curso(s) · ${safeText(item.hours)}h</small>
      </article>
    `).join("");
  }

  function renderCareers(data) {
    const grid = $("#learning-careers-grid");
    if (!grid) return;

    const careers = data.careers || [];
    if (!careers.length) {
      grid.innerHTML = `<p class="learning-empty">Carreiras serão exibidas após sincronização.</p>`;
      return;
    }

    grid.innerHTML = careers.map((career) => {
      const progress = clamp(career.progress);
      const missing = (career.missing || []).slice(0, 5).map((course) => `<li>${safeText(course.title)}</li>`).join("");
      const officialBadge = career.officialSource === "private"
        ? `<span class="learning-private-badge">oficial Alura: ${clamp(career.officialProgress)}% · ${safeText(career.officialStatus)}</span>`
        : "";
      const levels = (career.levels || []).map((level) => `
        <div class="learning-level-chip">
          <span>${safeText(level.name)}</span>
          <strong>${clamp(level.progress)}%</strong>
        </div>
      `).join("");

      return `
        <article class="learning-career-card">
          <div class="learning-career-head">
            <div>
              <span>${safeText(career.area)} · ${safeText(career.sourceMode || "mapped")}</span>
              <h3>${safeText(career.name)}</h3>
            </div>
            <strong>${progress}%</strong>
          </div>

          <div class="learning-progress-track" aria-label="${safeText(career.name)} ${progress}%">
            <span style="width:${progress}%"></span>
          </div>

          <div class="learning-career-meta">
            <span>${safeText(career.completedCourses)}/${safeText(career.totalCourses)} cursos</span>
            <span>${safeText(career.completedHours || 0)}h/${safeText(career.totalHours || 0)}h</span>
            <span>${safeText(career.status)}</span>
          </div>
          ${officialBadge}

          <div class="learning-levels-grid">${levels}</div>

          <details class="learning-missing-details">
            <summary>Cursos faltantes detectados</summary>
            <ul>${missing || "<li>Nenhuma lacuna detectada.</li>"}</ul>
          </details>
        </article>
      `;
    }).join("");
  }

  function renderCourseFilters() {
    const container = $("#learning-course-filters");
    if (!container) return;

    container.innerHTML = COURSE_FILTERS.map((filter) => `
      <button type="button" class="hover-target learning-filter-button ${filter === activeCourseFilter ? "active" : ""}" data-course-filter="${safeText(filter)}">
        ${safeText(filter)}
      </button>
    `).join("");

    $$('[data-course-filter]', container).forEach((button) => {
      button.addEventListener("click", () => {
        activeCourseFilter = button.dataset.courseFilter || "Todos";
        renderCourseFilters();
        renderCoursesTable(learningData);
      });
    });
  }

  function renderCoursesTable(data) {
    const body = $("#learning-courses-body");
    if (!body) return;

    const completedCourses = (data?.certificate?.courses || []).map((course) => ({ ...course, visualStatus: "Concluído", visualDate: course.completedAt, visualOrigin: course.confidence || "confirmed" }));
    const privateCourses = (data?.privateProgress?.inProgressCourses || []).map((course) => ({
      ...course,
      hours: course.hours || "--",
      track: course.career || "curso em andamento",
      category: course.career || "private",
      area: course.area || "Complementares",
      visualStatus: `${course.status || "em andamento"}${Number(course.progress || 0) ? ` · ${course.progress}%` : ""}`,
      visualDate: course.lastAccess || "em andamento",
      visualOrigin: "private"
    }));
    const allCourses = [...privateCourses, ...completedCourses];
    const normalizedSearch = courseSearchTerm.toLowerCase().trim();

    const filtered = allCourses.filter((course) => {
      const matchesFilter = activeCourseFilter === "Todos" || course.area === activeCourseFilter;
      const matchesSearch = !normalizedSearch || `${course.title} ${course.area} ${course.track} ${course.category}`.toLowerCase().includes(normalizedSearch);
      return matchesFilter && matchesSearch;
    });

    if (!filtered.length) {
      body.innerHTML = `
        <tr>
          <td colspan="6" class="learning-empty-cell">Nenhum curso encontrado para esse filtro.</td>
        </tr>
      `;
      return;
    }

    body.innerHTML = filtered.map((course) => {
      const action = actionForLearningItem(course);
      const certificateAction = action
        ? `<a class="learning-action-button" href="${safeText(action.url)}" target="_blank" rel="noopener noreferrer" aria-label="${safeText(action.label)}: ${safeText(course.title)}">${safeText(action.label)}</a>`
        : `<span class="learning-action-muted">indisponível</span>`;
      const titleContent = action && (course.status === "completed" || course.visualStatus === "Concluído")
        ? `<a class="learning-course-title-link" href="${safeText(action.url)}" target="_blank" rel="noopener noreferrer">${safeText(course.title)}</a>`
        : `<strong>${safeText(course.title)}</strong>`;

      return `
        <tr class="${action ? "learning-course-row has-action" : "learning-course-row"}">
          <td>
            ${titleContent}
            <small>${safeText(course.typeLabel || "Curso Alura")} · ${safeText(course.track || course.category || "módulo técnico")}</small>
          </td>
          <td><span class="learning-area-pill">${safeText(course.area)}</span></td>
          <td>${safeText(course.hours)}${course.hours === "--" ? "" : "h"}</td>
          <td>${safeText(course.visualDate || course.completedAt)}</td>
          <td><span class="learning-certificate-badge">${safeText(certificateBadge(course.certificateStatus))}</span></td>
          <td>${certificateAction}</td>
        </tr>
      `;
    }).join("");
  }


  const AGENT_DISPLAY = {
    CertificateAgent: ["Leitor de Certificados", "Lê certificados, cursos e cargas horárias da Alura."],
    AluraDashboardApiAgent: ["Leitor da API Dashboard", "Usa a API Dashboard para buscar slugs oficiais, progresso e performance."],
    CareerDiscoveryAgent: ["Mapeador de Rotas", "Identifica carreiras, formações e rotas de especialização."],
    PrivateProgressAgent: ["Sincronizador Privado", "Busca dados privados quando há fonte protegida no servidor."],
    AluraPerformanceAgent: ["Performance Alura", "Lê ranking, pontos, cursos e exercícios quando disponíveis."],
    CourseNormalizerAgent: ["Organizador de Cursos", "Padroniza nomes e remove duplicidades."],
    CourseClassifierAgent: ["Classificador de Áreas", "Separa cursos por Tech, IA, Dados, RH, Liderança e Gestão."],
    CareerMatcherAgent: ["Comparador de Progresso", "Compara o que foi concluído com o que falta."],
    ProgressCalculatorAgent: ["Calculador de Evolução", "Calcula progresso por horas, cursos e níveis."],
    MissingCoursesAgent: ["Detector de Lacunas", "Mostra o que ainda falta para evoluir."],
    NextCourseAgent: ["Recomendador de Próximo Passo", "Sugere o próximo curso de maior impacto."],
    SkillRadarAgent: ["Radar de Competências", "Transforma aprendizado em mapa de competências."],
    ProjectConnectionAgent: ["Conector com Projetos Reais", "Relaciona estudo com upaiva.dev, FitPro, AgendaPro e Studio JM."],
    RecruiterModeAgent: ["Resumo para Recrutadores", "Gera leitura objetiva para oportunidades profissionais."],
    TechnicalModeAgent: ["Visão Técnica Detalhada", "Organiza dados técnicos, fontes e status."],
    TimelineAgent: ["Linha do Tempo Profissional", "Organiza a evolução por período."],
    LinkedInPostAgent: ["Destaque Profissional", "Cria textos-base para apresentar sua evolução."],
    PdfExportAgent: ["Exportador PDF", "Prepara resumo profissional para envio."],
    SyncHealthAgent: ["Monitor de Sincronização", "Verifica se fontes e rotas estão operacionais."],
    DataQualityAgent: ["Validador de Dados", "Detecta inconsistências e dados ausentes."],
    LearningOrchestratorAgent: ["Orquestrador Learning OS", "Coordena todos os agentes do painel."]
  };

  function agentDisplay(agent = {}) {
    const mapped = AGENT_DISPLAY[agent.name] || [agent.name || "Agente", "Automação inteligente do Learning OS."];
    return { title: mapped[0], description: mapped[1] };
  }

  function renderAgents(data, health) {
    const grid = $("#learning-agents-grid");
    const summary = $("#learning-agent-summary");
    const agentHealth = $("#learning-agent-health");
    if (!grid) return;

    const agents = data.agents || [];
    const active = agents.filter((agent) => agent.status === "active").length;
    const waiting = agents.filter((agent) => ["waiting_private_session", "needs_session_cookie", "session_expired", "credentials_login_failed", "credentials_login_blocked", "credentials_login_error"].includes(agent.status)).length;

    if (summary) {
      summary.innerHTML = `
        <span>${safeText(active)} ativos</span>
        <span>${safeText(waiting)} em espera segura</span>
        <span>OpenAI: não usado</span>
        <span>Ping: ${safeText(health?.ping || "local")}</span>
      `;
    }

    if (agentHealth) agentHealth.textContent = health?.ok ? "ping verde" : "degradado/local";

    grid.innerHTML = agents.map((agent) => {
      const display = agentDisplay(agent);
      return `
      <article class="learning-agent-card ${agent.status === "active" ? "is-active" : "is-waiting"}" title="ID interno: ${safeText(agent.name)}">
        <span></span>
        <strong>${safeText(display.title)}</strong>
        <small>${safeText(display.description)}</small>
        <em>${safeText(agent.status === "active" ? "Ativo · automação sem custo" : "Em espera segura")}</em>
      </article>
    `;
    }).join("");
  }

  function renderRecruiterMode(data) {
    const summary = $("#learning-recruiter-summary");
    const linkedin = $("#learning-linkedin-template");
    if (summary) summary.textContent = data.recruiterSummary || "Resumo em processamento.";
    if (linkedin) linkedin.textContent = data.linkedinTemplate || "Template em processamento.";
  }

  function bindTabs() {
    const tabs = $$('[data-learning-tab]');
    const panels = $$('[data-learning-panel]');

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.learningTab;
        tabs.forEach((item) => item.classList.toggle("active", item === tab));
        panels.forEach((panel) => panel.classList.toggle("hidden", panel.dataset.learningPanel !== target));
      });
    });
  }

  function bindSearch() {
    const input = $("#learning-course-search");
    if (!input) return;
    input.addEventListener("input", () => {
      courseSearchTerm = input.value || "";
      renderCoursesTable(learningData);
    });
  }

  function bindCopyLinkedIn() {
    const button = $("#learning-copy-linkedin");
    const text = $("#learning-linkedin-template");
    if (!button || !text) return;

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text.textContent || "");
        button.textContent = "Texto copiado";
        window.setTimeout(() => { button.textContent = "Copiar texto"; }, 1600);
      } catch (error) {
        button.textContent = "Copie manualmente";
      }
    });
  }

  function maybeScrollLearningRoute() {
    if (window.location.pathname.replace(/\/$/, "") !== "/learning") return;
    const section = $("#learning");
    if (!section) return;
    window.setTimeout(() => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 500);
  }

  function renderAll(data, health = null) {
    learningData = data;
    renderAlert(data);
    renderStats(data);
    renderRecommendation(data);
    renderSkillRadar(data);
    renderProjectMap(data);
    renderTimeline(data);
    renderCareers(data);
    renderCourseFilters();
    renderCoursesTable(data);
    renderAgents(data, health);
    renderRecruiterMode(data);
  }

  async function initLearningOS() {
    if (!$("#learning")) return;

    bindTabs();
    bindSearch();
    bindCopyLinkedIn();
    maybeScrollLearningRoute();

    setSyncStatus("warn", "sincronizando", "Consultando agentes serverless sem OpenAI key...");

    const cached = readCache();
    if (cached) {
      renderAll(cached);
      setSyncStatus("warn", "cache carregado", `Última sync conhecida: ${formatDateTime(cached.source?.syncedAt)}`);
    }

    try {
      const [data, health] = await Promise.all([fetchLearningData(), fetchHealth()]);
      saveCache(data);
      renderAll(data, health);
      setSyncStatus("ok", "sync ativo", `Atualizado em ${formatDateTime(data.source?.syncedAt)} · ${data.agents?.length || 0} agentes`);
    } catch (error) {
      const fallback = cached || fallbackLearningData;
      renderAll(fallback, null);
      setSyncStatus("error", "modo local", "API /api/learning indisponível neste ambiente; usando cache/fallback sem quebrar a página.");
    }
  }

  document.addEventListener("DOMContentLoaded", initLearningOS);
})();
