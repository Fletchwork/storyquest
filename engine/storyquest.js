// StoryQuest engine: turns a "pack" (plain JSON an AI writes) into a printable kid's packet
// and a grown-up's answer guide. Runs in any browser and in Node (for tests). No dependencies.
// Pack format: docs/pack-format.md.
(function (root) {
  'use strict';
  const ART = (typeof module === 'object' && module.exports) ? require('./art.js') : root.STORYQUEST_ART;

  // ------------------------------------------------------------------ text helpers
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // Light markup the AI may use: **bold**, *italic*, newlines. Everything else is escaped.
  function md(s) {
    let t = esc(s);
    t = t.replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>').replace(/\*([^*\n]+)\*/g, '<i>$1</i>');
    return t.replace(/\n{2,}/g, '<br><br>').replace(/\n/g, '<br>');
  }
  // Pack strings index our tables, so only a table's OWN keys count (never "constructor" etc.).
  const own = (o, k) => (typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined);
  const arr = (v) => (Array.isArray(v) ? v : []);
  const num = (v, d) => (Number.isFinite(+v) && v !== '' && v !== null ? +v : d);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Seeded RNG so a pack always renders the same crossword and map.
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash(str) {
    let h = 2166136261;
    for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // ------------------------------------------------------------------ themes
  // Every look ("skin") the packet can wear. The first three are the originals and keep their ids.
  // `fits` tells the AI (and the parent) which books a look suits; it is also pasted into the prompt.
  // Colours, fonts and layout live in storyquest.css under .theme-<id>; `motif` names the light
  // header decoration drawn by motifArt() below; skins marked `skin` share one low-ink layout.
  const THEMES = {
    'pixel-quest': { label: 'Pixel quest', art: 'pixel', fits: 'Video-game books such as Minecraft, Roblox or Zelda.',
      levels: ['Noob', 'Apprentice', 'Squire', 'Scout', 'Fighter', 'Warrior', 'Veteran', 'Knight', 'Champion', 'Legend'],
      rating: 'heart', fallbackIcon: 'diamond' },
    storybook: { label: 'Storybook', art: 'line', fits: 'Classic stories and any book: parchment and ink.',
      levels: ['Page', 'Reader', 'Explorer', 'Scholar', 'Adventurer', 'Hero', 'Captain', 'Sage', 'Legend', 'Master'],
      rating: 'star', fallbackIcon: 'star' },
    clean: { label: 'Clean (saves ink)', art: 'line', fits: 'Any book: black and white, cheapest to print and photocopy.',
      levels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
      rating: 'star', fallbackIcon: 'star' },
    'pirate-seas': { label: 'Pirate seas', art: 'line', skin: true, motif: 'waves',
      fits: 'Treasure Island, Peter Pan and other sea adventures.',
      levels: ['Landlubber', 'Cabin Boy', 'Deckhand', 'Lookout', 'Powder Monkey', 'Gunner', 'Navigator', 'First Mate', 'Captain', 'Legend'],
      rating: 'coin', fallbackIcon: 'anchor' },
    'enchanted-forest': { label: 'Enchanted forest', art: 'line', skin: true, motif: 'treeline',
      fits: 'Fantasy, fairy tales and magic, such as Narnia or The Hobbit.',
      levels: ['Seedling', 'Wanderer', 'Pathfinder', 'Fern Keeper', 'Sprite Friend', 'Spellweaver', 'Woodland Guide', 'Lorekeeper', 'Enchanter', 'Legend'],
      rating: 'star', fallbackIcon: 'wand' },
    'space-voyage': { label: 'Space voyage', art: 'line', skin: true, motif: 'stars',
      fits: 'Science fiction and space adventures.',
      levels: ['Cadet', 'Rookie', 'Pilot', 'Navigator', 'Engineer', 'Officer', 'Commander', 'Captain', 'Admiral', 'Legend'],
      rating: 'star', fallbackIcon: 'star' },
    'mystery-case': { label: 'Mystery case file', art: 'line', skin: true, motif: 'stamp',
      fits: 'Detective stories and mysteries.',
      levels: ['Rookie', 'Observer', 'Tracker', 'Sleuth', 'Investigator', 'Detective', 'Inspector', 'Chief', 'Mastermind', 'Legend'],
      rating: 'key', fallbackIcon: 'key' },
    'wild-adventure': { label: 'Wild adventure', art: 'line', skin: true, motif: 'peaks',
      fits: 'Survival, animals and nature, such as Hatchet or The Wild Robot.',
      levels: ['Tenderfoot', 'Hiker', 'Tracker', 'Forager', 'Climber', 'Camper', 'Trailblazer', 'Ranger', 'Survivor', 'Legend'],
      rating: 'paw', fallbackIcon: 'paw' },
    notebook: { label: 'Notebook doodles', art: 'line', skin: true, motif: 'doodles',
      fits: 'Real life, school and funny diaries, such as Wimpy Kid or Wonder.',
      levels: ['Doodler', 'Note-taker', 'Page Turner', 'Daydreamer', 'Joker', 'Brainstormer', 'Class Star', 'Bookworm', 'Genius', 'Legend'],
      rating: 'heart', fallbackIcon: 'book' },
  };
  // A pack with no (or an unknown) look wears Storybook, the plainest one that suits any book.
  // Packs that say "pixel-quest" explicitly still get it.
  const DEFAULT_THEME = 'storybook';
  const PIXEL_FALLBACK = { map: 'chest', compass: 'diamond', anchor: 'pick', ship: 'chest', coin: 'diamond',
    star: 'diamond', key: 'chest', quill: 'book', scroll: 'book', castle: 'chest', owl: 'book', cup: 'potion',
    hourglass: 'potion', paw: 'heart', steps: 'torch', wand: 'torch', bolt: 'torch' };
  const LINE_FALLBACK = { potion: 'cup', chest: 'key', diamond: 'star', torch: 'star', pick: 'sword',
    apple: 'heart', bread: 'cup', grass: 'star' };
  const ICON_NAMES = Array.from(new Set([...Object.keys(ART.pixel), ...Object.keys(ART.line)])).sort();

  function sprite(name, px) {
    const s = ART.pixel[name];
    const rows = s.rows, n = rows.length, parts = [];
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '.') { x++; continue; }
        let run = 1;
        while (x + run < row.length && row[x + run] === ch) run++;
        parts.push(`<rect x="${x}" y="${y}" width="${run}" height="1" fill="${s.palette[ch] || '#000'}"/>`);
        x += run;
      }
    });
    return `<svg class="px" width="${n * px}" height="${n * px}" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" aria-hidden="true">${parts.join('')}</svg>`;
  }
  function lineIcon(name, size) {
    return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ART.line[name]}</svg>`;
  }
  // size: 'sm' (inline), 'md' (title slot), 'lg' (cover)
  // The drawable icon a theme uses for `name`. With `avoid` (names already shown), a fallback
  // that would repeat one picks an unused drawing instead, so a cover row never shows doubles.
  function resolveIcon(name, theme, avoid) {
    const t = own(THEMES, theme) || THEMES[DEFAULT_THEME], set = t.art === 'pixel' ? ART.pixel : ART.line;
    name = String(name || '').toLowerCase();
    if (own(set, name)) return name;
    let r = own(t.art === 'pixel' ? PIXEL_FALLBACK : LINE_FALLBACK, name) || t.fallbackIcon;
    if (avoid && avoid.has(r)) r = Object.keys(set).find((k) => k !== 'grass' && !avoid.has(k)) || r;
    return r;
  }
  function icon(name, theme, size) {
    const t = own(THEMES, theme) || THEMES[DEFAULT_THEME];
    name = resolveIcon(name, theme);
    if (t.art === 'pixel') return sprite(name, size === 'sm' ? 1 : size === 'lg' ? 2 : 3);
    return lineIcon(name, size === 'sm' ? 14 : size === 'lg' ? 30 : 34);
  }
  function outlineSprite(name, x, y, px) {
    const rows = ART.pixel[name].rows, n = rows.length;
    const on = (r, c) => r >= 0 && r < n && c >= 0 && c < n && rows[r][c] !== '.';
    const out = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (on(r, c) && !(on(r + 1, c) && on(r - 1, c) && on(r, c + 1) && on(r, c - 1)))
        out.push(`<rect x="${(x + c * px).toFixed(1)}" y="${(y + r * px).toFixed(1)}" width="${px}" height="${px}"/>`);
    }
    return out.join('');
  }
  // The faint item outlines behind pixel-quest banners.
  function bannerArt(w, h, seed) {
    const R = rng(seed), names = Object.keys(ART.pixel).filter((k) => k !== 'grass'), parts = [];
    let x = 8;
    while (x < w - 40) {
      parts.push(outlineSprite(names[Math.floor(R() * names.length)], x, 4 + R() * (h - 48), 2.4));
      x += 52 + R() * 22;
    }
    return `<svg class="bgart" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" shape-rendering="crispEdges" aria-hidden="true"><g fill="#fff" opacity=".28">${parts.join('')}</g></svg>`;
  }

  // Light header decoration for the book skins: thin strokes in the skin's accent colours (the
  // CSS sets `color` and opacity on .motif), so it prints with very little ink and never sits under
  // the title as a solid shape. `cover` draws a taller banner and keeps clear of the centred title.
  function motifArt(kind, w, h, seed, cover) {
    const R = rng(seed), out = [], f = (n) => n.toFixed(1);
    const clearOf = (x, y) => cover && x > 150 && x < w - 150 && y > 36 && y < h - 40; // keep the middle clear on the cover
    if (kind === 'waves') {
      const rows = cover ? 4 : 2;
      for (let r = 0; r < rows; r++) {
        const y = h - 5 - r * (cover ? 9 : 7), amp = (cover ? 5 : 3.6) - r * 0.6, step = 22 - r * 2, ph = (r * 9) % step;
        let d = `M${-ph} ${y} q${step / 2} ${-amp * 2} ${step} 0`;
        for (let x = step - ph; x < w + step; x += step) d += ` t${step} 0`;
        out.push(`<path d="${d}" opacity="${f(1 - r * 0.22)}"/>`);
      }
      if (cover) for (let r = 0; r < 2; r++) {
        const y = 7 + r * 8; let d = `M0 ${y} q10 -7 20 0`;
        for (let x = 20; x < w + 20; x += 20) d += ' t20 0';
        out.push(`<path d="${d}" opacity="${f(0.7 - r * 0.25)}"/>`);
      }
    } else if (kind === 'treeline') {
      // A row of pines and round trees along the bottom, outlined with a light wash, plus a few firefly dots.
      const base = h - 4, hi = cover ? 30 : 12;
      out.push(`<path d="M0 ${base} H${w}" opacity=".8"/>`);
      for (let x = 6 + R() * 8, i = 0; x < w; i++) {
        const ht = hi * (0.6 + R() * 0.4), round = cover && i % 4 === 3, wd = ht * (round ? 0.8 : 0.55);
        if (round) { // round tree
          out.push(`<path d="M${f(x)} ${base} v${f(-ht * 0.35)} M${f(x - wd / 2)} ${f(base - ht * 0.35)} a${f(wd / 2)} ${f(ht * 0.32)} 0 1 1 ${f(wd)} 0z" fill="currentColor" fill-opacity=".13"/>`);
        } else { // pine: two stacked triangles
          out.push(`<path d="M${f(x - wd / 2)} ${f(base - ht * 0.18)} L${f(x)} ${f(base - ht)} L${f(x + wd / 2)} ${f(base - ht * 0.18)}z M${f(x)} ${f(base - ht * 0.18)} V${base}" fill="currentColor" fill-opacity=".13"/>`);
        }
        x += wd * 0.5 + 3 + R() * 7;
      }
      const dots = cover ? 14 : 6;
      for (let i = 0, tries = 0; i < dots && tries < 200; tries++) {
        const x = cover ? R() * w : w * 0.5 + R() * w * 0.5, y = 5 + R() * (cover ? h - hi - 14 : h * 0.3);
        if (clearOf(x, y)) continue;
        i++;
        out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(1 + R() * 0.8)}" style="fill:var(--accent2)" stroke="none"/>`);
      }
    } else if (kind === 'stars') {
      const spark = (x, y, s) => `<path d="M${f(x)} ${f(y - s)} L${f(x + s * 0.28)} ${f(y - s * 0.28)} L${f(x + s)} ${f(y)} L${f(x + s * 0.28)} ${f(y + s * 0.28)} L${f(x)} ${f(y + s)} L${f(x - s * 0.28)} ${f(y + s * 0.28)} L${f(x - s)} ${f(y)} L${f(x - s * 0.28)} ${f(y - s * 0.28)}Z" fill="currentColor" stroke="none"/>`;
      const n = cover ? 26 : 14;
      for (let i = 0, tries = 0; i < n && tries < 400; tries++) {
        const x = cover ? R() * w : w * 0.42 + R() * w * 0.58, y = 5 + R() * (h - 10);
        if (clearOf(x, y)) continue;
        i++;
        out.push(i % 4 === 0 ? spark(x, y, 4 + R() * 3) : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(0.8 + R() * 1.1)}" fill="currentColor" stroke="none"/>`);
      }
      // A dotted orbit across the whole width, with a ringed planet riding it near the right.
      const P0 = cover ? [0, 40] : [0, 5], P1 = cover ? [w / 2, -30] : [w / 2, -10], P2 = cover ? [w, 40] : [w, 40];
      const at = (t) => [0, 1].map((k) => (1 - t) * (1 - t) * P0[k] + 2 * (1 - t) * t * P1[k] + t * t * P2[k]);
      out.push(`<path d="M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}" stroke-dasharray="1.5 5" opacity=".7"/>`);
      const [px, py] = at(cover ? 0.86 : 0.8), r = cover ? 11 : 8;
      out.push(`<g transform="translate(${f(px)} ${f(py + r * 0.6)})"><circle r="${r}" fill="#fff" stroke-width="1.5"/>` +
        `<path d="M${-r * 0.8} ${-r * 0.35} q${r * 0.8} ${-r * 0.3} ${r * 1.6} 0" opacity=".6"/>` +
        `<ellipse rx="${r * 1.9}" ry="${f(r * 0.45)}" transform="rotate(-18)" fill="none" stroke-width="1.4"/>` +
        `<path d="M${-r * 0.9} ${f(r * 0.02)} a${r} ${r} 0 0 0 ${r * 1.8} 0" fill="#fff" stroke="none" transform="rotate(-18)"/></g>`);
    } else if (kind === 'stamp') {
      const sw = cover ? 170 : 112, sh = cover ? 40 : 27, cx = cover ? w - 112 : w - 190, cy = cover ? 34 : h * 0.5;
      out.push(`<g transform="rotate(-7 ${f(cx)} ${f(cy)})" class="stamp-red">` +
        `<rect x="${f(cx - sw / 2)}" y="${f(cy - sh / 2)}" width="${sw}" height="${sh}" rx="3" stroke-width="2.4"/>` +
        `<rect x="${f(cx - sw / 2 + 4)}" y="${f(cy - sh / 2 + 4)}" width="${sw - 8}" height="${sh - 8}" rx="1.5" stroke-width=".9"/>` +
        `<text x="${f(cx)}" y="${f(cy + (cover ? 7.5 : 5))}" text-anchor="middle" style="font-size:${cover ? 19 : 13.5}px;letter-spacing:.14em" fill="currentColor" stroke="none">CASE FILE</text></g>`);
      out.push(`<path d="M16 ${h - 6} H${w - 16}" stroke-dasharray="1 5" stroke-linecap="round" opacity=".7"/>`);
    } else if (kind === 'peaks') {
      for (let layer = 0; layer < 2; layer++) {
        const base = h - 4 - layer * (cover ? 9 : 6), hi = (cover ? 36 : 12) - layer * (cover ? 6 : 3);
        let d = `M0 ${f(base)}`, x = 0;
        while (x < w) { x += 24 + R() * 40; d += ` L${f(x - 12)} ${f(base - hi * (0.45 + R() * 0.55))} L${f(x)} ${f(base - 3 - R() * 4)}`; }
        out.push(`<path d="${d}${layer ? '' : ` L${w} ${f(base)}Z`}" fill="currentColor" fill-opacity="${layer ? 0 : 0.08}" opacity="${layer ? '.5' : '1'}" stroke-linejoin="round"/>`);
      }
      if (cover) out.push(`<circle cx="${w - 46}" cy="34" r="12"/><path d="M${w - 46} 14 v-6 M${w - 46} 60 v6 M${w - 66} 34 h-6 M${w - 26} 34 h6 M${w - 60} 20 l-4 -4 M${w - 32} 48 l4 4 M${w - 32} 20 l4 -4 M${w - 60} 48 l-4 4" opacity=".7"/>`);
    } else if (kind === 'doodles') {
      for (let y = cover ? 14 : 22; y < h; y += cover ? 17 : 15) out.push(`<path class="rl" d="M0 ${y} H${w}"/>`);
      out.push(`<path class="ml" d="M${cover ? 54 : 38} 0 V${h}"/>`);
      const dx = cover ? w - 128 : w - 220, dy = cover ? h - 44 : h - 40;
      out.push(`<g class="dd"><path d="M${dx} ${dy + 14} q8 -16 16 0 t16 0 t16 0 t16 0"/>` +
        `<path d="M${dx + 84} ${dy + 4} l4 9 9 1 -7 6 2 9 -8 -5 -8 5 2 -9 -7 -6 9 -1z"/>` +
        (cover ? '' : `<path d="M${dx + 130} ${dy + 24} q12 -26 30 -14 M${dx + 152} ${dy + 6} l8 4 -3 9"/>`) + '</g>');
      if (cover) out.push(`<g class="dd"><path d="M70 40 l6 14 -9 -3 6 12" /><circle cx="${w - 60}" cy="40" r="9"/><path d="M${w - 64} 38 h1 M${w - 56} 38 h1 M${w - 64} 43 q4 4 8 0"/></g>`);
    }
    return `<svg class="bgart motif motif-${kind}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMax slice" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true">${out.join('')}</svg>`;
  }

  // ------------------------------------------------------------------ crossword
  function crossword(entries, seed, size = 15, tries = 500) {
    const words = arr(entries).filter(Array.isArray).slice(0, 40).map(([w, c]) => [String(w).toUpperCase().replace(/[^A-Z]/g, ''), c])
      .filter(([w]) => w.length >= 2 && w.length <= size);
    const canPlace = (g, word, r, c, horiz) => {
      const n = g.length, L = word.length;
      if (horiz) {
        if (c < 0 || c + L > n || r < 0 || r >= n) return null;
        if (c - 1 >= 0 && g[r][c - 1]) return null;
        if (c + L < n && g[r][c + L]) return null;
      } else {
        if (r < 0 || r + L > n || c < 0 || c >= n) return null;
        if (r - 1 >= 0 && g[r - 1][c]) return null;
        if (r + L < n && g[r + L][c]) return null;
      }
      let cross = 0;
      for (let i = 0; i < L; i++) {
        const rr = horiz ? r : r + i, cc = horiz ? c + i : c, cur = g[rr][cc];
        if (!cur) {
          if (horiz && ((rr - 1 >= 0 && g[rr - 1][cc]) || (rr + 1 < n && g[rr + 1][cc]))) return null;
          if (!horiz && ((cc - 1 >= 0 && g[rr][cc - 1]) || (cc + 1 < n && g[rr][cc + 1]))) return null;
        } else if (cur === word[i]) cross++;
        else return null;
      }
      return cross;
    };
    const build = (order) => {
      const g = Array.from({ length: size }, () => Array(size).fill(null));
      const placed = [], unplaced = [];
      const put = (w, r, c, h) => { for (let i = 0; i < w.length; i++) g[h ? r : r + i][h ? c + i : c] = w[i]; };
      const [first, fclue] = order[0];
      const r0 = Math.floor(size / 2), c0 = Math.max(0, Math.floor((size - first.length) / 2));
      put(first, r0, c0, true); placed.push([first, fclue, r0, c0, true]);
      for (const [w, clue] of order.slice(1)) {
        let best = null;
        for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) for (const h of [true, false]) {
          const sc = canPlace(g, w, r, c, h);
          if (!sc) continue;
          const score = sc - (Math.abs(r - size / 2) + Math.abs(c - size / 2)) * 0.01;
          if (!best || score > best[0]) best = [score, r, c, h];
        }
        if (!best) { unplaced.push([w, clue]); continue; }
        put(w, best[1], best[2], best[3]); placed.push([w, clue, best[1], best[2], best[3]]);
      }
      return { g, placed, unplaced };
    };
    if (!words.length) return null;
    const R = rng(seed);
    let champ = null;
    for (let t = 0; t < tries; t++) {
      let order = words.slice().sort((a, b) => b[0].length - a[0].length);
      if (t) {
        order = words.slice();
        for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
        const li = order.reduce((bi, e, i) => (e[0].length > order[bi][0].length ? i : bi), 0);
        [order[0], order[li]] = [order[li], order[0]];
      }
      const { g, placed, unplaced } = build(order);
      const rows = [], cols = [];
      for (let r = 0; r < size; r++) if (g[r].some(Boolean)) rows.push(r);
      for (let c = 0; c < size; c++) if (g.some((row) => row[c])) cols.push(c);
      const h = rows[rows.length - 1] - rows[0] + 1, w = cols[cols.length - 1] - cols[0] + 1;
      const filled = g.flat().filter(Boolean).length;
      const key = [unplaced.length, Math.max(h, w), Math.abs(h - w), -filled / (h * w)];
      const d = champ ? key.findIndex((v, i) => v !== champ.key[i]) : -1;
      if (!champ || (d >= 0 && key[d] < champ.key[d])) champ = { key, g, placed, unplaced, r0: rows[0], c0: cols[0], h, w };
    }
    const { g, placed, unplaced, r0, c0, h, w } = champ;
    const grid = Array.from({ length: h }, (_, r) => Array.from({ length: w }, (_, c) => g[r + r0][c + c0]));
    const starts = new Map();
    placed.forEach(([wd, clue, r, c, hz]) => {
      const k = `${r - r0},${c - c0}`;
      if (!starts.has(k)) starts.set(k, []);
      starts.get(k).push([wd, clue, hz]);
    });
    const numbers = {}; let n = 1;
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) if (starts.has(`${r},${c}`)) numbers[`${r},${c}`] = n++;
    const across = [], down = [];
    for (const [k, list] of starts) for (const [wd, clue, hz] of list) (hz ? across : down).push({ n: numbers[k], word: wd, clue });
    across.sort((a, b) => a.n - b.n); down.sort((a, b) => a.n - b.n);
    // Self-check: every placed word reads correctly in the final grid.
    placed.forEach(([wd, , r, c, hz]) => {
      for (let i = 0; i < wd.length; i++) {
        if (grid[hz ? r - r0 : r - r0 + i][hz ? c - c0 + i : c - c0] !== wd[i]) throw new Error('crossword self-check failed: ' + wd);
      }
    });
    return { grid, numbers, across, down, unplaced: unplaced.map(([wd]) => wd) };
  }

  // ------------------------------------------------------------------ building blocks
  function lines(n) {
    n = clamp(Math.round(num(n, 2)), 0, 30);
    if (!n) return '';
    return `<div class="lines">${'<div class="wl"></div>'.repeat(n)}</div>`;
  }
  const blank = (w) => `<span class="blank" style="width:${w}"></span>`;
  function box(title, inner, ctx, opts = {}) {
    const ic = opts.icon ? icon(opts.icon, ctx.theme, 'sm') : '';
    const lab = title ? `<div class="boxlab">${ic}${md(title)}</div>` : '';
    return `<div class="box${opts.cls ? ' ' + opts.cls : ''}">${lab}${inner}</div>`;
  }
  const note = (t) => (t ? `<div class="note">${md(t)}</div>` : '');
  const found = (ctx) => (ctx.pageNumbers ? '<div class="found">found it on page <span class="blank" style="width:.45in"></span></div>' : '');

  function pixelGrid(n = 16) {
    return `<table class="pxg">${('<tr>' + '<td></td>'.repeat(n) + '</tr>').repeat(n)}</table>`;
  }

  const ACTIVITIES = {
    intro: (a) => note(a.text),
    warning: (a) => `<div class="warn">${md(a.text || 'Spoiler zone!')}</div>`,
    lines: (a) => note(a.prompt) + lines(num(a.lines, 3)),
    questions(a, ctx) {
      return note(a.intro) + (a.items || []).map((it, i) => {
        const q = typeof it === 'string' ? { q: it } : it;
        return `<div class="q"><div class="qi">${i + 1}</div><div class="qb"><div class="qt">${md(q.q)}</div>${lines(num(q.lines, 2))}${found(ctx)}</div></div>`;
      }).join('');
    },
    write(a, ctx) {
      return box(a.title || 'The writing mission', note(a.prompt), ctx, { icon: a.icon || 'quill' }) +
        (a.starter ? `<div class="note starter">${md(a.starter)}</div>` : '') + lines(num(a.lines, 8));
    },
    box(a, ctx) {
      const sealed = a.style === 'sealed';
      const inner = (sealed ? `<div class="fold">${icon('chest', ctx.theme, 'sm')}${md(a.fold || 'Sealed: fold this over and keep it secret')}</div>` : '') +
        note(a.text) + lines(num(a.lines, 2)) + found(a.page_numbers === false ? {} : (a.page_numbers ? ctx : {}));
      return box(sealed ? '' : a.title, (sealed && a.title ? `<div class="boxlab">${md(a.title)}</div>` : '') + inner, ctx,
        { icon: a.icon, cls: sealed ? 'seal' : '' });
    },
    draw(a, ctx) {
      const h = own({ small: '1.6in', medium: '2.4in', large: '3.2in' }, a.size) || '2.4in';
      const labels = clamp(num(a.labels, 0), 0, 6);
      return note(a.prompt) + `<div class="drawbox" style="height:${h}">${a.caption ? `<div class="drawcap">${md(a.caption)}</div>` : ''}</div>` +
        (labels ? `<div class="labels">${Array.from({ length: labels }, (_, i) => `<div class="note">${i + 1}. ${blank('80%')}</div>`).join('')}</div>` : '');
    },
    comic(a, ctx) {
      const panels = num(a.panels, 6) === 4 ? 4 : 6;
      const bossAt = a.boss_bar ? clamp(num(a.boss_bar_panel, panels === 6 ? 4 : 2), 1, panels) : 0;
      const prompt = a.prompt || 'Pick **one scene** and turn it into a comic page. Use at least **two speech bubbles** in the characters’ real voices and **one sound effect**. Stick figures are perfect.';
      return note(prompt) +
        (arr(a.ideas).length ? box('Scenes worth stealing', note(arr(a.ideas).map(String).join('  ·  ')), ctx, { icon: 'sword' }) : '') +
        `<div class="comic c${panels}">` + Array.from({ length: panels }, (_, i) =>
          `<div class="cpanel${panels === 4 ? ' tall' : ''}"><span class="pn">${i + 1}</span>${i + 1 === bossAt ? '<div class="boss">BOSS: <span class="blank" style="width:1in"></span><div class="hb"></div></div>' : ''}</div>`).join('') + '</div>' +
        `<div class="note">My comic is called: ${blank('3.2in')}</div>`;
    },
    crossword(a, ctx) {
      const cw = crossword(a.words || [], num(a.seed, hash(JSON.stringify(a.words || []))));
      if (!cw) return note('(This crossword has no words yet.)');
      ctx.crosswords.push(cw);
      const cells = cw.grid.map((row, r) => row.map((ch, c) => {
        if (!ch) return '<div class="blk"></div>';
        const n = cw.numbers[`${r},${c}`];
        return `<div class="cel">${n ? `<span class="n">${n}</span>` : ''}</div>`;
      }).join('')).join('');
      const cell = clamp(Math.floor(6.6 * 96 / Math.max(cw.grid[0].length, 10)), 20, 36);
      const col = (title, items, ic) => `<div class="cluecol"><h4>${icon(ic, ctx.theme, 'sm')}${title}</h4><ol class="clues">${items.map((x) =>
        `<li><b>${x.n}.</b> ${md(x.clue)} <span class="len">(${x.word.length})</span></li>`).join('')}</ol></div>`;
      return note(a.intro || 'Every answer is a name, place or thing from the book. The number in brackets is how many letters.') +
        `<div class="xw" style="--cell:${cell}px;grid-template-columns:repeat(${cw.grid[0].length},var(--cell))">${cells}</div>` +
        `<div class="clues-wrap">${col('Across', cw.across, 'diamond')}${col('Down', cw.down, 'key')}</div>`;
    },
    invent_item(a, ctx) {
      const stats = (a.stats && a.stats.length ? a.stats : ['Name', 'Rarity', 'Material', 'Power', 'Durability', 'Special ability'])
        .map((s, i) => `<div class="stat${i === 1 ? ' rar' : ''}">${esc(String(s).toUpperCase())}: <span class="f"></span></div>`).join('');
      const recipe = a.recipe === false ? '' :
        `<div><div class="boxlab">${icon('pick', ctx.theme, 'sm')}${md(a.recipe_title || 'Recipe')}</div><div class="forge"><table class="fg">${('<tr>' + '<td></td>'.repeat(5) + '</tr>').repeat(5)}</table></div></div>`;
      return (a.question ? ACTIVITIES.questions({ items: [a.question] }, ctx) : '') +
        `<div class="two inv">${recipe}` +
        box(a.title || 'Invent something', note(a.prompt || 'Invent **one item** that belongs in this story. Fill in its recipe, then make its item card below: picture, name, stats.') +
          note(a.who || 'Who in the story should get it, and why?') + lines(3), ctx, { icon: 'chest' }) + '</div>' +
        `<div class="itemcard"><div class="in"><div>${pixelGrid(16)}<div class="cap">PICTURE</div></div><div>${stats}<div class="stat">[ <span class="f"></span></div><div class="stat"><span class="f"></span> ]</div></div></div></div>`;
    },
    pixel_art(a, ctx) {
      return note(a.prompt || 'Design something new for this world. Colour it in on the grid, square by square.') +
        `<div class="two"><div>${pixelGrid(16)}</div><div><div class="note">Name: ${blank('70%')}</div><div class="note">What it does:</div>${lines(3)}</div></div>`;
    },
    character_cards(a, ctx) {
      const fields = a.fields && a.fields.length ? a.fields : ['Best at', 'Best moment so far'];
      const cards = (a.names || []).map((nm) => `<div class="card"><div class="cn">${md(nm)}</div>` +
        fields.map((f, i) => (i === 0 ? `<div class="row">${md(f)}: ${blank('55%')}</div>` : `<div class="row">${md(f)}:</div>${lines(2)}`)).join('') + '</div>').join('');
      return note(a.prompt) + `<div class="cards">${cards}</div>` + (a.pick ? box('Pick your team', note(a.pick) + lines(3), ctx, { icon: 'chest' }) : '');
    },
    stump_the_grownup(a, ctx) {
      const n = clamp(num(a.count, 3), 1, 5);
      return box(a.title || `Stump ${ctx.grownup}`, note(a.prompt || `Write **${n} questions** about the book so far that you reckon ${esc(ctx.grownup)} can’t answer. Sixty seconds each. Answers go upside-down at the bottom so nobody peeks.`), ctx, { icon: 'pick' }) +
        Array.from({ length: n }, (_, i) => `<div class="q"><div class="qi">${i + 1}</div><div class="qb">${lines(2)}</div></div>`).join('') +
        `<div class="upside">Answers (keep covered!) &nbsp; ${Array.from({ length: n }, (_, i) => `${i + 1}. ${blank('1.1in')}`).join(' &nbsp; ')}</div>`;
    },
    sealed_prediction(a, ctx) {
      const prompts = a.prompts && a.prompts.length ? a.prompts : ['What do you think happens next? Make a real guess. Being wrong is half the fun.'];
      return `<div class="box seal"><div class="fold">${icon('chest', ctx.theme, 'sm')}${md(a.title || 'Sealed prediction')}: fold this over. Open it ${md(a.open_on ? 'on ' + a.open_on : 'at the end')}.</div>` +
        prompts.map((p, i) => `<div class="note"><b>${i + 1}.</b> ${md(p)}</div>${lines(num(a.lines, 2))}`).join('') + '</div>';
    },
    open_prediction(a, ctx) {
      return box(a.title || `Open your sealed prediction${a.from ? ' from ' + a.from : ''}`,
        note('Read it out loud. Circle one: **NAILED IT  /  CLOSE  /  WAY OFF**') + note(a.prompt || 'What happened that you didn’t see coming?') + lines(2), ctx, { icon: 'chest' });
    },
    take_a_side(a, ctx) {
      const sides = a.sides && a.sides.length === 2 ? a.sides : ['YES', 'NO'];
      return (a.spoiler_warning ? `<div class="warn">${md(a.spoiler_warning)}</div>` : '') +
        box(a.title || 'The argument', note(a.question) + note('Pick a side. No fence-sitting.'), ctx, { icon: 'potion' }) +
        `<div class="note"><b>My answer:</b> ${esc(sides[0]).toUpperCase()} &nbsp;/&nbsp; ${esc(sides[1]).toUpperCase()}</div>` +
        box('My two reasons from the book', lines(4), ctx, { icon: 'diamond' }) +
        box('Now the hard part', note('Write the **best argument against your own answer**. Make it good. Grown-ups are terrible at this.') + lines(2), ctx, { icon: 'pick', cls: 'seal' }) +
        (a.extra ? box(a.extra_title || 'One more thing', note(a.extra) + lines(3), ctx, { icon: 'torch' }) : '');
    },
    two_truths(a, ctx) {
      return box(a.title || 'Two truths and a lie', note(a.prompt || 'Write three things about the book: two true, one false but *believable*. Read them out at dinner and see who gets fooled.') +
        [1, 2, 3].map((i) => `<div class="note">${i}. ${blank('92%')}</div>`).join('') +
        `<div class="note small">The lie was number: ${blank('.4in')}</div>`, ctx, { icon: 'heart' });
    },
    rating(a, ctx) {
      const t = THEMES[ctx.theme];
      const marks = t.art === 'pixel'
        ? Array.from({ length: 10 }, () => sprite('heart', 2).replace(/fill="#8b1a1a"/g, 'fill="#9aa39a"').replace(/fill="#e33d3d"/g, 'fill="#e6ebe4"').replace(/fill="#ff9a9a"/g, 'fill="#f4f7f2"')).join('')
        : Array.from({ length: 10 }, () => lineIcon(own(ART.line, t.rating) ? t.rating : 'star', 24)).join('');
      return box(a.title || 'Your verdict', note(`Colour in your score:`) + `<div class="rating">${marks}</div>` +
        note(a.prompt || 'Best part of the whole book:') + lines(num(a.lines, 1)), ctx, { icon: 'diamond' });
    },
  };
  const ACTIVITY_TYPES = Object.keys(ACTIVITIES);

  // The AI's "this look suits this book" picks. Untrusted: only known ids survive, at most three,
  // each with a short plain-text reason (escaped wherever it is shown).
  // Cut at a word boundary, with an ellipsis, so a long reason never ends mid-word.
  function shorten(text, max) {
    const t = String(text).replace(/\s+/g, ' ').trim();
    if (t.length <= max) return t;
    const cut = t.slice(0, max - 1), sp = cut.lastIndexOf(' ');
    return (sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-–—]+$/, '') + '…';
  }
  function cleanSuggestions(v) {
    const seen = new Set(), out = [];
    arr(v).forEach((x) => {
      const id = x && typeof x === 'object' ? x.theme : null;
      if (!own(THEMES, id) || seen.has(id) || out.length >= 3) return;
      seen.add(id);
      out.push({ theme: id, why: shorten(typeof x.why === 'string' ? x.why : '', 160) });
    });
    return out;
  }
  function suggestions(pack) {
    return cleanSuggestions(pack && pack.theme_suggestions).map((x) => Object.assign({ label: THEMES[x.theme].label }, x));
  }
  // Plain-words note when the pack's look can't be used (the page and `check` both show it).
  function themeNotice(pack) {
    const t = pack && pack.theme;
    if (t == null || t === '') return 'Your AI didn’t pick a look, so this uses Storybook. Pick another below.';
    if (!own(THEMES, t)) return `Your AI asked for a look called “${String(t).slice(0, 40)}” that StoryQuest doesn’t have, so this uses Storybook.`;
    return '';
  }
  // Every look as a button with its "suits" line: shown when the AI gave no suggestions.
  function looksHTML(active) {
    return Object.entries(THEMES).map(([id, t]) =>
      `<button type="button" class="chip${id === active ? ' on' : ''}" data-theme="${esc(id)}" aria-pressed="${id === active}">` +
      `<b>${esc(t.label)}</b><span>${esc(t.fits)}</span></button>`).join('');
  }
  // The "Suggested for this book" chips the web page shows. `active` marks the look in use.
  function suggestionsHTML(pack, active) {
    return suggestions(pack).map((x) =>
      `<button type="button" class="chip${x.theme === active ? ' on' : ''}" data-theme="${esc(x.theme)}" aria-pressed="${x.theme === active}">` +
      `<b>${esc(x.label)}</b>${x.why ? `<span>${esc(x.why)}</span>` : ''}</button>`).join('');
  }

  // ------------------------------------------------------------------ pages
  function normalize(pack) {
    const p = JSON.parse(JSON.stringify(pack || {}));
    p.book = p.book || {};
    p.reader = p.reader || {};
    p.options = p.options || {};
    p.cover = p.cover || {};
    p.quests = arr(p.quests).filter((q) => q && typeof q === 'object')
      .map((q) => Object.assign({}, q, { activities: arr(q.activities).filter((a) => a && typeof a === 'object') }));
    if (p.cover && !Array.isArray(p.cover.icons)) delete p.cover.icons;
    p.guide = p.guide || {};
    if (!own(THEMES, p.theme)) p.theme = DEFAULT_THEME;
    p.theme_suggestions = cleanSuggestions(p.theme_suggestions);
    const age = num(p.reader.age, 0);
    p.reader.lines = p.reader.lines === 'wide' || p.reader.lines === 'college' ? p.reader.lines
      : (age && age <= 9 ? 'wide' : 'college');
    p.grownup = String(p.grownup || 'Grown-up').slice(0, 24);
    p.options.paper = p.options.paper === 'a4' ? 'a4' : 'letter';
    p.options.hole_punch_margin = p.options.hole_punch_margin !== false;
    p.options.page_numbers = p.options.page_numbers === true || (p.options.page_numbers !== false && p.book.format === 'paper');
    return p;
  }

  function stamp(ctx) {
    const who = esc(ctx.grownup);
    return `<div class="stamp"><div class="sring"><div class="s1" style="font-size:${Math.min(12, 58 / (Math.max(ctx.grownup.length, 1) * 0.8)).toFixed(1)}px">${who}</div><div class="s2">✦</div><div class="s3">Approved</div></div></div>`;
  }

  function header(ctx, opts) {
    const t = THEMES[ctx.theme];
    const art = t.art === 'pixel' ? bannerArt(690, 92, opts.seed || 1) : (t.motif ? motifArt(t.motif, 690, 92, opts.seed || 1) : '');
    return `<header class="phead">${art}<div class="ph-text">${opts.small ? `<div class="qno">${md(opts.small)}</div>` : ''}<h2 class="ptitle">${md(opts.title)}</h2>${opts.kicker ? `<div class="kicker">${md(opts.kicker)}</div>` : ''}</div><div class="slot">${icon(opts.icon, ctx.theme, 'md')}</div></header>`;
  }

  function questPage(q, i, ctx, hasRoute) {
    ctx.pageNumbers = q.page_numbers === undefined ? ctx.packPageNumbers : !!q.page_numbers;
    const body = (q.activities || []).map((a) => {
      const fn = a && own(ACTIVITIES, a.type);
      return fn ? fn(a, ctx) : '';
    }).join('');
    const n = i + 1;
    return `<section class="page quest" data-quest="${n}">` +
      header(ctx, { small: `Quest ${n}`, title: q.title || `Quest ${n}`, kicker: q.kicker, icon: q.icon, seed: n }) +
      (q.unlock ? `<div class="tag">Unlocks: ${md(q.unlock)}</div>` : '') +
      `<div class="pbody">${body}</div>` +
      `<footer class="pfoot"><div class="fdone"><span class="qc">Quest complete!</span> Colour in ${hasRoute ? `square ${n} on your map` : `level ${n} on the cover`}.</div>` +
      `<div class="fnote">${md(q.footer || '')}</div>${stamp(ctx)}</footer></section>`;
  }

  // The cover's quest map: torn parchment, a dashed zigzag road, one square per stop, the stop's
  // name (wrapped to fit) and the quests that happen there. Laid out automatically from `route`.
  function routeMap(route, ctx) {
    const W = 690, H = 300, R = rng(hash(JSON.stringify(route)));
    const n = route.length, gap = (W - 150) / Math.max(n - 1, 1);
    const stops = route.map((stop, i) => {
      const up = i % 2 === 0;
      const x = Math.round(n === 1 ? W / 2 : 75 + i * gap), y = Math.round((up ? 112 : 196) + (R() * 16 - 8));
      const qs = (Array.isArray(stop.quests) ? stop.quests : []).slice(0, 6);
      // wrap the name into lines that fit between neighbours (Silkscreen caps run ~8.6px each at 11.5px)
      const maxW = Math.max(gap * 1.35, 96), words = String(stop.place || '').toUpperCase().split(/\s+/).filter(Boolean);
      const lines = [];
      words.forEach((w) => {
        const last = lines[lines.length - 1];
        if (last && (last + ' ' + w).length * 8.6 <= maxW) lines[lines.length - 1] = last + ' ' + w; else lines.push(w);
      });
      const longest = Math.max(...lines.map((l) => l.length), 1);
      const fs = Math.min(11.5, (maxW / longest) / 0.75);
      return { x, y, up, qs, lines: lines.slice(0, 3), fs, w: Math.min(maxW, longest * fs * 0.75) };
    });
    const torn = (dx, dy, fill) => {
      const P = [], k = 24;
      for (let i = 0; i <= k; i++) P.push([14 + dx + i * (W - 28) / k, 10 + dy + (R() * 6 - 3)]);
      for (let i = 0; i <= k; i++) P.push([W - 12 + dx + (R() * 6 - 3), 10 + dy + i * (H - 22) / k]);
      for (let i = k; i >= 0; i--) P.push([14 + dx + i * (W - 28) / k, H - 10 + dy + (R() * 6 - 3)]);
      for (let i = k; i >= 0; i--) P.push([12 + dx + (R() * 6 - 3), 10 + dy + i * (H - 22) / k]);
      return `<path class="sheet" d="M${P.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join(' L')}Z" fill="${fill}"/>`;
    };
    const s = [torn(6, 6, 'var(--map3)'), torn(3, 3, 'var(--map2)'), torn(0, 0, 'var(--map1)')];
    // keep-out boxes: each stop's marker, name and quest chips, plus the road itself
    const boxes = stops.map((st) => {
      const lh = st.lines.length * st.fs * 1.15, cw = Math.max(st.qs.length * 27, 16), half = Math.max(st.w, cw) / 2 + 12;
      return st.up ? [st.x - half, st.y - 22 - lh, st.x + half, st.y + 40] : [st.x - half, st.y - 44, st.x + half, st.y + 26 + lh];
    });
    const segDist = (px, py, [ax, ay], [bx, by]) => {
      const t = clamp(((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1), 0, 1);
      return Math.hypot(px - (ax + t * (bx - ax)), py - (ay + t * (by - ay)));
    };
    const pts = stops.map((st) => [st.x, st.y]);
    const q = 12, trees = [];
    for (let tries = 0, made = 0; tries < 400 && made < 22; tries++) {
      const x = 30 + R() * (W - 90), y = 26 + R() * (H - 80), cx = x + 1.5 * q, cy = y + 1.5 * q;
      if (boxes.some(([x0, y0, x1, y1]) => cx > x0 - 26 && cx < x1 + 26 && cy > y0 - 26 && cy < y1 + 26)) continue;
      if (pts.slice(1).some((pt, i) => segDist(cx, cy, pts[i], pt) < 30)) continue;
      if (trees.some(([tx, ty]) => Math.hypot(tx - cx, ty - cy) < 50)) continue;
      trees.push([cx, cy]);
      s.push(`<path class="tree" d="M${x + q} ${y}h${q}v${q}h${q}v${q}h-${q}v${q}h-${q}v-${q}h-${q}v-${q}h${q}z"/>`);
      made++;
    }
    s.push(`<path class="route" d="${pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join(' ')}"/>`);
    stops.forEach((st) => {
      const { x, y, up, qs, lines, fs } = st, big = qs.length ? 15 : 10;
      const lx = clamp(x, st.w / 2 + 24, W - st.w / 2 - 24);
      s.push(`<rect class="stop" x="${x - big / 2}" y="${y - big / 2}" width="${big}" height="${big}"/>`);
      lines.forEach((ln, j) => {
        const ly = up ? y - 16 - (lines.length - 1 - j) * fs * 1.15 : y + 22 + fs + j * fs * 1.15;
        s.push(`<text class="mlab" x="${lx}" y="${ly.toFixed(1)}" text-anchor="middle" style="font-size:${fs.toFixed(1)}px">${esc(ln)}</text>`);
      });
      const cw = qs.length * 27 - 5, cx0 = clamp(x - cw / 2, 20, W - 20 - cw), cy = up ? y + 13 : y - 35;
      qs.forEach((qn, j) => {
        const qx = cx0 + j * 27;
        s.push(`<rect class="chip" x="${qx}" y="${cy}" width="22" height="22"/><text class="mnum" x="${qx + 11}" y="${cy + 16}">${esc(qn)}</text>`);
      });
    });
    return `<svg class="qmap" viewBox="0 0 ${W} ${H}" aria-label="Quest map">${s.join('')}</svg>`;
  }

  function coverPage(p, ctx) {
    const t = THEMES[ctx.theme], c = p.cover;
    const levels = (Array.isArray(c.levels) && c.levels.length === 10 ? c.levels.map(String) : t.levels);
    const nq = p.quests.length;
    const who = p.reader.name ? esc(p.reader.name).toUpperCase() + ' \u00b7 ' : '';
    const how = (c.how_it_works && c.how_it_works.length ? c.how_it_works : [
      `**Read at your own speed.** Each quest unlocks at a point in the story. Do it when you get there. Already past one? Do it anyway.`,
      `**About ten minutes each.** Drawing, writing, puzzles and arguments. No essays.`,
      `**Level up as you go.** Each finished quest fills one block of your XP bar.`,
      `**Show ${p.grownup} each one** for the stamp. If you can stump them, even better.`,
    ]);
    const icons = ['torch', 'pick', 'sword', 'heart', 'book', 'diamond'];
    const stops = arr(c.route).filter((x) => x && typeof x === 'object').slice(0, 8);
    const route = stops.length >= 2 ? stops : null;
    const xp = `<div class="xphud">${levels.map((lv, i) => `<div class="xc"><b>${i + 1}</b><span>${esc(lv)}</span></div>`).join('')}</div>`;
    const qlist = `<div class="qlist">${p.quests.map((q, i) => `<div><b>${i + 1}</b> ${md(q.title || '')}${q.unlock ? ` <i>· ${md(q.unlock)}</i>` : ''}</div>`).join('')}</div>`;
    const used = new Set();
    const row = (c.icons && c.icons.length ? c.icons : ['sword', 'book', 'potion', 'diamond', 'torch', 'chest']).slice(0, 6)
      .map((nm) => { const r = resolveIcon(nm, ctx.theme, used); used.add(r); return `<div class="slot">${icon(r, ctx.theme, 'lg')}</div>`; }).join('');
    return `<section class="page cover">` +
      `<div class="cvr">${t.art === 'pixel' ? bannerArt(690, 210, 99) : (t.motif ? motifArt(t.motif, 690, 210, 99, true) : '')}<div class="t1">${md(c.title || 'Reading Quest')}</div>` +
      `<div class="t2">${md(p.book.title || 'Your Book')}</div><div class="t3">${md(c.subtitle || [p.book.series, p.book.author].filter(Boolean).join(' · '))}</div><div class="row">${row}</div></div>` +
      `<div class="ctag">${who}${nq} QUESTS${c.tagline ? ' · ' + esc(c.tagline).toUpperCase() : ''}</div>` +
      (p.reader.name ? '' : '<div class="namefield">Name: <span class="blank" style="width:3.4in"></span></div>') +
      `<h3 class="sec">${icon('book', ctx.theme, 'sm')}How this works</h3><ul class="how">${how.map((h, i) => `<li><span class="bi">${icon(icons[i % icons.length], ctx.theme, 'sm')}</span><span>${md(h)}</span></li>`).join('')}</ul>` +
      `<h3 class="sec">${icon('diamond', ctx.theme, 'sm')}Your XP bar</h3>${xp}` +
      (route ? `<h3 class="sec">${icon('chest', ctx.theme, 'sm')}Quest map</h3>${routeMap(route, ctx)}` : `<h3 class="sec">${icon('chest', ctx.theme, 'sm')}Quest log</h3>`) +
      qlist + '</section>';
  }

  function makeCtx(p) {
    return { theme: p.theme, grownup: p.grownup, packPageNumbers: p.options.page_numbers, pageNumbers: false, crosswords: [] };
  }

  function renderPacket(pack) {
    const p = normalize(pack), ctx = makeCtx(p);
    const hasRoute = Array.isArray(p.cover.route) && p.cover.route.length >= 2;
    return [coverPage(p, ctx), ...p.quests.map((q, i) => questPage(q, i, ctx, hasRoute))];
  }

  function renderGuide(pack) {
    const p = normalize(pack), ctx = makeCtx(p), g = p.guide;
    // render quests once so crossword answers are available
    p.quests.forEach((q, i) => { ctx.crosswords = []; questPage(q, i, ctx, false); q._xw = ctx.crosswords.slice(); });
    const gq = Array.isArray(g.quests) ? g.quests : [];
    const cards = p.quests.map((q, i) => {
      const gi = gq[i] || {};
      const ans = Array.isArray(gi.answers) ? gi.answers : (gi.answers ? [gi.answers] : []);
      let xw = '';
      (q._xw || []).forEach((cw) => {
        xw += `<div class="lbl">Crossword answers</div><div class="ans"><b>Across:</b> ${cw.across.map((x) => `${x.n}. ${x.word}`).join(', ')}<br><b>Down:</b> ${cw.down.map((x) => `${x.n}. ${x.word}`).join(', ')}</div>`;
      });
      return `<div class="gcard"><div class="gh"><span>Quest ${i + 1} · ${md(q.title || '')}</span>${q.unlock ? `<span class="r">unlocks ${md(q.unlock)}</span>` : ''}</div><div class="gb">` +
        (gi.asks ? `<div class="lbl">The page asks for</div><div class="txt">${md(gi.asks)}</div>` : '') +
        (ans.length ? `<div class="lbl">Answers</div><div class="ans">${ans.length > 1 ? `<ol>${ans.map((x) => `<li>${md(x)}</li>`).join('')}</ol>` : md(ans[0])}</div>` : '') + xw +
        (gi.good_answer ? `<div class="lbl">No single right answer: what good looks like</div><div class="open">${md(gi.good_answer)}</div>` : '') +
        '</div></div>';
    }).join('');
    const reader = p.reader.name ? esc(p.reader.name) : 'your reader';
    return `<section class="page guide">` +
      header(ctx, { small: 'Grown-up’s answer guide', title: p.book.title || 'Answer guide', kicker: [p.book.series, p.book.author].filter(Boolean).join(' · '), icon: 'book', seed: 42 }) +
      `<div class="tag">For grown-ups · spoilers everywhere</div>` +
      `<div class="src"><div class="srclab">Read this first: where these answers came from</div>${md(g.sources || 'The AI that wrote this guide did not say where its answers came from. Treat every answer as a guess.')}` +
      `<br><br><b>The book is the tiebreaker, not this guide. If ${reader}’s answer disagrees with this sheet, assume they’re right and check the book.</b></div>` +
      (g.summary ? `<h3 class="sec">${icon('book', ctx.theme, 'sm')}The book in one paragraph</h3><div class="lore txt">${md(g.summary)}</div>` : '') +
      `<h3 class="sec">${icon('heart', ctx.theme, 'sm')}The easiest check of all</h3><div class="txt">${md(g.dinner_question || 'At dinner, ask: “What happened in the book today?” Two minutes, no guide needed. The quests are for fun; nothing here is a test.')}</div>` +
      cards + '</section>';
  }

  // ------------------------------------------------------------------ page geometry
  const PAPER = { letter: [8.5, 11], a4: [8.27, 11.69] };
  function geometry(pack) {
    const p = normalize(pack);
    const [w, h] = PAPER[p.options.paper];
    // Hole-punch / prong-folder margin: 3-hole punches centre holes 0.5in from the edge and folder
    // prongs reach ~1in, so 1.25in clears both. Verified on real paper by the project author.
    const m = { top: 0.45, right: 0.35, bottom: 0.45, left: p.options.hole_punch_margin ? 1.25 : 0.55 };
    return { w, h, m, contentW: w - m.left - m.right, contentH: h - m.top - m.bottom - 0.15 };
  }
  function pageCSS(pack) {
    const g = geometry(pack);
    return `@page { size: ${g.w}in ${g.h}in; margin: ${g.m.top}in ${g.m.right}in ${g.m.bottom}in ${g.m.left}in; }` +
      `.sq { --page-w: ${g.contentW}in; --page-h: ${g.contentH}in; --sheet-w: ${g.w}in; --sheet-h: ${g.h}in; ` +
      `--m-top: ${g.m.top}in; --m-right: ${g.m.right}in; --m-bottom: ${g.m.bottom}in; --m-left: ${g.m.left}in; }`;
  }
  function rootClass(pack) {
    const p = normalize(pack);
    return `sq theme-${p.theme}${THEMES[p.theme].skin ? ' skin' : ''} lines-${p.reader.lines}`;
  }

  // ------------------------------------------------------------------ fit (browser only)
  // A kid's quest page must be exactly one sheet. If an AI wrote too much, take writing lines
  // away (largest group first, never below one line) until it fits; report anything that still
  // does not.
  function fitPages(rootEl) {
    const report = [];
    if (!rootEl) return report;
    rootEl.querySelectorAll('.page.quest, .page.cover').forEach((page) => {
      const body = page.querySelector('.pbody') || page;
      const over = () => page.scrollHeight > page.clientHeight + 1;
      let removed = 0;
      while (over()) {
        const groups = Array.from(body.querySelectorAll('.lines')).filter((g) => g.children.length > 1);
        if (!groups.length) break;
        groups.sort((a, b) => b.children.length - a.children.length);
        groups[0].lastElementChild.remove();
        removed++;
      }
      let shrunk = false;
      if (over()) { page.classList.add('tight'); shrunk = true; }
      const label = page.dataset.quest ? `Quest ${page.dataset.quest}` : 'Cover';
      if (over()) report.push({ page: label, level: 'error', message: `${label} is still too long for one page. Ask your AI to shorten it.` });
      else if (removed || shrunk) report.push({ page: label, level: 'info', message: `${label} was a bit long, so StoryQuest removed ${removed} writing line${removed === 1 ? '' : 's'}${shrunk ? ' and tightened the spacing' : ''} to fit one page.` });
    });
    return report;
  }

  // ------------------------------------------------------------------ AI text -> pack
  // Chat AIs wrap JSON in prose, code fences or smart quotes. Recover the pack anyway.
  function parseAIText(text) {
    let t = String(text || '').trim();
    if (!t) throw new Error('Nothing was pasted. Copy the whole answer from your AI and paste it here.');
    // Drop every code-fence line: an AI that was told "continue" often opens a second block,
    // so the two halves are joined back into one pack.
    // Keep only what's inside the blocks, so chat between them ("Sure, continuing:") is dropped.
    // A cut-off block may never close, and the AI may resume mid-sentence, so block pieces are
    // joined with nothing between them, and short chat lines ("Sure, continuing:") are dropped.
    if (/^\s*```/m.test(t)) {
      const pieces = []; let inside = false, cur = [];
      t.split('\n').forEach((l) => {
        const f = l.match(/^\s*```\s*(\S*)/);
        if (!f) { if (inside) cur.push(l); return; }
        if (cur.length) pieces.push(cur.join('\n'));
        cur = [];
        inside = f[1] ? true : !inside;
      });
      if (cur.length) pieces.push(cur.join('\n'));
      const chat = /^[A-Za-z][^"{}[\]]{0,80}[:.!]\s*$/;
      const joined = pieces.map((pc) => pc.split('\n').filter((l) => !chat.test(l.trim())).join('\n').replace(/^\n+|\n+$/g, '')).join('');
      if (joined.includes('{')) t = joined;
    }
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a < 0) throw new Error('This doesn’t look like a StoryQuest pack. Ask your AI: “Please give me the whole pack again as one code block.”');
    if (b < a) throw new Error('The pack looks cut off at the end. Ask your AI to “continue”, or to send the whole pack again as one code block.');
    t = t.slice(a, b + 1);
    // Repairs, gentlest first. Curly quotes are only swapped where JSON needs a real quote
    // (next to { [ , : or before : , } ]), so curly quotes inside sentences survive.
    const commas = (x) => x.replace(/,\s*([}\]])/g, '$1');
    const structural = (x) => x.replace(/([{[,:]\s*)[“”]/g, '$1"').replace(/[“”](\s*[:,}\]])/g, '"$1');
    const tries = [t, commas(t), commas(structural(t)), commas(t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'"))];
    for (const s of tries) {
      try { return JSON.parse(s); } catch (e) { /* try the next repair */ }
    }
    let depth = 0, inStr = false, escp = false;
    for (const ch of t) {
      if (escp) { escp = false; continue; }
      if (ch === '\\') { escp = true; continue; }
      if (ch === '"') inStr = !inStr;
      else if (!inStr && (ch === '{' || ch === '[')) depth++;
      else if (!inStr && (ch === '}' || ch === ']')) depth--;
    }
    if (depth > 0) throw new Error('The pack looks cut off before the end. Ask your AI to “continue”, then paste both parts together, or ask it to send the whole pack again.');
    throw new Error('The pack has a mistake the computer can’t read. Ask your AI: “Please check the pack is valid JSON and send it again as one code block.”');
  }

  function validate(pack) {
    const issues = [];
    const err = (m) => issues.push({ level: 'error', message: m });
    const warn = (m) => issues.push({ level: 'warning', message: m });
    if (!pack || typeof pack !== 'object' || Array.isArray(pack)) { err('The pack is empty.'); return issues; }
    if (!pack.book || !pack.book.title) err('The pack is missing the book title (book.title).');
    if (!Array.isArray(pack.quests) || !pack.quests.length) err('The pack has no quests (activity pages).');
    else {
      if (pack.quests.length > 14) warn(`The pack has ${pack.quests.length} quest pages. That’s a lot; 6 to 12 works best.`);
      pack.quests.forEach((q, i) => {
        if (!q || !Array.isArray(q.activities) || !q.activities.length) err(`Quest ${i + 1} has no activities.`);
        else q.activities.forEach((a) => {
          if (!a || !own(ACTIVITIES, a.type)) warn(`Quest ${i + 1} has an activity type StoryQuest doesn’t know (“${a && a.type}”). It will be left out.`);
          if (a && a.type === 'crossword') {
            const cw = crossword(a.words || [], num(a.seed, hash(JSON.stringify(a.words || []))));
            if (cw && cw.unplaced.length) warn(`Quest ${i + 1}’s crossword couldn’t fit: ${cw.unplaced.join(', ')}. Those clues were left out.`);
          }
        });
      });
    }
    if (pack.theme && !own(THEMES, pack.theme)) warn(themeNotice(pack));
    if (pack.theme_suggestions != null) {
      if (!Array.isArray(pack.theme_suggestions)) warn('The look suggestions should be a list of up to three looks, so they are ignored.');
      else {
        if (pack.theme_suggestions.length > 3) warn('Your AI suggested more than three looks; StoryQuest shows the first three.');
        pack.theme_suggestions.slice(0, 3).forEach((x) => {
          if (!x || typeof x !== 'object' || !own(THEMES, x.theme)) warn(`Your AI suggested a look called “${x && typeof x === 'object' ? String(x.theme).slice(0, 40) : ''}” that StoryQuest doesn’t have, so it is skipped.`);
        });
      }
    }
    if (!pack.guide || !pack.guide.sources) warn('The answer guide doesn’t say where its answers came from. Ask your AI how it checked the plot.');
    if (pack.guide && Array.isArray(pack.guide.quests) && Array.isArray(pack.quests) && pack.guide.quests.length !== pack.quests.length)
      warn(`The answer guide covers ${pack.guide.quests.length} quests but the packet has ${pack.quests.length}.`);
    return issues;
  }

  // A complete, printable HTML document. `base` is where storyquest.css, art.js and fonts/ live.
  // With fit: true the page runs fitPages() itself once fonts load (the CLI uses this).
  function documentHTML(pack, which, opts = {}) {
    const base = opts.base || '', p = normalize(pack);
    const pages = which === 'guide' ? [renderGuide(pack)] : renderPacket(pack);
    const title = `${p.book.title || 'StoryQuest'} – ${which === 'guide' ? 'answer guide' : 'reading quest'}`;
    const fit = opts.fit ? `<script src="${esc(base)}art.js"></script><script src="${esc(base)}storyquest.js"></script>` +
      `<script>document.fonts.ready.then(function(){var r=StoryQuest.fitPages(document.querySelector('.sq'));` +
      `document.documentElement.setAttribute('data-fit',JSON.stringify(r));});</script>` : '';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>` +
      `<link rel="stylesheet" href="${esc(base)}storyquest.css"><style>${pageCSS(pack)} @media print{body{margin:0}}</style></head>` +
      `<body style="margin:0;background:#fff"><div class="${rootClass(pack)}">${pages.join('')}</div>${fit}</body></html>`;
  }

  const API = { esc, md, crossword, renderPacket, renderGuide, documentHTML, pageCSS, rootClass, geometry, fitPages, parseAIText,
    validate, normalize, suggestions, suggestionsHTML, looksHTML, themeNotice, THEMES, DEFAULT_THEME, ACTIVITY_TYPES, ICON_NAMES, VERSION: '1.0.0' };
  if (typeof module === 'object' && module.exports) module.exports = API;
  else root.StoryQuest = API;
})(this);
