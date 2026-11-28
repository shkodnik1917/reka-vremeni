// The same catalog serves the overview, focused rivers, map links, and tree.
window.FLOWS = (() => {
  const {STREAMS, EVENTS, FICTION, Y0, Y1} = window.RIVER;
  const P = window.KINUI.P;
  const catalog = Object.fromEntries(STREAMS.flatMap(flow => [
    [flow.id, flow],
    ...(flow.sub || []).map(child => [child.id, {...child, parent: flow.id}]),
  ]));
  const has = id => Object.prototype.hasOwnProperty.call(catalog, id);
  const events = [...EVENTS, ...FICTION].sort((a, b) => a.y - b.y);
  const entries = Object.fromEntries(events.map(event => {
    const first = window.FLOW_VOLUME1?.[event.t];
    const second = window.FLOW_VOLUME2?.[event.t];
    return [event.t, {
      flows: [...new Set([event.s, ...(first?.flows || []), ...(second?.flows || [])].filter(id => catalog[id]))],
      people: {...first?.people, ...second?.people},
    }];
  }));

  const seats = {
    "Киев": "kie", "Вышгород": "kie", "Белгород": "kie", "Овруч": "kie", "Туров": "kie",
    "Новгород": "nov", "Ладога": "nov", "Псков": "nov", "Изборск": "nov", "Белоозеро": "nov",
    "Полоцк": "pol", "Минск": "pol", "Смоленск": "smo",
    "Чернигов": "che", "Новгород-Северский": "che", "Курск": "che", "Путивль": "che", "Козельск": "che", "Тмутаракань": "che",
    "Переяславль": "per", "Ростов": "vla", "Суздаль": "vla", "Владимир": "vla", "Переяславль-Залесский": "vla", "Кострома": "vla",
    "Рязань": "rya", "Муром": "rya", "Владимир-Волынский": "gal", "Галич": "gal", "Перемышль": "gal", "Холм": "gal",
    "Москва": "moscow", "Серпухов": "moscow", "Углич": "moscow", "Звенигород": "moscow", "Тверь": "tver",
    "Вильна": "lithuania", "Троки": "lithuania",
    "Сарай": "horde", "Сарай-Бату": "horde", "Сарай-Берке": "horde", "Кырк-Ер": "horde", "Казань": "horde",
    "Каракорум": "mong", "Никея": "byz", "Бурса": "ottoman", "Эдирне": "ottoman",
  };
  const homes = {
    ...seats, "Галич · Волынь": "gal", "Рязань · Муром": "rya", "Византия": "byz",
    "Орда": "horde", "Монголы": "mong", "Литва": "lithuania", "Орден": "orders", "Османы": "ottoman",
  };
  const offices = window.PEOPLE.OFFICES.slice();
  const officialSeat = new Set(offices.map(r => r.id + "|" + r.flow));
  Object.entries(P).forEach(([id, p]) => (p.s || []).forEach(([office, from, to]) => {
    const flow = office === "Константинополь" ? (from >= 1453 ? "ottoman" : "byz") : seats[office];
    if (flow && from < to && !officialSeat.has(id + "|" + flow)) offices.push({flow, id, office, from, to});
  }));
  const belongs = (id, flow) => id === flow || catalog[id]?.parent === flow;
  const matches = (event, flow) => entries[event.t].flows.some(id => belongs(id, flow));
  const byFlow = Object.fromEntries(Object.keys(catalog).map(flow => [flow, events.filter(event => matches(event, flow))]));
  const byPerson = {};
  events.forEach(event => Object.entries(entries[event.t].people).forEach(([id, role]) => {
    if (P[id]) (byPerson[id] = byPerson[id] || []).push({event, role});
  }));
  const byOffice = Object.fromEntries(Object.keys(catalog).map(flow => [flow, offices.filter(r => P[r.id] && belongs(r.flow, flow))]));
  const officesByPerson = {};
  offices.forEach(r => {
    if (P[r.id]) (officesByPerson[r.id] = officesByPerson[r.id] || []).push(r);
  });

  function foreign(event, flow) {
    if (!flow) return [];
    const matches = entries[event.t].flows.filter(id => !belongs(id, flow) && !belongs(flow, id));
    return matches.filter(id => !matches.some(other => other !== id && belongs(other, id))).map(id => catalog[id]);
  }

  function rulers(flow, year) {
    return (byOffice[flow] || []).filter(r => r.from === r.to ? year === r.from : year >= r.from && year < r.to)
      .sort((a, b) => a.office.localeCompare(b.office, "ru") || b.from - a.from);
  }

  function range(flow) {
    const rows = byFlow[flow], terms = byOffice[flow];
    const weights = catalog[flow].w;
    const firstWeight = weights.findIndex(([, weight]) => weight > 0);
    const start = Math.min(...rows.map(e => e.y), ...terms.map(r => r.from), weights[Math.max(0, firstWeight - 1)][0]);
    const end = Math.max(...rows.map(e => e.y), ...terms.map(r => r.to), weights[weights.length - 1][0]);
    return [Math.max(Y0, start), Math.min(Y1, end)];
  }

  function people(flow) {
    const terms = byOffice[flow];
    const officeIds = new Set(terms.map(r => r.id));
    const found = new Set(officeIds);
    byFlow[flow].forEach(event => Object.keys(entries[event.t].people).forEach(id => { if (P[id]) found.add(id); }));
    Object.entries(P).forEach(([id, p]) => {
      const f = homes[window.FAME?.[id]?.home];
      if ((p.flows || []).some(id => belongs(id, flow)) || f && belongs(f, flow) && (p.by != null || p.y != null || byPerson[id]))
        found.add(id);
    });
    return [...found].map(id => {
      const p = P[id], roles = (byPerson[id] || []).filter(row => matches(row.event, flow));
      const office = terms.filter(r => r.id === id);
      const native = !p.story && (officeIds.has(id) || belongs(homes[window.FAME?.[id]?.home], flow) || (p.flows || []).some(id => belongs(id, flow)));
      return {id, p, office, roles, native};
    });
  }

  return {catalog, has, entries, byFlow, byPerson, officesByPerson, matches, foreign, rulers, range, people};
})();
