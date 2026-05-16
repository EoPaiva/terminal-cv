(() => {
  "use strict";

  const WHATSAPP_NUMBER = "55035988042182";
  const EMAIL = "mpaiiva21@gmail.com";
  const GITHUB_USER = "EoPaiva";

  const ADMIN_PROJECTS_STORAGE_KEY = "mpaiva_admin_projects_v1";
  const ADMIN_PROJECTS_CACHE_META_KEY = "mpaiva_admin_projects_meta_v2";
  const PROJECTS_CACHE_VERSION = "2026-05-16-production-projects-v2";
  const PROJECTS_REMOTE_TABLE = "production_projects";

  let currentMode = "tech";
  let activeCaseFilter = "Todos";
  let skillChart = null;
  let productionSwiper = null;
  let adminSupabaseClient = null;
  let adminSession = null;

  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
  const safeText = (value) => String(value ?? "");

  const encodeWhatsApp = (message) => {
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const generateId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const deriveDomain = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch (error) {
      return String(url || "")
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        .trim();
    }
  };

  const screenshotUrls = (url) => {
    const cleanUrl = String(url || "").trim();
    const encodedUrl = encodeURIComponent(cleanUrl);

    return [
      `https://api.microlink.io/?url=${encodedUrl}&screenshot=true&meta=false&embed=screenshot.url`,
      `https://s.wordpress.com/mshots/v1/${encodedUrl}?w=1400`,
      `https://image.thum.io/get/width/1400/crop/900/noanimate/${cleanUrl}`
    ];
  };

  const normalizeOptionalImageUrl = (value) => {
    const imageUrl = safeText(value).trim();

    if (!imageUrl) return "";

    // Aceita URLs absolutas e caminhos internos do próprio projeto.
    // Não tenta trocar imagem manual por screenshot automático.
    if (/^(https?:)?\/\//i.test(imageUrl) || imageUrl.startsWith("/") || imageUrl.startsWith("./") || imageUrl.startsWith("assets/")) {
      return imageUrl;
    }

    return imageUrl;
  };

  const defaultProductionProjects = [
    {
      id: "upaiva_dev",
      name: "Upaiva.dev",
      url: "https://upaiva.dev/",
      domain: "upaiva.dev",
      category: "Portfólio profissional",
      description: "Site profissional voltado para IA, automação, desenvolvimento web e gestão estratégica.",
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
      description: "Sistema de recrutamento policial para FiveM com avaliação dinâmica, correção automática, relatórios em formato .LOG, painel administrativo e interface Cyber-Tactical.",
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
    const projectUrl = safeText(item.url || item.project_url || item.public_url || item.link || "#");
    const manualImage = safeText(
      item.imageUrl ||
      item.image_url ||
      item.manual_image_url ||
      item.preview_image_url ||
      item.screenshot_url ||
      item.cover_url ||
      item.image ||
      ""
    ).trim();

    return {
      id: safeText(item.id || generateId()),
      name: safeText(item.name || item.title || "Projeto sem nome"),
      url: projectUrl,
      domain: safeText(item.domain || deriveDomain(projectUrl)),
      category: safeText(item.category || "Projeto digital"),
      description: safeText(item.description || "Projeto cadastrado no painel administrativo."),
      imageUrl: manualImage
    };
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
    id: safeText(project.id || generateId()),
    name: safeText(project.name || "Projeto sem nome"),
    url: safeText(project.url || "#"),
    domain: safeText(project.domain || deriveDomain(project.url || "")),
    category: safeText(project.category || "Projeto digital"),
    description: safeText(project.description || "Projeto cadastrado no painel administrativo."),
    image_url: safeText(project.imageUrl || ""),
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
      heroStatus: "[ SISTEMA: SITES, AUTOMAÇÃO & IA ]",
      heroTitle: `Soluções digitais com <span class="text-theme-accent">IA</span>, automação e estratégia.`,
      heroDesc:
        "Desenvolvimento de sites profissionais, plataformas, painéis, automações e soluções digitais personalizadas para transformar processos manuais em experiências claras, eficientes e escaláveis.",
      servicesKicker: "/ serviços_tech",
      servicesTitle: "Soluções práticas para empresas que querem automatizar, organizar e escalar.",
      servicesDescription:
        "Atuação combinando tecnologia, IA, desenvolvimento web, dados e processos para criar soluções profissionais e úteis.",
      casesKicker: "/ cases_tech",
      casesTitle: "Cases visuais de automação, IA e desenvolvimento.",
      casesDescription:
        "Cada case mostra objetivo, problema, solução, funcionalidades, tecnologias e resultado entregue.",
      processKicker: "/ processo_tech",
      processTitle: "Um método claro para transformar problema em solução.",
      processDescription:
        "Escolha o foco e o tipo de entrega. A mensagem do WhatsApp será montada automaticamente com base na sua necessidade.",
      processStatus: "pipeline ativo",
      differentialKicker: "/ diferencial",
      differentialTitle: "O diferencial está em unir tecnologia, operação e visão estratégica.",
      differentialDescription:
        "Não é apenas desenvolver telas ou códigos. É entender o problema, desenhar o fluxo, reduzir atrito e entregar uma solução que faça sentido para o uso real.",
      chartLabels: ["IA", "Web", "Automação", "Dados", "UX", "Estratégia"],
      chartData: [92, 88, 90, 80, 78, 86],
      services: [
        {
          title: "Sites Profissionais",
          text: "Landing pages, portfólios, páginas institucionais e interfaces com identidade forte.",
          bullets: ["Design responsivo", "Performance", "SEO básico", "Publicação"],
          tags: ["HTML", "CSS", "JS", "UX"],
          detailUrl: "https://developer.mozilla.org/pt-BR/docs/Learn"
        },
        {
          title: "Automação com IA",
          text: "Fluxos inteligentes para reduzir tarefas repetitivas e acelerar rotinas operacionais.",
          bullets: ["Agentes", "Integrações", "Rotinas", "Padronização"],
          tags: ["IA", "APIs", "Fluxos", "Automação"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/ai-automation"
        },
        {
          title: "Dashboards e Dados",
          text: "Painéis para transformar informações dispersas em indicadores claros.",
          bullets: ["Indicadores", "Resumo gerencial", "Métricas visuais", "Apoio à decisão"],
          tags: ["Data Ops", "Excel", "Power BI", "Analytics"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/data-visualization"
        }
      ],
      cases: [
        {
          id: "case_01",
          title: "Automação Inteligente com IA",
          category: "IA",
          objective: "Automatizar tarefas repetitivas usando fluxos inteligentes e integrações.",
          problem: "Processos manuais geravam retrabalho, perda de tempo e baixa rastreabilidade.",
          result: "Fluxo padronizado, redução de esforço manual e melhor controle operacional.",
          features: ["Triagem automática", "Organização de filas", "Resposta padronizada", "Fluxo escalável"],
          stack: ["IA", "JavaScript", "APIs", "Automação"],
          projectUrl: "#projetos-producao",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/ai-agents",
          preview: "aiPipeline"
        },
        {
          id: "case_02",
          title: "Arquitetura de Solução Escalável",
          category: "Web",
          objective: "Criar uma base técnica organizada para crescer sem perder manutenção.",
          problem: "Projetos sem estrutura dificultam evolução, documentação e reaproveitamento.",
          result: "Arquitetura modular com separação clara entre interface, lógica e dados.",
          features: ["Componentização", "Organização de arquivos", "Padrões visuais", "Evolução contínua"],
          stack: ["HTML", "CSS", "JavaScript", "Arquitetura"],
          projectUrl: "#projetos-producao",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://developer.mozilla.org/pt-BR/docs/Learn/Common_questions/Web_mechanics/What_is_a_web_server",
          preview: "architectureMap"
        },
        {
          id: "case_03",
          title: "Dashboard Operacional",
          category: "Dados",
          objective: "Transformar informações dispersas em indicadores visuais de operação.",
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
          title: "Painel Administrativo",
          category: "Web",
          objective: "Centralizar registros, status e informações importantes.",
          problem: "Acompanhar itens manualmente reduzia visibilidade e atrasava decisões.",
          result: "Painel web com status, registros e controle visual para operação.",
          features: ["CRUD", "Status", "Registros", "Gestão visual"],
          stack: ["JavaScript", "UI", "Node.js", "Dados"],
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
        { title: "Diagnóstico", text: "Entendimento do problema, objetivo, público e rotina atual.", output: "Mapa inicial da necessidade." },
        { title: "Desenho da solução", text: "Estruturação de telas, fluxos, automações, dados e regras de negócio.", output: "Plano claro de entrega." },
        { title: "Construção", text: "Desenvolvimento com foco em usabilidade, organização e evolução.", output: "Solução funcional." },
        { title: "Publicação e evolução", text: "Publicação, ajustes finais, orientação de uso e próximos incrementos.", output: "Entrega pronta para uso real." }
      ],
      differentials: [
        { title: "Visão técnica", text: "Capacidade de transformar ideia em código, tela, fluxo e produto funcional." },
        { title: "Visão operacional", text: "Experiência prática com processos, rotinas, qualidade e execução." },
        { title: "Visão estratégica", text: "Leitura de negócio para priorizar o que gera clareza, resultado e valor." },
        { title: "Comunicação clara", text: "Explicação objetiva para clientes, áreas técnicas e pessoas não técnicas." }
      ],
      faq: [
        { question: "Você cria sites completos?", answer: "Sim. Posso desenvolver landing pages, sites institucionais, portfólios, páginas de serviços e interfaces personalizadas." },
        { question: "Você também publica o site?", answer: "Sim. A entrega pode incluir publicação em ambiente real, configuração básica e orientação para manutenção." },
        { question: "Você trabalha com automações?", answer: "Sim. Posso mapear processos e criar automações com JavaScript, APIs, IA e ferramentas complementares." }
      ]
    },

    rh: {
      bodyClass: "mode-rh",
      button: "btn-rh",
      heroStatus: "[ PERFIL: RH, OPERAÇÃO & ESTRATÉGIA ]",
      heroTitle: `Perfil híbrido entre <span class="text-theme-accent">pessoas</span>, tecnologia e operação.`,
      heroDesc:
        "Experiência em ambiente industrial, liderança operacional, gestão digital, prevenção de perdas, qualidade e melhoria de processos com visão analítica.",
      servicesKicker: "/ serviços_rh",
      servicesTitle: "Competências aplicáveis para RH, operações e gestão.",
      servicesDescription:
        "Um perfil que une disciplina operacional, visão estratégica, dados, processos e comunicação com pessoas.",
      casesKicker: "/ cases_rh",
      casesTitle: "Cases profissionais com foco em pessoas, operação e resultados.",
      casesDescription:
        "Experiências variadas que demonstram adaptação, liderança, gestão, qualidade, análise e execução.",
      processKicker: "/ processo_rh",
      processTitle: "Um processo profissional orientado a clareza e entrega.",
      processDescription:
        "Organização da demanda, alinhamento de expectativas e execução com comunicação clara.",
      processStatus: "perfil em análise",
      differentialKicker: "/ diferencial_rh",
      differentialTitle: "Tecnologia, disciplina operacional e visão humana no mesmo perfil.",
      differentialDescription:
        "A combinação entre execução prática, gestão digital e automação cria uma base forte para ambientes modernos.",
      chartLabels: ["Operação", "Gestão", "Dados", "Comunicação", "Processos", "Tecnologia"],
      chartData: [90, 84, 78, 86, 88, 82],
      services: [
        {
          title: "Gestão de Processos",
          text: "Mapeamento, organização e padronização de rotinas operacionais.",
          bullets: ["Fluxos", "Checklists", "Indicadores", "Melhoria contínua"],
          tags: ["Processos", "Lean", "Qualidade", "Gestão"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/business-process-management"
        },
        {
          title: "People Analytics",
          text: "Uso de dados para apoiar decisões de pessoas, performance e desenvolvimento.",
          bullets: ["Indicadores", "Dashboards", "Análise", "Decisão"],
          tags: ["RH", "Dados", "Analytics", "Estratégia"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/people-analytics"
        },
        {
          title: "Perfil Técnico-Operacional",
          text: "Atuação conectando chão de fábrica, tecnologia, liderança e melhoria de processos.",
          bullets: ["Qualidade", "Segurança", "Disciplina", "Execução"],
          tags: ["Indústria", "Operação", "Liderança", "Tech"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/digital-transformation"
        }
      ],
      cases: [
        {
          id: "rh_01",
          title: "Operação Industrial e Qualidade",
          category: "Indústria",
          objective: "Atuar em ambiente fabril com foco em segurança, testes elétricos e qualidade.",
          problem: "Rotinas industriais exigem atenção, disciplina, padronização e responsabilidade.",
          result: "Execução consistente, conformidade técnica e apoio à eficiência da operação.",
          features: ["Testes elétricos", "Qualidade", "Segurança", "Padronização"],
          stack: ["Aptiv", "Qualidade", "Operação", "Processos"],
          projectUrl: "#trajetoria",
          githubUrl: "https://linkedin.com/in/mateus-paiva-19804b284",
          detailUrl: "#trajetoria",
          preview: "qualityCheck"
        },
        {
          id: "rh_02",
          title: "Gestão Digital e Liderança",
          category: "Gestão",
          objective: "Liderar operação digital com infraestrutura, suporte e organização.",
          problem: "Ambientes digitais com muitos usuários exigem controle, suporte e tomada de decisão rápida.",
          result: "Gestão de equipe, infraestrutura, processos financeiros e suporte especializado.",
          features: ["Liderança", "Suporte", "Infraestrutura", "Gestão financeira"],
          stack: ["AspectMania", "Operações", "Equipe", "Digital"],
          projectUrl: "#trajetoria",
          githubUrl: "https://linkedin.com/in/mateus-paiva-19804b284",
          detailUrl: "#trajetoria",
          preview: "teamOps"
        },
        {
          id: "rh_03",
          title: "Prevenção de Perdas",
          category: "Operação",
          objective: "Apoiar controle operacional, estoque e preservação de ativos.",
          problem: "Perdas operacionais impactam resultado, organização e segurança.",
          result: "Rotina de atenção, controle visual, acompanhamento de estoque e prevenção.",
          features: ["Controle", "Estoque", "Ativos", "Atenção operacional"],
          stack: ["Logística", "Estoque", "Prevenção", "Processos"],
          projectUrl: "#trajetoria",
          githubUrl: "https://linkedin.com/in/mateus-paiva-19804b284",
          detailUrl: "#trajetoria",
          preview: "lossPrevention"
        },
        {
          id: "rh_04",
          title: "RH Estratégico com Dados",
          category: "Dados",
          objective: "Aplicar visão analítica para apoiar processos de pessoas.",
          problem: "Decisões de RH sem dados podem perder contexto, prioridade e rastreabilidade.",
          result: "Proposta de leitura baseada em indicadores, funil, performance e evolução.",
          features: ["People Analytics", "Indicadores", "Funil", "Decisão"],
          stack: ["RH", "Dados", "Analytics", "Dashboard"],
          projectUrl: "#servicos",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/people-analytics",
          preview: "peopleRadar"
        },
        {
          id: "rh_05",
          title: "Comunicação e Atendimento",
          category: "Pessoas",
          objective: "Traduzir demandas técnicas e operacionais de forma clara.",
          problem: "Falhas de comunicação criam retrabalho, ruído e desalinhamento.",
          result: "Comunicação objetiva, documentação simples e alinhamento entre pessoas.",
          features: ["Clareza", "Documentação", "Suporte", "Alinhamento"],
          stack: ["Comunicação", "Suporte", "Gestão", "Pessoas"],
          projectUrl: "#contato",
          githubUrl: "https://linkedin.com/in/mateus-paiva-19804b284",
          detailUrl: "#contato",
          preview: "communicationHub"
        },
        {
          id: "rh_06",
          title: "Melhoria Contínua",
          category: "Processos",
          objective: "Identificar gargalos e propor evolução prática de rotinas.",
          problem: "Processos informais dificultam continuidade, treinamento e acompanhamento.",
          result: "Rotinas mais claras, documentação, controle e visão de melhoria.",
          features: ["Mapeamento", "Padronização", "Treinamento", "Evolução"],
          stack: ["Processos", "Lean", "Gestão", "Operação"],
          projectUrl: "#processo",
          githubUrl: "https://linkedin.com/in/mateus-paiva-19804b284",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/business-process-management",
          preview: "continuousImprovement"
        }
      ],
      processSteps: [
        { title: "Entendimento", text: "Leitura do contexto, necessidade, rotina e resultado esperado.", output: "Cenário mapeado." },
        { title: "Organização", text: "Estruturação de informações, prioridades e pontos críticos.", output: "Plano de ação." },
        { title: "Execução", text: "Aplicação prática com comunicação objetiva e acompanhamento.", output: "Entrega rastreável." },
        { title: "Evolução", text: "Ajustes, aprendizado e melhoria contínua da solução ou processo.", output: "Processo melhorado." }
      ],
      differentials: [
        { title: "Vivência real", text: "Experiência prática em indústria, operação digital e prevenção de perdas." },
        { title: "Perfil híbrido", text: "Conecta tecnologia, pessoas, processos e gestão estratégica." },
        { title: "Mentalidade analítica", text: "Busca transformar informações em decisões mais claras." },
        { title: "Execução responsável", text: "Foco em qualidade, disciplina, comunicação e evolução." }
      ],
      faq: [
        { question: "Qual é seu diferencial para RH?", answer: "Tenho um perfil híbrido: experiência operacional real, gestão digital, tecnologia, automação e visão estratégica." },
        { question: "Você atua só como desenvolvedor?", answer: "Não. Meu posicionamento une desenvolvimento web, IA, processos, dados, operação e gestão." },
        { question: "Você consegue explicar projetos para pessoas não técnicas?", answer: "Sim. Uma das minhas forças é traduzir soluções técnicas em linguagem clara para negócio, RH e operação." }
      ]
    },

    client: {
      bodyClass: "mode-client",
      button: "btn-client",
      heroStatus: "[ MODO CLIENTE: SOLUÇÕES, RESULTADOS & CONTATO ]",
      heroTitle: `Soluções digitais para quem precisa <span class="text-theme-accent">vender, organizar ou automatizar</span>.`,
      heroDesc:
        "Criação de sites, landing pages, sistemas simples, automações, dashboards e interfaces profissionais para negócios que precisam sair do improviso.",
      servicesKicker: "/ soluções_cliente",
      servicesTitle: "O que eu posso resolver para o seu negócio.",
      servicesDescription:
        "Soluções pensadas para transformar uma ideia, processo ou serviço em uma presença digital clara, bonita e funcional.",
      casesKicker: "/ entregas_cliente",
      casesTitle: "Exemplos de soluções que podem ser aplicadas ao seu negócio.",
      casesDescription:
        "De sites comerciais a automações internas: o foco é entregar algo útil, visual e fácil de usar.",
      processKicker: "/ processo_cliente",
      processTitle: "Um caminho simples para tirar sua solução do papel.",
      processDescription:
        "Você explica a necessidade, eu organizo a solução, construo e entrego com orientação de uso.",
      processStatus: "atendimento comercial",
      differentialKicker: "/ por_que_contratar",
      differentialTitle: "Você não contrata apenas código. Você contrata clareza, estratégia e execução.",
      differentialDescription:
        "O objetivo é entregar uma solução que faça sentido para o seu negócio, não apenas uma tela bonita.",
      chartLabels: ["Sites", "Automação", "IA", "Design", "Processos", "Resultado"],
      chartData: [92, 86, 82, 84, 88, 90],
      services: [
        {
          title: "Site Profissional",
          text: "Um site bonito, responsivo e estratégico para apresentar seu negócio com autoridade.",
          bullets: ["Página inicial", "Serviços", "Contato", "WhatsApp"],
          tags: ["Site", "Design", "Mobile", "SEO"],
          detailUrl: "https://developer.mozilla.org/pt-BR/docs/Learn/Getting_started_with_the_web"
        },
        {
          title: "Landing Page de Venda",
          text: "Página focada em conversão para divulgar serviço, produto, campanha ou captação.",
          bullets: ["Copy", "Oferta", "CTA", "Conversão"],
          tags: ["Vendas", "Página", "Marketing", "Lead"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/digital-transformation"
        },
        {
          title: "Automação de Rotinas",
          text: "Redução de trabalho manual com fluxos, formulários, integrações e relatórios.",
          bullets: ["Formulários", "Mensagens", "Planilhas", "Relatórios"],
          tags: ["Automação", "Processos", "IA", "Operação"],
          detailUrl: "https://www.ibm.com/br-pt/think/topics/workflow-automation"
        }
      ],
      cases: [
        {
          id: "client_01",
          title: "Site Institucional Premium",
          category: "Site",
          objective: "Criar presença digital profissional para apresentar serviços.",
          problem: "Negócio sem site perde autoridade, clareza e confiança.",
          result: "Site moderno, responsivo, com identidade visual e contato direto.",
          features: ["Página inicial", "Serviços", "Portfólio", "Contato"],
          stack: ["HTML", "CSS", "JavaScript", "SEO"],
          projectUrl: "https://studiojmarq.com/",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#projetos-producao",
          preview: "websitePreview"
        },
        {
          id: "client_02",
          title: "Página de Conversão",
          category: "Venda",
          objective: "Transformar visitantes em contatos qualificados.",
          problem: "Divulgação sem página clara dificulta conversão e acompanhamento.",
          result: "Landing page com mensagem objetiva, CTA e estrutura de venda.",
          features: ["Oferta", "Benefícios", "Prova visual", "WhatsApp"],
          stack: ["Landing Page", "Copy", "UX", "Mobile"],
          projectUrl: "#contato",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#contato",
          preview: "conversionPage"
        },
        {
          id: "client_03",
          title: "Sistema de Orçamento",
          category: "Operação",
          objective: "Organizar cálculo, atendimento e tomada de decisão.",
          problem: "Orçamentos manuais geravam erro, demora e falta de padrão.",
          result: "Calculadora ou painel simples para agilizar atendimento e operação.",
          features: ["Cálculo", "Resumo", "Histórico", "Padronização"],
          stack: ["JavaScript", "UI", "Dados", "Automação"],
          projectUrl: "https://oasis-customs-main.vercel.app/",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#projetos-producao",
          preview: "budgetSystem"
        },
        {
          id: "client_04",
          title: "Formulário Inteligente",
          category: "Automação",
          objective: "Captar dados e organizar demandas automaticamente.",
          problem: "Mensagens soltas dificultavam triagem, prioridade e retorno.",
          result: "Formulário estruturado com fluxo de envio e organização.",
          features: ["Captação", "Triagem", "Validação", "Mensagem pronta"],
          stack: ["Forms", "JS", "WhatsApp", "Automação"],
          projectUrl: "#processo",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/document-workflow",
          preview: "smartForm"
        },
        {
          id: "client_05",
          title: "Dashboard para Decisão",
          category: "Dados",
          objective: "Transformar dados simples em visão de resultado.",
          problem: "Sem indicadores, decisões ficam baseadas em percepção e urgência.",
          result: "Painel com números, status e resumo gerencial.",
          features: ["Indicadores", "Status", "Resumo", "Visual"],
          stack: ["Dashboard", "Dados", "Analytics", "UI"],
          projectUrl: "#github",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "https://www.ibm.com/br-pt/think/topics/data-visualization",
          preview: "decisionPanel"
        },
        {
          id: "client_06",
          title: "Pacote Digital Sob Medida",
          category: "Solução",
          objective: "Criar uma solução combinando site, automação e atendimento.",
          problem: "Ferramentas desconectadas dificultam rotina e crescimento.",
          result: "Solução personalizada de acordo com o processo real do cliente.",
          features: ["Site", "Automação", "WhatsApp", "Dashboard"],
          stack: ["Web", "IA", "Processos", "Estratégia"],
          projectUrl: "#contato",
          githubUrl: "https://github.com/EoPaiva?tab=repositories",
          detailUrl: "#contato",
          preview: "solutionStack",
          featured: true
        }
      ],
      processSteps: [
        { title: "Conversa inicial", text: "Você explica o que precisa, qual problema quer resolver e qual resultado espera.", output: "Necessidade entendida." },
        { title: "Proposta de solução", text: "Eu organizo uma ideia clara de entrega, estrutura, prazo e caminho técnico.", output: "Escopo definido." },
        { title: "Desenvolvimento", text: "Construção da solução com acompanhamento, ajustes e validação visual.", output: "Solução funcional." },
        { title: "Entrega e orientação", text: "Publicação, explicação de uso e próximos passos para evolução.", output: "Projeto pronto." }
      ],
      differentials: [
        { title: "Foco em resultado", text: "A solução é pensada para uso real, atendimento, venda ou organização." },
        { title: "Visual profissional", text: "Interfaces modernas, responsivas e alinhadas à identidade do projeto." },
        { title: "Tecnologia acessível", text: "Explicação simples, sem complicar o que precisa ser prático." },
        { title: "Entrega personalizada", text: "Cada projeto é desenhado conforme o negócio, objetivo e rotina." }
      ],
      faq: [
        { question: "Quanto custa um site?", answer: "Depende do escopo, número de páginas, funcionalidades e prazo. O ideal é iniciar uma conversa para entender a necessidade." },
        { question: "Você faz site com botão de WhatsApp?", answer: "Sim. Posso incluir chamada direta, mensagem pré-pronta, formulário e botões estratégicos de conversão." },
        { question: "Você faz manutenção depois?", answer: "Sim. A manutenção pode ser combinada conforme a necessidade do projeto." }
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

    ["btn-tech", "btn-rh", "btn-client"].forEach((id) => {
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

    document.body.classList.remove("mode-rh", "mode-client");

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
              <span>02</span><span class="text-yellow-400">fila</span><span>dev</span><span>sync</span>
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
    const focus = $("#focus-select")?.value || "Automação";
    const delivery = $("#delivery-select")?.value || "Solução funcional";
    const result = $("#process-result");
    const button = $("#process-whatsapp-button");

    const resultText = `Quero conversar sobre ${focus.toLowerCase()} com entrega em ${delivery.toLowerCase()}.`;

    if (result) {
      result.textContent = "Processos mais claros, redução de tarefas repetitivas e entrega técnica com visão de negócio.";
    }

    if (button) {
      button.href = encodeWhatsApp(`Olá, Mateus. ${resultText} Podemos conversar?`);
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
      const imageData = getProjectImageSources(project);
      const shots = imageData.sources;
      const shot = shots[0];

      return `
        <a
          href="${safeText(project.url)}"
          target="_blank"
          rel="noopener noreferrer"
          class="swiper-slide production-card hover-target ${imageData.hasManualImage ? "has-manual-image" : ""}"
          data-project-url="${safeText(project.url)}"
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

          <a href="${safeText(project.url)}" target="_blank" rel="noopener noreferrer" class="hover-target admin-mini-button">
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

    setText("admin-editor-title", project ? "Editar Projeto" : "Novo Projeto");

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
    const description = $("#admin-project-description")?.value.trim() || "Projeto cadastrado pelo painel administrativo.";
    const imageUrl = normalizeOptionalImageUrl($("#admin-project-image")?.value || "");

    if (!name || !url) {
      setAdminTemporaryStatus("Preencha nome e URL");
      return;
    }

    const normalizedProject = {
      id: id || generateId(),
      name,
      url,
      domain: domainInput || deriveDomain(url),
      category,
      description,
      imageUrl
    };

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

    if (!trigger || !panel) return;

    ensureAdminAnalyticsUI();

    trigger.addEventListener("click", openAdminPanel);

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

    const syncButton = $("#admin-sync-public-site");
    if (syncButton) syncButton.addEventListener("click", syncPublicSiteFromAdmin);

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
        : "sem dados";

      if (reposCount) reposCount.textContent = String(publicRepos.length);
      if (language) language.textContent = topLanguage;
      if (lastUpdate) lastUpdate.textContent = latestText;
      if (codeRepos) codeRepos.textContent = String(publicRepos.length);
      if (codeLanguage) codeLanguage.textContent = topLanguage;
    } catch (error) {
      if (reposCount) reposCount.textContent = "--";
      if (language) language.textContent = "HTML";
      if (lastUpdate) lastUpdate.textContent = "offline";
      if (codeRepos) codeRepos.textContent = "--";
      if (codeLanguage) codeLanguage.textContent = "HTML";
    }
  }

  function initCursor() {
    const cursor = $("#custom-cursor");
    if (!cursor) return;

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
        cursor.style.borderRadius = "0";
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
    const message = "Olá, Mateus. Vi seu site e quero conversar sobre uma solução digital.";
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
    const rh = $("#btn-rh");
    const client = $("#btn-client");

    if (tech) tech.addEventListener("click", () => applyMode("tech"));
    if (rh) rh.addEventListener("click", () => applyMode("rh"));
    if (client) client.addEventListener("click", () => applyMode("client"));
  }

  function initProcessControls() {
    const focus = $("#focus-select");
    const delivery = $("#delivery-select");

    if (focus) focus.addEventListener("change", updateProcessWhatsApp);
    if (delivery) delivery.addEventListener("change", updateProcessWhatsApp);
  }

  async function init() {
    initCursor();
    initModeButtons();
    initProcessControls();
    initContactButtons();
    initModalEvents();
    initQuickNavigation();

    applyMode("tech");
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