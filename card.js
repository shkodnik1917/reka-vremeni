// Карточка человека: слева поверх ленты. Открывается кликом по любому имени с data-p (текст шагов, столы на карте, древо).
window.CARD = (() => {
  const U = window.KINUI, P = U.P, esc = U.esc;
  const el = document.getElementById("card");
  let hist = [], curId = null, seatL = null;

  function render(id) {
    const p = P[id];
    const br = U.B[p.b];
    const story = [p.collection, p.story].filter(Boolean).map(esc).join(" · ");
    const events = window.FLOWS?.byPerson[id] || [];
    const eventList = events.length ? `<details class="flow-card-events"><summary>Эпизоды в реке (${events.length})</summary><ul>${events.map(({event, role}) =>
      `<li><a href="#e=${encodeURIComponent(event.t)}" data-ev="${esc(event.t)}">${esc(event.t)}</a> · ${esc(role)}</li>`).join("")}</ul></details>` : "";
    const source = p.src ? `<p class="flow-card-source">${/^https?:\/\//.test(p.src) ? `<a href="${esc(p.src)}" target="_blank" rel="noopener">Источник</a>` : esc(p.src)}</p>` : "";
    const dates = y => y < 0 ? -y + " до н. э." : y;
    const periods = [...(p.s || []).map(([office, from, to]) => ({office, from, to})), ...window.PEOPLE.OFFICES.filter(r => r.id === id)];
    const seats = periods.length ? `<div class="csec seats">${periods.map(({office, from, to, note, src}) =>
      `<span><b>${esc(office)}</b> ${dates(from)}${from === to ? "" : "–" + dates(to)}${note ? `<i> · ${esc(note)}</i>` : ""}${src && /^https?:\/\//.test(src) ? ` <a href="${esc(src)}" target="_blank" rel="noopener" title="Источник дат">↗</a>` : ""}</span>`).join("")}</div>` : "";
    el.innerHTML = `<div class="cinfo"><div class="ch hasimg" style="--b:${U.col(id)}"><span class="cimg">${window.KINTREE.face(id)}</span>
        <div class="cbtn">${hist.length ? `<button data-c="back" title="назад">←</button>` : ""}<button data-c="close" title="закрыть (Esc)">×</button></div>
        ${br ? `<span class="cbr">${story || esc(br.n)}</span>` : ""}
        <h3>${esc(p.n)}</h3><div class="cy">${esc(U.years(id))}${p.q ? ` <span title="даты или родство спорны">· ?</span>` : ""}</div>
        ${p.d ? `<div class="cd">${esc(p.d)}</div>` : ""}</div>
      ${window.FAME?.[id]?.why ? `<p class="why"><i>почему важен</i>${esc(window.FAME[id].why)}</p>` : ""}${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ""}${seats}${source}${eventList}
      <div class="cact">${!pmode() && window.PRIVER?.hasLife(id) ? `<button data-c="river">в реке личностей</button>` : ""}${!window.TREE ? `<a class="tbtn" href="${esc(window.FLOW_VIEW.treeUrl(id))}" target="kin-tree">открыть древо ↗</a>` : ""}</div></div>
      <div class="csec ktbox">${window.KINTREE.html(id)}</div>`;
    el.scrollTop = 0;
    requestAnimationFrame(() => tree());
  }
  // древо: линии по готовой вёрстке, сам человек — в середину окошка древа
  function tree() {
    window.KINTREE.lines(el);
    const box = el.querySelector(".ktbox"), me = box?.querySelector(".ktn.self"); if (!me) return;
    const b = box.getBoundingClientRect(), m = me.getBoundingClientRect();
    box.scrollTop += m.top + m.height / 2 - (b.top + b.height / 2);
    box.scrollLeft += m.left + m.width / 2 - (b.left + b.width / 2);
  }

  const pmode = () => document.body.classList.contains("pmode");
  // на карте — кольца у его столов
  function mapSeats(id) {
    const M = window.MAP;
    if (!M) return;
    if (!seatL) seatL = L.layerGroup().addTo(M.map);
    seatL.clearLayers();
    if (!id) return;
    const by = {};
    (P[id].s || []).forEach(([c, a, b]) => (by[c] = by[c] || []).push(`${a}–${b}`));
    Object.entries(by).forEach(([c, ys]) => { const ll = M.geo(c); if (!ll) return;
      L.marker(ll, {interactive: false, zIndexOffset: 1200, icon: L.divIcon({className: "", iconSize: [0, 0],
        html: `<div class="pring" style="--b:${U.col(id)}"><span>${esc(c)} · ${ys.join(", ")}</span></div>`})}).addTo(seatL); });
  }

  function open(id, push = true) {
    if (!P[id]) return;
    if (push && curId && curId !== id) hist.push(curId);
    curId = id;
    // в реке событий карточка живёт поверх страницы; из плашки реки личностей её надо вернуть
    if (!pmode() && el.parentNode !== document.body) document.body.appendChild(el);
    render(id);
    el.classList.add("on");
    document.body.classList.add("carded");
    mapSeats(id);
    window.TREE?.mark(id);
    // в реке событий карточка просто открывается рядом с рекой; в реке личностей — ещё и приближает человека
    if (pmode()) window.PRIVER?.focus(id);
  }
  function close() {
    if (!curId) return false;
    curId = null; hist = [];
    el.classList.remove("on");
    document.body.classList.remove("carded");
    mapSeats(null);
    window.TREE?.mark(null);
    window.PRIVER?.focus(null);
    return true;
  }
  function syncTreeLink() {
    const link = curId && el.querySelector(".tbtn");
    if (link && window.FLOW_VIEW) link.href = window.FLOW_VIEW.treeUrl(curId);
  }
  el.addEventListener("click", e => {
    const b = e.target.closest("[data-c]");
    if (!b) return;
    if (b.dataset.c === "close") close();
    if (b.dataset.c === "back" && hist.length) open(hist.pop(), false);
    if (b.dataset.c === "river") { const id = curId; window.PRIVER.focus(id); render(id); }
  });
  // любое имя на странице
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-p]");
    if (!a) return;
    e.preventDefault(); e.stopPropagation();
    open(a.dataset.p);
  }, true);
  // наведение на любое имя — короткая справка (в реке личностей у нитей своя)
  const tip = document.createElement("div"); tip.id = "htip"; document.body.appendChild(tip);
  document.addEventListener("mouseover", e => {
    const a = e.target.closest("[data-p]");
    // в шапке карточки справка не нужна, а в древе — нужна
    if (!a || !P[a.dataset.p] || a.closest("#card") && !a.closest(".ktn")) { tip.classList.remove("on"); return; }
    const id = a.dataset.p, p = P[id], f = window.FAME?.[id];
    tip.innerHTML = `<b>${esc(p.n)}</b><span class="k">${esc(U.years(id))}${U.B[p.b] ? " · " + esc(U.B[p.b].n.replace(/\s*\(.*\)/, "")) : ""}${p.d ? "<br>" + esc(p.d) : ""}</span>${f?.why ? esc(f.why) : ""}`;
    tip.style.setProperty("--c", U.col(id));
    const r = a.getBoundingClientRect();
    tip.style.left = Math.min(r.left, innerWidth - 330) + "px"; tip.style.top = (r.bottom + 8 > innerHeight - 150 ? r.top - 8 - 120 : r.bottom + 8) + "px";
    tip.classList.add("on");
  });
  return {open, close, syncTreeLink, get id() { return curId; }};
})();
