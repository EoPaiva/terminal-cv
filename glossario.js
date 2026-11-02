/* Guia 03 · Glossário de IA
   hero em partículas, busca e filtro dos termos, destaque do link direto e teste rápido.
   Os cards são HTML estático (bom para busca e leitura); aqui só filtramos e animamos. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, heroBox, boxText, reduced, onVisible } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

  /* ---------- hero ---------- */
  const initHero = () => {
    const canvas = $(".lx-field canvas"), stage = $(".lx-stage");
    const W = [["LLM", "LLM · modelo de linguagem"], ["RAG", "RAG · busca e responde"], ["token", "Token · pedaço de texto"], ["agente", "Agente · IA que age"], ["MCP", "MCP · conector padrão"]];
    const shapes = W.map(([w]) => (cw, ch) => { const b = heroBox(cw, ch); return boxText(w, cw, ch, b, { size: b.h * 0.62 }); });
    MPField(canvas, { shapes, hold: 3400, onShape: (i) => { if (stage) stage.textContent = W[i][1]; } });
  };

  /* ---------- busca e filtro ---------- */
  const initList = () => {
    const root = $(".gl");
    if (!root) return;
    const cards = $$(".gl-term", root), q = $(".gl-q", root), count = $(".gl-count", root), none = $(".gl-none", root), chips = $$(".gl-cats .chip", root);
    let cat = "";
    const apply = (animate = true) => {
      const words = norm(q.value).split(/\s+/).filter(Boolean);
      let n = 0;
      cards.forEach((c) => {
        const ok = (!cat || c.dataset.cat === cat) && words.every((w) => c.dataset.q.includes(w) || norm(c.id).includes(w));
        const was = !c.hidden;
        c.hidden = !ok;
        if (ok) { c.classList.remove("is-in"); if (animate && !reduced.matches) { c.style.setProperty("--i", n); void c.offsetWidth; c.classList.add("is-in"); } n++; }
        else if (was) c.classList.remove("is-in");
      });
      count.textContent = n === 1 ? "1 termo" : `${n} termos`;
      none.hidden = n > 0;
    };
    const setCat = (k) => {
      cat = k;
      chips.forEach((c) => { const on = c.dataset.cat === k; c.classList.toggle("is-on", on); c.setAttribute("aria-pressed", on ? "true" : "false"); });
      apply();
    };
    chips.forEach((c) => c.addEventListener("click", () => setCat(c.dataset.cat)));
    $$(".lx-toc a[data-cat]").forEach((a) => a.addEventListener("click", () => { q.value = ""; setCat(a.dataset.cat); }));
    let t = 0;
    q.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => apply(), 120); });
    q.addEventListener("keydown", (e) => { if (e.key === "Escape") { q.value = ""; apply(); } });

    // link direto (#termo): mostra o card mesmo com filtro e destaca por um instante
    const target = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      const c = id && cards.find((x) => x.id === id);
      if (!c) return;
      if (c.hidden) { q.value = ""; setCat(""); requestAnimationFrame(() => c.scrollIntoView({ block: "center", behavior: reduced.matches ? "auto" : "smooth" })); }
      cards.forEach((x) => x.classList.remove("is-target"));
      c.classList.add("is-target");
      clearTimeout(target.t); target.t = setTimeout(() => c.classList.remove("is-target"), 2600);
    };
    window.addEventListener("hashchange", target);
    target();
    apply(false);
  };

  /* ---------- teste rápido ---------- */
  const initQuiz = () => {
    const root = $(".quiz");
    if (!root) return;
    const pool = $$(".gl-term").map((c) => ({ id: c.id, t: $("h3", c).firstChild.textContent.trim(), sub: ($("h3 small", c)?.textContent || "").trim(), d: $(".gl-def", c).textContent.trim(), cat: c.dataset.cat }));
    const step = $(".quiz-step", root), dots = $(".quiz-dots", root), score = $(".quiz-score", root), def = $(".quiz-def", root), opts = $(".quiz-opts", root), fb = $(".quiz-fb", root), next = $(".quiz-next", root);
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mask = (p) => {
      let d = p.d;
      [p.t, p.sub].filter((x) => x && x.length > 1).forEach((x) => { d = d.replace(new RegExp(`\\b${esc(x)}s?\\b`, "gi"), "____"); });
      return d;
    };
    let qs = [], i = 0, ok = 0;
    const N = 5;
    const dotsRender = () => { dots.textContent = ""; qs.forEach((q, k) => { const d = document.createElement("i"); if (q.res === true) d.className = "is-ok"; else if (q.res === false) d.className = "is-no"; else if (k === i) d.className = "is-now"; dots.append(d); }); };
    const link = (p, txt) => { const a = document.createElement("a"); a.href = `#${p.id}`; a.textContent = txt; return a; };
    const show = () => {
      const q = qs[i];
      step.textContent = `Pergunta ${i + 1} de ${N}`;
      score.textContent = ok === 1 ? "1 acerto" : `${ok} acertos`;
      def.classList.remove("is-new"); void def.offsetWidth; def.classList.add("is-new");
      def.textContent = mask(q.p);
      opts.textContent = ""; fb.textContent = ""; next.hidden = true;
      q.opts.forEach((o, k) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "quiz-opt";
        const tag = document.createElement("i"); tag.textContent = String.fromCharCode(65 + k);
        b.append(document.createTextNode(o.t), tag);
        b.addEventListener("click", () => pick(o, b));
        opts.append(b);
      });
      dotsRender();
    };
    const pick = (o, b) => {
      const q = qs[i], right = o.id === q.p.id;
      q.res = right; if (right) ok++;
      $$(".quiz-opt", opts).forEach((x, k) => { x.disabled = true; if (q.opts[k].id === q.p.id) x.classList.add("is-ok"); });
      if (!right) b.classList.add("is-no");
      fb.textContent = "";
      const strong = document.createElement("b"); strong.textContent = q.p.t;
      fb.append(document.createTextNode(right ? "Isso. " : "Quase. A resposta é "), strong, document.createTextNode(right ? ". " : ". "), link(q.p, "Ver no glossário"));
      score.textContent = ok === 1 ? "1 acerto" : `${ok} acertos`;
      next.hidden = false;
      next.firstChild.textContent = i === N - 1 ? "Ver resultado " : "Próxima ";
      dotsRender();
      next.focus({ preventScroll: true });
    };
    const end = () => {
      step.textContent = "Resultado";
      def.textContent = "";
      const box = document.createElement("span"); box.className = "quiz-end";
      const big = document.createElement("b"); big.textContent = `${ok}/${N}`;
      const msg = document.createElement("span");
      msg.textContent = ok === N ? "Perfeito. Você já fala a língua da IA." : ok >= 3 ? "Muito bom. Os que faltaram estão logo acima." : "Normal no começo. Leia os cards e tente de novo.";
      box.append(big, msg); def.append(box);
      opts.textContent = ""; fb.textContent = "";
      next.hidden = false; next.firstChild.textContent = "Jogar de novo ";
      i = N; dotsRender();
    };
    const start = () => {
      ok = 0; i = 0;
      qs = shuffle(pool.slice()).slice(0, N).map((p) => {
        const same = shuffle(pool.filter((x) => x.id !== p.id && x.cat === p.cat)), other = shuffle(pool.filter((x) => x.id !== p.id && x.cat !== p.cat));
        const wrong = same.slice(0, 1).concat(other.slice(0, 2)).slice(0, 2);
        return { p, opts: shuffle([p, ...wrong]), res: null };
      });
      show();
    };
    next.addEventListener("click", () => { if (i >= N) { start(); return; } i++; if (i >= N) end(); else show(); });
    start();
  };

  const boot = () => { initHero(); initList(); initQuiz(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
