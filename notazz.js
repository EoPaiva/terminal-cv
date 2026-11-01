/* Página Head of AI na Notazz: rede neural no hero, fluxogramas desenhados na rolagem,
   anatomia de um agente com log simulado, simulação de automação e detalhes de movimento.
   Tudo respeita prefers-reduced-motion e pausa quando sai da tela. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const NS = "http://www.w3.org/2000/svg";
  const svg = (tag, attrs = {}) => {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  };
  const onVisible = (el, cb, rootMargin = "120px") => {
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin }).observe(el);
  };
  const flash = (el, cls = "is-hit") => { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const gs = () => window.gsap && window.ScrollTrigger ? window.gsap : null;

  /* ---------- 1. hero: rede neural em 3D, com sinais que atravessam as camadas ---------- */
  const initNet = () => {
    const canvas = $(".hx-net"), hero = $(".hx-hero");
    if (!canvas || !hero || !canvas.getContext) return;
    const ctx = canvas.getContext("2d");
    const SIZES = [5, 9, 13, 13, 9, 4];
    const WORDS = ["LLM", "RAG", "API", "agente", "dados", "automação"];
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, last = 0, clock = 0, nextWave = 600;
    let nodes = [], edges = [], outs = [], pulses = [], lastLayer = SIZES.length - 1;
    let yaw = -0.62, pitch = 0.16, tYaw = -0.62, tPitch = 0.16, mx = -1e4, my = -1e4, scrollP = 0;

    const build = () => {
      nodes = []; edges = [];
      const layers = [];
      SIZES.forEach((n, li) => {
        const x = (li / (SIZES.length - 1) - 0.5) * 2.7;
        const rad = 0.3 + 0.7 * Math.sin(Math.PI * (li + 0.5) / SIZES.length);
        const ids = [];
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + li * 0.37;
          ids.push(nodes.push({ x, a, rad, li, act: 0, word: null, sx: 0, sy: 0, sz: 0, f: 1 }) - 1);
        }
        layers.push(ids);
      });
      const ang = (p, q) => { const d = Math.abs(p - q) % (Math.PI * 2); return Math.min(d, Math.PI * 2 - d); };
      outs = nodes.map(() => []);
      for (let li = 0; li < layers.length - 1; li++) {
        layers[li].forEach((i) => {
          layers[li + 1].map((j) => [j, ang(nodes[i].a, nodes[j].a)]).sort((p, q) => p[1] - q[1]).slice(0, 3)
            .forEach(([j]) => { outs[i].push(edges.length); edges.push({ a: i, b: j, act: 0 }); });
        });
      }
      const inner = nodes.map((_, i) => i).filter((i) => nodes[i].li >= 2 && nodes[i].li <= 4);
      WORDS.forEach((word, k) => { nodes[inner[Math.floor((k + 0.5) * inner.length / WORDS.length)]].word = word.toUpperCase(); });
    };

    const fire = (i, gen) => {
      if (nodes[i].li >= lastLayer || pulses.length > 90) return;
      const list = outs[i].slice().sort(() => Math.random() - 0.5).slice(0, gen === 0 ? 3 : Math.random() < 0.55 ? 1 : 2);
      list.forEach((e) => pulses.push({ e, t: 0, dur: 480 + Math.random() * 320, gen }));
    };
    const wave = (count = 2) => {
      const inputs = nodes.map((n, i) => (n.li === 0 ? i : -1)).filter((i) => i >= 0);
      for (let k = 0; k < count; k++) { const i = inputs[Math.floor(Math.random() * inputs.length)]; nodes[i].act = 1; fire(i, 0); }
    };

    const project = (spin) => {
      const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
      const small = w < 700;
      const S = (small ? Math.min(w * 0.38, h * 0.26) : Math.min(w * 0.25, h * 0.4)) * (1 + scrollP * 0.4);
      const cx = small ? w * 0.52 : w * 0.67, cy = small ? h * 0.27 : h * 0.47;
      for (const n of nodes) {
        const a = n.a + spin;
        const y = Math.cos(a) * n.rad, z = Math.sin(a) * n.rad;
        const x1 = n.x * cY + z * sY, z1 = -n.x * sY + z * cY;
        const y2 = y * cP - z1 * sP, z2 = y * sP + z1 * cP;
        const f = 3.4 / (3.4 + z2);
        n.sx = cx + x1 * S * f; n.sy = cy + y2 * S * f; n.sz = z2; n.f = f;
      }
    };
    const depth = (z) => clamp((1.6 - z) / 3.2, 0, 1);

    const draw = (dt) => {
      clock += dt;
      const k = Math.min(1, dt / 16.7);
      yaw += (tYaw - yaw) * 0.04 * k; pitch += (tPitch - pitch) * 0.04 * k;
      scrollP = clamp(window.scrollY / Math.max(1, hero.offsetHeight), 0, 1);
      project(clock * 0.00011 * (1 + scrollP * 2.5));
      ctx.clearRect(0, 0, w, h);
      const fade = 1 - scrollP * 0.8;
      const decay = Math.pow(0.955, k);

      // arestas em faixas de brilho: um stroke por faixa
      const buckets = [[], [], [], [], []];
      for (const e of edges) {
        const A = nodes[e.a], B = nodes[e.b];
        const v = clamp(depth((A.sz + B.sz) / 2) * 0.62 + e.act, 0, 0.999);
        buckets[Math.floor(v * 5)].push(e);
        e.act *= decay;
      }
      ctx.lineWidth = 1;
      buckets.forEach((list, b) => {
        if (!list.length) return;
        ctx.strokeStyle = `rgba(255,255,255,${((0.028 + b * 0.042) * fade).toFixed(3)})`;
        ctx.beginPath();
        for (const e of list) { const A = nodes[e.a], B = nodes[e.b]; ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); }
        ctx.stroke();
      });

      // sinais
      ctx.lineCap = "round";
      ctx.lineWidth = 1.4;
      ctx.strokeStyle = `rgba(255,255,255,${(0.75 * fade).toFixed(3)})`;
      ctx.fillStyle = `rgba(255,255,255,${fade.toFixed(3)})`;
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        p.t += dt / p.dur;
        const e = edges[p.e], A = nodes[e.a], B = nodes[e.b];
        if (p.t >= 1) { pulses.splice(i, 1); B.act = 1; fire(e.b, p.gen + 1); continue; }
        e.act = Math.max(e.act, 0.45);
        const t0 = Math.max(0, p.t - 0.24);
        const x0 = A.sx + (B.sx - A.sx) * t0, y0 = A.sy + (B.sy - A.sy) * t0;
        const x1 = A.sx + (B.sx - A.sx) * p.t, y1 = A.sy + (B.sy - A.sy) * p.t;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.fillRect(x1 - 1.3, y1 - 1.3, 2.6, 2.6);
      }

      // nós, com brilho do sinal e do cursor
      ctx.font = `500 ${w < 700 ? 9 : 10}px Label, "Helvetica Neue", Arial, sans-serif`;
      for (const n of nodes) {
        const d = depth(n.sz);
        let hover = 0;
        if (mx > -1e3) { const dist = Math.hypot(n.sx - mx, n.sy - my); if (dist < 130) hover = (1 - dist / 130) * 0.85; }
        const glow = Math.max(n.act, hover);
        const r = (0.9 + d * 1.7 + glow * 1.5) * n.f;
        if (glow > 0.12) {
          const g = ctx.createRadialGradient(n.sx, n.sy, 0, n.sx, n.sy, r * 8);
          g.addColorStop(0, `rgba(255,255,255,${(0.32 * glow * fade).toFixed(3)})`);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.sx, n.sy, r * 8, 0, 6.2832); ctx.fill();
        }
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (0.16 + d * 0.52 + glow * 0.6) * fade).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(n.sx, n.sy, r, 0, 6.2832); ctx.fill();
        if (n.word) {
          ctx.fillStyle = `rgba(255,255,255,${((0.08 + d * 0.34 + glow * 0.45) * fade).toFixed(3)})`;
          ctx.fillText(n.word, n.sx + 9, n.sy - 9);
        }
        n.act *= decay;
      }

      if (clock > nextWave && !reduced.matches) { wave(); nextWave = clock + 1300 + Math.random() * 900; }
    };

    const resize = () => {
      const r = hero.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduced.matches || !raf) draw(0);
    };
    const loop = (now) => {
      const dt = last ? Math.min(50, now - last) : 16.7;
      last = now;
      draw(dt);
      raf = requestAnimationFrame(loop);
    };
    const start = () => { if (!raf && visible && !reduced.matches && !document.hidden) { last = 0; raf = requestAnimationFrame(loop); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    build(); resize();
    requestAnimationFrame(() => canvas.classList.add("is-on"));
    if (!reduced.matches) { setTimeout(() => wave(5), 500); }
    window.addEventListener("resize", resize, { passive: true });
    onVisible(hero, (v) => { visible = v; v ? start() : stop(); }, "0px");
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    reduced.addEventListener?.("change", () => { stop(); pulses = []; resize(); start(); });
    if (finePointer.matches) {
      window.addEventListener("pointermove", (e) => {
        tYaw = -0.62 + (e.clientX / innerWidth - 0.5) * 0.55;
        tPitch = 0.16 + (e.clientY / innerHeight - 0.5) * 0.32;
        const r = canvas.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
      }, { passive: true });
      hero.addEventListener("pointerleave", () => { mx = my = -1e4; });
    }
    // toque ou clique no hero dispara um sinal a partir do nó mais próximo
    hero.addEventListener("pointerdown", (e) => {
      if (reduced.matches || e.target.closest("a, button")) return;
      const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      let best = -1, bd = Infinity;
      nodes.forEach((n, i) => { if (n.li >= lastLayer) return; const d = Math.hypot(n.sx - px, n.sy - py); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { nodes[best].act = 1; fire(best, 0); }
    });
    start();
  };

  /* ---------- 2. fluxogramas: fios ortogonais medidos no DOM ---------- */
  const clean = (pts) => {
    const out = [];
    pts.forEach((p) => { const q = out[out.length - 1]; if (!q || Math.abs(q[0] - p[0]) > 0.5 || Math.abs(q[1] - p[1]) > 0.5) out.push(p); });
    for (let i = out.length - 2; i > 0; i--) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      const vert = Math.abs(a[0] - b[0]) < 0.5 && Math.abs(b[0] - c[0]) < 0.5;
      const horz = Math.abs(a[1] - b[1]) < 0.5 && Math.abs(b[1] - c[1]) < 0.5;
      if (vert || horz) out.splice(i, 1);
    }
    return out;
  };
  const roundPath = (pts, radius) => {
    const f = (n) => n.toFixed(1);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], [x2, y2] = pts[i + 1];
      const l1 = Math.hypot(x1 - x0, y1 - y0), l2 = Math.hypot(x2 - x1, y2 - y1);
      const r = Math.min(radius, l1 / 2, l2 / 2);
      d += ` L${f(x1 + (x0 - x1) / l1 * r)} ${f(y1 + (y0 - y1) / l1 * r)} Q${f(x1)} ${f(y1)} ${f(x1 + (x2 - x1) / l2 * r)} ${f(y1 + (y2 - y1) / l2 * r)}`;
    }
    const [xl, yl] = pts[pts.length - 1];
    return d + ` L${f(xl)} ${f(yl)}`;
  };
  const GAP = 7;
  const route = (A, B, hint, all) => {
    const hOver = Math.min(A.r, B.r) - Math.max(A.l, B.l) > 8;
    const vOver = Math.min(A.b, B.b) - Math.max(A.t, B.t) > 8;
    if (vOver && !hOver) {
      const right = B.l >= A.r - 1;
      const x1 = right ? A.r + GAP : A.l - GAP, x2 = right ? B.l - GAP : B.r + GAP;
      const y1 = A.cy, y2 = B.cy;
      if (Math.abs(y1 - y2) < 2) return [[x1, y1], [x2, y1]];
      const mx = (x1 + x2) / 2;
      return [[x1, y1], [mx, y1], [mx, y2], [x2, y2]];
    }
    if (hOver) {
      const down = B.t >= A.b - 1;
      const lo = Math.max(A.l, B.l), hi = Math.min(A.r, B.r);
      const blocked = all.some((N) => N !== A && N !== B && Math.min(N.r, hi) - Math.max(N.l, lo) > 8 &&
        (down ? N.t >= A.b - 1 && N.b <= B.t + 1 : N.t >= B.b - 1 && N.b <= A.t + 1));
      if (blocked) {
        const gx = Math.min(A.l, B.l) - 18;
        return [[A.l - GAP, A.cy], [gx, A.cy], [gx, B.cy], [B.l - GAP, B.cy]];
      }
      const y1 = down ? A.b + GAP : A.t - GAP, y2 = down ? B.t - GAP : B.b + GAP;
      if (Math.abs(A.cx - B.cx) < 2) return [[A.cx, y1], [A.cx, y2]];
      const my = (y1 + y2) / 2;
      return [[A.cx, y1], [A.cx, my], [B.cx, my], [B.cx, y2]];
    }
    const right = B.cx > A.cx, down = B.cy > A.cy;
    if (hint === "v") return [[A.cx, down ? A.b + GAP : A.t - GAP], [A.cx, B.cy], [right ? B.l - GAP : B.r + GAP, B.cy]];
    if (hint === "h") return [[right ? A.r + GAP : A.l - GAP, A.cy], [B.cx, A.cy], [B.cx, down ? B.t - GAP : B.b + GAP]];
    const x1 = right ? A.r + GAP : A.l - GAP, x2 = right ? B.l - GAP : B.r + GAP, mx = (x1 + x2) / 2;
    return [[x1, A.cy], [mx, A.cy], [mx, B.cy], [x2, B.cy]];
  };

  const makeFlow = (root) => {
    const wires = $(".flow-wires", root);
    const nodes = new Map($$("[data-id]", root).map((el) => [el.dataset.id, el]));
    const specs = (root.dataset.edges || "").split(",").filter(Boolean).map((s) => {
      const [ab, hint = "", label = ""] = s.trim().split(":");
      const [a, b] = ab.split(">");
      return { a, b, hint, label };
    });
    const state = specs.map(() => 0);
    const flow = { root, nodes, specs, edges: [], sparks: [], layer: null, listeners: [] };
    flow.setEdge = (i, p) => {
      state[i] = p;
      const e = flow.edges[i];
      if (!e) return;
      e.live.style.strokeDashoffset = (e.len * (1 - p)).toFixed(2);
      e.g.classList.toggle("is-done", p >= 0.999);
    };
    flow.spark = (i, t, on = true) => {
      const g = flow.sparks[i], e = flow.edges[i];
      if (!g || !e) return;
      if (!on) { g.style.opacity = "0"; return; }
      const pt = e.live.getPointAtLength(e.len * clamp(t, 0, 1));
      g.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      g.style.opacity = "1";
    };
    flow.makeSpark = () => {
      const g = svg("g", { class: "w-spark" });
      g.append(svg("circle", { r: 10, fill: `url(#glow-${root.dataset.flow})` }), svg("circle", { r: 2.4, class: "w-dot" }));
      return g;
    };
    flow.layout = () => {
      const R = root.getBoundingClientRect();
      if (!R.width) return;
      const rects = new Map();
      nodes.forEach((el, id) => {
        const r = el.getBoundingClientRect();
        const o = { l: r.left - R.left, t: r.top - R.top, r: r.right - R.left, b: r.bottom - R.top };
        o.cx = (o.l + o.r) / 2; o.cy = (o.t + o.b) / 2;
        rects.set(id, o);
      });
      const all = [...rects.values()];
      wires.setAttribute("viewBox", `0 0 ${R.width.toFixed(1)} ${R.height.toFixed(1)}`);
      wires.textContent = "";
      const defs = svg("defs"), rg = svg("radialGradient", { id: `glow-${root.dataset.flow}` });
      rg.append(svg("stop", { offset: "0", "stop-color": "#fff", "stop-opacity": ".6" }), svg("stop", { offset: "1", "stop-color": "#fff", "stop-opacity": "0" }));
      defs.append(rg); wires.append(defs);
      flow.edges = specs.map((sp) => {
        const pts = clean(route(rects.get(sp.a), rects.get(sp.b), sp.hint, all));
        const d = roundPath(pts, 16);
        const g = svg("g", { class: "wire" });
        const live = svg("path", { d, class: "w-live" });
        const [x1, y1] = pts[pts.length - 2], [x2, y2] = pts[pts.length - 1];
        const deg = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
        g.append(svg("path", { d, class: "w-base" }), live,
          svg("path", { d: "M-7 -4.5 L0 0 L-7 4.5", class: "w-head", transform: `translate(${x2.toFixed(1)} ${y2.toFixed(1)}) rotate(${deg.toFixed(1)})` }));
        if (sp.label) {
          const t = svg("text", { class: "w-label" });
          t.textContent = sp.label.toUpperCase();
          if (pts.length >= 4) {
            // caminho em Z: o rótulo fica no meio do trecho horizontal, longe do outro ramo
            const [ax, ay] = pts[1], [bx] = pts[2];
            t.setAttribute("x", ((ax + bx) / 2).toFixed(1));
            t.setAttribute("y", (ay - 10).toFixed(1));
            t.setAttribute("text-anchor", "middle");
          } else {
            const [px, py] = pts[0], [qx, qy] = pts[1];
            const vertical = Math.abs(qx - px) < 1;
            t.setAttribute("x", (px + (vertical ? 10 : 2)).toFixed(1));
            t.setAttribute("y", (py + (vertical ? (qy < py ? -12 : 20) : -10)).toFixed(1));
          }
          g.append(t);
        }
        wires.append(g);
        const len = live.getTotalLength();
        live.style.strokeDasharray = `${len.toFixed(2)} ${len.toFixed(2)}`;
        return { ...sp, g, live, len };
      });
      flow.sparks = specs.map(() => { const s = flow.makeSpark(); wires.append(s); return s; });
      flow.layer = svg("g", { class: "w-packets" });
      wires.append(flow.layer);
      state.forEach((p, i) => flow.setEdge(i, p));
      flow.listeners.forEach((fn) => fn());
    };
    root.classList.add("is-js");
    flow.layout();
    if ("ResizeObserver" in window) {
      let pending = 0, lastW = 0, lastH = 0;
      new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (Math.abs(width - lastW) < 1 && Math.abs(height - lastH) < 1) return;
        lastW = width; lastH = height;
        cancelAnimationFrame(pending); pending = requestAnimationFrame(flow.layout);
      }).observe(root);
    }
    document.fonts?.ready.then(() => flow.layout());
    return flow;
  };

  /* ciclo: desenhado com a rolagem (fixado no computador) e depois um sinal percorre o ciclo */
  const initCycle = () => {
    const root = $('[data-flow="cycle"]'), section = $(".hx-cycle");
    if (!root || !section) return;
    const flow = makeFlow(root);
    const E = flow.specs.length, first = flow.specs[0].a;
    const node = (id) => flow.nodes.get(id);
    let closed = false, raf = 0, visible = false, t0 = 0, lastSeg = -1;

    const set = (p) => {
      const s = p * (E + 0.3);
      node(first).classList.toggle("is-on", s > 0.02);
      flow.specs.forEach((sp, i) => {
        const ep = clamp((s - i - 0.2) / 0.8, 0, 1);
        flow.setEdge(i, ep);
        if (sp.b !== first) node(sp.b).classList.toggle("is-on", ep >= 1);
        if (!closed) flow.spark(i, ep, ep > 0.001 && ep < 0.999);
      });
      const now = s >= E + 0.02;
      if (now !== closed) {
        closed = now;
        root.classList.toggle("is-closed", closed);
        flow.specs.forEach((_, i) => flow.spark(i, 0, false));
        if (closed) { flash(node(first)); run(); } else stop();
      }
    };
    // depois de fechado, um sinal dá a volta no ciclo e cada etapa acende ao ser tocada
    const frame = (now) => {
      if (!t0) t0 = now;
      const u = (((now - t0) / 1100) % E + E) % E;
      const seg = Math.floor(u);
      flow.specs.forEach((_, i) => flow.spark(i, u - seg, i === seg));
      if (seg !== lastSeg) { if (lastSeg >= 0) flash(node(flow.specs[lastSeg].b)); lastSeg = seg; }
      raf = requestAnimationFrame(frame);
    };
    const run = () => { if (!raf && closed && visible && !reduced.matches) { t0 = 0; lastSeg = -1; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; flow.specs.forEach((_, i) => flow.spark(i, 0, false)); };
    onVisible(root, (v) => { visible = v; v ? run() : stop(); }, "0px");

    const gsap = gs();
    if (!gsap || reduced.matches) { set(1); return; }
    const { ScrollTrigger } = window;
    const desktop = window.matchMedia("(min-width: 901px)");
    let st = null, pinned = null;
    const fits = () => {
      if (!desktop.matches) return false;
      const head = $(".p-head", section);
      const nav = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-h")) || 72;
      const need = head.offsetHeight + parseFloat(getComputedStyle(head).marginBottom) + root.offsetHeight + nav + 16 + 32;
      return need <= window.innerHeight;
    };
    const setup = () => {
      const pin = fits();
      if (pin === pinned && st) return;
      pinned = pin;
      st?.kill(true);
      section.classList.toggle("is-pin", pin);
      st = pin
        ? ScrollTrigger.create({ trigger: section, start: "top top", end: () => "+=" + Math.round(window.innerHeight * 1.5), pin: true, scrub: 0.6, refreshPriority: 10, invalidateOnRefresh: true, onUpdate: (self) => set(self.progress) })
        : ScrollTrigger.create({ trigger: root, start: "top 80%", end: "bottom 50%", scrub: 0.6, onUpdate: (self) => set(self.progress) });
      set(st.progress);
    };
    setup();
    let rt = 0;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { const before = pinned; setup(); if (before !== pinned) ScrollTrigger.refresh(); }, 220); }, { passive: true });
  };

  /* automação: o fluxo se desenha ao entrar na tela e depois casos passam por ele sem parar */
  const initAuto = () => {
    const root = $('[data-flow="auto"]');
    if (!root) return;
    const flow = makeFlow(root);
    const on = (id, v = true) => flow.nodes.get(id)?.classList.toggle("is-on", v);
    const idx = (a, b) => flow.specs.findIndex((s) => s.a === a && s.b === b);
    const ROUTES = { a: [idx("t", "u"), idx("u", "d"), idx("d", "a"), idx("a", "r")], h: [idx("t", "u"), idx("u", "d"), idx("d", "h"), idx("h", "r")] };
    const WAIT = { u: 520, d: 380, a: 260, h: 640 };
    const counts = { a: 0, h: 0 }, countEls = { a: $('[data-count="a"]'), h: $('[data-count="h"]') };
    const PATTERN = ["a", "a", "h", "a", "a", "a", "h", "a", "a", "h"];
    const sim = $(".auto-sim");
    const gsap = gs();
    if (!gsap || reduced.matches) {
      flow.specs.forEach((_, i) => flow.setEdge(i, 1));
      flow.nodes.forEach((el) => el.classList.add("is-on"));
      if (sim) sim.hidden = true;
      return;
    }
    const STAGES = [[0], [1], [2, 3], [4, 5]];
    const intro = (s) => {
      on("t", s > 0.01);
      STAGES.forEach((list, k) => list.forEach((ei) => {
        const p = clamp(s - k, 0, 1);
        flow.setEdge(ei, p);
        if (p >= 1) on(flow.specs[ei].b);
        flow.spark(ei, p, p > 0.001 && p < 0.999);
      }));
    };
    let ready = false, raf = 0, visible = false, last = 0, spawnAt = 0, seq = 0;
    const packets = [];
    const frame = (now) => {
      const dt = last ? Math.min(60, now - last) : 16;
      last = now;
      if (now >= spawnAt && packets.length < 5) {
        const kind = PATTERN[seq++ % PATTERN.length];
        packets.push({ kind, route: ROUTES[kind], seg: 0, t: 0, wait: 0, el: flow.makeSpark() });
        flash(flow.nodes.get("t"));
        spawnAt = now + 1250;
      }
      for (let i = packets.length - 1; i >= 0; i--) {
        const p = packets[i];
        if (p.el.parentNode !== flow.layer) flow.layer.append(p.el);
        p.el.style.opacity = "1";
        if (p.wait > 0) { p.wait -= dt; continue; }
        const ei = p.route[p.seg], e = flow.edges[ei];
        p.t += (dt * 0.34) / e.len;
        if (p.t >= 1) {
          const target = flow.specs[ei].b;
          flash(flow.nodes.get(target));
          p.seg++; p.t = 0; p.wait = WAIT[target] || 0;
          if (target === "d") { const g = flow.edges[p.route[p.seg]].g; flash(g, "is-flash"); setTimeout(() => g.classList.remove("is-flash"), 900); }
          if (p.seg >= p.route.length) {
            p.el.remove(); packets.splice(i, 1);
            counts[p.kind]++;
            if (countEls[p.kind]) countEls[p.kind].textContent = String(counts[p.kind]);
            continue;
          }
        }
        const cur = flow.edges[p.route[p.seg]];
        const pt = cur.live.getPointAtLength(cur.len * clamp(p.t, 0, 1));
        p.el.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      }
      raf = requestAnimationFrame(frame);
    };
    const run = () => { if (!raf && ready && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    onVisible(root, (v) => { visible = v; v ? run() : stop(); }, "0px");
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
    const proxy = { s: 0 };
    window.ScrollTrigger.create({
      trigger: root, start: "top 72%", once: true,
      onEnter: () => gsap.to(proxy, {
        s: STAGES.length, duration: 2.8, ease: "power1.inOut", onUpdate: () => intro(proxy.s),
        onComplete: () => { flow.specs.forEach((_, i) => flow.spark(i, 0, false)); ready = true; spawnAt = 0; run(); }
      })
    });
  };

  /* ---------- 3. responsabilidades: contador fixo que acompanha a leitura ---------- */
  const initResp = () => {
    const box = $(".resp");
    const gsap = gs();
    if (!box || !gsap || reduced.matches) return;
    const rows = $$(".resp-row", box), num = $(".resp-now span", box), name = $(".resp-name", box), ticks = $$(".resp-ticks i", box);
    box.classList.add("is-js");
    let cur = -1, tl = null;
    const activate = (i, instant = false) => {
      if (i === cur) return;
      const dir = i > cur ? 1 : -1;
      cur = i;
      rows.forEach((r, k) => r.classList.toggle("is-active", k === i));
      ticks.forEach((t, k) => t.classList.toggle("is-on", k <= i));
      const label = $("h3", rows[i])?.textContent || "";
      const text = String(i + 1).padStart(2, "0");
      tl?.kill();
      if (instant || !num) { if (num) num.textContent = text; if (name) name.textContent = label; return; }
      tl = gsap.timeline()
        .to([num, name], { yPercent: -100 * dir, opacity: 0, duration: 0.2, ease: "power2.in" })
        .add(() => { num.textContent = text; if (name) name.textContent = label; })
        .fromTo([num, name], { yPercent: 100 * dir, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.55, ease: "expo.out", stagger: 0.04 });
    };
    activate(0, true);
    rows.forEach((r, i) => window.ScrollTrigger.create({ trigger: r, start: "top 60%", end: "bottom 60%", onToggle: (self) => self.isActive && activate(i) }));
  };

  /* ---------- 4. agente: peças em órbita, painel e log simulado ---------- */
  const HUB = [
    { d: "O modelo certo para cada tarefa: raciocínio, extração, classificação ou geração, com custo e latência sob controle.",
      log: [["› tarefa recebida: classificar solicitação"], ["  escolhendo o modelo pela tarefa", "dim"], ["  raciocínio · extração · geração", "dim"], ["✓ modelo definido", "ok"]] },
    { d: "Respostas ancoradas no conhecimento da empresa: a informação certa é recuperada na hora e entra no contexto do modelo.",
      log: [["› buscando na base de conhecimento"], ["  trechos relevantes encontrados", "dim"], ["› montando o contexto da resposta"], ["✓ resposta com fonte", "ok"]] },
    { d: "O agente não só responde, ele age: consulta sistemas internos e serviços externos por APIs, com parâmetros validados.",
      log: [["› intenção: consultar sistema interno"], ["  chamada de API com parâmetros validados", "dim"], ["› resultado devolvido ao agente"], ["✓ ação executada", "ok"]] },
    { d: "Regras, limites e validações que mantêm cada resposta e cada ação dentro do escopo permitido.",
      log: [["› verificando regras e limites"], ["  dados sensíveis protegidos", "dim"], ["  ação dentro do escopo permitido", "dim"], ["✓ saída aprovada", "ok"]] },
    { d: "Nos pontos que importam, a decisão passa por uma pessoa antes de seguir. A IA acelera, e a responsabilidade continua clara.",
      log: [["› decisão crítica detectada"], ["  enviada para aprovação humana", "dim"], ["› aprovação recebida"], ["✓ fluxo retomado", "ok"]] },
    { d: "Cada execução fica registrada: custo, latência e qualidade acompanhados para evoluir a solução com dados.",
      log: [["› registrando a execução"], ["  custo · latência · qualidade", "dim"], ["› comparando com o histórico"], ["✓ melhoria contínua alimentada", "ok"]] }
  ];
  const initHub = () => {
    const hub = $("[data-hub]");
    if (!hub) return;
    const stage = $(".hub-stage", hub), wires = $(".hub-wires", hub), core = $(".hub-core", hub), btns = $$(".hub-node", hub);
    const kEl = $(".hub-k", hub), title = $(".hub-title", hub), desc = $(".hub-desc", hub), out = $(".hub-log-out", hub);
    const n = btns.length, pad = (v) => String(v).padStart(2, "0");
    const gsap = window.gsap;
    let cur = -1, auto = true, visible = false, raf = 0, t0 = 0, token = 0, nextAt = 0, resumeT = 0;
    let spokes = [], sigs = [], back = null, pos = [], radius = 41;

    const place = () => {
      radius = stage.clientWidth < 480 ? 34 : 41;
      wires.textContent = "";
      wires.append(svg("circle", { cx: 50, cy: 50, r: radius, class: "orbit" }), svg("circle", { cx: 50, cy: 50, r: radius + 6, class: "orbit orbit-2" }));
      spokes = btns.map((b, i) => {
        const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
        const x = 50 + Math.cos(a) * radius, y = 50 + Math.sin(a) * radius;
        pos[i] = [x, y, a];
        b.style.setProperty("--x", `${x.toFixed(2)}%`);
        b.style.setProperty("--y", `${y.toFixed(2)}%`);
        const line = svg("line", { x1: 50, y1: 50, x2: x.toFixed(2), y2: y.toFixed(2), class: "spoke" });
        wires.append(line);
        return line;
      });
      sigs = btns.map(() => { const c = svg("circle", { r: 0.75, class: "sig", opacity: 0 }); wires.append(c); return c; });
      back = svg("circle", { r: 0.95, class: "sig", opacity: 0 });
      wires.append(back);
      spokes.forEach((s, i) => s.classList.toggle("is-on", i === cur));
    };
    const at = (i, t) => { const [, , a] = pos[i]; const r = 15 + (radius - 19) * t; return [50 + Math.cos(a) * r, 50 + Math.sin(a) * r]; };
    const frame = (now) => {
      if (!t0) t0 = now;
      const time = now - t0;
      sigs.forEach((c, i) => {
        const active = i === cur;
        const t = ((time / (active ? 950 : 2900)) + i * 0.23) % 1;
        const [x, y] = at(i, t);
        c.setAttribute("cx", x.toFixed(2)); c.setAttribute("cy", y.toFixed(2));
        c.setAttribute("opacity", ((active ? 1 : 0.35) * Math.sin(Math.PI * t)).toFixed(3));
      });
      if (cur >= 0 && back) {
        const t = 1 - ((time / 950 + 0.5) % 1);
        const [x, y] = at(cur, t);
        back.setAttribute("cx", x.toFixed(2)); back.setAttribute("cy", y.toFixed(2));
        back.setAttribute("opacity", Math.sin(Math.PI * t).toFixed(3));
      }
      if (auto && nextAt && now >= nextAt) { nextAt = 0; select((cur + 1) % n); }
      raf = requestAnimationFrame(frame);
    };
    const run = () => { if (!raf && visible && !reduced.matches && !document.hidden) { t0 = 0; raf = requestAnimationFrame(frame); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    const typeLog = (lines) => {
      const my = ++token;
      out.textContent = "";
      if (reduced.matches) {
        lines.forEach(([text, cls]) => { const p = document.createElement("p"); if (cls) p.className = cls; p.textContent = text; out.append(p); });
        return Promise.resolve();
      }
      return lines.reduce((q, [text, cls]) => q.then(() => new Promise((done) => {
        if (my !== token) return done();
        const p = document.createElement("p");
        if (cls) p.className = cls;
        out.append(p);
        let c = 0;
        const step = () => {
          if (my !== token) return done();
          c = Math.min(text.length, c + 2);
          p.textContent = text.slice(0, c);
          c < text.length ? requestAnimationFrame(step) : setTimeout(done, 140);
        };
        step();
      })), Promise.resolve());
    };
    const select = (i, user = false) => {
      if (user) {
        auto = false; nextAt = 0;
        clearTimeout(resumeT);
        resumeT = setTimeout(() => { auto = true; nextAt = performance.now() + 3200; }, 14000);
      }
      if (i === cur) return;
      cur = i;
      btns.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
      spokes.forEach((s, j) => s.classList.toggle("is-on", j === i));
      kEl.textContent = `${pad(i + 1)} / ${pad(n)}`;
      title.textContent = btns[i].textContent;
      desc.textContent = HUB[i].d;
      if (gsap && !reduced.matches) gsap.fromTo([title, desc], { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.06, overwrite: true });
      flash(core, "is-ping");
      const my = token + 1;
      typeLog(HUB[i].log).then(() => { if (my === token && auto) nextAt = performance.now() + 2600; });
    };

    place();
    select(0);
    btns.forEach((b, i) => {
      b.addEventListener("click", () => select(i, true));
      b.addEventListener("focus", () => select(i, true));
      if (finePointer.matches) b.addEventListener("pointerenter", () => select(i, true));
    });
    if ("ResizeObserver" in window) new ResizeObserver(() => place()).observe(stage);
    onVisible(hub, (v) => { visible = v; v ? run() : stop(); }, "0px");
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
  };

  /* ---------- 5. princípio: as palavras acendem com a rolagem e as chaves ganham traço ---------- */
  const initQuote = () => {
    const q = $("[data-scrub-words]");
    const gsap = gs(), SplitText = window.SplitText;
    if (!q || !gsap || !SplitText || reduced.matches) { q?.querySelectorAll(".k").forEach((k) => (k.style.backgroundSize = "100% 1px")); return; }
    gsap.registerPlugin(SplitText);
    const split = new SplitText(q, { type: "words", wordsClass: "qw" });
    const words = split.words;
    const STEP = 0.1;
    const tl = gsap.timeline({ scrollTrigger: { trigger: q, start: "top 80%", end: "bottom 42%", scrub: 0.5 } });
    tl.fromTo(words, { color: "#262626" }, { color: "#ffffff", ease: "none", duration: 0.3, stagger: STEP }, 0);
    $$(".k", q).forEach((k) => {
      const mine = words.filter((w) => k.contains(w));
      if (!mine.length) return;
      tl.fromTo(k, { backgroundSize: "0% 1px" }, { backgroundSize: "100% 1px", ease: "none", duration: mine.length * STEP + 0.2 }, words.indexOf(mine[0]) * STEP);
    });
  };

  /* ---------- 6. jornada: a linha avança até a Notazz ---------- */
  const initJourney = () => {
    const box = $(".journey");
    const gsap = gs();
    if (!box || !gsap || reduced.matches) return;
    const items = $$("li", box), line = $(".journey-line i", box);
    let th = [];
    const measure = () => {
      const horizontal = window.matchMedia("(min-width: 901px)").matches;
      th = items.map((li) => (horizontal ? li.offsetLeft / box.clientWidth : li.offsetTop / box.clientHeight));
    };
    box.classList.add("is-js");
    measure();
    window.ScrollTrigger.create({
      trigger: box, start: "top 75%", end: "bottom 55%", scrub: 0.6, onRefresh: measure,
      onUpdate: (self) => {
        const p = self.progress;
        line.style.setProperty("--p", p.toFixed(4));
        items.forEach((li, k) => li.classList.toggle("is-lit", p > 0.001 && p >= th[k] - 0.002));
      }
    });
  };

  /* ---------- 7. especialidades em faixa contínua ---------- */
  const initMarquee = () => {
    $$(".hx-marquee .marquee-track[data-items]").forEach((track) => {
      const items = track.dataset.items.split("|").map((s) => s.trim()).filter(Boolean);
      const run = (hidden) => {
        const f = document.createDocumentFragment();
        items.forEach((t) => {
          const s = document.createElement("span"); s.textContent = t;
          if (hidden) s.setAttribute("aria-hidden", "true");
          const sep = document.createElement("span"); sep.className = "sep"; sep.setAttribute("aria-hidden", "true"); sep.textContent = "/";
          f.append(s, sep);
        });
        return f;
      };
      track.textContent = "";
      track.append(run(false), run(true));
    });
  };

  /* ---------- extras: entrada do hero e link ativo no menu ---------- */
  const initExtras = () => {
    const gsap = gs();
    if (gsap && !reduced.matches) {
      gsap.from(".hx-headline li", { x: 26, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.08, delay: 0.8 });
      gsap.from(".hx-cue", { opacity: 0, duration: 1.2, delay: 1.4 });
    }
    const links = $$(".nav-links a[href^='#']");
    if (!links.length || !("IntersectionObserver" in window)) return;
    const map = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      links.forEach((a) => a.classList.remove("is-active"));
      map.get(e.target.id)?.classList.add("is-active");
    }), { rootMargin: "-45% 0px -50% 0px" });
    map.forEach((_, id) => { const el = document.getElementById(id); if (el) io.observe(el); });
  };

  const boot = () => {
    const gsap = gs();
    if (gsap) gsap.registerPlugin(window.ScrollTrigger);
    initMarquee();
    initNet();
    initCycle();
    initResp();
    initHub();
    initAuto();
    initQuote();
    initJourney();
    initExtras();
    if (gsap) {
      window.ScrollTrigger.sort();
      window.ScrollTrigger.refresh();
      document.fonts?.ready.then(() => window.ScrollTrigger.refresh());
    }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
