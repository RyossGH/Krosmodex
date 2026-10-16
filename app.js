// Krosmodex : classeur de collection hors ligne (PWA) pour les cartes Wakfu TCG / Ankama / Upper Deck.
// Tout est stocké sur l'appareil (IndexedDB) : la collection et les photos des cartes.
'use strict';

const PAGE_SIZE = 9; // une page de classeur : 3 × 3 pochettes
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n, size) => String(n).padStart(String(size).length < 3 ? 3 : String(size).length, '0');

// ---------- Stockage (IndexedDB) ----------

const idb = {
  db: null,
  open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('krosmodex', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('kv');
        req.result.createObjectStore('photos');
      };
      req.onsuccess = () => { this.db = req.result; resolve(); };
      req.onerror = () => reject(req.error);
    });
  },
  tx(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = this.db.transaction(store, mode);
      const r = fn(t.objectStore(store));
      t.oncomplete = () => resolve(r && r.result);
      t.onerror = () => reject(t.error);
    });
  },
  get: (store, key) => idb.tx(store, 'readonly', (s) => s.get(key)),
  put: (store, key, val) => idb.tx(store, 'readwrite', (s) => s.put(val, key)),
  del: (store, key) => idb.tx(store, 'readwrite', (s) => s.delete(key)),
  keys: (store) => idb.tx(store, 'readonly', (s) => s.getAllKeys()),
};

let state = null;
let saveTimer = null;

function defaultState() {
  return { version: 1, collections: [], cards: {}, prefs: { mode: 'binder', quick: false, images: true } };
}

function syncBuiltins() {
  // ajoute les extensions du catalogue qui manquent et met à jour les autres (nouvelles versions de l'appli)
  for (const s of window.BUILTIN_SETS) {
    const col = state.collections.find((c) => c.id === s.id);
    if (!col) { state.collections.push({ ...s, builtin: true, hidden: false }); continue; }
    const { name, size, color } = col;
    delete col.note;
    Object.assign(col, s, { builtin: true, hidden: !!col.hidden, size: Math.max(size || 0, s.size) });
    if (col.edited) Object.assign(col, { name, color });
  }
}

async function load() {
  await idb.open();
  state = (await idb.get('kv', 'state')) || defaultState();
  state.prefs = { ...defaultState().prefs, ...state.prefs };
  syncBuiltins();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => idb.put('kv', 'state', state).catch((e) => toast('Erreur d\'enregistrement : ' + e)), 250);
}

// ---------- Données ----------

const key = (colId, num) => `${colId}:${num}`;
const card = (colId, num) => state.cards[key(colId, num)] || {};
const getCol = (id) => state.collections.find((c) => c.id === id);
// fiche du catalogue : [nom, type, rareté, image, note]
const info = (colId, num) => ((window.CARD_DATA || {})[colId] || [])[num - 1] || [];
const catalogImg = (colId, num) => (state.prefs.images && info(colId, num)[3] ? window.IMAGE_BASE + info(colId, num)[3] : null);
const nameOf = (colId, num) => card(colId, num).name || info(colId, num)[0] || '';
const rarityOf = (colId, num) => card(colId, num).rarity || info(colId, num)[2] || '';
const RARITY_CLASS = { Commune: 'r-c', 'Peu commune': 'r-pc', Rare: 'r-r', Draconique: 'r-d', Promo: 'r-p' };

function setCard(colId, num, patch) {
  const k = key(colId, num);
  const c = { ...(state.cards[k] || {}), ...patch };
  for (const f of Object.keys(c)) if (c[f] === '' || c[f] === 0 || c[f] === false || c[f] == null) delete c[f];
  if (Object.keys(c).length) state.cards[k] = c; else delete state.cards[k];
  save();
}

function colStats(col) {
  let owned = 0, total = 0, doubles = 0;
  for (let n = 1; n <= col.size; n++) {
    const q = card(col.id, n).qty || 0;
    if (q > 0) owned++;
    total += q;
    if (q > 1) doubles += q - 1;
  }
  return { owned, total, doubles, pct: col.size ? Math.round((owned / col.size) * 100) : 0 };
}

// ---------- Photos ----------

const photoUrls = new Map();

async function photoUrl(colId, num) {
  const k = key(colId, num);
  if (photoUrls.has(k)) return photoUrls.get(k);
  const blob = await idb.get('photos', k);
  const url = blob ? URL.createObjectURL(blob) : null;
  photoUrls.set(k, url);
  return url;
}

function resizeImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const src = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(src);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('image illisible'))), 'image/jpeg', 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(src); reject(new Error('image illisible')); };
    img.src = src;
  });
}

async function setPhoto(colId, num, blob) {
  const k = key(colId, num);
  if (photoUrls.get(k)) URL.revokeObjectURL(photoUrls.get(k));
  photoUrls.delete(k);
  if (blob) await idb.put('photos', k, blob); else await idb.del('photos', k);
  setCard(colId, num, { photo: !!blob });
}

function pickPhoto() {
  return new Promise((resolve) => {
    const input = $('#file-photo');
    input.value = '';
    input.onchange = () => resolve(input.files[0] || null);
    input.click();
  });
}

// ---------- Interface générale ----------

function toast(msg, action) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
  t.hidden = false;
  if (action) t.querySelector('button').onclick = () => { t.hidden = true; action.run(); };
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, action ? 4000 : 2200);
}

function openSheet(html, onMount) {
  const sheet = $('#sheet');
  sheet.innerHTML = `<div class="sheet-grip"></div>${html}`;
  sheet.hidden = false;
  $('#backdrop').hidden = false;
  requestAnimationFrame(() => { sheet.classList.add('open'); $('#backdrop').classList.add('open'); });
  if (onMount) onMount(sheet);
}

function closeSheet() {
  const sheet = $('#sheet');
  sheet.classList.remove('open');
  $('#backdrop').classList.remove('open');
  setTimeout(() => { sheet.hidden = true; $('#backdrop').hidden = true; sheet.innerHTML = ''; }, 200);
  if (closeSheet.after) { const f = closeSheet.after; closeSheet.after = null; f(); }
}

function setHeader(title, sub, back) {
  $('#title').textContent = title;
  $('#subtitle').textContent = sub;
  $('#btn-back').hidden = !back;
  document.title = back ? `${title} · Krosmodex` : 'Krosmodex';
}

function progressBar(pct, color) {
  return `<div class="progress"><div style="width:${pct}%;background:${color || 'var(--accent)'}"></div></div>`;
}

// ---------- Routage ----------

function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, query] = h.split('?');
  const params = new URLSearchParams(query || '');
  const parts = path.split('/');
  if (parts[0] === 'c' && getCol(decodeURIComponent(parts[1]))) {
    renderCollection(getCol(decodeURIComponent(parts[1])), params);
  } else {
    renderHome(params);
  }
}

function go(hash, replace) {
  if (replace) history.replaceState(null, '', hash); else history.pushState(null, '', hash);
  route();
}

// ---------- Accueil ----------

function renderHome(params) {
  setHeader('Krosmodex', 'Ma collection', false);
  const q = (params.get('q') || '').trim();
  const visible = state.collections.filter((c) => !c.hidden);
  let owned = 0, size = 0, total = 0;
  for (const c of visible) { const s = colStats(c); owned += s.owned; size += c.size; total += s.total; }
  const pct = size ? Math.round((owned / size) * 100) : 0;

  const groups = {};
  for (const c of visible) (groups[c.game] = groups[c.game] || []).push(c);

  let html = `
    <section class="hero">
      <div class="hero-num">${owned}<span>/${size}</span></div>
      <div class="hero-label">cartes différentes · ${total} au total</div>
      ${progressBar(pct)}
      <div class="hero-pct">${pct} % du Krosmoz complété</div>
    </section>
    <div class="search"><input id="home-search" type="search" placeholder="Rechercher une carte par nom…" value="${esc(q)}" autocomplete="off"></div>
    <div id="search-results"></div>`;

  for (const [game, cols] of Object.entries(groups)) {
    html += `<h2 class="group">${esc(game)}</h2><div class="tiles">`;
    for (const c of cols) {
      const s = colStats(c);
      html += `
        <a class="tile" href="#/c/${encodeURIComponent(c.id)}" style="--set:${c.color || 'var(--accent)'}">
          <div class="tile-top"><span class="tile-dot"></span><span class="tile-year">${esc(c.year || '')}</span></div>
          <div class="tile-name">${esc(c.name)}</div>
          <div class="tile-meta">${s.owned}/${c.size}${s.doubles ? ` · ${s.doubles} double${s.doubles > 1 ? 's' : ''}` : ''}</div>
          ${progressBar(s.pct, c.color)}
        </a>`;
    }
    html += '</div>';
  }
  html += `<button class="btn-wide" id="btn-new-col">＋ Nouvelle collection</button>`;
  html += `<div class="backup-row">
    <button class="tool" id="btn-export">💾 Sauvegarder / transférer</button>
    <button class="tool" id="btn-import">📥 Restaurer</button>
  </div>`;
  if (!isStandalone()) html += `<button class="hint" id="btn-install">📲 Installer sur l'écran d'accueil de l'iPhone</button>`;
  $('#view').innerHTML = html;

  const input = $('#home-search');
  input.oninput = () => { renderSearch(input.value); history.replaceState(null, '', input.value ? `#/?q=${encodeURIComponent(input.value)}` : '#/'); };
  if (q) renderSearch(q);
  $('#btn-new-col').onclick = () => editCollection(null);
  $('#btn-export').onclick = exportBackup;
  $('#btn-import').onclick = importBackup;
  if ($('#btn-install')) $('#btn-install').onclick = showInstallHelp;
}

function renderSearch(q) {
  const out = $('#search-results');
  q = q.trim().toLowerCase();
  if (!q) { out.innerHTML = ''; return; }
  const hits = [];
  const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  q = norm(q);
  for (const col of state.collections) {
    if (col.hidden) continue;
    for (let n = 1; n <= col.size; n++) {
      const name = nameOf(col.id, n);
      if (name && norm(name).includes(q)) hits.push({ col, num: n, c: { ...card(col.id, n), name } });
    }
  }
  hits.sort((a, b) => a.c.name.localeCompare(b.c.name, 'fr'));
  out.innerHTML = hits.length
    ? `<p class="count">${hits.length} résultat${hits.length > 1 ? 's' : ''}${hits.length > 80 ? ' (80 premiers affichés)' : ''}</p><div class="list">${hits.slice(0, 80).map((h) => `
        <a class="row" href="#/c/${encodeURIComponent(h.col.id)}?f=all&n=${h.num}">
          <span class="row-main">${esc(h.c.name)}</span>
          <span class="row-sub">${esc(h.col.name)} · ${pad(h.num, h.col.size)}/${h.col.size}</span>
          <span class="row-qty ${h.c.qty ? 'own' : ''}">${h.c.qty ? '×' + h.c.qty : 'manquante'}</span>
        </a>`).join('')}</div>`
    : `<p class="empty">Aucune carte ne correspond à « ${esc(q)} ».</p>`;
}

// ---------- Collection (classeur) ----------

let current = null; // { col, filter, page, items }

const TYPE_ORDER = ['Héros', 'Havre Sac', 'Allié', 'Protecteur', 'Action', 'Équipement', 'Zone', 'Salle', 'Promo', 'Jeton', 'Carte kama'];

function filteredNums(col, filter, q, rarity, type) {
  const nums = [];
  q = (q || '').toLowerCase();
  for (let n = 1; n <= col.size; n++) {
    const c = card(col.id, n);
    const qty = c.qty || 0;
    if (filter === 'owned' && !qty) continue;
    if (filter === 'missing' && qty) continue;
    if (filter === 'doubles' && qty < 2) continue;
    if (filter === 'wanted' && !c.want) continue;
    if (rarity && rarityOf(col.id, n) !== rarity) continue;
    if (type && info(col.id, n)[1] !== type) continue;
    if (q && !nameOf(col.id, n).toLowerCase().includes(q) && String(n) !== q && pad(n, col.size) !== q) continue;
    nums.push(n);
  }
  return nums;
}

function renderCollection(col, params) {
  const s = colStats(col);
  setHeader(col.name, `${s.owned}/${col.size} · ${s.pct} %`, true);
  const filter = params.get('f') || 'all';
  const q = params.get('q') || '';
  const rarity = params.get('r') || '';
  const type = params.get('t') || '';
  const items = filteredNums(col, filter, q, rarity, type);
  const mode = state.prefs.mode;
  const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  let page = Math.min(pages, Math.max(1, +params.get('p') || 1));
  const focus = +params.get('n') || 0;
  if (focus && items.includes(focus)) page = Math.floor(items.indexOf(focus) / PAGE_SIZE) + 1;
  current = { col, filter, q, rarity, type, page, pages, items };

  // listes déroulantes rareté / type, avec le nombre de cartes possédées / total
  const counts = (fn) => {
    const m = new Map();
    for (let n = 1; n <= col.size; n++) {
      const k = fn(n);
      if (!k) continue;
      const e = m.get(k) || [0, 0];
      e[1]++; if (card(col.id, n).qty) e[0]++;
      m.set(k, e);
    }
    return m;
  };
  const rarities = counts((n) => rarityOf(col.id, n));
  const types = counts((n) => info(col.id, n)[1]);
  const select = (id, all, map, order, val) => (map.size < 2 && !val ? '' : `
    <select id="${id}" class="input select-filter ${val ? 'on' : ''}">
      <option value="">${all}</option>
      ${[...map.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b))
        .map((k) => `<option value="${esc(k)}" ${k === val ? 'selected' : ''}>${esc(k)} · ${map.get(k)[0]}/${map.get(k)[1]}</option>`).join('')}
    </select>`);
  const selects = select('f-rarity', 'Toutes les raretés', rarities, window.RARITIES, rarity)
    + select('f-type', 'Tous les types', types, TYPE_ORDER, type);

  const chip = (f, label) => `<button class="chip ${filter === f ? 'on' : ''}" data-filter="${f}">${label}</button>`;
  const shown = mode === 'binder' ? items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : items;

  $('#view').innerHTML = `
    <section class="col-head" style="--set:${col.color || 'var(--accent)'}">
      ${progressBar(s.pct, col.color)}
      <div class="col-meta">${esc([col.block, col.publisher, col.en && col.en !== col.name ? col.en : ''].filter(Boolean).join(' · '))}</div>
      <div class="chips">
        ${chip('all', 'Toutes')}${chip('owned', `Possédées ${s.owned}`)}${chip('missing', `Manquantes ${col.size - s.owned}`)}${chip('doubles', `Doubles ${s.doubles}`)}${chip('wanted', '★ Recherchées')}
      </div>
      ${selects ? `<div class="filters">${selects}</div>` : ''}
      <div class="toolbar">
        <input id="col-search" type="search" placeholder="N° ou nom…" value="${esc(q)}" autocomplete="off">
        <button class="tool ${state.prefs.quick ? 'on' : ''}" id="btn-quick" title="Ajout rapide : un toucher = +1">⚡ +1</button>
        <button class="tool" id="btn-mode" title="Changer d'affichage">${mode === 'binder' ? '▦ Grille' : '📖 Classeur'}</button>
      </div>
    </section>
    ${items.length ? '' : `<p class="empty">Aucune carte dans ce filtre.</p>`}
    <div class="binder mode-${mode}" id="binder" style="--set:${col.color || 'var(--accent)'}">
      ${shown.map((n) => slotHtml(col, n, n === focus)).join('')}
      ${mode === 'binder' ? Array.from({ length: PAGE_SIZE - shown.length }, () => '<div class="slot blank"></div>').join('') : ''}
    </div>
    ${mode === 'binder' && pages > 1 ? `
      <nav class="pager">
        <button class="tool" id="pg-prev" ${page <= 1 ? 'disabled' : ''}>‹ Préc.</button>
        <span>Page ${page} / ${pages}</span>
        <button class="tool" id="pg-next" ${page >= pages ? 'disabled' : ''}>Suiv. ›</button>
      </nav>` : ''}
    ${col.note ? `<p class="note">${esc(col.note)}</p>` : ''}`;

  loadSlotPhotos();
  bindCollection();
}

function slotHtml(col, n, focus) {
  const c = card(col.id, n);
  const qty = c.qty || 0;
  const name = nameOf(col.id, n);
  const type = info(col.id, n)[1];
  const rc = RARITY_CLASS[rarityOf(col.id, n)];
  return `
    <button class="slot ${qty ? 'own' : 'missing'} ${c.foil ? 'foil' : ''} ${focus ? 'focus' : ''}" data-num="${n}" ${c.photo ? 'data-photo="1"' : catalogImg(col.id, n) ? `data-img="${esc(catalogImg(col.id, n))}"` : ''}>
      <span class="slot-art"></span>
      <span class="slot-num">${pad(n, col.size)}</span>
      ${type || rc ? `<span class="slot-type">${rc ? `<i class="gem ${rc}" title="${esc(rarityOf(col.id, n))}"></i>` : ''}${esc(type || '')}</span>` : ''}
      ${name ? `<span class="slot-name">${esc(name)}</span>` : ''}
      ${qty > 1 ? `<span class="slot-qty">×${qty}</span>` : ''}
      ${c.want && !qty ? '<span class="slot-want">★</span>' : ''}
      ${c.foil ? '<span class="slot-foil">✦</span>' : ''}
    </button>`;
}

// images chargées seulement quand la pochette devient visible (la vue grille en affiche des centaines)
let slotObserver = null;

async function showSlotArt(el) {
  let url = el.dataset.img;
  if (el.dataset.photo) url = await photoUrl(current.col.id, +el.dataset.num);
  if (!url) return;
  const art = el.querySelector('.slot-art');
  if (el.dataset.img) {
    const img = new Image();
    img.onload = () => { art.style.backgroundImage = `url("${url}")`; el.classList.add('has-photo', 'catalog'); };
    img.src = url; // en cas d'échec (hors ligne), la pochette garde son numéro et son nom
  } else {
    art.style.backgroundImage = `url("${url}")`;
    el.classList.add('has-photo');
  }
}

function loadSlotPhotos() {
  if (slotObserver) slotObserver.disconnect();
  const els = document.querySelectorAll('.slot[data-photo]:not(.has-photo), .slot[data-img]:not(.has-photo)');
  if (!('IntersectionObserver' in window)) { els.forEach(showSlotArt); return; }
  slotObserver = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { slotObserver.unobserve(e.target); showSlotArt(e.target); }
  }, { rootMargin: '300px 0px' });
  els.forEach((el) => slotObserver.observe(el));
}

function refreshSlot(n) {
  const el = document.querySelector(`.slot[data-num="${n}"]`);
  if (!el) return;
  const tmp = document.createElement('div');
  tmp.innerHTML = slotHtml(current.col, n, false).trim();
  el.replaceWith(tmp.firstChild);
  loadSlotPhotos();
  const s = colStats(current.col);
  $('#subtitle').textContent = `${s.owned}/${current.col.size} · ${s.pct} %`;
  $('.col-head .progress > div').style.width = `${s.pct}%`;
  $('[data-filter="owned"]').textContent = `Possédées ${s.owned}`;
  $('[data-filter="missing"]').textContent = `Manquantes ${current.col.size - s.owned}`;
  $('[data-filter="doubles"]').textContent = `Doubles ${s.doubles}`;
}

function colHash(patch) {
  const p = { f: current.filter, q: current.q, r: current.rarity, t: current.type, p: current.page, ...patch };
  const qs = new URLSearchParams();
  if (p.f && p.f !== 'all') qs.set('f', p.f);
  if (p.q) qs.set('q', p.q);
  if (p.r) qs.set('r', p.r);
  if (p.t) qs.set('t', p.t);
  if (p.p > 1) qs.set('p', p.p);
  const str = qs.toString();
  return `#/c/${encodeURIComponent(current.col.id)}${str ? '?' + str : ''}`;
}

function bindCollection() {
  const col = current.col;
  document.querySelectorAll('[data-filter]').forEach((b) => { b.onclick = () => go(colHash({ f: b.dataset.filter, p: 1 }), true); });
  if ($('#f-rarity')) $('#f-rarity').onchange = (e) => go(colHash({ r: e.target.value, p: 1 }), true);
  if ($('#f-type')) $('#f-type').onchange = (e) => go(colHash({ t: e.target.value, p: 1 }), true);
  const search = $('#col-search');
  search.onchange = () => go(colHash({ q: search.value.trim(), p: 1 }), true);
  search.onkeydown = (e) => { if (e.key === 'Enter') search.blur(); };
  $('#btn-quick').onclick = () => {
    state.prefs.quick = !state.prefs.quick; save();
    $('#btn-quick').classList.toggle('on', state.prefs.quick);
    toast(state.prefs.quick ? 'Ajout rapide : touchez une carte pour +1 (appui long = fiche)' : 'Ajout rapide désactivé');
  };
  $('#btn-mode').onclick = () => { state.prefs.mode = state.prefs.mode === 'binder' ? 'grid' : 'binder'; save(); route(); };
  if ($('#pg-prev')) $('#pg-prev').onclick = () => go(colHash({ p: current.page - 1 }), true);
  if ($('#pg-next')) $('#pg-next').onclick = () => go(colHash({ p: current.page + 1 }), true);

  const binder = $('#binder');
  let pressTimer = null, longPressed = false, sx = 0, sy = 0;
  binder.addEventListener('pointerdown', (e) => {
    const slot = e.target.closest('.slot[data-num]');
    longPressed = false;
    if (!slot) return;
    pressTimer = setTimeout(() => { longPressed = true; openCard(col, +slot.dataset.num); }, 480);
  });
  const cancel = () => clearTimeout(pressTimer);
  binder.addEventListener('pointerup', cancel);
  binder.addEventListener('pointercancel', cancel);
  binder.addEventListener('pointermove', (e) => { if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) cancel(); });
  binder.addEventListener('contextmenu', (e) => e.preventDefault());
  binder.addEventListener('click', (e) => {
    const slot = e.target.closest('.slot[data-num]');
    if (!slot || longPressed) return;
    const n = +slot.dataset.num;
    if (state.prefs.quick) {
      const before = card(col.id, n).qty || 0;
      setCard(col.id, n, { qty: before + 1 });
      refreshSlot(n);
      if (navigator.vibrate) navigator.vibrate(10);
      toast(`${pad(n, col.size)} : ${before + 1} exemplaire${before ? 's' : ''}`, {
        label: 'Annuler', run: () => { setCard(col.id, n, { qty: before }); refreshSlot(n); },
      });
    } else {
      openCard(col, n);
    }
  });

  // balayage gauche / droite pour tourner les pages du classeur
  if (state.prefs.mode === 'binder') {
    const view = $('#view');
    view.ontouchstart = (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; };
    view.ontouchend = (e) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.7 || !$('#sheet').hidden) return;
      if (dx < 0 && current.page < current.pages) go(colHash({ p: current.page + 1 }), true);
      if (dx > 0 && current.page > 1) go(colHash({ p: current.page - 1 }), true);
    };
  } else {
    $('#view').ontouchstart = $('#view').ontouchend = null;
  }
}

// ---------- Fiche d'une carte ----------

async function openCard(col, n) {
  const c = card(col.id, n);
  const [baseName, baseType, baseRarity, , baseNote] = info(col.id, n);
  const url = c.photo ? await photoUrl(col.id, n) : catalogImg(col.id, n);
  const opts = (list, val) => `<option value="">—</option>${list.map((v) => `<option ${v === val ? 'selected' : ''}>${esc(v)}</option>`).join('')}`;
  openSheet(`
    <div class="card-sheet">
      <button class="card-photo ${url ? '' : 'empty'} ${c.photo ? '' : 'catalog'} ${card(col.id, n).qty ? '' : 'missing'}" id="cs-photo" style="${url ? `background-image:url('${url}')` : ''}">
        ${url ? `<span class="photo-badge">📷 ${c.photo ? 'Changer' : 'Ma photo'}</span>` : '<span>📷<br>Prendre la carte<br>en photo</span>'}
      </button>
      <div class="card-fields">
        <div class="card-num">${esc(col.name)} · <b>${pad(n, col.size)}/${col.size}</b></div>
        <input id="cs-name" class="input" placeholder="Nom de la carte" value="${esc(nameOf(col.id, n))}" autocomplete="off">
        ${baseType || baseNote ? `<div class="card-info">${esc([baseType, baseRarity].filter(Boolean).join(' · '))}${baseNote ? `<br><i>${esc(baseNote)}</i>` : ''}</div>` : ''}
        <div class="stepper-row">
          <label>Exemplaires</label>
          <div class="stepper"><button data-step="qty:-1">−</button><b id="cs-qty">${c.qty || 0}</b><button data-step="qty:1">+</button></div>
        </div>
        <div class="stepper-row">
          <label>Dont brillantes ✦</label>
          <div class="stepper"><button data-step="foil:-1">−</button><b id="cs-foil">${c.foil || 0}</b><button data-step="foil:1">+</button></div>
        </div>
      </div>
    </div>
    <div class="form-grid">
      <label>Rareté<select id="cs-rarity" class="input">${opts(window.RARITIES, rarityOf(col.id, n))}</select></label>
      <label>État<select id="cs-cond" class="input">${opts(window.CONDITIONS, c.cond)}</select></label>
    </div>
    <label class="check"><input type="checkbox" id="cs-want" ${c.want ? 'checked' : ''}> ★ Je la recherche</label>
    <textarea id="cs-note" class="input" rows="2" placeholder="Note (langue, échange, prix…)">${esc(c.note || '')}</textarea>
    <div class="sheet-actions">
      <button class="tool" id="cs-prev" ${n <= 1 ? 'disabled' : ''}>‹ ${n > 1 ? pad(n - 1, col.size) : ''}</button>
      ${c.photo ? '<button class="tool danger" id="cs-del-photo">Supprimer la photo</button>' : ''}
      <button class="tool" id="cs-next" ${n >= col.size ? 'disabled' : ''}>${n < col.size ? pad(n + 1, col.size) : ''} ›</button>
    </div>
    <button class="btn-wide" id="cs-close">Terminé</button>`, (sheet) => {
    const commit = () => setCard(col.id, n, {
      // on ne garde que ce qui diffère du catalogue
      name: $('#cs-name').value.trim() === (baseName || '') ? '' : $('#cs-name').value.trim(),
      rarity: $('#cs-rarity').value === (baseRarity || '') ? '' : $('#cs-rarity').value,
      cond: $('#cs-cond').value,
      want: $('#cs-want').checked,
      note: $('#cs-note').value.trim(),
    });
    closeSheet.after = () => { commit(); refreshSlot(n); };
    sheet.querySelectorAll('[data-step]').forEach((b) => {
      b.onclick = () => {
        const [f, d] = b.dataset.step.split(':');
        const cur = card(col.id, n);
        let v = Math.max(0, (cur[f] || 0) + +d);
        const patch = { [f]: v };
        if (f === 'foil' && v > (cur.qty || 0)) patch.qty = v;
        if (f === 'qty' && (cur.foil || 0) > v) patch.foil = v;
        setCard(col.id, n, patch);
        $('#cs-qty').textContent = card(col.id, n).qty || 0;
        $('#cs-foil').textContent = card(col.id, n).foil || 0;
      };
    });
    $('#cs-photo').onclick = async () => {
      const file = await pickPhoto();
      if (!file) return;
      try {
        commit();
        await setPhoto(col.id, n, await resizeImage(file));
        if (!(card(col.id, n).qty)) setCard(col.id, n, { qty: 1 });
        closeSheet.after = null; closeSheet();
        refreshSlot(n);
        setTimeout(() => openCard(col, n), 220);
      } catch (e) { toast('Photo impossible : ' + e.message); }
    };
    if ($('#cs-del-photo')) $('#cs-del-photo').onclick = async () => {
      commit(); await setPhoto(col.id, n, null);
      closeSheet.after = null; closeSheet(); refreshSlot(n);
      setTimeout(() => openCard(col, n), 220);
    };
    const jump = (m) => { commit(); closeSheet.after = null; closeSheet(); refreshSlot(n); setTimeout(() => openCard(col, m), 220); };
    $('#cs-prev').onclick = () => jump(n - 1);
    $('#cs-next').onclick = () => jump(n + 1);
    $('#cs-close').onclick = closeSheet;
  });
}

// ---------- Menus ----------

function openMenu() {
  if (current && location.hash.startsWith('#/c/')) return openCollectionMenu(current.col);
  openSheet(`
    <h3>Krosmodex</h3>
    <div class="menu">
      <button data-act="new">＋ Nouvelle collection</button>
      <button data-act="visible">👁 Extensions affichées</button>
      <button data-act="images">🖼 Images des cartes : ${state.prefs.images ? 'affichées' : 'masquées'}</button>
      <button data-act="export">💾 Sauvegarder / transférer ma collection</button>
      <button data-act="import">📥 Restaurer une sauvegarde</button>
      <button data-act="install">📲 Installer sur l'iPhone</button>
      <button data-act="about">ℹ️ À propos</button>
    </div>`, (sheet) => {
    sheet.querySelector('.menu').onclick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      closeSheet();
      setTimeout(() => ({
        new: () => editCollection(null), visible: chooseVisible, export: exportBackup,
        images: () => { state.prefs.images = !state.prefs.images; save(); toast(state.prefs.images ? 'Images des cartes affichées' : 'Images masquées (économise les données)'); },
        import: importBackup, install: showInstallHelp, about: showAbout,
      })[act](), 220);
    };
  });
}

function openCollectionMenu(col) {
  openSheet(`
    <h3>${esc(col.name)}</h3>
    <div class="menu">
      <button data-act="names">📝 Importer la liste des noms</button>
      <button data-act="missing">📋 Partager ma liste de manquantes</button>
      <button data-act="doubles">🔁 Partager mes doubles</button>
      <button data-act="edit">✏️ Modifier la collection</button>
      <button data-act="hide">🙈 Masquer de l'accueil</button>
      <button data-act="export">💾 Sauvegarder / transférer ma collection</button>
      <button data-act="import">📥 Restaurer une sauvegarde</button>
    </div>`, (sheet) => {
    sheet.querySelector('.menu').onclick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      closeSheet();
      setTimeout(() => ({
        names: () => importNames(col),
        missing: () => shareList(col, 'missing'),
        doubles: () => shareList(col, 'doubles'),
        edit: () => editCollection(col),
        export: exportBackup,
        import: importBackup,
        hide: () => { col.hidden = true; save(); toast('Collection masquée (Menu → Extensions affichées pour la retrouver)'); go('#/'); },
      })[act](), 220);
    };
  });
}

function editCollection(col) {
  const isNew = !col;
  col = col || { name: '', game: 'Wakfu TCG', size: 100, year: new Date().getFullYear(), color: '#d9a441' };
  const games = [...new Set(state.collections.map((c) => c.game).concat(['Wakfu TCG', 'Dofus', 'Krosmaster', 'Upper Deck']))];
  openSheet(`
    <h3>${isNew ? 'Nouvelle collection' : 'Modifier la collection'}</h3>
    <label class="field">Nom<input id="ec-name" class="input" value="${esc(col.name)}" placeholder="Ex. : Cartes Dofus Mag"></label>
    <label class="field">Jeu / gamme<input id="ec-game" class="input" list="ec-games" value="${esc(col.game)}"></label>
    <datalist id="ec-games">${games.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
    <div class="form-grid">
      <label>Nombre de cartes<input id="ec-size" class="input" type="number" inputmode="numeric" min="1" max="5000" value="${col.size}"></label>
      <label>Année<input id="ec-year" class="input" type="number" inputmode="numeric" value="${esc(col.year || '')}"></label>
    </div>
    <label class="field">Couleur<input id="ec-color" class="input color" type="color" value="${col.color || '#d9a441'}"></label>
    ${!isNew && !col.builtin ? '<button class="tool danger wide" id="ec-delete">Supprimer cette collection</button>' : ''}
    <button class="btn-wide" id="ec-save">${isNew ? 'Créer' : 'Enregistrer'}</button>`, () => {
    $('#ec-save').onclick = () => {
      const name = $('#ec-name').value.trim();
      const size = Math.max(1, Math.min(5000, parseInt($('#ec-size').value, 10) || 0));
      if (!name) { toast('Donnez un nom à la collection'); return; }
      Object.assign(col, { name, game: $('#ec-game').value.trim() || 'Autre', size, year: parseInt($('#ec-year').value, 10) || '', color: $('#ec-color').value });
      if (col.builtin) col.edited = true;
      if (isNew) { col.id = 'c' + Date.now().toString(36); state.collections.push(col); }
      save(); closeSheet();
      go(`#/c/${encodeURIComponent(col.id)}`, !isNew);
    };
    if ($('#ec-delete')) $('#ec-delete').onclick = async () => {
      if (!confirm(`Supprimer « ${col.name} » et toutes ses cartes ?`)) return;
      for (const k of Object.keys(state.cards)) if (k.startsWith(col.id + ':')) { delete state.cards[k]; await idb.del('photos', k); }
      state.collections = state.collections.filter((c) => c !== col);
      save(); closeSheet(); go('#/', true);
    };
  });
}

function chooseVisible() {
  openSheet(`
    <h3>Extensions affichées</h3>
    <div class="list">${state.collections.map((c) => `
      <label class="row check"><input type="checkbox" data-id="${esc(c.id)}" ${c.hidden ? '' : 'checked'}>
        <span class="row-main">${esc(c.name)}</span><span class="row-sub">${esc(c.game)}</span></label>`).join('')}
    </div>
    <button class="btn-wide" id="cv-ok">OK</button>`, (sheet) => {
    $('#cv-ok').onclick = () => {
      sheet.querySelectorAll('[data-id]').forEach((cb) => { getCol(cb.dataset.id).hidden = !cb.checked; });
      save(); closeSheet(); route();
    };
  });
}

function importNames(col) {
  openSheet(`
    <h3>Noms des cartes</h3>
    <p class="help">Collez une ligne par carte, au format <code>numéro ; nom ; rareté</code> (la rareté est facultative).
      Les séparateurs <code>;</code>, <code>,</code>, tabulation ou <code>-</code> sont acceptés.<br>
      Exemple : <code>1 ; Flamiche ; Commune</code></p>
    <textarea id="in-text" class="input mono" rows="10" placeholder="1 ; Nom de la carte ; Rare"></textarea>
    <label class="check"><input type="checkbox" id="in-over"> Remplacer les noms déjà saisis</label>
    <button class="btn-wide" id="in-ok">Importer</button>`, () => {
    $('#in-ok').onclick = () => {
      const over = $('#in-over').checked;
      let count = 0, maxNum = col.size;
      for (const line of $('#in-text').value.split(/\r?\n/)) {
        const m = line.trim().match(/^#?\s*(\d{1,4})(?:\s*\/\s*\d+)?\s*(?:[;,\t|]|\s-\s|\s)\s*(.+)$/);
        if (!m) continue;
        const n = +m[1];
        const [name, rarity] = m[2].split(/\s*[;\t|]\s*/);
        if (!n || !name) continue;
        const cur = card(col.id, n);
        const patch = {};
        if (over || !nameOf(col.id, n)) patch.name = name.trim();
        const r = rarity && window.RARITIES.find((x) => x.toLowerCase() === rarity.trim().toLowerCase());
        if (r && (over || !rarityOf(col.id, n))) patch.rarity = r;
        if (Object.keys(patch).length) { setCard(col.id, n, patch); count++; }
        maxNum = Math.max(maxNum, n);
      }
      if (maxNum > col.size) col.size = maxNum;
      save(); closeSheet();
      toast(`${count} carte${count > 1 ? 's' : ''} mise${count > 1 ? 's' : ''} à jour`);
      route();
    };
  });
}

async function shareList(col, kind) {
  const nums = filteredNums(col, kind);
  if (!nums.length) { toast(kind === 'missing' ? 'Aucune carte manquante, bravo !' : 'Aucun double'); return; }
  const lines = nums.map((n) => {
    const c = card(col.id, n);
    const name = nameOf(col.id, n);
    return `${pad(n, col.size)}/${col.size}${name ? ' ' + name : ''}${kind === 'doubles' ? ` (×${c.qty - 1})` : ''}`;
  });
  const title = `${kind === 'missing' ? 'Cartes manquantes' : 'Doubles à échanger'} : ${col.game} ${col.name}`;
  const text = `${title} (${nums.length})\n${lines.join('\n')}`;
  if (navigator.share) {
    try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  try { await navigator.clipboard.writeText(text); toast('Liste copiée dans le presse-papiers'); } catch { alert(text); }
}

// ---------- Sauvegarde ----------

function blobToDataUrl(blob) {
  return new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); });
}

async function exportBackup() {
  toast('Préparation de la sauvegarde…');
  const photos = {};
  for (const k of await idb.keys('photos')) photos[k] = await blobToDataUrl(await idb.get('photos', k));
  const data = JSON.stringify({ app: 'krosmodex', exported: new Date().toISOString(), state, photos });
  const name = `krosmodex-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new File([data], name, { type: 'application/json' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'Sauvegarde Krosmodex' }); return; } catch (e) { if (e.name === 'AbortError') return; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function importBackup() {
  const input = $('#file-backup');
  input.value = '';
  input.onchange = async () => {
    const file = input.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== 'krosmodex' || !data.state) throw new Error('ce fichier n\'est pas une sauvegarde Krosmodex');
      if (!confirm('Remplacer la collection actuelle par cette sauvegarde ?')) return;
      for (const k of await idb.keys('photos')) await idb.del('photos', k);
      for (const [k, url] of Object.entries(data.photos || {})) await idb.put('photos', k, await (await fetch(url)).blob());
      photoUrls.forEach((u) => u && URL.revokeObjectURL(u));
      photoUrls.clear();
      state = data.state;
      state.prefs = { ...defaultState().prefs, ...state.prefs };
      syncBuiltins();
      await idb.put('kv', 'state', state);
      toast('Collection restaurée');
      go('#/', true);
    } catch (e) { alert('Restauration impossible : ' + e.message); }
  };
  input.click();
}

// ---------- Aide ----------

const isStandalone = () => window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;

function showInstallHelp() {
  openSheet(`
    <h3>Installer sur l'iPhone</h3>
    <ol class="steps">
      <li>Ouvrez cette page dans <b>Safari</b>.</li>
      <li>Touchez le bouton <b>Partager</b> <span class="kbd">⬆︎</span> en bas de l'écran.</li>
      <li>Choisissez <b>Sur l'écran d'accueil</b>, puis <b>Ajouter</b>.</li>
    </ol>
    <p class="help">Krosmodex s'ouvre alors comme une appli, en plein écran, et fonctionne <b>sans réseau</b>.
      Votre collection et vos photos restent sur le téléphone : pensez à faire une sauvegarde de temps en temps (Menu → Sauvegarder).</p>
    <button class="btn-wide" id="ih-ok">Compris</button>`, () => { $('#ih-ok').onclick = closeSheet; });
}

function showAbout() {
  const totalCards = Object.values(state.cards).reduce((a, c) => a + (c.qty || 0), 0);
  openSheet(`
    <h3>À propos</h3>
    <p class="help">Krosmodex est un classeur de collection pour les cartes <b>Wakfu TCG</b> (Ankama, avec Upper Deck pour les premières éditions)
      et toutes vos autres cartes Ankama / Upper Deck. Les ${window.BUILTIN_SETS.length} extensions officielles sont préchargées ;
      ajoutez vos propres collections avec « Nouvelle collection ».</p>
    <p class="help">Noms, types, raretés et images des cartes : encyclopédie Wakfu TCG de
      <a href="https://nokazu.fr/encyclopedie/krosllection/wakfu_tcg" target="_blank" rel="noopener">Nokazu</a>
      (images affichées depuis leur site). Vous pouvez corriger un nom dans la fiche d'une carte,
      ou remplacer l'image par votre propre photo.</p>
    <p class="help"><b>Astuces</b> : touchez une carte pour ouvrir sa fiche ; activez <b>⚡ +1</b> pour ajouter vos cartes à la chaîne
      (appui long = fiche) ; balayez à gauche / à droite pour tourner les pages du classeur.</p>
    <p class="help">${totalCards} carte${totalCards > 1 ? 's' : ''} enregistrée${totalCards > 1 ? 's' : ''} · données stockées uniquement sur cet appareil.</p>
    <button class="btn-wide" id="ab-ok">Fermer</button>`, () => { $('#ab-ok').onclick = closeSheet; });
}

// ---------- Démarrage ----------

async function start() {
  try {
    await load();
  } catch (e) {
    $('#view').innerHTML = `<p class="empty">Impossible d'ouvrir le stockage local (${esc(e.message || e)}). En navigation privée, Safari bloque l'enregistrement.</p>`;
    return;
  }
  $('#btn-back').onclick = () => go('#/');
  $('#btn-menu').onclick = openMenu;
  $('#backdrop').onclick = closeSheet;
  window.addEventListener('popstate', () => { if (!$('#sheet').hidden) closeSheet(); route(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });
  route();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}

start();
