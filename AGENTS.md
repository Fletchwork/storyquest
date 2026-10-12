# AGENTS.md: making a StoryQuest packet

Instructions for any AI coding agent working in this repo (Claude Code, Codex, Cursor, Copilot, Gemini CLI...). Most requests here are **"make a reading packet for my kid / my class"**. This is the recipe. If you're changing the engine instead, skip to [Working on the code](#working-on-the-code).

## Make a packet

### 1. Ask before writing

Ask these in one friendly message, then wait for the answers:

1. The book: title, author, series number.
2. The reader's first name or nickname, or "class set" (leave the name blank).
3. Age or grade.
4. Paper book or e-reader? (No page-number lines for e-readers; pages move around.)
5. Where are they up to?
6. How many pages: 6 to 12.
7. What they love (games, drawing, arguing, jokes...).
8. Look: once the book is confirmed, suggest 2 or 3 looks from `SQ.THEMES` that fit it (each has a `fits` line), with one short reason each. The grown-up picks one or says "you choose" (take your first). Write the pick to `theme` and the suggestions to `theme_suggestions`.
9. What the child calls the grown-up, for the "Approved" stamp.

Don't ask for anything else personal. A first name is plenty.

### 2. Research, with provenance

Accuracy matters most. The grown-up checks the child's work against your guide.

- Look the book up before writing. Prefer the book's own text (public-domain books: Project Gutenberg), then the publisher, library catalogs and well-known references, then fan wikis and reader reviews. Cross-check facts across at least two independent sources.
- **Never use pirated copies** of in-print books (unauthorized PDF uploads, "read free online" sites). If the only full text is pirated, work from legitimate secondary sources and say so.
- **Never invent** plot details, names, places or quotes. If you can't confirm something, cut it or make it an open question.
- Write `guide.sources` honestly: what you checked, how, and what you couldn't verify. If nothing was checked against the book itself, say that in plain words.

### 3. Write the pack

Follow [`docs/pack-format.md`](docs/pack-format.md), and see [`examples/treasure-island.json`](examples/treasure-island.json) for a complete pack. Save it as `<book-slug>.storyquest.json`, wherever the user wants it. Packs hold a child's first name, so they don't belong in this repo: `*.storyquest.json` is gitignored.

Craft rules ([`docs/teaching-notes.md`](docs/teaching-notes.md) has the reasoning):

- Fun, never a test. Activities invite noticing, opinions, drawing, arguing and inventing. Keep factual questions to 2 to 4 a page, and make them interesting.
- Unlock points are spoiler-light milestones in reading order, never a twist.
- **One sheet per quest.** That means 3 or 4 activities and about 18 to 22 writing lines, or fewer when the page has a comic, crossword, item card or big drawing.
- Vary the activities across the packet. One comic, one crossword, a sealed prediction opened later, a take-a-side argument, a stump-the-grown-up and a closing rating suit most kids.
- Kind and age-appropriate. Handle frightening or sad parts gently.

### 4. Build and check

```bash
python3 cli/storyquest.py check path/to/pack.storyquest.json   # validate + page-fit, no PDFs
python3 cli/storyquest.py build path/to/pack.storyquest.json   # writes <name>-packet.pdf and <name>-guide.pdf
```

This needs Chrome, Chromium or Edge. There's nothing else to install. `build` must report **cover + one page per quest**. A `FIT` line saying lines were removed is fine. An `ERROR` means a page is still too long, so shorten it in the pack and rebuild. If `pdftoppm` and Pillow are present, `build` also checks nothing prints into the margins.

Then **look at the pages** (render a PNG or open the PDF) before handing them over: crossword grid, cover map labels, nothing clipped.

### 5. Hand over

Give the two PDF paths, then one line on how sure the guide is (copy the gist of `guide.sources`). Offer the web page too. It opens the pack via "Open a saved pack" and lets the grown-up change the name, look and paper size without you.

## Working on the code

- **Engine**: `engine/storyquest.js` (UMD; the browser and Node both load it), `engine/art.js` (icons), `engine/storyquest.css` (nine looks), `engine/prompt.js` (the copy-paste prompt for chat AIs; keep it in step with `docs/pack-format.md`).
- **Web page**: `index.html`, all client-side. Nothing is uploaded and there's no analytics. Keep it that way.
- **CLI**: `cli/storyquest.py`, Python stdlib only. It runs the same engine in headless Chrome.
- **Tests**: `node --test tests/*.test.mjs` and `python3 -m pytest -q`. The PDF tests skip when Chrome is missing.
- Pack text is untrusted (it comes from an AI). Everything goes through `esc()`/`md()`; there's a test for it. Never add a raw-HTML field.
- Print geometry: Letter or A4, 1.25in left binder margin (0.55in without), a fixed page height, and `fitPages()` trims writing lines when an AI overfills a page.
- Fonts live in `engine/fonts/` with their licenses: Silkscreen and the title faces are SIL OFL 1.1, Special Elite is Apache 2.0. Decorative faces are for titles only. Body text stays a normal sans/serif, because pixel faces turn C into O at print size.
