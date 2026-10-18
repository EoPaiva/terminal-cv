/* upaiva.dev — interações da home (preto e branco). Sem dependências além do supabase-js. */
(() => {
  "use strict";

  const $ = (s, p = document) => p.querySelector(s);
  const $$ = (s, p = document) => Array.from(p.querySelectorAll(s));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const WHATSAPP = "https://wa.me/55035988042182";
  const wa = (text) => `${WHATSAPP}?text=${encodeURIComponent(text)}`;
  const KICKERS = { tech: "Serviços", hire: "Serviços · Contrate-me", client: "Serviços · Para empresas" };

  const MODES = {
    "tech": {
      "heroStatus": "[ FULL STACK, IA APLICADA & AUTOMAÇÃO ]",
      "heroDesc": "Engenheiro de IA e desenvolvedor full stack. Construo plataformas, agentes de IA, automações e integrações que transformam processos complexos em sistemas úteis.",
      "servicesTitle": "Soluções digitais completas com Full Stack, automação e IA aplicada.",
      "servicesDescription": "Atuação combinando frontend, backend, banco de dados, APIs, automações, agentes de IA, LLM, RAG e estratégia para criar sistemas web inteligentes que melhoram eficiência, atendimento, operação e crescimento.",
      "services": [
        {
          "title": "Sistemas web full stack",
          "text": "Desenvolvimento de plataformas, painéis e aplicações completas com frontend, backend, banco de dados, autenticação, APIs e deploy.",
          "tags": [
            "Frontend",
            "Backend",
            "Banco de dados",
            "Deploy"
          ]
        },
        {
          "title": "IA aplicada e agentes inteligentes",
          "text": "Criação de automações, agentes de IA, fluxos com LLM e soluções RAG para apoiar atendimento, análise, triagem e decisões operacionais.",
          "tags": [
            "Agentes de IA",
            "LLM",
            "RAG",
            "Triagem inteligente"
          ]
        },
        {
          "title": "Automação, APIs e dados",
          "text": "Integrações com APIs, rotinas automatizadas, dashboards e bancos de dados para transformar informações dispersas em operação organizada.",
          "tags": [
            "Integrações",
            "APIs",
            "Dashboards",
            "Dados"
          ]
        }
      ],
      "processDescription": "Escolha o foco e o tipo de entrega. A mensagem do WhatsApp será montada automaticamente com base na sua necessidade.",
      "processSteps": [
        {
          "title": "Diagnóstico",
          "text": "Entendimento do problema, objetivo, dados, rotina atual e oportunidades de automação ou IA aplicada.",
          "output": "Mapa inicial da solução."
        },
        {
          "title": "Arquitetura",
          "text": "Definição de frontend, backend, banco de dados, APIs, automações, agentes de IA e regras de negócio.",
          "output": "Plano técnico de entrega."
        },
        {
          "title": "Construção",
          "text": "Desenvolvimento full stack com foco em usabilidade, integrações, segurança básica, performance e evolução.",
          "output": "Sistema funcional."
        },
        {
          "title": "SEO e IA aplicada",
          "text": "Estruturação de metadados, schema, performance, automações, agentes e fluxos inteligentes quando agregam valor.",
          "output": "Base técnica preparada para descoberta."
        },
        {
          "title": "Publicação e evolução",
          "text": "Deploy, validação, ajustes finais, orientação de uso e próximos incrementos para crescimento.",
          "output": "Solução pronta para uso real."
        }
      ],
      "differentialTitle": "O diferencial está em unir engenharia Full Stack, IA aplicada, operação e visão estratégica.",
      "differentialDescription": "Não é apenas criar telas ou scripts. É entender o problema, modelar dados, integrar APIs, desenhar fluxos, automatizar decisões e entregar uma solução digital completa para uso real.",
      "differentials": [
        {
          "title": "Full Stack aplicado",
          "text": "Capacidade de construir interface, lógica, dados, APIs e deploy em uma solução coerente."
        },
        {
          "title": "IA com uso real",
          "text": "Agentes, automações, LLM e RAG aplicados a problemas concretos, não apenas demonstrações."
        },
        {
          "title": "Visão operacional",
          "text": "Experiência prática com processos, rotinas, qualidade e execução para desenhar sistemas úteis."
        },
        {
          "title": "Estratégia de negócio",
          "text": "Leitura para priorizar tecnologia que gera eficiência, clareza, escala e valor."
        }
      ],
      "faq": [
        {
          "question": "Você faz só sites?",
          "answer": "Não. Meu foco é desenvolvimento Full Stack com IA aplicada: frontend, backend, banco de dados, APIs, automações, agentes de IA e sistemas completos para negócios."
        },
        {
          "question": "Você cria plataformas e sistemas completos?",
          "answer": "Sim. Posso construir painéis, plataformas SaaS, sistemas internos, dashboards, integrações e aplicações web inteligentes com publicação em ambiente real."
        },
        {
          "question": "Você trabalha com LLM, RAG e agentes de IA?",
          "answer": "Sim. Posso mapear processos e criar soluções com agentes de IA, fluxos com LLM, bases de conhecimento, RAG, APIs e automações para reduzir tarefas repetitivas."
        },
        {
          "question": "Você também pensa em SEO e tráfego orgânico?",
          "answer": "Sim. Estruturo páginas e aplicações com SEO técnico, metadados, schema, performance, HTML semântico e copywriting para melhorar descoberta por buscadores e IAs de pesquisa."
        }
      ]
    },
    "hire": {
      "heroStatus": "[ CONTRATE-ME: CLT, PJ, FREELANCER & PROJETOS ]",
      "heroDesc": "Engenheiro de IA e líder do setor de IA no Notazz, aberto a projetos freelancer e parcerias em sistemas web, agentes de IA, LLM/RAG, automação e SEO técnico.",
      "servicesTitle": "Aberto a oportunidades em Full Stack, IA aplicada, automação e crescimento digital.",
      "servicesDescription": "Posso entrar em times, projetos ou operações que precisam transformar problemas reais em software: backend, frontend, banco de dados, APIs, automações, IA aplicada, SEO técnico e entrega publicada.",
      "services": [
        {
          "title": "CLT ou PJ em desenvolvimento Full Stack",
          "text": "Atuação em frontend, backend, banco de dados, APIs, manutenção, evolução de produto e publicação de aplicações.",
          "tags": [
            "JavaScript",
            "Backend",
            "Frontend",
            "Deploy"
          ]
        },
        {
          "title": "Projetos freelancer e escopos fechados",
          "text": "Criação de sistemas web, landing pages estratégicas, dashboards, plataformas e automações com entrega objetiva.",
          "tags": [
            "Escopo",
            "Prazo",
            "Publicação",
            "Evolução"
          ]
        },
        {
          "title": "IA aplicada para operação e atendimento",
          "text": "Desenvolvimento de agentes, fluxos com LLM, RAG, triagem, bases de conhecimento e integrações com ferramentas do negócio.",
          "tags": [
            "Agentes de IA",
            "LLM",
            "RAG",
            "APIs"
          ]
        },
        {
          "title": "Cargos compatíveis e frentes de contribuição",
          "text": "Perfil adequado para vagas júnior/pleno e projetos que exigem entrega prática, comunicação clara e visão de produto.",
          "tags": [
            "Full Stack Jr/Pleno",
            "Front-end ou Back-end",
            "Automações e IA",
            "Analista de Sistemas"
          ]
        }
      ],
      "processDescription": "Escolha o foco e o tipo de entrega. A mensagem do WhatsApp será montada com contexto para contratação, freelas, projetos ou parcerias.",
      "processSteps": [
        {
          "title": "Conversa inicial",
          "text": "Alinhamos vaga, projeto, escopo, rotina, stack, maturidade do produto e resultado esperado.",
          "output": "Contexto claro."
        },
        {
          "title": "Avaliação técnica",
          "text": "Compartilho portfólio, perfil profissional, GitHub e exemplos de entregas ligadas ao desafio.",
          "output": "Critérios alinhados."
        },
        {
          "title": "Modelo de contratação",
          "text": "Definimos CLT, PJ, freelancer, projeto fechado ou parceria com expectativas, prazos e responsabilidades.",
          "output": "Formato definido."
        },
        {
          "title": "Execução e evolução",
          "text": "Entro no fluxo com comunicação objetiva, entregas incrementais, documentação e melhoria contínua.",
          "output": "Entrega acompanhável."
        }
      ],
      "differentialTitle": "Full Stack com IA aplicada, SEO técnico e visão de negócio em uma entrega só.",
      "differentialDescription": "A proposta é contribuir além da tela: entender produto, modelar dados, integrar serviços, automatizar processos, documentar decisões e entregar soluções digitais que geram eficiência.",
      "differentials": [
        {
          "title": "Entrega full stack",
          "text": "Interface, backend, APIs, banco de dados e publicação conectados para resolver o problema completo."
        },
        {
          "title": "IA aplicada com critério",
          "text": "Agentes, LLM, RAG e automações usados para eficiência real, não como enfeite técnico."
        },
        {
          "title": "SEO e crescimento",
          "text": "Desenvolvimento pensado para performance, indexação, tráfego orgânico e clareza comercial."
        },
        {
          "title": "Comunicação de negócio",
          "text": "Capacidade de traduzir tecnologia em prioridade, impacto, escopo e próximos passos."
        }
      ],
      "faq": [
        {
          "question": "Você está aberto a CLT, PJ e freelancer?",
          "answer": "Sim. Estou aberto a oportunidades CLT, PJ, freelancer, projetos fechados e parcerias em Full Stack, IA aplicada, automação, APIs, SEO técnico e plataformas digitais."
        },
        {
          "question": "Que tipo de vaga ou projeto combina com seu perfil?",
          "answer": "Desenvolvimento Full Stack, produto web, automação de processos, integrações com APIs, agentes de IA, SaaS, dashboards, SEO técnico e soluções digitais para negócios."
        },
        {
          "question": "Você consegue atuar além de criar telas?",
          "answer": "Sim. Posso atuar em frontend, backend, banco de dados, APIs, automação, IA aplicada, publicação, documentação e evolução do produto."
        }
      ]
    },
    "client": {
      "heroStatus": "[ SOLUÇÕES DIGITAIS, IA & EFICIÊNCIA ]",
      "heroDesc": "Sistemas web, dashboards, automações e IA para organizar processos, reduzir trabalho manual e dar mais clareza às decisões.",
      "servicesTitle": "Soluções digitais completas para o seu negócio operar melhor.",
      "servicesDescription": "Soluções pensadas para transformar uma ideia, processo ou serviço em sistema funcional, plataforma SaaS, painel de gestão, automação inteligente ou aplicação com IA integrada, sempre com base técnica para SEO e tráfego orgânico.",
      "services": [
        {
          "title": "Sistema web ou plataforma SaaS",
          "text": "Aplicação sob medida para organizar atendimento, operação, dados, clientes, serviços ou processos internos em uma interface profissional.",
          "tags": [
            "Painel",
            "Login",
            "Dados",
            "Deploy"
          ]
        },
        {
          "title": "Automação de processos com IA",
          "text": "Fluxos para reduzir tarefas manuais, integrar ferramentas, padronizar respostas, organizar demandas e acelerar rotinas com inteligência artificial aplicada.",
          "tags": [
            "Fluxos",
            "APIs",
            "Triagem",
            "Relatórios"
          ]
        },
        {
          "title": "Agentes de IA e soluções inteligentes",
          "text": "Aplicações com agentes de IA, LLM, RAG e bases de conhecimento para atendimento, consulta de dados, análise, recomendação e apoio à decisão.",
          "tags": [
            "Agentes IA",
            "LLM",
            "RAG",
            "Base de conhecimento"
          ]
        }
      ],
      "processDescription": "Você explica a necessidade, eu organizo a solução, construo e entrego com orientação de uso.",
      "processSteps": [
        {
          "title": "Conversa inicial",
          "text": "Você explica o problema, rotina atual, ferramentas usadas e resultado esperado.",
          "output": "Necessidade entendida."
        },
        {
          "title": "Proposta de solução",
          "text": "Eu organizo escopo, telas, dados, automações, integrações e caminho técnico.",
          "output": "Escopo definido."
        },
        {
          "title": "Desenvolvimento",
          "text": "Construção da solução full stack com acompanhamento, ajustes, validação visual e lógica funcional.",
          "output": "Sistema em operação."
        },
        {
          "title": "Entrega e evolução",
          "text": "Publicação, explicação de uso, melhorias de performance e próximos passos com automação ou IA.",
          "output": "Solução pronta para crescer."
        }
      ],
      "differentialTitle": "Você não contrata apenas código. Você contrata tecnologia aplicada ao negócio.",
      "differentialDescription": "O objetivo é entregar uma solução que conecte processo, dados, interface, automação e IA para gerar eficiência, clareza e resultado.",
      "differentials": [
        {
          "title": "Foco em operação real",
          "text": "A solução é pensada para atendimento, venda, organização, dados ou eficiência interna."
        },
        {
          "title": "Sistema completo",
          "text": "Interface, lógica, banco de dados, APIs e deploy conectados em uma entrega funcional."
        },
        {
          "title": "IA aplicada com clareza",
          "text": "Automação e inteligência artificial entram onde fazem sentido para reduzir esforço e acelerar decisões."
        },
        {
          "title": "Entrega personalizada",
          "text": "Cada projeto é desenhado conforme negócio, objetivo, processo e possibilidade de evolução."
        }
      ],
      "faq": [
        {
          "question": "Você faz só site ou também sistema?",
          "answer": "Faço sistemas e soluções digitais completas. Um site pode fazer parte da entrega, mas o foco pode incluir painel, banco de dados, APIs, automações e IA aplicada."
        },
        {
          "question": "Você consegue automatizar processos do meu negócio?",
          "answer": "Sim. Posso mapear tarefas repetitivas e criar fluxos com formulários, integrações, APIs, dashboards, notificações e recursos de IA."
        },
        {
          "question": "Você faz manutenção e evolução depois?",
          "answer": "Sim. A manutenção pode incluir ajustes, publicação, performance, novas telas, automações, integrações e evolução com IA aplicada conforme o projeto cresce."
        }
      ]
    }
  };

  const HERO_ACTIONS = {
    tech: [
      { label: "Ver trabalhos", href: "#cases", cls: "btn-light" },
      { label: "Iniciar um projeto", href: "#processo", cls: "btn-ghost" }
    ],
    hire: [
      { label: "Ver perfil profissional", href: "perfil-profissional.html", cls: "btn-light" },
      { label: "Falar sobre oportunidade", href: wa("Olá, Mateus. Vi seu site e quero conversar sobre uma oportunidade CLT, PJ ou freelancer."), cls: "btn-ghost", external: true, intent: "whatsapp-oportunidade-hero" }
    ],
    client: [
      { label: "Quero automatizar um processo", href: "#processo", cls: "btn-light" },
      { label: "Ver projetos no ar", href: "#projetos-producao", cls: "btn-ghost" }
    ]
  };

  const RESULT_BY_MODE = {
    tech: "Escopo técnico, arquitetura, integrações e entrega full stack com IA aplicada.",
    hire: "Oportunidade profissional, modelo CLT/PJ/freelancer e aderência ao desafio técnico.",
    client: "Solução digital clara para reduzir trabalho manual, organizar processos e melhorar presença digital."
  };

  const MESSAGE_BY_MODE = {
    tech: (f, d) => `Olá, Mateus. Quero conversar sobre ${f.toLowerCase()} com entrega em ${d.toLowerCase()}, considerando backend, frontend, APIs, IA aplicada e SEO técnico.`,
    hire: (f, d) => `Olá, Mateus. Quero conversar sobre uma oportunidade ou projeto. O foco é ${f} com modelo de entrega em ${d}. Podemos falar sobre CLT, PJ, freelancer ou parceria?`,
    client: (f, d) => `Olá, Mateus. Tenho uma demanda de ${f} e quero entender uma solução em ${d} para meu negócio. Podemos conversar?`
  };

  const DEFAULT_PROJECTS = [
    { id: "upaiva_dev", name: "Upaiva.dev", url: "https://upaiva.dev/", domain: "upaiva.dev", category: "Full Stack / IA Aplicada / Automação", description: "Plataforma profissional para apresentar sistemas full stack, IA aplicada e automação." },
    { id: "studio_jm", name: "Studio JM", url: "https://studiojmarq.com/", domain: "studiojmarq.com", category: "Site institucional / Arquitetura", description: "Plataforma digital para arquitetura e interiores, com apresentação visual premium." },
    { id: "projeto_casal", name: "Projeto Casal", url: "https://projeto-casal-one.vercel.app/", domain: "projeto-casal-one.vercel.app", category: "Experiência interativa / Front-end", description: "Experimento autoral com animações, áudio e efeitos visuais em JavaScript puro." },
    { id: "oasis_customs", name: "Oasis Customs", url: "https://oasis-customs-main.vercel.app/", domain: "oasis-customs-main.vercel.app", category: "Calculadora operacional / RP", description: "Calculadora automotiva para FiveM RP com descontos, repasses e painel resumo." },
    { id: "taf_prf", name: "Sistema TAF PRF", url: "https://projeto-taf-prf.vercel.app/", domain: "projeto-taf-prf.vercel.app", category: "Automação de recrutamento / FiveM", description: "Recrutamento com avaliação dinâmica, correção automática e relatórios." },
    { id: "fitpro", name: "FitPro", url: "https://fit-pro-woad.vercel.app/", domain: "fit-pro-woad.vercel.app", category: "Plataforma fitness / Gestão de treinos", description: "Protótipo para personal trainers e alunos com dashboard, agenda e gráficos." }
  ];

  /* ---------- reveal ---------- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 })
    : null;

  const observeReveals = (root = document) => {
    $$(".reveal:not(.in), .steps:not(.in), .contact-display .line:not(.in)", root).forEach((el, i) => {
      if (!io || reduced.matches) { el.classList.add("in"); return; }
      if (el.classList.contains("reveal") && !el.style.transitionDelay) {
        const siblings = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [];
        const idx = siblings.indexOf(el);
        if (idx > 0) el.style.transitionDelay = `${Math.min(idx, 6) * 80}ms`;
      }
      io.observe(el);
    });
  };

  /* ---------- modos ---------- */
  let currentMode = "tech";

  const tagList = (tags = []) => tags.length ? `<ul class="tags">${tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : "";

  const setText = (sel, value) => { const el = $(sel); if (el && value != null) el.textContent = value; };

  const swap = (el, html) => {
    if (!el) return;
    el.innerHTML = html;
    observeReveals(el);
  };

  const updateProcessWhatsApp = () => {
    const focus = $("#focus-select")?.value || "Sistema web full stack";
    const delivery = $("#delivery-select")?.value || "Solução funcional";
    setText("#process-result", RESULT_BY_MODE[currentMode]);
    const btn = $("#process-whatsapp-button");
    if (btn) btn.href = wa(MESSAGE_BY_MODE[currentMode](focus, delivery));
  };

  const applyMode = (mode) => {
    if (!MODES[mode]) mode = "tech";
    currentMode = mode;
    const m = MODES[mode];
    document.body.dataset.mode = mode;

    setText("#hero-status", m.heroStatus);
    setText("#hero-desc", m.heroDesc);
    const actions = $("#hero-actions");
    if (actions) {
      actions.innerHTML = HERO_ACTIONS[mode].map((a) => `<a href="${esc(a.href)}" class="btn ${a.cls}"${a.external ? ' target="_blank" rel="noopener"' : ""}${a.intent ? ` data-analytics-intent="${a.intent}"` : ""}>${esc(a.label)} <i class="arrow" aria-hidden="true"></i></a>`).join("");
    }

    setText("#services-kicker", KICKERS[mode]);
    setText("#services-title", m.servicesTitle);
    setText("#services-description", m.servicesDescription);
    swap($("#services-list"), m.services.map((s, i) => `
      <article class="row reveal">
        <span class="n">${pad(i + 1)}</span>
        <h3>${esc(s.title)}</h3>
        <div class="row-body"><p>${esc(s.text)}</p>${tagList(s.tags)}</div>
      </article>`).join(""));

    setText("#process-description", m.processDescription);
    const steps = $("#process-steps");
    if (steps) {
      steps.classList.remove("in");
      steps.innerHTML = m.processSteps.map((s, i) => `
        <li class="step">
          <i class="bar" aria-hidden="true"></i>
          <span class="n">${pad(i + 1)}</span>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.text)}</p>
          <span class="out">${esc(s.output)}</span>
        </li>`).join("");
      requestAnimationFrame(() => observeReveals(steps.parentElement));
    }

    setText("#differential-title", m.differentialTitle);
    setText("#differential-description", m.differentialDescription);
    swap($("#differential-list"), m.differentials.map((d, i) => `
      <article class="principle reveal">
        <span class="n">${pad(i + 1)}</span>
        <h3>${esc(d.title)}</h3>
        <p>${esc(d.text)}</p>
      </article>`).join(""));

    swap($("#faq-mode"), m.faq.map((f) => `<details class="reveal"><summary>${esc(f.question)}</summary><p>${esc(f.answer)}</p></details>`).join(""));

    updateProcessWhatsApp();
  };

  const initModes = () => {
    applyMode("tech");
    $("#focus-select")?.addEventListener("change", updateProcessWhatsApp);
    $("#delivery-select")?.addEventListener("change", updateProcessWhatsApp);
  };

  /* ---------- projetos em produção ---------- */
  const shotUrl = (url) => `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1400`;
  const domainOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (_) { return ""; } };
  const safeUrl = (url) => { try { const u = new URL(url); return /^https?:$/.test(u.protocol) ? u.href : "#"; } catch (_) { return "#"; } };
  const cleanCopy = (v) => String(v ?? "").replace(/Painel\s+Admin\w*\s*MPAIVA_?/gi, "Painel de gestão").replace(/\bpainel\s+admin\w*\b/gi, "painel de gestão");

  const normalizeProject = (p) => {
    const url = safeUrl(p.url || p.project_url || p.public_url || "");
    return {
      name: cleanCopy(p.name || p.title || "Projeto"),
      url,
      domain: cleanCopy(p.domain || domainOf(url)),
      category: cleanCopy(p.category || "Projeto digital"),
      image: p.image_url || p.imageUrl || ""
    };
  };

  const renderProjects = (list) => {
    const ol = $("#production-list");
    if (!ol) return;
    if (!list.length) { ol.innerHTML = '<li class="index-empty">Nenhum projeto publicado no momento.</li>'; return; }
    ol.innerHTML = list.map((p, i) => `
      <li class="reveal">
        <a href="${esc(p.url)}" target="_blank" rel="noopener" data-preview="${esc(p.image || shotUrl(p.url))}" data-analytics-intent="projeto-producao">
          <span class="n">${pad(i + 1)}</span>
          <span class="t">${esc(p.name)}</span>
          <span class="c">${esc(p.category)}</span>
          <span class="d">${esc(p.domain)}</span>
          <i class="arrow" aria-hidden="true"></i>
        </a>
      </li>`).join("");
    observeReveals(ol);
    window.ScrollTrigger?.refresh();
  };

  const loadProjects = async () => {
    const fallback = DEFAULT_PROJECTS.map(normalizeProject);
    const { supabaseUrl, supabaseKey } = document.body.dataset;
    if (!window.supabase?.createClient || !supabaseUrl || !supabaseKey) { renderProjects(fallback); return; }
    try {
      const client = window.supabase.createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
      const { data, error } = await client
        .from("production_projects")
        .select("id,name,url,domain,category,description,image_url,sort_order,updated_at")
        .order("sort_order", { ascending: true })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []).filter((r) => r && (r.name || r.title) && (r.url || r.project_url || r.public_url)).map(normalizeProject);
      renderProjects(rows.length ? rows : fallback);
    } catch (_) {
      renderProjects(fallback);
    }
  };

  const initPreview = () => {
    const box = $(".preview");
    const img = box && $("img", box);
    const list = $("#production-list");
    if (!box || !img || !list || !finePointer.matches) return;
    img.addEventListener("error", () => box.classList.add("is-empty"));
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0, on = false;
    const loop = () => {
      cx += (x - cx) * 0.16; cy += (y - cy) * 0.16;
      box.style.left = `${cx}px`; box.style.top = `${cy}px`;
      raf = on || Math.abs(x - cx) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    list.addEventListener("pointermove", (e) => {
      x = e.clientX + 220; y = e.clientY;
      if (x + 190 > innerWidth) x = e.clientX - 220;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    list.addEventListener("pointerover", (e) => {
      const a = e.target.closest("a[data-preview]");
      if (!a) return;
      box.dataset.label = $(".d", a)?.textContent || "";
      if (img.getAttribute("src") !== a.dataset.preview) { box.classList.remove("is-empty"); img.src = a.dataset.preview; }
      if (!on) { cx = e.clientX + 220; cy = e.clientY; }
      on = true; box.classList.add("is-on");
    });
    list.addEventListener("pointerleave", () => { on = false; box.classList.remove("is-on"); });
  };

  /* ---------- marquee ---------- */
  const initMarquee = () => {
    $$(".marquee-track[data-items]").forEach((track) => {
      const items = track.dataset.items.split("|").map((s) => s.trim()).filter(Boolean);
      const run = items.map((t) => `<span>${esc(t)}</span><span class="sep" aria-hidden="true">/</span>`).join("");
      track.innerHTML = run + run.replace(/<span>/g, '<span aria-hidden="true">');
    });
  };

  /* ---------- planeta do hero (canvas 2D, pontos em esfera + anéis orbitais) ---------- */
  const initHeroCanvas = () => {
    const canvas = $(".hero-canvas");
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    let size = 0, dpr = 1, raf = 0, visible = true, t0 = performance.now();
    let tiltX = 0, tiltY = 0, targetX = 0, targetY = 0;
    let sphere = [], rings = [], stars = [];

    const build = () => {
      const small = size < 520;
      const n = small ? 700 : 1300;
      const golden = Math.PI * (3 - Math.sqrt(5));
      sphere = Array.from({ length: n }, (_, i) => {
        const y = 1 - (i / (n - 1)) * 2;
        const r = Math.sqrt(1 - y * y);
        const th = golden * i;
        return [Math.cos(th) * r, y, Math.sin(th) * r];
      });
      const ring = (radius, count, tilt, yaw, speed, spread) => ({
        radius, tilt, yaw, speed,
        pts: Array.from({ length: count }, (_, i) => ({ a: (i / count) * Math.PI * 2 + Math.random() * 0.02, o: (Math.random() - 0.5) * spread, s: Math.random() }))
      });
      rings = [
        ring(1.55, small ? 220 : 380, 1.18, -0.42, 0.16, 0.06),
        ring(1.95, small ? 160 : 280, 1.32, 0.55, -0.1, 0.03),
        ring(2.35, small ? 70 : 120, 1.05, 0.15, 0.06, 0.12)
      ];
      stars = Array.from({ length: small ? 50 : 110 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.1 + 0.2, p: Math.random() * 6.28 }));
    };

    const resize = () => {
      const r = canvas.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = r.width;
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      if (reduced.matches) draw(9000);
    };

    // rotação: yaw (y), depois pitch (x)
    const rot = (p, yaw, pitch) => {
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
      const x = p[0] * cy + p[2] * sy, z0 = -p[0] * sy + p[2] * cy;
      return [x, p[1] * cx - z0 * sx, p[1] * sx + z0 * cx];
    };

    const draw = (time) => {
      const t = time / 1000;
      const w = size, h = canvas.height / dpr, cx = w / 2, cy = h / 2, R = w * 0.215;
      ctx.clearRect(0, 0, w, h);

      stars.forEach((s) => {
        const a = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.p));
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
      });

      tiltX += (targetX - tiltX) * 0.05; tiltY += (targetY - tiltY) * 0.05;
      const yaw = t * 0.16 + tiltX * 0.5, pitch = -0.32 + tiltY * 0.3;

      // anéis: separa partes de trás e da frente para a oclusão
      const front = [], back = [];
      rings.forEach((rg, ri) => {
        rg.pts.forEach((p) => {
          const a = p.a + t * rg.speed;
          const rr = rg.radius + p.o;
          let q = [Math.cos(a) * rr, 0, Math.sin(a) * rr];
          q = rot(q, rg.yaw, 0); q = rot(q, 0, rg.tilt - Math.PI / 2 + pitch * 0.4);
          q = rot(q, tiltX * 0.25, 0);
          const item = { x: cx + q[0] * R, y: cy + q[1] * R, z: q[2], ri, s: p.s };
          (q[2] < 0 ? back : front).push(item);
        });
      });
      const dot = (it, alpha, r) => { ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`; ctx.fillRect(it.x - r / 2, it.y - r / 2, r, r); };
      back.forEach((it) => {
        const inside = Math.hypot(it.x - cx, it.y - cy) < R * 1.02;
        if (inside) return;
        dot(it, 0.12 + 0.18 * it.s, it.ri === 2 ? 1.2 : 1.1);
      });

      // halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.9);
      halo.addColorStop(0, "rgba(255,255,255,.10)"); halo.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(cx, cy, R * 1.9, 0, Math.PI * 2); ctx.fill();
      // disco escuro para esconder o que passa atrás
      const disc = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      disc.addColorStop(0, "#151515"); disc.addColorStop(1, "#030303");
      ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // esfera de pontos com luz e faixa de varredura
      const scan = Math.sin(t * 0.7) * 0.9;
      for (let i = 0; i < sphere.length; i++) {
        const q = rot(sphere[i], yaw, pitch);
        if (q[2] < -0.15) continue;
        const light = Math.pow(Math.max(0, -q[0] * 0.5 - q[1] * 0.5 + q[2] * 0.71), 1.6);
        const band = Math.max(0, 1 - Math.abs(q[1] - scan) / 0.08);
        const depth = (q[2] + 1) / 2;
        let a = 0.05 + light * 1.05 + band * 0.7 * depth;
        if (q[2] < 0) a *= 0.25;
        const r = 0.7 + depth * 0.9 + light * 1.2 + band * 0.9;
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, a).toFixed(3)})`;
        ctx.fillRect(cx + q[0] * R - r / 2, cy + q[1] * R - r / 2, r, r);
      }
      // borda
      ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      // brilho na borda iluminada
      const rim = ctx.createRadialGradient(cx - R * 0.45, cy - R * 0.5, R * 0.2, cx - R * 0.2, cy - R * 0.25, R * 1.05);
      rim.addColorStop(0, "rgba(255,255,255,.10)"); rim.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      front.forEach((it) => dot(it, 0.4 + 0.55 * it.s, it.ri === 2 ? 1.8 : 1.5));

      // satélites com rastro
      [[0, 0.0, 4], [1, 2.4, 3], [2, 4.4, 2.4]].forEach(([ri, phase, rad]) => {
        const rg = rings[ri];
        for (let k = 14; k >= 0; k--) {
          const a = phase + (t - k * 0.04) * rg.speed * 3.2;
          let q = [Math.cos(a) * rg.radius, 0, Math.sin(a) * rg.radius];
          q = rot(q, rg.yaw, 0); q = rot(q, 0, rg.tilt - Math.PI / 2 + pitch * 0.4); q = rot(q, tiltX * 0.25, 0);
          const x = cx + q[0] * R, y = cy + q[1] * R;
          if (q[2] < 0 && Math.hypot(x - cx, y - cy) < R) continue;
          if (k === 0) {
            const g = ctx.createRadialGradient(x, y, 0, x, y, rad * 6);
            g.addColorStop(0, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rad * 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
          } else {
            ctx.fillStyle = `rgba(255,255,255,${(0.5 * (1 - k / 15)).toFixed(3)})`;
            ctx.beginPath(); ctx.arc(x, y, rad * (1 - k / 18), 0, Math.PI * 2); ctx.fill();
          }
        }
      });
    };

    const loop = (now) => { draw(now - t0); raf = visible ? requestAnimationFrame(loop) : 0; };
    const start = () => { if (!raf && visible && !reduced.matches && !document.hidden) raf = requestAnimationFrame(loop); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
    }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    reduced.addEventListener?.("change", () => { stop(); resize(); start(); });
    if (finePointer.matches) {
      window.addEventListener("pointermove", (e) => { targetX = (e.clientX / innerWidth - 0.5) * 2; targetY = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });
    }
    start();
  };

  /* ---------- constelação: as partículas do planeta mudam de forma a cada seção ---------- */
  const initAmbient = () => {
    const canvas = $(".ambient");
    if (!canvas || !canvas.getContext || reduced.matches || !("IntersectionObserver" in window)) return;
    const ctx = canvas.getContext("2d");
    let w = 0, h = 0, U = 0, dpr = 1, small = false, raf = 0;
    let N = 0, rnd = [], pos = [], from = [], fade = 0, fadeTarget = 0;
    let shape = "none", switchAt = 0, yaw = 0, pitch = 0, yawT = 0, pitchT = 0;
    const DUR = 1700;
    const TAU = Math.PI * 2;

    const rot = (p, a, b) => {
      const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
      const x = p[0] * ca + p[2] * sa, z = -p[0] * sa + p[2] * ca;
      return [x, p[1] * cb - z * sb, p[1] * sb + z * cb];
    };

    // cada forma devolve coordenadas locais; o deslocamento lateral deixa o texto livre no computador
    const SHAPES = {
      helix: { ox: 0.95, oy: 0, a: 1, f: (i, u, r, t) => {
        const strand = i % 2, a = u * TAU * 2.2 + t * 0.45 + strand * Math.PI;
        let x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42;
        if (i % 9 === 0) { const s = r[0] * 2 - 1; x *= s; z *= s; }
        return rot([x, (u - 0.5) * 2.4, z], 0, 0.3);
      } },
      wave: { ox: 0, oy: 0.35, a: 0.9, f: (i, u, r, t) => {
        const cols = Math.ceil(Math.sqrt(N * 3)), c = i % cols, row = Math.floor(i / cols), rows = Math.ceil(N / cols);
        const x = (c / cols - 0.5) * 4.6, z = (row / rows - 0.5) * 2.2;
        const y = Math.sin(x * 1.4 + t * 1.1) * 0.16 + Math.cos(z * 2.6 + t * 0.8) * 0.1;
        return rot([x, y, z], 0, -0.42);
      } },
      flow: { ox: 0, oy: 0.25, a: 0.55, f: (i, u, r, t) => {
        if (r[1] < 0.42) {
          const k = Math.floor(r[2] * 5), a = r[0] * TAU + t * (0.6 + k * 0.08), rr = 0.1 + r[1] * 0.18;
          return [(k - 2) * 0.88 + Math.cos(a) * rr, Math.sin(a) * rr * 0.6, Math.sin(a) * rr];
        }
        const s = (u + t * 0.035) % 1, x = (s - 0.5) * 4.4;
        return [x, Math.sin(s * TAU * 2.5 + t * 0.6) * 0.07 + (r[0] - 0.5) * 0.05, (r[2] - 0.5) * 0.2];
      } },
      rise: { ox: 0.95, oy: 0, a: 1, f: (i, u, r, t) => {
        const a = u * TAU * 3 + t * 0.35, rr = 0.12 + u * 0.62;
        return rot([Math.cos(a) * rr, (0.5 - u) * 2.2 + (r[0] - 0.5) * 0.04, Math.sin(a) * rr], 0, 0.25);
      } },
      dust: { ox: 0, oy: 0, a: 0.8, f: (i, u, r, t) => {
        const th = r[0] * TAU, ph = Math.acos(r[1] * 2 - 1), rr = 1.2 + r[2] * 1.6;
        return rot([Math.sin(ph) * Math.cos(th) * rr * 1.5, Math.cos(ph) * rr * 0.8, Math.sin(ph) * Math.sin(th) * rr], t * 0.025, 0);
      } },
      ring: { ox: 1.0, oy: -0.05, a: 1, f: (i, u, r, t) => {
        const a = u * TAU + t * 0.22, b = r[0] * TAU, rr = 0.7 + Math.cos(b) * 0.055 + (r[1] - 0.5) * 0.05;
        return rot(rot([Math.cos(a) * rr, Math.sin(b) * 0.055, Math.sin(a) * rr], 0, 1.15), 0.5, 0);
      } }
    };
    const MAP = { servicos: "helix", diferencial: "wave", processo: "flow", trajetoria: "rise", faq: "dust", contato: "ring" };

    const resize = () => {
      w = innerWidth; h = innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2);
      small = w < 900; U = Math.min(w, h) * (small ? 0.4 : 0.42);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = small ? 1000 : 2200;
      if (n !== N) {
        N = n;
        rnd = Array.from({ length: N }, () => [Math.random(), Math.random(), Math.random()]);
        pos = rnd.map((r) => [(r[0] - 0.5) * 6, (r[1] - 0.5) * 4, (r[2] - 0.5) * 3]);
        from = pos.map((p) => p.slice());
        push = rnd.map(() => [0, 0]);
      }
      sampleName();
    };

    // assinatura: as mesmas partículas desenham o nome no rodapé
    const giant = $(".footer-giant");
    let namePts = [], push = [], mx = -9999, my = -9999;
    const sampleName = () => {
      if (!giant || !N) return;
      const r = giant.getBoundingClientRect(), cs = getComputedStyle(giant);
      if (!r.width) return;
      const W = Math.ceil(r.width), H = Math.ceil(r.height);
      const off = document.createElement("canvas"); off.width = W; off.height = H;
      const o = off.getContext("2d");
      const size = parseFloat(cs.fontSize);
      o.font = `500 ${size}px ${cs.fontFamily}`;
      if ("letterSpacing" in o) o.letterSpacing = cs.letterSpacing;
      o.textAlign = "center"; o.textBaseline = "middle"; o.fillStyle = "#fff";
      o.fillText(giant.dataset.text || "mPaiva_", W / 2, parseFloat(cs.paddingTop) + (H - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) / 2);
      const data = o.getImageData(0, 0, W, H).data;
      const step = Math.max(2, Math.round(size / 70));
      const pts = [];
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 140) pts.push([x + (Math.random() - 0.5) * step, y + (Math.random() - 0.5) * step]);
      if (!pts.length) return;
      for (let k = pts.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [pts[k], pts[j]] = [pts[j], pts[k]]; }
      namePts = Array.from({ length: N }, (_, i) => pts[i % pts.length]);
      document.documentElement.classList.add("has-ambient");
    };
    let nameRect = null;
    const nameTarget = (i, t, cx, cy) => {
      const p = namePts[i];
      if (!p || !nameRect) return [0, 0, 0];
      let X = nameRect.left + p[0], Y = nameRect.top + p[1];
      // o cursor espalha as partículas e elas voltam com mola
      const dx = X - mx, dy = Y - my, d = Math.hypot(dx, dy), R = small ? 0 : 110;
      let px = 0, py = 0;
      if (d < R && d > 0.01) { const f = Math.pow(1 - d / R, 2) * 70; px = (dx / d) * f; py = (dy / d) * f; }
      const q = push[i]; q[0] += (px - q[0]) * 0.14; q[1] += (py - q[1]) * 0.14;
      X += q[0] + Math.sin(t * 1.3 + i) * 0.6; Y += q[1] + Math.cos(t * 1.1 + i * 0.7) * 0.6;
      return [(X - cx) / U, (Y - cy) / U, 0];
    };

    const target = (i, t, cx, cy) => {
      if (shape === "name") return nameTarget(i, t, cx, cy);
      const sh = SHAPES[shape];
      const p = rot(sh.f(i, i / N, rnd[i], t), yaw, pitch);
      p[0] += small ? 0 : sh.ox * (w / h > 1.2 ? 1.25 : 1); p[1] += small ? 0 : sh.oy;
      return p;
    };

    const draw = (now) => {
      const t = now / 1000;
      fade += (fadeTarget - fade) * 0.06;
      yaw += (yawT - yaw) * 0.04; pitch += (pitchT - pitch) * 0.04;
      ctx.clearRect(0, 0, w, h);
      if (fade < 0.005 && fadeTarget === 0) { raf = 0; return; }
      const cx = w / 2, cy = h / 2, isName = shape === "name";
      const base = (isName ? 0.95 : small ? 0.34 : 0.62) * fade * (SHAPES[shape]?.a ?? 1);
      let shineX = 0, shineW = 1;
      if (isName && giant) {
        nameRect = giant.getBoundingClientRect();
        shineW = nameRect.width; shineX = nameRect.left + ((t * 0.28) % 1.6 - 0.3) * shineW;
      }
      const dur = isName ? 2400 : DUR;
      for (let i = 0; i < N; i++) {
        let p = pos[i];
        if (shape !== "none") {
          const q = target(i, t, cx, cy);
          const d = (rnd[i][0] * 0.35);
          let k = Math.min(1, Math.max(0, ((now - switchAt) / dur - d) / (1 - 0.35)));
          k = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          const f = from[i];
          p = pos[i] = [f[0] + (q[0] - f[0]) * k, f[1] + (q[1] - f[1]) * k, f[2] + (q[2] - f[2]) * k];
        }
        const s = 3 / (3 + p[2]);
        if (s <= 0) continue;
        let a = base * Math.min(1, 0.25 + 0.75 * (1 - (p[2] + 1.5) / 3)) * (0.55 + rnd[i][1] * 0.45);
        let r = 0.6 + s * 1.05 + (rnd[i][2] > 0.96 ? 1.1 : 0);
        if (isName) {
          const X = cx + p[0] * U, band = Math.exp(-Math.pow((X - shineX) / (shineW * 0.07), 2));
          a = Math.min(1, base * (0.62 + rnd[i][1] * 0.38) + band * 0.5 * fade);
          r = (small ? 1.3 : 1.7) + band * 1.2;
        }
        if (a < 0.01) continue;
        ctx.fillStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.fillRect(cx + p[0] * U * s - r / 2, cy + p[1] * U * s - r / 2, r, r);
      }
      raf = requestAnimationFrame(draw);
    };
    const start = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(draw); };

    const setShape = (next) => {
      if (next === shape && fadeTarget === 1) return;
      if (next === "none") { fadeTarget = 0; start(); return; }
      from = pos.map((p) => p.slice());
      if (next !== shape || fade < 0.05) switchAt = performance.now();
      shape = next; fadeTarget = 1; start();
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    document.fonts?.ready.then(sampleName);
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setShape(e.target.classList.contains("footer") ? (namePts.length ? "name" : "none") : MAP[e.target.id] || "none"); });
    }, { rootMargin: "-50% 0px -50% 0px" });
    $$("main > section, .footer").forEach((sec) => spy.observe(sec));
    document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else if (fadeTarget) start(); });
    if (finePointer.matches) {
      window.addEventListener("pointermove", (e) => { mx = e.clientX; my = e.clientY; yawT = (e.clientX / innerWidth - 0.5) * 0.5; pitchT = (e.clientY / innerHeight - 0.5) * 0.3; }, { passive: true });
      document.documentElement.addEventListener("pointerleave", () => { mx = my = -9999; });
    }
  };

  /* ---------- movimento com GSAP (ScrollTrigger + SplitText) ---------- */
  const initMotion = () => {
    const { gsap, ScrollTrigger, SplitText } = window;
    if (!gsap || !ScrollTrigger) return false;
    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);
    document.documentElement.classList.add("has-gsap");
    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // título do hero letra a letra; trechos com brilho sobem inteiros
      $$(".hero [data-split]").forEach((el, i) => {
        if (SplitText && !el.hasAttribute("data-shine")) {
          const split = new SplitText(el, { type: "chars", charsClass: "split-char" });
          gsap.from(split.chars, { yPercent: 115, duration: 1.2, ease: "expo.out", stagger: 0.025, delay: 0.15 + i * 0.1 });
        } else {
          gsap.from(el, { yPercent: 110, duration: 1.3, ease: "expo.out", delay: 0.2 + i * 0.1 });
        }
      });
      gsap.from(".hero-stage", { scale: 0.7, opacity: 0, duration: 2.2, ease: "expo.out", delay: 0.1 });

      // saída do hero: planeta cresce e o texto sobe
      gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } })
        .to(".hero-stage", { scale: 1.35, yPercent: -18, opacity: 0.25, ease: "none" }, 0)
        .to(".hero-copy", { yPercent: -30, opacity: 0, ease: "none" }, 0);

      // títulos de seção palavra a palavra
      if (SplitText) {
        $$("[data-words]").forEach((el) => {
          // letras giram de baixo para cima, em 3D, dentro de uma máscara por linha
          const split = new SplitText(el, { type: "lines,words,chars", linesClass: "split-line", mask: "lines" });
          gsap.set(split.lines, { perspective: 700 });
          gsap.from(split.chars, { yPercent: 120, rotationX: -95, opacity: 0, transformOrigin: "50% 100% -20px", duration: 1.15, ease: "expo.out", stagger: 0.014, scrollTrigger: { trigger: el, start: "top 85%" } });
        });
      }

      // contato: linhas sobem ao entrar
      $$(".contact [data-split]").forEach((el, i) => {
        gsap.from(el, { yPercent: 110, duration: 1.3, ease: "expo.out", delay: i * 0.1, scrollTrigger: { trigger: ".contact-display", start: "top 80%" } });
      });

      // manifesto: palavras acendem conforme a rolagem
      $$("[data-scrub]").forEach((el) => {
        const words = el.textContent.trim().split(/\s+/);
        el.innerHTML = words.map((w) => `<span class="w">${esc(w)}</span>`).join(" ");
        gsap.to($$(".w", el), { opacity: 1, stagger: 0.1, ease: "none", scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true } });
      });

      // rótulos de seção se decodificam ao entrar, como um terminal
      const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_";
      $$(".section-head .label, .faq-head .label, .manifesto .label, .contact-top > .label").forEach((el) => {
        const text = el.textContent;
        const st = { p: 0 };
        gsap.to(st, {
          p: 1, duration: 1.1, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate: () => {
            const n = Math.floor(st.p * text.length);
            el.textContent = text.slice(0, n) + text.slice(n).replace(/[^\s·]/g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]);
          },
          onComplete: () => { el.textContent = text; }
        });
      });

      // processo: a linha percorre os cinco passos conforme a rolagem
      const steps = $("#process-steps");
      if (steps) {
        steps.classList.add("is-scrubbed");
        const tl = gsap.timeline({ scrollTrigger: { trigger: steps, start: "top 78%", end: "bottom 52%", scrub: 0.8 } });
        $$(".step", steps).forEach((st, i) => {
          tl.fromTo($(".bar", st), { scaleX: 0 }, { scaleX: 1, ease: "none", duration: 1 }, i)
            .fromTo($$(".n, h3, p, .out", st), { opacity: 0.18, y: 18 }, { opacity: 1, y: 0, ease: "power2.out", duration: 0.8, stagger: 0.06 }, i + 0.2);
        });
      }

      // trajetória: cada cargo entra por baixo de uma máscara
      $$(".tl-row").forEach((row) => {
        gsap.from(row.children, { yPercent: 60, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.06, scrollTrigger: { trigger: row, start: "top 90%" } });
      });

      // cards de trabalho: inclinação 3D e reflexo que segue o mouse
      if (finePointer.matches) {
        $$(".work-visual").forEach((card) => {
          const rx = gsap.quickTo(card, "rotationX", { duration: 0.7, ease: "power3.out" });
          const ry = gsap.quickTo(card, "rotationY", { duration: 0.7, ease: "power3.out" });
          gsap.set(card, { transformPerspective: 1100 });
          card.addEventListener("pointermove", (e) => {
            const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
            rx((0.5 - py) * 9); ry((px - 0.5) * 11);
            card.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`); card.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
          });
          card.addEventListener("pointerleave", () => { rx(0); ry(0); });
        });
      }

      // botões magnéticos
      if (finePointer.matches) {
        $$(".hero .btn, .contact-actions .btn, .nav-cta").forEach((btn) => {
          const xTo = gsap.quickTo(btn, "x", { duration: 0.6, ease: "power3.out" });
          const yTo = gsap.quickTo(btn, "y", { duration: 0.6, ease: "power3.out" });
          btn.addEventListener("pointermove", (e) => {
            const r = btn.getBoundingClientRect();
            xTo((e.clientX - r.left - r.width / 2) * 0.28); yTo((e.clientY - r.top - r.height / 2) * 0.4);
          });
          btn.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
        });
      }

      // assinatura do rodapé: letras chegam do fundo, desfocadas, e um brilho metálico atravessa a palavra
      const giant = $(".footer-giant");
      if (giant && SplitText && !document.documentElement.classList.contains("has-ambient")) {
        const split = new SplitText(giant.querySelector(".fg-word"), { type: "chars", charsClass: "ch" });
        const chars = [...split.chars, giant.querySelector(".fg-caret")];
        gsap.timeline({ scrollTrigger: { trigger: giant, start: "top bottom", end: "center 45%", scrub: 1.2, refreshPriority: -1 } })
          .from(chars, { opacity: 0, filter: "blur(28px)", scale: 2.6, rotationX: -75, yPercent: 35, z: 260, ease: "power3.out", duration: 1, stagger: { each: 0.09, from: "center" } }, 0)
          .from(giant, { letterSpacing: "0.32em", ease: "power2.out", duration: 1.2 }, 0)
          .fromTo(giant, { "--glow": 0 }, { "--glow": 1, ease: "power1.in", duration: 0.6 }, 0.5)
          .fromTo(giant, { "--shine": "160%" }, { "--shine": "-60%", ease: "power2.inOut", duration: 0.7 }, 1.1);
        // brilho que acompanha o cursor depois da chegada
        if (finePointer.matches) {
          const setShine = gsap.quickTo(giant, "--shine", { duration: 0.8, ease: "power3.out", unit: "%" });
          giant.addEventListener("pointermove", (e) => {
            const r = giant.getBoundingClientRect();
            setShine(83.3 - ((e.clientX - r.left) / r.width) * 66.7);
          });
          giant.addEventListener("pointerleave", () => setShine(-60));
        }
      }
    });

    // trabalho: faixa horizontal fixada no computador
    mm.add("(min-width: 901px) and (prefers-reduced-motion: no-preference)", () => {
      const track = $(".work-track");
      const pin = $(".work-pin");
      if (!track || !pin) return;
      const distance = () => Math.max(0, track.scrollWidth - innerWidth);
      gsap.to(track, {
        x: () => -distance(), ease: "none",
        scrollTrigger: { trigger: pin, start: "center center", end: () => `+=${distance()}`, pin: true, scrub: 0.6, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      // os cards inclinam conforme a velocidade da rolagem
      const cards = $$(".work-card");
      const skewTo = gsap.quickTo(cards, "skewX", { duration: 0.5, ease: "power3.out" });
      ScrollTrigger.create({ trigger: pin, start: "center center", end: () => `+=${distance()}`, onUpdate: (self) => skewTo(gsap.utils.clamp(-7, 7, self.getVelocity() / -320)) });
      ScrollTrigger.addEventListener("scrollEnd", () => skewTo(0));
      $$(".work-card .work-visual img").forEach((img) => {
        gsap.fromTo(img, { scale: 1.12 }, { scale: 1, ease: "none", scrollTrigger: { trigger: pin, start: "center center", end: () => `+=${distance()}`, scrub: true } });
      });
    });

    window.addEventListener("load", () => ScrollTrigger.refresh());
    return true;
  };

  /* ---------- cursor ---------- */
  const initCursor = () => {
    const c = $(".cursor"), ring = $(".cursor-ring");
    if (!c || !ring || !finePointer.matches || reduced.matches) return;
    // um cursor só: o ponto segue o mouse sem atraso e o anel vem logo atrás
    document.documentElement.classList.add("has-cursor");
    let x = -100, y = -100, rx = -100, ry = -100;
    const loop = () => {
      rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loop);
    };
    document.addEventListener("pointermove", (e) => {
      x = e.clientX; y = e.clientY;
      c.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      c.classList.add("is-on"); ring.classList.add("is-on");
    }, { passive: true });
    document.documentElement.addEventListener("pointerleave", () => { c.classList.remove("is-on"); ring.classList.remove("is-on"); });
    document.addEventListener("pointerover", (e) => {
      const on = !!e.target.closest("a, button, summary, select");
      c.classList.toggle("is-hover", on); ring.classList.toggle("is-hover", on);
    });
    document.addEventListener("pointerdown", () => ring.classList.add("is-down"));
    document.addEventListener("pointerup", () => ring.classList.remove("is-down"));
    requestAnimationFrame(loop);
  };

  /* ---------- rolagem: progresso, nav, link ativo ---------- */
  const initScroll = () => {
    const bar = $(".progress span");
    const nav = $(".nav");
    const menuBtn = $(".menu-btn");
    let last = scrollY, ticking = false;
    const update = () => {
      const y = scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
      if (nav) {
        nav.classList.toggle("is-scrolled", y > 24);
        const menuOpen = menuBtn?.getAttribute("aria-expanded") === "true";
        nav.classList.toggle("is-hidden", !menuOpen && y > 600 && y > last + 4);
        if (y < last - 4) nav.classList.remove("is-hidden");
      }
      last = y; ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();

    const links = $$(".nav-links a");
    const targets = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
    if ("IntersectionObserver" in window && targets.length) {
      const spy = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      targets.forEach((t) => spy.observe(t));
    }
  };

  /* ---------- menu ---------- */
  const initMenu = () => {
    const btn = $(".menu-btn");
    const menu = $("#menu");
    if (!btn || !menu) return;
    const set = (open) => {
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      menu.hidden = !open;
      document.documentElement.style.overflow = open ? "hidden" : "";
      if (open) $(".nav")?.classList.remove("is-hidden");
    };
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
    menu.addEventListener("click", (e) => { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) { set(false); btn.focus(); } });
  };

  /* ---------- copiar e-mail ---------- */
  const toast = (msg) => {
    const el = $(".toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("is-on"), 2200);
  };

  const initCopy = () => {
    const btn = $("#copy-email");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const email = btn.dataset.email;
      try { await navigator.clipboard.writeText(email); toast("E-mail copiado"); }
      catch (_) { toast(email); }
    });
  };

  /* ---------- horário local no contato ---------- */
  const initClock = () => {
    const el = $("#local-time");
    if (!el || !window.Intl) return;
    const fmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
    const tick = () => { el.textContent = fmt.format(new Date()); };
    tick(); setInterval(tick, 30000);
  };

  /* ---------- início ---------- */
  const boot = () => {
    initMarquee();
    initModes();
    initMenu();
    initScroll();
    initCursor();
    initPreview();
    initCopy();
    initClock();
    observeReveals();
    initHeroCanvas();
    initAmbient();
    initMotion();
    requestAnimationFrame(() => document.body.classList.add("is-ready"));
    loadProjects();
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
