/* Guia 05 · Do clique à tela
   hero em partículas, etapas do carregamento (Navigation Timing), peso dos arquivos (Resource Timing)
   e Core Web Vitals desta visita (PerformanceObserver). Tudo medido e mostrado só neste navegador. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, rectPoints, outlinePoints, heroBox, boxText, onVisible, reduced } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const comma = (n, d) => n.toFixed(d).replace(".", ",");
  const fmtMs = (ms) => (ms >= 1000 ? `${comma(ms / 1000, 2)} s` : `${Math.max(0, Math.round(ms))} ms`);
  const navEntry = () => (performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null);
  const loaded = (cb) => { if (document.readyState === "complete") setTimeout(cb, 0); else window.addEventListener("load", () => setTimeout(cb, 0), { once: true }); };
  let totalMs = 0;

  /* ---------- hero ---------- */
  const polyFill = (poly, step) => {
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]), pts = [];
    const inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += step) for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) if (inside(x, y)) pts.push([x, y]);
    return pts;
  };
  const initHero = () => {
    const canvas = $(".lx-field canvas"), stage = $(".lx-stage");
    const st = (w) => (w < 700 ? 3.8 : 3.2);
    const labels = () => ["01 · Você clica", "02 · Acha o endereço", "03 · O servidor responde", "04 · A página é montada", totalMs ? `05 · Na sua tela em ${fmtMs(totalMs)}` : "05 · Na sua tela"];
    const shapes = [
      (w, h) => {
        const b = heroBox(w, h), s = Math.min(b.h * 0.92, b.w * 0.9), x0 = b.x + b.w / 2 - s * 0.24, y0 = b.y + b.h / 2 - s / 2;
        const P = [[0, 0], [0, 0.74], [0.17, 0.58], [0.3, 0.88], [0.42, 0.83], [0.29, 0.54], [0.52, 0.54]].map(([x, y]) => [x0 + x * s, y0 + y * s]);
        return polyFill(P, st(w));
      },
      (w, h) => { const b = heroBox(w, h); return boxText("upaiva.dev", w, h, b, { size: b.h * 0.4 }); },
      (w, h) => {
        const b = heroBox(w, h), uw = Math.min(b.w * 0.7, b.h * 1.3), uh = Math.min(b.h * 0.2, 80), gap = uh * 0.32, x = b.x + b.w / 2 - uw / 2, y0 = b.y + b.h / 2 - (uh * 3 + gap * 2) / 2;
        const units = [0, 1, 2].map((i) => [x, y0 + i * (uh + gap), uw, uh]);
        const leds = units.flatMap(([ux, uy]) => [[ux + uh * 0.32, uy + uh * 0.38, uh * 0.24, uh * 0.24], [ux + uh * 0.8, uy + uh * 0.38, uh * 0.24, uh * 0.24], [ux + uw * 0.5, uy + uh * 0.45, uw * 0.38, Math.max(4, uh * 0.1)]]);
        return outlinePoints(units, st(w), uh * 0.22).concat(rectPoints(leds, st(w) * 0.9));
      },
      (w, h) => {
        const b = heroBox(w, h), pw = Math.min(b.w * 0.8, b.h * 1.45), ph = Math.min(b.h * 0.9, pw * 0.7), x = b.x + b.w / 2 - pw / 2, y = b.y + b.h / 2 - ph / 2, g = pw * 0.03;
        const blocks = [[x, y, pw, ph * 0.08], [x, y + ph * 0.14, pw * 0.62, ph * 0.12], [x, y + ph * 0.3, pw * 0.44, ph * 0.06], [x, y + ph * 0.44, pw, ph * 0.26]];
        const cw = (pw - g * 2) / 3; [0, 1, 2].forEach((i) => blocks.push([x + i * (cw + g), y + ph * 0.76, cw, ph * 0.24]));
        return outlinePoints(blocks.slice(3), st(w), 8).concat(rectPoints(blocks.slice(0, 3), st(w)));
      },
      (w, h) => { const b = heroBox(w, h); return boxText(totalMs ? fmtMs(totalMs) : "rápido", w, h, b, { size: b.h * 0.5 }); }
    ];
    MPField(canvas, { shapes, hold: 3400, onShape: (i) => { if (stage) stage.textContent = labels()[i]; } });
  };

  /* ---------- 01 · viagem ---------- */
  const SHADES = ["#3d3d3d", "#5a5a5a", "#7a7a7a", "#a0a0a0", "#cacaca", "#ffffff"];
  const initTrip = () => {
    const root = $(".trip");
    if (!root) return;
    const steps = $$(".lflow-step", root), bar = $(".trip-bar", root), num = $(".trip-num", root), env = $(".trip-env", root), wire = $(".lflow-wire", root);
    steps.forEach((s, i) => s.style.setProperty("--c", SHADES[i]));
    $(".trip-again", root)?.addEventListener("click", () => location.reload());
    loaded(() => {
      const n = navEntry();
      if (!n) { num.textContent = "–"; env.textContent = "Seu navegador não informa esses tempos."; return; }
      const v = {
        dns: n.domainLookupEnd - n.domainLookupStart,
        tls: n.connectEnd - n.connectStart,
        wait: n.responseStart - n.requestStart,
        down: n.responseEnd - n.responseStart,
        build: n.domContentLoadedEventEnd - n.responseEnd,
        rest: n.loadEventEnd - n.domContentLoadedEventEnd
      };
      totalMs = n.loadEventEnd || performance.now();
      num.textContent = fmtMs(totalMs);
      const proto = { h2: "HTTP/2", h3: "HTTP/3", "http/1.1": "HTTP/1.1" }[n.nextHopProtocol] || "";
      const net = navigator.connection && navigator.connection.effectiveType ? `rede ${navigator.connection.effectiveType.toUpperCase()}` : "";
      const now = new Date();
      env.textContent = [proto, net, `medido às ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`].filter(Boolean).join(" · ");
      const keys = steps.map((s) => s.dataset.k), sum = keys.reduce((a, k) => a + Math.max(0, v[k]), 0) || 1;
      bar.textContent = "";
      keys.forEach((k, i) => {
        const val = Math.max(0, v[k]);
        $(".ms", steps[i]).textContent = fmtMs(val);
        const seg = el("i"); seg.style.setProperty("--c", SHADES[i]); seg.style.setProperty("--i", i); seg.style.flexBasis = `${(val / sum) * 100}%`; seg.title = `${$("h3", steps[i]).textContent}: ${fmtMs(val)}`;
        bar.append(seg);
      });
      let done = false;
      onVisible(root, (vis) => {
        if (!vis || done) return; done = true;
        root.classList.add("is-on");
        steps.forEach((s, i) => setTimeout(() => { s.classList.add("is-on", "is-hit"); wire.style.setProperty("--p", String(i / (steps.length - 1))); }, reduced.matches ? 0 : 250 + i * 260));
      }, "-15% 0px");
    });
  };

  /* ---------- 02 · arquivos ---------- */
  const TYPES = [
    ["html", "Texto da página", "HTML"], ["css", "Visual", "CSS"], ["js", "Scripts", "JavaScript"],
    ["font", "Fontes", "WOFF2"], ["img", "Imagens", "PNG, SVG, WebP"], ["other", "Outros", "dados e ícones"]
  ];
  const kindOf = (e) => {
    if (e.entryType === "navigation") return "html";
    const p = (() => { try { return new URL(e.name).pathname.toLowerCase(); } catch (_) { return ""; } })();
    if (/\.css$/.test(p) || e.initiatorType === "css" && /\.css/.test(p)) return "css";
    if (/\.m?js$/.test(p) || e.initiatorType === "script") return "js";
    if (/\.(woff2?|ttf|otf)$/.test(p)) return "font";
    if (/\.(png|jpe?g|webp|avif|gif|svg|ico)$/.test(p) || e.initiatorType === "img") return "img";
    if (/\.html?$/.test(p)) return "html";
    return "other";
  };
  const initFiles = () => {
    const root = $(".files");
    if (!root) return;
    const list = $(".files-list", root), kb = $(".files-kb", root), nEl = $(".files-n", root), cEl = $(".files-cache", root);
    const render = () => {
      const all = [navEntry(), ...performance.getEntriesByType("resource")].filter(Boolean);
      const g = {}; let total = 0, cached = 0;
      all.forEach((e) => {
        const size = e.encodedBodySize || e.transferSize || e.decodedBodySize || 0;
        const k = kindOf(e);
        g[k] = g[k] || { n: 0, size: 0 };
        g[k].n++; g[k].size += size; total += size;
        if (e.transferSize === 0 && e.encodedBodySize > 0) cached++;
      });
      const rows = TYPES.filter(([k]) => g[k]).sort((a, b) => g[b[0]].size - g[a[0]].size), max = Math.max(1, ...rows.map(([k]) => g[k].size));
      list.textContent = "";
      rows.forEach(([k, name, ext], i) => {
        const li = el("li"), ft = el("span", "ft"), tr = el("span", "tr"), bar = el("i"), size = el("span", "kb");
        ft.append(el("b", "", name), el("small", "", `${g[k].n} ${g[k].n > 1 ? "arquivos" : "arquivo"} · ${ext}`));
        bar.style.setProperty("--p", String(Math.max(0.01, g[k].size / max))); bar.style.setProperty("--i", i); tr.append(bar);
        size.append(`${comma(g[k].size / 1024, g[k].size < 10240 ? 1 : 0)} KB`);
        li.append(ft, tr, size); list.append(li);
      });
      kb.textContent = comma(total / 1024, 0);
      nEl.textContent = String(all.length);
      cEl.textContent = `${cached} de ${all.length}`;
    };
    loaded(() => {
      render();
      let done = false;
      onVisible(root, (vis) => { if (!vis || done) return; done = true; render(); requestAnimationFrame(() => root.classList.add("is-on")); }, "-15% 0px");
    });
  };

  /* ---------- 03 · sinais ---------- */
  const TH = { lcp: [2500, 4000], inp: [200, 500], cls: [0.1, 0.25] };
  const TAG = { good: "Bom", mid: "Pode melhorar", poor: "Ruim" };
  const initVitals = () => {
    const box = (m) => $(`.vt[data-m="${m}"]`);
    if (!box("lcp")) return;
    const show = (m, v) => {
      const b = box(m), [g, p] = TH[m], s = v <= g ? "good" : v <= p ? "mid" : "poor";
      b.dataset.s = s;
      $(".vt-tag", b).textContent = TAG[s];
      const val = $(".vt-val b", b);
      val.textContent = m === "cls" ? comma(v, 3) : m === "lcp" ? comma(v / 1000, 2) : String(Math.round(v));
      const unit = m === "cls" ? "" : m === "lcp" ? "s" : "ms";
      if (unit) val.append(el("small", "", unit));
      const pos = v <= g ? (v / g) * 33.3 : v <= p ? 33.3 + ((v - g) / (p - g)) * 33.3 : Math.min(98, 66.6 + ((v - p) / p) * 33.3);
      $(".vt-mark", b).style.left = `${pos}%`;
    };
    const none = (m, msg) => { const b = box(m); $(".vt-tag", b).textContent = "Sem dado"; $(".vt-val b", b).textContent = "–"; $(".vt-desc", b).textContent = msg; };
    const supports = (t) => (window.PerformanceObserver && PerformanceObserver.supportedEntryTypes || []).includes(t);
    // LCP
    if (supports("largest-contentful-paint")) {
      let lcp = 0;
      new PerformanceObserver((list) => { const es = list.getEntries(); const e = es[es.length - 1]; lcp = e.renderTime || e.loadTime || e.startTime; show("lcp", lcp); }).observe({ type: "largest-contentful-paint", buffered: true });
    } else none("lcp", "Este navegador não mede o LCP. Abra a página no Chrome, Edge ou Firefox para ver o seu.");
    // CLS com janelas de sessão (até 5 s, intervalos menores que 1 s)
    if (supports("layout-shift")) {
      let cls = 0, win = 0, first = 0, last = 0;
      show("cls", 0);
      new PerformanceObserver((list) => {
        list.getEntries().forEach((e) => {
          if (e.hadRecentInput) return;
          if (win && e.startTime - last < 1000 && e.startTime - first < 5000) { win += e.value; last = e.startTime; }
          else { win = e.value; first = last = e.startTime; }
          cls = Math.max(cls, win);
        });
        show("cls", cls);
      }).observe({ type: "layout-shift", buffered: true });
    } else none("cls", "Este navegador não mede o CLS. Abra a página no Chrome ou Edge para ver o seu.");
    // INP (aproximado: a interação mais lenta desta visita)
    const out = $(".tap-out");
    if (supports("event")) {
      let worst = 0;
      $(".vt-val b", box("inp")).textContent = "–";
      $(".vt-tag", box("inp")).textContent = "Toque para medir";
      const seen = new Map();
      new PerformanceObserver((list) => {
        list.getEntries().forEach((e) => {
          if (!e.interactionId) return;
          const d = Math.max(seen.get(e.interactionId) || 0, e.duration);
          seen.set(e.interactionId, d);
          worst = Math.max(worst, d);
          if (out) { out.textContent = ""; out.append("Último toque na página: ", el("b", "", `${Math.round(d)} ms`), `. ${d <= 200 ? "Resposta imediata." : d <= 500 ? "Já dá para sentir o atraso." : "Parece que a página travou."}`); }
        });
        show("inp", worst);
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });
    } else { none("inp", "Este navegador não mede o INP. Abra a página no Chrome ou Edge para ver o seu."); if (out) out.textContent = "Este navegador não informa o tempo de reação."; }
    // botões de teste
    let clicks = 0;
    const busy = (ms) => { const t = performance.now(); while (performance.now() - t < ms) { /* ocupa o processador de propósito */ } };
    $(".tap-ok")?.addEventListener("click", (e) => { clicks++; e.currentTarget.firstChild.textContent = `Clique normal (${clicks}) `; });
    $(".tap-slow")?.addEventListener("click", (e) => { busy(350); clicks++; e.currentTarget.firstChild.textContent = `Clique num site travado (${clicks}) `; });
  };

  const boot = () => { initHero(); initTrip(); initFiles(); initVitals(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
