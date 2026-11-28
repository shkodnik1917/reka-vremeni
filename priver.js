// Река личностей: та же река времени, только в её руслах текут люди. Каждый — нить от рождения до смерти;
// нить идёт в русле земли, где человек сидит, и перетекает в другое русло, когда он меняет стол.
// Сын ответвляется от отца, рядом — жёны, поверх — связи: войны, убийства, союзы, изгнания, договоры.
// Новый том — новые русла и люди в тех же данных: PEOPLE, FAME (важность и «почему»), LINKS (связи).
window.PRIVER = (() => {
  const U = window.KINUI, P = U.P, esc = U.esc, FAME = window.FAME || {}, LINKS = window.LINKS || [];
  const {Y0, Y1} = window.RIVER;
  const officesByPerson = window.FLOWS.officesByPerson;
  const NS = "http://www.w3.org/2000/svg";
  const tl = document.getElementById("tl");
  let svg = null, bar = null, faces = null, pcol = null, all = false, sel = null, drawn = {}, tip = null;
  let zoom = null, win = null; // увеличенный человек и его окно лет
  let zf = 1; // масштаб реки: 1 — общий вид, больше — ближе
  // уровни приближения: на каждом своё — общий вид (главные) → лица второго ряда и связи главных → все люди и связи → события на руслах → пояснения к связям
  const LV = [1, 1.7, 2.8, 4.5, 7];
  const lv = () => LV.reduce((a, z, i) => zf >= z - .01 ? i : a, 0);

  // город → русло реки; до 1054 года все русские земли — одно русло «Русь»
  const CITY = {"Киев": "kie", "Вышгород": "kie", "Белгород": "kie", "Овруч": "kie", "Туров": "kie",
    "Новгород": "nov", "Ладога": "nov", "Псков": "nov", "Изборск": "nov", "Белоозеро": "nov", "Полоцк": "pol", "Минск": "pol",
    "Смоленск": "smo", "Чернигов": "che", "Новгород-Северский": "che", "Курск": "che", "Путивль": "che", "Козельск": "che", "Тмутаракань": "che",
    "Переяславль": "per", "Ростов": "vla", "Суздаль": "vla", "Владимир": "vla", "Переяславль-Залесский": "vla",
    "Рязань": "rya", "Муром": "rya", "Владимир-Волынский": "gal", "Галич": "gal", "Перемышль": "gal",
    "Москва": "moscow", "Серпухов": "moscow", "Углич": "moscow", "Звенигород": "moscow",
    "Тверь": "tver", "Кострома": "vla", "Вильна": "lithuania", "Троки": "lithuania", "Холм": "gal",
    "Сарай": "horde", "Сарай-Бату": "horde", "Сарай-Берке": "horde", "Кырк-Ер": "horde", "Казань": "horde", "Каракорум": "mong"};
  const HOME = {"Европа": "EU", "Галич · Волынь": "gal", "Полоцк": "pol", "Новгород": "nov", "Смоленск": "smo", "Киев": "kie", "Чернигов": "che",
    "Переяславль": "per", "Суздаль": "vla", "Рязань · Муром": "rya", "Степь": "STEPPE", "Византия": "byz",
    "Москва": "moscow", "Тверь": "tver", "Орда": "horde", "Литва": "lithuania", "Орден": "orders", "Османы": "ottoman"};
  const STEPPE = ["mong", "horde", "polov", "pech", "khaz", "avar", "hun", "sarm", "scyth"];
  const RUSSUB = new Set(["gal", "pol", "nov", "smo", "kie", "per", "che", "vla", "rya", "moscow", "tver"]);
  // вид связи: цвет, значок, как назвать. Цветов три: вражда — красный, союз и мир — зелёный, брак — золото; вид — значком
  const RED = "#d8452f", GRN = "#6fbf8f", GLD = "#e6c65a", NEU = "#c9b98f";
  const LT = {
    war: [RED, "⚔", "воевали"], kill: [RED, "†", "убил"], blind: [RED, "◉", "ослепил"], overthrow: [RED, "⇣", "изгнал"],
    captive: [RED, "⛓", "пленил"], ally: [GRN, "✚", "союз"], peace: [GRN, "☩", "мир, договор"], marry: [GLD, "⚭", "брак"],
    tribute: [NEU, "◆", "дань, подчинение"], mentor: [NEU, "☉", "опекал"], rival: [RED, "⚡", "соперники"], betray: [RED, "✕", "предал"]};

  // годы жизни: неизвестное рождение — от первого стола −18, от отца +25 или за 40 лет до смерти
  const memo = {};
  // Keep lifelines within the timeline's date range.
  const clampL = (a, b) => { a = Math.round(Math.max(Math.min(a, Y1 - 4), Y0)); return [a, Math.round(Math.min(Math.max(b, a + 3), Y1))]; };
  function life(id) {
    if (id in memo) return memo[id];
    const p = P[id], s = p.s || [];
    const offices = officesByPerson[id] || [];
    let a = p.by;
    // без дат вовсе — годы по связям из книги; нет и их — человека на реке нет
    if (a == null && p.y == null && !s.length && !p.f && !offices.length) {
      const ys = LINKS.filter(l => l.a === id || l.b === id).map(l => l.y);
      if (ys.length) return memo[id] = clampL(Math.min(...ys) - 12, Math.max(...ys) + 4);
      const h = (p.sp || []).find(x => P[x] && (P[x].by || P[x].y || (P[x].s || []).length)); // жена без дат — рядом с мужем
      return memo[id] = h && life(h) ? clampL(life(h)[0] + 5, life(h)[1]) : null;
    }
    if (a == null) {
      const f = p.f && P[p.f] && life(p.f);
      a = s.length ? Math.min(...s.map(x => x[1])) - 18 : offices.length ? Math.min(...offices.map(r => r.from)) : f ? f[0] + 25 : p.y - 40;
    }
    let b = p.y ?? (s.length ? Math.max(...s.map(x => x[2])) : offices.length ? Math.max(...offices.map(r => r.to)) : a + 50);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return memo[id] = null;
    if (b <= a) b = a + 3;
    return memo[id] = clampL(a, b);
  }
  const born = id => (life(id) || [1e4])[0];
  const w = id => FAME[id]?.w || 1;
  // при зуме видны все, кто жил в окне его лет; иначе — главные
  const inWin = id => win && life(id) && life(id)[1] >= win[0] + 8 && life(id)[0] <= win[1] - 8;
  const shown = id => !P[id].story && !!life(id) && (all || w(id) >= 2 || id === sel || inWin(id) || lv() >= 2);
  // ближняя родня и те, с кем его связала книга: у них на зуме лица
  function kinOf(id) {
    const p = P[id], k = new Set([id]);
    const add = x => x && P[x] && k.add(x);
    add(p.f); add(p.mo); add(p.f && P[p.f]?.f); (p.sp || []).forEach(add);
    Object.keys(P).forEach(x => { if (P[x].f === id || P[x].mo === id || (p.f && P[x].f === p.f)) add(x); });
    LINKS.forEach(l => { if (l.a === id) add(l.b); if (l.b === id) add(l.a); });
    return k;
  }

  // Compress the earliest years and use a constant scale from the ninth century.
  function scale() {
    const base = y => (y < 750 ? .45 : y < 860 ? 2.6 : 6.5) * zf;
    const br = [Y0 - 1, 750, 860, Y1 + 30];
    let px = 90; const an = [[br[0], px]];
    for (let i = 1; i < br.length; i++) { px += (br[i] - br[i - 1]) * base(br[i - 1]); an.push([br[i], px]); }
    return an;
  }

  // русло человека в год y
  const where = (() => {
    const m = {};
    return function at(id, y) {
      const k = id + "|" + y; if (k in m) return m[k];
      const p = P[id], s = (p.s || []).filter(q => CITY[q[0]]);
      let r = null;
      // несколько столов разом: Киев главнее, иначе — последний занятый
      const now = s.filter(q => y >= q[1] && y < q[2]).sort((u, v) => (v[0] === "Киев") - (u[0] === "Киев") || v[1] - u[1])[0];
      if (now) r = CITY[now[0]];
      else {
        const before = s.filter(q => q[2] <= y).sort((u, v) => v[2] - u[2])[0];
        const f = p.f && P[p.f] && life(p.f) && y <= life(p.f)[1] ? p.f : null;
        const h = (p.sp || []).find(x => P[x] && (P[x].s || []).length && life(x) && y >= life(x)[0] && y <= life(x)[1]);
        if (before) r = CITY[before[0]];
        else if (s.length && f) r = at(f, y);
        else if (!s.length && h && !U.isRurik(id)) r = at(h, y);
        else if (s.length) r = CITY[s[0][0]];
        else r = HOME[FAME[id]?.home] || officesByPerson[id]?.[0]?.flow || p.flows?.[0] || (U.isRurik(id) && f ? at(f, y) : "kie");
      }
      return m[k] = r;
    };
  })();

  // полоса русла в год y: [x0, x1] в пикселях
  let bandMemo = {};
  function band(id, y, raw) {
    const A = window.RIVERAPI, g = A.geom();
    const b = raw ? A.rawBands(y) : (bandMemo[y] = bandMemo[y] || A.bands(y));
    const has = q => q && q.f1 - q.f0 > .002;
    let s = null;
    if (id === "STEPPE") s = STEPPE.map(k => b.find(q => q.id === k)).filter(has).sort((u, v) => (v.f1 - v.f0) - (u.f1 - u.f0))[0];
    else if (id === "EU") s = b.find(q => q.id === "varang");
    else if (RUSSUB.has(id) && y < 1054) s = b.find(q => q.id === "rus");
    else s = b.find(q => q.id === id);
    if (!has(s)) {
      const inherited = {moscow:"vla", tver:"vla", horde:"mong", vla:"moscow"}[id];
      s = [inherited, "rus", "kie", "slav"].map(key => b.find(q => q.id === key)).find(has) || b.find(has);
    }
    return {k: s.id, x0: g.rx + s.f0 * g.rw, x1: g.rx + s.f1 * g.rw};
  }

  // сколько видимых людей в каком русле по годам (сглажено) — по этому река личностей раздаёт ширину руслам
  let crowdKey = null, crowdY = null;
  function crowd(y) {
    const key = all + "|" + zoom + "|" + (lv() >= 2);
    if (crowdKey !== key) {
      crowdKey = key; crowdY = {};
      const cnt = {};
      Object.keys(P).filter(shown).forEach(id => { const [a, b] = life(id); for (let t = a; t <= b; t++) { const k = band(where(id, t), t, true).k; ((cnt[t] = cnt[t] || {})[k] = (cnt[t][k] || 0) + 1); } });
      const keys = [...new Set(Object.values(cnt).flatMap(Object.keys))];
      for (let t = Y0; t <= Y1; t++) {
        const o = {}; let tot = 0;
        keys.forEach(k => { let s = 0; for (let d = -12; d <= 12; d++) s += (cnt[t + d]?.[k] || 0) * (13 - Math.abs(d)); if (s) { o[k] = s; tot += s; } });
        if (tot) { Object.keys(o).forEach(k => o[k] /= tot); crowdY[t] = o; }
      }
    }
    // между годами — плавно, чтобы края русел не шли ступеньками
    const yy = Math.max(Y0, Math.min(Y1, y)), a = crowdY[Math.floor(yy)], b = crowdY[Math.ceil(yy)], t = yy - Math.floor(yy);
    if (!a || !b || !t) return a || b || null;
    const o = {}; new Set([...Object.keys(a), ...Object.keys(b)]).forEach(k => o[k] = (a[k] || 0) * (1 - t) + (b[k] || 0) * t);
    return o;
  }

  // порядок в русле: по родословной (родня рядом), чужие — следом по рождению
  function orderKey() {
    const key = {}, kids = {};
    let n = 0;
    Object.keys(P).forEach(id => { const f = P[id].f; if (f) (kids[f] = kids[f] || []).push(id); });
    const walk = id => { if (id in key) return; key[id] = n++; (P[id].sp || []).forEach(x => { if (!(x in key) && !U.isRurik(x)) key[x] = n++; });
      (kids[id] || []).sort((a, b) => born(a) - born(b)).forEach(walk); };
    Object.keys(P).filter(id => U.isRurik(id) && !P[id].f).sort((a, b) => born(a) - born(b)).forEach(walk);
    Object.keys(P).sort((a, b) => born(a) - born(b)).forEach(id => { if (!(id in key)) key[id] = n++; });
    return key;
  }
  const KEY = orderKey();

  // положения: на каждый год люди в русле расставлены поровну, потом сглажено, чтобы переходы текли
  function positions(ids) {
    const A = window.RIVERAPI, pos = {};
    ids.forEach(id => pos[id] = []);
    const [ya, yb] = [Math.min(...ids.map(id => life(id)[0])), Math.max(...ids.map(id => life(id)[1]))];
    for (let y = ya; y <= yb; y++) {
      const groups = {};
      ids.forEach(id => { const [a, b] = life(id); if (y < a || y > b) return; const bd = band(where(id, y), y); (groups[bd.k] = groups[bd.k] || {bd, ids: []}).ids.push(id); });
      Object.values(groups).forEach(({bd, ids: g}) => {
        g.sort((u, v) => KEY[u] - KEY[v]);
        const wd = bd.x1 - bd.x0, step = Math.min(win && y >= win[0] && y <= win[1] ? 30 : 22, wd / (g.length + 1));
        const x0 = (bd.x0 + bd.x1) / 2 - step * (g.length - 1) / 2;
        g.forEach((id, i) => pos[id].push([y, x0 + step * i]));
      });
    }
    // сглаживание по соседним годам
    Object.values(pos).forEach(pts => {
      const xs = pts.map(p => p[1]);
      pts.forEach((p, i) => { let s = 0, ws = 0; for (let d = -6; d <= 6; d++) { const q = xs[i + d]; if (q == null) continue; const wt = 7 - Math.abs(d); s += q * wt; ws += wt; } p[1] = s / ws; p[2] = A.yToPx(p[0]); });
    });
    // сын выходит из нити отца: первые годы его нить плавно отходит от отцовской
    const BR = 12;
    ids.filter(id => pos[P[id].f]?.length).sort((a, b) => born(a) - born(b)).forEach(id => {
      const pts = pos[id], fp = pos[P[id].f], f0 = fp[0][0];
      pts.slice(0, BR + 1).forEach((p, k) => { const q = fp[p[0] - f0]; if (!q || q[0] !== p[0]) return; const t = k / BR, e = t * t * (3 - 2 * t); p[1] = q[1] + (p[1] - q[1]) * e; });
    });
    return pos;
  }
  const xAt = (id, y) => { const pts = drawn[id]; if (!pts?.length) return null; const p = pts[Math.max(0, Math.min(pts.length - 1, Math.round(y) - pts[0][0]))]; return p && Math.abs(p[0] - y) < 2 ? p : null; };

  function pathOf(pts) {
    if (pts.length < 2) return "";
    let d = `M${pts[0][1].toFixed(1)},${pts[0][2].toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 2] || pts[i - 1], p1 = pts[i - 1], p2 = pts[i], p3 = pts[i + 1] || p2;
      const c1x = p1[1] + (p2[1] - p0[1]) / 6, c1y = p1[2] + (p2[2] - p0[2]) / 6, c2x = p2[1] - (p3[1] - p1[1]) / 6, c2y = p2[2] - (p3[2] - p1[2]) / 6;
      d += `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[1].toFixed(1)},${p2[2].toFixed(1)}`;
    }
    return d;
  }
  const slice = (pts, a, b) => pts.filter(p => p[0] >= a && p[0] <= b);

  function draw(H, on) {
    if (!svg) {
      svg = document.createElementNS(NS, "svg"); svg.id = "people"; tl.appendChild(svg);
      faces = document.createElement("div"); faces.id = "pfaces"; tl.appendChild(faces);
      pcol = document.createElement("div"); pcol.id = "pcol"; tl.appendChild(pcol);
      bar = document.createElement("div"); bar.id = "pbar"; tl.prepend(bar);
      tip = document.createElement("div"); tip.id = "ptip"; document.body.appendChild(tip);
      wire(); wireZoom();
    }
    if (!on) { svg.innerHTML = faces.innerHTML = ""; drawn = {}; pcol.style.display = "none"; zf = 1; if (zoom) { zoom = win = sel = null; window.CARD?.close(); } return; }
    bandMemo = {};
    const A = window.RIVERAPI, G = A.geom(), right = G.rx + G.rw;
    svg.setAttribute("width", tl.clientWidth); svg.setAttribute("height", H);
    bar.innerHTML = `<b>Река личностей</b><span></span>${zoom || zf > 1.05 ? `<a data-pb="out">− общий вид</a>` : ""}<a data-pb="all" class="${all ? "on" : ""}">${all ? "все люди" : "только главные"}</a><a data-pb="back">← река событий</a><div class="lanes"></div>`;
    const ids = Object.keys(P).filter(shown);
    const pos = positions(ids);
    drawn = pos;
    const K = zoom ? kinOf(zoom) : new Set();
    svg.classList.toggle("zm", !!zoom);
    const L = lv();
    const zk = id => K.has(id) ? " zk" : "";
    let h = "";
    // связи родства: сын ответвляется от отца, жена подходит к мужу
    ids.forEach(id => {
      const p = P[id], st = drawn[id][0]; if (!st) return;
      (p.sp || []).filter(x => drawn[x] && KEY[x] > KEY[id]).forEach(x => {
        const y = Math.max(st[0], drawn[x][0][0]) + 2, a = xAt(id, y), b = xAt(x, y); if (!a || !b) return;
        h += `<path class="sp${K.has(id) && K.has(x) ? " zk" : ""}" data-a="${id}" data-b="${x}" d="M${a[1].toFixed(1)},${a[2].toFixed(1)}L${b[1].toFixed(1)},${b[2].toFixed(1)}"/>`;
      });
    });
    // люди: тонкая нить жизни, толще — на столе, золотая подложка и венец — в Киеве
    ids.sort((a, b) => w(a) - w(b)).forEach(id => {
      const pts = drawn[id], p = P[id], c = U.col(id), wt = w(id);
      if (pts.length < 2) return;
      let g = `<g class="pn w${wt}${id === sel ? " sel" : ""}${zk(id)}" data-id="${id}" style="--c:${c}">`;
      (p.s || []).filter(q => q[0] === "Киев").forEach(([, a, b]) => { const d = pathOf(slice(pts, a, b)); if (d) g += `<path class="kv" d="${d}"/>`; });
      g += `<path class="life" d="${pathOf(pts)}"/>`;
      (p.s || []).forEach(([cty, a, b]) => { const d = pathOf(slice(pts, a, b)); if (d) g += `<path class="seat" d="${d}"><title>${esc(cty)} ${a}–${b}</title></path>`; });
      g += `<path class="hit" d="${pathOf(pts)}"/>`;
      if (p.y && pts.length) { const e = pts[pts.length - 1]; g += `<circle class="end" cx="${e[1].toFixed(1)}" cy="${e[2].toFixed(1)}" r="2.4"/>`; }
      (p.s || []).filter(q => q[0] === "Киев").forEach(([, a]) => { const q = xAt(id, a); if (q) g += `<text class="crown" x="${q[1].toFixed(1)}" y="${(q[2] - 5).toFixed(1)}">♛</text>`; });
      g += `</g>`;
      h += g;
    });
    // связи из книги: дуга между двумя нитями в год события, значок — что случилось.
    // Общий вид — без связей; ближе — связи главных; ещё ближе — все
    const used = new Set(), lks = [];
    const linkOK = l => zoom && (l.a === zoom || l.b === zoom) || L >= 2 || L === 1 && w(l.a) >= 2 && w(l.b) >= 2;
    LINKS.forEach((l, i) => {
      if (!drawn[l.a] || !drawn[l.b] || !LT[l.t] || !linkOK(l)) return;
      const a = xAt(l.a, l.y), b = xAt(l.b, l.y); if (!a || !b) return;
      const k = [l.a, l.b, l.t, l.y].join(); if (used.has(k)) return; used.add(k);
      const [col, ico] = LT[l.t], y = a[2], bend = Math.min(26, 8 + Math.abs(b[1] - a[1]) * .12), mx = (a[1] + b[1]) / 2;
      lks.push({l, mx, my: y - bend / 2, col});
      h += `<g class="lk t-${l.t}${zoom && (l.a === zoom || l.b === zoom) ? " zk" : ""}" data-i="${i}" data-a="${l.a}" data-b="${l.b}" style="--c:${col}">`
        + `<path d="M${a[1].toFixed(1)},${y.toFixed(1)}Q${mx.toFixed(1)},${(y - bend).toFixed(1)} ${b[1].toFixed(1)},${b[2].toFixed(1)}"/>`
        + `<circle cx="${mx.toFixed(1)}" cy="${(y - bend / 2).toFixed(1)}" r="8"/><text x="${mx.toFixed(1)}" y="${(y - bend / 2 + 3.8).toFixed(1)}">${ico}</text></g>`;
    });
    // имена и лица. У каждого одно лицо и одна главная подпись — у первого стола (или начала нити);
    // у долгих жизней имя ещё раз мелко повторяется, но не чаще раза в полтора экрана
    const boxes = [], fc = [];
    const free = r => !boxes.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
    const face = id => id === zoom ? 26 : K.has(id) ? 19 : w(id) === 3 ? 16 : w(id) === 2 && L >= 1 ? 13 : 0; // радиус медальона; ближе — лица и у второго ряда
    const rank = id => (id === zoom ? 9 : K.has(id) ? 5 : 0) + w(id);
    const gap = Math.max(innerHeight * 1.05, 760);
    const place = (id, y0, R, rep) => {
      const wt = w(id), nm = P[id].n, big = !rep && (wt === 3 || K.has(id)), fs = rep ? 10.5 : id === zoom ? 15 : big ? 12.5 : 11, tw = nm.length * fs * .56;
      for (let dy = 0; dy < 40; dy += 3) {
        const p = xAt(id, y0 + dy); if (!p) return null;
        const r0 = R ? R + 5 : 5, hh = R || fs;
        let r = [p[1] - (R || 0), p[2] - hh, p[1] + r0 + 2 + tw, p[2] + Math.max(R, 3)], tx = p[1] + r0, anc = "start";
        if (r[2] > right) { r = [p[1] - r0 - 2 - tw, r[1], p[1] + (R || 0), r[3]]; tx = p[1] - r0; anc = "end"; }
        if (!free(r)) continue;
        boxes.push(r);
        h += `<text class="nm${rep ? " rep" : ` w${wt}${big ? " big" : ""}${id === zoom ? " me" : ""}`}${zk(id)}" data-id="${id}" x="${tx.toFixed(1)}" y="${(p[2] + (R ? 4 : 0)).toFixed(1)}" text-anchor="${anc}">${esc(nm)}</text>`;
        if (R) fc.push(`<a class="pf${zk(id)}${id === zoom ? " me" : ""}" data-p="${id}" style="left:${p[1].toFixed(1)}px;top:${p[2].toFixed(1)}px;--r:${R}px;--b:${U.col(id)}">${window.KINTREE.face(id)}</a>`);
        return p[2];
      }
      return null;
    };
    ids.sort((a, b) => rank(b) - rank(a) || born(a) - born(b)).forEach(id => {
      const pts = drawn[id]; if (pts.length < 2) return;
      const s = P[id].s || [];
      const y0 = s.length ? Math.max(s[0][1], pts[0][0]) : pts[0][0] + Math.min(10, pts.length / 3 | 0);
      let last = place(id, y0, face(id), false) ?? xAt(id, y0)?.[2] ?? pts[0][2];
      if (w(id) < 2 && !K.has(id)) return;
      pts.forEach(p => { if (p[2] - last > gap && pts[pts.length - 1][2] - p[2] > 200) { const q = place(id, p[0], 0, true); if (q != null) last = q; } });
    });
    // ещё ближе — события на руслах: где и когда это было; клик — к событию в реке событий
    if (L >= 3) (window.RIVER?.EVENTS || []).forEach(e => {
      const y = Math.round(e.y); if (y < Y0 || y > Y1) return;
      const bd = band(e.s, y), py = A.yToPx(e.y), tw = e.t.length * 6.4 + 22;
      const r = [bd.x0 + 4, py - 12, bd.x0 + 4 + tw, py + 6];
      if (r[2] > right || !free(r)) return;
      boxes.push(r);
      h += `<g class="evm" data-ev="${esc(e.t)}"><rect x="${r[0]}" y="${r[1]}" width="${tw}" height="18" rx="9"/><text x="${r[0] + 11}" y="${py + 1}">◆ ${esc(e.t)}</text></g>`;
    });
    // вплотную — пояснения к связям прямо у значков
    if (L >= 4) lks.forEach(({l, mx, my, col}) => {
      const t = (l.n || "").length > 64 ? l.n.slice(0, 62).replace(/\s+\S*$/, "") + "…" : l.n || ""; if (!t) return;
      const tw = t.length * 5.6, r = [mx + 12, my - 7, mx + 12 + tw, my + 6];
      if (r[2] > right || !free(r)) return;
      boxes.push(r);
      h += `<text class="ln" x="${r[0]}" y="${my + 3.5}" style="--c:${col}">${esc(t)}</text>`;
    });
    svg.innerHTML = h;
    faces.innerHTML = fc.join("");
    faces.classList.toggle("zm", !!zoom);
    // плашка увеличенного человека — справа от русел, на всю длину его окна, и едет вместе с рекой
    pcol.style.display = zoom && innerWidth >= 900 ? "block" : "none"; // на телефоне карточка остаётся поверх
    if (zoom && innerWidth >= 900) {
      const t = A.yToPx(win[0]), b = A.yToPx(win[1]);
      Object.assign(pcol.style, {left: (right + 24) + "px", width: (tl.clientWidth - right - 38) + "px", top: t + "px", height: (b - t) + "px"});
      const card = document.getElementById("card"); if (card && card.parentNode !== pcol) pcol.appendChild(card);
    }
    if (sel) mark(sel);
    now(A.nowYear());
  }

  // подсветка: человек и всё, что с ним связано
  function light(id) {
    svg.classList.toggle("hl", !!id);
    svg.querySelectorAll(".on").forEach(e => e.classList.remove("on"));
    if (!id) return;
    svg.querySelectorAll(`[data-id="${id}"], [data-a="${id}"], [data-b="${id}"]`).forEach(e => {
      e.classList.add("on");
      const o = e.dataset.a === id ? e.dataset.b : e.dataset.b === id ? e.dataset.a : null;
      if (o) svg.querySelectorAll(`.pn[data-id="${o}"], .nm[data-id="${o}"]`).forEach(x => x.classList.add("on"));
    });
  }
  const personTip = id => { const p = P[id], f = FAME[id]; return `<b>${esc(p.n)}</b><span class="k">${esc(U.years(id))} · ${esc((U.B[p.b]?.n || "").replace(/\s*\(.*\)/, ""))}${p.d ? "<br>" + esc(p.d) : ""}</span>${f?.why ? esc(f.why) : ""}`; };
  function mark(id) { sel = id; svg?.querySelectorAll(".pn.sel").forEach(e => e.classList.remove("sel")); if (id) svg?.querySelector(`.pn[data-id="${id}"]`)?.classList.add("sel"); }
  function showTip(html, e, c) { tip.innerHTML = html; tip.style.setProperty("--c", c); tip.style.left = Math.min(e.clientX + 16, innerWidth - 330) + "px"; tip.style.top = Math.min(e.clientY + 14, innerHeight - 140) + "px"; tip.classList.add("on"); }

  function wire() {
    svg.addEventListener("mouseover", e => {
      const g = e.target.closest(".pn, .nm"), l = e.target.closest(".lk");
      if (l) {
        const L = LINKS[+l.dataset.i], [c, ico, nm] = LT[L.t];
        light(null); l.classList.add("on"); svg.classList.add("hl");
        [L.a, L.b].forEach(x => svg.querySelectorAll(`.pn[data-id="${x}"], .nm[data-id="${x}"]`).forEach(y => y.classList.add("on")));
        showTip(`<b>${esc(P[L.a].n)} ${ico} ${esc(P[L.b].n)}</b><span class="k">${nm} · ${L.y}</span>${esc(L.n || "")}${L.ev ? `<i>«${esc(L.ev)}»</i>` : ""}`, e, c);
        return;
      }
      if (!g) return;
      const id = g.dataset.id;
      light(id);
      showTip(personTip(id), e, U.col(id));
    });
    svg.addEventListener("mousemove", e => { if (tip.classList.contains("on")) { tip.style.left = Math.min(e.clientX + 16, innerWidth - 330) + "px"; tip.style.top = Math.min(e.clientY + 14, innerHeight - 140) + "px"; } });
    svg.addEventListener("mouseout", e => { if (!e.relatedTarget || !svg.contains(e.relatedTarget) || !e.relatedTarget.closest(".pn, .nm, .lk")) { light(null); tip.classList.remove("on"); } });
    svg.addEventListener("click", e => {
      const l = e.target.closest(".lk");
      // связь — приблизить реку к её году, прямо под курсором
      if (l) { const L = LINKS[+l.dataset.i]; zoomTo(Math.max(zf, LV[2]), L.y, e.clientY, +l.querySelector("circle").getAttribute("cx")); return; }
      if (e.target.closest(".evm")) return;
      const g = e.target.closest(".pn, .nm"); if (g) window.CARD.open(g.dataset.id);
    });
    bar.addEventListener("click", e => {
      const a = e.target.closest("[data-pb]"); if (!a) return;
      if (a.dataset.pb === "back") { window.CARD.close(); window.RIVERAPI.mode(false); }
      if (a.dataset.pb === "all") { all = !all; window.RIVERAPI.redraw(); }
      if (a.dataset.pb === "out" && !window.CARD.close()) focus(null);
    });
  }

  // клик по человеку — зум реки: его годы растягиваются, появляются все люди того времени, у родни — лица.
  // null — отдалиться обратно к общему виду
  function focus(id) {
    const A = window.RIVERAPI; if (!A) return false;
    if (!id) { if (!zoom && zf === 1) return false; zoom = win = sel = null; zf = 1; A.relayout(A.nowYear()); return true; }
    if (!P[id]) return false;
    sel = id;
    const L = life(id);
    if (!L) { if (!document.body.classList.contains("pmode")) A.mode(true); mark(id); return true; }
    zoom = id; win = [Math.max(Y0, L[0] - 25), Math.min(Y1, L[1] + 20)];
    // масштаб — чтобы его жизнь заняла пару экранов
    zf = Math.max(LV[2], Math.min(LV[4], innerHeight * 2 / ((L[1] - L[0] + 20) * 6.5)));
    // если сейчас на линии его годы — остаёмся там, иначе — к его первому столу
    let y = A.nowYear(); if (y < L[0] || y > L[1]) y = (P[id].s || [])[0]?.[1] ?? L[0] + 16;
    A.relayout(y, document.body.classList.contains("pmode") ? null : true);
    const p = xAt(id, y); pop(p ? p[1] : 0, A.yToPx(y));
    return true;
  }
  // «въезд»: река раскрывается от точки (x, y)
  function pop(x, y) { [svg, faces].forEach(e => { e.style.transformOrigin = `${x}px ${y}px`; e.classList.remove("pz"); void e.offsetWidth; e.classList.add("pz"); }); }
  // масштаб k, год y остаётся на высоте экрана cy
  function zoomTo(k, y, cy, x = 0) {
    zf = Math.max(1, Math.min(8, k));
    window.RIVERAPI.relayout(y, null, cy);
    pop(x, window.RIVERAPI.yToPx(y));
  }

  // колесо над руслами — приближение к точке под курсором (сразу растягиваем картинку, перерисовываем, когда колесо замерло);
  // мимо русел колесо листает как обычно. Перетаскивание мышью по пустому месту — листать «рукой».
  function wireZoom() {
    const A = window.RIVERAPI;
    // колесо — по ступеням: каждый щелчок — следующий уровень, год под курсором остаётся на месте
    let acc = 0, busy = false;
    tl.addEventListener("wheel", e => {
      if (!document.body.classList.contains("pmode")) return;
      const G = A.geom(), r = tl.getBoundingClientRect(), x = e.clientX - r.left;
      if (!e.ctrlKey && (x < G.rx || x > G.rx + G.rw || e.target.closest("#card"))) return;
      e.preventDefault();
      acc += e.deltaY;
      if (busy || Math.abs(acc) < (e.ctrlKey ? 12 : 40)) return;
      const i = lv(), j = Math.max(0, Math.min(LV.length - 1, i + (acc < 0 ? 1 : -1))); acc = 0;
      if (j === i) return;
      busy = true; setTimeout(() => { busy = false; acc = 0; }, 320);
      zoomTo(LV[j], A.pxToY(e.clientY - r.top), e.clientY, x);
    }, {passive: false});
    let drag = null;
    tl.addEventListener("mousedown", e => {
      if (e.button || !document.body.classList.contains("pmode") || e.target.closest(".pn, .nm, .lk, .pf, #card, #pbar, a, button, [data-p]")) return;
      drag = {y: e.clientY, moved: false}; document.body.classList.add("grab"); e.preventDefault();
    });
    addEventListener("mousemove", e => { if (!drag) return; const dy = e.clientY - drag.y; drag.y = e.clientY; if (dy) { drag.moved = true; document.documentElement.style.scrollBehavior = "auto"; scrollBy(0, -dy); } });
    addEventListener("mouseup", () => { if (!drag) return; drag = null; document.body.classList.remove("grab"); document.documentElement.style.scrollBehavior = ""; });
  }
  // подписи русел на текущий год — в шапке над рекой
  const LANE = {kie: "Киев", nov: "Новгород", pol: "Полоцк", smo: "Смоленск", che: "Чернигов", per: "Переяславль", vla: "Суздаль", rya: "Рязань",
    gal: "Галич", rus: "Русь", varang: "Варяги и Европа", byz: "Византия", polov: "Половцы", pech: "Печенеги", khaz: "Хазары", mong: "Монголы", bulg: "Булгария", slav: "Славяне", dbulg: "Болгария",
    moscow: "Москва", tver: "Тверь", horde: "Орда", lithuania: "Литва", orders: "Ордены", ottoman: "Османы"};
  function now(y) {
    if (!bar || !document.body.classList.contains("pmode")) return;
    const ln = bar.querySelector(".lanes"); if (!ln) return;
    const A = window.RIVERAPI, g = A.geom(), yy = Math.round(Math.max(Y0, Math.min(Y1, y)));
    const key = yy + ":" + g.rw; if (ln.dataset.k === key) return; ln.dataset.k = key;
    const b = A.bands(yy), off = bar.getBoundingClientRect().left - tl.getBoundingClientRect().left;
    ln.innerHTML = b.filter(q => (q.f1 - q.f0) * g.rw > 34).map(q =>
      `<button type="button" data-flow="${q.id}" title="${esc(q.name)}" style="left:${(g.rx + q.f0 * g.rw - off).toFixed(0)}px;width:${((q.f1 - q.f0) * g.rw).toFixed(0)}px;--c:${q.color}">${esc(LANE[q.id] || q.name)}</button>`).join("");
  }
  return {draw, focus, mark, now, scale, crowd, hasLife: id => Boolean(P[id] && !P[id].story && life(id)), zoomed: () => !!zoom};
})();
