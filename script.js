(() => {
  "use strict";

  const WHATSAPP_NUMBER = "55035988042182";
  const EMAIL = "mpaiiva21@gmail.com";
  const GITHUB_USER = "EoPaiva";

  const ADMIN_PROJECTS_STORAGE_KEY = "mpaiva_admin_projects_v1";
  const ADMIN_PROJECTS_CACHE_META_KEY = "mpaiva_admin_projects_meta_v2";
  const PROJECTS_CACHE_VERSION = "2026-06-18-fullstack-ai-positioning-v1";
  const PROJECTS_REMOTE_TABLE = "production_projects";

  let currentMode = "tech";
  let activeCaseFilter = "Todos";
  let skillChart = null;
  let heroGlobeCleanup = null;
  let productionSwiper = null;
  let adminSupabaseClient = null;
  let adminSession = null;

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const rawText = (value) => String(value ?? "");
  const safeText = (value) => rawText(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  }[char]));

  const publicProjectCopy = (value) => rawText(value)
    .replace(/Painel\s+Admin\w*\s*MPAIVA_?/gi, "Painel de gestão")
    .replace(/\bpainel\s+admin\w*\b/gi, "painel de gestão")
    .replace(/\bárea administrativa\b/gi, "área de gestão")
    .replace(/\badministradores\b/gi, "gestores");

  const isAdminRoute = () => {
    const normalizedPath = window.location.pathname.replace(/\/$/, "");
    return document.body.dataset.adminPage === "true" || normalizedPath === "/admin" || normalizedPath.endsWith("/admin.html");
  };

  const encodeWhatsApp = (message) => {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const generateId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const normalizeProjectUrl = (value, fallback = "#") => {
    const projectUrl = rawText(value).trim();
    if (!projectUrl) return fallback;

    try {
      const parsedUrl = new URL(projectUrl, window.location.origin);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return fallback;
      return parsedUrl.href;
    } catch (error) {
      return fallback;
    }
  };

  const deriveDomain = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (error) {
      return rawText(url)
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        .trim();
    }
  };

  const screenshotUrls = (url) => {
    const cleanUrl = normalizeProjectUrl(url, "");
    if (!cleanUrl) return [];

    const encodedUrl = encodeURIComponent(cleanUrl);

    return [
      `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url`,
      `https://s.wordpress.com/mshots/v1/${encodedUrl}?w=1400`,
      `https://image.thum.io/get/width/1400/crop/900/noanimate/${cleanUrl}`
    ];
  };

  const normalizeOptionalImageUrl = (value) => {
    const imageUrl = rawText(value).trim();

    if (!imageUrl) return "";

    // Aceita URLs absolutas e caminhos internos do próprio projeto.
    // Não tenta trocar imagem manual por screenshot automático.
    if (/^(https?:)?\/\//i.test(imageUrl)) {
      try {
        const parsedUrl = new URL(imageUrl, window.location.origin);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") return "";
        return parsedUrl.href;
      } catch (error) {
        return "";
      }
    }

    if ((imageUrl.startsWith("/") && !imageUrl.startsWith("//")) || imageUrl.startsWith("./") || imageUrl.startsWith("assets/")) {
      return imageUrl;
    }

    return "";
  };

  const defaultProductionProjects = [
    {
      id: "upaiva_dev",
      name: "Upaiva.dev",
      url: "https://upaiva.dev/",
      domain: "upaiva.dev",
      category: "Full Stack / IA Aplicada / Automação",
      description: "Plataforma profissional criada para apresentar sistemas full stack, IA aplicada, automação de processos, agentes de IA, integrações com APIs e soluções digitais completas para negócios.",
      imageUrl: ""
    },
    {
      id: "studio_jm",
      name: "Studio JM",
      url: "https://studiojmarq.com/",
      domain: "studiojmarq.com",
      category: "Site institucional / Arquitetura",
      description: "Plataforma digital para arquitetura e interiores, com apresentação visual premium e estrutura profissional.",
      imageUrl: ""
    },
    {
      id: "projeto_casal",
      name: "Projeto Casal",
      url: "https://projeto-casal-one.vercel.app/",
      domain: "projeto-casal-one.vercel.app",
      category: "Experiência interativa / Front-end",
      description: "Projeto front-end romântico e interativo, criado como experimento autoral para explorar animações, áudio, efeitos visuais e recursos personalizados em JavaScript puro.",
      imageUrl: ""
    },
    {
      id: "oasis_customs",
      name: "Oasis Customs",
      url: "https://oasis-customs-main.vercel.app/",
      domain: "oasis-customs-main.vercel.app",
      category: "Calculadora operacional / RP",
      description: "Calculadora automotiva para FiveM RP, com serviços de tuning, descontos, repasses, acumuladores e painel resumo em interface futurista.",
      imageUrl: ""
    },
    {
      id: "taf_prf",
      name: "Sistema TAF PRF",
      url: "https://projeto-taf-prf.vercel.app/",
      domain: "projeto-taf-prf.vercel.app",
      category: "Automação de recrutamento / FiveM",
      description: "Sistema de recrutamento policial para FiveM com avaliação dinâmica, correção automática, relatórios em formato .LOG, painel de gestão e interface Cyber-Tactical.",
      imageUrl: ""
    },
    {
      id: "fitpro",
      name: "FitPro",
      url: "https://fit-pro-woad.vercel.app/",
      domain: "fit-pro-woad.vercel.app",
      category: "Plataforma fitness / Gestão de treinos",
      description: "Protótipo de plataforma fitness para personal trainers e alunos, com dashboard, agenda, avaliação física, comunidade, planos, gráficos e persistência local.",
      imageUrl: ""
    }
  ];

  const normalizeProductionProject = (item = {}) => {
    const projectUrl = normalizeProjectUrl(item.url || item.project_url || item.public_url || item.link || "#");
    const manualImage = normalizeOptionalImageUrl(rawText(
      item.imageUrl ||
      item.image_url ||
      item.manual_image_url ||
      item.preview_image_url ||
      item.screenshot_url ||
      item.cover_url ||
      item.image ||
      ""
    ).trim());

    const normalizedProject = {
      id: rawText(item.id || generateId()),
      name: publicProjectCopy(item.name || item.title || "Projeto sem nome"),
      url: projectUrl,
      domain: publicProjectCopy(item.domain || deriveDomain(projectUrl)),
      category: publicProjectCopy(item.category || "Projeto digital"),
      description: publicProjectCopy(item.description || "Projeto cadastrado no portfólio."),
      imageUrl: manualImage
    };

    const isOwnPortfolio =
      normalizedProject.id === "upaiva_dev" ||
      /upaiva\.dev/i.test(normalizedProject.domain) ||
      /upaiva/i.test(normalizedProject.name);

    if (isOwnPortfolio) {
      normalizedProject.category = "Full Stack / IA Aplicada / Automação";
      normalizedProject.description =
        "Plataforma profissional criada para apresentar sistemas full stack, IA aplicada, automação de processos, agentes de IA, integrações com APIs e soluções digitais completas para negócios.";
    }

    return normalizedProject;
  };

  const readProductionProjectsFromStorage = () => {
    try {
      const meta = JSON.parse(localStorage.getItem(ADMIN_PROJECTS_CACHE_META_KEY) || "{}");

      // Evita que celulares presos em cache/localStorage antigo continuem exibindo a primeira versão.
      if (meta.version !== PROJECTS_CACHE_VERSION) {
        localStorage.removeItem(ADMIN_PROJECTS_STORAGE_KEY);
        return defaultProductionProjects.map((item) => ({ ...item }));
      }

      const stored = localStorage.getItem(ADMIN_PROJECTS_STORAGE_KEY);

      if (!stored) return defaultProductionProjects.map((item) => ({ ...item }));

      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) return defaultProductionProjects.map((item) => ({ ...item }));

      return parsed
        .filter((item) => item && typeof item === "object")
        .map(normalizeProductionProject);
    } catch (error) {
      return defaultProductionProjects.map((item) => ({ ...item }));
    }
  };

  const saveProductionProjectsToStorage = (source = "local-cache") => {
    try {
      localStorage.setItem(ADMIN_PROJECTS_STORAGE_KEY, JSON.stringify(productionProjects));
      localStorage.setItem(ADMIN_PROJECTS_CACHE_META_KEY, JSON.stringify({
        version: PROJECTS_CACHE_VERSION,
        source,
        savedAt: new Date().toISOString()
      }));
      return true;
    } catch (error) {
      console.warn("Não foi possível salvar os projetos no localStorage.", error);
      return false;
    }
  };

  const mapProjectToRemoteRow = (project, index = 0) => ({
    id: rawText(project.id || generateId()),
    name: rawText(project.name || "Projeto sem nome"),
    url: normalizeProjectUrl(project.url || "#"),
    domain: rawText(project.domain || deriveDomain(project.url || "")),
    category: rawText(project.category || "Projeto digital"),
    description: rawText(project.description || "Projeto cadastrado no portfólio."),
    image_url: normalizeOptionalImageUrl(project.imageUrl || ""),
    sort_order: index,
    updated_at: new Date().toISOString()
  });

  const mapRemoteRowToProject = (row = {}) => normalizeProductionProject({
    id: row.id,
    name: row.name || row.title,
    url: row.url || row.project_url || row.public_url,
    domain: row.domain,
    category: row.category,
    description: row.description,
    imageUrl: row.image_url || row.imageUrl || row.manual_image_url || row.preview_image_url || row.screenshot_url || row.cover_url
  });

  async function loadProductionProjectsFromRemote() {
    const client = getSupabaseClient();

    if (!client) {
      return { ok: false, reason: "supabase_unavailable" };
    }

    try {
      const { data, error } = await client
        .from(PROJECTS_REMOTE_TABLE)
        .select("id,name,url,domain,category,description,image_url,sort_order,updated_at")
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false });

      if (error) throw error;

      if (!Array.isArray(data) || !data.length) {
        return { ok: false, reason: "empty_remote" };
      }

      productionProjects = data
        .filter((row) => row && (row.name || row.title) && (row.url || row.project_url || row.public_url))
        .map(mapRemoteRowToProject);

      if (!productionProjects.length) {
        return { ok: false, reason: "empty_remote" };
      }
      saveProductionProjectsToStorage("remote-supabase");
      return { ok: true, count: productionProjects.length };
    } catch (error) {
      console.warn("Não foi possível carregar projetos remotos. Usando cache/local fallback.", error);
      return { ok: false, reason: "remote_error", error };
    }
  }

  async function upsertProjectRemote(project) {
    const client = getSupabaseClient();
    if (!client) return { ok: false, reason: "supabase_unavailable" };

    try {
      const projectIndex = productionProjects.findIndex((item) => item.id === project.id);
      const row = mapProjectToRemoteRow(project, Math.max(projectIndex, 0));
      const { error } = await client.from(PROJECTS_REMOTE_TABLE).upsert(row, { onConflict: "id" });

      if (error) throw error;
      return { ok: true };
    } catch (error) {
      console.warn("Não foi possível salvar projeto no Supabase.", error);
      return { ok: false, reason: "remote_error", error };
    }
  }

  async function replaceProjectsRemote(projects) {
    const client = getSupabaseClient();
    if (!client) return { ok: false, reason: "supabase_unavailable" };

    try {
      const { error: deleteError } = await client.from(PROJECTS_REMOTE_TABLE).delete().neq("id", "__never__");
      if (deleteError) throw deleteError;

      const rows = projects.map(mapProjectToRemoteRow);
      const { error: upsertError } = await client.from(PROJECTS_REMOTE_TABLE).upsert(rows, { onConflict: "id" });
      if (upsertError) throw upsertError;

      return { ok: true };
    } catch (error) {
      console.warn("Não foi possível sincronizar todos os projetos no Supabase.", error);
      return { ok: false, reason: "remote_error", error };
    }
  }

  async function deleteProjectRemote(projectId) {
    const client = getSupabaseClient();
    if (!client) return { ok: false, reason: "supabase_unavailable" };

    try {
      const { error } = await client.from(PROJECTS_REMOTE_TABLE).delete().eq("id", projectId);
      if (error) throw error;
      return { ok: true };
    } catch (error) {
      console.warn("Não foi possível remover projeto no Supabase.", error);
      return { ok: false, reason: "remote_error", error };
    }
  }

  async function loadProductionProjects() {
    productionProjects = readProductionProjectsFromStorage();
    const remote = await loadProductionProjectsFromRemote();

    if (!remote.ok) {
      saveProductionProjectsToStorage(remote.reason === "supabase_unavailable" ? "local-fallback" : "cache-fallback");
    }

    return remote;
  }

  let productionProjects = readProductionProjectsFromStorage();

  const modeContent = {
    tech: {
      bodyClass: "",
      button: "btn-tech",
      heroStatus: "[ FULL STACK, IA APLICADA & AUTOMAÇÃO ]",
      heroTitle: `Desenvolvedor Full Stack focado em <span class="text-theme-accent">IA aplicada</span>.`,
      heroDesc:
        "Sou Mateus Paiva, Desenvolvedor Full Stack focado em IA aplicada. Desenvolvo plataformas web, backends, interfaces, bancos de dados, integrações com APIs, automações, agentes de IA, soluções com LLM e RAG para transformar processos complexos em sistemas úteis para negócios.",
      servicesKicker: "/ serviços_tech",
      servicesTitle: "Soluções digitais completas com Full Stack, automação e IA aplicada.",
      servicesDescription:
        "Atuação combinando frontend, backend, banco de dados, APIs, automações, agentes de IA, LLM, RAG e estratégia para criar sistemas web inteligentes que melhoram eficiência, atendimento, operação e crescimento.",
      casesKicker: "/ cases_tech",
      casesTitle: "Projetos de sistemas web, automação e IA aplicada em contexto real.",
      casesDescription:
        "Cada case mostra problema, arquitetura da solução, tecnologias, integrações, automações e resultado entregue em plataformas, dashboards, sistemas internos e experiências digitais publicadas.",
      processKicker: "/ processo_tech",
      processTitle: "Um método claro para transformar problema em solução.",
      processDescription:
        "Escolha o foco e o tipo de entrega. A mensagem do WhatsApp será montada automaticamente com base na sua necessidade.",
      processStatus: "pipeline ativo",
      differentialKicker: "/ diferencial",
      differentialTitle: "O diferencial está em unir engenharia Full Stack, IA aplicada, operação e visão estratégica.",
      differentialDescription:
        "Não é apenas criar telas ou scripts. É entender o problema, modelar dados, integrar APIs, desenhar fluxos, automatizar decisões e entregar uma solução digital completa para uso real.",
      chartLabels: ["IA", "Backend", "APIs", "Dados", "Frontend", "Estratégia"],
      chartData: [94, 88, 90, 84, 88, 86],
      services: [
        {
          title: "Sistemas web full stack",
          text: "Desenvolvimento de plataformas, painéis e aplicações completas com frontend, backend, banco de dados, autenticação, APIs e deploy.",
          bullets: ["Frontend", "Backend", "Banco de dados", "Deploy"],
          tags: ["Full Stack", "APIs", "Supabase", "Vercel"],
          detailUrl: "https://developer.mozilla.org/pt-BR/docs/Learn"
        },
        {
          title: "IA aplicada e agentes inteligentes",
          text: "Criação de automações, agentes de IA, fluxos com LLM e soluções RAG para apoiar atendimento, análise, triagem e decisões operacionais.",
          bullets: ["Agentes de IA", "LLM", "RAG", "Triagem inteligente"],
          tags: ["IA aplicada", "LLM", "RAG", "Agentes"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/ai-automation"
        },
        {
          title: "Automação, APIs e dados",
          text: "Integrações com APIs, rotinas automatizadas, dashboards e bancos de dados para transformar informações dispersas em operação organizada.",
          bullets: ["Integrações", "APIs", "Dashboards", "Dados"],
          tags: ["APIs", "Automação", "Data Ops", "Analytics"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/data-visualization"
        }
      ],
      cases: [
        {
          id: "case_01",
          title: "Agentes e Automação Inteligente com IA",
          category: "IA",
          objective: "Automatizar processos usando agentes de IA, integrações, regras de negócio e fluxos inteligentes.",
          problem: "Processos manuais geravam retrabalho, perda de tempo e baixa rastreabilidade.",
          result: "Fluxo padronizado, redução de esforço manual e melhor controle operacional.",
          features: ["Agentes de IA", "Triagem automática", "Integrações com APIs", "Fluxo escalável"],
          stack: ["IA aplicada", "LLM", "APIs", "Automação"],
          projectUrl: "#projetos-producao",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/ai-agents",
          preview: "aiPipeline"
        },
        {
          id: "case_02",
          title: "Arquitetura Full Stack Escalável",
          category: "Full Stack",
          objective: "Criar uma base técnica organizada com frontend, backend, dados e integrações para crescer sem perder manutenção.",
          problem: "Projetos sem estrutura dificultam evolução, documentação e reaproveitamento.",
          result: "Arquitetura modular com separação clara entre interface, lógica, APIs, banco de dados e regras de negócio.",
          features: ["Frontend", "Backend", "APIs", "Evolução contínua"],
          stack: ["Full Stack", "JavaScript", "APIs", "Arquitetura"],
          projectUrl: "#projetos-producao",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://developer.mozilla.org/pt-BR/docs/Learn/Common_questions/Web_mechanics/What_is_a_web_server",
          preview: "architectureMap"
        },
        {
          id: "case_03",
          title: "Dashboard e Inteligência Operacional",
          category: "Dados",
          objective: "Transformar dados operacionais em indicadores, análises e painéis de apoio à decisão.",
          problem: "Dados importantes ficavam espalhados em planilhas, mensagens e registros manuais.",
          result: "Painel simples para visualizar eficiência, erros, tempo e evolução.",
          features: ["Indicadores", "Resumo gerencial", "Métricas visuais", "Apoio à decisão"],
          stack: ["Data Ops", "Excel", "Power BI", "Analytics"],
          projectUrl: "#projetos-producao",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/data-analytics",
          preview: "opsDashboard"
        },
        {
          id: "case_04",
          title: "Fluxo de Processos Automatizados",
          category: "Processos",
          objective: "Padronizar etapas e reduzir retrabalho operacional.",
          problem: "Sem fluxo claro, tarefas simples dependiam de memória, mensagens e conferências manuais.",
          result: "Processo visual com entrada, tratamento, validação e resultado final.",
          features: ["Mapeamento", "Padronização", "Automação", "Rastreabilidade"],
          stack: ["Lean", "RPA", "Processos", "Automação"],
          projectUrl: "https://www.ibm.com/br-pt/think/topics/document-workflow",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/document-workflow",
          preview: "processFlow"
        },
        {
          id: "case_05",
          title: "Painel de Gestão Full Stack",
          category: "Full Stack",
          objective: "Centralizar registros, status e informações importantes.",
          problem: "Acompanhar itens manualmente reduzia visibilidade e atrasava decisões.",
          result: "Sistema web com status, registros, regras de negócio e controle visual para operação.",
          features: ["CRUD", "Auth", "Registros", "Gestão visual"],
          stack: ["JavaScript", "Backend", "APIs", "Dados"],
          projectUrl: "#projetos-producao",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://developer.mozilla.org/pt-BR/docs/Learn/JavaScript",
          preview: "adminTable"
        },
        {
          id: "case_06",
          title: "Base Técnica Viva",
          category: "GitHub",
          objective: "Conectar projetos, repositórios e evolução técnica em uma base consultável.",
          problem: "Projetos sem registro dificultam manutenção, prova técnica e evolução.",
          result: "Repositórios e documentação conectados aos cases e entregas.",
          features: ["Histórico", "Versionamento", "Documentação", "Evolução técnica"],
          stack: ["Git", "GitHub", "HTML", "JavaScript"],
          projectUrl: "https://github.com/EoPaiva?tab=repositories",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://docs.github.com/pt",
          preview: "githubBase",
          featured: true
        }
      ],
      processSteps: [
        { title: "Diagnóstico", text: "Entendimento do problema, objetivo, dados, rotina atual e oportunidades de automação ou IA aplicada.", output: "Mapa inicial da solução." },
        { title: "Arquitetura", text: "Definição de frontend, backend, banco de dados, APIs, automações, agentes de IA e regras de negócio.", output: "Plano técnico de entrega." },
        { title: "Construção", text: "Desenvolvimento full stack com foco em usabilidade, integrações, segurança básica, performance e evolução.", output: "Sistema funcional." },
        { title: "SEO e IA aplicada", text: "Estruturação de metadados, schema, performance, automações, agentes e fluxos inteligentes quando agregam valor.", output: "Base técnica preparada para descoberta." },
        { title: "Publicação e evolução", text: "Deploy, validação, ajustes finais, orientação de uso e próximos incrementos para crescimento.", output: "Solução pronta para uso real." }
      ],
      differentials: [
        { title: "Full Stack aplicado", text: "Capacidade de construir interface, lógica, dados, APIs e deploy em uma solução coerente." },
        { title: "IA com uso real", text: "Agentes, automações, LLM e RAG aplicados a problemas concretos, não apenas demonstrações." },
        { title: "Visão operacional", text: "Experiência prática com processos, rotinas, qualidade e execução para desenhar sistemas úteis." },
        { title: "Estratégia de negócio", text: "Leitura para priorizar tecnologia que gera eficiência, clareza, escala e valor." }
      ],
      faq: [
        { question: "Você faz só sites?", answer: "Não. Meu foco é desenvolvimento Full Stack com IA aplicada: frontend, backend, banco de dados, APIs, automações, agentes de IA e sistemas completos para negócios." },
        { question: "Você cria plataformas e sistemas completos?", answer: "Sim. Posso construir painéis, plataformas SaaS, sistemas internos, dashboards, integrações e aplicações web inteligentes com publicação em ambiente real." },
        { question: "Você trabalha com LLM, RAG e agentes de IA?", answer: "Sim. Posso mapear processos e criar soluções com agentes de IA, fluxos com LLM, bases de conhecimento, RAG, APIs e automações para reduzir tarefas repetitivas." },
        { question: "Você também pensa em SEO e tráfego orgânico?", answer: "Sim. Estruturo páginas e aplicações com SEO técnico, metadados, schema, performance, HTML semântico e copywriting para melhorar descoberta por buscadores e IAs de pesquisa." }
      ]
    },

    hire: {
      bodyClass: "mode-hire",
      button: "btn-hire",
      heroStatus: "[ CONTRATE-ME: CLT, PJ, FREELANCER & PROJETOS ]",
      heroTitle: `Contrate um <span class="text-theme-accent">Desenvolvedor Full Stack</span> com foco em IA aplicada, automação e produto.`,
      heroDesc:
        "Disponível para oportunidades CLT, PJ, freelancer, projetos fechados e parcerias. Atuo criando sistemas web completos, plataformas SaaS, integrações com APIs, automações, agentes de IA, soluções com LLM/RAG e estruturas digitais preparadas para SEO e crescimento orgânico.",
      servicesKicker: "/ oportunidades",
      servicesTitle: "Aberto a oportunidades em Full Stack, IA aplicada, automação e crescimento digital.",
      servicesDescription:
        "Posso entrar em times, projetos ou operações que precisam transformar problemas reais em software: backend, frontend, banco de dados, APIs, automações, IA aplicada, SEO técnico e entrega publicada.",
      casesKicker: "/ provas_de_entrega",
      casesTitle: "Projetos e competências para avaliar execução técnica e visão de negócio.",
      casesDescription:
        "A base combina desenvolvimento prático, produtos publicados, organização de processos, automações e comunicação clara para times técnicos, negócios e clientes.",
      processKicker: "/ contratação",
      processTitle: "Como podemos avançar para oportunidade, parceria ou projeto.",
      processDescription:
        "Escolha o foco e o tipo de entrega. A mensagem do WhatsApp será montada com contexto para contratação, freelas, projetos ou parcerias.",
      processStatus: "disponível para conversa",
      differentialKicker: "/ por_que_mateus",
      differentialTitle: "Full Stack com IA aplicada, SEO técnico e visão de negócio em uma entrega só.",
      differentialDescription:
        "A proposta é contribuir além da tela: entender produto, modelar dados, integrar serviços, automatizar processos, documentar decisões e entregar soluções digitais que geram eficiência.",
      chartLabels: ["Full Stack", "IA", "APIs", "SEO", "Produto", "Entrega"],
      chartData: [90, 88, 86, 82, 84, 90],
      services: [
        {
          title: "CLT ou PJ em desenvolvimento Full Stack",
          text: "Atuação em frontend, backend, banco de dados, APIs, manutenção, evolução de produto e publicação de aplicações.",
          bullets: ["JavaScript", "Backend", "Frontend", "Deploy"],
          tags: ["CLT", "PJ", "Full Stack", "Produto"],
          detailUrl: "perfil-profissional.html"
        },
        {
          title: "Projetos freelancer e escopos fechados",
          text: "Criação de sistemas web, landing pages estratégicas, dashboards, plataformas e automações com entrega objetiva.",
          bullets: ["Escopo", "Prazo", "Publicação", "Evolução"],
          tags: ["Freelancer", "Projetos", "SaaS", "SEO"],
          detailUrl: "#contato"
        },
        {
          title: "IA aplicada para operação e atendimento",
          text: "Desenvolvimento de agentes, fluxos com LLM, RAG, triagem, bases de conhecimento e integrações com ferramentas do negócio.",
          bullets: ["Agentes de IA", "LLM", "RAG", "APIs"],
          tags: ["IA aplicada", "Automação", "APIs", "Operação"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/ai-agents"
        },
        {
          title: "Cargos compatíveis e frentes de contribuição",
          text: "Perfil adequado para vagas júnior/pleno e projetos que exigem entrega prática, comunicação clara e visão de produto.",
          bullets: ["Full Stack Jr/Pleno", "Front-end ou Back-end", "Automações e IA", "Analista de Sistemas"],
          tags: ["Software", "Sistemas", "Tecnologia", "IA aplicada"],
          detailUrl: "perfil-profissional.html"
        }
      ],
      cases: [
        {
          id: "hire_01",
          title: "Full Stack para produto digital",
          category: "CLT/PJ",
          objective: "Contribuir em produto com interface, regras de negócio, APIs, dados e deploy.",
          problem: "Times precisam de alguém que conecte implementação, contexto de negócio e evolução contínua.",
          result: "Entrega técnica mais alinhada ao uso real, com visão de produto e manutenção.",
          features: ["Frontend", "Backend", "APIs", "Banco de dados"],
          stack: ["JavaScript", "Supabase", "Vercel", "Arquitetura"],
          projectUrl: "perfil-profissional.html",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "perfil-profissional.html",
          preview: "architectureMap",
          featured: true
        },
        {
          id: "hire_02",
          title: "Automação e IA aplicada",
          category: "IA",
          objective: "Criar fluxos inteligentes para reduzir tarefas repetitivas, triagem manual e ruído operacional.",
          problem: "Processos manuais consomem tempo e escondem dados importantes.",
          result: "Rotinas automatizadas com regras, integração e IA aplicada onde faz sentido.",
          features: ["Agentes", "Triagem", "RAG", "Integrações"],
          stack: ["LLM", "RAG", "APIs", "Automação"],
          projectUrl: "#servicos",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#ai-search-context",
          preview: "aiPipeline"
        },
        {
          id: "hire_03",
          title: "Freelancer para sistemas e sites estratégicos",
          category: "Freelancer",
          objective: "Entregar projetos digitais publicados com copy, UX, SEO técnico e caminho claro de contato.",
          problem: "Projetos genéricos não comunicam valor, não indexam bem e não apoiam conversão.",
          result: "Experiência mais profissional, encontrável e preparada para gerar oportunidades.",
          features: ["SEO técnico", "Copywriting", "Responsivo", "Publicação"],
          stack: ["HTML", "CSS", "JavaScript", "SEO"],
          projectUrl: "#projetos-producao",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#seo-organico",
          preview: "conversionPage"
        },
        {
          id: "hire_04",
          title: "Integrações e APIs para operação",
          category: "APIs",
          objective: "Conectar ferramentas, dados e etapas de negócio em fluxos mais rastreáveis.",
          problem: "Sistemas isolados geram retrabalho, perda de informação e decisões lentas.",
          result: "Processos conectados por APIs, formulários, registros, notificações e painéis.",
          features: ["APIs", "Dados", "Notificações", "Dashboards"],
          stack: ["REST", "Supabase", "Automação", "Data Ops"],
          projectUrl: "#processo",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#processo",
          preview: "processFlow"
        },
        {
          id: "hire_05",
          title: "Plataformas SaaS e painéis internos",
          category: "SaaS",
          objective: "Criar estrutura de produto com usuários, dados, status, permissões e painel de gestão.",
          problem: "Operações dependentes de planilhas e mensagens não escalam com clareza.",
          result: "Base de sistema pronta para operar, medir, automatizar e evoluir.",
          features: ["Auth", "CRUD", "Painel", "Métricas"],
          stack: ["Full Stack", "Banco de dados", "UI", "Deploy"],
          projectUrl: "#projetos-producao",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#servicos",
          preview: "adminTable"
        },
        {
          id: "hire_06",
          title: "Perfil técnico com comunicação clara",
          category: "Time",
          objective: "Ajudar times e clientes a transformar contexto ambíguo em escopo, execução e entrega.",
          problem: "Tecnologia perde força quando a solução não é explicada, priorizada ou conectada ao objetivo.",
          result: "Comunicação objetiva, documentação leve e foco em resolver problemas reais.",
          features: ["Escopo", "Documentação", "Priorização", "Entrega"],
          stack: ["Produto", "Processos", "Comunicação", "Estratégia"],
          projectUrl: "#contato",
          githubUrl: "https://linkedin.com/in/mateus-paiva-19804b284",
          detailUrl: "#contato",
          preview: "communicationHub"
        }
      ],
      processSteps: [
        { title: "Conversa inicial", text: "Alinhamos vaga, projeto, escopo, rotina, stack, maturidade do produto e resultado esperado.", output: "Contexto claro." },
        { title: "Avaliação técnica", text: "Compartilho portfólio, perfil profissional, GitHub e exemplos de entregas ligadas ao desafio.", output: "Critérios alinhados." },
        { title: "Modelo de contratação", text: "Definimos CLT, PJ, freelancer, projeto fechado ou parceria com expectativas, prazos e responsabilidades.", output: "Formato definido." },
        { title: "Execução e evolução", text: "Entro no fluxo com comunicação objetiva, entregas incrementais, documentação e melhoria contínua.", output: "Entrega acompanhável." }
      ],
      differentials: [
        { title: "Entrega full stack", text: "Interface, backend, APIs, banco de dados e publicação conectados para resolver o problema completo." },
        { title: "IA aplicada com critério", text: "Agentes, LLM, RAG e automações usados para eficiência real, não como enfeite técnico." },
        { title: "SEO e crescimento", text: "Desenvolvimento pensado para performance, indexação, tráfego orgânico e clareza comercial." },
        { title: "Comunicação de negócio", text: "Capacidade de traduzir tecnologia em prioridade, impacto, escopo e próximos passos." }
      ],
      faq: [
        { question: "Você está aberto a CLT, PJ e freelancer?", answer: "Sim. Estou aberto a oportunidades CLT, PJ, freelancer, projetos fechados e parcerias em Full Stack, IA aplicada, automação, APIs, SEO técnico e plataformas digitais." },
        { question: "Que tipo de vaga ou projeto combina com seu perfil?", answer: "Desenvolvimento Full Stack, produto web, automação de processos, integrações com APIs, agentes de IA, SaaS, dashboards, SEO técnico e soluções digitais para negócios." },
        { question: "Você consegue atuar além de criar telas?", answer: "Sim. Posso atuar em frontend, backend, banco de dados, APIs, automação, IA aplicada, publicação, documentação e evolução do produto." }
      ]
    },

    client: {
      bodyClass: "mode-client",
      button: "btn-client",
      heroStatus: "[ SOLUÇÕES DIGITAIS, IA & EFICIÊNCIA ]",
      heroTitle: `Sistemas, automações e IA aplicada para quem precisa <span class="text-theme-accent">crescer com eficiência</span>.`,
      heroDesc:
        "Criação de soluções digitais completas: sistemas web, plataformas, dashboards, automações, integrações com APIs e recursos de IA para organizar processos, reduzir trabalho manual e gerar mais clareza para decisões.",
      servicesKicker: "/ soluções_cliente",
      servicesTitle: "Soluções digitais completas para o seu negócio operar melhor.",
      servicesDescription:
        "Soluções pensadas para transformar uma ideia, processo ou serviço em sistema funcional, plataforma SaaS, painel de gestão, automação inteligente ou aplicação com IA integrada, sempre com base técnica para SEO e tráfego orgânico.",
      casesKicker: "/ entregas_cliente",
      casesTitle: "Exemplos de sistemas, dashboards e automações aplicáveis ao seu negócio.",
      casesDescription:
        "De plataformas digitais a automações internas: o foco é entregar algo útil, visual, fácil de usar e alinhado a atendimento, operação, produtividade e crescimento.",
      processKicker: "/ processo_cliente",
      processTitle: "Um caminho simples para tirar sua solução do papel.",
      processDescription:
        "Você explica a necessidade, eu organizo a solução, construo e entrego com orientação de uso.",
      processStatus: "atendimento comercial",
      differentialKicker: "/ por_que_contratar",
      differentialTitle: "Você não contrata apenas código. Você contrata tecnologia aplicada ao negócio.",
      differentialDescription:
        "O objetivo é entregar uma solução que conecte processo, dados, interface, automação e IA para gerar eficiência, clareza e resultado.",
      chartLabels: ["Sistemas", "Automação", "IA", "APIs", "Processos", "Resultado"],
      chartData: [92, 90, 88, 86, 88, 90],
      services: [
        {
          title: "Sistema web ou plataforma SaaS",
          text: "Aplicação sob medida para organizar atendimento, operação, dados, clientes, serviços ou processos internos em uma interface profissional.",
          bullets: ["Painel", "Login", "Dados", "Deploy"],
          tags: ["Sistema", "SaaS", "Full Stack", "Banco de dados"],
          detailUrl: "https://developer.mozilla.org/pt-BR/docs/Learn/Getting_started_with_the_web"
        },
        {
          title: "Automação de processos com IA",
          text: "Fluxos para reduzir tarefas manuais, integrar ferramentas, padronizar respostas, organizar demandas e acelerar rotinas com inteligência artificial aplicada.",
          bullets: ["Fluxos", "APIs", "Triagem", "Relatórios"],
          tags: ["Automação", "IA", "APIs", "Processos"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/digital-transformation"
        },
        {
          title: "Agentes de IA e soluções inteligentes",
          text: "Aplicações com agentes de IA, LLM, RAG e bases de conhecimento para atendimento, consulta de dados, análise, recomendação e apoio à decisão.",
          bullets: ["Agentes IA", "LLM", "RAG", "Base de conhecimento"],
          tags: ["IA aplicada", "LLM", "RAG", "Agentes"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/workflow-automation"
        }
      ],
      cases: [
        {
          id: "client_01",
          title: "Plataforma Web Profissional",
          category: "Sistema",
          objective: "Criar uma presença digital estruturada com interface, dados, navegação e contato direto.",
          problem: "Negócio sem plataforma clara perde autoridade, organização, conversão e rastreabilidade.",
          result: "Aplicação moderna, responsiva, com identidade visual, fluxo comercial e base para evolução.",
          features: ["Interface", "Serviços", "Portfólio", "Contato"],
          stack: ["Full Stack", "JavaScript", "SEO", "Deploy"],
          projectUrl: "https://studiojmarq.com/",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#projetos-producao",
          preview: "websitePreview"
        },
        {
          id: "client_02",
          title: "Fluxo de Conversão",
          category: "Venda",
          objective: "Transformar visitantes, formulários e interações em contatos qualificados e dados organizados.",
          problem: "Divulgação sem página clara dificulta conversão e acompanhamento.",
          result: "Fluxo digital com mensagem objetiva, CTA, estrutura de venda e caminho para automação.",
          features: ["Oferta", "Benefícios", "Prova visual", "Automação"],
          stack: ["Copy", "UX", "Automação", "Mobile"],
          projectUrl: "#contato",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#contato",
          preview: "conversionPage"
        },
        {
          id: "client_03",
          title: "Sistema de Orçamento e Operação",
          category: "Operação",
          objective: "Organizar cálculo, atendimento e tomada de decisão.",
          problem: "Orçamentos manuais geravam erro, demora e falta de padrão.",
          result: "Sistema ou painel para agilizar atendimento, cálculo, registro e operação.",
          features: ["Cálculo", "Resumo", "Histórico", "Padronização"],
          stack: ["JavaScript", "Dados", "Automação", "Full Stack"],
          projectUrl: "https://oasis-customs-main.vercel.app/",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#projetos-producao",
          preview: "budgetSystem"
        },
        {
          id: "client_04",
          title: "Triagem Inteligente",
          category: "Automação",
          objective: "Captar dados, organizar demandas e acionar fluxos automaticamente.",
          problem: "Mensagens soltas dificultavam triagem, prioridade e retorno.",
          result: "Formulário estruturado com fluxo de envio e organização.",
          features: ["Captação", "Triagem", "Validação", "Mensagem pronta"],
          stack: ["Forms", "APIs", "WhatsApp", "Automação"],
          projectUrl: "#processo",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/document-workflow",
          preview: "smartForm"
        },
        {
          id: "client_05",
          title: "Dashboard com Inteligência Operacional",
          category: "Dados",
          objective: "Transformar dados simples em visão de resultado.",
          problem: "Sem indicadores, decisões ficam baseadas em percepção e urgência.",
          result: "Painel com números, status, resumo gerencial e base para decisões melhores.",
          features: ["Indicadores", "Status", "Resumo", "Visual"],
          stack: ["Dashboard", "Dados", "Analytics", "UI"],
          projectUrl: "#github",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/data-visualization",
          preview: "decisionPanel"
        },
        {
          id: "client_06",
          title: "Solução Digital Completa",
          category: "Solução",
          objective: "Criar uma solução combinando sistema web, automação, atendimento, dados e IA aplicada.",
          problem: "Ferramentas desconectadas dificultam rotina e crescimento.",
          result: "Solução personalizada de acordo com o processo real, com estrutura para crescer e evoluir.",
          features: ["Sistema", "Automação", "IA", "Dashboard"],
          stack: ["Full Stack", "IA", "Processos", "Estratégia"],
          projectUrl: "#contato",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#contato",
          preview: "solutionStack",
          featured: true
        }
      ],
      processSteps: [
        { title: "Conversa inicial", text: "Você explica o problema, rotina atual, ferramentas usadas e resultado esperado.", output: "Necessidade entendida." },
        { title: "Proposta de solução", text: "Eu organizo escopo, telas, dados, automações, integrações e caminho técnico.", output: "Escopo definido." },
        { title: "Desenvolvimento", text: "Construção da solução full stack com acompanhamento, ajustes, validação visual e lógica funcional.", output: "Sistema em operação." },
        { title: "Entrega e evolução", text: "Publicação, explicação de uso, melhorias de performance e próximos passos com automação ou IA.", output: "Solução pronta para crescer." }
      ],
      differentials: [
        { title: "Foco em operação real", text: "A solução é pensada para atendimento, venda, organização, dados ou eficiência interna." },
        { title: "Sistema completo", text: "Interface, lógica, banco de dados, APIs e deploy conectados em uma entrega funcional." },
        { title: "IA aplicada com clareza", text: "Automação e inteligência artificial entram onde fazem sentido para reduzir esforço e acelerar decisões." },
        { title: "Entrega personalizada", text: "Cada projeto é desenhado conforme negócio, objetivo, processo e possibilidade de evolução." }
      ],
      faq: [
        { question: "Você faz só site ou também sistema?", answer: "Faço sistemas e soluções digitais completas. Um site pode fazer parte da entrega, mas o foco pode incluir painel, banco de dados, APIs, automações e IA aplicada." },
        { question: "Você consegue automatizar processos do meu negócio?", answer: "Sim. Posso mapear tarefas repetitivas e criar fluxos com formulários, integrações, APIs, dashboards, notificações e recursos de IA." },
        { question: "Você faz manutenção e evolução depois?", answer: "Sim. A manutenção pode incluir ajustes, publicação, performance, novas telas, automações, integrações e evolução com IA aplicada conforme o projeto cresce." }
      ]
    }
  };

  function setText(id, value, asHTML = false) {
    const element = document.getElementById(id);
    if (!element) return;

    if (asHTML) {
      element.innerHTML = value;
      return;
    }

    element.textContent = value;
  }

  function getCurrentContent() {
    return modeContent[currentMode] || modeContent.tech;
  }

  /* =========================================================
     ANALYTICS LOCAL ANTIGO REMOVIDO
     O analytics oficial agora é analytics-pro-complete.js.
     Estas funções ficam como compatibilidade leve para não
     quebrar chamadas antigas do site.
  ========================================================= */

  function recordModeUsage() {
    return;
  }

  function trackAnalyticsClick() {
    return;
  }

  function updateScrollAnalytics() {
    return;
  }

  function markAnalyticsSection() {
    return;
  }

  function updateAnalyticsPanel() {
    return;
  }

  async function initAnalyticsTracking() {
    return;
  }

  function exportAnalyticsJson() {
    if (typeof setAdminTemporaryStatus === "function") {
      setAdminTemporaryStatus("Analytics local desativado");
    }
  }

  function resetAnalyticsData() {
    if (typeof setAdminTemporaryStatus === "function") {
      setAdminTemporaryStatus("Analytics local desativado");
    }
  }

  function ensureAdminAnalyticsUI() {
    const nav = $(".admin-nav");
    const main = $(".admin-main");

    if (nav && !$('[data-admin-tab="analytics"]', nav)) {
      const analyticsButtonHtml = `
        <button type="button" class="admin-nav-btn" data-admin-tab="analytics">
          05. Analytics
        </button>
      `;

      const settingsButton = $('[data-admin-tab="settings"]', nav);

      if (settingsButton) {
        settingsButton.insertAdjacentHTML("afterend", analyticsButtonHtml);
      } else {
        nav.insertAdjacentHTML("beforeend", analyticsButtonHtml);
      }
    }

    if (main && !$("#admin-tab-analytics")) {
      main.insertAdjacentHTML("beforeend", `
        <section id="admin-tab-analytics" class="admin-tab-content"></section>
      `);
    }
  }

  function updateModeButtons() {
    const content = getCurrentContent();

    ["btn-tech", "btn-hire", "btn-client"].forEach((id) => {
      const button = document.getElementById(id);
      if (!button) return;

      const isActive = id === content.button;

      button.classList.toggle("bg-theme-accent", isActive);
      button.classList.toggle("text-black", isActive);
      button.classList.toggle("text-slate-400", !isActive);
    });
  }

  function applyMode(mode) {
    currentMode = mode;
    activeCaseFilter = "Todos";

    recordModeUsage(mode);

    document.body.classList.remove("mode-hire", "mode-client");

    const content = getCurrentContent();

    if (content.bodyClass) {
      document.body.classList.add(content.bodyClass);
    }

    setText("hero-status", content.heroStatus);
    setText("hero-title", content.heroTitle, true);
    setText("hero-desc", content.heroDesc);

    setText("services-kicker", content.servicesKicker);
    setText("services-title", content.servicesTitle);
    setText("services-description", content.servicesDescription);

    setText("cases-kicker", content.casesKicker);
    setText("cases-title", content.casesTitle);
    setText("cases-description", content.casesDescription);

    setText("process-kicker", content.processKicker);
    setText("process-title", content.processTitle);
    setText("process-description", content.processDescription);
    setText("process-status", content.processStatus);

    setText("differential-kicker", content.differentialKicker);
    setText("differential-title", content.differentialTitle);
    setText("differential-description", content.differentialDescription);

    updateModeButtons();
    renderServices();
    renderCaseFilters();
    renderCases();
    renderProcess();
    renderDifferentials();
    renderFaq();
    updateSkillChart();
    updateProcessWhatsApp();
    updateAdminMetrics();
  }

  function renderServices() {
    const grid = $("#services-grid");
    if (!grid) return;

    const { services } = getCurrentContent();

    grid.innerHTML = services.map((service) => {
      const bullets = service.bullets
        .map((bullet) => `<li><span>&gt;</span> ${safeText(bullet)}</li>`)
        .join("");

      const tags = service.tags
        .map((tag) => `<span class="repo-pill">${safeText(tag)}</span>`)
        .join("");

      return `
        <article class="service-card reveal bg-theme-card border border-theme-border rounded-2xl p-6 min-h-[320px] flex flex-col">
          <div class="relative z-10 flex flex-col h-full">
            <span class="font-mono text-theme-accent text-[10px] uppercase tracking-[0.22em]">service</span>
            <h3 class="text-xl font-bold text-theme-title mt-4 mb-4">${safeText(service.title)}</h3>
            <p class="text-theme-text text-sm leading-relaxed mb-5">${safeText(service.text)}</p>

            <ul class="space-y-2 text-sm text-theme-text font-mono mb-6">
              ${bullets}
            </ul>

            <div class="flex flex-wrap gap-2 mb-6">
              ${tags}
            </div>

            <a
              href="${safeText(service.detailUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              class="hover-target inline-flex mt-auto px-5 py-3 bg-theme-accent text-black font-bold rounded uppercase text-[10px] transition-all hover:scale-105 w-fit"
            >
              Ver detalhes
            </a>
          </div>
        </article>
      `;
    }).join("");

    activateReveals();
  }

  function uniqueCategories() {
    const cases = getCurrentContent().cases;
    return ["Todos", ...Array.from(new Set(cases.map((item) => item.category)))];
  }

  function renderCaseFilters() {
    const container = $("#case-filter-container");
    if (!container) return;

    container.innerHTML = uniqueCategories().map((category) => `
      <button
        type="button"
        class="case-filter-btn hover-target border border-theme-border rounded-full px-4 py-2 uppercase tracking-widest transition-all ${category === activeCaseFilter ? "active-filter" : ""}"
        data-case-filter="${safeText(category)}"
      >
        ${safeText(category)}
      </button>
    `).join("");

    $$("[data-case-filter]", container).forEach((button) => {
      button.addEventListener("click", () => {
        activeCaseFilter = button.dataset.caseFilter || "Todos";
        renderCaseFilters();
        renderCases();
      });
    });
  }

  function previewNode(label) {
    return `
      <span
        class="flow-node inline-flex items-center justify-center text-center font-bold whitespace-nowrap"
        style="min-width:0;width:100%;height:38px;padding:0 0.42rem;font-size:9px;line-height:1;overflow:hidden;text-overflow:ellipsis;"
        title="${safeText(label)}"
      >
        ${safeText(label)}
      </span>
    `;
  }

  function previewArrow(symbol = "→") {
    return `
      <span
        class="flow-arrow inline-flex items-center justify-center text-center"
        style="min-width:12px;font-size:12px;line-height:1;"
      >
        ${symbol}
      </span>
    `;
  }

  function flowRow(labels) {
    return `
      <div class="mock-window w-full p-4" style="max-width:300px;overflow:visible;">
        <div
          class="case-flow-row"
          style="display:grid;grid-template-columns:minmax(56px,1fr) 12px minmax(72px,1.12fr) 12px minmax(56px,1fr);align-items:center;gap:0.42rem;width:100%;"
        >
          ${previewNode(labels[0])}
          ${previewArrow()}
          ${previewNode(labels[1])}
          ${previewArrow()}
          ${previewNode(labels[2])}
        </div>
      </div>
    `;
  }

  function previewMarkup(type) {
    const commonShellStart = `<div class="case-preview flex items-center justify-center p-6">`;
    const commonShellEnd = `</div>`;

    if (type === "aiPipeline") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[305px] p-4">
            <div class="flex justify-between mb-4 text-[9px] font-mono text-theme-accent">
              <span>agent.flow</span>
              <span>IA ativa</span>
            </div>
            <div class="grid grid-cols-3 gap-2 mb-4">
              <div class="flow-node inline-flex items-center justify-center text-center text-[9px] font-bold h-[38px] px-1">Captura</div>
              <div class="flow-node inline-flex items-center justify-center text-center text-[9px] font-bold h-[38px] px-1">IA</div>
              <div class="flow-node inline-flex items-center justify-center text-center text-[9px] font-bold h-[38px] px-1">Ação</div>
            </div>
            <div class="mock-line w-full mb-3"></div>
            <div class="mock-bar w-[82%] mb-3"></div>
            <div class="mock-line w-[64%]"></div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "architectureMap") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[310px] p-4">
            <div class="grid grid-cols-[1fr_12px_1fr] gap-2 items-center mb-3">
              <div class="metric-box text-center text-[9px] font-mono text-theme-title h-[54px] flex items-center justify-center px-1">Interface</div>
              <div class="flow-arrow text-center">→</div>
              <div class="metric-box text-center text-[9px] font-mono text-theme-title h-[54px] flex items-center justify-center px-1">Lógica</div>
            </div>
            <div class="grid grid-cols-[1fr_12px_1fr] gap-2 items-center">
              <div class="metric-box text-center text-[9px] font-mono text-theme-title h-[54px] flex items-center justify-center px-1">APIs</div>
              <div class="flow-arrow text-center">→</div>
              <div class="metric-box text-center text-[9px] font-mono text-theme-title h-[54px] flex items-center justify-center px-1">Dados</div>
            </div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "opsDashboard") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[295px] p-4">
            <div class="grid grid-cols-3 gap-2 mb-4">
              <div class="metric-box text-center px-1">
                <p class="intel-label">Eficiência</p>
                <p class="text-theme-title font-bold text-xl">91%</p>
              </div>
              <div class="metric-box text-center px-1">
                <p class="intel-label">Erros</p>
                <p class="text-theme-title font-bold text-xl">-34%</p>
              </div>
              <div class="metric-box text-center px-1">
                <p class="intel-label">Tempo</p>
                <p class="text-theme-title font-bold text-xl">+2.4x</p>
              </div>
            </div>
            <div class="mock-bar w-full mb-3"></div>
            <div class="mock-bar w-[74%] mb-3"></div>
            <div class="mock-line w-[88%]"></div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "processFlow") {
      return `${commonShellStart}${flowRow(["Entrada", "Processo", "Saída"])}${commonShellEnd}`;
    }

    if (type === "adminTable") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[310px] p-4 font-mono text-[10px]">
            <div class="grid grid-cols-4 text-theme-text border-b border-theme-border pb-2 mb-3">
              <span>ID</span><span>Status</span><span>Dono</span><span>Ação</span>
            </div>
            <div class="grid grid-cols-4 text-theme-title gap-y-2">
              <span>01</span><span class="text-theme-accent">ativo</span><span>ops</span><span>ok</span>
              <span>02</span><span class="text-yellow-400">fila</span><span>dev</span><span>ok</span>
              <span>03</span><span class="text-green-400">feito</span><span>rh</span><span>log</span>
            </div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "githubBase") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[292px] p-4">
            <div class="grid grid-cols-[78px_1fr] gap-3 mb-4">
              <div class="metric-box">
                <p class="intel-label">repos</p>
                <p class="intel-number">13</p>
              </div>
              <div class="metric-box">
                <p class="intel-label">stack dominante</p>
                <p class="text-theme-title font-bold mt-2">HTML</p>
                <div class="intel-meter mt-3"><div class="intel-meter-fill"></div></div>
              </div>
            </div>
            <div class="repo-row font-mono text-[10px] text-theme-title mb-2 flex items-center justify-between">
              <span>Oasis</span><span class="text-theme-accent">repo</span>
            </div>
            <div class="repo-row font-mono text-[10px] text-theme-title flex items-center justify-between">
              <span>Projeto</span><span class="text-theme-accent">live</span>
            </div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "qualityCheck") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[295px] p-4">
            <div class="grid grid-cols-3 gap-2 mb-4">
              <div class="metric-box text-center px-1">
                <p class="intel-label">Teste</p>
                <p class="text-theme-title font-bold text-lg">OK</p>
              </div>
              <div class="metric-box text-center px-1">
                <p class="intel-label">Qual.</p>
                <p class="text-theme-title font-bold text-lg">98%</p>
              </div>
              <div class="metric-box text-center px-1">
                <p class="intel-label">Risco</p>
                <p class="text-theme-title font-bold text-lg">baixo</p>
              </div>
            </div>
            <div class="mock-bar w-[88%] mb-3"></div>
            <div class="mock-line w-[76%]"></div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "teamOps") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[310px] p-4">
            <div class="grid grid-cols-[1fr_1fr] gap-3 mb-3">
              <div class="metric-box text-center">
                <p class="intel-label">Equipe</p>
                <p class="text-theme-title font-bold text-xl">Dev</p>
              </div>
              <div class="metric-box text-center">
                <p class="intel-label">Suporte</p>
                <p class="text-theme-title font-bold text-xl">24h</p>
              </div>
            </div>
            ${flowRow(["Infra", "Gestão", "Entrega"])}
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "lossPrevention") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[302px] p-4 font-mono text-[10px]">
            <div class="grid grid-cols-3 text-theme-text border-b border-theme-border pb-2 mb-3">
              <span>Item</span><span>Risco</span><span>Status</span>
            </div>
            <div class="grid grid-cols-3 text-theme-title gap-y-2">
              <span>A01</span><span class="text-yellow-400">médio</span><span class="text-theme-accent">ok</span>
              <span>B12</span><span class="text-green-400">baixo</span><span>check</span>
              <span>C08</span><span class="text-theme-accent">map</span><span>log</span>
            </div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "peopleRadar") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[285px] p-5">
            <div class="grid grid-cols-[110px_1fr] gap-4 items-center">
              <div class="relative mx-auto w-24 h-24 rounded-full border border-theme-border grid place-items-center">
                <div class="absolute w-18 h-18 rounded-full border border-theme-border"></div>
                <div class="absolute w-12 h-12 rounded-full border border-theme-border"></div>
                <div class="absolute w-3 h-3 rounded-full bg-theme-accent shadow-[0_0_18px_var(--accent-color)]"></div>
                <div class="absolute top-5 left-8 w-11 h-11 bg-theme-accent/20 border border-theme-accent rotate-45"></div>
              </div>
              <div class="space-y-2">
                <div class="mock-bar w-full"></div>
                <div class="mock-bar w-[74%]"></div>
                <div class="mock-line w-[86%]"></div>
              </div>
            </div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "communicationHub") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[300px] p-4">
            <div class="space-y-3">
              <div class="repo-row font-mono text-[10px] text-theme-title flex justify-between">
                <span>Briefing</span><span class="text-theme-accent">claro</span>
              </div>
              <div class="repo-row font-mono text-[10px] text-theme-title flex justify-between">
                <span>Suporte</span><span class="text-theme-accent">ativo</span>
              </div>
              <div class="repo-row font-mono text-[10px] text-theme-title flex justify-between">
                <span>Alinhar</span><span class="text-theme-accent">ok</span>
              </div>
            </div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "continuousImprovement") {
      return `${commonShellStart}${flowRow(["Mapear", "Ajustar", "Evoluir"])}${commonShellEnd}`;
    }

    if (type === "websitePreview") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[310px] p-4">
            <div class="mock-line w-[45%] mb-4"></div>
            <div class="mock-line w-full mb-2"></div>
            <div class="mock-line w-[78%] mb-4"></div>
            <div class="grid grid-cols-3 gap-2">
              <div class="metric-box h-[44px]"></div>
              <div class="metric-box h-[44px]"></div>
              <div class="metric-box h-[44px]"></div>
            </div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "conversionPage") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[300px] p-4 text-center">
            <div class="mock-line w-[70%] mx-auto mb-3"></div>
            <div class="mock-line w-full mb-2"></div>
            <div class="mock-line w-[86%] mx-auto mb-4"></div>
            <div class="inline-flex px-5 py-3 rounded-lg bg-theme-accent text-black font-bold text-[10px] uppercase">
              CTA
            </div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "budgetSystem") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[302px] p-4">
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div class="metric-box">
                <p class="intel-label">Serviço</p>
                <p class="text-theme-title font-bold mt-1">R$</p>
              </div>
              <div class="metric-box">
                <p class="intel-label">Total</p>
                <p class="text-theme-title font-bold mt-1">Auto</p>
              </div>
            </div>
            <div class="mock-bar w-full mb-3"></div>
            <div class="mock-line w-[72%]"></div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "smartForm") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[306px] p-4">
            <div class="grid gap-3">
              <div class="mock-line w-[72%]"></div>
              <div class="metric-box h-[38px] flex items-center text-[10px] font-mono text-theme-title">Nome / Serviço</div>
              <div class="metric-box h-[38px] flex items-center text-[10px] font-mono text-theme-title">Necessidade</div>
              <div class="flex justify-between items-center">
                <div class="mock-line w-[42%]"></div>
                <div class="px-4 py-2 rounded-lg bg-theme-accent text-black text-[10px] font-bold">ENVIAR</div>
              </div>
            </div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "decisionPanel") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[295px] p-4">
            <div class="grid grid-cols-3 gap-2 mb-4">
              <div class="metric-box text-center px-1">
                <p class="intel-label">Lead</p>
                <p class="text-theme-title font-bold text-xl">42</p>
              </div>
              <div class="metric-box text-center px-1">
                <p class="intel-label">Venda</p>
                <p class="text-theme-title font-bold text-xl">18</p>
              </div>
              <div class="metric-box text-center px-1">
                <p class="intel-label">Meta</p>
                <p class="text-theme-title font-bold text-xl">87%</p>
              </div>
            </div>
            <div class="mock-bar w-[92%] mb-3"></div>
            <div class="mock-line w-[80%]"></div>
          </div>
        ${commonShellEnd}
      `;
    }

    if (type === "solutionStack") {
      return `
        ${commonShellStart}
          <div class="mock-window w-full max-w-[316px] p-4">
            <div class="grid grid-cols-2 gap-3 mb-3">
              <div class="metric-box text-center text-[10px] font-mono text-theme-title h-[46px] flex items-center justify-center">Site</div>
              <div class="metric-box text-center text-[10px] font-mono text-theme-title h-[46px] flex items-center justify-center">IA</div>
              <div class="metric-box text-center text-[10px] font-mono text-theme-title h-[46px] flex items-center justify-center">WhatsApp</div>
              <div class="metric-box text-center text-[10px] font-mono text-theme-title h-[46px] flex items-center justify-center">Dashboard</div>
            </div>
            <div class="mock-bar w-full"></div>
          </div>
        ${commonShellEnd}
      `;
    }

    return `
      ${commonShellStart}
        <div class="mock-window w-full max-w-[280px] p-4">
          <div class="mock-line w-full mb-3"></div>
          <div class="mock-bar w-[72%] mb-3"></div>
          <div class="mock-line w-[86%]"></div>
        </div>
      ${commonShellEnd}
    `;
  }

  function renderCases() {
    const grid = $("#cases-grid");
    if (!grid) return;

    const cases = getCurrentContent().cases.filter((item) => {
      return activeCaseFilter === "Todos" || item.category === activeCaseFilter;
    });

    grid.innerHTML = cases.map((item) => {
      const tags = item.stack
        .map((tag) => `<span class="repo-pill">${safeText(tag)}</span>`)
        .join("");

      const features = item.features
        .slice(0, 4)
        .map((feature) => `<li><span>&gt;</span> ${safeText(feature)}</li>`)
        .join("");

      return `
        <article class="case-card reveal ${item.featured ? "featured-case" : "bg-theme-card"} border border-theme-border rounded-2xl p-6 flex flex-col">
          <div class="relative z-10 flex flex-col h-full">
            ${previewMarkup(item.preview)}

            <div class="flex items-center justify-between mt-6 mb-4">
              <span class="font-mono text-theme-accent text-[10px] uppercase tracking-[0.24em]">${safeText(item.id)}</span>
              <span class="repo-pill">${safeText(item.category)}</span>
            </div>

            <h3 class="text-xl font-bold text-theme-title mb-4">${safeText(item.title)}</h3>
            <p class="text-theme-text text-sm leading-relaxed mb-5">${safeText(item.objective)}</p>

            <ul class="space-y-2 text-sm text-theme-text font-mono mb-6">
              ${features}
            </ul>

            <div class="flex flex-wrap gap-2 mb-6">
              ${tags}
            </div>

            <div class="flex flex-wrap gap-3 mt-auto">
              <button
                type="button"
                class="hover-target open-case-modal px-5 py-3 bg-theme-accent text-black font-bold rounded uppercase text-[10px] transition-all hover:scale-105"
                data-case-id="${safeText(item.id)}"
              >
                Ver detalhes
              </button>

              <a
                href="${safeText(item.githubUrl)}"
                target="_blank"
                rel="noopener noreferrer"
                class="hover-target px-5 py-3 border border-theme-border text-theme-title font-bold rounded uppercase text-[10px] transition-all hover:border-theme-accent hover:text-theme-accent"
              >
                GitHub
              </a>
            </div>
          </div>
        </article>
      `;
    }).join("");

    $$(".open-case-modal", grid).forEach((button) => {
      button.addEventListener("click", () => {
        trackAnalyticsClick("case_detail", {
          caseId: button.dataset.caseId || ""
        });

        openCaseModal(button.dataset.caseId);
      });
    });

    activateReveals();
  }

  function findCase(caseId) {
    return getCurrentContent().cases.find((item) => item.id === caseId);
  }

  function setCaseModalPerformance(isOpen) {
    document.body.classList.toggle("case-modal-open", isOpen);

    const cursor = $("#custom-cursor");
    if (!cursor) return;

    if (isOpen) {
      cursor.dataset.previousDisplay = cursor.style.display || "";
      cursor.style.display = "none";
      return;
    }

    if (!document.body.classList.contains("admin-modal-open")) {
      cursor.style.display = cursor.dataset.previousDisplay || "";
    }
  }

  function openCaseModal(caseId) {
    const item = findCase(caseId);
    const modal = $("#case-modal");

    if (!item || !modal) return;

    setText("modal-category", item.category);
    setText("modal-title", item.title);
    setText("modal-objective", item.objective);
    setText("modal-problem", item.problem);
    setText("modal-result", item.result);

    const featureList = $("#modal-features");

    if (featureList) {
      featureList.innerHTML = item.features.map((feature) => `<li>› ${safeText(feature)}</li>`).join("");
    }

    const stack = $("#modal-stack");

    if (stack) {
      stack.innerHTML = item.stack.map((tag) => `<span class="stack-pill">${safeText(tag)}</span>`).join("");
    }

    const projectLink = $("#modal-project-link");

    if (projectLink) {
      projectLink.href = item.detailUrl || item.projectUrl || "#";
    }

    const githubLink = $("#modal-github-link");

    if (githubLink) {
      githubLink.href = item.githubUrl || "https://github.com/EoPaiva?tab=repositories";
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    setCaseModalPerformance(true);
  }

  function closeCaseModal() {
    const modal = $("#case-modal");
    if (!modal) return;

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    if (!document.body.classList.contains("admin-modal-open")) {
      document.body.style.overflow = "";
    }

    setCaseModalPerformance(false);
  }

  function renderProcess() {
    const grid = $("#process-grid");
    if (!grid) return;

    const steps = getCurrentContent().processSteps;

    grid.innerHTML = steps.map((step, index) => `
      <article class="process-card reveal relative bg-theme-card border border-theme-border rounded-2xl p-6">
        ${index < steps.length - 1 ? '<div class="process-line"></div>' : ""}
        <div class="relative z-10 flex gap-5">
          <div class="process-step-dot">${String(index + 1).padStart(2, "0")}</div>

          <div>
            <h3 class="text-lg font-bold text-theme-title mb-3">${safeText(step.title)}</h3>
            <p class="text-theme-text text-sm leading-relaxed mb-4">${safeText(step.text)}</p>

            <div class="process-output rounded-xl p-4">
              <p class="intel-label">output</p>
              <p class="text-theme-title text-sm font-bold mt-1">${safeText(step.output)}</p>
            </div>
          </div>
        </div>
      </article>
    `).join("");

    activateReveals();
  }

  function renderDifferentials() {
    const grid = $("#differential-grid");
    if (!grid) return;

    grid.innerHTML = getCurrentContent().differentials.map((item, index) => `
      <article class="differential-card reveal bg-theme-card border border-theme-border rounded-2xl p-6 min-h-[210px]">
        <div class="relative z-10">
          <span class="font-mono text-theme-accent text-[10px] uppercase tracking-[0.24em]">0${index + 1}</span>
          <h3 class="text-lg font-bold text-theme-title mt-5 mb-4">${safeText(item.title)}</h3>
          <p class="text-theme-text text-sm leading-relaxed">${safeText(item.text)}</p>
        </div>
      </article>
    `).join("");

    activateReveals();
  }

  function renderFaq() {
    const list = $("#faq-list");
    if (!list) return;

    list.innerHTML = getCurrentContent().faq.map((item, index) => `
      <article class="faq-item reveal bg-theme-card border border-theme-border rounded-2xl p-5 ${index === 0 ? "open" : ""}">
        <button type="button" class="faq-question hover-target">
          <span>${safeText(item.question)}</span>
          <span class="faq-icon">${index === 0 ? "−" : "+"}</span>
        </button>

        <div class="faq-answer">${safeText(item.answer)}</div>
      </article>
    `).join("");

    $$(".faq-question", list).forEach((button) => {
      button.addEventListener("click", () => {
        const item = button.closest(".faq-item");
        const icon = $(".faq-icon", item);
        const isOpen = item.classList.toggle("open");

        if (icon) {
          icon.textContent = isOpen ? "−" : "+";
        }
      });
    });

    activateReveals();
  }

  function initHeroGlobe() {
    const canvas = $("#hero-globe-canvas");
    const panel = $(".hero-visual-panel");
    if (!canvas || !panel) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!window.THREE) {
      panel.classList.add("hero-globe-no-webgl");
      return;
    }

    if (heroGlobeCleanup) {
      heroGlobeCleanup();
      heroGlobeCleanup = null;
    }

    panel.classList.remove("hero-globe-no-webgl", "hero-globe-static");
    panel.classList.add("hero-globe-ready");

    const THREE = window.THREE;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, 6.35);

    let renderer;

    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance"
      });
    } catch (error) {
      panel.classList.remove("hero-globe-ready");
      panel.classList.add("hero-globe-no-webgl");
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    const globeGroup = new THREE.Group();
    const particleGroup = new THREE.Group();
    scene.add(globeGroup, particleGroup);

    const styles = getComputedStyle(document.body);
    const accentColor = styles.getPropertyValue("--accent-color").trim() || "#10b981";
    const accent = new THREE.Color(accentColor);
    const cyan = new THREE.Color("#67e8f9");
    const violet = new THREE.Color("#818cf8");

    const generatedGeometries = [];
    const generatedMaterials = [];
    const generatedObjects = [];
    const remember = (object) => {
      generatedObjects.push(object);
      if (object.geometry) generatedGeometries.push(object.geometry);
      if (object.material) generatedMaterials.push(object.material);
      return object;
    };

    const makeMaterial = (options) => {
      const material = new THREE.LineBasicMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        ...options
      });
      generatedMaterials.push(material);
      return material;
    };

    const pointCount = window.innerWidth < 700 ? 320 : 760;
    const radius = 1.76;
    const pointPositions = new Float32Array(pointCount * 3);
    const pointColors = new Float32Array(pointCount * 3);
    const points = [];

    for (let i = 0; i < pointCount; i += 1) {
      const y = 1 - (i / (pointCount - 1)) * 2;
      const radial = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      const jitter = 1 + Math.sin(i * 12.9898) * 0.01;
      const x = Math.cos(theta) * radial * radius * jitter;
      const z = Math.sin(theta) * radial * radius * jitter;
      const yy = y * radius * jitter;
      points.push(new THREE.Vector3(x, yy, z));
      pointPositions.set([x, yy, z], i * 3);

      const mixed = accent.clone().lerp(i % 5 === 0 ? cyan : violet, i % 7 === 0 ? 0.34 : 0.12);
      pointColors.set([mixed.r, mixed.g, mixed.b], i * 3);
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute("position", new THREE.BufferAttribute(pointPositions, 3));
    pointsGeometry.setAttribute("color", new THREE.BufferAttribute(pointColors, 3));
    generatedGeometries.push(pointsGeometry);

    const pointsMaterial = new THREE.PointsMaterial({
      size: window.innerWidth < 700 ? 0.036 : 0.026,
      vertexColors: true,
      transparent: true,
      opacity: 0.86,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    generatedMaterials.push(pointsMaterial);

    const pointMesh = remember(new THREE.Points(pointsGeometry, pointsMaterial));
    globeGroup.add(pointMesh);

    const gridMaterial = makeMaterial({
      color: accent,
      opacity: 0.2
    });

    const softGridMaterial = makeMaterial({
      color: cyan,
      opacity: 0.11
    });

    const routeMaterial = makeMaterial({
      color: cyan,
      opacity: 0.3
    });

    const makeLine = (linePoints, material) => {
      const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      generatedGeometries.push(geometry);
      return remember(new THREE.Line(geometry, material));
    };

    const circlePoints = (count, mapper) => {
      const linePoints = [];
      for (let i = 0; i <= count; i += 1) {
        const angle = (i / count) * Math.PI * 2;
        linePoints.push(mapper(angle));
      }
      return linePoints;
    };

    [-0.72, -0.48, -0.24, 0, 0.24, 0.48, 0.72].forEach((yFactor) => {
      const y = yFactor * radius;
      const ringRadius = Math.sqrt(Math.max(0, radius * radius - y * y));
      const ring = makeLine(circlePoints(168, (angle) => new THREE.Vector3(
        Math.cos(angle) * ringRadius,
        y,
        Math.sin(angle) * ringRadius
      )), yFactor === 0 ? gridMaterial : softGridMaterial);
      globeGroup.add(ring);
    });

    for (let i = 0; i < 8; i += 1) {
      const meridianAngle = (i / 8) * Math.PI;
      const meridian = makeLine(circlePoints(168, (angle) => {
        const horizontal = Math.sin(angle) * radius;
        return new THREE.Vector3(
          Math.cos(meridianAngle) * horizontal,
          Math.cos(angle) * radius,
          Math.sin(meridianAngle) * horizontal
        );
      }), softGridMaterial);
      globeGroup.add(meridian);
    }

    const routeSeeds = [
      [24, 161, 0.18], [82, 301, 0.14], [126, 492, 0.2],
      [214, 612, 0.16], [341, 58, 0.18], [462, 705, 0.13],
      [520, 236, 0.2], [670, 390, 0.15]
    ];

    routeSeeds.forEach(([from, to, lift]) => {
      const start = points[from % points.length].clone().normalize();
      const end = points[to % points.length].clone().normalize();
      const route = [];
      for (let i = 0; i <= 28; i += 1) {
        const t = i / 28;
        const mixed = start.clone().lerp(end, t).normalize();
        const arcLift = 1 + Math.sin(Math.PI * t) * lift * 0.72;
        route.push(mixed.multiplyScalar(radius * arcLift));
      }
      globeGroup.add(makeLine(route, routeMaterial));
    });

    const coreGeometry = new THREE.SphereGeometry(1.34, 36, 24);
    generatedGeometries.push(coreGeometry);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    generatedMaterials.push(coreMaterial);
    globeGroup.add(remember(new THREE.Mesh(coreGeometry, coreMaterial)));

    const haloGeometry = new THREE.TorusGeometry(1.98, 0.006, 10, 180);
    generatedGeometries.push(haloGeometry);
    const haloMaterial = new THREE.MeshBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    generatedMaterials.push(haloMaterial);

    const haloA = remember(new THREE.Mesh(haloGeometry, haloMaterial));
    const haloBMaterial = haloMaterial.clone();
    generatedMaterials.push(haloBMaterial);
    const haloB = remember(new THREE.Mesh(haloGeometry, haloBMaterial));
    haloA.rotation.x = Math.PI / 2.15;
    haloA.rotation.y = -Math.PI / 8;
    haloB.rotation.x = Math.PI / 3.25;
    haloB.rotation.y = Math.PI / 5.5;
    globeGroup.add(haloA, haloB);

    const bgCount = window.innerWidth < 700 ? 55 : 95;
    const bgPositions = new Float32Array(bgCount * 3);

    for (let i = 0; i < bgCount; i += 1) {
      bgPositions.set([
        (Math.sin(i * 47.2) * 2.2),
        (Math.cos(i * 21.7) * 2.1),
        -1.6 - (i % 11) * 0.18
      ], i * 3);
    }

    const bgGeometry = new THREE.BufferGeometry();
    bgGeometry.setAttribute("position", new THREE.BufferAttribute(bgPositions, 3));
    generatedGeometries.push(bgGeometry);
    const bgMaterial = new THREE.PointsMaterial({
      color: 0x67e8f9,
      size: 0.012,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    });
    generatedMaterials.push(bgMaterial);
    particleGroup.add(remember(new THREE.Points(bgGeometry, bgMaterial)));

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect();
      const size = Math.max(220, Math.min(rect.width, rect.height || rect.width));
      renderer.setSize(Math.round(size * 1.16), Math.round(size * 1.16), false);
      camera.aspect = 1;
      camera.updateProjectionMatrix();
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    let frameId = 0;
    const clock = new THREE.Clock();

    const render = () => {
      const elapsed = clock.getElapsedTime();
      globeGroup.rotation.y = -0.38 + elapsed * 0.08;
      globeGroup.rotation.x = 0.12 + Math.sin(elapsed * 0.18) * 0.035;
      particleGroup.rotation.z = elapsed * 0.025;
      pointsMaterial.opacity = 0.78 + Math.sin(elapsed * 1.35) * 0.06;
      routeMaterial.opacity = 0.23 + Math.sin(elapsed * 1.1) * 0.07;
      haloA.rotation.z = elapsed * 0.045;
      haloB.rotation.z = -elapsed * 0.035;
      renderer.render(scene, camera);

      if (!reducedMotion) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    if (reducedMotion) {
      panel.classList.add("hero-globe-static");
      renderer.render(scene, camera);
    } else {
      frameId = window.requestAnimationFrame(render);
    }

    heroGlobeCleanup = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      renderer.dispose();
      generatedGeometries.forEach((geometry) => geometry.dispose());
      generatedMaterials.forEach((material) => material.dispose());
    };
  }

  function updateSkillChart() {
    const canvas = $("#skillChart");
    if (!canvas || typeof Chart === "undefined") return;

    const content = getCurrentContent();
    const styles = getComputedStyle(document.body);
    const accent = styles.getPropertyValue("--accent-color").trim() || "#10b981";
    const text = styles.getPropertyValue("--text-color").trim() || "#94a3b8";

    const data = {
      labels: content.chartLabels,
      datasets: [
        {
          label: "Nível",
          data: content.chartData,
          borderColor: accent,
          backgroundColor: `${accent}33`,
          pointBackgroundColor: accent,
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: accent,
          borderWidth: 2
        }
      ]
    };

    const existingChart = typeof Chart.getChart === "function"
      ? Chart.getChart(canvas)
      : null;

    if (!skillChart && existingChart) {
      skillChart = existingChart;
    }

    if (skillChart) {
      skillChart.data = data;

      if (skillChart.options?.scales?.r) {
        skillChart.options.scales.r.pointLabels.color = text;
        skillChart.options.scales.r.grid.color = "rgba(148, 163, 184, 0.18)";
        skillChart.options.scales.r.angleLines.color = "rgba(148, 163, 184, 0.18)";
      }

      skillChart.update();
      return;
    }

    if (existingChart && typeof existingChart.destroy === "function") {
      existingChart.destroy();
    }

    skillChart = new Chart(canvas, {
      type: "radar",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          r: {
            beginAtZero: true,
            max: 100,
            ticks: {
              display: false,
              stepSize: 20
            },
            pointLabels: {
              color: text,
              font: {
                family: "JetBrains Mono",
                size: 10
              }
            },
            grid: {
              color: "rgba(148, 163, 184, 0.18)"
            },
            angleLines: {
              color: "rgba(148, 163, 184, 0.18)"
            }
          }
        }
      }
    });
  }

  function updateProcessWhatsApp() {
    const focus = $("#focus-select")?.value || "Sistema web full stack";
    const delivery = $("#delivery-select")?.value || "Solução funcional";
    const result = $("#process-result");
    const button = $("#process-whatsapp-button");
    const mode = currentMode;

    const resultByMode = {
      tech: "Escopo técnico, arquitetura, integrações e entrega full stack com IA aplicada.",
      hire: "Oportunidade profissional, modelo CLT/PJ/freelancer e aderência ao desafio técnico.",
      client: "Solução digital clara para reduzir trabalho manual, organizar processos e melhorar presença digital."
    };

    const messageByMode = {
      tech: `Olá, Mateus. Quero conversar sobre ${focus.toLowerCase()} com entrega em ${delivery.toLowerCase()}, considerando backend, frontend, APIs, IA aplicada e SEO técnico.`,
      hire: `Olá, Mateus. Quero conversar sobre uma oportunidade ou projeto. O foco é ${focus.toLowerCase()} com modelo de entrega em ${delivery.toLowerCase()}. Podemos falar sobre CLT, PJ, freelancer ou parceria?`,
      client: `Olá, Mateus. Tenho uma demanda de ${focus.toLowerCase()} e quero entender uma solução em ${delivery.toLowerCase()} para meu negócio. Podemos conversar?`
    };

    if (result) {
      result.textContent = resultByMode[mode] || resultByMode.tech;
    }

    if (button) {
      button.href = encodeWhatsApp(messageByMode[mode] || messageByMode.tech);
    }
  }

  function getProjectImageSources(project) {
    const manualImage = normalizeOptionalImageUrl(project.imageUrl);
    const shots = screenshotUrls(project.url);

    return {
      manualImage,
      hasManualImage: Boolean(manualImage),
      sources: manualImage ? [manualImage, ...shots] : shots
    };
  }

  function renderProductionProjects() {
    const track = $("#production-projects-track");
    if (!track) return;

    track.innerHTML = productionProjects.map((project) => {
      const projectUrl = normalizeProjectUrl(project.url, "#");
      const imageData = getProjectImageSources(project);
      const shots = imageData.sources;
      const shot = shots[0];

      return `
        <a
          href="${safeText(projectUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="swiper-slide production-card hover-target ${imageData.hasManualImage ? "has-manual-image" : ""}"
          data-project-url="${safeText(projectUrl)}"
          data-project-name="${safeText(project.name)}"
        >
          <div class="production-browser-preview">
            <div class="production-browser-top">
              <div class="production-window-dots" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <span class="production-browser-domain">${safeText(project.domain || deriveDomain(project.url))}</span>
            </div>

            <div class="production-preview-frame">
              <img
                class="production-preview-image"
                src="${safeText(shot)}"
                data-shot-index="0"
                data-manual-image="${imageData.hasManualImage ? "true" : "false"}"
                data-shot-sources="${shots.map(safeText).join("|")}"
                alt="Preview visual do projeto ${safeText(project.name)}"
                loading="lazy"
              >

              ${imageData.hasManualImage ? '<span class="production-image-source">Imagem manual</span>' : ''}

              <div class="production-preview-fallback">
                <span>${safeText(project.domain || deriveDomain(project.url))}</span>
                <small>Preview indisponível</small>
              </div>
            </div>
          </div>

          <div class="production-card-body">
            <span class="production-category">${safeText(project.category)}</span>
            <h3>${safeText(project.name)}</h3>
            <p>${safeText(project.description)}</p>

            <div class="production-card-footer">
              <span>${safeText(project.domain || deriveDomain(project.url))}</span>
              <strong>Acessar projeto →</strong>
            </div>
          </div>
        </a>
      `;
    }).join("");

    $$(".production-preview-image", track).forEach((image) => {
      image.addEventListener("load", () => {
        image.classList.add("loaded");
      });

      image.addEventListener("error", () => {
        const sources = String(image.dataset.shotSources || "")
          .split("|")
          .filter(Boolean);

        const currentIndex = Number(image.dataset.shotIndex || 0);
        const nextIndex = currentIndex + 1;

        if (sources[nextIndex]) {
          image.dataset.shotIndex = String(nextIndex);
          image.src = sources[nextIndex];
          return;
        }

        image.classList.remove("loaded");
        image.removeAttribute("src");
      });
    });

    initProductionSwiper();
    renderAdminProjects();
    updateAdminMetrics();
  }

  function initProductionSwiper() {
    const swiperElement = $(".production-swiper");

    if (!swiperElement || typeof Swiper === "undefined") return;

    if (productionSwiper && typeof productionSwiper.destroy === "function") {
      productionSwiper.destroy(true, true);
    }

    productionSwiper = new Swiper(swiperElement, {
      slidesPerView: 1,
      spaceBetween: 18,
      grabCursor: true,
      speed: 650,
      watchOverflow: true,
      loop: productionProjects.length > 3,
      autoplay: {
        delay: 5000,
        disableOnInteraction: false,
        pauseOnMouseEnter: true
      },
      keyboard: {
        enabled: true
      },
      pagination: {
        el: "#production-pagination",
        clickable: true
      },
      navigation: {
        nextEl: "#production-next",
        prevEl: "#production-prev"
      },
      breakpoints: {
        768: {
          slidesPerView: 2,
          spaceBetween: 20
        },
        1180: {
          slidesPerView: 3,
          spaceBetween: 22
        }
      }
    });

    initProductionSideNavigation();
  }

  function initProductionSideNavigation() {
    const prevButton = $("#production-side-prev");
    const nextButton = $("#production-side-next");

    if (prevButton && !prevButton.dataset.bound) {
      prevButton.dataset.bound = "true";

      prevButton.addEventListener("click", () => {
        if (!productionSwiper) return;

        productionSwiper.slidePrev();

        if (productionSwiper.autoplay) {
          productionSwiper.autoplay.start();
        }
      });
    }

    if (nextButton && !nextButton.dataset.bound) {
      nextButton.dataset.bound = "true";

      nextButton.addEventListener("click", () => {
        if (!productionSwiper) return;

        productionSwiper.slideNext();

        if (productionSwiper.autoplay) {
          productionSwiper.autoplay.start();
        }
      });
    }
  }

  function getSupabaseConfig() {
    const body = document.body;

    return {
      url: window.MPAIVA_SUPABASE?.url || body.dataset.supabaseUrl || "",
      key: window.MPAIVA_SUPABASE?.publishableKey || body.dataset.supabaseKey || ""
    };
  }

  function getSupabaseClient() {
    if (adminSupabaseClient) return adminSupabaseClient;

    const config = getSupabaseConfig();

    if (!config.url || !config.key || !window.supabase?.createClient) {
      return null;
    }

    adminSupabaseClient = window.supabase.createClient(config.url, config.key);
    return adminSupabaseClient;
  }

  function setAdminFeedback(message, type = "neutral") {
    const feedback = $("#admin-login-feedback");
    if (!feedback) return;

    feedback.textContent = message;
    feedback.dataset.type = type;
  }

  function setAdminTemporaryStatus(message) {
    const status = $("#admin-session-status");
    if (!status) return;

    const previous = status.textContent;
    status.textContent = message;

    window.setTimeout(() => {
      status.textContent = previous || "Sessão ativa";
    }, 1800);
  }

  function showAdminLogin() {
    $("#admin-login-view")?.classList.add("admin-view-active");
    $("#admin-dashboard-view")?.classList.remove("admin-view-active");
  }

  function showAdminDashboard(user) {
    $("#admin-login-view")?.classList.remove("admin-view-active");
    $("#admin-dashboard-view")?.classList.add("admin-view-active");

    const email = user?.email || adminSession?.user?.email || "admin autenticado";

    setText("admin-session-email", email);
    setText("admin-session-status", "Sessão ativa");
    setText("admin-supabase-status", "Online");

    renderAdminProjects();
    updateAdminMetrics();
  }

  function openAdminPanel() {
    const panel = $("#production-admin-panel");
    if (!panel) return;

    panel.hidden = false;
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";
    document.body.classList.add("admin-modal-open");

    const cursor = $("#custom-cursor");
    if (cursor) cursor.style.display = "none";

    checkAdminSession();
  }

  function closeAdminPanel() {
    if (isAdminRoute()) {
      window.location.href = "/";
      return;
    }

    const panel = $("#production-admin-panel");
    if (!panel) return;

    closeProjectEditor();

    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
    document.body.classList.remove("admin-modal-open");

    const cursor = $("#custom-cursor");
    if (cursor && !document.body.classList.contains("case-modal-open")) {
      cursor.style.display = "";
    }

    window.setTimeout(() => {
      if (!panel.classList.contains("open")) {
        panel.hidden = true;
      }
    }, 220);
  }

  async function checkAdminSession() {
    const client = getSupabaseClient();

    if (!client) {
      setAdminFeedback("Supabase não foi carregado. Confira a URL, chave pública e o CDN.", "error");
      setText("admin-supabase-status", "Offline");
      showAdminLogin();
      return;
    }

    try {
      const { data, error } = await client.auth.getSession();

      if (error) throw error;

      adminSession = data?.session || null;

      if (adminSession?.user) {
        showAdminDashboard(adminSession.user);
      } else {
        showAdminLogin();
      }
    } catch (error) {
      setAdminFeedback("Não foi possível verificar a sessão administrativa.", "error");
      showAdminLogin();
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault();

    const client = getSupabaseClient();
    const email = $("#production-admin-email")?.value.trim() || "";
    const password = $("#production-admin-password")?.value || "";
    const button = $("#admin-login-submit");

    if (!client) {
      setAdminFeedback("Supabase indisponível. Confira se o script CDN foi carregado.", "error");
      return;
    }

    if (!email || !password) {
      setAdminFeedback("Informe e-mail e senha para continuar.", "error");
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Autenticando...";
    }

    setAdminFeedback("Validando credenciais...", "neutral");

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      adminSession = data?.session || null;

      setAdminFeedback("Acesso liberado.", "success");
      showAdminDashboard(data?.user || adminSession?.user);
    } catch (error) {
      setAdminFeedback("Login inválido ou usuário não cadastrado no Supabase Auth.", "error");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Autenticar Acesso";
      }
    }
  }

  async function handleAdminLogout() {
    const client = getSupabaseClient();

    try {
      if (client) await client.auth.signOut();
    } catch (error) {
      console.warn("Erro ao encerrar sessão Supabase.", error);
    }

    adminSession = null;
    setAdminFeedback("Sessão encerrada.", "neutral");
    showAdminLogin();
  }

  function updateAdminMetrics() {
    setText("admin-count-projects", String(productionProjects.length));
    setText("admin-current-mode", currentMode.toUpperCase());

    const status = $("#admin-supabase-status");
    if (status && !status.textContent.trim()) {
      status.textContent = getSupabaseClient() ? "Auth" : "Offline";
    }
  }

  function renderAdminProjects() {
    const grid = $("#admin-projects-grid");
    if (!grid) return;

    if (!productionProjects.length) {
      grid.innerHTML = `
        <div class="admin-empty-state">
          <span>◇</span>
          <h4>Nenhum projeto cadastrado</h4>
          <p>Adicione um projeto para alimentar o carrossel público.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = productionProjects.map((project, index) => `
      <article class="admin-project-card" data-project-id="${safeText(project.id)}">
        <div class="admin-project-index">${String(index + 1).padStart(2, "0")}</div>

        <div class="admin-project-content">
          <span>${safeText(project.category || "Projeto digital")}</span>
          <h4>${safeText(project.name)}</h4>
          <p>${safeText(project.description)}</p>
          <small>${safeText(project.domain || deriveDomain(project.url))}</small>
        </div>

        <div class="admin-project-actions">
          <button type="button" class="hover-target admin-mini-button" data-admin-edit-project="${safeText(project.id)}">
            Editar
          </button>

          <a href="${safeText(normalizeProjectUrl(project.url, "#"))}" target="_blank" rel="noopener noreferrer" class="hover-target admin-mini-button">
            Abrir
          </a>

          <button type="button" class="hover-target admin-mini-danger" data-admin-delete-project="${safeText(project.id)}">
            Remover
          </button>
        </div>
      </article>
    `).join("");

    $$("[data-admin-edit-project]", grid).forEach((button) => {
      button.addEventListener("click", () => openProjectEditor(button.dataset.adminEditProject));
    });

    $$("[data-admin-delete-project]", grid).forEach((button) => {
      button.addEventListener("click", () => deleteProject(button.dataset.adminDeleteProject));
    });
  }

  function openProjectEditor(projectId = "") {
    const editor = $("#admin-project-editor");
    const form = $("#admin-project-form");
    const project = productionProjects.find((item) => item.id === projectId);

    if (!editor || !form) return;

    setText("admin-editor-title", project ? "Editar projeto" : "Cadastrar item");

    $("#admin-project-id").value = project?.id || "";
    $("#admin-project-name").value = project?.name || "";
    $("#admin-project-url").value = project?.url || "";
    $("#admin-project-domain").value = project?.domain || "";
    $("#admin-project-category").value = project?.category || "";
    $("#admin-project-description").value = project?.description || "";
    $("#admin-project-image").value = project?.imageUrl || "";

    editor.classList.add("open");
    editor.setAttribute("aria-hidden", "false");
  }

  function closeProjectEditor() {
    const editor = $("#admin-project-editor");
    if (!editor) return;

    editor.classList.remove("open");
    editor.setAttribute("aria-hidden", "true");
  }

  async function handleProjectFormSubmit(event) {
    event.preventDefault();

    const id = $("#admin-project-id")?.value || "";
    const name = $("#admin-project-name")?.value.trim() || "";
    const url = $("#admin-project-url")?.value.trim() || "";
    const domainInput = $("#admin-project-domain")?.value.trim() || "";
    const category = $("#admin-project-category")?.value.trim() || "Projeto digital";
    const description = $("#admin-project-description")?.value.trim() || "Projeto cadastrado no portfólio.";
    const imageInput = $("#admin-project-image")?.value || "";
    const projectUrl = normalizeProjectUrl(url, "");
    const imageUrl = normalizeOptionalImageUrl(imageInput);

    if (!name || !url) {
      setAdminTemporaryStatus("Preencha nome e URL");
      return;
    }

    if (!projectUrl) {
      setAdminTemporaryStatus("Informe uma URL http ou https válida");
      return;
    }

    if (imageInput.trim() && !imageUrl) {
      setAdminTemporaryStatus("Use uma imagem http/https ou um caminho interno válido");
      return;
    }

    const normalizedProject = normalizeProductionProject({
      id: id || generateId(),
      name,
      url: projectUrl,
      domain: domainInput || deriveDomain(projectUrl),
      category,
      description,
      imageUrl
    });

    const existingIndex = productionProjects.findIndex((item) => item.id === id);

    if (existingIndex >= 0) {
      productionProjects[existingIndex] = normalizedProject;
    } else {
      productionProjects.unshift(normalizedProject);
    }

    saveProductionProjectsToStorage("admin-local");

    const remoteResult = await upsertProjectRemote(normalizedProject);

    if (remoteResult.ok) {
      saveProductionProjectsToStorage("remote-supabase");
      setAdminTemporaryStatus("Projeto salvo e sincronizado no Supabase");
    } else {
      setAdminTemporaryStatus("Projeto salvo localmente; banco remoto indisponível");
    }

    renderProductionProjects();
    closeProjectEditor();
  }

  async function deleteProject(projectId) {
    const project = productionProjects.find((item) => item.id === projectId);
    if (!project) return;

    const confirmed = window.confirm(`Remover "${project.name}" do carrossel?`);
    if (!confirmed) return;

    productionProjects = productionProjects.filter((item) => item.id !== projectId);

    saveProductionProjectsToStorage("admin-local");

    const remoteResult = await deleteProjectRemote(projectId);

    renderProductionProjects();
    setAdminTemporaryStatus(remoteResult.ok ? "Projeto removido e sincronizado no Supabase" : "Projeto removido localmente; banco remoto indisponível");
  }

  async function resetProjectsToDefault() {
    const confirmed = window.confirm("Restaurar os projetos padrão e remover alterações locais?");
    if (!confirmed) return;

    productionProjects = defaultProductionProjects.map((item) => ({ ...item }));
    saveProductionProjectsToStorage("admin-local");

    const remoteResult = await replaceProjectsRemote(productionProjects);

    renderProductionProjects();
    setAdminTemporaryStatus(remoteResult.ok ? "Projetos restaurados e sincronizados no Supabase" : "Projetos restaurados localmente; banco remoto indisponível");
  }

  function exportProjectsJson() {
    const data = {
      exportedAt: new Date().toISOString(),
      owner: "Mateus Paiva",
      source: "MPAIVA_ Admin Integrated",
      projects: productionProjects
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `mpaiva-projetos-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    setAdminTemporaryStatus("Backup exportado");
  }

  async function syncPublicSiteFromAdmin() {
    saveProductionProjectsToStorage("admin-local");

    const remoteResult = await replaceProjectsRemote(productionProjects);

    renderProductionProjects();
    setAdminTemporaryStatus(remoteResult.ok ? "Site sincronizado em todos os dispositivos" : "Sincronização remota indisponível; usando cache local");
  }

  function activateAdminTab(tabName) {
    $$(".admin-nav-btn[data-admin-tab]").forEach((button) => {
      button.classList.toggle("active-tab", button.dataset.adminTab === tabName);
    });

    $$(".admin-tab-content").forEach((content) => {
      content.classList.toggle("active", content.id === `admin-tab-${tabName}`);
    });
  }

  function initProductionAdmin() {
    const trigger = $("#production-admin-trigger");
    const panel = $("#production-admin-panel");
    const form = $("#production-admin-login-form");
    const standaloneAdmin = isAdminRoute();

    if (!panel) return;
    if (!trigger && !standaloneAdmin) return;

    ensureAdminAnalyticsUI();

    if (trigger) {
      trigger.addEventListener("click", openAdminPanel);
    }

    $$("[data-production-admin-close]", panel).forEach((item) => {
      item.addEventListener("click", closeAdminPanel);
    });

    if (form) {
      form.addEventListener("submit", handleAdminLogin);
    }

    $$(".admin-nav-btn[data-admin-tab]", panel).forEach((button) => {
      button.addEventListener("click", () => activateAdminTab(button.dataset.adminTab || "overview"));
    });

    [
      "#admin-open-project-editor",
      "#admin-action-new-project",
      "#admin-new-project-button"
    ].forEach((selector) => {
      const button = $(selector);
      if (button) button.addEventListener("click", () => openProjectEditor());
    });

    [
      "#admin-action-export",
      "#admin-settings-export"
    ].forEach((selector) => {
      const button = $(selector);
      if (button) button.addEventListener("click", exportProjectsJson);
    });

    [
      "#admin-action-reset",
      "#admin-settings-reset"
    ].forEach((selector) => {
      const button = $(selector);
      if (button) button.addEventListener("click", resetProjectsToDefault);
    });

    [
      "#admin-logout-button",
      "#admin-settings-logout"
    ].forEach((selector) => {
      const button = $(selector);
      if (button) button.addEventListener("click", handleAdminLogout);
    });

    const closeAction = $("#admin-action-close");
    if (closeAction) closeAction.addEventListener("click", closeAdminPanel);

    const publishButton = $("#admin-publish-public-site");
    if (publishButton) publishButton.addEventListener("click", syncPublicSiteFromAdmin);

    const editorForm = $("#admin-project-form");
    if (editorForm) editorForm.addEventListener("submit", handleProjectFormSubmit);

    const exportAnalyticsButton = $("#admin-export-analytics");
    if (exportAnalyticsButton) exportAnalyticsButton.addEventListener("click", exportAnalyticsJson);

    const resetAnalyticsButton = $("#admin-reset-analytics");
    if (resetAnalyticsButton) resetAnalyticsButton.addEventListener("click", resetAnalyticsData);

    $$("[data-admin-editor-close]", panel).forEach((item) => {
      item.addEventListener("click", closeProjectEditor);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      if ($("#admin-project-editor")?.classList.contains("open")) {
        closeProjectEditor();
        return;
      }

      if ($("#case-modal")?.classList.contains("open")) {
        closeCaseModal();
        return;
      }

      if (panel.classList.contains("open")) {
        closeAdminPanel();
      }
    });

    const client = getSupabaseClient();

    if (client) {
      setText("admin-supabase-status", "Auth");

      client.auth.onAuthStateChange((event, session) => {
        adminSession = session || null;

        if (session?.user) {
          showAdminDashboard(session.user);
        } else if (event === "SIGNED_OUT") {
          showAdminLogin();
        }
      });
    } else {
      setText("admin-supabase-status", "Offline");
    }

    renderAdminProjects();
    updateAdminMetrics();

    if (standaloneAdmin) {
      panel.hidden = false;
      panel.classList.add("open");
      panel.setAttribute("aria-hidden", "false");
      document.body.classList.add("admin-modal-open", "admin-route-active");
      checkAdminSession();
    }
  }

  function initQuickNavigation() {
    const progress = $("#scroll-progress");
    const links = $$(".quick-nav-link");
    const backToTop = $("#back-to-top");
    const quickScrollDown = $("#quick-scroll-down");

    const getSectionData = () => {
      return links
        .map((link) => {
          const href = link.getAttribute("href") || "";
          const id = href.replace("#", "");
          const element = document.getElementById(id);

          return {
            id,
            link,
            element
          };
        })
        .filter((item) => item.id && item.element);
    };

    let scrollTicking = false;

    const updateScrollState = () => {
      scrollTicking = false;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progressValue = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0;

      if (progress) {
        progress.style.width = `${Math.min(Math.max(progressValue, 0), 100)}%`;
      }

      updateScrollAnalytics(progressValue);

      const sections = getSectionData();
      let activeId = "top";

      sections.forEach((section) => {
        const sectionTop = section.element.getBoundingClientRect().top + window.scrollY - 180;

        if (scrollTop >= sectionTop) {
          activeId = section.id;
        }
      });

      markAnalyticsSection(activeId);

      links.forEach((link) => {
        const href = link.getAttribute("href") || "";
        link.classList.toggle("active", href === `#${activeId}`);
      });

      if (backToTop) {
        backToTop.classList.toggle("is-hidden", scrollTop < 160);
      }

      if (quickScrollDown) {
        const nearBottom = maxScroll <= 0 || scrollTop >= maxScroll - 160;
        quickScrollDown.classList.toggle("is-hidden", nearBottom);
      }
    };

    const scheduleScrollUpdate = () => {
      if (scrollTicking) return;

      scrollTicking = true;
      requestAnimationFrame(updateScrollState);
    };

    const scrollToNextSection = () => {
      const sections = getSectionData();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;

      const nextSection = sections.find((section) => {
        const sectionTop = section.element.getBoundingClientRect().top + window.scrollY - 120;
        return sectionTop > scrollTop + 20;
      });

      if (nextSection?.element) {
        nextSection.element.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      } else {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: "smooth"
        });
      }
    };

    links.forEach((link) => {
      link.addEventListener("click", () => {
        links.forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
      });
    });

    if (backToTop) {
      backToTop.addEventListener("click", () => {
        window.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      });
    }

    if (quickScrollDown) {
      quickScrollDown.addEventListener("click", scrollToNextSection);
    }

    window.addEventListener("scroll", scheduleScrollUpdate, { passive: true });
    window.addEventListener("resize", scheduleScrollUpdate);

    updateScrollState();
  }

  async function loadGitHubData() {
    const reposCount = $("#github-repos-count");
    const language = $("#github-top-language");
    const lastUpdate = $("#github-last-update");
    const codeRepos = $("#code-repos-count");
    const codeLanguage = $("#code-top-language");
    const activityGrid = $("#github-activity-grid");
    const activityStatus = $("#github-activity-status");
    const signalTitle = $("#github-signal-title");
    const signalCopy = $("#github-signal-copy");

    const renderActivityGrid = (repos = []) => {
      if (!activityGrid) return;

      const totalDays = 182;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const start = new Date(today);
      start.setDate(today.getDate() - (totalDays - 1));

      const dayCounts = new Map();

      repos.forEach((repo) => {
        [repo.pushed_at, repo.updated_at, repo.created_at].forEach((dateValue) => {
          if (!dateValue) return;
          const date = new Date(dateValue);
          date.setHours(0, 0, 0, 0);
          if (date < start || date > today) return;
          const key = date.toISOString().slice(0, 10);
          dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
        });
      });

      const hasLiveData = dayCounts.size > 0;
      const cells = [];

      for (let i = 0; i < totalDays; i += 1) {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        const key = date.toISOString().slice(0, 10);
        const count = dayCounts.get(key) || 0;
        const fallbackLevel = i % 29 === 0 || i % 43 === 0 ? 2 : (i % 11 === 0 ? 1 : 0);
        const level = hasLiveData
          ? (count >= 3 ? 3 : count >= 2 ? 2 : count >= 1 ? 1 : 0)
          : fallbackLevel;

        cells.push(`<span class="github-activity-cell" data-level="${level}" title="${date.toLocaleDateString("pt-BR")}"></span>`);
      }

      activityGrid.innerHTML = cells.join("");
    };

    try {
      const response = await fetch(`https://api.github.com/users/${GITHUB_USER}/repos?per_page=100&sort=updated`, {
        headers: {
          Accept: "application/vnd.github+json"
        }
      });

      if (!response.ok) throw new Error("GitHub API indisponível");

      const repos = await response.json();
      const publicRepos = Array.isArray(repos) ? repos : [];

      const languageCount = publicRepos.reduce((acc, repo) => {
        const lang = repo.language || "HTML";
        acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {});

      const topLanguage = Object.entries(languageCount)
        .sort((a, b) => b[1] - a[1])
        .map(([lang]) => lang)[0] || "HTML";

      const latest = publicRepos
        .map((repo) => new Date(repo.updated_at))
        .sort((a, b) => b - a)[0];

      const latestText = latest
        ? latest.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric"
          })
        : "projetos em evolução";

      if (reposCount) reposCount.textContent = String(publicRepos.length);
      if (language) language.textContent = topLanguage;
      if (lastUpdate) lastUpdate.textContent = latestText;
      if (codeRepos) codeRepos.textContent = String(publicRepos.length);
      if (codeLanguage) codeLanguage.textContent = topLanguage;
      if (activityStatus) activityStatus.textContent = `${publicRepos.length} repositórios públicos analisados por atualização recente.`;
      if (signalTitle) signalTitle.textContent = `Atividade pública em ${topLanguage}`;
      if (signalCopy) {
        signalCopy.textContent = "Painel nativo com dados públicos do GitHub quando disponíveis, sem depender de imagens externas que podem quebrar.";
      }
      renderActivityGrid(publicRepos);
    } catch (error) {
      if (reposCount) reposCount.textContent = "Projetos";
      if (language) language.textContent = "Full Stack";
      if (lastUpdate) lastUpdate.textContent = "Projetos em evolução";
      if (codeRepos) codeRepos.textContent = '"projetos"';
      if (codeLanguage) codeLanguage.textContent = "Full Stack";
      if (activityStatus) activityStatus.textContent = "Fallback local ativo. A API do GitHub oscilou, mas o layout permanece íntegro.";
      if (signalTitle) signalTitle.textContent = "Atividade técnica disponível";
      if (signalCopy) {
        signalCopy.textContent = "Sem imagem externa de contribuições: o card permanece profissional mesmo quando serviços do GitHub ou terceiros falham.";
      }
      renderActivityGrid();
    }
  }

  function initCursor() {
    const cursor = $("#custom-cursor");
    if (!cursor) return;

    cursor.style.display = "none";
    return;

    let mouseX = 0;
    let mouseY = 0;
    let cursorX = 0;
    let cursorY = 0;
    let ticking = false;

    const renderCursor = () => {
      cursorX += (mouseX - cursorX) * 0.35;
      cursorY += (mouseY - cursorY) * 0.35;

      cursor.style.left = `${cursorX}px`;
      cursor.style.top = `${cursorY}px`;

      ticking = false;

      if (Math.abs(mouseX - cursorX) > 0.2 || Math.abs(mouseY - cursorY) > 0.2) {
        requestAnimationFrame(renderCursor);
      }
    };

    document.addEventListener("mousemove", (event) => {
      if (document.body.classList.contains("admin-modal-open") || document.body.classList.contains("case-modal-open")) {
        return;
      }

      mouseX = event.clientX;
      mouseY = event.clientY;

      if (!ticking) {
        ticking = true;
        requestAnimationFrame(renderCursor);
      }
    });

    document.addEventListener("mouseover", (event) => {
      if (document.body.classList.contains("admin-modal-open") || document.body.classList.contains("case-modal-open")) {
        return;
      }

      if (event.target.closest(".hover-target, a, button, select")) {
        cursor.style.width = "34px";
        cursor.style.height = "34px";
        cursor.style.borderRadius = "999px";
      }
    });

    document.addEventListener("mouseout", (event) => {
      if (document.body.classList.contains("admin-modal-open") || document.body.classList.contains("case-modal-open")) {
        return;
      }

      if (event.target.closest(".hover-target, a, button, select")) {
        cursor.style.width = "14px";
        cursor.style.height = "14px";
        cursor.style.borderRadius = "999px";
      }
    });
  }

  function activateReveals() {
    const reveals = $$(".reveal:not(.active)");

    if (!("IntersectionObserver" in window)) {
      reveals.forEach((item) => item.classList.add("active"));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("active");
        obs.unobserve(entry.target);
      });
    }, {
      threshold: 0.12
    });

    reveals.forEach((item) => observer.observe(item));
  }

  function initModalEvents() {
    $$("[data-close-modal]").forEach((element) => {
      element.addEventListener("click", closeCaseModal);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeCaseModal();
    });
  }

  function initContactButtons() {
    const message = "Olá, Mateus. Vi seu site e quero conversar sobre desenvolvimento Full Stack, IA aplicada, automação ou uma oportunidade profissional.";
    const url = encodeWhatsApp(message);

    ["contact-whatsapp-button", "footer-whatsapp-button"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.href = url;
    });

    const copyButton = $("#btn-copy");
    const copyText = $("#copy-text");

    if (copyButton) {
      copyButton.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(EMAIL);

          if (copyText) copyText.textContent = "E-mail Copiado";

          window.setTimeout(() => {
            if (copyText) copyText.textContent = "Copiar Endereço";
          }, 1800);
        } catch (error) {
          if (copyText) copyText.textContent = EMAIL;
        }
      });
    }
  }

  function initModeButtons() {
    const tech = $("#btn-tech");
    const hire = $("#btn-hire");
    const client = $("#btn-client");

    if (tech) tech.addEventListener("click", () => applyMode("tech"));
    if (hire) hire.addEventListener("click", () => applyMode("hire"));
    if (client) client.addEventListener("click", () => applyMode("client"));
  }

  function initProcessControls() {
    const focus = $("#focus-select");
    const delivery = $("#delivery-select");

    if (focus) focus.addEventListener("change", updateProcessWhatsApp);
    if (delivery) delivery.addEventListener("change", updateProcessWhatsApp);
  }

  async function init() {
    if (isAdminRoute()) {
      await loadProductionProjects();
      initProductionAdmin();
      activateReveals();
      return;
    }

    initCursor();
    initModeButtons();
    initProcessControls();
    initContactButtons();
    initModalEvents();
    initQuickNavigation();

    applyMode("tech");
    initHeroGlobe();
    await loadProductionProjects();
    renderProductionProjects();
    initProductionAdmin();

    window.addEventListener("storage", (event) => {
      if (event.key !== ADMIN_PROJECTS_STORAGE_KEY && event.key !== ADMIN_PROJECTS_CACHE_META_KEY) return;
      productionProjects = readProductionProjectsFromStorage();
      renderProductionProjects();
    });

    loadGitHubData();
    activateReveals();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
