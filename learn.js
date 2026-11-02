/* Guias do upaiva.dev (Entenda a IA): base compartilhada.
   - MPField: campo de partículas que desenha palavras e formas e troca entre elas com mola.
   - utilidades (onVisible, toast, copiar) usadas pelos scripts de cada guia.
   Tudo respeita prefers-reduced-motion e pausa fora da tela. */
(() => {
  "use strict";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const onVisible = (el, cb, rootMargin = "120px") => {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { cb(true); return; }
    new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin }).observe(el);
  };

  const toast = (msg) => {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.append(el); }
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove("is-on"), 2200);
  };

  const copy = async (text, ok = "Copiado") => {
    try { await navigator.clipboard.writeText(text); toast(ok); return true; }
    catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.append(ta); ta.select();
      let done = false;
      try { done = document.execCommand("copy"); } catch (_) { done = false; }
      ta.remove();
      toast(done ? ok : "Não deu para copiar");
      return done;
    }
  };

  /* pontos de um texto: desenha num canvas fora da tela e amostra os pixels acesos */
  const textPoints = (str, w, h, o = {}) => {
    const off = document.createElement("canvas");
    off.width = Math.max(1, Math.round(w)); off.height = Math.max(1, Math.round(h));
    const c = off.getContext("2d", { willReadFrequently: true });
    let size = o.size || h * 0.5;
    const font = (s) => `${o.weight || 300} ${s}px ${o.family || '"Display", "Helvetica Neue", Arial, sans-serif'}`;
    c.font = font(size);
    if ("letterSpacing" in c) c.letterSpacing = `${(o.tracking ?? -0.04) * size}px`;
    const maxW = w * (o.maxW || 0.92);
    const mw = c.measureText(str).width;
    if (mw > maxW) { size *= maxW / mw; c.font = font(size); if ("letterSpacing" in c) c.letterSpacing = `${(o.tracking ?? -0.04) * size}px`; }
    c.fillStyle = "#fff"; c.textBaseline = "middle";
    c.textAlign = o.align || "center";
    const x = o.align === "left" ? w * (o.x ?? 0.04) : o.align === "right" ? w * (o.x ?? 0.96) : w * (o.x ?? 0.5);
    c.fillText(str, x, h * (o.y ?? 0.5));
    const data = c.getImageData(0, 0, off.width, off.height).data;
    const step = o.step || Math.max(2, Math.round(size / 64));
    const pts = [];
    for (let y = 0; y < off.height; y += step) for (let xx = 0; xx < off.width; xx += step) {
      if (data[(y * off.width + xx) * 4 + 3] > 130) pts.push([xx + (Math.random() - 0.5) * step * 0.6, y + (Math.random() - 0.5) * step * 0.6]);
    }
    return pts;
  };

  /* pontos de retângulos (barras, blocos), ex.: [[x, y, w, h], ...] em px */
  const rectPoints = (rects, step = 5) => {
    const pts = [];
    rects.forEach(([x, y, w, h]) => {
      for (let yy = y; yy < y + h; yy += step) for (let xx = x; xx < x + w; xx += step) pts.push([xx + Math.random() * step * 0.5, yy + Math.random() * step * 0.5]);
    });
    return pts;
  };

  /* contorno de retângulos arredondados (chips) */
  const outlinePoints = (rects, step = 4, r = 10) => {
    const pts = [];
    rects.forEach(([x, y, w, h]) => {
      const rr = Math.min(r, h / 2, w / 2);
      for (let xx = x + rr; xx <= x + w - rr; xx += step) { pts.push([xx, y]); pts.push([xx, y + h]); }
      for (let yy = y + rr; yy <= y + h - rr; yy += step) { pts.push([x, yy]); pts.push([x + w, yy]); }
      const n = Math.max(3, Math.round((Math.PI * rr / 2) / step));
      [[x + rr, y + rr, Math.PI], [x + w - rr, y + rr, -Math.PI / 2], [x + w - rr, y + h - rr, 0], [x + rr, y + h - rr, Math.PI / 2]].forEach(([cx, cy, a0]) => {
        for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * Math.PI / 2; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      });
    });
    return pts;
  };

  /* área das formas no hero. No celular: a faixa de cima inteira. No computador: o maior espaço livre
     entre (A) à direita do título, até o índice, e (B) acima do título, na metade direita. */
  const heroBox = (w, h) => {
    const field = document.querySelector(".lx-field"), title = document.querySelector(".lx-hero .page-title"), top = document.querySelector(".lx-hero .page-hero-top");
    if (w < 900 || !field || !title || !top) return { x: w * 0.07, y: h * 0.08, w: w * 0.86, h: h * 0.84 };
    const fr = field.getBoundingClientRect(), tb = title.getBoundingClientRect();
    // mede só os glifos (os blocos de linha do SplitText ocupam a largura toda)
    let textRight = 0;
    const tw = document.createTreeWalker(title, NodeFilter.SHOW_TEXT), rg = document.createRange();
    while (tw.nextNode()) { if (!tw.currentNode.textContent.trim()) continue; rg.selectNodeContents(tw.currentNode); for (const r of rg.getClientRects()) textRight = Math.max(textRight, r.right); }
    textRight = (textRight || tb.right) - fr.left;
    const right = top.getBoundingClientRect().right - fr.left;
    // posição de layout, sem o deslocamento da animação de entrada (a linha de rótulos e o sumário sobem 30px ao abrir)
    const shiftY = (el) => { let s = 0; for (let n = el; n && n !== document.body; n = n.parentElement) { const t = getComputedStyle(n).transform; if (t && t !== "none") s += new DOMMatrixReadOnly(t).m42; } return s; };
    const toc = document.querySelector(".lx-hero .lx-toc");
    const floor = (toc && toc.offsetParent ? toc.getBoundingClientRect().top - shiftY(toc) : tb.bottom) - fr.top - 28;
    // a linha de rótulos acima do título fica livre: ao lado do título a forma começa abaixo dela, acima do título termina antes dela
    const trr = top.getBoundingClientRect(), sy = shiftY(top), tr = { top: trr.top - sy, bottom: trr.bottom - sy };
    const A = { x: Math.max(w * 0.5, textRight + 72), y: Math.max(12, tr.bottom - fr.top + 28) };
    A.w = right - A.x; A.h = floor - A.y;
    const B = { x: w * 0.46, y: 12, w: right - w * 0.46, h: tr.top - fr.top - 28 };
    const fit = (k) => (k.w > 80 && k.h > 80 ? Math.min(k.w, k.h * 1.8) * k.h : 0);
    return fit(A) >= fit(B) ? A : B;
  };
  /* texto centrado numa caixa */
  const boxText = (str, w, h, b, o = {}) => textPoints(str, w, h, Object.assign({ x: (b.x + b.w / 2) / w, y: (b.y + b.h / 2) / h, maxW: b.w / w, size: b.h * 0.5 }, o));

  /* MPField(canvas, { shapes: [(w, h) => pontos], hold: ms, onShape(i), count }) */
  const MPField = (canvas, o = {}) => {
    if (!canvas || !canvas.getContext) return null;
    const host = o.host || canvas.parentElement;
    const ctx = canvas.getContext("2d");
    const small = () => window.innerWidth < 700;
    const opt = Object.assign({ shapes: [], hold: 3600, count: 0, alpha: 0.9, onShape: null, drift: 1 }, o);
    let w = 0, h = 0, dpr = 1, raf = 0, visible = true, P = [], shapeIdx = -1, nextAt = 0, targets = [], mx = -1e4, my = -1e4, last = 0, clock = 0, fixed = false;

    const N = () => opt.count || (small() ? 1100 : 2200);
    const seed = () => {
      const n = N();
      P = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0,
        tx: Math.random() * w, ty: Math.random() * h,
        a: 0.5 + Math.random() * 0.5, r: Math.random() < 0.05 ? 2.2 : 1.1 + Math.random() * 0.6,
        ph: Math.random() * 6.28, free: false
      }));
    };
    const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const assign = (pts) => {
      targets = pts;
      if (!pts.length) { P.forEach((p) => { p.free = true; p.tx = Math.random() * w; p.ty = Math.random() * h; }); return; }
      // sorteia os pontos (a forma inteira aparece mesmo com menos partículas) e a ordem das partículas (troca orgânica)
      const use = shuffle(pts.slice()).slice(0, P.length);
      const order = shuffle(P.map((_, i) => i));
      order.forEach((pi, k) => {
        const p = P[pi];
        if (k < use.length) { p.tx = use[k][0]; p.ty = use[k][1]; p.free = false; }
        else { p.free = true; p.tx = Math.random() * w; p.ty = Math.random() * h; }
      });
    };
    const show = (i) => {
      if (!opt.shapes.length) return;
      shapeIdx = ((i % opt.shapes.length) + opt.shapes.length) % opt.shapes.length;
      assign(opt.shapes[shapeIdx](w, h) || []);
      if (opt.onShape) opt.onShape(shapeIdx);
    };
    const resize = () => {
      const r = host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const changed = Math.abs(r.width - w) > 2 || Math.abs(r.height - h) > 2;
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!P.length || Math.abs(P.length - N()) > 200) seed();
      if (changed) show(shapeIdx < 0 ? 0 : shapeIdx);
      if (reduced.matches) { P.forEach((p) => { p.x = p.tx; p.y = p.ty; }); draw(); }
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      for (const p of P) {
        const tw = p.free ? 0.22 : 1;
        ctx.globalAlpha = clamp(p.a * opt.alpha * tw, 0, 1);
        ctx.fillRect(p.x, p.y, p.r, p.r);
      }
      ctx.globalAlpha = 1;
    };
    const step = (now) => {
      const dt = last ? Math.min(48, now - last) / 16.67 : 1;
      last = now; clock += dt * 16.67;
      if (!fixed && opt.shapes.length > 1 && clock >= nextAt) { nextAt = clock + opt.hold; show(shapeIdx + 1); }
      const k = 0.022, damp = 0.84, R = 90;
      for (const p of P) {
        let tx = p.tx, ty = p.ty;
        if (p.free) { tx += Math.sin(clock * 0.0004 + p.ph) * 24 * opt.drift; ty += Math.cos(clock * 0.00035 + p.ph) * 24 * opt.drift; }
        else { tx += Math.sin(clock * 0.0016 + p.ph) * 0.7; ty += Math.cos(clock * 0.0014 + p.ph) * 0.7; }
        p.vx += (tx - p.x) * k * dt; p.vy += (ty - p.y) * k * dt;
        const dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
        if (d2 < R * R && d2 > 0.01) { const d = Math.sqrt(d2), f = (1 - d / R) * 2.6; p.vx += (dx / d) * f * dt; p.vy += (dy / d) * f * dt; }
        p.vx *= Math.pow(damp, dt); p.vy *= Math.pow(damp, dt);
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      draw();
      raf = requestAnimationFrame(step);
    };
    const run = () => { if (!raf && visible && !document.hidden && !reduced.matches) { last = 0; raf = requestAnimationFrame(step); } };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    resize();
    if ("ResizeObserver" in window) { let t = 0; new ResizeObserver(() => { cancelAnimationFrame(t); t = requestAnimationFrame(resize); }).observe(host); }
    else window.addEventListener("resize", resize);
    document.fonts?.ready.then(() => show(shapeIdx < 0 ? 0 : shapeIdx));
    onVisible(host, (v) => { visible = v; v ? run() : stop(); }, "0px");
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : run()));
    if (finePointer.matches) {
      const ph = o.pointerHost || host.closest("section") || host;
      ph.addEventListener("pointermove", (e) => { const r = canvas.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
      ph.addEventListener("pointerleave", () => { mx = my = -1e4; });
    }
    nextAt = opt.hold;
    run();
    return {
      show: (i) => { fixed = true; show(i); },
      auto: () => { fixed = false; nextAt = clock + opt.hold; },
      setShapes: (s, i = 0) => { opt.shapes = s; show(i); },
      burst: (x, y, force = 9) => { P.forEach((p) => { const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1; if (d < 220) { p.vx += (dx / d) * force * (1 - d / 220); p.vy += (dy / d) * force * (1 - d / 220); } }); },
      size: () => ({ w, h })
    };
  };

  /* série de guias: marca a página atual na lista do fim */
  const initSeries = () => {
    const here = location.pathname.replace(/\.html$/, "").replace(/\/$/, "");
    document.querySelectorAll(".series a").forEach((a) => {
      if (a.getAttribute("href") === here) { a.classList.add("is-here"); a.setAttribute("aria-current", "page"); }
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSeries); else initSeries();

  window.MPLearn = { MPField, textPoints, rectPoints, outlinePoints, heroBox, boxText, onVisible, toast, copy, reduced, finePointer, clamp };
})();
