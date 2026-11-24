// Shared helpers for the profile generators: CLI args, GitHub stats, pixel font.

const args = process.argv.slice(2);
const arg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : def;
};

export const args_ = { arg, has: (n) => args.includes(`--${n}`) };
export const USER = arg('user', process.env.GITHUB_USER || process.env.GITHUB_REPOSITORY_OWNER || 'octocat');
export const OUT = arg('out', 'dist');
export const DEMO = args.includes('--demo');
const TOKEN = process.env.GITHUB_TOKEN || '';

export const LANG_COLORS = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572a5', Go: '#00add8',
  Rust: '#dea584', Java: '#b07219', HTML: '#e34c26', CSS: '#663399', Shell: '#89e051',
  C: '#555555', 'C++': '#f34b7d', 'C#': '#178600', PHP: '#4f5d95', Ruby: '#701516',
  Kotlin: '#a97bff', Swift: '#f05138', Dart: '#00b4ab', Vue: '#41b883', Lua: '#000080',
  'Jupyter Notebook': '#da5b0b', SCSS: '#c6538c', Svelte: '#ff3e00', Dockerfile: '#384d54',
};
export const BOOK_FALLBACK = ['#8e5b3a', '#4f6d7a', '#7a4f6d', '#5b7a4f', '#a0522d', '#6d6d8e'];

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

export async function fetchStats(login) {
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

export function demoStats(login) {
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

// ---------------------------------------------------------------- 3x5 pixel font
export const FONT = Object.fromEntries(Object.entries({
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

export const fmt = (n) => (n >= 10000 ? `${Math.round(n / 1000)}K` : n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n));
export const textWidth = (s) => [...s.toUpperCase()].reduce((w, ch) => w + (FONT[ch] || FONT['?'])[0].length + 1, 0) - 1;
