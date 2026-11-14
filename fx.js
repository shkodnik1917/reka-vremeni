// Особые слои событий: у каждого события может быть свой приём, собранный из общих деталей.
// Данные — FXDATA[название события] = слой или массив слоёв:
//   {t:"lands", y?, only?:[земли], set?:{земля: id князя}, title?}  — земли в цвет ветви того, кто ими правит (чья отчина)
//   {t:"sides", title?, sides:[{n, c, ids:[…], lands:[земли]}]}      — стороны усобицы или союза: земли и люди в цвет стороны
//   {t:"spread", title, icon:"fire"|"cross"|"star"|"dot", c?, pts:[[город, год, подпись]]} — точки по датам, появляются по шагам
window.FX = (() => {
  const U = window.KINUI, P = U.P, esc = U.esc;
  const {PRINC} = window.GEO;
  const mapEl = document.getElementById("map");
  let layer = null, cur = null, sceneY = null, steps = [];
  // столица земли: первая, у которой есть князь в этот год
  const CAP = {"Новгородская земля": ["Новгород"], "Полоцкое": ["Полоцк"], "Смоленское": ["Смоленск"], "Владимиро-Суздальское": ["Владимир", "Суздаль", "Ростов"],
    "Муромо-Рязанское": ["Рязань", "Муром"], "Черниговское": ["Чернигов"], "Переяславское": ["Переяславль"], "Киевское": ["Киев"],
    "Турово-Пинское": ["Туров"], "Волынское": ["Владимир-Волынский"], "Галицкое": ["Галич"]};
  const lord = (land, y) => (CAP[land] || []).map(c => U.holder(c, y)).find(Boolean);
  const yearOf = s => { const m = String(s || "").match(/\b(\d{3,4})\b/); return m ? +m[1] : null; };
  const ICON = {fire: "🔥", cross: "✚", star: "✦", dot: "●"};

  function ensure() { if (!layer) layer = L.layerGroup().addTo(window.MAP.map); }
  function land(name, color, tip) {
    const p = PRINC.find(q => q.name === name); if (!p) return;
    L.polygon(p.ring, {color, weight: 2, opacity: .95, fillColor: color, fillOpacity: .42, interactive: !!tip, className: "fxland"})
      .bindTooltip(tip || "", {sticky: true, className: "ttip"}).addTo(layer);
  }

  // одна отрисовка всех слоёв события на год y (год шага или события)
  function render(y, si) {
    ensure(); layer.clearLayers();
    let painted = false;
    (cur || []).forEach(f => {
      if (f.t === "lands") {
        const yy = f.y ?? y;
        PRINC.filter(p => !f.only || f.only.includes(p.name)).forEach(p => {
          const id = f.set?.[p.name] || lord(p.name, yy); if (!id || !P[id]) return;
          land(p.name, U.col(id), `<b>${esc(p.name)}</b>${esc(P[id].n)} · ${esc(U.B[P[id].b]?.n || "")}`);
          painted = true;
        });
      }
      if (f.t === "sides") {
        f.sides.forEach(s => (s.lands || []).forEach(l => land(l, s.c, `<b>${esc(l)}</b>${esc(s.n)}`)));
        painted = true;
      }
      if (f.t === "spread") {
        // точка — на шаге, в маршруте которого её город; города вне маршрутов (список идёт по датам) — вслед за предыдущим
        const at = city => steps.findIndex(a => (a.r || []).includes(city));
        let prev = null;
        const stepOf = f.pts.map(q => { const k = at(q[0]); if (k >= 0) prev = k; return k >= 0 ? k : prev; });
        const on = f.pts.filter((q, j) => si != null && stepOf[j] != null ? stepOf[j] <= si : q[1] <= y), c = f.c || "#ff6a3d";
        on.forEach(([city, yy, note], i) => { const ll = window.MAP.geo(city); if (!ll) return;
          L.marker(ll, {interactive: false, zIndexOffset: 800, icon: L.divIcon({className: "", iconSize: [0, 0],
            html: `<div class="fxpt ${f.icon || "dot"}" style="--c:${c};animation-delay:${(i * .12).toFixed(2)}s"><i>${ICON[f.icon] || ICON.dot}</i><span>${esc(note || city)}</span></div>`})}).addTo(layer); });
      }
    });
    mapEl.classList.toggle("fxon", painted);
  }

  function scene(ev, sc) {
    const d = (window.FXDATA || {})[ev.t];
    cur = d ? [].concat(d) : null;
    sceneY = Math.round(ev.y); steps = sc?.ar || [];
    // у точек по датам при открытии события видно всё; по шагам — только то, что уже случилось
    if (!cur) { clear(); return; }
    const last = Math.max(sceneY, ...(sc?.ar || []).map(a => yearOf(a.n) || 0), ...cur.flatMap(f => (f.pts || []).map(q => q[1])));
    render(cur.some(f => f.t === "spread") ? last : sceneY);
  }
  function step(a, i) { if (!cur) return; render(a ? (yearOf(a.n) ?? sceneY) : Math.max(sceneY, ...cur.flatMap(f => (f.pts || []).map(q => q[1]))), a ? i : null); }
  function clear() { cur = null; if (layer) layer.clearLayers(); mapEl.classList.remove("fxon"); }
  return {scene, step, clear};
})();
