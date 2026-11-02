/* Guia 04 · IA com segurança
   hero em partículas, jogo "posso colar?", anonimizador local com volta dos dados, checagem de frases e checklist.
   Nada do que a pessoa escreve sai do navegador. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, rectPoints, heroBox, boxText, onVisible, reduced, copy, toast } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ---------- hero ---------- */
  const ring = (cx, cy, r1, r2, step) => { const pts = []; for (let y = cy - r2; y <= cy + r2; y += step) for (let x = cx - r2; x <= cx + r2; x += step) { const d = Math.hypot(x - cx, y - cy); if (d >= r1 && d <= r2) pts.push([x, y]); } return pts; };
  const thickLine = (x1, y1, x2, y2, t, step) => { const pts = [], len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len; for (let s = 0; s <= len; s += step) for (let u = -t / 2; u <= t / 2; u += step) pts.push([x1 + ux * s - uy * u, y1 + uy * s + ux * u]); return pts; };
  const initHero = () => {
    const canvas = $(".lx-field canvas"), stage = $(".lx-stage");
    const LABELS = ["01 · Dado pessoal", "02 · Escondido", "03 · Protegido", "04 · Conferido"];
    const st = (w) => (w < 700 ? 3.8 : 3.2);
    const shapes = [
      (w, h) => { const b = heroBox(w, h); return boxText("123.456.789-00", w, h, b, { size: b.h * 0.44, family: "ui-monospace, Menlo, Consolas, monospace", weight: 400, tracking: 0 }); },
      (w, h) => { const b = heroBox(w, h); return boxText("•••.•••.•••-••", w, h, b, { size: b.h * 0.44, family: "ui-monospace, Menlo, Consolas, monospace", weight: 400, tracking: 0 }); },
      (w, h) => {
        const b = heroBox(w, h), s = Math.min(b.w * 0.5, b.h * 0.86), cx = b.x + b.w / 2, top = b.y + b.h / 2 - s / 2;
        const bw = s * 0.78, bh = s * 0.5, by = top + s * 0.5, r = bw * 0.3, t = s * 0.07, kx = cx, ky = by + bh * 0.42;
        const body = rectPoints([[cx - bw / 2, by, bw, bh]], st(w)).filter(([x, y]) => Math.hypot(x - kx, y - ky) > s * 0.06 && !(Math.abs(x - kx) < s * 0.025 && y > ky && y < ky + bh * 0.3));
        const arc = ring(cx, by - s * 0.04, r - t / 2, r + t / 2, st(w)).filter(([, y]) => y < by - s * 0.04);
        const legs = thickLine(cx - r, by - s * 0.04, cx - r, by, t, st(w)).concat(thickLine(cx + r, by - s * 0.04, cx + r, by, t, st(w)));
        return body.concat(arc, legs);
      },
      (w, h) => {
        const b = heroBox(w, h), s = Math.min(b.w * 0.55, b.h * 0.9), cx = b.x + b.w / 2 - s * 0.12, cy = b.y + b.h / 2 - s * 0.12, r = s * 0.3, t = s * 0.07;
        return ring(cx, cy, r - t / 2, r + t / 2, st(w)).concat(thickLine(cx + r * 0.72, cy + r * 0.72, cx + r * 1.65, cy + r * 1.65, t * 1.3, st(w)));
      }
    ];
    MPField(canvas, { shapes, hold: 3600, onShape: (i) => { if (stage) stage.textContent = LABELS[i]; } });
  };

  /* ---------- 01 · posso colar? ---------- */
  const CASES = [
    { q: "Uma notícia pública que você quer resumir.", a: "ok", why: "Informação pública não expõe ninguém. Pode colar à vontade." },
    { q: "A planilha de clientes da empresa, com nomes e telefones.", a: "no", why: "São dados pessoais de terceiros, e pela LGPD a empresa responde pelo que faz com eles. Use dados fictícios ou anonimize antes." },
    { q: "O seu currículo, para melhorar o texto.", a: "care", why: "O conteúdo profissional pode ir. Tire telefone, endereço e documentos antes, porque a IA não precisa deles para revisar o texto." },
    { q: "A senha do Wi-Fi do escritório, para a IA explicar um erro.", a: "no", why: "Senha nunca vai para a IA, nem para pedir ajuda. Descreva o erro sem ela." },
    { q: "Um e-mail interno do seu chefe com o faturamento do mês.", a: "care", why: "É informação da empresa. Só em ferramenta aprovada pelo seu trabalho e, de preferência, trocando os números por exemplos." },
    { q: "A foto de um exame médico seu, para entender os termos.", a: "care", why: "Dado de saúde é sensível. A decisão é sua: apague nome e documento da imagem e confirme o que entendeu com o seu médico." },
    { q: "Um trecho de código com a chave da API dentro.", a: "no", why: "Chaves e tokens dão acesso direto a sistemas e contas. Troque por um valor falso, como SUA_CHAVE_AQUI, antes de colar." },
    { q: "Uma dúvida de português: quando usar crase?", a: "ok", why: "Não tem dado de ninguém. É o tipo de uso em que a IA mais ajuda." }
  ];
  const ANS = { ok: "Pode", care: "Com cuidado", no: "Não cole" };
  const initGame = () => {
    const root = $(".game");
    if (!root) return;
    const step = $(".game-step", root), dots = $(".game-dots", root), score = $(".game-score", root), q = $(".game-q", root), fb = $(".game-fb", root), next = $(".game-next", root), optsBox = $(".game-opts", root), opts = $$(".game-opt", root);
    let i = 0, ok = 0, res = [];
    const N = CASES.length;
    const paint = () => { dots.textContent = ""; for (let k = 0; k < N; k++) { const d = el("i"); if (res[k] === true) d.className = "is-ok"; else if (res[k] === false) d.className = "is-no"; else if (k === i) d.className = "is-now"; dots.append(d); } score.textContent = ok === 1 ? "1 acerto" : `${ok} acertos`; };
    const show = () => {
      const c = CASES[i];
      step.textContent = `Situação ${i + 1} de ${N}`;
      q.classList.remove("is-new"); void q.offsetWidth; q.classList.add("is-new");
      q.textContent = c.q; fb.textContent = ""; next.hidden = true; optsBox.hidden = false;
      opts.forEach((o) => { o.disabled = false; o.classList.remove("is-right", "is-wrong"); });
      paint();
    };
    opts.forEach((o) => o.addEventListener("click", () => {
      const c = CASES[i], right = o.dataset.a === c.a;
      res[i] = right; if (right) ok++;
      opts.forEach((x) => { x.disabled = true; if (x.dataset.a === c.a) x.classList.add("is-right"); });
      if (!right) o.classList.add("is-wrong");
      fb.textContent = "";
      const b = el("b", "", right ? "Isso. " : `A resposta é: ${ANS[c.a]}. `);
      fb.append(b, document.createTextNode(c.why));
      next.hidden = false; next.firstChild.textContent = i === N - 1 ? "Ver resultado " : "Próxima ";
      paint(); next.focus({ preventScroll: true });
    }));
    const end = () => {
      step.textContent = "Resultado"; i = N; paint();
      q.textContent = "";
      const box = el("span", "game-end"), big = el("b", "", `${ok}/${N}`);
      const msg = el("span", "", ok >= 7 ? "Você já usa IA com cuidado. Passe este teste para o seu time." : ok >= 5 ? "Bom caminho. Os casos com cuidado são os que mais confundem." : "Vale reler os motivos. O anonimizador logo abaixo resolve a maior parte.");
      box.append(big, msg); q.append(box);
      optsBox.hidden = true; fb.textContent = "";
      next.hidden = false; next.firstChild.textContent = "Jogar de novo ";
    };
    next.addEventListener("click", () => { if (i >= N) { i = 0; ok = 0; res = []; show(); return; } i++; if (i >= N) end(); else show(); });
    show();
  };

  /* ---------- 02 · anonimizador ---------- */
  const UP = "A-ZÁÉÍÓÚÂÊÔÃÕÇÀÜ", LO = "a-záéíóúâêôãõçàü";
  const RULES = [
    { kind: "contato", label: "E-MAIL", re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g },
    { kind: "doc", label: "CNPJ", re: /\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g },
    { kind: "doc", label: "CPF", re: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{11}\b/g },
    { kind: "cartao", label: "CARTÃO", re: /\b(?:\d{4}[ .-]?){3}\d{1,4}\b/g },
    { kind: "contato", label: "TELEFONE", re: /(?:\+?55\s?)?(?:\(\d{2}\)\s?|\b\d{2}\s)?9?\d{4}[-\s]?\d{4}\b/g },
    { kind: "endereco", label: "CEP", re: /\b\d{5}-?\d{3}\b/g },
    { kind: "endereco", label: "ENDEREÇO", re: new RegExp(`\\b(?:Rua|R\\.|Avenida|Av\\.|Travessa|Alameda|Estrada|Rodovia|Praça|Largo)\\s+[^,\\n]{2,60}?(?:,\\s*(?:n[ºo°.]\\s*)?\\d+[A-Za-z]?)?(?=[,.;\\n)]|$)`, "g") },
    { kind: "nome", label: "NOME", re: new RegExp(`\\b[${UP}][${LO}]+(?:\\s+(?:d[aeo]s?\\s+|e\\s+)?[${UP}][${LO}]+)+`, "g") }
  ];
  const SKIP_NAMES = /^(Oi|Olá|Ola|Bom|Boa|Prezad[ao]s?|Caro|Cara|Querid[ao]|Obrigad[ao]|Atenciosamente|Abraços?|Segunda|Terça|Quarta|Quinta|Sexta|Sábado|Domingo|Janeiro|Fevereiro|Março|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\b/;
  const SAMPLE = "Oi, preciso responder a cliente Mariana Costa Ribeiro (CPF 123.456.789-09, e-mail mariana.ribeiro@email.com, celular (12) 98765-4321). Ela mora na Rua das Acácias, 120, CEP 12245-000, e pagou com o cartão 4111 1111 1111 1111.\n\nO pedido foi feito pela Padaria Pão Bom, CNPJ 12.345.678/0001-90, e o entregador Carlos Eduardo Lima avisou que vai atrasar dois dias.\n\nEscreva uma resposta educada para ela explicando o atraso.";
  const initAnon = () => {
    const input = $("#anon-in"), out = $(".anon-out"), count = $(".anon-count"), reply = $("#anon-reply"), restored = $(".anon-restored");
    if (!input || !out) return;
    const on = new Set(["nome", "doc", "contato", "endereco", "cartao"]);
    let map = new Map(), safe = "";
    const run = () => {
      const text = input.value;
      const found = [];
      RULES.forEach((r) => {
        if (!on.has(r.kind)) return;
        r.re.lastIndex = 0; let m;
        while ((m = r.re.exec(text))) {
          const s = m.index, e = s + m[0].length;
          if (r.label === "NOME" && SKIP_NAMES.test(m[0])) {
            // "Oi Maria Souza": pula só a saudação
            const rest = m[0].replace(SKIP_NAMES, "").replace(/^\s+/, "");
            if (rest.split(/\s+/).length < 2) continue;
            const off = m[0].length - rest.length;
            if (!found.some((f) => s + off < f.e && e > f.s)) found.push({ s: s + off, e, v: rest, label: r.label });
            continue;
          }
          if (!found.some((f) => s < f.e && e > f.s)) found.push({ s, e, v: m[0], label: r.label });
        }
      });
      found.sort((a, b) => a.s - b.s);
      const byVal = new Map(), n = {};
      map = new Map();
      found.forEach((f) => {
        const key = f.label + "|" + f.v.toLowerCase();
        if (!byVal.has(key)) { n[f.label] = (n[f.label] || 0) + 1; const tag = `[${f.label} ${n[f.label]}]`; byVal.set(key, tag); map.set(tag, f.v); }
        f.tag = byVal.get(key);
      });
      out.textContent = ""; safe = ""; let last = 0;
      found.forEach((f) => { const t = text.slice(last, f.s); out.append(t); safe += t; out.append(el("mark", "", f.tag)); safe += f.tag; last = f.e; });
      const tail = text.slice(last); out.append(tail); safe += tail;
      const k = found.length;
      count.textContent = k === 1 ? "1 dado escondido" : `${k} dados escondidos`;
      restore();
    };
    const restore = () => {
      const t = reply.value;
      restored.textContent = "";
      if (!t.trim()) return;
      const re = /\[[A-ZÇÃÉ-]+ \d+\]/g;
      let last = 0, m;
      while ((m = re.exec(t))) { restored.append(t.slice(last, m.index)); const v = map.get(m[0]); restored.append(v ? el("mark", "", v) : m[0]); last = m.index + m[0].length; }
      restored.append(t.slice(last));
    };
    let tm = 0;
    input.addEventListener("input", () => { clearTimeout(tm); tm = setTimeout(run, 120); });
    reply.addEventListener("input", restore);
    $$(".anon-kinds .chip").forEach((c) => c.addEventListener("click", () => {
      const k = c.dataset.kind; if (on.has(k)) on.delete(k); else on.add(k);
      c.classList.toggle("is-on", on.has(k)); c.setAttribute("aria-pressed", on.has(k) ? "true" : "false"); run();
    }));
    $(".anon-sample")?.addEventListener("click", () => { input.value = SAMPLE; run(); reply.value = "Olá, [NOME 1]! Pedimos desculpas pelo atraso no seu pedido. O entregador [NOME 3] nos avisou que a entrega chega em dois dias, no endereço [ENDEREÇO 1]. Qualquer dúvida, responda este e-mail."; restore(); });
    $(".anon-copy")?.addEventListener("click", () => { if (!safe.trim()) { toast("Cole um texto primeiro"); return; } copy(safe, "Texto seguro copiado"); });
    $(".anon-copy-back")?.addEventListener("click", () => { const t = restored.textContent; if (!t.trim()) { toast("Cole a resposta da IA primeiro"); return; } copy(t, "Resposta copiada"); });
    input.value = SAMPLE; run();
  };

  /* ---------- 03 · checagem ---------- */
  const initCheck = () => {
    const root = $(".chk");
    if (!root) return;
    const claims = $$(".claim", root), fb = $(".chk-fb", root), count = $(".chk-count", root);
    const seen = new Set();
    claims.forEach((c, i) => c.addEventListener("click", () => {
      c.classList.add(c.dataset.v === "ok" ? "is-ok" : "is-no");
      seen.add(i);
      fb.textContent = "";
      const [head, ...rest] = c.dataset.why.split(":");
      fb.append(el("b", "", head + ":"), document.createTextNode(rest.join(":")));
      count.textContent = `${seen.size} de ${claims.length} conferidas`;
      if (seen.size === claims.length) fb.append(document.createTextNode(" Repare que a inventada é a mais específica de todas."));
    }));
    // fluxo de checagem acende em sequência quando aparece
    const flow = $(".sg-flow");
    if (flow) {
      const steps = $$(".lflow-step", flow), wire = $(".lflow-wire", flow);
      let done = false;
      onVisible(flow, (v) => {
        if (!v || done) return; done = true;
        steps.forEach((s, k) => setTimeout(() => { s.classList.add("is-on", "is-hit"); wire.style.setProperty("--p", String(k / (steps.length - 1))); }, reduced.matches ? 0 : 300 + k * 420));
      }, "-20% 0px");
    }
  };

  /* ---------- 04 · checklist ---------- */
  const initList = () => {
    const root = $(".cl");
    if (!root) return;
    const boxes = $$("input[type=checkbox]", root), done = $(".cl-done");
    const KEY = "upaiva-ia-seguranca-checklist";
    try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); boxes.forEach((b, i) => { b.checked = !!v[i]; }); } catch (_) { /* sem armazenamento */ }
    const upd = () => { done.textContent = `${boxes.filter((b) => b.checked).length} de ${boxes.length}`; try { localStorage.setItem(KEY, JSON.stringify(boxes.map((b) => b.checked))); } catch (_) { /* ok */ } };
    boxes.forEach((b) => b.addEventListener("change", upd));
    upd();
    $(".cl-print")?.addEventListener("click", () => window.print());
    $(".cl-copy")?.addEventListener("click", () => {
      const txt = $$(".cl-col", root).map((c) => `${$("h3", c).lastChild.textContent.trim()}\n` + $$("li span", c).map((s) => `[ ] ${s.textContent.trim()}`).join("\n")).join("\n\n");
      copy(`IA com segurança (upaiva.dev/ia-com-seguranca)\n\n${txt}`, "Checklist copiado");
    });
  };

  const boot = () => { initHero(); initGame(); initAnon(); initCheck(); initList(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
