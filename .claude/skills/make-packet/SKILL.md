---
name: make-packet
description: Make a StoryQuest reading packet (kid's activity pages plus a grown-up's answer guide) for a book a child is reading. Use when someone asks for a reading packet, activity pages or a reading quest for a book.
---

# Make a reading packet

Follow the recipe in [AGENTS.md](../../../AGENTS.md#make-a-packet), start to finish:

1. **Ask** the nine questions in one message and wait. If the person already gave some answers, ask only for the rest.
2. **Research** the book with web search and fetch. Use the book's own text if it's public domain (Project Gutenberg), otherwise the publisher, library catalogues and reputable references, cross-checked. Never pirated copies. Keep notes on which source confirmed which fact.
3. **Write the pack** to `<book-slug>.storyquest.json` where the person wants it (default: their current folder, not inside this repo's tracked files). Follow `docs/pack-format.md`; `examples/treasure-island.json` is the model.
4. **Build**: `python3 cli/storyquest.py build <pack>`. Fix any `ERROR` line and rebuild until it's clean and the packet is cover + one page per quest.
5. **Look** at the cover, the crossword page and the busiest page as PNGs (`pdftoppm -r 50 -png <pdf> <tmpdir>/p`), and fix anything clipped, overlapping or empty.
6. **Hand over** both PDF paths with one line on how sure the answer guide is, and mention the web page (`index.html`, "Open a saved pack") for changing the name, look or paper size without an AI.
