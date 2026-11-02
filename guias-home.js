/* Home · vitrine dos guias "Entenda a IA".
   Cada card desenha em partículas a forma do seu guia (a mesma base dos guias, learn.js).
   No computador a forma muda ao passar o mouse ou focar o card; no celular ela só se monta ao aparecer.
   Cada campo só anima enquanto aparece na tela. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, rectPoints, outlinePoints, boxText, finePointer } = L;

  // área útil do card, com respiro nas bordas
  const B = (w, h) => ({ x: w * 0.12, y: h * 0.16, w: w * 0.76, h: h * 0.68 });
  const st = (w) => (w < 260 ? 2.4 : 2.8);

  const ring = (cx, cy, r1, r2, step) => { const pts = []; for (let y = cy - r2; y <= cy + r2; y += step) for (let x = cx - r2; x <= cx + r2; x += step) { const d = Math.hypot(x - cx, y - cy); if (d >= r1 && d <= r2) pts.push([x, y]); } return pts; };
  const path = (pts, t, step) => {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
      for (let s = 0; s <= len; s += step) for (let u = -t / 2; u <= t / 2; u += step) out.push([x1 + ux * s - uy * u, y1 + uy * s + ux * u]);
    }
    return out;
  };
  const polyFill = (poly, step) => {
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]), pts = [];
    const inside = (x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    for (let y = Math.min(...ys); y <= Math.max(...ys); y += step) for (let x = Math.min(...xs); x <= Math.max(...xs); x += step) if (inside(x, y)) pts.push([x, y]);
    return pts;
  };
  const word = (str, o = {}) => (w, h) => { const b = B(w, h); return boxText(str, w, h, b, Object.assign({ size: b.h * 0.62, step: st(w) }, o)); };

  const SHAPES = {
    // 01 · a pergunta vira tokens
    ia: [
      (w, h) => { const b = B(w, h); return boxText("?", w, h, b, { size: b.h * 1.05, step: st(w) }); },
      (w, h) => {
        const b = B(w, h), rows = [[1, 1.6, 0.9], [1.7, 1.1]], ch = Math.min(b.h * 0.3, 40), gap = ch * 0.3, y0 = b.y + b.h / 2 - ch - gap / 2, chips = [], fills = [];
        rows.forEach((row, ri) => {
          const tot = row.reduce((s, k) => s + k, 0), span = b.w - gap * (row.length - 1);
          let x = b.x;
          row.forEach((k) => {
            const cw = span * k / tot, y = y0 + ri * (ch + gap);
            chips.push([x, y, cw, ch]);
            fills.push([x + ch * 0.32, y + ch * 0.42, Math.max(5, cw * 0.42), ch * 0.16]);
            x += cw + gap;
          });
        });
        return outlinePoints(chips, st(w), ch * 0.26).concat(rectPoints(fills, st(w)));
      }
    ],
    // 02 · as seis partes do pedido viram uma resposta certa
    prompts: [
      (w, h) => {
        const b = B(w, h), K = [0.55, 0.92, 0.78, 0.66, 0.5, 0.84], bh = Math.min(b.h / 11, 14), gap = bh * 0.9, y0 = b.y + b.h / 2 - (K.length * bh + (K.length - 1) * gap) / 2, rects = [];
        K.forEach((k, i) => { const y = y0 + i * (bh + gap); rects.push([b.x, y, bh, bh], [b.x + bh * 1.8, y, (b.w - bh * 1.8) * k, bh]); });
        return rectPoints(rects, st(w));
      },
      (w, h) => {
        const b = B(w, h), s = Math.min(b.w, b.h) * 0.95, x0 = b.x + b.w / 2 - s / 2, y0 = b.y + b.h / 2 - s / 2;
        return path([[x0 + s * 0.08, y0 + s * 0.52], [x0 + s * 0.38, y0 + s * 0.82], [x0 + s * 0.94, y0 + s * 0.16]], Math.max(9, s * 0.09), st(w));
      }
    ],
    // 03 · termos do glossário
    glossario: [word("LLM"), word("RAG")],
    // 04 · o dado fica protegido
    seguranca: [
      (w, h) => {
        const b = B(w, h), s = Math.min(b.w * 0.8, b.h), cx = b.x + b.w / 2, top = b.y + b.h / 2 - s / 2;
        const bw = s * 0.74, bh = s * 0.5, by = top + s * 0.48, r = bw * 0.3, t = s * 0.09, kx = cx, ky = by + bh * 0.42, step = st(w);
        const body = rectPoints([[cx - bw / 2, by, bw, bh]], step).filter(([x, y]) => Math.hypot(x - kx, y - ky) > s * 0.065 && !(Math.abs(x - kx) < s * 0.03 && y > ky && y < ky + bh * 0.32));
        const arc = ring(cx, by - s * 0.04, r - t / 2, r + t / 2, step).filter(([, y]) => y < by - s * 0.04);
        const legs = path([[cx - r, by - s * 0.05], [cx - r, by]], t, step).concat(path([[cx + r, by - s * 0.05], [cx + r, by]], t, step));
        return body.concat(arc, legs);
      },
      word("•••-••", { family: "ui-monospace, Menlo, Consolas, monospace", weight: 400, tracking: 0 })
    ],
    // 05 · o clique vira página
    clique: [
      (w, h) => {
        const b = B(w, h), s = b.h, x0 = b.x + b.w / 2 - s * 0.26, y0 = b.y;
        return polyFill([[0, 0], [0, 0.74], [0.17, 0.58], [0.3, 0.88], [0.42, 0.83], [0.29, 0.54], [0.52, 0.54]].map(([x, y]) => [x0 + x * s, y0 + y * s]), st(w));
      },
      (w, h) => {
        const b = B(w, h), pw = Math.min(b.w, b.h * 1.45), ph = Math.min(b.h, pw * 0.72), x = b.x + b.w / 2 - pw / 2, y = b.y + b.h / 2 - ph / 2, g = pw * 0.04, step = st(w);
        const blocks = [[x, y, pw, ph * 0.08], [x, y + ph * 0.15, pw * 0.62, ph * 0.12], [x, y + ph * 0.32, pw * 0.44, ph * 0.06], [x, y + ph * 0.45, pw, ph * 0.26]];
        const cw = (pw - g * 2) / 3; [0, 1, 2].forEach((i) => blocks.push([x + i * (cw + g), y + ph * 0.77, cw, ph * 0.23]));
        return outlinePoints(blocks.slice(3), step, 5).concat(rectPoints(blocks.slice(0, 3), step));
      }
    ]
  };

  const init = () => {
    document.querySelectorAll(".guide-card[data-guide]").forEach((card) => {
      const shapes = SHAPES[card.dataset.guide], canvas = card.querySelector(".guide-viz canvas");
      if (!shapes || !canvas) return;
      const small = window.innerWidth < 700;
      const field = MPField(canvas, { shapes, count: small ? 300 : 420, pointerHost: card, drift: 0.6 });
      if (!field) return;
      // a forma fica parada; no computador ela muda no hover ou no foco do teclado
      field.show(0);
      if (!finePointer.matches) return;
      const on = () => field.show(1), off = () => field.show(0);
      card.addEventListener("pointerenter", on);
      card.addEventListener("pointerleave", off);
      card.addEventListener("focus", on);
      card.addEventListener("blur", off);
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
