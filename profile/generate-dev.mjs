#!/usr/bin/env node
// Late-night dev scene: an animated pixel-art GIF of someone coding at a desk.
//
//   node generate-dev.mjs --user <login> [--out dist] [--demo]
//
// Animated: typing hands, code appearing on the CRT, blinking cursor, clock hand,
// PC tower LEDs, coffee steam, a sleeping cat breathing in the moonlight.
// The HUD at the bottom shows your GitHub stats. No dependencies (own GIF encoder).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { USER, OUT, DEMO, LANG_COLORS, fetchStats, demoStats, FONT, fmt, textWidth } from './lib.mjs';

const W = 240, H = 135, SCALE = 4, FRAMES = 48, DELAY_CS = 12;

// ---------------------------------------------------------------- color buffer
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
class Canvas {
  constructor() { this.d = new Uint8ClampedArray(W * H * 3); }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const [r, g, b] = typeof c === 'string' ? hex(c) : c, i = (y * W + x) * 3;
    this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b;
  }
  blend(x, y, c, a) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W || y >= H || a <= 0) return;
    const [r, g, b] = typeof c === 'string' ? hex(c) : c, i = (y * W + x) * 3;
    this.d[i] += (r - this.d[i]) * a; this.d[i + 1] += (g - this.d[i + 1]) * a; this.d[i + 2] += (b - this.d[i + 2]) * a;
  }
  rect(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c); }
  dither(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if ((i + j) % 2) this.set(i, j, c); }
  poly(pts, c, a = 1) {
    const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
        const cx = x + 0.5, cy = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > cy) !== (yj > cy) && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) (a < 1 ? this.blend(x, y, c, a) : this.set(x, y, c));
      }
    }
  }
  disc(cx, cy, r, c) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, c); }
  line(x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.set(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
  }
  thick(x0, y0, x1, y1, r, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.disc(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), r, c);
  }
  sprite(x, y, rows, pal) { rows.forEach((row, j) => [...row].forEach((ch, i) => { if (pal[ch]) this.set(x + i, y + j, pal[ch]); })); }
  text(x, y, str, c) {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch] || FONT['?'];
      g.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') this.set(cx + i, y + j, c); }));
      cx += g[0].length + 1;
    }
  }
}

// ---------------------------------------------------------------- palette
const C = {
  wall: '#17212b', wallDark: '#111920', wallLine: '#1d2934',
  outside: '#0a1317', slat: '#86c3bf', slatMid: '#5e9598', slatDark: '#2a4a52', frame: '#0c141a', cord: '#a9cfc9',
  ray: '#a6e6dc',
  corkFrame: '#2a1f17', cork: '#5a3f2a', corkDot: '#47311f', paper: '#c9d1cb', paperLine: '#7f8a85', pin: '#d24d57', pinB: '#4d9de0',
  clockFrame: '#242b32', clockFace: '#b4bdb6', clockHand: '#151a1f', clockSec: '#d24d57',
  shelf: '#2c2219', shelfTop: '#3d3024',
  desk: '#26303a', deskEdge: '#3a4652', deskFront: '#192028', floor: '#0d1217', drawer: '#1e262f', drawerEdge: '#2e3944', handle: '#5b6773',
  crt: '#4b5158', crtLight: '#6a737b', crtDark: '#30353b', crtSide: '#3a4047', bezel: '#3d434a',
  screen: '#0f1c3c', lineNo: '#34446e', cursor: '#d6deff',
  code: ['#7aa2f7', '#bb9af7', '#9ece6a', '#e0af68', '#f7768e', '#c0caf5', '#7dcfff'],
  glow: '#3f6cff',
  tower: '#3a4048', towerLight: '#4e555e', towerDark: '#262b31', led: '#5cff8a', hdd: '#ffb347',
  kb: '#353c45', key: '#56606b', keyLight: '#77828e',
  mug: '#d9d4c7', mugDark: '#a8a397', coffee: '#4a2c1a', steam: '#cfd8e0',
  can: '#b8323a', canLight: '#e2555c', canStripe: '#e6e6e6',
  mouse: '#59626c',
  hoodie: '#4b2f7a', hoodieDark: '#311e55', hoodieLight: '#6a48a8', rim: '#8a8ef0',
  hair: '#22182c', hairLight: '#3f2e4c', skin: '#e8a47c', skinDark: '#b87a5c', rimL: '#5e9598',
  phones: '#2a2d35', phonesLight: '#4a4f5a', phonesLed: '#7df9ff',
  chair: '#14191f', chairEdge: '#29313b', chairLight: '#38414c',
  cat: '#e6dfd2', catDark: '#b0a796', catEar: '#e79aa6',
  hud: '#000000', hudText: '#c0caf5', hudDim: '#7f89b5', hudAccent: '#ff7ae6',
};

// ---------------------------------------------------------------- scene
// code tokens: [indent, [len, colorIndex], ...]
const CODE = [
  [0, [5, 1], [6, 0], [1, 5]],
  [1, [4, 1], [5, 6], [2, 5], [6, 3]],
  [1, [3, 1], [3, 5], [7, 2]],
  [2, [6, 0], [1, 5], [4, 3], [2, 5]],
  [2, [3, 4], [8, 2]],
  [1, [1, 5]],
  [1, [6, 1], [4, 0], [3, 5]],
  [2, [5, 6], [2, 5], [9, 2]],
  [0, [1, 5]],
];
const CODE_LEN = CODE.reduce((n, [ind, ...t]) => n + ind * 2 + t.reduce((m, [l]) => m + l + 1, 0), 0);

function drawScene(cv, f, stats) {
  const t = f / FRAMES;
  const langCol = LANG_COLORS[stats.topLang] || C.code[0];

  // wall with panel seams and a darker top
  cv.rect(0, 0, W, H, C.wall);
  for (let x = 70; x < W; x += 34) cv.rect(x, 0, 1, 90, C.wallLine);
  cv.dither(0, 0, W, 6, C.wallDark);

  // window with blinds (moon / street light outside)
  cv.rect(0, 0, 64, 88, C.outside);
  for (let y = 2; y < 86; y += 5) {
    for (let x = 0; x < 62; x++) {
      const k = 1 - x / 90 - y / 260;
      cv.set(x, y, C.slatMid);
      cv.blend(x, y, C.slat, k);
      cv.set(x, y + 1, C.slat);
      cv.blend(x, y + 1, '#ffffff', 0.25 * k);
      cv.set(x, y + 2, C.slatMid);
      cv.set(x, y + 3, C.slatDark);
    }
  }
  cv.rect(40, 0, 1, 86, C.cord);
  cv.rect(62, 0, 4, 88, C.frame);
  cv.rect(0, 86, 66, 3, C.frame);

  // cork board with notes
  cv.rect(74, 8, 52, 34, C.corkFrame);
  cv.rect(76, 10, 48, 30, C.cork);
  for (let i = 0; i < 70; i++) cv.set(76 + ((i * 37) % 48), 10 + ((i * 53) % 30), C.corkDot);
  const notes = [[79, 13, 12, 14], [94, 12, 11, 10], [108, 14, 13, 16], [95, 25, 10, 12]];
  notes.forEach(([x, y, w, h], i) => {
    cv.rect(x, y, w, h, C.paper);
    for (let ly = y + 3; ly < y + h - 1; ly += 2) cv.rect(x + 2, ly, w - 4 - ((ly + i) % 3), 1, C.paperLine);
    cv.set(x + Math.floor(w / 2), y + 1, i % 2 ? C.pinB : C.pin);
  });

  // wall clock (second hand sweeps once per loop)
  const ccx = 196, ccy = 18;
  cv.disc(ccx, ccy, 10, C.clockFrame);
  cv.disc(ccx, ccy, 8, C.clockFace);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    cv.set(ccx + Math.round(Math.sin(a) * 7), ccy - Math.round(Math.cos(a) * 7), C.clockFrame);
  }
  cv.line(ccx, ccy, ccx - 4, ccy - 2, C.clockHand);
  cv.line(ccx, ccy, ccx + 1, ccy - 6, C.clockHand);
  const sa = t * Math.PI * 2;
  cv.line(ccx, ccy, ccx + Math.round(Math.sin(sa) * 6), ccy - Math.round(Math.cos(sa) * 6), C.clockSec);

  // shelf with books and a plant
  cv.rect(212, 38, 28, 2, C.shelfTop);
  cv.rect(212, 40, 28, 2, C.shelf);
  [[214, 9, '#6d4a8c'], [217, 11, '#3f6f8f'], [220, 8, '#8f5a3f'], [223, 10, '#4c7a55']].forEach(([x, h, c]) => cv.rect(x, 38 - h, 3, h, c));
  cv.rect(230, 32, 6, 6, '#7a4a35');
  cv.sprite(228, 24, ['..1..1..', '.121121.', '12122121', '.112211.'], { 1: '#2f7a4a', 2: '#4fae6a' });

  // desk
  cv.poly([[24, 84], [W, 84], [W, 110], [6, 110]], C.desk);
  cv.rect(24, 84, W - 24, 1, C.deskEdge);
  cv.poly([[6, 110], [W, 110], [W, 117], [6, 117]], C.deskFront);
  cv.rect(6, 110, W - 6, 1, C.deskEdge);
  cv.rect(0, 117, W, H - 117, C.floor);
  // drawer unit on the left
  cv.rect(10, 117, 40, 18, C.drawer);
  cv.rect(10, 117, 40, 1, C.drawerEdge);
  cv.rect(10, 126, 40, 1, C.drawerEdge);
  cv.rect(26, 121, 8, 1, C.handle);
  cv.rect(26, 130, 8, 1, C.handle);

  // PC tower
  cv.poly([[222, 46], [230, 42], [230, 92], [222, 96]], C.towerDark);
  cv.rect(196, 46, 26, 50, C.tower);
  cv.rect(196, 46, 26, 1, C.towerLight);
  cv.rect(196, 46, 1, 50, C.towerLight);
  for (let y = 52; y < 64; y += 3) cv.rect(200, y, 18, 1, C.towerDark);
  cv.rect(200, 70, 18, 2, C.towerDark);
  cv.rect(200, 75, 18, 2, C.towerDark);
  if (f % 8 < 6) cv.set(214, 88, C.led);
  if ([1, 2, 5, 9, 10, 17, 22, 23, 30, 31, 38, 44].includes(f % FRAMES)) cv.set(210, 88, C.hdd);
  cv.rect(204, 86, 4, 4, C.towerDark);

  // CRT monitor (left side visible)
  cv.poly([[128, 48], [138, 42], [138, 84], [128, 80]], C.crtSide);
  cv.rect(138, 42, 50, 42, C.crt);
  cv.rect(138, 42, 50, 1, C.crtLight);
  cv.rect(138, 42, 1, 42, C.crtLight);
  cv.rect(187, 42, 1, 42, C.crtDark);
  cv.rect(138, 83, 50, 1, C.crtDark);
  cv.rect(141, 45, 44, 34, C.bezel);
  cv.rect(143, 47, 40, 30, C.screen);
  cv.rect(154, 84, 20, 4, C.crtDark);
  cv.poly([[148, 88], [180, 88], [184, 92], [144, 92]], C.crt);
  cv.set(180, 80, C.led);
  // editor: tab bar, line numbers, typed code
  cv.rect(143, 47, 40, 3, '#16264d');
  cv.rect(144, 48, 9, 1, langCol);
  const typed = Math.min(CODE_LEN, Math.floor(CODE_LEN * 0.35 + (CODE_LEN * 0.65 * f) / (FRAMES - 10)));
  let budget = typed, cur = null;
  CODE.forEach(([ind, ...tokens], li) => {
    const y = 52 + li * 3;
    cv.set(145, y, C.lineNo);
    let x = 148 + ind * 2;
    budget -= ind * 2;
    if (budget < 0) return;
    for (const [len, ci] of tokens) {
      const n = Math.min(len, budget);
      if (n > 0) cv.rect(x, y, n, 1, ci === 0 ? langCol : C.code[ci]);
      budget -= len + 1;
      x += len + 1;
      if (budget < 0) { cur = [x - len - 1 + n, y]; return; }
    }
    cur = [x, y];
  });
  if (cur && Math.floor(f / 3) % 2 === 0) cv.rect(cur[0], cur[1] - 1, 1, 3, C.cursor);
  // scanlines
  for (let y = 48; y < 77; y += 2) for (let x = 143; x < 183; x++) cv.blend(x, y, '#000000', 0.12);

  // keyboard, mouse, mug, soda can
  cv.poly([[110, 95], [160, 95], [164, 103], [112, 103]], C.kb);
  for (let r = 0; r < 3; r++) for (let k = 0; k < 12; k++) {
    const x = 113 + k * 4 + r, y = 96 + r * 2;
    cv.rect(x, y, 3, 1, (f + k * 7 + r * 3) % 11 === 0 ? C.keyLight : C.key);
  }
  cv.rect(170, 98, 5, 6, C.mouse);
  cv.rect(170, 98, 5, 1, C.keyLight);
  cv.rect(64, 90, 8, 10, C.mug);
  cv.rect(71, 90, 1, 10, C.mugDark);
  cv.rect(72, 92, 2, 1, C.mug);
  cv.rect(73, 93, 1, 3, C.mug);
  cv.rect(72, 96, 2, 1, C.mug);
  cv.rect(65, 90, 6, 1, C.coffee);
  for (let i = 0; i < 3; i++) {
    const p = (f / FRAMES * 4 + i / 3) % 1;
    const sy = 88 - Math.floor(p * 10), sx = 66 + i * 2 + Math.round(Math.sin(p * 6 + i) * 1.5);
    cv.blend(sx, sy, C.steam, 0.6 * (1 - p));
  }
  cv.rect(190, 88, 6, 11, C.can);
  cv.rect(190, 88, 1, 11, C.canLight);
  cv.rect(190, 92, 6, 2, C.canStripe);
  cv.rect(190, 87, 6, 1, C.canStripe);

  // sleeping cat on the desk (breathing)
  const br = Math.sin(t * Math.PI * 4) > 0.3 ? 1 : 0;
  cv.sprite(38, 94 - br, [
    '..............11.1.',
    '.....1111111..1111.',
    '...11111111111e11e1',
    '..1111111111111111.',
    '.1111111111111111..',
    '.22111111111111222.',
    '1222222222222222...',
  ], { 1: C.cat, 2: C.catDark, e: C.catEar });
  cv.rect(38, 101, 18, 1, C.catDark);
  cv.sprite(34, 97 - br, ['.11', '1..', '1..', '.1.'], { 1: C.cat });

  // ---- the dev (seen from behind), typing
  const bob = f % 24 < 12 ? 0 : 1;
  const tap = (i) => ([0, 1, 0, 0, 1, 0, 1, 1][(f + i * 3) % 8]);
  // left arm reaching to the keyboard
  cv.thick(88, 84 + bob, 116, 98, 3, C.hoodieDark);
  cv.disc(118, 98 - tap(0), 2, C.skinDark);
  // torso / hoodie
  cv.poly([[80, 82 + bob], [92, 74 + bob], [114, 74 + bob], [126, 84 + bob], [128, 120], [78, 120]], C.hoodie);
  cv.poly([[80, 82 + bob], [92, 74 + bob], [96, 76 + bob], [86, 86 + bob], [82, 120], [78, 120]], C.hoodieDark);
  cv.poly([[118, 78 + bob], [126, 84 + bob], [128, 120], [124, 120]], C.hoodieLight);
  for (let y = 84; y < 118; y++) cv.set(127, y + bob, C.rim);
  cv.line(80, 82 + bob, 92, 74 + bob, C.rimL);
  cv.line(80, 83 + bob, 78, 100, C.rimL);
  // hood bunched at the neck
  cv.poly([[90, 74 + bob], [116, 74 + bob], [112, 82 + bob], [94, 82 + bob]], C.hoodieDark);
  cv.rect(94, 75 + bob, 18, 1, C.hoodieLight);
  // right arm to the keyboard
  cv.thick(120, 84 + bob, 140, 97, 4, C.hoodie);
  cv.thick(124, 82 + bob, 142, 95, 1, C.hoodieLight);
  cv.disc(143, 98 - tap(1), 3, C.skin);
  cv.set(145, 97 - tap(1), C.skinDark);
  // head: hair, headphones
  const hy = 62 + bob;
  cv.disc(103, hy, 10, C.hair);
  cv.disc(104, hy - 3, 5, C.hairLight);
  cv.disc(103, hy - 2, 4, C.hair);
  cv.set(97, hy - 9, C.hair); cv.set(108, hy - 10, C.hair); cv.set(101, hy - 11, C.hair);
  for (let a = -1.25; a <= 1.25; a += 0.05) cv.set(103 + Math.round(Math.sin(a) * 11), hy - Math.round(Math.cos(a) * 11), C.phones);
  cv.rect(90, hy - 3, 4, 8, C.phones);
  cv.rect(113, hy - 3, 4, 8, C.phonesLight);
  cv.rect(116, hy - 3, 1, 8, C.rim);
  cv.set(114, hy + 3, Math.floor(f / 6) % 2 ? C.phonesLed : C.phonesLight);
  for (let a = 0; a < Math.PI * 2; a += 0.04) {
    const x = 103 + Math.round(Math.sin(a) * 10), y = hy - Math.round(Math.cos(a) * 10);
    if (x >= 90 && x <= 116 && y >= hy - 3 && y <= hy + 4) continue; // ear cups
    if (a > 0.2 && a < 2.4) cv.set(x, y, C.rim);
    else if (a > 4.2 && a < 6.0) cv.set(x, y, C.rimL);
  }
  for (let y = hy - 3; y < hy + 5; y++) cv.set(89, y, C.rimL);

  // office chair back in front of the dev
  cv.poly([[84, 100], [122, 100], [126, 135], [80, 135]], C.chair);
  cv.rect(86, 100, 34, 1, C.chairLight);
  for (let y = 101; y < 135; y++) { cv.set(84 - Math.floor((y - 100) / 9), y, C.chairEdge); cv.set(122 + Math.floor((y - 100) / 9), y, C.chairEdge); }
  cv.rect(98, 104, 10, 1, C.chairEdge);

  // ---- lighting
  // window light through the blinds: bands travel down-right from each slat
  for (let y = 0; y < H; y++) for (let x = 64; x < W; x++) {
    const y0 = y - 0.5 * (x - 64);
    if (y0 < 2 || y0 > 86) continue;
    if (((Math.floor(y0) - 2) % 5 + 5) % 5 > 1) continue;
    const fade = Math.max(0, 1 - (x - 64) / 150);
    cv.blend(x, y, C.ray, 0.16 * fade);
  }
  // monitor glow
  const flick = 1 + (f % 5 === 0 ? 0.12 : 0);
  for (let y = 30; y < H; y++) for (let x = 60; x < W; x++) {
    if (x >= 143 && x < 183 && y >= 47 && y < 77) continue;
    const d = Math.hypot((x - 163) / 1.3, y - 70);
    if (d < 75) cv.blend(x, y, C.glow, 0.17 * (1 - d / 75) * flick);
  }
  // vignette
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
    if (d > 0.75) cv.blend(x, y, '#05080b', Math.min(0.55, (d - 0.75) * 1.4));
  }

  // ---- HUD with stats
  for (let y = 126; y < H; y++) for (let x = 0; x < W; x++) cv.blend(x, y, C.hud, 0.6);
  const parts = [[`@${stats.login}`, C.hudText], [`${fmt(stats.repos)} REPOS`, C.hudDim], [`★ ${fmt(stats.stars)}`, C.hudAccent],
    [`${fmt(stats.followers)} FOLLOWERS`, C.hudDim]];
  if (stats.contributions != null) parts.push([`${fmt(stats.contributions)} CONTRIB`, C.hudDim]);
  let total = parts.reduce((w, [s]) => w + textWidth(s), 0) + 7 * (parts.length - 1);
  if (total > W - 8) { parts.pop(); total = parts.reduce((w, [s]) => w + textWidth(s), 0) + 7 * (parts.length - 1); }
  let tx = Math.floor((W - total) / 2);
  for (const [s, c] of parts) { cv.text(tx, 128, s, c); tx += textWidth(s) + 7; }
}

// ---------------------------------------------------------------- GIF encoder
function buildPalette(frames) {
  const counts = new Map();
  for (const d of frames) for (let i = 0; i < d.length; i += 3) {
    const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  // median cut: always split the box with the widest color range, so small but
  // distinct colors (skin, LEDs) survive instead of being merged by frequency
  const cols = [...counts].map(([k, n]) => ({ c: [(k >> 16) & 255, (k >> 8) & 255, k & 255], n }));
  const range = (box) => {
    let best = [0, -1];
    for (let ch = 0; ch < 3; ch++) {
      let lo = 255, hi = 0;
      for (const { c } of box) { if (c[ch] < lo) lo = c[ch]; if (c[ch] > hi) hi = c[ch]; }
      if (hi - lo > best[1]) best = [ch, hi - lo];
    }
    return best;
  };
  let boxes = [cols];
  while (boxes.length < 255) {
    let bi = -1, br = 0, bch = 0;
    boxes.forEach((box, i) => { if (box.length < 2) return; const [ch, r] = range(box); if (r > br) { br = r; bi = i; bch = ch; } });
    if (bi < 0) break;
    const box = boxes[bi].sort((x, y) => x.c[bch] - y.c[bch]);
    const total = box.reduce((t, x) => t + x.n, 0);
    let acc = 0, cut = 1;
    for (let i = 0; i < box.length - 1; i++) { acc += box[i].n; if (acc >= total / 2) { cut = i + 1; break; } }
    boxes.splice(bi, 1, box.slice(0, cut), box.slice(cut));
  }
  const pal = boxes.map((box) => {
    const t = box.reduce((s, x) => s + x.n, 0);
    return [0, 1, 2].map((ch) => Math.round(box.reduce((s, x) => s + x.c[ch] * x.n, 0) / t));
  });
  const cache = new Map();
  const index = (r, g, b) => {
    const k = (r << 16) | (g << 8) | b;
    let v = cache.get(k);
    if (v === undefined) {
      let bd = Infinity;
      pal.forEach((p, i) => { const d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; v = i; } });
      cache.set(k, v);
    }
    return v;
  };
  return { pal, index };
}

function lzw(minCode, data) {
  const out = [];
  let cur = 0, bits = 0;
  const emit = (code, size) => { cur |= code << bits; bits += size; while (bits >= 8) { out.push(cur & 255); cur >>= 8; bits -= 8; } };
  const clear = 1 << minCode, eoi = clear + 1;
  let dict, next, size;
  const reset = () => { dict = new Map(); next = eoi + 1; size = minCode + 1; };
  reset();
  emit(clear, size);
  let prefix = data[0];
  for (let i = 1; i < data.length; i++) {
    const k = data[i], key = prefix * 256 + k, hit = dict.get(key);
    if (hit !== undefined) { prefix = hit; continue; }
    emit(prefix, size);
    if (next < 4096) {
      dict.set(key, next++);
      if (next > 1 << size && size < 12) size++;
    } else { emit(clear, size); reset(); }
    prefix = k;
  }
  emit(prefix, size);
  emit(eoi, size);
  if (bits > 0) out.push(cur & 255);
  return out;
}

function encodeGif(frames) {
  const { pal, index } = buildPalette(frames);
  const GW = W * SCALE, GH = H * SCALE, TRANSP = 255;
  const bytes = [];
  const u16 = (n) => bytes.push(n & 255, (n >> 8) & 255);
  bytes.push(...Buffer.from('GIF89a'));
  u16(GW); u16(GH);
  bytes.push(0xf7, 0, 0);
  for (let i = 0; i < 256; i++) bytes.push(...(pal[i] || [0, 0, 0]));
  bytes.push(0x21, 0xff, 0x0b, ...Buffer.from('NETSCAPE2.0'), 3, 1, 0, 0, 0); // loop forever

  let prev = null;
  for (const d of frames) {
    const idx = new Uint8Array(W * H);
    for (let p = 0; p < W * H; p++) idx[p] = index(d[p * 3], d[p * 3 + 1], d[p * 3 + 2]);
    // bounding box of changes (in source pixels)
    let x0 = 0, y0 = 0, x1 = W - 1, y1 = H - 1;
    if (prev) {
      x0 = W; y0 = H; x1 = -1; y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (idx[y * W + x] !== prev[y * W + x]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      if (x1 < 0) { x0 = y0 = x1 = y1 = 0; }
    }
    const sw = (x1 - x0 + 1) * SCALE, sh = (y1 - y0 + 1) * SCALE;
    const sub = new Uint8Array(sw * sh);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      const p = (y0 + Math.floor(y / SCALE)) * W + x0 + Math.floor(x / SCALE);
      sub[y * sw + x] = prev && idx[p] === prev[p] ? TRANSP : idx[p];
    }
    bytes.push(0x21, 0xf9, 4, (1 << 2) | 1); u16(DELAY_CS); bytes.push(TRANSP, 0);
    bytes.push(0x2c); u16(x0 * SCALE); u16(y0 * SCALE); u16(sw); u16(sh); bytes.push(0);
    bytes.push(8);
    const data = lzw(8, sub);
    for (let i = 0; i < data.length; i += 255) { const chunk = data.slice(i, i + 255); bytes.push(chunk.length, ...chunk); }
    bytes.push(0);
    prev = idx;
  }
  bytes.push(0x3b);
  return Buffer.from(bytes);
}

// ---------------------------------------------------------------- main
const stats = DEMO ? demoStats(USER) : await fetchStats(USER);
const frames = Array.from({ length: FRAMES }, (_, f) => { const cv = new Canvas(); drawScene(cv, f, stats); return cv.d; });
mkdirSync(OUT, { recursive: true });
const file = join(OUT, 'dev-scene.gif');
const gif = encodeGif(frames);
writeFileSync(file, gif);
console.log(`wrote ${file} (${(gif.length / 1024).toFixed(0)} KB, ${FRAMES} frames)`);
