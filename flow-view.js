// Render the people and offices for the currently selected political stream.
window.FLOW_VIEW = (() => {
  const F = window.FLOWS, U = window.KINUI, esc = U.esc;
  const bar = document.getElementById("flowbar");
  const selectInput = document.getElementById("flow-select");
  const yearInput = document.getElementById("flow-year");
  const periodBar = document.getElementById("flow-period");
  const who = document.getElementById("flow-rulers");
  const layer = document.getElementById("flow-lives");
  const formatYear = y => y < 0 ? -y + " до н. э." : String(y);
  let periodKey = null, selectedEvent = null;

  const names = Object.values(F.catalog).sort((a, b) => a.name.localeCompare(b.name, "ru"));
  selectInput.insertAdjacentHTML("beforeend", names.map(flow =>
    `<option value="${flow.id}">${esc(flow.name)}</option>`).join(""));
  selectInput.addEventListener("change", () => window.RIVERAPI.focus(selectInput.value || null));
  bar.querySelector("form").addEventListener("submit", e => {
    e.preventDefault();
    if (yearInput.value) window.RIVERAPI.toYear(Math.max(+yearInput.min, Math.min(+yearInput.max, +yearInput.value)));
    yearInput.blur();
  });
  yearInput.addEventListener("blur", () => {
    if (window.RIVERAPI.focusId) yearInput.value = Math.round(window.RIVERAPI.nowYear());
  });
  layer.addEventListener("keydown", e => {
    if (![" ", "Enter"].includes(e.key)) return;
    const target = e.target.closest("[data-p], [data-ev]");
    if (!target) return;
    e.preventDefault();
    if (target.dataset.p) window.CARD.open(target.dataset.p);
    else window.RIVERAPI.goTo(target.dataset.ev);
  });

  function select(id, [from, to]) {
    selectInput.value = id || "";
    periodBar.hidden = !id;
    yearInput.min = Math.ceil(from);
    yearInput.max = Math.floor(to);
    bar.style.setProperty("--current-flow", id ? F.catalog[id].color : "var(--gold)");
    periodKey = null;
  }

  function now(id, y) {
    if (!id) return;
    const year = Math.round(y), key = id + "|" + year;
    if (key === periodKey) return;
    periodKey = key;
    if (document.activeElement !== yearInput) yearInput.value = year;
    const people = F.rulers(id, year);
    who.innerHTML = people.length ? people.map(r => {
      const dates = r.from === r.to ? formatYear(r.from) : formatYear(r.from) + "–" + formatYear(r.to);
      const detail = [r.office, dates, r.note].filter(Boolean).join(" · ");
      return `<button type="button" data-p="${r.id}" style="--ruler:${U.col(r.id)}" title="${esc(detail)}"><b>${esc(U.P[r.id].n)}</b> <span>${esc(r.office)}</span></button>`;
    }).join("") : "<span>Для этого года в подборке нет правителя</span>";
  }

  function active(title) {
    if (title === selectedEvent) return;
    selectedEvent = title;
    const ids = new Set(Object.keys(F.entries[title]?.people || {}));
    layer.querySelectorAll(".life-person").forEach(node => node.classList.toggle("in-event", ids.has(node.dataset.p)));
    layer.querySelectorAll(".life-event").forEach(node => node.classList.toggle("on", node.dataset.ev === title));
  }

  function treeUrl(id) {
    const params = new URLSearchParams(), A = window.RIVERAPI;
    if (A) {
      const y = A.nowYear();
      if (Number.isFinite(y)) params.set("y", Math.round(y));
      if (A.focusId) params.set("flow", A.focusId);
    }
    const query = params.toString();
    return "tree.html" + (query ? "?" + query : "") + (id ? "#" + encodeURIComponent(id) : "");
  }

  const line = (x, y0, y1) => `M${x.toFixed(1)},${y0.toFixed(1)}V${y1.toFixed(1)}`;

  function extent(row, byTitle, yToPx, low, high) {
    const acts = row.roles.map(({event, role}) => ({y: byTitle.get(event.t).py, event, role}));
    const clip = y => Math.max(low, Math.min(high, y));
    const offices = row.office.map(r => ({
      ...r, lo: clip(yToPx(r.from)), hi: clip(yToPx(r.to)),
    }));
    const dates = [...acts.map(a => a.y), ...offices.flatMap(o => [o.lo, o.hi])];
    if (row.native) {
      for (const date of [row.p.by, row.p.y]) if (date != null) dates.push(yToPx(date));
    }
    if (!dates.length) return null;
    const start = Math.max(low, Math.min(...dates) - 6);
    const end = Math.min(high, Math.max(...dates) + 6);
    return end >= start ? {...row, acts, offices, start, end} : null;
  }

  function draw(id, people, items, height, geom, yToPx) {
    const title = selectedEvent;
    selectedEvent = null;
    layer.innerHTML = "";
    layer.toggleAttribute("hidden", !id);
    if (!id || !people.length) return;
    layer.setAttribute("width", layer.parentNode.clientWidth);
    layer.setAttribute("height", height);
    const byTitle = new Map(items.filter(it => it.side !== "E").map(it => [it.t, it]));
    const [from, to] = F.range(id), low = yToPx(from) - 6;
    const high = Math.max(yToPx(to), ...[...byTitle.values()].map(i => i.py)) + 6;
    const lanes = [], rows = people.map(row => extent(row, byTitle, yToPx, low, high)).filter(Boolean)
      .sort((a, b) => a.start - b.start || b.office.length - a.office.length || a.p.n.localeCompare(b.p.n, "ru"));
    rows.forEach(row => {
      let lane = lanes.findIndex(end => end + 7 < row.start);
      if (lane < 0) lane = lanes.length;
      lanes[lane] = row.end;
      row.lane = lane;
    });
    const gap = geom.rw / (lanes.length + 2);
    const rowMap = new Map(rows.map(row => {
      const offset = Math.ceil(row.lane / 2) * (row.lane % 2 ? -1 : 1);
      row.x = geom.rx + geom.rw / 2 + offset * gap;
      return [row.id, row];
    }));
    const kin = rows.flatMap(row => [row.p.f, row.p.mo].map(id => rowMap.get(id)).filter(Boolean).map(parent => {
      const y = Math.max(row.start, parent.start);
      const fictional = row.p.story && parent.p.story;
      return (fictional || row.native && parent.native) && y <= Math.min(row.end, parent.end)
        ? `<path class="life-kin${fictional ? " fictional" : ""}" d="M${parent.x},${y}L${row.x},${y + 8}"/>` : "";
    })).join("");
    const ribbons = rows.map(row => {
      const {x, start, end, acts, offices, p} = row;
      const thin = row.native || p.story ? line(x, start, end) : acts.map(a => line(x, a.y - 8, a.y + 8)).join("");
      const kind = p.story ? " fictional" : !row.native ? " visitor" : "";
      return `<g class="life-person${kind}" role="button" tabindex="0" aria-label="${esc(p.n)}" data-p="${row.id}" style="--life:${U.col(row.id)}">
        <title>${esc([p.n, p.story || p.d, U.years(row.id)].filter(Boolean).join(" · "))}</title>
        <path class="life-thin" d="${thin}"/>
        ${offices.map(o => `<path class="life-office" d="${line(x, o.lo, Math.max(o.lo + 3, o.hi))}"><title>${esc(o.office)}</title></path>`).join("")}
        ${acts.map(a => `<path class="life-act" d="${line(x, a.y - 7, a.y + 7)}"><title>${esc(a.role)}</title></path>`).join("")}
        <path class="life-hit" d="${thin}"/>
      </g>`;
    }).join("");
    const connections = [...byTitle.values()].map(it => {
      const links = Object.entries(F.entries[it.t].people).map(([id, role]) => ({row: rowMap.get(id), role})).filter(a => a.row);
      if (!links.length) return "";
      const y = it.py, meet = geom.rx + geom.rw + 9;
      links.sort((a, b) => b.row.x - a.row.x);
      return `<g class="life-event${it.story ? " fictional" : ""}" role="button" tabindex="0" aria-label="${esc(it.t)}" data-ev="${esc(it.t)}" style="--event-color:${it.color || "#f0cd78"}">
        <title>${esc(it.t + " · " + links.map(({row, role}) => row.p.n + " — " + role).join(", "))}</title>
        ${links.map(({row}, i) => {
          const mid = (row.x + meet) / 2, bend = Math.min(12, i * 3);
          return `<path d="M${row.x},${y}Q${mid},${y - bend} ${meet},${y}"/><circle cx="${row.x}" cy="${y}" r="3"/>`;
        }).join("")}
        <path d="M${meet},${y}H${geom.cx}"/><circle cx="${meet}" cy="${y}" r="3.4"/>
      </g>`;
    }).join("");

    const labelRows = [];
    const labels = [...rows].sort((a, b) => b.office.length - a.office.length || b.acts.length - a.acts.length).map(row => {
      if (geom.rw < 95) return "";
      const points = [row.offices[0]?.lo, row.acts[0]?.y, row.start + 10].filter(y => y >= low && y <= high);
      const y = points.find(y => labelRows.every(other => Math.abs(y - other) >= 17));
      if (y == null) return "";
      labelRows.push(y);
      const max = Math.floor((geom.rw - 15) / 6.6), full = row.p.n;
      const name = full.length > max ? full.slice(0, max - 1) + "…" : full;
      const x = Math.max(geom.rx + 5, Math.min(row.x + 5, geom.rx + geom.rw - name.length * 6.6 - 5));
      return `<text class="life-label" x="${x}" y="${y - 4}" data-p="${row.id}"><title>${esc(full)}</title>${esc(name)}</text>`;
    }).join("");
    layer.innerHTML = kin + ribbons + connections + labels;
    active(title);
  }

  return {select, now, draw, active, treeUrl};
})();
