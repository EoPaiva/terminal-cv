/* Guia 08 · Como a IA cria imagens
   hero em partículas (do ruído à paisagem), simulador de difusão em pixels, jogo dos cinco erros
   e montador de pedidos. É uma demonstração simplificada: nenhuma IA roda no navegador. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, outlinePoints, ringPoints, pathPoints, polyPoints, heroBox, onVisible, copy, reduced, clamp } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const SVGNS = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  // gerador de números com semente: a mesma semente sempre dá o mesmo ruído
  const rngOf = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  /* ---------- hero: ruído que vira paisagem ---------- */
  const initHero = () => {
    const canvas = $(".lx-field canvas"), stage = $(".lx-stage");
    const LABELS = ["01 · Só ruído", "02 · Passo 15", "03 · Passo 35", "04 · Passo 50"];
    const frame = (w, h) => { const b = heroBox(w, h), fw = Math.min(b.w, b.h * 1.6), fh = fw / 1.6; return { x: b.x + b.w / 2 - fw / 2, y: b.y + b.h / 2 - fh / 2, w: fw, h: fh }; };
    const scene = (w, h) => {
      const f = frame(w, h), s = w < 700 ? 3.6 : 3, X = (k) => f.x + f.w * k, Y = (k) => f.y + f.h * k;
      const sun = ringPoints(X(0.7), Y(0.3), 0, f.h * 0.12, s);
      const back = polyPoints([[X(0.04), Y(0.86)], [X(0.22), Y(0.42)], [X(0.36), Y(0.6)], [X(0.52), Y(0.3)], [X(0.66), Y(0.62)], [X(0.8), Y(0.48)], [X(0.96), Y(0.86)]], s * 1.6);
      const lake = [0.9, 0.95].flatMap((k, i) => pathPoints([[X(0.5 + i * 0.06), Y(k)], [X(0.86 - i * 0.04), Y(k)]], 3, s));
      return back.concat(sun, lake);
    };
    const mix = (n) => (w, h) => {
      const f = frame(w, h), rnd = rngOf(4821), border = outlinePoints([[f.x, f.y, f.w, f.h]], w < 700 ? 4 : 3.4, 10);
      if (n >= 1) { const pts = []; for (let i = 0; i < 1500; i++) pts.push([f.x + 6 + rnd() * (f.w - 12), f.y + 6 + rnd() * (f.h - 12)]); return border.concat(pts); }
      return border.concat(scene(w, h).map(([x, y]) => { const rx = f.x + 6 + rnd() * (f.w - 12), ry = f.y + 6 + rnd() * (f.h - 12); return [x + (rx - x) * n, y + (ry - y) * n]; }));
    };
    MPField(canvas, { shapes: [mix(1), mix(0.62), mix(0.24), mix(0)], hold: 3200, onShape: (i) => { if (stage) stage.textContent = LABELS[i]; } });
  };

  /* ---------- 01 · do ruído à imagem ---------- */
  const W = 192, H = 120;
  const sky = (c, top, bottom, y1) => { const g = c.createLinearGradient(0, 0, 0, y1); g.addColorStop(0, top); g.addColorStop(1, bottom); c.fillStyle = g; c.fillRect(0, 0, W, H); };
  const disk = (c, x, y, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); };
  const poly = (c, pts, col) => { c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill(); };
  const SCENES = [
    // farol à noite, com a lua no céu
    (c, r) => {
      sky(c, "#030303", "#2b2b2b", 80);
      for (let i = 0; i < 34; i++) { c.fillStyle = r() < 0.3 ? "#fff" : "#9a9a9a"; c.fillRect((r() * W) | 0, (r() * 62) | 0, 1, 1); }
      const mx = 18 + r() * 50, my = 14 + r() * 12;
      disk(c, mx, my, 9, "#efefef"); disk(c, mx + 4, my - 2, 8, "#080808");
      const g = c.createLinearGradient(0, 80, 0, H); g.addColorStop(0, "#1b1b1b"); g.addColorStop(1, "#050505"); c.fillStyle = g; c.fillRect(0, 80, W, H - 80);
      for (let i = 0; i < 40; i++) { const y = 84 + r() * 34; c.fillStyle = `rgba(255,255,255,${0.06 + r() * 0.12})`; c.fillRect((r() * W) | 0, y | 0, 4 + ((r() * 12) | 0), 1); }
      const lx = 118 + r() * 34;
      poly(c, [[lx - 34, 82], [lx - 20, 70], [lx + 18, 68], [lx + 36, 82]], "#141414");
      poly(c, [[lx - 8, 70], [lx - 5, 30], [lx + 5, 30], [lx + 8, 70]], "#d4d4d4");
      c.fillStyle = "#2a2a2a"; c.fillRect(lx - 7, 42, 14, 5); c.fillRect(lx - 7, 56, 15, 5);
      c.fillStyle = "#fff"; c.fillRect(lx - 5, 23, 10, 7);
      poly(c, [[lx - 7, 23], [lx, 15], [lx + 7, 23]], "#8a8a8a");
      const b = c.createLinearGradient(lx, 26, 0, 26); b.addColorStop(0, "rgba(255,255,255,.55)"); b.addColorStop(1, "rgba(255,255,255,0)");
      c.fillStyle = b; c.beginPath(); c.moveTo(lx - 4, 25); c.lineTo(0, 6); c.lineTo(0, 46); c.closePath(); c.fill();
      for (let i = 0; i < 9; i++) { c.fillStyle = `rgba(255,255,255,${0.25 - i * 0.02})`; c.fillRect(lx - 6 - r() * 6, 86 + i * 3.4, 10 + r() * 8, 1); }
    },
    // montanhas ao pôr do sol, com um lago
    (c, r) => {
      sky(c, "#161616", "#c9c9c9", 78);
      const sx = 64 + r() * 64; disk(c, sx, 40, 14, "#fbfbfb");
      const ridge = (base, amp, col, n) => { const pts = [[0, H]]; for (let i = 0; i <= n; i++) pts.push([(W / n) * i, base - (i % 2 ? amp * (0.5 + r() * 0.6) : amp * r() * 0.35)]); pts.push([W, H]); poly(c, pts, col); };
      ridge(62, 34, "#7a7a7a", 6); ridge(74, 26, "#464646", 8); ridge(84, 14, "#1d1d1d", 10);
      const g = c.createLinearGradient(0, 86, 0, H); g.addColorStop(0, "#9a9a9a"); g.addColorStop(1, "#2a2a2a"); c.fillStyle = g; c.fillRect(0, 86, W, H - 86);
      for (let i = 0; i < 12; i++) { c.fillStyle = `rgba(255,255,255,${0.75 - i * 0.05})`; const ww = 22 - i * 1.4 + r() * 4; c.fillRect(sx - ww / 2, 88 + i * 2.6, ww, 1); }
      for (let i = 0; i < 18; i++) { c.fillStyle = "rgba(0,0,0,.18)"; c.fillRect((r() * W) | 0, (90 + r() * 30) | 0, 6 + r() * 10, 1); }
    },
    // uma árvore sozinha no campo
    (c, r) => {
      sky(c, "#8f8f8f", "#ececec", 88);
      for (let i = 0; i < 3; i++) { const cx = 20 + r() * 150, cy = 14 + r() * 24; [[0, 0, 9], [8, 2, 7], [-8, 3, 6], [15, 4, 5]].forEach(([dx, dy, rr]) => disk(c, cx + dx, cy + dy, rr, "rgba(255,255,255,.75)")); }
      c.fillStyle = "#5a5a5a"; c.beginPath(); c.moveTo(0, 96); c.quadraticCurveTo(W * 0.45, 70 + r() * 8, W, 92); c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();
      const g = c.createLinearGradient(0, 80, 0, H); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.55)"); c.fillStyle = g; c.fillRect(0, 80, W, H - 80);
      for (let i = 0; i < 70; i++) { c.fillStyle = "rgba(20,20,20,.5)"; c.fillRect((r() * W) | 0, (86 + r() * 34) | 0, 1, 2 + ((r() * 2) | 0)); }
      const tx = 70 + r() * 50;
      c.fillStyle = "#151515"; c.fillRect(tx - 3, 50, 6, 32);
      poly(c, [[tx - 2, 62], [tx - 14, 50], [tx - 12, 48], [tx, 58]], "#151515");
      for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, d = r() * 18; disk(c, tx + Math.cos(a) * d * 1.3, 40 + Math.sin(a) * d * 0.8, 8 + r() * 6, i % 3 ? "#1d1d1d" : "#2c2c2c"); }
      c.strokeStyle = "#333"; c.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const bx = 120 + r() * 60, by = 14 + r() * 20; c.beginPath(); c.moveTo(bx - 3, by - 2); c.lineTo(bx, by); c.lineTo(bx + 3, by - 2); c.stroke(); }
    }
  ];
  const initNoise = () => {
    const root = $(".nz");
    if (!root) return;
    const view = $(".nz-canvas", root), vctx = view.getContext("2d");
    const range = $(".nz-range", root), play = $(".nz-play", root), stepT = $(".nz-step", root), seedT = $(".nz-seed-n", root);
    const prompts = $$(".nz-prompt", root), stages = $$(".nz-stages li", root);
    const off = document.createElement("canvas"); off.width = W; off.height = H;
    const octx = off.getContext("2d", { willReadFrequently: true });
    const tmp = document.createElement("canvas"), tctx = tmp.getContext("2d");
    const img = vctx.createImageData(W, H);
    let scene = 0, seed = 4821, levels = [], noise = null, step = 0, timer = 0;
    const gray = (ctx) => { const d = ctx.getImageData(0, 0, W, H).data, out = new Float32Array(W * H); for (let i = 0; i < out.length; i++) out[i] = d[i * 4] / 255; return out; };
    const build = () => {
      const r = rngOf(seed * 7 + scene * 131);
      octx.clearRect(0, 0, W, H); SCENES[scene](octx, r);
      // pirâmide: do borrão grosso ao nítido, imitando a imagem que aparece do grosso para o fino
      levels = [24, 12, 6, 3, 1.5, 1].map((f) => {
        const sw = Math.max(2, Math.round(W / f)), sh = Math.max(2, Math.round(H / f));
        tmp.width = sw; tmp.height = sh; tctx.imageSmoothingEnabled = true; tctx.drawImage(off, 0, 0, sw, sh);
        const up = document.createElement("canvas"); up.width = W; up.height = H; const u = up.getContext("2d", { willReadFrequently: true });
        u.imageSmoothingEnabled = true; u.drawImage(tmp, 0, 0, W, H);
        return gray(u);
      });
      const rn = rngOf(seed);
      noise = new Float32Array(W * H);
      for (let i = 0; i < noise.length; i++) noise[i] = clamp(0.5 + (rn() + rn() + rn() - 1.5) * 0.62, 0, 1);
      seedT.textContent = `Semente ${seed}`;
    };
    const render = () => {
      const t = step / 50, a = Math.pow(t, 0.9), lv = t * (levels.length - 1), i0 = Math.floor(lv), i1 = Math.min(levels.length - 1, i0 + 1), fr = lv - i0;
      const A = levels[i0], B = levels[i1], d = img.data;
      for (let i = 0; i < W * H; i++) {
        const v = (A[i] + (B[i] - A[i]) * fr) * a + noise[i] * (1 - a), c = (clamp(v, 0, 1) * 255) | 0;
        d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = c; d[i * 4 + 3] = 255;
      }
      vctx.putImageData(img, 0, 0);
      stepT.textContent = `Passo ${step} de 50`;
      range.value = String(step); range.style.setProperty("--p", `${t * 100}%`);
      let on = 0; stages.forEach((li, k) => { if (step >= +li.dataset.to) on = k; });
      stages.forEach((li, k) => li.classList.toggle("is-on", k <= on));
    };
    const label = (txt) => { play.textContent = txt + " "; const ar = el("i", "arrow"); ar.setAttribute("aria-hidden", "true"); play.append(ar); };
    const stop = () => { clearInterval(timer); timer = 0; label(step >= 50 ? "Gerar de novo" : "Continuar"); };
    const go = () => {
      if (timer) { stop(); return; }
      if (step >= 50) step = 0;
      if (reduced.matches) { step = 50; render(); stop(); return; }
      label("Pausar");
      timer = setInterval(() => { step = Math.min(50, step + 1); render(); if (step >= 50) stop(); }, 70);
    };
    play.addEventListener("click", go);
    range.addEventListener("input", () => { if (timer) stop(); step = +range.value; render(); label(step >= 50 ? "Gerar de novo" : "Continuar"); });
    prompts.forEach((p) => p.addEventListener("click", () => {
      prompts.forEach((x) => x.setAttribute("aria-pressed", String(x === p)));
      scene = +p.dataset.s; clearInterval(timer); timer = 0; build(); step = 0; render(); go();
    }));
    $(".nz-seed", root).addEventListener("click", () => { seed = 1000 + Math.floor(Math.random() * 9000); clearInterval(timer); timer = 0; build(); step = 0; render(); go(); });
    build(); render();
    let started = false;
    onVisible(root, (v) => { if (v && !started) { started = true; go(); } }, "-25% 0px");
  };

  /* ---------- 03 · ache os erros ---------- */
  const initGame = () => {
    const root = $(".fx");
    if (!root) return;
    const svg = $(".fx-svg", root), marks = $(".fx-marks", root), count = $(".fx-count", root), items = $$(".fx-list li", root), hits = $$(".fx-hit", root);
    const found = new Set();
    const pt = (e) => { const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); };
    const mark = (k) => {
      if (found.has(k)) return;
      found.add(k);
      const h = hits[k], bb = h.getBBox(), cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2, r = Math.max(bb.width, bb.height) / 2 + 6;
      const g = sv("g", { class: "fx-mark" });
      g.append(sv("circle", { cx, cy, r: Math.min(r, 70) }));
      const tx = cx + Math.min(r, 70) * 0.72, ty = cy - Math.min(r, 70) * 0.72;
      g.append(sv("circle", { class: "fx-tag", cx: tx, cy: ty, r: 13 }));
      const t = sv("text", { x: tx, y: ty }); t.textContent = String(k + 1); g.append(t);
      marks.append(g);
      items[k].classList.add("is-found");
      count.textContent = `${found.size} de ${hits.length}`;
      if (found.size === hits.length) count.textContent = "5 de 5 · olho treinado";
    };
    hits.forEach((h) => {
      h.setAttribute("tabindex", "0"); h.setAttribute("role", "button");
      h.setAttribute("aria-label", "Erro " + (+h.dataset.k + 1));
      h.addEventListener("click", (e) => { e.stopPropagation(); mark(+h.dataset.k); });
      h.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); mark(+h.dataset.k); } });
    });
    svg.addEventListener("click", (e) => {
      const p = pt(e), c = sv("circle", { class: "fx-miss", cx: p.x, cy: p.y, r: 18 });
      marks.append(c); setTimeout(() => c.remove(), 800);
    });
    $(".fx-all", root).addEventListener("click", () => hits.forEach((h, k) => setTimeout(() => mark(k), k * 160)));
  };

  /* ---------- 04 · peça melhor ---------- */
  const initAsk = () => {
    const root = $(".ib");
    if (!root) return;
    const subject = $(".ib-subject", root), avoid = $(".ib-avoid", root), out = $(".ib-text", root), groups = $$(".ib-group", root);
    const val = (g) => { const b = $(".chip[aria-pressed='true']", g); return b ? b.dataset.v : ""; };
    const build = () => {
      const get = Object.fromEntries(groups.map((g) => [g.dataset.g, val(g)]));
      const subj = subject.value.trim() || "um farol numa ilha de pedra";
      let txt = `${get.estilo} ${subj}, ${get.luz}, ${get.plano}, ${get.cor}. Formato ${get.formato}.`;
      const no = avoid.value.split(",").map((s) => s.trim()).filter(Boolean);
      const sem = no.map((x) => "sem " + x);
      if (sem.length) { const j = sem.length > 1 ? sem.slice(0, -1).join(", ") + " e " + sem[sem.length - 1] : sem[0]; txt += ` ${j.charAt(0).toUpperCase() + j.slice(1)}.`; }
      return txt.charAt(0).toUpperCase() + txt.slice(1);
    };
    const paint = (anim) => { out.textContent = build(); if (anim) { out.classList.remove("is-new"); void out.offsetWidth; out.classList.add("is-new"); } };
    groups.forEach((g) => $$(".chip", g).forEach((b) => b.addEventListener("click", () => { $$(".chip", g).forEach((x) => x.setAttribute("aria-pressed", String(x === b))); paint(true); })));
    [subject, avoid].forEach((i) => i.addEventListener("input", () => paint(false)));
    $(".ib-copy", root).addEventListener("click", () => copy(build(), "Pedido copiado"));
    paint(false);
  };

  const boot = () => { initHero(); initNoise(); initGame(); initAsk(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
