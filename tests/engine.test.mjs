// Engine tests: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
const SQ = require('../engine/storyquest.js');
const PROMPT = require('../engine/prompt.js');

const minimal = () => ({
  storyquest: 1,
  book: { title: 'Test Book', author: 'A. Writer', format: 'ereader' },
  reader: { name: 'Sam', age: 10 },
  quests: [{ title: 'One', activities: [{ type: 'questions', items: ['Why?'] }] }],
  guide: { sources: 'Checked against the text.', quests: [{ answers: ['Because.'] }] },
});

test('crossword places every word and reads back correctly', () => {
  const words = [['HISPANIOLA', 'ship'], ['SILVER', 'cook'], ['FLINT', 'captain'], ['GUNN', 'marooned'],
    ['LIVESEY', 'doctor'], ['TRELAWNEY', 'squire'], ['BENBOW', 'inn'], ['PARROT', 'bird']];
  const cw = SQ.crossword(words, 7);
  assert.deepEqual(cw.unplaced, []);
  assert.equal(cw.across.length + cw.down.length, words.length);
  for (const { n, word } of cw.across) {
    const [r, c] = Object.entries(cw.numbers).find(([, v]) => v === n)[0].split(',').map(Number);
    assert.equal(cw.grid[r].slice(c, c + word.length).join(''), word);
  }
  for (const { n, word } of cw.down) {
    const [r, c] = Object.entries(cw.numbers).find(([, v]) => v === n)[0].split(',').map(Number);
    assert.equal(cw.grid.slice(r, r + word.length).map((row) => row[c]).join(''), word);
  }
});

test('crossword is deterministic for a seed', () => {
  const w = [['ALPHA', 'a'], ['BRAVO', 'b'], ['CHARLIE', 'c'], ['DELTA', 'd'], ['ECHO', 'e']];
  assert.deepEqual(SQ.crossword(w, 3).grid, SQ.crossword(w, 3).grid);
});

test('packet renders a cover plus one page per quest', () => {
  const pages = SQ.renderPacket(minimal());
  assert.equal(pages.length, 2);
  assert.match(pages[0], /SAM/);
  assert.match(pages[1], /Quest 1/);
});

test('blank name gives a class-set name line', () => {
  const p = minimal(); p.reader.name = '';
  assert.match(SQ.renderPacket(p)[0], /class="namefield">Name:/);
});

test('every activity type renders without throwing', () => {
  const p = minimal();
  p.quests[0].activities = SQ.ACTIVITY_TYPES.map((type) => ({ type, items: ['q'], words: [['ONE', 'x'], ['TWO', 'y']], names: ['A', 'B'], question: 'q', prompts: ['p'] }));
  const html = SQ.renderPacket(p).join('');
  assert.ok(html.length > 1000);
  for (const theme of Object.keys(SQ.THEMES)) { p.theme = theme; SQ.renderPacket(p); SQ.renderGuide(p); }
});

test('pack text is escaped: no HTML injection from an AI', () => {
  const p = minimal();
  p.book.title = '<img src=x onerror=alert(1)>';
  p.quests[0].title = '<script>alert(1)</script>';
  p.cover = { route: [{ place: '<b>x</b>', quests: ['<i>'] }, { place: 'y', quests: [] }] };
  const html = SQ.documentHTML(p, 'packet') + SQ.documentHTML(p, 'guide');
  assert.doesNotMatch(html, /<img src=x/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.doesNotMatch(html, /<b>x<\/b>/);
});

test('light markup: bold and italic only', () => {
  assert.equal(SQ.md('**a** *b*'), '<b>a</b> <i>b</i>');
  assert.equal(SQ.md('<u>x</u>'), '&lt;u&gt;x&lt;/u&gt;');
});

test('page-number lines follow book format', () => {
  const p = minimal(); p.quests[0].activities = [{ type: 'questions', items: ['q'] }];
  assert.doesNotMatch(SQ.renderPacket(p)[1], /found it on page/);
  p.book.format = 'paper';
  assert.match(SQ.renderPacket(p)[1], /found it on page/);
  p.options = { page_numbers: false };
  assert.doesNotMatch(SQ.renderPacket(p)[1], /found it on page/);
});

test('ruling defaults from age', () => {
  assert.equal(SQ.normalize({ reader: { age: 8 } }).reader.lines, 'wide');
  assert.equal(SQ.normalize({ reader: { age: 11 } }).reader.lines, 'college');
  assert.equal(SQ.normalize({ reader: { age: 11, lines: 'wide' } }).reader.lines, 'wide');
});

test('paper size and binder margin set the page geometry', () => {
  assert.match(SQ.pageCSS({}), /size: 8.5in 11in; margin: 0.45in 0.35in 0.45in 1.25in/);
  assert.match(SQ.pageCSS({ options: { paper: 'a4', hole_punch_margin: false } }), /size: 8.27in 11.69in;.*0.55in/);
});

test('parseAIText recovers chatty, fenced, smart-quoted output', () => {
  const t = 'Here you go!\n```json\n{“book”: {“title”: “X”},}\n```\nEnjoy!';
  assert.equal(SQ.parseAIText(t).book.title, 'X');
});

test('parseAIText explains a cut-off answer', () => {
  assert.throws(() => SQ.parseAIText('{"book": {"title": "X"}, "quests": [ {"title": "a"'), /cut off/);
  assert.throws(() => SQ.parseAIText(''), /Nothing was pasted/);
  assert.throws(() => SQ.parseAIText('no json here'), /doesn.t look like/);
});

test('validate flags the important problems', () => {
  assert.deepEqual(SQ.validate(minimal()), []);
  const msgs = (p) => SQ.validate(p).map((i) => i.message).join(' | ');
  assert.match(msgs({}), /book title/);
  const p = minimal(); delete p.guide.sources;
  assert.match(msgs(p), /where its answers came from/);
  p.quests.push({ title: 'x', activities: [{ type: 'nonsense' }] });
  assert.match(msgs(p), /doesn.t know/);
});

test('example packs validate cleanly', () => {
  const dir = new URL('../examples/', import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
    const pack = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
    assert.deepEqual(SQ.validate(pack), [], f);
    assert.equal(SQ.renderPacket(pack).length, pack.quests.length + 1, f);
  }
});

test('the AI prompt documents every activity type and icon', () => {
  for (const t of SQ.ACTIVITY_TYPES) assert.match(PROMPT, new RegExp(`\\*\\*${t}\\*\\*`), t);
  for (const i of SQ.ICON_NAMES) assert.match(PROMPT, new RegExp(`\\b${i}\\b`), i);
});

test('parseAIText joins a pack split across two code blocks by "continue"', () => {
  const t = 'Here it is:\n```json\n{"book": {"title": "X"},\n"quests": [{"title": "a"\n```\nSure, continuing:\n```json\n}]}\n```';
  const p = SQ.parseAIText(t);
  assert.equal(p.book.title, 'X');
  assert.equal(p.quests[0].title, 'a');
});

test('parseAIText rejoins a block cut off mid-sentence and resumed after "continue"', () => {
  const part1 = '```json\n{"book": {"title": "Treasure Isl';
  const part2 = 'Sure! Picking up where I left off:\n```json\nand"}, "quests": []}\n```';
  assert.equal(SQ.parseAIText(part1 + '\n' + part2).book.title, 'Treasure Island');
});

test('cover icon row never repeats a drawing after fallbacks', () => {
  const p = minimal(); p.theme = 'pixel-quest';
  p.cover = { icons: ['ship', 'map', 'compass', 'coin', 'anchor', 'key'] };
  const svgs = SQ.renderPacket(p)[0].split('<div class="row">')[1].split('</div></div>')[0].match(/<svg[\s\S]*?<\/svg>/g);
  assert.equal(new Set(svgs).size, svgs.length);
});

test('hostile packs never crash the renderer', () => {
  const p = minimal();
  p.theme = 'constructor';
  p.quests = [null, 'x', { title: 'a', icon: 'constructor', activities: [null, { type: '__proto__' }, { type: 'comic', ideas: 'not a list' },
    { type: 'draw', size: 'toString' }, { type: 'crossword', words: Array.from({ length: 500 }, (_, i) => ['W' + 'ABCDEFGH'[i % 8].repeat(3), 'c']) }] }];
  p.cover = { icons: ['__proto__', 'constructor', 'toString'], levels: 'abcdefghij', route: [null, { place: 'x' }, 'y', { place: 'z', quests: [1] }] };
  for (const theme of ['pixel-quest', 'storybook', 'constructor']) {
    p.theme = theme;
    SQ.renderPacket(p); SQ.renderGuide(p); SQ.validate(p);
  }
});

test('parseAIText keeps curly quotes inside text while fixing a trailing comma', () => {
  assert.equal(SQ.parseAIText('{"a":"say “hi”",}').a, 'say “hi”');
  assert.equal(SQ.parseAIText('{“a”: “b”, “c”: [1,],}').a, 'b');
});

test('validate reports, never throws, on malformed crossword words', () => {
  for (const words of ['nope', [{}], [null], 7]) {
    const p = minimal(); p.quests[0].activities = [{ type: 'crossword', words }];
    assert.doesNotThrow(() => SQ.validate(p));
  }
});

// ------------------------------------------------------------------ book skins
const SKINS = ['pirate-seas', 'enchanted-forest', 'space-voyage', 'mystery-case', 'wild-adventure', 'notebook'];
const LEGACY = ['pixel-quest', 'storybook', 'clean'];
const example = () => JSON.parse(readFileSync(new URL('../examples/treasure-island.json', import.meta.url), 'utf8'));

test('the catalog has the three originals plus six skins, each fully described', () => {
  assert.deepEqual(Object.keys(SQ.THEMES), [...LEGACY, ...SKINS]);
  for (const [id, t] of Object.entries(SQ.THEMES)) {
    assert.ok(t.label && t.fits && t.fallbackIcon && t.rating, id);
    assert.equal(t.levels.length, 10, id);
    assert.ok(SQ.ICON_NAMES.includes(t.fallbackIcon) && SQ.ICON_NAMES.includes(t.rating), id);
  }
  for (const id of SKINS) assert.ok(SQ.THEMES[id].motif && SQ.THEMES[id].skin, id);
});

test('every skin renders the example, cover and guide, without throwing', () => {
  for (const theme of Object.keys(SQ.THEMES)) {
    const p = example(); p.theme = theme;
    assert.deepEqual(SQ.validate(p), [], theme);
    const pages = SQ.renderPacket(p);
    assert.equal(pages.length, p.quests.length + 1, theme);
    assert.match(SQ.rootClass(p), new RegExp(`theme-${theme}`));
    assert.ok(SQ.renderGuide(p).length > 1000, theme);
    assert.ok(SQ.documentHTML(p, 'packet').includes(`theme-${theme}`), theme);
  }
});

test('a skin draws its own header motif; the originals have none added', () => {
  for (const id of SKINS) {
    const p = example(); p.theme = id;
    const html = SQ.renderPacket(p).join('');
    assert.match(html, new RegExp(`class="bgart motif motif-${SQ.THEMES[id].motif}"`), id);
    assert.match(SQ.rootClass(p), /\bskin\b/, id);
  }
  for (const id of LEGACY) {
    const p = example(); p.theme = id;
    assert.doesNotMatch(SQ.renderPacket(p).join(''), /motif/, id);
    assert.doesNotMatch(SQ.rootClass(p), /\bskin\b/, id);
  }
});

test('with no cover.levels, a skin supplies its own ten level names', () => {
  for (const id of SKINS) {
    const p = example(); p.theme = id; delete p.cover.levels;
    const cover = SQ.renderPacket(p)[0];
    for (const lv of SQ.THEMES[id].levels) assert.ok(cover.includes(`<span>${lv}</span>`), `${id}: ${lv}`);
  }
});

test('the rating page uses the look’s own rating icon', () => {
  const p = minimal(); p.quests[0].activities = [{ type: 'rating' }];
  const rating = (theme) => { p.theme = theme; return SQ.renderPacket(p)[1].split('class="rating">')[1].split('</div>')[0]; };
  assert.notEqual(rating('pirate-seas'), rating('storybook'));
  assert.equal((rating('pirate-seas').match(/<svg/g) || []).length, 10);
  assert.equal(rating('storybook'), rating('clean'));
});

test('an unknown look falls back to Storybook with a plain-words warning', () => {
  const p = minimal(); p.theme = 'neon-unicorns';
  assert.equal(SQ.normalize(p).theme, 'storybook');
  const w = SQ.validate(p);
  assert.equal(w.length, 1);
  assert.equal(w[0].level, 'warning');
  assert.equal(w[0].message, 'Your AI asked for a look called “neon-unicorns” that StoryQuest doesn’t have, so this uses Storybook.');
  assert.match(SQ.rootClass(p), /theme-storybook/);
  assert.doesNotThrow(() => SQ.renderPacket(p));
});

test('a pack with no look uses Storybook and says so; an explicit pixel-quest stays pixel-quest', () => {
  const p = minimal();
  assert.equal(SQ.normalize(p).theme, 'storybook');
  assert.deepEqual(SQ.validate(p), []);
  assert.equal(SQ.themeNotice(p), 'Your AI didn’t pick a look, so this uses Storybook. Pick another below.');
  assert.equal(SQ.themeNotice({ theme: '' }), SQ.themeNotice(p));
  p.theme = 'pixel-quest';
  assert.equal(SQ.normalize(p).theme, 'pixel-quest');
  assert.equal(SQ.themeNotice(p), '');
  assert.equal(SQ.themeNotice({ theme: 'clean' }), '');
});

test('old packs on pixel-quest, storybook and clean keep their look', () => {
  for (const id of LEGACY) {
    const p = minimal(); p.theme = id;
    assert.equal(SQ.normalize(p).theme, id);
    assert.deepEqual(SQ.validate(p), []);
    assert.equal(SQ.rootClass(p), `sq theme-${id} lines-college`);
    assert.deepEqual(SQ.normalize(p).theme_suggestions, []);
  }
  assert.deepEqual(SQ.THEMES['pixel-quest'].levels.slice(0, 3), ['Noob', 'Apprentice', 'Squire']);
  assert.equal(SQ.THEMES.storybook.art, 'line');
  assert.equal(SQ.THEMES['pixel-quest'].art, 'pixel');
});

test('theme_suggestions: HTML in "why" is escaped, ids are checked, at most three', () => {
  const p = minimal();
  p.theme_suggestions = [
    { theme: 'pirate-seas', why: '<img src=x onerror=alert(1)> **bold** "quoted"' },
    { theme: '<script>alert(1)</script>', why: 'bad id' },
    { theme: 'constructor', why: 'prototype id' },
    { theme: 'pirate-seas', why: 'duplicate' },
    { theme: 'storybook', why: 5 },
    { theme: 'clean', why: 'ok' },
    { theme: 'notebook', why: 'fourth valid one' },
    null, 'x',
  ];
  const sug = SQ.suggestions(p);
  assert.deepEqual(sug.map((x) => x.theme), ['pirate-seas', 'storybook', 'clean']);
  assert.equal(sug[1].why, '');
  const html = SQ.suggestionsHTML(p, 'clean');
  assert.doesNotMatch(html, /<img/);
  assert.doesNotMatch(html, /<script/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /&quot;quoted&quot;/);
  assert.equal((html.match(/<button/g) || []).length, 3);
  assert.match(html, /data-theme="clean" aria-pressed="true"/);
  // it never reaches the printed pages at all
  assert.doesNotMatch(SQ.documentHTML(p, 'packet') + SQ.documentHTML(p, 'guide'), /onerror/);
});

test('theme_suggestions problems are warnings, never errors', () => {
  const p = minimal();
  const msgs = () => SQ.validate(p);
  p.theme_suggestions = 'pirate-seas';
  assert.match(msgs()[0].message, /should be a list/);
  p.theme_suggestions = [{ theme: 'nope', why: 'x' }, { theme: 'clean' }, { theme: 'notebook' }, { theme: 'storybook' }];
  const all = msgs();
  assert.ok(all.every((i) => i.level === 'warning'));
  assert.match(all.map((i) => i.message).join('|'), /more than three/);
  assert.match(all.map((i) => i.message).join('|'), /look called .nope. that StoryQuest doesn.t have/);
  p.theme_suggestions = [{ theme: 'clean', why: 'ok' }];
  assert.deepEqual(msgs(), []);
  for (const v of [null, 7, {}, [[]], [{ theme: {} }]]) { p.theme_suggestions = v; assert.doesNotThrow(() => { SQ.validate(p); SQ.suggestions(p); SQ.renderPacket(p); }); }
});

test('the AI prompt lists every look (generated from the catalog) and asks for theme_suggestions', () => {
  for (const [id, t] of Object.entries(SQ.THEMES)) {
    assert.ok(PROMPT.includes('`' + id + '`'), id);
    assert.ok(PROMPT.includes(t.fits), id);
  }
  assert.match(PROMPT, /"theme_suggestions"/);
  assert.doesNotMatch(PROMPT, /pixel-quest or storybook or clean/);
});

test('a long "why" is cut at a word boundary with an ellipsis', () => {
  const why = 'A classic adventure with a treasure map, a ship and a one-legged cook, so this look is dressed for it from the first page. '.repeat(3);
  const [x] = SQ.suggestions({ theme_suggestions: [{ theme: 'pirate-seas', why }] });
  assert.ok(x.why.length <= 160);
  assert.ok(x.why.endsWith('…'));
  assert.match(x.why.slice(0, -1), /\w$/);
  assert.ok(why.startsWith(x.why.slice(0, -1)));
  assert.equal(SQ.suggestions({ theme_suggestions: [{ theme: 'clean', why: '  short   one ' }] })[0].why, 'short one');
});

test('with no suggestions the page can still offer every look as a button', () => {
  const html = SQ.looksHTML('notebook');
  assert.equal((html.match(/<button/g) || []).length, Object.keys(SQ.THEMES).length);
  assert.match(html, /data-theme="notebook" aria-pressed="true"/);
  for (const t of Object.values(SQ.THEMES)) assert.ok(html.includes(t.fits));
});

test('the prompt asks for the look in its own step, after the book, with the catalog inside it', () => {
  const step2 = PROMPT.slice(PROMPT.indexOf('## Step 2: pick a look'), PROMPT.indexOf('## Step 3'));
  assert.match(step2, /Don.t write the JSON until I.ve picked a look or said "you choose"/);
  for (const id of Object.keys(SQ.THEMES)) assert.ok(step2.includes('`' + id + '`'), id);
  const step1 = PROMPT.slice(PROMPT.indexOf('## Step 1'), PROMPT.indexOf('## Step 2'));
  assert.doesNotMatch(step1, /look/i);
  assert.match(PROMPT, /"theme" must be one of them/);
});
