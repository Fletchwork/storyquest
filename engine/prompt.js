// The prompt a grown-up copies into any chat AI (Claude, ChatGPT, Gemini, Copilot...).
// It must stand alone: the AI never sees this repo. Keep it in step with docs/pack-format.md.
(function (root) {
  'use strict';
  // The looks come from the engine's own table, so the prompt and the renderer can't drift apart.
  const THEMES = (typeof module === 'object' && module.exports) ? require('./storyquest.js').THEMES : root.StoryQuest.THEMES;
  const LOOKS = Object.entries(THEMES).map(([id, t]) => `- **${t.label}** (\`${id}\`): ${t.fits}`).join('\n');
  const PROMPT = String.raw`You are helping me make a **StoryQuest** reading packet: printable activity pages that go alongside a book my child (or my class) is reading, plus an answer guide for me. You will write it as one block of JSON that I paste into the StoryQuest web page, which turns it into the pages.

## Step 1: ask me these questions first

Ask them in one friendly message, then wait for my answers. If I skip a question or answer briefly, pick a sensible default and say which you picked.

1. What book is it? (Title and author. If it's part of a series, which number?)
2. What's the reader's first name or nickname? (Or say "class set" and I'll leave the name blank.)
3. How old are they, or what grade?
4. Are they reading a paper book or on an e-reader/tablet?
5. Where are they up to right now? (Not started, partway, nearly done?)
6. How many activity pages? (6 to 12; 8 is a good default. About one page per 2 to 4 chapters works well.)
7. What do they love? (Games, drawing, arguing, jokes, animals, building...) I'll use this to pick activities.
8. What does the child call you? (This goes on the "Approved" stamp: "Dad", "Mum", "Ms. Rivera"...)

## Step 2: pick a look

When I've answered, say in one line which book you understood. Then suggest the **two or three looks** below that suit it best, with one short reason each, and ask me to pick one (or say "you choose"). If you don't recognise the book, say so and suggest Storybook and Clean. Don't write the JSON until I've picked a look or said "you choose".

` + LOOKS + String.raw`

## Step 3: get the book right

Accuracy matters more than anything else here, because I'll use your answer guide to check my child's work.

- If you can search the web or read files, look up the book's plot and chapters before writing anything. Prefer the book's own text, the publisher, a library catalogue or a well-known reference over fan sites, and don't use pirated copies of in-print books.
- **Never invent plot details, names, places, or quotes.** If you aren't sure about something, leave it out or turn it into an open question ("What do you think...?") that doesn't need a single right answer.
- If you can't look the book up and you don't know it well, tell me plainly. Then lean on open activities (draw, predict, argue, invent, rate) instead of factual questions.
- In the guide's "sources" field, say exactly what you checked and how ("I read the publisher's summary and the first three chapters on the publisher's site", or "I could not look this book up; these answers are from memory and may be wrong"). Be honest. I won't be upset.

## Step 4: write the pages

Rules for the activities:
- **Fun, never a test.** Activities invite noticing, opinions, drawing, arguing and inventing. Avoid "recall drills". At most 2 to 4 factual questions on a page, and make them interesting.
- Each page "unlocks" at a **spoiler-light** point in the story ("after the ship sets sail"), never a plot twist. Pages go in reading order.
- **Each page must fit one sheet of paper.** A page holds 3 or 4 activities and about 18 to 22 writing lines in total, or fewer when it has a comic, crossword, item card or big drawing box. Younger kids (9 and under) get fewer lines.
- Mix it up across the packet: one comic page, one crossword, a sealed prediction early that gets opened later, a "take a side" argument, a "stump the grown-up" page, and a rating on the last page work well for most kids.
- Match the child's interests and age. Use the book's own world: its names, places, objects and jokes.
- If the reader uses an e-reader, don't ask for page numbers. Use chapter numbers in the kicker instead.
- Keep everything kind. If the book has frightening or sad parts, handle them gently.

## Step 5: output

Reply with **one JSON code block**, following this exact shape. If you couldn't check the book, put one plain sentence above the block saying so; otherwise add nothing outside it.

Keep it short so it fits in one reply: questions under 20 words, guide answers one or two sentences each. If you get cut off, I'll say "continue": then carry on exactly where you stopped, with no new code block and nothing repeated. If you expect the pack to be too long for one reply, send the first half of the quests, then wait for "continue" before sending the rest and the guide.

` + '```json' + String.raw`
{
  "storyquest": 1,
  "book": { "title": "", "author": "", "series": "", "format": "paper or ereader" },
  "reader": { "name": "", "age": 10, "lines": "wide (age 9 and under) or college" },
  "grownup": "Dad",
  "theme": "the look I picked (or your first suggestion if I said 'you choose'): one of the ids in theme_suggestions",
  "theme_suggestions": [ { "theme": "a look id", "why": "one short sentence on why it suits this book" } ],
  "options": { "paper": "letter or a4", "hole_punch_margin": true },
  "cover": {
    "title": "Reading Quest",
    "subtitle": "the author's name",
    "tagline": "two or three fun words",
    "levels": ["ten", "level", "names", "from", "lowest", "to", "highest", "that", "fit", "the book"],
    "icons": ["six icon names from the list below"],
    "route": [ { "place": "a place from the book", "quests": [1, 2] } ]
  },
  "quests": [
    {
      "title": "Short fun page title",
      "kicker": "Chapters 1-3",
      "icon": "an icon name",
      "unlock": "after something non-spoilery happens",
      "footer": "A one-line fun fact or a joke (true facts only)",
      "activities": [ { "type": "questions", "items": ["...", "..."] } ]
    }
  ],
  "guide": {
    "sources": "Exactly what you checked and how.",
    "summary": "One paragraph on the whole book (spoilers are fine, this is for me).",
    "dinner_question": "One easy question I can ask at dinner.",
    "quests": [
      { "asks": "What this page asks for.", "answers": ["Ch. 2: the answer to question 1", "..."], "good_answer": "For open questions: what a good answer looks like." }
    ]
  }
}
` + '```' + String.raw`

"theme_suggestions" holds the two or three looks you suggested in Step 2 (best first), each with a one-sentence reason, and "theme" must be one of them. "route" lists 2 to 8 places in story order with the page numbers that happen there. It draws a map on the cover, so only include places the reader will have reached. "guide.quests" must have one entry per page, in the same order.

### Activity types (the "type" field) and their fields

- **intro**: text. A short set-up line.
- **questions**: items: a list of questions (or {"q": "...", "lines": 3}). Two writing lines each by default.
- **write**: title, prompt, lines (default 8), starter (optional sentence starter).
- **box**: title, text, lines (default 2). Add "style": "sealed" for a fold-over secret box.
- **draw**: prompt, size ("small", "medium" or "large"), caption, labels (0 to 6 numbered label lines).
- **comic**: panels (4 or 6), ideas (a list of scenes worth drawing), boss_bar (true adds a boss health bar). Takes most of a page.
- **crossword**: words: [["WORD", "clue"], ...]. 8 to 12 words, letters only, 3 to 12 letters, all from the book. Takes most of a page.
- **invent_item**: prompt, who (a question about which character should get it), stats (optional list of stat names). Draws a recipe grid and an item card. Takes most of a page.
- **pixel_art**: prompt. A 16x16 grid to design something.
- **character_cards**: names (2 to 6 characters), fields (optional, e.g. ["Best at", "Best moment so far"]), pick (optional "pick your team" question).
- **stump_the_grownup**: count (1 to 5). The child writes questions to stump you.
- **sealed_prediction**: prompts (a list), open_on (e.g. "page 9"). A fold-over prediction.
- **open_prediction**: from (e.g. "page 2"). Opens an earlier sealed prediction.
- **take_a_side**: question, sides (two choices, e.g. ["Yes", "No"]), extra (optional follow-up question).
- **two_truths**: two truths and a lie about the book.
- **rating**: title, prompt. Ten hearts or stars to colour in. Good for the last page.
- **warning**: text. A "spoiler zone" bar.
- **lines**: prompt, lines.

Text can use **bold** and *italic*. No HTML.

### Icon names
anchor, apple, bolt, book, bread, castle, chest, coin, compass, cup, diamond, grass, heart, hourglass, key, map, owl, paw, pick, potion, quill, scroll, ship, star, steps, sword, torch, wand

Start now with Step 1: ask me the questions.`;

  if (typeof module === 'object' && module.exports) module.exports = PROMPT;
  else root.STORYQUEST_PROMPT = PROMPT;
})(this);
