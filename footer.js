/* Rodapé de todas as páginas: logo que se decodifica como um terminal, entrada da ficha de tecnologias
   e o botão de privacidade do analytics na barra inferior. Sem JavaScript, tudo aparece pronto. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

  // logo do rodapé: as letras se decodificam ao entrar na tela, como os rótulos do site, e de novo ao passar o mouse
  const initMark = () => {
    const el = $(".footer-mark .fm-word");
    if (!el || reduced.matches || !("IntersectionObserver" in window)) return;
    const text = el.textContent;
    const GLYPHS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_";
    let running = false;
    const run = () => {
      if (running) return;
      running = true;
      // largura travada durante o embaralhamento: o cursor de texto não pula
      el.style.width = `${el.getBoundingClientRect().width}px`;
      el.classList.add("is-decoding");
      const t0 = performance.now(), D = 1000;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / D), n = Math.floor(p * text.length);
        el.textContent = text.slice(0, n) + text.slice(n).replace(/./g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]);
        if (p < 1) { requestAnimationFrame(step); return; }
        el.textContent = text; el.style.width = ""; el.classList.remove("is-decoding"); running = false;
      };
      requestAnimationFrame(step);
    };
    new IntersectionObserver((entries, io) => {
      if (entries[0].isIntersecting) { io.disconnect(); run(); }
    }, { threshold: 0.9 }).observe(el);
    if (finePointer.matches) el.parentElement.addEventListener("pointerenter", run);
  };

  // a ficha de tecnologias entra em sequência
  const initStack = () => {
    const items = $$(".stack-item");
    if (!items.length || reduced.matches || !window.gsap || !window.ScrollTrigger) return;
    window.gsap.from(items, { y: 18, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.06, clearProps: "transform,opacity", scrollTrigger: { trigger: ".stack-list", start: "top 90%" } });
  };

  // o botão de privacidade do analytics vai para a barra inferior, antes do "Voltar ao topo"
  const initLegal = () => {
    const footer = $("footer.footer"), bar = $(".footer-meta", footer || document);
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

  const boot = () => { initMark(); initStack(); initLegal(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
