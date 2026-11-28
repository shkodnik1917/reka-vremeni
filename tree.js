// Страница древа: тот же навигатор, что в карточке, только крупно и со всей цепочкой до Рюрика.
// Клик по любому — шаг к нему; слева карточка.
window.TREE = (() => {
  const U = window.KINUI, P = U.P, esc = U.esc;
  const view = document.getElementById("view");
  const back = document.getElementById("back-to-river");
  const origin = new URLSearchParams(location.search);
  let cur = null;

  function syncBack(id) {
    const params = new URLSearchParams();
    for (const key of ["flow", "y"]) if (origin.has(key)) params.set(key, origin.get(key));
    params.set("p", id);
    if (!params.has("y") && P[id].s?.length) params.set("y", P[id].s[0][1]);
    back.href = "index.html?" + params;
  }
  function mark(id) {
    if (!id || !P[id] || id === cur) return;
    cur = id;
    syncBack(id);
    const title = U.isRurik(id) ? "Древо Рюриковичей" : "Древо · " + P[id].n;
    document.querySelector("header h1").textContent = title;
    document.title = title;
    view.innerHTML = window.KINTREE.html(id, true);
    view.classList.remove("in"); void view.offsetWidth; view.classList.add("in");
    setTimeout(draw, 450); // после появления рядов
    requestAnimationFrame(draw);
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  }
  const focus = id => { window.CARD.open(id); };
  // древо целиком в экран, без прокрутки: линии меряются в натуральном размере, потом всё уменьшается
  function draw() {
    const kt = view.querySelector(".kt"); if (!kt) return;
    kt.style.transform = ""; kt.style.marginBottom = "";
    window.KINTREE.lines(view);
    const top = view.getBoundingClientRect().top + scrollY, foot = document.querySelector(".foot").offsetHeight;
    const h = kt.offsetHeight, w = kt.scrollWidth, availH = innerHeight - top - foot - 30, availW = view.clientWidth - 40;
    if (innerWidth < 700) { const me = kt.querySelector(".ktn.self"); if (me) { const r = me.getBoundingClientRect(), v = view.getBoundingClientRect(); view.scrollLeft += r.left + r.width / 2 - v.left - v.width / 2; } return; } // телефон: древо листается вбок, без сжатия
    const k = Math.min(1, availH / h, availW / w);
    if (k < 1) { kt.style.transform = `scale(${k})`; kt.style.transformOrigin = "50% 0"; kt.style.marginBottom = (h * k - h) + "px"; }
  }

  const q = document.getElementById("q");
  document.getElementById("names").innerHTML = Object.keys(P).map(id => `<option value="${esc(P[id].n)}">`).join("");
  q.addEventListener("change", () => {
    const s = q.value.trim().toLowerCase().replace(/ё/g, "е"); if (!s) return;
    const all = Object.keys(P), nm = i => [P[i].n, ...(P[i].a || [])].map(n => n.toLowerCase().replace(/ё/g, "е"));
    const id = all.find(i => nm(i).includes(s)) || all.find(i => nm(i).some(n => n.includes(s)));
    if (id) { focus(id); q.blur(); }
  });
  addEventListener("keydown", e => { if (e.key === "Escape" && document.activeElement !== q) window.CARD.close(); });
  addEventListener("resize", draw);
  addEventListener("hashchange", () => { const id = location.hash.slice(1); if (P[id] && id !== cur) focus(id); });

  setTimeout(() => { const id = P[location.hash.slice(1)] ? location.hash.slice(1) : "yaroslav_mudry"; innerWidth < 700 ? mark(id) : focus(id); }, 0);
  return {focus, mark: id => mark(id)};
})();
