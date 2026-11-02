/* Guia 07 · Golpes com IA
   hero em partículas, jogo "golpe ou não?" com os sinais acesos no texto, detector local de sinais
   e gerador de palavra-segura. Nada do que é digitado sai do navegador. */
(() => {
  "use strict";
  const L = window.MPLearn;
  if (!L) return;
  const { MPField, rectPoints, pathPoints, heroBox, boxText, onVisible, copy, reduced } = L;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  /* ---------- hero ---------- */
  const initHero = () => {
    const canvas = $(".lx-field canvas"), stage = $(".lx-stage");
    const LABELS = ["01 · Uma voz conhecida", "02 · Um pedido urgente", "03 · Um pagamento", "04 · Você confere"];
    const st = (w) => (w < 700 ? 3.8 : 3.2);
    const shapes = [
      // a voz: ondas de áudio
      (w, h) => {
        const b = heroBox(w, h), n = w < 700 ? 17 : 25, gap = b.w / n, bw = Math.max(4, gap * 0.42), cy = b.y + b.h / 2, rects = [];
        for (let i = 0; i < n; i++) {
          const t = i / (n - 1), env = Math.sin(Math.PI * t), wob = 0.55 + 0.45 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6));
          const bh = Math.max(bw, b.h * 0.86 * env * wob);
          rects.push([b.x + i * gap + (gap - bw) / 2, cy - bh / 2, bw, bh]);
        }
        return rectPoints(rects, st(w));
      },
      (w, h) => { const b = heroBox(w, h); return boxText("URGENTE", w, h, b, { size: b.h * 0.34 }); },
      (w, h) => { const b = heroBox(w, h); return boxText("R$", w, h, b, { size: b.h * 0.7 }); },
      // o escudo de quem confere
      (w, h) => {
        const b = heroBox(w, h), s = Math.min(b.w * 0.8, b.h * 0.92), x0 = b.x + b.w / 2 - s * 0.42, y0 = b.y + b.h / 2 - s / 2, k = st(w);
        const P = (x, y) => [x0 + x * s * 0.84, y0 + y * s];
        const outline = [P(0.5, 0), P(0.94, 0.14), P(0.94, 0.48)];
        for (let i = 1; i <= 8; i++) { const t = i / 8; outline.push(P(0.94 - 0.44 * t * t, 0.48 + 0.52 * t)); }
        for (let i = 1; i <= 8; i++) { const t = i / 8; outline.push(P(0.5 - 0.44 * (2 * t - t * t), 1 - 0.52 * t)); }
        outline.push(P(0.06, 0.14), P(0.5, 0));
        const tk = Math.max(5, s * 0.03);
        return pathPoints(outline, tk, k).concat(pathPoints([P(0.3, 0.5), P(0.45, 0.65), P(0.72, 0.36)], Math.max(10, s * 0.06), k));
      }
    ];
    MPField(canvas, { shapes, hold: 3600, onShape: (i) => { if (stage) stage.textContent = LABELS[i]; } });
  };

  /* ---------- 02 · golpe ou não? ----------
     [[trecho|sinal]] marca um sinal de golpe que acende depois da resposta */
  const CASES = [
    { from: "+55 11 9 8812-0437", ch: "WhatsApp · número desconhecido", scam: true,
      msgs: ["Oi mãe, [[troquei de número|Número novo]], salva esse aqui", "Tô com um problema, preciso pagar um boleto [[hoje|Pressa]] e [[meu app do banco travou|Desculpa]]", "[[Faz um Pix de R$ 1.800|Dinheiro]] pra essa chave? Te devolvo amanhã"],
      title: "Golpe do número novo.",
      why: "Antes de qualquer Pix, ligue para o número antigo do seu filho ou faça uma pergunta que só ele sabe responder. É o golpe mais comum no WhatsApp." },
    { from: "BANCO", ch: "SMS", scam: true,
      msgs: ["BANCO: Compra de R$ 2.349,90 aprovada no seu cartão final 4410. Não reconhece? [[Ligue agora|Pressa]] para [[0800 591 2210|Número deles]]"],
      title: "Falsa central por SMS.",
      why: "O número da mensagem leva a uma central falsa, que vai pedir seus dados para “cancelar a compra”. Para conferir, ligue no número do verso do cartão ou abra o app do banco." },
    { from: "Lucas (filho)", ch: "Ligação · número desconhecido", scam: true, call: true,
      msgs: ["Pai, sou eu. Bati o carro, tô na delegacia e preciso de [[R$ 3.000 pro advogado|Dinheiro]] [[agora|Pressa]]. [[Não conta pra mãe|Segredo]], por favor."],
      title: "Voz clonada.",
      why: "A voz pode ser idêntica e mesmo assim não ser do seu filho. Desligue e ligue de volta para o número que você já tem salvo, ou peça a palavra-segura da família." },
    { from: "Loja Aurora", ch: "WhatsApp · conta comercial", scam: false,
      msgs: ["Oi! Seu pedido #48213 saiu para entrega e chega amanhã.", "Para acompanhar, abra o app da loja ou o site, na área Meus pedidos."],
      title: "Parece normal.",
      why: "Não pede dinheiro, código, nem que você clique num link estranho. Mesmo assim, o caminho mais seguro é sempre conferir pelo app ou pelo site que você já usa." },
    { from: "Recrutamento Online", ch: "WhatsApp · número desconhecido", scam: true,
      msgs: ["Parabéns! Você foi selecionado para uma vaga home office.", "[[Ganhe R$ 250 por dia só curtindo vídeos|Bom demais]].", "Para liberar seu cadastro, [[pague a taxa de R$ 49,90|Dinheiro]]."],
      title: "Golpe da vaga fácil.",
      why: "Emprego de verdade não cobra para você começar. Os primeiros “ganhos” costumam ser pagos para criar confiança antes de um pedido maior." },
    { from: "Patrocinado", ch: "Instagram · anúncio", scam: true, ad: true,
      msgs: ["[[Apresentador famoso|Rosto conhecido]]: “Descobri uma plataforma que [[rende 3% ao dia|Bom demais]]. Cadastre-se [[antes que as vagas acabem|Pressa]].”"],
      title: "Vídeo falso de famoso.",
      why: "Rosto e voz de famosos são fáceis de imitar com IA. Nenhum investimento sério rende 3% ao dia: isso passaria de 1.000% em um ano." },
    { from: "Clínica Vida", ch: "SMS", scam: false,
      msgs: ["Clínica Vida: sua consulta é quinta, às 14h, com a Dra. Paula. Responda 1 para confirmar ou 2 para remarcar."],
      title: "Parece normal.",
      why: "Não pede dados, dinheiro nem clique em link. Responder 1 ou 2 é um padrão comum de confirmação. Se tiver dúvida, ligue para a clínica." },
    { from: "Central de Segurança", ch: "Ligação · 0800", scam: true, call: true,
      msgs: ["Detectamos um [[acesso suspeito na sua conta|Medo]]. Para bloquear, vou enviar um código por SMS e [[preciso que você me informe|Código]]."],
      title: "Falso atendente.",
      why: "Nenhum banco pede código por telefone. Esse código é a chave para entrar na sua conta ou no seu WhatsApp. Desligue e ligue para o número oficial." }
  ];
  const fill = (node, str) => {
    // monta o texto com os sinais em spans, sem usar innerHTML
    const re = /\[\[([^|\]]+)\|([^\]]+)\]\]/g;
    let last = 0, m;
    while ((m = re.exec(str))) {
      if (m.index > last) node.append(document.createTextNode(str.slice(last, m.index)));
      const s = el("span", "gq-f", m[1]); s.dataset.l = m[2]; node.append(s);
      last = re.lastIndex;
    }
    if (last < str.length) node.append(document.createTextNode(str.slice(last)));
  };
  const initQuiz = () => {
    const root = $(".gq");
    if (!root) return;
    const from = $(".gq-from", root), ch = $(".gq-ch", root), msgs = $(".gq-msgs", root), n = $(".gq-n", root), score = $(".gq-score", root);
    const q = $(".gq-q", root), acts = $(".gq-actions", root), fb = $(".gq-fb", root), verdict = $(".gq-verdict", root), title = $(".gq-title", root), flags = $(".gq-flags", root), why = $(".gq-why", root), next = $(".gq-next", root);
    let i = 0, hits = 0;
    const show = () => {
      const c = CASES[i];
      root.classList.remove("is-shown");
      n.textContent = `Mensagem ${i + 1} de ${CASES.length}`;
      from.textContent = c.from; ch.textContent = c.ch;
      msgs.textContent = "";
      c.msgs.forEach((t, k) => { const m = el("p", "gq-msg" + (c.call ? " is-call" : "") + (c.ad ? " is-ad" : "")); m.style.setProperty("--i", k); fill(m, t); msgs.append(m); });
      q.textContent = "É golpe?"; q.hidden = false; acts.hidden = false; fb.hidden = true;
    };
    const answer = (sayScam) => {
      const c = CASES[i], ok = sayScam === c.scam;
      if (ok) hits++;
      score.textContent = hits === 1 ? "1 acerto" : `${hits} acertos`;
      root.classList.add("is-shown");
      acts.hidden = true; q.hidden = true; fb.hidden = false;
      verdict.textContent = ok ? "Você acertou" : "Não foi dessa vez";
      title.textContent = c.title;
      flags.textContent = "";
      $$(".gq-f", msgs).forEach((f) => flags.append(el("li", null, f.dataset.l)));
      why.textContent = c.why;
      next.innerHTML = "";
      next.append(document.createTextNode(i < CASES.length - 1 ? "Próxima " : "Ver resultado "));
      const ar = el("i", "arrow"); ar.setAttribute("aria-hidden", "true"); next.append(ar);
      next.focus({ preventScroll: true });
    };
    const finish = () => {
      root.classList.remove("is-shown");
      n.textContent = "Resultado";
      from.textContent = "Seu treino"; ch.textContent = `${hits} de ${CASES.length} acertos`;
      msgs.textContent = "";
      ["Todo golpe pede uma destas três coisas: dinheiro, um código ou acesso ao seu celular.", "Quando aparecer um desses pedidos com pressa, pare e confirme por outro canal."].forEach((t, k) => { const m = el("p", "gq-msg"); m.style.setProperty("--i", k); m.textContent = t; msgs.append(m); });
      q.textContent = hits >= 7 ? "Olho treinado." : hits >= 5 ? "Bom, mas atenção." : "Vale treinar de novo.";
      q.hidden = false; acts.hidden = true; fb.hidden = false;
      verdict.textContent = `${hits} de ${CASES.length}`;
      title.textContent = ""; flags.textContent = ""; why.textContent = "Mande este guia para quem mais recebe esse tipo de mensagem na sua família.";
      next.textContent = "Recomeçar";
      i = CASES.length;
    };
    $(".gq-yes", root).addEventListener("click", () => answer(true));
    $(".gq-no", root).addEventListener("click", () => answer(false));
    next.addEventListener("click", () => {
      if (i >= CASES.length) { i = 0; hits = 0; score.textContent = "0 acertos"; show(); return; }
      i++;
      if (i >= CASES.length) finish(); else show();
    });
    show();
  };

  /* ---------- 03 · detector ---------- */
  const SIGNS = [
    { k: "Dinheiro", w: 22, re: /\b(pix|transfer[eêiaou]\w*|dep[oó]sit\w*|boleto|pag(ue|ar|amento)\w*|taxa|empr[eé]stimo|dinheiro)\b|r\$\s?\d+(?:[.,]\d+)*/gi, t: "Pede pagamento, transferência ou taxa." },
    { k: "Código ou senha", w: 26, re: /\b(c[oó]digo|senha|token|cvv|c[oó]digo de verifica[cç][aã]o)\b/gi, t: "Pede um código, senha ou token. Isso nunca se passa a ninguém." },
    { k: "Número novo", w: 20, re: /troquei de (n[uú]mero|celular|chip)|(n[uú]mero|celular|chip) novo|novo (n[uú]mero|celular)|salva (esse|este) (n[uú]mero|aqui)/gi, t: "Alguém conhecido falando de um número que você não tem salvo." },
    { k: "Segredo", w: 18, re: /n[aã]o (conta|fala|fale|conte) (pra|para|pr[ao]) \p{L}+|s[oó] entre n[oó]s|segredo|sigilo/giu, t: "Pede para você não contar a ninguém, o que impede a checagem." },
    { k: "Pressa", w: 16, re: /\b(urgente|urg[eê]ncia|agora|hoje|imediat\w*|r[aá]pido|depressa|[uú]ltim[ao]s? (horas|vagas|chance)|antes que|expira\w*)\b/gi, t: "Cria pressa para você agir antes de pensar." },
    { k: "Medo", w: 14, re: /\b(bloque\w*|suspens\w*|suspeit\w*|fraude|invadid\w*|pol[ií]cia|delegacia|pres[oa]|multa|processo|acidente|bati o carro|hospital|sequestr\w*)\b/gi, t: "Usa susto ou ameaça para tirar a sua calma." },
    { k: "Bom demais", w: 18, re: /\b(gr[aá]tis|pr[eê]mio|ganhou|sorteado|sorteio|lucro garantido|renda extra|sem risco|rende \d+)|\d+ ?% ao (dia|m[eê]s)|r\$ ?\d+ por dia/gi, t: "Promete ganho fácil, prêmio ou rendimento alto demais." },
    { k: "Link", w: 12, re: /https?:\/\/\S+|www\.\S+|\b\S+\.(com|net|xyz|site|online|info|top|ly)(\.br)?\/\S*|\bclique\b|acesse o link/gi, t: "Traz um link. Prefira digitar o endereço oficial ou abrir o app." },
    { k: "Acesso ao celular", w: 26, re: /\b(anydesk|teamviewer|acesso remoto|compartilh\w* (a )?tela|instal\w* (o |um )?(app|aplicativo)|baix\w* (o |um )?(app|aplicativo))\b/gi, t: "Pede para instalar um app ou mostrar a tela. Com isso, eles controlam o celular." }
  ];
  const SAMPLE = "Oi, é a Ju! Troquei de número, salva esse. Tô com um problema e preciso pagar um boleto de R$ 1.200 hoje, meu app travou. Consegue fazer um Pix pra mim agora? Não conta pra mãe, depois te explico. Te devolvo amanhã!";
  const initDetector = () => {
    const root = $(".dt");
    if (!root) return;
    const ta = $(".dt-text", root), meter = $(".dt-meter", root), pct = $(".dt-pct", root), v = $(".dt-v", root), list = $(".dt-list", root), mirror = $(".dt-mirror", root);
    let timer = 0;
    const run = () => {
      const txt = ta.value;
      const ranges = [], found = [];
      SIGNS.forEach((s) => {
        s.re.lastIndex = 0;
        let m, hit = false;
        while ((m = s.re.exec(txt))) { if (!m[0]) { s.re.lastIndex++; continue; } ranges.push([m.index, m.index + m[0].length, s.k]); hit = true; }
        if (hit) found.push(s);
      });
      const score = Math.min(100, found.reduce((a, s) => a + s.w, 0) + (found.length >= 3 ? 10 : 0));
      meter.style.setProperty("--p", String(score / 100));
      pct.textContent = `${score} de 100`;
      if (!txt.trim()) v.textContent = "Cole uma mensagem para começar.";
      else if (!found.length) v.textContent = "Nenhum sinal clássico encontrado.";
      else if (score < 30) v.textContent = "Atenção a um sinal.";
      else if (score < 60) v.textContent = "Suspeita. Confirme por outro canal.";
      else v.textContent = "Muito suspeita. Não pague, não passe código.";
      list.textContent = "";
      found.forEach((s, k) => { const li = el("li"); li.style.animationDelay = `${k * 70}ms`; li.append(el("b", null, s.k), el("span", null, s.t)); list.append(li); });
      // texto espelhado com os trechos marcados
      mirror.textContent = "";
      if (!found.length) return;
      ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
      let pos = 0;
      ranges.forEach(([a, b, k]) => {
        if (a < pos) return;
        if (a > pos) mirror.append(document.createTextNode(txt.slice(pos, a)));
        const mk = el("mark", null, txt.slice(a, b)); mk.title = k; mirror.append(mk); pos = b;
      });
      if (pos < txt.length) mirror.append(document.createTextNode(txt.slice(pos)));
    };
    ta.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 160); });
    $(".dt-sample", root).addEventListener("click", () => { ta.value = SAMPLE; run(); });
    $(".dt-clear", root).addEventListener("click", () => { ta.value = ""; run(); ta.focus(); });
    run();
  };

  /* ---------- 04 · plano da família ---------- */
  const A = ["tucano", "abacaxi", "girassol", "foguete", "pinguim", "violão", "farol", "cometa", "vulcão", "coqueiro", "balão", "cacto", "jacaré", "sorvete", "trem", "sapo", "chinelo", "relógio"];
  const B = ["listrado", "roxo", "gigante", "dourado", "tímido", "veloz", "gelado", "sonolento", "voador", "quadrado", "cheiroso", "careca", "xadrez", "azedo", "invisível", "banguela", "elétrico", "cantor"];
  const AVISO = "Combinado da família contra golpes:\n\n1. Se alguém ligar ou mandar mensagem pedindo dinheiro com pressa, mesmo com a voz ou o rosto de alguém daqui, a gente pede a palavra-segura antes de qualquer Pix.\n2. Na dúvida, desliga e liga de volta para o número que já está salvo.\n3. Código que chega por SMS não se passa para ninguém.\n\nA palavra-segura a gente combina pessoalmente, nunca por mensagem.\n\nGuia completo: https://upaiva.dev/golpes-com-ia";
  const initFamily = () => {
    const root = $(".pw");
    if (!root) return;
    const word = $(".pw-word", root);
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const gen = () => { let w; do { w = `${pick(A)} ${pick(B)}`; } while (w === word.textContent); word.textContent = w; word.classList.remove("is-new"); void word.offsetWidth; word.classList.add("is-new"); };
    $(".pw-new", root).addEventListener("click", gen);
    $(".pw-copy", root).addEventListener("click", () => copy(AVISO, "Aviso copiado, sem a palavra"));
    gen();
    // passos de "se cair num golpe" acendem em sequência
    const flow = $(".gp-flow");
    if (flow) {
      const steps = $$(".lflow-step", flow), wire = $(".lflow-wire", flow);
      let done = false;
      onVisible(flow, (vis) => {
        if (!vis || done) return; done = true;
        steps.forEach((s, k) => setTimeout(() => { s.classList.add("is-on", "is-hit"); wire.style.setProperty("--p", String(k / (steps.length - 1))); }, reduced.matches ? 0 : 300 + k * 380));
      }, "-20% 0px");
    }
  };

  const boot = () => { initHero(); initQuiz(); initDetector(); initFamily(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
