/* Guia 01 · Como uma IA responde
   hero em partículas, tokenizador, mapa de significado, atenção, próxima palavra e laço de geração.
   Tudo é simulação didática no navegador: nada é enviado para nenhum servidor. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, textPoints, rectPoints, onVisible, reduced, clamp } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs = {}) => { const el = document.createElementNS(NS, tag); for (const k in attrs) el.setAttribute(k, attrs[k]); return el; };
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rnd = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  /* ---------- hero ---------- */
  const initHero = () => {
    const canvas = $(".lx-field canvas"), stage = $(".lx-stage");
    const LABELS = ["01 · Você pergunta", "02 · Vira tokens", "03 · Vira significado", "04 · Calcula a próxima", "05 · Responde"];
    const gauss = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283 * v); };
    const { heroBox, boxText, outlinePoints } = L;
    const shapes = [
      // 01 · a pergunta
      (w, h) => { const b = heroBox(w, h); return boxText("?", w, h, b, { size: b.h * 1.05 }); },
      // 02 · tokens: chips em duas linhas, cada um com uma "palavra" dentro
      (w, h) => {
        const b = heroBox(w, h), rows = [[1, 1.7, 0.8, 1.3], [2, 0.9, 1.25]];
        const ch = Math.min(b.h * 0.2, 86), gap = Math.max(10, ch * 0.26), y0 = b.y + b.h / 2 - ch - gap / 2;
        const chips = [], fills = [];
        rows.forEach((row, ri) => {
          const tot = row.reduce((s, k) => s + k, 0), span = b.w - gap * (row.length - 1);
          let x = b.x + (ri ? b.w * 0.06 : 0);
          row.forEach((k) => {
            const cw = (span - (ri ? b.w * 0.06 : 0)) * k / tot, y = y0 + ri * (ch + gap);
            chips.push([x, y, cw, ch]);
            fills.push([x + ch * 0.32, y + ch * 0.42, Math.max(6, cw * 0.45), ch * 0.16]);
            x += cw + gap;
          });
        });
        return outlinePoints(chips, w < 700 ? 4 : 3.4, ch * 0.24).concat(rectPoints(fills, w < 700 ? 4 : 3));
      },
      // 03 · significado: nuvens de pontos com sentidos parecidos
      (w, h) => {
        const b = heroBox(w, h), r = rnd(7), pts = [];
        [[0.16, 0.26, 1], [0.58, 0.18, 0.8], [0.88, 0.42, 0.9], [0.36, 0.7, 1.1], [0.78, 0.84, 0.7], [0.08, 0.78, 0.6]].forEach(([cx, cy, s]) => {
          for (let i = 0; i < 300 * s; i++) pts.push([b.x + cx * b.w + gauss(r) * b.w * 0.05 * s, b.y + cy * b.h + gauss(r) * b.h * 0.07 * s]);
        });
        return pts;
      },
      // 04 · probabilidade da próxima palavra
      (w, h) => {
        const b = heroBox(w, h), P = [1, 0.36, 0.22, 0.13, 0.07, 0.04], bh = Math.min(b.h * 0.1, 40), gap = bh * 0.62;
        const y0 = b.y + b.h / 2 - (P.length * bh + (P.length - 1) * gap) / 2;
        return rectPoints(P.map((p, i) => [b.x, y0 + i * (bh + gap), Math.max(8, b.w * p), bh]), w < 700 ? 4.5 : 3.6);
      },
      // 05 · a resposta
      (w, h) => { const b = heroBox(w, h); return boxText("resposta", w, h, b, { size: b.h * 0.42 }); }
    ];
    MPField(canvas, { shapes, hold: 3800, onShape: (i) => { if (stage) stage.textContent = LABELS[i]; } });
  };

  /* ---------- 01 · tokens ---------- */
  const SUFFIX = ["mente", "ções", "ção", "ando", "endo", "indo", "ados", "adas", "ado", "ada", "idade", "dade", "agem", "ista", "ismo", "inho", "inha", "oso", "osa", "ável", "ível", "ria", "ar", "er", "ir"];
  const splitWord = (w) => {
    if (w.length <= 5 || /^\d+$/.test(w) && w.length <= 4) return [w];
    if (/^\d+$/.test(w)) return w.match(/.{1,3}/g);
    const low = norm(w);
    for (const s of SUFFIX) {
      const ns = norm(s);
      if (low.endsWith(ns) && w.length - s.length >= 3) {
        const stem = w.slice(0, w.length - s.length);
        return [...(stem.length > 6 ? stem.match(/.{1,4}/g) : [stem]), w.slice(w.length - s.length)];
      }
    }
    return w.match(w.length <= 8 ? new RegExp(`.{1,${Math.ceil(w.length / 2)}}`, "g") : /.{1,4}/g);
  };
  const tokenize = (s) => {
    const out = [];
    const re = /(\s*)([\p{L}\p{N}]+|[^\s\p{L}\p{N}])/gu;
    let m;
    while ((m = re.exec(s))) {
      const sp = m[1].length > 0, w = m[2];
      if (/^[\p{L}\p{N}]+$/u.test(w)) splitWord(w).forEach((p, i) => out.push({ t: p, sp: sp && i === 0 }));
      else out.push({ t: w, sp });
    }
    return out;
  };
  const initTokens = () => {
    const input = $("#tok-in"), box = $(".tok-out");
    if (!input || !box) return;
    const stat = (k, v) => { const el = $(`[data-stat="${k}"]`); if (el) el.textContent = String(v); };
    let t = 0;
    const render = () => {
      const s = input.value;
      const toks = tokenize(s);
      box.textContent = "";
      toks.forEach((k, i) => {
        const el = document.createElement("span");
        el.className = "tk" + (k.sp ? " sp" : "");
        el.style.setProperty("--i", String(Math.min(i, 40)));
        el.style.setProperty("--b", i % 2 ? "#121212" : "#0a0a0a");
        const b = document.createElement("b"); b.textContent = k.t;
        const sm = document.createElement("small"); sm.textContent = "#" + String(hash((k.sp ? " " : "") + k.t) % 50000).padStart(5, "0");
        el.append(b, sm);
        box.append(el);
      });
      stat("tokens", toks.length);
      stat("words", (s.match(/[\p{L}\p{N}]+/gu) || []).length);
      stat("chars", s.length);
    };
    input.addEventListener("input", () => { clearTimeout(t); t = setTimeout(render, 140); });
    render();
  };

  /* ---------- 02 · mapa de significado ---------- */
  const GROUPS = [
    { id: "animais", name: "Animais", c: [190, 165], words: [["gato", 150, 130], ["cachorro", 235, 112], ["cavalo", 110, 190], ["leão", 255, 190], ["pássaro", 175, 240], ["peixe", 300, 255]],
      more: ["cao", "cachorra", "vaca", "boi", "tigre", "rato", "cobra", "macaco", "galinha", "coelho", "gata", "urso", "lobo", "pato", "onca"] },
    { id: "comida", name: "Comida", c: [520, 120], words: [["pizza", 465, 95], ["arroz", 560, 75], ["feijão", 615, 130], ["café", 450, 165], ["pão", 525, 180], ["bolo", 590, 200]],
      more: ["macarrao", "carne", "leite", "suco", "chocolate", "salada", "fruta", "banana", "maca", "sorvete", "hamburguer", "acai", "queijo", "ovo", "sopa"] },
    { id: "lugares", name: "Lugares", c: [835, 185], words: [["Brasil", 790, 130], ["São Paulo", 875, 105], ["praia", 900, 175], ["cidade", 770, 205], ["montanha", 860, 250], ["rio", 945, 240]],
      more: ["rio de janeiro", "mar", "campo", "pais", "estado", "floresta", "ilha", "cachoeira", "bairro", "rua", "sjc", "brasilia", "europa", "lago"] },
    { id: "tec", name: "Tecnologia", c: [820, 470], words: [["computador", 760, 430], ["celular", 870, 420], ["internet", 920, 480], ["código", 770, 500], ["IA", 850, 520], ["robô", 925, 545]],
      more: ["notebook", "app", "aplicativo", "site", "software", "chatgpt", "dados", "servidor", "programa", "tablet", "algoritmo", "nuvem", "teclado", "wifi"] },
    { id: "sent", name: "Sentimentos", c: [500, 430], words: [["feliz", 450, 395], ["amor", 530, 380], ["calma", 580, 440], ["triste", 430, 465], ["medo", 505, 500], ["raiva", 575, 515]],
      more: ["alegria", "tristeza", "saudade", "odio", "ansiedade", "paz", "alegre", "susto", "carinho", "felicidade", "orgulho", "vergonha", "esperanca"] },
    { id: "familia", name: "Pessoas", c: [190, 470], words: [["rei", 255, 410], ["rainha", 255, 520], ["homem", 110, 420], ["mulher", 110, 530], ["príncipe", 330, 445], ["princesa", 330, 555]],
      more: ["pai", "mae", "filho", "filha", "avo", "irmao", "irma", "tio", "tia", "menino", "menina", "crianca", "pessoa", "rainha"] }
  ];
  const initMap = () => {
    const root = $(".map"), s = $(".map-svg"), input = $("#map-in"), msg = $(".map-msg"), analogy = $("[data-analogy]");
    if (!root || !s) return;
    // no celular o mapa fica em pé: grupos em 2 colunas, palavras em grade dentro de cada grupo
    const tall = window.matchMedia("(max-width: 640px)");
    const PC = { animais: [150, 190], comida: [450, 190], lugares: [150, 520], sent: [450, 520], familia: [150, 850], tec: [450, 850] };
    const PORDER = { familia: ["homem", "rei", "mulher", "rainha", "príncipe", "princesa"] };
    const pts = [];
    const defs = svg("defs"), mk = svg("marker", { id: "m-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" });
    mk.append(svg("path", { d: "M0 0L10 5L0 10z", fill: "#fff" })); defs.append(mk);
    const grid = svg("g", { class: "m-grid" }), groupsG = svg("g"), links = svg("g", { class: "m-links" }), vec = svg("g", { class: "m-vec" }), layer = svg("g"), extra = svg("g");
    s.append(defs, grid, groupsG, links, vec, layer, extra);
    GROUPS.forEach((g) => g.words.forEach(([w, x, y]) => {
      const el = svg("g", { class: "m-pt", tabindex: "0", role: "button", "aria-label": w });
      const c = svg("circle", { r: 5 }), tx = svg("text", { x: 10, y: 5 }); tx.textContent = w;
      el.append(c, tx); layer.append(el);
      const p = { w, x, y, g, el, px: x, py: y, gx: g.c[0], gy: g.c[1], c };
      pts.push(p);
      const on = () => focus(p); el.addEventListener("pointerenter", on); el.addEventListener("focus", on); el.addEventListener("click", on);
      el.addEventListener("pointerleave", () => clearFocus());
    }));
    let isTall = false;
    const center = (g) => (isTall ? PC[g.id] : g.c);
    const layout = () => {
      isTall = tall.matches;
      const W = isTall ? 600 : 1000, H = isTall ? 1030 : 620;
      s.setAttribute("viewBox", `0 0 ${W} ${H}`);
      root.classList.toggle("is-tall", isTall);
      grid.textContent = ""; groupsG.textContent = "";
      for (let x = 0; x <= W; x += 100) grid.append(svg("line", { x1: x, y1: 0, x2: x, y2: H }));
      for (let y = 20; y <= H; y += 100) grid.append(svg("line", { x1: 0, y1: y, x2: W, y2: y }));
      GROUPS.forEach((g) => {
        const [cx, cy] = center(g), gg = svg("g", { class: "m-group" });
        const t = svg("text", { x: cx + (isTall ? 15 : 0), y: isTall ? cy - 112 : (cy - 112 > 14 ? cy - 100 : 22), "text-anchor": "middle" }); t.textContent = g.name;
        gg.append(svg("ellipse", isTall ? { cx: cx + 15, cy: cy, rx: 146, ry: 128 } : { cx, cy: cy + 4, rx: 150, ry: 92 }), t);
        groupsG.append(gg);
        const own = pts.filter((p) => p.g === g);
        const order = PORDER[g.id] ? PORDER[g.id].map((w) => own.find((p) => p.w === w)) : own.slice().sort((p, q) => p.y - q.y || p.x - q.x);
        order.forEach((p, i) => {
          p.gx = cx; p.gy = cy;
          if (isTall) { p.px = cx - 122 + (i % 2) * 128; p.py = cy - 72 + Math.floor(i / 2) * 72; }
          else { p.px = p.x; p.py = p.y; }
          p.c.setAttribute("r", isTall ? 6 : 5);
        });
      });
      clearFocus(); vec.textContent = ""; extra.textContent = "";
    };
    const place = (p, k) => p.el.setAttribute("transform", `translate(${(p.gx + (p.px - p.gx) * k).toFixed(1)} ${(p.gy + (p.py - p.gy) * k).toFixed(1)})`);
    const near = (x, y, skip, n = 3) => pts.filter((q) => q !== skip).map((q) => ({ q, d: Math.hypot(q.x - x, q.y - y) })).sort((a, b) => a.d - b.d).slice(0, n).map((o) => o.q);
    const clearFocus = () => { root.classList.remove("is-focus"); pts.forEach((q) => q.el.classList.remove("is-on", "is-near")); links.textContent = ""; };
    const drawLinks = (x, y, list) => { links.textContent = ""; list.forEach((q) => links.append(svg("line", { x1: x, y1: y, x2: q.px, y2: q.py }))); };
    const b = (t) => { const el = document.createElement("b"); el.textContent = t; return el; };
    const focus = (p) => {
      vec.textContent = ""; extra.textContent = "";
      clearFocus(); root.classList.add("is-focus");
      p.el.classList.add("is-on");
      const nb = near(p.x, p.y, p);
      nb.forEach((q) => q.el.classList.add("is-near"));
      drawLinks(p.px, p.py, nb);
      msg.innerHTML = "";
      msg.append(document.createTextNode("Mais perto de "), b(p.w), document.createTextNode(": " + nb.map((q) => q.w).join(", ") + "."));
    };
    layout();
    pts.forEach((p) => place(p, reduced.matches ? 1 : 0));
    tall.addEventListener?.("change", () => { layout(); pts.forEach((p) => place(p, 1)); });
    let tq = 0;
    input?.addEventListener("input", () => {
      clearTimeout(tq);
      tq = setTimeout(() => {
        const q = norm(input.value);
        extra.textContent = ""; vec.textContent = "";
        if (!q) { clearFocus(); msg.textContent = "Passe o mouse ou toque num ponto para ver os vizinhos mais próximos."; return; }
        const hit = pts.find((p) => norm(p.w) === q);
        if (hit) { focus(hit); return; }
        const g = GROUPS.find((G) => G.more.includes(q));
        clearFocus();
        if (!g) { msg.innerHTML = ""; msg.append(b(input.value.trim()), document.createTextNode(" não está neste mapa pequeno. Num modelo de verdade, toda palavra tem um lugar.")); return; }
        const r = rnd(hash(q)), a = r() * 6.283, d = 40 + r() * 40;
        const x = clamp(g.c[0] + Math.cos(a) * d, 30, 960), y = clamp(g.c[1] + Math.sin(a) * d * 0.6, 30, 600);
        const [cx, cy] = center(g);
        const dx = isTall ? cx - 100 + r() * 150 : x, dy = isTall ? cy + 104 : y;
        const el = svg("g", { class: "m-new", transform: `translate(${dx.toFixed(1)} ${dy.toFixed(1)})` });
        const tx = svg("text", { x: 12, y: isTall ? 6 : -10 }); tx.textContent = input.value.trim();
        el.append(svg("circle", { r: 8 }), tx); extra.append(el);
        root.classList.add("is-focus");
        const nb = near(x, y, null); nb.forEach((p) => p.el.classList.add("is-near")); drawLinks(dx, dy, nb);
        msg.innerHTML = ""; msg.append(b(input.value.trim()), document.createTextNode(` cai no grupo ${g.name.toLowerCase()}, perto de ${nb.map((p) => p.w).join(", ")}.`));
      }, 160);
    });
    analogy?.addEventListener("click", () => {
      clearFocus(); extra.textContent = ""; vec.textContent = "";
      const P = (w) => pts.find((p) => p.w === w);
      const rei = P("rei"), homem = P("homem"), mulher = P("mulher"), rainha = P("rainha");
      root.classList.add("is-focus");
      [rei, homem, mulher].forEach((p) => p.el.classList.add("is-near"));
      const dx = mulher.px - homem.px, dy = mulher.py - homem.py;
      const a1 = svg("path", { d: `M${homem.px} ${homem.py + 8} L${mulher.px} ${mulher.py - 10}`, "marker-end": "url(#m-arrow)", "stroke-dasharray": "5 5" });
      const a2 = svg("path", { d: `M${rei.px} ${rei.py + 8} L${rei.px + dx} ${rei.py + dy - 10}`, "marker-end": "url(#m-arrow)" });
      const res = svg("g", { class: "m-res" }); res.append(svg("circle", { cx: rei.px + dx, cy: rei.py + dy, r: 14 }));
      vec.append(a1, a2, res);
      [a1, a2].forEach((p, i) => { const len = p.getTotalLength(); p.style.strokeDasharray = i ? `${len}` : "5 5"; if (i) { p.style.strokeDashoffset = String(len); p.getBoundingClientRect(); p.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1) .5s"; p.style.strokeDashoffset = "0"; } });
      setTimeout(() => rainha.el.classList.add("is-on"), 1300);
      msg.innerHTML = "";
      msg.append(document.createTextNode("O caminho de "), b("homem"), document.createTextNode(" até "), b("mulher"), document.createTextNode(", aplicado a "), b("rei"), document.createTextNode(", cai perto de "), b("rainha"), document.createTextNode(". Sentido vira direção no mapa."));
    });
    if (!reduced.matches) {
      let done = false;
      onVisible(root, (v) => {
        if (!v || done) return;
        done = true;
        const t0 = performance.now();
        const tick = (now) => { const k = clamp((now - t0) / 1600, 0, 1), e = 1 - Math.pow(1 - k, 4); pts.forEach((p) => place(p, e)); if (k < 1) requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      }, "-15% 0px");
    }
  };

  /* ---------- 03 · atenção ---------- */
  const WORDS = ["O", "gato", "subiu", "no", "telhado", "porque", "ele", "estava", "com", "medo."];
  const ATT = {
    ele: { gato: 0.62, telhado: 0.12, "medo.": 0.08, subiu: 0.07, estava: 0.06, O: 0.05 },
    gato: { subiu: 0.4, O: 0.25, ele: 0.2, telhado: 0.15 },
    subiu: { gato: 0.48, telhado: 0.36, no: 0.16 },
    telhado: { subiu: 0.42, no: 0.36, gato: 0.22 },
    porque: { subiu: 0.34, "medo.": 0.36, ele: 0.3 },
    estava: { ele: 0.5, "medo.": 0.35, com: 0.15 },
    "medo.": { estava: 0.32, ele: 0.3, gato: 0.22, com: 0.16 }
  };
  const MSG = {
    ele: ["Para entender ", "ele", ", a IA olha principalmente para ", "gato", ". É assim que ela sabe quem estava com medo."],
    gato: ["", "gato", " se liga ao que ele fez: ", "subiu", "."],
    subiu: ["", "subiu", " pergunta quem subiu e onde: ", "gato", " e telhado."],
    telhado: ["", "telhado", " olha para a ação que leva até ele: ", "subiu", "."],
    porque: ["", "porque", " liga a ação ao motivo: ", "medo", "."],
    estava: ["", "estava", " precisa de um sujeito, e encontra ", "ele", "."],
    "medo.": ["", "medo", " procura quem sente: ", "ele", ", que é o gato."]
  };
  const initAttention = () => {
    const root = $(".att"), sent = $(".att-sent"), s = $(".att-svg"), msg = $(".att-msg");
    if (!root || !sent || !s) return;
    const btns = WORDS.map((w) => { const bt = document.createElement("button"); bt.type = "button"; bt.className = "att-w"; bt.textContent = w; sent.append(bt, document.createTextNode(" ")); return bt; });
    let cur = "ele";
    const weights = (src) => {
      if (ATT[src]) return ATT[src];
      const i = WORDS.indexOf(src), o = {};
      WORDS.forEach((w, j) => { if (j !== i) o[w] = Math.exp(-Math.abs(j - i) * 0.9); });
      const tot = Object.values(o).reduce((a, b) => a + b, 0);
      for (const k in o) o[k] /= tot;
      return o;
    };
    const draw = (animate) => {
      const R = root.querySelector(".att-stage").getBoundingClientRect();
      s.setAttribute("viewBox", `0 0 ${R.width.toFixed(0)} ${R.height.toFixed(0)}`);
      s.textContent = "";
      const W = weights(cur), i = WORDS.indexOf(cur);
      btns.forEach((bt, j) => { bt.classList.toggle("is-src", j === i); const w = W[WORDS[j]] || 0; if (j === i) bt.style.removeProperty("--w"); else bt.style.setProperty("--w", w.toFixed(2)); });
      const a = btns[i].getBoundingClientRect();
      const ax = a.left - R.left + a.width / 2, ay = a.top - R.top + 4;
      Object.entries(W).sort((x, y) => x[1] - y[1]).forEach(([w, v]) => {
        if (v < 0.04) return;
        const b = btns[WORDS.indexOf(w)].getBoundingClientRect();
        const bx = b.left - R.left + b.width / 2, by = b.top - R.top + 4;
        const lift = Math.min(R.height * 0.7, 40 + Math.abs(bx - ax) * 0.35 + Math.abs(by - ay) * 0.2);
        const p = svg("path", { class: "att-arc", d: `M${ax.toFixed(1)} ${ay.toFixed(1)} C${ax.toFixed(1)} ${(Math.min(ay, by) - lift).toFixed(1)} ${bx.toFixed(1)} ${(Math.min(ay, by) - lift).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}`, "stroke-width": (1 + v * 7).toFixed(2), opacity: (0.18 + v * 0.82).toFixed(2) });
        s.append(p);
        if (animate && !reduced.matches) {
          const len = p.getTotalLength();
          p.style.strokeDasharray = `${len}`; p.style.strokeDashoffset = `${len}`;
          p.getBoundingClientRect();
          p.style.transition = `stroke-dashoffset 1s cubic-bezier(.16,1,.3,1) ${(1 - v) * 0.25}s`;
          p.style.strokeDashoffset = "0";
        }
      });
      msg.innerHTML = "";
      const parts = MSG[cur] || ["", cur, " presta mais atenção nas palavras ao lado, ", Object.entries(W).sort((x, y) => y[1] - x[1])[0][0], "."];
      parts.forEach((t, k) => { if (!t) return; const el = k % 2 ? document.createElement("b") : document.createTextNode(t); if (k % 2) el.textContent = t; msg.append(el); });
    };
    btns.forEach((bt) => bt.addEventListener("click", () => { cur = bt.textContent; draw(true); }));
    let rt = 0;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => draw(false), 120); }, { passive: true });
    document.fonts?.ready.then(() => draw(false));
    let shown = false;
    onVisible(root, (v) => { if (v && !shown) { shown = true; draw(true); } }, "-20% 0px");
    draw(false);
  };

  /* ---------- 04 · próxima palavra ---------- */
  const CANDS = [["Brasília", 5.2], ["uma", 2.4], ["Rio", 1.9], ["conhecida", 1.6], ["linda", 0.9], ["São Paulo", 0.6]];
  const initNext = () => {
    const bars = $(".nx-bars"), range = $("#nx-t"), tv = $(".nx-tv"), go = $(".nx-go"), pick = $(".nx-pick");
    if (!bars || !range) return;
    const rows = CANDS.map(([w]) => {
      const li = document.createElement("li"); li.className = "nx-bar";
      li.innerHTML = `<span class="w"></span><span class="t"><i></i></span><span class="v"></span>`;
      li.querySelector(".w").textContent = w;
      bars.append(li); return li;
    });
    let probs = [];
    const fmt = (p) => (p * 100 < 0.1 ? "<0,1" : (p * 100).toFixed(p < 0.1 ? 1 : 0).replace(".", ",")) + "%";
    const update = () => {
      const T = parseFloat(range.value);
      tv.textContent = T.toFixed(1).replace(".", ",");
      const ex = CANDS.map(([, l]) => Math.exp(l / T)), tot = ex.reduce((a, b) => a + b, 0);
      probs = ex.map((e) => e / tot);
      rows.forEach((li, i) => { li.querySelector(".t i").style.setProperty("--p", probs[i].toFixed(4)); li.querySelector(".v").textContent = fmt(probs[i]); });
    };
    range.addEventListener("input", update);
    go?.addEventListener("click", () => {
      let r = Math.random(), k = 0;
      while (k < probs.length - 1 && r > probs[k]) { r -= probs[k]; k++; }
      rows.forEach((li, i) => li.classList.toggle("is-pick", i === k));
      pick.textContent = CANDS[k][0] + (k === 0 ? "." : "…");
      pick.classList.remove("is-new"); void pick.offsetWidth; pick.classList.add("is-new");
    });
    update();
  };

  /* ---------- 05 · laço ---------- */
  const ANSWER = ["Bras", "ília", " é", " a", " capital", " do", " Brasil", " desde", " 19", "60", "."];
  const initLoop = () => {
    const root = $(".loop"), out = $(".loop-a"), count = $(".loop-count"), again = $(".loop-again"), flow = $(".loop-flow");
    if (!root || !out) return;
    const steps = $$(".lflow-step", flow), wire = $(".lflow-wire", flow);
    let timer = 0, visible = false, running = false;
    const setStep = (k) => { steps.forEach((s, i) => { s.classList.toggle("is-on", i <= k); }); wire.style.setProperty("--p", String(k / (steps.length - 1))); const s = steps[k]; s.classList.remove("is-hit"); void s.offsetWidth; s.classList.add("is-hit"); };
    const finish = () => { out.textContent = ""; ANSWER.forEach((t) => { const sp = document.createElement("span"); sp.className = "tkn"; sp.textContent = t; out.append(sp); }); count.textContent = `${ANSWER.length} tokens`; steps.forEach((s) => s.classList.add("is-on")); wire.style.setProperty("--p", "1"); };
    const run = () => {
      if (reduced.matches) { finish(); return; }
      clearTimeout(timer); running = true;
      out.textContent = ""; count.textContent = "0 tokens";
      let i = 0, sub = 0;
      const tick = () => {
        if (!visible) { running = false; return; }
        setStep(sub);
        if (sub === 2) {
          const sp = document.createElement("span"); sp.className = "tkn"; sp.textContent = ANSWER[i]; out.append(sp);
          i++; count.textContent = `${i} token${i > 1 ? "s" : ""}`;
        }
        sub = (sub + 1) % 4;
        if (i >= ANSWER.length && sub === 3) { setStep(3); running = false; return; }
        timer = setTimeout(tick, sub === 0 ? 260 : 150);
      };
      tick();
    };
    again?.addEventListener("click", () => { visible = true; run(); });
    let started = false;
    onVisible(root, (v) => { visible = v; if (v && (!started || !running)) { if (!started) { started = true; run(); } } }, "-10% 0px");
  };

  const boot = () => { initHero(); initTokens(); initMap(); initAttention(); initNext(); initLoop(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
