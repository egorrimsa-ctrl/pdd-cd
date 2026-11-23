import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { MeshoptDecoder } from './vendor/meshopt_decoder.module.js';

/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) { if (k === 'class') e.className = attrs[k]; else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]); else e.setAttribute(k, attrs[k]); } if (html) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = s => s.toLowerCase().replace(/ё/g, 'е');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
const sample = (a, n) => shuffle(a.slice()).slice(0, n);
const store = { get(k, d) { try { const v = localStorage.getItem('anat_' + k); return v ? JSON.parse(v) : d; } catch { return d; } }, set(k, v) { try { localStorage.setItem('anat_' + k, JSON.stringify(v)); } catch { } } };
let toastT; function toast(msg, ms = 1800) { document.querySelectorAll('.toast').forEach(t => t.remove()); const t = el('div', { class: 'toast' }, esc(msg)); document.body.appendChild(t); clearTimeout(toastT); toastT = setTimeout(() => t.remove(), ms); }
const ICON = {
  hide: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><path d="M4 4l16 16"/></svg>',
  iso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  xray: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8" stroke-dasharray="3 3"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>',
  focus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V5a1 1 0 011-1h4M15 4h4a1 1 0 011 1v4M20 15v4a1 1 0 01-1 1h-4M9 20H5a1 1 0 01-1-1v-4"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="6" width="14" height="14" rx="2.5"/><path d="M10 10v6M7 13h6"/><path d="M7 3h11.5A2.5 2.5 0 0121 5.5V17"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
  note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M5 4.5A1.5 1.5 0 016.5 3H18v15H6.5A1.5 1.5 0 005 19.5z"/><path d="M5 19.5A1.5 1.5 0 006.5 21H18v-3"/></svg>',
  x: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  bone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M7 4a2.5 2.5 0 00-2 4L16 19a2.5 2.5 0 104 2 2.5 2.5 0 00-4-2M8 5a2.5 2.5 0 10-4 2"/></svg>',
  cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>',
  q: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.2-1.5 2.5M12 17v.5"/></svg>',
  la: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 19L9 5l5 14M5.8 14h6.4M15 9h5M17.5 9v10"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/></svg>',
  err: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/></svg>',
};

/* ---------- data ---------- */
const SYSTEMS = [
  { id: 'skeleton', ru: 'Кости', c: '#e6dcc3', sec: 'Остеология' },
  { id: 'joints', ru: 'Связки и суставы', c: '#9fc3d6', sec: 'Артрология' },
  { id: 'muscles', ru: 'Мышцы', c: '#d0574d', sec: 'Миология' },
  { id: 'cardio', ru: 'Сердце и сосуды', c: '#ff6b6b', sec: 'Сердечно-сосудистая система' },
  { id: 'nervous', ru: 'Нервная система', c: '#f0cf4a', sec: 'Центральная нервная система' },
  { id: 'visceral', ru: 'Внутренние органы', c: '#eaa07f', sec: 'Пищеварительная система' },
  { id: 'lymph', ru: 'Лимфатическая', c: '#7fcf6a', sec: 'Лимфатическая система' },
];
const SYS = Object.fromEntries(SYSTEMS.map(s => [s.id, s]));
const SIDE_RU = { l: 'левая сторона', r: 'правая сторона' };
let DB = {}; let KEYS = [];
let DESC = null;

/* ---------- three ---------- */
const canvas = $('#c3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
camera.position.set(0, 1.0, 3.6);
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 0.95, 0); controls.enableDamping = true; controls.dampingFactor = 0.12;
controls.minDistance = 0.08; controls.maxDistance = 8; controls.zoomSpeed = 1.1; controls.rotateSpeed = 0.8; controls.screenSpacePanning = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
scene.add(new THREE.HemisphereLight(0xffffff, 0x445066, 1.5));
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(1.5, 3, 3); camera.add(key); scene.add(camera);
const rim = new THREE.DirectionalLight(0xbfd8ff, 0.7); rim.position.set(-2, 1, -3); scene.add(rim);
const root = new THREE.Group(); scene.add(root);
const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
renderer.localClippingEnabled = false;

const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
const sysState = {}; SYSTEMS.forEach(s => sysState[s.id] = { loaded: false, loading: null, on: false, opacity: 1, group: null });
const meshesByKey = new Map(); // key -> [mesh]
const allMeshes = [];
const hiddenStack = []; // arrays of meshes hidden together
let selected = null; // {key, point}
let isolateSet = null; // Set of keys
let xray = false;
const SOFT_GROUPS = ['Фасции, апоневрозы, удерживатели', 'Сумки и синовиальные влагалища'];
let showSoft = store.get('soft', false);
const SOFT_KEYS = new Set(['Pleura', 'Greater_omentum', 'Lesser_omentum', 'Mesocolon', 'Meso-appendix', 'Spinal_dura', 'Falx_cerebri', 'Tentorium_cerebelli']);
const isSoft = k => SOFT_GROUPS.includes(DB[k].g) || SOFT_KEYS.has(k);
let hideMode = false;
let needRender = true;
const WHITE = new THREE.Color(1, 1, 1);
const HL = new THREE.Color(0x19e6c8), HL_OK = new THREE.Color(0x2bff7a), HL_BAD = new THREE.Color(0xff3b3b);

function resize() {
  const r = canvas.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix(); needRender = true;
}
new ResizeObserver(resize).observe(canvas);

async function loadSystem(id, onprog) {
  const st = sysState[id];
  if (st.loaded) return st.group;
  if (st.loading) return st.loading;
  st.loading = (async () => {
    const gltf = await loader.loadAsync('models/' + id + '.glb', e => onprog && e.total && onprog(e.loaded / e.total));
    const g = gltf.scene; g.name = id;
    g.traverse(o => {
      if (!o.isMesh) return;
      const raw = (o.userData && o.userData.name) || o.name;
      const [k, side] = raw.split('|');
      if (!DB[k]) { o.visible = false; o.userData.skip = true; return; }
      o.geometry.computeVertexNormals();
      o.geometry.computeBoundingSphere(); o.geometry.computeBoundingBox();
      o.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.0, side: THREE.DoubleSide });
      o.userData = { key: k, side: side || '', sys: id };
      if (!meshesByKey.has(k)) meshesByKey.set(k, []);
      meshesByKey.get(k).push(o); allMeshes.push(o);
    });
    root.add(g); g.updateMatrixWorld(true);
    st.group = g; st.loaded = true; applyStyles();
    return g;
  })();
  try { return await st.loading; } catch (e) { st.loading = null; throw e; }
}

function setSystem(id, on) {
  const st = sysState[id]; st.on = on;
  renderChips();
  if (on && !st.loaded) {
    showLoading('Загрузка: ' + SYS[id].ru);
    loadSystem(id, p => setLoading(p)).then(() => { hideLoading(); if (st.group) st.group.visible = st.on; needRender = true; renderChips(); }).catch(() => { hideLoading(); st.on = false; renderChips(); toast('Не удалось загрузить модель. Проверьте интернет.'); });
  } else if (st.group) { st.group.visible = on; needRender = true; }
  if (!on && selected && DB[selected.key].sys === id) deselect();
  saveLayout();
}
function saveLayout() { store.set('layout', Object.fromEntries(SYSTEMS.map(s => [s.id, { on: sysState[s.id].on, op: sysState[s.id].opacity }]))); }

function applyStyles() {
  for (const m of allMeshes) {
    const { key: k, sys } = m.userData; const st = sysState[sys]; const mat = m.material;
    let op = st.opacity, emissive = 0x000000, ei = 0, tint = null;
    if (isolateSet && !isolateSet.has(k)) { m.visible = false; continue; }
    if (!m.userData.hidden) m.visible = true;
    if (!showSoft && isSoft(k) && !(selected && selected.key === k) && !(isolateSet && isolateSet.has(k))) { m.visible = false; continue; }
    if (xray && selected && selected.key !== k) op = Math.min(op, 0.12);
    if (selected && selected.key === k) { emissive = selected.color || HL; ei = 0.45; op = 1; tint = emissive; }
    if (m.userData.flash) { emissive = m.userData.flash; ei = 0.5; op = 1; tint = emissive; }
    mat.emissive.set(emissive); mat.emissiveIntensity = ei;
    if (tint) mat.color.copy(tint).lerp(WHITE, 0.25); else mat.color.copy(WHITE);
    const tr = op < 0.999;
    if (mat.transparent !== tr) { mat.transparent = tr; mat.needsUpdate = true; }
    mat.opacity = op; mat.depthWrite = !tr;
    m.renderOrder = tr ? 1 : 0;
    if (op < 0.02) m.visible = false;
  }
  needRender = true;
}

/* ---------- picking ---------- */
const ray = new THREE.Raycaster(); const ptr = new THREE.Vector2();
function pick(cx, cy, all) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const cands = allMeshes.filter(m => m.visible && m.parent && m.parent.visible !== false && sysState[m.userData.sys].on && (m.material.opacity > 0.3 || (selected && selected.key === m.userData.key) || quiz3d));
  const hits = ray.intersectObjects(cands, false);
  if (all) return hits.filter(h => !(renderer.clippingPlanes.length && clipPlane.distanceToPoint(h.point) < 0));
  for (const h of hits) {
    if (renderer.clippingPlanes.length && clipPlane.distanceToPoint(h.point) < 0) continue;
    return h;
  }
  return null;
}
let down = null;
canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now(), n: e.isPrimary }; });
canvas.addEventListener('pointerup', e => {
  if (!down) return; const d = Math.hypot(e.clientX - down.x, e.clientY - down.y); const dt = performance.now() - down.t; down = null;
  if (d > 8 || dt > 600) return;
  if (quiz3d) return quiz3dTap(pick(e.clientX, e.clientY, true));
  const h = pick(e.clientX, e.clientY);
  if (!h) { deselect(); return; }
  const k = h.object.userData.key;
  if (hideMode) { hideKey(k); return; }
  select(k, h.point, h.object.userData.side);
});

function select(k, point, side) {
  if (!DB[k]) return;
  selected = { key: k, point: point ? point.clone() : centerOf(k), side };
  applyStyles(); renderSheet(); renderLabel();
}
function deselect() { if (!selected) return; selected = null; xray = false; applyStyles(); $('#sheet').classList.add('hidden'); renderLabel(); }
function hideKey(k) {
  const ms = (meshesByKey.get(k) || []).filter(m => m.visible);
  ms.forEach(m => { m.visible = false; m.userData.hidden = true; });
  if (ms.length) hiddenStack.push(ms);
  if (selected && selected.key === k) deselect();
  needRender = true; renderModebar();
}
function undoHide() { const ms = hiddenStack.pop(); if (!ms) { toast('Нечего возвращать'); return; } ms.forEach(m => { m.userData.hidden = false; m.visible = true; }); applyStyles(); renderModebar(); }
function showAll() {
  allMeshes.forEach(m => { m.userData.hidden = false; }); hiddenStack.length = 0; isolateSet = null; xray = false;
  applyStyles(); renderModebar(); if (selected) renderSheet();
}
function boxOf(keys) {
  const b = new THREE.Box3(); for (const k of keys) for (const m of meshesByKey.get(k) || []) { m.updateMatrixWorld(); const bb = m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld); b.union(bb); } return b;
}
function centerOf(k) { const b = boxOf([k]); return b.isEmpty() ? new THREE.Vector3(0, 1, 0) : b.getCenter(new THREE.Vector3()); }

/* camera animation */
let anim = null;
function flyTo(target, dist, dir, lift = 0) {
  const p0 = camera.position.clone(), t0 = controls.target.clone();
  if (lift) { target = target.clone(); target.y -= dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * lift; }
  const d = dir ? dir.clone().normalize() : camera.position.clone().sub(controls.target).normalize();
  const p1 = target.clone().add(d.multiplyScalar(dist));
  anim = { p0, t0, p1, t1: target.clone(), s: performance.now(), dur: 650 };
}
function focusKey(k) {
  const b = boxOf([k]); if (b.isEmpty()) return;
  const c = b.getCenter(new THREE.Vector3()); const r = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 0.03);
  const dist = Math.min(4, Math.max(0.22, r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.25));
  // look from the outside of the body
  const axis = new THREE.Vector3(0, c.y, 0.0); let dir = c.clone().sub(axis); dir.y = 0;
  if (dir.length() < 0.04) dir.set(0, 0, 1);
  const cur = camera.position.clone().sub(controls.target); cur.y = 0; cur.normalize();
  dir.normalize(); if (dir.dot(cur) > 0.2) dir = cur; // keep current side if it already sees it
  dir.y = 0.18;
  flyTo(c, dist * 1.35, dir, 0.42);
}
function setView(name) {
  const t = new THREE.Vector3(0, 0.95, 0); const d = 3.6;
  const dirs = { front: [0, 0.05, 1], back: [0, 0.05, -1], left: [1, 0.05, 0], right: [-1, 0.05, 0], top: [0, 1, 0.02], bottom: [0, -1, 0.02] };
  flyTo(t, name === 'top' || name === 'bottom' ? 2.6 : d, new THREE.Vector3(...dirs[name]));
}

/* labels */
const labelEl = el('div', { class: 'label3d hidden' }); $('#labels').appendChild(labelEl);
function renderLabel() {
  if (!selected || !$('#v-atlas').offsetParent) { labelEl.classList.add('hidden'); return; }
  const p = selected.point.clone().project(camera);
  if (p.z > 1) { labelEl.classList.add('hidden'); return; }
  const r = canvas.getBoundingClientRect();
  labelEl.style.left = ((p.x + 1) / 2 * r.width) + 'px'; labelEl.style.top = ((1 - p.y) / 2 * r.height - 6) + 'px';
  labelEl.textContent = DB[selected.key].ru; labelEl.classList.remove('hidden');
}

/* loop */
function loop(t) {
  requestAnimationFrame(loop);
  if (anim) {
    const k = Math.min(1, (t - anim.s) / anim.dur); const e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(anim.p0, anim.p1, e); controls.target.lerpVectors(anim.t0, anim.t1, e);
    if (k >= 1) anim = null; needRender = true;
  }
  if (controls.update()) needRender = true;
  if (!needRender || $('#v-atlas').classList.contains('hidden')) return;
  needRender = false;
  renderer.render(scene, camera);
  renderLabel();
}
controls.addEventListener('change', () => needRender = true);

/* ---------- loading ui ---------- */
function showLoading(t) { $('#loading').classList.remove('hidden'); $('#loading-t').textContent = t; $('#loading-b').style.width = '0%'; }
function setLoading(p) { $('#loading-b').style.width = Math.round(p * 100) + '%'; }
function hideLoading() { $('#loading').classList.add('hidden'); }

/* ---------- chips & bars ---------- */
function renderChips() {
  const box = $('#syschips'); box.innerHTML = '';
  for (const s of SYSTEMS) {
    const st = sysState[s.id];
    const b = el('button', { class: 'chip' + (st.on ? ' on' : ''), style: `--c:${s.c}` }, (st.on && !st.loaded ? '<span class="ld"></span>' : '<i></i>') + esc(s.ru));
    b.onclick = () => setSystem(s.id, !st.on);
    box.appendChild(b);
  }
}
function renderModebar() {
  const mb = $('#modebar'); mb.innerHTML = '';
  if (hideMode) mb.appendChild(el('div', { class: 'pill warn' }, 'Режим: скрыть касанием'));
  if (isolateSet) { const p = el('div', { class: 'pill' }, 'Изоляция '); const b = el('button', {}, 'выйти'); b.onclick = () => { isolateSet = null; applyStyles(); renderModebar(); renderSheet(); }; p.appendChild(b); mb.appendChild(p); }
  if (hiddenStack.length) { const p = el('div', { class: 'pill' }, `Скрыто: ${hiddenStack.length} `); const b = el('button', {}, 'показать'); b.onclick = showAll; p.appendChild(b); mb.appendChild(p); }
  if (renderer.clippingPlanes.length) { const p = el('div', { class: 'pill' }, 'Срез включён '); const b = el('button', {}, 'настроить'); b.onclick = openSection; p.appendChild(b); mb.appendChild(p); }
  $('#b-hide').classList.toggle('on', hideMode);
}

/* ---------- selection sheet ---------- */
function notesFor(k) { const re = new RegExp('\\[\\[' + DB[k].en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\|'); return (window.NOTES || []).map((n, i) => [n, i]).filter(([n]) => re.test(n.b)); }
function renderSheet() {
  const sh = $('#sheet'); if (!selected) { sh.classList.add('hidden'); return; }
  const d = DB[selected.key]; const s = SYS[d.sys];
  const fav = store.get('fav', []);
  const side = selected.side && SIDE_RU[selected.side] ? ' · ' + SIDE_RU[selected.side] : '';
  sh.innerHTML = `<button class="x" id="sh-x">${ICON.x}</button>
   <div class="ttl">${esc(d.ru)}</div><div class="lat">${esc(d.la)}</div>
   <div class="meta"><span style="color:${s.c}">●</span> ${esc(s.ru)} · ${esc(d.g)}${side}</div>
   <div class="acts">
    <button class="abtn" data-a="hide">${ICON.hide}Скрыть</button>
    <button class="abtn ${isolateSet ? 'on' : ''}" data-a="iso">${ICON.iso}Изолировать</button>
    <button class="abtn ${xray ? 'on' : ''}" data-a="xray">${ICON.xray}Рентген</button>
    <button class="abtn" data-a="focus">${ICON.focus}Приблизить</button>
    <button class="abtn ${fav.includes(selected.key) ? 'on' : ''}" data-a="fav">${ICON.card}В карточки</button>
    <button class="abtn" data-a="desc">${ICON.info}Описание</button>
    ${notesFor(selected.key).length ? `<button class="abtn" data-a="note">${ICON.note}Конспект</button>` : ''}
   </div><div class="desc hidden" id="sh-desc"></div>`;
  sh.classList.remove('hidden');
  $('#sh-x').onclick = deselect;
  sh.querySelectorAll('.abtn').forEach(b => b.onclick = () => sheetAction(b.dataset.a));
}
async function sheetAction(a) {
  const k = selected.key;
  if (a === 'hide') hideKey(k);
  else if (a === 'iso') { isolateSet = isolateSet ? null : new Set([k]); applyStyles(); renderModebar(); renderSheet(); if (isolateSet) focusKey(k); }
  else if (a === 'xray') { xray = !xray; applyStyles(); renderSheet(); }
  else if (a === 'focus') focusKey(k);
  else if (a === 'fav') { let f = store.get('fav', []); if (f.includes(k)) f = f.filter(x => x !== k); else f.push(k); store.set('fav', f); toast(f.includes(k) ? 'Добавлено в колоду «Избранное»' : 'Убрано из избранного'); renderSheet(); }
  else if (a === 'desc') {
    const box = $('#sh-desc'); if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden'); box.textContent = 'Загрузка…';
    if (!DESC) { try { DESC = await (await fetch('data/desc_en.json')).json(); } catch { DESC = {}; } }
    const d = DB[k]; const t = DESC[k];
    box.innerHTML = `<div><b>Рус.:</b> ${esc(d.ru)}<br><b>Лат.:</b> <i>${esc(d.la)}</i><br><b>Англ.:</b> ${esc(d.en)}</div>` + (t ? `<p style="margin:8px 0 0">${esc(t)}</p><small>Описание на английском — Wikipedia / Z-Anatomy, CC BY-SA 4.0</small>` : '<small>Подробного описания для этой структуры нет.</small>');
  }
  else if (a === 'note') { const n = notesFor(k)[0]; if (n) { switchView('notes'); openNote(n[1]); } }
}

/* ---------- public: show structure on model ---------- */
async function showOnModel(k) {
  const d = DB[k]; if (!d) return;
  switchView('atlas');
  if (!sysState[d.sys].on) setSystem(d.sys, true);
  await loadSystem(d.sys); sysState[d.sys].group.visible = true;
  // unhide if hidden
  (meshesByKey.get(k) || []).forEach(m => { m.userData.hidden = false; });
  if (isolateSet && !isolateSet.has(k)) isolateSet = null;
  const ms = meshesByKey.get(k) || [];
  select(k, centerOf(k), ms.length === 1 ? ms[0].userData.side : '');
  focusKey(k); renderModebar();
}

/* ---------- overlay panels ---------- */
function openPanel(title, build) {
  const ov = $('#overlay'); ov.innerHTML = '';
  const bd = el('div', { class: 'backdrop' }); const p = el('div', { class: 'panel' });
  p.innerHTML = `<div class="ph"><b>${esc(title)}</b><button class="ibtn" style="width:34px;height:34px">${ICON.x}</button></div><div class="pb"></div>`;
  const close = () => { ov.innerHTML = ''; };
  bd.onclick = close; p.querySelector('.ph button').onclick = close;
  ov.append(bd, p); build(p.querySelector('.pb'), close); return close;
}

function openSearch() {
  let sysF = '', grpF = '';
  openPanel('Поиск', (pb, close) => {
    pb.innerHTML = `<input class="sinput" placeholder="Название: рус., лат. или англ." autocomplete="off" autocorrect="off" spellcheck="false"><div class="filters" id="sf"></div><div class="filters" id="gf"></div><ul class="list" id="sl"></ul>`;
    const inp = pb.querySelector('input'); const ul = pb.querySelector('#sl');
    const drawF = () => {
      const sf = pb.querySelector('#sf'); sf.innerHTML = '';
      const all = el('button', { class: 'chip' + (!sysF ? ' on' : ''), style: '--c:#3fc1b0' }, '<i></i>Все'); all.onclick = () => { sysF = ''; grpF = ''; drawF(); draw(); }; sf.appendChild(all);
      SYSTEMS.forEach(s => { const b = el('button', { class: 'chip' + (sysF === s.id ? ' on' : ''), style: `--c:${s.c}` }, '<i></i>' + esc(s.ru)); b.onclick = () => { sysF = s.id; grpF = ''; drawF(); draw(); }; sf.appendChild(b); });
      const gf = pb.querySelector('#gf'); gf.innerHTML = '';
      if (sysF) { const gs = [...new Set(KEYS.filter(k => DB[k].sys === sysF).map(k => DB[k].g))]; gs.forEach(g => { const b = el('button', { class: 'chip' + (grpF === g ? ' on' : ''), style: `--c:${SYS[sysF].c}` }, esc(g)); b.onclick = () => { grpF = grpF === g ? '' : g; drawF(); draw(); }; gf.appendChild(b); }); }
    };
    const draw = () => {
      const q = norm(inp.value.trim());
      let res = KEYS.filter(k => (!sysF || DB[k].sys === sysF) && (!grpF || DB[k].g === grpF));
      const rank = k => { const r = norm(DB[k].ru); return (r.startsWith(q) ? 0 : r.includes(q) ? 1 : 2) + (isSoft(k) ? 1.5 : 0); };
      if (q) res = res.filter(k => DB[k]._s.includes(q)).sort((a, b) => (rank(a) - rank(b)) || DB[a].ru.localeCompare(DB[b].ru, 'ru'));
      else res.sort((a, b) => DB[a].ru.localeCompare(DB[b].ru, 'ru'));
      const total = res.length; res = res.slice(0, 150);
      ul.innerHTML = res.map(k => `<li data-k="${esc(k)}"><span class="dot" style="background:${SYS[DB[k].sys].c}"></span><div class="n"><div>${esc(DB[k].ru)}</div><span>${esc(DB[k].la)}</span></div></li>`).join('') + (total > 150 ? `<li class="empty" style="border:0">…и ещё ${total - 150}. Уточните запрос.</li>` : '') + (!total ? '<li class="empty" style="border:0">Ничего не найдено</li>' : '');
      ul.querySelectorAll('li[data-k]').forEach(li => li.onclick = () => { close(); showOnModel(li.dataset.k); });
    };
    inp.oninput = draw; drawF(); draw(); setTimeout(() => inp.focus(), 50);
  });
}

function openLayers() {
  openPanel('Слои и прозрачность', pb => {
    const draw = () => {
      pb.innerHTML = SYSTEMS.map(s => `<div class="row"><span class="dot" style="width:10px;height:10px;border-radius:5px;background:${s.c}"></span><div class="n"><div style="font-weight:600">${esc(s.ru)}</div><input type="range" min="0" max="100" value="${Math.round(sysState[s.id].opacity * 100)}" data-s="${s.id}"></div><button class="toggle ${sysState[s.id].on ? 'on' : ''}" data-t="${s.id}"></button></div>`).join('') +
        `<div class="row"><div class="n"><b>Оболочки: фасции, сумки, плевра, сальник</b><div style="font-size:12.5px;color:var(--tx3)">Закрывают мышцы и органы, поэтому по умолчанию скрыты</div></div><button class="toggle ${showSoft ? 'on' : ''}" id="t-soft"></button></div>
         <div class="row"><div class="n"><b>Скрывать касанием</b><div style="font-size:12.5px;color:var(--tx3)">Касание снимает структуру — удобно «раздевать» слои мышц</div></div><button class="toggle ${hideMode ? 'on' : ''}" id="t-hm"></button></div>
         <div class="btnrow" style="margin-top:14px"><button class="btn sec" id="l-all">Показать всё скрытое</button></div>
         <div class="btnrow" style="margin-top:10px"><button class="btn sec" id="l-off">Сохранить для офлайна</button></div>
         <div id="l-st" style="font-size:12.5px;color:var(--tx3);margin-top:8px"></div>
         <div class="about">3D-модели: <a href="https://www.z-anatomy.com" target="_blank" rel="noopener">Z-Anatomy</a> (на основе BodyParts3D), лицензия CC BY-SA 4.0. Модели упрощены для работы на телефоне. Английские описания — Wikipedia, CC BY-SA.</div>`;
      pb.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { sysState[r.dataset.s].opacity = r.value / 100; applyStyles(); saveLayout(); });
      pb.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { setSystem(b.dataset.t, !sysState[b.dataset.t].on); draw(); });
      pb.querySelector('#t-soft').onclick = () => { showSoft = !showSoft; store.set('soft', showSoft); applyStyles(); draw(); };
      pb.querySelector('#t-hm').onclick = () => { hideMode = !hideMode; renderModebar(); draw(); };
      pb.querySelector('#l-all').onclick = () => { showAll(); toast('Всё скрытое показано'); };
      pb.querySelector('#l-off').onclick = () => cacheAll(pb.querySelector('#l-st'));
      offlineStatus(pb.querySelector('#l-st'));
    };
    draw();
  });
}
async function offlineStatus(box) {
  if (!('caches' in window)) return;
  let n = 0; for (const s of SYSTEMS) if (await caches.match('models/' + s.id + '.glb')) n++;
  box.textContent = `Сохранено для офлайна: ${n} из ${SYSTEMS.length} систем.`;
}
async function cacheAll(box) {
  box.textContent = 'Скачиваю…'; let n = 0;
  for (const s of SYSTEMS) { try { await fetch('models/' + s.id + '.glb'); n++; box.textContent = `Скачано ${n} из ${SYSTEMS.length}…`; } catch { } }
  try { await fetch('data/desc_en.json'); } catch { }
  setTimeout(() => offlineStatus(box), 400);
}

function openSection() {
  openPanel('Срез модели', pb => {
    const s = store.get('sec', { on: false, ax: 'z', v: 50, flip: false });
    const apply = () => {
      store.set('sec', s);
      if (!s.on) { renderer.clippingPlanes = []; }
      else {
        const n = { x: [1, 0, 0], y: [0, -1, 0], z: [0, 0, -1] }[s.ax]; const range = { x: [-0.35, 0.35], y: [0, 1.78], z: [-0.2, 0.2] }[s.ax];
        const pos = range[0] + (range[1] - range[0]) * s.v / 100;
        clipPlane.normal.set(...n).multiplyScalar(s.flip ? -1 : 1);
        const p = new THREE.Vector3(s.ax === 'x' ? pos : 0, s.ax === 'y' ? pos : 0, s.ax === 'z' ? pos : 0);
        clipPlane.constant = -clipPlane.normal.dot(p);
        renderer.clippingPlanes = [clipPlane];
      }
      needRender = true; renderModebar(); $('#b-section').classList.toggle('on', s.on);
    };
    const draw = () => {
      pb.innerHTML = `<div class="row"><div class="n"><b>Включить срез</b></div><button class="toggle ${s.on ? 'on' : ''}" id="sc-on"></button></div>
      <div style="margin:14px 0 8px;font-weight:600">Плоскость</div>
      <div class="seg"><button data-ax="z" class="${s.ax === 'z' ? 'on' : ''}">Фронтальная</button><button data-ax="x" class="${s.ax === 'x' ? 'on' : ''}">Сагиттальная</button><button data-ax="y" class="${s.ax === 'y' ? 'on' : ''}">Горизонтальная</button></div>
      <div style="margin:16px 0 0;font-weight:600">Положение</div><input type="range" min="0" max="100" value="${s.v}" id="sc-v">
      <div class="btnrow" style="margin-top:12px"><button class="btn sec" id="sc-f">Перевернуть сторону</button></div>`;
      pb.querySelector('#sc-on').onclick = () => { s.on = !s.on; apply(); draw(); };
      pb.querySelectorAll('[data-ax]').forEach(b => b.onclick = () => { s.ax = b.dataset.ax; s.on = true; apply(); draw(); });
      pb.querySelector('#sc-v').oninput = e => { s.v = +e.target.value; s.on = true; apply(); pb.querySelector('#sc-on').classList.add('on'); };
      pb.querySelector('#sc-f').onclick = () => { s.flip = !s.flip; s.on = true; apply(); draw(); };
    };
    draw();
  });
}
function openViews() {
  openPanel('Вид', (pb, close) => {
    const vs = [['front', 'Спереди'], ['back', 'Сзади'], ['left', 'Слева'], ['right', 'Справа'], ['top', 'Сверху'], ['bottom', 'Снизу']];
    pb.innerHTML = '<div class="grid2">' + vs.map(([k, n]) => `<button class="tile" style="min-height:56px;align-items:center;justify-content:center" data-v="${k}"><b>${n}</b></button>`).join('') + '</div>';
    pb.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { setView(b.dataset.v); close(); });
  });
}

$('#b-search').onclick = openSearch;
$('#b-layers').onclick = openLayers;
$('#b-hide').onclick = () => { hideMode = !hideMode; renderModebar(); toast(hideMode ? 'Касание скрывает структуру' : 'Касание выбирает структуру'); };
$('#b-undo').onclick = undoHide;
$('#b-section').onclick = openSection;
$('#b-view').onclick = openViews;
$('#b-reset').onclick = () => { showAll(); deselect(); setView('front'); };

/* ---------- views / tabs ---------- */
let curView = 'atlas';
function switchView(v) {
  curView = v;
  document.querySelectorAll('.view').forEach(s => s.classList.add('hidden'));
  $('#v-' + v).classList.remove('hidden');
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('#overlay').innerHTML = '';
  if (v === 'atlas') { resize(); needRender = true; }
  if (v === 'cards' && !fcSession) renderCardsHome();
  if (v === 'tests' && !testState) renderTestsHome();
  if (v === 'notes' && noteOpen === null) renderNotesHome();
}
document.querySelectorAll('#tabs button').forEach(b => b.onclick = () => {
  if (b.dataset.v === curView) { // tap again → home of section
    if (curView === 'cards') { fcSession = null; renderCardsHome(); }
    if (curView === 'tests' && !quiz3d) { testState = null; renderTestsHome(); }
    if (curView === 'notes') { noteOpen = null; renderNotesHome(); }
  }
  switchView(b.dataset.v);
});

/* ---------- snapshots (illustrations for cards & tests) ---------- */
const snapCache = new Map();
const ghostMat = new THREE.MeshStandardMaterial({ color: 0x8c99a8, transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide });
const hiMat = new THREE.MeshStandardMaterial({ color: 0x35e0c8, emissive: 0x1aa892, emissiveIntensity: 0.35, roughness: 0.5, side: THREE.DoubleSide });
let snapRT = null; const snapCam = new THREE.PerspectiveCamera(30, 1, 0.01, 50);
async function snapshot(k, size = 420) {
  if (snapCache.has(k)) return snapCache.get(k);
  const d = DB[k]; await loadSystem(d.sys);
  if (!snapRT) snapRT = new THREE.WebGLRenderTarget(size, size, { samples: 4, colorSpace: THREE.SRGBColorSpace });
  const saved = [];
  for (const s of SYSTEMS) { const g = sysState[s.id].group; if (g) { saved.push([g, g.visible]); g.visible = s.id === d.sys; } }
  const mats = [];
  const grp = sysState[d.sys].group;
  grp.traverse(m => { if (!m.isMesh || m.userData.skip) return; mats.push([m, m.material, m.visible, m.renderOrder]); m.visible = m.userData.key === k || !isSoft(m.userData.key); const hit = m.userData.key === k; m.material = hit ? hiMat : ghostMat; m.renderOrder = hit ? 0 : 1; });
  const b = boxOf([k]); const c = b.getCenter(new THREE.Vector3()); const r = Math.max(b.getSize(new THREE.Vector3()).length() / 2, 0.025);
  let dir = c.clone(); dir.y = 0; if (dir.length() < 0.04) dir.set(0, 0, 1); dir.normalize(); dir.y = 0.15;
  const dist = Math.max(0.2, r / Math.sin(THREE.MathUtils.degToRad(15)) * 1.6);
  snapCam.position.copy(c).add(dir.normalize().multiplyScalar(dist)); snapCam.lookAt(c); snapCam.near = dist / 50; snapCam.far = dist * 10; snapCam.updateProjectionMatrix();
  snapCam.add(key.clone());
  const clip = renderer.clippingPlanes; renderer.clippingPlanes = [];
  const bg = scene.background; scene.background = new THREE.Color(0x18202b);
  renderer.setRenderTarget(snapRT); renderer.render(scene, snapCam); renderer.setRenderTarget(null);
  scene.background = bg; renderer.clippingPlanes = clip;
  snapCam.clear();
  const px = new Uint8Array(size * size * 4); renderer.readRenderTargetPixels(snapRT, 0, 0, size, size, px);
  mats.forEach(([m, mat, v, ro]) => { m.material = mat; m.visible = v; m.renderOrder = ro; });
  saved.forEach(([g, v]) => g.visible = v);
  const cv = document.createElement('canvas'); cv.width = cv.height = size; const ctx = cv.getContext('2d'); const img = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) img.data.set(px.subarray((size - 1 - y) * size * 4, (size - y) * size * 4), y * size * 4);
  ctx.putImageData(img, 0, 0);
  const url = cv.toDataURL('image/jpeg', 0.85); snapCache.set(k, url); applyStyles(); needRender = true;
  return url;
}

/* ---------- FLASHCARDS (Leitner) ---------- */
const BOX_DAYS = [0, 1, 3, 7, 14, 30];
let fcSession = null;
function fcData() { return store.get('fc', {}); }
function deckKeys(deck) {
  if (deck.fav) return store.get('fav', []).filter(k => DB[k]);
  if (deck.err) return store.get('errs', []).filter(k => DB[k]);
  return KEYS.filter(k => DB[k].sys === deck.sys && (!deck.g || DB[k].g === deck.g));
}
function deckStats(keys) { const fc = fcData(); let learned = 0, due = 0; const now = Date.now(); for (const k of keys) { const r = fc[k]; if (r && r.b >= 3) learned++; if (r && r.t <= now) due++; } return { learned, due, total: keys.length }; }
function renderCardsHome() {
  const R = $('#cards-root'); const fc = fcData(); const n = Object.keys(fc).length;
  const learned = Object.values(fc).filter(r => r.b >= 3).length;
  const mode = store.get('fcmode', 'ru');
  R.innerHTML = `<h1>Карточки</h1><p class="sub">Интервальное повторение: знакомые карточки приходят реже, трудные — чаще. С иллюстрацией прямо из 3D-модели.</p>
   <div class="stat"><div><b>${n}</b><span>изучалось</span></div><div><b>${learned}</b><span>выучено</span></div><div><b>${KEYS.length}</b><span>всего карточек</span></div></div>
   <div class="seg" id="fcm" style="margin-bottom:14px"><button data-m="ru" class="${mode === 'ru' ? 'on' : ''}">Рус → лат</button><button data-m="la" class="${mode === 'la' ? 'on' : ''}">Лат → рус</button><button data-m="img" class="${mode === 'img' ? 'on' : ''}">Картинка → назв.</button></div>
   <div class="grid2" id="fcspecial"></div><h2>Колоды по системам</h2><div id="fcdecks"></div>`;
  R.querySelectorAll('#fcm button').forEach(b => b.onclick = () => { store.set('fcmode', b.dataset.m); renderCardsHome(); });
  const sp = $('#fcspecial');
  const favK = deckKeys({ fav: 1 }), errK = deckKeys({ err: 1 });
  const t1 = el('button', { class: 'tile', style: '--c:#f2b84b' }, `<div class="ic">${ICON.star}</div><b>Избранное</b><span>${favK.length} карточек</span>`); t1.onclick = () => favK.length ? startFc({ fav: 1, name: 'Избранное' }) : toast('Добавляйте структуры кнопкой «В карточки» в атласе', 2600);
  const t2 = el('button', { class: 'tile', style: '--c:#ef5b5b' }, `<div class="ic">${ICON.err}</div><b>Мои ошибки</b><span>${errK.length} карточек</span>`); t2.onclick = () => errK.length ? startFc({ err: 1, name: 'Мои ошибки' }) : toast('Сюда попадают ошибки из тестов', 2200);
  sp.append(t1, t2);
  const dk = $('#fcdecks');
  for (const s of SYSTEMS) {
    const keys = deckKeys({ sys: s.id }); const st = deckStats(keys);
    dk.appendChild(el('div', { class: 'grp' }, `${esc(s.ru)} · ${st.learned}/${st.total}`));
    const grid = el('div', { class: 'grid2' });
    const gs = [...new Set(keys.map(k => DB[k].g))];
    const all = el('button', { class: 'tile', style: `--c:${s.c}` }, `<div class="ic">${ICON.card}</div><b>Вся система</b><span>${keys.length} карт.${st.due ? ' · повторить ' + st.due : ''}</span><div class="prog" style="width:${st.total ? st.learned / st.total * 100 : 0}%"></div>`);
    all.onclick = () => startFc({ sys: s.id, name: s.ru }); grid.appendChild(all);
    for (const g of gs) {
      const gk = deckKeys({ sys: s.id, g }); const gst = deckStats(gk);
      const t = el('button', { class: 'tile', style: `--c:${s.c}` }, `<b>${esc(g)}</b><span>${gk.length} карт.${gst.due ? ' · повторить ' + gst.due : ''}</span><div class="prog" style="width:${gst.learned / gst.total * 100}%"></div>`);
      t.onclick = () => startFc({ sys: s.id, g, name: g }); grid.appendChild(t);
    }
    dk.appendChild(grid);
  }
}
function startFc(deck) {
  const keys = deckKeys(deck); const fc = fcData(); const now = Date.now();
  const due = shuffle(keys.filter(k => fc[k] && fc[k].t <= now));
  const fresh = shuffle(keys.filter(k => !fc[k]));
  const later = shuffle(keys.filter(k => fc[k] && fc[k].t > now)).sort((a, b) => fc[a].b - fc[b].b);
  const queue = [...due, ...fresh, ...later].slice(0, 20);
  fcSession = { deck, queue, i: 0, flip: false, know: 0, dont: 0, mode: store.get('fcmode', 'ru') };
  renderFc();
}
function fcGrade(k, ok) {
  const fc = fcData(); const r = fc[k] || { b: 0, t: 0 };
  r.b = ok ? Math.min(5, r.b + 1) : 0; r.t = Date.now() + BOX_DAYS[r.b] * 864e5 - (ok ? 0 : 0); fc[k] = r; store.set('fc', fc);
  if (!ok) { const e = store.get('errs', []); if (!e.includes(k)) { e.push(k); store.set('errs', e.slice(-300)); } }
  else if (r.b >= 3) { store.set('errs', store.get('errs', []).filter(x => x !== k)); }
}
function renderFc() {
  const R = $('#cards-root'); const S = fcSession;
  if (S.i >= S.queue.length) {
    R.innerHTML = `<button class="back-h" id="fcb">${ICON.back}Колоды</button><h1>Готово!</h1><p class="sub">${esc(S.deck.name)}</p>
     <div class="stat"><div><b style="color:var(--ok)">${S.know}</b><span>знаю</span></div><div><b style="color:var(--bad)">${S.dont}</b><span>повторить</span></div></div>
     <button class="btn" id="fcm">Ещё 20 карточек</button><div style="height:10px"></div><button class="btn sec" id="fch">К колодам</button>`;
    $('#fcb').onclick = $('#fch').onclick = () => { fcSession = null; renderCardsHome(); };
    $('#fcm').onclick = () => startFc(S.deck); return;
  }
  const k = S.queue[S.i]; const d = DB[k]; const sys = SYS[d.sys];
  const front = S.mode === 'la' ? `<div class="k">Латинское название</div><div class="big" style="font-style:italic">${esc(d.la)}</div>`
    : S.mode === 'img' ? `<div class="k">Что выделено?</div><div id="fcimg" style="color:var(--tx3)">Рисую…</div>`
      : `<div class="k">Русское название</div><div class="big">${esc(d.ru)}</div>`;
  R.innerHTML = `<button class="back-h" id="fcb">${ICON.back}${esc(S.deck.name)}</button>
   <div class="qtop"><div class="pbar"><b style="width:${S.i / S.queue.length * 100}%"></b></div><span style="font-size:13px;color:var(--tx3)">${S.i + 1}/${S.queue.length}</span></div>
   <div class="fc-wrap"><div class="fc" id="fc"><div class="face">${front}<div class="hint">Нажмите, чтобы перевернуть</div></div>
   <div class="face back"><div class="k" style="color:${sys.c}">${esc(sys.ru)} · ${esc(d.g)}</div><div id="fcimg2"></div><div class="big">${esc(d.ru)}</div><div class="la">${esc(d.la)}</div><div class="en">${esc(d.en)}</div><button class="lnk" id="fcshow">Показать на 3D-модели</button></div></div></div>
   <div class="btnrow"><button class="btn bad" id="fcn">Не знаю</button><button class="btn ok" id="fcy">Знаю</button></div>`;
  $('#fcb').onclick = () => { fcSession = null; renderCardsHome(); };
  const card = $('#fc'); card.onclick = e => { if (e.target.id === 'fcshow') return; card.classList.toggle('flip'); };
  $('#fcshow').onclick = e => { e.stopPropagation(); showOnModel(k); };
  const go = ok => { fcGrade(k, ok); ok ? S.know++ : S.dont++; if (!ok) S.queue.push(k); S.i++; renderFc(); };
  $('#fcn').onclick = () => go(false); $('#fcy').onclick = () => go(true);
  snapshot(k, 360).then(url => {
    if (fcSession !== S || S.queue[S.i] !== k) return;
    const im = `<img src="${url}" alt="">`;
    const a = $('#fcimg'); if (a) a.outerHTML = im;
    const b = $('#fcimg2'); if (b) b.innerHTML = `<img src="${url}" alt="" style="max-height:110px">`;
  }).catch(() => { const a = $('#fcimg'); if (a) a.textContent = 'Нет сети для загрузки модели'; });
}

/* ---------- TESTS ---------- */
let testState = null; let quiz3d = null;
const SECTIONS = [...new Set((window.QUESTIONS || []).map(q => q.s))];
function renderTestsHome() {
  const R = $('#tests-root'); const hist = store.get('hist', []);
  R.innerHTML = `<h1>Тесты</h1><p class="sub">Вопросы по разделам, латынь и 3D-тесты прямо на модели.</p>
   <h2>3D-тесты</h2><div class="grid2" id="t3d"></div>
   <h2>По разделам</h2><div class="grid2" id="tsec"></div>
   <h2>Терминология</h2><div class="grid2" id="tlat"></div>
   ${hist.length ? `<h2>Последние результаты</h2><div class="card" style="padding:4px 14px">${hist.slice(-8).reverse().map(h => `<div class="row"><div class="n" style="font-size:14px">${esc(h.n)}<div style="font-size:12px;color:var(--tx3)">${new Date(h.d).toLocaleDateString('ru-RU')}</div></div><b style="color:${h.s / h.t >= .8 ? 'var(--ok)' : h.s / h.t >= .5 ? 'var(--warn)' : 'var(--bad)'}">${h.s}/${h.t}</b></div>`).join('')}</div>` : ''}`;
  const t3 = $('#t3d');
  const a = el('button', { class: 'tile', style: '--c:#3fc1b0' }, `<div class="ic">${ICON.cube}</div><b>Найди на модели</b><span>Показываем название — коснитесь структуры</span>`); a.onclick = () => pickScope('find');
  const b = el('button', { class: 'tile', style: '--c:#7aa7ff' }, `<div class="ic">${ICON.q}</div><b>Что выделено?</b><span>Структура подсвечена — выберите название</span>`); b.onclick = () => pickScope('name');
  t3.append(a, b);
  const ts = $('#tsec');
  const all = el('button', { class: 'tile' }, `<div class="ic">${ICON.q}</div><b>Все разделы</b><span>${(window.QUESTIONS || []).length} вопросов</span>`); all.onclick = () => startTest({ name: 'Все разделы', qs: sample(window.QUESTIONS, 15) }); ts.appendChild(all);
  for (const s of SECTIONS) { const n = window.QUESTIONS.filter(q => q.s === s).length; const t = el('button', { class: 'tile' }, `<b>${esc(s)}</b><span>${n} вопр.</span>`); t.onclick = () => startTest({ name: s, qs: sample(window.QUESTIONS.filter(q => q.s === s), 10) }); ts.appendChild(t); }
  const tl = $('#tlat');
  for (const s of SYSTEMS) { const t = el('button', { class: 'tile', style: `--c:${s.c}` }, `<div class="ic">${ICON.la}</div><b>${esc(s.ru)}</b><span>Рус ↔ лат, 10 вопросов</span>`); t.onclick = () => startTest({ name: 'Латынь: ' + s.ru, qs: latinQs(s.id, 10) }); tl.appendChild(t); }
}
function latinQs(sys, n) {
  const pool = KEYS.filter(k => DB[k].sys === sys);
  return sample(pool, n).map((k, i) => {
    const d = DB[k]; const toLat = i % 2 === 0;
    const same = pool.filter(x => x !== k && DB[x].g === d.g); const other = pool.filter(x => x !== k);
    const wrong = sample(same.length >= 3 ? same : other, 3);
    const opts = shuffle([k, ...wrong]);
    return { q: toLat ? `Латинское название: «${d.ru}»` : `Перевод: «${d.la}»`, a: opts.map(x => toLat ? DB[x].la : DB[x].ru), c: opts.indexOf(k), k, e: `${d.ru} — ${d.la}` };
  });
}
function startTest(t) { testState = { ...t, i: 0, score: 0, answered: false, wrong: [] }; renderTest(); }
function renderTest() {
  const R = $('#tests-root'); const T = testState;
  if (T.i >= T.qs.length) {
    const h = store.get('hist', []); h.push({ n: T.name, s: T.score, t: T.qs.length, d: Date.now() }); store.set('hist', h.slice(-50));
    R.innerHTML = `<button class="back-h" id="tb">${ICON.back}Тесты</button><h1>${T.score} из ${T.qs.length}</h1><p class="sub">${esc(T.name)}</p>
     ${T.wrong.length ? `<h2>Ошибки</h2>` + T.wrong.map(w => `<div class="card"><div style="font-weight:600">${esc(w.q)}</div><div style="color:var(--ok);margin-top:4px">${esc(w.a[w.c])}</div>${w.k ? `<button class="lnk" data-k="${esc(w.k)}" style="margin-top:8px">Показать на модели</button>` : ''}</div>`).join('') : '<div class="card">Без ошибок — отлично!</div>'}
     <div style="height:8px"></div><button class="btn" id="tr">Пройти ещё раз</button><div style="height:10px"></div><button class="btn sec" id="th">К тестам</button>`;
    $('#tb').onclick = $('#th').onclick = () => { testState = null; renderTestsHome(); };
    $('#tr').onclick = () => startTest({ name: T.name, qs: T.name.startsWith('Латынь') ? latinQs(SYSTEMS.find(s => T.name.endsWith(s.ru)).id, 10) : shuffle(T.qs.slice()) });
    R.querySelectorAll('[data-k]').forEach(b => b.onclick = () => showOnModel(b.dataset.k));
    return;
  }
  const q = T.qs[T.i];
  R.innerHTML = `<button class="back-h" id="tb">${ICON.back}${esc(T.name)}</button>
   <div class="qtop"><div class="pbar"><b style="width:${T.i / T.qs.length * 100}%"></b></div><span style="font-size:13px;color:var(--tx3)">${T.i + 1}/${T.qs.length}</span></div>
   <div class="qq">${esc(q.q)}</div><div id="opts">${q.a.map((a, i) => `<button class="opt" data-i="${i}">${esc(a)}</button>`).join('')}</div><div id="after"></div>`;
  $('#tb').onclick = () => { testState = null; renderTestsHome(); };
  R.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (T.answered) return; T.answered = true; const i = +b.dataset.i;
    R.querySelectorAll('.opt').forEach(o => { if (+o.dataset.i === q.c) o.classList.add('ok'); });
    if (i === q.c) T.score++; else { b.classList.add('bad'); T.wrong.push(q); if (q.k) { const e = store.get('errs', []); if (!e.includes(q.k)) { e.push(q.k); store.set('errs', e); } } }
    $('#after').innerHTML = (q.e ? `<div class="expl">${esc(q.e)}</div>` : '') + `<div class="btnrow">${q.k ? '<button class="btn sec" id="tshow">На модели</button>' : ''}<button class="btn" id="tn">Дальше</button></div>`;
    $('#tn').onclick = () => { T.i++; T.answered = false; renderTest(); };
    if (q.k) $('#tshow').onclick = () => showOnModel(q.k);
  });
}
function pickScope(mode) {
  openPanel(mode === 'find' ? 'Найди на модели' : 'Что выделено?', (pb, close) => {
    pb.innerHTML = '<p class="sub" style="margin:0 0 8px">Выберите систему и раздел. 10 вопросов.</p>' + SYSTEMS.map(s => {
      const gs = [...new Set(KEYS.filter(k => DB[k].sys === s.id).map(k => DB[k].g))];
      return `<div class="grp" style="color:${s.c}">${esc(s.ru)}</div><div class="filters" style="flex-wrap:wrap"><button class="chip" data-s="${s.id}" data-g="">Вся система</button>${gs.map(g => `<button class="chip" data-s="${s.id}" data-g="${esc(g)}">${esc(g)}</button>`).join('')}</div>`;
    }).join('');
    pb.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { close(); start3d(mode, b.dataset.s, b.dataset.g); });
  });
}
async function start3d(mode, sys, g) {
  let pool = KEYS.filter(k => DB[k].sys === sys && (!g || DB[k].g === g));
  const firm = pool.filter(k => !isSoft(k)); if (firm.length >= 4) pool = firm;
  switchView('atlas');
  showLoading('Готовлю 3D-тест…');
  try { await loadSystem(sys, p => setLoading(p)); } catch { hideLoading(); toast('Не удалось загрузить модель'); return; }
  hideLoading();
  quiz3d = { mode, sys, g, pool, items: sample(pool, Math.min(10, pool.length)), i: 0, score: 0, state: 'ask', prevOn: SYSTEMS.map(s => sysState[s.id].on), prevIso: isolateSet };
  // show only this system
  SYSTEMS.forEach(s => { sysState[s.id].on = s.id === sys; if (sysState[s.id].group) sysState[s.id].group.visible = s.id === sys; });
  isolateSet = g ? new Set(pool) : null;
  deselect(); renderChips(); applyStyles(); renderModebar();
  if (true) { const b = boxOf(pool); const c = b.getCenter(new THREE.Vector3()); const r = b.getSize(new THREE.Vector3()).length() / 2; flyTo(c, Math.min(4.5, r / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * 1.25), new THREE.Vector3(0, 0.1, 1), 0.4); }
  else setView('front');
  render3dQ();
}
function render3dQ() {
  const Q = quiz3d; const bn = $('#qbanner'); bn.classList.remove('hidden'); $('#sheet').classList.add('hidden');
  if (Q.i >= Q.items.length) {
    const h = store.get('hist', []); h.push({ n: (Q.mode === 'find' ? '3D: найди — ' : '3D: что выделено — ') + (Q.g || SYS[Q.sys].ru), s: Q.score, t: Q.items.length, d: Date.now() }); store.set('hist', h.slice(-50));
    bn.innerHTML = `<div class="k"><span>Результат</span></div><div class="t">${Q.score} из ${Q.items.length}</div><div class="btnrow" style="margin-top:10px"><button class="btn sec" id="q3x">Выйти</button><button class="btn" id="q3r">Ещё раз</button></div>`;
    $('#q3x').onclick = end3d; $('#q3r').onclick = () => { const { mode, sys, g } = Q; end3d(true); start3d(mode, sys, g); };
    return;
  }
  const k = Q.items[Q.i]; const d = DB[k];
  allMeshes.forEach(m => m.userData.flash = null); xray = false;
  if (Q.mode === 'find') {
    selected = null; applyStyles();
    bn.innerHTML = `<div class="k"><span>Найдите на модели · ${Q.i + 1}/${Q.items.length}</span><span>✓ ${Q.score}</span></div><div class="t">${esc(d.ru)}</div><div class="l">${esc(d.la)}</div><div class="r" id="q3r"></div><div class="btnrow" style="margin-top:8px"><button class="btn sec" style="height:40px" id="q3x">Выйти</button><button class="btn sec" style="height:40px" id="q3s">Не знаю</button></div>`;
    $('#q3s').onclick = () => q3dReveal(false, null);
  } else {
    (meshesByKey.get(k) || []).forEach(m => m.userData.flash = HL); applyStyles(); focusKey(k);
    const same = Q.pool.filter(x => x !== k); const opts = shuffle([k, ...sample(same.length >= 3 ? same : KEYS.filter(x => DB[x].sys === Q.sys && x !== k), 3)]);
    bn.innerHTML = `<div class="k"><span>Что выделено? · ${Q.i + 1}/${Q.items.length}</span><span>✓ ${Q.score}</span></div><div class="opts">${opts.map(o => `<button class="opt" data-k="${esc(o)}">${esc(DB[o].ru)}</button>`).join('')}</div><div class="r" id="q3r"></div><div class="btnrow" style="margin-top:8px"><button class="btn sec" style="height:40px" id="q3x">Выйти</button></div>`;
    bn.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
      if (Q.state !== 'ask') return; const ok = b.dataset.k === k; Q.state = 'shown';
      bn.querySelectorAll('[data-k]').forEach(o => { if (o.dataset.k === k) o.classList.add('ok'); });
      if (!ok) b.classList.add('bad');
      q3dReveal(ok, null);
    });
  }
  $('#q3x').onclick = () => end3d();
  Q.state = 'ask';
}
function quiz3dTap(hits) {
  const Q = quiz3d; const h = hits[0];
  if (!Q || Q.mode !== 'find' || Q.state !== 'ask') { if (h) { selected = { key: h.object.userData.key, point: h.point.clone(), color: Q && Q.state === 'shown' ? HL_OK : null }; renderLabel(); } return; }
  if (!h) return;
  const k = Q.items[Q.i];
  // a deep structure counts if it lies along the tap ray (e.g. a bronchus inside the lung)
  const ok = hits.some(x => x.object.userData.key === k);
  q3dReveal(ok, ok ? null : h.object.userData.key);
}
function q3dReveal(ok, tappedKey) {
  const Q = quiz3d; const k = Q.items[Q.i]; Q.state = 'shown';
  if (ok) Q.score++; else { const e = store.get('errs', []); if (!e.includes(k)) { e.push(k); store.set('errs', e); } }
  allMeshes.forEach(m => m.userData.flash = null);
  if (tappedKey && !ok) (meshesByKey.get(tappedKey) || []).forEach(m => m.userData.flash = HL_BAD);
  (meshesByKey.get(k) || []).forEach(m => m.userData.flash = HL_OK);
  selected = { key: k, point: centerOf(k), color: HL_OK }; xray = true; applyStyles(); renderLabel();
  if (!ok) focusKey(k);
  const r = $('#q3r'); if (r) r.innerHTML = ok ? '<span style="color:var(--ok)">Верно!</span>' : `<span style="color:var(--bad)">Неверно${tappedKey ? ': это «' + esc(DB[tappedKey].ru) + '»' : ''}.</span> Правильный ответ подсвечен зелёным.`;
  const bn = $('#qbanner'); const row = bn.querySelector('.btnrow');
  if (!row.querySelector('#q3n')) { const nb = el('button', { class: 'btn', style: 'height:40px', id: 'q3n' }, 'Дальше'); nb.onclick = () => { Q.i++; selected = null; render3dQ(); }; row.appendChild(nb); const s = row.querySelector('#q3s'); if (s) s.remove(); }
}
function end3d(silent) {
  const Q = quiz3d; if (!Q) return; quiz3d = null;
  allMeshes.forEach(m => m.userData.flash = null);
  SYSTEMS.forEach((s, i) => { sysState[s.id].on = Q.prevOn[i]; if (sysState[s.id].group) sysState[s.id].group.visible = Q.prevOn[i]; });
  if (!SYSTEMS.some(s => sysState[s.id].on)) { sysState.skeleton.on = true; if (sysState.skeleton.group) sysState.skeleton.group.visible = true; }
  isolateSet = Q.prevIso; selected = null; xray = false;
  $('#qbanner').classList.add('hidden'); renderChips(); applyStyles(); renderModebar(); renderLabel();
  if (!silent) { testState = null; renderTestsHome(); }
}

/* ---------- NOTES ---------- */
let noteOpen = null;
const NOTE_SECTIONS = [...new Set((window.NOTES || []).map(n => n.s))];
const SEC_COLOR = { 'Остеология': '#e6dcc3', 'Артрология': '#9fc3d6', 'Миология': '#d0574d', 'Пищеварительная система': '#eaa07f', 'Дыхательная система': '#e59a9a', 'Мочеполовая система': '#e4b36a', 'Сердечно-сосудистая система': '#ff6b6b', 'Центральная нервная система': '#f0cf4a', 'Периферическая нервная система': '#f7e08a', 'Эндокринная система': '#c49bff', 'Органы чувств': '#7fc4e8', 'Лимфатическая система': '#7fcf6a' };
function renderNotesHome() {
  const R = $('#notes-root'); const read = store.get('read', []);
  R.innerHTML = `<h1>Конспекты</h1><p class="sub">${window.NOTES.length} конспектов по 12 разделам. Подчёркнутые термины открываются на 3D-модели.</p>` +
    NOTE_SECTIONS.map(s => `<div class="grp" style="color:${SEC_COLOR[s] || 'var(--tx3)'}">${esc(s)}</div>` + window.NOTES.map((n, i) => [n, i]).filter(([n]) => n.s === s).map(([n, i]) => `<div class="row" data-i="${i}" style="cursor:pointer"><div class="n"><div style="font-weight:600;font-size:15.5px">${esc(n.t)}</div></div>${read.includes(i) ? '<span style="color:var(--ok);font-size:13px">✓</span>' : ''}<span style="color:var(--tx3)">›</span></div>`).join('')).join('') +
    `<div class="about">Анатомия 3D — учебное приложение. Термины даны по Международной анатомической терминологии (лат.). 3D-модели — проект Z-Anatomy (на основе BodyParts3D), CC BY-SA 4.0. Работает офлайн после первой загрузки.</div>`;
  R.querySelectorAll('[data-i]').forEach(r => r.onclick = () => openNote(+r.dataset.i));
}
function md(src) {
  const lines = src.trim().split('\n'); let out = ''; let list = null; let table = null;
  const inline = s => esc(s).replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (m, k, t) => `<a class="st" data-k="${esc(k.replace(/ /g, '_'))}">${t}</a>`).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const closeList = () => { if (list) { out += `</${list}>`; list = null; } };
  const closeTable = () => { if (table) { out += '</table>'; table = null; } };
  for (const raw of lines) {
    const l = raw.trimEnd();
    if (/^\|/.test(l.trim())) { closeList(); const cells = l.trim().slice(1, -1).split('|').map(c => c.trim()); if (cells.every(c => /^-+$/.test(c))) continue; if (!table) { table = 1; out += '<table><tr>' + cells.map(c => `<th>${inline(c)}</th>`).join('') + '</tr>'; } else out += '<tr>' + cells.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>'; continue; }
    closeTable();
    if (/^## /.test(l)) { closeList(); out += `<h2>${inline(l.slice(3))}</h2>`; continue; }
    let m;
    if ((m = l.match(/^\s*- (.*)/))) { if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; } out += `<li>${inline(m[1])}</li>`; continue; }
    if ((m = l.match(/^\s*\d+\. (.*)/))) { if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; } out += `<li>${inline(m[1])}</li>`; continue; }
    if (!l.trim()) { closeList(); continue; }
    closeList(); out += `<p>${inline(l)}</p>`;
  }
  closeList(); closeTable(); return out;
}
function openNote(i) {
  noteOpen = i; const n = window.NOTES[i]; const R = $('#notes-root');
  const read = store.get('read', []); if (!read.includes(i)) { read.push(i); store.set('read', read); }
  const hasQ = window.QUESTIONS.some(q => q.s === n.s);
  R.innerHTML = `<button class="back-h" id="nb">${ICON.back}Конспекты</button><div style="font-size:12.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:${SEC_COLOR[n.s] || 'var(--tx3)'}">${esc(n.s)}</div><h1>${esc(n.t)}</h1><div class="note">${md(n.b)}</div>
   <div style="height:18px"></div>${hasQ ? '<button class="btn" id="nt">Тест по разделу</button><div style="height:10px"></div>' : ''}
   <div class="btnrow">${i > 0 ? '<button class="btn sec" id="np">← Назад</button>' : ''}${i < window.NOTES.length - 1 ? '<button class="btn sec" id="nn">Далее →</button>' : ''}</div>`;
  R.scrollTop = 0;
  $('#nb').onclick = () => { noteOpen = null; renderNotesHome(); };
  R.querySelectorAll('a.st').forEach(a => a.onclick = () => showOnModel(a.dataset.k));
  if (hasQ) $('#nt').onclick = () => { switchView('tests'); startTest({ name: n.s, qs: sample(window.QUESTIONS.filter(q => q.s === n.s), 10) }); };
  const p = $('#np'), nx = $('#nn'); if (p) p.onclick = () => openNote(i - 1); if (nx) nx.onclick = () => openNote(i + 1);
}

/* ---------- boot ---------- */
async function boot() {
  const j = await (await fetch('data/structures.json')).json();
  DB = j.items; KEYS = Object.keys(DB);
  for (const k of KEYS) { const d = DB[k]; d._s = norm(d.ru + ' | ' + d.la + ' | ' + d.en); }
  const lay = store.get('layout', null);
  SYSTEMS.forEach(s => { if (lay && lay[s.id]) { sysState[s.id].on = lay[s.id].on; sysState[s.id].opacity = lay[s.id].op ?? 1; } });
  if (!SYSTEMS.some(s => sysState[s.id].on)) sysState.skeleton.on = true;
  renderChips(); renderModebar(); resize(); requestAnimationFrame(loop);
  const sec = store.get('sec', null); if (sec && sec.on) { /* restore section silently */ const s = sec; const n = { x: [1, 0, 0], y: [0, -1, 0], z: [0, 0, -1] }[s.ax]; const range = { x: [-0.35, 0.35], y: [0, 1.78], z: [-0.2, 0.2] }[s.ax]; const pos = range[0] + (range[1] - range[0]) * s.v / 100; clipPlane.normal.set(...n).multiplyScalar(s.flip ? -1 : 1); clipPlane.constant = -clipPlane.normal.dot(new THREE.Vector3(s.ax === 'x' ? pos : 0, s.ax === 'y' ? pos : 0, s.ax === 'z' ? pos : 0)); renderer.clippingPlanes = [clipPlane]; $('#b-section').classList.add('on'); renderModebar(); }
  const first = SYSTEMS.filter(s => sysState[s.id].on);
  showLoading('Загрузка модели…');
  for (const s of first) { try { await loadSystem(s.id, p => setLoading(p)); sysState[s.id].group.visible = true; } catch { toast('Нет соединения — модель не загружена'); } }
  hideLoading(); renderChips(); applyStyles();
  if (!store.get('hinted', false)) { toast('Вращайте одним пальцем, масштаб — двумя. Коснитесь кости, чтобы узнать название.', 4200); store.set('hinted', true); }
  // background: cache everything for offline
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => setTimeout(() => { SYSTEMS.forEach(s => fetch('models/' + s.id + '.glb').catch(() => { })); fetch('data/desc_en.json').catch(() => { }); }, 6000)).catch(() => { });
  }
}
window.__anat = { DB: () => DB, sysState, showOnModel, snapshot, select, start3d, meshesByKey };
boot();
