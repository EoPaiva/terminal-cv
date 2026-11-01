/* Subpáginas do upaiva.dev: menu, cursor, planeta de partículas e movimento com GSAP. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

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
  };

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

  const initHeroCanvas = () => {
    const canvas = $(".page-orb canvas");
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

  /* ---------- revelação ao rolar ---------- */
  const initReveals = () => {
    const els = $$(".reveal, .p-cards");
    if (!("IntersectionObserver" in window) || reduced.matches) { els.forEach((el) => el.classList.add("in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    els.forEach((el) => {
      const sib = el.parentElement ? $$(":scope > .reveal", el.parentElement) : [];
      const i = sib.indexOf(el);
      if (i > 0) el.style.transitionDelay = `${Math.min(i, 6) * 80}ms`;
      io.observe(el);
    });
  };

  /* ---------- movimento ---------- */
  const initMotion = () => {
    const { gsap, ScrollTrigger, SplitText } = window;
    if (!gsap || !ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    if (SplitText) gsap.registerPlugin(SplitText);
    document.documentElement.classList.add("has-gsap");
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const flip = (el, opts = {}) => {
        const split = new SplitText(el, { type: "lines,words,chars", linesClass: "split-line", mask: "lines" });
        gsap.set(split.lines, { perspective: 700 });
        return gsap.from(split.chars, { yPercent: 120, rotationX: -95, opacity: 0, transformOrigin: "50% 100% -20px", duration: 1.2, ease: "expo.out", stagger: 0.016, ...opts });
      };
      if (SplitText) {
        const title = $(".page-title");
        if (title) flip(title, { delay: 0.15, stagger: 0.022 });
        $$("[data-words]").forEach((el) => flip(el, { scrollTrigger: { trigger: el, start: "top 85%" } }));
      }
      gsap.from(".page-hero-top, .page-hero-bottom", { y: 30, opacity: 0, duration: 1.2, ease: "expo.out", stagger: 0.12, delay: 0.5 });
      if ($(".page-orb") && $(".page-hero")) {
        gsap.from(".page-orb", { scale: 0.7, opacity: 0, duration: 2.2, ease: "expo.out", delay: 0.1 });
        gsap.timeline({ scrollTrigger: { trigger: ".page-hero", start: "top top", end: "bottom top", scrub: true } })
          .to(".page-orb", { scale: 1.3, yPercent: -12, opacity: 0.2, ease: "none" }, 0);
      }
      $$(".p-list li").forEach((li) => gsap.from(li, { x: -40, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: li, start: "top 92%" } }));

      // botões magnéticos
      if (finePointer.matches) {
        $$(".page-actions .btn, .p-cta .btn, .nav-cta").forEach((btn) => {
          const xTo = gsap.quickTo(btn, "x", { duration: 0.6, ease: "power3.out" });
          const yTo = gsap.quickTo(btn, "y", { duration: 0.6, ease: "power3.out" });
          btn.addEventListener("pointermove", (e) => { const r = btn.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * 0.28); yTo((e.clientY - r.top - r.height / 2) * 0.4); });
          btn.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
        });
      }

      // assinatura do rodapé: letras chegam do fundo e um brilho atravessa a palavra
      const giant = $(".footer-giant");
      if (giant && SplitText) {
        const split = new SplitText(giant.querySelector(".fg-word"), { type: "chars", charsClass: "ch" });
        const chars = [...split.chars, giant.querySelector(".fg-caret")];
        gsap.timeline({ scrollTrigger: { trigger: giant, start: "top bottom", end: "center 45%", scrub: 1.2 } })
          .from(chars, { opacity: 0, filter: "blur(28px)", scale: 2.6, rotationX: -75, yPercent: 35, z: 260, ease: "power3.out", duration: 1, stagger: { each: 0.09, from: "center" } }, 0)
          .from(giant, { letterSpacing: "0.32em", ease: "power2.out", duration: 1.2 }, 0)
          .fromTo(giant, { "--shine": "160%" }, { "--shine": "-60%", ease: "power2.inOut", duration: 0.7 }, 1.1);
      }
    });
    window.addEventListener("load", () => ScrollTrigger.refresh());
  };

  const boot = () => {
    initMenu(); initScroll(); initCursor(); initReveals(); initHeroCanvas(); initMotion();
    requestAnimationFrame(() => document.body.classList.add("is-ready"));
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
