// Люди сайта: цвета ветвей, кто где княжит, поиск по имени, разметка @{id|текст} и где человек встречается.
window.KINUI = (() => {
  const K = window.PEOPLE || {B: {}, P: {}};
  const P = K.P, B = K.B;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const bcol = b => B[b]?.c || "#a89a7e";
  const col = id => bcol(P[id]?.b);
  // корневая ветвь: Рюриковичи или группа не из рода
  const rootB = b => { let x = b; while (B[x]?.up) x = B[x].up; return x; };
  const isRurik = id => rootB(P[id]?.b) === "rur";
  // чей стол в году y (год смены — уже новый)
  const holder = (city, y) => Object.keys(P).find(id => (P[id].s || []).some(([c, a, b]) => c === city && y >= a && y < b));
  const seatAt = (id, y) => (P[id]?.s || []).filter(([, a, b]) => y >= a && y <= b).sort((u, v) => v[1] - u[1])[0]?.[0];
  const par = id => P[id]?.f || P[id]?.r;
  const kids = (() => { const k = {}; Object.keys(P).forEach(id => { const f = P[id].f; if (f) (k[f] = k[f] || []).push(id); }); return id => k[id] || []; })();
  const chain = id => { const c = []; for (let p = id; p && P[p] && c.length < 60; p = par(p)) c.unshift(p); return c; };
  const years = id => { const p = P[id]; if (!p) return ""; return p.by && p.y ? `${p.by}–${p.y}` : p.y ? `† ${p.y}` : p.by ? `р. ${p.by}` : ""; };

  // имя → человек; среди тёзок — тот, кто жив и сидит на столе в год y
  const norm = s => String(s || "").replace(/\(.*?\)/g, "").replace(/ё/g, "е").trim().toLowerCase();
  const byName = {};
  Object.entries(P).forEach(([id, p]) => [p.n, ...(p.a || [])].forEach(n => (byName[norm(n)] = byName[norm(n)] || []).push(id)));
  function find(name, y) {
    const ids = byName[norm(name)] || [];
    if (ids.length < 2 || y == null) return ids[0];
    return ids.find(id => seatAt(id, y)) || ids.find(id => (P[id].by ?? -1e4) <= y && (P[id].y ?? 1e4) >= y) || ids[0];
  }

  // разметка в тексте (уже экранированном): @{id|как написано} → кликабельное имя
  const link = html => html.replace(/@\{([a-z0-9_]+)\|([^}]*)\}/g, (_, id, t) =>
    P[id] ? `<a class="pp" data-p="${id}" style="--b:${col(id)}">${t}</a>` : t);
  const strip = s => String(s || "").replace(/@\{[a-z0-9_]+\|([^}]*)\}/g, "$1");
  const chip = (id, txt) => P[id] ? `<a class="pp chip" data-p="${id}" style="--b:${col(id)}">${esc(txt || P[id].n)}</a>` : "";

  return {P, B, holder, seatAt, col, bcol, rootB, isRurik, par, kids, chain, years, find, link, strip, chip, esc};
})();
