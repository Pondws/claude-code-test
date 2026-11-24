#!/usr/bin/env node
// Pixel Room generator: renders an isometric pixel-art room SVG from GitHub stats.
//
//   node profile/generate-room.mjs --user <login> [--out profile/dist] [--demo]
//
// Env: GITHUB_TOKEN (optional, enables the contribution heatmap and commit count
// via GraphQL and raises the REST rate limit).
//
// Room items are driven by your data:
//   bookshelf books  -> your repositories (colored by language, most-starred first)
//   wall poster      -> contribution heatmap for the last 13 weeks
//   monitor code     -> top language color
//   trophy           -> appears when you have stars (gold at 100+)
//   plant            -> grows with followers
//   window           -> sunny sky (light mode) / starry night (dark mode)

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------- args / data
const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};
const USER = arg('user', process.env.GITHUB_USER || process.env.GITHUB_REPOSITORY_OWNER || 'octocat');
const OUT = arg('out', 'profile/dist');
const DEMO = args.includes('--demo');
const TOKEN = process.env.GITHUB_TOKEN || '';

const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5', Go: '#00add8',
  Rust: '#dea584', Java: '#b07219', HTML: '#e34c26', CSS: '#663399', Shell: '#89e051',
  C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', PHP: '#4f5d95', Ruby: '#701516',
  Kotlin: '#a97bff', Swift: '#f05138', Dart: '#00b4ab', Vue: '#41b883', Lua: '#000080',
  'Jupyter Notebook': '#da5b0b', SCSS: '#c6538c', Svelte: '#ff3e00', Dockerfile: '#384d54',
};
const BOOK_FALLBACK = ['#8e5b3a', '#4f6d7a', '#7a4f6d', '#5b7a4f', '#a0522d', '#6d6d8e'];

async function gh(path, init = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'pixel-room-generator',
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new Error(`GitHub ${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

async function fetchStats(login) {
  const user = await gh(`/users/${login}`);
  const repos = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh(`/users/${login}/repos?per_page=100&type=owner&sort=pushed&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const own = repos.filter((r) => !r.fork);
  const langCount = {};
  for (const r of own) if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
  const topLang = Object.entries(langCount).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Code';

  let weeks = null;
  let contributions = null;
  if (TOKEN) {
    try {
      const q = `query($l:String!){user(login:$l){contributionsCollection{contributionCalendar{
        totalContributions weeks{contributionDays{contributionCount}}}}}}`;
      const res = await gh('/graphql', {
        method: 'POST',
        body: JSON.stringify({ query: q, variables: { l: login } }),
      });
      const cal = res.data.user.contributionsCollection.contributionCalendar;
      contributions = cal.totalContributions;
      weeks = cal.weeks.slice(-13).map((w) => w.contributionDays.map((d) => d.contributionCount));
    } catch (e) {
      console.warn(`Contribution calendar unavailable: ${e.message}`);
    }
  }

  return {
    login: user.login,
    repos: user.public_repos,
    followers: user.followers,
    stars: own.reduce((s, r) => s + r.stargazers_count, 0),
    topLang,
    contributions,
    weeks,
    books: own
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .map((r) => ({ name: r.name, color: LANG_COLORS[r.language] })),
  };
}

function demoStats(login) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const langs = ['TypeScript', 'JavaScript', 'Python', 'Go', 'Shell', 'HTML', 'Rust'];
  return {
    login, repos: 23, followers: 48, stars: 136, topLang: 'TypeScript', contributions: 842,
    weeks: Array.from({ length: 13 }, () => Array.from({ length: 7 }, () => {
      const r = rnd(); return r < 0.25 ? 0 : Math.floor(r * r * 14);
    })),
    books: Array.from({ length: 23 }, (_, i) => ({ name: `repo-${i}`, color: LANG_COLORS[langs[Math.floor(rnd() * langs.length)]] })),
  };
}

// ---------------------------------------------------------------- palettes
const THEMES = {
  day: {
    wallL: '#efe2c8', wallR: '#e1cfad', wallCap: '#fbf4e6', wallEdgeL: '#c9b48e', wallEdgeR: '#b89f76',
    base: '#9c7652', floor: '#d39a62', floorLine: '#b97f4c', slabL: '#9a6238', slabR: '#7c4a29',
    rugA: '#b5484a', rugB: '#e9c46a', rugC: '#c85a5c',
    wood: '#8a5a3b', woodTop: '#a8724d', woodDark: '#6b432a', shelfIn: '#4a2f1f',
    metal: '#3b3f4a', metalTop: '#565b69', metalDark: '#2a2d35',
    screen: '#1d2330', screenGlow: '#263048',
    sky: '#8fd3ff', skyLow: '#c4ecff', frame: '#ffffff', frameDark: '#cfd8dc',
    poster: '#ffffff', posterEdge: '#d0c6b4', heat: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'],
    pot: '#c8643c', potTop: '#e07a4f', potDark: '#9c4a2b', leaf: '#3f9b4b', leafLight: '#6cc96f', leafDark: '#2b6e36',
    text: '#5b4636', textDim: '#9c8a78', accent: '#d9822b',
    chair: '#3e6fb0', chairTop: '#5687c9', chairDark: '#2c4f80',
    cat: '#f0a55a', catDark: '#c97c34', catLight: '#ffd29a',
    lamp: '#f4d35e', lampOff: '#e8e1c8', mug: '#ffffff', mugDark: '#d7d7d7',
  },
  night: {
    wallL: '#3b3d63', wallR: '#30325290', wallCap: '#565a8a', wallEdgeL: '#2a2c4a', wallEdgeR: '#23243d',
    base: '#25263f', floor: '#6e4b3a', floorLine: '#5a3b2d', slabL: '#4a3024', slabR: '#3a251b',
    rugA: '#7a3346', rugB: '#b89a4e', rugC: '#8e4256',
    wood: '#5c3d2c', woodTop: '#74503a', woodDark: '#432b1f', shelfIn: '#2a1b13',
    metal: '#2b2e38', metalTop: '#3d414e', metalDark: '#1d1f26',
    screen: '#0f1a2e', screenGlow: '#1d3557',
    sky: '#141a3a', skyLow: '#26306b', frame: '#c7c9e0', frameDark: '#8d90b3',
    poster: '#2a2c45', posterEdge: '#1e2035', heat: ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'],
    pot: '#9a4a2e', potTop: '#b85d3c', potDark: '#73351f', leaf: '#2e7a3a', leafLight: '#4ea85a', leafDark: '#1f5428',
    text: '#d6d8f0', textDim: '#8d90b3', accent: '#f4d35e',
    chair: '#2f5288', chairTop: '#3f68a8', chairDark: '#213a61',
    cat: '#d98c45', catDark: '#a86528', catLight: '#f2be80',
    lamp: '#ffe066', lampOff: '#ffe066', mug: '#d8d8e8', mugDark: '#a8a8bc',
  },
};
THEMES.night.wallR = '#303252';

// ---------------------------------------------------------------- raster
const W = 200, H = 170, SCALE = 4;
const OX = 100, OY = 72; // screen position of the back floor corner

class Layer {
  constructor(cls = '') { this.cls = cls; this.px = new Map(); }
  set(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (x < 0 || y < 0 || x >= W || y >= H || !c) return;
    this.px.set(y * W + x, c);
  }
  poly(pts, c) {
    const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
    const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), x1 = Math.min(W - 1, Math.ceil(Math.max(...xs)));
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const cx = x + 0.5, cy = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > cy) !== (yj > cy) && cx < ((xj - xi) * (cy - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.set(x, y, c);
      }
    }
  }
  line(x0, y0, x1, y1, c) {
    // 2:1 friendly line: step along the major axis
    const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy));
    for (let i = 0; i <= n; i++) this.set(x0 + (dx * i) / n + 0.0001, y0 + (dy * i) / n + 0.0001, c);
  }
  sprite(x, y, rows, pal) {
    rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && pal[ch]) this.set(x + i, y + j, pal[ch]); }));
  }
  text(x, y, str, c) {
    let cx = x;
    for (const ch of str.toUpperCase()) {
      const g = FONT[ch] || FONT['?'];
      g.forEach((row, j) => [...row].forEach((b, i) => { if (b === '1') this.set(cx + i, y + j, c); }));
      cx += g[0].length + 1;
    }
  }
  toPaths() {
    const byColor = new Map();
    for (let y = 0; y < H; y++) {
      let x = 0;
      while (x < W) {
        const c = this.px.get(y * W + x);
        if (!c) { x++; continue; }
        let run = 1;
        while (x + run < W && this.px.get(y * W + x + run) === c) run++;
        if (!byColor.has(c)) byColor.set(c, []);
        byColor.get(c).push(`M${x} ${y}h${run}v1h-${run}z`);
        x += run;
      }
    }
    const inner = [...byColor].map(([c, d]) => {
      const [fill, op] = c.length === 9 ? [c.slice(0, 7), parseInt(c.slice(7), 16) / 255] : [c, 1];
      return `<path fill="${fill}"${op < 1 ? ` fill-opacity="${op.toFixed(2)}"` : ''} d="${d.join('')}"/>`;
    }).join('');
    return this.cls ? `<g class="${this.cls}">${inner}</g>` : inner;
  }
}
const textWidth = (s) => [...s.toUpperCase()].reduce((w, ch) => w + (FONT[ch] || FONT['?'])[0].length + 1, 0) - 1;

// iso projection: x -> right/down, y -> left/down, z -> up
const P = (x, y, z = 0) => [OX + (x - y) * 2, OY + (x + y) - z];

function box(L, x, y, z, w, d, h, top, left, right) {
  L.poly([P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)], left); // +y face
  L.poly([P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)], right); // +x face
  L.poly([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)], top);
}
const quadX = (L, x, y0, y1, z0, z1, c) => L.poly([P(x, y0, z0), P(x, y1, z0), P(x, y1, z1), P(x, y0, z1)], c);
const quadY = (L, y, x0, x1, z0, z1, c) => L.poly([P(x0, y, z0), P(x1, y, z0), P(x1, y, z1), P(x0, y, z1)], c);
const quadZ = (L, z, x0, x1, y0, y1, c) => L.poly([P(x0, y0, z), P(x1, y0, z), P(x1, y1, z), P(x0, y1, z)], c);

// ---------------------------------------------------------------- 3x5 pixel font
const FONT = Object.fromEntries(Object.entries({
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111',
  0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
  8: '111101111101111', 9: '111101111001110',
  ' ': '000000000000000', '-': '000000111000000', '.': '000000000000010', '@': '010101111100011',
  '?': '110001010000010', '+': '000010111010000', '#': '101111101111101', '/': '001001010100100',
  ':': '000010000010000', K_: '0',
}).filter(([k]) => k.length === 1).map(([k, v]) => [k, [v.slice(0, 3), v.slice(3, 6), v.slice(6, 9), v.slice(9, 12), v.slice(12, 15)]]));
FONT['@'] = ['01110', '10001', '10111', '10110', '01111'];
FONT['★'] = ['00100', '01110', '11111', '01110', '01010'];
FONT['♥'] = ['01010', '11111', '11111', '01110', '00100'];

const fmt = (n) => (n >= 10000 ? `${Math.round(n / 1000)}K` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));

// ---------------------------------------------------------------- scene
function render(stats, mode) {
  const T = THEMES[mode];
  const night = mode === 'night';
  const L = new Layer();
  const anim = { blink: new Layer('blink'), twinkle: new Layer('twinkle'), twinkle2: new Layer('twinkle2'),
    steam: new Layer('steam'), tailA: new Layer('tail-a'), tailB: new Layer('tail-b'), glow: new Layer('glow') };

  const R = 40, WH = 58, TH = 3; // room size, wall height, wall thickness

  // walls
  quadX(L, 0, 0, R, 0, WH, T.wallL);
  quadY(L, 0, 0, R, 0, WH, T.wallR);
  quadX(L, 0, 0, R, 0, 3, T.base);
  quadY(L, 0, 0, R, 0, 3, T.base);
  // wall caps + end faces (thickness)
  quadZ(L, WH, -TH, 0, -TH, R, T.wallCap);
  quadZ(L, WH, -TH, R, -TH, 0, T.wallCap);
  quadY(L, R, -TH, 0, -4, WH, T.wallEdgeL);
  quadX(L, R, -TH, 0, -4, WH, T.wallEdgeR);

  // window on the left wall
  const wy0 = 8, wy1 = 22, wz0 = 28, wz1 = 48;
  quadX(L, 0, wy0, wy1, wz0, wz1, T.frame);
  quadX(L, 0, wy0 + 1, wy1 - 1, wz0 + 1, wz1 - 1, T.sky);
  quadX(L, 0, wy0 + 1, wy1 - 1, wz0 + 1, wz0 + 7, T.skyLow);
  const sky = (y, z) => P(0, y, z);
  if (night) {
    const moon = sky(12, 44);
    L.sprite(moon[0] - 2, moon[1], ['.11.', '1111', '111.', '.11.'], { 1: '#f6f1d1' });
    for (const [y, z, lay] of [[17, 45, 'twinkle'], [19, 40, 'twinkle2'], [14, 37, 'twinkle'], [10, 39, 'twinkle2'], [18, 34, 'twinkle']]) {
      const [sx, sy] = sky(y, z); anim[lay].set(sx, sy, '#ffffff');
    }
  } else {
    const sun = sky(12, 45);
    L.sprite(sun[0] - 2, sun[1], ['.11.', '1111', '1111', '.11.'], { 1: '#ffe066' });
    const cl = sky(18, 38);
    L.sprite(cl[0] - 1, cl[1], ['..11..', '.1111.', '111111'], { 1: '#ffffff' });
  }
  quadX(L, 0, 14.5, 15.5, wz0, wz1, T.frame); // mullions (half units stay tie-free horizontally)
  quadX(L, 0, wy0, wy1, 37, 38, T.frame);
  box(L, 0, wy0 - 1, wz0 - 2, 2, wy1 - wy0 + 2, 2, T.frameDark, T.frameDark, T.frame); // sill

  // contribution poster on the right wall
  const px0 = 5, px1 = 34, pz0 = 25, pz1 = 52;
  quadY(L, 0, px0, px1, pz0, pz1, T.posterEdge);
  quadY(L, 0, px0 + 1, px1 - 1, pz0 + 1, pz1 - 1, T.poster);
  const weeks = stats.weeks || Array.from({ length: 13 }, () => Array(7).fill(0));
  const max = Math.max(1, ...weeks.flat());
  weeks.forEach((days, i) => days.forEach((n, j) => {
    const lvl = n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
    const [sx, sy] = P(px0 + 1.5 + i * 2, 0, pz1 - 2 - j * 3);
    for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) L.set(sx + dx + 1, sy + dy, T.heat[lvl]);
  }));

  // floor
  quadZ(L, 0, 0, R, 0, R, T.floor);
  for (let y = 5; y < R; y += 5) { const a = P(0, y), b = P(R, y); L.line(a[0], a[1], b[0] - 1, b[1] - 0.5, T.floorLine); }
  L.poly([P(0, R, 0), P(R, R, 0), P(R, R, -4), P(0, R, -4)], T.slabL);
  L.poly([P(R, 0, 0), P(R, R, 0), P(R, R, -4), P(R, 0, -4)], T.slabR);

  // rug
  quadZ(L, 0, 10, 31, 19, 35, T.rugA);
  quadZ(L, 0, 12, 29, 21, 33, T.rugB);
  quadZ(L, 0, 14, 27, 23, 31, T.rugC);

  // plant in the back corner, grows with followers
  box(L, 3, 3, 0, 6, 6, 6, T.potTop, T.pot, T.potDark);
  quadZ(L, 6, 4, 8, 4, 8, '#5a3a22');
  const grow = Math.min(3, Math.floor(Math.log10(stats.followers + 1) * 1.3));
  const leaves = [
    ['....2.....', '...212....', '..21112.2.', '.2.212.212', '..21.2112.', '...2112...', '....11....'],
    ['.....2......', '....212..2..', '..2.2112212.', '.212.21112..', '.2112.212.2.', '..2112.21112', '...21112112.', '....21112...', '.....111....'],
    ['......2.......', '..2..212..2...', '.212.21122122.', '.2112.211122..', '..21122.2112..', '.2.211121112.2', '.212.2111122.2', '..211121112.2.', '...21112112...', '....211112....', '.....1111.....'],
    ['.......2........', '...2..212...2...', '..212.21122.212.', '.21112.2112211..', '..211122.21112..', '.2.2111221112.2.', '.212.21112112.22', '..2112.211122.2.', '...2111211112...', '....211121112...', '.....21111112...', '......111111....'],
  ][grow];
  const pc = P(6, 6, 6);
  L.sprite(pc[0] - Math.floor(leaves[0].length / 2), pc[1] - leaves.length + 1, leaves, { 1: T.leaf, 2: T.leafLight, 3: T.leafDark });

  // bookshelf on the left wall: one book per repo
  const bx = 0, by = 21, bw = 7, bd = 17, bh = 36;
  box(L, bx, by, 0, bw, bd, bh, T.woodTop, T.wood, T.woodDark);
  const shelves = [[2, 12], [13, 23], [24, 34]];
  const books = stats.books.slice(0, 45);
  shelves.forEach(([z0, z1], s) => {
    quadX(L, bw, by + 1, by + bd - 1, z0, z1, T.shelfIn);
    for (let i = 0; i < 15; i++) {
      const book = books[s * 15 + i];
      if (!book) break;
      const h = 6 + ((book.name.length * 7 + i * 3) % 4);
      const col = book.color || BOOK_FALLBACK[(book.name.length + i) % BOOK_FALLBACK.length];
      quadX(L, bw, by + 1 + i, by + 2 + i, z0, z0 + h, col);
      const top = P(bw, by + 1.5 + i, z0 + h - 2);
      L.set(top[0] - 1, top[1], '#ffffff55');
    }
  });
  // trophy on top of the shelf
  if (stats.stars > 0) {
    const tc = P(bw / 2, by + bd / 2, bh);
    const gold = stats.stars >= 100;
    L.sprite(tc[0] - 3, tc[1] - 8, ['1111111', '1.111.1', '.11211.', '..111..', '...1...', '..333..', '.33333.'],
      { 1: gold ? '#f4c542' : '#c0c7d1', 2: '#ffffff', 3: T.woodDark });
  }

  // desk against the right wall
  const dx0 = 16, dx1 = 34, dy1 = 10, dz = 13;
  for (const [lx, ly] of [[dx0, 0], [dx0, dy1 - 1], [dx1 - 1, 0], [dx1 - 1, dy1 - 1]]) box(L, lx, ly, 0, 1, 1, dz, T.woodTop, T.wood, T.woodDark);
  box(L, dx1 - 7, 0, 4, 7, dy1, dz - 4, T.woodTop, T.wood, T.woodDark); // drawer block
  quadY(L, dy1, dx1 - 6, dx1 - 1, 8, 10, T.woodDark);
  box(L, dx0, 0, dz, dx1 - dx0, dy1, 2, T.woodTop, T.wood, T.woodDark);
  const top = dz + 2;

  // monitor: screen faces +y (toward the chair)
  box(L, 24, 2, top, 2, 2, 2, T.metalTop, T.metal, T.metalDark);
  box(L, 19, 2, top + 2, 12, 1, 10, T.metalTop, T.metal, T.metalDark);
  quadY(L, 3, 20, 30, top + 3, top + 11, night ? T.screenGlow : T.screen);
  const langCol = LANG_COLORS[stats.topLang] || T.accent;
  const code = [[1, 5, langCol], [2, 7, '#e5e5e5'], [2, 4, '#7ee787'], [1, 6, langCol], [3, 5, '#e5e5e5'], [1, 3, '#ff7b72']];
  code.forEach(([ind, len, c], i) => {
    const a = P(20.5 + ind, 3, top + 10 - i);
    const b = P(20.5 + ind + len, 3, top + 10 - i);
    L.line(a[0], a[1] - 1, b[0], b[1] - 1, c);
  });
  { const a = P(21.5 + 4, 3, top + 4); anim.blink.set(a[0], a[1] - 1, '#ffffff'); anim.blink.set(a[0] + 1, a[1] - 1, '#ffffff'); }

  // keyboard, mug, desk lamp
  box(L, 20, 5, top, 9, 3, 1, '#d9dde3', '#a9aeb7', '#8b909a');
  box(L, 31, 5, top, 2, 2, 3, T.mug, T.mugDark, T.mugDark);
  quadZ(L, top + 3, 31.5, 32.5, 5.5, 6.5, '#6b3e26');
  const st = P(32, 6, top + 4);
  anim.steam.sprite(st[0] - 1, st[1] - 6, ['.1.', '1..', '.1.', '..1', '.1.'], { 1: night ? '#ffffff66' : '#ffffffaa' });
  box(L, 16.5, 1, top, 3, 3, 1, T.metalTop, T.metal, T.metalDark);
  const lp = P(18, 2.5, top + 1);
  L.sprite(lp[0], lp[1] - 9, ['..11..', '.1..1.', '1....1', '1....1', '.1....', '.1....', '..1...', '..1...', '..1...'], { 1: T.metalDark });
  L.sprite(lp[0] - 3, lp[1] - 9, ['.33.', '3333', '2222'], { 3: T.metal, 2: night ? T.lamp : T.lampOff });
  if (night) anim.glow.poly([P(16, 1.5, top), P(20, 1.5, top), P(21, 6, top), P(15, 6, top)].map(([x, y]) => [x - 2, y]), '#ffe06633');

  // chair (back faces away from the desk)
  box(L, 24, 13, 0, 4, 4, 1, T.metalTop, T.metal, T.metalDark);
  box(L, 25, 14, 1, 2, 2, 6, T.metalTop, T.metal, T.metalDark);
  box(L, 22, 11, 7, 8, 7, 2, T.chairTop, T.chair, T.chairDark);
  box(L, 22, 17, 9, 8, 1, 10, T.chairTop, T.chair, T.chairDark);

  // cat on the rug (tail swishes)
  const cp = P(20, 28, 0);
  const catPal = { 1: T.cat, 2: T.catDark, 3: T.catLight, k: '#2b2b2b', p: '#f28fa0' };
  L.sprite(cp[0] - 8, cp[1] - 11, [
    '.1.....1.........',
    '.11...11.........',
    '.1111111.........',
    '.1k11k11.........',
    '.13p3311.........',
    '..3333111111111..',
    '...11112121211...',
    '...11121211211...',
    '...11111111111...',
    '...33.3....33.3..',
  ], catPal);
  anim.tailA.sprite(cp[0] + 6, cp[1] - 14, ['..1', '..1', '.1.', '1..', '1..'], catPal);
  anim.tailB.sprite(cp[0] + 6, cp[1] - 14, ['1..', '1..', '.1.', '.1.', '1..'], catPal);

  // ------------------------------------------------------------ labels
  const handle = `@${stats.login}`;
  L.text(3, 3, handle.length > 14 ? handle.slice(0, 14) : handle, T.text);
  L.text(3, 10, `${stats.topLang}`.slice(0, 12), T.textDim);
  { const lx = 3 + textWidth(`${stats.topLang}`.slice(0, 12)) + 2; for (const [a, b] of [[0, 1], [1, 1], [0, 2], [1, 2]]) L.set(lx + a, 10 + b, langCol); }
  const lv = `LV ${Math.max(1, Math.floor(Math.sqrt((stats.contributions || stats.repos * 10) / 4)))}`;
  L.text(W - 3 - textWidth(lv), 3, lv, T.accent);
  const right2 = `${fmt(stats.contributions ?? 0)} CONTRIB`;
  if (stats.contributions != null) L.text(W - 3 - textWidth(right2), 10, right2, T.textDim);

  const items = [[`${fmt(stats.repos)} REPOS`, T.text], [`★ ${fmt(stats.stars)}`, T.accent], [`${fmt(stats.followers)} FOLLOWERS`, T.text]];
  const gap = 8;
  const total = items.reduce((w, [s]) => w + textWidth(s), 0) + gap * (items.length - 1);
  let tx = Math.floor((W - total) / 2);
  for (const [s, c] of items) { L.text(tx, H - 8, s, c); tx += textWidth(s) + gap; }

  const css = `
.blink{animation:b 1.1s steps(1) infinite}@keyframes b{50%{opacity:0}}
.twinkle{animation:t 2.4s ease-in-out infinite}.twinkle2{animation:t 3.1s ease-in-out .8s infinite}@keyframes t{50%{opacity:.15}}
.steam{animation:s 2.6s ease-out infinite}@keyframes s{0%{opacity:0;transform:translateY(2px)}40%{opacity:1}100%{opacity:0;transform:translateY(-3px)}}
.tail-a{animation:ta 1.6s steps(1) infinite}.tail-b{animation:tb 1.6s steps(1) infinite}@keyframes ta{50%{opacity:0}}@keyframes tb{0%{opacity:0}50%{opacity:1}}
.glow{animation:g 4s ease-in-out infinite}@keyframes g{50%{opacity:.6}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * SCALE}" height="${H * SCALE}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges" role="img" aria-labelledby="t">
<title id="t">${handle}'s pixel room: ${stats.repos} repos, ${stats.stars} stars, ${stats.followers} followers</title>
<style>${css}</style>
${L.toPaths()}${Object.values(anim).map((a) => a.toPaths()).join('')}
</svg>
`;
}

// ---------------------------------------------------------------- main
const stats = DEMO ? demoStats(USER) : await fetchStats(USER);
mkdirSync(OUT, { recursive: true });
for (const mode of ['day', 'night']) {
  const file = join(OUT, `pixel-room-${mode}.svg`);
  writeFileSync(file, render(stats, mode));
  console.log(`wrote ${file}`);
}
