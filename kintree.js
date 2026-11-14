// Маленькое древо вокруг одного человека, сверху вниз: предки — над ним, братья и сёстры — в его ряду, дети — под ним.
// Клик по любому — шаг к нему. Одно и то же древо в карточке на карте и крупно на странице древа,
// поэтому оно не растёт с числом людей: видна только ближняя родня, остальное — шагами.
window.KINTREE = (() => {
  const U = window.KINUI, P = U.P, esc = U.esc;
  const born = id => P[id].by ?? Math.min(...(P[id].s || []).map(s => s[1]), 1e4) - 18;
  const byBirth = a => a.sort((x, y) => born(x) - born(y));
  const kidsOf = id => byBirth(Object.keys(P).filter(k => P[k].f === id || P[k].mo === id));
  const parent = id => P[id]?.f || P[id]?.r;
  const siblings = id => { const f = P[id].f; return f ? byBirth(Object.keys(P).filter(k => P[k].f === f)) : [id]; };
  const kiev = id => (P[id].s || []).some(s => s[0] === "Киев");
  const MALE = /^(Илья|Никита|Фома|Кузьма|Лука|Иона)$/;
  const female = id => { const w = P[id].n.split(/\s/)[0]; return /[ая]$/.test(w) && !MALE.test(w) || /^(Мария|Гита|Рогнеда|Предслава)/.test(P[id].n); };

  // лицо: портрет из титулярника, иначе рисованный силуэт — у всех одна тонировка
  function face(id) {
    const img = window.PORTRAITS?.[id];
    if (img) return `<img src="${img.src}" alt="">`;
    const k = kiev(id), w = female(id), steppe = U.rootB(P[id].b) === "steppe";
    const body = `<path d="M4,72C6,54 18,49 30,49C42,49 54,54 56,72Z" class="s1"/><rect x="26" y="40" width="8" height="10" class="s2"/>`;
    const head = w
      ? `<path d="M14,40C12,16 48,16 46,40L50,60C40,54 20,54 10,60Z" class="s3"/><ellipse cx="30" cy="31" rx="8.5" ry="10.5" class="s2"/>`
      : `<ellipse cx="30" cy="31" rx="9.5" ry="11.5" class="s2"/><path d="M21,35C22,48 38,48 39,35C36,41 24,41 21,35Z" class="s3"/>`
        + (steppe ? `<path d="M19,25L30,6L41,25Z" class="s3"/>`
          : `<path d="M19,24C19,11 41,11 41,24Z" class="s3"/><rect x="17.5" y="21" width="25" height="6" rx="3" class="s1"/>`
            + (k ? `<path d="M30,3V11M27,5.5H33" class="sx"/>` : ""));
    return `<svg viewBox="0 0 60 72" class="sil">${body}${head}</svg>`;
  }

  function node(id, up, cls = "") {
    if (!P[id]) return "";
    return `<a class="ktn ${cls}${kiev(id) ? " kv" : ""}" data-p="${id}"${up ? ` data-up="${up}"` : ""} style="--b:${U.col(id)}">`
      + `<span class="kf">${face(id)}</span><b>${esc(cls.includes("self") ? P[id].n : short(id))}</b><i>${esc(U.years(id))}</i>${seat(id) ? `<em>${esc(seat(id))}</em>` : ""}</a>`;
  }
  // в древе отчество у всех рядом одно и то же — его опускаем (полное имя — в подсказке при наведении)
  const short = id => P[id].n.split(/\s+/).filter((w, i) => !i || !/(вич|вна|ична)$/.test(w)).join(" ");
  // главный стол: Киев, если был; иначе первый
  const seat = id => { const s = P[id].s || []; const k = s.find(q => q[0] === "Киев"); return k ? "Киев" : s[0]?.[0] || ""; };
  const row = (cls, inner) => inner ? `<div class="ktr ${cls}">${inner}</div>` : "";

  // big: страница древа — вся цепочка до Рюрика и внуки столбиком под отцами
  function html(id, big) {
    const chain = U.chain(id).slice(0, -1); // предки по отцу, от старшего
    const f = parent(id), mo = P[id].mo;
    const shown = chain.slice(big ? -3 : -2); // выше — ссылкой «ещё N поколений», чтобы древо помещалось в экран
    const more = chain.length - shown.length;
    let h = more > 0 ? `<a class="ktup" data-p="${chain[more - 1]}">↑ ещё ${more} ${more === 1 ? "поколение" : more < 5 ? "поколения" : "поколений"} вверх · ${esc(P[chain[0]].n)}</a>` : "";
    shown.forEach((a, i) => {
      const last = a === f, up = shown[i - 1];
      // у предка видны его братья: кто был рядом в том поколении
      const bro = up && P[a].f ? siblings(a) : [a];
      h += row("up" + (last ? " par" : ""), bro.map(x => x === a ? node(a, up, "anc") + (last && mo ? `<span class="ktm">⚭</span>` + node(mo, null, "sm") : "") : node(x, up, "sm bro")).join(""));
    });
    if (!f && mo) h += row("up par", node(mo));
    const sib = P[id].f ? siblings(id) : [id];
    const up = f && P[id].f ? f : P[id].r || mo;
    const sp = (P[id].sp || []).filter(x => P[x]);
    // супруги — рядом с человеком, через ⚭
    h += row("me", sib.map(s => s === id ? node(s, up, "self") + sp.map(x => `<span class="ktm">⚭</span>` + node(x, null, "sm sp")).join("") : node(s, up, "sm")).join(""));
    const ch = kidsOf(id);
    if (ch.length) h += row("dn", ch.map(c => big
      ? `<div class="ktc">${node(c, id)}${kidsOf(c).map(g => node(g, null, "gk")).join("")}</div>`
      : node(c, id)).join(""));
    return `<div class="kt${big ? " big" : ""}"><svg class="ktl"></svg>${h}</div>`;
  }

  // связи меряются по готовой вёрстке: от низа родителя вниз, вбок и к верху ребёнка
  function lines(root) {
    const kt = root.querySelector(".kt"); if (!kt) return;
    const svg = kt.querySelector(".ktl"), R = kt.getBoundingClientRect();
    svg.setAttribute("width", kt.scrollWidth); svg.setAttribute("height", kt.scrollHeight);
    const box = e => { const r = e.querySelector(".kf").getBoundingClientRect(); return {x: r.left + r.width / 2 - R.left, t: r.top - R.top, b: e.getBoundingClientRect().bottom - R.top + 3}; }; // от низа подписи, не через неё
    // если дети не влезли в один ряд, ствол идёт по левому краю, чтобы не резать портреты верхнего ряда
    const kids = [...kt.querySelectorAll(".ktn[data-up]")], rowsOf = {};
    kids.forEach(e => { const t = Math.round(box(e).t); (rowsOf[e.dataset.up] = rowsOf[e.dataset.up] || new Set()).add(t); });
    svg.innerHTML = kids.map(e => {
      const p = kt.querySelector(`.ktn[data-p="${e.dataset.up}"]`); if (!p) return "";
      const a = box(p), c = box(e), mid = c.t - 9, st = e.classList.contains("bro") ? `class="bro"` : "";
      if (rowsOf[e.dataset.up].size < 2) return `<path d="M${a.x},${a.b}V${mid}H${c.x}V${c.t}" ${st}/>`;
      const first = Math.min(...rowsOf[e.dataset.up]), tx = Math.max(2, Math.min(...kids.filter(k => k.dataset.up === e.dataset.up).map(k => k.getBoundingClientRect().left)) - R.left - 6);
      return `<path d="M${a.x},${a.b}V${first - 9}H${tx}V${mid}H${c.x}V${c.t}" ${st}/>`;
    }).join("");
    // внуки — общий отвод слева от столбика
    kt.querySelectorAll(".ktc").forEach(c => c.classList.toggle("has", !!c.querySelector(".gk")));
  }
  return {html, lines, face};
})();
