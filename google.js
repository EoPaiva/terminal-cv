/* Guia 09 · Como o Google acha um site
   hero em partículas, as três etapas, o robô seguindo links num site de exemplo, prévia do resultado
   da busca com corte por largura e checklist que fica salvo no navegador. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, rectPoints, ringPoints, pathPoints, heroBox, onVisible, copy, reduced } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const SVGNS = "http://www.w3.org/2000/svg";
  const sv = (tag, attrs) => { const e = document.createElementNS(SVGNS, tag); Object.entries(attrs || {}).forEach(([k, v]) => e.setAttribute(k, v)); return e; };
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced.matches ? 0 : ms));
  // texto com trechos em negrito, sem innerHTML: ["normal", ["negrito"], "normal"]
  const rich = (node, parts) => parts.forEach((p) => node.append(Array.isArray(p) ? el("b", null, p[0]) : document.createTextNode(p)));

  /* ---------- hero ---------- */
  const initHero = () => {
    const canvas = $(".lx-field canvas"), stage = $(".lx-stage");
    const LABELS = ["01 · Procura", "02 · Segue os links", "03 · Guarda no índice", "04 · Mostra na busca"];
    const st = (w) => (w < 700 ? 3.8 : 3.2);
    const box = (w, h, ratio) => { const b = heroBox(w, h), bw = Math.min(b.w, b.h * ratio), bh = bw / ratio; return { x: b.x + b.w / 2 - bw / 2, y: b.y + b.h / 2 - bh / 2, w: bw, h: bh }; };
    const shapes = [
      // a lupa
      (w, h) => {
        const b = box(w, h, 1), r = b.w * 0.3, cx = b.x + b.w * 0.42, cy = b.y + b.h * 0.42, t = Math.max(6, r * 0.14), s = st(w);
        const hx = cx + r * 0.72, hy = cy + r * 0.72;
        return ringPoints(cx, cy, r - t / 2, r + t / 2, s * 0.8).concat(pathPoints([[hx + t * 0.4, hy + t * 0.4], [b.x + b.w * 0.92, b.y + b.h * 0.92]], t * 1.6, s));
      },
      // páginas ligadas por links
      (w, h) => {
        const b = box(w, h, 1.5), s = st(w), P = [[0.12, 0.5], [0.42, 0.16], [0.42, 0.5], [0.42, 0.84], [0.78, 0.12], [0.8, 0.46], [0.8, 0.86]].map(([x, y]) => [b.x + b.w * x, b.y + b.h * y]);
        const E = [[0, 1], [0, 2], [0, 3], [1, 4], [1, 5], [2, 5], [3, 6]], r = Math.min(b.w, b.h) * 0.07;
        return E.flatMap(([a, c]) => pathPoints([P[a], P[c]], 2, s * 1.4)).concat(P.flatMap(([x, y], i) => ringPoints(x, y, 0, i ? r : r * 1.35, s * 0.85)));
      },
      // o índice: fichas em ordem
      (w, h) => {
        const b = box(w, h, 1.4), K = [0.62, 0.9, 0.74, 0.84, 0.56, 0.78, 0.68], rh = b.h / (K.length * 1.75), rects = [];
        K.forEach((k, i) => { const y = b.y + i * rh * 1.75; rects.push([b.x, y, rh * 1.6, rh], [b.x + rh * 2.4, y, (b.w - rh * 2.4) * k, rh]); });
        return rectPoints(rects, st(w));
      },
      // a página de resultados
      (w, h) => {
        const b = box(w, h, 1.4), u = b.h / 3, s = st(w), pts = [];
        [0, 1, 2].forEach((i) => {
          const y = b.y + i * u, d = u * 0.12;
          pts.push(...ringPoints(b.x + d, y + d, 0, d, s * 0.8));
          pts.push(...rectPoints([[b.x + d * 3, y + d * 0.6, b.w * 0.26, d * 0.8], [b.x, y + u * 0.3, b.w * (0.82 - i * 0.12), u * 0.16], [b.x, y + u * 0.56, b.w * 0.94, u * 0.07], [b.x, y + u * 0.7, b.w * 0.7, u * 0.07]], s));
        });
        return pts;
      }
    ];
    MPField(canvas, { shapes, hold: 3600, onShape: (i) => { if (stage) stage.textContent = LABELS[i]; } });
  };

  /* ---------- 01 · as três etapas ---------- */
  const initSteps = () => {
    const flow = $(".gg-flow");
    if (!flow) return;
    const steps = $$(".lflow-step", flow), wire = $(".lflow-wire", flow);
    let done = false;
    onVisible(flow, (v) => {
      if (!v || done) return; done = true;
      steps.forEach((s, k) => setTimeout(() => { s.classList.add("is-on", "is-hit"); wire.style.setProperty("--p", String(k / (steps.length - 1))); }, reduced.matches ? 0 : 300 + k * 520));
    }, "-20% 0px");
  };

  /* ---------- 02 · o robô ---------- */
  // x/y: mapa largo (computador). m: [esquerda, y] no mapa em lista (celular)
  const NODES = {
    home: { t: "Início", x: 110, y: 210, m: [12, 30], to: ["cardapio", "encomendas", "sobre", "contato"] },
    cardapio: { t: "Cardápio", x: 340, y: 70, m: [52, 84], to: ["bolos", "paes"] },
    encomendas: { t: "Encomendas", x: 340, y: 165, m: [52, 246], to: [] },
    sobre: { t: "Sobre", x: 340, y: 255, m: [52, 300], to: [] },
    contato: { t: "Contato", x: 340, y: 350, m: [52, 354], to: ["cliente"] },
    bolos: { t: "Bolos", x: 570, y: 50, m: [92, 138], to: [] },
    paes: { t: "Pães", x: 570, y: 130, m: [92, 192], to: [] },
    cliente: { t: "Área do cliente", x: 590, y: 350, m: [92, 408], to: [], noindex: true },
    promo: { t: "Promoção", x: 640, y: 236, m: [222, 192], to: [], orphan: true },
    sitemap: { t: "sitemap.xml", x: 110, y: 360, m: [208, 84], to: ["promo"], map: true }
  };
  const PAGES = Object.keys(NODES).filter((k) => !NODES[k].map);
  const initCrawl = () => {
    const root = $(".cr");
    if (!root) return;
    const gE = $(".cr-edges", root), gN = $(".cr-nodes", root), count = $(".cr-count", root), log = $(".cr-log", root), run = $(".cr-run", root), map = $(".cr-map", root);
    const svg = $(".cr-svg", root), edges = {}, nodes = {}, narrow = window.matchMedia("(max-width: 640px)");
    const size = (k) => ({ w: NODES[k].t.length * 9.4 + 36, h: 36 });
    // centro de cada nó no layout atual
    const pos = (k) => { const n = NODES[k]; if (!narrow.matches) return { x: n.x, y: n.y }; const { w } = size(k); return { x: n.m[0] + w / 2, y: n.m[1] }; };
    const build = () => {
      gE.textContent = ""; gN.textContent = "";
      svg.setAttribute("viewBox", narrow.matches ? "0 0 360 440" : "0 0 800 420");
      Object.entries(NODES).forEach(([k, n]) => n.to.forEach((c) => {
        const a = pos(k), b = pos(c);
        let d;
        if (!narrow.matches) d = `M${a.x} ${a.y} C${(a.x + b.x) / 2} ${a.y} ${(a.x + b.x) / 2} ${b.y} ${b.x} ${b.y}`;
        else if (n.map) d = `M${a.x} ${a.y + 18} C${a.x} ${(a.y + b.y) / 2} ${b.x} ${(a.y + b.y) / 2} ${b.x} ${b.y - 18}`;
        else { const sx = NODES[k].m[0] + 18, ex = NODES[c].m[0]; d = `M${sx} ${a.y + 18} C${sx} ${b.y} ${sx} ${b.y} ${ex} ${b.y}`; }
        const line = sv("path", { class: "cr-edge" + (n.map ? " is-map" : ""), d });
        if (n.map && map.getAttribute("aria-pressed") !== "true") line.style.opacity = "0";
        gE.append(line); edges[k + ">" + c] = line;
      }));
      Object.entries(NODES).forEach(([k, n]) => {
        const { w, h } = size(k), p = pos(k), g = sv("g", { class: "cr-node" + (n.map ? " is-map" : "") + (n.map && map.getAttribute("aria-pressed") === "true" ? " is-show" : "") });
        g.append(sv("rect", { x: p.x - w / 2, y: p.y - h / 2, width: w, height: h, rx: h / 2 }));
        const t = sv("text", { x: p.x, y: p.y }); t.textContent = n.t; g.append(t);
        if (n.noindex || n.orphan) {
          const side = narrow.matches && n.noindex, tg = sv("text", { class: "cr-tag", x: side ? p.x + w / 2 + 10 : p.x, y: side ? p.y : p.y + h / 2 + 15 });
          if (side) tg.style.textAnchor = "start";
          tg.textContent = n.noindex ? "noindex" : "sem links"; g.append(tg);
        }
        gN.append(g); nodes[k] = g;
      });
    };
    build();
    let busy = false;
    const paint = (seen, inn) => { count.textContent = `Encontradas ${seen} de ${PAGES.length} · No índice ${inn}`; };
    const reset = () => {
      Object.values(nodes).forEach((g) => g.classList.remove("is-seen", "is-in", "is-hit", "is-noindex", "is-orphan"));
      Object.values(edges).forEach((e) => e.classList.remove("is-on"));
      log.textContent = ""; paint(0, 0);
    };
    const line = (parts) => { const li = el("li"); rich(li, parts); log.append(li); };
    const pulse = async (a, b) => {
      const A = pos(a), dot = sv("circle", { class: "cr-pulse", r: 5, cx: A.x, cy: A.y });
      svg.append(dot);
      const path = edges[a + ">" + b], len = path.getTotalLength(), t0 = performance.now(), dur = reduced.matches ? 0 : 420;
      await new Promise((res) => { const f = (now) => { const k = dur ? Math.min(1, (now - t0) / dur) : 1, p = path.getPointAtLength(len * k); dot.setAttribute("cx", p.x); dot.setAttribute("cy", p.y); if (k < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
      dot.remove(); path.classList.add("is-on");
    };
    const crawl = async () => {
      if (busy) return;
      busy = true; run.disabled = true; map.disabled = true; reset();
      const withMap = map.getAttribute("aria-pressed") === "true";
      const seen = new Set(), queue = [["home", null]];
      if (withMap) queue.push(["promo", "sitemap"]);
      let inn = 0;
      line(withMap ? ["O robô leu o ", ["sitemap"], " e começou pela página inicial."] : ["O robô chegou pela ", ["página inicial"], " e vai seguir cada link."]);
      while (queue.length) {
        const [k, from] = queue.shift();
        if (seen.has(k)) continue;
        if (from) await pulse(from, k);
        seen.add(k);
        const g = nodes[k], n = NODES[k];
        g.classList.add("is-seen", "is-hit");
        await wait(220);
        if (n.noindex) g.classList.add("is-noindex");
        else { g.classList.add("is-in"); inn++; }
        paint(seen.size, inn);
        n.to.forEach((c) => { if (!seen.has(c)) queue.push([c, k]); });
        await wait(160);
      }
      if (!seen.has("promo")) { nodes.promo.classList.add("is-orphan"); line([["Promoção"], " ficou de fora: nenhuma página tem link para ela."]); }
      else if (withMap) line(["Com o sitemap, o robô achou a ", ["Promoção"], " mesmo sem nenhum link."]);
      line([["Área do cliente"], " foi visitada, mas tem noindex e não entra no índice. Certo para uma área privada."]);
      line(["Resultado: ", [`${seen.size} de ${PAGES.length}`], " páginas encontradas e ", [`${inn}`], " no índice."]);
      run.textContent = "Rastrear de novo ";
      const ar = el("i", "arrow"); ar.setAttribute("aria-hidden", "true"); run.append(ar);
      busy = false; run.disabled = false; map.disabled = false;
    };
    run.addEventListener("click", crawl);
    narrow.addEventListener("change", () => { if (busy) return; build(); reset(); });
    map.addEventListener("click", () => {
      if (busy) return;
      const on = map.getAttribute("aria-pressed") !== "true";
      map.setAttribute("aria-pressed", String(on));
      nodes.sitemap.classList.toggle("is-show", on);
      edges["sitemap>promo"].style.opacity = on ? "1" : "0";
      reset();
      line(on ? ["Sitemap enviado. Ele lista as nove páginas, inclusive a ", ["Promoção"], ". Rode o robô de novo."] : ["Sitemap removido."]);
    });
    paint(0, 0);
  };

  /* ---------- 03 · no resultado ---------- */
  const initSerp = () => {
    const root = $(".sp");
    if (!root) return;
    const title = $(".sp-title", root), url = $(".sp-url", root), desc = $(".sp-desc", root), card = $(".sp-card", root);
    const tl = $(".sp-tl", root), dl = $(".sp-dl", root), name = $(".sp-name", root), crumb = $(".sp-crumb", root), tOut = $(".sp-t", root), dOut = $(".sp-d", root), checks = $(".sp-checks", root);
    const devs = $$(".sp-dev .chip", root);
    const mctx = document.createElement("canvas").getContext("2d");
    const px = (s, size) => { mctx.font = `${size}px Arial, Helvetica, sans-serif`; return mctx.measureText(s).width; };
    let dev = "mobile";
    // corta por largura (título) ou por caracteres (descrição), sem quebrar palavra no meio
    const cutPx = (s, size, max) => { if (px(s, size) <= max) return [s, false]; let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (px(s.slice(0, m) + " …", size) <= max) lo = m; else hi = m - 1; } let out = s.slice(0, lo); const sp = out.lastIndexOf(" "); if (sp > out.length * 0.6) out = out.slice(0, sp); return [out.replace(/[\s,.;:|–-]+$/, ""), true]; };
    const cutCh = (s, max) => { if (s.length <= max) return [s, false]; let out = s.slice(0, max); const sp = out.lastIndexOf(" "); if (sp > max * 0.6) out = out.slice(0, sp); return [out.replace(/[\s,.;:–-]+$/, ""), true]; };
    const put = (node, [txt, cut]) => { node.textContent = txt; if (cut) node.append(el("span", "sp-cut", " …")); };
    const paint = () => {
      const t = title.value.trim() || "Sem título", d = desc.value.trim(), u = url.value.trim().replace(/^https?:\/\//, "") || "seusite.com.br";
      const host = u.split("/")[0], path = u.split("/").slice(1).filter(Boolean);
      name.textContent = (t.split(/\s[|–-]\s/)[0] || host).slice(0, 60);
      crumb.textContent = ["https://" + host].concat(path).join(" › ");
      const wDesk = px(t, 20), mobile = dev === "mobile";
      put(tOut, mobile ? cutPx(t, 18, 700) : cutPx(t, 20, 580));
      put(dOut, d ? cutCh(d, mobile ? 120 : 158) : ["Sem descrição: o Google vai escolher um trecho da página.", false]);
      tl.textContent = `${Math.round(wDesk)} px`; tl.classList.toggle("is-bad", wDesk > 580);
      dl.textContent = `${d.length} caracteres`; dl.classList.toggle("is-bad", d.length > 158);
      checks.textContent = "";
      const add = (ok, parts) => { const li = el("li", ok ? "" : "is-warn"), sp = el("span"); rich(sp, parts); li.append(sp); checks.append(li); };
      if (wDesk > 580) add(false, [["Título longo:"], ` ${Math.round(wDesk)} px. No computador, o corte vem perto de 580 px.`]);
      else if (t.length < 25) add(false, [["Título curto:"], " aproveite para dizer o que oferece e onde."]);
      else add(true, [["Título cabe inteiro"], ` no computador (${Math.round(wDesk)} de 580 px).`]);
      if (!d) add(false, [["Sem descrição:"], " o Google escolhe um trecho por você."]);
      else if (d.length > 158) add(false, [["Descrição longa:"], ` ${d.length} caracteres. Corta perto de 158 no computador e de 120 no celular.`]);
      else if (d.length > 120) add(false, [["Descrição boa no computador,"], ` mas no celular corta perto de 120 caracteres. Coloque o mais importante no começo.`]);
      else if (d.length < 70) add(false, [["Descrição curta:"], " use uma ou duas frases dizendo por que clicar."]);
      else add(true, [["Descrição cabe"], " no celular e no computador."]);
      if (/[?=&]|\d{5,}/.test(u) || u.length > 70) add(false, [["Endereço difícil de ler:"], " prefira palavras curtas, sem códigos."]);
      else add(true, [["Endereço curto e legível."]]);
    };
    devs.forEach((b) => b.addEventListener("click", () => {
      dev = b.dataset.d; devs.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      card.classList.toggle("is-mobile", dev === "mobile"); card.classList.toggle("is-desktop", dev !== "mobile"); paint();
    }));
    [title, url, desc].forEach((i) => i.addEventListener("input", paint));
    paint();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint);
  };

  /* ---------- 04 · checklist ---------- */
  const initList = () => {
    const root = $(".cl");
    if (!root) return;
    const boxes = $$("input[type=checkbox]", root), done = $(".cl-done");
    const KEY = "upaiva-google-checklist";
    try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); boxes.forEach((b, i) => { b.checked = !!v[i]; }); } catch (_) { /* sem armazenamento */ }
    const upd = () => { done.textContent = `${boxes.filter((b) => b.checked).length} de ${boxes.length}`; try { localStorage.setItem(KEY, JSON.stringify(boxes.map((b) => b.checked))); } catch (_) { /* ok */ } };
    boxes.forEach((b) => b.addEventListener("change", upd));
    upd();
    $(".cl-print")?.addEventListener("click", () => window.print());
    $(".cl-copy")?.addEventListener("click", () => {
      const txt = $$(".cl-col", root).map((c) => `${$("h3", c).lastChild.textContent.trim()}\n` + $$("li span", c).map((s) => `[ ] ${s.textContent.trim()}`).join("\n")).join("\n\n");
      copy(`Como o Google acha um site (upaiva.dev/como-o-google-encontra)\n\n${txt}`, "Checklist copiado");
    });
  };

  const boot = () => { initHero(); initSteps(); initCrawl(); initSerp(); initList(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
