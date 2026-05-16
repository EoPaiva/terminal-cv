"use strict";

const CERTIFICATE_URL =
  process.env.ALURA_CERTIFICATE_URL ||
  "https://cursos.alura.com.br/user/mpaiiva21/fullCertificate/ff76f7f854b9406caa12231528651a92";

const ALURA_USER_SLUG =
  process.env.ALURA_USER_SLUG ||
  (CERTIFICATE_URL.match(/\/user\/([^/]+)/)?.[1]) ||
  "mpaiiva21";

const FULL_CERTIFICATE_URL = CERTIFICATE_URL;
const PUBLIC_PROFILE_URL = process.env.ALURA_PUBLIC_PROFILE_URL || `https://cursos.alura.com.br/user/${ALURA_USER_SLUG}/`;

const REQUEST_HEADERS = {
  "user-agent": "MPaivaLearningOS/1.0 (+https://upaiva.dev)",
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
};

const ENABLE_PUBLIC_CAREER_MERGE = process.env.ALURA_CAREER_DYNAMIC === "true";
const { runPrivateProgressSync } = require("./_learning-private.js");
const { runDashboardApiSync } = require("./_learning-dashboard-api.js");

const SOURCE_CONFIDENCE = {
  confirmed: "Confirmado pelo certificado público da Alura",
  estimated: "Estimado por comparação semântica e regras locais",
  private: "Privado: depende de sincronização protegida da conta logada"
};

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

function hasPerformanceData(performance = {}) {
  return [
    performance.ranking30Days,
    performance.points,
    performance.completedCoursesDashboard,
    performance.resolvedExercises,
    performance.resolvedForumTopics,
    performance.forumPosts
  ].some((value) => value !== null && value !== undefined);
}

function buildFallbackCoursesFromTracks(certificate = {}) {
  const tracks = Array.isArray(certificate.tracks) ? certificate.tracks : [];
  return tracks.map((track) => decorateCourse({
    id: track.id || normalize(track.title).replace(/\s+/g, "-"),
    title: track.title,
    startedAt: certificate.period?.start || null,
    completedAt: certificate.period?.end || null,
    hours: Number(track.hours || 0),
    status: "completed",
    track: track.title,
    category: track.area || classifyCourse(track.title),
    area: track.area || classifyCourse(track.title),
    confidence: "confirmed-track-fallback"
  }));
}

const CAREER_BLUEPRINTS = [
  {
    id: "engenharia-ia",
    name: "Engenharia de IA",
    area: "IA",
    priority: 100,
    url: "https://www.alura.com.br/carreiras/engenharia-de-ia",
    keywords: ["ia", "agente", "rag", "langchain", "langgraph", "python", "llm", "mcp", "bfa", "machine learning"],
    courses: [
      { title: "Carreira Engenharia de IA: Boas-vindas e primeiros passos", level: "Base", hours: 2 },
      { title: "Pensamento computacional: fundamentos da computação e lógica de programação", level: "Base", hours: 8 },
      { title: "Python: Inteligência Artificial Aplicada", level: "Base", hours: 12 },
      { title: "IA: explorando o potencial da inteligência artificial generativa", level: "Nível 1", hours: 8 },
      { title: "Arquiteturas RAG com LLMs: embeddings, busca semântica e criação de agentes com LangChain", level: "Nível 1", hours: 8 },
      { title: "LangChain e Python: criando ferramentas com a OpenAI", level: "Nível 1", hours: 8 },
      { title: "LangChain: Técnicas Avançadas de RAG", level: "Nível 1", hours: 10 },
      { title: "LangGraph: Orquestrando agentes e multiagentes", level: "Nível 1", hours: 10 },
      { title: "Protocolos e arquitetura para construção de agentes: MCP, A2A, AG-UI e Backend for Agents (BFA)", level: "Nível 1", hours: 12 },
      { title: "Checkpoint Engenharia de IA - Nível 1", level: "Checkpoint", hours: 2 },
      { title: "Hugging Face: explorando modelos de inteligência artificial", level: "Nível 2", hours: 8 },
      { title: "MLOps: deploy, monitoramento e ciclo de vida de modelos", level: "Nível 2", hours: 8 },
      { title: "Governança de IA: segurança, ética e qualidade", level: "Nível 3", hours: 8 }
    ]
  },
  {
    id: "especialista-ia",
    name: "Especialista em IA",
    area: "IA",
    priority: 96,
    url: "https://www.alura.com.br/carreiras/especialista-em-ia",
    keywords: ["ia", "inteligencia artificial", "generativa", "python", "deep learning", "nlp", "rag", "agentes"],
    courses: [
      { title: "Python: Inteligência Artificial Aplicada", level: "Base", hours: 12 },
      { title: "IA: explorando o potencial da inteligência artificial generativa", level: "Base", hours: 8 },
      { title: "Redes Neurais: Deep Learning com PyTorch", level: "Nível 1", hours: 6 },
      { title: "NLP: aplicando processamento de linguagem natural para análise de sentimentos", level: "Nível 1", hours: 10 },
      { title: "Clusterização: lidando com dados sem rótulo", level: "Nível 1", hours: 8 },
      { title: "LangChain: Técnicas Avançadas de RAG", level: "Nível 2", hours: 10 },
      { title: "LangGraph: Orquestrando agentes e multiagentes", level: "Nível 2", hours: 10 },
      { title: "Hugging Face: explorando modelos de inteligência artificial", level: "Nível 2", hours: 8 },
      { title: "Governança de IA: segurança, ética e qualidade", level: "Nível 3", hours: 8 }
    ]
  },
  {
    id: "lideranca",
    name: "Liderança",
    area: "Liderança",
    priority: 88,
    url: "https://www.alura.com.br/carreiras/lideranca",
    keywords: ["liderança", "feedback", "comunicacao", "gestao", "stakeholders", "mentoria", "mudanca"],
    courses: [
      { title: "Carreira Liderança: boas-vindas e primeiros passos", level: "Base", hours: 2 },
      { title: "Feedback efetivo: utilizando ferramentas para comunicação transformadora", level: "Nível 1", hours: 8 },
      { title: "Comunicação: como se expressar bem e ser compreendido", level: "Nível 1", hours: 12 },
      { title: "Gestão de Processos: mapeamento e automação com Lean e RPA", level: "Nível 1", hours: 8 },
      { title: "Equipes ágeis: organizando os papéis em uma equipe", level: "Nível 1", hours: 8 },
      { title: "Checkpoint Liderança - Nível 1", level: "Checkpoint", hours: 1 },
      { title: "Design Thinking: resolva problemas com inovação e colaboração", level: "Nível 2", hours: 8 },
      { title: "Teoria U: desenvolvendo habilidades para liderar transformações", level: "Nível 2", hours: 8 },
      { title: "Liderança ambidestra: buscando inovação e resultados", level: "Nível 2", hours: 8 },
      { title: "Negociação: treinando habilidades com IA", level: "Nível 2", hours: 8 },
      { title: "Mentoria para líderes: inspirando e desenvolvendo talentos", level: "Nível 2", hours: 6 },
      { title: "Gestão da mudança: liderando transformações organizacionais", level: "Nível 2", hours: 8 },
      { title: "Gestão da mudança em projetos: aplique de forma prática", level: "Nível 2", hours: 8 },
      { title: "Checkpoint Liderança - Nível 2", level: "Checkpoint", hours: 1 },
      { title: "Gestão de Stakeholders: estratégias de influência e comunicação", level: "Nível 3", hours: 10 },
      { title: "Design Organizacional: enfrentando mudanças com métodos ágeis", level: "Nível 3", hours: 8 },
      { title: "Liderança estratégica: transformando visão em ação", level: "Nível 3", hours: 4 },
      { title: "Checkpoint Liderança - Nível 3", level: "Checkpoint", hours: 1 }
    ]
  },
  {
    id: "recursos-humanos",
    name: "Recursos Humanos",
    area: "RH",
    priority: 84,
    url: "https://www.alura.com.br/carreiras/recursos-humanos",
    keywords: ["rh", "pessoas", "recrutamento", "selecao", "excel", "gestao", "competencias"],
    courses: [
      { title: "Carreira RH: boas-vindas e primeiros passos", level: "Base", hours: 2 },
      { title: "RH Estratégico: integração de tecnologia e inovação na gestão de pessoas", level: "Base", hours: 10 },
      { title: "Excel para RH: construindo seu primeiro relatório", level: "Base", hours: 8 },
      { title: "Recrutamento e seleção: uma estratégia com foco em competências", level: "Nível 1", hours: 8 },
      { title: "Feedback efetivo: utilizando ferramentas para comunicação transformadora", level: "Nível 1", hours: 8 },
      { title: "Comunicação: como se expressar bem e ser compreendido", level: "Nível 1", hours: 12 },
      { title: "Gestão comportamental: potencializando a autoliderança", level: "Nível 1", hours: 8 },
      { title: "Design Organizacional: enfrentando mudanças com métodos ágeis", level: "Nível 2", hours: 8 },
      { title: "Gestão de Stakeholders: estratégias de influência e comunicação", level: "Nível 2", hours: 10 },
      { title: "People Analytics: dados para tomada de decisão em RH", level: "Nível 3", hours: 8 },
      { title: "Cultura organizacional: valores, rituais e evolução", level: "Nível 3", hours: 8 }
    ]
  },
  {
    id: "javascript-backend",
    name: "JavaScript Back-End",
    area: "Tech",
    priority: 76,
    url: "https://www.alura.com.br/formacao-javascript-backend",
    keywords: ["javascript", "node", "backend", "algoritmos", "objetos", "biblioteca"],
    courses: [
      { title: "JavaScript: utilizando tipos, variáveis e funções", level: "Base", hours: 8 },
      { title: "JavaScript: conhecendo arrays", level: "Base", hours: 8 },
      { title: "JavaScript: conhecendo objetos", level: "Base", hours: 8 },
      { title: "JavaScript com Node.js: criando sua primeira biblioteca", level: "Nível 1", hours: 10 },
      { title: "JavaScript: programação Orientada a Objetos", level: "Nível 1", hours: 8 },
      { title: "JavaScript I: algoritmos de ordenação", level: "Nível 2", hours: 8 },
      { title: "Algoritmos com JavaScript II: aprofundando em algoritmos de ordenação e busca", level: "Nível 2", hours: 10 }
    ]
  },
  {
    id: "html-css-web",
    name: "HTML e CSS para projetos web",
    area: "Tech",
    priority: 74,
    url: "https://www.alura.com.br/formacao-html-css",
    keywords: ["html", "css", "responsividade", "mobile", "front", "web", "layout"],
    courses: [
      { title: "HTML e CSS: ambientes de desenvolvimento, estrutura de arquivos e tags", level: "Base", hours: 8 },
      { title: "HTML e CSS: Classes, posicionamento e Flexbox", level: "Base", hours: 8 },
      { title: "HTML e CSS: cabeçalho, footer e variáveis CSS", level: "Base", hours: 6 },
      { title: "HTML e CSS: trabalhando com responsividade e publicação de projetos", level: "Nível 1", hours: 6 },
      { title: "HTML e CSS: praticando HTML/CSS", level: "Nível 1", hours: 8 },
      { title: "HTML e CSS: responsividade com mobile-first", level: "Nível 1", hours: 12 }
    ]
  },
  {
    id: "data-science",
    name: "Data Science e Analytics",
    area: "Dados",
    priority: 70,
    url: "https://www.alura.com.br/carreiras/data-science",
    keywords: ["dados", "data", "excel", "python", "analytics", "clusterizacao", "nlp", "redes neurais"],
    courses: [
      { title: "Excel: domine o editor de planilhas", level: "Base", hours: 8 },
      { title: "Excel para RH: construindo seu primeiro relatório", level: "Base", hours: 8 },
      { title: "Clusterização: lidando com dados sem rótulo", level: "Nível 1", hours: 8 },
      { title: "NLP: aplicando processamento de linguagem natural para análise de sentimentos", level: "Nível 1", hours: 10 },
      { title: "Redes Neurais: Deep Learning com PyTorch", level: "Nível 2", hours: 6 },
      { title: "Visualização de dados: gráficos e storytelling", level: "Nível 2", hours: 8 },
      { title: "Métricas e indicadores para tomada de decisão", level: "Nível 3", hours: 8 }
    ]
  }
];

const PROJECT_CONNECTIONS = [
  {
    id: "fitpro",
    name: "FitPro",
    areas: ["IA", "Tech", "Automação", "Dados", "Produto"],
    text: "IA aplicada, agentes, recomendações, dashboards, alunos, personal trainers e operação fitness."
  },
  {
    id: "agendapro",
    name: "AgendaPro",
    areas: ["Tech", "Automação", "Gestão", "Produto", "Dados"],
    text: "SaaS, agendamento, multiempresa, processos, pagamento, painel administrativo e automação comercial."
  },
  {
    id: "upaiva",
    name: "upaiva.dev",
    areas: ["Tech", "IA", "Dados", "Automação", "Gestão"],
    text: "Portfólio como produto, analytics, visual premium, automação de dados e posicionamento profissional."
  },
  {
    id: "studio-jm",
    name: "Studio JM",
    areas: ["Tech", "Produto", "Gestão"],
    text: "Site institucional premium, presença digital, estrutura visual, conteúdo e painel administrativo."
  }
];

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

function htmlToReadableText(html = "") {
  return decodeHtmlEntities(String(html))
    .replace(/<script[\s\S]*?<\/script>/gi, "\n")
    .replace(/<style[\s\S]*?<\/style>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n* ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<h([1-6])\b[^>]*>/gi, "\n## ")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>|<\/div>|<\/section>|<\/article>|<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function stripHtml(html = "") {
  return htmlToReadableText(html).replace(/\s+/g, " ").trim();
}

function splitLinesFromHtml(html = "") {
  return htmlToReadableText(html)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
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


const KNOWN_COURSE_CERTIFICATE_SLUGS = new Map([
  [normalize("Algoritmos com JavaScript II: aprofundando em algoritmos de ordenação e busca"), "algoritmos-javascript-ii-aprofundando-ordenacao-busca"],
  [normalize("JavaScript I: algoritmos de ordenação"), "algoritmos-javascript-i-ordenacao"],
  [normalize("JavaScript: utilizando tipos, variáveis e funções"), "javascript-tipos-variaveis-funcoes"],
  [normalize("JavaScript: conhecendo arrays"), "javascript-arrays"],
  [normalize("JavaScript: conhecendo objetos"), "javascript-objetos"],
  [normalize("JavaScript com Node.js: criando sua primeira biblioteca"), "javascript-nodejs-criando-primeira-biblioteca"],
  [normalize("JavaScript: programação Orientada a Objetos"), "javascript-orientacao-objetos"],
  [normalize("HTML e CSS: ambientes de desenvolvimento, estrutura de arquivos e tags"), "html-css-ambiente-arquivos-tags"],
  [normalize("HTML e CSS: Classes, posicionamento e Flexbox"), "html-css-classes-posicionamento-flexbox"],
  [normalize("HTML e CSS: cabeçalho, footer e variáveis CSS"), "html-css-cabecalho-footer-variaveis-css"],
  [normalize("HTML e CSS: trabalhando com responsividade e publicação de projetos"), "html-css-responsividade-publicacao-projetos"],
  [normalize("HTML e CSS: praticando HTML/CSS"), "html-css-praticando-html-css"],
  [normalize("HTML e CSS: responsividade com mobile-first"), "html-css-responsividade-mobile-first"]
]);

const LEARNING_TYPE_LABELS = {
  career: {
    typeLabel: "Carreira Alura",
    typeDescription: "Rota estratégica de especialização",
    educationLevel: "Rota estratégica de especialização",
    trackKind: "career_path"
  },
  formation: {
    typeLabel: "Formação Alura",
    typeDescription: "Especialização técnica estruturada",
    educationLevel: "Livre profissionalizante",
    trackKind: "technical_formation"
  },
  course: {
    typeLabel: "Curso Alura",
    typeDescription: "Módulo técnico de competência",
    educationLevel: "Curso livre online",
    trackKind: "single_course"
  },
  checkpoint: {
    typeLabel: "Checkpoint",
    typeDescription: "Validação prática de nível",
    educationLevel: "Avaliação prática",
    trackKind: "practical_checkpoint"
  },
  complementary: {
    typeLabel: "Complementar",
    typeDescription: "Reforço técnico e repertório",
    educationLevel: "Conteúdo de apoio",
    trackKind: "support_content"
  }
};

function safeAluraUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return null;
  return /^https:\/\/(cursos|www)\.alura\.com\.br\//i.test(value) ? value : null;
}

function buildGeneratedCourseSlug(title = "") {
  return normalize(title)
    .split(" ")
    .filter(Boolean)
    .filter((word) => !["com", "em", "de", "da", "do", "das", "dos", "para", "e", "a", "o", "as", "os"].includes(word))
    .join("-");
}

function buildCourseCertificateMeta(course = {}) {
  const slug = String(course.courseSlug || "").trim() || null;
  const isCompleted = course.status === "completed" || course.visualStatus === "Concluído" || course.completedAt || course.finished === true;
  const explicitCertificateUrl = safeAluraUrl(course.certificateUrl || course.certificateLink || null);
  const certificateUrl = isCompleted && explicitCertificateUrl
    ? explicitCertificateUrl
    : slug && isCompleted
      ? safeAluraUrl(`https://cursos.alura.com.br/user/${ALURA_USER_SLUG}/course/${slug}/certificate`)
      : null;

  const certificateStatus = certificateUrl
    ? (course.certificateStatus && !String(course.certificateStatus).includes("fallback") ? course.certificateStatus : slug ? "available_dashboard_slug" : "available_profile_link")
    : (isCompleted ? "fallback_full_certificate" : "not_available");

  const primaryActionUrl = certificateUrl || (isCompleted ? FULL_CERTIFICATE_URL : course.courseUrl || course.url || null);
  const safePrimaryActionUrl = safeAluraUrl(primaryActionUrl);

  return {
    courseSlug: slug,
    certificateUrl,
    certificateStatus,
    certificateType: "course",
    primaryActionLabel: certificateUrl ? "Ver certificado" : isCompleted ? "Ver certificado completo" : "Continuar na Alura",
    primaryActionUrl: safePrimaryActionUrl,
    primaryActionKind: certificateUrl ? "certificate" : isCompleted ? "full_certificate_fallback" : "course_source",
    fallbackUrl: FULL_CERTIFICATE_URL
  };
}

function learningTypeForMapItem(item = {}) {
  if (String(item.level || "").toLowerCase().includes("checkpoint") || normalize(item.title || item.name).includes("checkpoint")) return "checkpoint";
  if (String(item.url || "").includes("/carreiras/")) return "career";
  if (String(item.url || "").includes("/formacao") || ["javascript-backend", "html-css-web", "data-science"].includes(item.id)) return "formation";
  return "course";
}

function decorateLearningType(item = {}, type = "course") {
  const labels = LEARNING_TYPE_LABELS[type] || LEARNING_TYPE_LABELS.course;
  return {
    ...item,
    type,
    typeLabel: labels.typeLabel,
    typeDescription: labels.typeDescription,
    educationLevel: labels.educationLevel,
    officialDegree: false,
    degreeNote: "Classificação baseada na estrutura educacional da plataforma Alura; não representa graduação, tecnólogo ou curso técnico MEC.",
    trackKind: labels.trackKind
  };
}

function decorateCourse(course = {}) {
  return decorateLearningType({
    ...course,
    ...buildCourseCertificateMeta(course)
  }, "course");
}

function decorateTrack(track = {}) {
  const url = safeAluraUrl(track.url) || FULL_CERTIFICATE_URL;
  return decorateLearningType({
    ...track,
    certificateUrl: null,
    certificateStatus: "fallback_full_certificate",
    certificateType: "degree_or_full_certificate",
    primaryActionLabel: "Ver certificado completo",
    primaryActionUrl: FULL_CERTIFICATE_URL,
    primaryActionKind: "full_certificate_fallback",
    fallbackUrl: FULL_CERTIFICATE_URL,
    sourceUrl: url
  }, "formation");
}

function decorateCareerOrFormation(item = {}) {
  const type = learningTypeForMapItem(item);
  const safeSourceUrl = safeAluraUrl(item.url) || FULL_CERTIFICATE_URL;
  const completed = item.status === "completed" || Number(item.progress || 0) >= 100;
  const labels = LEARNING_TYPE_LABELS[type] || LEARNING_TYPE_LABELS.formation;

  return decorateLearningType({
    ...item,
    certificateUrl: null,
    certificateStatus: completed ? "fallback_full_certificate" : "not_detected",
    certificateType: type === "career" ? "career" : "degree",
    primaryActionLabel: completed ? "Ver certificado completo" : type === "career" ? "Ver rota na Alura" : "Ver formação na Alura",
    primaryActionUrl: completed ? FULL_CERTIFICATE_URL : safeSourceUrl,
    primaryActionKind: completed ? "full_certificate_fallback" : type === "career" ? "career_source" : "formation_source",
    fallbackUrl: FULL_CERTIFICATE_URL,
    sourceUrl: safeSourceUrl,
    visualTypeLine: type === "career" ? `${labels.typeLabel} · Rota estratégica em ${item.area || "especialização"}` : `${labels.typeLabel} · Especialização ${item.area || "técnica"}`
  }, type);
}

function words(text = "") {
  return normalize(text)
    .split(" ")
    .filter((word) => word.length > 2 && !["com", "para", "uma", "por", "das", "dos", "que", "seu", "sua", "curso", "alura"].includes(word));
}

function similarity(a, b) {
  const aWords = new Set(words(a));
  const bWords = new Set(words(b));
  if (!aWords.size || !bWords.size) return 0;

  const intersection = [...aWords].filter((word) => bWords.has(word)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return intersection / union;
}

function classifyCourse(title = "") {
  const normalized = normalize(title);
  const rules = [
    { area: "IA", score: 0, terms: ["ia", "inteligencia artificial", "generativa", "langchain", "langgraph", "rag", "llm", "agente", "multiagente", "mcp", "a2a", "ag ui", "bfa", "openai", "pytorch", "redes neurais", "nlp", "deep learning", "python inteligencia"] },
    { area: "Tech", score: 0, terms: ["javascript", "html", "css", "node", "github", "git", "programacao", "algoritmo", "backend", "front", "vscode", "objetos", "arrays", "funcoes"] },
    { area: "Dados", score: 0, terms: ["data", "dados", "excel", "planilhas", "clusterizacao", "nlp", "pytorch", "analytics", "relatorio", "sentimentos"] },
    { area: "RH", score: 0, terms: ["rh", "recrutamento", "selecao", "pessoas", "competencias", "talentos", "retenção", "retencao"] },
    { area: "Liderança", score: 0, terms: ["lideranca", "feedback", "comunicacao", "mentoria", "stakeholders", "mudanca", "ambidestra", "teoria u", "autolideranca"] },
    { area: "Gestão", score: 0, terms: ["gestao", "processos", "design thinking", "design organizacional", "lean", "rpa", "inovacao", "negociacao", "estrategica"] },
    { area: "Automação", score: 0, terms: ["automacao", "rpa", "agentes", "backend for agents", "webhooks", "processos"] },
    { area: "Produto", score: 0, terms: ["produto", "projeto", "publicacao", "experiencia", "responsividade", "site", "carreira"] }
  ];

  const scored = rules.map((rule) => ({
    area: rule.area,
    score: rule.terms.reduce((sum, term) => sum + (normalized.includes(normalize(term)) ? 1 : 0), 0)
  }));

  const best = scored.sort((a, b) => b.score - a.score)[0];
  return best && best.score > 0 ? best.area : "Complementares";
}

function parseCertificate(html) {
  const lines = splitLinesFromHtml(html);
  const text = lines.join("\n");
  const periodMatch = text.match(/per[ií]odo de\s+([0-9/]+)\s+a\s+([0-9/]+)/i);
  const tracks = [];
  const courses = [];
  const complementary = [];
  let currentTrack = null;
  let currentCategory = null;
  let inComplementary = false;

  const pushCourse = (title, startedAt, completedAt, hours, context = {}) => {
    const cleanTitle = String(title || "")
      .replace(/^#+\s*/, "")
      .replace(/^\*\s*/, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanTitle || /^Cursos:?$/i.test(cleanTitle) || /^Trilha/i.test(cleanTitle)) return;

    courses.push(decorateCourse({
      id: normalize(cleanTitle).replace(/\s+/g, "-"),
      title: cleanTitle,
      startedAt,
      completedAt,
      hours: Number(hours),
      status: "completed",
      track: context.track ?? currentTrack?.title ?? null,
      category: context.category ?? currentCategory?.title ?? currentTrack?.area ?? classifyCourse(cleanTitle),
      area: classifyCourse(`${cleanTitle} ${context.category || currentCategory?.title || ""} ${context.track || currentTrack?.title || ""}`),
      confidence: "confirmed"
    }));
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/^\*\s*/, "").replace(/^#+\s*/, "").trim();
    if (!line || /Ocultar Trilha/i.test(line) || /^Cursos:?$/i.test(line)) continue;

    const trackMatch = line.match(/^Trilha\s+•\s+Alura:\s+(.+?)\s+-\s+(\d+)h$/i);
    if (trackMatch) {
      currentTrack = decorateTrack({
        id: normalize(trackMatch[1]).replace(/\s+/g, "-"),
        title: trackMatch[1].trim(),
        hours: Number(trackMatch[2]),
        type: "track",
        area: classifyCourse(trackMatch[1]),
        confidence: "confirmed"
      });
      tracks.push(currentTrack);
      currentCategory = null;
      inComplementary = false;
      continue;
    }

    if (/^Conte[úu]dos complementares:?$/i.test(line)) {
      inComplementary = true;
      continue;
    }

    const categoryMatch = line.match(/^([A-Za-zÀ-ÿ &]+)\s+-\s+(\d+)h$/i);
    if (categoryMatch && !line.includes("(de ")) {
      currentCategory = {
        title: categoryMatch[1].trim(),
        hours: Number(categoryMatch[2]),
        area: classifyCourse(categoryMatch[1])
      };
      currentTrack = null;
      inComplementary = false;
      continue;
    }

    const courseMatch = line.match(/^(.+?)\s+\(de\s+([0-9/]+)\s+a\s+([0-9/]+)\)\s+(\d+)h$/i);
    if (courseMatch) {
      pushCourse(courseMatch[1], courseMatch[2], courseMatch[3], courseMatch[4]);
      continue;
    }

    const complementaryMatch = line.match(/^(.+?)\s+-\s+(\d+)min$/i);
    if (inComplementary && complementaryMatch) {
      complementary.push(decorateLearningType({
        id: normalize(complementaryMatch[1]).replace(/\s+/g, "-"),
        title: complementaryMatch[1].trim(),
        minutes: Number(complementaryMatch[2]),
        area: classifyCourse(complementaryMatch[1]),
        confidence: "confirmed",
        primaryActionLabel: "Ver certificado completo",
        primaryActionUrl: FULL_CERTIFICATE_URL,
        primaryActionKind: "full_certificate_fallback",
        fallbackUrl: FULL_CERTIFICATE_URL
      }, "complementary"));
    }
  }

  if (!courses.length && text) {
    const readableSources = [
      text,
      htmlToReadableText(html),
      decodeHtmlEntities(String(html))
        .replace(/<script[\s\S]*?<\/script>/gi, "\n")
        .replace(/<style[\s\S]*?<\/style>/gi, "\n")
        .replace(/<li\b[^>]*>/gi, "\n* ")
        .replace(/<h([1-6])\b[^>]*>/gi, "\n## ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\r/g, "\n")
    ];

    const coursePattern = /(?:^|\n|\*)\s*(?:##\s*)?([^\n*#<][^\n()<>]{3,220}?)\s*\(de\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})\s*a\s*([0-9]{2}\/[0-9]{2}\/[0-9]{4})\)\s*(\d+)\s*h/gi;

    for (const sourceText of readableSources) {
      if (courses.length) break;
      let match;
      while ((match = coursePattern.exec(sourceText)) !== null) {
        const before = sourceText.slice(0, match.index);
        const lastTrack = [...before.matchAll(/Trilha\s+•\s+Alura:\s+(.+?)\s+-\s+(\d+)h/gi)].pop();
        const lastCategory = [...before.matchAll(/(?:^|\n)\s*\*?\s*##?\s*([A-Za-zÀ-ÿ &]+)\s+-\s+(\d+)h/gi)].pop();
        pushCourse(match[1], match[2], match[3], match[4], {
          track: lastTrack?.[1]?.trim() || null,
          category: lastCategory?.[1]?.trim() || null
        });
      }
    }
  }

  const uniqueCourses = dedupeCourses(courses).map((course) => decorateCourse(course));
  const totalHours = uniqueCourses.reduce((sum, course) => sum + Number(course.hours || 0), 0);
  const areaHours = groupHoursByArea(uniqueCourses);

  return {
    period: {
      start: periodMatch?.[1] || null,
      end: periodMatch?.[2] || null
    },
    tracks,
    courses: uniqueCourses,
    complementary,
    totalHours,
    areaHours
  };
}

function dedupeCourses(courses) {
  const map = new Map();
  for (const course of courses) {
    const key = normalize(course.title);
    const previous = map.get(key);
    if (!previous || Number(course.hours || 0) > Number(previous.hours || 0)) {
      map.set(key, course);
    }
  }
  return [...map.values()];
}

function groupHoursByArea(courses) {
  return courses.reduce((acc, course) => {
    const area = course.area || "Complementares";
    acc[area] = (acc[area] || 0) + Number(course.hours || 0);
    return acc;
  }, {});
}

async function fetchHtml(url, timeoutMs = 11000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: REQUEST_HEADERS,
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function absoluteAluraUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return null;
  try {
    const resolved = new URL(value, "https://cursos.alura.com.br").toString();
    return safeAluraUrl(resolved);
  } catch {
    return null;
  }
}

function extractCourseSlugFromCertificateUrl(url = "") {
  const match = String(url || "").match(/\/course\/([^/]+)\/certificate/i);
  return match?.[1] || null;
}

function extractProfileCertificateLinks(html = "") {
  const links = [];
  const seen = new Set();
  const decoded = decodeHtmlEntities(String(html || ""));
  const anchorPattern = /<a([^>]*?)href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = anchorPattern.exec(decoded)) !== null) {
    const url = absoluteAluraUrl(match[2]);
    if (!url || !/\/course\/[^/]+\/certificate/i.test(url)) continue;
    const courseSlug = extractCourseSlugFromCertificateUrl(url);
    if (!courseSlug || seen.has(url)) continue;

    const contextStart = Math.max(0, match.index - 800);
    const contextEnd = Math.min(decoded.length, anchorPattern.lastIndex + 800);
    const contextText = htmlToReadableText(decoded.slice(contextStart, contextEnd));
    const anchorText = htmlToReadableText(match[4]);

    seen.add(url);
    links.push({
      courseSlug,
      certificateUrl: url,
      anchorText,
      contextText,
      source: "public-profile"
    });
  }

  return links;
}

async function loadPublicProfileCertificateLinks() {
  try {
    const html = await fetchHtml(PUBLIC_PROFILE_URL, 11000);
    const links = extractProfileCertificateLinks(html);
    return {
      ok: true,
      status: links.length ? "profile_certificates_ok" : "profile_certificates_empty",
      url: PUBLIC_PROFILE_URL,
      count: links.length,
      links,
      warning: links.length ? null : "Perfil público da Alura não expôs links individuais de certificado no HTML atual."
    };
  } catch (error) {
    return {
      ok: false,
      status: "profile_certificates_unavailable",
      url: PUBLIC_PROFILE_URL,
      count: 0,
      links: [],
      warning: `Não foi possível ler certificados individuais no perfil público da Alura: ${error.message}`
    };
  }
}

function certificateCatalogScore(course = {}, link = {}) {
  const title = `${course.title || ""} ${course.id || ""}`;
  const slugText = String(link.courseSlug || "").replace(/-/g, " ");
  if (!title || !slugText) return 0;
  if (course.courseSlug && course.courseSlug === link.courseSlug) return 1;

  const titleWords = new Set(words(title));
  const slugWords = new Set(words(slugText));
  const intersection = [...titleWords].filter((word) => slugWords.has(word)).length;
  const denominator = Math.max(1, Math.min(titleWords.size, slugWords.size));
  const overlap = intersection / denominator;
  return Math.max(overlap, similarity(title, slugText));
}

function enrichCourseWithCertificateCatalog(course = {}, certificateLinks = []) {
  if (!certificateLinks.length || course.certificateUrl) return decorateCourse(course);
  const isCompleted = course.status === "completed" || course.visualStatus === "Concluído" || course.completedAt || course.finished === true;
  if (!isCompleted) return decorateCourse(course);

  const match = certificateLinks
    .map((link) => ({ link, score: certificateCatalogScore(course, link) }))
    .sort((a, b) => b.score - a.score)[0];

  if (!match || match.score < 0.58) return decorateCourse(course);

  return decorateCourse({
    ...course,
    courseSlug: course.courseSlug || match.link.courseSlug,
    certificateUrl: match.link.certificateUrl,
    certificateStatus: "available_profile_link",
    certificateSource: "public-profile",
    certificateMatchScore: Number(match.score.toFixed(2)),
    source: course.source ? `${course.source}+public-profile` : "certificate+public-profile"
  });
}

function parseCareerPage(html, blueprint) {
  const text = stripHtml(html);
  const extracted = [];
  const seen = new Set();

  const patterns = [
    /Curso\s+([^•|\n]{12,120}?)(?:\s+(?:Base|Nível|Nivel|Checkpoint|\d+h)|$)/gi,
    /([A-ZÀ-Ÿ][^\n]{10,120}?):\s+([^\n]{8,100}?)(?:\s+(\d+)h)?/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && extracted.length < 60) {
      const title = (match[1] || match[2] || "").replace(/\s+/g, " ").trim();
      const key = normalize(title);
      if (!title || title.length < 8 || seen.has(key)) continue;
      if (/carreira|formação|formacao|alura|nível|nivel|base/i.test(title) && title.length < 28) continue;
      seen.add(key);
      extracted.push({ title, level: inferLevel(text, match.index), hours: Number(match[3] || 0) || null });
    }
  }

  const useful = extracted.filter((item) => {
    const score = blueprint.keywords.reduce((sum, keyword) => sum + (normalize(item.title).includes(normalize(keyword)) ? 1 : 0), 0);
    return score > 0 || extracted.length <= blueprint.courses.length;
  });

  return useful.length >= 4 ? useful : [];
}

function inferLevel(text, index) {
  const before = text.slice(Math.max(0, index - 500), index);
  const levelMatch = before.match(/(Base|Nível\s*1|Nível\s*2|Nível\s*3|Nivel\s*1|Nivel\s*2|Nivel\s*3|Checkpoint)/gi);
  return levelMatch ? levelMatch[levelMatch.length - 1].replace("Nivel", "Nível") : "Mapa público";
}

async function loadCareer(blueprint) {
  if (!ENABLE_PUBLIC_CAREER_MERGE) {
    return {
      ...blueprint,
      sourceMode: "blueprint-stable"
    };
  }

  try {
    const html = await fetchHtml(blueprint.url, 9000);
    const parsed = parseCareerPage(html, blueprint);
    if (parsed.length) {
      return {
        ...blueprint,
        courses: mergeCareerCourses(blueprint.courses, parsed),
        sourceMode: "public-page+blueprint"
      };
    }
  } catch (error) {
    return {
      ...blueprint,
      sourceMode: "blueprint-fallback",
      sourceError: error.message
    };
  }

  return {
    ...blueprint,
    sourceMode: "blueprint-fallback"
  };
}

function mergeCareerCourses(baseCourses, parsedCourses) {
  const map = new Map();
  [...baseCourses, ...parsedCourses].forEach((course) => {
    const key = normalize(course.title);
    if (!key || map.has(key)) return;
    map.set(key, {
      title: course.title,
      level: course.level || "Mapa público",
      hours: course.hours || null
    });
  });
  return [...map.values()];
}

function calculateCareerProgress(career, completedCourses) {
  const matchedCourses = career.courses.map((required) => {
    const candidates = completedCourses.map((completed) => {
      const directScore = similarity(required.title, completed.title);
      const keywordScore = career.keywords.reduce((sum, keyword) => {
        const k = normalize(keyword);
        return sum + (normalize(required.title).includes(k) && normalize(completed.title).includes(k) ? 0.08 : 0);
      }, 0);

      return {
        completed,
        score: Math.min(1, directScore + keywordScore)
      };
    }).sort((a, b) => b.score - a.score);

    const best = candidates[0];
    const isCompleted = Boolean(best && best.score >= 0.58);

    const baseCourse = isCompleted ? { ...best.completed, status: "completed" } : { ...required, status: "missing" };

    return decorateLearningType({
      ...required,
      ...(isCompleted ? buildCourseCertificateMeta(baseCourse) : {
        certificateUrl: null,
        certificateStatus: "not_available",
        certificateType: normalize(required.title).includes("checkpoint") ? "checkpoint" : "course",
        primaryActionLabel: "Pendente",
        primaryActionUrl: null,
        primaryActionKind: "missing"
      }),
      type: normalize(required.title).includes("checkpoint") ? "checkpoint" : "course",
      status: isCompleted ? "completed" : "missing",
      matchScore: Number((best?.score || 0).toFixed(2)),
      matchedCourse: isCompleted ? best.completed.title : null,
      matchedHours: isCompleted ? Number(best.completed.hours || required.hours || 0) : 0
    }, normalize(required.title).includes("checkpoint") ? "checkpoint" : "course");
  });

  const completedCount = matchedCourses.filter((course) => course.status === "completed").length;
  const totalCourses = matchedCourses.length;
  const totalHours = matchedCourses.reduce((sum, course) => sum + Number(course.hours || 0), 0);
  const completedHours = matchedCourses.reduce((sum, course) => sum + Number(course.matchedHours || 0), 0);
  const progressByCourses = totalCourses ? Math.round((completedCount / totalCourses) * 100) : 0;
  const progressByHours = totalHours ? Math.round((completedHours / totalHours) * 100) : progressByCourses;

  const levels = matchedCourses.reduce((acc, course) => {
    const level = course.level || "Geral";
    if (!acc[level]) acc[level] = { name: level, total: 0, completed: 0, progress: 0 };
    acc[level].total += 1;
    if (course.status === "completed") acc[level].completed += 1;
    return acc;
  }, {});

  Object.values(levels).forEach((level) => {
    level.progress = level.total ? Math.round((level.completed / level.total) * 100) : 0;
  });

  const missing = matchedCourses
    .filter((course) => course.status === "missing")
    .slice(0, 12);

  return decorateCareerOrFormation({
    id: career.id,
    name: career.name,
    area: career.area,
    priority: career.priority,
    url: career.url,
    sourceMode: career.sourceMode,
    sourceError: career.sourceError || null,
    status: progressByCourses >= 100 ? "completed" : progressByCourses > 0 ? "started" : "not_started",
    progress: Math.round((progressByCourses * 0.65) + (progressByHours * 0.35)),
    progressByCourses,
    progressByHours,
    completedCourses: completedCount,
    totalCourses,
    completedHours,
    totalHours,
    levels: Object.values(levels),
    missing,
    courses: matchedCourses,
    confidence: "estimated"
  });
}

function recommendNextCourse(careers) {
  const missingCandidates = careers
    .filter((career) => career.status !== "completed")
    .flatMap((career) => career.missing.slice(0, 5).map((course, index) => ({
      careerId: career.id,
      careerName: career.name,
      careerArea: career.area,
      careerProgress: career.progress,
      title: course.title,
      level: course.level,
      estimatedHours: course.hours || 6,
      score: career.priority + (100 - career.progress) * 0.45 + (course.level === "Base" ? 18 : 0) + (index === 0 ? 10 : 0)
    })))
    .sort((a, b) => b.score - a.score);

  const best = missingCandidates[0];
  if (!best) {
    return {
      title: "Todas as carreiras mapeadas estão concluídas",
      reason: "Nenhum curso faltante foi identificado nos mapas configurados.",
      impact: "Manter revisão periódica e adicionar novas carreiras ao radar."
    };
  }

  return {
    title: best.title,
    career: best.careerName,
    area: best.careerArea,
    level: best.level,
    estimatedHours: best.estimatedHours,
    reason: `Maior impacto no radar atual: fortalece ${best.careerName} e melhora a leitura de ${best.careerArea}.`,
    impact: `Pode elevar o progresso estimado da carreira de ${best.careerProgress}% para aproximadamente ${Math.min(100, best.careerProgress + Math.max(3, Math.round(100 / 12)))}%.`,
    confidence: "estimated"
  };
}

function buildSkillRadar(courses, careers) {
  const areas = ["IA", "Tech", "Dados", "RH", "Liderança", "Gestão", "Automação", "Produto"];
  const hours = groupHoursByArea(courses);
  const maxHours = Math.max(20, ...Object.values(hours));

  return areas.map((area) => {
    const areaHours = Number(hours[area] || 0);
    const careerBoost = careers
      .filter((career) => career.area === area || (area === "Gestão" && ["RH", "Liderança"].includes(career.area)))
      .reduce((sum, career) => sum + career.progress, 0) / Math.max(1, careers.filter((career) => career.area === area || (area === "Gestão" && ["RH", "Liderança"].includes(career.area))).length);

    const score = Math.min(100, Math.round((areaHours / maxHours) * 70 + (careerBoost || 0) * 0.3));

    return {
      area,
      hours: areaHours,
      score,
      label: score >= 78 ? "Forte" : score >= 55 ? "Em consolidação" : score > 0 ? "Base ativa" : "A desenvolver"
    };
  }).sort((a, b) => b.score - a.score);
}

function buildTimeline(courses) {
  const months = courses.reduce((acc, course) => {
    const [day, month, year] = String(course.completedAt || "").split("/");
    const key = year && month ? `${year}-${month}` : "sem-data";
    if (!acc[key]) acc[key] = { key, label: key, courses: 0, hours: 0, areas: {} };
    acc[key].courses += 1;
    acc[key].hours += Number(course.hours || 0);
    acc[key].areas[course.area] = (acc[key].areas[course.area] || 0) + 1;
    return acc;
  }, {});

  return Object.values(months)
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((item) => ({
      ...item,
      mainArea: Object.entries(item.areas).sort((a, b) => b[1] - a[1])[0]?.[0] || "Geral"
    }));
}

function buildProjectMap(skillRadar) {
  return PROJECT_CONNECTIONS.map((project) => {
    const relatedSkills = skillRadar.filter((skill) => project.areas.includes(skill.area));
    const score = relatedSkills.length
      ? Math.round(relatedSkills.reduce((sum, skill) => sum + skill.score, 0) / relatedSkills.length)
      : 0;

    return {
      ...project,
      score,
      relatedSkills: relatedSkills.map((skill) => skill.area)
    };
  }).sort((a, b) => b.score - a.score);
}

function buildRecruiterSummary(summary, skillRadar, careers) {
  const topSkills = skillRadar.slice(0, 4).map((skill) => skill.area).join(", ");
  const activeCareers = careers.filter((career) => career.status === "started" || career.status === "completed").slice(0, 3).map((career) => career.name).join(", ");

  return `Perfil híbrido em desenvolvimento web, IA aplicada, automação, dados e gestão estratégica, com ${summary.totalCompletedCourses} cursos concluídos e ${summary.totalCompletedHours}h mapeadas no certificado público. Áreas mais fortes no radar atual: ${topSkills}. Carreiras em evidência: ${activeCareers || "em mapeamento"}.`;
}

function buildLinkedInTemplate(latestCourses, summary) {
  const grouped = latestCourses.reduce((acc, course) => {
    acc[course.area] = (acc[course.area] || 0) + Number(course.hours || 0);
    return acc;
  }, {});
  const topArea = Object.entries(grouped).sort((a, b) => b[1] - a[1])[0]?.[0] || "tecnologia";
  const hours = latestCourses.reduce((sum, course) => sum + Number(course.hours || 0), 0);

  return `Novo marco de aprendizado contínuo: concluí ${latestCourses.length} novo(s) curso(s), somando ${hours}h, com foco principal em ${topArea}. Esse avanço fortalece minha atuação em desenvolvimento web, IA aplicada, automação, dados e estratégia digital. Total mapeado no Learning OS: ${summary.totalCompletedHours}h em ${summary.totalCompletedCourses} cursos concluídos.`;
}


function enrichCourseWithDashboardApi(course = {}, dashboardCourses = []) {
  const normalizedTitle = normalize(course.title || course.name || "");
  const match = dashboardCourses
    .map((apiCourse) => ({
      apiCourse,
      score: Math.max(
        apiCourse.courseSlug && course.courseSlug && apiCourse.courseSlug === course.courseSlug ? 1 : 0,
        similarity(normalizedTitle, apiCourse.title || apiCourse.name || "")
      )
    }))
    .sort((a, b) => b.score - a.score)[0];

  if (!match || match.score < 0.62) return decorateCourse(course);

  return decorateCourse({
    ...course,
    courseSlug: match.apiCourse.courseSlug || course.courseSlug || null,
    courseUrl: match.apiCourse.courseUrl || course.courseUrl || null,
    dashboardApiId: match.apiCourse.id || null,
    dashboardProgress: match.apiCourse.progress,
    dashboardLastAccess: match.apiCourse.lastAccess || null,
    source: course.source ? `${course.source}+dashboard-api` : "certificate+dashboard-api",
    confidence: course.confidence === "confirmed" ? "confirmed+dashboard-api" : "dashboard-api"
  });
}

function mergeDashboardCoursesIntoCompleted(certificateCourses = [], dashboardApi = {}) {
  const apiCompleted = dashboardApi?.completedCourses || [];
  const enrichedCertificateCourses = certificateCourses.map((course) => enrichCourseWithDashboardApi(course, apiCompleted));
  const existingKeys = new Set(enrichedCertificateCourses.map((course) => normalize(course.title)));

  const extraCompleted = apiCompleted
    .filter((course) => !existingKeys.has(normalize(course.title)))
    .map((course) => decorateCourse({
      id: course.id || course.courseSlug || normalize(course.title).replace(/\s+/g, "-"),
      title: course.title,
      courseSlug: course.courseSlug,
      courseUrl: course.courseUrl,
      completedAt: course.completedAt || course.lastAccess || null,
      hours: course.hours || 0,
      status: "completed",
      track: "API Dashboard Alura",
      category: course.area || classifyCourse(course.title),
      area: course.area || classifyCourse(course.title),
      confidence: "private-dashboard-api",
      source: "dashboard-api"
    }));

  return dedupeCourses([...enrichedCertificateCourses, ...extraCompleted]).map((course) => decorateCourse(course));
}

function mergeProfileCertificatesIntoCompleted(courses = [], profileCertificates = {}) {
  const links = profileCertificates?.links || [];
  if (!links.length) return courses.map((course) => decorateCourse(course));
  return courses.map((course) => enrichCourseWithCertificateCatalog(course, links));
}

function mergeDashboardIntoPrivateProgress(privateProgress = {}, dashboardApi = {}) {
  if (!dashboardApi?.ok) return privateProgress;

  const dashboardInProgress = (dashboardApi.inProgressCourses || []).map((course, index) => ({
    id: course.id || course.courseSlug || normalize(course.title).replace(/\s+/g, "-"),
    title: course.title,
    courseSlug: course.courseSlug,
    courseUrl: course.courseUrl,
    area: course.area || classifyCourse(course.title),
    career: null,
    progress: course.progress || 0,
    status: "in_progress",
    lastAccess: course.lastAccess,
    source: "dashboard-api",
    confidence: "private-dashboard-api",
    order: index + 1
  }));

  const dashboardGuides = (dashboardApi.guides || []).map((guide, index) => ({
    id: guide.id || normalize(guide.name).replace(/\s+/g, "-"),
    name: guide.name,
    area: classifyCourse(`${guide.name} ${guide.kind || ""}`),
    officialProgress: guide.progress || 0,
    officialStatus: guide.status || (guide.progress >= 100 ? "completed" : guide.progress > 0 ? "started" : "not_started"),
    lastAccess: guide.lastAccess || null,
    sourceUrl: guide.url || null,
    source: "dashboard-api",
    confidence: "private-dashboard-api",
    order: index + 1
  }));

  const uniqueCourseMap = new Map();
  [...dashboardInProgress, ...(privateProgress.inProgressCourses || [])].forEach((course) => {
    const key = course.courseSlug || normalize(course.title);
    if (!key) return;
    const previous = uniqueCourseMap.get(key);
    if (!previous || Number(course.progress || 0) > Number(previous.progress || 0)) uniqueCourseMap.set(key, course);
  });

  const uniqueCareerMap = new Map();
  [...dashboardGuides, ...(privateProgress.officialCareers || [])].forEach((career) => {
    const key = normalize(career.name);
    if (!key) return;
    const previous = uniqueCareerMap.get(key);
    if (!previous || Number(career.officialProgress || 0) > Number(previous.officialProgress || 0)) uniqueCareerMap.set(key, career);
  });

  const dashboardHasPayload = dashboardInProgress.length || dashboardGuides.length || hasPerformanceData(dashboardApi.performance || {});

  return {
    ...privateProgress,
    status: dashboardHasPayload ? "active" : privateProgress.status,
    mode: dashboardHasPayload ? "dashboard-api+private" : privateProgress.mode,
    message: dashboardHasPayload
      ? "API Dashboard da Alura conectada. Cursos, progresso e performance foram sanitizados no servidor."
      : privateProgress.message,
    inProgressCourses: [...uniqueCourseMap.values()],
    officialCareers: [...uniqueCareerMap.values()],
    performance: hasPerformanceData(dashboardApi.performance || {}) ? dashboardApi.performance : privateProgress.performance,
    warnings: [...(privateProgress.warnings || []), ...(dashboardApi.warnings || [])]
  };
}

function mergePrivateCareers(careers, privateProgress) {
  const officialCareers = privateProgress?.officialCareers || [];
  if (!officialCareers.length) return careers;

  return careers.map((career) => {
    const match = officialCareers
      .map((official) => ({ official, score: Math.max(similarity(career.name, official.name), similarity(career.id, official.id || official.name)) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!match || match.score < 0.34) return career;

    return {
      ...career,
      officialProgress: match.official.officialProgress,
      officialStatus: match.official.officialStatus,
      officialSource: "private",
      officialLastAccess: match.official.lastAccess || null,
      progress: Math.max(Number(career.progress || 0), Number(match.official.officialProgress || 0)),
      status: match.official.officialStatus === "completed"
        ? "completed"
        : match.official.officialProgress > 0
          ? "started"
          : career.status,
      confidence: career.confidence === "confirmed" ? career.confidence : "estimated+private"
    };
  });
}

function hasActivePrivateProgress(privateProgress) {
  return ["active", "empty"].includes(privateProgress?.status) || Boolean(
    privateProgress?.inProgressCourses?.length || privateProgress?.officialCareers?.length
  );
}

function buildAgentStatus(sourceStatus, hasPrivateSync) {
  const agentNames = [
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
  ];

  return agentNames.map((name) => ({
    name,
    type: ["PrivateProgressAgent", "AluraPerformanceAgent", "AluraDashboardApiAgent"].includes(name) ? "private" : name.includes("Post") || name.includes("Recruiter") ? "template-ai" : "rules-ai",
    status: ["PrivateProgressAgent", "AluraPerformanceAgent"].includes(name) && !hasPrivateSync ? "waiting_private_session" : sourceStatus === "ok" ? "active" : "degraded",
    provider: "rules/no-openai",
    cost: "zero"
  }));
}

async function runLearningSync() {
  const startedAt = Date.now();
  const warnings = [];
  let certificate;
  let sourceStatus = "ok";

  try {
    const html = await fetchHtml(CERTIFICATE_URL, 12000);
    certificate = parseCertificate(html);
  } catch (error) {
    sourceStatus = "degraded";
    warnings.push(`Certificado público indisponível: ${error.message}`);
    certificate = parseCertificate("");
  }

  let dashboardApi;
  try {
    dashboardApi = await runDashboardApiSync();
  } catch (error) {
    dashboardApi = {
      enabled: Boolean(process.env.ALURA_DASHBOARD_API_URL || process.env.ALURA_DASHBOARD_API_TOKEN),
      hasUrl: Boolean(process.env.ALURA_DASHBOARD_API_URL),
      hasToken: Boolean(process.env.ALURA_DASHBOARD_API_TOKEN),
      secretExposed: false,
      ok: false,
      status: "dashboard_api_error",
      syncedAt: new Date().toISOString(),
      courses: [],
      completedCourses: [],
      inProgressCourses: [],
      guides: [],
      performance: null,
      warnings: [`Falha na API Dashboard: ${error.message}`]
    };
  }

  let privateProgress;
  try {
    privateProgress = await runPrivateProgressSync();
  } catch (error) {
    privateProgress = {
      status: "error",
      mode: "private-sync-error",
      message: `Falha na sincronização privada: ${error.message}`,
      syncedAt: new Date().toISOString(),
      inProgressCourses: [],
      officialCareers: [],
      performance: emptyPerformance("private_sync_error"),
      warnings: [error.message]
    };
  }

  const profileCertificates = await loadPublicProfileCertificateLinks();
  if (profileCertificates.warning) warnings.push(profileCertificates.warning);

  privateProgress = mergeDashboardIntoPrivateProgress(privateProgress, dashboardApi);

  const performance = dashboardApi?.ok && hasPerformanceData(dashboardApi.performance || {})
    ? dashboardApi.performance
    : (privateProgress.performance || emptyPerformance(privateProgress.status || "waiting_private_session"));

  const baseCompletedCourses = certificate.courses.length
    ? certificate.courses
    : (dashboardApi?.completedCourses?.length ? [] : buildFallbackCoursesFromTracks(certificate));

  const effectiveCompletedCourses = mergeProfileCertificatesIntoCompleted(
    mergeDashboardCoursesIntoCompleted(baseCompletedCourses, dashboardApi),
    profileCertificates
  );

  const careersRaw = await Promise.all(CAREER_BLUEPRINTS.map(loadCareer));
  const careers = mergePrivateCareers(
    careersRaw.map((career) => calculateCareerProgress(career, effectiveCompletedCourses)),
    privateProgress
  ).sort((a, b) => b.progress - a.progress || b.priority - a.priority);

  const recommendation = recommendNextCourse(careers);
  const skillRadar = buildSkillRadar(effectiveCompletedCourses, careers);
  const timeline = buildTimeline(effectiveCompletedCourses);
  const projectMap = buildProjectMap(skillRadar);
  const latestCourses = [...effectiveCompletedCourses]
    .sort((a, b) => {
      const [ad, am, ay] = String(a.completedAt || "").split("/");
      const [bd, bm, by] = String(b.completedAt || "").split("/");
      return new Date(`${by}-${bm}-${bd}`) - new Date(`${ay}-${am}-${ad}`);
    })
    .slice(0, 6);

  const privateActive = hasActivePrivateProgress(privateProgress) || hasPerformanceData(performance);

  const summary = {
    totalCompletedCourses: certificate.courses.length || effectiveCompletedCourses.length,
    totalCompletedHours: certificate.totalHours || effectiveCompletedCourses.reduce((sum, item) => sum + Number(item.hours || 0), 0),
    totalTracks: certificate.tracks.length,
    totalComplementary: certificate.complementary.length,
    careersStarted: careers.filter((career) => career.status === "started").length,
    careersCompleted: careers.filter((career) => career.status === "completed").length,
    strongestArea: skillRadar[0]?.area || "Em análise",
    coursesInProgress: privateProgress.inProgressCourses?.length || 0,
    officialCareersMapped: privateProgress.officialCareers?.length || 0,
    privateSyncStatus: privateProgress.status,
    performanceSyncStatus: performance.status,
    performanceAvailable: hasPerformanceData(performance),
    dashboardApiStatus: dashboardApi.status,
    dashboardApiEnabled: dashboardApi.enabled,
    dashboardApiCourses: dashboardApi.courses?.length || 0,
    dashboardApiGuides: dashboardApi.guides?.length || 0,
    profileCertificateLinks: profileCertificates.count || 0,
    aluraRanking30Days: performance.ranking30Days,
    aluraPoints: performance.points,
    aluraResolvedExercises: performance.resolvedExercises,
    noOpenAiCost: true
  };

  const dataQuality = {
    duplicateCoursesRemoved: true,
    missingPrivateSession: !privateActive,
    privateSyncStatus: privateProgress.status,
    performanceSyncStatus: performance.status,
    careersWithFallback: careers.filter((career) => career.sourceMode === "blueprint-fallback").length,
    warnings: [...warnings, ...(dashboardApi.warnings || []), ...(privateProgress.warnings || [])]
  };

  const response = {
    version: "1.0.0",
    mode: "Learning OS / rules based agents",
    source: {
      certificateUrl: CERTIFICATE_URL,
      fullCertificateUrl: FULL_CERTIFICATE_URL,
      aluraUserSlug: ALURA_USER_SLUG,
      syncedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      sourceStatus,
      confidence: SOURCE_CONFIDENCE,
      dashboardApi: {
        enabled: Boolean(dashboardApi.enabled),
        ok: Boolean(dashboardApi.ok),
        status: dashboardApi.status,
        hasToken: Boolean(dashboardApi.hasToken),
        hasUrl: Boolean(dashboardApi.hasUrl),
        courses: dashboardApi.courses?.length || 0,
        guides: dashboardApi.guides?.length || 0,
        secretExposed: false
      },
      profileCertificates: {
        enabled: true,
        ok: Boolean(profileCertificates.ok),
        status: profileCertificates.status,
        count: profileCertificates.count || 0,
        source: "public-profile"
      }
    },
    summary,
    certificate,
    careers,
    recommendation,
    skillRadar,
    timeline,
    projectMap,
    recruiterSummary: buildRecruiterSummary(summary, skillRadar, careers),
    linkedinTemplate: buildLinkedInTemplate(latestCourses, summary),
    latestCourses,
    performance,
    dashboardApi: {
      enabled: Boolean(dashboardApi.enabled),
      ok: Boolean(dashboardApi.ok),
      status: dashboardApi.status,
      syncedAt: dashboardApi.syncedAt || null,
      courses: dashboardApi.courses?.length || 0,
      completedCourses: dashboardApi.completedCourses?.length || 0,
      inProgressCourses: dashboardApi.inProgressCourses?.length || 0,
      guides: dashboardApi.guides?.length || 0,
      hasToken: Boolean(dashboardApi.hasToken),
      hasUrl: Boolean(dashboardApi.hasUrl),
      secretExposed: false
    },
    profileCertificates: {
      enabled: true,
      ok: Boolean(profileCertificates.ok),
      status: profileCertificates.status,
      count: profileCertificates.count || 0,
      secretExposed: false
    },
    privateProgress,
    agents: buildAgentStatus(sourceStatus, privateActive),
    dataQuality
  };

  return response;
}

module.exports = {
  runLearningSync,
  SOURCE_CONFIDENCE
};
