/* Hello, Tyumen! — app logic (vanilla JS, no dependencies) */
(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const LS = { lang: "ht.lang", fav: "ht.fav", checks: "ht.checks", season: "ht.season" };

  const state = {
    lang: "ru",
    fav: new Set(),
    cat: "all",
    budget: "any",          // any | free | cheap
    students: false,
    season: "winter",        // "winter" = show seasonal offers too, "all" = warm season only
    pick: { cat: null, budget: null, company: null },
    checks: new Set(),
    query: "",
    sort: "default",
    openNow: false,
    theme: "light",
    modal: null,
    lastFocus: null
  };

  const CAT_MAP = Object.fromEntries(CATS.map(c => [c.id, c]));

  /* ---------------- helpers ---------------- */
  const t = key => (STR[state.lang] && STR[state.lang][key]) ?? key;
  const L = obj => (obj && (obj[state.lang] || obj.ru)) || "";
  const catName = id => (CAT_MAP[id] ? CAT_MAP[id][state.lang] : id);
  const catColor = id => (CAT_MAP[id] ? CAT_MAP[id].color : "var(--terra)");

  function loadState() {
    try {
      const stored = localStorage.getItem(LS.lang);
      const q = new URLSearchParams(location.search).get("lang");
      if (stored === "ru" || stored === "en") state.lang = stored;
      else state.lang = String(navigator.language || "ru").toLowerCase().startsWith("ru") ? "ru" : "en";
      if (q === "ru" || q === "en") state.lang = q;
      const fav = JSON.parse(localStorage.getItem(LS.fav) || "[]");
      if (Array.isArray(fav)) state.fav = new Set(fav);
      const checks = JSON.parse(localStorage.getItem(LS.checks) || "[]");
      if (Array.isArray(checks)) state.checks = new Set(checks);
      const season = localStorage.getItem(LS.season);
      if (season === "winter" || season === "all") state.season = season;
      const theme = localStorage.getItem("ht.theme");
      if (theme === "dark" || theme === "light") state.theme = theme;
    } catch (e) { /* storage may be blocked — the site still works */ }
  }

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignore */ }
  }

  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toast._id);
    toast._id = setTimeout(() => el.classList.remove("is-on"), 1900);
  }

  const matchesSeason = p => state.season === "winter" || p.season !== "winter";

  /* ---------------- language ---------------- */
  function applyLang() {
    document.documentElement.lang = state.lang;
    $$("[data-i18n]").forEach(el => {
      const key = el.dataset.i18n;
      const val = STR[state.lang][key];
      if (val != null) el.textContent = val;
    });
    $$("[data-i18n-ph]").forEach(el => {
      const val = STR[state.lang][el.dataset.i18nPh];
      if (val != null) el.setAttribute("placeholder", val);
    });
    $$(".lang-btn").forEach(b => {
      const on = b.dataset.lang === state.lang;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    document.title = state.lang === "ru"
      ? "Hello, Tyumen! — гид по студенческому досугу"
      : "Hello, Tyumen! — a guide to student life in Tyumen";
    const meta = $('meta[name="description"]');
    if (meta) meta.setAttribute("content", state.lang === "ru"
      ? "Двуязычный гид по бесплатному и недорогому досугу в Тюмени для иногородних и иностранных студентов ТюмГУ."
      : "A bilingual guide to free and cheap student leisure in Tyumen for out-of-town and international students of TyumSU.");
  }

  function applyTheme() {
    document.documentElement.dataset.theme = state.theme;
    const btn = $("#themeBtn");
    if (btn) {
      btn.setAttribute("aria-pressed", String(state.theme === "dark"));
      btn.title = state.theme === "dark" ? t("theme.toLight") : t("theme.toDark");
      btn.setAttribute("aria-label", btn.title);
    }
  }

  /* ---------------- hero postcards ---------------- */
  function renderPostcards() {
    const ids = ["tsvetnoy", "pelmeni", "kontora-rink"];
    const html = ids.map(id => {
      const p = PLACES.find(x => x.id === id);
      if (!p) return "";
      const free = p.budget === 0;
      return `<div class="postcard" style="--c:${catColor(p.cat)}">
        <p class="pc-cat" style="color:${catColor(p.cat)}">${catName(p.cat)}</p>
        <p class="pc-name">${L(p).name}</p>
        <div class="pc-foot">
          <span class="pc-price">${state.lang === "ru" ? p.priceRu : p.priceEn}</span>
        </div>
      </div>`;
    }).join("");
    const wrap = $("#postcards");
    if (wrap) wrap.innerHTML = html;
  }

  /* ---------------- picker ---------------- */
  function optionHTML(label, active, value, color) {
    return `<button type="button" class="opt${active ? " is-on" : ""}" data-value="${value}">
      ${color ? `<span class="opt-dot" style="background:${color};opacity:1"></span>` : `<span class="opt-dot"></span>`}
      <span>${label}</span></button>`;
  }

  function renderPicker() {
    const catWrap = $("#optCat");
    catWrap.innerHTML =
      CATS.map(c => optionHTML(c[state.lang], state.pick.cat === c.id, c.id, c.color)).join("") +
      optionHTML(t("pick.any"), state.pick.cat === "any", "any");

    $("#optBudget").innerHTML = [0, 1, 2]
      .map(b => optionHTML(t("budget." + b), state.pick.budget === b, b)).join("");

    $("#optCompany").innerHTML = ["alone", "friends", "meet"]
      .map(c => optionHTML(t("company." + c), state.pick.company === c, c)).join("");

    $$(".step").forEach((el, i) => {
      const done = [state.pick.cat, state.pick.budget, state.pick.company][i] != null;
      el.classList.toggle("is-done", done);
    });

    renderPickResult();
  }

  function pickMatches() {
    const { cat, budget, company } = state.pick;
    if (cat == null || budget == null || company == null) return null;
    return PLACES.filter(p => {
      if (!matchesSeason(p)) return false;
      if (cat !== "any" && p.cat !== cat) return false;
      if (p.budget > budget) return false;
      if (!p.company.includes(company)) return false;
      return true;
    });
  }

  function renderPickResult() {
    const wrap = $("#pickResult");
    const list = pickMatches();
    if (!list) { wrap.hidden = true; return; }
    wrap.hidden = false;
    const shown = list.slice(0, 6);
    $("#resultTitle").textContent = `${t("pick.result")} · ${list.length}`;
    const grid = $("#resultGrid");
    grid.innerHTML = shown.length
      ? shown.map(p => cardHTML(p)).join("")
      : `<p class="empty">${t("pick.empty")}</p>`;
    revealCards(grid);
  }

  /* ---------------- place cards ---------------- */
  function pills(p) {
    const out = [];
    out.push(`<span class="pill is-price${p.budget === 0 ? " is-free" : ""}">${state.lang === "ru" ? p.priceRu : p.priceEn}</span>`);
    if (p.students) out.push(`<span class="pill is-student">${t("badge.student")}</span>`);
    if (p.season === "winter") out.push(`<span class="pill is-season">${t("badge.winter")}</span>`);
    return out.join("");
  }

  function isOpenNow(p, now) {
    if (!p.hours) return null;
    const d = now || new Date();
    if (p.hours.closed && p.hours.closed.indexOf(d.getDay()) !== -1) return false;
    const h = d.getHours() + d.getMinutes() / 60;
    if (p.hours.open === 0 && p.hours.close === 24) return true;
    return h >= p.hours.open && h < p.hours.close;
  }

  function hoursText(p) {
    if (!p.hours) return t("hours.check");
    if (p.hours.open === 0 && p.hours.close === 24) return t("hours.allday");
    const pad = n => String(n).padStart(2, "0");
    return pad(p.hours.open) + ":00 – " + pad(p.hours.close) + ":00";
  }

  function cardHTML(p) {
    const fav = state.fav.has(p.id);
    return `<article class="card${p.photo ? " has-media" : ""}" data-open="${p.id}" tabindex="0" role="button" aria-label="${L(p).name}">
      ${p.photo ? `<div class="card-media"><img src="${p.photo}" alt="" loading="lazy"></div>` : ""}
      <div class="card-top">
        <span class="card-cat" style="--c:${catColor(p.cat)}"><i></i>${catName(p.cat)}</span>
        <button class="heart${fav ? " is-on" : ""}" type="button" data-fav="${p.id}"
          aria-label="${t("card.save")}" aria-pressed="${fav}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 0 1 19.3 13Z"/></svg>
        </button>
      </div>
      <h3>${L(p).name}</h3>
      <p>${L(p).desc}</p>
      <div class="card-foot">
        ${isOpenNow(p) === true ? `<span class="pill is-free" title="${t("hours.open")}">● ${t("hours.open")}</span>` : ""}
        ${pills(p)}
        <span class="card-more">${t("card.more")} →</span>
      </div>
    </article>`;
  }

  function renderPlaces() {
    const grid = $("#placesGrid");
    const q = state.query.trim().toLowerCase();
    let list = PLACES.filter(p => {
      if (!matchesSeason(p)) return false;
      if (state.cat !== "all" && p.cat !== state.cat) return false;
      if (state.budget === "free" && p.budget !== 0) return false;
      if (state.budget === "cheap" && p.budget > 1) return false;
      if (state.students && !p.students) return false;
      if (state.openNow && isOpenNow(p) !== true) return false;
      if (q) {
        const hay = [L(p).name, L(p).desc, L(p).tip, state.lang === "ru" ? p.addrRu : p.addrEn]
          .join(" ").toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
    if (state.sort === "free") list = list.slice().sort((a, b) => a.budget - b.budget);
    if (state.sort === "name") list = list.slice().sort((a, b) => L(a).name.localeCompare(L(b).name, state.lang));
    grid.innerHTML = list.map(p => cardHTML(p)).join("");
    $("#placesEmpty").hidden = list.length > 0;
    $("#placesEmpty").textContent = t("pick.empty");
    revealCards(grid);
  }

  function renderCatChips() {
    const chips = [{ id: "all", label: t("filter.all") }]
      .concat(CATS.map(c => ({ id: c.id, label: c[state.lang], color: c.color })));
    $("#catChips").innerHTML = chips.map(c => `
      <button class="chip${state.cat === c.id ? " is-on" : ""}" type="button" data-cat="${c.id}">
        ${c.color ? `<span class="opt-dot" style="background:${c.color};display:inline-block;opacity:1"></span> ` : ""}${c.label}
      </button>`).join("");
  }

  function renderFree() {
    const list = PLACES.filter(p => p.budget === 0 && matchesSeason(p)).slice(0, 8);
    $("#freeStrip").innerHTML = list.map(p => cardHTML(p)).join("");
  }

  /* ---------------- clubs / events ---------------- */
  function renderClubs() {
    $("#clubsGrid").innerHTML = CLUBS.map((c, i) => `
      <article class="club">
        <span class="club-num">${String(i + 1).padStart(2, "0")}</span>
        <div>
          <h3>${L(c).name}</h3>
          <p>${L(c).desc}</p>
          <p class="club-how"><b>${t("clubs.how")}:</b> <span>${L(c).how}</span></p>
        </div>
      </article>`).join("");
  }

  function renderEvents() {
    $("#eventsList").innerHTML = EVENTS.map(e => `
      <li class="event">
        <div>
          <h3>${L(e).name}</h3>
          <p class="event-place">${L(e).place}</p>
        </div>
        <p class="event-when">${L(e).when}</p>
        <span class="event-cost${/бесплат|free/i.test(L(e).cost) ? "" : " is-paid"}">${L(e).cost}</span>
      </li>`).join("");
  }

  function renderFavorites() {
    const grid = $("#favGrid");
    if (!grid) return;
    const items = PLACES.filter(p => state.fav.has(p.id));
    grid.innerHTML = items.map(p => cardHTML(p)).join("");
    const empty = $("#favEmpty");
    if (empty) empty.hidden = items.length > 0;
    const clear = $("#favClear");
    if (clear) clear.hidden = items.length === 0;
    const title = $("#favorites h2");
    if (title) title.textContent = t("fav.title") + (items.length ? ", " + items.length : "");
  }

  /* ---------------- map ---------------- */
  function project(lat, lon) {
    const b = MAP_CFG.bounds;
    const my = v => Math.log(Math.tan(Math.PI / 4 + (v * Math.PI) / 360));
    const x = (lon - b.west) / (b.east - b.west);
    const y = (my(b.north) - my(lat)) / (my(b.north) - my(b.south));
    return { x: x * 100, y: y * 100 };
  }

  function renderMap() {
    const wrap = $("#pins");
    if (!wrap) return;
    wrap.innerHTML = PLACES.filter(p => p.geo).map(p => {
      const pos = project(p.geo.lat, p.geo.lon);
      const fav = state.fav.has(p.id);
      return `<button type="button" class="map-pin${fav ? " is-fav" : ""}" data-open="${p.id}"
        style="left:${pos.x.toFixed(2)}%;top:${pos.y.toFixed(2)}%;--c:${catColor(p.cat)}"
        aria-label="${L(p).name}">
        <span class="pin-body"></span>
        <span class="pin-label">${L(p).name}</span>
      </button>`;
    }).join("");
  }

  function renderMapList() {
    const wrap = $("#mapList");
    if (!wrap) return;
    const shortPrice = p => p.budget === 0
      ? (state.lang === "ru" ? "бесплатно" : "free")
      : p.budget === 1 ? (state.lang === "ru" ? "до 300 ₽" : "≤ 300 ₽")
      : (state.lang === "ru" ? "дороже 300 ₽" : "300+ ₽");
    wrap.innerHTML = CATS.map(c => {
      const items = PLACES.filter(p => p.cat === c.id && p.map);
      if (!items.length) return "";
      return `<div class="map-group">
        <p class="map-group-h"><i style="background:${c.color}"></i>${c[state.lang]}</p>
        ${items.map(p => `<button type="button" class="map-row" data-open="${p.id}">
          <span>${L(p).name}</span><span class="map-price">${shortPrice(p)}</span></button>`).join("")}
      </div>`;
    }).join("");
  }

  function renderRoutes() {
    const wrap = $("#routesGrid");
    if (!wrap) return;
    const colors = { free: "#6b7f3a", cheap: "#b5563a", meet: "#6b4a6e" };
    wrap.innerHTML = ROUTES.map(r => {
      const steps = r.steps.map(st => {
        const p = PLACES.find(x => x.id === st.id);
        if (!p) return "";
        return `<button type="button" class="route-step" data-open="${p.id}">
          <span class="rs-time">${state.lang === "ru" ? st.timeRu : st.timeEn}</span>
          <span><span class="rs-name">${L(p).name}</span><span class="rs-note">${state.lang === "ru" ? st.noteRu : st.noteEn}</span></span>
        </button>`;
      }).join("");
      return `<article class="route" style="--c:${colors[r.id] || "#b5563a"}">
        <div class="route-top">
          <div>
            <h3>${L(r).title}</h3>
            <p class="route-lead">${L(r).lead}</p>
          </div>
        </div>
        <div class="route-steps">${steps}</div>
        <div class="route-foot">
          <span class="route-total">${t("routes.total")}: <b>${state.lang === "ru" ? r.totalRu : r.totalEn}</b></span>
          <span class="route-go">${r.steps.length} ${t("routes.steps")}</span>
        </div>
      </article>`;
    }).join("");
  }

  /* ---------------- checklist ---------------- */
  function renderChecklist() {
    $("#checklist").innerHTML = CHECKLIST.map((item, i) => {
      const done = state.checks.has(i);
      return `<li>
        <label class="check${done ? " is-done" : ""}">
          <input type="checkbox" data-check="${i}" ${done ? "checked" : ""}>
          <span class="check-box"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg></span>
          <span>${L(item)}</span>
        </label>
      </li>`;
    }).join("");
    updateProgress();
  }

  function updateProgress() {
    const total = CHECKLIST.length;
    const done = state.checks.size;
    const pct = total ? Math.round((done / total) * 100) : 0;
    $("#progressBar").style.width = pct + "%";
    $("#progressNum").textContent = `${done}/${total}`;
    $("#progressBar").parentElement.setAttribute("aria-valuenow", String(pct));
  }

  /* ---------------- favorites ---------------- */
  function toggleFav(id) {
    if (state.fav.has(id)) { state.fav.delete(id); toast(t("toast.removed")); }
    else { state.fav.add(id); toast(t("toast.saved")); }
    save(LS.fav, JSON.stringify([...state.fav]));
    renderFavState();
    renderFavorites();
    if (state.modal) renderModal();
  }

  function renderFavState() {
    const n = state.fav.size;
    const count = $("#favCount");
    count.textContent = n;
    $("#favBtn").classList.toggle("has-items", n > 0);
    $$("[data-fav]").forEach(btn => {
      const on = state.fav.has(btn.dataset.fav);
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    $$(".pin").forEach(pin => pin.classList.toggle("is-fav", state.fav.has(pin.dataset.open)));
  }

  /* ---------------- modal ---------------- */
  function openModal(html) {
    const modal = $("#modal");
    state.lastFocus = document.activeElement;
    $("#modalBody").innerHTML = html;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    const x = $(".modal-x");
    if (x) x.focus({ preventScroll: true });
  }

  function closeModal() {
    const modal = $("#modal");
    if (modal.hidden) return;
    modal.hidden = true;
    state.modal = null;
    document.body.style.overflow = "";
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus({ preventScroll: true });
  }

  function renderModal() {
    if (!state.modal) return;
    if (state.modal.type === "place") {
      const p = PLACES.find(x => x.id === state.modal.id);
      if (!p) return;
      const fav = state.fav.has(p.id);
      openModal(`
        ${p.photo ? `<img class="m-photo" src="${p.photo}" alt="">` : ""}
        <span class="m-cat" style="--c:${catColor(p.cat)}"><i></i>${catName(p.cat)}</span>
        <h3 class="m-title" id="modalTitle">${L(p).name}</h3>
        <p class="m-desc">${L(p).desc}</p>
        ${(p.students || p.season === "winter") ? `<div class="m-tags">${p.students ? `<span class="pill is-student">${t("badge.student")}</span>` : ""}${p.season === "winter" ? `<span class="pill is-season">${t("badge.winter")}</span>` : ""}</div>` : ""}
        <dl class="m-rows">
          <div class="m-row"><dt>${t("modal.price")}</dt><dd>${state.lang === "ru" ? p.priceRu : p.priceEn}</dd></div>
          <div class="m-row"><dt>${t("modal.address")}</dt><dd>${state.lang === "ru" ? p.addrRu : p.addrEn}</dd></div>
          ${(p.howRu || p.howEn) ? `<div class="m-row"><dt>${t("modal.how")}</dt><dd>${state.lang === "ru" ? p.howRu : p.howEn}</dd></div>` : ""}
          <div class="m-row"><dt>${t("hours.title")}</dt><dd>${hoursText(p)} · ${isOpenNow(p) === true ? t("hours.open") : isOpenNow(p) === false ? t("hours.closed") : ""}</dd></div>
        </dl>
        <div class="m-tip"><b>${t("modal.tip")}</b>${L(p).tip}</div>
        <div class="m-actions">
          <button class="btn btn-primary" type="button" data-fav="${p.id}" aria-pressed="${fav}">
            ${fav ? "♥ " + t("toast.removed") : "♡ " + t("card.save")}
          </button>
          ${p.link ? `<a class="m-link" href="${p.link}" target="_blank" rel="noopener">${t("modal.link")} ↗</a>` : ""}
        </div>`);
    } else if (state.modal.type === "fav") {
      const items = PLACES.filter(p => state.fav.has(p.id));
      openModal(`
        ${p.photo ? `<img class="m-photo" src="${p.photo}" alt="">` : ""}
        <span class="m-cat" style="--c:var(--terra)"><i></i>${state.fav.size} ${t("fav.count")}</span>
        <h3 class="m-title" id="modalTitle">${t("fav.title")}</h3>
        ${items.length
          ? `<div class="grid" style="margin-top:22px">${items.map(p => cardHTML(p)).join("")}</div>`
          : `<p class="m-desc" style="margin-top:16px">${t("fav.empty")}</p>`}`);
    }
  }

  /* ---------------- animations ---------------- */
  function revealCards(root) {
    if (!("IntersectionObserver" in window)) return;
    $$(".card", root).forEach((el, i) => {
      el.style.animation = `rise .45s cubic-bezier(.2,.7,.2,1) ${Math.min(i * 35, 260)}ms both`;
    });
  }

  function setupReveal() {
    if (!("IntersectionObserver" in window)) return;
    const targets = $$(".sec-head, .picker, .map-frame, .clubs, .events, .checklist, .progress-wrap");
    targets.forEach(el => el.classList.add("reveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach(el => io.observe(el));
    // safety net: never leave content hidden (print, odd viewports)
    setTimeout(() => targets.forEach(el => el.classList.add("is-in")), 2600);
  }

  function animateStats() {
    const nums = $$(".stat dd");
    if (!nums.length) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const run = () => {
      nums.forEach(el => {
        const target = Number(el.dataset.count || 0);
        if (reduce || target === 0) return;
        const plus = el.textContent.trim().endsWith("+");
        const start = performance.now();
        const dur = 1100;
        const step = now => {
          const k = Math.min((now - start) / dur, 1);
          const eased = 1 - Math.pow(1 - k, 3);
          const val = Math.round(target * eased);
          el.textContent = val.toLocaleString("ru-RU") + (plus ? "+" : "");
          if (k < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    };
    if (!("IntersectionObserver" in window)) { run(); return; }
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { run(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe($("#stats"));
  }

  /* ---------------- nav / header ---------------- */
  function setupHeader() {
    const head = $("#head");
    const nav = $("#nav");
    const burger = $("#burger");
    const onScroll = () => head.classList.toggle("is-scrolled", window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    burger.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
    });
    let spyLock = 0;

    function setActive(id) {
      $$("a", nav).concat($$(".tabbar a")).forEach(l => {
        l.classList.toggle("is-active", l.getAttribute("href") === "#" + id);
      });
    }

    $$("a", nav).concat($$(".tabbar a")).forEach(a => a.addEventListener("click", e => {
      const href = a.getAttribute("href");
      if (!href || href.charAt(0) !== "#") return;
      const id = href.slice(1);
      const target = document.getElementById(id);
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      if (!target) return;
      e.preventDefault();
      spyLock = Date.now() + 900;
      setActive(id);
      const top = target.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      if (history.replaceState) history.replaceState(null, "", "#" + id);
      a.blur();
    }));

    const sections = $$("main section[id]");
    const links = $$("a", nav);
    const tabs = $$(".tabbar a");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => {
        if (Date.now() < spyLock) return;
        entries.forEach(en => {
          if (!en.isIntersecting) return;
          const id = en.target.id;
          links.forEach(l => l.classList.toggle("is-active", l.getAttribute("href") === "#" + id));
          tabs.forEach(l => l.classList.toggle("is-active", l.getAttribute("href") === "#" + id));
        });
      }, { rootMargin: "-40% 0px -55% 0px" });
      sections.forEach(s => io.observe(s));
    }
  }

  /* ---------------- events wiring ---------------- */
  function bind() {
    // language
    $$(".lang-btn").forEach(btn => btn.addEventListener("click", () => {
      state.lang = btn.dataset.lang;
      save(LS.lang, state.lang);
      applyLang();
      renderAll();
    }));

    // picker
    $("#optCat").addEventListener("click", e => {
      const b = e.target.closest(".opt"); if (!b) return;
      state.pick.cat = b.dataset.value;
      renderPicker();
    });
    $("#optBudget").addEventListener("click", e => {
      const b = e.target.closest(".opt"); if (!b) return;
      state.pick.budget = Number(b.dataset.value);
      renderPicker();
    });
    $("#optCompany").addEventListener("click", e => {
      const b = e.target.closest(".opt"); if (!b) return;
      state.pick.company = b.dataset.value;
      renderPicker();
    });
    $("#pickReset").addEventListener("click", () => {
      state.pick = { cat: null, budget: null, company: null };
      renderPicker();
      $("#pick").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // theme
    const themeBtn = $("#themeBtn");
    if (themeBtn) themeBtn.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      save("ht.theme", state.theme);
      applyTheme();
    });

    // search + sort
    const search = $("#search");
    if (search) search.addEventListener("input", e => {
      state.query = e.target.value;
      renderPlaces();
    });
    const sort = $("#sort");
    if (sort) sort.addEventListener("change", e => {
      state.sort = e.target.value;
      renderPlaces();
    });

    // filters
    $("#catChips").addEventListener("click", e => {
      const b = e.target.closest("[data-cat]"); if (!b) return;
      state.cat = b.dataset.cat;
      renderCatChips();
      renderPlaces();
    });
    $$(".budget-btn").forEach(btn => btn.addEventListener("click", () => {
      state.budget = btn.dataset.budget;
      $$(".budget-btn").forEach(b => {
        const on = b.dataset.budget === state.budget;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      renderPlaces();
    }));
    $("#tglOpen").addEventListener("click", e => {
      state.openNow = !state.openNow;
      e.currentTarget.setAttribute("aria-pressed", String(state.openNow));
      renderPlaces();
    });
    $("#tglStudent").addEventListener("click", e => {
      state.students = !state.students;
      e.currentTarget.setAttribute("aria-pressed", String(state.students));
      renderPlaces();
    });
    $$(".season-btn").forEach(btn => btn.addEventListener("click", () => {
      state.season = btn.dataset.season;
      save(LS.season, state.season);
      $$(".season-btn").forEach(b => {
        const on = b.dataset.season === state.season;
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", String(on));
      });
      renderPlaces(); renderFree(); renderPickResult();
    }));

    // any in-page anchor jumps to its section with the header offset
    document.addEventListener("click", e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - 76), behavior: "smooth" });
      if (history.replaceState) history.replaceState(null, "", "#" + id);
    });

    // global delegation: open cards, favorite, close modal
    document.addEventListener("click", e => {
      const favBtn = e.target.closest("[data-fav]");
      if (favBtn) {
        e.stopPropagation();
        toggleFav(favBtn.dataset.fav);
        return;
      }
      const opener = e.target.closest("[data-open]");
      if (opener) {
        state.modal = { type: "place", id: opener.dataset.open };
        renderModal();
        return;
      }
      if (e.target.closest("[data-close]")) { closeModal(); return; }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") closeModal();
      const opener = e.target.closest && e.target.closest("[data-open]");
      if (opener && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        state.modal = { type: "place", id: opener.dataset.open };
        renderModal();
      }
      // simple focus trap inside modal
      if (e.key === "Tab" && !$("#modal").hidden) {
        const focusables = $$("#modal button, #modal a[href]", $("#modal")).filter(el => el.offsetParent !== null);
        if (!focusables.length) return;
        const first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    // favorites: jump to the section and flash it
    $("#favBtn").addEventListener("click", () => {
      const target = document.getElementById("favorites");
      if (!target) return;
      window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 76, behavior: "smooth" });
      target.classList.remove("is-flash");
      void target.offsetWidth;
      target.classList.add("is-flash");
      if (history.replaceState) history.replaceState(null, "", "#favorites");
    });

    const clearBtn = $("#favClear");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      state.fav.clear();
      save(LS.fav, "[]");
      renderFavState();
      renderFavorites();
      renderMap();
      renderMapList();
    });

    // checklist (delegated so it survives re-render)
    $("#checklist").addEventListener("change", e => {
      const input = e.target.closest("[data-check]"); if (!input) return;
      const i = Number(input.dataset.check);
      if (input.checked) state.checks.add(i); else state.checks.delete(i);
      save(LS.checks, JSON.stringify([...state.checks]));
      input.closest(".check").classList.toggle("is-done", input.checked);
      updateProgress();
    });
    $("#checkReset").addEventListener("click", () => {
      state.checks.clear();
      save(LS.checks, "[]");
      renderChecklist();
    });

    // close modal on backdrop click already handled by delegation
  }

  /* ---------------- render all ---------------- */
  function renderAll() {
    renderPostcards();
    renderCatChips();
    renderPicker();
    renderPlaces();
    renderFree();
    renderClubs();
    renderEvents();
    renderFavorites();
    renderMap();
    renderMapList();
    renderRoutes();
    renderChecklist();
    renderFavState();
    if (state.modal) renderModal();
  }

  function init() {
    loadState();
    applyLang();
    applyTheme();
    bind();
    renderAll();
    setupHeader();
    setupReveal();
    animateStats();
    // season buttons reflect stored state
    $$(".season-btn").forEach(b => {
      const on = b.dataset.season === state.season;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
    renderPlaces(); renderFree(); renderPickResult();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
