/* Rodapé de todas as páginas: assinatura mPaiva_ desenhada com a rolagem, brilho que segue o cursor
   e entrada da ficha de tecnologias. Sem JavaScript, a assinatura aparece pronta. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  const initSignature = () => {
    const sig = $(".sig");
    const svgEl = sig && $(".sig-svg", sig);
    if (!svgEl || !svgEl.getBBox) return;
    const line = $(".sig-line", sig), fill = $(".sig-fill", sig), riseG = $("#sig-rise-g"), spot = $("#sig-spot-g");
    const DASH = 1500;
    const state = { draw: 1, fill: 1 };
    let box = null;

    // o viewBox abraça as letras: a assinatura ocupa a largura toda em qualquer tela
    const fit = () => {
      const b = line.getBBox();
      if (!b.width) return;
      const cs = getComputedStyle(line), size = parseFloat(cs.fontSize) || 200;
      let top = b.y, bottom = b.y + b.height;
      const c = document.createElement("canvas").getContext("2d");
      if (c) {
        c.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
        if ("letterSpacing" in c) c.letterSpacing = cs.letterSpacing;
        const m = c.measureText("mPaiva_");
        if (m.actualBoundingBoxAscent) { top = -m.actualBoundingBoxAscent; bottom = m.actualBoundingBoxDescent; }
      }
      const padX = size * 0.04, padY = size * 0.08;
      box = { x: b.x - padX, y: top - padY, w: b.width + padX * 2, h: bottom - top + padY * 2 };
      svgEl.setAttribute("viewBox", `${box.x.toFixed(1)} ${box.y.toFixed(1)} ${box.w.toFixed(1)} ${box.h.toFixed(1)}`);
      const scale = svgEl.getBoundingClientRect().width / box.w || 1;
      line.style.strokeWidth = (1.1 / scale).toFixed(3);
      spot.setAttribute("r", (box.h * 0.75).toFixed(1));
      paint();
    };

    // draw: 0 a 1 desenha o contorno · fill: 0 a 1 sobe o preenchimento de baixo para cima
    const paint = () => {
      if (!box) return;
      line.style.strokeDasharray = DASH;
      line.style.strokeDashoffset = (DASH * (1 - state.draw)).toFixed(1);
      // a borda suave da máscara sobe da base até acima do topo das letras
      const soft = box.h * 0.14, edgeFrom = box.y + box.h + soft, edgeTo = box.y - soft;
      const edge = edgeFrom + (edgeTo - edgeFrom) * state.fill;
      riseG.setAttribute("y1", (edge - soft).toFixed(1));
      riseG.setAttribute("y2", (edge + soft).toFixed(1));
    };

    const animate = !reduced.matches && window.gsap && window.ScrollTrigger;
    if (animate) {
      state.draw = 0; state.fill = 0;
      fill.setAttribute("mask", "url(#sig-rise)");
      window.gsap.registerPlugin(window.ScrollTrigger);
      window.gsap.timeline({ scrollTrigger: { trigger: sig, start: "top bottom", end: "bottom bottom", scrub: 1.1 }, onUpdate: paint })
        .to(state, { draw: 1, ease: "power1.inOut", duration: 0.72 }, 0)
        .to(state, { fill: 1, ease: "power2.inOut", duration: 0.62 }, 0.38);
    }

    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit, { passive: true });

    // brilho: as letras perto do cursor acendem
    if (finePointer.matches) {
      const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
      let raf = 0;
      const tick = () => {
        cur.x += (target.x - cur.x) * 0.16; cur.y += (target.y - cur.y) * 0.16;
        spot.setAttribute("cx", cur.x.toFixed(1)); spot.setAttribute("cy", cur.y.toFixed(1));
        raf = Math.abs(target.x - cur.x) + Math.abs(target.y - cur.y) > 0.3 ? requestAnimationFrame(tick) : 0;
      };
      const toSvg = (e) => {
        const m = svgEl.getScreenCTM();
        if (!m) return null;
        const pt = svgEl.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
        return pt.matrixTransform(m.inverse());
      };
      sig.addEventListener("pointerenter", (e) => {
        const p = toSvg(e); if (!p) return;
        cur.x = target.x = p.x; cur.y = target.y = p.y;
        spot.setAttribute("cx", p.x.toFixed(1)); spot.setAttribute("cy", p.y.toFixed(1));
        sig.classList.add("is-hover");
      });
      sig.addEventListener("pointermove", (e) => {
        const p = toSvg(e); if (!p) return;
        target.x = p.x; target.y = p.y;
        if (!raf) raf = requestAnimationFrame(tick);
      });
      sig.addEventListener("pointerleave", () => sig.classList.remove("is-hover"));
    }
  };

  // a ficha de tecnologias entra em sequência
  const initStack = () => {
    const items = $$(".stack-item");
    if (!items.length || reduced.matches || !window.gsap || !window.ScrollTrigger) return;
    window.gsap.from(items, { y: 18, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.06, clearProps: "transform,opacity", scrollTrigger: { trigger: ".stack-list", start: "top 90%" } });
  };

  // o botão de privacidade do analytics vai para a barra inferior, antes da assinatura
  const initLegal = () => {
    const footer = $("footer.footer"), bar = $(".footer-bottom", footer || document);
    if (!footer || !bar) return;
    const move = () => {
      const wrap = $(".analytics-privacy-footer-wrap", footer), btn = wrap && $(".analytics-privacy-footer-link", wrap);
      if (!btn) return false;
      bar.insertBefore(btn, bar.lastElementChild);
      wrap.remove();
      return true;
    };
    if (move()) return;
    const mo = new MutationObserver(() => { if (move()) mo.disconnect(); });
    mo.observe(footer, { childList: true });
  };

  const boot = () => { initSignature(); initStack(); initLegal(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
