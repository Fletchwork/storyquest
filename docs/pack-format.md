# The pack format

A **pack** is one JSON object. An AI writes it; StoryQuest turns it into a kid's packet (a cover plus one page per quest) and a grown-up's answer guide. Unknown fields are ignored. Text fields accept `**bold**`, `*italic*` and line breaks; nothing else is interpreted, so HTML in a pack shows up as plain text.

## Top level

| Field | What it is |
|---|---|
| `storyquest` | Always `1`. |
| `book` | `{ "title", "author", "series", "format" }`. `format` is `"paper"` or `"ereader"`. Paper books get "found it on page ___" lines; e-readers don't (pages move around on an e-reader). |
| `reader` | `{ "name", "age", "lines" }`. `name` is a first name or nickname, or leave it blank for a class set ("Name: ____"). `lines` is `"wide"` (ages 9 and under) or `"college"`; it defaults from `age`. |
| `grownup` | What the child calls the grown-up who stamps each page: "Dad", "Mum", "Ms. Rivera". |
| `theme` | The look. One of the ids in [Looks](#looks) below. A missing or unknown id falls back to `"storybook"` (the web page says so, and an unknown id also gets a warning). Packs that say `"pixel-quest"` still get it. The AI should pick one of the `theme_suggestions` ids. |
| `theme_suggestions` | Optional. Up to three `{ "theme": id, "why": "one short sentence" }`, best fit first: the AI's picks for this book. The web page shows them as "Suggested for this book" buttons that switch the look. Unknown ids are skipped with a warning; `why` is plain text (HTML is shown as text), cut to 160 characters at a word boundary. With no suggestions, the page offers all the looks instead. |
| `options` | `{ "paper": "letter" \| "a4", "hole_punch_margin": true, "page_numbers": null }`. `page_numbers` overrides the `book.format` default. |
| `cover` | See below. |
| `quests` | 6 to 12 quest pages, in reading order. |
| `guide` | The grown-up's answer guide. See below. |

## Looks

Every look keeps the same layout; they differ in colour, headings, default level names and a light header decoration. The catalog is the `THEMES` table in `engine/storyquest.js`, and the AI prompt is generated from it.

| id | Name | Suits |
|---|---|---|
| `pixel-quest` | Pixel quest | Video-game books such as Minecraft, Roblox or Zelda. |
| `storybook` | Storybook | Classic stories and any book: parchment and ink. |
| `clean` | Clean (saves ink) | Any book: black and white, cheapest to print and photocopy. |
| `pirate-seas` | Pirate seas | Treasure Island, Peter Pan and other sea adventures. |
| `enchanted-forest` | Enchanted forest | Fantasy, fairy tales and magic, such as Narnia or The Hobbit. |
| `space-voyage` | Space voyage | Science fiction and space adventures. |
| `mystery-case` | Mystery case file | Detective stories and mysteries. |
| `wild-adventure` | Wild adventure | Survival, animals and nature, such as Hatchet or The Wild Robot. |
| `notebook` | Notebook doodles | Real life, school and funny diaries, such as Wimpy Kid or Wonder. |

All looks except Pixel quest use thin lines on near-white paper, so they print cheaply; Clean uses the least ink. Each look has its own ten default level names, used when `cover.levels` is missing or not exactly ten.

## `cover`

```json
{
  "title": "Reading Quest",
  "subtitle": "Robert Louis Stevenson",
  "tagline": "Pirate edition",
  "how_it_works": ["**Read at your own speed.** ...", "..."],
  "levels": ["Cabin Boy", "Deckhand", "...ten in total..."],
  "icons": ["ship", "map", "compass", "coin", "anchor", "key"],
  "route": [ { "place": "Admiral Benbow Inn", "quests": [1, 2] }, { "place": "Bristol", "quests": [3] } ]
}
```

Everything is optional. `levels` must have exactly ten entries or the look's defaults are used. `route` (2 to 8 stops, in story order) draws a quest map. Leave out `route` and the cover shows a quest log instead. Place names are spoilers, so only list places the child reaches by that quest's unlock point.

## `quests[]`

```json
{
  "title": "The Black Spot",
  "kicker": "Chapters 1-3",
  "icon": "key",
  "unlock": "after Billy Bones gets a visitor",
  "footer": "Fun fact: ...",
  "activities": [ ... ]
}
```

`unlock` is a **spoiler-light** milestone ("after the ship sets sail"), never a plot twist. `icon` is one of the names listed below. Each quest must fit on **one sheet**. As a rule of thumb, one page holds three or four activities and about 18 to 22 writing lines in total, or fewer when the page also has a comic, crossword, item card or big drawing box. If a page runs long, StoryQuest removes writing lines to make it fit and tells you.

## Activity types

Every activity has a `type`. Lines are counted in writing lines.

| type | fields | notes |
|---|---|---|
| `intro` | `text` | A short line of set-up at the top of a page. |
| `warning` | `text` | A dark "spoiler zone" bar. |
| `questions` | `intro?`, `items: [ "question" or { "q", "lines" } ]` | Numbered questions, 2 lines each by default. Make them interesting, not quizzes. |
| `write` | `title?`, `prompt`, `starter?`, `lines` (8) | A writing mission in a box, then lines. |
| `box` | `title`, `text`, `lines` (2), `style?: "sealed"`, `fold?` | A note box with lines inside. `"sealed"` gets a dashed fold-over border. |
| `draw` | `prompt`, `size: small/medium/large`, `caption?`, `labels` (0-6) | An empty frame, plus numbered label lines under it. |
| `comic` | `prompt?`, `panels: 4/6`, `ideas: []`, `boss_bar?`, `boss_bar_panel?` | Comic panels. `ideas` are scenes worth drawing. Takes most of a page. |
| `crossword` | `intro?`, `words: [["WORD", "clue"]]`, `seed?` | 8 to 12 words, letters only, 3 to 12 long. Words that won't fit are left out and listed as a warning. |
| `invent_item` | `title?`, `prompt?`, `who?`, `stats?: []`, `recipe?: false`, `question?` | A 5x5 recipe grid, a box asking who should get the item, and an RPG-style item card with a 16x16 picture grid. Takes most of a page. |
| `pixel_art` | `prompt?` | A 16x16 grid with name and description lines. |
| `character_cards` | `prompt?`, `names: []` (2-6), `fields?: []`, `pick?` | A card per character. `pick` adds a "pick your team" box. |
| `stump_the_grownup` | `title?`, `prompt?`, `count` (3) | The child writes questions for the grown-up; answers go upside-down. |
| `sealed_prediction` | `title?`, `prompts: []`, `open_on?`, `lines` (2) | A fold-over prediction, opened later. |
| `open_prediction` | `title?`, `from?`, `prompt?` | Opens an earlier sealed prediction: nailed it / close / way off. |
| `take_a_side` | `question`, `sides?: ["Yes","No"]`, `spoiler_warning?`, `extra?`, `extra_title?` | Pick a side, give two reasons from the book, then argue against yourself. |
| `two_truths` | `title?`, `prompt?` | Two truths and a lie about the book. |
| `rating` | `title?`, `prompt?`, `lines` (1) | Ten hearts or stars to colour in. Good for the last page. |
| `lines` | `prompt?`, `lines` | Plain writing lines. |

### Icons

`anchor apple bolt book bread castle chest coin compass cup diamond grass heart hourglass key map owl paw pick potion quill scroll ship star steps sword torch wand`

Each theme draws them its own way. Pixel quest uses blocky sprites; every other look uses line drawings. Unknown names fall back to a similar icon.

## `guide`

```json
{
  "sources": "Checked against the Project Gutenberg text (ebook #120), chapters 1-34.",
  "summary": "One paragraph on the whole book, spoilers and all.",
  "dinner_question": "At dinner, ask: ...",
  "quests": [
    { "asks": "What the page asks for.", "answers": ["1. ...", "2. ..."], "good_answer": "For open questions: what a good answer looks like." }
  ]
}
```

`guide.quests` lines up with `quests` one-to-one. Crossword answers are added automatically. `sources` is **required in spirit**: say exactly what was checked and how. If the AI couldn't read the book, it must say so, and the guide prints in red at the top either way. The book is always the tiebreaker.
