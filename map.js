// Карта: державы по году, маршруты, подсказки, легенда.
window.MAP = (() => {
  const {P, PRINC, POL, RUS} = window.GEO;
  Object.assign(P, window.XP || {}, {"Ольвия": [46.69, 31.9], "Пантикапей": [45.35, 36.47]});
  const DESC = window.RIVER.DESC;
  const CITYINFO = {...window.CITYINFO, ...window.HORDE_WORLD?.placeNotes};
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  // абзацы через пустую строку; *…* — опорные имена и даты
  // @{id|имя} — кликабельный человек (карточка)
  const link = h => window.KINUI ? window.KINUI.link(h) : h, strip = t => window.KINUI ? window.KINUI.strip(t) : t;
  const paras = t => t.split(/\n\n+/).map(x => `<p>${link(esc(x)).replace(/\*([^*]+)\*/g, "<b>$1</b>")}</p>`).join("");
  const fmt = y => y < 0 ? `${-y} до н. э.` : String(Math.floor(y));
  const KIND = {war:["#d8452f","военный поход"], trade:["#e6c65a","путь, посольство"], migration:["#7fa6d6","переселение народа"],
    flight:["#c9b48a","бегство, переезд"], story:["#e6c65a","путь героя повести"]};

  function geo(name) {
    if (!name) return null;
    const n = String(name).trim();
    if (P[n]) return P[n];
    const m = n.match(/^(.*?)\s*\((.*?)\)/);
    if (m) return geo(m[1]) || geo(m[2]);
    const b = n.replace(/^(р\.|река|город|г\.|оз\.)\s*/i, "");
    return P[b] || null;
  }

  const map = L.map("map", {zoomControl: false, scrollWheelZoom: true, wheelPxPerZoomLevel: 110, zoomSnap: .25, minZoom: 2, maxZoom: 8}).setView([52, 32], 4.5);
  L.control.zoom({position: "bottomright"}).addTo(map);
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}",
    {maxNativeZoom: 8, attribution: "Рельеф: Esri"}).addTo(map);
  const terrL = L.layerGroup().addTo(map), tribeL = L.layerGroup().addTo(map), cityL = L.layerGroup().addTo(map), routeL = L.layerGroup().addTo(map);

  const TRIBES = ["Поляне","Древляне","Северяне","Радимичи","Вятичи","Кривичи","Ильменские словене","Дреговичи","Волыняне","Уличи","Тиверцы","Чудь","Весь","Меря","Мурома","Мордва"];
  const CITIES = [["Ладога",750],["Новгород",850],["Киев",600],["Константинополь",-700],["Смоленск",850],["Полоцк",860],["Чернигов",900],
    ["Ростов",860],["Итиль",750,969],["Саркел",834,1117],["Булгар",900],["Тмутаракань",965],["Херсонес",-700],["Псков",903],
    ["Владимир",990],["Суздаль",1000],["Москва",1147],["Рязань",1096],["Галич",1140],["Владимир-Волынский",988],["Новгород-Северский",1078],["Доростол",900],
    ["Тверь",1247],["Вильна",1323],["Сарай-Бату",1254,1261],["Сарай-Берке",1262,1395],["Сарай",1396,1437],["Казань",1438]];
  const MAJOR = new Set(["Киев","Новгород","Константинополь","Итиль","Владимир","Москва","Смоленск","Полоцк","Чернигов","Галич","Булгар","Ладога","Тверь","Вильна","Сарай-Бату","Сарай-Берке","Сарай","Казань"]);
  const setZ = () => document.getElementById("map").classList.toggle("zlo", map.getZoom() < 5.5);
  map.on("zoomend", setZ); setZ();
  const centroid = r => r.reduce((a, p) => [a[0] + p[0] / r.length, a[1] + p[1] / r.length], [0, 0]);
  const divLabel = (ll, text, cls) => L.marker(ll, {interactive: false,
    icon: L.divIcon({className: "", iconSize: [0, 0], html: `<div class="lbl ${cls}" style="transform:translate(-50%,-50%)">${esc(text)}</div>`})});

  function active(y) {
    const out = POL.filter(p => y >= p.from && y <= p.to).map(p => ({...p, kind: "pol"}));
    if (y < 1054) RUS.filter(p => y >= p.from && y <= p.to).forEach(p => out.push({...p, color: p.name.startsWith("Тмут") ? "#6f8f3d" : "#b3261e", kind: "rus"}));
    else if (y <= 1240) {
      PRINC.forEach(p => out.push({...p, kind: "princ"}));
      RUS.filter(p => p.name.startsWith("Тмут") && y <= p.to).forEach(p => out.push({...p, color: "#6f8f3d", kind: "princ"}));
    }
    return out;
  }

  let key = "", polys = {}, curYear = null;
  function setYear(y) {
    if (y == null || isNaN(y)) return;
    y = Math.round(y);
    $("#mapyear").textContent = fmt(y);
    curYear = y;
    eraCard(y);
    seats(y);
    const ep = epoch(y);
    const list = active(y);
    const k = ep.k + list.map(t => `${t.name}:${t.from ?? ""}`).join("|") + (y > 550 && y < 1000 ? "T" : "") + CITIES.filter(c => y >= c[1] && y <= (c[2] ?? 9e9)).length;
    if (k === key) return;
    key = k; polys = {};
    terrL.clearLayers(); tribeL.clearLayers(); cityL.clearLayers();
    list.forEach(t => {
      const rus = t.kind === "rus", princ = t.kind === "princ";
      const base = {color: t.color, weight: rus ? 2.2 : 1.2, opacity: .9, fillColor: t.color, fillOpacity: rus ? .26 : princ ? .24 : .18, dashArray: rus || princ ? null : "5 4"};
      const pg = L.polygon(t.ring, {...base, className: "terr"}).addTo(terrL);
      pg._base = base;
      pg.bindTooltip(`<b>${esc(t.name)}</b>${esc(t.d || DESC[t.name] || "")}`, {sticky: true, className: "ttip", direction: "top", offset: [0, -8]});
      pg.on("mouseover", () => hl(pg, true)).on("mouseout", () => hl(pg, false));
      polys[t.name] = pg;
      if (!t.nolabel) divLabel(t.label || centroid(t.ring), t.name, princ ? "" : "big").addTo(terrL);
    });
    if (y > 550 && y < 1000) TRIBES.forEach(n => divLabel(P[n], n.replace("Ильменские словене", "Словене"), "tribe").addTo(tribeL));
    CITIES.forEach(([n, a, b]) => { if (y >= a && y <= (b ?? 9e9) && !ep.c.includes(n)) city(n, false, !MAJOR.has(n)).addTo(cityL); });
    ep.c.forEach(n => city(n, false, false, true).addTo(cityL));
    (ep.th || []).forEach(n => { const pg = polys[n]; if (!pg) return;
      pg._base = {...pg._base, color: "#ff3b2a", weight: 2.6, dashArray: "7 5"}; pg.setStyle(pg._base);
      pg.getElement()?.classList.add("threat");
      const t = list.find(q => q.name === n);
      L.marker(t.label || centroid(t.ring), {interactive: false, icon: L.divIcon({className: "", iconSize: [0, 0], html: `<div class="lbl threatlbl">угроза Руси</div>`})}).addTo(terrL); });
    if (ep.tp) L.marker(geo(ep.tp[0]), {interactive: false, icon: L.divIcon({className: "", iconSize: [0, 0], html: `<div class="lbl threatlbl">${esc(ep.tp[1])}</div>`})}).addTo(terrL);
    zoneOn.forEach(n => hl(polys[n], true));
    legend(list);
    dedupe();
  }

  // ----- столы: кто княжит в году; цвет — ветвь рода -----
  const seatL = L.layerGroup().addTo(map);
  const SEATS = ["Киев","Новгород","Чернигов","Переяславль","Полоцк","Смоленск","Ростов","Владимир","Галич","Владимир-Волынский","Туров","Тмутаракань",
    "Москва","Тверь","Вильна","Сарай-Бату","Сарай-Берке","Сарай","Казань"];
  let seatKey = "", plateCities = new Set();
  function seats(y) {
    const U = window.KINUI, K = window.PEOPLE;
    if (!U || !K) return;
    const hs = y < 862 ? [] : SEATS.filter(geo).map(c => [c, U.holder(c, y)]).filter(h => h[1]);
    const k = hs.map(h => h.join()).join("|");
    if (k === seatKey) return;
    seatKey = k;
    seatL.clearLayers();
    hs.forEach(([c, id]) => L.marker(geo(c), {interactive: false, icon: L.divIcon({className: "", iconSize: [0, 0],
      html: `<div class="seat" data-c="${esc(c)}" data-p="${id}" title="${esc(K.P[id].n)} — открыть карточку" style="--b:${U.col(id)}">${esc(K.P[id].n)}</div>`})}).addTo(seatL));
    hideSeats();
  }
  // где у города уже стоит табличка лиц сцены, подпись стола не дублируем
  const hideSeats = () => mapEl.querySelectorAll(".seat").forEach(e => e.classList.toggle("dup", plateCities.has(e.dataset.c)));

  function hl(pg, on) {
    if (!pg) return;
    pg.setStyle(on ? {weight: 3.2, fillOpacity: .5} : pg._base);
    if (on) pg.bringToFront();
  }
  function highlight(names, on) { (names || []).forEach(n => hl(polys[n], on)); }

  function city(name, hot, minor, ctr) {
    const ll = geo(name), g = L.layerGroup();
    if (!ll) return g;
    const info = CITYINFO[name];
    const region = !!polys[name]; // «Половецкая степь» и т. п.: подпись уже есть у области
    const tip = m => info ? m.bindTooltip(`<b>${esc(name)}</b>${esc(info)}`, {className: "ttip", direction: "auto", offset: [8, 0]}) : m;
    tip(L.marker(ll, {interactive: !!info, icon: L.divIcon({className: "", iconSize: [8, 8], iconAnchor: [4, 4], html: `<div class="cdot ${hot ? "hot" : ""} ${ctr ? "ctr" : ""}"></div>`})})).addTo(g);
    if (!region) tip(L.marker(ll, {interactive: !!info, icon: L.divIcon({className: "", iconSize: [0, 0], html: `<div class="lbl city ${hot ? "hot" : ""} ${minor ? "minor" : ""} ${ctr ? "ctr" : ""} ${info ? "hov" : ""}">${esc(name)}</div>`})})).addTo(g);
    return g;
  }

  // ----- легенда -----
  let legMin = false;
  function legend(list) {
    const seen = new Set();
    const rows = list.filter(t => !seen.has(t.name) && seen.add(t.name)).map(t =>
      `<div class="row" data-n="${esc(t.name)}"><i style="background:${t.color}"></i>${esc(t.name)}</div><div class="desc">${esc(t.d || DESC[t.name] || "")}</div>`).join("");
    const lines = Object.values(KIND).filter((v, i, a) => a.findIndex(w => w[1] === v[1]) === i).map(([c, n]) =>
      `<div class="row"><span class="ln" style="border-color:${c};${n.includes("героя") ? "border-top-style:dashed" : ""}"></span>${n}</div>`).join("");
    const L_ = $("#legend");
    L_.className = "legend" + (legMin ? " min" : "");
    L_.innerHTML = `<div class="h">на карте <span class="tog" title="свернуть">${legMin ? "+" : "–"}</span></div><div class="body">${rows}
      <div class="h" style="margin-top:6px">линии</div>${lines}
      <div class="row"><span class="cdot hot" style="margin:0 7px"></span>место события</div>
      <div class="row"><span class="cdot ctr" style="margin:0 7px"></span>главные центры эпохи</div>
      <div class="row"><span class="ln" style="border-color:#ff3b2a;border-top-style:dashed"></span>главная угроза Руси</div><div style="height:8px"></div></div>`;
  }
  const legEl = $("#legend");
  legEl.addEventListener("mouseover", e => {
    const r = e.target.closest(".row[data-n]");
    if (!r || r.contains(e.relatedTarget)) return;
    highlight([r.dataset.n], true);
    r.nextElementSibling.classList.add("on");
  });
  legEl.addEventListener("mouseout", e => {
    const r = e.target.closest(".row[data-n]");
    if (!r || r.contains(e.relatedTarget)) return;
    highlight([r.dataset.n], false);
    r.nextElementSibling.classList.remove("on");
  });
  legEl.addEventListener("click", e => { if (e.target.closest(".tog")) { legMin = !legMin; legEl.classList.toggle("min", legMin); e.target.textContent = legMin ? "+" : "–"; } });

  // ----- маршруты -----
  function curve(a, b, bend) {
    const [x1, y1, x2, y2] = [a[1], a[0], b[1], b[0]];
    const cx = (x1 + x2) / 2 - (y2 - y1) * bend, cy = (y1 + y2) / 2 + (x2 - x1) * bend, pts = [];
    for (let t = 0; t <= 1.0001; t += 1 / 24) pts.push([(1 - t) ** 2 * y1 + 2 * (1 - t) * t * cy + t * t * y2, (1 - t) ** 2 * x1 + 2 * (1 - t) * t * cx + t * t * x2]);
    return pts;
  }
  let routeKey = "";
  const CONTEXT = {...window.CONTEXT, ...window.HORDE_EARLY?.context, ...window.HORDE_LATE?.context};
  function eventContext(ev) {
    const p = CONTEXT[ev.t]?.p;
    return p ? `<div class="ctx"><p>${link(esc(p))}</p></div>` : "";
  }
  function caption(ev, sub, kind, routeText) {
    const [c, kn] = KIND[kind] || ["#d8452f", "место события"];
    const cap = $("#mapcap");
    cap.style.setProperty("--c", ev.story ? KIND.story[0] : c);
    cap.innerHTML = `<span class="k">${ev.story ? esc("повесть · " + ev.story) : kn}</span><b>${esc(ev.t)}</b>${esc(sub || "")}${eventContext(ev)}${routeText ? `<div class="r">${esc(routeText)}</div>` : ""}`;
    cap.scrollTop = 0;
    cap.classList.remove("off");
  }
  function showRoute(ev, force) {
    const k = JSON.stringify(ev.r) + ev.t;
    if (k === routeKey && !force) return;
    routeKey = k;
    routeL.clearLayers(); plateL.clearLayers(); cur = null; sceneB = null; useLoupe = false; zones([]); window.FX?.clear();
    const kind = ev.k || "war", color = KIND[kind][0];
    const pts = [];
    ev.r.forEach(n => { const ll = geo(n); if (ll && !(pts.length && pts[pts.length - 1].ll + "" === ll + "")) pts.push({n, ll}); });
    pts.forEach((p, i) => city(p.n, i === 0 || i === pts.length - 1).addTo(routeL));
    hotLL = pts.map(p => p.ll); dedupe();
    if (pts.length >= 2) {
      let line = [];
      for (let i = 0; i < pts.length - 1; i++) line = line.concat(curve(pts[i].ll, pts[i + 1].ll, i % 2 ? -.15 : .15));
      L.polyline(line, {color: "#000", weight: 7, opacity: .35, interactive: false}).addTo(routeL);
      const pl = L.polyline(line, {color, weight: 3.5, opacity: .95, interactive: false, dashArray: kind === "story" ? "8 7" : null, className: kind === "story" ? "" : "route-line"}).addTo(routeL);
      const path = pl.getElement();
      if (path && kind !== "story") path.setAttribute("pathLength", 1);
      const a = map.latLngToContainerPoint(line[line.length - 2]), b = map.latLngToContainerPoint(line[line.length - 1]);
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
      L.marker(line[line.length - 1], {interactive: false, icon: L.divIcon({className: "", iconSize: [16, 16], iconAnchor: [8, 8],
        html: `<div class="arrowhead" style="--c:${color};transform:rotate(${ang}deg)"></div>`})}).addTo(routeL);
    }
    caption(ev, [ev.d, ev.loc].filter(Boolean).join(" · "), kind, ev.r.join(" → "));
    fitEvent();
  }
  function focusPlace(ev) {
    const ll = geo(ev.p);
    if (!ll) { clearRoute(); return; }
    const k = "p:" + ev.p + ev.t;
    if (k === routeKey) return;
    routeKey = k;
    routeL.clearLayers(); plateL.clearLayers(); cur = null; sceneB = null; useLoupe = false; zones([]);
    city(ev.p, true).addTo(routeL);
    hotLL = [ll]; dedupe();
    caption(ev, [ev.d, ev.loc || ev.p].filter(Boolean).join(" · "), null, "");
    fitEvent();
  }
  function clearRoute() { window.FX?.clear(); sceneB = null; cur = null; cpts = null; homeV = null; plateL.clearLayers(); useLoupe = false; if (lensPinned) setPinned(false); hideLens(); routeKey = ""; hotLL = []; zones([]); dedupe(); routeL.clearLayers(); routeL._badges = []; $("#mapcap").classList.add("off"); }
  let zoneOn = [];
  function zones(list) { zoneOn.forEach(n => hl(polys[n], false)); zoneOn = list.filter(n => polys[n]); zoneOn.forEach(n => hl(polys[n], true)); }
  // Сцена: несколько пронумерованных стрелок по очереди, действующие лица у своих городов, заметки.
  const STEP = .85;
  let sceneB = null, cur = null, lock = null;
  const plateL = L.layerGroup().addTo(map);
  const mapEl = document.getElementById("map");
  // ----- линза: круглое увеличительное стекло под курсором. Появляется само, когда мышь над густым
  // местом сцены (рядом три точки или две почти слиплись), и ездит за мышью; с Shift — где угодно. -----
  const loupeEl = $("#loupe"), lmapEl = $("#loupemap");
  let lmap = null, lRouteL, lPlateL, lTerrL, useLoupe = false, loupeKey = "", lensOn = false, lastCp = null;
  const LENS_R = 125, LENS_DZ = 1.75;
  function loupeMap() {
    if (lmap) return lmap;
    lmap = L.map(lmapEl, {zoomControl: false, attributionControl: false, boxZoom: false, keyboard: false, zoomSnap: 0, maxZoom: 9,
      fadeAnimation: false, zoomAnimation: false, wheelPxPerZoomLevel: 110});
    [lmap.dragging, lmap.scrollWheelZoom, lmap.doubleClickZoom].forEach(h => h.disable());
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}", {maxNativeZoom: 8}).addTo(lmap);
    lTerrL = L.layerGroup().addTo(lmap); lRouteL = L.layerGroup().addTo(lmap); lPlateL = L.layerGroup().addTo(lmap);
    lmap.on("zoomend", () => placeBadges(lmap, lRouteL));
    let dt; lmap.on("moveend", () => { clearTimeout(dt); dt = setTimeout(() => declutter(lmapEl), 120); });
    return lmap;
  }
  // Содержимое линзы для новой сцены: территории года, стрелки, города (таблички кладёт plates()).
  function buildLoupe() {
    useLoupe = !!(cur && sceneB);
    if (!useLoupe) { hideLens(); return; }
    const m = loupeMap();
    if (!m._loaded) m.setView(sceneB.getCenter(), map.getZoom() + LENS_DZ, {animate: false}); // слои нельзя класть на карту без вида
    if (loupeKey === routeKey) return;
    loupeKey = routeKey;
    lTerrL.clearLayers();
    Object.values(polys).forEach(pg => L.polygon(pg.getLatLngs(), {...pg._base, interactive: false}).addTo(lTerrL));
    // подписи городов, племён и держав — как на общей карте; места сцены рисуются жёлтыми ниже, их не дублируем
    const hot = new Set(sceneCities().map(n => geo(n) + ""));
    [terrL, tribeL, cityL].forEach(g => g.eachLayer(l => { if (l.getLatLng && !hot.has(l.getLatLng() + "") && l.options.icon)
      L.marker(l.getLatLng(), {icon: l.options.icon, interactive: false}).addTo(lTerrL); }));
    lRouteL.clearLayers();
    drawSteps(m, lRouteL, cur.ar);
    sceneCities().forEach(n => city(n, true).addTo(lRouteL));
    placeBadges(m, lRouteL);
  }
  // экранные точки мест сцены считаем один раз на вид карты, а не на каждое движение мыши
  let cpts = null;
  const scenePts = () => cpts || (cpts = sceneCities().map(n => map.latLngToContainerPoint(geo(n))));
  map.on("move zoom", () => { cpts = null; });
  function dense(cp) {
    const pp = scenePts().filter(p => p.distanceTo(cp) < 60);
    return pp.length >= 3 || (pp.length === 2 && pp[0].distanceTo(pp[1]) < 34);
  }
  // Три режима: «авто» (сама над густым местом), «по L» (ездит за мышью везде) и «закреплена» (клик по ней).
  // Пока лупа просто смотрит, она закрывает карту под курсором: ничего не подсвечивает и не цепляется.
  let lensPinned = false;
  const wrapEl = mapEl.parentElement;
  function moveLens(cp) {
    lastCp = cp;
    if (lensPinned) return;
    if (!useLoupe) { hideLens(); return; }
    const near = lensOn && scenePts().some(p => p.distanceTo(cp) < 85);
    if (!(dense(cp) || near)) { hideLens(); return; }
    loupeMap();
    if (!lensOn) { lensOn = true; loupeEl.classList.add("on"); lmap.invalidateSize(); }
    loupeEl.style.left = (cp.x - LENS_R) + "px"; loupeEl.style.top = (cp.y - LENS_R) + "px";
    lmap.setView(map.containerPointToLatLng(cp), Math.min(map.getZoom() + lensDz, 8.5), {animate: false});
  }
  let lensDz = LENS_DZ;
  function hideLens() { if (lensOn && !lensPinned) { lensOn = false; loupeEl.classList.remove("on"); } }
  function setPinned(on) {
    lensPinned = on;
    loupeEl.classList.toggle("pinned", on);
    [lmap.dragging, lmap.scrollWheelZoom, lmap.doubleClickZoom].forEach(h => on ? h.enable() : h.disable());
    if (!on) { lensOn = false; loupeEl.classList.remove("on"); }
  }
  let lensRaf = 0;
  wrapEl.addEventListener("mousemove", e => {
    const r = mapEl.getBoundingClientRect(), cp = L.point(e.clientX - r.left, e.clientY - r.top);
    cancelAnimationFrame(lensRaf); lensRaf = requestAnimationFrame(() => moveLens(cp));
  });
  wrapEl.addEventListener("mouseleave", () => { if (!lensPinned) hideLens(); });
  map.on("zoomstart movestart", () => { if (!lensPinned) hideLens(); });
  // колесо над смотрящей лупой — сила увеличения; клик — закрепить
  loupeEl.addEventListener("wheel", e => {
    if (lensPinned) return;
    e.preventDefault(); e.stopPropagation();
    lensDz = Math.max(.75, Math.min(3.5, lensDz - Math.sign(e.deltaY) * .25));
    if (lastCp) moveLens(lastCp);
  }, {passive: false});
  loupeEl.addEventListener("click", e => { if (!lensPinned && !e.target.closest(".lx")) setPinned(true); });
  loupeEl.querySelector(".lx").addEventListener("click", e => { e.stopPropagation(); setPinned(false); });
  // ----- шаги, таблички, фокус -----
  // Шаг ↔ люди и заметки: человек — если его имя есть во фразе шага или он сидит в точке маршрута; заметка — если её место на маршруте.
  const stem = n => { const w = n.split(" ")[0].toLowerCase(); return w.slice(0, Math.max(3, w.length - 2)); };
  function stepInfo(i) {
    const a = cur.ar[i], text = (a.n || "").toLowerCase(), rs = new Set(a.r);
    return {who: (cur.sc.who || []).filter(w => text.includes(stem(w[0])) || rs.has(w[1])),
            pin: (cur.sc.pin || []).filter(p => rs.has(p[0]))};
  }
  const sceneCities = () => !cur ? [] : [...new Set([...cur.ar.flatMap(a => a.r), ...(cur.sc.who || []).map(w => w[1]), ...(cur.sc.pin || []).map(p => p[0])])].filter(geo);
  // Номера шагов: на ту точку своей линии, где не налезают на уже поставленные. Перекладываем после каждого зума.
  function placeBadges(m, layer) {
    const taken = [];
    (layer._badges || []).forEach(({mk, line, i}) => {
      const FR = i % 2 ? [.62, .4, .75, .28, .5, .85, .18] : [.4, .62, .28, .75, .5, .18, .85];
      let at = line[Math.floor(line.length * FR[0])];
      for (const f of FR) { const ll = line[Math.min(line.length - 1, Math.floor(line.length * f))], q = m.latLngToContainerPoint(ll);
        if (taken.every(t => t.distanceTo(q) > 28)) { at = ll; break; } }
      taken.push(m.latLngToContainerPoint(at));
      mk.setLatLng(at);
    });
  }
  map.on("zoomend", () => placeBadges(map, routeL));
  function drawSteps(m, layer, ar) {
    layer._badges = [];
    ar.forEach((a, i) => {
      const kind = KIND[a.k] ? a.k : "war", color = KIND[kind][0], pts = [];
      a.r.forEach(n => { const ll = geo(n); if (ll && !(pts.length && pts[pts.length - 1] + "" === ll + "")) pts.push(ll); });
      let line = [];
      // изгиб по чётности шага; для обратного направления знак переворачиваем, чтобы «туда» и «обратно» не слипались
      for (let j = 0; j < pts.length - 1; j++) {
        const rev = pts[j][0] > pts[j + 1][0] || (pts[j][0] === pts[j + 1][0] && pts[j][1] > pts[j + 1][1]);
        line = line.concat(curve(pts[j], pts[j + 1], ((i + j) % 2 ? -.14 : .14) * (rev ? -1 : 1)));
      }
      const d = (i * STEP).toFixed(2) + "s";
      L.polyline(line, {color: "#000", weight: 6, opacity: .3, interactive: false, className: "route-shadow step" + i}).addTo(layer).getElement()?.style.setProperty("animation-delay", d);
      const path = L.polyline(line, {color, weight: 3.2, opacity: .95, interactive: false, className: "route-line step" + i}).addTo(layer).getElement();
      if (path) { path.setAttribute("pathLength", 1); path.style.animationDelay = d; path.style.animationDuration = "1.3s"; }
      const a1 = m.latLngToContainerPoint(line[line.length - 2]), b1 = m.latLngToContainerPoint(line[line.length - 1]);
      const ang = Math.atan2(b1.y - a1.y, b1.x - a1.x) * 180 / Math.PI + 90;
      L.marker(line[line.length - 1], {interactive: false, icon: L.divIcon({className: "", iconSize: [16, 16], iconAnchor: [8, 8],
        html: `<div class="arrowhead step${i}" style="--c:${color};transform:rotate(${ang}deg);animation-delay:${(i * STEP + 1.1).toFixed(2)}s"></div>`})}).addTo(layer);
      if (ar.length < 2) return;
      const at = line[Math.floor(line.length * .5)];
      L.marker(at, {zIndexOffset: 1000, icon: L.divIcon({className: "", iconSize: [22, 22], iconAnchor: [11, 11],
        html: `<div class="stepn step${i}" style="--c:${color};animation-delay:${d}">${i + 1}</div>`})})
        .on("mouseover", () => hoverStep(i)).on("mouseout", () => hoverStep(null)).on("click", () => clickStep(i)).addTo(layer);
      layer._badges.push({mk: layer.getLayers().at(-1), line, i});
    });
  }
  // Таблички у городов. Обычный вид — только имена; в фокусе шага — имя с ролью и заметки места.
  function plates(who, pins, full) {
    plateL.clearLayers(); if (lPlateL) lPlateL.clearLayers();
    const byPl = {};
    const at = pl => byPl[pl] = byPl[pl] || {who: [], pin: []};
    who.forEach(w => geo(w[1]) && at(w[1]).who.push(w));
    if (full) pins.forEach(p => geo(p[0]) && at(p[0]).pin.push(p[1]));
    plateCities = new Set(Object.keys(byPl).filter(pl => byPl[pl].who.length));
    hideSeats();
    Object.entries(byPl).forEach(([pl, g]) => {
      const nm = w => w[4] && window.KINUI?.P[w[4]] ? `<a class="pp" data-p="${w[4]}">${esc(w[0])}</a>` : esc(w[0]);
      const head = full ? g.who.map(w => `<b>${nm(w)}${w[2] ? ` <em>${esc(w[2])}</em>` : ""}</b>`).join("")
        : g.who.length ? `<b>${g.who.map(nm).join(" · ")}</b>` : "";
      const evs = g.pin.map(t => `<span class="${g.who.length ? "" : "only"}">${esc(t)}</span>`).join("");
      if (!head && !evs) return;
      const all = (cur.sc.who || []).filter(w => w[1] === pl), allp = (cur.sc.pin || []).filter(p => p[0] === pl);
      const tip = `<b>${esc(pl)}</b>` + all.map(([n, , r, d]) => `<div class="tw"><i>${esc(n)}</i> — ${esc(r || "")}${d ? `<div class="tr">${esc(d)}</div>` : ""}</div>`).join("")
        + (allp.length ? `<div class="tp">${allp.map(p => "• " + esc(p[1])).join("<br>")}</div>` : "");
      // одна и та же табличка на общей карте и в лупе; где не влезает — прячется
      [plateL, useLoupe ? lPlateL : null].forEach(layer => layer && L.marker(geo(pl), {zIndexOffset: 900, icon: L.divIcon({className: "", iconSize: [0, 0],
        html: `<div class="pole"></div><div class="who${full ? " full" : ""}">${head}${evs}</div>`})})
        .bindTooltip(tip, {className: "ttip", direction: "auto", offset: [14, -24]}).addTo(layer));
    });
    requestAnimationFrame(() => { declutter(mapEl); if (useLoupe) declutter(lmapEl); });
  }
  function focusStep(i) {
    if (!cur) return;
    [mapEl, lmapEl].forEach(el => { el.classList.toggle("stepfocus", i != null); el.querySelectorAll(".sel").forEach(e => e.classList.remove("sel")); });
    document.querySelectorAll("#mapcap li.sel").forEach(e => e.classList.remove("sel"));
    window.FX?.step(i == null ? null : cur.ar[i], i);
    if (i == null) { plates(cur.sc.who || [], [], false); return; }
    [mapEl, lmapEl].forEach(el => el.querySelectorAll(".step" + i).forEach(e => e.classList.add("sel")));
    document.querySelector(`#mapcap li[data-i="${i}"]`)?.classList.add("sel"); // подробность шага раскрывается в списке
    const s = stepInfo(i);
    plates(s.who, s.pin, true);
  }
  const hoverStep = i => { if (lock == null) focusStep(i); };
  // клик по шагу = закрепить и подлететь к нему (как Z); повторный клик — снять и вернуть прежний вид
  function clickStep(i) {
    lock = lock === i ? null : i;
    document.querySelectorAll("#mapcap li").forEach(li => { li.classList.toggle("lock", +li.dataset.i === lock); li.classList.toggle("open", +li.dataset.i === lock); });
    focusStep(lock);
    if (lock != null) zoomToFocus(); else back();
  }
  const capEl = $("#mapcap");
  capEl.addEventListener("mouseover", e => { const li = e.target.closest("li[data-i]"); if (li) hoverStep(+li.dataset.i); });
  capEl.addEventListener("mouseout", e => { const li = e.target.closest("li[data-i]"); if (li && !li.contains(e.relatedTarget)) hoverStep(null); });
  capEl.addEventListener("click", e => { const li = e.target.closest("li[data-i]"); if (li) clickStep(+li.dataset.i); });
  function showScene(ev, sc, force) {
    const k = "s:" + ev.t;
    if (k === routeKey && !force) return;
    routeKey = k;
    routeL.clearLayers();
    lock = null; homeV = null; cpts = null;
    mapEl.classList.remove("stepfocus");
    zones(sc.zone || []);
    const ar = (sc.ar || []).filter(a => a.r.map(geo).filter(Boolean).length >= 2);
    cur = {sc, ar};
    window.FX?.scene(ev, cur);
    drawSteps(map, routeL, ar);
    placeBadges(map, routeL);
    const pts = sceneCities();
    pts.forEach(n => city(n, true).addTo(routeL));
    const all = pts.map(geo);
    hotLL = all; dedupe();
    sceneB = all.length ? L.latLngBounds(all) : null;
    if (lensPinned) setPinned(false);
    buildLoupe();
    focusStep(null);
    if (!ar.length) plates(sc.who || [], sc.pin || [], true); // без шагов заметки показываем сразу
    const steps = ar.map((a, i) => {
      const n = strip(a.n) || a.r.join(" → "), k = n.indexOf(" · "), c = (KIND[a.k] || KIND.war)[0];
      const [when, what] = k > 0 ? [n.slice(0, k), n.slice(k + 3)] : ["", n];
      return `<li data-i="${i}"><i style="--c:${c}">${i + 1}</i><span>${esc(what)}</span><em>${esc(when)}</em>${a.b ? `<div class="sb">${link(esc(a.b))}</div>` : ""}${a.x ? `<div class="sx">${paras(a.x)}</div>` : ""}</li>`;
    }).join("");
    capEl.style.setProperty("--c", "var(--gold2)");
    capEl.innerHTML = `<b>${esc(ev.t)}</b><span class="cd">${esc(ev.d)}</span>${eventContext(ev)}${steps ? `<ol class="steps">${steps}</ol>` : ""}`;
    capEl.scrollTop = 0;
    capEl.classList.remove("off");
    fitEvent();
  }
  // Вид меняется только на границе эпохи; внутри эпохи карта стоит и лишь расширяется, если маршрут не влез.
  const ERAB = [[-1e9, [[40, 14], [58, 52]]], [550, [[42, 16], [62, 50]]], [855, [[39, 15], [62, 50]]],
    [880, [[40, 22], [62, 50]]], [1054, [[44, 22], [63, 47]]], [1223, [[45, 22], [61, 52]]],
    ...(window.HORDE_PERIOD?.mapViews || [])];
  const PADF = () => ({paddingTopLeft: [30, 50], paddingBottomRight: [20, 60]});
  let viewB = null, eraKey = null;
  function eraView(y) {
    let b; ERAB.forEach(([t, bb]) => { if (y >= t) b = bb; });
    if (b + "" === eraKey) return;
    eraKey = b + ""; viewB = L.latLngBounds(b);
    map.flyToBounds(viewB, {...PADF(), duration: 1.4});
  }
  // Подписи базового слоя, совпадающие с точками маршрута, прячем: остаётся одна (жёлтая).
  let hotLL = [];
  function dedupe() {
    const hp = hotLL.map(ll => map.latLngToContainerPoint(ll));
    const walk = l => {
      if (l.eachLayer) { l.eachLayer(walk); return; }
      const el = l.getElement && l.getElement();
      if (!el || !l.getLatLng) return;
      const p = map.latLngToContainerPoint(l.getLatLng());
      el.style.visibility = hp.some(q => q.distanceTo(p) < 42) ? "hidden" : "";
    };
    cityL.eachLayer(walk); tribeL.eachLayer(walk);
    // подписи держав и княжеств, на которые налезает жёлтая подпись места, тоже прячем
    const hot = [...document.querySelectorAll("#map .lbl.city.hot")].map(e => e.getBoundingClientRect());
    terrL.eachLayer(l => {
      const el = l.getLatLng && l.getElement && l.getElement(); if (!el) return;
      const r = el.firstElementChild?.getBoundingClientRect(); if (!r) return;
      el.style.visibility = hot.some(q => r.left < q.right && r.right > q.left && r.top < q.bottom && r.bottom > q.top) ? "hidden" : "";
    });
  }
  map.on("zoomend", dedupe);
  // Лица и заметки сцены не должны налезать друг на друга и на жёлтые подписи: раздвигаем по вертикали.
  // Таблички не налезают ни на что: пробуем места над городом, под ним и сбоку; обходим подписи, номера шагов
  // и панели поверх карты. Свободного места нет — табличка прячется (её содержимое есть в подсказке города).
  function declutter(box = mapEl) {
    const mb = box.getBoundingClientRect();
    const els = [...box.querySelectorAll(".who")];
    els.forEach(e => { e.style.translate = ""; e.style.visibility = ""; });
    const vis = e => e.offsetParent && getComputedStyle(e).visibility !== "hidden" && (e.closest(".leaflet-marker-icon")?.style.visibility || "") !== "hidden";
    const placed = [...box.querySelectorAll(".lbl.city, .lbl.big, .lbl.threatlbl, .stepn")].filter(vis).map(e => e.getBoundingClientRect())
      .concat((box === mapEl ? ["#mapcap:not(.off)", "#legend", ".mapyear", ".mapnote"] : []).map(q => document.querySelector(q)).filter(Boolean).map(e => e.getBoundingClientRect()));
    const area = (r, q) => Math.max(0, Math.min(r.right, q.right + 2) - Math.max(r.left, q.left - 2)) * Math.max(0, Math.min(r.bottom, q.bottom + 2) - Math.max(r.top, q.top - 2));
    els.forEach(e => {
      const r = e.getBoundingClientRect(), h = r.height, sx = r.width / 2 + 14, below = h + 22;
      const C = [];
      [0, -(h + 3), below, -2 * (h + 3), below + h + 3].forEach(dy => [0, sx, -sx].forEach(dx => C.push([dx, dy])));
      C.sort((a, b) => Math.hypot(a[0], a[1] * 1.3) - Math.hypot(b[0], b[1] * 1.3));
      let best = null, bs = Infinity;
      for (const [dx, dy] of C) {
        const q = {left: r.left + dx, right: r.right + dx, top: r.top + dy, bottom: r.bottom + dy};
        const out = Math.max(0, mb.left + 4 - q.left) + Math.max(0, q.right - mb.right + 4) + Math.max(0, mb.top + 4 - q.top) + Math.max(0, q.bottom - mb.bottom + 4);
        const sc = placed.reduce((s, p) => s + area(q, p), 0) + out * 400;
        if (sc < bs) { bs = sc; best = [dx, dy]; }
        if (!sc) break;
      }
      if (bs > 0) { e.style.visibility = "hidden"; e.previousElementSibling.style.visibility = "hidden"; return; }
      e.previousElementSibling.style.visibility = "";
      e.style.translate = `${best[0]}px ${best[1]}px`;
      const pole = e.previousElementSibling, top = -10 - h + best[1], bot = -10 + best[1];
      const x = best[0], y = bot <= 0 ? bot : top >= 0 ? top : 0; // от точки города к ближнему краю таблички
      pole.style.width = Math.hypot(x, y) + "px";
      pole.style.transform = `rotate(${Math.atan2(y, x)}rad)`;
      placed.push({left: r.left + best[0], right: r.right + best[0], top: r.top + best[1], bottom: r.bottom + best[1]});
    });
  }
  map.on("zoomend moveend", () => requestAnimationFrame(() => declutter(mapEl)));

  // Эпоха: главные центры (золотые кольца) и главная угроза (красный пунктир).
  function epoch(y) {
    let e = window.STATS.eras[0][1];
    window.STATS.eras.forEach(x => { if (y >= x[0]) e = x[1]; });
    return {...e, k: e.c.join() + (e.th || []).join()};
  }

  // Плашка «эпоха · кто правит» — видна в режиме «только карта», где нет реки и левой колонки.
  // Под годом — кто правит и с какого года (видно в режиме «только карта», где нет левой колонки).
  let ecKey = "";
  function eraCard(y) {
    let r = null;
    window.STATS.rulers.forEach(x => { if (y >= x[0] && x[1] !== "—") r = x; });
    const k = r ? r.join() : "";
    if (k === ecKey) return; ecKey = k;
    const rid = r && window.KINUI?.find(r[1], r[0] + 1);
    $("#mapruler").innerHTML = r ? `правит <b${rid ? ` class="pp" data-p="${rid}"` : ""}>${esc(r[1])}</b> с ${r[0] < 0 ? -r[0] + " до н. э." : r[0]}${r[2] && r[2] !== "—" ? ` · ${esc(r[2])}` : ""}` : "";
  }
  // ----- команды для клавиш и кнопок -----
  const capPad = () => ({paddingTopLeft: [40, 70], paddingBottomRight: [$("#mapcap").classList.contains("off") ? 40 : capEl.offsetWidth + 40, 70]});
  let homeV = null; // вид до приближения: к нему возвращают X и повторный клик по шагу
  function zoomToFocus() { // к закреплённому шагу, иначе ко всему событию (или к маршруту/месту без сцены)
    const pts = cur ? (lock != null ? [...cur.ar[lock].r, ...stepInfo(lock).who.map(w => w[1])].map(geo) : sceneCities().map(geo)) : hotLL;
    const ok = pts.filter(Boolean);
    if (!ok.length) return;
    if (!homeV) homeV = {c: map.getCenter(), z: map.getZoom()};
    map.flyToBounds(L.latLngBounds(ok).pad(.15), {...capPad(), maxZoom: 7.5, duration: .9});
  }
  // новое событие открывается сразу приближенным к нему (как по Z); X отсюда ведёт к общему виду эпохи
  function fitEvent() {
    const pts = (cur ? sceneCities().map(geo) : hotLL).filter(Boolean);
    if (!pts.length) return;
    homeV = null;
    viewB = L.latLngBounds(pts).pad(.15);
    map.flyToBounds(viewB, {...capPad(), maxZoom: pts.length > 1 ? 7 : 6, duration: .9});
  }
  function back() { if (!homeV) return false; map.flyTo(homeV.c, homeV.z, {duration: .9}); homeV = null; return true; }
  function resetView() { if (back()) return; eraKey = null; viewB = null; eraView(curYear ?? 900); }
  function pickStep(i) { if (!cur) return false; if (i == null) { if (lock == null) return false; clickStep(lock); return true; } if (i < cur.ar.length) clickStep(i); return true; }
  function refit() { cpts = null; map.invalidateSize(); if (lmap) lmap.invalidateSize(); requestAnimationFrame(() => declutter(mapEl)); }
  return {setYear, showRoute, showScene, focusPlace, clearRoute, highlight, eraView, geo, map,
    resetView, pickStep, refit, unpinLens: () => { if (lensPinned) setPinned(false); hideLens(); }};
})();
