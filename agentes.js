/* Guia 06 · Agentes de IA
   hero em partículas, chat × agente, o ciclo passo a passo, ferramentas que liberam tarefas
   e um teste de "vale a pena?". Tudo simulado no navegador: nenhum agente de verdade roda aqui. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, outlinePoints, ringPoints, pathPoints, polyPoints, heroBox, boxText, onVisible } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ---------- hero ---------- */
  const initHero = () => {
    const canvas = $(".lx-field canvas"), stage = $(".lx-stage");
    const LABELS = ["01 · O chat responde", "02 · O agente pensa", "03 · Usa ferramentas", "04 · Confere e entrega"];
    const st = (w) => (w < 700 ? 3.8 : 3.2);
    const shapes = [
      // balão de conversa com reticências
      (w, h) => {
        const b = heroBox(w, h), bw = Math.min(b.w * 0.82, b.h * 1.5), bh = bw * 0.5, x = b.x + b.w / 2 - bw / 2, y = b.y + b.h / 2 - bh / 2 - bh * 0.08, s = st(w);
        const dots = [0.3, 0.5, 0.7].flatMap((k) => ringPoints(x + bw * k, y + bh / 2, 0, bh * 0.07, s * 0.8));
        const tail = polyPoints([[x + bw * 0.16, y + bh - 2], [x + bw * 0.1, y + bh * 1.32], [x + bw * 0.32, y + bh - 2]], s);
        return outlinePoints([[x, y, bw, bh]], s, bh * 0.3).concat(dots, tail);
      },
      // o ciclo: um anel com três etapas
      (w, h) => {
        const b = heroBox(w, h), r = Math.min(b.w, b.h) * 0.38, cx = b.x + b.w / 2, cy = b.y + b.h / 2, s = st(w), t = Math.max(3, r * 0.035);
        const nodes = [-90, 30, 150].flatMap((a) => { const q = (a * Math.PI) / 180; return ringPoints(cx + Math.cos(q) * r, cy + Math.sin(q) * r, 0, r * 0.16, s * 0.9); });
        return ringPoints(cx, cy, r - t, r + t, s * 0.8).concat(nodes);
      },
      // uma chamada de ferramenta
      (w, h) => { const b = heroBox(w, h); return boxText("agir()", w, h, b, { size: b.h * 0.42, family: "ui-monospace, Menlo, Consolas, monospace", weight: 400, tracking: -0.02 }); },
      // conferido
      (w, h) => {
        const b = heroBox(w, h), s = Math.min(b.w, b.h) * 0.9, x0 = b.x + b.w / 2 - s / 2, y0 = b.y + b.h / 2 - s / 2;
        return pathPoints([[x0 + s * 0.08, y0 + s * 0.52], [x0 + s * 0.38, y0 + s * 0.82], [x0 + s * 0.94, y0 + s * 0.16]], Math.max(18, s * 0.075), w < 700 ? 3.6 : 3);
      }
    ];
    MPField(canvas, { shapes, hold: 3600, onShape: (i) => { if (stage) stage.textContent = LABELS[i]; } });
  };

  /* ---------- 01 · chat × agente ---------- */
  const VS = [
    { ask: "Marque uma reunião com a Ana na quinta e avise o time.",
      chat: "Claro! Abra a sua agenda, procure um horário livre na quinta, crie o evento convidando a Ana e depois mande uma mensagem no grupo do time avisando.",
      steps: ["Consultou a agenda da Ana e a sua", "Achou 15h livre para os dois", "Criou o convite “Reunião com Ana”, quinta às 15h", "Postou no canal do time: reunião quinta às 15h"],
      done: "Reunião marcada para quinta às 15h e time avisado." },
    { ask: "Quanto gastei com transporte este mês?",
      chat: "Não tenho acesso aos seus gastos. Você pode somar as despesas de transporte no extrato do banco ou num app de finanças.",
      steps: ["Abriu a planilha de gastos de novembro", "Filtrou a categoria Transporte", "Somou 23 lançamentos", "Comparou com outubro"],
      done: "R$ 412,30 em transporte, 8% a menos que em outubro." },
    { ask: "Responda os clientes que perguntaram o prazo de entrega.",
      chat: "Aqui vai um modelo: “Olá! Seu pedido chega em até 5 dias úteis. Qualquer dúvida, estamos à disposição.”",
      steps: ["Buscou e-mails não lidos que falam de prazo ou entrega", "Achou 6 e consultou cada pedido no sistema", "Escreveu 6 respostas com o prazo certo de cada um", "Deixou os rascunhos para você aprovar"],
      done: "6 respostas prontas para revisar. Nada foi enviado sem você." }
  ];
  const initVs = () => {
    const root = $(".vs");
    if (!root) return;
    const ask = $(".vs-ask", root), chat = $(".vs-chat", root), list = $(".vs-steps", root), done = $(".vs-done", root), tabs = $$(".vs-tabs .chip", root);
    const show = (i) => {
      const c = VS[i];
      tabs.forEach((t) => t.setAttribute("aria-pressed", String(+t.dataset.i === i)));
      ask.textContent = c.ask; chat.textContent = c.chat;
      [ask, chat].forEach((e) => { e.classList.remove("is-new"); void e.offsetWidth; e.classList.add("is-new"); });
      list.textContent = "";
      c.steps.forEach((s, k) => { const li = el("li", null, s); li.style.setProperty("--i", k); list.append(li); });
      done.innerHTML = ""; done.append(el("b", null, "Resultado"), document.createTextNode(c.done));
      done.style.setProperty("--n", c.steps.length);
      done.style.animation = "none"; void done.offsetWidth; done.style.animation = "";
    };
    tabs.forEach((t) => t.addEventListener("click", () => show(+t.dataset.i)));
    show(0);
  };

  /* ---------- 02 · o ciclo ---------- */
  const RUN = [
    { p: "pensa", t: "Preciso de voos para Recife na sexta. Vou buscar saindo de Guarulhos." },
    { p: "age", t: 'voos.buscar(origem: "GRU", destino: "REC", data: "sexta")', code: true },
    { p: "observa", t: "12 voos encontrados. O mais barato custa R$ 1.040." },
    { p: "pensa", t: "Passou do limite de R$ 900. Vou tentar saindo de Viracopos." },
    { p: "age", t: 'voos.buscar(origem: "VCP", destino: "REC", data: "sexta")', code: true },
    { p: "observa", t: "Voo 4521 às 7h10 por R$ 860." },
    { p: "pensa", t: "Está dentro do limite. Reservar gasta dinheiro, então preciso da confirmação." },
    { p: "voce", t: "Achei um voo de Viracopos às 7h10 por R$ 860. Posso reservar?", ask: true },
    { p: "age", t: 'voos.reservar(voo: "4521", passageiro: "você")', code: true },
    { p: "observa", t: "Reserva confirmada. Código XK7P2Q." },
    { p: "entrega", t: "Pronto: voo 4521, sexta às 7h10, Viracopos → Recife, R$ 860. O cartão de embarque chega no seu e-mail." }
  ];
  const TAG = { pensa: "Pensa", age: "Age", observa: "Observa", voce: "Pergunta", entrega: "Entrega" };
  const initRun = () => {
    const root = $(".run");
    if (!root) return;
    const log = $(".run-log", root), count = $(".run-count", root), loops = $(".run-loops", root), phases = $$(".run-phases li", root);
    const next = $(".run-next", root), ok = $(".run-ok", root), all = $(".run-all", root), reset = $(".run-reset", root);
    let i = 0, waiting = false, approved = false, timer = 0, nLoops = 0;
    const phase = (p) => {
      phases.forEach((li) => { const on = li.dataset.p === p; if (li.classList.contains("is-on") && !on) li.classList.add("is-was"); li.classList.toggle("is-on", on); });
      // no celular as fases rolam de lado: mantém a fase atual à vista
      const cur = phases.find((li) => li.dataset.p === p), box = cur && cur.parentElement;
      if (box && box.scrollWidth > box.clientWidth + 2) box.scrollTo({ left: box.scrollLeft + cur.getBoundingClientRect().left - box.getBoundingClientRect().left - 18, behavior: L.reduced.matches ? "auto" : "smooth" });
    };
    const paint = () => {
      count.textContent = `Passo ${i} de ${RUN.length}`;
      loops.textContent = nLoops === 1 ? "1 volta no ciclo" : `${nLoops} voltas no ciclo`;
      const end = i >= RUN.length;
      next.hidden = waiting || end; ok.hidden = !waiting; all.hidden = waiting || end;
    };
    const add = (s) => {
      const li = el("li"); li.dataset.p = s.p;
      li.append(el("i", null, TAG[s.p]));
      const span = el("span"); if (s.code) span.append(el("code", null, s.t)); else span.textContent = s.t;
      li.append(span); log.append(li); log.scrollTop = log.scrollHeight;
    };
    const step = () => {
      if (waiting || i >= RUN.length) return false;
      const s = RUN[i];
      if (s.p === "pensa" && i > 0) nLoops++;
      add(s); phase(s.p); i++;
      if (s.ask && !approved) waiting = true;
      paint();
      return !waiting && i < RUN.length;
    };
    const stopAuto = () => { clearTimeout(timer); timer = 0; };
    const auto = () => { stopAuto(); const go = () => { if (step()) timer = setTimeout(go, 900); else timer = 0; }; go(); };
    next.addEventListener("click", () => { stopAuto(); step(); });
    all.addEventListener("click", auto);
    ok.addEventListener("click", () => { waiting = false; approved = true; paint(); auto(); });
    reset.addEventListener("click", () => { stopAuto(); i = 0; nLoops = 0; waiting = false; approved = false; log.textContent = ""; phases.forEach((li) => li.classList.remove("is-on", "is-was")); paint(); });
    paint();
  };

  /* ---------- 03 · ferramentas ---------- */
  const TASKS = [
    { t: "Resumir as notícias do dia sobre o seu setor", need: ["busca"] },
    { t: "Marcar uma reunião com três pessoas", need: ["agenda", "email"] },
    { t: "Responder clientes sobre o prazo do pedido", need: ["email", "sistema"] },
    { t: "Montar o relatório de vendas da semana", need: ["sistema", "planilha"] },
    { t: "Pagar as contas do mês", need: ["planilha", "pagamento"], risky: true }
  ];
  const TOOL = { busca: "Busca na web", agenda: "Agenda", email: "E-mail", planilha: "Planilha", sistema: "Sistema da empresa", pagamento: "Pagamento" };
  const initTools = () => {
    const root = $(".tl");
    if (!root) return;
    const chips = $$(".tl-chip", root), list = $(".tl-tasks", root), on = $(".tl-on", root);
    const paint = () => {
      const have = new Set(chips.filter((c) => c.getAttribute("aria-pressed") === "true").map((c) => c.dataset.t));
      on.textContent = have.size === 1 ? "1 ligada" : `${have.size} ligadas`;
      list.textContent = "";
      TASKS.forEach((k) => {
        const miss = k.need.filter((n) => !have.has(n));
        const li = el("li"); if (!miss.length) li.classList.add("is-ok"); if (!miss.length && k.risky) li.classList.add("is-warn");
        li.append(el("h3", null, k.t), el("span", "tl-st", miss.length ? `Falta: ${miss.map((n) => TOOL[n]).join(" e ")}` : k.risky ? "Consegue, com sua aprovação" : "Consegue"));
        li.append(el("p", null, `Precisa de ${k.need.map((n) => TOOL[n].toLowerCase()).join(" e ")}.`));
        list.append(li);
      });
    };
    chips.forEach((c) => c.addEventListener("click", () => { c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true")); paint(); }));
    paint();
  };

  /* ---------- 04 · vale a pena? ---------- */
  const initWhen = () => {
    const root = $(".wq");
    if (!root) return;
    const rows = $$(".wq-list li", root), k = $(".wq-k", root), v = $(".wq-v", root), why = $(".wq-why", root);
    const ans = rows.map(() => null);
    const paint = () => {
      const n = ans.filter((a) => a !== null).length, yes = ans.filter((a) => a === 1).length;
      let title = "–", text = "Cada resposta muda o resultado.";
      if (n < rows.length) { k.textContent = `${n} de ${rows.length} respondidas`; }
      else {
        k.textContent = `${yes} de ${rows.length} sim`;
        if (ans[3] === 0 && yes >= 3) { title = "Agente, mas com você aprovando."; text = "A tarefa combina com um agente, mas um erro custa caro. Deixe o agente preparar tudo e uma pessoa confirmar antes da ação final."; }
        else if (yes === 5) { title = "Ótima candidata a agente."; text = "Repetitiva, previsível, fácil de conferir e de desfazer, com os dados acessíveis. Comece pequeno, com registro de cada passo e limite de gasto."; }
        else if (yes >= 3) { title = "Comece com um assistente."; text = "Use IA para sugerir e preparar, e você aprova cada entrega. Quando o processo estiver estável, dá para automatizar mais."; }
        else { title = "Ainda não é hora."; text = "Antes da IA, organize o processo: passos claros, dados num lugar só e um jeito de conferir o resultado. Depois volte aqui."; }
      }
      if (v.textContent !== title) { v.textContent = title; v.classList.remove("is-new"); void v.offsetWidth; v.classList.add("is-new"); }
      why.textContent = text;
    };
    rows.forEach((row, i) => $$(".chip", row).forEach((b) => b.addEventListener("click", () => {
      ans[i] = +b.dataset.v;
      $$(".chip", row).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      paint();
    })));
    rows.forEach((row) => $$(".chip", row).forEach((x) => x.setAttribute("aria-pressed", "false")));
    paint();
  };

  const boot = () => { initHero(); initVs(); initRun(); initTools(); initWhen(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
