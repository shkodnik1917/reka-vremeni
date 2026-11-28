// Река времени: раскладка, отрисовка потоков, синхронизация с картой.
(() => {
const {Y0, Y1, STREAMS, ERAS, EVENTS, FICTION, THREAD} = window.RIVER;
const M = window.MAP;
const F = window.FLOWS;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const NS = "http://www.w3.org/2000/svg";
const ROMAN = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV"];

// поток → области на карте
const MAPNAMES = {scyth:["Скифия"], sarm:["Сарматы"], goth:["Держава Германариха (готы)"], hun:["Гунны"], avar:["Аварский каганат"],
  khaz:["Хазарский каганат"], pech:["Печенеги"], polov:["Половецкая степь"], byz:["Византия","Херсонес (визант.)"], bulg:["Волжская Булгария"],
  dbulg:["Болгарское царство"], rus:["Северная Русь (Рюрик)","Киев (Аскольд и Дир)","Русь Олега и Игоря","Русь Святослава и Ольги","Киевская Русь"],
  gal:["Галицкое","Волынское"], pol:["Полоцкое"], nov:["Новгородская земля"], smo:["Смоленское"], kie:["Киевское"], per:["Переяславское"],
  che:["Черниговское"], vla:["Владимиро-Суздальское"], rya:["Муромо-Рязанское"],
  ...window.HORDE_PERIOD?.mapNames};

const interp = (kf, y) => {
  if (y < kf[0][0] || y > kf[kf.length - 1][0]) return 0;
  for (let i = 1; i < kf.length; i++) if (y <= kf[i][0]) {
    const [a, wa] = kf[i - 1], [b, wb] = kf[i], t = (y - a) / (b - a || 1);
    return wa + (wb - wa) * (t * t * (3 - 2 * t)); // плавно
  }
  return kf[kf.length - 1][1];
};
// ширины всех полос в момент y: [{id,name,color,d,w,parent}]
const SUB = STREAMS.find(s => s.sub).sub;
let focusId = null;
let focusRange = [Y0, Y1];
let shownItems = [];
let focusPeople = [];
function bands(y, raw) {
  if (focusId && !raw) return [{...F.catalog[focusId], w: 1, f0: 0, f1: 1, parent: null}];
  const out = [];
  STREAMS.forEach(s => {
    const w = interp(s.w, y);
    if (s.sub && y >= 1054) {
      const tot = SUB.reduce((a, b) => a + interp(b.w, y), 0) || 1;
      SUB.forEach(b => out.push({...b, w: w * interp(b.w, y) / tot, parent: "rus"}));
    } else out.push({...s, w});
  });
  let sum = out.reduce((a, b) => a + b.w, 0) || 1;
  // в реке личностей русло шире там, где больше людей: пустые полосы не съедают место
  const crowd = !raw && pmode() && window.PRIVER?.crowd(y);
  if (crowd) { out.forEach(b => { b.w = b.w > 0 ? b.w / sum * .3 + (crowd[b.id] || 0) * .7 : 0; }); sum = out.reduce((a, b) => a + b.w, 0) || 1; }
  let x = 0;
  out.forEach(b => { b.f0 = x / sum; x += b.w; b.f1 = x / sum; });
  return out;
}

/* ---------- карточки ---------- */
const tl = $("#tl");
const items = [];
EVENTS.forEach(e => items.push({...e, side: "R"}));
FICTION.forEach(e => items.push({...e, side: "L", k: e.r ? "story" : null}));
ERAS.forEach(e => items.push({...e, side: "E"}));
items.sort((a, b) => a.y - b.y || (b.side === "E") - (a.side === "E"));

items.forEach((it, i) => {
  const el = document.createElement("div");
  it.el = el; it.i = i;
  if (it.side === "E") {
    el.className = "era"; el.id = "era-" + i;
    el.innerHTML = `<div class="rule"></div><h2>${esc(it.t)}</h2><p>${esc(it.s)}</p>`;
  } else {
    el.className = "card" + (it.side === "L" ? " f" : "");
    const text = window.KINUI.link(esc(it.x));
    el.innerHTML = it.side === "L"
      ? `<span class="st">${esc(it.story)}</span><span class="d">${esc(it.d)}</span><div class="t">${esc(it.t)}</div><div class="x">${text}</div><div class="hint"></div><div class="flow-meta"></div>`
      : `<div class="d">${esc(it.d)}</div><div class="t">${esc(it.t)}</div><div class="x">${text}</div><div class="flow-meta"></div>`;
  }
  tl.appendChild(el);
});
// правители: тонкая лента в левой колонке, повести ложатся поверх
const SC = {...window.SCENES, ...window.HORDE_EARLY?.scenes, ...window.HORDE_LATE?.scenes};
const REIGNS = window.STATS.rulers.filter(r => r[1] !== "—").map((r, i, a) => {
  const el = document.createElement("div");
  el.className = "reign";
  const id = window.KINUI.find(r[1], r[0] + 1);
  el.innerHTML = `<div class="rl">${id ? `<span class="rf">${window.KINTREE.face(id)}</span>` : ""}<span class="ry">${r[0] < 0 ? -r[0] + " до н. э." : r[0]}</span><b${id ? ` class="pp" data-p="${id}"` : ""}>${esc(r[1])}</b><span class="rc">${esc(r[2] === "—" ? "" : r[2])}</span></div>`;
  tl.appendChild(el);
  return {y: r[0], y2: (window.STATS.rulers[window.STATS.rulers.indexOf(r) + 1] || [Y1])[0], el};
});
function updateItems() {
  shownItems = items.filter(it => !focusId || it.side !== "E" && F.matches(it, focusId));
  const visible = new Set(shownItems);
  items.forEach(it => {
    it.el.hidden = !visible.has(it);
    if (it.side === "E") return;
    const others = visible.has(it) && focusId ? F.foreign(it, focusId) : [];
    const opposite = others[0]?.color;
    if (opposite) it.el.style.setProperty("--outside", opposite);
    else it.el.style.removeProperty("--outside");
    it.color = opposite || null;
    const people = visible.has(it) && focusId ? Object.entries(F.entries[it.t].people) : [];
    it.el.querySelector(".flow-meta").innerHTML = [
      ...others.map(flow => `<button type="button" class="flow-tag" data-flow="${flow.id}" style="--tag:${flow.color}">${esc(flow.name)}</button>`),
      ...people.filter(([id]) => window.KINUI.P[id]).map(([id, role]) => `<button type="button" class="flow-person-tag" data-p="${id}" title="${esc(role)}" aria-label="${esc(window.KINUI.P[id].n + ", " + role)}">${esc(window.KINUI.P[id].n)}</button>`),
    ].join("");
  });
  $("#toc").innerHTML = shownItems.map(it => it.side === "E"
    ? `<a class="te" data-era="${it.i}" href="#era-${it.i}">${esc(it.t)}<small>${esc(it.s || "")}</small></a>`
    : `<a class="tv${it.side === "L" ? " story" : ""}" href="#e=${encodeURIComponent(it.t)}" data-ev="${esc(it.t)}"><span>${esc(it.side === "L" ? it.story : (it.d || String(it.y)).replace(/\s*\(.*?\)/g, ""))}</span>${esc(it.t)}</a>`).join("");
}

/* ---------- раскладка ---------- */
let anchors = [], geom = {}, fixedYear = null;
const baseY = y => { // «естественная» шкала: древность сжата
  const pts = [[Y0, 0], [500, 380], [850, 640], [Y1, 640 + (Y1 - 850) * 2.2]];
  for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const [a, pa] = pts[i - 1], [b, pb] = pts[i]; return pa + (y - a) / (b - a) * (pb - pa); }
  return pts[pts.length - 1][1];
};
function yToPx(y) {
  if (y <= anchors[0][0]) return anchors[0][1] - (anchors[0][0] - y) * .5;
  for (let i = 1; i < anchors.length; i++) if (y <= anchors[i][0]) {
    const [a, pa] = anchors[i - 1], [b, pb] = anchors[i];
    return pa + (y - a) / (b - a || 1) * (pb - pa);
  }
  const [a, pa] = anchors[anchors.length - 1]; return pa + (y - a) * 2;
}
function pxToY(px) {
  if (px <= anchors[0][1]) return anchors[0][0];
  for (let i = 1; i < anchors.length; i++) if (px <= anchors[i][1]) {
    const [a, pa] = anchors[i - 1], [b, pb] = anchors[i];
    return a + (px - pa) / (pb - pa || 1) * (b - a);
  }
  return anchors[anchors.length - 1][0];
}

// узкая река (R): правители и эпизоды встают в общий столбец, как на телефоне
const pmode = () => document.body.classList.contains("pmode");
const narrow = () => innerWidth < 900 || document.body.classList.contains("rivermin") && !pmode();
function layout() {
  const W = tl.clientWidth, mobile = narrow();
  const pad = 14;
  const g = mobile
    ? {rx: 6, rw: Math.round(W * .3), lx: 0, lw: 0}
    : {lx: pad, lw: Math.round(W * .19), rx: 0, rw: Math.round(W * .3)};
  if (!mobile) g.rx = g.lx + g.lw + 26;
  // река личностей: карты нет — слева колонка великих князей, дальше русла во всю ширину; при зуме справа место под плашку человека
  if (pmode() && !mobile) { g.lw = 180; g.rx = g.lx + g.lw + 84; g.rw = W - g.rx - pad - (window.PRIVER?.zoomed() ? 500 : 0); }
  if (pmode() && mobile) { g.rx = 6; g.rw = W - 12; }
  if (focusId) {
    g.lw = 0;
    g.rx = mobile ? 12 : 40;
    g.rw = Math.round((W - g.rx) * (mobile ? .29 : .45));
  }
  g.cx = g.rx + g.rw + 26; g.cw = W - g.cx - pad;
  geom = g;
  tl.style.setProperty("--focus-card-width", g.cw + "px");
  // ширина и высота карточек
  shownItems.forEach(it => {
    if (it.side === "E") { it.el.style.left = g.rx + "px"; it.el.style.right = "auto"; it.el.style.width = (mobile ? W - g.rx : g.rw + (g.lw ? 0 : 0)) + "px"; it.h = it.el.offsetHeight; return; }
    const left = it.side === "L" && !mobile && !focusId;
    it.el.style.left = (left ? g.lx : g.cx) + "px";
    it.el.style.width = (left ? g.lw : g.cw) + "px";
    it.h = it.el.offsetHeight;
  });
  // раскладка с выталкиванием
  const [firstYear, lastYear] = focusRange;
  const headerRoom = $("#flowbar").offsetHeight + 36;
  const top0 = focusId ? Math.max(headerRoom, innerHeight * (innerWidth < 900 ? .2 : .42) + 10) : headerRoom;
  const gap = focusId ? 24 : 14;
  let shift = top0, bottom = {L: top0, R: top0}, last = -Infinity;
  const base = y => baseY(y) - baseY(firstYear);
  anchors = [[firstYear, top0]];
  shownItems.forEach(it => {
    const col = it.side === "L" && !mobile && !focusId ? "L" : "R";
    let pos = base(it.y) + shift;
    if (it.side === "E") pos = Math.max(pos, bottom.L + 30, bottom.R + 30);
    else pos = Math.max(pos, bottom[col] + gap + 16);
    pos = Math.max(pos, last + 6);
    shift = pos - base(it.y);
    last = pos;
    it.py = pos;
    if (it.side === "E") {
      it.el.style.top = (pos - 20) + "px";
      bottom.L = bottom.R = pos - 20 + it.h + 26;
    } else {
      it.el.style.top = (pos - 16) + "px";
      bottom[col] = pos - 16 + it.h;
    }
    anchors.push([it.y, pos]);
  });
  if (anchors[anchors.length - 1][0] < lastYear) anchors.push([lastYear, base(lastYear) + shift]);
  const bottomPx = Math.max(bottom.L, bottom.R, anchors[anchors.length - 1][1]);
  let H = bottomPx + innerHeight * .68;
  anchors.push([lastYear + 1, bottomPx + 8]);
  // у реки личностей своя шкала лет: не по карточкам событий, а ровная, с увеличением вокруг выбранного человека
  if (pmode() && !mobile && window.PRIVER) { anchors = window.PRIVER.scale(); H = anchors[anchors.length - 1][1] + innerHeight * .6; }
  tl.style.height = H + "px";
  // река растягивается на всю высоту ленты
  shownItems.filter(i => i.side === "E").forEach(e => { e.el.style.left = (mobile ? 0 : g.lx) + "px"; e.el.style.width = (W - (mobile ? 0 : g.lx) - pad) + "px"; });
  REIGNS.forEach(r => {
    if (mobile || focusId) { r.el.style.display = "none"; return; }
    const t = yToPx(Math.max(r.y, Y0)), b = yToPx(Math.min(r.y2, Y1));
    Object.assign(r.el.style, {display: "", left: g.lx + "px", width: g.lw + "px", top: t + "px", height: Math.max(b - t, 4) + "px"});
    r.el.classList.toggle("short", b - t < 58);
  });
  drawRiver(H);
  drawLinks(H);
  window.PRIVER?.draw(H, pmode());
  window.FLOW_VIEW.draw(focusId, focusPeople, shownItems, H, g, yToPx);
}
window.RIVERAPI = {bands, rawBands: y => bands(y, true), yToPx: y => yToPx(y), pxToY: px => pxToY(px), geom: () => geom, goTo: t => goTo(t),
  redraw: () => layout(),
  nowYear: () => fixedYear?.y ?? pxToY(innerHeight * NOWF() - tl.getBoundingClientRect().top),
  toYear: y => scrollToYear(y),
  focus: (id, y) => setFocus(id, y),
  get focusId() { return focusId; },
  // переключение реки: год на линии «сейчас» остаётся на месте
  mode(on) {
    if (on !== pmode()) this.relayout(this.nowYear(), on);
  },
  // перерисовать (новая шкала, зум) и поставить год y на линию «сейчас»
  // cy — на какой высоте экрана держать год (по умолчанию линия «сейчас»)
  relayout(y, on, cy = innerHeight * NOWF()) {
    fixedYear = null;
    if (on && focusId) updateFocus(null);
    if (on != null) { document.body.classList.toggle("pmode", on); document.querySelector('.tools [data-k="p"]')?.classList.toggle("on", on); }
    layout(); if (on != null) M.refit();
    document.documentElement.style.scrollBehavior = "auto";
    scrollTo(0, tl.getBoundingClientRect().top + scrollY + yToPx(y) - cy);
    document.documentElement.style.scrollBehavior = "";
    onScroll();
  }};

/* ---------- река ---------- */
function drawRiver(H) {
  const svg = $("#river"), g = geom;
  svg.setAttribute("width", tl.clientWidth); svg.setAttribute("height", H);
  svg.innerHTML = "";
  const samples = [];
  const [yStart, yEnd] = focusRange;
  const startPx = yToPx(yStart), endPx = yToPx(yEnd);
  for (let py = startPx; py < endPx; py += 5) samples.push({y: pxToY(py), py});
  samples.push({y: yEnd, py: endPx});
  const X = f => g.rx + f * g.rw;
  // фон-русло
  const bed = document.createElementNS(NS, "rect");
  Object.entries({x: g.rx - 3, y: yToPx(yStart), width: g.rw + 6, height: yToPx(yEnd) - yToPx(yStart), rx: 6, fill: "#0b0907"}).forEach(([k, v]) => bed.setAttribute(k, v));
  svg.appendChild(bed);
  // вековые отметки
  for (let c = Math.ceil(yStart / 100); c <= Math.ceil(yEnd / 100); c++) {
    if (c === 0) continue;
    const yr = c < 0 ? c * 100 : (c - 1) * 100;
    if (yr < yStart || yr > yEnd) continue;
    const py = yToPx(yr);
    const ln = document.createElementNS(NS, "line");
    Object.entries({x1: g.rx - 30, x2: g.rx + g.rw + 6, y1: py, y2: py, class: "tick"}).forEach(([k, v]) => ln.setAttribute(k, v));
    svg.appendChild(ln);
    const tx = document.createElementNS(NS, "text");
    Object.entries({x: g.rx - 8, y: py - 4, "text-anchor": "end", class: "ticklbl"}).forEach(([k, v]) => tx.setAttribute(k, v));
    tx.textContent = c < 0 ? ROMAN[-c] + " до н.э." : ROMAN[c] + " в.";
    if (g.lw || c > 0) svg.appendChild(tx);
  }
  // полосы; на 1054 добавляем точку «за миг до раздела», чтобы Русь и её княжества сходились без щели
  if (!focusId) for (const y of [1053.99, 1054]) samples.push({y, py: yToPx(y)});
  samples.sort((a, b) => a.py - b.py);
  const B = samples.map(({y, py}) => ({y, py, b: bands(y)}));
  const eraPy = shownItems.filter(i => i.side === "E").map(i => i.py);
  const defs = document.createElementNS(NS, "defs"); svg.appendChild(defs);
  const RUS = STREAMS.find(x => x.id === "rus").color;
  let gid = 0;
  // вертикальный градиент: княжества вырастают из красной Руси постепенно, а не обрываются чертой
  const grad = (id, y0, c0, c1, len) => {
    const gr = document.createElementNS(NS, "linearGradient");
    Object.entries({id, gradientUnits: "userSpaceOnUse", x1: 0, x2: 0, y1: y0, y2: y0 + len}).forEach(([k, v]) => gr.setAttribute(k, v));
    gr.innerHTML = `<stop offset="0" stop-color="${c0}"/><stop offset="1" stop-color="${c1}"/>`;
    defs.appendChild(gr); return `url(#${id})`;
  };
  const ids = [...new Set(B.flatMap(s => s.b.map(b => b.id)))];
  const pathsG = document.createElementNS(NS, "g"), flowG = document.createElementNS(NS, "g"), labG = document.createElementNS(NS, "g");
  svg.append(pathsG, flowG, labG);
  ids.forEach(id => {
    // непрерывные участки, где полоса есть
    let seg = [];
    const segs = [];
    B.forEach(s => {
      const b = s.b.find(q => q.id === id);
      if (b && b.f1 - b.f0 > 0.0005) seg.push({py: s.py, y: s.y, b});
      else if (seg.length) { segs.push(seg); seg = []; }
    });
    if (seg.length) segs.push(seg);
    segs.forEach(sg => {
      if (sg.length < 2) return;
      const meta = sg[0].b;
      const left = sg.map(p => `${X(p.b.f0).toFixed(1)},${p.py.toFixed(1)}`);
      const right = sg.slice().reverse().map(p => `${X(p.b.f1).toFixed(1)},${p.py.toFixed(1)}`);
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", `M${left.join("L")}L${right.join("L")}Z`);
      const split = meta.parent === "rus" && Math.abs(sg[0].y - 1054) < 1;
      path.setAttribute("fill", split ? grad("g" + id, sg[0].py, RUS, meta.color, 160) : meta.color);
      path.setAttribute("class", "stream");
      path.dataset.id = id;
      if (!focusId) {
        path.setAttribute("tabindex", "0");
        path.setAttribute("role", "button");
        path.setAttribute("aria-label", "Открыть течение «" + meta.name + "»");
      }
      pathsG.appendChild(path);
      // кромки — отдельными линиями по бокам (без горизонтальных черт сверху и снизу)
      const edge = pts => { const e = document.createElementNS(NS, "path"); e.setAttribute("d", "M" + pts.join("L")); e.setAttribute("class", "edge");
        if (split) e.setAttribute("stroke", grad("e" + id + (++gid), sg[0].py, "rgba(10,8,6,0)", "rgba(10,8,6,.85)", 90)); pathsG.appendChild(e); };
      edge(left); edge(right.slice().reverse());
      // течение
      const fl = document.createElementNS(NS, "path");
      fl.setAttribute("d", "M" + sg.map(p => `${X((p.b.f0 + p.b.f1) / 2).toFixed(1)},${p.py.toFixed(1)}`).join("L"));
      fl.setAttribute("class", "flow");
      flowG.appendChild(fl);
      // подпись в самом широком месте
      // подпись не ставим рядом с заголовками эпох — иначе налезает на них
      if (focusId) return;
      const ok = sg.filter(p => eraPy.every(e => p.py < e - 50 || p.py > e + 160));
      if (!ok.length) return;
      let best = ok[0];
      ok.forEach(p => { if (p.b.f1 - p.b.f0 > best.b.f1 - best.b.f0) best = p; });
      const wpx = (best.b.f1 - best.b.f0) * g.rw;
      const t = document.createElementNS(NS, "text");
      t.textContent = meta.name;
      t.setAttribute("class", "slabel" + (wpx < 70 ? " small" : ""));
      const cx = X((best.b.f0 + best.b.f1) / 2);
      if (wpx > meta.name.length * 8.5) {
        Object.entries({x: cx, y: best.py, "text-anchor": "middle", "dominant-baseline": "middle"}).forEach(([k, v]) => t.setAttribute(k, v));
      } else if (wpx > 11) {
        Object.entries({x: cx, y: best.py, "text-anchor": "middle", "dominant-baseline": "middle", transform: `rotate(-90 ${cx} ${best.py})`}).forEach(([k, v]) => t.setAttribute(k, v));
      } else return;
      labG.appendChild(t);
    });
  });
}

/* ---------- точки и связи ---------- */
function streamX(id, y) {
  const b = bands(y);
  if (focusId) return geom.rx + geom.rw / 2;
  let s = b.find(q => q.id === id && q.f1 - q.f0 > .002) || b.find(q => q.id === "rus" && q.f1 - q.f0 > .002) || b.find(q => q.id === "slav" && q.f1 - q.f0 > .002) || b.find(q => q.f1 - q.f0 > .002);
  if (!s && id === "rus") s = b.find(q => q.parent === "rus");
  if (id === "rus" && y >= 1054) {
    const k = ["kie", "moscow"].map(key => b.find(q => q.id === key)).find(q => q && q.f1 - q.f0 > .002);
    if (k) s = k;
  }
  return geom.rx + (s ? (s.f0 + s.f1) / 2 : .5) * geom.rw;
}
function drawLinks(H) {
  const svg = $("#links"), g = geom, mobile = narrow();
  svg.setAttribute("width", tl.clientWidth); svg.setAttribute("height", H);
  svg.innerHTML = "";
  const thread = [];
  shownItems.forEach(it => {
    if (it.side === "E") return;
    const fic = it.side === "L";
    if (focusId && F.entries[it.t].people && Object.keys(F.entries[it.t].people).some(id => window.KINUI.P[id])) return;
    const x = streamX(it.s || "rus", it.y), y = it.py;
    const tx = fic && !mobile && !focusId ? g.lx + g.lw : g.cx, ty = y;
    const p = document.createElementNS(NS, "path");
    const mx = (x + tx) / 2;
    p.setAttribute("d", `M${x},${y} C${mx},${y} ${mx},${ty} ${tx},${ty}`);
    p.setAttribute("class", "link" + (fic ? " f" : ""));
    if (it.color) p.style.setProperty("--event-color", it.color);
    svg.appendChild(p);
    const c = document.createElementNS(NS, "circle");
    Object.entries({cx: x, cy: y, r: fic ? 4.5 : 5, class: "edot" + (fic ? " f" : "")}).forEach(([k, v]) => c.setAttribute(k, v));
    if (it.color) c.style.setProperty("--event-color", it.color);
    svg.appendChild(c);
    it.link = p; it.dot = c;
    if (fic && !mobile && (!it.collection || it.lineage)) thread.push([g.lx + 6, it.py]);
  });
  if (thread.length > 1) { // золотая нить родовой метки по левому берегу
    const th = document.createElementNS(NS, "path");
    th.setAttribute("d", "M" + thread.map(p => p.join(",")).join("L"));
    th.setAttribute("class", "thread");
    const title = document.createElementNS(NS, "title"); title.textContent = THREAD; th.appendChild(title);
    svg.insertBefore(th, svg.firstChild);
  }
}

/* ---------- подсказка над рекой ---------- */
const tip = $("#tip");
let hlId = null;
$("#river").addEventListener("mousemove", e => {
  const p = e.target.closest(".stream");
  if (!p || focusId) { hideTip(); return; }
  const s = F.catalog[p.dataset.id];
  const yr = Math.round(window.RIVERAPI.nowYear());
  tip.style.setProperty("--c", s.color);
  tip.innerHTML = `<b>${esc(s.name)}</b>${esc(s.d)}<div class="flow-tip">${esc(formatYear(yr))} · нажми, чтобы раскрыть течение</div>`;
  tip.style.left = Math.min(e.clientX + 16, innerWidth - 340) + "px";
  tip.style.top = (e.clientY + 14) + "px";
  tip.classList.add("on");
  if (hlId !== s.id) {
    if (hlId) { M.highlight(MAPNAMES[hlId], false); document.querySelectorAll(`.stream[data-id="${hlId}"]`).forEach(x => x.classList.remove("hl")); }
    hlId = s.id; M.highlight(MAPNAMES[hlId], true);
    document.querySelectorAll(`.stream[data-id="${hlId}"]`).forEach(x => x.classList.add("hl"));
  }
});
function hideTip() {
  tip.classList.remove("on");
  if (hlId) { M.highlight(MAPNAMES[hlId], false); document.querySelectorAll(".stream.hl").forEach(x => x.classList.remove("hl")); hlId = null; }
}
$("#river").addEventListener("mouseleave", hideTip);
$("#river").addEventListener("click", e => {
  const stream = e.target.closest(".stream");
  if (!stream) return;
  if (focusId) window.RIVERAPI.toYear(pxToY(e.clientY - tl.getBoundingClientRect().top));
  else selectStream(stream.dataset.id, window.RIVERAPI.nowYear());
});
$("#river").addEventListener("keydown", e => {
  const stream = e.target.closest(".stream");
  if (stream && ["Enter", " "].includes(e.key)) {
    e.preventDefault();
    selectStream(stream.dataset.id, window.RIVERAPI.nowYear());
  }
});

/* ---------- прокрутка ---------- */
let activeIt = null;
const NOWF = () => innerWidth < 900 ? .62 : .42;
const formatYear = y => y < 0 ? -Math.round(y) + " до н. э." : String(Math.round(y));
function selectStream(id, y) {
  setFocus(id, y);
  $("#flow-select").focus({preventScroll: true});
}
function setFocus(id, year = window.RIVERAPI.nowYear()) {
  if (id && !F.has(id)) return;
  hideTip();
  if (focusId === id && !pmode()) return;
  if (pmode()) {
    document.body.classList.remove("pmode");
    $("#tools [data-k=p]").classList.remove("on");
    M.refit();
  }
  updateFocus(id);
  layout();
  scrollToYear(year);
}
function updateFocus(id) {
  activate(null);
  focusId = id || null;
  focusRange = focusId ? F.range(focusId) : [Y0, Y1];
  focusPeople = focusId ? F.people(focusId) : [];
  document.body.classList.toggle("flowmode", Boolean(focusId));
  window.FLOW_VIEW.select(focusId, focusRange);
  updateItems();
}
function activate(it) {
  if (activeIt === it) {
    it?.link?.classList.add("on");
    it?.dot?.classList.add("on");
    window.FLOW_VIEW.active(it?.t);
    return;
  }
  if (activeIt) { activeIt.el.classList.remove("on"); activeIt.link?.classList.remove("on"); activeIt.dot?.classList.remove("on"); }
  activeIt = it;
  window.FLOW_VIEW.active(it?.t);
  if (!it) { M.clearRoute(); return; }
  it.el.classList.add("on"); it.link?.classList.add("on"); it.dot?.classList.add("on");
  show(it);
}
function show(it, force) {
  const sc = SC[it.t];
  if (sc && ((sc.ar || []).length || (sc.who || []).length || (sc.pin || []).length)) M.showScene(it, sc, force);
  else if (it.r) M.showRoute(it, force); else if (it.p) M.focusPlace(it); else M.clearRoute();
}
function onScroll() {
  if (!anchors.length) return; // страница ещё не разложена (прокрутка до загрузки шрифтов)
  snapTo = null;
  if (fixedYear && Math.abs(scrollY - fixedYear.top) > 1) fixedYear = null;
  const r = tl.getBoundingClientRect();
  const nowPx = innerHeight * NOWF() - r.top;
  const now = $("#now");
  const inside = nowPx > 0 && nowPx < r.height - innerHeight * .3;
  now.style.opacity = inside ? 1 : 0;
  if (inside) {
    const y = fixedYear?.y ?? Math.min(focusRange[1], pxToY(nowPx));
    now.style.top = innerHeight * NOWF() + "px";
    now.style.left = (r.left + geom.rx - 4) + "px";
    now.style.width = (geom.rw + 8) + "px";
    now.firstChild.textContent = formatYear(y);
    now.firstChild.style.left = focusId ? "0" : "-10px";
    M.setYear(y);
    window.PRIVER?.now(y);
    window.FLOW_VIEW.now(focusId, y);
    window.CARD.syncTreeLink();
    M.eraView(y);
    // ближайшая карточка к линии «сейчас»; в реке личностей карточек нет — и доводки к ним тоже
    if (pmode()) { activate(null); } else {
    let best = null, bd = 1e9;
    shownItems.forEach(it => {
      if (it.side === "E" || (fixedYear && Math.round(it.y) !== Math.round(y))) return;
      const distance = Math.abs(it.py - nowPx);
      if (distance < bd) { bd = distance; best = it; }
    });
    activate(bd < 160 ? best : null);
    now.classList.toggle("hit", bd < 22);
    snapTo = !fixedYear && bd < 90 && bd > 3 ? best : null; }
  }
  const h = document.documentElement;
  $("#progress").style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + "%";
}
let ticking = false;
// Остановился рядом с событием — лента мягко доезжает до него: река идёт «по моментам», а не просто течёт.
let snapTo = null, snapT;
function settleScroll() {
  onScroll();
  if (snapTo) scrollToPx(snapTo.py);
}
if ("onscrollend" in document) document.addEventListener("scrollend", settleScroll);
else addEventListener("scroll", () => {
  clearTimeout(snapT);
  snapT = setTimeout(settleScroll, 220);
}, {passive: true});
// флаг снимаем в finally: одна ошибка в пересчёте не должна навсегда заморозить год и карту
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { try { onScroll(); } finally { ticking = false; } }); } }, {passive: true});

function scrollToPx(px, behavior = "smooth") {
  clearTimeout(snapT);
  snapTo = null;
  fixedYear = null;
  const top = tl.getBoundingClientRect().top + scrollY + px - innerHeight * NOWF();
  scrollTo({top, behavior});
}
function scrollToYear(year) {
  const y = Math.max(focusRange[0], Math.min(focusRange[1], year));
  scrollToPx(yToPx(y), "instant");
  fixedYear = {y, top: scrollY};
  onScroll();
}
document.addEventListener("click", e => {
  const flow = e.target.closest("[data-flow]");
  if (flow) {
    const card = flow.closest(".card");
    const event = card && shownItems.find(it => it.el === card);
    selectStream(flow.dataset.flow || null, event?.y ?? window.RIVERAPI.nowYear());
    if (event) goTo(event.t);
    return;
  }
  const card = e.target.closest(".card");
  if (card) {
    const it = items.find(i => i.el === card);
    if (it.side === "L" && !focusId) {
      const open = !card.classList.contains("open");
      document.querySelectorAll(".card.open").forEach(c => c.classList.remove("open"));
      card.classList.toggle("open", open);
      layout();
      // Align the expanded card after layout before map updates resume.
      scrollToPx(it.py, "instant");
      onScroll();
    }
    activate(it);
    show(it, true);
    if (it.side === "R" || focusId) scrollToPx(it.py);
    return;
  }
  const era = e.target.closest("[data-era]"), ev = e.target.closest("[data-ev]");
  if (era || ev) {
    e.preventDefault();
    $("#toc").classList.remove("on"); $("#tocb").classList.remove("on");
    if (pmode()) window.RIVERAPI.mode(false);
    if (era) scrollToPx(items[+era.dataset.era].py - 10); else goTo(ev.dataset.ev);
    return;
  }
  if (e.target.closest("#tocb")) { $("#toc").classList.toggle("on"); $("#tocb").classList.toggle("on"); return; }
  if (!e.target.closest("#toc")) { $("#toc").classList.remove("on"); $("#tocb").classList.remove("on"); }
});

const goTo = t => {
  const it = items.find(i => i.side !== "E" && i.t === t);
  if (!it) return;
  if (pmode()) window.RIVERAPI.mode(false);
  if (focusId && !F.matches(it, focusId)) setFocus(null, it.y);
  scrollToPx(it.py, "instant");
  onScroll();
  activate(it);
};
window.name = "kin-river";
const fromHash = () => {
  const title = new URLSearchParams(location.hash.slice(1)).get("e");
  if (title && anchors.length) goTo(title);
};
addEventListener("hashchange", fromHash);

/* ---------- клавиши и панель команд ---------- */
function jump(d) {
  const current = activeIt?.py ?? innerHeight * NOWF() - tl.getBoundingClientRect().top;
  const sequence = shownItems.filter(i => i.side !== "E");
  const it = d > 0 ? sequence.find(i => i.py > current + 1) : sequence.reverse().find(i => i.py < current - 1);
  if (it) goTo(it.t);
}
const toggleBody = (cls, btn) => { const on = document.body.classList.toggle(cls); document.querySelector(`.tools [data-k="${btn}"]`)?.classList.toggle("on", on); return on; };
function command(k) {
  switch (k) {
    case "m": toggleBody("maponly", "m"); M.refit(); M.resetView(); break;
    case "p": window.RIVERAPI.mode(!pmode()); break;
    case "r": {
      const year = window.RIVERAPI.nowYear(), on = toggleBody("rivermin", "r");
      try { localStorage.setItem("rivermin", on ? "1" : ""); } catch {}
      layout();
      M.refit();
      if (focusId) scrollToYear(year);
      else onScroll();
      break;
    }
    case "?": toggleBody("help", "?"); break;
    case "t": window.open(window.FLOW_VIEW.treeUrl(window.CARD.id), "kin-tree"); break;
    case "d": case "arrowright": jump(1); break;
    case "a": case "arrowleft": jump(-1); break;
    case "escape": if (window.CARD.close()) break; if (pmode()) { if (!window.PRIVER.focus(null)) window.RIVERAPI.mode(false); break; } if (focusId) { setFocus(null); break; } M.unpinLens(); if (!M.pickStep(null)) M.resetView(); document.body.classList.remove("help"); document.querySelector('.tools [data-k="?"]')?.classList.remove("on"); break;
    default: if (/^[1-9]$/.test(k)) M.pickStep(+k - 1); else return false;
  }
  return true;
}
// буквы ловим по физической клавише, чтобы работало и в русской раскладке (L = Д и т. д.)
addEventListener("keydown", e => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input,textarea,select")) return;
  const k = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : /^Digit\d$/.test(e.code) ? e.code.slice(5) : e.key.toLowerCase();
  if (command(k)) e.preventDefault();
});
document.getElementById("tools").addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (b) command(b.dataset.k); });

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {rootMargin: "0px 0px -6% 0px"});
items.forEach(it => it.side !== "E" && io.observe(it.el));

let rt;
addEventListener("resize", () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    const year = window.RIVERAPI.nowYear();
    layout();
    if (focusId) scrollToYear(year);
    else onScroll();
  }, 150);
});
const start = () => {
  try { if (localStorage.getItem("rivermin")) { document.body.classList.add("rivermin"); document.querySelector('.tools [data-k="r"]')?.classList.add("on"); M.refit(); } } catch {}
  window.FLOW_VIEW.select(null, focusRange);
  updateItems();
  layout();
  M.setYear(Y0);
  M.eraView(Y0);
  const params = new URLSearchParams(location.search), requested = params.get("y");
  const year = requested && Number.isFinite(+requested) ? Math.max(Y0, Math.min(Y1, +requested)) : null;
  const flow = params.get("flow"), person = params.get("p");
  if (F.has(flow)) setFocus(flow, year ?? F.range(flow)[0]);
  else if (year != null) scrollToYear(year);
  onScroll();
  fromHash();
  if (Object.prototype.hasOwnProperty.call(window.KINUI.P, person)) window.CARD.open(person);
};
(document.fonts ? document.fonts.ready : Promise.resolve()).then(start);
// титул: уходит от первого колеса, клавиши, клика или касания; река уже стоит под ним
const hero = document.querySelector(".hero");
const enter = e => {
  if (e && e.type === "keydown" && ["Shift", "Control", "Alt", "Meta", "Tab"].includes(e.key)) return;
  if (e && e.cancelable) { e.preventDefault(); e.stopImmediatePropagation(); }
  hero.classList.add("gone"); setTimeout(() => hero.remove(), 800);
  ["wheel", "keydown", "touchmove"].forEach(t => removeEventListener(t, enter, true));
};
if (location.hash || location.search) hero.remove();
else { ["wheel", "keydown", "touchmove"].forEach(t => addEventListener(t, enter, {capture: true, passive: false})); hero.addEventListener("click", () => enter()); }
})();
