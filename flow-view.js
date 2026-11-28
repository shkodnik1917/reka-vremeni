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

  const pair = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
  const smooth = t => t * t * (3 - 2 * t);
  const rise = t => smooth(Math.max(0, Math.min(1, t)));

  function curve(points, start = "M") {
    let path = start + pair(...points[0]);
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1], [x1, y1] = points[i], mid = (y0 + y1) / 2;
      path += `C${pair(x0, mid)} ${pair(x1, mid)} ${pair(x1, y1)}`;
    }
    return path;
  }

  function mergeSpans(spans) {
    const merged = [];
    spans.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
      const last = merged[merged.length - 1];
      if (last && start <= last[1]) last[1] = Math.max(last[1], end);
      else merged.push([start, end]);
    });
    return merged;
  }

  function extent(row, byTitle, yToPx, low, high) {
    const acts = row.roles.map(({event, role}) => ({y: byTitle.get(event.t).py, event, role}));
    const clip = y => Math.max(low, Math.min(high, y));
    const {by, y: died, story} = row.p;
    const records = acts.filter(({event}) => story || !event.story &&
      (by == null || event.y >= by) && (died == null || event.y < died + 1));
    const birth = by == null ? low : clip(yToPx(by));
    const death = died == null ? high : Math.max(clip(yToPx(died)),
      ...records.filter(a => Math.floor(a.event.y) === died).map(a => a.y));
    const lifeY = y => Math.min(death, Math.max(birth, clip(y)));
    const offices = row.office.map(r => ({
      ...r, lo: lifeY(yToPx(r.from)), hi: lifeY(yToPx(r.to)),
    }));
    const dates = [...records.map(a => a.y), ...offices.flatMap(o => [o.lo, o.hi])];
    if (row.native) {
      if (by != null) dates.push(birth);
      if (died != null) dates.push(death);
    }
    const start = Math.min(...dates), end = Math.max(...dates);
    const fullLife = row.native || Boolean(story);
    const around = (y, radius = 16) => [Math.max(low, y - radius), Math.min(high, y + radius)];
    const point = fullLife && start === end;
    const spans = fullLife && end > start ? [[start, end]]
      : mergeSpans((fullLife ? dates.slice(0, 1) : dates).map(y => around(y, point ? 7 : 16)));
    const references = [];
    acts.filter(act => !records.includes(act)).forEach(({event, y}) => {
      const occupied = [...spans, ...references];
      if (occupied.some(([a, b]) => y >= a && y <= b)) return;
      let [a, b] = around(y, 10);
      occupied.forEach(([from, to]) => {
        if (to < y) a = Math.max(a, to);
        if (from > y) b = Math.min(b, from);
      });
      references.push([a, b, event.story ? "story-link" : "mention"]);
    });
    const width = window.FAME?.[row.id]?.w || 1;
    const sections = [...spans.map(([a, b]) => [a, b, point ? "year-point" : ""]), ...references]
      .filter(([a, b]) => a < b)
      .sort((a, b) => a[0] - b[0]).map(([a, b, kind]) => ({start: a, end: b, kind, points: []}));
    return sections.length ? {...row, acts, records, offices, sections, width} : null;
  }

  function riverWidth(row, section, y) {
    const taper = Math.min(52, (section.end - section.start) / 2);
    const edge = rise(Math.min(y - section.start, section.end - y) / taper);
    if (section.kind === "story-link" || section.kind === "mention") return {width: edge * 8, gutter: edge * 3};
    const record = row.records.reduce((best, act) => Math.max(best, rise(1 - Math.abs(act.y - y) / 45)), 0);
    const reign = row.offices.reduce((best, office) => {
      const distance = Math.max(0, office.lo - y, y - office.hi);
      return Math.max(best, rise(1 - distance / (office.lo === office.hi ? 13 : 22)));
    }, 0);
    return {width: edge * (4 + row.width * 2.2 + 16 * reign + 9 * record), gutter: edge * 3};
  }

  function placeRivers(rows, geom) {
    const levels = new Set();
    const sections = rows.flatMap(row => row.sections);
    const lo = Math.min(...sections.map(s => s.start)), hi = Math.max(...sections.map(s => s.end));
    for (let y = Math.ceil(lo / 18) * 18; y < hi; y += 18) levels.add(y);
    const mark = (y, section) => { if (y >= section.start && y <= section.end) levels.add(y); };
    rows.forEach(row => row.sections.forEach(section => {
      levels.add(section.start);
      levels.add(section.end);
      const taper = Math.min(52, (section.end - section.start) / 2);
      levels.add(section.start + taper);
      levels.add(section.end - taper);
      mark(section.start + 25, section);
      row.offices.forEach(o => [o.lo - 22, o.lo, o.hi, o.hi + 22].forEach(y => mark(y, section)));
      row.acts.forEach(a => [a.y - 45, a.y - 12, a.y, a.y + 12, a.y + 45].forEach(y => mark(y, section)));
    }));
    const channel = Math.max(2, geom.rw - 10);
    [...levels].sort((a, b) => a - b).forEach(y => {
      const slice = [];
      let total = 0;
      rows.forEach(row => row.sections.forEach(section => {
        if (y < section.start || y > section.end) return;
        const {width, gutter} = riverWidth(row, section, y);
        total += width + gutter;
        slice.push({section, width, gutter});
      }));
      const scale = Math.min(1, channel / (total || 1));
      let x = geom.rx + (geom.rw - total * scale) / 2;
      slice.forEach(({section, width, gutter}) => {
        const w = width * scale, gap = gutter * scale;
        section.points.push({y, x: x + (w + gap) / 2, w});
        x += w + gap;
      });
    });
  }

  function at(row, y) {
    const section = row.sections.find(s => y >= s.start && y <= s.end);
    if (!section) return null;
    const index = section.points.findIndex(point => point.y >= y);
    if (index < 0) return null;
    const next = section.points[index];
    if (index === 0 || next.y === y) return next;
    const prev = section.points[index - 1], share = rise((y - prev.y) / (next.y - prev.y));
    return {y, x: prev.x + (next.x - prev.x) * share, w: prev.w + (next.w - prev.w) * share};
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
    const [from, to] = F.range(id), low = yToPx(from) - 16;
    const high = Math.max(yToPx(to), ...[...byTitle.values()].map(i => i.py)) + 16;
    const rows = people.map(row => extent(row, byTitle, yToPx, low, high)).filter(Boolean)
      .sort((a, b) => a.sections[0].start - b.sections[0].start || b.offices.length - a.offices.length || a.id.localeCompare(b.id));
    placeRivers(rows, geom);
    const rowMap = new Map(rows.map(row => [row.id, row]));
    const kin = rows.flatMap(row => [row.p.f, row.p.mo].map(id => rowMap.get(id)).filter(Boolean).map(parent => {
      const fictional = row.p.story && parent.p.story;
      const first = row.sections.find(s => !s.kind);
      if (!first) return "";
      const source = at(parent, first.start);
      const branch = source?.w === 0 ? at(parent, first.start - 8) || source : source;
      const sprout = at(row, Math.min(first.start + 25, first.end));
      return branch && sprout && (fictional || row.native && parent.native)
        ? `<path class="life-kin${fictional ? " fictional" : ""}" d="${curve([[branch.x, branch.y], [sprout.x, sprout.y]])}"/>` : "";
    })).join("");
    const ribbons = rows.map(row => {
      const {p} = row;
      const kind = p.story ? " fictional" : !row.native ? " visitor" : "";
      const paths = row.sections.map(({points, kind}) => {
        const left = points.map(({x, y, w}) => [x - w / 2, y]);
        const right = points.slice().reverse().map(({x, y, w}) => [x + w / 2, y]);
        const center = curve(points.map(({x, y}) => [x, y]));
        const hint = {"story-link": "Участие в повести", mention: "Упоминание вне показанного периода", "year-point": "Известен отдельный год"}[kind];
        return `<path class="life-ribbon${kind ? " " + kind : ""}" d="${curve(left) + curve(right, "L")}Z">${hint ? "<title>" + hint + "</title>" : ""}</path>
          <path class="life-current" d="${center}"/><path class="life-hit" d="${center}"/>`;
      }).join("");
      return `<g class="life-person${kind}" role="button" tabindex="0" aria-label="${esc(p.n)}" data-p="${row.id}" style="--life:${U.col(row.id)}">
        <title>${esc([p.n, p.story || p.d, U.years(row.id)].filter(Boolean).join(" · "))}</title>
        ${paths}
      </g>`;
    }).join("");
    const connections = [...byTitle.values()].map(it => {
      const y = it.py, meet = geom.rx + geom.rw + 9;
      const links = Object.entries(F.entries[it.t].people).flatMap(([id, role]) => {
        const row = rowMap.get(id), point = row && at(row, y);
        return point ? [{row, role, x: point.x}] : [];
      }).sort((a, b) => b.x - a.x);
      if (!links.length) return "";
      return `<g class="life-event${it.story ? " fictional" : ""}" role="button" tabindex="0" aria-label="${esc(it.t)}" data-ev="${esc(it.t)}" style="--event-color:${it.color || "#f0cd78"}">
        <title>${esc(it.t + " · " + links.map(({row, role}) => row.p.n + " — " + role).join(", "))}</title>
        ${links.map(({x}, i) => {
          const mid = (x + meet) / 2, bend = Math.min(12, i * 3);
          return `<path d="M${x},${y}Q${mid},${y - bend} ${meet},${y}"/><circle cx="${x}" cy="${y}" r="3"/>`;
        }).join("")}
        <path d="M${meet},${y}H${geom.cx}"/><circle cx="${meet}" cy="${y}" r="3.4"/>
      </g>`;
    }).join("");

    const labelRows = [];
    const labels = [...rows].sort((a, b) => b.office.length - a.office.length || b.acts.length - a.acts.length).map(row => {
      if (geom.rw < 95) return "";
      const first = row.sections[0];
      const peak = first.points.reduce((best, p) => p.w > best.w ? p : best);
      const points = [at(row, row.acts[0]?.y), peak, at(row, row.offices[0]?.lo)].filter(Boolean);
      const point = points.find(p => labelRows.every(other => Math.abs(p.y - other) >= 18));
      if (!point) return "";
      const max = Math.floor((geom.rw - 15) / 6.6), full = row.p.n;
      const name = full.length > max ? full.slice(0, max - 1) + "…" : full;
      const place = ({x, y, w}) => {
        labelRows.push(y);
        const left = Math.max(geom.rx + 5, Math.min(x + w / 2 + 5, geom.rx + geom.rw - name.length * 6.6 - 5));
        return `<text class="life-label" x="${left}" y="${y - 5}" data-p="${row.id}"><title>${esc(full)}</title>${esc(name)}</text>`;
      };
      let labels = place(point);
      const last = row.sections.filter(section => !section.kind).pop();
      if (row.width >= 2 && last && last.end - point.y > 260) {
        const tail = [32, 52, 76].filter(offset => last.end - offset >= last.start).map(offset => at(row, last.end - offset))
          .find(p => p?.w >= 2 && labelRows.every(y => Math.abs(p.y - y) >= 21));
        if (tail) labels += place(tail);
      }
      return labels;
    }).join("");
    layer.innerHTML = kin + ribbons + connections + labels;
    active(title);
  }

  return {select, now, draw, active, treeUrl};
})();
