/* Guia 02 · Anatomia de um bom prompt
   hero em partículas, anatomia interativa, antes e depois, montador de prompt e frases para copiar.
   Nada do que a pessoa escreve sai do navegador. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, rectPoints, heroBox, boxText, onVisible, reduced, copy } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NAMES = { papel: "Papel", contexto: "Contexto", tarefa: "Tarefa", formato: "Formato", exemplo: "Exemplo", limites: "Limites" };
  const KEYS = Object.keys(NAMES);
  const seg = (k, text, i = 0) => {
    const s = document.createElement("span");
    s.className = "seg"; s.dataset.k = k; s.style.setProperty("--i", i);
    const tag = document.createElement("i"); tag.textContent = NAMES[k];
    s.append(tag, document.createTextNode(text));
    return s;
  };
  const plain = (root) => $$(".seg", root).map((s) => s.lastChild.textContent.trim()).join("\n\n");

  /* ---------- hero ---------- */
  const pathPoints = (pts, thick, step) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      for (let s = 0; s <= len; s += step) for (let u = -thick / 2; u <= thick / 2; u += step) out.push([x1 + ux * s - uy * u, y1 + uy * s + ux * u]);
    }
    return out;
  };
  const initHero = () => {
    const canvas = $(".lx-field canvas"), stage = $(".lx-stage");
    const LABELS = ["01 · Pedido vago", "02 · Seis partes", "03 · Bem escrito", "04 · Resposta melhor"];
    const shapes = [
      (w, h) => {
        const b = heroBox(w, h), bh = Math.min(b.h * 0.12, 46), y = b.y + b.h / 2 - bh / 2, st = w < 700 ? 4 : 3.4;
        return rectPoints([[b.x, y, b.w * 0.34, bh]], st).concat(rectPoints([[b.x + b.w * 0.34 + bh * 0.5, y - bh * 0.25, Math.max(4, bh * 0.14), bh * 1.5]], 2.6));
      },
      (w, h) => {
        const b = heroBox(w, h), Lw = [0.55, 0.92, 0.78, 0.66, 0.5, 0.84], bh = Math.min(b.h * 0.07, 30), gap = bh * 0.95;
        const y0 = b.y + b.h / 2 - (Lw.length * bh + (Lw.length - 1) * gap) / 2, st = w < 700 ? 4 : 3.4, rects = [];
        Lw.forEach((k, i) => { const y = y0 + i * (bh + gap); rects.push([b.x, y, bh, bh], [b.x + bh * 1.8, y, (b.w - bh * 1.8) * k, bh]); });
        return rectPoints(rects, st);
      },
      (w, h) => { const b = heroBox(w, h); return boxText("prompt", w, h, b, { size: b.h * 0.46 }); },
      (w, h) => {
        const b = heroBox(w, h), s = Math.min(b.w, b.h) * 0.9, x0 = b.x + b.w / 2 - s / 2, y0 = b.y + b.h / 2 - s / 2;
        return pathPoints([[x0 + s * 0.08, y0 + s * 0.52], [x0 + s * 0.38, y0 + s * 0.82], [x0 + s * 0.94, y0 + s * 0.16]], Math.max(18, s * 0.075), w < 700 ? 3.6 : 3);
      }
    ];
    MPField(canvas, { shapes, hold: 3800, onShape: (i) => { if (stage) stage.textContent = LABELS[i]; } });
  };

  /* ---------- 01 · anatomia ---------- */
  const initAnatomy = () => {
    const root = $(".anat");
    if (!root) return;
    const parts = $$(".anat-part", root), segs = $$(".anat-text .seg", root);
    let cur = -1, auto = true, t = 0, visible = false;
    const set = (k) => {
      root.classList.toggle("has-on", !!k);
      parts.forEach((p) => { const on = p.dataset.k === k; p.classList.toggle("is-on", on); p.setAttribute("aria-pressed", on ? "true" : "false"); });
      segs.forEach((s) => s.classList.toggle("is-on", s.dataset.k === k));
      const list = $(".anat-parts", root), act = parts.find((p) => p.dataset.k === k);
      if (act && list.scrollWidth > list.clientWidth + 4) list.scrollTo({ left: act.parentElement.offsetLeft - list.offsetLeft - 8, behavior: reduced.matches ? "auto" : "smooth" });
    };
    const cycle = () => {
      clearTimeout(t);
      if (!auto || !visible || reduced.matches) return;
      cur = (cur + 1) % KEYS.length; set(KEYS[cur]);
      t = setTimeout(cycle, 2300);
    };
    parts.forEach((p, i) => {
      p.addEventListener("click", () => { auto = false; clearTimeout(t); if (cur === i && root.classList.contains("has-on")) { cur = -1; set(null); } else { cur = i; set(p.dataset.k); } });
    });
    segs.forEach((s) => s.addEventListener("click", () => { auto = false; clearTimeout(t); cur = KEYS.indexOf(s.dataset.k); set(s.dataset.k); }));
    $(".anat-copy", root)?.addEventListener("click", () => copy(plain($(".anat-text", root)), "Prompt copiado"));
    onVisible(root, (v) => { visible = v; if (v) cycle(); else clearTimeout(t); }, "-20% 0px");
  };

  /* ---------- 02 · antes e depois ---------- */
  const CASES = [
    { tab: "E-mail", before: "escreve um email pedindo aumento",
      after: [["papel", "Aja como um gerente de RH experiente."], ["contexto", "Trabalho há 2 anos como analista, assumi um projeto novo este ano e bati as metas do semestre."], ["tarefa", "Escreva um e-mail para o meu gestor pedindo uma conversa sobre reajuste."], ["formato", "Tom profissional e direto, em no máximo 120 palavras."], ["limites", "Não cite valores e não me compare com colegas."]],
      rb: "um e-mail genérico, que serve para qualquer pessoa e não lembra nenhuma conquista sua.",
      ra: "um e-mail curto que cita o projeto e as metas e pede uma conversa, não um número.",
      why: "O contexto dá à IA argumentos que só você tem. O limite evita os dois erros mais comuns desse tipo de e-mail." },
    { tab: "Resumo", before: "resume esse texto",
      after: [["contexto", "Vou colar abaixo um artigo sobre a reforma tributária. Eu não sou da área."], ["tarefa", "Resuma o que muda para quem é pessoa física."], ["formato", "Em 5 tópicos curtos e, no fim, uma frase com o que eu preciso fazer."], ["limites", "Se o texto não disser algo, escreva \"o texto não diz\". Não complete por conta própria."]],
      rb: "um resumo do texto inteiro, no mesmo nível técnico do original.",
      ra: "só o que importa para você, em linguagem simples, e sem informação inventada.",
      why: "Dizer para quem é o resumo muda o que entra nele. O limite reduz a chance de a IA preencher lacunas com suposições." },
    { tab: "Post", before: "faz um post sobre minha loja",
      after: [["papel", "Você é social media de pequenos negócios."], ["contexto", "Tenho uma padaria de bairro. O público é de famílias e o forte é o pão de fermentação natural."], ["tarefa", "Crie 3 opções de legenda para um post no Instagram sobre a fornada de sábado."], ["formato", "Até 3 linhas cada, com uma chamada para ação."], ["exemplo", "Um tom parecido com: \"Saiu agora, quentinho, do jeito que você gosta.\""], ["limites", "No máximo 3 hashtags."]],
      rb: "um texto de propaganda que poderia ser de qualquer loja, com emojis e hashtags demais.",
      ra: "três legendas com a cara da padaria, prontas para escolher e postar.",
      why: "Pedir opções dá escolha. O exemplo de tom vale mais do que escrever \"seja descontraído\"." },
    { tab: "Estudo", before: "me explica fotossíntese",
      after: [["papel", "Seja um professor paciente."], ["contexto", "Tenho prova de biologia do 1º ano do ensino médio na sexta."], ["tarefa", "Explique fotossíntese e depois me faça 3 perguntas para eu testar se entendi, uma de cada vez."], ["formato", "Explicação em até 6 frases, com uma comparação do dia a dia."], ["limites", "Não me dê as respostas antes de eu tentar."]],
      rb: "uma explicação de enciclopédia, longa, que você lê e esquece.",
      ra: "uma explicação curta e um mini teste, do jeito que um bom professor faria.",
      why: "Transformar a IA em quem pergunta faz você aprender de verdade, em vez de só ler." },
    { tab: "Planilha", before: "fórmula pra somar",
      after: [["contexto", "Tenho uma planilha no Google Sheets: a coluna A tem datas, a B tem categorias (mercado, transporte, lazer) e a C tem valores."], ["tarefa", "Quero a fórmula que soma só os gastos de \"mercado\" do mês de março."], ["formato", "A fórmula pronta e uma linha explicando cada parte."], ["limites", "Use só funções nativas, sem script."]],
      rb: "a explicação do SOMA básico, que você já sabia.",
      ra: "a fórmula exata para a sua planilha, pronta para colar.",
      why: "Descrever as colunas é o contexto. Sem ele, a IA não tem como saber onde estão os seus dados." }
  ];
  const words = (s) => (s.trim().match(/\S+/g) || []).length;
  const initBA = () => {
    const root = $(".ba");
    if (!root) return;
    const tabs = $(".ba-tabs", root), tb = $('[data-t="b"]', root), ta = $('[data-t="a"]', root);
    const rb = $('[data-r="b"]', root), ra = $('[data-r="a"]', root), cb = $('[data-c="b"]', root), ca = $('[data-c="a"]', root), why = $(".ba-why-t", root);
    const res = (el, txt) => { el.textContent = ""; const b = document.createElement("b"); b.textContent = "Costuma voltar: "; el.append(b, document.createTextNode(txt)); };
    const show = (i) => {
      const c = CASES[i];
      $$(".chip", tabs).forEach((b, j) => { b.setAttribute("aria-selected", j === i ? "true" : "false"); b.classList.toggle("is-on", j === i); b.tabIndex = j === i ? 0 : -1; });
      tb.textContent = c.before;
      ta.textContent = ""; ta.classList.remove("is-in"); void ta.offsetWidth;
      c.after.forEach(([k, t], n) => ta.append(seg(k, t, n)));
      ta.classList.add("is-in");
      res(rb, c.rb); res(ra, c.ra);
      cb.textContent = `${words(c.before)} palavras`;
      ca.textContent = `${c.after.reduce((s, [, t]) => s + words(t), 0)} palavras`;
      why.textContent = c.why;
    };
    CASES.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.setAttribute("role", "tab"); b.textContent = c.tab;
      b.addEventListener("click", () => show(i));
      b.addEventListener("keydown", (e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        const n = (i + (e.key === "ArrowRight" ? 1 : CASES.length - 1)) % CASES.length;
        show(n); $$(".chip", tabs)[n].focus();
      });
      tabs.append(b);
    });
    $(".ba-copy", root)?.addEventListener("click", () => copy(plain(ta), "Prompt copiado"));
    show(0);
  };

  /* ---------- 03 · montador ---------- */
  const PRESETS = [
    { name: "Plano de estudos", papel: "um professor particular paciente", contexto: "Vou fazer o ENEM em novembro, estudo 2 horas por dia depois do trabalho e tenho mais dificuldade em matemática.", tarefa: "crie um plano de estudos de 4 semanas focado em matemática", formato: "numa tabela", tamanho: "de tamanho médio", exemplo: "", limites: ["Se faltar informação, me pergunte antes de responder."] },
    { name: "Currículo", papel: "um recrutador da área de tecnologia", contexto: "Vou colar meu currículo abaixo. Quero uma vaga de analista de dados júnior e venho da área administrativa.", tarefa: "aponte o que melhorar e reescreva o meu resumo profissional", formato: "em tópicos curtos", tamanho: "curta, em até 100 palavras", exemplo: "", limites: ["Não invente dados; se não souber, diga que não sabe."] },
    { name: "Viagem", papel: "um agente de viagens que conhece bem o Brasil", contexto: "Somos dois adultos e uma criança de 5 anos, viajando em julho, com orçamento total de R$ 5.000 e saindo de São Paulo.", tarefa: "sugira 3 destinos para 4 dias e monte o roteiro do melhor deles", formato: "em passo a passo numerado", tamanho: "detalhada", exemplo: "", limites: ["Não invente dados; se não souber, diga que não sabe.", "Diga de onde vem cada número ou afirmação importante."] },
    { name: "Mensagem difícil", papel: "", contexto: "Preciso avisar um cliente que a entrega vai atrasar uma semana porque o fornecedor não enviou uma peça.", tarefa: "escreva a mensagem para o cliente", formato: "em formato de e-mail", tamanho: "curta, em até 100 palavras", exemplo: "no tom de \"sei que isso atrapalha, e quero resolver junto com você\"", limites: ["Use linguagem simples, sem jargão."] }
  ];
  const dot = (s) => { s = s.trim(); return s && !/[.!?…:]$/.test(s) ? s + "." : s; };
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const initBuilder = () => {
    const form = $(".bd-form"), out = $(".bd-text"), meter = $(".bd-meter"), bars = $$(".bd-parts i");
    if (!form || !out) return;
    const f = (n) => form.elements[n];
    const group = (g) => $(`[data-group="${g}"]`, form);
    const picked = (g) => $$(".chip.is-on", group(g)).map((b) => b.dataset.v);
    let prev = {};
    const parts = () => {
      const p = {};
      const papel = f("papel").value.trim(), ctx = f("contexto").value.trim(), task = f("tarefa").value.trim(), ex = f("exemplo").value.trim();
      if (papel) p.papel = `Aja como ${papel.replace(/^(aja como|você é|voce e|seja)\s+/i, "")}${/[.!?]$/.test(papel) ? "" : "."}`;
      if (ctx) p.contexto = dot(ctx);
      if (task) p.tarefa = dot(cap(task));
      const fm = picked("formato")[0], tm = picked("tamanho")[0];
      if (fm || tm) p.formato = [fm ? `Responda ${fm}.` : "", tm ? `A resposta deve ser ${tm}.` : ""].filter(Boolean).join(" ");
      if (ex) p.exemplo = dot(`Exemplo do que eu espero: ${ex}`);
      const lim = picked("limites");
      if (lim.length) p.limites = lim.join(" ");
      return p;
    };
    const render = () => {
      const p = parts(), keys = KEYS.filter((k) => p[k]);
      out.textContent = "";
      if (!keys.length) {
        const e = document.createElement("span"); e.className = "bd-empty";
        e.textContent = "Escolha um exemplo acima ou preencha a tarefa. O prompt aparece aqui, montado na ordem certa.";
        out.append(e);
      }
      keys.forEach((k) => { const s = seg(k, p[k]); if (prev[k] !== p[k]) s.classList.add("is-new"); out.append(s); });
      prev = p;
      bars.forEach((b) => b.classList.toggle("is-on", !!p[b.dataset.k]));
      meter.textContent = `${keys.length} de 6 partes`;
    };
    $$(".chip", form).forEach((b) => {
      b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        const g = b.closest("[data-group]");
        if (!g.hasAttribute("data-multi")) $$(".chip", g).forEach((o) => { if (o !== b) { o.classList.remove("is-on"); o.setAttribute("aria-pressed", "false"); } });
        b.classList.toggle("is-on"); b.setAttribute("aria-pressed", b.classList.contains("is-on") ? "true" : "false");
        render();
      });
    });
    let t = 0;
    form.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 120); });
    const presets = $(".bd-presets");
    const fill = (pr) => {
      ["papel", "contexto", "tarefa", "exemplo"].forEach((n) => { f(n).value = pr[n] || ""; });
      [["formato", [pr.formato]], ["tamanho", [pr.tamanho]], ["limites", pr.limites]].forEach(([g, vals]) => {
        $$(".chip", group(g)).forEach((b) => { const on = vals.includes(b.dataset.v); b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
      });
      render();
    };
    PRESETS.forEach((pr) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = pr.name;
      b.addEventListener("click", () => { $$(".chip", presets).forEach((o) => o.classList.toggle("is-on", o === b)); fill(pr); });
      presets.append(b);
    });
    $(".bd-copy")?.addEventListener("click", () => {
      const txt = plain(out);
      if (!txt) { L.toast("Preencha pelo menos a tarefa"); return; }
      copy(txt, "Prompt copiado");
    });
    $(".bd-clear")?.addEventListener("click", () => { form.reset(); $$(".chip", form).forEach((b) => { b.classList.remove("is-on"); b.setAttribute("aria-pressed", "false"); }); $$(".chip", presets).forEach((o) => o.classList.remove("is-on")); prev = {}; render(); });
    render();
  };

  /* ---------- 04 · frases ---------- */
  const initTricks = () => {
    $$(".pr-tricks button").forEach((b) => b.addEventListener("click", async () => {
      const ok = await copy(b.dataset.copy, "Frase copiada");
      if (ok) { b.classList.add("is-done"); setTimeout(() => b.classList.remove("is-done"), 1600); }
    }));
  };

  const boot = () => { initHero(); initAnatomy(); initBA(); initBuilder(); initTricks(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
