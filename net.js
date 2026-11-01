/* Rede neural em 3D desenhada em canvas, com sinais que atravessam as camadas.
   Usada no hero da página Head of AI e no card "Agora" da home.
   Pausa fora da tela e, com prefers-reduced-motion, fica parada num quadro só. */
(() => {
  "use strict";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const SIZES = [5, 9, 13, 13, 9, 4];
  const WORDS = ["LLM", "RAG", "API", "agente", "dados", "automação"];

  /* canvas: onde desenhar · host: área que mede o tamanho, recebe o cursor e controla a pausa
     o.layout(w, h, p) devolve { cx, cy, S } · o.progress() vai de 0 a 1 com a rolagem
     o.reveal() vai de 0 a 1 e monta a rede camada a camada · o.fade(p) apaga a rede */
  window.MPNet = (canvas, host, o = {}) => {
    if (!canvas || !host || !canvas.getContext) return null;
    const opt = Object.assign({
      layout: (w, h) => ({ cx: w / 2, cy: h / 2, S: Math.min(w, h) * 0.3 }),
      progress: () => 0,
      reveal: () => 1,
      fade: () => 1,
      spinBoost: 0,
      spinScroll: 0,
      yaw: -0.62,
      pitch: 0.16,
      hoverRadius: 130,
      pointerHost: null,
      mask: null
    }, o);
    const pointerHost = opt.pointerHost || host;
    const ctx = canvas.getContext("2d");
    const lastLayer = SIZES.length - 1;
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, last = 0, clock = 0, nextWave = 0, primed = 0;
    let nodes = [], edges = [], outs = [], pulses = [], maskFill = null;
    let yaw = opt.yaw, pitch = opt.pitch, tYaw = opt.yaw, tPitch = opt.pitch, mx = -1e4, my = -1e4;

    const build = () => {
      const layers = [];
      SIZES.forEach((n, li) => {
        const x = (li / lastLayer - 0.5) * 2.7;
        const rad = 0.3 + 0.7 * Math.sin(Math.PI * (li + 0.5) / SIZES.length);
        const ids = [];
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2 + li * 0.37;
          ids.push(nodes.push({ x, a, rad, li, act: 0, word: null, sx: 0, sy: 0, sz: 0, f: 1, ap: 1 }) - 1);
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

    const project = (spin, p) => {
      const cY = Math.cos(yaw), sY = Math.sin(yaw), cP = Math.cos(pitch), sP = Math.sin(pitch);
      const { cx, cy, S } = opt.layout(w, h, p);
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

    // o esmaecimento é pintado no próprio canvas (mais leve que mask-image no CSS)
    const draw = (dt) => {
      paint(dt);
      if (maskFill) {
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = maskFill; ctx.fillRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
      }
    };
    const paint = (dt) => {
      clock += dt;
      const k = Math.min(1, dt / 16.7);
      yaw += (tYaw - yaw) * 0.04 * k; pitch += (tPitch - pitch) * 0.04 * k;
      const p = clamp(opt.progress(), 0, 1);
      const rv = reduced.matches ? 1 : clamp(opt.reveal(), 0, 1);
      const fade = opt.fade(p);
      project(clock * 0.00011 * (1 + p * opt.spinBoost) + p * opt.spinScroll, p);
      ctx.clearRect(0, 0, w, h);
      if (rv <= 0 || fade <= 0) return;
      const decay = Math.pow(0.955, k);
      // a rede se monta da entrada para a saída: cada camada aparece um pouco depois da anterior
      for (const n of nodes) n.ap = clamp(rv * (lastLayer + 1.6) - n.li, 0, 1);

      // arestas em faixas de brilho: um stroke por faixa
      const buckets = [[], [], [], [], []];
      for (const e of edges) {
        const A = nodes[e.a], B = nodes[e.b];
        const ap = Math.min(A.ap, B.ap);
        if (ap <= 0) continue;
        const v = clamp((depth((A.sz + B.sz) / 2) * 0.62 + e.act) * ap, 0, 0.999);
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
        const q = pulses[i];
        q.t += dt / q.dur;
        const e = edges[q.e], A = nodes[e.a], B = nodes[e.b];
        if (q.t >= 1) { pulses.splice(i, 1); B.act = 1; fire(e.b, q.gen + 1); continue; }
        e.act = Math.max(e.act, 0.45);
        const t0 = Math.max(0, q.t - 0.24);
        const x0 = A.sx + (B.sx - A.sx) * t0, y0 = A.sy + (B.sy - A.sy) * t0;
        const x1 = A.sx + (B.sx - A.sx) * q.t, y1 = A.sy + (B.sy - A.sy) * q.t;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        ctx.fillRect(x1 - 1.3, y1 - 1.3, 2.6, 2.6);
      }

      // nós, com brilho do sinal e do cursor
      ctx.font = `500 ${w < 700 ? 9 : 10}px Label, "Helvetica Neue", Arial, sans-serif`;
      const R = opt.hoverRadius;
      for (const n of nodes) {
        if (n.ap <= 0) continue;
        const d = depth(n.sz);
        let hover = 0;
        if (mx > -1e3) { const dist = Math.hypot(n.sx - mx, n.sy - my); if (dist < R) hover = (1 - dist / R) * 0.85; }
        const glow = Math.max(n.act, hover);
        const r = (0.9 + d * 1.7 + glow * 1.5) * n.f * (0.4 + 0.6 * n.ap);
        if (glow > 0.12) {
          const g = ctx.createRadialGradient(n.sx, n.sy, 0, n.sx, n.sy, r * 8);
          g.addColorStop(0, `rgba(255,255,255,${(0.32 * glow * fade * n.ap).toFixed(3)})`);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.sx, n.sy, r * 8, 0, 6.2832); ctx.fill();
        }
        ctx.fillStyle = `rgba(255,255,255,${Math.min(1, (0.16 + d * 0.52 + glow * 0.6) * fade * n.ap).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(n.sx, n.sy, r, 0, 6.2832); ctx.fill();
        if (n.word) {
          ctx.fillStyle = `rgba(255,255,255,${((0.08 + d * 0.34 + glow * 0.45) * fade * n.ap).toFixed(3)})`;
          ctx.fillText(n.word, n.sx + 9, n.sy - 9);
        }
        n.act *= decay;
      }

      // ondas automáticas só depois que a rede terminou de se montar; a primeira é mais cheia
      if (reduced.matches) return;
      if (rv >= 0.98) {
        if (!primed) { primed = clock; nextWave = clock + 420; }
        if (clock > nextWave) { wave(nextWave === primed + 420 ? 5 : 2); nextWave = clock + 1300 + Math.random() * 900; }
      } else if (rv < 0.5) primed = 0;
    };

    const resize = () => {
      const r = host.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      maskFill = opt.mask ? opt.mask(ctx, w, h) : null;
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
    window.addEventListener("resize", resize, { passive: true });
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(host);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }, { rootMargin: "0px" }).observe(host);
    }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    reduced.addEventListener?.("change", () => { stop(); pulses = []; resize(); start(); });
    if (finePointer.matches) {
      window.addEventListener("pointermove", (e) => {
        if (!visible) return;
        tYaw = opt.yaw + (e.clientX / innerWidth - 0.5) * 0.55;
        tPitch = opt.pitch + (e.clientY / innerHeight - 0.5) * 0.32;
        const r = canvas.getBoundingClientRect();
        mx = e.clientX - r.left; my = e.clientY - r.top;
      }, { passive: true });
      pointerHost.addEventListener("pointerleave", () => { mx = my = -1e4; });
    }
    // toque ou clique fora de links dispara um sinal a partir do nó mais próximo
    pointerHost.addEventListener("pointerdown", (e) => {
      if (reduced.matches || e.target.closest("a, button")) return;
      const r = canvas.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      let best = -1, bd = Infinity;
      nodes.forEach((n, i) => { if (n.li >= lastLayer) return; const d = Math.hypot(n.sx - px, n.sy - py); if (d < bd) { bd = d; best = i; } });
      if (best >= 0) { nodes[best].act = 1; fire(best, 0); }
    });
    start();
    return { wave, redraw: () => { if (!raf) draw(0); } };
  };
})();
