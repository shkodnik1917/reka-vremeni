// Река времени: раскладка, отрисовка потоков, синхронизация с картой.
(() => {
const {STREAMS, ERAS, EVENTS, FICTION, THREAD} = window.RIVER;
const M = window.MAP;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const NS = "http://www.w3.org/2000/svg";
const ROMAN = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII"];
const Y0 = -750, Y1 = 1240;

// поток → области на карте
const MAPNAMES = {scyth:["Скифия"], sarm:["Сарматы"], goth:["Держава Германариха (готы)"], hun:["Гунны"], avar:["Аварский каганат"],
  khaz:["Хазарский каганат"], pech:["Печенеги"], polov:["Половецкая степь"], byz:["Византия","Херсонес (визант.)"], bulg:["Волжская Булгария"],
  dbulg:["Болгарское царство"], rus:["Северная Русь (Рюрик)","Киев (Аскольд и Дир)","Русь Олега и Игоря","Русь Святослава и Ольги","Киевская Русь"],
  gal:["Галицкое","Волынское"], pol:["Полоцкое"], nov:["Новгородская земля"], smo:["Смоленское"], kie:["Киевское"], per:["Переяславское"],
  che:["Черниговское"], vla:["Владимиро-Суздальское"], rya:["Муромо-Рязанское"]};

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
function bands(y, raw) {
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
items.sort((a, b) => a.y - b.y || (a.side === "E" ? -1 : 1));

items.forEach((it, i) => {
  const el = document.createElement("div");
  it.el = el; it.i = i;
  if (it.side === "E") {
    el.className = "era"; el.id = "era-" + i;
    el.innerHTML = `<div class="rule"></div><h2>${esc(it.t)}</h2><p>${esc(it.s)}</p>`;
  } else {
    el.className = "card" + (it.side === "L" ? " f" : "");
    el.innerHTML = it.side === "L"
      ? `<span class="st">${esc(it.story)}</span><span class="d">${esc(it.d)}</span><div class="t">${esc(it.t)}</div><div class="x">${esc(it.x)}</div><div class="hint"></div>`
      : `<div class="d">${esc(it.d)}</div><div class="t">${esc(it.t)}</div><div class="x">${esc(it.x)}</div>`;
  }
  tl.appendChild(el);
});
// правители: тонкая лента в левой колонке, повести ложатся поверх
const SC = window.SCENES || {};
const REIGNS = window.STATS.rulers.filter(r => r[1] !== "—").map((r, i, a) => {
  const el = document.createElement("div");
  el.className = "reign";
  const id = window.KINUI.find(r[1], r[0] + 1);
  el.innerHTML = `<div class="rl">${id ? `<span class="rf">${window.KINTREE.face(id)}</span>` : ""}<span class="ry">${r[0] < 0 ? -r[0] + " до н. э." : r[0]}</span><b${id ? ` class="pp" data-p="${id}"` : ""}>${esc(r[1])}</b><span class="rc">${esc(r[2] === "—" ? "" : r[2])}</span></div>`;
  tl.appendChild(el);
  return {y: r[0], y2: (window.STATS.rulers[window.STATS.rulers.indexOf(r) + 1] || [Y1])[0], el};
});
// оглавление: эпохи и события под ними
$("#toc").innerHTML = items.filter(i => i.side !== "L").sort((a, b) => a.y - b.y || (a.side === "E" ? -1 : 1)).map(i => i.side === "E"
  ? `<a class="te" data-era="${i.i}">${esc(i.t)}<small>${esc(i.s || "")}</small></a>`
  : `<a class="tv" data-ev="${esc(i.t)}"><span>${esc((i.d || (i.y < 0 ? -i.y + " до н. э." : String(i.y))).replace(/\s*\(.*?\)/g, ""))}</span>${esc(i.t)}</a>`).join("");

/* ---------- раскладка ---------- */
let anchors = [], geom = {};
const baseY = y => { // «естественная» шкала: древность сжата
  const pts = [[Y0, 0], [500, 380], [850, 640], [Y1, 640 + 390 * 2.2]];
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
  g.cx = g.rx + g.rw + 26; g.cw = W - g.cx - pad;
  geom = g;
  // ширина и высота карточек
  items.forEach(it => {
    if (it.side === "E") { it.el.style.left = g.rx + "px"; it.el.style.right = "auto"; it.el.style.width = (mobile ? W - g.rx : g.rw + (g.lw ? 0 : 0)) + "px"; it.h = it.el.offsetHeight; return; }
    const left = it.side === "L" && !mobile;
    it.el.style.left = (left ? g.lx : g.cx) + "px";
    it.el.style.width = (left ? g.lw : g.cw) + "px";
    it.h = it.el.offsetHeight;
  });
  // раскладка с выталкиванием
  const top0 = 40, gap = 14;
  let shift = top0, bottom = {L: top0, R: top0}, last = -Infinity;
  anchors = [];
  items.forEach(it => {
    const col = it.side === "L" && !mobile ? "L" : "R";
    let pos = baseY(it.y) + shift;
    if (it.side === "E") pos = Math.max(pos, bottom.L + 30, bottom.R + 30);
    else pos = Math.max(pos, bottom[col] + gap + 16);
    pos = Math.max(pos, last + 6);
    shift = pos - baseY(it.y);
    last = pos;
    it.py = pos;
    if (it.side === "E") {
      it.el.style.top = (pos - 20) + "px";
      bottom.L = bottom.R = pos - 20 + it.h + 26;
    } else {
      it.el.style.top = (pos - 16) + "px";
      bottom[col] = pos - 16 + it.h;
    }
    if (!anchors.length || it.y > anchors[anchors.length - 1][0]) anchors.push([it.y, pos]);
  });
  anchors.unshift([Y0 - 1, anchors[0][1] - 20]);
  let H = Math.max(bottom.L, bottom.R) + innerHeight * .5;
  anchors.push([Y1 + 30, H - innerHeight * .35]);
  // у реки личностей своя шкала лет: не по карточкам событий, а ровная, с увеличением вокруг выбранного человека
  if (pmode() && !mobile && window.PRIVER) { anchors = window.PRIVER.scale(); H = anchors[anchors.length - 1][1] + innerHeight * .6; }
  tl.style.height = H + "px";
  // река растягивается на всю высоту ленты
  items.filter(i => i.side === "E").forEach(e => { e.el.style.left = (mobile ? 0 : g.lx) + "px"; e.el.style.width = (W - (mobile ? 0 : g.lx) - pad) + "px"; });
  REIGNS.forEach(r => {
    if (mobile) { r.el.style.display = "none"; return; }
    const t = yToPx(Math.max(r.y, Y0)), b = yToPx(Math.min(r.y2, Y1));
    Object.assign(r.el.style, {display: "", left: g.lx + "px", width: g.lw + "px", top: t + "px", height: Math.max(b - t, 4) + "px"});
    r.el.classList.toggle("short", b - t < 58);
  });
  drawRiver(H);
  drawLinks(H);
  window.PRIVER?.draw(H, pmode());
}
window.RIVERAPI = {bands, rawBands: y => bands(y, true), yToPx: y => yToPx(y), pxToY: px => pxToY(px), geom: () => geom, goTo: t => goTo(t),
  redraw: () => layout(),
  nowYear: () => pxToY(innerHeight * NOWF() - tl.getBoundingClientRect().top),
  toYear: y => scrollToPx(yToPx(y)),
  // переключение реки: год на линии «сейчас» остаётся на месте
  mode(on) { if (on !== pmode()) this.relayout(this.nowYear(), on); },
  // перерисовать (новая шкала, зум) и поставить год y на линию «сейчас»
  // cy — на какой высоте экрана держать год (по умолчанию линия «сейчас»)
  relayout(y, on, cy = innerHeight * NOWF()) {
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
  const yStart = pxToY(0), yEnd = Y1;
  for (let px = yToPx(yStart); px <= yToPx(yEnd) + 1; px += 5) samples.push(pxToY(px));
  samples.push(yEnd);
  const X = f => g.rx + f * g.rw;
  // фон-русло
  const bed = document.createElementNS(NS, "rect");
  Object.entries({x: g.rx - 3, y: yToPx(yStart), width: g.rw + 6, height: yToPx(yEnd) - yToPx(yStart), rx: 6, fill: "#0b0907"}).forEach(([k, v]) => bed.setAttribute(k, v));
  svg.appendChild(bed);
  // вековые отметки
  for (let c = -7; c <= 13; c++) {
    if (c === 0) continue;
    const yr = c < 0 ? c * 100 : (c - 1) * 100;
    if (yr < yStart) continue;
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
  samples.push(1053.99, 1054); samples.sort((a, b) => a - b);
  const B = samples.map(y => ({y, py: yToPx(y), b: bands(y)}));
  const eraPy = items.filter(i => i.side === "E").map(i => i.py);
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
  let s = b.find(q => q.id === id && q.f1 - q.f0 > .002) || b.find(q => q.id === "rus" && q.f1 - q.f0 > .002) || b.find(q => q.id === "slav" && q.f1 - q.f0 > .002) || b.find(q => q.f1 - q.f0 > .002);
  if (!s && id === "rus") s = b.find(q => q.parent === "rus");
  if (id === "rus" && y >= 1054) { const k = b.find(q => q.id === "kie"); if (k) s = k; }
  return geom.rx + (s.f0 + s.f1) / 2 * geom.rw;
}
function drawLinks(H) {
  const svg = $("#links"), g = geom, mobile = narrow();
  svg.setAttribute("width", tl.clientWidth); svg.setAttribute("height", H);
  svg.innerHTML = "";
  const thread = [];
  items.forEach(it => {
    if (it.side === "E") return;
    const fic = it.side === "L";
    const x = streamX(fic ? "rus" : it.s, it.y), y = it.py;
    const tx = fic && !mobile ? g.lx + g.lw : g.cx, ty = y;
    const p = document.createElementNS(NS, "path");
    const mx = (x + tx) / 2;
    p.setAttribute("d", `M${x},${y} C${mx},${y} ${mx},${ty} ${tx},${ty}`);
    p.setAttribute("class", "link" + (fic ? " f" : ""));
    svg.appendChild(p);
    const c = document.createElementNS(NS, "circle");
    Object.entries({cx: x, cy: y, r: fic ? 4.5 : 5, class: "edot" + (fic ? " f" : "")}).forEach(([k, v]) => c.setAttribute(k, v));
    svg.appendChild(c);
    it.link = p; it.dot = c;
    if (fic && !mobile) thread.push([g.lx + 6, it.py]);
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
const DMAP = Object.fromEntries([...STREAMS, ...SUB].map(s => [s.id, s]));
let hlId = null;
$("#river").addEventListener("mousemove", e => {
  const p = e.target.closest(".stream");
  if (!p) { hideTip(); return; }
  const s = DMAP[p.dataset.id];
  const yr = Math.round(pxToY(e.clientY - tl.getBoundingClientRect().top));
  tip.style.setProperty("--c", s.color);
  tip.innerHTML = `<b>${esc(s.name)}</b>${esc(s.d)}<div style="margin-top:4px;color:var(--muted);font-size:12px">${yr < 0 ? -yr + " до н. э." : yr + " год"} · подсвечено на карте</div>`;
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

/* ---------- прокрутка ---------- */
let activeIt = null;
const NOWF = () => innerWidth < 900 ? .62 : .42;
function activate(it) {
  if (activeIt === it) return;
  if (activeIt) { activeIt.el.classList.remove("on"); activeIt.link?.classList.remove("on"); activeIt.dot?.classList.remove("on"); }
  activeIt = it;
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
  const r = tl.getBoundingClientRect();
  const nowPx = innerHeight * NOWF() - r.top;
  const now = $("#now");
  const inside = nowPx > 0 && nowPx < r.height - innerHeight * .3;
  now.style.opacity = inside ? 1 : 0;
  if (inside) {
    const y = pxToY(nowPx);
    now.style.top = innerHeight * NOWF() + "px";
    now.style.left = (r.left + geom.rx - 4) + "px";
    now.style.width = (geom.rw + 8) + "px";
    now.firstChild.textContent = y < 0 ? `${-Math.round(y)} до н. э.` : Math.round(y);
    now.firstChild.style.left = "-10px";
    M.setYear(y);
    window.PRIVER?.now(y);
    M.eraView(y);
    // ближайшая карточка к линии «сейчас»; в реке личностей карточек нет — и доводки к ним тоже
    if (pmode()) { activate(null); snapTo = null; } else {
    let best = null, bd = 1e9;
    items.forEach(it => { if (it.side !== "E") { const d = Math.abs(it.py - nowPx); if (d < bd) { bd = d; best = it; } } });
    activate(bd < 160 ? best : null);
    now.classList.toggle("hit", bd < 22);
    snapTo = bd < 90 && bd > 3 ? best : null; }
  }
  const h = document.documentElement;
  $("#progress").style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + "%";
}
let ticking = false;
// Остановился рядом с событием — лента мягко доезжает до него: река идёт «по моментам», а не просто течёт.
let snapTo = null, snapT;
addEventListener("scroll", () => {
  clearTimeout(snapT);
  snapT = setTimeout(() => { if (snapTo) { scrollToPx(snapTo.py); snapTo = null; } }, 220);
}, {passive: true});
// флаг снимаем в finally: одна ошибка в пересчёте не должна навсегда заморозить год и карту
addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { try { onScroll(); } finally { ticking = false; } }); } }, {passive: true});

function scrollToPx(px) {
  const top = tl.getBoundingClientRect().top + scrollY + px - innerHeight * NOWF();
  scrollTo({top, behavior: "smooth"});
}
document.addEventListener("click", e => {
  const card = e.target.closest(".card");
  if (card) {
    const it = items.find(i => i.el === card);
    if (it.side === "L") {
      const open = !card.classList.contains("open");
      document.querySelectorAll(".card.open").forEach(c => c.classList.remove("open"));
      card.classList.toggle("open", open);
      layout();
    }
    if (it.side === "R") activate(it);
    show(it, true);
    scrollToPx(it.py);
    return;
  }
  const era = e.target.closest("[data-era]"), ev = e.target.closest("[data-ev]");
  if (era || ev) {
    $("#toc").classList.remove("on"); $("#tocb").classList.remove("on");
    if (pmode()) window.RIVERAPI.mode(false);
    if (era) scrollToPx(items[+era.dataset.era].py - 10); else goTo(ev.dataset.ev);
    return;
  }
  if (e.target.closest("#tocb")) { $("#toc").classList.toggle("on"); $("#tocb").classList.toggle("on"); return; }
  if (!e.target.closest("#toc")) { $("#toc").classList.remove("on"); $("#tocb").classList.remove("on"); }
});

const goTo = t => { const it = items.find(i => i.side === "R" && i.t === t); if (it) { scrollToPx(it.py); activate(it); } };
// из вкладки древа: index.html#e=событие — перейти к нему
window.name = "kin-river";
const fromHash = () => { const m = location.hash.match(/^#e=(.+)/); if (m) setTimeout(() => goTo(decodeURIComponent(m[1])), 300); };
addEventListener("hashchange", fromHash); addEventListener("load", fromHash);

/* ---------- клавиши и панель команд ---------- */
const hist = items.filter(i => i.side === "R");
function jump(d) { // соседнее историческое событие
  const cur = activeIt && activeIt.side === "R" ? hist.indexOf(activeIt) : hist.findIndex(i => i.py > innerHeight * NOWF() - tl.getBoundingClientRect().top) - (d > 0 ? 1 : 0);
  const it = hist[Math.max(0, Math.min(hist.length - 1, cur + d))];
  if (it) { scrollToPx(it.py); activate(it); }
}
const toggleBody = (cls, btn) => { const on = document.body.classList.toggle(cls); document.querySelector(`.tools [data-k="${btn}"]`)?.classList.toggle("on", on); return on; };
function command(k) {
  switch (k) {
    case "m": toggleBody("maponly", "m"); M.refit(); M.resetView(); break;
    case "p": window.RIVERAPI.mode(!pmode()); break;
    case "r": { const on = toggleBody("rivermin", "r"); try { localStorage.setItem("rivermin", on ? "1" : ""); } catch {} layout(); onScroll(); M.refit(); break; }
    case "?": toggleBody("help", "?"); break;
    case "t": window.open("tree.html" + (window.CARD.id ? "#" + window.CARD.id : ""), "kin-tree"); break;
    case "d": case "arrowright": jump(1); break;
    case "a": case "arrowleft": jump(-1); break;
    case "escape": if (window.CARD.close()) break; if (pmode()) { if (!window.PRIVER.focus(null)) window.RIVERAPI.mode(false); break; } M.unpinLens(); if (!M.pickStep(null)) M.resetView(); document.body.classList.remove("help"); document.querySelector('.tools [data-k="?"]')?.classList.remove("on"); break;
    default: if (/^[1-9]$/.test(k)) M.pickStep(+k - 1); else return false;
  }
  return true;
}
// буквы ловим по физической клавише, чтобы работало и в русской раскладке (L = Д и т. д.)
addEventListener("keydown", e => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input,textarea")) return;
  const k = /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : /^Digit\d$/.test(e.code) ? e.code.slice(5) : e.key.toLowerCase();
  if (command(k)) e.preventDefault();
});
document.getElementById("tools").addEventListener("click", e => { const b = e.target.closest("button[data-k]"); if (b) command(b.dataset.k); });

const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {rootMargin: "0px 0px -6% 0px"});
items.forEach(it => it.side !== "E" && io.observe(it.el));

let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { layout(); onScroll(); }, 150); });
const start = () => {
  try { if (localStorage.getItem("rivermin")) { document.body.classList.add("rivermin"); document.querySelector('.tools [data-k="r"]')?.classList.add("on"); M.refit(); } } catch {}
  layout();
  M.setYear(Y0);
  M.eraView(Y0);
  const g = new URLSearchParams(location.search).get("y"); // ?y=965 — открыть на годе
  if (g) { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, tl.getBoundingClientRect().top + scrollY + yToPx(+g) - innerHeight * NOWF()); }
  onScroll();
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
if (location.hash || location.search.includes("y=")) hero.remove();
else { ["wheel", "keydown", "touchmove"].forEach(t => addEventListener(t, enter, {capture: true, passive: false})); hero.addEventListener("click", () => enter()); }
})();
